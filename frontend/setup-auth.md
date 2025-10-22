# Authentication Setup Guide

## Quick Setup

1. **Create environment file**:
```bash
cp .env.local.example .env.local
```

2. **Edit `.env.local`** with your database and email settings:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shamay_ai"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Email Configuration
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@shamay.ai"
```

3. **Set up database**:
```bash
npm run db:push
npm run db:seed
```

4. **Start development server**:
```bash
npm run dev
```

## For Development (No Email Required)

If you want to test without setting up email, you can modify the auth configuration to skip email verification temporarily.

## Database Setup

Make sure you have PostgreSQL running and create a database named `shamay_ai`.

## Email Setup (Optional for Testing)

For Gmail:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in EMAIL_SERVER_PASSWORD

## Testing

### Option 1: Admin Access (Development)
1. Visit `http://localhost:3000`
2. Click "התחברות" (Sign In)
3. Use admin credentials:
   - **Email**: `admin@shamay.ai`
   - **Password**: `admin123`
4. You'll be redirected to the dashboard with full access

### Option 2: Create New Organization
1. Visit `http://localhost:3000`
2. Click "התחל עכשיו" (Get Started)
3. Fill out the sign-up form
4. Choose between email/password or magic link authentication
5. You'll be redirected to the dashboard

### Option 3: Magic Link (Requires Email Setup)
1. Visit `http://localhost:3000`
2. Click "התחברות" (Sign In)
3. Switch to "קישור אימייל" tab
4. Enter your email
5. Check your email for the magic link
6. Click the link to sign in
