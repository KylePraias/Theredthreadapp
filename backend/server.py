from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import random
import string
import requests
from fastapi.responses import HTMLResponse

import re

import re

# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Firebase initialization
firebase_cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '/secrets/firebase-admin.json')
FIREBASE_API_KEY: str = os.environ.get('FIREBASE_API_KEY', 'AIzaSyCzFY8f6MPTH1dFKF29GJqGV5Ho6M1Oy6k')

if not firebase_admin._apps:
    if os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
    else:
        cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Password validation helper
def validate_password(password: str) -> tuple[bool, str]:
    """Validate password meets requirements: 8+ chars, 1 number, 1 special char"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character (!@#$%^&* etc.)"
    return True, ""

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
    DEVELOPER = "developer"

class ApprovalStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Base User Model
class UserBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    user_type: str  # individual, organization, admin, developer
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    oob_code: Optional[str] = None  # Firebase out-of-band code from the verification link
    token: Optional[str] = None  # Custom verification token (fallback)

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class VerificationCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    code: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# ============== FIRESTORE HELPER FUNCTIONS ==============

def serialize_for_firestore(data: dict) -> dict:
    """Convert datetime objects to ISO strings for Firestore"""
    result = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_for_firestore(value)
        elif isinstance(value, list):
            result[key] = [serialize_for_firestore(v) if isinstance(v, dict) else v for v in value]
        else:
            result[key] = value
    return result

def deserialize_from_firestore(data: dict) -> dict:
    """Convert ISO strings back to datetime objects from Firestore"""
    if not data:
        return data
    result = {}
    datetime_fields = ['created_at', 'updated_at', 'expires_at', 'date']
    for key, value in data.items():
        if key in datetime_fields and isinstance(value, str):
            try:
                result[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                result[key] = value
        elif isinstance(value, dict):
            result[key] = deserialize_from_firestore(value)
        else:
            result[key] = value
    return result

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
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
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
    
    # Query Firestore for user
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('id', '==', user_id)).limit(1)
    docs = query.stream()
    user_dict = None
    for doc in docs:
        user_dict = deserialize_from_firestore(doc.to_dict())
        break
    
    if user_dict is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_dict)

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is admin"""
    if current_user.user_type not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_developer_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is developer"""
    if current_user.user_type != "developer":
        raise HTTPException(status_code=403, detail="Developer access required")
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

@api_router.get("/auth/verify-email-complete")
async def verify_email_complete(token: str, email: str):
    """Handle email verification link click"""
    try:
        tokens_ref = db.collection('email_verification_tokens')
        query = tokens_ref.where(filter=FieldFilter('email', '==', email)).where(filter=FieldFilter('token', '==', token)).where(filter=FieldFilter('used', '==', False)).limit(1)
        token_docs = list(query.stream())

        if not token_docs:
            return HTMLResponse("<h2>❌ Invalid or already used verification link.</h2>")

        token_data = deserialize_from_firestore(token_docs[0].to_dict())
        expires_at = token_data.get('expires_at')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            return HTMLResponse("<h2>❌ Verification link has expired. Please request a new one.</h2>")

        # Mark token as used
        token_docs[0].reference.update({'used': True})

        # Mark user as verified
        users_ref = db.collection('users')
        user_query = users_ref.where(filter=FieldFilter('email', '==', email)).limit(1)
        user_docs = list(user_query.stream())
        if user_docs:
            user_dict = deserialize_from_firestore(user_docs[0].to_dict())
            db.collection('users').document(user_docs[0].id).update({'is_verified': True})

            # Notify admin if organization
            if user_dict.get('user_type') == 'organization':
                org_profile = user_dict.get('organization_profile', {})
                await send_admin_notification(
                    org_profile.get('name', 'Unknown'),
                    user_dict.get('email', '')
                )
                logger.info("Admin notification sent for org: %s", org_profile.get('name'))

        return HTMLResponse("""
            <div style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>✅ Email verified successfully!</h2>
                <p>You can now go back to the app and log in.</p>
            </div>
        """)

    except Exception as e:
        logger.error("Verification error: %s", str(e))
        return HTMLResponse("<h2>❌ Verification failed. Please try again.</h2>")

async def send_verification_email(email: str, continue_url: str = None):
    """Send verification email via Gmail SMTP"""
    try:
        firebase_user = firebase_auth.get_user_by_email(email)
    except firebase_auth.UserNotFoundError:
        logger.error("Firebase user not found for email: %s", email)
        return None

    if not continue_url:
        continue_url = os.environ.get('FRONTEND_URL', 'http://localhost:8001')

    try:
        # Generate verification token
        import secrets
        verification_token = secrets.token_urlsafe(32)

        # Store token in Firestore
        db.collection('email_verification_tokens').add({
            'email': email,
            'token': verification_token,
            'firebase_uid': firebase_user.uid,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'expires_at': (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            'used': False
        })

        base_url = os.environ.get('BASE_URL', 'https://theredthreadapp-backend-202099205262.us-east4.run.app')
        verification_link = f"{base_url}/api/auth/verify-email-complete?token={verification_token}&email={email}"   
        
        # Send email via Gmail SMTP
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        gmail_address = os.environ.get('GMAIL_ADDRESS')
        gmail_password = os.environ.get('GMAIL_APP_PASSWORD')

        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Verify your Red Thread account"
        msg['From'] = gmail_address
        msg['To'] = email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to The Red Thread!</h2>
            <p>Click the button below to verify your email address:</p>
            <a href="{verification_link}" 
               style="background-color: #e63946; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{verification_link}</p>
            <p>This link expires in 24 hours.</p>
        </div>
        """

        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_address, gmail_password)
            server.send_message(msg)

        logger.info("Verification email sent to: %s", email)
        return verification_link

    except Exception as e:
        logger.error("Failed to send verification email: %s", str(e))
        return None

