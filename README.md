# Distributed Job Scheduler SaaS

A production-ready, multi-tenant distributed job scheduler built with NestJS, Next.js, PostgreSQL, Redis, and Docker.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │  Queues  │ │  Jobs    │ │ Workers  │ │Analytics │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                         ┌──────────────┐                            │
│                         │  Auth System │                            │
│                         └──────────────┘                            │
│                         ┌──────────────┐                            │
│                         │ Socket.IO    │                            │
│                         └──────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                          HTTP REST + WebSocket
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS 11)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │   Org    │ │ Project  │ │  Queue   │ │   Job    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  Worker  │ │Dashboard │ │ WebSocket│ │Scheduler │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                   Prisma ORM / PostgreSQL                 │       │
│  └──────────────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                        Redis                             │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **Framework**: NestJS 11 (TypeScript)
- **Database**: PostgreSQL 17 via Prisma ORM
- **Cache**: Redis 7 (ioredis)
- **Authentication**: JWT with refresh token rotation
- **Real-time**: Socket.IO
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **State/Data**: TanStack Query, React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theming**: next-themes (dark/light with system preference)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Backend → Railway/Render, Frontend → Vercel

## Features

### Authentication
- Register, Login, Logout
- JWT access tokens + refresh token rotation
- bcrypt password hashing (12 rounds)
- Public/JWT guards with @Public() decorator

### Multi-tenant Organizations
- Organizations with unique slugs
- Projects under organizations
- RBAC: OWNER, ADMIN, DEVELOPER, VIEWER
- Member invitation and role management
- Organization/project switching

### Queues
- Create, update, delete queues
- Pause/resume queue processing
- Configurable priority, concurrency limits
- Retry policy configuration (FIXED, LINEAR, EXPONENTIAL)
- Per-queue job timeout

### Jobs
- **Job Types**: Immediate, Delayed, Scheduled, Recurring (Cron), Batch
- **Lifecycle**: QUEUED → SCHEDULED → CLAIMED → RUNNING → COMPLETED/RETRYING/FAILED/DEAD_LETTER
- **Idempotent**: Idempotency key deduplication
- **Retry Strategies**: Fixed delay, Linear backoff, Exponential backoff
- **Dead Letter Queue**: Automatic DLQ after max retries exhausted

### Workers
- **Atomic Job Claiming**: PostgreSQL `FOR UPDATE SKIP LOCKED` - no race conditions
- **Heartbeat**: Health monitoring with configurable timeout
- **Concurrent Execution**: Configurable concurrency per worker
- **Graceful Handling**: Job timeout detection, worker pruning

### Real-time Updates
- Live queue updates via Socket.IO
- Live worker heartbeat monitoring
- Live job lifecycle events
- Live dashboard metrics

### Dashboard & Analytics
- Real-time overview with stats cards
- Daily throughput charts (7-day)
- Job status distribution (pie chart)
- Per-queue breakdown table
- Worker health monitoring

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for local PostgreSQL and Redis)
- npm

### Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd distributed-job-scheduler

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
cd ..

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 5. Run database migrations
cd backend
npx prisma migrate dev

# 6. Seed demo data
npx prisma db seed

# 7. Start backend
npm run start:dev

# 8. In another terminal, start frontend
cd ../frontend
npm run dev
```

### Environment Variables

**Backend** (`backend/.env`):
```
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
DATABASE_URL=postgresql://jobqueue:jobqueue@localhost:5432/jobqueue
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Demo Credentials
- **Email**: admin@codity.ai
- **Password**: password123

## API Documentation

