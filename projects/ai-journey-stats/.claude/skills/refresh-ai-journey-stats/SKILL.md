---
name: refresh-ai-journey-stats
description: Regenerate and publish the ai-journey-stats showcase's numbers from local session history. Use when deliberately updating the live site — before sharing it, or after notable work landed across the monorepo. Builds project-metrics, runs `pnpm refresh`, commits the stats.json + asset delta, and pushes (Vercel auto-deploys the committed file). Triggers on "refresh the stats site", "update ai-journey-stats", "publish fresh credits/stats", "refresh the showcase numbers".
---

# Refresh ai-journey-stats

The site's numbers (`public/data/stats.json`) are **born locally and travel as a committed file** — a clean CI runner has no `~/.claude/projects/*.jsonl` session history, so it would produce null tokens and an empty hero (Phase 8 Decision 1). This skill is the deliberate, local regeneration trigger. It is **standalone** — it never touches the global `squeaky-clean` skill (Phase 8 Decision 2 / landmine).

Run it when you *want* the live showcase to reflect current reality: before sharing it, after a notable chunk of work. Between runs, honesty is carried by the rendered "as of <date>" (Decision 9), so a manual cadence is fine.

Paths below are relative to the monorepo root (`C:\Users\brigg\ai-learning-journey`).

## Steps

1. **Build `project-metrics` first** — `pnpm refresh` hard-stops via `assertDistFresh` if the tool's `dist/` is stale or missing (it's gitignored, so a fresh clone has none):
   ```
   pnpm -C tools/project-metrics install
   pnpm -C tools/project-metrics build
   ```

2. **Regenerate the stats** — parses the local session JSONLs + the `~/.project-metrics-projects.yaml` roster, copies referenced assets, strips `projectPath`, runs the in-process publish guard (refuses to write poisoned/secret-leaking JSON), and writes a stable-ordered `stats.json`:
   ```
   pnpm -C projects/ai-journey-stats refresh
   ```

3. **Sanity-check the output before committing** — the whole point is *real, non-null* numbers:
   - `public/data/stats.json` exists and `combined.totalTokensProcessed > 0` (null tokens ⇒ JSONLs/roster not found — do NOT publish an empty hero).
   - `combined.tokenWindowDays` is non-null (the retention window the UI surfaces).
   - `scannedAt` is today (the "as of <date>" the site renders).

4. **Commit the delta + push** — the push IS the deploy trigger (Vercel git integration):
   ```
   git -C C:\Users\brigg\ai-learning-journey add projects/ai-journey-stats/public/data/stats.json projects/ai-journey-stats/public/assets
   git -C C:\Users\brigg\ai-learning-journey commit -m "chore(ai-journey-stats): refresh stats.json — numbers as of <date>"
   git -C C:\Users\brigg\ai-learning-journey push origin main
   ```
   Keep the stats commit as the **last** commit of the push (the `ignoreCommand` only inspects `HEAD^ HEAD`; a buried stats commit can be skipped — Phase 8 Decision 4 / operational rule).

## After pushing

- Vercel auto-deploys the committed file (no CI regenerates data — Decision 1). Watch the deploy; enable Vercel build-failure notifications.
- **Smoke the live site (mandatory, part of the deploy):** both color modes, real non-null hero number, the live `/data/stats.json` matches the just-committed file (a stale CDN copy reads as "the refresh didn't deploy"), no console/network/404. The live eye is the real health check — the deploy is ungated (Phase 8 system-wide impact).

## Do NOT

- **Do NOT move this to CI / a cron.** A clean runner has no session history → null tokens → empty hero. Local-only is load-bearing, not a preference.
- **Do NOT bolt this onto `squeaky-clean`** or any global skill (Decision 2). It stays standalone.
- **Do NOT publish null/zero tokens.** If step 3 shows null, the JSONLs or `~/.project-metrics-projects.yaml` roster weren't found — fix that, don't deploy an empty hero.
