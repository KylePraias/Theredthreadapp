# Red Thread - Mutual Aid & Event Organizing Platform

## Original Problem Statement
1. Migrate the project from MongoDB and SendGrid to Firebase Firestore database and Firebase email system.
2. Change email verification from verification codes to verification links.
3. Multiple UX fixes: logout redirect, tab visibility, password requirements, login routing, verification auto-redirect.

## Architecture Overview

### Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: Firebase Firestore (migrated from MongoDB)
- **Email Verification**: Firebase email link authentication (migrated from SendGrid verification codes)
- **Authentication**: JWT-based + Firebase Auth (Google Sign-In)

### Database Collections (Firestore)
- `users` - User accounts (individuals, organizations, admins)
- `events` - Events created by organizations
- `rsvps` - Event RSVPs
- `email_verification_tokens` - Secure tokens for email link verification
- `admin_notifications` - Notifications for admin about new organizations

## User Personas
1. **Individuals** - Can browse events, RSVP, manage profile
2. **Organizations** - Can create/manage events, requires admin approval
3. **Admins** - Can approve/reject organizations, full access (via Settings > Admin Dashboard)

## Core Requirements (Static)
- User registration (individual/organization)
- Email verification via verification links (not codes)
- Password requirements: 8+ characters, 1 number, 1 special character
- Google Sign-In support
- Event creation and management (organizations only)
- RSVP functionality
- Admin approval workflow for organizations

## What's Been Implemented

### Feb 21, 2026 - Database Migration
- ✅ Migrated backend from MongoDB (motor) to Firebase Firestore
- ✅ Migrated email from SendGrid to Firebase Firestore patterns
- ✅ Updated all CRUD operations for Firestore
- ✅ Preserved all API endpoints and business logic
- ✅ Fixed Firestore composite index issue by moving sorting to Python
- ✅ Updated environment variables for Firebase Admin SDK
- ✅ Updated frontend Firebase config

### Feb 21, 2026 - Email Verification Links
- ✅ Changed from 6-digit verification codes to secure verification links
- ✅ Registration now returns a verification link (for development/testing)
- ✅ Verification link contains secure token stored in Firestore
- ✅ Updated frontend to handle verification links
- ✅ Added verify-email-complete page for link handling
- ✅ Tokens expire after 24 hours
- ✅ Firebase Auth user is also created and marked as verified

### Feb 21, 2026 - UX Fixes
- ✅ **Sign Out**: Now redirects to login screen instead of root
- ✅ **Create Event Tab**: Only visible to approved organizations
- ✅ **Password Requirements**: 
  - Minimum 8 characters
  - At least one number
  - At least one special character (!@#$%^&* etc.)
  - Visual feedback during signup showing requirement status
  - Backend validation with specific error messages
- ✅ **Admin Login**: Goes to event feed, not admin dashboard (Admin Dashboard accessible via Settings)
- ✅ **Email Verification**: App polls to detect when email is verified and auto-redirects to login

### Email Verification Flow
1. User registers → Backend creates user in Firestore AND Firebase Auth
2. Backend generates secure token, stores in `email_verification_tokens` collection
3. Backend returns verification link: `/verify-email-complete?token=xxx&email=xxx`
4. User clicks link → Frontend calls backend to verify
5. Backend validates token, marks user as verified in both Firestore and Firebase Auth
6. User is redirected to login page (app also polls and auto-detects verification)

### API Endpoints (All Working)
- Auth: 
  - `/api/auth/register/individual` - Returns `verification_link`, validates password
  - `/api/auth/register/organization` - Returns `verification_link`, validates password
  - `/api/auth/verify-email` - Accepts `token` or `oob_code`
  - `/api/auth/resend-verification` - Returns new `verification_link`
  - `/api/auth/login`
  - `/api/auth/google/*`
- Users: `/api/users/me`, `/api/users/me/individual`, `/api/users/me/organization`
- Events: `/api/events` (CRUD), `/api/organizations/{org_id}/events`
- RSVPs: `/api/events/{event_id}/rsvp`, `/api/users/me/rsvps`
- Admin: `/api/admin/organizations/pending`, `/api/admin/organizations/{org_id}/approve|reject`

## Test Results
- 33/33 backend tests passing (100%)
- All verification link flows working
- Password validation working on frontend and backend

## Prioritized Backlog

### P0 - Critical (Done)
- ✅ Firebase Firestore database integration
- ✅ Email verification links (not codes)
- ✅ Password requirements
- ✅ UX fixes (logout, tabs, routing)

### P1 - Important
- Set up Firestore security rules
- Configure custom email templates in Firebase Console

### P2 - Nice to Have
- Real-time event updates using Firestore listeners
- Push notifications for RSVPs
- Image upload to Firebase Storage

## Local Development Setup
For local development, update `.env` files:

**Frontend `.env`:**
```
EXPO_PACKAGER_HOSTNAME=<YOUR_LOCAL_IP>
EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LOCAL_IP>:8001
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCzFY8f6MPTH1dFKF29GJqGV5Ho6M1Oy6k
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=redthread-e6955.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=redthread-e6955
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=redthread-e6955.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=202099205262
EXPO_PUBLIC_FIREBASE_APP_ID=1:202099205262:android:b929c9f2d421ffb6e6d5df
```

**Backend `.env`:**
```
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
GOOGLE_APPLICATION_CREDENTIALS="./firebase-admin.json"
FIREBASE_API_KEY=AIzaSyCzFY8f6MPTH1dFKF29GJqGV5Ho6M1Oy6k
FRONTEND_URL=http://<YOUR_LOCAL_IP>:8081
```

## Next Tasks
1. Test full user flow in React Native app with local setup
2. Set up proper Firestore security rules for production
3. Configure Firebase Console for custom email templates (optional)
4. Add authorized domains in Firebase Console for production email link verification
