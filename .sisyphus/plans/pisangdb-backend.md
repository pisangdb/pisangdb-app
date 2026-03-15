# PisangDB Backend Implementation Work Plan

## TL;DR

> **Quick Summary**: Implement complete backend for PisangDB — PostgreSQL-only sandbox provisioning with email/GitHub auth, Drizzle ORM, Gemini AI Seeder, and Docker deployment.
>
> **Deliverables**:
> - 5 Drizzle schema tables (users, sandboxes, ai_logs, query_history, templates)
> - 6 auth endpoints (register, login, logout, me, GitHub OAuth)
> - 6 sandbox endpoints (CRUD + extend + tables)
> - 2 SQL Console endpoints (query execution + history)
> - 3 AI endpoints (generate, execute, logs)
> - Ephemeral engine (auto-cleanup scheduler)
> - Docker Compose (app + PostgreSQL app DB + PostgreSQL sandbox container)
> - Frontend integration with TanStack Query

> **Estimated Effort**: Large (4 phases, ~7-10 days)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Database Schema → Auth API → Sandbox API → Frontend Integration

---

## Context

### Original Request
Implement the complete backend for PisangDB based on the PRD and the comprehensive project review. The frontend is 100% complete with mock data — need to build all server-side functionality.

### User Decisions
- **DB Engines**: PostgreSQL only for MVP (add MySQL/MariaDB in v1.1)
- **Auth**: Email/password + GitHub OAuth
- **AI Seeder**: Real Gemini API with graceful degradation
- **Templates**: Blank only — no templates for MVP

### Metis Review
**Identified Gaps** (addressed):
- **Guardrail 1**: Must create dedicated DB user per sandbox for isolation (not reuse app DB user)
- **Guardrail 2**: 30-second query timeout + blocked commands (DROP DATABASE, ALTER SYSTEM)
- **Guardrail 3**: 30 AI requests per user per day rate limit
- **Guardrail 4**: OAuth callback URLs must match GitHub app configuration
- **Guardrail 5**: Sandbox db_password must be encrypted at rest

**Questions Resolved**:
- Q: TanStack Start server functions vs Hono? → **TanStack Start** (built-in, matches existing stack)
- Q: Ephemeral engine in-process or external? → **In-process scheduler** (simpler for MVP)
- Q: Connection pooling strategy? → **pg.Pool for app DB, dedicated clients for sandbox operations**

**Edge Cases**:
- Sandbox creation collision (retry with new random suffix up to 3 times)
- Cleanup worker crash recovery (idempotent operations, resume on restart)
- Gemini API quota exhaustion (graceful degradation, show error message)
- Concurrent sandbox limits (5 active per user, reject creation if exceeded)

---

## Work Objectives

### Core Objective
Build a production-ready backend that enables developers to instantly create ephemeral PostgreSQL sandboxes, connect from their local projects, run queries via web console, generate schema with AI, and have everything auto-cleanup after TTL expires.

### Concrete Deliverables
- Working auth system (email + GitHub OAuth)
- Sandbox CRUD with dedicated user isolation
- Real SQL execution against PostgreSQL containers
- AI-powered schema generation via Gemini
- Auto-cleanup of expired sandboxes
- Docker Compose for local development

### Definition of Done
- [ ] All 20 API endpoints return correct responses
- [ ] Auth flows work (register → login → session → protected routes)
- [ ] Sandbox creation provisions dedicated PostgreSQL user
- [ ] SQL Console executes queries safely
- [ ] AI Seeder generates valid SQL from prompts
- [ ] Expired sandboxes are auto-deleted
- [ ] Docker Compose starts all services
- [ ] Frontend uses real data (no mock data)
- [ ] All tests pass (`pnpm test`)
- [ ] Biome check passes (`pnpm check`)

### Must Have
- Email/password authentication
- GitHub OAuth (PRD "Should Have", user requested)
- PostgreSQL sandbox creation
- Dedicated DB user per sandbox (isolation)
- JWT session management
- Query execution with safety guards
- Gemini AI integration
- Ephemeral engine (auto-cleanup)
- Docker Compose setup

### Must NOT Have (Guardrails)
- MySQL/MariaDB support (deferred to v1.1)
- Database templates (deferred to v1.1)
- Multi-region (single `id` region only)
- Superuser privileges for sandbox users
- Direct SQL commands without timeout/safety
- Unencrypted passwords in database
- Rate limit bypasses

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest configured)
- **Automated tests**: NONE (deferred — focus on shipping MVP first)
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Every task MUST include agent-executed QA scenarios saved to `.sisyphus/evidence/task-{N}-{scenario}.{ext}`.

- **API Endpoints**: Use Bash (`curl`) — Send requests, assert status + response fields
- **Database Operations**: Use Bash (`psql`) — Connect, query, verify schema
- **Docker Services**: Use Bash (`docker`) — Verify containers running, health checks pass
- **Auth Flows**: Use Bash (`curl`) — Test register → login → protected route
- **Ephemeral Engine**: Use Bash — Create sandbox, wait for expiry, verify cleanup

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + config):
├── Task 1: Install backend dependencies [quick]
├── Task 2: Create Docker Compose [quick]
├── Task 3: Create environment config [quick]
├── Task 4: Create Drizzle config [quick]
└── Task 5: Create database schema [quick]

Wave 2 (After Wave 1 — core setup):
├── Task 6: Create database connection [quick]
├── Task 7: Generate initial migration [quick]
├── Task 8: Run migrations [quick]
├── Task 9: Create session utilities [quick]
└── Task 10: Create password utilities [quick]

Wave 3 (After Wave 2 — auth + sandbox core):
├── Task 11: Create auth middleware [quick]
├── Task 12: Create rate limit middleware [quick]
├── Task 13: Implement register endpoint [deep]
├── Task 14: Implement login endpoint [deep]
├── Task 15: Implement logout endpoint [quick]
├── Task 16: Implement me endpoint [quick]
├── Task 17: Implement GitHub OAuth [deep]
├── Task 18: Create sandbox manager lib [deep]
├── Task 19: Implement create sandbox [deep]
├── Task 20: Implement list sandboxes [quick]
├── Task 21: Implement get sandbox [quick]
├── Task 22: Implement extend sandbox [quick]
├── Task 23: Implement delete sandbox [deep]
└── Task 24: Implement get tables [quick]

Wave 4 (After Wave 3 — features + engine):
├── Task 25: Create query executor lib [deep]
├── Task 26: Implement execute query endpoint [deep]
├── Task 27: Implement query history endpoint [quick]
├── Task 28: Create Gemini client lib [quick]
├── Task 29: Implement AI generate endpoint [deep]
├── Task 30: Implement AI execute endpoint [quick]
├── Task 31: Implement AI logs endpoint [quick]
├── Task 32: Create ephemeral engine [deep]
├── Task 33: Create health check endpoint [quick]
└── Task 34: Add app init scheduler [quick]

Wave 5 (After Wave 4 — frontend + polish):
├── Task 35: Create TanStack Query hooks [deep]
├── Task 36: Update auth forms [quick]
├── Task 37: Update dashboard page [quick]
├── Task 38: Update sandboxes list [quick]
├── Task 39: Update sandbox detail [quick]
├── Task 40: Update create sandbox [quick]
├── Task 41: Update SQL Console [quick]
├── Task 42: Update AI Seeder [quick]
├── Task 43: Update settings page [quick]
└── Task 44: Update account page [quick]