async def send_admin_notification(org_name: str, org_email: str):
    """
    Notify admin about new organization signup.
    Stores notification in Firestore and sends email to admin.
    """
    admin_email = "theredthreadapp@gmail.com"
    
    try:
        notification_data = {
            'to': admin_email,
            'type': 'organization_approval',
            'org_name': org_name,
            'org_email': org_email,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read': False
        }
        
        db.collection('admin_notifications').add(notification_data)
        logger.info("Admin notification created for new org: %s", org_name)
    except Exception as e:
        logger.error("Failed to create admin notification: %s", str(e))
        return False

    # Send email to admin
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        gmail_address = os.environ.get('GMAIL_ADDRESS')
        gmail_password = os.environ.get('GMAIL_APP_PASSWORD')

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Organization Registration: {org_name}"
        msg['From'] = gmail_address
        msg['To'] = admin_email

        html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px;">
                <h2 style="color: #222;">New Organization Registration</h2>
                <p style="color: #444;">A new organization has registered and is awaiting your approval:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #f0f0f0;">
                        <td style="padding: 12px; color: #444; font-weight: bold; width: 40%;">Organization Name</td>
                        <td style="padding: 12px; color: #222;">{org_name}</td>
                    </tr>
                    <tr style="background-color: #fff;">
                        <td style="padding: 12px; color: #444; font-weight: bold;">Contact Email</td>
                        <td style="padding: 12px; color: #222;">{org_email}</td>
                    </tr>
                </table>
                <p style="color: #444;">Log in to the admin panel to review and approve or reject this organization.</p>
            </div>
            """

        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_address, gmail_password)
            server.send_message(msg)

        logger.info("Admin notification email sent for new org: %s", org_name)
        return True

    except Exception as e:
        logger.error("Failed to send admin notification email: %s", str(e))
        return False

# ============== AUTH ROUTES ==============

class RegistrationResponse(BaseModel):
    message: str
    verification_link: Optional[str] = None  # Only included in development

@api_router.post("/auth/register/individual", response_model=RegistrationResponse)
async def register_individual(data: IndividualRegister):
    """Register a new individual user"""
    # Validate password
    is_valid, error_message = validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if email exists
    users_ref = db.collection('users')
    existing_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
    existing_docs = list(existing_query.stream())
    if existing_docs:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user in Firebase Auth (for email link verification)
    try:
        firebase_user = firebase_auth.create_user(email=data.email, password=data.password)
        firebase_uid = firebase_user.uid
    except firebase_auth.EmailAlreadyExistsError:
        # User exists in Firebase Auth but not in our DB - get existing
        firebase_user = firebase_auth.get_user_by_email(data.email)
        firebase_uid = firebase_user.uid
    except Exception as e:
        logger.error("Failed to create Firebase Auth user: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create user account")
    
    # Create user in Firestore (unverified)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        user_type="individual",
        auth_provider="email",
        firebase_uid=firebase_uid,
        is_verified=False,
        approval_status="approved",
        individual_profile=IndividualProfile(
            display_name=data.display_name,
            bio=data.bio,
            interests=data.interests or []
        )
    )
    db.collection('users').document(user.id).set(
        serialize_for_firestore(user.model_dump())
    )
    
    # Generate and send verification link
    verification_link = await send_verification_email(data.email)
    
    return RegistrationResponse(
        message="Verification link sent to your email. Please check your inbox and click the link to verify.",
        verification_link=verification_link  # Include for development/testing
    )

@api_router.post("/auth/register/organization", response_model=RegistrationResponse)
async def register_organization(data: OrganizationRegister):
    """Register a new organization"""
    # Validate password
    is_valid, error_message = validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if email exists
    users_ref = db.collection('users')
    existing_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
    existing_docs = list(existing_query.stream())
    if existing_docs:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user in Firebase Auth (for email link verification)
    try:
        firebase_user = firebase_auth.create_user(email=data.email, password=data.password)
        firebase_uid = firebase_user.uid
    except firebase_auth.EmailAlreadyExistsError:
        firebase_user = firebase_auth.get_user_by_email(data.email)
        firebase_uid = firebase_user.uid
    except Exception as e:
        logger.error("Failed to create Firebase Auth user: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create user account")
    
    # Create organization user in Firestore (unverified, pending approval)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        user_type="organization",
        auth_provider="email",
        firebase_uid=firebase_uid,
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
    db.collection('users').document(user.id).set(
        serialize_for_firestore(user.model_dump())
    )
    
    # Generate and send verification link
    verification_link = await send_verification_email(data.email)
    
    return RegistrationResponse(
        message="Verification link sent to your email. Please check your inbox and click the link to verify.",
        verification_link=verification_link
    )

@api_router.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(data: VerifyEmailRequest):
    """Verify email using Firebase oob_code or custom token from verification link"""
    
    # Try custom token verification first (our fallback approach)
    if data.token:
        try:
            # Find the verification token
            tokens_ref = db.collection('email_verification_tokens')
            query = tokens_ref.where(filter=FieldFilter('email', '==', data.email)).where(filter=FieldFilter('token', '==', data.token)).where(filter=FieldFilter('used', '==', False)).limit(1)
            token_docs = list(query.stream())
            
            if not token_docs:
                raise HTTPException(status_code=400, detail="Invalid or expired verification link")
            
            token_data = deserialize_from_firestore(token_docs[0].to_dict())
            
            # Check if expired
            expires_at = token_data.get('expires_at')
            if expires_at:
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    raise HTTPException(status_code=400, detail="Verification link has expired")
            
            # Mark token as used
            token_docs[0].reference.update({'used': True})
            
            # Mark user as verified in Firebase Auth
            try:
                firebase_auth.update_user(token_data['firebase_uid'], email_verified=True)
            except Exception as e:
                logger.warning("Could not update Firebase Auth email_verified: %s", str(e))
            
            # Find and update user in Firestore as verified
            users_ref = db.collection('users')
            user_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
            user_docs = list(user_query.stream())
            
            if not user_docs:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_doc = user_docs[0]
            db.collection('users').document(user_doc.id).update({'is_verified': True})
            
            # Get updated user
            user_dict = deserialize_from_firestore(db.collection('users').document(user_doc.id).get().to_dict())
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
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Token verification error: %s", str(e))
            raise HTTPException(status_code=400, detail="Verification failed. Please try again.")
    
    # Try Firebase oobCode verification
    if data.oob_code:
        try:
            # Use Firebase REST API to apply the action code (verify email)
            verify_url = f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={FIREBASE_API_KEY}"
            
            response = requests.post(verify_url, json={
                "oobCode": data.oob_code
            })
            
            if response.status_code != 200:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', 'Verification failed')
                logger.error("Firebase verification failed: %s", error_message)
                raise HTTPException(status_code=400, detail=f"Verification failed: {error_message}")
            
            # Find user in Firestore and mark as verified
            users_ref = db.collection('users')
            user_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
            user_docs = list(user_query.stream())
            
            if not user_docs:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_doc = user_docs[0]
            db.collection('users').document(user_doc.id).update({'is_verified': True})
            
            # Get updated user
            user_dict = deserialize_from_firestore(db.collection('users').document(user_doc.id).get().to_dict())
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
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Firebase oobCode verification error: %s", str(e))
            raise HTTPException(status_code=400, detail="Verification failed. Please try again.")
    
    raise HTTPException(status_code=400, detail="Verification token or code is required")

@api_router.post("/auth/resend-verification", response_model=RegistrationResponse)
async def resend_verification(data: ResendVerificationRequest):
    """Resend verification link"""
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
    user_docs = list(user_query.stream())
    
    if not user_docs:
        raise HTTPException(status_code=404, detail="Email not found")
    
    user_dict = user_docs[0].to_dict()
    if user_dict['is_verified']:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate and send new verification link
    verification_link = await send_verification_email(data.email)
    
    if not verification_link:
        raise HTTPException(status_code=500, detail="Failed to generate verification link")
    
    return RegistrationResponse(
        message="New verification link sent to your email",
        verification_link=verification_link
    )

class CheckVerificationRequest(BaseModel):
    email: EmailStr

class CheckVerificationResponse(BaseModel):
    is_verified: bool

@api_router.post("/auth/check-verification", response_model=CheckVerificationResponse)
async def check_verification_status(data: CheckVerificationRequest):
    """Check if an email has been verified (for polling during signup)"""
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
    user_docs = list(user_query.stream())
    
    if not user_docs:
        return CheckVerificationResponse(is_verified=False)
    
    user_dict = user_docs[0].to_dict()
    return CheckVerificationResponse(is_verified=user_dict.get('is_verified', False))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login with email and password"""
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
    user_docs = list(user_query.stream())
    
    if not user_docs:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict = deserialize_from_firestore(user_docs[0].to_dict())
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
    users_ref = db.collection('users')
    
    # Check by firebase_uid first
    uid_query = users_ref.where(filter=FieldFilter('firebase_uid', '==', data.firebase_uid)).limit(1)
    uid_docs = list(uid_query.stream())
    
    if uid_docs:
        user_dict = deserialize_from_firestore(uid_docs[0].to_dict())
        user = User(**user_dict)
    else:
        # Check by email
        email_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
        email_docs = list(email_query.stream())
        
        if email_docs:
            existing = deserialize_from_firestore(email_docs[0].to_dict())
            # Update firebase_uid if needed
            if not existing.get('firebase_uid'):
                db.collection('users').document(email_docs[0].id).update({
                    'firebase_uid': data.firebase_uid,
                    'auth_provider': 'google'
                })
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
            db.collection('users').document(user.id).set(
                serialize_for_firestore(user.model_dump())
            )
    
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/google/organization", response_model=TokenResponse)
async def google_sign_in_organization(data: GoogleOrgSignIn):
    """Google sign-in for organizations"""
    users_ref = db.collection('users')
    
    # Check by firebase_uid first
    uid_query = users_ref.where(filter=FieldFilter('firebase_uid', '==', data.firebase_uid)).limit(1)
    uid_docs = list(uid_query.stream())
    
    if uid_docs:
        user_dict = deserialize_from_firestore(uid_docs[0].to_dict())
        user = User(**user_dict)
    else:
        # Check by email
        email_query = users_ref.where(filter=FieldFilter('email', '==', data.email)).limit(1)
        email_docs = list(email_query.stream())
        
        if email_docs:
            user_dict = deserialize_from_firestore(email_docs[0].to_dict())
            user = User(**user_dict)
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
            db.collection('users').document(user.id).set(
                serialize_for_firestore(user.model_dump())
            )
            
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
    
    # Find user document and update
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('id', '==', current_user.id)).limit(1)
    user_docs = list(user_query.stream())
    if user_docs:
        db.collection('users').document(user_docs[0].id).update({'password_hash': new_hash})
    
    return MessageResponse(message="Password changed successfully")

