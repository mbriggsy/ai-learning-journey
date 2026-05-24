# Phase 5 — Project detail page

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

Route: `/project/:projectName`

Sections (top to bottom):

1. **Hero** — Project name in massive type (clamp scaled, matches landing hero rules). Subtitle "Born N days ago · M commits · K files." One-liner under the title. Hero visual takes the right ~40% of the viewport on desktop; stacks BELOW the title block on mobile/narrow (`< 768px`), full container width.
2. **AUTHORED BY block** (`AuthoredByBlock.tsx`) — combines `linesByAuthor` ([Phase 0.4](phase-0-data-gaps.md#04--linesbyauthor-in-gitstats-co-authored-by-aware)) + `tokens` ([Phase 0.5b](phase-0-data-gaps.md#05b--tokens-block-claude-code-session-jsonl-parser)). Renders as cold type with two columns per author:
   ```
   AUTHORED BY
     Claude       312,400 lines      147M tokens
     Briggsy        8,200 lines      [you don't tokenize]
   ```
   Tabular nums everywhere. The "you don't tokenize" cell is the wink — human typing isn't tokenized, and admitting that openly is on-voice for the AI-peer audience. Footnote on hover for the lines column: "attributed to primary + each co-author; totals can exceed lifetime adds when commits are co-authored." Footnote on hover for the tokens column: "session JSONL retention window — see TOKENS CONSUMED section below for full window."
3. **TOKENS CONSUMED block** (`TokensBlock.tsx`) — between AUTHORED BY and Description. Renders as:
   ```
   TOKENS CONSUMED          147,234,891
   ACROSS                   N sessions · M days of retention
   BY MODEL
     Opus 4.7               112M    74 sessions
     Sonnet 4.6              31M    18 sessions
     Haiku 4.5              4.5M    12 sessions
   ```
   Window footnote in muted small caps below: "session JSONLs rotate after ~30 days · this is a floor, not a lifetime total." Window dates spelled out explicitly: "April 7 → May 24". Per-model rows are simple typographic table — no chart, no flourish.
4. **Description** — `editorial.description` (2-3 sentences). Set in larger body type, restrained line length (~58ch).
5. **Asset donut** (`AssetDonut.tsx`) — Uses `assetBytesByKind`. **THIS is the DrawSVG reveal — the single visual flourish on the detail page.** Legend with byte amounts. On mobile: renders square at full container width (capped ~360px) with legend stacking below; on desktop: legend sits beside the donut.
6. **Cadence sparkline** (`CadenceSparkline.tsx`) — `git.timeline.commitsByDay`. Quiet, low-amplitude line/area chart. No axes labels, no gridlines — just the shape of activity over time. ~80px tall, full container width on all viewports. Three callouts below it pulled from `timeline`:
   - "ACTIVE DAYS · 47"
   - "PEAK · Apr 22 · 47 commits"
   - "LARGEST COMMIT · +4,200 lines"
7. **Tier breakdown** — Horizontal stacked bar charts per tier, animated fill on scroll-into-view (simple CSS transition, no GSAP needed). Categories → subcategories drill-down on hover.
8. **Iteration story** — `assetModificationEvents` + `discardedAssetFiles` + `iterationProxyTotal` as cold stat callouts. Each tied to a single short caption line.
9. **Top subcategories** — Uses `topSubcategories` ([Phase 0.3](phase-0-data-gaps.md#03--add-topsubcategories-pre-computed)). Five callout cards.
10. **Gallery** (if `editorial.gallery` non-empty) — simple grid, click to lightbox. No carousel.
11. **Try it →** button — if `editorial.liveUrl` present. Bottom-right or centered after gallery.

Back-to-grid link at top-left, persistent.

---

← [Phase 4 — Project grid](phase-4-grid.md) | [Index](README.md) | Next → [Phase 6 — About page](phase-6-about.md)
