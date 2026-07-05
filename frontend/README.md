# Distributed Job Scheduler - Frontend

Next.js 16 frontend for the Distributed Job Scheduler SaaS.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix primitives)
- **State/Data**: TanStack Query v5, React Hook Form + Zod v4
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theming**: next-themes (dark/light/system)

## Features

- **Dashboard**: Real-time metrics, throughput charts, worker health
- **Queues**: CRUD, pause/resume, priority & concurrency config
- **Job Explorer**: Search, filter, pagination, job detail modal
- **Workers**: Live monitoring, heartbeat visualization
- **Analytics**: Pie charts, bar charts, daily trends, per-queue breakdown
- **Members**: Invite, role management (RBAC)
- **Auth**: Login, register, JWT token refresh
- **Theme**: Dark/Light toggle with persistence

## Setup

```bash
npm install
cp .env.example .env.local   # Set NEXT_PUBLIC_API_URL
npm run dev                  # http://localhost:3000
```

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Login with email/password |
| `/register` | Create new account |
| `/dashboard` | Overview metrics & charts |
| `/queues` | Queue management |
| `/jobs` | Job explorer with filtering |
| `/workers` | Worker monitoring |
| `/analytics` | Detailed analytics |
| `/members` | Team management |

## Build

```bash
npm run build    # Production build
npm run lint     # ESLint
```
