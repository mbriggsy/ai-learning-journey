# Development Environment Setup

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 22+ (LTS) | `node -v` |
| pnpm | 9+ | `pnpm -v` |
| Git | any | `git -v` |

### Install pnpm (if needed)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Quick Start

> **Note:** Project scaffold not yet created. These instructions will work after Phase 1 is complete.

```bash
# Install dependencies
pnpm install

# Start dev server (serves both board + player views)
pnpm dev

# In a separate terminal, start PartyKit dev server
pnpm partykit:dev
```

Then open:
- **Board (TV):** `http://localhost:5173/board.html`
- **Player (Phone):** `http://localhost:5173/player.html`

For phone testing during development, use your machine's local IP instead of `localhost` so phones on the same WiFi can connect.

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start Vite dev server (hot reload) |
| `pnpm partykit:dev` | Start PartyKit local dev server |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm build` | Production build |
| `pnpm test:e2e` | End-to-end tests (Playwright) |

## Key Technologies

- **[PartyKit](https://partykit.io/)** — real-time multiplayer via Cloudflare Workers. Handles rooms, WebSocket connections, and server-side game logic. Same as UMB.
- **[React 19](https://react.dev/)** — UI framework for both board and player views.
- **[Framer Motion](https://motion.dev/)** — animation library. Card flips, hand management, theatrical reveals.
- **[Vite 8](https://vite.dev/)** — build tool. Multi-page app with separate board and player entry points.
- **[Vitest](https://vitest.dev/)** — unit testing. Same config pattern as UMB.
- **[Playwright](https://playwright.dev/)** — E2E testing. Multi-browser context for simulating board + phone clients.

## Deployment

> **Note:** Deployment pipeline not yet configured. Will be set up in Phase 6.

- **Client:** Vercel (or Cloudflare Pages) — auto-deploy on push to main
- **Server:** PartyKit deploy via GitHub Actions (same pattern as UMB)

## Troubleshooting

### Phone can't connect to dev server
Make sure your phone and dev machine are on the same WiFi. Use the machine's local IP (e.g., `http://192.168.1.x:5173/player.html`), not `localhost`.

### PartyKit dev server won't start
Check that port 1999 (PartyKit default) isn't in use. Kill any orphaned processes: `npx kill-port 1999`.
