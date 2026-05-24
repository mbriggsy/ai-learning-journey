# Phase 8 — Deploy

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

## 8.1 — Vercel project link
- From `projects/claude-credits/`, `vercel link` (or use Vercel dashboard to import from the GitHub repo)
- Set project name: `claude-credits`
- Framework preset: Vite
- Output directory: `dist`
- Build command: `pnpm build`
- Install command: `pnpm install`

## 8.2 — Auto-deploy on push to main
Vercel's GitHub integration handles this automatically once linked. No GitHub Action needed for the Vercel deploy itself.

## 8.3 — GitHub Action for stats refresh
File: `.github/workflows/refresh-claude-credits.yml` at the monorepo root.

- Trigger: `on: push: branches: [main]` AND `on: schedule: cron: '0 12 * * *'` (daily fallback in case a session ends without a push that touches projects)
- Steps: checkout, install pnpm, build `tools/claude-credit`, run the refresh script (which builds report, strips projectPath, copies editorial assets, writes JSON), commit if changed (with `[skip ci]` to avoid loops), push.

## 8.4 — `vercel.json` for security headers
Copy `projects/undercover-mob-boss/vercel.json` as a starting template. Trim to what claude-credits actually needs (no `/host` rewrites, no WS connect-src, etc.).

## 8.5 — `claude-credits.vercel.app` subdomain
Take it if available. Fall back to `claude-credits-briggsy.vercel.app`.

## 8.6 — `squeaky-clean` integration (optional, v1.1)
Extend the squeaky skill to also run `pnpm refresh` in `projects/claude-credits/` and commit any stats.json delta. Means the site freshens at session-end without waiting for the daily cron.

---

← [Phase 7 — Bottom CTA](phase-7-cta.md) | [Index](README.md) | Next → [Phase 9 — Visual polish](phase-9-polish.md)