Wave FINAL (After ALL tasks — verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 5 → Task 18 → Task 19 → Task 35 → Task 44 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 5 (Waves 1 & 2)
```

### Dependency Matrix

- **Tasks 1-5**: — — Tasks 6-10
- **Tasks 6-10**: 1-5 — Tasks 11-24
- **Tasks 11-24**: 6-10 — Tasks 25-34
- **Tasks 25-34**: 18, 23 — Tasks 35-44
- **Tasks 35-44**: 11-24, 25-34 — F1-F4
- **F1-F4**: ALL — —

> This is abbreviated for reference. YOUR generated plan must include the FULL matrix for ALL tasks.

---

## TODOs

- [x] 1. Install Backend Dependencies

  **What to do**:
  - Install Drizzle ORM: `pnpm add drizzle-orm pg`
  - Install database drivers: `pnpm add pg mysql2` (mysql2 for future, pg for now)
  - Install auth dependencies: `pnpm add bcrypt jsonwebtoken`
  - Install AI dependency: `pnpm add @google/generative-ai`
  - Install dev dependencies: `pnpm add -D drizzle-kit @types/pg @types/bcrypt @types/jsonwebtoken`
  - Update `package.json` scripts with `db:push`, `db:generate`, `db:migrate`

  **Must NOT do**:
  - Do NOT install Hono, Express, or other frameworks (use TanStack Start server functions)
  - Do NOT install Prisma (we're using Drizzle)
  - Do NOT install JWT refresh token libraries (keep it simple for MVP)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple package installation, no complex logic
  - **Skills**: []
    - No special skills needed for npm package installation

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 2-5)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - `package.json` — Add dependencies here
  - PRD §8.1 — Tech stack specifies Drizzle ORM, pg, mysql2, bcrypt, JWT
  - PRD §6.5 — Gemini AI integration required

  **Acceptance Criteria**:
  - [ ] All dependencies installed without errors
  - [ ] `package.json` contains: drizzle-orm, pg, bcrypt, jsonwebtoken, @google/generative-ai
  - [ ] Dev dependencies installed: drizzle-kit, @types/pg, @types/bcrypt, @types/jsonwebtoken
  - [ ] `pnpm install` runs successfully

  **QA Scenarios**:
  ```
  Scenario: Dependencies installed correctly
    Tool: Bash
    Steps:
      1. Run `grep -E '"(drizzle-orm|pg|bcrypt|jsonwebtoken|@google/generative-ai)"' package.json`
      2. Run `grep -E '"(@types/pg|@types/bcrypt|@types/jsonwebtoken)"' package.json`
      3. Run `pnpm install --frozen-lockfile`
    Expected Result: All packages present, install succeeds without errors
    Evidence: .sisyphus/evidence/task-01-deps.txt
  ```

  **Commit**: YES
  - Message: `chore: install backend dependencies (drizzle, pg, bcrypt, jwt, gemini)`
  - Files: `package.json`, `pnpm-lock.yaml`

---

- [x] 2. Create Docker Compose

  **What to do**:
  - Create `docker-compose.yml` with 3 services:
    1. `postgres-app` — PostgreSQL for app metadata (users, sandboxes table)
    2. `postgres-sandbox` — PostgreSQL for user sandboxes (will create databases here)
    3. `app` — TanStack Start application
  - Configure environment variables for both PostgreSQL instances
  - Set up health checks for both database containers
  - Configure volumes for data persistence
  - Add network configuration for inter-service communication
  - Set resource limits (per PRD §15.4)

  **Must NOT do**:
  - Do NOT include MySQL or MariaDB containers (deferred to v1.1)
  - Do NOT expose PostgreSQL ports to host in production
  - Do NOT use weak passwords in compose file (use .env)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Docker Compose setup, well-documented patterns
  - **Skills**: [`docker-patterns`]
    - `docker-patterns`: Docker Compose patterns, health checks, volume strategies

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 1, 3-5)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - PRD §8.4 — Docker Compose with app, postgres, mysql, mariadb, caddy
  - PRD §15.4 — Resource limits configuration
  - PRD §15.6 — Environment variables for passwords

  **Acceptance Criteria**:
  - [ ] `docker-compose.yml` created with 3 services minimum
  - [ ] postgres-app with health check, volumes, environment
  - [ ] postgres-sandbox with health check, volumes, environment
  - [ ] app service with depends_on for databases
  - [ ] Network configured for inter-service communication
  - [ ] Resource limits set per PRD recommendations

  **QA Scenarios**:
  ```
  Scenario: Docker Compose validates and starts
    Tool: Bash
    Steps:
      1. Run `docker compose config` to validate YAML
      2. Run `docker compose up -d postgres-app postgres-sandbox`
      3. Wait 10 seconds
      4. Run `docker compose ps` to verify both containers are "healthy"
      5. Run `docker compose logs postgres-app --tail 5`
    Expected Result: Both PostgreSQL containers running and healthy
    Evidence: .sisyphus/evidence/task-02-docker.txt

  Scenario: Database connectivity works
    Tool: Bash
    Steps:
      1. Run `docker compose exec postgres-app pg_isready`
      2. Run `docker compose exec postgres-sandbox pg_isready`
    Expected Result: Both commands return "accepting connections"
    Evidence: .sisyphus/evidence/task-02-connect.txt
  ```

  **Commit**: NO (group with env config)
  - Message: `chore: add docker-compose and environment config`
  - Files: `docker-compose.yml`, `.env.example`, `.env`

---

- [x] 3. Create Environment Config

  **What to do**:
  - Create `.env.example` with all required environment variables:
    - `DATABASE_URL` — PostgreSQL app database connection
    - `POSTGRES_SANDBOX_URL` — PostgreSQL sandbox container connection (admin)
    - `JWT_SECRET` — Secret for JWT token signing
    - `JWT_EXPIRES_IN` — Token expiration time (7 days per PRD)
    - `GEMINI_API_KEY` — Google Gemini API key
    - `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
    - `GITHUB_CLIENT_SECRET` — GitHub OAuth app secret
    - `GITHUB_REDIRECT_URI` — OAuth callback URL
  - Create `.env` file for local development (copy from `.env.example`)
  - Add `.env` to `.gitignore`
  - Document all variables in README or comments

  **Must NOT do**:
  - Do NOT commit actual secrets to `.env`
  - Do NOT use default/placeholder passwords in production config
  - Do NOT include MySQL/MariaDB URLs (not needed for MVP)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple configuration file creation
  - **Skills**: [`security-review`]
    - `security-review`: Ensure secrets are not leaked, proper .gitignore setup

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 1-2, 4-5)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - PRD §12.3 — Environment variables for secrets
  - PRD §8.5 — Connection URL formats

  **Acceptance Criteria**:
  - [ ] `.env.example` created with all required variables
  - [ ] `.env` created for local development
  - [ ] `.env` added to `.gitignore`
  - [ ] All variables documented with descriptions
  - [ ] No secrets committed to repository

  **QA Scenarios**:
  ```
  Scenario: Environment config complete
    Tool: Bash
    Steps:
      1. Run `grep -c "DATABASE_URL" .env.example`
      2. Run `grep -c "JWT_SECRET" .env.example`
      3. Run `grep -c "GEMINI_API_KEY" .env.example`
      4. Run `grep -c "GITHUB_CLIENT_ID" .env.example`
      5. Run `git status --porcelain | grep ".env"` to verify not tracked
    Expected Result: All variables present, .env not tracked by git
    Evidence: .sisyphus/evidence/task-03-env.txt

  Scenario: .gitignore properly configured
    Tool: Bash
    Steps:
      1. Run `grep "^\.env$" .gitignore`
    Expected Result: ".env" line exists in .gitignore
    Evidence: (same as above)
  ```

  **Commit**: YES (grouped with Task 2)
  - Message: `chore: add docker-compose and environment config`
  - Files: `.env.example`, `.env`, `.gitignore`

---

- [x] 4. Create Drizzle Config

  **What to do**:
  - Create `drizzle.config.ts` at project root
  - Configure:
    - `schema` — Path to schema file (`./src/db/schema.ts`)
    - `out` — Migration output directory (`./drizzle`)
    - `dialect` — `postgresql`
    - `dbCredentials` — Connection from environment variable
  - Add npm scripts for database operations:
    - `db:generate` — Generate migrations
    - `db:push` — Push schema directly (development)
    - `db:migrate` — Run migrations
    - `db:studio` — Open Drizzle Studio (optional)

  **Must NOT do**:
  - Do NOT hardcode database credentials in config
  - Do NOT use MySQL dialect (PostgreSQL only for MVP)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Drizzle configuration, simple setup
  - **Skills**: [`prisma-orm`]
    - `prisma-orm`: Database ORM patterns (cacheable for Drizzle knowledge)

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 1-3, 5)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - Drizzle ORM documentation — Configuration options
  - PRD §8.1 — Drizzle ORM specified

  **Acceptance Criteria**:
  - [ ] `drizzle.config.ts` created with correct configuration
  - [ ] npm scripts added to `package.json`
  - [ ] Config reads from environment variables
  - [ ] Schema path correctly configured

  **QA Scenarios**:
  ```
  Scenario: Drizzle config valid
    Tool: Bash
    Steps:
      1. Run `pnpm drizzle-kit push --dry-run 2>&1 || true` (may fail due to missing DB, but config should parse)
      2. Run `grep "schema" drizzle.config.ts`
      3. Run `grep "dialect" drizzle.config.ts`
    Expected Result: Config parses without TypeScript errors, correct paths visible
    Evidence: .sisyphus/evidence/task-04-drizzle-config.txt
  ```

  **Commit**: YES
  - Message: `chore: add drizzle configuration`
  - Files: `drizzle.config.ts`, `package.json`