# ============== USER ROUTES ==============

# Partial update models for profile editing
class IndividualProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None

class OrganizationProfileUpdate(BaseModel):
    description: Optional[str] = None
    areas_of_focus: Optional[List[str]] = None
    website: Optional[str] = None
    contact_email: Optional[EmailStr] = None

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
    if current_user.user_type not in ["individual", "admin", "developer"]:
        raise HTTPException(status_code=400, detail="Not an individual/admin/developer account")
    
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('id', '==', current_user.id)).limit(1)
    user_docs = list(user_query.stream())
    if user_docs:
        db.collection('users').document(user_docs[0].id).update({
            'individual_profile': profile.model_dump()
        })

    # Get updated user
    updated_doc = db.collection('users').document(user_docs[0].id).get()
    user_dict = deserialize_from_firestore(updated_doc.to_dict())
    return user_to_response(User(**user_dict))

@api_router.patch("/users/me/individual", response_model=UserResponse)
async def partial_update_individual_profile(
    profile_update: IndividualProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Partially update individual profile (only display_name and bio)"""
    if current_user.user_type not in ["individual", "admin", "developer"]:
        raise HTTPException(status_code=400, detail="Not an individual/admin/developer account")
    
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('id', '==', current_user.id)).limit(1)
    user_docs = list(user_query.stream())
    
    if not user_docs:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current profile and update only provided fields
    current_profile = current_user.individual_profile.model_dump() if current_user.individual_profile else {}
    
    if profile_update.display_name is not None:
        current_profile['display_name'] = profile_update.display_name
    if profile_update.bio is not None:
        current_profile['bio'] = profile_update.bio
    
    db.collection('users').document(user_docs[0].id).update({
        'individual_profile': current_profile
    })
    
    # Get updated user
    updated_doc = db.collection('users').document(user_docs[0].id).get()
    user_dict = deserialize_from_firestore(updated_doc.to_dict())
    return user_to_response(User(**user_dict))

@api_router.put("/users/me/organization", response_model=UserResponse)
async def update_organization_profile(
    profile: OrganizationProfile,
    current_user: User = Depends(get_current_user)
):
    """Update organization profile"""
    if current_user.user_type != "organization":
        raise HTTPException(status_code=400, detail="Not an organization account")
    
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('id', '==', current_user.id)).limit(1)
    user_docs = list(user_query.stream())
    if user_docs:
        db.collection('users').document(user_docs[0].id).update({
            'organization_profile': profile.model_dump()
        })
    
    # Get updated user
    updated_doc = db.collection('users').document(user_docs[0].id).get()
    user_dict = deserialize_from_firestore(updated_doc.to_dict())
    return user_to_response(User(**user_dict))

@api_router.patch("/users/me/organization", response_model=UserResponse)
async def partial_update_organization_profile(
    profile_update: OrganizationProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Partially update organization profile (description, areas_of_focus, website, contact_email)"""
    if current_user.user_type != "organization":
        raise HTTPException(status_code=400, detail="Not an organization account")
    
    users_ref = db.collection('users')
    user_query = users_ref.where(filter=FieldFilter('id', '==', current_user.id)).limit(1)
    user_docs = list(user_query.stream())
    
    if not user_docs:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current profile and update only provided fields
    current_profile = current_user.organization_profile.model_dump() if current_user.organization_profile else {}
    
    if profile_update.description is not None:
        current_profile['description'] = profile_update.description
    if profile_update.areas_of_focus is not None:
        current_profile['areas_of_focus'] = profile_update.areas_of_focus
    if profile_update.website is not None:
        current_profile['website'] = profile_update.website
    if profile_update.contact_email is not None:
        current_profile['contact_email'] = profile_update.contact_email
    
    db.collection('users').document(user_docs[0].id).update({
        'organization_profile': current_profile
    })
    
    # Get updated user
    updated_doc = db.collection('users').document(user_docs[0].id).get()
    user_dict = deserialize_from_firestore(updated_doc.to_dict())
    return user_to_response(User(**user_dict))

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/organizations/pending", response_model=List[UserResponse])
async def get_pending_organizations(admin: User = Depends(get_admin_user)):
    """Get all pending organization approvals"""
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('user_type', '==', 'organization')).where(filter=FieldFilter('approval_status', '==', 'pending')).where(filter=FieldFilter('is_verified', '==', True))
    docs = query.stream()
    
    return [user_to_response(User(**deserialize_from_firestore(doc.to_dict()))) for doc in docs]

