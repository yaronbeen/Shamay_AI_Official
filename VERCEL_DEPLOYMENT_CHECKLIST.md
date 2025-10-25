# 🚀 Vercel Deployment Checklist

## ⚠️ CRITICAL: Environment Variables MUST Be Set!

### 📦 **Frontend Project (Next.js)**

Go to Vercel Dashboard → Your Frontend Project → Settings → Environment Variables

**Add these variables:**

```bash
# ========================================
# DATABASE (Required)
# ========================================
# Get from Neon Dashboard → Connection String
DATABASE_URL=postgres://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# OR if Vercel auto-created these:
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# ========================================
# BACKEND (Required)
# ========================================
# Your deployed Express backend URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend-project.vercel.app

# ========================================
# AUTHENTICATION (Required)
# ========================================
# Your frontend URL
NEXTAUTH_URL=https://your-frontend-project.vercel.app

# Generate a secure secret:
# openssl rand -base64 32
NEXTAUTH_SECRET=your-super-secret-key-change-this-to-something-random

# ========================================
# FILE STORAGE (Optional - for production)
# ========================================
# Get from Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

---

### 📦 **Backend Project (Express)**

Go to Vercel Dashboard → Your Backend Project → Settings → Environment Variables

**Add these variables:**

```bash
# ========================================
# DATABASE (Same as frontend)
# ========================================
DATABASE_URL=postgres://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ========================================
# SERVER CONFIG
# ========================================
NODE_ENV=production
PORT=3001

# ========================================
# CORS (If needed)
# ========================================
ALLOWED_ORIGINS=https://your-frontend-project.vercel.app
```

---

## 🗂️ How to Get Your Neon Database URL

### Option 1: From Vercel Dashboard (if you created Postgres via Vercel)
1. Go to **Storage** tab in your Vercel project
2. Click on your Postgres database
3. Go to **Settings** → **Connection String**
4. Copy the connection string

### Option 2: From Neon Dashboard (if you created it directly)
1. Go to https://console.neon.tech/
2. Select your project
3. Click **Connection Details**
4. Copy the **Connection String** (the one with `?sslmode=require`)

---

## 🔄 After Setting Environment Variables

**IMPORTANT:** Environment variables only take effect on NEW deployments!

### For Frontend:
1. Go to **Deployments** tab
2. Click **⋮** (three dots) on the latest deployment
3. Click **Redeploy**
4. ✅ Ensure "Use existing Build Cache" is **UNCHECKED**

### For Backend:
1. Go to **Deployments** tab
2. Click **⋮** (three dots) on the latest deployment
3. Click **Redeploy**
4. ✅ Ensure "Use existing Build Cache" is **UNCHECKED**

---

## 🔍 Debugging Deployment Issues

### Check Logs:
1. Go to **Deployments** → Click on your deployment
2. Go to **Functions** tab
3. Click on any function to see logs
4. Look for errors like:
   - ❌ `ECONNREFUSED 127.0.0.1:5432` → DATABASE_URL not set
   - ❌ `Cannot read properties of null (reading 'connect')` → Pool initialization failed
   - ✅ `Using @neondatabase/serverless` → Good!
   - ✅ `DATABASE_URL: SET ✅` → Good!

### Common Issues:

#### Issue 1: Still connecting to localhost
**Solution:** DATABASE_URL environment variable is not set or not being read.
- Double-check spelling: `DATABASE_URL` (case-sensitive)
- Make sure it's set for **Production** environment
- Redeploy after adding

#### Issue 2: Pool is null
**Solution:** `@neondatabase/serverless` package not installed
- Should be in `package.json` dependencies ✅ (already there)
- Run `npm install` locally to verify

#### Issue 3: Backend connection refused
**Solution:** NEXT_PUBLIC_BACKEND_URL not set or incorrect
- Must start with `https://`
- Must be your deployed backend URL (not localhost)
- Must be a **public** environment variable (starts with `NEXT_PUBLIC_`)

---

## ✅ Verification Checklist

After deployment, check:

- [ ] Frontend deploys successfully
- [ ] Backend deploys successfully
- [ ] Can access frontend at `https://your-frontend.vercel.app`
- [ ] Can login to the app
- [ ] Database queries work (check logs for "SET ✅" messages)
- [ ] Can create a new valuation
- [ ] No `localhost` or `127.0.0.1` errors in logs

---

## 🆘 Still Having Issues?

1. **Check Function Logs** for detailed error messages
2. **Verify all environment variables are set** (go through the list above)
3. **Make sure you redeployed** after setting env vars
4. **Check that DATABASE_URL is from Neon**, not a local connection

---

## 📝 Current Status

- ✅ Code is ready for deployment
- ✅ Neon serverless driver installed
- ✅ Error handling and logging added
- ✅ Dynamic backend URL configuration
- ⚠️ **WAITING: Environment variables must be set in Vercel Dashboard**

