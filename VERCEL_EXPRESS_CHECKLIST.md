# 🚀 Express Backend Vercel Deployment Checklist

Use this checklist to deploy your Express backend to Vercel.

---

## ✅ Pre-Deployment Checklist

### 1. Backend Preparation
- [x] Express app exports correctly (`module.exports = app;` in server.js)
- [x] `backend/vercel.json` configuration exists
- [x] `backend/package.json` has correct dependencies
- [ ] Environment variables documented
- [ ] Database connection uses `POSTGRES_URL` env var
- [ ] CORS configured to allow frontend domain

### 2. Database Preparation
- [ ] Postgres database ready (or will create on Vercel)
- [ ] Database schema/migrations ready
- [x] `scripts/setup-vercel-db.js` script exists
- [ ] Admin user creation script ready

### 3. File Storage
- [ ] Decide: Use Vercel Blob or local uploads directory
- [ ] If Blob: Install `@vercel/blob` in backend
- [ ] If local: Ensure `backend/public/` for static files

### 4. Frontend Updates
- [x] API client created (`frontend/src/lib/api-client.ts`)
- [ ] Update components to call Express backend
- [ ] Set `NEXT_PUBLIC_BACKEND_URL` in frontend env vars

---

## 🎯 Deployment Steps

### Step 1: Deploy Backend to Vercel

- [ ] Push code to GitHub
  ```bash
  git add backend/
  git commit -m "Prepare Express backend for Vercel"
  git push origin main
  ```

- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Import repository
- [ ] Configure project:
  - Project Name: `shamay-backend`
  - Framework: Other
  - **Root Directory: `backend`** ⚠️ IMPORTANT
  - Build Command: (leave empty)
  - Install Command: `npm install`

- [ ] Add environment variables:
  ```
  NODE_ENV=production
  PORT=3000
  FRONTEND_URL=https://your-frontend.vercel.app
  OPENAI_API_KEY=sk-...
  ```

- [ ] Click **Deploy**

- [ ] Note your backend URL: `https://shamay-backend.vercel.app`

### Step 2: Create Database

- [ ] In backend project dashboard, click **Storage**
- [ ] Click **Create Database** > **Postgres**
- [ ] Select region (choose closest to users)
- [ ] Click **Create**
- [ ] Copy `POSTGRES_URL` (auto-added to env vars)

### Step 3: Initialize Database

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Link project:
  ```bash
  cd backend
  vercel link
  ```
- [ ] Pull env vars:
  ```bash
  vercel env pull .env.local
  ```
- [ ] Run database setup:
  ```bash
  cd ..
  npm run setup-vercel-db
  ```
- [ ] Verify tables created (check Vercel dashboard > Storage > Data)

### Step 4: Deploy Frontend

- [ ] Go to [vercel.com/new](https://vercel.com/new) again
- [ ] Import same repository
- [ ] Configure project:
  - Project Name: `shamay-frontend`
  - Framework: Next.js (auto-detected)
  - **Root Directory: `frontend`** ⚠️ IMPORTANT
  - Build Command: `npm run build`

- [ ] Add environment variables:
  ```
  NEXT_PUBLIC_BACKEND_URL=https://shamay-backend.vercel.app
  NEXTAUTH_URL=https://shamay-frontend.vercel.app
  NEXTAUTH_SECRET=<generate-secret>
  OPENAI_API_KEY=sk-...
  ```

- [ ] Click **Storage** tab
  - Connect to **same Postgres** database
  - Create **Blob Storage** for uploads

- [ ] Click **Deploy**

### Step 5: Update Backend CORS

- [ ] Go to backend project > Settings > Environment Variables
- [ ] Update `FRONTEND_URL` to actual frontend URL
- [ ] Redeploy backend (or wait for auto-deploy)

---

## 🧪 Testing

### Test Backend
- [ ] Visit: `https://shamay-backend.vercel.app/health`
- [ ] Should see: `{"status":"ok","database":"connected"}`
- [ ] Check logs: `vercel logs shamay-backend --prod`

### Test Frontend
- [ ] Visit: `https://shamay-frontend.vercel.app`
- [ ] Try login
- [ ] Create test valuation
- [ ] Upload document
- [ ] Check if backend is called (Network tab in DevTools)

### Test Database
- [ ] Go to Vercel > Storage > Your Postgres > Data
- [ ] Query: `SELECT * FROM users;`
- [ ] Should see admin user
- [ ] Query: `SELECT * FROM shuma;`
- [ ] Should see any created valuations

---

## 🐛 Troubleshooting

### Backend Issues

**Error: Cannot find module**
- [ ] Check `backend/package.json` has all dependencies
- [ ] Redeploy: `cd backend && vercel --prod`

**Error: Database connection failed**
- [ ] Verify `POSTGRES_URL` in environment variables
- [ ] Check SSL: Should have `ssl: { rejectUnauthorized: false }`
- [ ] Test connection with pulled env vars locally

**Error: 500 Internal Server Error**
- [ ] Check logs: `vercel logs shamay-backend`
- [ ] Look for error stack traces
- [ ] Check if routes are registered correctly

### Frontend Issues

**Error: Failed to fetch from backend**
- [ ] Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- [ ] Check CORS: Backend allows frontend domain
- [ ] Check Network tab: Is URL correct?

**Error: CORS blocked**
- [ ] Update backend `FRONTEND_URL` env var
- [ ] Redeploy backend
- [ ] Clear browser cache

### Database Issues

**Error: Table does not exist**
- [ ] Run setup script again: `npm run setup-vercel-db`
- [ ] Check Vercel Storage > Data tab

**Error: Connection timeout**
- [ ] Check Postgres region (should be close)
- [ ] Verify connection string format
- [ ] Try non-pooling URL: `POSTGRES_URL_NON_POOLING`

---

## 📊 Post-Deployment

### Monitor Performance
- [ ] Set up Vercel Analytics (free)
- [ ] Check function execution times
- [ ] Monitor database query performance

### Set Up Alerts
- [ ] Error tracking (Vercel built-in)
- [ ] Uptime monitoring
- [ ] Database usage alerts

### Optimize
- [ ] Enable Vercel Edge Cache where possible
- [ ] Add database indexes for slow queries
- [ ] Implement Redis for session caching (if needed)

---

## 🎉 Success Criteria

- [x] Backend deployed and accessible
- [x] Database connected and initialized
- [x] Frontend deployed and accessible
- [x] Frontend can call backend APIs
- [x] CORS working correctly
- [x] File uploads working
- [x] Authentication working
- [x] Can create and save valuations
- [x] No console errors in production

---

## 🔗 Useful Links

- Backend Dashboard: `https://vercel.com/your-team/shamay-backend`
- Frontend Dashboard: `https://vercel.com/your-team/shamay-frontend`
- Logs: `vercel logs <project-name> --prod`
- Docs: `./DEPLOY_EXPRESS_TO_VERCEL.md`

---

## 📝 Environment Variables Reference

### Backend (shamay-backend)
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://shamay-frontend.vercel.app
POSTGRES_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Frontend (shamay-frontend)
```bash
NEXT_PUBLIC_BACKEND_URL=https://shamay-backend.vercel.app
NEXTAUTH_URL=https://shamay-frontend.vercel.app
NEXTAUTH_SECRET=your-secret-here
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
OPENAI_API_KEY=sk-...
```

---

**Ready to deploy? Follow the checklist step by step!** ✅