@api_router.post("/admin/organizations/{org_id}/approve", response_model=UserResponse)
async def approve_organization(org_id: str, admin: User = Depends(get_admin_user)):
    """Approve an organization"""
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('id', '==', org_id)).where(filter=FieldFilter('user_type', '==', 'organization')).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    db.collection('users').document(docs[0].id).update({'approval_status': 'approved'})
    
    updated_doc = db.collection('users').document(docs[0].id).get()
    return user_to_response(User(**deserialize_from_firestore(updated_doc.to_dict())))

@api_router.post("/admin/organizations/{org_id}/reject", response_model=UserResponse)
async def reject_organization(org_id: str, admin: User = Depends(get_admin_user)):
    """Reject an organization"""
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('id', '==', org_id)).where(filter=FieldFilter('user_type', '==', 'organization')).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    db.collection('users').document(docs[0].id).update({'approval_status': 'rejected'})
    
    updated_doc = db.collection('users').document(docs[0].id).get()
    return user_to_response(User(**deserialize_from_firestore(updated_doc.to_dict())))

@api_router.get("/admin/organizations/all", response_model=List[UserResponse])
async def get_all_organizations(admin: User = Depends(get_admin_user)):
    """Get all organizations"""
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('user_type', '==', 'organization'))
    docs = query.stream()
    
    return [user_to_response(User(**deserialize_from_firestore(doc.to_dict()))) for doc in docs]

