from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import random
import string
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Mutual Aid & Event Organizing API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserType(str):
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"
    ADMIN = "admin"

class ApprovalStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Base User Model
class UserBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    user_type: str  # individual, organization, admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False
    is_active: bool = True

# Individual Profile
class IndividualProfile(BaseModel):
    display_name: str
    bio: Optional[str] = None
    interests: Optional[List[str]] = []
    profile_image: Optional[str] = None  # Base64

# Organization Profile
class OrganizationProfile(BaseModel):
    name: str
    description: str
    contact_email: EmailStr
    website: Optional[str] = None
    social_links: Optional[dict] = {}  # {platform: url}
    areas_of_focus: Optional[List[str]] = []
    logo: Optional[str] = None  # Base64

# Full User Document
class User(UserBase):
    password_hash: Optional[str] = None  # None for Google sign-in
    auth_provider: str = "email"  # email or google
    firebase_uid: Optional[str] = None
    approval_status: str = "approved"  # For organizations: pending, approved, rejected
    individual_profile: Optional[IndividualProfile] = None
    organization_profile: Optional[OrganizationProfile] = None

# Registration Models
class IndividualRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    bio: Optional[str] = None
    interests: Optional[List[str]] = []

class OrganizationRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    description: str
    contact_email: EmailStr
    website: Optional[str] = None
    social_links: Optional[dict] = {}
    areas_of_focus: Optional[List[str]] = []

class GoogleSignIn(BaseModel):
    firebase_uid: str
    email: EmailStr
    display_name: str
    profile_image: Optional[str] = None
    user_type: str = "individual"  # Can be individual or organization

class GoogleOrgSignIn(BaseModel):
    firebase_uid: str
    email: EmailStr
    name: str
    description: str
    contact_email: EmailStr
    website: Optional[str] = None
    social_links: Optional[dict] = {}
    areas_of_focus: Optional[List[str]] = []

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class VerificationCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = False

# Event Models
class EventCreate(BaseModel):
    name: str
    description: str
    contact_email: Optional[EmailStr] = None
    date: datetime
    location: str

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    organization_name: str
    name: str
    description: str
    contact_email: Optional[EmailStr] = None
    date: datetime
    location: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    rsvp_count: int = 0

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    date: Optional[datetime] = None
    location: Optional[str] = None

# RSVP Models
class RSVP(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    user_email: str
    user_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Response Models
class UserResponse(BaseModel):
    id: str
    email: str
    user_type: str
    is_verified: bool
    is_active: bool
    approval_status: str
    auth_provider: str
    individual_profile: Optional[IndividualProfile] = None
    organization_profile: Optional[OrganizationProfile] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str

# ============== HELPER FUNCTIONS ==============

def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Validate JWT token and return current user"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_dict = await db.users.find_one({"id": user_id})
    if user_dict is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_dict)

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is admin"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_organization_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is an approved organization"""
    if current_user.user_type != "organization":
        raise HTTPException(status_code=403, detail="Organization access required")
    if current_user.approval_status != "approved":
        raise HTTPException(status_code=403, detail="Organization not yet approved")
    return current_user

def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        user_type=user.user_type,
        is_verified=user.is_verified,
        is_active=user.is_active,
        approval_status=user.approval_status,
        auth_provider=user.auth_provider,
        individual_profile=user.individual_profile,
        organization_profile=user.organization_profile,
        created_at=user.created_at
    )