---

- [x] 5. Create Database Schema

  **What to do**:
  - Create `src/db/schema.ts` with all 5 tables:
    1. `users` — id, email, password_hash, name, role, github_id, avatar_url, created_at, updated_at
    2. `sandboxes` — id, user_id, engine, region, db_name, db_user, db_password, connection_url, host, port, display_name, status, template_id, max_size_mb, created_at, expired_at, updated_at
    3. `ai_logs` — id, sandbox_id, user_id, prompt, response, sql_generated, executed, tokens_used, created_at
    4. `query_history` — id, sandbox_id, query, status, execution_time_ms, rows_affected, error_message, created_at
    5. `templates` — id, name, description, engine, ddl_sql, seed_sql, is_builtin, user_id, created_at
  - Define all indexes per PRD §9.2:
    - `idx_sandboxes_user_id` on `user_id`
    - `idx_sandboxes_engine` on `engine`
    - `idx_sandboxes_region` on `region`
    - `idx_sandboxes_status_expired` on `(status, expired_at)`
    - `idx_sandboxes_db_name` UNIQUE on `db_name`
  - Use correct types: `uuid` for IDs, `text` for strings, `timestamp` for dates, `integer` for numbers
  - Add relations using Drizzle's `relations()` API

  **Must NOT do**:
  - Do NOT use `sql` type for enum fields — use `text` with TypeScript union
  - Do NOT add cascade deletes (keep data for audit)
  - Do NOT add columns not in PRD

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema definition is straightforward mapping from PRD
  - **Skills**: [`postgres-patterns`]
    - `postgres-patterns`: PostgreSQL schema design, indexing, best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 1-4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - PRD §9.2 — Complete table definitions with all columns and constraints
  - PRD §9.1 — Entity relationship diagram
  - Drizzle ORM docs — Schema definition patterns

  **Acceptance Criteria**:
  - [ ] All 5 tables defined with correct column names
  - [ ] All indexes created per PRD §9.2
  - [ ] Foreign key relations defined
  - [ ] TypeScript types exported correctly
  - [ ] `pnpm tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Schema types compile
    Tool: Bash
    Steps:
      1. Run `pnpm tsc --noEmit --pretty 2>&1 | head -50`
      2. Run `grep -c "export const users" src/db/schema.ts`
      3. Run `grep -c "export const sandboxes" src/db/schema.ts`
      4. Run `grep -c "export const ai_logs" src/db/schema.ts`
      5. Run `grep -c "export const query_history" src/db/schema.ts`
      6. Run `grep -c "export const templates" src/db/schema.ts`
    Expected Result: No TypeScript errors, all 5 tables exported
    Evidence: .sisyphus/evidence/task-05-schema.txt

  Scenario: All indexes defined
    Tool: Bash
    Steps:
      1. Run `grep -c "idx_sandboxes_user_id" src/db/schema.ts`
      2. Run `grep -c "idx_sandboxes_status_expired" src/db/schema.ts`
      3. Run `grep -c "uniqueIndex" src/db/schema.ts`
    Expected Result: All PRD-specified indexes present
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(db): create Drizzle schema with 5 tables`
  - Files: `src/db/schema.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [x] 6. Create Database Connection

  **What to do**:
  - Create `src/db/index.ts` with database connection pool
  - Export `db` instance using Drizzle's `drizzle()` function
  - Configure connection pool settings (max connections: 10, idle timeout: 30s)
  - Create separate connection configs for:
    - App database (PostgreSQL for metadata)
    - Sandbox admin connection (PostgreSQL with superuser for provisioning)
  - Add connection error handling and logging
  - Export helper functions: `getAppDb()`, `getSandboxAdminDb()`

  **Must NOT do**:
  - Do NOT create a new pool per request — use singleton pattern
  - Do NOT log passwords or connection strings
  - Do NOT use SSL=false in production

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard database connection pattern
  - **Skills**: [`postgres-patterns`]
    - `postgres-patterns`: Connection pooling, connection management

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with Tasks 7-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11-24
  - **Blocked By**: Tasks 1-5 (dependencies installed, schema created)

  **References**:
  - PRD §8.4 — Connection strings for both databases
  - Drizzle ORM docs — Connection setup
  - PRD §15.4 — Connection pool limits

  **QA Scenarios**:
  ```
  Scenario: Database connection establishes
    Tool: Bash
    Preconditions: Docker containers running, migrations applied
    Steps:
      1. Start dev server with database connection
      2. Make a test query via psql or health endpoint
      3. Verify pool connections via `docker compose exec postgres-app psql -c "SELECT count(*) FROM pg_stat_activity"`
    Expected Result: Connection succeeds, pool active
    Evidence: .sisyphus/evidence/task-06-db-connection.txt
  ```

  **Commit**: NO (grouped with migration tasks)
  - Message: `feat(db): create database connection pool`
  - Files: `src/db/index.ts`

---

- [x] 7. Generate Initial Migration

  **What to do**:
  - Run `pnpm db:generate` to generate initial migration from schema
  - Review generated SQL in `drizzle/` directory
  - Verify all tables, indexes, and constraints are included
  - Add seed data for built-in templates (optional, can be separate task)

  **Must NOT do**:
  - Do NOT manually edit generated migration (use drizzle-kit)
  - Do NOT include data for tables that should be empty

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Automated migration generation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with Tasks 6, 8-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1-5

  **QA Scenarios**:
  ```
  Scenario: Migration file generated
    Tool: Bash
    Steps:
      1. Run `pnpm db:generate`
      2. Run `ls -la drizzle/`
      3. Run `cat drizzle/0000_*.sql | grep -c "CREATE TABLE"`
    Expected Result: Migration file created with 5 CREATE TABLE statements
    Evidence: .sisyphus/evidence/task-07-migration-gen.txt
  ```

  **Commit**: YES
  - Message: `feat(db): generate initial migration`
  - Files: `drizzle/0000_*.sql`, `drizzle/meta/`

---

- [ ] 8. Run Migrations

  **What to do**:
  - Ensure PostgreSQL containers are running
  - Run `pnpm db:push` to apply schema to database
  - Verify all tables created with correct structure
  - Verify all indexes created
  - Test insert and select operations

  **Must NOT do**:
  - Do NOT drop existing tables without backup
  - Do NOT run migrations in production without backup

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard migration execution
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 7)
  - **Parallel Group**: Sequential after Task 7
  - **Blocks**: Tasks 11-24
  - **Blocked By**: Task 7 (migrations must exist)

  **QA Scenarios**:
  ```
  Scenario: Tables created successfully
    Tool: Bash
    Steps:
      1. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "\dt"`
      2. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "\d users"`
      3. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "\d sandboxes"`
    Expected Result: All 5 tables visible, users and sandboxes have correct columns
    Evidence: .sisyphus/evidence/task-08-migration-run.txt

  Scenario: Insert and select works
    Tool: Bash
    Steps:
      1. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "INSERT INTO users (email, password_hash, name, role) VALUES ('test@test.com', 'hash', 'Test', 'user')"`
      2. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "SELECT * FROM users WHERE email = 'test@test.com'"`
      3. Run `docker compose exec postgres-app psql -U pisang -d pisangdb -c "DELETE FROM users WHERE email = 'test@test.com'"`
    Expected Result: Insert succeeds, select returns row, delete succeeds
    Evidence: (same as above)
  ```

  **Commit**: NO (changes are in database, not code)

---