# ============== DEVELOPER ROUTES ==============

class SearchUsersResponse(BaseModel):
    users: List[UserResponse]
    total: int

class AssignRoleRequest(BaseModel):
    user_id: str
    role: str  # admin or individual

@api_router.get("/developer/users/search", response_model=SearchUsersResponse)
async def search_users(
    query: str = "",
    developer: User = Depends(get_developer_user)
):
    """Search users by email or display name (developer only)"""
    users_ref = db.collection('users')
    all_docs = users_ref.stream()
    
    results = []
    query_lower = query.lower()
    
    for doc in all_docs:
        user_dict = deserialize_from_firestore(doc.to_dict())
        user = User(**user_dict)
            
        # Search by email
        if query_lower in user.email.lower():
            results.append(user_to_response(user))
            continue
            
        # Search by display name (individual profile)
        if user.individual_profile and query_lower in user.individual_profile.display_name.lower():
            results.append(user_to_response(user))
            continue
            
        # Search by organization name
        if user.organization_profile and query_lower in user.organization_profile.name.lower():
            results.append(user_to_response(user))
            continue
    
    return SearchUsersResponse(users=results, total=len(results))

@api_router.post("/developer/users/{user_id}/assign-role", response_model=UserResponse)
async def assign_user_role(
    user_id: str,
    role_request: AssignRoleRequest,
    developer: User = Depends(get_developer_user)
):
    """Assign admin or individual role to a user (developer only)"""
    if role_request.role not in ["admin", "individual"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'individual'")
    
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('id', '==', user_id)).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dict = deserialize_from_firestore(docs[0].to_dict())
    
    # Cannot change developer or organization accounts
    if user_dict.get('user_type') == 'developer':
        raise HTTPException(status_code=400, detail="Cannot modify developer accounts")
    if user_dict.get('user_type') == 'organization':
        raise HTTPException(status_code=400, detail="Cannot change organization accounts to admin/individual")
    
    # Update the user's role
    db.collection('users').document(docs[0].id).update({'user_type': role_request.role})
    
    updated_doc = db.collection('users').document(docs[0].id).get()
    return user_to_response(User(**deserialize_from_firestore(updated_doc.to_dict())))