async def send_verification_email(email: str, code: str):
    """Send verification email via SendGrid"""
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning("SendGrid not configured, verification code: %s", code)
        return False
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        message = Mail(
            from_email=sender_email,
            to_emails=email,
            subject='Your Verification Code - Red Thread',
            html_content=f'''
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to Red Thread!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #d32f2f; font-size: 36px; letter-spacing: 5px;">{code}</h1>
                    <p>This code expires in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </body>
            </html>
            '''
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error("Failed to send verification email: %s", str(e))
        return False

async def send_admin_notification(org_name: str, org_email: str):
    """Notify admin about new organization signup"""
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    admin_email = "theredthreadapp@gmail.com"
    
    if not sendgrid_api_key or not sender_email:
        logger.warning("SendGrid not configured, skipping admin notification for org: %s", org_name)
        return False
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        message = Mail(
            from_email=sender_email,
            to_emails=admin_email,
            subject=f'New Organization Pending Approval - {org_name}',
            html_content=f'''
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>New Organization Registration</h2>
                    <p>A new organization has registered and is awaiting approval:</p>
                    <ul>
                        <li><strong>Name:</strong> {org_name}</li>
                        <li><strong>Email:</strong> {org_email}</li>
                    </ul>
                    <p>Please log in to the admin panel to review and approve/reject this organization.</p>
                </body>
            </html>
            '''
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error("Failed to send admin notification: %s", str(e))
        return False

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register/individual", response_model=MessageResponse)
async def register_individual(data: IndividualRegister):
    """Register a new individual user"""
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create verification code
    code = generate_verification_code()
    verification = VerificationCode(
        email=data.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    await db.verification_codes.insert_one(verification.dict())
    
    # Create user (unverified)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        user_type="individual",
        auth_provider="email",
        is_verified=False,
        approval_status="approved",
        individual_profile=IndividualProfile(
            display_name=data.display_name,
            bio=data.bio,
            interests=data.interests or []
        )
    )
    await db.users.insert_one(user.dict())
    
    # Send verification email
    await send_verification_email(data.email, code)
    
    return MessageResponse(message="Verification code sent to your email")

@api_router.post("/auth/register/organization", response_model=MessageResponse)
async def register_organization(data: OrganizationRegister):
    """Register a new organization"""
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create verification code
    code = generate_verification_code()
    verification = VerificationCode(
        email=data.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    await db.verification_codes.insert_one(verification.dict())
    
    # Create organization user (unverified, pending approval)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        user_type="organization",
        auth_provider="email",
        is_verified=False,
        approval_status="pending",
        organization_profile=OrganizationProfile(
            name=data.name,
            description=data.description,
            contact_email=data.contact_email,
            website=data.website,
            social_links=data.social_links or {},
            areas_of_focus=data.areas_of_focus or []
        )
    )
    await db.users.insert_one(user.dict())
    
    # Send verification email
    await send_verification_email(data.email, code)
    
    return MessageResponse(message="Verification code sent to your email")

@api_router.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(data: VerifyEmailRequest):
    """Verify email with code"""
    # Find the verification code
    verification = await db.verification_codes.find_one({
        "email": data.email,
        "code": data.code,
        "used": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if datetime.utcnow() > verification['expires_at']:
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Mark code as used
    await db.verification_codes.update_one(
        {"id": verification['id']},
        {"$set": {"used": True}}
    )
    
    # Update user as verified
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"is_verified": True}}
    )
    
    # Get updated user
    user_dict = await db.users.find_one({"email": data.email})
    user = User(**user_dict)
    
    # If organization, notify admin
    if user.user_type == "organization" and user.organization_profile:
        await send_admin_notification(
            user.organization_profile.name,
            user.email
        )
    
    # Create token
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/resend-verification", response_model=MessageResponse)
async def resend_verification(data: ResendVerificationRequest):
    """Resend verification code"""
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    if user['is_verified']:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Invalidate old codes
    await db.verification_codes.update_many(
        {"email": data.email, "used": False},
        {"$set": {"used": True}}
    )
    
    # Create new verification code
    code = generate_verification_code()
    verification = VerificationCode(
        email=data.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    await db.verification_codes.insert_one(verification.dict())
    
    # Send verification email
    await send_verification_email(data.email, code)
    
    return MessageResponse(message="New verification code sent")

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login with email and password"""
    user_dict = await db.users.find_one({"email": data.email})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_dict)
    
    if user.auth_provider != "email":
        raise HTTPException(status_code=400, detail="Please use Google sign-in for this account")
    
    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your email first")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/google/individual", response_model=TokenResponse)
async def google_sign_in_individual(data: GoogleSignIn):
    """Google sign-in for individuals"""
    # Check if user exists by firebase_uid or email
    existing = await db.users.find_one({
        "$or": [
            {"firebase_uid": data.firebase_uid},
            {"email": data.email}
        ]
    })
    
    if existing:
        # Update firebase_uid if needed
        if not existing.get('firebase_uid'):
            await db.users.update_one(
                {"id": existing['id']},
                {"$set": {"firebase_uid": data.firebase_uid, "auth_provider": "google"}}
            )
        user = User(**existing)
    else:
        # Create new user
        user = User(
            email=data.email,
            firebase_uid=data.firebase_uid,
            user_type="individual",
            auth_provider="google",
            is_verified=True,  # Google accounts are pre-verified
            approval_status="approved",
            individual_profile=IndividualProfile(
                display_name=data.display_name,
                profile_image=data.profile_image
            )
        )
        await db.users.insert_one(user.dict())
    
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/google/organization", response_model=TokenResponse)
async def google_sign_in_organization(data: GoogleOrgSignIn):
    """Google sign-in for organizations"""
    # Check if user exists by firebase_uid or email
    existing = await db.users.find_one({
        "$or": [
            {"firebase_uid": data.firebase_uid},
            {"email": data.email}
        ]
    })
    
    if existing:
        user = User(**existing)
    else:
        # Create new organization user
        user = User(
            email=data.email,
            firebase_uid=data.firebase_uid,
            user_type="organization",
            auth_provider="google",
            is_verified=True,  # Google accounts are pre-verified
            approval_status="pending",  # Still needs admin approval
            organization_profile=OrganizationProfile(
                name=data.name,
                description=data.description,
                contact_email=data.contact_email,
                website=data.website,
                social_links=data.social_links or {},
                areas_of_focus=data.areas_of_focus or []
            )
        )
        await db.users.insert_one(user.dict())
        
        # Notify admin
        await send_admin_notification(data.name, data.email)
    
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/change-password", response_model=MessageResponse)
async def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    """Change password for current user"""
    if current_user.auth_provider != "email":
        raise HTTPException(status_code=400, detail="Cannot change password for Google accounts")
    
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return MessageResponse(message="Password changed successfully")

# ============== USER ROUTES ==============

@api_router.get("/users/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return user_to_response(current_user)

@api_router.put("/users/me/individual", response_model=UserResponse)
async def update_individual_profile(
    profile: IndividualProfile,
    current_user: User = Depends(get_current_user)
):
    """Update individual profile"""
    if current_user.user_type != "individual":
        raise HTTPException(status_code=400, detail="Not an individual account")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"individual_profile": profile.dict()}}
    )
    
    user_dict = await db.users.find_one({"id": current_user.id})
    return user_to_response(User(**user_dict))

@api_router.put("/users/me/organization", response_model=UserResponse)
async def update_organization_profile(
    profile: OrganizationProfile,
    current_user: User = Depends(get_current_user)
):
    """Update organization profile"""
    if current_user.user_type != "organization":
        raise HTTPException(status_code=400, detail="Not an organization account")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"organization_profile": profile.dict()}}
    )
    
    user_dict = await db.users.find_one({"id": current_user.id})
    return user_to_response(User(**user_dict))

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/organizations/pending", response_model=List[UserResponse])
async def get_pending_organizations(admin: User = Depends(get_admin_user)):
    """Get all pending organization approvals"""
    orgs = await db.users.find({
        "user_type": "organization",
        "approval_status": "pending",
        "is_verified": True
    }).to_list(1000)
    
    return [user_to_response(User(**org)) for org in orgs]

@api_router.post("/admin/organizations/{org_id}/approve", response_model=UserResponse)
async def approve_organization(org_id: str, admin: User = Depends(get_admin_user)):
    """Approve an organization"""
    org = await db.users.find_one({"id": org_id, "user_type": "organization"})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    await db.users.update_one(
        {"id": org_id},
        {"$set": {"approval_status": "approved"}}
    )
    
    org_dict = await db.users.find_one({"id": org_id})
    return user_to_response(User(**org_dict))

@api_router.post("/admin/organizations/{org_id}/reject", response_model=UserResponse)
async def reject_organization(org_id: str, admin: User = Depends(get_admin_user)):
    """Reject an organization"""
    org = await db.users.find_one({"id": org_id, "user_type": "organization"})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    await db.users.update_one(
        {"id": org_id},
        {"$set": {"approval_status": "rejected"}}
    )
    
    org_dict = await db.users.find_one({"id": org_id})
    return user_to_response(User(**org_dict))

@api_router.get("/admin/organizations/all", response_model=List[UserResponse])
async def get_all_organizations(admin: User = Depends(get_admin_user)):
    """Get all organizations"""
    orgs = await db.users.find({"user_type": "organization"}).to_list(1000)
    return [user_to_response(User(**org)) for org in orgs]

# ============== EVENT ROUTES ==============

@api_router.post("/events", response_model=Event)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_organization_user)
):
    """Create a new event (organization only)"""
    event = Event(
        organization_id=current_user.id,
        organization_name=current_user.organization_profile.name,
        **event_data.dict()
    )
    await db.events.insert_one(event.dict())
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(
    sort_by: str = "date",  # date, signups, created
    sort_order: str = "asc",  # asc, desc
    active_only: bool = True
):
    """Get all events with sorting"""
    query = {}
    if active_only:
        query["is_active"] = True
        query["date"] = {"$gte": datetime.utcnow()}
    
    # Determine sort field
    sort_field = "date"
    if sort_by == "signups":
        sort_field = "rsvp_count"
    elif sort_by == "created":
        sort_field = "created_at"
    
    sort_direction = 1 if sort_order == "asc" else -1
    
    events = await db.events.find(query).sort(sort_field, sort_direction).to_list(1000)
    return [Event(**event) for event in events]

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get a specific event"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event(**event)

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: User = Depends(get_organization_user)
):
    """Update an event (owner organization only)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['organization_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    update_data = {k: v for k, v in event_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": update_data}
    )
    
    event_dict = await db.events.find_one({"id": event_id})
    return Event(**event_dict)

@api_router.delete("/events/{event_id}", response_model=MessageResponse)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_organization_user)
):
    """Delete an event (owner organization only)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['organization_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    await db.events.delete_one({"id": event_id})
    await db.rsvps.delete_many({"event_id": event_id})
    
    return MessageResponse(message="Event deleted successfully")

@api_router.get("/organizations/{org_id}/events", response_model=List[Event])
async def get_organization_events(org_id: str):
    """Get all events by an organization"""
    events = await db.events.find({"organization_id": org_id}).sort("date", 1).to_list(1000)
    return [Event(**event) for event in events]

# ============== RSVP ROUTES ==============

@api_router.post("/events/{event_id}/rsvp", response_model=RSVP)
async def rsvp_to_event(event_id: str, current_user: User = Depends(get_current_user)):
    """RSVP to an event"""
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already RSVPd
    existing = await db.rsvps.find_one({
        "event_id": event_id,
        "user_id": current_user.id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already RSVPd to this event")
    
    # Get user display name
    display_name = current_user.email
    if current_user.individual_profile:
        display_name = current_user.individual_profile.display_name
    elif current_user.organization_profile:
        display_name = current_user.organization_profile.name
    
    rsvp = RSVP(
        event_id=event_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=display_name
    )
    await db.rsvps.insert_one(rsvp.dict())
    
    # Increment RSVP count
    await db.events.update_one(
        {"id": event_id},
        {"$inc": {"rsvp_count": 1}}
    )
    
    return rsvp

@api_router.delete("/events/{event_id}/rsvp", response_model=MessageResponse)
async def cancel_rsvp(event_id: str, current_user: User = Depends(get_current_user)):
    """Cancel RSVP to an event"""
    result = await db.rsvps.delete_one({
        "event_id": event_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    # Decrement RSVP count
    await db.events.update_one(
        {"id": event_id},
        {"$inc": {"rsvp_count": -1}}
    )
    
    return MessageResponse(message="RSVP cancelled")

@api_router.get("/events/{event_id}/rsvps", response_model=List[RSVP])
async def get_event_rsvps(event_id: str):
    """Get all RSVPs for an event"""
    rsvps = await db.rsvps.find({"event_id": event_id}).to_list(1000)
    return [RSVP(**rsvp) for rsvp in rsvps]

@api_router.get("/users/me/rsvps", response_model=List[dict])
async def get_my_rsvps(current_user: User = Depends(get_current_user)):
    """Get all RSVPs for current user with event details"""
    rsvps = await db.rsvps.find({"user_id": current_user.id}).to_list(1000)
    
    result = []
    for rsvp in rsvps:
        event = await db.events.find_one({"id": rsvp['event_id']})
        if event:
            result.append({
                "rsvp": RSVP(**rsvp).dict(),
                "event": Event(**event).dict()
            })
    
    return result

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Mutual Aid API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== STARTUP: Seed Admin Account ==============

@app.on_event("startup")
async def startup_event():
    """Create admin account on startup if it doesn't exist"""
    admin_email = "theredthreadapp@gmail.com"
    admin_password = "1234"
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            user_type="admin",
            auth_provider="email",
            is_verified=True,
            approval_status="approved",
            individual_profile=IndividualProfile(
                display_name="Admin"
            )
        )
        await db.users.insert_one(admin_user.dict())
        logger.info("Admin account created: %s", admin_email)
    else:
        logger.info("Admin account already exists: %s", admin_email)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
