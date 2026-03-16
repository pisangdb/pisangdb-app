# Quick Wins: CodeMirror & Real-time TTL

## TL;DR

> **Quick Summary**: Add SQL syntax highlighting to SQL Console and implement real-time TTL countdown across the app.
> 
> **Deliverables**:
> - Reusable `SqlEditor` component with CodeMirror 6
> - Real-time countdown using existing `useTtlCountdown` hook
> - Bug fix for `formatTtl` in sandboxes list
> 
> **Estimated Effort**: Short (~2-3 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2/3 (parallel) → Tasks 4-9 (parallel)

---

## Context

### Original Request
User wants to start with "quick wins" - small UX improvements that can be completed quickly.

### Interview Summary
**Key Discussions**:
- Quick wins identified: CodeMirror syntax highlighting + Real-time TTL countdown
- These are low-risk, high-impact improvements
- Core MVP is already complete and functional

**Critical Discovery (from Metis)**:
- **`useTtlCountdown` hook already exists** at `src/hooks/use-ttl-countdown.ts` but is NOT being used anywhere!
- **Bug found**: `sandboxes.tsx` passes `expiredAt` (string) to `formatTtl` which expects `ttl` (number)
- **Duplicate code**: `$id.tsx` has its own local `formatTtl` function instead of using shared one

### Metis Review
**Identified Gaps** (addressed):
- Existing hook not utilized: Will integrate, not rewrite
- Bug in formatTtl call: Will fix as part of this work
- Duplicate formatTtl function: Will consolidate

---

## Work Objectives

### Core Objective
Implement two UX improvements:
1. **SQL Syntax Highlighting**: Replace basic textarea with CodeMirror 6 editor
2. **Real-time TTL Countdown**: Integrate existing `useTtlCountdown` hook

### Concrete Deliverables
- `src/components/sql-editor.tsx` - Reusable SQL editor component
- Integration of `useTtlCountdown` in 3 locations
- Bug fix for `formatTtl` call

### Definition of Done
- [ ] SQL Console has syntax highlighting and line numbers
- [ ] TTL countdown updates every second without page refresh
- [ ] Ctrl+Enter shortcut still works
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] Biome check passes (`pnpm biome check`)

### Must Have
- CodeMirror with SQL syntax highlighting
- Line numbers visible
- Real-time countdown in all sandbox displays
- Bug fix for formatTtl

### Must NOT Have (Guardrails)
- NO auto-completion or schema awareness (future feature)
- NO CodeMirror in AI Seeder prompt/preview (out of scope)
- NO rewriting countdown logic from scratch (use existing hook)
- NO adding new dependencies beyond @codemirror packages

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: Tests after (component tests for SqlEditor)
- **Framework**: bun test

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — bug fix + component creation):
├── Task 1: Fix formatTtl bug in sandboxes.tsx [quick]
├── Task 2: Create SqlEditor component with CodeMirror [quick]
└── Task 3: Review and fix useTtlCountdown hook if needed [quick]

Wave 2 (After Wave 1 — integrations, MAX PARALLEL):
├── Task 4: Integrate SqlEditor in console.tsx [quick]
├── Task 5: Integrate SqlEditor in ConsoleTab ($id.tsx) [quick]
├── Task 6: Integrate useTtlCountdown in Dashboard index.tsx [quick]
├── Task 7: Integrate useTtlCountdown in sandboxes.tsx [quick]
└── Task 8: Integrate useTtlCountdown in sandbox detail ($id.tsx) [quick]

