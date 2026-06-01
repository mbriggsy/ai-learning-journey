# ai-journey-stats

**Live → https://ai-journey-stats.vercel.app**

A Vercel-hosted visual showcase of the credit data across the monorepo's projects,
measured by the [`project-metrics`](../../tools/project-metrics/README.md) CLI.
Built with Vite 8 + React 19 + TypeScript + GSAP.

**How the numbers are counted** → see [`project-metrics`](../../tools/project-metrics/README.md):
the **tier model** (authored vs. pipeline-generated vs. tool-generated) and exactly what
counts toward the credit total. Figures are computed from git, not hand-entered.

## Setup
    pnpm install

## Scripts
- `pnpm dev` — local dev server (port 5175, exposed on LAN for phone testing)
- `pnpm build` — typecheck + production build to `dist/`
- `pnpm typecheck` — types only
- `pnpm preview` — serve the built `dist/`
- `pnpm refresh` — regenerate `public/data/stats.json` (Phase 2+)

## Stack
Vite 8 · React 19 · react-router 7 (declarative `BrowserRouter`) · GSAP 3.14.2 (+ @gsap/react) · TypeScript 5.9
Fonts: self-hosted Satoshi · Inter · JetBrains Mono (no external CDN)
Deploy: Vercel (`ai-journey-stats.vercel.app`)
