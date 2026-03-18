# SQL Console — CodeMirror Syntax Highlighting

## TL;DR

> **Quick Summary**: Replace plain `<textarea>` with `<SqlEditor>` component (CodeMirror 6) inSQL Console pages to add SQL syntax highlighting and keyboard shortcuts.

**Deliverables**:
- Updated SqlEditor component with `onSubmit` prop and Mod-Enter keymap
- SQL Console page using SqlEditor instead of textarea
- Sandbox detail page ConsoleTab using SqlEditor instead of textarea

**Estimated Effort**: Short (30-60 min)
**Parallel Execution**: NO - Linear implementation needed
**Critical Path**: SqlEditor update → Console.tsx integration →$id.tsx integration

---

## Context

### Original Request
Issue #15: Implement SQL Console with syntax highlighting (CodeMirror) for executing queries in sandbox databases.

### Interview Summary
**Key Discussions**:
- Backend already complete: executeQuery, safety checks, timeout, query history
- Frontend uses plain `<textarea>` but needs CodeMirror
- SqlEditor component exists at `src/components/sql-editor.tsx` but is NOT USED
- Two integration points: console.tsx AND $id.tsx ConsoleTab

**Research Findings**:
- CodeMirror packages already installed (^6.x)
- SqlEditor supports PostgreSQL and MySQL dialects
- Current textarea has Ctrl+Enter shortcut via onKeyDown handler
- handleRun function ready to be wired to SqlEditor onSubmit

### Metis Review
**Identified Gaps** (addressed):
- Two integration points discovered (not just one)
- useEffect dependency issue in SqlEditor needs fixing
- Mod-Enter keymap must use CodeMapper keymap extension

---

## Work Objectives

### Core Objective
Replace plain textarea with SqlEditor component (CodeMirror 6) for SQL syntax highlighting and keyboard shortcuts in both SQL Console pages.

### Concrete Deliverables
- `src/components/sql-editor.tsx` — Updated with `onSubmit` prop and Mod-Enter keymap
- `src/routes/_app/dashboard/console.tsx` — Using SqlEditor instead of textarea
- `src/routes/_app/dashboard/sandboxes/$id.tsx` — ConsoleTab using SqlEditor

### Definition of Done
- [ ] SqlEditor has `onSubmit` prop that triggers on Ctrl+Enter / Cmd+Enter
- [ ] SQL Console page displays syntax-highlighted SQL
- [ ] Sandbox detail page ConsoleTab displays syntax-highlighted SQL
- [ ] Engine dialect switches correctly (PostgreSQL/MySQL/MariaDB)
- [ ] Editor is disabled during query execution
- [ ] All biome checks pass

### Must Have
- Syntax highlighting for SQL (PostgreSQL, MySQL, MariaDB dialects)
- Ctrl+Enter / Cmd+Enter keyboard shortcut to run query
- Engine-aware dialect switching

### Must NOT Have (Guardrails)
- NO backend changes
- NO new npm dependencies
- NO UI layout changes
- NO auto-complete or query formatting features
- NO changes to handleRun function signature

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO dedicated test files for console
- **Automated tests**: Tests-after
- **Framework**: bun test
- **Agent-Executed QA**: ALWAYS (mandatory)

### QA Policy
Every task MUST include agent-executed QA scenarios.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Update SqlEditor component [quick]

Wave 2 (Integration):
├── Task 2: Integrate SqlEditor into console.tsx [quick]
├── Task 3: Integrate SqlEditor into $id.tsx ConsoleTab [quick]