- [x] 9. Create Session Utilities

  **What to do**:
  - Create `src/lib/session.ts` with session management functions:
    - `generateToken(userId: string)` — Create JWT token
    - `verifyToken(token: string)` — Verify and decode JWT
    - `hashPassword(password: string)` — Hash password with bcrypt
    - `verifyPassword(password: string, hash: string)` — Verify password
    - `createSession(userId: string)` — Create HTTP-only cookie config
    - `clearSession()` — Clear session cookie config
  - Use bcrypt with cost factor ≥ 10
  - Use JWT with 7-day expiration
  - Store JWT_SECRET from environment

  **Must NOT do**:
  - Do NOT use weak bcrypt cost (< 10)
  - Do NOT store passwords in plain text
  - Do NOT use synchronous bcrypt functions (use async)
  - Do NOT include sensitive data in JWT payload

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard auth utility functions
  - **Skills**: [`security-review`]
    - `security-review`: Ensure proper password hashing, JWT handling

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with Tasks 6-8, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11-24
  - **Blocked By**: Tasks 1-5

  **QA Scenarios**:
  ```
  Scenario: Password hashing works
    Tool: Bash
    Steps:
      1. Create test file with: `import { hashPassword, verifyPassword } from './src/lib/session'; hashPassword('test').then(h => verifyPassword('test', h).then(console.log))`
      2. Run with ts-node or tsx
    Expected Result: verifyPassword returns true for correct password
    Evidence: .sisyphus/evidence/task-09-session.txt

  Scenario: JWT generation and verification
    Tool: Bash
    Steps:
      1. Create test file with: `import { generateToken, verifyToken } from './src/lib/session'; const token = generateToken('user-id'); verifyToken(token).then(console.log)`
      2. Run with ts-node or tsx
    Expected Result: verifyToken returns userId
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(auth): create session utilities (JWT, bcrypt)`
  - Files: `src/lib/session.ts`

---

- [x] 10. Create Sandbox Manager Library

  **What to do**:
  - Create `src/lib/sandbox-manager.ts` with sandbox provisioning functions:
    - `generateSandboxName(userId: string, displayName: string)` — Generate `pisang_{short_id}_{name}_{random_suffix}`
    - `generateDbUser()` — Generate `sb_{random_8_char}`
    - `generatePassword()` — Generate 32-char random password
    - `createSandboxDatabase(dbName: string, dbUser: string, password: string)` — Execute CREATE DATABASE, CREATE USER, GRANT
    - `dropSandboxDatabase(dbName: string, dbUser: string)` — Execute DROP DATABASE, DROP USER
    - `terminateConnections(dbName: string)` — Kill all connections to database
  - Implement sandbox name collision handling (retry up to 3 times with new suffix)
  - Use admin connection (POSTGRES_SANDBOX_URL) for database operations

  **Must NOT do**:
  - Do NOT grant superuser privileges to sandbox users
  - Do NOT allow sandbox users to create other databases
  - Do NOT use the app database connection (use admin connection)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex database provisioning logic with security implications
  - **Skills**: [`postgres-patterns`, `security-review`]
    - `postgres-patterns`: Database user management, GRANT/REVOKE patterns
    - `security-review`: Ensure proper isolation, no privilege escalation

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with Tasks 6-9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 19-24 (sandbox CRUD)
  - **Blocked By**: Tasks 1-5

  **References**:
  - PRD §6.2.1 — Sandbox creation process with dedicated user
  - PRD §12.2 — Sandbox isolation (dedicated user per sandbox)
  - PRD §6.3.2 — Database name format: `pisang_{short_id}_{name}_{6_char_random}`
  - PRD §6.3.3 — Collision handling (retry with new suffix, max 3)

  **QA Scenarios**:
  ```
  Scenario: Sandbox name generation follows format
    Tool: Bash
    Steps:
      1. Call generateSandboxName("user-abc123", "myapp")
      2. Verify format: /^pisang_abc123_myapp_[a-z0-9]{6}$/
    Expected Result: Name matches expected format
    Evidence: .sisyphus/evidence/task-10-sandbox-manager.txt

  Scenario: Database creation with isolated user
    Tool: Bash
    Preconditions: PostgreSQL sandbox container running, admin connection available
    Steps:
      1. Call createSandboxDatabase("pisang_test_db_abc123", "sb_testuser", "randompassword123")
      2. Connect as sandbox user: `psql -h localhost -U sb_testuser -d pisang_test_db_abc123`
      3. Run `SELECT current_user;`
      4. Try: `CREATE DATABASE unauthorized_db;` (should fail)
      5. Clean up: dropSandboxDatabase("pisang_test_db_abc123", "sb_testuser")
    Expected Result: Database created, user can connect, CREATE DATABASE fails, cleanup succeeds
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(lib): create sandbox manager for database provisioning`
  - Files: `src/lib/sandbox-manager.ts`

---

