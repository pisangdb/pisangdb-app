# Draft: SQL Console CodeMirror Implementation

## Requirements (from Issue #15)

### Acceptance Criteria
- [x] User bisa ketik SQL query di editor (dengan syntax highlighting) → **NEEDS UPDATE**
- [x] Execute query ke sandbox database (bukan admin!)
- [x] Tampilkan hasil dalam bentuk tabel (kolom + rows)
- [x] Tampilkan execution time dan rows affected
- [x] Safety: block DROP DATABASE, ALTER SYSTEM, GRANT, REVOKE
- [x] Timeout: 30 detik auto-kill
- [x] Simpan ke query_history (50 query terakhir per sandbox)

### What's Already Done
- Backend `$executeQuery` - ✅ Complete
- Backend safety checks (FORBIDDEN_COMMANDS) - ✅ Complete
- Backend timeout (30000ms) - ✅ Complete
- Backend query history - ✅ Complete
- Frontend sandbox selector - ✅ Complete
- Frontend query editor (textarea) - ⚠️ Needs CodeMirror
- Frontend results table - ✅ Complete
- Frontend execution time display - ✅ Complete
- Frontend query history - ✅ Complete

### What's Missing
- **Syntax highlighting** - Replace `<textarea>` with `<SqlEditor>` component
- **Ctrl+Enter / Cmd+Enter** - Submit query shortcut in editor

## Technical Decisions

### SqlEditor Component
File already exists: `src/components/sql-editor.tsx`
- Has SQL syntax highlighting with dialect support
- Has line numbers
- Has placeholder text
- **Missing**: `onSubmit` prop for Ctrl+Enter shortcut

### Changes Required

1. **Update SqlEditor component** - Add `onSubmit` prop
   - Add keymap for `Mod-Enter` (Ctrl+Enter on Windows, Cmd+Enter on Mac)
   - Call `onSubmit` callback when shortcut pressed

2. **Update console.tsx** - Replace `<textarea>` with `<SqlEditor>`
   - Import `SqlEditor` from `#/components/sql-editor`
   - Replace `<textarea>` with `<SqlEditor>`
   - Pass `engine` prop based on selected sandbox's engine
   - Pass `onSubmit` prop for run query

## Files to Modify

1. `src/components/sql-editor.tsx`
   - Add `onSubmit?: () => void` prop
   - Add keymap for Mod-Enter shortcut

2. `src/routes/_app/dashboard/console.tsx`
   - Import SqlEditor
   - Replace textarea with SqlEditor
   - Pass engine prop based on sandbox
   - Pass onSubmit prop for handleRun

## Dependencies
Already installed:
- @codemirror/commands: ^6.10.3
- @codemirror/lang-sql: ^6.10.0
- @codemirror/language: ^6.12.2
- @codemirror/state: ^6.6.0
- @codemirror/view: ^6.40.0

## Scope Boundaries

### INCLUDE
- Add onSubmit prop to SqlEditor
- Replace textarea with SqlEditor in console.tsx
- Pass engine prop for dialect-aware highlighting
- Test with all three engines (PostgreSQL, MySQL, MariaDB)

### EXCLUDE
- AI Seeder changes (separate component)
- Sandbox detail page changes
- Any backend changes (already complete)