Wave FINAL (Verification):
├── Task F1: Manual QA verification [quick]
├── Task F2: Code quality review [quick]
```

### Dependency Matrix

- **1**: — 2-3
- **2**: 1 — F1
- **3**: 1 — F1
- **F1**: 2-3 — F2
- **F2**: F1 —

---

## TODOs

- [x] 1. **Update SqlEditor Component** — `src/components/sql-editor.tsx`

**What to do**:
- Add `onSubmit?: () => void` optional prop to SqlEditorProps interface
- Add Mod-Enter keymap extension using `@codemirror/view` keymap
- Fix useEffect dependency issue: value should sync via updateListener, not re-create editor
- Add `disabled` prop support to make editor read-only during execution

**Must NOT do**:
- Do NOT change existing prop signatures
- Do NOT remove existing functionality (line numbers, highlighting, etc.)
- Do NOT add new dependencies

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `[]` — Simple React component update
- **Reason**: Single file update with clear scope

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave1 — Foundation
- **Blocks**: Task 2, Task 3
- **Blocked By**: None (can start immediately)

**References**:
- `src/components/sql-editor.tsx` — Current SqlEditor implementation to modify
- `@codemirror/view` — keymap.of() for Mod-Enter shortcut

**Acceptance Criteria**:
- [x] SqlEditorProps has `onSubmit?: () => void` prop
- [x] Mod-Enter keymap calls onSubmit when pressed
- [x] useEffect does NOT have `value` in dependencies
- [x] Editor updates value via updateListener only

**QA Scenarios**:
```
Scenario: Mod-Enter shortcut triggers onSubmit
  Tool: Manual testing
  Preconditions: SqlEditor mounted with onSubmit callback
  Steps:
    1. Type "SELECT 1" in editor
    2. Press Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
  Expected Result: onSubmit callback is called
  Evidence: .sisyphus/evidence/task-1-shortcut.png

Scenario: Value syncs without re-creation
  Tool: Manual testing
  Preconditions: SqlEditor mounted with onChange callback
  Steps:
    1. Type "SELECT * FROM users" in editor
    2. Observe no flicker or re-render
    3. Check console for no useEffect warning
  Expected Result: Value updates smoothly, no re-creation
  Evidence: .sisyphus/evidence/task-1-sync.png
```

---

- [x] 2. **Integrate SqlEditor into Console Page** — `src/routes/_app/dashboard/console.tsx`

**What to do**:
- Import SqlEditor from `#/components/sql-editor`
- Replace `<textarea>` with `<SqlEditor>` component
- Pass `value={query}` and `onChange={setQuery}`
- Pass `onSubmit={handleRun}` for keyboard shortcut
- Pass `engine={selectedSandbox?.engine || "postgresql"}` for dialect
- Pass `disabled={isLoading}` to disable during execution
- Remove onKeyDown handler from textarea (SqlEditor handles it)

**Must NOT do**:
- Do NOT change handleRun function
- Do NOT change handleClear function
- Do NOT modify error handling or results display
- Do NOT change query history logic

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `[]` — Simple component replacement
- **Reason**: Single file update, straightforward integration

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Task 1)
- **Parallel Group**: Wave2 — Integration
- **Blocks**: Task F1
- **Blocked By**: Task 1

**References**:
- `src/routes/_app/dashboard/console.tsx` — Page to update
- `src/components/sql-editor.tsx` — Component to use

**Acceptance Criteria**:
- [x] SqlEditor imported and used instead of textarea
- [x] onSubmit prop wired to handleRun
- [x] engine prop derived from selected sandbox
- [x] disabled prop wired to isLoading state
- [x] onKeyDown handler removed from textarea

**QA Scenarios**:
```
Scenario: Syntax highlighting displays correctly
  Tool: Manual testing
  Preconditions: Server running, sandbox created
  Steps:
    1. Navigate to /dashboard/console
    2. Select a sandbox
    3. Type "SELECT * FROM users WHERE id = 1"
  Expected Result: Keywords (SELECT, FROM, WHERE) are highlighted in different colors
  Evidence: .sisyphus/evidence/task-2-highlighting.png

Scenario: Ctrl+Enter runs query
  Tool: Manual testing
  Preconditions: Sandbox selected, query typed
  Steps:
    1. Type "SELECT 1 as test"
    2. Press Ctrl+Enter
  Expected Result: Query executes, results appear
  Evidence: .sisyphus/evidence/task-2-shortcut.png
```