Once running, Swagger UI is available at: `http://localhost:4000/api/docs`

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register user |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh` | Public | Refresh tokens |
| GET | `/api/v1/auth/me` | JWT | Current user |
| GET | `/api/v1/health` | Public | Health check |
| POST | `/api/v1/organizations` | JWT | Create org |
| GET | `/api/v1/organizations` | JWT | List orgs |
| POST | `/api/v1/organizations/:slug/members` | JWT | Invite member |
| POST | `/api/v1/organizations/:slug/projects` | JWT | Create project |
| POST | `/api/v1/organizations/:slug/projects/:pslug/queues` | JWT | Create queue |
| POST | `/api/v1/organizations/:slug/projects/:pslug/queues/:name/pause` | JWT | Pause queue |
| POST | `/api/v1/organizations/:slug/projects/:pslug/queues/:name/resume` | JWT | Resume queue |
| POST | `/api/v1/.../queues/:name/jobs` | JWT | Submit job |
| POST | `/api/v1/.../queues/:name/jobs/batch` | JWT | Batch jobs |
| POST | `/api/v1/workers/register` | Public | Register worker |
| POST | `/api/v1/workers/:id/heartbeat` | Public | Worker heartbeat |
| POST | `/api/v1/workers/:id/claim` | Public | Claim jobs |
| POST | `/api/v1/workers/:id/jobs/:jobId/complete` | Public | Complete job |
| POST | `/api/v1/workers/:id/jobs/:jobId/fail` | Public | Fail job |
| GET | `/api/v1/organizations/:slug/dashboard/metrics` | JWT | Dashboard metrics |

### WebSocket Events (`/events` namespace)

| Event | Direction | Description |
|-------|-----------|-------------|
| `job:created` | Server → Client (org room) | New job created |
| `job:updated` | Server → Client (org room) | Job status changed |
| `queue:updated` | Server → Client (global) | Queue status changed |
| `worker:heartbeat` | Server → Client (global) | Worker heartbeat |
| `metrics:updated` | Server → Client (org room) | Metrics updated |

## Database Design

### Entity Relationship

```
User ────< Membership >──── Organization ────< Project ────< Queue ────< Job
  │                                                                    │
  └──< RefreshToken                                             < ExecutionLog
                                                                  < RetryHistory
                                                                  < DeadLetterJob

Worker ────< WorkerHeartbeat
```

### Key Design Decisions

- **Composite unique keys**: `Membership(userId, organizationId)`, `Queue(projectId, name)`, `Job(queueId, idempotencyKey)`
- **UUID Primary Keys**: All entities use UUID v4 for distributed-friendly IDs
- **Cascading Deletes**: Child records are automatically removed when parents are deleted
- **Composite Indexes**: Optimized for common query patterns (status lookups, time ranges)

## Job Lifecycle

```
        ┌──────────────────────────────────────────────────────────┐
        │                    Job States                            │
        │                                                          │
        │  QUEUED ──► CLAIMED ──► RUNNING ──► COMPLETED            │
        │    │            │           │                             │
        │    │            │           ├──► FAILED ──► RETRYING ──► QUEUED
        │    │            │           │       │                     │
        │    │            │           │       └──► DEAD_LETTER      │
        │    │            │           │                             │
        │    │            │           └──► CANCELLED                │
        │    │            │                                         │
        │    └──► SCHEDULED ──► QUEUED                              │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
```

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step instructions to publish a public URL (GitHub + Railway + Vercel).

### Docker Compose (Full Stack)

```bash
docker compose up --build
```

This starts:
- PostgreSQL 17 (port 5432)
- Redis 7 (port 6379)  
- Backend API (port 4000)
- Frontend (port 3000)

### Backend (Railway/Render)

1. Set environment variables from `.env.example`
2. Run migrations: `npx prisma migrate deploy`
3. Build: `npm run build`
4. Start: `npm run start:prod`

### Frontend (Vercel)

1. Connect repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy

## Testing

```bash
# Backend unit tests
cd backend
npm run test

# Backend E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Design Decisions

### Why `FOR UPDATE SKIP LOCKED`?
Prevents race conditions when multiple workers poll for jobs simultaneously. Workers only see unclaimed jobs without blocking each other.

### Why Refresh Token Rotation?
Each refresh generates a new pair and invalidates the old one. If a stolen refresh token is used, the legitimate user's session is also invalidated, alerting them to the breach.

### Why Idempotency Keys?
Prevents duplicate job creation when API requests are retried due to network failures.

### Why Composite Indexes?
Common query patterns (e.g., jobs by status + queue) are optimized with covering indexes, avoiding sequential scans on large tables.

### Why Hierarchical RBAC?
Simplifies permission management: OWNER > ADMIN > DEVELOPER > VIEWER. Higher roles inherit all permissions of lower roles.
