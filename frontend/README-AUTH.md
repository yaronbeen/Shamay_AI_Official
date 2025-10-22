# Shamay.AI Authentication & Dashboard System

## Overview

This implementation adds a complete authentication and dashboard system to the existing Shamay-slow project, featuring:

- **Multi-tenant organization-based access control**
- **NextAuth.js with magic link authentication**
- **Role-based permissions (OWNER, ORG_ADMIN, APPRAISER, CLIENT_VIEWER)**
- **Hebrew/RTL support**
- **Dashboard for managing שומות (valuations), uploads, and assets**
- **File storage framework (local dev, S3-ready for production)**

## Features Implemented

### Authentication
- Magic link email authentication
- Organization-based multi-tenancy
- Role-based access control
- Protected routes with middleware

### Dashboard
- **השומות שלי** (My Valuations) - List and manage valuation sessions
- **העלאות** (Uploads) - View uploaded documents and images
- **נכסים שנוצרו** (Assets) - Generated reports and files
- Create new valuations with Hebrew form validation
- Edit existing valuations with autosave

### Database Schema
- Organizations, Users, Memberships
- Valuations with Hebrew property fields (גוש, חלקה, תת)
- Documents, Images, Assets with proper indexing
- Activity logging for audit trail
- Outbox pattern for background jobs

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shamay_ai"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Email Configuration (for magic link authentication)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@shamay.ai"
```

### 2. Database Setup

```bash
# Push the schema to your database
npm run db:push

# Seed the database with demo data
npm run db:seed
```

### 3. Start the Development Server

```bash
npm run dev
```

## Usage

### First Time Setup
1. Visit `http://localhost:3000`
2. You'll be redirected to `/sign-up`
3. Create a new organization and user account
4. Check your email for the magic link
5. Click the link to sign in
6. You'll be redirected to the dashboard

### Demo Data
The seed script creates:
- Demo organization: "דוגמה - משרד שמאי מקרקעין"
- Demo user: owner@demo.com
- Sample valuation with Hebrew address
- Sample document and asset

### Dashboard Features
- **Create New Valuation**: Click "+ שומה חדשה" button
- **Edit Valuations**: Click on any valuation to edit details
- **View Uploads**: Switch to "העלאות" tab to see documents and images
- **View Assets**: Switch to "נכסים שנוצרו" tab to see generated files
- **Settings**: Access user settings and sign out

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── uploads/page.tsx
│   │   │   ├── assets/page.tsx
│   │   │   └── valuations/[id]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── organizations/route.ts
│   │   │   ├── valuations/route.ts
│   │   │   ├── uploads/route.ts
│   │   │   └── assets/route.ts
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn/ui components)
│   │   └── dashboard/ (dashboard-specific components)
│   └── lib/
│       ├── auth.ts
│       ├── db.ts
│       ├── access-control.ts
│       ├── validations.ts
│       └── storage.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── middleware.ts
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Magic link authentication
- `GET /api/auth/session` - Get current session

### Organizations
- `POST /api/organizations` - Create organization

### Valuations
- `GET /api/valuations` - List valuations (with search/filter)
- `POST /api/valuations` - Create valuation
- `GET /api/valuations/[id]` - Get valuation details
- `PATCH /api/valuations/[id]` - Update valuation

### Uploads
- `GET /api/uploads` - List documents and images
- `POST /api/uploads/presign` - Get presigned upload URL

### Assets
- `GET /api/assets` - List generated assets
- `GET /api/assets/[id]/download` - Download asset

## Security Features

- **Organization Isolation**: All data is scoped by organization
- **Role-Based Access**: Different permissions for different roles
- **Protected Routes**: Middleware protects sensitive endpoints
- **Input Validation**: Zod schemas validate all inputs
- **Activity Logging**: All actions are logged for audit

## Hebrew/RTL Support

- All UI labels in Hebrew where appropriate
- RTL layout support with `dir="rtl"`
- Hebrew form validation messages
- Hebrew date formatting
- Hebrew property field names (גוש, חלקה, תת)

## Production Deployment

For production deployment:

1. **Database**: Use PostgreSQL with proper connection pooling
2. **File Storage**: Configure AWS S3 or compatible storage
3. **Email**: Set up proper SMTP server for magic links
4. **Environment**: Set all environment variables
5. **Security**: Use strong NEXTAUTH_SECRET and database credentials

## Next Steps

This implementation provides the foundation for a complete property valuation system. Additional features can be added:

- Advanced valuation editing with sections
- Document processing and OCR
- Report generation and PDF export
- User invitation system
- Advanced file management
- Integration with existing Shamay-slow features

The system is designed to be extensible and maintainable, with proper separation of concerns and type safety throughout.
