# Distributed Job Scheduler - Backend

NestJS 11 backend for the Distributed Job Scheduler SaaS.

## Tech Stack

- **Framework**: NestJS 11 (TypeScript)
- **Database**: PostgreSQL 17 via Prisma ORM 5
- **Cache**: Redis 7 (ioredis)
- **Auth**: JWT with refresh token rotation (bcrypt)
- **Real-time**: Socket.IO
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest, Supertest

## Project Structure

```
src/
├── main.ts                    # Entry point, Swagger, CORS, Validation
├── app.module.ts              # Root module
├── config/                    # Configuration & validation
├── redis/                     # Redis client module
├── prisma/                    # Prisma ORM service
├── common/                    # Shared DTOs, guards, interceptors, filters
│   ├── dto/                   # Pagination DTO
│   ├── decorators/            # @Public(), @Roles(), @CurrentUser()
│   ├── filters/               # Global exception filter
│   ├── guards/                # JWT auth guard, Roles guard
│   └── interceptors/          # Logging, Transform interceptors
└── modules/
    ├── auth/                  # Auth module (register, login, refresh, logout)
    ├── users/                 # User module (placeholder)
    ├── health/                # Health check (DB + Redis)
    ├── organizations/         # Organization CRUD, members, roles
    ├── projects/              # Project CRUD with pagination
    ├── queues/                # Queue CRUD, pause/resume, stats
    ├── jobs/                  # Job lifecycle, batch, retry
    ├── workers/               # Worker registration, heartbeat, claiming
    ├── dashboard/             # Aggregated metrics & analytics
    ├── events/                # Socket.IO WebSocket gateway
    └── scheduler/             # Cron-driven background tasks
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed    # Creates demo data
npm run start:dev     # http://localhost:4000
```

## API Documentation

Swagger UI: `http://localhost:4000/api/docs`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Watch mode development |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Production start |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run lint` | ESLint |
| `npx prisma studio` | Database GUI |
| `npx prisma migrate dev` | Run migrations |
