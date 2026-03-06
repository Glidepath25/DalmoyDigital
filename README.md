# Dalmoy Digital (Phase 1)

Project tracking platform for construction fitout projects — from costing through to completion.

Phase 1 delivers:
- Authentication + RBAC (Admin / Manager / Standard User / Read Only)
- Dashboard with project list, search, filters, pagination
- Project detail module (dynamic dropdowns for client + status)
- Admin area for users, projects, and dropdown/lookup values
- PostgreSQL + Prisma schema, migration, and seed demo data
- API-first foundation under `/api/v1/*` (web + future mobile)

## Tech stack
- Next.js (App Router) + TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth (Credentials provider)
- Tailwind CSS

## Folder structure (high level)
- `app/` — UI routes (server components) + route handlers (API)
  - `app/api/v1/*` — versioned JSON API for web/mobile clients
  - `app/api/auth/*` — NextAuth endpoints
  - `app/admin/*` — admin pages (protected by permissions)
  - `app/dashboard` — project list with filters
  - `app/projects/[projectId]` — project module
- `components/` — reusable UI + layout components
- `lib/` — backend/shared logic (db, auth, RBAC, permissions)
- `prisma/` — schema, migrations, seed script

## Database design notes
Key ideas:
- **RBAC is data-driven**: `roles`, `permissions`, `role_permissions`, `user_roles` supports future roles/permissions without code changes.
- **Dropdowns are database-backed**:
  - `clients` and `project_statuses` for core Phase 1 dropdowns
  - `lookup_types` + `lookup_options` for reusable dropdowns (future modules)
- **Audit fields**:
  - `created_at`, `updated_at` on all core entities
  - `created_by_id`, `updated_by_id` where useful for future activity/history features
- **Mobile-friendly/API-first**:
  - Stable UUID primary keys
  - Versioned API namespace: `/api/v1/*`

## Setup (local)

### 1) Prereqs
- Node.js 20+
- Docker Desktop (recommended for local Postgres)

### 2) Start PostgreSQL
```bash
docker compose up -d db
```

### 3) Install deps
```bash
npm install
```

### 4) Configure env
Copy `.env.example` → `.env` and adjust if needed:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Note: when running the app on your host (not in Docker) while Postgres runs in Docker, set `DATABASE_URL` to use `localhost:5432` (not `db:5432`).

### 5) Migrate + seed
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 6) Run the app
```bash
npm run dev
```
Open `http://localhost:3000`.

## Demo accounts (seeded)
- Admin: `admin@dalmoy.local` / `Admin123!`
- Manager: `manager@dalmoy.local` / `Manager123!`
- Standard: `user@dalmoy.local` / `User12345!`
- Read only: `readonly@dalmoy.local` / `ReadOnly123!`

## Permissions & route protection
- All non-public routes require login via `middleware.ts`
- Additional checks are done server-side via permissions:
  - Admin UI uses `admin:access`
  - Admin user management uses `users:manage`
  - Dropdown/lookup management uses `lookups:manage`
  - Projects use `projects:read`, `projects:create`, `projects:update`

See `lib/permissions.ts`.

## API (Phase 1)
These endpoints are intended to be consumed by both web and a future mobile app:
- `GET /api/v1/me`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `GET /api/v1/clients`
- `GET /api/v1/statuses`

Auth is session-based (NextAuth). For a future mobile app, you can evolve this to:
- token-based auth (e.g. rotating refresh tokens)
- API keys for service integrations
- an OpenAPI spec + generated client SDKs

## Cheap dev deployment options
- **Frontend/API**: Vercel (Next.js) or a small VPS running `next start`
- **Postgres**: Supabase, Neon, or Render (low-cost Postgres hosting)
- **Secrets**: Vercel environment variables (or Doppler/1Password later)

## DigitalOcean Droplet deployment (Docker Compose)

These steps deploy the app + PostgreSQL onto a single DigitalOcean Droplet using Docker Compose (portable to AWS later).

### 1) Clone the repo
```bash
git clone <YOUR_REPO_URL> dalmoy-digital
cd dalmoy-digital
```

### 2) Create the `.env`
```bash
cp .env.example .env
```
Edit `.env` and set:
- `NEXTAUTH_SECRET` to a strong random secret
- `NEXTAUTH_URL` to `http://SERVER_IP:3000` (or your domain)
- Confirm `DATABASE_URL` uses `@db:5432` (Docker internal hostname, not localhost)

### 3) Build and start containers
```bash
docker compose up -d --build
```

### 4) Run Prisma migrations (in Docker)
```bash
docker compose exec app npx prisma migrate deploy
```

### 5) Run seed (in Docker)
```bash
docker compose exec app npx prisma db seed
```

### 6) Access the app
Open:
- `http://SERVER_IP:3000`

Logs (if needed):
```bash
docker compose logs -f app
docker compose logs -f db
```

## Future migration to AWS (no lock-in)
- App container can move to ECS (Fargate), App Runner, or EC2.
- Database can move to RDS or Aurora PostgreSQL.
- File storage (future) can move to S3 (store metadata + permissions in Postgres).

## Roadmap alignment (future modules)
This Phase 1 foundation is designed so you can add:
- file uploads (add `files` + storage integration)
- tasks (add `tasks` + assignments + due dates)
- costing and procurement (add line-item tables and approvals)
- site progress/snags (use `lookup_types/options` for dynamic fields)
- notifications (add `notifications` + background jobs)
- activity history (add an `activity_events` table that writes on updates)