@api_router.get("/developer/users/all", response_model=List[UserResponse])
async def get_all_users(developer: User = Depends(get_developer_user)):
    """Get all users (developer only)"""
    users_ref = db.collection('users')
    docs = users_ref.stream()
    
    return [user_to_response(User(**deserialize_from_firestore(doc.to_dict()))) for doc in docs]

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
        **event_data.model_dump()
    )
    db.collection('events').document(event.id).set(
        serialize_for_firestore(event.model_dump())
    )
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(
    sort_by: str = "date",  # date, signups, created
    sort_order: str = "asc",  # asc, desc
    active_only: bool = True
):
    """Get all events with sorting"""
    events_ref = db.collection('events')
    
    # Simplified query to avoid composite index requirement
    # We'll filter and sort in Python instead of Firestore
    if active_only:
        # Simple query with just the is_active filter
        query = events_ref.where(filter=FieldFilter('is_active', '==', True))
    else:
        # Get all events
        query = events_ref
    
    docs = query.stream()
    events = []
    now = datetime.now(timezone.utc)
    
    for doc in docs:
        event_dict = deserialize_from_firestore(doc.to_dict())
        if active_only:
            # Filter out past events
            event_date = event_dict.get('date')
            if isinstance(event_date, datetime) and event_date >= now:
                events.append(Event(**event_dict))
        else:
            events.append(Event(**event_dict))
    
    # Sort in Python to avoid composite index requirement
    sort_field = "date"
    if sort_by == "signups":
        sort_field = "rsvp_count"
    elif sort_by == "created":
        sort_field = "created_at"
    
    reverse_order = sort_order == "desc"
    
    try:
        events.sort(key=lambda x: getattr(x, sort_field), reverse=reverse_order)
    except AttributeError:
        # Fallback to date sorting if field doesn't exist
        events.sort(key=lambda x: x.date, reverse=reverse_order)
    
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get a specific event"""
    events_ref = db.collection('events')
    query = events_ref.where(filter=FieldFilter('id', '==', event_id)).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return Event(**deserialize_from_firestore(docs[0].to_dict()))

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: User = Depends(get_organization_user)
):
    """Update an event (owner organization only)"""
    events_ref = db.collection('events')
    query = events_ref.where(filter=FieldFilter('id', '==', event_id)).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_dict = docs[0].to_dict()
    if event_dict['organization_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    update_data = {k: v for k, v in event_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    if 'date' in update_data and isinstance(update_data['date'], datetime):
        update_data['date'] = update_data['date'].isoformat()
    
    db.collection('events').document(docs[0].id).update(update_data)
    
    updated_doc = db.collection('events').document(docs[0].id).get()
    return Event(**deserialize_from_firestore(updated_doc.to_dict()))

@api_router.delete("/events/{event_id}", response_model=MessageResponse)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_organization_user)
):
    """Delete an event (owner organization only)"""
    events_ref = db.collection('events')
    query = events_ref.where(filter=FieldFilter('id', '==', event_id)).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_dict = docs[0].to_dict()
    if event_dict['organization_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    # Delete event
    db.collection('events').document(docs[0].id).delete()
    
    # Delete associated RSVPs
    rsvps_ref = db.collection('rsvps')
    rsvp_query = rsvps_ref.where(filter=FieldFilter('event_id', '==', event_id))
    rsvp_docs = rsvp_query.stream()
    for rsvp_doc in rsvp_docs:
        rsvp_doc.reference.delete()
    
    return MessageResponse(message="Event deleted successfully")

@api_router.get("/organizations/{org_id}/events", response_model=List[Event])
async def get_organization_events(org_id: str):
    """Get all events by an organization"""
    events_ref = db.collection('events')
    query = events_ref.where(filter=FieldFilter('organization_id', '==', org_id)).order_by('date')
    docs = query.stream()
    
    return [Event(**deserialize_from_firestore(doc.to_dict())) for doc in docs]

# ============== RSVP ROUTES ==============

@api_router.post("/events/{event_id}/rsvp", response_model=RSVP)
async def rsvp_to_event(event_id: str, current_user: User = Depends(get_current_user)):
    """RSVP to an event"""
    events_ref = db.collection('events')
    event_query = events_ref.where(filter=FieldFilter('id', '==', event_id)).where(filter=FieldFilter('is_active', '==', True)).limit(1)
    event_docs = list(event_query.stream())
    
    if not event_docs:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already RSVPd
    rsvps_ref = db.collection('rsvps')
    existing_query = rsvps_ref.where(filter=FieldFilter('event_id', '==', event_id)).where(filter=FieldFilter('user_id', '==', current_user.id)).limit(1)
    existing_docs = list(existing_query.stream())
    
    if existing_docs:
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
    db.collection('rsvps').document(rsvp.id).set(
        serialize_for_firestore(rsvp.model_dump())
    )
    
    # Increment RSVP count
    event_doc = event_docs[0]
    current_count = event_doc.to_dict().get('rsvp_count', 0)
    db.collection('events').document(event_doc.id).update({'rsvp_count': current_count + 1})
    
    return rsvp

@api_router.delete("/events/{event_id}/rsvp", response_model=MessageResponse)
async def cancel_rsvp(event_id: str, current_user: User = Depends(get_current_user)):
    """Cancel RSVP to an event"""
    rsvps_ref = db.collection('rsvps')
    query = rsvps_ref.where(filter=FieldFilter('event_id', '==', event_id)).where(filter=FieldFilter('user_id', '==', current_user.id)).limit(1)
    docs = list(query.stream())
    
    if not docs:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    # Delete RSVP
    docs[0].reference.delete()
    
    # Decrement RSVP count
    events_ref = db.collection('events')
    event_query = events_ref.where(filter=FieldFilter('id', '==', event_id)).limit(1)
    event_docs = list(event_query.stream())
    if event_docs:
        current_count = event_docs[0].to_dict().get('rsvp_count', 0)
        db.collection('events').document(event_docs[0].id).update({'rsvp_count': max(0, current_count - 1)})
    
    return MessageResponse(message="RSVP cancelled")

@api_router.get("/events/{event_id}/rsvps", response_model=List[RSVP])
async def get_event_rsvps(event_id: str):
    """Get all RSVPs for an event"""
    rsvps_ref = db.collection('rsvps')
    query = rsvps_ref.where(filter=FieldFilter('event_id', '==', event_id))
    docs = query.stream()
    
    return [RSVP(**deserialize_from_firestore(doc.to_dict())) for doc in docs]

@api_router.get("/users/me/rsvps", response_model=List[dict])
async def get_my_rsvps(current_user: User = Depends(get_current_user)):
    """Get all RSVPs for current user with event details"""
    rsvps_ref = db.collection('rsvps')
    query = rsvps_ref.where(filter=FieldFilter('user_id', '==', current_user.id))
    rsvp_docs = query.stream()
    
    result = []
    for rsvp_doc in rsvp_docs:
        rsvp_dict = deserialize_from_firestore(rsvp_doc.to_dict())
        
        # Get event
        events_ref = db.collection('events')
        event_query = events_ref.where(filter=FieldFilter('id', '==', rsvp_dict['event_id'])).limit(1)
        event_docs = list(event_query.stream())
        
        if event_docs:
            event_dict = deserialize_from_firestore(event_docs[0].to_dict())
            result.append({
                "rsvp": RSVP(**rsvp_dict).model_dump(),
                "event": Event(**event_dict).model_dump()
            })
    
    return result

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Mutual Aid API is running", "database": "Firebase Firestore"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat(), "database": "Firebase Firestore"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
