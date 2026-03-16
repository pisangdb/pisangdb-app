# PisangDB Backend Learnings

## 2026-03-15: Rate Limiting Middleware

### Pattern: In-Memory Rate Limiting with Sliding Window

**File:** `src/middleware/rate-limit.ts`

**Key Decisions:**
1. Use `Map<string, RateLimitEntry>` for O(1) lookups
2. Use `Array.from(store.entries())` to avoid TypeScript `downlevelIteration` issues
3. Cleanup expired entries every 5 minutes to prevent memory leaks
4. Start cleanup on module load (side effect at import time)

**Rate Limits (per PRD §12.4):**
| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| Login | 5 | 15 min | IP |
| Register | 3 | 1 hour | IP |
| Create Sandbox | 10 | 1 hour | user |
| SQL Query | 60 | 1 min | user |
| AI Generate | 30 | 1 day | user |

**Headers to Include:**
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds until reset (only on 429)

**Client IP Extraction:**
1. Check `X-Forwarded-For` header first (proxy/load balancer)
2. Fall back to `X-Real-IP` header
3. Default to `'unknown'` if neither present

**User ID Extraction:**
- Extract from `Authorization: Bearer <token>` header
- Fall back to IP for unauthenticated requests
- Use token prefix as identifier until JWT decoding is implemented

### Pattern: TanStack Start Middleware

Rate limiters return an async function that takes a `Request` and returns:
```typescript
{
  success: boolean;
  headers: RateLimitHeaders;
  retryAfter: number;
  message: string;
}
```

Usage in route handlers:
```typescript
const result = await loginRateLimit(request);
if (!result.success) {
  return createRateLimitResponse(result.message, result.retryAfter, result.headers);
}
// Continue with normal handler logic
```
## 2026-03-15: PATCH Handler for Extending Sandbox TTL

### Pattern: TanStack Start PATCH Handler with Zod Validation

**File:** `src/routes/api/sandboxes/$id.ts`

**Key Implementation:**
1. Use `z.union([z.literal(1), z.literal(6), z.literal(12), z.literal(24)])` for enum-like validation with numeric values
2. Calculate max lifetime as `7 * 24 * 60 * 60 * 1000` milliseconds from creation
3. Compare `newExpiredAt > maxAllowedExpiredAt` to enforce max lifetime
4. Return 400 with descriptive error message when max lifetime exceeded

**Response Format:**
```typescript
{
  success: true,
  sandbox: {
    id: string,
    displayName: string,
    expiredAt: string, // ISO timestamp
    ttl: number // seconds
  }
}
```

**Error Responses:**
- 401: Authentication required (no session cookie)
- 401: Invalid or expired session (token verification failed)
- 400: Invalid JSON body
- 400: Invalid extendHours (Zod validation)
- 404: Sandbox not found
- 403: Access denied (not owner)
- 400: Cannot extend expired/destroying sandbox
- 400: Cannot extend beyond 7 days max lifetime
- 500: Failed to update sandbox

**Pattern: Multiple HTTP Methods in Single Route File**
- TanStack Start allows multiple handlers (GET, PATCH, DELETE) in same file
- Each handler is a separate function under `server.handlers`
- All handlers share the same route params (`{ id }`)

## 2026-03-15: GET /api/sandboxes Endpoint

### Pattern: TanStack Start API Route with Authentication

**File:** `src/routes/api/sandboxes/index.ts`

**Key Implementation Details:**

1. **Authentication Pattern:**
   - Extract session cookie using `getCookie(SESSION_COOKIE_NAME)`
   - Verify JWT using `verifyToken(token)`
   - Return 401 if no token or invalid token

2. **Query Pattern:**
   - Use Drizzle ORM `select()` with specific fields (not `select()`)
   - Filter by user ID: `.where(eq(sandboxes.userId, userId))`
   - Sort by created_at DESC: `.orderBy(desc(sandboxes.createdAt))`

3. **Response Format:**
   - Return `{ success: true, sandboxes: [...] }`
   - Mask sensitive data: `dbPassword: "****"`
   - Calculate TTL as seconds remaining: `Math.floor((expiredAt - now) / 1000)`
   - Convert dates to ISO strings for JSON serialization

4. **Filtering Expired Sandboxes:**
   - Query all sandboxes for user
   - Filter in application layer: `userSandboxes.filter(sb => sb.status !== "expired")`
   - This ensures user sees all their sandboxes, not just active ones

5. **Zod v4 Literal Syntax:**
   - Use `.refine()` for custom validation messages on literals
   - Example: `z.literal("postgresql").refine(val => val === "postgresql", "message")`

6. **Drizzle Query with Multiple Conditions:**
   - Use `and()` from drizzle-orm for combining conditions
   - Example: `.where(and(eq(sandboxes.userId, userId), eq(sandboxes.status, "active")))`

## 2026-03-15: Tables API Endpoint

