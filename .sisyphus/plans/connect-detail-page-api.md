# Plan: Connect Sandbox Detail Page to API

## TL;DR

> **Quick Summary**: Connect the sandbox detail page (`$id.tsx`) to the existing API hooks to make it fully functional instead of showing dummy data.
> 
> **Deliverables**: 
> - Working detail page with real sandbox data
> - Extend sandbox functionality
> - Delete sandbox functionality  
> - Working SQL console
> - Working tables list
> - Working query history
> - Working AI seeder
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential (UI depends on hook state)
> **Critical Path**: Task 1 → Task 2-7

---

## Context

### Problem Identified
The sandbox detail page at `src/routes/_app/dashboard/sandboxes/$id.tsx` is **100% dummy data**. All tabs (Info, Console, AI, Tables, History) use hardcoded `dummySandbox`, `dummyTables`, `dummyHistory` variables instead of calling the API.

### What Already Exists
- **API Endpoints**: All exist in `src/routes/api/sandboxes/$id/`
  - `index.ts` - GET sandbox by ID
  - `query.ts` - Execute SQL
  - `tables.ts` - Get table list
  - `ai/generate.ts` - AI SQL generation
  - `ai/execute.ts` - Execute AI SQL
  - `ai/logs.ts` - AI interaction logs
- **Frontend Hooks**: All exist in `src/hooks/`
  - `useSandbox` - Fetch sandbox details
  - `useExtendSandbox` - Extend TTL
  - `useDeleteSandbox` - Delete sandbox
  - `useExecuteQuery` - Run SQL queries
  - `useTables` - Get table list
  - `useQueryHistory` - Get query history
  - `useGenerateAiSql` - Generate SQL with AI
  - `useExecuteAiSql` - Execute AI-generated SQL

---

## Work Objectives

### Core Objective
Replace all dummy data in the sandbox detail page with real API data by wiring up the existing hooks.

### Concrete Deliverables
- [ ] Detail page shows real sandbox data from API
- [ ] Extend button actually extends sandbox TTL
- [ ] Delete button actually deletes sandbox
- [ ] SQL Console executes real queries
- [ ] Tables tab shows real table list
- [ ] History tab shows real query history
- [ ] AI tab generates and executes real SQL

### Definition of Done
- [ ] Navigate to sandbox detail → Real data displays (not dummy)
- [ ] Click Extend → Sandbox TTL increases (verify via API)
- [ ] Click Delete → Sandbox is deleted (verify via redirect)
- [ ] Run SQL query → Real results display
- [ ] Click Tables tab → Real table list from database

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no formal test suite)
- **Automated tests**: NONE
- **Agent-Executed QA**: YES - manual verification by running the app

### QA Scenarios (Manual Verification)
1. **Create sandbox** → Navigate to detail → Verify real data shows
2. **Click Extend** → Verify toast success → Verify new TTL
3. **Run query** → Verify results display → Check history tab
4. **Click AI Generate** → Verify SQL generates → Execute → Verify tables created

---

## Execution Strategy

### Sequential Task Flow
```
Task 1: Connect basic sandbox data (blocks all other tasks)
├── Task 2: Wire up Extend button
├── Task 3: Wire up Delete button  
├── Task 4: Wire up SQL Console
├── Task 5: Wire up Tables tab
├── Task 6: Wire up History tab
└── Task 7: Wire up AI tab
```

---

## TODOs

- [x] 1. Connect detail page to useSandbox hook ✅ COMPLETED

  **What to do**:
  - Import `useSandbox` hook from `src/hooks/use-sandbox.ts`
  - Get sandbox ID from route params using `useParams`
  - Call `useSandbox(id)` to fetch data
  - Replace all `dummySandbox` references with real data
  - Handle loading and error states

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `react-tanstack` - for proper TanStack Query integration

  **References**:
  - `src/routes/_app/dashboard/sandboxes/$id.tsx` - Current dummy implementation
  - `src/hooks/use-sandbox.ts` - Hook to use
  - `src/lib/api-client.ts:Sandbox` - Type definition

  **Acceptance Criteria**:
  - [ ] Page loads real sandbox data from API
  - [ ] Engine icon displays correctly based on engine type
  - [ ] TTL countdown shows real expiration time

