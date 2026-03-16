# Work Plan: MySQL + MariaDB Support

## TL;DR

> **Quick Summary**: Add MySQL and MariaDB support to PisangDB for multi-engine ephemeral databases.
> 
> **Deliverables**:
> - Docker containers for MySQL and MariaDB
> - Multi-engine sandbox creation (PostgreSQL/MySQL/MariaDB)
> - Multi-engine SQL query execution
> - Multi-engine auto-cleanup
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Docker → Manager → API → Executor → Cleanup

---

## Context

### Original Request
Add MySQL and MariaDB support to PisangDB. Currently only PostgreSQL is supported (MVP scope).

### Technical Background
- Current: PostgreSQL sandbox creation via `src/lib/sandbox-manager.ts`
- Current: PostgreSQL query execution via `src/lib/query-executor.ts`
- Current: PostgreSQL cleanup via `src/lib/ephemeral-engine.ts`
- PRD §6.2.1 specifies: PostgreSQL 16, MySQL 8, MariaDB 11
- PRD §8.4 specifies ports: PostgreSQL 5432, MySQL 3306, MariaDB 3307

### Research Findings
- `mysql2` package already installed in package.json
- Need to add: connection pooling, MySQL/MariaDB-specific SQL syntax
- Need to modify: sandbox creation, query execution, ephemeral cleanup
- Resource estimate: ~500MB RAM per additional engine

---

## Work Objectives

### Core Objective
Enable PisangDB users to create ephemeral MySQL and MariaDB databases, execute queries, and have auto-cleanup work for all 3 engines.

### Concrete Deliverables
- [ ] MySQL + MariaDB Docker containers in docker-compose.yml
- [ ] Environment variables for MySQL/MariaDB connections
- [ ] Abstract database manager with engine-specific implementations
- [ ] Sandbox API accepts mysql/mariadb engine selection
- [ ] Query executor supports MySQL/MariaDB
- [ ] Ephemeral engine cleans up MySQL/MariaDB

### Definition of Done
- [ ] POST /api/sandboxes with engine=mysql returns MySQL sandbox
- [ ] POST /api/sandboxes with engine=mariadb returns MariaDB sandbox
- [ ] SQL queries work on MySQL sandbox
- [ ] SQL queries work on MariaDB sandbox
- [ ] TTL expiration cleans up MySQL/MariaDB databases

### Must Have
- Proper user isolation per PRD §12.2
- Connection limits per user (5 connections)
- Statement timeouts (30 seconds)
- Safe credential handling

### Must NOT Have
- Hardcoded passwords in code
- Superuser access for sandbox users
- Cross-engine database access

---

## Execution Strategy

### Wave 1 (Foundation)
- [ ] 1. Add MySQL + MariaDB containers to docker-compose.yml
- [ ] 2. Add environment variables for MySQL/MariaDB connections
- [ ] 3. Install mysql2 if needed (check package.json)

### Wave 2 (Core Implementation)
- [ ] 4. Create abstract database manager interface
- [ ] 5. Implement MySQL sandbox operations
- [ ] 6. Implement MariaDB sandbox operations
- [ ] 7. Update sandbox API to accept mysql/mariadb

### Wave 3 (Query + Cleanup)
- [ ] 8. Update query executor for MySQL/MariaDB
- [ ] 9. Update ephemeral engine for MySQL/MariaDB cleanup
- [ ] 10. Test full flow end-to-end

---

## TODOs

- [ ] 1. Add MySQL + MariaDB containers to docker-compose.yml

  **What to do**:
  - Add MySQL 8 container (port 3306)
  - Add MariaDB 11 container (port 3307)
  - Add health checks
  - Add resource limits (0.5 CPU, 512MB RAM)
  - Add environment variables for root passwords

  **Must NOT do**:
  - Expose default ports incorrectly
  - Missing health checks

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: ["docker-patterns"]

  **References**:
  - PRD §8.4 - Deployment Architecture
  - Current docker-compose.yml

  **Acceptance Criteria**:
  - [ ] docker-compose.yml has mysql and mariadb services
  - [ ] Containers start without errors

- [ ] 2. Add environment variables for MySQL/MariaDB connections

  **What to do**:
  - Add MYSQL_SANDBOX_URL to .env.example
  - Add MARIADB_SANDBOX_URL to .env.example
  - Add to docker-compose.yml app service

  **References**:
  - Current POSTGRES_SANDBOX_URL pattern

  **Acceptance Criteria**:
  - [ ] Env vars documented in .env.example
  - [ ] docker-compose.yml passes vars to app