### Pattern: Connecting to Sandbox Database as Sandbox User

**File:** `src/routes/api/sandboxes/$id/tables.ts`

**Key Implementation:**
1. Create a new `Pool` for each request (not singleton) - sandbox connections are ephemeral
2. Use sandbox credentials (`dbUser`, `dbPassword`) from the sandbox record
3. Build connection string: `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`
4. Query `information_schema.tables` for table names
5. Query `pg_stat_user_tables` for row counts (`n_live_tup`)
6. Query `pg_class` with `pg_relation_size(oid)` for table sizes
7. Always clean up the pool with `pool.end()` in a `finally` block

**SQL Queries:**
```sql
-- Get tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'

-- Get row counts (approximate)
SELECT relname, n_live_tup FROM pg_stat_user_tables

-- Get table sizes
SELECT relname, pg_relation_size(oid) / 1024 as size_kb FROM pg_class WHERE relkind = 'r'
```

**Response Format:**
```typescript
{
  success: true,
  tables: Array<{ name: string; rows: number; sizeKb: number }>
}
```

**Error Responses:**
- 401: Authentication required (no session cookie)
- 401: Invalid or expired session (token verification failed)
- 404: Sandbox not found
- 403: Access denied (not owner)
- 410: Sandbox has expired
- 400: Table listing only supported for PostgreSQL (MVP)
- 500: Failed to query database tables

### Pattern: TanStack Start Nested Routes

**File:** `src/routes/api/sandboxes/$id/tables.ts`

**Route Path:** `/api/sandboxes/:id/tables`
- Parent route: `src/routes/api/sandboxes/$id.ts` (`/api/sandboxes/:id`)
- Nested route: `src/routes/api/sandboxes/$id/tables.ts` (`/api/sandboxes/:id/tables`)

**Key Points:**
- Use `createFileRoute("/api/sandboxes/$id/tables")` for nested routes
- Access params via `{ params }` in handler
- Run `pnpm run build` to regenerate route types after adding new routes

## 2026-03-15: POST /api/sandboxes Endpoint

### Pattern: TanStack Start API Route with Multiple Handlers

**File:** `src/routes/api/sandboxes/index.ts`

**Key Decisions:**
1. Use `createFileRoute("/api/sandboxes/")` with trailing slash for directory routes
2. Multiple handlers in `server.handlers` object (GET and POST)
3. Use `and()` from Drizzle ORM for multiple WHERE conditions
4. Dynamic import for cleanup functions to avoid circular dependencies

**Zod Validation for MVP Constraints:**
```typescript
// Use .refine() for custom error messages on literals
engine: z
  .literal("postgresql")
  .refine((val) => val === "postgresql", "Only PostgreSQL engine is supported in MVP"),
```

**Drizzle Query with Multiple Conditions:**
```typescript
// Use and() for multiple WHERE conditions
await db
  .select({ count: count() })
  .from(sandboxes)
  .where(and(
    eq(sandboxes.userId, userId),
    eq(sandboxes.status, "active"),
  ));
```

**Cleanup Pattern for Failed Operations:**
```typescript
// Use dynamic import for cleanup to avoid circular dependencies
try {
  const { dropSandboxDatabase } = await import("#/lib/sandbox-manager");
  await dropSandboxDatabase(dbName, dbUser);
} catch (cleanupError) {
  console.error("[CreateSandbox] Cleanup failed:", cleanupError);
}
```

**Response Format:**
- Success: `{ success: true, sandbox: { ... } }` with status 201
- Error: `{ success: false, error: string, details?: [...] }` with appropriate status

**Security Considerations:**
- Return plain password in response for user to copy (only shown once)
- Store encrypted password in database
- Mask password in GET response (`"****"`)
- Rate limit: 10 requests/hour/user
- Quota check: max 5 active sandboxes per user
### 2026-03-15: Implement GET /api/sandboxes/:id/history endpoint
- Added a new TanStack Start route to expose the last 50 query history entries for a sandbox via GET /api/sandboxes/:id/history
- Auth flow: read session from cookie, validate, and ensure the requester is the sandbox owner
- DB access: query History table filtered by sandbox_id, ordered by created_at DESC, limit 50
- Response shape matches the required interface: history[].{ id, query, status, executionTimeMs, rowsAffected, errorMessage, createdAt }
- Ensured security constraints: 401 for unauthenticated, 403 for non-owner, 404 for sandbox not found
## AI Backend: ai/execute Endpoint (PisangDB)
- Implemented POST /api/sandboxes/:id/ai/execute to run AI-generated SQL against a sandbox.
- Key flow: authenticate user, verify sandbox ownership, validate aiLogId, fetch AI log, ensure not yet executed, execute SQL via query-executor, mark AI log as executed on success, return results.
- Reuses existing DB utilities: getSandbox from tags, executeQuery, and aiLogs schema.
