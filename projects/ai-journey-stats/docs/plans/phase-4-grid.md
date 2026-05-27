---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T19:21:57-04:00
doc-reviewed: 2026-05-24T19:48:00-04:00
coded: 2026-05-25T16:00:14-04:00
code-reviewed: 2026-05-25
---

# Phase 4 — Project grid

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. Read [phase-1-scaffold.md](phase-1-scaffold.md) (the motion foundation + semantic tokens this phase consumes), [phase-2-data-wiring.md](phase-2-data-wiring.md) (the `useStats()` non-null contract + field-level null discipline), [phase-3-hero.md](phase-3-hero.md) (the `src/lib/format.ts`, `src/components/<Name>/` folder, and `useGSAP` patterns this phase REUSES), and [phase-0-data-gaps.md](phase-0-data-gaps.md) (the data contract this phase renders against — `editorial`, `kind`, `git.projectAgeDays`, `grandTotals`, `archiveCollective`). This file is the decisions-not-code recipe for the project grid below the hero.

Phase 4 lands the **project grid** — the showcase's editorial spine. Below the hero, a grid of glass tiles: the **9 active** project tiles, then one muted **the misses** tile (the shelved archive, collapsed) — **10 surfaces total** (9 active + 1 archive coda). Each project tile is a glass card with a hero image, the project name, an age ribbon, a one-liner, and ONE gold hook stat — the **whole tile is one clean click → the detail page**, no buttons (clean-tile decision, ideation §3). Tiles reveal as they scroll into view. The grid is the first **per-project** consumer of `useStats()`, and it establishes the component + motion patterns Phase 5's detail page inherits.

The bar for "Phase 4 done": every tile renders the real editorial content with no `NaN`/`undefined`/broken-`<img>`; the grid + divider read as a deliberate editorial sequence (the active projects → the misses coda), never a robotic AI card-matrix; tiles reveal-on-scroll with a weighted stagger and lift on hover with mechanical-key weight; the grid holds at 360–430px as a DELIBERATE single column (not a stretched-desktop fallback); both light and dark pass the water-bead bar; `prefers-reduced-motion` shows every tile in its final visible state with no motion; and — the load-bearing failure mode — **if the motion layer dies, every tile is still visible** (no blank grid). **Eye-on-browser in BOTH modes is the gate — green tests are not enough** (manifesto).

---

## Decisions locked at this deepening (read before executing)

1. **NO tier-proportion bar on the tile** (ATC call, 2026-05-24). The stub specified a `TierBar` showing authored / pipeline-generated / tool-generated proportions. **Cut.** Rationale (Briggsy): the whole site is "fully autonomous AI built this" — whether Claude typed it, ran a tool, wrote a tool to do it, or called Gemini, **it's all AI**. The authored/pipeline/tool split is an internal `project-metrics` accounting distinction that means nothing to a stranger looking at a tile; on a tile it's a muddy chart competing with the one number that should pop. (It was also un-renderable honestly: BYTES make the bar read ~95% pipeline because media dwarfs code; LINES is a dead end — `GrandTotals` has no `pipelineGeneratedLines`/`toolGeneratedLines`; FILES was the only non-lying metric, and even that earns no place on the tile.) The taxonomy concept survives where a curious peer goes to geek out — the **About page** explainer (Phase 6) and optionally the **detail page** (Phase 5) — not the grid. *No `TierBar` component is built in Phase 4.* (If Phase 5 detail wants the full three-tier breakdown at large scale, it builds it there — forward-flagged in Cascade.)

2. **NO authorship split on the tile either.** The genuinely on-thesis split is Claude-vs-Briggsy (human wrote ~0 lines), not authored-vs-pipeline. But as a per-tile viz it's a solid 100%-Claude block — a bar that's always full is a non-statement. The authorship truth is a **headline-grade site claim** (hero / About), not tile texture — and it carries a data landmine (git attributes commits to `mbriggsy`, Claude rides as `Co-Authored-By`, so naive `linesByAuthor` credits the human — the inverse of the truth). Both are out of scope for Phase 4. **Authorship is INTENTIONALLY not a site feature** — silent, no proof, show the work not a who-wrote-what scoreboard (ideation §11, locked 2026-05-24). The hero's magnitude is the flex; it makes no authorship claim.

3. **The tile is: hero image · name + age ribbon · one-liner · gold hook stat.** Four elements, generous negative space, ONE accent moment (the gold hook stat), **NO buttons** — the whole tile is one clean click → the detail page (clean-tile decision, ideation §3, Briggsy 2026-05-25). Reading order top-to-bottom (see "The tile contract" below). The per-project live/source links move OFF the tile and live ONLY on the detail page (Phase 5) — a button inside a clickable card is a competing click target; a calm, uniform grid is more on-bar and on-thesis for a body-of-work showcase. This is cleaner and more on-bar than the stub's seven-element tile.