- [x] 2. Wire up Extend button to useExtendSandbox ✅ COMPLETED

  **What to do**:
  - Import `useExtendSandbox` hook
  - Connect extend buttons (+1h, +6h, +12h, +24h) to the hook
  - Show loading state during extend
  - Show success toast after extend
  - Invalidate sandbox query to refresh data

  **References**:
  - `src/hooks/use-extend-sandbox.ts` - Hook to use

  **Acceptance Criteria**:
  - [ ] Clicking extend button calls PATCH /api/sandboxes/:id/extend
  - [ ] Success toast displays
  - [ ] TTL updates immediately

- [x] 3. Wire up Delete button to useDeleteSandbox ✅ COMPLETED

  **What to do**:
  - Import `useDeleteSandbox` hook
  - Connect delete confirmation to the hook
  - Redirect to /dashboard/sandboxes after successful delete
  - Show loading and error states

  **References**:
  - `src/hooks/use-delete-sandbox.ts` - Hook to use

  **Acceptance Criteria**:
  - [ ] Clicking Confirm Delete calls DELETE /api/sandboxes/:id
  - [ ] User redirected to sandbox list after delete

- [x] 4. Wire up SQL Console to useExecuteQuery ✅ COMPLETED

  **What to do**:
  - Import `useExecuteQuery` hook
  - Connect query textarea to state
  - Wire up Run Query button to execute query
  - Display results in table format
  - Show execution time and row count
  - Handle errors gracefully

  **References**:
  - `src/hooks/use-execute-query.ts` - Hook to use
  - `src/routes/api/sandboxes/$id/query.ts` - API endpoint

  **Acceptance Criteria**:
  - [ ] Running SELECT query displays results in table
  - [ ] Running INSERT/UPDATE shows affected rows
  - [ ] Errors display user-friendly messages
  - [ ] Execution time shows in milliseconds

- [x] 5. Wire up Tables tab to useTables ✅ COMPLETED

  **What to do**:
  - Import `useTables` hook
  - Call hook with sandbox ID
  - Replace `dummyTables` with real data
  - Handle loading state

  **References**:
  - `src/hooks/use-tables.ts` - Hook to use
  - `src/routes/api/sandboxes/$id/tables.ts` - API endpoint

  **Acceptance Criteria**:
  - [ ] Tables tab shows list of tables from database
  - [ ] Row counts are accurate
  - [ ] Size information displays correctly

- [x] 6. Wire up History tab to useQueryHistory ✅ COMPLETED

  **What to do**:
  - Import `useQueryHistory` hook
  - Call hook with sandbox ID
  - Replace `dummyHistory` with real data
  - Handle loading state

  **References**:
  - `src/hooks/use-query-history.ts` - Hook to use

  **Acceptance Criteria**:
  - [ ] History tab shows real query history
  - [ ] Status (success/error) displays correctly
  - [ ] Execution time shows accurately

- [x] 7. Wire up AI tab to useGenerateAiSql + useExecuteAiSql ✅ COMPLETED

  **What to do**:
  - Import both AI hooks
  - Connect prompt textarea to state
  - Wire up Generate SQL button to useGenerateAiSql
  - Wire up Execute SQL button to useExecuteAiSql
  - Display generated SQL in preview area
  - Handle loading and error states

  **References**:
  - `src/hooks/use-generate-ai-sql.ts` - Generation hook
  - `src/hooks/use-execute-ai-sql.ts` - Execution hook
  - `src/routes/api/sandboxes/$id/ai/generate.ts` - Generate endpoint
  - `src/routes/api/sandboxes/$id/ai/execute.ts` - Execute endpoint

  **Acceptance Criteria**:
  - [ ] Prompt generates valid SQL
  - [ ] Generated SQL can be edited before execution
  - [ ] Execute creates tables/data in sandbox

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** - Verify all 7 tasks completed
- [ ] F2. **Manual QA** - Full end-to-end test of detail page
- [ ] F3. **Regression Check** - Ensure create sandbox still works

---

## Success Criteria

### Verification Commands
```bash
# Start the app
pnpm dev

# Test flow:
# 1. Go to /dashboard/sandboxes
# 2. Click "New Sandbox" 
# 3. Create a sandbox
# 4. Verify detail page shows REAL data (not dummy)
# 5. Test Extend button
# 6. Test SQL Console with a query
# 7. Verify tables appear in Tables tab
```

### Final Checklist
- [ ] All dummy variables removed from $id.tsx
- [ ] All hooks properly wired up
- [ ] No console errors on page load
- [ ] All API calls successful
