# Work Plan: Google OAuth Integration

## TL;DR

> **Quick Summary**: Add Google OAuth as alternative login method, following the existing GitHub OAuth pattern.
> 
> **Deliverables**:
> - Google OAuth API endpoints (initiate + callback)
> - Login/Register UI buttons for Google
> - Environment variable documentation
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential (backend first, then frontend)
> **Critical Path**: API endpoints → Test backend → Add UI buttons → Verify

---

## Context

### Original Request
User wants to implement "Should Have" feature: Google OAuth for faster login.

### Requirements
- Make it **optional** (only active when env vars are set), following GitHub OAuth pattern
- User needs help getting Google OAuth credentials

### Current State Analysis
- **GitHub OAuth** backend is implemented at:
  - `/api/auth/github` (initiate)
  - `/api/auth/github/callback` (callback)
- **Login UI** does NOT have OAuth buttons yet (only email/password form)
- GitHub OAuth is NOT connected to the frontend yet

---

## Work Objectives

### Core Objective
Add Google OAuth as an optional login method, following the same pattern as GitHub OAuth.

### Concrete Deliverables
1. Google OAuth credentials setup guide
2. Backend API endpoints for Google OAuth flow
3. Login page with Google OAuth button
4. Register page with Google OAuth button (optional)
5. Environment variables documented in `.env.example`

### Definition of Done
- [ ] User can sign in with Google button
- [ ] New users get auto-created account
- [ ] Existing users with same Google email get linked
- [ ] Works when env vars are set, gracefully hidden when not set
- [ ] All tests pass, build succeeds

### Must Have
- Google OAuth button on login page
- Backend handles OAuth flow (code exchange, user creation)
- Session created after successful OAuth
- Error handling for failed OAuth

### Must NOT Have
- Hardcoded credentials
- Google button visible when OAuth is not configured (per user request for optional)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (project has existing tests)
- **Automated tests**: None for OAuth flow (manual verification)
- **Agent-Executed QA**: Browser testing with Playwright

### QA Policy
Every task includes agent-executed QA scenarios.

---

## Execution Strategy

### Wave 1 (Sequential - backend first):
1. Document Google OAuth credential setup steps
2. Create `src/routes/api/auth/google.ts` (initiate endpoint)
3. Create `src/routes/api/auth/google/callback.ts` (callback endpoint)
4. Test backend with curl

### Wave 2 (Frontend):
5. Add Google OAuth button to LoginForm component
6. Add Google OAuth button to Register page (optional)
7. Verify buttons only show when env vars configured

### Wave 3 (Final):
8. Update `.env.example` with Google OAuth variables
9. Build and verify

---

## TODOs

- [ ] 1. Document Google OAuth credential setup steps

  **What to do**:
  - Research Google Cloud Console OAuth setup process
  - Document required steps for user
  - Include: Create project, enable OAuth, get credentials, set redirect URI

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Simple documentation task
  - **Skills**: [] - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 1
  - **Blocks**: 2

  **References**:
  - Google Cloud OAuth docs (to be researched)

- [ ] 2. Create Google OAuth initiate endpoint

  **What to do**:
  - Create `/api/auth/google` endpoint
  - Follow GitHub OAuth pattern from `src/routes/api/auth/github.ts`
  - Use Google OAuth 2.0 authorization URL
  - Generate state parameter for CSRF protection
  - Set state cookie

  **Must NOT do**:
  - Hardcode any credentials

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward API endpoint, pattern already exists
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 1
  - **Blocks**: 3, 5

  **References**:
  - `src/routes/api/auth/github.ts` - OAuth initiation pattern to follow

- [ ] 3. Create Google OAuth callback endpoint

  **What to do**:
  - Create `/api/auth/google/callback` endpoint
  - Follow GitHub callback pattern from `src/routes/api/auth/github/callback.ts`
  - Exchange code for tokens
  - Fetch user info from Google API
  - Create or link user account
  - Create session and redirect to dashboard

  **Must NOT do**:
  - Store OAuth tokens in database
  - Hardcode credentials

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward API endpoint, pattern already exists
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 1
  - **Blocked By**: 2
  - **Blocks**: 4

  **References**:
  - `src/routes/api/auth/github/callback.ts` - OAuth callback pattern to follow

- [ ] 4. Test Google OAuth backend

  **What to do**:
  - Verify endpoint responds correctly
  - Test with mock credentials if needed

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 1
  - **Blocked By**: 3
  - **Blocks**: 5

  **QA Scenarios**:

  ```
  Scenario: Google OAuth initiate endpoint returns 302
    Tool: Bash (curl)
    Steps:
      1. curl -v http://localhost:3000/api/auth/google
    Expected Result: 302 redirect to accounts.google.com

  Scenario: Google OAuth callback returns error without code
    Tool: Bash (curl)
    Steps:
      1. curl -v "http://localhost:3000/api/auth/google/callback"
    Expected Result: Redirect to /login?error=...
  ```

- [ ] 5. Add Google OAuth button to LoginForm

  **What to do**:
  - Read `src/components/login-form.tsx`
  - Add "Continue with Google" button below email/password form
  - Button links to `/api/auth/google`
  - Button only visible when GOOGLE_CLIENT_ID env var is set

  **Must NOT do**:
  - Add button if OAuth not configured

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple UI component update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 2
  - **Blocked By**: 4

  **References**:
  - `src/components/login-form.tsx` - Current login form to modify

- [ ] 6. Add Google OAuth button to Register page (optional)

  **What to do**:
  - Read `src/components/register-form.tsx`
  - Add "Continue with Google" button

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple UI component update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Wave**: 2
  - **Blocked By**: 4

- [ ] 7. Update .env.example with Google OAuth variables

  **What to do**:
  - Add Google OAuth env vars to `.env.example`
  - Document what each variable does

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple documentation update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Wave**: 2
  - **Blocked By**: 4

- [ ] 8. Build and final verification

  **What to do**:
  - Run `pnpm build`
  - Run `pnpm biome check`
  - Verify all working

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Wave**: 3
  - **Blocked By**: 5, 6, 7

  **QA Scenarios**:

  ```
  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. pnpm build
    Expected Result: Build completes without errors

  Scenario: Lint passes
    Tool: Bash
    Steps:
      1. pnpm biome check
    Expected Result: No errors
  ```

---

## Commit Strategy

- **1**: `feat(auth): add Google OAuth initiate endpoint` — google.ts
- **2**: `feat(auth): add Google OAuth callback endpoint` — google/callback.ts
- **3**: `feat(ui): add Google OAuth button to login form` — login-form.tsx
- **4**: `feat(auth): update env.example with Google OAuth vars` — .env.example
- **5**: `chore: build and lint` — all changed files

---

## Success Criteria

### Verification Commands
```bash
curl -I http://localhost:3000/api/auth/google  # Should redirect to Google
pnpm build  # Should succeed
pnpm biome check  # Should pass
```
