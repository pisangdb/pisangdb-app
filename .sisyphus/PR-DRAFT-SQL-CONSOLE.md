## Ringkasan

Implementasi SQL Console dengan CodeMirror 6 untuk syntax highlighting dan keyboard shortcut (Ctrl+Enter) saat execute query ke sandbox database.

## Issue Terkait

Closes #15

## Perubahan

### SqlEditor Component (`src/components/sql-editor.tsx`)
- Upgrade CodeMirror 6 dengan SQL syntax highlighting
- Support dialect untuk PostgreSQL, MySQL, dan MariaDB
- Tambah `onSubmit` prop untuk keyboard shortcut
- Mod-Enter (Ctrl+Enter / Cmd+Enter) untuk execute query
- Fix value sync issue (prevent editor re-creation on keystroke)
- Support disabled state saat query sedang berjalan

### SQL Console Page (`src/routes/_app/dashboard/console.tsx`)
- Replace `<textarea>` dengan `<SqlEditor>` component
- Wire `onSubmit={handleRun}` untuk keyboard shortcut
- Engine dialect switching berdasarkan selected sandbox

### Sandbox Detail ConsoleTab (`src/routes/_app/dashboard/sandboxes/$id.tsx`)
- Replace `<textarea>` dengan `<SqlEditor>` component di ConsoleTab
- Engine dialect automatically derived dari `sandbox.engine`
- Keyboard shortcut untuk execute query

## Cara Test

1. **Setup**
   ```bash
   pnpm install
   pnpm dev
   ```

2. **Test Syntax Highlighting**
   - Buka http://localhost:3000/dashboard/console
   - Pilih sandbox dari dropdown
   - Ketik query SQL seperti: `SELECT * FROM users WHERE id = 1`
   - Verifikasi keywords (SELECT, FROM, WHERE) berwarna berbeda

3. **Test Keyboard Shortcut**
   - Ketik `SELECT 1 as test;`
   - Tekan Ctrl+Enter (Windows/Linux) atau Cmd+Enter (Mac)
   - Verifikasi query execute dan hasil muncul di tabel

4. **Test Engine Dialect**
   - Buat sandbox dengan engine berbeda (PostgreSQL, MySQL, MariaDB)
   - Buka ConsoleTab di masing-masing sandbox
   - Ketik query - verify dialect-specific highlighting

5. **Test Sandbox Detail Console**
   - Buka http://localhost:3000/dashboard/sandboxes/{id}
   - Klik tab "Console"
   - Test hal yang sama seperti di atas

## Checklist

- [x] `pnpm check` lulus (tidak ada error Biome)
- [ ] `pnpm test` lulus
- [x] Tidak ada non-null assertion (`!`)
- [x] Tidak ada `as any` / `@ts-ignore`
- [x] Sudah review diff sendiri

## Notes

- Backend execute query, safety checks, timeout, dan query_history sudah ada dari PR #11
- PR ini fokus pada frontend: CodeMirror syntax highlighting dan keyboard shortcut