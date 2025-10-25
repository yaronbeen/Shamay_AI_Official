# 🚀 Vercel Deployment Guide - SHAMAY.AI

Complete guide for deploying SHAMAY.AI to Vercel (Free Tier)

---

## 📋 Prerequisites

- GitHub account with your code pushed
- Vercel account (sign up at vercel.com)
- This codebase

---

## 🗄️ Step 1: Set Up Vercel Postgres Database

### 1.1 Create Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres** (Powered by Neon)
5. Database name: `shamay-land-registry`
6. Region: Choose closest to your users
7. Click **Create**

### 1.2 Connect Database to Your Project

1. In the database page, click **Connect Project**
2. Select your project (or create one if deploying for first time)
3. Vercel will automatically add environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`
   - `POSTGRES_HOST`

### 1.3 Initialize Database Schema

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run database setup
npm run setup-vercel-db
```

**Option B: Manual Setup via psql**

```bash
# Get connection string from Vercel Dashboard
# Copy POSTGRES_URL_NON_POOLING

# Connect with psql
psql "YOUR_POSTGRES_URL_NON_POOLING"

# Copy and paste contents of database/init_complete_database.sql
```

---

## 📦 Step 2: Set Up Vercel Blob Storage

### 2.1 Create Blob Store

1. In Vercel Dashboard > **Storage**
2. Click **Create Database** > Select **Blob**
3. Store name: `shamay-uploads`
4. Click **Create**

### 2.2 Connect to Project

1. Click **Connect Project**
2. Select your project
3. Vercel adds: `BLOB_READ_WRITE_TOKEN`

### 2.3 Install Dependencies

```bash
cd frontend
npm install @vercel/blob
```

---

## 🔧 Step 3: Configure Environment Variables

### 3.1 Required Environment Variables

Go to Vercel Dashboard > Your Project > **Settings** > **Environment Variables**

Add these variables:

```env
# Database (Auto-added by Vercel Postgres)
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Blob Storage (Auto-added by Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# NextAuth (Generate these!)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl

# OpenAI (Your API key)
OPENAI_API_KEY=sk-...

# App Config
NODE_ENV=production
```

### 3.2 Generate NEXTAUTH_SECRET

```bash
# Generate a secure secret
openssl rand -base64 32
```

Copy the output and use it as `NEXTAUTH_SECRET`

---

## 📝 Step 4: Update Code for Production

### 4.1 Update Database Connection

File: `frontend/src/lib/shumadb.js`

```javascript
// Replace local connection with Vercel Postgres
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
})
```

### 4.2 Update File Upload to Use Blob

File: `frontend/src/app/api/session/[sessionId]/upload/route.ts`

```typescript
import { BlobStorageService } from '@/lib/blob-storage'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (BlobStorageService.isProduction()) {
    // Production: Use Vercel Blob
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, pathname } = await BlobStorageService.uploadFile(
      buffer,
      sessionId,
      file.name
    )
    
    return NextResponse.json({
      url,
      path: pathname,
      name: file.name,
      size: file.size,
      mimeType: file.type
    })
  } else {
    // Development: Use local filesystem
    // ... existing local upload logic ...
  }
}
```

---

## 🚀 Step 5: Deploy to Vercel (UI Method)

### 5.1 Push Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for Vercel deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/shamay-ai.git
git push -u origin main
```

### 5.2 Import Project in Vercel UI

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** > **Project**
3. Click **Import** next to your GitHub repository
4. Configure Project:
   
   **Framework Preset**: Next.js (auto-detected)
   
   **Root Directory**: `frontend` ⚠️ **IMPORTANT!**
   
   **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`
   - Development Command: `npm run dev`

5. **Environment Variables**: Add these in the UI:
   ```
   NEXTAUTH_SECRET=your-generated-secret
   NEXTAUTH_URL=https://your-app.vercel.app
   OPENAI_API_KEY=your-openai-key
   ```
   
   *(Database and Blob variables will be auto-added when you connect storage)*

6. Click **Deploy**
7. Wait for deployment to complete (~2-3 minutes)

### 5.3 Alternative: Deploy via Vercel CLI

```bash
cd frontend
vercel --prod
```

---

## ✅ Step 6: Post-Deployment Setup

### 6.1 Initialize Database

```bash
# Pull environment variables
vercel env pull .env.local

# Run setup script
npm run setup-vercel-db
```

### 6.2 Test the Application

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Login with: `admin@shamay.ai` / `admin123`
3. Create a test valuation
4. Upload a document
5. Verify file appears in Blob storage

### 6.3 Verify Storage

**Check Database:**
```bash
vercel psql shamay-land-registry
SELECT COUNT(*) FROM shuma;
```

**Check Blob Storage:**
- Vercel Dashboard > Storage > shamay-uploads
- You should see uploaded files

---

## 💰 Vercel Free Tier Limits

| Resource | Free Tier Limit | Notes |
|----------|----------------|-------|
| **Postgres DB** | 256 MB storage | ~10K valuations |
| **Blob Storage** | 100 GB bandwidth/month | ~1000 PDF uploads |
| **Function Execution** | 100 GB-hours | Generous for dev |
| **Bandwidth** | 100 GB/month | Plenty for testing |

---

## 🔧 Troubleshooting

### Database Connection Errors

```bash
# Test connection
vercel env pull .env.local
node -e "require('pg').Client({connectionString:process.env.POSTGRES_URL}).connect().then(()=>console.log('OK'))"
```

### File Upload Not Working

1. Check `BLOB_READ_WRITE_TOKEN` is set
2. Verify `@vercel/blob` is installed
3. Check Vercel logs: `vercel logs`

### Build Failures

```bash
# Check build locally
cd frontend
npm run build

# If successful, deploy again
vercel --prod
```

---

## 📚 Additional Resources

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🎯 Quick Start Commands

```bash
# 1. Install dependencies
cd frontend && npm install @vercel/blob

# 2. Setup Vercel
vercel login
vercel link

# 3. Pull environment variables
vercel env pull .env.local

# 4. Initialize database
npm run setup-vercel-db

# 5. Deploy
vercel --prod
```

---

## ✅ Deployment Checklist

- [ ] Created Vercel Postgres database
- [ ] Created Vercel Blob storage
- [ ] Set all environment variables
- [ ] Generated NEXTAUTH_SECRET
- [ ] Installed @vercel/blob package
- [ ] Updated file upload to use Blob in production
- [ ] Initialized database schema
- [ ] Deployed to Vercel
- [ ] Tested login and file upload
- [ ] Verified data in database and blob storage

---

🎉 **Your app is now live on Vercel!**

