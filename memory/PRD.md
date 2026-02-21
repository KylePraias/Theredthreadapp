# Red Thread - Mutual Aid & Event Organizing Platform

## Original Problem Statement
Migrate the project from MongoDB and SendGrid to Firebase Firestore database and Firebase email system.

## Architecture Overview

### Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: Firebase Firestore (migrated from MongoDB)
- **Email**: Firebase Firestore 'mail' collection pattern (migrated from SendGrid)
- **Authentication**: JWT-based + Firebase Auth (Google Sign-In)

### Database Collections (Firestore)
- `users` - User accounts (individuals, organizations, admins)
- `events` - Events created by organizations
- `rsvps` - Event RSVPs
- `verification_codes` - Email verification codes
- `mail` - Email queue (for Firebase Trigger Email extension)

## User Personas
1. **Individuals** - Can browse events, RSVP, manage profile
2. **Organizations** - Can create/manage events, requires admin approval
3. **Admins** - Can approve/reject organizations, full access

## Core Requirements (Static)
- User registration (individual/organization)
- Email verification with 6-digit codes
- Google Sign-In support
- Event creation and management (organizations)
- RSVP functionality
- Admin approval workflow for organizations

## What's Been Implemented

### Feb 21, 2026 - Database Migration
- ✅ Migrated backend from MongoDB (motor) to Firebase Firestore
- ✅ Migrated email from SendGrid to Firebase Firestore 'mail' collection
- ✅ Updated all CRUD operations for Firestore
- ✅ Preserved all API endpoints and business logic
- ✅ Fixed Firestore composite index issue by moving sorting to Python
- ✅ Updated environment variables for Firebase Admin SDK
- ✅ Updated frontend Firebase config

### API Endpoints (All Working)
- Auth: `/api/auth/register/individual`, `/api/auth/register/organization`, `/api/auth/verify-email`, `/api/auth/login`, `/api/auth/google/*`
- Users: `/api/users/me`, `/api/users/me/individual`, `/api/users/me/organization`
- Events: `/api/events` (CRUD), `/api/organizations/{org_id}/events`
- RSVPs: `/api/events/{event_id}/rsvp`, `/api/users/me/rsvps`
- Admin: `/api/admin/organizations/pending`, `/api/admin/organizations/{org_id}/approve|reject`

## Prioritized Backlog

### P0 - Critical (Done)
- ✅ Firebase Firestore database integration
- ✅ Firebase email system integration

### P1 - Important
- Configure Firebase Trigger Email extension for actual email delivery
- Set up Firestore security rules

### P2 - Nice to Have
- Real-time event updates using Firestore listeners
- Push notifications for RSVPs
- Image upload to Firebase Storage

## Next Tasks
1. Configure Firebase Trigger Email extension in Firebase Console for actual email delivery
2. Set up proper Firestore security rules for production
3. Test full user flow in React Native app
