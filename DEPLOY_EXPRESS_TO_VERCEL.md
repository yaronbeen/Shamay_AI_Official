# Express Backend on Vercel - Quick Deploy Guide

## 🚀 Deploy Your Express Backend to Vercel

Follow these steps to deploy your Express backend as a separate Vercel project.

---

## 📋 **Prerequisites**

- ✅ Vercel account
- ✅ GitHub repository with your code
- ✅ Express backend in `backend/` directory

---

## 🎯 **Deployment Steps**

### **Step 1: Push Backend to GitHub**

```bash
git add backend/
git commit -m "Prepare Express backend for Vercel"
git push origin main
```

---

### **Step 2: Deploy via Vercel UI**

1. Go to [https://vercel.com/new](https://vercel.com/new)

2. **Import your repository**
   - Click "Import Git Repository"
   - Select your `Shamay-slow` repository

3. **Configure the project**
   ```
   Project Name: shamay-backend
   Framework Preset: Other
   Root Directory: backend ⚠️ (Click "Edit" and select backend/)
   Build Command: (leave empty)
   Output Directory: (leave empty)
   Install Command: npm install
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   ```bash
   # Database
   POSTGRES_URL=postgresql://user:pass@host:5432/shamay_land_registry
   
   # Server
   NODE_ENV=production
   PORT=3000
   
   # Frontend (for CORS)
   FRONTEND_URL=https://your-frontend-app.vercel.app
   
   # OpenAI (if using AI)
   OPENAI_API_KEY=sk-...
   
   # Database individual vars (if needed)
   DB_HOST=your-host
   DB_PORT=5432
   DB_NAME=shamay_land_registry
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

5. **Click "Deploy"**

---

### **Step 3: Create Vercel Postgres Database**

1. Go to your backend project dashboard
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose region closest to you
6. Click **Create**

Vercel will automatically add these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

---

### **Step 4: Initialize Database**

From your local machine:

```bash
# Install Vercel CLI if not already
npm i -g vercel

# Link to your backend project
cd backend
vercel link

# Pull environment variables
vercel env pull .env.local

# Run database setup script
cd ..
npm run setup-vercel-db
```

---

### **Step 5: Deploy Frontend**

Now deploy your frontend as a **separate** Vercel project:

1. Go to [https://vercel.com/new](https://vercel.com/new) again
2. Import same repository
3. Configure:
   ```
   Project Name: shamay-frontend
   Framework Preset: Next.js
   Root Directory: frontend ⚠️
   ```

4. Add Environment Variables:
   ```bash
   # Backend URL (from Step 2)
   NEXT_PUBLIC_BACKEND_URL=https://shamay-backend.vercel.app
   
   # Auth
   NEXTAUTH_URL=https://shamay-frontend.vercel.app
   NEXTAUTH_SECRET=your-secret-here
   
   # Database (connect to same Postgres)
   POSTGRES_URL=postgresql://...
   
   # OpenAI
   OPENAI_API_KEY=sk-...
   ```

5. **Connect Storage**
   - Go to Storage tab
   - Connect to the **same** Postgres database you created for backend
   - Create **Blob Storage** for file uploads

---

### **Step 6: Update Frontend Code**

Update your frontend to call the Express backend:

```typescript
// frontend/src/lib/api-client.ts (create this file)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export async function callBackendAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  
  return response.json()
}
```

Update your API routes or use directly from components:

```typescript
// Example: Update session API calls
import { callBackendAPI } from '@/lib/api-client'

// Instead of:
// const response = await fetch(`/api/session/${sessionId}`, ...)

// Use:
const data = await callBackendAPI(`/api/sessions/${sessionId}`, {
  method: 'POST',
  body: JSON.stringify(sessionData)
})
```

---

## 🔧 **Architecture**

```
┌─────────────────────────┐
│   Frontend (Next.js)    │ → https://shamay-frontend.vercel.app
│   - UI Components       │   Vercel Project #1
│   - Client Routes       │   Root: frontend/
│   - Some API routes     │   (Auth, document generation, etc.)
└─────────────────────────┘
          ↓ API Calls (NEXT_PUBLIC_BACKEND_URL)
┌─────────────────────────┐
│   Backend (Express)     │ → https://shamay-backend.vercel.app
│   - /api/sessions       │   Vercel Project #2
│   - /api/valuations     │   Root: backend/
│   - /api/files          │   Uses: Fluid Compute
│   - Database logic      │
└─────────────────────────┘
          ↓ Shared Storage
┌─────────────────────────┐
│   Vercel Postgres       │ → Connected to BOTH projects
│   Vercel Blob           │ → Connected to frontend only
└─────────────────────────┘
```

---

## 🎯 **Which APIs Go Where?**

### **Express Backend** (shamay-backend):
- ✅ `/api/sessions/*` - Session CRUD
- ✅ `/api/valuations/*` - Valuations CRUD
- ✅ `/api/files/*` - File operations
- ✅ `/api/garmushka/*` - Garmushka measurements
- ✅ `/api/gis/*` - GIS operations
- ✅ Database operations

### **Next.js Frontend** (shamay-frontend):
- ✅ `/api/auth/*` - NextAuth (must stay in Next.js)
- ✅ `/api/session/[sessionId]/export-pdf` - PDF generation (uses Puppeteer)
- ✅ Any AI processing that needs client-side context

---

## ✅ **Verify Deployment**

### Test Backend:
```bash
curl https://shamay-backend.vercel.app/health
# Should return: { "status": "ok", "database": "connected" }
```

### Test Frontend:
```bash
curl https://shamay-frontend.vercel.app/api/health
# Or visit in browser
```

---

## 🔥 **Quick Commands**

```bash
# Deploy backend
cd backend
vercel --prod

# Deploy frontend
cd frontend
vercel --prod

# Check logs
vercel logs shamay-backend --prod
vercel logs shamay-frontend --prod

# Rollback if needed
vercel rollback shamay-backend
```

---

## 🐛 **Troubleshooting**

### Backend not starting?
- Check logs: `vercel logs shamay-backend`
- Verify `backend/vercel.json` exists
- Ensure `backend/src/server.js` exports the app

### Database connection failing?
- Verify `POSTGRES_URL` in environment variables
- Check SSL is enabled: `ssl: { rejectUnauthorized: false }`
- Test connection locally with pulled env vars

### CORS errors?
- Update `FRONTEND_URL` in backend environment variables
- Ensure CORS middleware allows your frontend domain

### File uploads not working?
- Vercel has 4.5MB body size limit
- Use Vercel Blob for large files
- Implement chunked uploads for large files

---

## 📊 **Costs (Vercel Free Tier)**

- ✅ **2 Projects**: Frontend + Backend (allowed)
- ✅ **Postgres**: 256 MB free (should be enough for dev)
- ✅ **Blob Storage**: 500 MB free
- ✅ **Bandwidth**: 100 GB/month free
- ✅ **Function Executions**: 100 GB-Hours free
- ✅ **Fluid Compute**: Included in free tier with limits

**Recommendation**: Start on free tier, upgrade if needed.

---

## 🎉 **You're Done!**

Your architecture:
- ✅ Express backend on Vercel (Fluid Compute)
- ✅ Next.js frontend on Vercel (Serverless Functions)
- ✅ Shared Postgres database
- ✅ Blob storage for uploads
- ✅ Automatic deployments via Git
- ✅ Preview deployments for PRs

**Both projects scale independently!** 🚀

