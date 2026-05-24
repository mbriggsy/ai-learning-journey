---
created: 2026-05-24T09:46:48-04:00
deepened:
doc-reviewed:
---

# Phase −1 — Pre-flight verifications

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

Five gaps to resolve before Phase 0 starts.

## −1.1 `claude-credit` tool publishability
Confirms the primary CTA is real ("install + try it"). Check:
- `tools/claude-credit/package.json` — `"private"` field? `publishConfig`? `name`?
- Has it ever been published to npm? (`npm view @scope/claude-credit version` or whatever the name resolves to)
- Is the monorepo public on GitHub?

**Outputs:** decision tree for the CTA copy:
- If published + repo public → CTA reads "`npm i -g claude-credit` then `claude-credit --all`"
- If tool ready but not yet published → publish it before site launch (preferred) OR ship CTA as "watch this space" (fallback)
- If repo private → make it public OR change CTA to point at a public read-only mirror

## −1.2 Project list verification
Current `~/.claude-credit-projects.yaml` lists 9 projects: burned, data-engineering, hooks, pacman, skills, tic-tac-toe, top-down-racer-02, top-down-racer-04, undercover-mob-boss. Confirm by directory walk under `C:/Users/brigg/ai-learning-journey/projects/` (exclude `archive`, `claude-credits` itself for the moment).

Meta-projects to ADD to the config:
- `C:/Users/brigg/ai-learning-journey/tools/claude-credit` — the tool itself
- `C:/Users/brigg/ai-learning-journey/projects/claude-credits` — this site

Final grid count: **9 + 2 = 11**.

## −1.3 Deploy state per project
Confirm which projects have live URLs. Known live (from existing TODO context):
- UMB → undercover-mob-boss.vercel.app
- TDR-02 → top-down-racer-02.vercel.app
- TDR-04 → top-down-racer-04.vercel.app

Unknown — verify with `curl -sI`:
- burned, data-engineering, hooks, pacman, skills, tic-tac-toe

For each: if 200 + `Server: Vercel` (or any 200 from a real domain) → record the URL. Otherwise → no `liveUrl` in editorial config; tile gets no "Try it →" button.

## −1.4 Visual asset inventory per project
For each project, identify the candidate hero visual:
- BURNED: trailer-in-production frame, card art, or arena screenshot
- UMB: deployed-site screenshot
- TDR-04: gameplay screenshot
- Shelved games (H&S, DND archived): salvageable greybox or last-shipped screenshot if any
- Tools/meta: render a clean terminal screencap or hero ASCII

Output: a per-project list of "exists vs needs capture" with file paths. Capture work happens in parallel with Phase 0 code work.

## −1.5 Editorial content draft (Briggsy in the loop)
Each project needs:
- **One-liner** (voice + positioning — Briggsy weighs in)
- **Hook stat** (label + value — editorial pick, can't be auto-derived)
- **2-3 sentence description** for the detail page

Draft a worksheet at `../editorial.md` (i.e., `docs/editorial.md`) with all 11 rows. Pre-fill Claude's draft picks for one-liners + hooks; Briggsy reviews/edits. This unblocks Phase 0.6 (editorial schema).

---

[Index](README.md) | Next → [Phase 0 — Fill data gaps](phase-0-data-gaps.md)
