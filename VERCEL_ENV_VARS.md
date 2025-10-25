# 🔐 Vercel Environment Variables - Complete List

## 🎯 **Frontend Project**

Go to: Vercel Dashboard → Your Frontend Project → Settings → Environment Variables

### **Required Variables:**

```bash
# ============================================
# DATABASE (Neon PostgreSQL)
# ============================================
DATABASE_URL=postgres://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# OR if Vercel auto-created:
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# ============================================
# BACKEND API
# ============================================
NEXT_PUBLIC_BACKEND_URL=https://your-backend-project.vercel.app

# ============================================
# AUTHENTICATION (NextAuth.js)
# ============================================
NEXTAUTH_URL=https://your-frontend-project.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# ============================================
# AI PROCESSING (Anthropic Claude)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...your-key...

# ============================================
# FILE STORAGE (Vercel Blob - Production)
# ============================================
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

---

## 🎯 **Backend Project**

Go to: Vercel Dashboard → Your Backend Project → Settings → Environment Variables

### **Required Variables:**

```bash
# ============================================
# DATABASE (Same Neon PostgreSQL as frontend)
# ============================================
DATABASE_URL=postgres://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ============================================
# AI PROCESSING (Anthropic Claude)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...your-key...

# ============================================
# SERVER CONFIG
# ============================================
NODE_ENV=production
PORT=3001

# ============================================
# CORS (Optional - if you need specific origins)
# ============================================
FRONTEND_URL=https://your-frontend-project.vercel.app
ALLOWED_ORIGINS=https://your-frontend-project.vercel.app
```

---

## 📝 **How to Get Each Variable:**

### **1. DATABASE_URL (Neon PostgreSQL)**

#### Option A: From Vercel Storage
1. Go to your Vercel project → **Storage** tab
2. Click on your Postgres database
3. Go to **Settings** → **Connection String**
4. Copy the connection string

#### Option B: From Neon Dashboard  
1. Go to https://console.neon.tech/
2. Select your project
3. Click **Connection Details**
4. Copy the **Connection String** with `?sslmode=require`

### **2. ANTHROPIC_API_KEY**

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Go to **API Keys**
4. Create a new key or copy existing one
5. Format: `sk-ant-api03-...`

### **3. NEXTAUTH_SECRET**

Generate a random secret:
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

### **4. BLOB_READ_WRITE_TOKEN (Vercel Blob Storage)**

1. Go to Vercel Dashboard → Your Project → **Storage**
2. Create a new **Blob Store** (if you haven't)
3. Go to **Settings** → **Environment Variables**
4. Vercel auto-generates `BLOB_READ_WRITE_TOKEN`
5. Or manually create one: **Settings** → **Tokens**

### **5. Project URLs**

After deploying:
- Frontend: `https://your-frontend-name.vercel.app`
- Backend: `https://your-backend-name.vercel.app`

---

## ⚠️ **CRITICAL ISSUES TO FIX:**

### **Issue 1: File Access in Serverless**

Your code uses `fs.existsSync(pdfPath)` which won't work in Vercel:

```typescript
// ❌ This won't work in Vercel
const pdfPath = upload.path  // Local filesystem path
if (!fs.existsSync(pdfPath)) {
  return error
}
```

**Solution:** Files must be stored in Vercel Blob and accessed via URL:

```typescript
// ✅ This works in Vercel
const fileUrl = upload.blobUrl  // Vercel Blob URL
const response = await fetch(fileUrl)
const buffer = await response.arrayBuffer()
```

### **Issue 2: Child Process Spawning**

Your code uses `spawn()` to run backend scripts:

```typescript
// ❌ This won't work in Vercel serverless
const child = spawn('node', [tempScriptPath], { ... })
```

**Solution:** Backend logic must be:
1. Moved to API routes (no spawning)
2. Called via HTTP fetch to your backend API
3. Or refactored to run directly in the serverless function

---

## ✅ **Deployment Checklist:**

### **Before Deploying:**

- [ ] Set `DATABASE_URL` in **both** frontend and backend
- [ ] Set `ANTHROPIC_API_KEY` in **both** frontend and backend  
- [ ] Set `NEXTAUTH_SECRET` in frontend
- [ ] Set `NEXTAUTH_URL` in frontend (your actual URL)
- [ ] Set `NEXT_PUBLIC_BACKEND_URL` in frontend (your actual backend URL)
- [ ] Set `BLOB_READ_WRITE_TOKEN` in frontend (if using Vercel Blob)
- [ ] Set `NODE_ENV=production` in backend
- [ ] Set `FRONTEND_URL` in backend (for CORS)

### **After Setting Variables:**

- [ ] **Redeploy frontend** (Environment vars only apply to NEW deployments)
- [ ] **Redeploy backend** (Environment vars only apply to NEW deployments)
- [ ] Uncheck "Use existing Build Cache" when redeploying

### **Verify Deployment:**

- [ ] Frontend logs show: `✅ DATABASE_URL: SET ✅`
- [ ] Backend logs show: `✅ Backend: Using @neondatabase/serverless`
- [ ] No `ECONNREFUSED 127.0.0.1:5432` errors
- [ ] No `ANTHROPIC_API_KEY is required` errors
- [ ] Can login to the app
- [ ] Can create a new valuation
- [ ] Database queries work

---

## 🐛 **Current Blocker:**

The AI processing routes use:
1. ❌ `fs.existsSync()` - checks local filesystem (doesn't exist in Vercel)
2. ❌ `spawn()` - runs child processes (not allowed in Vercel serverless)

**This needs to be refactored to:**
- Use Vercel Blob URLs for file access
- Call backend APIs via HTTP instead of spawning processes
- Or move AI processing logic directly into API routes

---

## 📚 **Resources:**

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Anthropic API Docs](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