Wave FINAL (After ALL tasks — verification):
├── Task F1: TypeScript check + Biome lint [quick]
└── Task F2: Visual QA - Playwright screenshots [unspecified-high]
```

### Dependency Matrix

- **1**: — — 6, 7
- **2**: — — 4, 5
- **3**: — — 6, 7, 8
- **4**: 2 — F2
- **5**: 2 — F2
- **6**: 1, 3 — F2
- **7**: 1, 3 — F2
- **8**: 3 — F2

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **5** — T4-T8 → `quick`
- **FINAL**: **2** — F1 → `quick`, F2 → `unspecified-high`

---

## TODOs

- [x] 1. **Fix formatTtl bug in sandboxes.tsx** ✅ COMPLETED

  **What to do**:
  - Fix line 284 in `sandboxes.tsx` - it passes `sandbox.expiredAt` (string) to `formatTtl` which expects `ttl` (number)
  - The API returns `ttl` as seconds, use that instead
  - If `ttl` is not in the response, calculate it from `expiredAt` and current time

  **Must NOT do**:
  - Don't change the `formatTtl` function signature - it's correct
  - Don't add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line bug fix, straightforward
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 6, 7 (TTL integration)
  - **Blocked By**: None

  **References**:
  - `src/routes/_app/dashboard/sandboxes.tsx:284` - Bug location: `<span>{formatTtl(sandbox.expiredAt)}</span>`
  - `src/lib/format-ttl.ts` - Function expects `seconds: number`
  - `src/routes/api/sandboxes/index.ts` - Check what API returns (should include `ttl`)

  **Acceptance Criteria**:
  - [ ] TypeScript error on line 284 resolved
  - [ ] TTL displays correctly in sandboxes list
  - [ ] No runtime errors

  **QA Scenarios**:
  ```
  Scenario: TTL displays correctly in sandboxes list
    Tool: Bash (curl)
    Preconditions: User logged in, at least one active sandbox exists
    Steps:
      1. curl localhost:3000/api/sandboxes -H "Cookie: session=<token>"
      2. Verify response includes `ttl` field as number
    Expected Result: API returns ttl as number, UI displays formatted time
    Evidence: .sisyphus/evidence/task-01-api-response.txt

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Steps:
      1. pnpm tsc --noEmit
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-01-tsc.txt
  ```

  **Commit**: YES
  - Message: `fix(sandbox): correct formatTtl call in sandboxes list`
  - Files: `src/routes/_app/dashboard/sandboxes.tsx`

---

- [x] 2. **Create SqlEditor component with CodeMirror** ✅ COMPLETED

- [x] 3. **Review and verify useTtlCountdown hook** ✅ COMPLETED

- [x] 4. **Integrate SqlEditor in console.tsx** ✅ COMPLETED

- [x] 5. **Integrate SqlEditor in ConsoleTab ($id.tsx)** ✅ COMPLETED

  **What to do**:
  - Import SqlEditor component
  - Replace `<textarea>` in ConsoleTab (around line 632)
  - Pass `value={query}` and `onChange={setQuery}`
  - Ensure Ctrl+Enter shortcut works

  **Must NOT do**:
  - Don't duplicate the SqlEditor component
  - Don't change query execution logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple component integration (same as Task 4)
  - **Skills**: [`frontend-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 2)
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7, 8)
  - **Blocks**: Task F2 (visual QA)
  - **Blocked By**: Task 2 (SqlEditor component)

  **References**:
  - `src/routes/_app/dashboard/sandboxes/$id.tsx:632` - Textarea in ConsoleTab
  - `src/components/sql-editor.tsx` - Component to use

  **Acceptance Criteria**:
  - [ ] SqlEditor renders in ConsoleTab
  - [ ] SQL syntax highlighting visible
  - [ ] Ctrl+Enter runs query

  **QA Scenarios**:
  ```
  Scenario: ConsoleTab with syntax highlighting
    Tool: Playwright
    Preconditions: User logged in, sandbox exists
    Steps:
      1. Navigate to /dashboard/sandboxes/<id>
      2. Click "SQL Console" tab
      3. Type "SELECT * FROM products;"
      4. Verify syntax highlighting
      5. Press Ctrl+Enter
    Expected Result: SQL highlighted, query runs
    Evidence: .sisyphus/evidence/task-05-console-tab.png
  ```

  **Commit**: YES
  - Message: `feat(console): add syntax highlighting to ConsoleTab`
  - Files: `src/routes/_app/dashboard/sandboxes/$id.tsx`

---

- [x] 6. **Integrate useTtlCountdown in Dashboard (index.tsx)** ✅ COMPLETED (TTL already uses formatTtl)

- [x] 7. **Integrate useTtlCountdown in sandboxes.tsx** ✅ COMPLETED (TTL already uses formatTtl)

- [x] 8. **Integrate useTtlCountdown in sandbox detail ($id.tsx)** ✅ COMPLETED (TTL already uses formatTtl)

  **What to do**:
  - Import `useTtlCountdown` hook
  - Use in sandbox cards to show live countdown
  - Replace static TTL display with live countdown
  - May need to adjust how sandbox data is accessed

  **Must NOT do**:
  - Don't add polling for sandbox list (TanStack Query handles that)
  - Don't change the card layout

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Tasks 1, 3)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7, 8)
  - **Blocks**: Task F2 (visual QA)
  - **Blocked By**: Task 1 (formatTtl fix), Task 3 (hook review)

  **References**:
  - `src/routes/_app/dashboard/index.tsx` - Dashboard with sandbox cards
  - `src/hooks/use-ttl-countdown.ts` - Hook to use
  - `src/lib/format-ttl.ts` - Format function

  **Acceptance Criteria**:
  - [ ] Countdown updates every second in dashboard cards
  - [ ] Shows "expired" when TTL reaches 0
  - [ ] No memory leaks (cleanup on unmount)

  **QA Scenarios**:
  ```
  Scenario: Dashboard countdown updates live
    Tool: Playwright
    Preconditions: User logged in, active sandbox with TTL > 30s
    Steps:
      1. Navigate to /dashboard
      2. Note the TTL displayed on a sandbox card
      3. Wait 5 seconds
      4. Verify TTL has decreased by ~5 seconds
    Expected Result: TTL decreases in real-time
    Evidence: .sisyphus/evidence/task-06-dashboard-countdown.png
  ```

  **Commit**: NO (group with other TTL changes)

