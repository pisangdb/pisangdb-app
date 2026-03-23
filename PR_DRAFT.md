# Pull Request: Production Deployment Fixes

## Ringkasan

Fix production deployment issues: React hydration error (#418), 404 asset errors, SSR build failures, automated database migrations, and container caching problems.

## Issue Terkait

Fixes production deployment errors:
- React hydration mismatch causing blank pages
- 404 errors for JS/CSS assets with stale hashes
- SSR build error due to manualChunks configuration
- Missing database tables on fresh deploy
- Container caching preventing updates

## Perubahan

### 🔧 Build & Asset Fixes (vite.config.ts)
- Add `base: "/"` untuk proper asset path resolution di production
- Remove `manualChunks` yang menyebabkan SSR build error (React externalized)
- Fix asset hashing mismatch antara build dan runtime

### 🔄 Hydration Fix (src/routes/__root.tsx)
- Fix QueryClient singleton pattern menggunakan `useState` dengan lazy initialization
- Add `suppressHydrationWarning` untuk mengurangi noise di console
- Import React untuk proper JSX transformation
- Format theme script untuk better readability

### 🚀 CI/CD Improvements (.github/workflows/deploy.yml)
- Add automated database migrations menggunakan `drizzle-kit push`
- Add `--force-recreate --remove-orphans` untuk force container recreation
- Add `BUILD_TIMESTAMP` environment variable untuk cache busting
- Add container labels untuk tracking build version
- Copy `docker-compose.yml` menggunakan SCP untuk single source of truth

## Cara Test

### 1. Local Build Test
```bash
# Clean build
rm -rf .output dist
pnpm build

# Verify no SSR errors
# Check .output/server/index.mjs exists
```

### 2. Production Deploy Test
```bash
# Trigger deploy
gh workflow run deploy.yml --ref main

# Atau push ke dev untuk test
```

### 3. Verification Steps
- [ ] Buka browser devtools → Network tab → verify no 404 errors untuk assets
- [ ] Console tidak ada React error #418
- [ ] Page load normal tanpa blank screen
- [ ] Health check endpoint: `/api/health` returns 200
- [ ] Database tables tersedia: `\dt` di psql

### 4. Cache Test
```bash
# SSH ke VPS
docker compose ps
# Verify container recreated dengan IMAGE baru

# Check Caddy logs
sudo journalctl -u caddy -f
```

## Deployment Notes

**Caddyfile harus di-update manual di VPS:**
```caddyfile
pisangdb.com {
    header {
        Cache-Control "no-cache, no-store, must-revalidate"
        Pragma "no-cache"
        Expires "0"
    }
    reverse_proxy pisang-app:3000
}
```

**Restart Caddy:**
```bash
sudo systemctl restart caddy
```

## Checklist

- [x] `pnpm check` lulus (tidak ada error Biome)
- [x] Build production berhasil tanpa SSR error
- [x] Tidak ada non-null assertion (`!`)
- [x] Tidak ada `as any` / `@ts-ignore`
- [x] Sudah review diff sendiri

## Breaking Changes

None - ini adalah patch fixes untuk production yang sudah ada.

## Post-Merge Actions

1. Merge PR ke `main`
2. Deploy akan trigger otomatis via GitHub Actions
3. Monitor deployment logs
4. Verify site accessible tanpa errors

---

**Hotfix untuk production deployment. 🍌**
