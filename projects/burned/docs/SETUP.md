# Development Environment Setup

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 22+ (LTS) | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| Git | any | `git -v` |

### Install pnpm (if needed)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start game server (wrangler dev — Durable Object on port 8787)
pnpm dev:server

# Start client dev server (Vite — serves both board + player views on port 5173)
pnpm dev
```

Then open:
- **Board (TV):** `http://localhost:5173/board.html`
- **Player (Phone):** `http://localhost:5173/player.html?room=ROOMCODE`

For phone testing during development, use your machine's local IP instead of `localhost` so phones on the same WiFi can connect.

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev:server` | Start wrangler dev server (game server, port 8787) |
| `pnpm dev` | Start Vite dev server (hot reload, port 5173) |
| `pnpm dev:cleanup` | Kill orphan workerd + report port-5173/8787 binders |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | ESLint + CSS lint (import boundary + CSS rules) |
| `pnpm preview` | Preview production build |
| `pnpm verify:bundle` | Verify prod bundle (dev hooks tree-shaken, chunk sizes) |

> Common-use subset. Full script inventory is in `package.json`; playtest harness scripts (`pnpm playtest:*`) are documented in `scripts/playtest/README.md`.

## Key Technologies

- **[partyserver](https://github.com/cloudflare/partyserver)** (the library PartyKit became post-acquisition) + **wrangler** — real-time multiplayer via Cloudflare Workers Durable Objects. Handles rooms, WebSocket connections, and server-side game logic.
- **[React 19](https://react.dev/)** — UI framework for both board and player views.
- **[Framer Motion](https://motion.dev/)** — animation library. Card flips, hand management, theatrical reveals.
- **[Vite 8](https://vite.dev/)** — build tool. Multi-page app with separate board and player entry points.
- **[Vitest](https://vitest.dev/)** — unit testing. Same config pattern as UMB.
- **[Playwright](https://playwright.dev/)** — E2E testing. Multi-browser context for simulating board + phone clients.

## Deployment

BURNED is **live**:

- **Client:** [burnedgame.pages.dev](https://burnedgame.pages.dev/board) (Cloudflare Pages)
- **Server:** Cloudflare Workers + Durable Objects (`burned.briggsy007.workers.dev`)
- **Cost:** $0 (free tier)

Deploys run automatically via GitHub Actions (`.github/workflows/deploy-burned.yml`) on every push to `main` that touches `projects/burned/**` — server first, then client. See **[DEPLOY.md](DEPLOY.md)** for the full pipeline, the project-name-vs-subdomain notes, rollback steps, and origin allowlist.

## Troubleshooting

### Phone can't connect to dev server
Make sure your phone and dev machine are on the same WiFi. Use the machine's local IP (e.g., `http://192.168.1.x:5173/player.html?room=ROOMCODE`), not `localhost`.

### Wrangler dev server won't start
Check that port 8787 isn't in use. Run `pnpm dev:cleanup` — kills orphan workerd + reports binders on ports 5173/8787.
