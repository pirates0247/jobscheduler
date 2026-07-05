# Deploy Codity to a Public URL

This guide walks through the recommended path: **GitHub → Railway (backend) → Vercel (frontend)**.

Estimated time: ~20 minutes.

---

## What you'll get

| Service | URL example |
|---------|-------------|
| **Website (public)** | `https://codity.vercel.app` |
| **API (backend)** | `https://codity-api.up.railway.app` |
| **Source code** | `https://github.com/YOUR_USERNAME/codity.ai` |

---

## Step 1 — Push to GitHub

### 1.1 Initialize git (if not done yet)

```powershell
cd C:\Users\tharu\Desktop\codity.ai
git init
git add .
git commit -m "Initial commit: Distributed Job Scheduler SaaS"
```

### 1.2 Create a public repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `codity.ai` (or any name you prefer)
3. Visibility: **Public**
4. Do **not** add README, .gitignore, or license (you already have them)
5. Click **Create repository**

### 1.3 Push your code

Replace `YOUR_USERNAME` with your GitHub username:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/codity.ai.git
git push -u origin main
```

---

## Step 2 — Deploy backend on Railway

Railway runs your NestJS API, PostgreSQL, and Redis in one project.

### 2.1 Create a Railway account

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `codity.ai` repository

### 2.2 Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway creates `DATABASE_URL` automatically

### 2.3 Add Redis

1. Click **+ New** → **Database** → **Redis**
2. Railway creates `REDIS_URL` automatically

### 2.4 Configure the backend service

1. Click your **backend** service (from the GitHub deploy)
2. Go to **Settings** → **Root Directory** → set to `backend`
3. Go to **Settings** → **Networking** → **Generate Domain** (copy this URL — you'll need it)

### 2.5 Set environment variables

In the backend service → **Variables**, add or reference:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `API_PREFIX` | `api/v1` |
| `DATABASE_URL` | Reference from PostgreSQL service |
| `REDIS_URL` | Reference from Redis service |
| `JWT_ACCESS_SECRET` | Random string, min 32 chars |
| `JWT_REFRESH_SECRET` | Random string, min 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | Leave blank for now — set after Vercel deploy |
| `THROTTLE_TTL` | `60` |
| `THROTTLE_LIMIT` | `100` |

To reference `DATABASE_URL` and `REDIS_URL`: click **+ New Variable** → **Add Reference** → pick the PostgreSQL/Redis service.

### 2.6 Deploy and verify

Railway builds from `backend/Dockerfile` and runs migrations automatically.

Once deployed, open:

```
https://YOUR-BACKEND-URL.up.railway.app/api/v1/health
```

You should see:

```json
{"status":"OK","services":{"database":"UP","redis":"UP"}}
```

### 2.7 Seed demo data (optional)

In Railway → backend service → **Settings** → run a one-off command, or use the Railway CLI:

```powershell
railway run npx prisma db seed
```

Demo login after seeding:
- Email: `admin@codity.ai`
- Password: `password123`

---

## Step 3 — Deploy frontend on Vercel

### 3.1 Create a Vercel account

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your `codity.ai` repository

### 3.2 Configure the project

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

### 3.3 Environment variables

Add this before deploying:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL (no trailing slash), e.g. `https://codity-api.up.railway.app` |

### 3.4 Deploy

Click **Deploy**. Vercel gives you a URL like `https://codity-ai.vercel.app`.

---

## Step 4 — Connect frontend and backend

### 4.1 Update CORS on Railway

Go back to Railway → backend → **Variables** and set:

```
CORS_ORIGIN=https://your-app.vercel.app
```

Use your exact Vercel URL (no trailing slash). Redeploy if needed.

### 4.2 Test the live site

1. Open your Vercel URL
2. Go to `/login`
3. Sign in with demo credentials (if you ran the seed)
4. Dashboard, queues, and real-time updates should work

---

## Alternative: Deploy backend on Render

If you prefer Render over Railway, use the included `render.yaml` blueprint:

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render creates the API + PostgreSQL from `render.yaml`
4. Add **Redis** via [Upstash](https://upstash.com) (free tier):
   - Create a Redis database on Upstash
   - Copy the Redis URL
   - In Render → `codity-api` → **Environment** → set `REDIS_URL`
5. Set `CORS_ORIGIN` after Vercel deploy (same as Step 4)

---

## Security checklist before going public

- [ ] `.env` and `.env.local` are **not** committed (already in `.gitignore`)
- [ ] JWT secrets are strong random strings (not the dev defaults)
- [ ] Demo password `password123` is fine for portfolio demos; change it for production use
- [ ] Railway/Render dashboard env vars are set — never put secrets in GitHub

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend shows login errors / network failed | Check `NEXT_PUBLIC_API_URL` on Vercel matches your Railway URL |
| CORS error in browser console | Set `CORS_ORIGIN` on Railway to your exact Vercel URL |
| Health check shows Redis DOWN | Ensure `REDIS_URL` is set and Redis service is running |
| Health check shows database DOWN | Check `DATABASE_URL` reference and that migrations ran |
| WebSocket not connecting | Confirm `NEXT_PUBLIC_API_URL` uses `https://` (Railway provides HTTPS) |
| 502 on Railway | Check deploy logs; ensure `PORT=4000` is set |

---

## Quick reference

```powershell
# Local development
docker compose up -d postgres redis
cd backend; npx prisma migrate dev; npm run start:dev
cd frontend; npm run dev

# Production URLs
Website:  https://YOUR-APP.vercel.app
API:      https://YOUR-API.up.railway.app/api/v1
Swagger:  https://YOUR-API.up.railway.app/api/docs
Health:   https://YOUR-API.up.railway.app/api/v1/health
```
