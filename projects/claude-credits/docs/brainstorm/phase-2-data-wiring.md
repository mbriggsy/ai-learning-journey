# Phase 2 — Data wiring

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

## 2.1 — `scripts/refresh-stats.ts`
- Import `buildMultiProjectReport` directly from `claude-credit` (avoid subprocess overhead)
- Strip `projectPath` from each `project` entry
- Write to `public/data/stats.json` with stable key ordering for deterministic diffs (sort keys alphabetically at each level OR use `json-stable-stringify`)
- Add `package.json` script: `"refresh": "tsx scripts/refresh-stats.ts"`

## 2.2 — `scripts/copy-editorial-assets.ts`
- Walk `report.projects[*].editorial.heroImage` + `editorial.gallery[]`
- For each path: copy from `<original project root>/<heroImage>` to `public/assets/<projectName>/<basename>`
- Rewrite the editorial paths in the in-memory report to the new public-relative paths (`/assets/<projectName>/<basename>`) before writing `stats.json`
- Runs as part of `refresh` script (single composite invocation)

## 2.3 — `src/hooks/useStats.ts`
- Fetch `/data/stats.json` on mount
- Cache via context provider so child components don't re-fetch
- Type as `MultiProjectReport` (re-export from claude-credit types)

## 2.4 — `src/types.ts`
- Re-export `MultiProjectReport`, `ProjectReport`, `GitStats`, `ProxyStats`, `EditorialContent` from the published `claude-credit` package types
- Add UI-only derived types if needed (`ProjectCardData`)

---

← [Phase 1 — Scaffold](phase-1-scaffold.md) | [Index](README.md) | Next → [Phase 3 — Hero](phase-3-hero.md)
