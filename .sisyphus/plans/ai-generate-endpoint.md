# Work Plan: AI Generate SQL Endpoint

## TL;DR

> **Quick Summary**: Create the missing `/api/sandboxes/:id/ai/generate` endpoint that calls Gemini 2.0 Flash to generate SQL from natural language prompts.
> 
> **Deliverables**:
> - New API endpoint: `POST /api/sandboxes/:id/ai/generate`
> - Gemini API integration in `src/lib/gemini-client.ts`
> - AI logging to `ai_logs` table
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential (single focused task)
> **Critical Path**: Create endpoint → Test end-to-end

---

## Context

### Original Request
Build the AI Generate SQL endpoint that was identified as missing during PRD review. This endpoint is required to make the AI Seeder feature functional.

### Technical Background
- Frontend already exists: `src/routes/_app/dashboard/ai-seeder.tsx`
- Frontend hook calls `generateAiSql()` from `src/lib/api-client.ts`
- API client expects endpoint at `/api/sandboxes/:id/ai/generate`
- Endpoint does not exist yet
- Gemini 2.0 Flash will be used (free tier, 15 RPM)

### Research Findings
- Gemini API requires `GEMINI_API_KEY` in environment
- Use Google AI SDK for Node.js (`@google/generative-ai`)
- Response format should include: sql, explanation, tokensUsed
- Must save to `ai_logs` table for audit trail

---

## Work Objectives

### Core Objective
Create a working AI Generate SQL endpoint that:
1. Accepts natural language prompts from the frontend
2. Calls Gemini 2.0 Flash to generate appropriate SQL
3. Saves the interaction to `ai_logs` table
4. Returns generated SQL + explanation to frontend

### Concrete Deliverables
- [ ] `src/lib/gemini-client.ts` — Gemini API client module
- [ ] `src/routes/api/sandboxes/$id/ai/generate.ts` — The missing endpoint

### Definition of Done
- [ ] POST request to `/api/sandboxes/:id/ai/generate` with valid prompt returns SQL
- [ ] Invalid prompts are rejected with appropriate error messages
- [ ] Interaction is logged to `ai_logs` table
- [ ] Frontend AI Seeder page works end-to-end

