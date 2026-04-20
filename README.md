# PisangDB 🍌

> **Ephemeral databases, ready in seconds.** Isolated PostgreSQL, MySQL, and MariaDB sandboxes — copy the connection string, build and test, then let auto-cleanup handle the rest.

---

## What is PisangDB?

PisangDB is a SaaS tool for developers who need a production-like database **immediately**, without installing anything locally. You pick the engine and retention time, get instant credentials, and the database cleans itself up when the TTL expires.

**Free tier includes:**
- 5 active sandboxes
- 100 MB per sandbox
- Retention from 1 hour up to 7 days
- 3 engines: PostgreSQL 16, MySQL 8, MariaDB 11
- SQL Console (browser-based)
- AI Seeder — 30 requests/day

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR + file-based routing) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| State / Data | [TanStack Query](https://tanstack.com/query) |
| Auth | [better-auth](https://www.better-auth.com/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Database | PostgreSQL 16 + MySQL 8 + MariaDB 11 |
| AI | Configurable chat-completions API via env |
| Icons | [Lucide React](https://lucide.dev/) |
| Toast | [Sonner](https://sonner.emilkowal.ski/) |
| Linter/Formatter | [Biome](https://biomejs.dev/) |

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Required
BETTER_AUTH_SECRET=         # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3100
DATABASE_URL=postgresql://pisang:password@localhost:5432/pisangdb

# Sandbox engines (Docker) — region: id
POSTGRES_SANDBOX_URL_ID=postgresql://pisang:password@localhost:5432/postgres
PUBLIC_POSTGRES_SANDBOX_PORT_ID=5433
MYSQL_SANDBOX_URL_ID=mysql://root:password@localhost:3306
MARIADB_SANDBOX_URL_ID=mysql://root:password@localhost:3307

# AI provider
AI_API_URL=your-ai-api-url
AI_API_TOKEN=your-ai-api-token
AI_MODEL=your-ai-model-id

# Optional — Google OAuth
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

### 3. Start database containers

```bash
docker compose up -d postgres-sandbox mysql mariadb
```

### 4. Run migrations

```bash
pnpm drizzle-kit push
```

### 5. Start dev server

```bash
pnpm dev
```

The app runs at `http://localhost:3100`.

---

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── app-sidebar.tsx
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   └── ...
├── db/
│   ├── schema.ts        # Drizzle schema (users, sandboxes, sessions, ...)
│   └── index.ts         # DB pool factories (pg + mysql2)
├── lib/
│   ├── auth.ts          # better-auth server instance
│   ├── auth-client.ts   # better-auth browser client
│   ├── ai.ts            # AI runtime, sanitization, timeout, retries
│   ├── types.ts         # Shared TypeScript types
│   └── utils.ts         # cn() helper
├── modules/             # Feature modules (schema + serverFns)
│   ├── auth/
│   ├── sandboxes/
│   ├── console/
│   └── templates/
├── routes/              # File-based routes (TanStack Router)
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Landing page
│   ├── api/auth/$.ts    # better-auth handler
│   ├── (auth)/          # Login, register, forgot-password
│   ├── _app.tsx         # Dashboard layout (sidebar + breadcrumbs)
│   └── _app/dashboard/  # All dashboard pages
└── styles.css
```

---

## Dashboard Surfaces

Core workspace routes:

- `/dashboard` — workspace overview, capacity, recent sandboxes
- `/dashboard/sandboxes` — sandbox workspace with live storage overview
- `/dashboard/sandboxes/new` — create sandbox flow with engine/region/template selection
- `/dashboard/sandboxes/:id` — connection kit, SQL console, AI seeder, tables, history
- `/dashboard/console` — shared SQL workspace across active sandboxes
- `/dashboard/ai-seeder` — shared AI SQL generation workspace across active sandboxes
- `/dashboard/account` — account overview
- `/dashboard/settings` — profile, security, preferences, danger zone
- `/dashboard/help` — quick-start and troubleshooting surface

---

## Available Scripts

```bash
pnpm dev            # Start dev server with HMR
pnpm build          # Build for production
pnpm check          # Biome lint + format check
pnpm check:write    # Biome auto-fix
```

---

## Development Notes

### Auth
Authentication is handled by **better-auth** with session-based auth (stored in PostgreSQL). On the client, import from `#/lib/auth-client`:

```ts
import { signIn, signUp, signOut, useSession } from '#/lib/auth-client'
```

Google OAuth activates automatically when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`.

### Routing
TanStack Router file-based routing. `_app.tsx` wraps all dashboard routes. Auth pages live in `(auth)/` route group (no URL effect).

### Server Functions
Backend logic lives in `src/modules/{feature}/serverFn.ts`. Use `createServerFn` from `@tanstack/react-start`. Always use `.inputValidator()` — not `.validator()`.

### AI
AI Seeder uses a configurable chat-completions provider. Configure it through `AI_API_URL`, `AI_API_TOKEN`, and `AI_MODEL`. Do not hardcode provider-specific values in the codebase.

Current AI flow highlights:
- mode-aware generation for `schema`, `seed`, and `helper`
- provider timeout handling
- SQL sanitization before execution
- retry on truncated model responses
- recent prompt cache in dashboard AI surfaces

### Prisma `migrate dev` and Shadow Databases
If a local Prisma project points to a PisangDB PostgreSQL sandbox and runs `pnpm prisma migrate dev`, Prisma may fail with `P3014`:

```text
Prisma Migrate could not create the shadow database
ERROR: permission denied to create database
```

This is expected. `migrate dev` uses a shadow database to detect schema drift, while PisangDB sandbox users are isolated to one database and do not get `CREATE DATABASE`.

If you do not want to install PostgreSQL locally and do not want a second sandbox, use `pnpm prisma db push`.

If the project only has `schema.prisma` and does not have a `prisma/migrations` folder or SQL migration files yet, `pnpm prisma db push` still works. It synchronizes the schema directly to the database and does not require migration files first.

Use one of these flows:

1. Fastest path for prototypes or bootcamps: skip migration files and push the schema directly. This path does not need a second sandbox and does not need any local PostgreSQL install.

```bash
pnpm prisma db push
pnpm prisma generate
```

2. If you need real migration files managed by Prisma during development: create a second PostgreSQL sandbox and use it as `SHADOW_DATABASE_URL`.

This also does not require local PostgreSQL. The shadow database can stay remote on PisangDB as long as it is separate from the main `DATABASE_URL`.

Quick rule:
- Want the simplest setup with one PisangDB sandbox: use `pnpm prisma db push`
- Do not want a local database and do not want a second sandbox: use `pnpm prisma db push`
- Want migration files from `pnpm prisma migrate dev`: add a second PisangDB sandbox for `SHADOW_DATABASE_URL`

```env
DATABASE_URL=postgresql://main_user:main_pass@id.pisangdb.com:5432/main_db
SHADOW_DATABASE_URL=postgresql://shadow_user:shadow_pass@id.pisangdb.com:5432/shadow_db
```

Prisma 7+:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
```

Prisma 6 and below:

```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

Keep `DATABASE_URL` and `SHADOW_DATABASE_URL` different. Do not point both to the same sandbox. Treat the shadow database as disposable because Prisma may reset it during `migrate dev`. For production, use `prisma migrate deploy`; the shadow database requirement applies to `migrate dev`.

When to switch from `db push` to `migrate dev`:
- Stay on `db push` while learning Prisma, prototyping fast, or working alone without needing migration history in git
- Move to `migrate dev` when you want reviewable migration files, predictable schema changes across teammates, and a proper deploy flow with `prisma migrate deploy`

Official references:
- Prisma config reference: https://www.prisma.io/docs/orm/reference/prisma-config-reference
- Prisma Migrate development workflow: https://www.prisma.io/docs/v6/orm/prisma-migrate/workflows/development-and-production

### Linting & Formatting
Biome only — no ESLint, no Prettier.

```bash
pnpm check:write    # auto-fix everything
```

---

## Roadmap

- [x] Project setup (TanStack Start + Drizzle + better-auth)
- [x] Database schema (users, sandboxes, sessions, ai_logs, query_history, templates)
- [x] Auth — email/password + Google SSO via better-auth
- [x] Sandbox provisioning (create/delete DB on Docker containers)
- [x] Ephemeral engine (TTL auto-cleanup scheduler)
- [x] SQL Console execution API
- [x] AI Seeder integration (provider configurable via env)
- [x] Connect frontend to backend server functions
- [ ] Google OAuth end-to-end verification
- [ ] Email expiry warning
- [ ] User-defined templates
- [ ] Export sandbox as SQL dump
- [ ] Multi-region activation
- [ ] Worker heartbeat and operational observability

---

## License

MIT — see [LICENSE](./LICENSE).