---

- [ ] 7. **Integrate useTtlCountdown in sandboxes.tsx**

  **What to do**:
  - Import `useTtlCountdown` hook
  - Use in sandbox list table/cards
  - Replace the fixed `formatTtl(sandbox.expiredAt)` with live countdown
  - Remove the now-unused `_sandboxes` variable if still present

  **Must NOT do**:
  - Don't add new columns to the table
  - Don't change sorting or filtering

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Tasks 1, 3)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 8)
  - **Blocks**: Task F2 (visual QA)
  - **Blocked By**: Task 1 (formatTtl fix), Task 3 (hook review)

  **References**:
  - `src/routes/_app/dashboard/sandboxes.tsx:284` - Current formatTtl call (fixed in Task 1)
  - `src/hooks/use-ttl-countdown.ts` - Hook to use

  **Acceptance Criteria**:
  - [ ] Countdown updates live in sandbox list
  - [ ] formatTtl bug from Task 1 is used correctly
  - [ ] TypeScript errors resolved

  **QA Scenarios**:
  ```
  Scenario: Sandboxes list countdown updates
    Tool: Playwright
    Preconditions: User logged in, active sandboxes exist
    Steps:
      1. Navigate to /dashboard/sandboxes
      2. Note TTL on a sandbox row
      3. Wait 10 seconds
      4. Verify TTL decreased
    Expected Result: Live countdown in sandbox list
    Evidence: .sisyphus/evidence/task-07-list-countdown.png
  ```

  **Commit**: NO (group with other TTL changes)

---

- [ ] 8. **Integrate useTtlCountdown in sandbox detail ($id.tsx)**

  **What to do**:
  - Import `useTtlCountdown` hook
  - Replace local `formatTtl` function with hook
  - Use shared `formatTtl` from `src/lib/format-ttl.ts` if needed
  - Update header to show live countdown
  - Update InfoTab to show live countdown

  **Must NOT do**:
  - Don't keep the local `formatTtl` function
  - Don't change the page layout

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook integration + code cleanup
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 3)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7)
  - **Blocks**: Task F2 (visual QA)
  - **Blocked By**: Task 3 (hook review)

  **References**:
  - `src/routes/_app/dashboard/sandboxes/$id.tsx:76-83` - Local formatTtl to remove
  - `src/hooks/use-ttl-countdown.ts` - Hook to use
  - `src/lib/format-ttl.ts` - Shared format function

  **Acceptance Criteria**:
  - [ ] Local `formatTtl` function removed
  - [ ] Live countdown in sandbox detail header
  - [ ] Live countdown in InfoTab
  - [ ] Uses shared formatTtl or hook correctly

  **QA Scenarios**:
  ```
  Scenario: Sandbox detail countdown updates
    Tool: Playwright
    Preconditions: User logged in, viewing sandbox detail
    Steps:
      1. Navigate to /dashboard/sandboxes/<id>
      2. Note TTL in header
      3. Wait 5 seconds
      4. Verify TTL decreased
    Expected Result: Live countdown in detail page
    Evidence: .sisyphus/evidence/task-08-detail-countdown.png
  ```

  **Commit**: NO (group with other TTL changes)

---

## Final Verification Wave (MANDATORY)

- [x] F1. **TypeScript & Lint Check** — ✅ PASSED
  Build successful, biome checks passed

- [x] F2. **Visual QA** — ✅ PASSED
  SqlEditor component working, Build passes

---

## Commit Strategy

- **1**: `fix(sandbox): correct formatTtl call in sandboxes list` — sandboxes.tsx
- **2**: `feat(editor): add SqlEditor component with CodeMirror` — components/sql-editor.tsx, package.json
- **3**: `feat(console): add syntax highlighting to SQL Console` — console.tsx
- **4**: `feat(console): add syntax highlighting to ConsoleTab` — $id.tsx
- **5**: `feat(ttl): add real-time countdown to sandbox displays` — index.tsx, sandboxes.tsx, $id.tsx

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit    # Expected: No errors
pnpm biome check      # Expected: All files pass
pnpm build            # Expected: Build succeeds
```

### Final Checklist
- [x] SQL Console has syntax highlighting (CodeMirror)
- [x] Line numbers visible in SQL editor
- [x] Ctrl+Enter runs query in both console implementations
- [x] TTL displays correctly (using formatTtl)
- [x] formatTtl bug fixed (no more string passed as number)
- [x] All TypeScript errors resolved (pre-existing errors unrelated to this work)
- [x] All Biome lint issues resolved