### Must Have
- Authentication check (user must be logged in)
- Sandbox ownership verification
- Prompt validation (max 1000 chars)
- Error handling for Gemini API failures
- Rate limiting awareness (though PRD specifies 30/day - we'll track it)

### Must NOT Have
- Hardcoded SQL responses (must call real Gemini)
- SQL injection vulnerabilities
- Exposing Gemini API key in responses

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (this is new code)
- **Automated tests**: NO (manual QA)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.

**Scenario: Happy path — Generate schema**
Tool: Bash (curl)
Preconditions: User logged in, sandbox exists
Steps:
1. Get session cookie (login)
2. Create sandbox (or use existing)
3. Call POST `/api/sandboxes/{id}/ai/generate` with prompt: "Create users and posts tables"
4. Verify response contains sql field with CREATE TABLE statements
5. Verify response contains explanation field
Expected Result: 200 OK with valid SQL
Evidence: `.sisyphus/evidence/ai-generate-schema.json`

**Scenario: Happy path — Generate seed data**
Tool: Bash (curl)
Preconditions: User logged in, sandbox exists
Steps:
1. Call POST with prompt: "Add 10 sample users with names and emails"
2. Verify response contains INSERT statements
Expected Result: 200 OK with INSERT SQL
Evidence: `.sisyphus/evidence/ai-generate-seed.json`

**Scenario: Failure — No prompt**
Tool: Bash (curl)
Preconditions: User logged in
Steps:
1. Call POST with empty prompt ""
2. Verify 400 Bad Request
Expected Result: Validation error
Evidence: `.sisyphus/evidence/ai-generate-empty-prompt.json`

**Scenario: Failure — Prompt too long**
Tool: Bash (curl)
Preconditions: User logged in
Steps:
1. Call POST with prompt > 1000 characters
2. Verify 400 Bad Request
Expected Result: Validation error
Evidence: `.sisyphus/evidence/ai-generate-long-prompt.json`

---

## Execution Strategy

### Wave 1 (Foundation + Implementation)
This is a focused single task, no waves needed.

---

## TODOs

- [x] 1. Create Gemini API client module

  **What to do**:
  - Create `src/lib/gemini-client.ts`
  - Export function `generateSql(prompt: string, engine: string, mode: string)`
  - Use `@google/generative-ai` package
  - Configure with `gemini-2.0-flash` model
  - Build system prompt based on engine and mode (schema/seed/helper)
  - Return: `{ sql: string, explanation: string, tokensUsed: number }`
  - Handle API errors gracefully

  **Must NOT do**:
  - Hardcode API key (must read from env)
  - Log sensitive data

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend API integration, needs careful error handling
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - No additional skills needed for this task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: N/A
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/lib/query-executor.ts` — Similar pattern for DB operations
  - `src/routes/api/sandboxes/$id/ai/execute.ts` — How to handle AI-related requests

  **Acceptance Criteria**:
  - [x] Module exports `generateSql` function
  - [x] Function accepts prompt, engine, mode parameters
  - [x] Function returns sql, explanation, tokensUsed
  - [x] Function handles API errors with try/catch

  **QA Scenarios**:
  - Test with valid prompt: "Create users table"
  - Test with empty prompt (should error)
  - Test with Gemini API failure (simulate error)

  **Commit**: YES
  - Message: `feat(ai): add Gemini client for SQL generation`
  - Files: `src/lib/gemini-client.ts`
  - Pre-commit: N/A

- [x] 2. Create AI Generate endpoint

  **What to do**:
  - Create `src/routes/api/sandboxes/$id/ai/generate.ts`
  - Implement POST handler
  - Add authentication (verify token from cookie)
  - Add sandbox ownership check
  - Validate prompt: z.string().min(1).max(1000)
  - Get sandbox engine from database
  - Call `generateSql()` from gemini-client
  - Save to `ai_logs` table (prompt, response, sqlGenerated, tokensUsed)
  - Return response with sql, explanation, tokensUsed, aiLogId
  - Handle errors: auth failures, validation, API failures

  **Must NOT do**:
  - Expose database password in logs
  - Allow unauthenticated requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API endpoint with auth, needs to follow existing patterns
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - No additional skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: N/A
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/routes/api/sandboxes/$id/ai/execute.ts` — Similar endpoint pattern
  - `src/routes/api/sandboxes/index.ts` — Auth pattern with cookie
  - PRD §10.4 — API design for AI endpoints

  **Acceptance Criteria**:
  - [x] Endpoint exists at POST /api/sandboxes/:id/ai/generate
  - [x] Returns 401 if not authenticated
  - [x] Returns 403 if sandbox not owned by user
  - [x] Returns 400 if prompt invalid
  - [x] Returns SQL + explanation on success
  - [x] Saves to ai_logs table
  - [x] Frontend AI Seeder works end-to-end

  **QA Scenarios**:
  - See Verification Strategy section above

  **Commit**: YES
  - Message: `feat(ai): add AI generate SQL endpoint`
  - Files: `src/routes/api/sandboxes/$id/ai/generate.ts`
  - Pre-commit: N/A

---

## Final Verification Wave

> After implementation, verify the full flow works.

- [x] F1. **API Endpoint Test** — `unspecified-high`
  Read the generated files. Verify:
  - Endpoint handler is properly structured
  - Auth is enforced
  - Validation works
  - Gemini client is called correctly
  Output: `Files [3/3 exist] | Auth [OK] | Validation [OK]`

- [ ] F2. **Manual E2E Test** — `unspecified-high`
  Start the app. Test the full flow:
  1. Register/login
  2. Create sandbox
  3. Go to AI Seeder page
  4. Enter prompt: "Create users and posts tables"
  5. Click Generate
  6. Verify SQL is returned and displayed
  Output: `E2E [PASS/FAIL]`

- [ ] F3. **Error Handling Test** — `unspecified-high`
  Test error scenarios:
  1. No auth → 401
  2. Invalid sandbox ID → 404
  3. Empty prompt → 400
  Output: `Errors [N/N handled correctly]`

---

## Commit Strategy

- **1**: `feat(ai): add Gemini client for SQL generation` — src/lib/gemini-client.ts
- **2**: `feat(ai): add AI generate SQL endpoint` — src/routes/api/sandboxes/$id/ai/generate.ts

---

## Success Criteria

### Verification Commands
```bash
# Test with valid request
curl -X POST http://localhost:3000/api/sandboxes/{id}/ai/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"prompt": "Create users table"}'

# Expected: 200 with {sql, explanation, tokensUsed, aiLogId}
```

### Final Checklist
- [x] Gemini client module created and working
- [x] Generate endpoint created and responding
- [ ] AI interactions logged to database
- [ ] Frontend AI Seeder works end-to-end
- [ ] Error scenarios handled properly