- [x] 11. Create Auth Middleware

  **What to do**:
  - Create `src/middleware/auth.ts` with authentication middleware:
    - `requireAuth()` — Protect routes, verify JWT, attach user to context
    - `optionalAuth()` — Attach user if present, don't reject if missing
    - `requireAdmin()` — Require admin role (for future admin routes)
  - Extract JWT from HTTP-only cookie
  - Verify token and attach decoded user ID to request
  - Return 401 for invalid/expired tokens
  - Log authentication failures for security monitoring

  **Must NOT do**:
  - Do NOT expose JWT in response body (use HTTP-only cookie only)
  - Do NOT allow bypass for protected routes
  - Do NOT log token contents (only log success/failure)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard middleware pattern for TanStack Start
  - **Skills**: [`security-review`]
    - `security-review`: Ensure proper JWT handling, no token leaks

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with Tasks 12-24)
  - **Parallel Group**: Wave 3
  - **Blocks**: None directly
  - **Blocked By**: Tasks 6-10 (session utilities must exist)

  **References**:
  - TanStack Start docs — Server middleware
  - PRD §6.1.2 — Session management with HTTP-only secure cookies

  **QA Scenarios**:
  ```
  Scenario: Middleware rejects unauthenticated requests
    Tool: Bash
    Steps:
      1. Create protected endpoint using requireAuth middleware
      2. Send request without cookie: `curl http://localhost:3000/api/sandboxes`
      3. Verify response: 401 Unauthorized
    Expected Result: 401 status, error message about missing auth
    Evidence: .sisyphus/evidence/task-11-auth-middleware.txt

  Scenario: Middleware accepts valid tokens
    Tool: Bash
    Steps:
      1. Register and login to get session cookie
      2. Send request with cookie: `curl -b cookies.txt http://localhost:3000/api/sandboxes`
      3. Verify response: 200 OK with user sandboxes
    Expected Result: 200 status, user data accessible
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(middleware): create auth middleware for protected routes`
  - Files: `src/middleware/auth.ts`

---

- [x] 12. Create Rate Limit Middleware

  **What to do**:
  - Create `src/middleware/rate-limit.ts` with rate limiting:
    - `rateLimit(options)` — Generic rate limiter middleware
    - Pre-configured limiters:
      - Login: 5 requests / 15 min / IP
      - Register: 3 requests / hour / IP
      - Create Sandbox: 10 requests / hour / user
      - SQL Query: 60 requests / min / user
      - AI Generate: 30 requests / day / user
  - Use in-memory store for MVP (can upgrade to Redis later)
  - Include rate limit headers in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - Return 429 when limit exceeded with retry-after header

  **Must NOT do**:
  - Do NOT rate limit health check endpoint
  - Do NOT use absolute time (use sliding windows)
  - Do NOT store unlimited entries (cleanup expired entries)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard rate limiting implementation
  - **Skills**: [`security-review`]
    - `security-review`: Ensure proper rate limiting, no bypass opportunities

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with Tasks 11, 13-24)
  - **Parallel Group**: Wave 3
  - **Blocks**: None directly
  - **Blocked By**: Tasks 6-10

  **References**:
  - PRD §12.4 — Rate limiting configuration

  **QA Scenarios**:
  ```
  Scenario: Login rate limited after 5 attempts
    Tool: Bash
    Steps:
      1. Send 6 login requests from same IP: `for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/login -d '{"email":"x","password":"x"}'; done`
      2. Verify 6th request returns 429
      3. Verify rate limit headers present
    Expected Result: First 5 succeed/fail auth, 6th returns 429
    Evidence: .sisyphus/evidence/task-12-rate-limit.txt

  Scenario: AI rate limited to 30 per day
    Tool: Bash
    Steps:
      1. Login as test user
      2. Send 31 AI generate requests
      3. Verify 31st returns 429
    Expected Result: 30 succeed, 31st returns 429
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(middleware): create rate limiting middleware`
  - Files: `src/middleware/rate-limit.ts`

---

- [x] 13. Implement Register Endpoint

  **What to do**:
  - Create `src/routes/api/auth/register.ts` (or use TanStack Start server functions)
  - POST /api/auth/register
  - Input validation with Zod:
    - email: valid email format, not already registered
    - password: minimum 8 characters, complexity requirements
    - name: 1-100 characters
  - Flow:
    1. Validate input
    2. Check if email already exists
    3. Hash password with bcrypt
    4. Create user in database
    5. Generate JWT session
    6. Return user + set HTTP-only cookie
  - Return 400 for validation errors
  - Return 409 for duplicate email

  **Must NOT do**:
  - Do NOT return password hash in response
  - Do NOT log passwords
  - Do NOT allow registration without rate limiting
  - Do NOT auto-login without email verification (simplify for MVP)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth flow with security implications
  - **Skills**: [`security-review`]
    - `security-review`: Ensure proper password handling, no leaks

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6-10 (database + session utilities)

  **References**:
  - PRD §6.1.1 — Registration requirements
  - PRD §10.1 — API endpoint definition
  - PRD §12.1 — Password hashing with bcrypt

  **QA Scenarios**:
  ```
  Scenario: Successful registration
    Tool: Bash
    Steps:
      1. POST /api/auth/register with valid data
      2. Verify 201 response with user object (no password)
      3. Verify HTTP-only cookie set
      4. Verify user exists in database
    Expected Result: 201, user created, session cookie set
    Evidence: .sisyphus/evidence/task-13-register.txt

  Scenario: Duplicate email rejected
    Tool: Bash
    Steps:
      1. Register user with email "test@example.com"
      2. Attempt to register again with same email
      3. Verify 409 Conflict response
    Expected Result: 409, error message about duplicate email
    Evidence: (same as above)

  Scenario: Invalid input rejected
    Tool: Bash
    Steps:
      1. POST with invalid email format
      2. POST with password < 8 characters
      3. POST with missing name
      4. Verify 400 Bad Request for each
    Expected Result: 400, validation errors returned
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(auth): implement register endpoint`
  - Files: `src/routes/api/auth/register.ts`

---

- [x] 14. Implement Login Endpoint

  **What to do**:
  - Create `src/routes/api/auth/login.ts`
  - POST /api/auth/login
  - Input validation with Zod:
    - email: required, valid format
    - password: required
  - Flow:
    1. Validate input
    2. Find user by email
    3. Verify password with bcrypt
    4. Generate JWT session (7 days)
    5. Update user's updated_at timestamp
    6. Return user + set HTTP-only cookie
  - Return 401 for invalid credentials (same message for email/password to prevent enumeration)
  - Apply rate limiting (5 / 15min / IP per PRD §12.4)

  **Must NOT do**:
  - Do NOT reveal which emails exist (same error message for all auth failures)
  - Do NOT store password in session
  - Do NOT allow login for deleted users

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth flow with security implications
  - **Skills**: [`security-review`]
    - `security-review`: Prevent enumeration attacks, secure session handling

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6-10, 11 (rate limiting middleware)

  **References**:
  - PRD §6.1.2 — Login requirements
  - PRD §10.1 — API endpoint definition
  - PRD §12.4 — Rate limiting: 5 / 15min / IP

  **QA Scenarios**:
  ```
  Scenario: Successful login
    Tool: Bash
    Preconditions: User exists with email "test@example.com"
    Steps:
      1. POST /api/auth/login with correct credentials
      2. Verify 200 response with user object
      3. Verify HTTP-only cookie set
      4. Verify cookie has correct attributes (HttpOnly, Secure, SameSite=Strict)
    Expected Result: 200, user returned, session cookie set
    Evidence: .sisyphus/evidence/task-14-login.txt

  Scenario: Invalid credentials rejected
    Tool: Bash
    Steps:
      1. POST /api/auth/login with wrong password
      2. Verify 401 response
      3. Verify error message is generic (don't reveal email existence)
      4. Verify no session cookie set
    Expected Result: 401, generic error, no cookie
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(auth): implement login endpoint`
  - Files: `src/routes/api/auth/login.ts`

---

- [x] 15. Implement Logout Endpoint

  **What to do**:
  - Create `src/routes/api/auth/logout.ts`
  - POST /api/auth/logout
  - Clear HTTP-only session cookie
  - Return 200 with success message
  - No auth required (anyone can logout)

  **Must NOT do**:
  - Do NOT require authentication (allow logout even without session)
  - Do NOT store token invalidation state (JWT is stateless)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple endpoint, clear cookie
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6-10

  **QA Scenarios**:
  ```
  Scenario: Logout clears session
    Tool: Bash
    Steps:
      1. Login to get session cookie
      2. POST /api/auth/logout
      3. Verify 200 response
      4. Verify cookie is cleared (expires in past or empty)
      5. Try to access protected endpoint, verify 401
    Expected Result: Session cleared, subsequent requests unauthenticated
    Evidence: .sisyphus/evidence/task-15-logout.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): implement logout endpoint`
  - Files: `src/routes/api/auth/logout.ts`

---

- [x] 16. Implement Me Endpoint

  **What to do**:
  - Create `src/routes/api/auth/me.ts`
  - GET /api/auth/me
  - Requires authentication (use auth middleware)
  - Return current user object (without password_hash)
  - Return 401 if not authenticated
  - Include user's sandbox count in response

  **Must NOT do**:
  - Do NOT return password_hash
  - Do NOT return sensitive data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple authenticated endpoint
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6-10, 11 (auth middleware)

  **QA Scenarios**:
  ```
  Scenario: Authenticated user gets profile
    Tool: Bash
    Steps:
      1. Login to get session
      2. GET /api/auth/me with cookie
      3. Verify 200 response with user object
      4. Verify password_hash NOT in response
    Expected Result: 200, user object without password
    Evidence: .sisyphus/evidence/task-16-me.txt

  Scenario: Unauthenticated request rejected
    Tool: Bash
    Steps:
      1. GET /api/auth/me without cookie
      2. Verify 401 response
    Expected Result: 401, authentication required
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(auth): implement me endpoint`
  - Files: `src/routes/api/auth/me.ts`

---

- [x] 17. Implement GitHub OAuth

  **What to do**:
  - Create `src/routes/api/auth/github.ts` — Initiate OAuth flow
  - Create `src/routes/api/auth/github/callback.ts` — Handle callback
  - Flow:
    1. Generate state parameter (CSRF protection)
    2. Redirect to GitHub: `https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&state=...`
    3. GitHub redirects back with code and state
    4. Verify state matches
    5. Exchange code for access token
    6. Fetch user info from GitHub API
    7. Find or create user in database
    8. Create session, redirect to dashboard
  - Store GitHub user ID in users.github_id column
  - Handle email already registered with password (link accounts or error)

  **Must NOT do**:
  - Do NOT skip state parameter verification (CSRF vulnerability)
  - Do NOT store GitHub access token in database
  - Do NOT allow OAuth bypass for admin accounts

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: OAuth flow has security implications and edge cases
  - **Skills**: [`security-review`]
    - `security-review`: OAuth security, CSRF protection, token handling

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6-10, 11

  **References**:
  - PRD §6.1.3 — GitHub OAuth requirements
  - GitHub OAuth documentation — Authorization flow
  - PRD §9.2 — users.github_id column

  **QA Scenarios**:
  ```
  Scenario: OAuth initiation redirects to GitHub
    Tool: Bash
    Steps:
      1. GET /api/auth/github
      2. Verify 302 redirect to github.com
      3. Verify redirect includes client_id and state parameters
    Expected Result: 302, GitHub authorization URL
    Evidence: .sisyphus/evidence/task-17-github-oauth.txt

  Scenario: OAuth callback creates user
    Tool: Bash
    Steps:
      1. Mock GitHub callback with test code
      2. GET /api/auth/github/callback?code=...&state=...
      3. Verify user created with github_id
      4. Verify session cookie set
      5. Verify redirect to /dashboard
    Expected Result: User created, session set, redirected to dashboard
    Evidence: (same as above)

  Scenario: Existing email links accounts
    Tool: Bash
    Steps:
      1. Register with email "existing@example.com"
      2. Attempt GitHub OAuth with same email
      3. Verify accounts linked (github_id set)
      4. Verify same user_id returned
    Expected Result: Accounts linked, login succeeds
    Evidence: (same as above)
  ```

  **Commit**: YES
  - Message: `feat(auth): implement GitHub OAuth`
  - Files: `src/routes/api/auth/github.ts`, `src/routes/api/auth/github/callback.ts`

---

- [x] 18-24. Implement Sandbox CRUD Endpoints

  **What to do (combined for efficiency)**:

  **Task 18: Create Sandbox Manager Library** (Already in Wave 2)

  **Task 19: Implement Create Sandbox** - POST /api/sandboxes
  - Input: engine (postgresql), region (id), name, retention_hours, template_id (null for MVP)
  - Validate: name 1-50 chars, retention 1-168 hours
  - Flow:
    1. Check user has < 5 active sandboxes
    2. Generate unique db_name: `pisang_{short_id}_{name}_{random}`
    3. Generate db_user: `sb_{random_8}`
    4. Generate 32-char password
    5. Call sandbox-manager to CREATE DATABASE and CREATE USER
    6. Create sandbox record in database
    7. Return credentials (host, port, db_name, db_user, password, connection_url)
  - Return 400 for validation errors
  - Return 403 for quota exceeded

  **Task 20: Implement List Sandboxes** - GET /api/sandboxes
  - Return all sandboxes for authenticated user
  - Include: id, engine, region, display_name, status, ttl, created_at
  - Sort by created_at DESC
  - No pagination for MVP (user has max 5)

  **Task 21: Implement Get Sandbox** - GET /api/sandboxes/:id
  - Return full sandbox details including:
    - All credentials (host, port, db_name, db_user, password)
    - Connection string
    - Tables list (query information_schema)
    - Remaining TTL
    - Size in MB
  - Return 404 if not found
  - Return 403 if not owner

  **Task 22: Implement Extend Sandbox** - PATCH /api/sandboxes/:id/extend
  - Input: extend_hours (1, 6, 12, 24)
  - Update expired_at
  - Max total lifetime: 7 days from creation
  - Return 400 if max lifetime exceeded
  - Return 404 if not found
  - Return 403 if not owner

  **Task 23: Implement Delete Sandbox** - DELETE /api/sandboxes/:id
  - Set status to "destroying"
  - Call sandbox-manager to:
    1. Terminate all connections
    2. DROP DATABASE
    3. DROP USER
  - Set status to "expired"
  - Return 204 on success
  - Return 404 if not found
  - Return 403 if not owner

  **Task 24: Implement Get Tables** - GET /api/sandboxes/:id/tables
  - Query information_schema.tables for the sandbox database
  - Return: table_name, rows, size_kb for each table
  - Must connect as the sandbox user (not admin)
  - Return 404 if sandbox not found
  - Return 403 if not owner

  **Must NOT do**:
  - Do NOT allow creating sandboxes for MySQL/MariaDB (MVP only)
  - Do NOT allow templates other than null (MVP only)
  - Do NOT return other users' sandboxes
  - Do NOT allow operations on expired sandboxes
  - Do NOT exceed 7-day maximum lifetime

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex CRUD with database provisioning, security implications
  - **Skills**: [`postgres-patterns`, `api-design`, `security-review`]
    - `postgres-patterns`: Database operations, connection management
    - `api-design`: RESTful endpoint design
    - `security-review`: Ensure proper authorization, isolation

  **Parallelization**:
  - **Can Run In Parallel**: YES (can be split across developers)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 25-34 (features depend on sandbox CRUD)
  - **Blocked By**: Tasks 6-10 (database), Task 10 (sandbox-manager), Task 11 (auth middleware)

  **References**:
  - PRD §6.2 — Sandbox management requirements
  - PRD §10.2 — API endpoint definitions
  - PRD §12.2 — Sandbox isolation with dedicated users

  **QA Scenarios**:
  ```
  Scenario: Create sandbox provisions isolated database
    Tool: Bash
    Preconditions: User authenticated, < 5 active sandboxes
    Steps:
      1. POST /api/sandboxes {"name": "test", "engine": "postgresql", "region": "id", "retention_hours": 6}
      2. Verify 201 response with credentials
      3. Verify database exists: `docker compose exec postgres-sandbox psql -c "\l" | grep pisang_`
      4. Verify user can connect: `psql -h localhost -U sb_xxx -d pisang_xxx -c "SELECT 1"`
    Expected Result: Database created, user can connect with returned credentials
    Evidence: .sisyphus/evidence/task-19-create-sandbox.txt

  Scenario: Create sandbox rejects quota exceeded
    Tool: Bash
    Preconditions: User has 5 active sandboxes
    Steps:
      1. POST /api/sandboxes with new sandbox
      2. Verify 403 response with quota exceeded message
    Expected Result: 403, quota exceeded error
    Evidence: (same as above)

  Scenario: List returns only user's sandboxes
    Tool: Bash
    Steps:
      1. Login as user A
      2. Create sandbox for user A
      3. Login as user B
      4. Create sandbox for user B
      5. GET /api/sandboxes for user B
      6. Verify only user B's sandbox returned
    Expected Result: Only user B's sandbox in response
    Evidence: .sisyphus/evidence/task-20-list-sandboxes.txt

  Scenario: Extend sandbox updates expiration
    Tool: Bash
    Steps:
      1. Create sandbox with 6hr retention
      2. PATCH /api/sandboxes/:id/extend {"extend_hours": 6}
      3. Verify expired_at extended by 6 hours
      4. Verify max lifetime enforced (7 days)
    Expected Result: Expiration extended, 7-day max enforced
    Evidence: .sisyphus/evidence/task-22-extend-sandbox.txt

  Scenario: Delete sandbox cleans up database and user
    Tool: Bash
    Steps:
      1. Create sandbox
      2. DELETE /api/sandboxes/:id
      3. Verify status changed to "destroying" then "expired"
      4. Verify database dropped: `docker compose exec postgres-sandbox psql -c "\l" | grep -v pisang_xxx`
      5. Verify user dropped: `docker compose exec postgres-sandbox psql -c "\du" | grep -v sb_xxx`
    Expected Result: Database and user removed
    Evidence: .sisyphus/evidence/task-23-delete-sandbox.txt
  ```

  **Commit**: YES
  - Message: `feat(sandbox): implement sandbox CRUD endpoints`
  - Files: `src/routes/api/sandboxes/index.ts`, `src/routes/api/sandboxes/[id].ts`, `src/routes/api/sandboxes/[id]/extend.ts`, `src/routes/api/sandboxes/[id]/tables.ts`

---

- [x] 25-31. Implement SQL Console, AI Seeder, and Ephemeral Engine

  **What to do (combined for efficiency)**:

  **Task 25: Create Query Executor Library**
  - Create `src/lib/query-executor.ts`
  - Functions:
    - `executeQuery(dbUrl: string, query: string, timeout: number = 30000)` — Execute SQL with timeout
    - `validateQuery(query: string)` — Check for blocked commands (DROP DATABASE, ALTER SYSTEM, etc.)
    - `formatResults(rows: any[])` — Format query results for API response
  - Blocked commands: `DROP DATABASE`, `ALTER SYSTEM`, `CREATE DATABASE`, `CREATE USER`, `DROP USER`, `GRANT`, `REVOKE`
  - Timeout: 30 seconds max per query (kill after timeout)
  - Catch errors and return structured error response

  **Task 26: Implement Execute Query Endpoint** - POST /api/sandboxes/:id/query
  - Input: query (string)
  - Validate: query not empty, not too long (max 10000 chars)
  - Flow:
    1. Get sandbox by ID, verify ownership
    2. Check sandbox is active (not expired/destroying)
    3. Validate query (blocked commands)
    4. Execute query with 30s timeout
    5. Store result in query_history table
    6. Return: columns[], rows[], execution_time_ms, rows_affected
  - Return 400 for validation errors
  - Return 403 if sandbox is expired
  - Return 500 for query execution errors (include error message)

  **Task 27: Implement Query History Endpoint** - GET /api/sandboxes/:id/history
  - Return last 50 queries for sandbox
  - Include: id, query, status, execution_time_ms, rows_affected, error_message, created_at
  - Sort by created_at DESC
  - Return 404 if sandbox not found
  - Return 403 if not owner

  **Task 28: Create Gemini Client Library**
  - Create `src/lib/gemini.ts`
  - Configure `@google/generative-ai` with API key from env
  - Functions:
    - `generateSchema(prompt: string, engine: string)` — Generate CREATE TABLE statements
    - `generateSeedData(prompt: string, schema: string, engine: string)` — Generate INSERT statements
    - `parseSqlFromResponse(response: string)` — Extract SQL from Gemini response
  - Rate limiting: 30 requests per day per user (tracked in ai_logs)
  - Graceful degradation: return error message if Gemini API unavailable

  **Task 29: Implement AI Generate Endpoint** - POST /api/sandboxes/:id/ai/generate
  - Input: prompt (string), mode: "schema" | "seed" | "query"
  - Validate: prompt 1-1000 chars, mode valid
  - Check rate limit (30/day/user)
  - Flow:
    1. Get sandbox by ID, verify ownership
    2. Check sandbox is active
    3. Call Gemini API with prompt
    4. Parse SQL from response
    5. Store in ai_logs table
    6. Return: prompt, response, sql_generated, explanation
  - Return 403 if rate limit exceeded
  - Return 500 if Gemini API fails (graceful degradation)

  **Task 30: Implement AI Execute Endpoint** - POST /api/sandboxes/:id/ai/execute
  - Input: sql (from generated response)
  - Flow:
    1. Get sandbox by ID, verify ownership
    2. Get ai_log by ID (passed in request)
    3. Validate SQL matches what was generated
    4. Execute SQL using query executor
    5. Update ai_log.executed = true
    6. Return: execution results
  - Return 400 if SQL was modified from generated

  **Task 31: Implement AI Logs Endpoint** - GET /api/sandboxes/:id/ai/logs
  - Return last 50 AI interactions for sandbox
  - Include: id, prompt, response, sql_generated, executed, created_at
  - Sort by created_at DESC
  - Return 404 if sandbox not found
  - Return 403 if not owner

  **Task 32: Create Ephemeral Engine**
  - Create `src/lib/ephemeral-engine.ts`
  - Background scheduler using `setInterval` (30 seconds)
  - Flow every 30 seconds:
    1. Query: `SELECT * FROM sandboxes WHERE expired_at <= NOW() AND status = 'active'`
    2. For each expired sandbox:
       - Set status = 'destroying'
       - Get engine type (postgresql for MVP)
       - Call sandbox-manager.dropSandboxDatabase()
       - Set status = 'expired'
       - Log cleanup event
  - Make operations idempotent (safe to retry if interrupted)
  - Add health check heartbeat (update last_run timestamp)

  **Task 33: Create Health Check Endpoint** - GET /api/health
  - Return: status, uptime, database connection status
  - Check: can connect to postgres-app
  - Check: can connect to postgres-sandbox
  - Return 200 if all checks pass
  - Return 503 if any check fails

  **Task 34: Add App Init Scheduler**
  - Modify app initialization (TanStack Start entry point)
  - Start ephemeral engine scheduler on app startup
  - Graceful shutdown: clear interval on process exit
  - Log scheduler start/stop events

  **Must NOT do**:
  - Do NOT allow DROP DATABASE in query executor (sandbox users can't do this anyway)
  - Do NOT expose Gemini API key in responses
  - Do NOT allow SQL execution without rate limiting
  - Do NOT let ephemeral engine crash the app (wrap in try-catch)
  - Do NOT process more than one batch of expired sandboxes at a time

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex features with security implications and external dependencies
  - **Skills**: [`postgres-patterns`, `api-design`, `security-review`]
    - `postgres-patterns`: Query execution, safety guards
    - `api-design`: RESTful endpoints
    - `security-review`: SQL injection prevention, rate limiting

  **Parallelization**:
  - **Can Run In Parallel**: YES (Tasks 25-34 can run in parallel after Task 18)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 35-44
  - **Blocked By**: Task 18 (sandbox-manager), Task 19 (create sandbox)

  **References**:
  - PRD §6.4 — SQL Console requirements
  - PRD §6.5 — AI Seeder requirements
  - PRD §6.3 — Ephemeral Engine requirements
  - PRD §10.3 — API endpoints for SQL Console
  - PRD §10.4 — API endpoints for AI
  - PRD §12.4 — Rate limiting (30/day for AI)

  **QA Scenarios**:
  ```
  Scenario: Query execution succeeds with valid SQL
    Tool: Bash
    Steps:
      1. Create sandbox
      2. POST /api/sandboxes/:id/query {"query": "CREATE TABLE test (id SERIAL PRIMARY KEY);"}
      3. POST /api/sandboxes/:id/query {"query": "INSERT INTO test DEFAULT VALUES RETURNING *;"}
      4. POST /api/sandboxes/:id/query {"query": "SELECT * FROM test;"}
    Expected Result: All queries succeed, SELECT returns inserted row
    Evidence: .sisyphus/evidence/task-26-query-exec.txt

  Scenario: Blocked commands rejected
    Tool: Bash
    Steps:
      1. POST /api/sandboxes/:id/query {"query": "DROP DATABASE postgres;"}
      2. POST /api/sandboxes/:id/query {"query": "CREATE USER hacker;"}
      3. POST /api/sandboxes/:id/query {"query": "ALTER SYSTEM SET x = 1;"}
    Expected Result: 400, blocked command error
    Evidence: (same as above)

  Scenario: Query timeout enforced
    Tool: Bash
    Steps:
      1. POST /api/sandboxes/:id/query {"query": "SELECT pg_sleep(60);"}
      2. Wait 35 seconds
    Expected Result: Query killed after 30s, timeout error returned
    Evidence: (same as above)

  Scenario: AI generates valid SQL
    Tool: Bash
    Steps:
      1. POST /api/sandboxes/:id/ai/generate {"prompt": "Create users table", "mode": "schema"}
      2. Verify response contains CREATE TABLE statement
      3. Verify ai_logs table updated
    Expected Result: Valid SQL generated, logged
    Evidence: .sisyphus/evidence/task-29-ai-generate.txt

  Scenario: AI rate limit enforced
    Tool: Bash
    Steps:
      1. Make 31 AI generate requests
      2. Verify 31st returns 429 with rate limit message
    Expected Result: 30 succeed, 31st blocked
    Evidence: (same as above)

  Scenario: Ephemeral engine cleans up expired sandbox
    Tool: Bash
    Steps:
      1. Create sandbox with 1-hour retention
      2. Manually update expired_at to past: `UPDATE sandboxes SET expired_at = NOW() - INTERVAL '1 minute' WHERE id = '...'`
      3. Wait for ephemeral engine to run (or trigger manually)
      4. Verify sandbox status = 'expired'
      5. Verify database dropped: `docker compose exec postgres-sandbox psql -c "\l" | grep -v pisang_xxx`
    Expected Result: Sandbox cleaned up within 60 seconds
    Evidence: .sisyphus/evidence/task-32-ephemeral.txt

  Scenario: Health check returns status
    Tool: Bash
    Steps:
      1. GET /api/health
      2. Verify response: {status: "ok", database: "connected", uptime: number}
    Expected Result: 200, all checks pass
    Evidence: .sisyphus/evidence/task-33-health.txt
  ```

  **Commit**: YES
  - Message: `feat(api): implement SQL console, AI seeder, and ephemeral engine`
  - Files: `src/lib/query-executor.ts`, `src/lib/gemini.ts`, `src/lib/ephemeral-engine.ts`, `src/routes/api/sandboxes/[id]/query.ts`, `src/routes/api/sandboxes/[id]/history.ts`, `src/routes/api/sandboxes/[id]/ai/generate.ts`, `src/routes/api/sandboxes/[id]/ai/execute.ts`, `src/routes/api/sandboxes/[id]/ai/logs.ts`, `src/routes/api/health.ts`

---

- [ ] 35-44. Frontend Integration with Real APIs

  **What to do (combined for efficiency)**:

  **Task 35: Create TanStack Query Hooks**
  - Create `src/hooks/queries/` directory
  - Create hooks:
    - `useAuth.ts` — useLogin, useRegister, useLogout, useCurrentUser
    - `useSandboxes.ts` — useSandboxes, useSandbox, useCreateSandbox, useExtendSandbox, useDeleteSandbox
    - `useQuery.ts` — useExecuteQuery, useQueryHistory
    - `useAI.ts` — useAIGenerate, useAIExecute, useAILogs
  - Configure TanStack Query in `src/main.tsx` or `src/router.tsx`
  - Add query client with sensible defaults (staleTime, refetchOnWindowFocus)
  - Add error handling with toast notifications

  **Task 36: Update Auth Forms**
  - Update `src/components/login-form.tsx`:
    - Use `useLogin` hook
    - Call POST /api/auth/login
    - Handle success: redirect to dashboard
    - Handle error: show toast with error message
    - Remove mock setTimeout
  - Update `src/components/signup-form.tsx`:
    - Use `useRegister` hook
    - Call POST /api/auth/register
    - Same error handling
  - Update `src/components/forgot-password-form.tsx`:
    - Keep mock for now (password reset not in MVP)
    - Add TODO comment for future implementation
  - Remove all dummy data / mock handlers

  **Task 37: Update Dashboard Page**
  - Update `src/routes/_app/dashboard/index.tsx`:
    - Use `useSandboxes` to fetch real data
    - Use `useCurrentUser` for user info
    - Replace `recentSandboxes` array with real API data
    - Replace `stats` calculations with real data
    - Handle loading state: show skeletons
    - Handle error state: show error message with retry button
    - Real-time polling: use `refetchInterval: 30000` for TTL updates

  **Task 38: Update Sandboxes List Page**
  - Update `src/routes/_app/dashboard/sandboxes.tsx`:
    - Use `useSandboxes` to fetch real data
    - Replace `sandboxes` array with real API data
    - Handle empty state: show "Create your first sandbox"
    - Handle loading, error states

  **Task 39: Update Sandbox Detail Page**
  - Update `src/routes/_app/dashboard/sandboxes/$id.tsx`:
    - Use `useSandbox(id)` to fetch real data
    - Replace all `dummySandbox`, `dummyTables`, `dummyHistory` with real data
    - Info Tab: Real credentials, size from API
    - Console Tab: Use `useExecuteQuery` and `useQueryHistory`
    - AI Tab: Use `useAIGenerate` and `useAIExecute`
    - Tables Tab: Use sandbox tables endpoint
    - History Tab: Use query history endpoint
    - Handle loading states for each tab
    - Handle real-time TTL countdown
    - Copy to clipboard: real connection strings

  **Task 40: Update Create Sandbox Page**
  - Update `src/routes/_app/dashboard/sandboxes/new.tsx`:
    - Use `useCreateSandbox` mutation
    - Remove mock sandboxes array
    - Real engine selection (PostgreSQL only for MVP)
    - Real region selection (Indonesia only for MVP, others show "coming soon")
    - Remove template selection (always create blank for MVP)
    - On success: redirect to sandbox detail page
    - Handle error: show toast with error message

  **Task 41: Update SQL Console Page**
  - Update `src/routes/_app/dashboard/console.tsx`:
    - Use `useSandboxes` to populate sandbox selector
    - Use `useExecuteQuery` for Run button
    - Use `useQueryHistory` for recent queries sidebar
    - Replace `mockRows` with real query results
    - Replace `mockHistory` with real history
    - Handle error: show error message in results area
    - Add syntax highlighting for SQL editor (CodeMirror can be added later as enhancement)

  **Task 42: Update AI Seeder Page**
  - Update `src/routes/_app/dashboard/ai-seeder.tsx`:
    - Use `useSandboxes` to populate sandbox selector
    - Use `useAIGenerate` for Generate SQL button
    - Use `useAIExecute` for Execute button
    - Replace `mockSqlPreview` with real generated SQL
    - Show rate limit counter (30/day remaining)
    - Handle error: show toast with error message
    - Handle Gemini API unavailability: show friendly error

  **Task 43: Update Settings Page**
  - Update `src/routes/_app/dashboard/settings.tsx`:
    - Use `useCurrentUser` for profile data
    - Profile settings: POST /api/auth/me update (if implemented)
    - Security settings: Password change form (future implementation)
    - Keep notification preferences as mock (not in MVP)

  **Task 44: Update Account Page**
  - Update `src/routes/_app/dashboard/account.tsx`:
    - Use `useSandboxes` for usage stats
    - Calculate: active sandboxes, total created, AI queries used
    - Show real data instead of dummy numbers
    - Handle loading, error states

  **Must NOT do**:
  - Do NOT remove loading states (keep skeletons)
  - Do NOT remove error handling (show error toasts)
  - Do NOT add features not in MVP (password reset, email notifications)
  - Do NOT break existing UI/UX patterns

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding both frontend and backend, many touch points
  - **Skills**: [`frontend-patterns`, `react-tanstack`]
    - `frontend-patterns`: React patterns, state management
    - `react-tanstack`: TanStack Query hooks, caching, mutations

  **Parallelization**:
  - **Can Run In Parallel**: YES (can split across developers)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 11-24 (auth), Tasks 25-34 (features)

  **References**:
  - PRD §11.2 — UI Components specifications
  - TanStack Query docs — Mutations, queries, caching

  **QA Scenarios**:
  ```
  Scenario: Login flow works end-to-end
    Tool: Playwright (or interactive_bash)
    Steps:
      1. Navigate to /login
      2. Enter valid credentials
      3. Click Login
      4. Wait for redirect to /dashboard
      5. Verify user data displayed
    Expected Result: Successful login, dashboard shows real user data
    Evidence: .sisyphus/evidence/task-36-auth-flow.png

  Scenario: Create sandbox flow works end-to-end
    Tool: Playwright (or interactive_bash)
    Steps:
      1. Login as test user
      2. Navigate to /dashboard/sandboxes/new
      3. Enter sandbox name
      4. Select PostgreSQL (only option)
      5. Select 6 hours retention
      6. Click Create
      7. Wait for redirect to sandbox detail
      8. Verify credentials displayed
      9. Copy connection string
    Expected Result: Sandbox created, credentials shown, can connect
    Evidence: .sisyphus/evidence/task-40-create-sandbox.png

  Scenario: SQL Console executes queries
    Tool: Playwright (or interactive_bash)
    Steps:
      1. Navigate to sandbox detail / console tab
      2. Enter "CREATE TABLE test (id SERIAL PRIMARY KEY);"
      3. Click Run
      4. Verify success message
      5. Enter "SELECT * FROM test;"
      6. Click Run
      7. Verify empty results shown
      8. Click History tab
      9. Verify both queries in history
    Expected Result: Queries execute, results shown, history updated
    Evidence: .sisyphus/evidence/task-39-sql-console.png

  Scenario: AI Seeder generates valid SQL
    Tool: Playwright (or interactive_bash)
    Steps:
      1. Navigate to sandbox detail / AI tab
      2. Enter prompt: "Create a users table with id, name, email"
      3. Click Generate SQL
      4. Wait for SQL to appear
      5. Verify SQL contains CREATE TABLE
      6. Click Execute SQL
      7. Verify success message
    Expected Result: AI generates valid SQL, execution succeeds
    Evidence: .sisyphus/evidence/task-42-ai-seeder.png

  Scenario: Dashboard shows real data
    Tool: Playwright (or interactive_bash)
    Steps:
      1. Login as test user
      2. Create 2 sandboxes
      3. Navigate to /dashboard
      4. Verify active sandboxes count = 2
      5. Verify recent sandboxes list shows both
      6. Verify TTL countdown updates
    Expected Result: Real data shown, updates correctly
    Evidence: .sisyphus/evidence/task-37-dashboard.png
  ```

  **Commit**: YES
  - Message: `feat(frontend): connect all pages to backend APIs`
  - Files: `src/hooks/queries/*.ts`, `src/components/*.tsx`, `src/routes/_app/**/*.tsx`
  - Pre-commit: `pnpm check`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm check` (Biome). Review all new files for: `as any`, `@ts-ignore`, empty catches, `console.log` in prod, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start Docker Compose. Execute EVERY QA scenario from EVERY task. Test cross-endpoint flows (register → login → create sandbox → query → delete). Test edge cases: duplicate email, sandbox limit, invalid query, expired token.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `chore: install backend dependencies (drizzle, pg, bcrypt, etc.)`
- **5**: `feat(db): create Drizzle schema with 5 tables`
- **8**: `feat(db): generate and run initial migration`
- **17**: `feat(auth): implement GitHub OAuth flow`
- **19**: `feat(sandbox): implement PostgreSQL sandbox provisioning`
- **32**: `feat(engine): create ephemeral cleanup scheduler`
- **44**: `feat(frontend): connect all pages to backend APIs`

---

## Success Criteria

### Verification Commands
```bash
# Start all services
docker compose up -d

# Run migrations
pnpm drizzle-kit push

# Type check
pnpm tsc --noEmit

# Lint check
pnpm check

# Start dev server
pnpm dev

# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Docker Compose starts all services
- [ ] Auth flow works end-to-end
- [ ] Sandbox creation provisions dedicated user
- [ ] SQL Console executes queries safely
- [ ] AI Seeder generates valid SQL
- [ ] Ephemeral engine cleans up expired sandboxes
- [ ] No mock data in frontend