4. **Sort within each group by authored substance — measured as `grandTotals.authoredLines` descending** (ATC call, 2026-05-24), tie-broken by `projectName` ascending. "Authored substance" means the single `authoredLines` metric, NOT a weighted composite. This is the intended NARRATIVE lead: the biggest builds lead the grid, which reads as "look at the scale of what got built" — on-thesis for an autonomy showcase. Three supporting properties: (a) **rotation-immune** — `grandTotals` is file-classification-derived from a full scan, not a `linesByAuthor` git sum, so it is permanent AND **immune to the Co-Authored-By attribution inversion** flagged in Decision 2 (it never asks "who" wrote a line, only "what tier" the file is); (b) reflects the total build; (c) diff-stable via the `projectName` tie-break (equal-rank tiles never reshuffle on refresh). *Rejected: `grandTotals.allBytes` (the stub's key) — dominated by pipeline media, ranks by "biggest trailer." Rejected: tokens desc — 30-day-window-bounded (JSONL rotation), ranks by "recently active."* **Edge — pure-pipeline / zero-authored project** (`authoredLines === 0`): sinks to the bottom of its group, then alphabetical by name. Acceptable (no current project is pure-pipeline); if one is ever added and this reads wrong, revisit with a secondary key.

5. **The grid renders ONE group: the active `projects[]`** (ATC call, 2026-05-24 — meta tiles CUT). The `project-metrics` tool and the `ai-journey-stats` site itself are **excluded from the grid AND from totals** (ideation §7) — there is no meta band, no "the tools" divider, and Phase 4 does NOT consume `report.meta`. The stub said "meta-projects sort to the end regardless of size"; obsolete — there are no meta tiles to sort. Render order is just: sorted `projects[]` → "the misses" divider → the archive coda tile. No interleave-and-resort, no sort-by-kind logic.

6. **Shelved projects = ONE collective "the misses" tile, not individual tiles** (ATC-confirmed, honoring Phase 0 Decision #3). Shelved projects live ONLY in `report.archiveCollective` (a single rolled-up `ArchiveCollective` block); archive entries never appear in `projects[]` (and there is no per-project `kind` field — Phase 0 dropped it). The grid renders ONE muted `ArchiveTile` from `archiveCollective` (when non-null) — "N games, tried and shelved." It reads as an intentional coda, not broken tiles. *(Phase 0 deliberately kept `EditorialContent.status: 'shelved'` in the schema so Phase 5 CAN add per-archive detail pages later without a migration — but v1 ships the collective tile.)* This supersedes ideation §6's "both appear with a marker" wording — reconciled in Cascade.

7. **ScrollTrigger is registered in `src/motion/gsap-context.ts`** (Phase 1 Decision 3: "each later phase registers the plugin it introduces"). Phase 4 is the first ScrollTrigger consumer in ai-journey-stats (the hero fires on mount; the grid is below the fold). Add `ScrollTrigger` to the existing `registerPlugin` call. *Bundle note (explicit, not silent):* `gsap-context.ts` is a boot side-effect import (`main.tsx`), so ScrollTrigger (~25 KB min from GSAP 3.14) lands on the entry chunk for every route — including About, which never scroll-reveals. Accepted for v1: the grid is on the Landing (entry) route anyway, so the first-paint delta is unavoidable there; the only "waste" is About/detail also carrying it. A Phase 9 route-level code-split (or a dynamic `import('gsap/ScrollTrigger')` inside `ProjectGrid`'s module) is the optimization if the bar suffers. Stated as a decision, not an accident.

8. **The P0 invisible-content guard is load-bearing** (architecture-strategist + emil + GSAP docs converge). Reveal-on-scroll sets tiles hidden then animates them visible. Ways that becomes a permanently-blank grid, and the guard for each:
   - **(a) Dead motion layer** (JS error, ScrollTrigger absent, trigger never fires): the hidden initial state MUST be applied by `gsap.set(... { autoAlpha: 0 })` **in JS**, NEVER as a CSS `opacity: 0` default. CSS default = visible; JS *removes* visibility then animates it back. A dead motion layer then degrades to "all tiles visible, no animation" — the safe failure. (Phase 1's CSS reduced-motion net zeroes `animation-duration`/`transition-duration` but does NOT touch `opacity` — another reason the hidden state can't live in CSS.) **Limit:** this guards the import-absent / never-fired case, not a runtime throw AFTER `gsap.set` ran. So `gsap.set` is the FIRST statement in the motion branch and the `batch` is created immediately after with no throwing logic between them (Decision 9) — minimizing the window where a throw could leave tiles hidden.
   - **(b) Reduced motion:** the `prefersReducedMotion()` branch renders tiles at FINAL visible state and returns BEFORE any `gsap.set` hidden state — never apply the hidden from-state under reduced motion (mirror Phase 3's hero branch exactly).
   - **(c) Grid fits the viewport / tiles above the fold:** `ScrollTrigger.batch(start: 'top 85%', once: true)` fires already-in-view tiles on mount's `ScrollTrigger.refresh()` — verify the top row reveals on load with no scroll, on both a tall grid and a short one, **and in dev (StrictMode active), not only the prod preview** (Decision 9 StrictMode note).

9. **Reveal via `ScrollTrigger.batch`, not per-element triggers** (verified against GSAP AI-skills docs via Context7, 2026-05-24). Everything below lives INSIDE one `useGSAP(() => {…}, { scope: gridRef })` block so the dev StrictMode double-invoke reverts the `gsap.set` and kills the batch cleanly (mirror Phase 3's HeroCounter):
   - `gsap.set('[data-tile]', { autoAlpha: 0, y: 40 })` — hidden state in JS (Decision 8a).
   - `ScrollTrigger.batch('[data-tile]', { start: 'top 85%', once: true, onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: duration.reveal, ease: 'weighted-arrive', stagger: stagger.tiles, overwrite: true }) })`.
   - **`refreshInit` y-reset (load-bearing) WITH explicit cleanup:** `const resetTileY = () => gsap.set('[data-tile]', { y: 0 }); ScrollTrigger.addEventListener('refreshInit', resetTileY)` **and `return () => ScrollTrigger.removeEventListener('refreshInit', resetTileY)` from the `useGSAP` callback.** The hidden `y: 40` offset displaces each tile's measured top by 40px during `refresh()`, so `start: 'top 85%'` fires at the wrong scroll position (and compounds the stale-position bug Decision 10 fixes). `batch` cannot take `invalidateOnRefresh`, so `refreshInit` is the only mechanism to revert the offset during measurement. `autoAlpha` (opacity/visibility) doesn't affect layout, so only `y` needs resetting. (This is the GSAP batch advanced-example pattern.) **The `removeEventListener` is mandatory:** `ScrollTrigger.addEventListener` registers on GSAP's GLOBAL event bus — `useGSAP`/context revert does NOT remove it (it only reverts context-created tweens/triggers; see Phase 3's explicit `removeEventListener` pattern, phase-3 §619-620). Without cleanup the StrictMode double-invoke leaks a second `resetTileY` listener that fires on every later `refresh()`, closing over torn-down refs.
   - **StrictMode note:** the `gsap.set` + `batch` revert via the `useGSAP` scope, BUT the `refreshInit` listener does NOT (it's global — hence the explicit `removeEventListener` above). Verify the top row is visible after mount in **dev** (StrictMode on) AND prod preview, AND that exactly one `refreshInit` listener survives the dev double-invoke.

10. **`ScrollTrigger.refresh()` self-heals positions after fonts + layout settle, with NO hang risk** (feasibility + adversarial). Hero images and the display font load AFTER first paint and shift tile Y-positions → triggers at stale positions. The refresh must ALWAYS fire (it must not be gated on per-image `load` events, because the type-forward variant has zero `<img>` elements, and a broken image never fires `load`). Concrete shape, co-located in the grid's `useGSAP` block:
    ```
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))])
      .then(() => requestAnimationFrame(() => ScrollTrigger.refresh()))
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })  // image-settle catch-all
    ```
    The `Promise.race` against a 1500ms timeout guarantees the refresh fires even if `document.fonts.ready` stalls (a missing/404 self-hosted woff2 still resolves it, but a pending FontFaceSet otherwise wouldn't). `window load` catches image settling without per-image listeners. Both go through `ScrollTrigger.refresh()`, which is idempotent.
    - **The refresh race must run UNCONDITIONALLY** — it must NOT be gated behind the `isEmpty` "render nothing" path or on `[data-tile]` existing. `ScrollTrigger.refresh()` is global, and a **downstream consumer (Phase 7's close beat) depends on this refresh to position ITS own reveal** (it deliberately does not re-roll the race — [phase-7-cta.md](phase-7-cta.md) Decision 5). Put the race in `ProjectGrid`'s `useGSAP` ahead of / independent of any `isEmpty` early return, so even a (theoretical) empty grid still heals every trigger on the page. On this site the 10-surface grid is never genuinely empty, so this is defense-in-depth — but the close's coupling to it must not rest on an unstated assumption.

11. **emil motion calls (baked, not deferred to Phase 9):** hover lift = `translateY(-4px)` + shadow swap (`--shadow-tile` → `--shadow-hover`) + the hero image scaling `1.04` inside an `overflow: hidden` frame — animate **transform + opacity/shadow only** (GPU), `ease.press` (`weighted-press`), `duration.hover` (0.25s) in, faster out; gated behind `@media (hover: hover) and (pointer: fine)` so touch never traps it. The clickable tile gets `:active { transform: scale(0.985) }` press feedback — **intentionally ungated** (touch tap SHOULD show press feedback; verify it works on touch). Reveals use `autoAlpha` + small `y` (40→0), **never `scale(0)`** (emil). Stagger `0.06` (60ms) sits in emil's 30–80ms band.

12. **`/frontend-design` + `/emil-design-eng` both fired at this deepening** (Briggsy's "as appropriate"). Composition/hierarchy/negative-space + anti-AI-card-grid from frontend-design; hover-feel/restraint/reduced-motion/transform-opacity-only from emil. Their calls are baked into the recipe below, not deferred to Phase 9.

13. **`clsx` gets its first real use here.** Phase 3 installed `clsx@^2.1.1` but never used it. Phase 4's tile has genuine conditional classes (`has-image` vs `type-forward`, `has-link`, muted archive) — `import clsx from 'clsx'`.

14. **NO `TileShell` shared-chrome component for v1.** The project tile chrome (glass, border, radius, shadow) is fully token-driven (`--surface-elevated`, `--border-subtle`, `--radius-tile`, `--shadow-tile`) so it matches across `ProjectTile` and `ArchiveTile` by construction, without a shared wrapper. *Considered and rejected:* extracting a `TileShell` — premature for two consumers whose chrome is already token-identical, and the archive tile is non-interactive (no shared hover behavior to host). Revisit only if the two tiles' chrome drifts.

15. **The archive "misses" tile is NON-interactive in v1** (no single `/project/:name` target — it's a collective; per-archive detail is a Phase 5 option). Static muted coda — no hover, no `:active`, no link. This is why `ArchiveTile` is its own component (Decision 6), not a `ProjectTile` variant: `ArchiveCollective` has no `editorial`/`git`/`grandTotals`/`tokens`, so forcing it through `ProjectTile` means a union-typed prop with pervasive `kind === 'archive'` branches.

16. **The whole tile is a single nav `<Link>` to the detail page via the stretched-link pattern** (clean-tile decision, ideation §3 — the tile has NO buttons, so there's no nested-link problem to design around). Canonical accessible card pattern: the **project name** is the tile's only `<Link to={`/project/${projectName}`}>`; its `::after { content: ''; position: absolute; inset: 0 }` stretches the hit-target over the whole card (`.tile { position: relative }`). Result: ONE nav link per tile, valid, keyboard-reachable, the whole card clickable with a visible focus ring. (Accepted minor tradeoff: text selection across the card is suppressed by the stretched overlay — fine for a tile.) *History: an earlier draft put a per-tile `LiveLinkButton` riding above the stretched `::after` to dodge a link-inside-a-link; the clean-tile decision removed the button entirely, so that coexistence complexity is gone — one link per tile.*

---

## Current state (verified at deepening, 2026-05-24)

**Data contract this phase reads (post-Phase-0 — see [phase-0-data-gaps.md](phase-0-data-gaps.md) Batch A):**
- `useStats()` returns a NON-NULL `MultiProjectReport` (Phase 2). Top-level: `{ projects: ProjectReport[], archiveCollective: ArchiveCollective | null, combined, scannedAt }`. Phase 4 reads only `projects` + `archiveCollective` (meta tiles cut, ideation §7 — Phase 4 does NOT consume `report.meta`, which is **totals-only**: scanned + summed into `combined`, but no tiles). (Non-null does NOT mean non-empty — see the empty-grid guard.)
- `ProjectReport` (per tile): `projectName: string`, `editorial: EditorialContent | null`, `grandTotals: GrandTotals` (has `authoredLines`, `authoredFiles`, `authoredBytes`, `pipelineGeneratedFiles/Bytes`, `toolGeneratedFiles/Bytes`, `allFiles`, `allBytes`), `git: GitStats` (has `projectAgeDays: number | null`).
- `EditorialContent`: `{ oneLiner: string, hookStat: { label: string; value: string }, heroImage: string | null, liveUrl: string | null, repoUrl: string | null, status: 'active' | 'shelved', description: string, gallery: string[], largestCommitCaption? }`. `heroImage` is rewritten to `/assets/<projectName>/<base>` by Phase 2's refresh (or `null`). (Phase 0 reduced the `status` enum to these two values — the `'meta'` value is gone; meta entries carry `editorial: null` and get no tile, ideation §7.)
- `ArchiveCollective` (the misses tile): `{ projectNames: string[], projectCount: number, totalAuthoredFiles/Bytes/Lines, totalPipelineGeneratedFiles/Bytes, totalAllBytes, totalCommits, totalTokensProcessed, totalTokensFresh, totalSessions }`. NO `editorial`, NO per-project fields.

**⚠ PRECONDITION GATE (run before C1 — Phase 0 may not have executed yet).** The repo's `tools/project-metrics/dist/taxonomy.d.ts` is currently **pre-Phase-0** (verified at deepening: it exports only `MultiProjectReport` + `ProjectReport` with NO `editorial`/`tokens`/`archiveCollective`/`git.projectAgeDays`; `grandTotals` DOES already exist). Every field this phase reads except `grandTotals` is added by Phase 0. Before building:
```
cd C:/Users/brigg/ai-learning-journey/tools/project-metrics
grep -nE "editorial|EditorialContent|ArchiveCollective|projectAgeDays|hookStat" dist/taxonomy.d.ts
```
Each must hit. If any miss, Phase 0 hasn't been executed/rebuilt — STOP and resolve before building against a contract that isn't there (manifesto: contradictions = STOP). Read field NAMES from [phase-0-data-gaps.md](phase-0-data-gaps.md), never from the current dist (it will mislead).

**Foundation inherited (consume — do NOT redefine):**
- **Format (Phase 3):** `src/lib/format.ts` exports `formatInt`, `formatBytes`, `formatTokens`, `pickTokenUnit`, `formatModelList`, `padCounter`. Phase 4 REUSES these and ADDS `formatAge` here (Phase 3 §System-wide impact mandates: Phase 4 reuses `format.ts`, never re-rolls `toFixed`/`toLocaleString`).
- **Motion (Phase 1):** `src/motion/gsap-context.ts` exports `{ gsap, useGSAP, CustomEase }` (registers `useGSAP` + `CustomEase` ONLY today). `src/motion/easings.ts` exports the `ease` map — **`ease.press` = `weighted-press`** (hover, 1.05 overshoot), **`ease.arrive` = `weighted-arrive`** (reveals). `src/motion/tokens.ts` exports `duration` (`hover: 0.25`, `press: 0.16`, `reveal: 0.8`) and `stagger` (`tiles: 0.06`). `src/motion/reduced-motion.ts` exports `prefersReducedMotion()`.
- **Component convention (Phase 3):** `src/components/<Name>/<Name>.tsx` + `<Name>.module.css`, `import styles from './<Name>.module.css'`, the `useGSAP(() => {…}, { scope: ref })` + `contextSafe` pattern, `prefersReducedMotion()` branch at the top.
- **Tokens (Phase 1, semantic — mode-aware):** `--surface-elevated`, `--surface-glass-blur`, `--border-subtle`, `--border-strong`, `--surface-divider`, `--shadow-tile`, `--shadow-hover`, `--radius-tile`, `--radius-chip`, `--accent-stat-highlight` (gold — the ONE moment), `--accent-focus`, `--text-primary`/`--text-secondary`/`--text-muted`, `--text-display-md`, `--text-body`, `--text-meta`, `--font-display`/`--font-body`/`--font-mono`, `--space-*`, `--tracking-tile`, `--leading-tile`. The `.tabular` utility is in `global.css`.
- **Routing (Phase 1):** `import { Link } from 'react-router'` (NOT `react-router-dom`); the tile's single nav link is `<Link to={`/project/${projectName}`}>` with the stretched-link pattern making the whole card clickable (Decision 16).
- **`⚠ --text-muted` fails WCAG AA today** (~3.3:1 dark / ~2.9:1 light @14px). Phase 3's cascade instructs Phase 1 to raise the alpha floor to AA. Until verified landed, **all information-bearing tile text (name, one-liner, hook label, age ribbon) uses `--text-secondary` (≥7:1); `--text-muted` only for purely decorative chrome.** Restated in Cascade.

**Phase 1 placeholder being extended:** `src/pages/Landing.tsx` renders `<Hero/>` (Phase 3). Phase 4 appends `<ProjectGrid/>` below it.

---

## The tile contract (project tile — locked composition)

frontend-design + emil lens. Top-to-bottom, generous negative space (the luxury signal), ONE gold moment. The card is `position: relative`; the whole tile is a single nav `<Link>` to the detail page, with `::after` stretching the click target over the whole card. NO buttons on the tile (Decision 16, clean-tile decision, ideation §3).

```
        ┌───────────────────────────────────┐
        │                              ┌────┐│
        │       [ hero image ]         │ 50d ││  ← age ribbon, top-right (tile-relative,
        │     16:9, full-bleed to      └────┘│     present with OR without the image)
        │     the inner radius                │
        ├───────────────────────────────────┤
        │  BURNED                             │  ← (1) name — Satoshi display; the primary
        │                                     │       <Link>, stretched ::after = card hit-target
        │  Archer-tone spy party game,        │  ← (2) one-liner — --text-secondary, balanced
        │  rebuilt from Exploding Kittens.    │       wrap, clamped to 3 lines
        │                                     │
        │  167            ← gold              │  ← (3) HOOK STAT — value in --accent-stat-highlight
        │  TESTS            (the one moment)  │       gold + display; label small-caps --text-secondary
        │                                     │
        └───────────────────────────────────┘
   whole tile is ONE clean click → /project/:name (stretched ::after). NO buttons (clean-tile, ideation §3).
```

**Element specs (project tile):**

| # | Element | Source | Type / token | Color | Null / overflow behavior |
|---|---|---|---|---|---|
| 0 | Hero image | `editorial.heroImage` | 16:9 frame, `object-fit: cover`, `overflow: hidden` (for hover scale) | — | `null` → omit image, render **type-forward** (below). **Runtime 404** (non-null src that fails to load): `<img onError>` hides the image + applies the `type-forward` class, so a stale/missing asset degrades to type-forward, never a broken-image glyph. |
| — | Age ribbon | `git.projectAgeDays` via `formatAge` | small chip top-right, **tile-relative** absolute position (anchored to the card, not the image — so it sits top-right with OR without a hero image), `--font-mono` `.tabular`, `--text-meta` | `--text-secondary` | `formatAge(null) === null` → suppress the ribbon entirely. |
| 1 | Name | `projectName` | `--font-display`, `--text-display-md`, `--tracking-tile`, `--leading-tile`; inside the tile's single nav `<Link>` (whose stretched `::after` makes the whole card the hit-target) | `--text-primary` | always present. `max-width: 18ch` + `overflow-wrap: break-word` + `text-wrap: balance` so a long slug wraps, never overflows into the hook row. |
| 2 | One-liner | `editorial.oneLiner` | `--font-body`, `--text-body`, `text-wrap: balance`, `max-width` | `--text-secondary` | `editorial: null` → omit. Clamp to 3 lines (`-webkit-line-clamp: 3` + `overflow: hidden`) so a long blurb can't break the tile rhythm. |
| 3 | Hook stat | `editorial.hookStat.{value,label}` | value: `--font-display` display size + `.tabular`; label: small-caps `--text-meta` +tracking | **value: `--accent-stat-highlight` (gold)**; label: `--text-secondary` | `editorial: null` → fallback: `formatInt(grandTotals.authoredLines)` value + "lines authored" label (still gold). |

**The gold rule — decision tree** (`--accent-stat-highlight`, README WOW-dictionary: ONE moment per surface):
- **Project tile** → the hook stat value is gold, ALWAYS (whether `editorial.hookStat.value` or the `grandTotals.authoredLines` fallback). Nothing else on the tile receives gold — not the ribbon, name, link, or border.
- **Archive tile** → its rolled-up stat is `--text-secondary`, NEVER gold (it's a muted coda).
- No other element on any tile ever receives `--accent-stat-highlight`.

**Type-forward variant** (`heroImage` null or 404): omit the image frame; the content well gains the image's vertical space as top padding (`padding-top: var(--space-8)`); the name steps up to `--text-display-md` at the upper end of its clamp (or `font-weight` 700) and the one-liner + hook stat get the freed negative space. A `type-forward` class on the tile drives these. The tile must not look shorter/broken — it looks deliberately type-led (the BURNED hero's type-forward discipline applies).

**The misses tile (`ArchiveTile`) — distinct, muted, copy is DYNAMIC:**
```
        ┌───────────────────────────────────┐
        │  THE MISSES                         │  ← name, same display type
        │                                     │
        │  {projectCount} games, tried and    │  ← copy DERIVED from archiveCollective.projectCount
        │  shelved. Presentation beat systems.│     (never hardcoded "Two"); + a one-line lesson
        │                                     │       (editorial — see Cascade)
        │  449            (NOT gold — muted)  │  ← rolled-up stat: archiveCollective.totalCommits
        │  COMMITS, THEN SHELVED              │     in --text-secondary
        └───────────────────────────────────┘
   whole tile muted (see light/dark treatment), no hover, no link — an intentional coda
```
- **Copy is generated** from `archiveCollective.projectCount` (e.g. `` `${projectCount} games, tried and shelved` ``) — never a hardcoded "Two games," which silently lies if the archive list changes. The one-line lesson ("presentation beat systems") is editorial copy; until the worksheet supplies it, derive a neutral default. Verify the rendered count matches `stats.json`.
- **Rolled-up stat:** `archiveCollective.totalCommits` (the "we put real work in, then shelved it" read). `--text-secondary`, not gold.
- **Muted treatment — BOTH modes** (light mode is NOT just opacity): dark → ~0.8 opacity over the teal surface reads as muted glass. Light → opacity alone over warm cream reads broken; instead use a flattened surface (drop the glass blur, use `--surface-divider`-weight border, text at `--text-secondary`) so it reads deliberately quiet, not invisible. Specify both; verify both in Phase 4's gate.
- **Non-interactive affordance:** `cursor: default` + no hover/`:active` so a user reads it as "deliberately static," not "link not loaded." The muted-but-legible treatment (not faded-to-broken) carries the "intentional coda" read.

---

## Output structure (what this phase adds)

```
projects/ai-journey-stats/
├── src/
│   ├── lib/
│   │   ├── grid-order.ts          # NEW — sortBySize + buildGridModel (pure, tested)
│   │   ├── grid-order.test.ts     # NEW — vitest (node env)
│   │   ├── format.ts              # MODIFIED — add formatAge()
│   │   └── format.test.ts         # MODIFIED — add formatAge cases
│   ├── components/
│   │   ├── LiveLinkButton/        # NEW — shared leaf for Phase 5 (Source/Play links); the TILE renders no link button (clean-tile, ideation §3)
│   │   ├── ProjectTile/           # NEW — project tile (whole-card single-link, no buttons)
│   │   ├── ArchiveTile/           # NEW — muted collective "the misses" coda (non-interactive)
│   │   └── ProjectGrid/           # NEW — layout + render order + dividers + ScrollTrigger reveal owner
│   ├── motion/
│   │   └── gsap-context.ts        # MODIFIED — register ScrollTrigger (Phase 4 introduces it)
│   └── pages/
│       └── Landing.tsx            # MODIFIED — append <ProjectGrid/> below <Hero/>
└── (no new dependencies — clsx from Phase 3; ScrollTrigger ships inside gsap)
```

Scope declaration, not a constraint — the per-commit file lists below are authoritative.

---

## Dependencies

**No new package deps.** `clsx@^2.1.1` is already installed (Phase 3) — Phase 4 is its first consumer. `ScrollTrigger` is part of the `gsap@^3.14.2` package already installed (Phase 1) — `import { ScrollTrigger } from 'gsap/ScrollTrigger'`. `vitest.config.ts` already includes `src/**/*.test.ts` (Phase 3) → `grid-order.test.ts` runs without config change.

---

## Cascade prerequisite (apply BEFORE C1 — verify it landed)

The Cascade edits below (ideation §5/§6, README gate 7 + tile-sort row) touch docs other phases read. Apply them in the deepen commit, then verify before executing Phase 4:
```
grep -n "allBytes" docs/plans/README.md      # the tile-sort row must NO LONGER say allBytes
grep -n "TierBar\|tier bar\|tier-proportion" docs/plans/README.md docs/ideation.md   # the tile spec must no longer mention a tier bar
```
If `allBytes` still appears in the tile-sort row or a tile tier bar is still specified, the Cascade didn't land — fix before building (or the grid is built against stale upstream specs).

---

## Execution — three commits, ordered (static-first, per Phase 3 Decision 6)

Build layout/data/null-degrade/responsive as verifiable runtime truth FIRST (C1–C2), then layer motion (C3). Never debug a layout bug through a running animation. Each commit has a verify gate — don't proceed past a red gate (manifesto: runtime truth > "it compiles"). (Three commits mirror Phase 3's rhythm: pure logic → static composition → motion.)

### Commit 1 — pure logic: `grid-order.ts` + `formatAge` + tests

The feature-bearing, unit-testable concentrate.

**4.1a — `src/lib/grid-order.ts`:**
- `sortBySize(reports: ProjectReport[]): ProjectReport[]` — pure, returns a NEW array sorted by `grandTotals.authoredLines` descending, tie-broken by `projectName` ascending (diff-stable). Does not mutate input.
- `buildGridModel(report: MultiProjectReport): { active: ProjectReport[]; archive: ArchiveCollective | null; showMissesDivider: boolean; isEmpty: boolean }` — applies `sortBySize` to `projects`, passes `archiveCollective` through, derives `showMissesDivider = archiveCollective !== null` and `isEmpty = active.length === 0 && archive === null`. The boolean is the testable seam that guarantees the misses divider never renders over a null archive, and `isEmpty` lets `ProjectGrid` render nothing (the hero stands alone) instead of an empty `<section>`.

**4.1b — add `formatAge` to `src/lib/format.ts`:**
- `formatAge(projectAgeDays: number | null): string | null` — `null → null` (caller suppresses the ribbon); `0 → "today"`; `1..364 → "${n}d"`; `≥365 → "${Math.floor(n/365)}y"`. Pure; pair with `.tabular`. (Coarse past a year is intended — the ribbon is a glance, not a precise age.)

**4.1c — tests** (`grid-order.test.ts` new; `format.test.ts` extended):
- `sortBySize`: Happy — descending by `authoredLines`; Edge — stable `projectName` tie-break on equal `authoredLines`; Edge — mass-tie (3+ at the same value) sorts purely alphabetical, deterministically; Edge — a `0`-authored project sinks below all positives; Edge — empty `[]`; Edge — single element; Edge — does not mutate input.
- `buildGridModel`: Happy — populated `projects`+`archive` → `showMissesDivider` true, `isEmpty` false, `active` sorted; Edge — `archiveCollective: null` → `showMissesDivider === false`; Edge — `projects: []` but `archive` populated → renders the coda, `isEmpty` false; Edge — all empty (`projects:[]`, `archive:null`) → `isEmpty === true`.
- `formatAge`: `47 → "47d"`; `null → null`; `0 → "today"`; `364 → "364d"`, `365 → "1y"`, `400 → "1y"`.

**Verify gate:**
```
cd C:/Users/brigg/ai-learning-journey/projects/ai-journey-stats
pnpm test        # grid-order + format (incl. formatAge) green; Phase 2/3 tests still green
pnpm typecheck   # clean
```

**Commit:** `feat(ai-journey-stats): grid-order (sort + group model + empty guard) + formatAge + tests`

---

### Commit 2 — static composition: `LiveLinkButton` + `ProjectTile` + `ArchiveTile` + `ProjectGrid` (no motion), wired into Landing

The layout/data/null-degrade/responsive truth gate. Real data, FINAL visible state, NO animation.

**4.2a — `src/components/LiveLinkButton/`** (shared leaf, prop-shaped — Phase 5 reuses for live + repo links via a different `label` string, NOT a new variant prop): props `{ href: string; label?: string }` (default "Try it →"). Renders `<a href target="_blank" rel="noopener noreferrer">`, `--accent-primary` text + arrow, `position: relative; z-index: 1`, `min-height: 44px`, padding, `:focus-visible` ring (`--accent-focus`), `border-radius: var(--radius-chip)`. **Built here as the shared leaf Phase 5 consumes for its Source/Play links; the tile itself renders no link button (clean-tile decision, ideation §3).** Phase 4 is the "establish shared primitives" phase — do NOT skip building it, and do NOT change its prop shape. (`z-index: 1` keeps it valid above a stretched `::after` on whatever surface Phase 5 hosts it.)

**4.2b — `src/components/ProjectTile/`** (props: `{ project: ProjectReport }`): the whole-card single-link card (Decision 16) — `.tile { position: relative }`, the name is the tile's only `<Link>` with `::after { content:''; position:absolute; inset:0 }` covering the card. NO buttons on the tile (clean-tile, ideation §3). Renders the tile contract; `clsx` drives `has-image`/`type-forward`. Null-degrade per the element table: `editorial: null` → fallback title/hook from `grandTotals`, no image/one-liner; `heroImage` null OR `<img onError>` → `type-forward`; `formatAge() === null` → no ribbon. Hook stat carries the lone gold. (Does NOT render `LiveLinkButton` — that leaf is built in 4.2a for Phase 5 only.)

**4.2c — `src/components/ArchiveTile/`** (props: `{ archive: ArchiveCollective }`): muted, non-interactive coda. Copy generated from `projectCount`; rolled-up `totalCommits` in `--text-secondary` (NOT gold). Muted treatment specified for BOTH modes (tile contract). No `<Link>`, no hover, no `:active`, `cursor: default`.

**4.2d — `src/components/ProjectGrid/`**: calls `useStats()` + `buildGridModel(report)`. If `isEmpty` → render nothing (hero stands alone). Else render: the active `projects` tiles → "the misses" divider (if `showMissesDivider`) → `<ArchiveTile>` (if `archive`). Layout grid `repeat(auto-fit, minmax(320px, 1fr))`, `gap: var(--space-6)`. NO motion (tiles at final visible state — no `gsap.set`/opacity here).

**Dividers (concrete spec):** a group label in small-caps `--text-secondary` (`--font-body`, `letter-spacing: 0.12em`) sitting ABOVE a full-width hairline rule (`1px` `--surface-divider`), label left-aligned with a small gap to the rule below it. Space above a divider = `var(--space-12)` (≈2× the tile gap) so groups read as distinct bands, not a continuous matrix. Spans the full grid width (`grid-column: 1 / -1`).

**4.2e — `Tile/Grid CSS`**: glass chrome from tokens (`--surface-elevated` + `backdrop-filter: blur(var(--surface-glass-blur))`, `--border-subtle`, `--radius-tile`, `--shadow-tile`). **Mobile single-column DELIBERATE** (concrete, mirroring Phase 3's `@media (max-width: 600px)`): tile padding `var(--space-6) var(--space-4)`; grid `gap: var(--space-8)` (generous, so each tile is a full "card moment"); hero image full-bleed to the tile inner width; the hook stat drops to its own full-width row with `margin-top: var(--space-4)` (not crowded beside other content). Columns scale via `auto-fit` (1 → 2 at ~640px → 3 at ~960px). Image frame `overflow: hidden` (reserves hover scale for C3). Anchor: UMB `how-to-play.html`.

**4.2f — `src/pages/Landing.tsx`**: append `<ProjectGrid />` below `<Hero />`.

**Verify gate (eye-on-browser — runtime truth, BOTH modes):**
```
pnpm refresh && pnpm dev
```
- Every tile renders real editorial: image, name, age ribbon, one-liner, gold hook stat. NO buttons on the tile.
- The grid + divider read as a deliberate sequence: the active projects → the misses coda. The archive tile is muted + non-interactive, **legible in BOTH modes** (not faded-to-broken in light).
- **A11y:** keyboard-tab the grid — each tile is ONE focusable link (the card → detail) with a visible focus ring; the whole card is clickable (stretched link); no nested-link warning.
- **Null/overflow-degrade:** scratch `stats.json` — one `editorial: null` (fallback hook, no image/one-liner), one `heroImage: null` AND one pointing at a missing file (both → type-forward, no broken `<img>`), one `git.projectAgeDays: null` (no ribbon), `archiveCollective: null` (no misses divider/tile), a 40-char name + a 300-char one-liner (wrap/clamp, no overflow), and ALL arrays empty (grid renders nothing, hero alone). Restore. (No `liveUrl` tile case — the tile renders no link button.)
- **Editorial spot-check:** each hook stat reads as a specific editorial pick (e.g. "167 tests"), not a generic auto-count — the hook is the tile's sole data moment now, so a weak one reads as AI-slop. (Editorial quality is sourced in preflight −1.5; this gate flags weak hooks early.)
- Tile click → `/project/:name` (client-side, no document refetch).
- **Both modes** (`?theme=` + OS): glass chrome, dividers, muted archive read deliberate; gold ONLY on hook stat values.
- **360 / 375 / 390 / 430px:** single column reads DELIBERATE (full-bleed image, hook stat own row, generous gap), not stretched; no horizontal scroll.

**Commit:** `feat(ai-journey-stats): project grid composition (static) — stretched-link tiles + groups + the-misses coda`

---

### Commit 3 — motion: reveal-on-scroll + hover + reduced-motion + refresh

Layer motion onto the verified-correct static grid.

**4.3a — register ScrollTrigger** in `src/motion/gsap-context.ts`: `registerPlugin(useGSAP, CustomEase, ScrollTrigger)` + `export { … ScrollTrigger }` (Decision 7).

**4.3b — `ProjectGrid` reveal** — ONE `useGSAP(() => {…}, { scope: gridRef })` block (Decision 9, everything inside the scope for clean StrictMode revert):
- `if (prefersReducedMotion()) return` — immediately, before any `gsap.set` (Decision 8b). Tiles stay at C2's final visible state.
- `gsap.set('[data-tile]', { autoAlpha: 0, y: 40 })` — FIRST statement of the motion branch (Decision 8a).
- `const resetTileY = () => gsap.set('[data-tile]', { y: 0 }); ScrollTrigger.addEventListener('refreshInit', resetTileY)` — y-reset during measurement (Decision 9); **`return () => ScrollTrigger.removeEventListener('refreshInit', resetTileY)`** from the `useGSAP` callback (the global listener is NOT context-reverted).
- `ScrollTrigger.batch('[data-tile]', { start: 'top 85%', once: true, onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: duration.reveal, ease: 'weighted-arrive', stagger: stagger.tiles, overwrite: true }) })`.
- The refresh self-heal (Decision 10): `Promise.race([document.fonts.ready, timeout(1500)]).then(() => requestAnimationFrame(() => ScrollTrigger.refresh()))` + `window` `load` once.
- `[data-tile]` is on every `ProjectTile` AND the `ArchiveTile` (the coda reveals too; it just doesn't hover).

**4.3c — `ProjectTile` hover** (pure CSS, gated): `@media (hover: hover) and (pointer: fine)` → `.tile:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover) }`, `.tile:hover .image { transform: scale(1.04) }` (inside `overflow: hidden`), `transition: transform var(duration.hover) <weighted-press>, box-shadow …`, faster exit. `.tile:active { transform: scale(0.985) }` — **ungated** (touch press feedback is intended). Transform + opacity/shadow only — no `all`, no layout props.

**Verify gate (eye-on-browser, dev AND preview):**
```
pnpm dev                      # StrictMode active
pnpm build && pnpm preview    # prod bundle — the real gate
```
- **Reveal:** scroll — tiles fade+rise with weighted stagger, once each. Top row reveals on load WITHOUT scrolling — verify in **dev (StrictMode)** AND preview, on a tall grid AND a short one.
- **P0 (import-absent):** force ScrollTrigger absent at runtime (e.g. throw at the top of the `useGSAP` body to simulate a dead layer) → every tile still visible (CSS default visible; hidden state JS-only). Restore.
- **Reveal positioning:** throttle network so images/fonts load late → tiles reveal at correct positions (the `refresh()` race + `refreshInit` y-reset fired), not stuck/early. Also test the **all-`heroImage`-null** grid → still reveals (refresh isn't gated on image loads).
- **Hover:** mechanical-key lift (translateY + shadow + image scale), faster out; touch (emulation/real phone) does NOT trap hover; `:active` press shows on tap.
- **Reduced motion:** OS flag → all tiles visible immediately, no reveal/stagger, no hover transform.
- **Both modes**, no console errors, no CSP violations in preview.

**Commit:** `feat(ai-journey-stats): grid motion — ScrollTrigger.batch reveal + refreshInit y-reset + weighted hover lift + reduced-motion`

---

## Landmines

| Landmine | Guard |
|---|---|
| **Link inside a link (invalid HTML, breaks a11y)** | Moot under clean tiles — the tile has NO buttons, so there's nothing to nest. Stretched-link pattern (Decision 16): name is the tile's only `<Link>` with `::after` covering the card. ONE nav link per tile. Keyboard-nav verify in C2 gate. |
| **Blank grid if the motion layer dies** | Hidden state via `gsap.set({autoAlpha:0})` in JS, NEVER CSS `opacity:0`. `gsap.set` is the first motion statement; batch created immediately after. Dead/absent layer → all tiles visible. C3 P0 gate. |
| **`y:40` offset throws off ScrollTrigger.refresh measurement** | `ScrollTrigger.addEventListener('refreshInit', () => gsap.set('[data-tile]', { y: 0 }))` reverts the offset during measurement (batch can't take `invalidateOnRefresh`). |
| **refresh never fires when all heroImages are null** | Refresh is gated on `document.fonts.ready` (always resolves) + `window load`, NEVER per-image `load` events (type-forward tiles have no `<img>`; broken images never fire `load`). |
| **`document.fonts.ready` hangs → reveal positions never heal** | `Promise.race([document.fonts.ready, timeout(1500)])` guarantees refresh fires regardless. |
| **Reduced-motion applies hidden state then skips tween → invisible tiles** | `prefersReducedMotion()` returns BEFORE any `gsap.set`; tiles stay at C2 final visible state. |
| **StrictMode double-invoke re-hides tiles OR leaks a `refreshInit` listener** | `gsap.set` + `batch` revert via `useGSAP({scope})`, BUT the `refreshInit` listener is GLOBAL → it MUST be removed in the cleanup return (Decision 9) or the dev double-invoke leaks a second `resetTileY`. Dev (StrictMode) verify is separate from the prod P0 gate: confirm tiles visible AND one listener survives. |
| **`heroImage` 404s at runtime → broken `<img>` glyph** | `<img onError>` hides the image + applies `type-forward`. Phase 2 guards refresh-time; this guards runtime (stale stats.json / deploy race / deleted asset). |
| **Fully-empty grid renders an empty `<section>`** | `buildGridModel.isEmpty` → `ProjectGrid` renders nothing (hero stands alone). Tested. |
| **Bar lies / clutter (the cut tier bar)** | NO tier bar on the tile (Decision 1). Taxonomy lives on About/detail. |
| **Sorting by `allBytes` ranks by trailer size** | Sort by `grandTotals.authoredLines` desc, tie-break `projectName` (Decision 4). Rotation-immune, inversion-immune, diff-stable. |
| **`authoredLines` mistaken for a `linesByAuthor` sum (would inherit the git inversion)** | `grandTotals.authoredLines` is file-classification-derived (Phase 0 §counter), NOT a git-author sum — immune to the Co-Authored-By inversion (Decision 2/4). Never re-derive it from `linesByAuthor`. |
| **"Sort meta to the end" logic / any meta tile** | Obsolete — meta tiles are CUT (Decision 5, ideation §7). The grid renders only `projects[]`; Phase 4 never consumes `report.meta`. |
| **Individual shelved tiles** | None exist — `kind` has no `'shelved'`; archive lives only in `archiveCollective` (Decision 6). ONE muted `ArchiveTile`. |
| **Hardcoded "Two games" archive copy lies on change** | Copy generated from `archiveCollective.projectCount`; verify rendered count matches `stats.json`. |
| **Archive tile invisible in light mode** | Light-mode muted treatment is a flattened legible surface, not opacity-fade (tile contract). Verify both modes. |
| **`editorial: null` / `heroImage`/`projectAgeDays` null** | Defensive tile per the element table: fallback title/hook from `grandTotals`; omit image (type-forward) / ribbon. (No `liveUrl` tile case — the tile renders no link button.) |
| **Long name / one-liner overflow** | Name `max-width: 18ch` + `overflow-wrap`; one-liner `-webkit-line-clamp: 3`. |
| **Two gold moments per tile** | Gold decision tree: hook stat value ONLY on project tiles; never on archive. |
| **`--text-muted` fails WCAG AA** | All info-bearing tile text uses `--text-secondary`. Phase 1 cascade raises `--text-muted` to AA (Cascade). |
| **Re-rolling `toFixed`/`toLocaleString` in JSX** | All numbers via `format.ts` (`formatInt`/`formatBytes`/`formatAge`). |
| **`ArchiveCollective` forced through `ProjectTile`** | Separate `ArchiveTile` (Decision 6/15). |
| **ScrollTrigger (~25KB) on every route's entry chunk** | Accepted for v1 (grid is on entry route); Phase 9 route code-split / dynamic import is the optimization (Decision 7). |
| **Pre-Phase-0 dist misleads field names** | Precondition gate greps `dist/taxonomy.d.ts`; read names from `phase-0-data-gaps.md`. STOP if Phase 0 not built. |
| **`backdrop-filter` blur on the 10 tiles + hover scale costs paint on low-end mobile** | Watch in the mobile gate; if it janks, a Phase 9 `@supports`/reduced-blur fallback for the single-column case (not built now — flagged). |

---

## System-wide impact

- **First per-project consumer of `useStats()`.** The hero (Phase 3) read `combined.*` only; the grid is the first to iterate `projects[]` and read `archiveCollective`. It honors field-level null discipline — `editorial`/`heroImage`/`projectAgeDays` can each be null per tile. (`liveUrl` stays a data field but is NOT consumed by the tile — Phase 5's detail page reads it for the Play link.)
- **Shared primitives established for Phase 5:** `LiveLinkButton` (prop-shaped `{href,label}` — Phase 5 reuses for live + repo links via a different `label`, not a variant prop), `src/lib/grid-order.ts` (first non-format pure-derivation lib — Phase 5 follows the pattern), and `formatAge` in `format.ts`. Built behind data-shaped prop boundaries so Phase 5 inherits no coupling.
- **Motion surface:** Phase 4 introduces ScrollTrigger to the shared `gsap-context.ts` — every later phase can use it. The `ScrollTrigger.batch` + JS-hidden-state + `refreshInit` y-reset + reduced-motion-early-return + race-then-refresh pattern is the reference for any later scroll-revealed surface.
- **`ProjectTile` is deliberately NOT reused by Phase 5** — the detail page is a full page, not a tile. Phase 5 reuses the sub-pieces (`LiveLinkButton`, `format.ts`), not the tile shell.
- **Unchanged invariants:** Phase 1 tokens/eases/fonts, Phase 2 data layer, Phase 3 hero + `format.ts` (only ADDED to) — untouched. Phase 4 adds components + `grid-order.ts`, extends `format.ts` + `gsap-context.ts` (one plugin) + `Landing.tsx` (one append).

---

## Cascade (corrections this deepening forces elsewhere)

Apply in the deepen commit (and re-verify via the "Cascade prerequisite" gate above) before Phase 4 executes.

### `ideation.md` §6 (reconcile to the collective tile)
- Current: "Both Hide and Seek and Do Not Disturb appear in the grid with a clear visual marker (faded tile / 'shelved' badge / muted color)." Update to: shelved projects appear as ONE muted **"the misses"** collective tile in v1 (honoring the Phase 0 `archiveCollective` data model); the failures arc is told collectively, with a one-line lesson, and per-archive detail pages remain a Phase 5 option (the `status: 'shelved'` schema value is kept open). The "failures are part of the story / read as intentional, not broken" intent is preserved.

### `ideation.md` §5 + `README.md` "Visual system" / "Per-project tile" rows (the cut tier bar)
- Remove the tier-proportion bar from the tile spec. The per-project tile is: hero image · name · age ribbon · one-liner · ONE gold hook stat (NO buttons — clean-tile, ideation §3; the whole tile is one click → detail). The authored/pipeline/tool taxonomy is explained on the About page (and optionally the detail page), not visualized on the grid tile.

### `README.md` verification gate 7 + "Tile order" / sort key
- Gate 7: drop "tier"/"status marker" language; state the count is **data-derived** = `projects.length` + `(archiveCollective ? 1 : 0)`. Meta tiles are CUT (ideation §7), so the grid is **9 active + 1 archive coda = 10 surfaces**; keep the census-proof formula rather than hard-coding the count.
- Update the tile sort to `grandTotals.authoredLines` descending, tie-break `projectName` (was `allBytes`).

### `README.md` "Named wow moments" (already correct)
- "Project tile: weighted hover lift (no ripple, no cursor-tracking)" — stays accurate.

### `phase-1-scaffold.md` (token floor — restate the Phase 3 a11y cascade)
- Phase 4 RELIES on the `--text-muted` AA bump Phase 3's cascade flagged. Confirm it landed in `tokens.semantic.css`; until then Phase 4 uses `--text-secondary` for all info-bearing tile text. (Same shared-token fix; restated dependency.)
- ScrollTrigger registration: Phase 1 Decision 3 already anticipated per-phase plugin registration — Phase 4 adds `ScrollTrigger` to `gsap-context.ts`. No edit to Phase 1 needed; noted for continuity.

### `phase-5-detail.md` (forward flags — Phase 5's own deepening owns these)
- **Reuses, do not re-roll:** `LiveLinkButton` (shared, label-prop for the repo variant), `src/lib/format.ts` (incl. `formatAge`), the `grid-order.ts` pure-derivation pattern.
- **The cut tier bar may belong here:** if the detail page wants the full three-tier breakdown at large scale with a legend, build it in Phase 5 (cut from the tile, not the project). FILES is the only honest multi-segment metric.
- **Per-archive detail pages** are an open Phase 5 option (`status: 'shelved'` kept for it). If Phase 5 adds per-archive routes, decide whether `ArchiveTile` becomes interactive or a new linked variant appears (avoid a forced redesign).
- **No "AUTHORED BY" authorship-split block** — authorship is intentionally silent (ideation §11, 2026-05-24); a per-project human-vs-Claude split is the same noise as the cut tier bar. Phase 5 shows the project's WORK (tokens, assets, cadence), not a who-wrote-what comparison.

### Authorship framing — RESOLVED (Briggsy, 2026-05-24)
The spine truth: Claude wrote all of it; Briggsy only touched `.env` keys; fully-autonomous-SDLC experiments. **Decision: authorship is NOT a site feature — go silent** (ideation §11). The site brags by showing the WORK (magnitude, projects, polish), not a who-wrote-what scoreboard, and it owes no one proof ("it's our experiment"). What this locks:
- The per-tile tier bar is cut (Decision 1) AND the per-project "AUTHORED BY" split is cut/reframed in Phase 5 — same noise. Phase 5's deepening must NOT build a human-vs-Claude authorship-split block.
- The hero (Phase 3) stays magnitude-led — that IS the flex; no authorship claim added, **no reopening of the doc-reviewed hero needed**.
- About (Phase 6) may carry "autonomous-SDLC experiments" as light context, never a scoreboard.
- Phase 0 needs NO git-attribution-proof work: since no surface makes a provable authorship claim, the `linesByAuthor` inversion (git credits `mbriggsy`; Claude rides as `Co-Authored-By`) is **MOOT for v1**. It stays a noted landmine only if a future surface ever shows authorship. `grandTotals.authoredLines` (Phase 4 sort + fallback hook) is file-classification-derived, immune regardless.

---

## Out of scope for Phase 4 (explicit "later")

- The per-project **detail page** (`/project/:name`) → Phase 5. The tile only links to it.
- The **route cross-fade** transition → route-transition phase (the `[data-route-transition]` seam exists from Phase 1).
- The **tier-proportion breakdown** component (full three-tier, large scale) → Phase 5 detail IF wanted there; cut from the tile entirely.
- **Per-archive detail pages** for shelved projects → Phase 5 option (schema kept open).
- **Editorial copy** (one-liners + hook stats + the archive lesson line) → the editorial worksheet (preflight −1.5) + each project's `project-metrics.config.yaml`. Phase 4 renders whatever the data carries.
- Component **DOM tests / jsdom** → only if a later component needs render-level assertions; tiles verified eye-on-browser. `grid-order.ts` + `formatAge` carry the unit-testable logic.
- **Filtering / sorting controls**, search → out of scope for v1 (README).
- **Phase 9 polish:** route-level ScrollTrigger code-split, mobile `backdrop-filter` fallback, hover-timing tuning, the final negative-space pass → Phase 9. Phase 4 ships a correct, on-spec first build.

---

## Verification (Phase 4 done gate)

1. ✅ `pnpm test` green — `grid-order.test.ts` (sort desc + name tie-break + mass-tie + 0-authored + empty/single/no-mutate; `buildGridModel` `showMissesDivider` + `isEmpty`) and `format.test.ts` `formatAge`; Phase 2/3 tests still green.
2. ✅ `pnpm typecheck` clean.
3. ✅ `pnpm dev` AND `pnpm build && pnpm preview`: every tile renders real editorial; no `NaN`/`undefined`/broken `<img>`.
4. ✅ Grid + divider render in sequence: the active projects → "the misses" coda (divider suppressed if `archiveCollective` null). NO meta tiles. Archive tile muted + non-interactive + legible in BOTH modes.
5. ✅ Sort by `grandTotals.authoredLines` desc; equal-rank stable by `projectName`; a 0-authored project sinks to the bottom.
6. ✅ **A11y:** keyboard tab reaches each tile's single card link with a visible `:focus-visible` ring; whole card clickable (stretched link); no nested-`<a>` (the tile has no buttons).
7. ✅ Tile click → `/project/:name` client-side. Archive tile has no link (`cursor: default`).
8. ✅ Reveal-on-scroll: tiles fade+rise with weighted stagger, once each; top row reveals on load WITHOUT scrolling — verified in **dev (StrictMode)** AND preview, tall AND short grid.
9. ✅ **P0:** force a dead motion layer (throw in the `useGSAP` body) → every tile still visible. The load-bearing gate.
10. ✅ Reveal positioning self-heals: throttle network (late images/fonts) → tiles reveal at correct positions; all-`heroImage`-null grid still reveals.
11. ✅ Hover: `translateY(-4px)` + shadow swap + image `scale(1.04)`, weighted-press, faster out; `:active` press on tap (touch); gated to fine pointers; touch never traps.
12. ✅ `prefers-reduced-motion`: all tiles visible immediately, no reveal/stagger, no hover transform.
13. ✅ Null/overflow-degrade: `editorial: null`, `heroImage: null` AND a 404 src (both → type-forward), `projectAgeDays: null`, `archiveCollective: null`, 40-char name + 300-char one-liner (wrap/clamp), ALL arrays empty (grid renders nothing, hero alone) — each verified, none crash, no broken `<img>`. (No `liveUrl` tile case — the tile renders no link button.)
14. ✅ Editorial spot-check: each hook stat is a specific editorial pick, not a generic auto-count.
15. ✅ BOTH modes (light + dark, OS + `?theme=`): glass chrome, dividers, muted archive read deliberate; gold ONLY on hook stat values.
16. ✅ 360 / 375 / 390 / 430px: single column reads DELIBERATE (full-bleed image, hook stat own row, generous gap), not stretched; no horizontal scroll; tap targets ≥44×44px.
17. ✅ No console errors; no CSP violations in preview.
18. ✅ Record the grid scroll in both modes. Confirm tiles reveal correctly, hover behaves as specified, and the composition reads as intentional (not a robotic card matrix). Full water-bead bar cold-watch is Phase 9 — but the first build should already be close.

Then open [phase-5-detail.md](phase-5-detail.md) and start.

---

← [Phase 3 — Hero](phase-3-hero.md) | [Index](README.md) | Next → [Phase 5 — Project detail](phase-5-detail.md)
