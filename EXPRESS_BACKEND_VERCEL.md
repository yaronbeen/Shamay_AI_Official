# 🔧 Express.js Backend for Vercel Deployment

## ✅ **Good News: Vercel NOW Supports Express.js!**

According to [Vercel's official documentation](https://vercel.com/docs/frameworks/backend/express), Express.js is now fully supported on Vercel using **Fluid Compute**.

---

## 🚀 **Option 1: Deploy Express Backend to Vercel (NEW!)**

Vercel now supports deploying Express.js applications with zero configuration using Fluid Compute.

### Benefits:
- ✅ Automatic scaling based on traffic
- ✅ Active CPU billing
- ✅ Automatic cold start prevention
- ✅ Background processing support
- ✅ Preview deployments
- ✅ Instant rollback

### How to Deploy:

#### Step 1: Prepare Your Express App

Your Express app must export the application at one of these locations:
- `backend/src/server.js` ✅ (You already have this!)
- `backend/src/app.js`
- `backend/src/index.js`

**Two export patterns work:**

**Pattern A: Default Export (Recommended)**
```javascript
// backend/src/server.js
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

// Export the Express app
export default app;
```

**Pattern B: Port Listener**
```javascript
// backend/src/server.js
import express from 'express';
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

#### Step 2: Deploy Express to Vercel

**Option A: Via GitHub UI**
1. Push your backend code to GitHub
2. In Vercel Dashboard > **Add New** > **Project**
3. Import repository
4. **Root Directory**: `backend` ⚠️
5. **Framework**: Express (auto-detected)
6. Connect Postgres database to this project
7. Click **Deploy**

**Option B: Via Vercel CLI**
```bash
cd backend
vercel init express  # If starting fresh
# OR
vercel deploy --prod  # If already set up
```

#### Step 3: Update Frontend to Call Express Backend

```typescript
// frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=https://your-express-app.vercel.app

// In your Next.js API routes:
const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

---

## ✅ **Option 2: Use Next.js API Routes Only (Simpler)**

Your app **already has all APIs in Next.js**, so you can deploy just the frontend:

**Pros:**
- ✅ Single deployment
- ✅ Simpler architecture
- ✅ No cross-origin issues
- ✅ All APIs are serverless functions

**Cons:**
- ❌ Can't reuse Express middleware
- ❌ All APIs converted to serverless functions

---

## 🎯 **Recommended Architecture**

### Architecture A: Dual Deployment (Express + Next.js)

```
┌─────────────────────┐
│   Frontend (Next.js) │ → Vercel Project 1
│   - UI Components    │   vercel.com/your-frontend
│   - Client Routes    │   Root: /frontend
└─────────────────────┘
          ↓ API Calls
┌─────────────────────┐
│  Backend (Express)   │ → Vercel Project 2
│   - /api/sessions   │   vercel.com/your-backend
│   - /api/files      │   Root: /backend
│   - Database Logic  │   Uses: Fluid Compute
└─────────────────────┘
          ↓
┌─────────────────────┐
│  Vercel Postgres    │ → Shared Storage
│  Vercel Blob        │
└─────────────────────┘
```

**Setup:**
1. Create **two Vercel projects**:
   - Project 1: Frontend (root: `frontend`)
   - Project 2: Backend (root: `backend`)
2. Create Postgres & Blob, connect to **both** projects
3. Set `NEXT_PUBLIC_BACKEND_URL` in frontend project
4. Set `DATABASE_URL` in both projects

### Architecture B: Single Deployment (Next.js Only)

```
┌─────────────────────┐
│   Next.js App       │ → Single Vercel Project
│   - UI Components   │   Root: /frontend
│   - API Routes      │   All serverless functions
│   - Database Logic  │
└─────────────────────┘
          ↓
┌─────────────────────┐
│  Vercel Postgres    │
│  Vercel Blob        │
└─────────────────────┘
```

**Setup:**
1. Deploy `frontend` directory only
2. Express backend for local dev only
3. Simpler, fewer moving parts

---

## 📋 **Comparison**

| Feature | Express on Vercel | Next.js API Routes |
|---------|------------------|-------------------|
| **Deployment** | 2 projects | 1 project |
| **Middleware** | Full Express middleware | Custom Next.js middleware |
| **Scaling** | Fluid Compute | Serverless functions |
| **Cold Starts** | Auto-prevented | Possible |
| **Complexity** | Higher | Lower |
| **Cost** | 2x projects | 1x project |
| **Best For** | Complex APIs, reusable Express code | Simple APIs, monolithic |

---

## 🚀 **Quick Start: Deploy Express to Vercel**

### Step 1: Update package.json

```json
// backend/package.json
{
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js"
  }
}
```

### Step 2: Ensure Express App is Exportable

```javascript
// backend/src/server.js
import express from 'express';
const app = express();

// Your routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export for Vercel
export default app;
```

### Step 3: Deploy

```bash
cd backend
vercel --prod
```

### Step 4: Connect Database

In Vercel Dashboard for your backend project:
1. Go to **Storage** tab
2. Connect existing Postgres database
3. Connect existing Blob storage
4. Environment variables auto-added!

---

## 🔧 **Important Notes**

### Static Files
- ❌ `express.static()` will NOT work on Vercel
- ✅ Use `backend/public/**` directory instead
- Files in `public/` served via Vercel CDN automatically

### Function Limits
- Max bundle size: 250MB
- Your Express app becomes a single Vercel Function
- Uses Fluid Compute (auto-scaling)

### Error Handling
Implement robust error handling:
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

---

## 🎯 **My Recommendation for Your App**

### For Production:
**Go with Architecture B (Next.js Only)** because:
1. ✅ Your Next.js APIs already exist and work
2. ✅ Simpler deployment (1 project vs 2)
3. ✅ Lower cost (1 project)
4. ✅ No CORS issues
5. ✅ Easier to manage

### For Learning/Future:
**Architecture A (Express + Next.js)** if:
- You want to reuse Express middleware
- You need background jobs
- You want API versioning
- You plan to support mobile apps (need standalone API)

---

## 📚 **Resources**

- [Vercel Express Documentation](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Fluid Compute](https://vercel.com/docs/functions/fluid-compute)
- [Express Template on Vercel](https://vercel.com/templates/express)

---

## ✅ **Quick Decision Guide**

**Deploy Express Backend Separately IF:**
- ✅ You have complex Express middleware
- ✅ You need background processing
- ✅ You want a reusable API for mobile/desktop apps
- ✅ You have existing Express code you want to reuse

**Use Next.js API Routes Only IF:**
- ✅ You want simplicity (recommended for your app)
- ✅ You don't need standalone API
- ✅ You want lower costs
- ✅ You want faster deployment

---

🎉 **Both options work on Vercel! Choose based on your needs.**

---

## 📋 **Current State Analysis**

Let me check what you currently have:

```bash
# Check Express routes
ls -la backend/src/routes/

# Check Next.js API routes  
ls -la frontend/src/app/api/
```

### Express Backend Files:
- `backend/src/routes/sessions.js` - Session management
- `backend/src/routes/valuations.js` - Valuations
- `backend/src/routes/files.js` - File operations
- `backend/src/routes/ai.js` - AI processing
- `backend/src/routes/gis.js` - GIS operations
- `backend/src/routes/garmushka.js` - Garmushka

### Next.js Already Has:
- ✅ `frontend/src/app/api/session/` - Session APIs
- ✅ `frontend/src/app/api/valuations/` - Valuations APIs
- ✅ `frontend/src/app/api/files/` - File serving
- ✅ `frontend/src/app/api/auth/` - Auth (NextAuth)

---

## 🎯 **Recommended Approach for Vercel**

### For Development:
Keep using both:
- **Express backend** on port 3001 (for development only)
- **Next.js frontend** on port 3002 with API routes

### For Production (Vercel):
Use **Next.js API routes only**:
- All APIs are serverless functions
- No Express backend needed
- Vercel handles everything

---

## 🔧 **What to Do Right Now**

### Step 1: Verify Next.js Has All Required APIs

Check if these exist in `frontend/src/app/api/`:
- [ ] `/session/[sessionId]/route.ts` - Load/save session
- [ ] `/session/[sessionId]/upload/route.ts` - File upload
- [ ] `/valuations/route.ts` - List valuations
- [ ] `/files/[...path]/route.ts` - Serve files

### Step 2: Update Database Connection

Ensure `frontend/src/lib/shumadb.js` works on Vercel:

```javascript
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Required for Vercel Postgres
  }
})
```

### Step 3: Deploy to Vercel

The Express backend won't be deployed - only Next.js frontend with API routes.

---

## 📝 **Configuration for Vercel**

No special configuration needed! Just ensure:

1. ✅ Root directory: `frontend`
2. ✅ Framework: Next.js
3. ✅ Environment variables set (see VERCEL_QUICKSTART.md)

Vercel automatically:
- Builds Next.js app
- Converts API routes to serverless functions
- Handles all HTTP requests

---

## 🎉 **TL;DR**

**For Vercel deployment:**
- ✅ Use Next.js API routes (already there!)
- ✅ Express backend is for local dev only
- ✅ No migration needed
- ✅ Just deploy the `frontend` directory

**Your app is already Vercel-ready!** 🚀

---

## 🔍 **Quick Check**

Run this to verify you have all APIs in Next.js:

```bash
find frontend/src/app/api -name "route.ts" -o -name "route.js"
```

If you see all the routes you need, you're good to go! 🎯

