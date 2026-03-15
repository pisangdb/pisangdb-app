# PisangDB 🍌

> **Ephemeral databases, ready in seconds.** Isolated PostgreSQL, MySQL, and MariaDB sandboxes — copy the connection string, build and test, then let auto-cleanup handle the rest.

---

## What is PisangDB?

PisangDB is a SaaS tool for developers who need a production-like database **immediately**, without installing anything locally. You pick the engine and retention time, get instant credentials, and the database cleans itself up when the TTL expires.

**Free tier includes:**
- 5 active sandboxes
- 100 MB per sandbox
- Retention from 1 hour up to 7 days
- 3 engines: PostgreSQL 16, MySQL 8, MariaDB 11
- SQL Console (browser-based)
- AI Seeder — 30 requests/day (powered by Gemini)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR + file-based routing) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Router | [TanStack Router](https://tanstack.com/router) |
| Icons | [Lucide React](https://lucide.dev/) |
| Toast | [Sonner](https://sonner.emilkowal.ski/) |
| Linter/Formatter | [Biome](https://biomejs.dev/) |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app runs at `http://localhost:3000`.

---

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── app-sidebar.tsx  # Dashboard sidebar
│   ├── auth-branding-panel.tsx
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   ├── forgot-password-form.tsx
│   ├── legal-page-layout.tsx
│   └── logo.tsx
├── routes/              # File-based routes (TanStack Router)
│   ├── __root.tsx       # Root layout, Toaster, 404 page
│   ├── index.tsx        # Landing page
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── _app.tsx         # Dashboard layout with sidebar + breadcrumbs
│   └── _app/
│       └── dashboard/
│           ├── index.tsx        # Dashboard home
│           ├── sandboxes.tsx    # Sandbox list
│           ├── sandboxes/
│           │   ├── new.tsx      # Create sandbox form
│           │   └── $id.tsx      # Sandbox detail page
│           ├── console.tsx      # SQL Console
│           ├── ai-seeder.tsx    # AI Seeder (Gemini)
│           ├── settings.tsx     # User settings
│           ├── account.tsx      # Account management
│           └── help.tsx         # Help / docs
├── styles.css           # Global styles + Tailwind
└── lib/
    └── utils.ts         # cn() helper
```

---

## Available Scripts

```bash
pnpm dev       # Start dev server with HMR
pnpm build     # Build for production
pnpm lint      # Run Biome lint
pnpm format    # Run Biome format
pnpm check     # Run Biome lint + format check
pnpm test      # Run Vitest
```

---

## Development Notes

### Routing
All routes use TanStack Router's **file-based routing**. The `_app.tsx` layout wraps all dashboard routes and provides the sidebar, breadcrumbs, and tooltip context.

### Auth
Auth pages (`/login`, `/register`, `/forgot-password`) use TanStack Router's **route groups** via the `(auth)/` folder (does not affect the URL).

### Dummy Data
All dashboard data (sandboxes, stats, SQL results) is **static dummy data** — no backend is connected yet. Backend integration is the next major phase.

### Toasts
Global toast notifications use **Sonner** (`<Toaster />` in `__root.tsx`). Import `toast` from `"sonner"` anywhere in the app to trigger notifications.

### Linting & Formatting
This project uses **Biome** exclusively. Do not install ESLint or Prettier.

```bash
# Auto-fix all issues
pnpm biome check --write src/
```

---

## Roadmap

- [ ] Backend: auth (sign in, register, JWT)
- [ ] Backend: sandbox provisioning (PostgreSQL, MySQL, MariaDB containers)
- [ ] Backend: TTL auto-cleanup scheduler
- [ ] Backend: SQL Console execution API
- [ ] Backend: AI Seeder (Gemini API integration)
- [ ] Real-time: sandbox status updates via WebSocket or polling
- [ ] Billing: post-beta paid plans

---

## License

MIT — see [LICENSE](./LICENSE).