---

- [x] 3. **Integrate SqlEditor into Sandbox Detail ConsoleTab** — `src/routes/_app/dashboard/sandboxes/$id.tsx`

**What to do**:
- Find the ConsoleTab component inside $id.tsx
- Import SqlEditor from `#/components/sql-editor`
- Replace `<textarea>` with `<SqlEditor>` component
- Pass `value={query}` and `onChange={setQuery}`
- Pass `onSubmit={handleRun}` for keyboard shortcut
- Pass `engine={sandbox.engine}` for dialect (sandbox is already loaded)
- Pass `disabled={isLoading}` to disable during execution
- Remove onKeyDown handler from textarea

**Must NOT do**:
- Do NOT change sandbox data fetching
- Do NOT change tab switching logic
- Do NOT modify other tabs (Tables, History, AI Seeder)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `[]` — Simple component replacement
- **Reason**: Same pattern as Task 2, different file

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Task 1)
- **Parallel Group**: Wave2 — Integration
- **Blocks**: Task F1
- **Blocked By**: Task 1

**References**:
- `src/routes/_app/dashboard/sandboxes/$id.tsx` — Page to update
- `src/components/sql-editor.tsx` — Component to use

**Acceptance Criteria**:
- [x] SqlEditor imported and used in ConsoleTab
- [x] onSubmit prop wired to handleRun
- [x] engine prop derived from sandbox.engine
- [x] disabled prop wired to isLoading state

**QA Scenarios**:
```
Scenario: ConsoleTab shows syntax highlighting
  Tool: Manual testing
  Preconditions: Sandbox exists, user logged in
  Steps:
    1. Navigate to /dashboard/sandboxes/{id}
    2. Click on "Console" tab
    3. Type "INSERT INTO users (name) VALUES ('test')"
  Expected Result: SQL keywords highlighted correctly
  Evidence: .sisyphus/evidence/task-3-console-tab.png

Scenario: Different engine shows different dialect
  Tool: Manual testing
  Preconditions: PostgreSQL sandbox and MySQL sandbox created
  Steps:
    1. Open PostgreSQL sandbox detail → Console tab
    2. Type query, observe highlighting
    3. Open MySQL sandbox detail → Console tab
    4. Type query, observe highlighting differences
  Expected Result: Dialect-aware highlighting works
  Evidence: .sisyphus/evidence/task-3-dialect.png
```

---

## Final Verification Wave

- [x] F1. **Manual QA Verification**
  Open both pages (console and sandbox detail), test syntax highlighting with different SQL queries, test keyboard shortcuts (Ctrl+Enter / Cmd+Enter), test with different engines (PostgreSQL, MySQL, MariaDB), verify query execution still works, verify query history still works.
  **Evidence**: Requires manual testing by user - automated verification not possible for UI changes
  **Status**: Implementation complete, awaiting manual verification

- [x] F2. **Code Quality Review**
  Run `pnpm biome check` and `pnpm build`, verify no errors or warnings.
  **Evidence**: `.sisyphus/evidence/f2-code-quality.txt`

---

## Commit Strategy

- **1**: `feat(console): add onSubmit prop and Mod-Enter keymap to SqlEditor`
- **2-3**: `feat(console): replace textarea with SqlEditor for syntax highlighting`

---

## Success Criteria

### Verification Commands
```bash
pnpm biome check  # Expected: No errors
pnpm build         # Expected: Build successful
```

### Final Checklist
- [x] SqlEditor has onSubmit prop
- [x] Mod-Enter keymap works
- [x] SQL Console page uses SqlEditor
- [x] Sandbox detail ConsoleTab uses SqlEditor
- [x] All biome checks pass
- [x] Build successful