- [ ] 3. Install mysql2 package (check if installed)

  **What to do**:
  - Check package.json for mysql2
  - If not installed, add to dependencies

  **Acceptance Criteria**:
  - [ ] mysql2 available for import

- [ ] 4. Create abstract database manager interface

  **What to do**:
  - Create `src/lib/db-managers/interface.ts`
  - Define interface: createDatabase, dropDatabase, createUser, dropUser
  - Create factory function: getDbManager(engine)

  **References**:
  - Current sandbox-manager.ts pattern

  **Acceptance Criteria**:
  - [ ] Interface defined
  - [ ] Factory returns correct manager

- [ ] 5. Implement MySQL sandbox operations

  **What to do**:
  - Create `src/lib/db-managers/mysql-manager.ts`
  - Implement: createSandboxDatabase, dropSandboxDatabase
  - Use mysql2 library
  - Follow PostgreSQL pattern from sandbox-manager.ts

  **Must NOT do**:
  - Grant ALL PRIVILEGES (limit to specific database)
  - Allow superuser

  **References**:
  - PRD §12.2 - MySQL/MariaDB create syntax
  - Current sandbox-manager.ts

  **Acceptance Criteria**:
  - [ ] Creates database and user
  - [ ] Grants limited privileges
  - [ ] Drops database and user on cleanup

- [ ] 6. Implement MariaDB sandbox operations

  **What to do**:
  - Create `src/lib/db-managers/mariadb-manager.ts`
  - Implement: createSandboxDatabase, dropSandboxDatabase
  - Similar to MySQL (compatible syntax)

  **Acceptance Criteria**:
  - [ ] Creates database and user
  - [ ] Grants limited privileges
  - [ ] Drops database and user on cleanup

- [ ] 7. Update sandbox API to accept mysql/mariadb

  **What to do**:
  - Modify `src/routes/api/sandboxes/index.ts`
  - Change engine validation from `z.literal("postgresql")` to allow mysql/mariadb
  - Route to correct database manager based on engine
  - Use correct port per engine

  **Must NOT do**:
  - Break PostgreSQL functionality

  **Acceptance Criteria**:
  - [ ] POST /api/sandboxes with engine=mysql works
  - [ ] POST /api/sandboxes with engine=mariadb works

- [ ] 8. Update query executor for MySQL/MariaDB

  **What to do**:
  - Modify `src/lib/query-executor.ts`
  - Add MySQL connection using mysql2
  - Add MariaDB connection using mysql2
  - Remove hardcoded PostgreSQL-only check

  **Must NOT do**:
  - Remove PostgreSQL support

  **References**:
  - Current query-executor.ts pattern

  **Acceptance Criteria**:
  - [ ] Queries work on MySQL sandbox
  - [ ] Queries work on MariaDB sandbox

- [ ] 9. Update ephemeral engine for MySQL/MariaDB cleanup

  **What to do**:
  - Modify `src/lib/ephemeral-engine.ts`
  - Add MySQL cleanup logic
  - Add MariaDB cleanup logic
  - Route to correct manager based on engine

  **Acceptance Criteria**:
  - [ ] Expired MySQL sandboxes are cleaned up
  - [ ] Expired MariaDB sandboxes are cleaned up

- [ ] 10. Test full flow end-to-end

  **What to do**:
  - Create MySQL sandbox, run query, verify cleanup
  - Create MariaDB sandbox, run query, verify cleanup

  **Acceptance Criteria**:
  - [ ] Full MySQL flow works
  - [ ] Full MariaDB flow works

---

## Commit Strategy

- **1**: `feat(docker): add MySQL and MariaDB containers`
- **2**: `feat(db): add MySQL/MariaDB env vars`
- **3**: `feat(db): add database manager interface`
- **4**: `feat(db): implement MySQL sandbox manager`
- **5**: `feat(db): implement MariaDB sandbox manager`
- **6**: `feat(api): add MySQL/MariaDB to sandbox API`
- **7**: `feat(query): add MySQL/MariaDB support to executor`
- **8**: `feat(cleanup): add MySQL/MariaDB to ephemeral engine`
- **9**: `test: verify MySQL/MariaDB flow`
