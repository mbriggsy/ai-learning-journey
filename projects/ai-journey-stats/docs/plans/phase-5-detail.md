---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T21:30:00-04:00
doc-reviewed: 2026-05-24T22:15:00-04:00
coded: 2026-05-26T12:25:00-04:00
code-reviewed: 2026-05-26
---

# Phase 5 — Project detail page

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. Read [phase-1-scaffold.md](phase-1-scaffold.md) (the route skeleton + tokens + motion foundation this phase consumes; it already scaffolds `/project/:name` and anticipates "Phase 5's tier breakdown" + "DrawSVG → Phase 5"), [phase-2-data-wiring.md](phase-2-data-wiring.md) (the `useStats()` non-null contract + the privacy allowlist this phase EXTENDS), [phase-3-hero.md](phase-3-hero.md) (the `src/lib/format.ts` formatters + the `useGSAP`/reduced-motion/`<Name>/<Name>.module.css` component pattern this phase REUSES), [phase-4-grid.md](phase-4-grid.md) (the `LiveLinkButton` it reuses, the `grid-order.ts` pure-derivation+test pattern it mirrors, and the **P0 invisible-content guard** + `ScrollTrigger.batch` reveal pattern it inherits), and [phase-0-data-gaps.md](phase-0-data-gaps.md) (the data contract this page renders against). This file is the decisions-not-code recipe for the per-project detail page.

Route: `/project/:name` (the param is **`name`**, scaffolded in Phase 1 `App.tsx` — the tile links `<Link to={`/project/${projectName}`}>`, so the param VALUE is the `projectName`). Phase 5 replaces the Phase 1 `ProjectDetail.tsx` placeholder.

Phase 5 tells **one project's story** as a single-column editorial scroll — magazine opener, then the work, then the rhythm of how it got built. It is the first **route-param-driven** consumer of `useStats()` (the hero read `combined.*`, the grid iterated `projects[]`; this page resolves ONE report by name and 404s honestly when there's no match). The single visual flourish is the **AssetDonut DrawSVG reveal** — everything else is type, negative space, and quiet block reveals.

The bar for "Phase 5 done": every section renders the real data with no `NaN`/`undefined`/broken `<img>`; an unknown or shelved `:name` shows a deliberate **not-found** state (never a blank page or a crash); the page reads as a deliberate editorial scroll (varied alignment/width, movements separated by air) and NOT a stacked grid of stat cards; the AssetDonut draws once on scroll-in and degrades to a fully-drawn donut under reduced-motion / dead-motion-layer; both light and dark pass the water-bead bar; it holds at 360–430px as a deliberate single column. **Eye-on-browser in BOTH modes is the gate — green tests are not enough** (manifesto).

---

## Decisions locked at this deepening (read before executing)

1. **NO authorship surface. The stub's "AUTHORED BY block" is CUT — entirely, not reframed** (ideation §11, locked 2026-05-24; Phase 4 Cascade forward-flagged it). The pre-deepening stub specified an `AuthoredByBlock` rendering a Claude-vs-Briggsy `linesByAuthor` + tokens split with a "you don't tokenize" wink. **Gone.** The page brags by showing the WORK (tokens, assets, cadence, breadth), never a who-wrote-what scoreboard, and owes no one proof. No `linesByAuthor` is read anywhere on this page. (`git.linesByAuthor` still exists in the contract and ships — it's just never surfaced here. The git-attribution inversion landmine stays MOOT for v1 because no surface makes an authorship claim.)

2. **NO provenance tier breakdown. The stub's "Tier breakdown" (Section 7) is CUT** (ATC call, 2026-05-24: *"How you created the magic isn't really the story."*). Authored-vs-pipeline-vs-tool is *how a file came to exist* — the same provenance noise §11 cut from the tile and the authorship split. It does not appear on the detail page in any form. (This supersedes Phase 4 Decision 1's "optionally the detail page" and Phase 1 Decision 3's "Phase 5's tier breakdown uses a CSS transition" — both are reconciled in Cascade. Phase 1's note was descriptive, not load-bearing; nothing breaks.)

3. **A "WHAT GOT BUILT" composition inventory REPLACES the tier breakdown AND absorbs the stub's "Top subcategories" section** (ATC call, 2026-05-24). The story worth telling is *what exists* — the **breadth** of an autonomous build: code, tests, plans, generation-prompts, images, audio, video, configs. Each kind shown in its **natural unit** (code in lines, tests/docs/configs in files, media in counts) so nothing lies — this is what dissolves the "bytes read ~95% pipeline" problem that killed the tier bar. It is a curated, ordered set of bare count-callouts, NOT a chart and NOT a provenance split. It supersedes the stub's separate `topSubcategories`-driven "Five callout cards" (that was top-5-by-bytes → reliably "video, images, more video"; a curated breadth inventory is the better, more on-thesis story). `topSubcategories` goes unconsumed by the site (harmless; Phase 0 still computes it).

4. **Composition data is derived in a NEW pure lib `src/lib/composition.ts` from the published `tiers[]` tree — NOT a new CLI field.** The choice of *which* kinds to show, their editorial labels, and their units is a **presentation/editorial** decision and belongs in the site, not the `project-metrics` CLI. `composition.ts` walks `report.tiers[]` (`TierReport → CategoryReport → SubcategoryStats{ subcategory, files, bytes, totalLines, nonBlankLines }` — verified in `taxonomy.ts:58-76`) and maps specific `(category, subcategory)` pairs → curated kind callouts. **This requires `tiers[]` to survive the publish strip** — see the Cascade prerequisite (the privacy allowlist froze before this idea existed). Mirrors `grid-order.ts` (Phase 4): pure, tested, no React.

5. **The AssetDonut is the page's ONE flourish** (ideation bar: one flourish per surface). Built as **stroked SVG `<circle>` arcs** (NOT filled `<path>` wedges) because DrawSVGPlugin animates `stroke-dashoffset`/`stroke-dasharray` and **requires a visible stroke** (verified against GSAP AI-skills docs via Context7, 2026-05-24). Source: `assetBytesByKind` (`{ images, audio, video, fonts, 'misc-media' }` bytes — Phase 0 §0.2). The donut tells the **media-volume** story (bytes); the composition inventory tells the **breadth** story (counts) — complementary cuts, no redundancy. DrawSVGPlugin is **registered in Phase 5** (`gsap-context.ts`) — Phase 1 deliberately did not register it (zero earlier consumers).
   - **ONE length basis — real circumference, NOT `pathLength="100"`** (doc-review feasibility, confirmed against the installed `gsap@3.14.2/DrawSVGPlugin.js`): DrawSVG computes the circle's length from its `r` attribute (`Math.PI * …`) and **ignores the SVG `pathLength` attribute**; its `%` values resolve against that measured circumference. If the C2 static dash math is hand-authored in units of 100 (via `pathLength="100"`) while C3's DrawSVG resolves against real `2πr`, the **static fallback and the animated resting state disagree** — the reduced-motion / dead-layer donut (which relies on C2's static state) renders different arc lengths than the motion path. So: **drop `pathLength`; compute the C2 static `stroke-dasharray`/`-dashoffset` from real `2πr`** (the same basis DrawSVG uses), and let C3 animate `drawSVG: 'start% end%'` with the cumulative percentages (DrawSVG converts them via the real circumference). `stroke-linecap: butt` (segments meet cleanly; round caps overhang neighbors).
   - **Degenerate cases** (doc-review adversarial): **one non-zero kind** → a single full ring; the "distinct buckets" framing doesn't apply (it's just "a ring draws"), and the `butt`-cap seam at 12 o'clock is the prominent feature — acceptable, but don't claim a buckets story for n=1. **Sub-~2% slivers** (e.g. `fonts` 2 MB against 1.2 GB video ≈ 0.16%) render as a near-invisible arc while the legend still lists the kind — which also breaks the color-blind position-pairing (no findable slice to pair). Guard: enforce a **minimum rendered arc** (e.g. floor each non-zero slice to ≥ a few degrees so it's visible + pairable) while the legend shows the TRUE byte value; the proportions are approximate by design (the legend carries the exact number). Only EXACTLY-zero kinds are omitted (a slice + its legend row); never-omit a tiny-but-nonzero kind.

6. **emil reveal calls (baked, not deferred to Phase 9):**
   - **Donut** = per-segment **staggered draw** (the stagger communicates "distinct buckets"), `ease.arrive`, ~`duration.reveal` (0.8s) per segment with a `stagger.tiles` (0.06)-band offset; legend + byte-labels fade in **after** the ring settles (not synced per-segment — that competes); the center total is **static** (no second tick-up counter — the hero owns the only counter on the site). Reduced-motion → final fully-drawn donut + labels instant.
   - **Sparkline** = **NO draw-on** (a DrawSVG line would be a second flourish, violating one-per-surface). It is a plain block fade+rise like every other block; the *shape* is the content, not the drawing of it.
   - **Block reveals** = block-level (not per-child) subtle fade+rise (`autoAlpha` + `y: 24`, `duration.reveal`, `once: true`), NEVER `scale(0)`. Smaller `y` than the grid's 40px — this is a reading page, not a tile grid. The composition inventory is the ONE block that earns an internal child stagger (it's a set, like the hero supporting line).

7. **frontend-design composition calls (baked):** the page is an **editorial scroll, not a dashboard**. Per-block alignment/width/treatment is deliberately VARIED (see "The page contract"): hero asymmetric, tokens a left ledger, description a centered narrow prose breath, donut centered, inventory a left grid, sparkline **full-bleed wide**, iteration a small caption. **Nothing is boxed in a card** — type-on-background + negative space + hairline dividers BETWEEN movements only. The **single gold accent** (`--accent-stat-highlight`, README "ONE moment per surface") is spent on the **tokens-consumed total** — the per-project AI-native magnitude. The donut earns its moment through motion, the gold through color; no element gets both.

8. **An unknown or shelved `:name` → a deliberate NOT-FOUND state, NOT a per-archive detail page** (resolves the stub's open question). Archive/shelved projects have **no individual `ProjectReport`** — they live only in `report.archiveCollective` (Phase 0 Decision 3/4; Phase 4 Decision 6/15). There is literally no per-project data to render for a shelved name in v1. So both a typo'd name and a shelved name resolve to the same clean not-found block (heading + "no project by that name" + back-to-grid link). Per-archive detail pages stay a post-v1 option (the `status: 'shelved'` schema value is kept open) but are explicitly out of scope here.

9. **REUSE, do not re-roll** (Phase 4 System-wide-impact contract): `src/components/LiveLinkButton/` (`{ href, label? }` — used twice here: live link `label="Try it →"` default, repo link `label="Source →"`), `src/lib/format.ts` (`formatInt`, `formatBytes`, `formatTokens`, `pickTokenUnit`, `formatModelList`, `formatAge`, `padCounter`), and the `grid-order.ts` pure-derivation+test pattern (mirrored by `composition.ts`). `ProjectTile` is NOT reused (this is a full page). Phase 5 ADDS `formatShortDate` to `format.ts` (the sparkline callouts + token window need a short human date).

10. **Static-first, motion-second commit order** (Phase 3/4 rhythm): C1 pure logic + tests; C2 the full composition at FINAL state with real data, route resolution, the not-found fork, every section's null-degrade, responsive, both modes — NO animation; C3 layers the donut DrawSVG flourish + block reveals + gallery lightbox + reduced-motion. Never debug a layout bug through a running animation.

11. **`/frontend-design` + `/emil-design-eng` both fired at this deepening** (Briggsy's "as appropriate"). Composition/hierarchy/anti-dashboard/the-magazine-hero from frontend-design; the donut reveal feel, sparkline restraint, page-density ceiling, and long-page scroll-reveal fatigue from emil. Their calls are baked into the recipe (Decisions 6–7 + the page contract), not deferred to Phase 9.

12. **CONTENT FLOOR — the page is verified against the DATA-SPARSE project, not just BURNED** (doc-review, adversarial + design + the through-line finding). The plan must not be designed only against the data-rich case. The worst real case is the **smallest real projects** (`tic-tac-toe`, `pacman`) on a clean deploy box: `tokens: null` (no JSONL on the runner), `assetBytesByKind` all-zero (no pipeline media), a thin `tiers[]` (code + tests + a README), and — until the editorial worksheet runs — `editorial: null`. With everything null, Movements 2 (tokens/gold), 3 (description), 4 (donut), 6 (gallery), 7 (invitation) all omit → a bare hero + sparkline + a 1–3-item inventory. The page must still read as a composed STORY for the leanest project, not just the rich ones. Two guardrails:
   - **EDITORIAL IS A HARD DEPENDENCY for any project with a detail page.** Every project in `projects[]` MUST carry an `editorial` block with at least `oneLiner` + `description` (sourced in preflight −1.5 worksheet + each `project-metrics.config.yaml`). That guarantees the **opener one-liner + the description prose breath always render**, so the page always tells a STORY even when token/media data is sparse. This makes the editorial worksheet a Phase-5 blocker, not optional polish. (The leanest real projects — `tic-tac-toe`, `pacman` — especially need rich editorial, since they're the most data-sparse.)
   - **The composition inventory has a presentation floor** (kills the "3 items in a 4-col grid = empty 4th column" dead-space failure): when `items.length <= 3`, render the callouts as a **centered single row** (inline-flex, gap), NOT the `auto-fit` grid; the grid (4-col desktop / 2-col mobile) is used only for `items.length >= 4`. If `items.length === 0`, omit the section (Decision 3). `composition.ts` guarantees a near-universal floor in practice (any project with source files yields ≥1 "code" callout; most yield code + tests + docs ≥ 3), but the layout must not look broken at 1–3.

---

## Cascade prerequisite (apply BEFORE C1 — verify each landed)

These edits touch docs/data other phases own. Apply them in the deepen commit, then verify before executing Phase 5.

### A. Privacy publish surface — `tools/project-metrics` `strip-for-publish.ts` (mechanism corrected at doc-review)
**The mechanism, verified against Phase 0 §0.10 (lines 1094–1182):** `stripForPublish` is a **DENYLIST** — it deep-walks and deletes `projectPath` only, returning everything else. `ALLOWED_KEY_PATHS` is NOT a projection filter; it is a **test tripwire** (test #5 `stats-shape.test.ts` asserts `publishedPaths ⊆ ALLOWED_KEY_PATHS`). Two consequences that REVERSE the naïve "missing path → empty section" fear:
- **The detail-page fields are published automatically** (`tiers[]`, `git.timeline`, `proxies`, `assetBytesByKind`, `tokens.byModel/sidechainTokens` are all on `ProjectReport`/`GitStats` and are NOT `projectPath`, so the denylist keeps them). No section renders empty from stripping.
- **Phase 0's own test #5 FORCES every published path into `ALLOWED_KEY_PATHS`** — when Phase 0 executes, the deep-walk emits `tiers[]…`, `timeline…`, `proxies…` etc., so `ALLOWED_KEY_PATHS` MUST enumerate them or Phase 0's test #5 fails (before Phase 5 exists). So "is the field allowlisted" is a Phase-0-executes-correctly property, not a Phase-5 action.

**So Phase 5's only genuine asks of Phase 0 are two privacy curations (not a broad widening):**
1. **DROP `git.timeline.largestSingleCommit.sha` from the publish surface** (security review): it's a private-repo commit identifier, falls outside the "number/ISO/taxonomy-term/model-name/null" structural rule, the UUID grep-guard won't catch a bare 40-char hex, and **the UI never renders it** (the sparkline callout shows only `linesAdded`). Add `sha` to the `stripForPublish` DENYLIST (delete it like `projectPath`) AND omit it from `ALLOWED_KEY_PATHS`. (Keeping `dateISO/linesAdded/linesRemoved`.)
2. **Acknowledge `git.timeline.commitsByDay[].date` publishes private-repo activity dates** (working-cadence disclosure). Accepted by design — the sparkline IS the cadence story — but record it as a conscious decision in Phase 0, not absorbed under "no PII." (Dates carry no path/username/secret; the grep-guard correctly ignores ISO dates.)

**`editorial.{description,gallery,largestCommitCaption}` are author-controlled free-text** — they bypass the structural "no free-text" rule by the §0.6 carve-out. Two guards (both already in the system, restated so Phase 5 inherits them): the Phase 8 pre-publish grep-guard scans string VALUES for `C:\`/`C:/`/`/Users/`/email/etc. (catches a stray absolute path in a description or a pre-refresh `gallery[]` entry); and `gallery[]` entries are rewritten to `/assets/<projectName>/<base>` by Phase 2's refresh (or `null`). **Client-render guard (Phase 5 owns):** render `description` as a React **text node** (plain `{description}` interpolation), NEVER as injected raw HTML (a YAML block scalar can contain a `<script>` tag) — see Landmines.

**Verify (run after Phase 0 + refresh have produced a real `stats.json` — fields PRESENT, sha ABSENT):**
```
cd C:/Users/brigg/ai-learning-journey/projects/ai-journey-stats
pnpm refresh
node -e "const r=require('./public/data/stats.json'); const p=r.projects[0]; console.log({tiers:!!p.tiers, timeline:!!p.git.timeline, byModel:!!(p.tokens&&p.tokens.byModel), proxies:!!p.proxies, sha:(p.git.timeline.largestSingleCommit||{}).sha})"
```
Expect `tiers/timeline/byModel/proxies` truthy and `sha` `undefined`. (Greps of `strip-for-publish.ts` substrings give FALSE confidence — `tiers` matches `tiers[].tier` even if leaf paths are absent, and the denylist file doesn't enumerate kept paths at all. Verify the real generated JSON, not the source.) **This touches the doc-reviewed Phase 0 (a denylist add + a recorded cadence-disclosure decision)** — note it in Phase 0's frontmatter and re-run `pnpm test` (test #5 must still pass with `sha` removed from both the output and the allowlist).

### B. `phase-5-detail.md` body — stale sections removed
The pre-deepening body specified `AuthoredByBlock` (Section 2) and a Tier breakdown (Section 7). Both are **deleted from this document** (not left as stale code blocks — the deepening-drift anti-pattern). This deepened body is the authoritative section list.

### C. `README.md` (plans index)
- **Verification gate 8** ("AUTHORED BY block renders both `linesByAuthor` AND `tokens`…") and **gate 8a**'s AUTHORED-BY mention: **remove the AUTHORED-BY language**. Gate 8a's TOKENS CONSUMED clause stays (rephrased to drop "between AUTHORED BY and Description"). Authorship is silent (§11) — no gate asserts an authorship surface.
- **"Named wow moments → Project detail: the AssetDonut DrawSVG reveal"** — stays accurate.
- Add a detail-page line to the verification block: "Detail page resolves `/project/:name`; unknown/shelved name → not-found state; composition inventory + donut + sparkline render from real data."

### D. `ideation.md` §3
"Detail page expands with bigger visual (or gallery), 2-3 sentence description, 'Try it →' button" — still accurate; ADD that the detail page also surfaces the project's WORK (tokens consumed, asset-media donut, what-got-built breadth inventory, commit cadence) and makes **no authorship claim** (§11). Light touch — §3 isn't wrong, just thin.

**Verify the Cascade landed:**
```
grep -n "AUTHORED BY\|AuthoredBy\|linesByAuthor" docs/plans/phase-5-detail.md docs/plans/README.md   # expect ZERO hits in the detail spec / gates
grep -n "tier breakdown\|TierBreakdown\|tier-proportion" docs/plans/phase-5-detail.md                 # expect ZERO hits
```

---

## Current state (verified at deepening, 2026-05-24)

**Data contract this page reads (post-Phase-0 — exact paths verified against `taxonomy.ts` + `phase-0-data-gaps.md`):**
- `useStats()` returns a NON-NULL `MultiProjectReport` (Phase 2): `{ projects, meta, archiveCollective, combined, scannedAt }`. (`meta` is totals-only — no detail pages; this page reads `projects` only.)
- **Project lookup:** find the `ProjectReport` in `projects` where `projectName === name`. Detail pages are for the **9 active projects only** (ideation §7 — meta tiles cut); the lookup never considers `meta[]`. Archive entries are NOT here (collective only) → a shelved name finds nothing → not-found (Decision 8).
- Per `ProjectReport` the page consumes:
  - `projectName` (hero title). (`kind` is unused for layout — every detail page is an active project, all render identically.)
  - `git`: `projectAgeDays: number | null` (`formatAge`), `totalCommits`, `timeline.{commitsByDay[], activeDays, peakDay, largestSingleCommit}`, `assetModificationEvents`, `discardedAssetFiles`. **NOT `linesByAuthor`** (Decision 1).
  - `proxies.iterationProxyTotal` (iteration caption — on `proxies`, NOT `git`; the stub mis-pathed this).
  - `grandTotals.allFiles` (hero subtitle "K files").
  - `tiers[]` (composition inventory via `composition.ts` — Decision 4).
  - `assetBytesByKind` (donut — Decision 5).
  - `tokens: TokenStats | null` — `tokensProcessed`, `tokensFresh`, `sessionCount`, `windowStartISO/EndISO/Days`, `byModel[]`, `sidechainTokens`. **`null` → suppress the whole tokens section** (null discipline).
  - `editorial: EditorialContent | null` — `oneLiner`, `heroImage`, `liveUrl`, `repoUrl`, `description`, `gallery[]`, `largestCommitCaption?`. **`null` → degrade** (no one-liner, no description, no image/links/gallery; the page still renders the data-derived sections).
- **`editorial.heroImage`/`gallery[]`** are rewritten to `/assets/<projectName>/<base>` by Phase 2's refresh (or `null`).

**Foundation inherited (consume — do NOT redefine):**
- **Format (Phase 3 + Phase 4):** `src/lib/format.ts` — `formatInt`, `formatBytes`, `formatTokens`, `pickTokenUnit`, `formatModelList`, `padCounter`, `formatAge`. Phase 5 ADDS `formatShortDate`.
- **Motion (Phase 1 + Phase 4):** `gsap-context.ts` exports `{ gsap, useGSAP, CustomEase, ScrollTrigger }` (Phase 4 added ScrollTrigger). `easings.ts` `ease.arrive`/`ease.press`. `motion/tokens.ts` `duration.{reveal:0.8, hover:0.25, press:0.16}` + `stagger.{tiles:0.06}`. `reduced-motion.ts` `prefersReducedMotion()`.
- **Component convention (Phase 3/4):** `src/components/<Name>/<Name>.tsx` + `<Name>.module.css`, `useGSAP(() => {…}, { scope: ref })` + `contextSafe`, `prefersReducedMotion()` branch FIRST, JS-only hidden state (`gsap.set autoAlpha:0`) — never CSS `opacity:0` (the P0 invisible-content guard: a dead motion layer leaves everything visible).
- **Tokens (Phase 1, semantic):** `--surface-*`, `--text-primary/secondary/muted`, `--accent-stat-highlight` (gold), `--accent-primary`, `--accent-focus`, `--border-subtle`, `--surface-divider`, `--radius-tile/chip`, `--font-display/body/mono`, `--text-display-md/-stat-callout/-body-lg/-body/-meta`, `--space-*`, `--leading-*`, `--tracking-*`. `.tabular` in `global.css`. **`--text-muted` AA bump** (Phase 3 cascade) is RELIED ON — all info-bearing text uses `--text-secondary` (≥7:1); `--text-muted` only for decorative chrome.
- **Routing (Phase 1):** `import { useParams, Link } from 'react-router'`; route `/project/:name` already in `App.tsx`; the `[data-route-transition]` cross-fade seam exists (no-op; the cross-fade itself is a later phase).
- **DrawSVGPlugin is NOT yet registered** (Phase 1 Decision 3 deferred it to here). It ships inside `gsap@^3.14.2` (free, all plugins, since the Webflow acquisition — README stack row). Import `from 'gsap/DrawSVGPlugin'`.

**Phase 1 placeholder being replaced:** `src/pages/ProjectDetail.tsx` renders an inline-styled `{name}` heading + a smoke-test mono digit string. Phase 5 replaces the body.

**⚠ Precondition gate (run before C1 — Phase 0 must have executed/built AND a refresh produced a real `stats.json`):**
```
# 1. Contract present in the built types
grep -nE "tiers|assetBytesByKind|timeline|byModel|sidechainTokens|iterationProxyTotal|assetModificationEvents" \
  C:/Users/brigg/ai-learning-journey/tools/project-metrics/dist/taxonomy.d.ts
# 2. Fields actually PUBLISHED (and sha dropped) — the real gate, against generated JSON not source (Cascade A)
cd C:/Users/brigg/ai-learning-journey/projects/ai-journey-stats && pnpm refresh
node -e "const p=require('./public/data/stats.json').projects[0]; console.log({tiers:!!p.tiers,timeline:!!p.git.timeline,byModel:!!(p.tokens&&p.tokens.byModel),proxies:!!p.proxies,sha:(p.git.timeline.largestSingleCommit||{}).sha})"
```
Gate (1) must hit every name. Gate (2) must show `tiers/timeline/byModel/proxies` truthy and `sha` undefined. If contract names miss, Phase 0 hasn't executed/rebuilt — STOP. If a field is absent from the published JSON, Phase 0's `ALLOWED_KEY_PATHS`/denylist isn't right (Cascade A) — STOP. Read field NAMES from `phase-0-data-gaps.md`, never the pre-Phase-0 dist.

---

## The page contract (locked composition — top to bottom)

frontend-design + emil lens. A single-column editorial scroll grouped into **movements** separated by air (and a hairline divider between movements, never between blocks). Max content measure ~`72ch` except where noted "full-bleed wide". The back-to-grid link is persistent top-left. **Nothing is boxed in a card** (Decision 7).

```
  ← all projects                                                      (persistent back-link, top-left)

  ┌─ MOVEMENT 1 · THE OPENER ─────────────────────────────────────────────────┐
  │  BURNED                          ┌──────────────────────────┐             │
  │  Born 50 days ago ·              │                          │             │
  │  1,204 commits · 892 files       │     [ hero image ]       │   ← ~58/42 split desktop;
  │                                  │     16:9, radius, cover  │     text left, image right
  │  Archer-tone spy party game,     │                          │     (stacks text-then-image
  │  rebuilt from Exploding Kittens. └──────────────────────────┘      on mobile)
  └────────────────────────────────────────────────────────────────────────────┘
  ────────────────────────────────────────────────────────────────  (movement divider)

  ┌─ MOVEMENT 2 · THE MAGNITUDE ──────────────────────────────────────┐
  │  TOKENS CONSUMED                                                   │   ← left ledger, mono/tabular
  │     147.2M   ← THE GOLD                                            │     total = the one gold moment
  │     Opus 4.7     112.4M    74 sessions                            │
  │     Sonnet 4.6    31.1M    18 sessions                            │     per-model rows, tabular columns
  │     Haiku 4.5      4.5M    12 sessions                            │
  │     across 22 days of session retention · Apr 7 → May 24          │   ← window footnote, --text-secondary
  │     12% from subagent runs                                        │   ← sidechain footnote, --text-muted
  └───────────────────────────────────────────────────────────────────┘

  ┌─ MOVEMENT 3 · THE STORY ──────────────────────────────────────────┐
  │        A six-player hidden-role party game with a full           │   ← centered, ~58ch, body-lg
  │        illustrated card deck, voice lines, and a 90-second        │     PROSE BREATH (no numbers)
  │        origin trailer — all built autonomously.                   │
  └───────────────────────────────────────────────────────────────────┘
  ────────────────────────────────────────────────────────────────  (movement divider)

  ┌─ MOVEMENT 4 · THE WORK ───────────────────────────────────────────┐
  │                    ╭───────────╮                                  │
  │                   ╱   DONUT     ╲     ◜ images   1.2 GB           │   ← donut CENTERED (the flourish);
  │                  │   1.4 GB      │    ◜ audio    180 MB           │     legend beside (desktop) /
  │                   ╲  generated  ╱     ◜ video    41 MB            │     below (mobile)
  │                    ╰───────────╯      ◜ fonts    2 MB            │
  │                                                                   │
  │  WHAT GOT BUILT                                                   │   ← section label, small-caps
  │   38,412   1,247    92      120                                   │   ← 4-col grid (2-col mobile),
  │   code     tests   plans  prompts                                 │     BARE callouts, no boxes,
  │   lines    files   docs   files                                  │     tabular numbers + evocative
  │   2,140    340      18     56                                     │     small-caps labels
  │   images   audio   video  configs                                │
  │            files   renders files                                 │
  └───────────────────────────────────────────────────────────────────┘
  ────────────────────────────────────────────────────────────────  (movement divider)

  ┌─ MOVEMENT 5 · THE RHYTHM ─────────────────────────────────────────────────────┐
  │  ▁▂▃▅▇▆▄▃▂▄▆▇▅▃▂▁▂▃▄  (cadence sparkline — FULL-BLEED WIDE, ~80px, no axes)     │
  │  ACTIVE DAYS 47    ·    PEAK Apr 22 · 47 commits    ·    LARGEST +4,200 lines  │
  │  1,180 asset revisions · 340 discarded along the way                          │   ← iteration caption, small
  └────────────────────────────────────────────────────────────────────────────────┘

  ┌─ MOVEMENT 6 · THE PROOF (only if editorial.gallery non-empty) ────┐
  │  [img] [img] [img] [img]   ← responsive grid → click to lightbox  │
  └───────────────────────────────────────────────────────────────────┘

  ┌─ MOVEMENT 7 · THE INVITATION ─────────────────────────────────────┐
  │                  Try it →        Source →                         │   ← centered; LiveLinkButton ×2,
  └───────────────────────────────────────────────────────────────────┘     only those whose URL is present
```

*(All numbers ILLUSTRATIVE — real values from `stats.json`. The recipe must render correctly for whatever the data is, including every null-degrade path.)*

**Section specs:**

| # | Section / component | Source | Layout / type | Null & degrade behavior |
|---|---|---|---|---|
| 0 | Back-link | static → `<Link to="/">` | top-left, `--text-secondary`, `:focus-visible` ring, ≥44px tap target | always present |
| 1 | `DetailHero` | `projectName`, `git.projectAgeDays`/`totalCommits`, `grandTotals.allFiles`, `editorial.oneLiner`/`heroImage` | desktop grid ~58/42 text/image, vertically centered; mobile stacks text→image (image full-width band). Name `--font-display` `--text-display-md`+; subtitle `--font-mono` `.tabular` `--text-meta`; one-liner `--text-body-lg` `--text-secondary` | `projectAgeDays` null → drop the "Born …" clause (keep commits/files). `editorial` null → no one-liner. `heroImage` null OR `<img onError>` → text goes full-width, type-forward (bigger name); never a broken-image glyph. |
| 2 | `TokensBlock` | `tokens` (`TokenStats`) | left-aligned ledger; label small-caps; **total `--accent-stat-highlight` (gold)** `--text-stat-callout` `.tabular`; per-model rows `--font-mono` `.tabular` columns; footnotes `--text-secondary` (window) + `--text-muted` (sidechain) | **`tokens === null` → omit the ENTIRE section** (clean clone / CI / no JSONL). `byModel` empty → show total only. `windowDays` null → drop window clause; `0` → "under a day". `sidechainTokens` 0 → drop the sidechain footnote. |
| 3 | Description | `editorial.description` | centered, `max-width: 58ch`, `--text-body-lg`, `--leading-body`, generous vertical air — the prose breath | `editorial` null OR empty description → omit section (the air between movements still reads). |
| 4 | `AssetDonut` | `assetBytesByKind` | centered; SVG stroked-circle arcs (Decision 5); legend beside (desktop) / below (mobile) with `formatBytes` amounts; center = total media bytes (`formatBytes`, static) | All five kinds 0 (no media — e.g. a pure-tool project) → omit the donut entirely (an empty ring is noise). One or more 0 → omit that slice + legend row, render the rest. |
| 5 | `CompositionInventory` | `composition.ts(report)` ← `tiers[]` | section label small-caps; 4-col grid desktop / 2-col mobile, **bare callouts** (no boxes), `--space-*` gaps; value `--text-stat-callout` `.tabular` `--text-primary`; label small-caps `--text-secondary`; internal child stagger on reveal (the one earned stagger) | `composition.ts` OMITS zero-count kinds (a project with no video shows no "video" callout — the inventory reflects ITS real breadth). If the curated set is empty (degenerate) → omit section. |
| 6 | `CadenceSparkline` | `git.timeline` | **full-bleed wide** (breaks the measure); ~80px tall SVG area/line, **monotone-cubic path hand-rolled (no D3 — `curveMonotoneX` is the D3 name for the same Fritsch–Carlson math), never Catmull-Rom/straight** (honesty lock — never overshoots a real max or dips below a zero-day; see phase-9); NO axes/gridlines; 3 callouts below in a row (`activeDays`, `peakDay` via `formatShortDate`, `largestSingleCommit.linesAdded`); plain block reveal (no draw-on) | `commitsByDay` empty / non-repo → omit the sparkline shape; `peakDay`/`largestSingleCommit` null → that callout shows em-dash or is dropped. `editorial.largestCommitCaption` absent → caption omitted, raw stat stands. |
| 7 | Iteration caption | `git.assetModificationEvents`, `git.discardedAssetFiles`, `proxies.iterationProxyTotal` | small left caption under the cadence callouts, `--text-secondary` `--text-meta`, ONE sentence with inline numbers — lowest visual weight (NOT a callout grid) | all relevant counts 0 → omit the caption. Choose the phrasing from whichever counts are non-zero. |
| 8 | `Gallery` | `editorial.gallery[]` | responsive image grid → click opens a lightbox (C3); `<img loading="lazy">` | empty / null → omit the whole movement. `<img onError>` hides the broken tile. |
| 9 | Try-it / Source | `editorial.liveUrl`, `editorial.repoUrl` | centered; `LiveLinkButton` ×2 (`label="Try it →"` / `label="Source →"`), `z-index`/focus/44px from Phase 4 | each null → omit that button. Both null → omit the movement. |

**The gold rule (whole page):** `--accent-stat-highlight` is spent ONCE — the `TokensBlock` total. Nothing else on the page receives gold (not the donut, not an inventory number, not a callout). Do NOT relocate gold to another number to "fill" it when `tokens === null`. **But** (doc-review adversarial): `tokens === null` and all-zero media co-occur on the data-sparse case → the page loses BOTH its gold moment AND its donut flourish at once. The guard is NOT to relocate gold — it's Decision 12's **editorial floor**: the opener one-liner + the description prose are the page's identity/warmth when the quantitative focal moments are absent, so a gold-less, donut-less page still reads as a composed *story*, not a flat stub. Verify this exact combined-null case against the bar (see the verification gate).

### Concrete responsive + render specs (doc-review — fully-decided values an implementer must not guess)

- **DetailHero split:** desktop `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr)` (~58/42), `gap: var(--space-12)`, `align-items: center`. Mobile (`max-width: 768px`): single column, source order text→image, image `width: 100%` (NOT `100vw`) capped at a 16:9 band. `heroImage` null → single column, `type-forward` (name steps up one display step).
- **TokensBlock mobile (`max-width: 600px`):** the 3-column per-model row (model · tokens · sessions) overflows at 360px in mono. Collapse to **two lines per model**: line 1 = model name + `tokensProcessed` (right-aligned tabular); line 2 = `· N sessions` in `--text-meta` `--text-muted`. Total stays `--text-stat-callout`. Verify no horizontal scroll at 360px.
- **AssetDonut sizing:** SVG `width: 100%` + `viewBox` + `preserveAspectRatio="xMidYMid meet"` (never a fixed px `width` attr — that forces overflow). Desktop: donut + legend side-by-side, donut capped `max-width: ~320px`. Mobile (`max-width: 768px`): donut square at full container width **capped ~360px**, legend stacks below. (Restates README "Detail page on mobile" cap.)
- **CompositionInventory grid:** `repeat(auto-fit, minmax(140px, 1fr))` (gives 2 cols at 360px, up to 4 on desktop), `gap: var(--space-8)` row / `var(--space-6)` col. **Layout floor (Decision 12):** `items.length <= 3` → render a centered `inline-flex` row instead of the grid (no empty trailing column).
- **CadenceSparkline:** build ONE smooth `<path>` (not `<polyline>`) from `commitsByDay[]` normalized into a `viewBox` (e.g. `0 0 1000 80`), `width: 100%`, `preserveAspectRatio="none"`; area fill `--accent-primary` at ~0.12 alpha, stroke line `--accent-primary` at full. **NO hover/tooltip in v1** (state it so no one adds a crosshair). **Full-bleed containment:** the wide wrapper uses `width: 100%` within a full-bleed section whose parent has `overflow-x: clip`; do NOT use `100vw` (scrollbar-gutter overflow). Verify zero horizontal scroll at 360–430px.
- **Gallery lightbox (v1 scope):** **open/close only — NO prev/next navigation** (one image per open; close → reopen for the next). On open, show the already-loaded grid `<img>` scaled into the overlay (no spinner; the thumb is cached from the grid). Esc + click-out + a close button dismiss; trap focus while open; restore focus to the triggering tile on close.
- **Donut C2 placeholder palette (can't fully defer to Phase 9 — C2 renders real colors):** use an ordered set of existing semantic tokens for the ≤5 slices — `--accent-primary`, `--text-primary`, `--text-secondary`, `--border-strong`, `--text-muted` — distinguished by the labeled legend rows (meaning never rides on hue; Briggsy is color blind). Gold (`--accent-stat-highlight`) is RESERVED for the tokens total — never a donut slice. Phase 9 pins a proper mode-aware sequential palette; C2 ships with these.
- **Not-found state:** set `document.title` to `"Not found · ai-journey-stats"` (not the raw URL); heading + one sentence + `← all projects`.

---

## Output structure (what this phase adds)

```
projects/ai-journey-stats/
├── src/
│   ├── lib/
│   │   ├── composition.ts            # NEW — tiers[] → curated kind callouts (pure, tested)
│   │   ├── composition.test.ts       # NEW — vitest (node env)
│   │   ├── format.ts                 # MODIFIED — add formatShortDate()
│   │   └── format.test.ts            # MODIFIED — add formatShortDate cases
│   ├── components/
│   │   ├── DetailHero/               # NEW — magazine-opener split (name/meta/one-liner + image)
│   │   ├── TokensBlock/              # NEW — gold total + per-model ledger + footnotes
│   │   ├── AssetDonut/               # NEW — stroked-arc SVG donut + DrawSVG reveal (the flourish)
│   │   ├── CompositionInventory/     # NEW — "what got built" bare-callout grid
│   │   ├── CadenceSparkline/         # NEW — full-bleed activity shape + 3 callouts + iteration caption
│   │   └── Gallery/                  # NEW — image grid + lightbox (conditional)
│   ├── motion/
│   │   └── gsap-context.ts           # MODIFIED — register DrawSVGPlugin (Phase 5 introduces it)
│   └── pages/
│       └── ProjectDetail.tsx         # MODIFIED — useParams lookup, not-found fork, compose sections, reveal owner
└── (no new package deps — DrawSVGPlugin ships inside gsap; LiveLinkButton + clsx from Phase 4)
```

Scope declaration, not a constraint — the per-commit file lists below are authoritative. (`LiveLinkButton` is reused, not created. The iteration caption lives inside `CadenceSparkline` / the page, not its own component — it's one quiet line.)

---

## Dependencies

**No new package deps.** `DrawSVGPlugin` is part of `gsap@^3.14.2` (installed Phase 1) — `import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'`. `clsx@^2.1.1` (Phase 3) is available for conditional classes. `vitest.config.ts` already includes `src/**/*.test.ts` (Phase 3) → `composition.test.ts` runs without config change.

---

## Execution — three commits, ordered (static-first, per Phase 3/4)

Each commit has a verify gate. Don't proceed past a red gate (manifesto: runtime truth > "it compiles").

### Commit 1 — pure logic: `composition.ts` + `formatShortDate` + tests

The feature-bearing, unit-testable concentrate (mirrors `grid-order.ts`).

**5.1a — `src/lib/composition.ts`:**
- `buildComposition(report: ProjectReport): Array<{ key: string; label: string; value: number; unit: 'lines' | 'files' | 'count' }>` — pure. Walks `report.tiers[]` and maps a CURATED, ORDERED set of `(category, subcategory)` selectors → kind callouts. The selector list (edit point for the editorial kind set):
  - `code` → "lines of code" (lines) ← authored/code/source `.totalLines`
  - `tests` → "tests" (files) ← authored/code/tests `.files`
  - `plans & docs` → "plans & docs" (files) ← the authored/docs `CategoryReport.totals.files` (use the **pre-computed `totals`**, not a manual subcategory sum — `CategoryReport` already carries a summed `totals: SubcategoryStats`)
  - `prompts` → "generation prompts" (files) ← authored/data/generation-prompts `.files`
  - `configs` → "config files" (files) ← authored/code/config `.files`
  - `images` → "images" (count) ← pipeline/assets/images `.files`
  - `audio` → **"audio files"** (count) ← pipeline/assets/audio `.files`. **Label honesty (doc-review):** `assets/audio` is ALL audio — music beds, SFX, royalty-free stems, TTS — NOT just voice lines. Labeling it "voice lines" would lie (the exact failure Decision 3's "natural unit so nothing lies" thesis forbids). Call it "audio files" (or "sound files"). Editorial copy may rename per-project later, but the DEFAULT must be honest.
  - `video` → "video renders" (count) ← pipeline/assets/video `.files`
  - **OMIT any kind whose resolved value is 0** (Decision 3 / section-5 null rule — the inventory reflects each project's real breadth, never "0 audio files"). Missing tier/category/subcategory in `tiers[]` resolves to 0 → omitted (defensive: never throw on a missing node). See Decision 12 for the `items.length <= 3` layout floor.
- A tiny `findProject(report: MultiProjectReport, name: string): ProjectReport | null` — searches `report.projects` by `projectName`, returns `null` if absent (drives the not-found fork). Only the 9 active projects get detail pages (ideation §7); `meta[]` is NOT searched. Pure, trivially tested. (Lives here or in a `lookup.ts`; co-locating with composition is fine.)

**5.1b — add `formatShortDate` to `src/lib/format.ts`:**
- `formatShortDate(iso: string | null): string | null` — `null → null`; else parse ISO → `"Apr 22"` (en-US, month-short + day, no year). Used by the peak-day callout + the token window range (`Apr 7 → May 24`). Pure.

**5.1c — tests** (`composition.test.ts` new; `format.test.ts` extended):
- `buildComposition`: Happy — a full `tiers[]` fixture yields the curated kinds in order with correct values/units; Edge — a project with no `audio`/`video` omits those kinds; Edge — a missing category node resolves to 0 and is omitted (no throw); Edge — empty `tiers: []` → `[]`; Edge — `plans & docs` sums multiple `docs` subcategories; Edge — does not mutate input.
- `findProject`: Happy — finds in `projects`; Edge — a name only in `archiveCollective.projectNames` → `null` (archive entries have no detail page); Edge — unknown name → `null`; Edge — empty `projects` → `null`. (`meta[]` exists for totals but has no detail pages, so `findProject` doesn't search it — a meta name → `null`.)
- `formatShortDate`: `"2026-04-22T..." → "Apr 22"`; `null → null`; a `windowStart`/`windowEnd` pair renders a sensible range when joined by the caller.

**Verify gate:**
```
cd C:/Users/brigg/ai-learning-journey/projects/ai-journey-stats
pnpm test        # composition + format (incl. formatShortDate) green; Phase 2/3/4 tests still green
pnpm typecheck   # clean
```

**Commit:** `feat(ai-journey-stats): composition inventory derivation + findProject + formatShortDate + tests`

---

### Commit 2 — static composition: page + all sections at final state, route + not-found, no motion

The layout/data/null-degrade/responsive/route truth gate. Real data, FINAL visible state, NO animation.

**5.2a — `src/pages/ProjectDetail.tsx`** (replace the Phase 1 placeholder): `useParams<{ name: string }>()` → `findProject(useStats(), name)`. If `null` → render the **not-found** block (heading "No project by that name." + a sentence + `<Link to="/">← all projects</Link>`), set `document.title = "Not found · ai-journey-stats"`, and return. Else compose the movements (Sections 1–9) passing the `ProjectReport` (and `editorial`/`tokens` sub-objects) into each component. **Render all editorial strings (`description`, `oneLiner`, captions) as text nodes — never injected raw HTML** (Cascade A render guard). Owns the scroll-reveal `useGSAP` block (added in C3) — in C2 it renders everything at final visible state.

**5.2b — `src/components/DetailHero/`** (`{ project }`): the magazine-opener split (Decision 7B). Desktop CSS grid `~58% / 42%`, text left + image right, `align-items: center`; mobile single column, text then image (image full-width band, capped aspect). Subtitle composed from `formatAge`-free phrasing: "Born {projectAgeDays} days ago · {formatInt(totalCommits)} commits · {formatInt(allFiles)} files" (drop the Born clause if `projectAgeDays === null`). `heroImage` null / `<img onError>` → `type-forward` (no image column, name steps up). `clsx` drives `has-image`/`type-forward`.

**5.2c — `src/components/TokensBlock/`** (`{ tokens }` — only mounted when `tokens !== null`): left ledger. Total = gold `--accent-stat-highlight` (the page's one gold). Per-model rows from `tokens.byModel` in a `--font-mono` `.tabular` column layout (`formatTokens` + session count via `formatInt`). Window footnote: `formatTokens(tokensFresh)` fresh + `windowDays` + `formatShortDate(windowStartISO) → formatShortDate(windowEndISO)` range (suppress clauses per the section-2 null rules). Sidechain footnote: `Math.round(sidechainTokens / tokensProcessed * 100)%` "from subagent runs" — only if `sidechainTokens > 0` and `tokensProcessed > 0`.

**5.2d — `src/components/AssetDonut/`** (`{ assetBytesByKind }`): SVG (`width:100%`+`viewBox`+`preserveAspectRatio`, capped per the responsive specs) with one stroked `<circle>` per non-zero kind (Decision 5 — `fill:none`, `stroke:<token>`, `stroke-width`, `stroke-linecap: butt`, rotated so 0% is at 12 o'clock). **Dash math on real `2πr`, NOT `pathLength` (Decision 5)** — C2 renders each circle at its FINAL real-circumference `stroke-dasharray`/`-dashoffset` (fully drawn; DrawSVG owns the animated version in C3, resolving its `%` against the same real circumference). Enforce the **minimum-arc floor** for sub-2% slices (Decision 5). Center label = total media `formatBytes` (static, NO tick-up). Legend rows: kind name + `formatBytes` (the true value), beside (desktop) / below (mobile). Omit a slice+row only when EXACTLY 0; omit the whole donut when all five are 0. Use the **C2 placeholder palette** from the responsive specs (gold reserved for the tokens total). **a11y:** SVG `role="img"` + `aria-label` summarizing the breakdown ("media by type: images 1.2 GB, …").

**5.2e — `src/components/CompositionInventory/`** (`{ items }` ← `buildComposition`): section label + bare callouts (NO boxes/borders). Each callout: value `--text-stat-callout` `.tabular` `--text-primary` + evocative small-caps label `--text-secondary`. **Layout (responsive specs + Decision 12):** `items.length >= 4` → `repeat(auto-fit, minmax(140px, 1fr))` grid (2-col @360px → 4-col desktop); `items.length <= 3` → centered `inline-flex` row (no empty grid columns); `0` → omit section.

**5.2f — `src/components/CadenceSparkline/`** (`{ timeline, iteration }`): full-bleed wide wrapper (containment per the responsive specs — `width:100%` inside `overflow-x: clip`, NEVER `100vw`). ONE smooth `<path>` from `commitsByDay[]` normalized into a `viewBox` (`width:100%`, `preserveAspectRatio="none"`); area fill `--accent-primary` ~0.12 alpha, line stroke `--accent-primary`. NO axes, NO gridlines, **NO hover/tooltip in v1**. 3 callouts row below (`activeDays`; `peakDay` via `formatShortDate` + count; `largestSingleCommit.linesAdded` via `formatInt`, with `editorial.largestCommitCaption` appended if present). The iteration caption (Section 7) renders here as one quiet `--text-secondary` line built from the non-zero counts among `assetModificationEvents`/`discardedAssetFiles`/`proxies.iterationProxyTotal`.

**5.2g — `src/components/Gallery/`** (`{ images }` — only mounted when `gallery.length > 0`): responsive grid of `<img loading="lazy">`. Lightbox interaction is wired in C3 (C2 renders the grid; click is a no-op / native). `<img onError>` hides a broken tile.

**5.2h — wire `LiveLinkButton`** (reused) into the page's invitation movement: `liveUrl` → `label="Try it →"`; `repoUrl` → `label="Source →"`; omit each if null.

**Verify gate (eye-on-browser — runtime truth, BOTH modes):**
```
pnpm refresh && pnpm dev
```
- `/project/burned` (and 2–3 other real names) renders every applicable section with real data: hero split + image, tokens ledger with the GOLD total + per-model rows + window footnote, description prose, donut with legend + byte amounts, "what got built" inventory, full-bleed sparkline + 3 callouts + iteration caption, gallery (if any), Try-it/Source.
- **Route + not-found:** `/project/does-not-exist` and `/project/<a shelved name>` (e.g. `hide-and-seek`) both show the deliberate not-found block + back-link — never a blank page, never a crash, never a half-rendered hero. `← all projects` navigates client-side.
- **Editorial-null degrade:** scratch `stats.json` — one project with `editorial: null` (no one-liner/description/image/links/gallery, data sections still render), one with `tokens: null` (tokens MOVEMENT absent, no gold that load, no "0 tokens"), one with `heroImage: null` + one pointing at a missing file (both → type-forward hero, no broken `<img>`), one with empty `assetBytesByKind` (donut omitted), one with `gallery: []` (gallery movement absent), one with `commitsByDay: []` (sparkline shape omitted). Restore.
- **Combined-null / data-sparse (the real ship-first case — Decision 12):** test ONE project that is null/empty on ALL of `tokens` + media + `gallery` simultaneously — and spot-check the leanest real projects (`tic-tac-toe`, `pacman`). With editorial present, it must still read as a composed STORY (opener one-liner + description prose + sparkline + a ≤3-item inventory rendered as a centered row, NOT a 4-col grid with empty columns). Confirm it does NOT look like a broken/half-loaded stub. If editorial is ALSO null here, that's the dependency Decision 12 forbids — flag it, don't ship it.
- **Render safety:** `editorial.description` renders as a text node (a `description` containing `<b>x</b>` shows the literal tag, not bold) — confirm no raw-HTML injection. `Try it →`/`Source →` links carry `rel="noopener noreferrer"`.
- **Composition honesty:** a project with no audio/video shows NO "audio files"/"video renders" callouts (not "0"); a ≤3-item inventory renders as a centered row, not a gapped grid.
- **Both modes** (`?theme=` + OS): ledger, donut legend, inventory, sparkline read deliberate; **gold ONLY on the tokens total**; the page reads as an editorial scroll, NOT a stack of cards (no card borders).
- **360 / 375 / 390 / 430px:** hero stacks text→image (image a deliberate full-width band); inventory is a clean 2-col; sparkline spans full width; no horizontal scroll; tap targets ≥44px.
- **A11y:** keyboard-tab reaches back-link, gallery items, and both invitation links with visible `:focus-visible` rings; the donut SVG has an `aria-label`.

**Commit:** `feat(ai-journey-stats): project detail composition (static) — magazine hero + tokens ledger + donut + what-got-built + cadence + gallery + not-found`

---

### Commit 3 — motion: DrawSVG donut flourish + block reveals + lightbox + reduced-motion

Layer motion onto the verified-correct static page.

**5.3a — register DrawSVGPlugin** in `src/motion/gsap-context.ts`: `registerPlugin(useGSAP, CustomEase, ScrollTrigger, DrawSVGPlugin)` + `export { … DrawSVGPlugin }` (Decision 5). Verify the registration in the prod `preview` (like Phase 1's ease check) — a plugin that registers in dev but tree-shakes in build fails silently.

**5.3b — `AssetDonut` DrawSVG reveal** — ONE `useGSAP(() => {…}, { scope: donutRef })` (the P0 + reduced-motion pattern, Phase 4 Decision 8/9):
- `if (prefersReducedMotion()) return` — immediately, before any `gsap.set` (donut stays fully drawn from C2's static state).
- Hidden state in JS (NOT CSS): `gsap.set(circles, { drawSVG: '0% 0%' })` as the FIRST motion statement (dead-layer → CSS renders the fully-drawn donut; the JS removes-then-draws). Legend starts at `autoAlpha: 0` via `gsap.set` too.
- Reveal on scroll-in via `ScrollTrigger` (`start: 'top 80%', once: true`): a timeline that `fromTo`/`to` each circle to its segment (`drawSVG: 'start% end%'`) with `ease.arrive`, `duration.reveal`, **per-segment `stagger` ~0.08** (emil — distinct buckets); the legend + byte-labels fade in (`autoAlpha: 1`) AFTER the ring settles (timeline position after the last segment, short fade). Center total is static (no tween).
- The `refreshInit`/`refresh` self-heal isn't needed here the way it was for the grid (the donut is one element, not a batch measured against scroll positions) — but the reveal MUST fire if the donut is already in view on load (short page / direct deep-link): use `ScrollTrigger`'s natural on-refresh fire, and verify the donut draws on a direct `/project/:name` load where it's above the fold.

**5.3c — page block reveals** in `ProjectDetail.tsx` — ONE `useGSAP(() => {…}, { scope: pageRef })` (Decision 6, block-level):
- `if (prefersReducedMotion()) return` first.
- `gsap.set('[data-block]', { autoAlpha: 0, y: 24 })` (JS-only hidden state — dead layer leaves all blocks visible).
- `ScrollTrigger.batch('[data-block]', { start: 'top 88%', once: true, onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: duration.reveal, ease: 'weighted-arrive', stagger: stagger.tiles, overwrite: true }) })`.
- `refreshInit` y-reset (Phase 4 Decision 9: `addEventListener('refreshInit', () => gsap.set('[data-block]', { y: 0 }))`) + the `Promise.race([document.fonts.ready, timeout(1500)])`→`refresh()` + `window load` self-heal (hero image + gallery load late and shift positions).
- `[data-block]` is on each MOVEMENT wrapper (not every inner element) — block-level, not per-child (Decision 6: a reading page; per-child reveals down a long page get tiring/janky). The donut owns its own draw (5.3b) — it is NOT also block-revealed (don't double-animate). The CompositionInventory's inner callouts may carry a small additional child stagger inside their block's reveal (the one earned internal stagger).

**5.3d — `Gallery` lightbox** (the only interactive motion; **v1 scope = open/close only, NO prev/next** per the responsive specs): click a tile → an overlay with the image, scaled in from the tile (`ease.press`, `duration.hover`-ish, transform+opacity only, never `scale(0)` — start `scale(0.96)`); reuse the already-loaded grid `<img>` (no spinner — the thumb is cached). Esc / click-out / a close control dismisses (faster exit). Gate any hover affordance behind `@media (hover: hover) and (pointer: fine)`; the lightbox itself is tap-friendly. Trap focus in the open lightbox; restore focus to the triggering tile on close (a11y).

**Verify gate (eye-on-browser, dev AND preview — prod bundle is the real gate):**
```
pnpm dev                      # StrictMode active
pnpm build && pnpm preview    # prod bundle — confirms DrawSVG registration survived tree-shaking
```
- **Donut:** scroll it into view → segments draw in sequence (staggered), the legend + byte amounts fade in after the ring settles; center total static. Direct-load a project where the donut is above the fold → it still draws (ScrollTrigger fires on refresh). Verify in dev AND preview.
- **Block reveals:** each movement fades+rises once as it enters; the top movement(s) reveal on load without scrolling; positions self-heal after the hero image + fonts settle (throttle network to confirm). It does NOT feel like every tiny element is animating — block-level only.
- **P0 (dead layer):** force the motion layer to throw (or DrawSVG absent) → the donut renders fully drawn and every movement is visible (CSS default visible; hidden state JS-only). The load-bearing gate.
- **Lightbox:** click a gallery tile → opens; Esc/click-out closes; focus returns to the tile; touch works; no trapped hover.
- **Reduced motion:** OS flag → donut fully drawn instantly, all movements visible immediately, no draw/reveal/stagger; lightbox still opens (it's interaction, not decoration) but without the scale-in.
- **Both modes**, no console errors, no CSP violations in preview (GSAP inline styles covered by Phase 1's `style-src 'unsafe-inline'`).

**Commit:** `feat(ai-journey-stats): detail motion — DrawSVG donut reveal + block scroll-reveals + gallery lightbox + reduced-motion`

---

## Landmines

| Landmine | Guard |
|---|---|
| **Stale AUTHORED BY block resurfacing** | CUT entirely (Decision 1). No `linesByAuthor` read on this page. Cascade-B deleted it from the body; the Cascade-verify grep asserts zero hits. |
| **Provenance tier breakdown creeping back** | CUT (Decision 2). "How the magic was made" isn't the story. Cascade-verify greps for `tier breakdown`. |
| **Detail page renders empty sections (allowlist gap)** | The published `stats.json` strips non-allowlisted paths → the precondition gate + Cascade-A grep `strip-for-publish.ts` for every detail-page path BEFORE building. STOP if any miss. |
| **`iterationProxyTotal` mis-pathed** | It is on `proxies.iterationProxyTotal`, NOT `git.*`. `assetModificationEvents`/`discardedAssetFiles` ARE on `git.*`. Verified `taxonomy.ts:102-106` / `:78-100`. |
| **DrawSVG needs a stroke** | The donut is built from STROKED `<circle>` arcs (`fill:none`, real `stroke`), never filled `<path>` wedges — DrawSVG animates dash offset/array and silently does nothing on a fill-only shape. (Length basis = real `2πr`, not `pathLength` — see the separate landmine + Decision 5.) |
| **DrawSVG registered in dev, tree-shaken in prod** | Register in `gsap-context.ts`; re-verify in `pnpm preview` (built), not just dev — same failure class as Phase 1's ease side-effect. |
| **Two flourishes compete** | Sparkline does NOT draw-on (plain fade+rise); only the donut draws (Decision 6). One flourish per surface. |
| **Second counter on the site** | The donut center total and the tokens total are STATIC (no tick-up). The hero counter is the only animated number on the site (Decision 6). |
| **Blank page if the motion layer dies** | JS-only hidden state (`gsap.set autoAlpha:0` / `drawSVG '0% 0%'`), never CSS `opacity:0`; `gsap.set` is the first motion statement. Dead/absent layer → fully-drawn donut + all blocks visible. C3 P0 gate. |
| **Per-child reveals down a long page feel janky/tiring** | Block-level reveal only (`[data-block]` on movement wrappers), small `y:24`, `once` (Decision 6). Donut not double-animated. Only the inventory earns an internal child stagger. |
| **Unknown / shelved `:name` crashes or blanks** | `findProject` returns `null` → deliberate not-found block (Decision 8). Shelved names have no `ProjectReport` (archive is collective) → same not-found. Tested in C1 + C2 gate. |
| **`tokens: null` renders "0 tokens" / orphan gold** | `tokens === null` → omit the whole movement (null discipline). No gold that load; do NOT relocate gold to fill (gold rule). |
| **"0 voice lines" noise in the inventory** | `buildComposition` OMITS zero-count kinds (Decision 3). The inventory reflects each project's real breadth. |
| **`heroImage`/gallery 404 → broken-image glyph** | `<img onError>` → hero goes type-forward; gallery hides the broken tile. (Phase 2 guards refresh-time; this guards runtime stale/missing assets.) |
| **Donut color-only encoding (color-blind)** | Every slice is paired with a labeled legend row showing kind + bytes; SVG carries an `aria-label`. Never hue-only meaning (Briggsy is color blind). Palette pinned Phase 9. |
| **Page reads as a dashboard of stat cards** | No card borders on stat blocks; varied alignment/width per movement; dividers BETWEEN movements only; one gold; evocative labels (Decision 7 / anti-dashboard guards). The C2 both-modes gate cold-checks this. |
| **Data-sparse project renders a near-blank "detail"** | The data-sparse case (the leanest real projects — `tic-tac-toe`/`pacman` — on a clean deploy: tokens null + no media + thin tiers) omits 5/7 movements. Guard: Decision 12 — editorial (`oneLiner`+`description`) is a HARD dependency for every detail-page project, so the opener + prose always carry the story; the inventory has a ≤3-item layout floor. Verify the combined-null case + the leanest real projects specifically. |
| **"Look at all the metrics" instead of "slick product"** | ~30 numbers across 5 movements risks flattering the tool, not the product (product review). Guard: the one-liner + description prose carry the STORY; the quantitative blocks support it. Cold-watch the verify gate for "metrics readout vs story", not just "no NaN". |
| **`description` as injected HTML → stored XSS** | A YAML block scalar can carry `<script>`. Render `description` (and all editorial strings) as a React text node (`{description}`), NEVER as injected raw HTML. |
| **External links missing `rel`** | `LiveLinkButton` (the shared leaf built in Phase 4) must render `target="_blank" rel="noopener noreferrer"` on `liveUrl`/`repoUrl`. The Phase 4 tile no longer renders it (clean tiles, ideation §3), so **Phase 5 is the first consumer to pass real author-config URLs** — verify the leaf emits `target`/`rel`; if not, fix it in the shared component. |
| **`largestSingleCommit.sha` leaks a private-repo commit id** | Dropped from publish (Cascade A): added to the `stripForPublish` denylist + omitted from `ALLOWED_KEY_PATHS`. UI renders only `linesAdded`; the sha has no client use. |
| **Full-bleed sparkline → horizontal scroll at 360px** | SVG `width:100%`+`viewBox`+`preserveAspectRatio` (never a fixed px width); full-bleed wrapper via `width:100%` inside an `overflow-x: clip` parent, NEVER `100vw` (scrollbar-gutter overflow). Verify zero horizontal scroll 360–430px. |
| **Donut sub-2% sliver invisible + breaks color-blind pairing** | Minimum rendered arc floor per slice (Decision 5); legend shows the true byte value; proportions approximate by design. |
| **DrawSVG `pathLength` mismatch (static vs animated)** | Drop `pathLength`; compute C2 static dash from real `2πr` — DrawSVG ignores `pathLength` and measures from `r` (Decision 5). One length basis or the reduced-motion/dead-layer donut disagrees with the animated rest state. |
| **`--text-muted` fails WCAG AA** | All info-bearing text uses `--text-secondary`; `--text-muted` only on decorative footnotes (Phase 3 cascade raised the muted alpha to AA). |
| **Re-rolling `toFixed`/`toLocaleString`** | All numbers via `format.ts` (`formatInt`/`formatBytes`/`formatTokens`/`formatShortDate`). |
| **ScrollTrigger reveal never fires for an above-the-fold donut on deep-link** | Verify direct `/project/:name` load draws the donut (ScrollTrigger fires on initial refresh); the page-block batch uses `start: 'top 88%'` which fires already-in-view blocks on mount refresh. |
| **Lightbox focus trap / restore missing** | Trap focus while open; restore to the triggering tile on close; Esc + click-out dismiss (a11y). |
| **Pre-Phase-0 dist misleads / false-confidence allowlist grep** | Precondition gate greps `dist/taxonomy.d.ts` for the contract, then verifies fields are actually PUBLISHED against the generated `stats.json` (a substring grep of the denylist source falsely passes — `tiers` matches `tiers[].tier` even if leaf paths are absent, and the denylist doesn't enumerate kept paths). Read names from `phase-0-data-gaps.md`. |

---

## System-wide impact

- **First route-param consumer of `useStats()`.** Hero read `combined.*`; grid iterated `projects[]`; the detail page resolves ONE report by `:name` from `projects[]` and is the first surface that can legitimately find NOTHING (not-found fork). It honors field-level null discipline per-section.
- **Reuses, establishes nothing new structural:** consumes `LiveLinkButton` (Phase 4), `format.ts` (+`formatShortDate`), the `grid-order.ts` pattern (mirrored by `composition.ts`), the `useGSAP` + reduced-motion + JS-hidden-state + `ScrollTrigger.batch` reveal pattern (Phase 4). Adds `DrawSVGPlugin` to the shared `gsap-context.ts` — every later phase can use it.
- **Touches the privacy publish surface (Cascade A):** Phase 5 is the first surface to consume `tiers[]` + the timeline/iteration/byModel paths (already published by Phase 0's denylist; already enumerated in `ALLOWED_KEY_PATHS` by Phase 0's test #5). Phase 5's only net change to Phase 0: DROP `largestSingleCommit.sha` from publish + record the commit-date cadence disclosure. Phase 6 (About taxonomy explainer) can reuse the published `tiers[]`.
- **Unchanged invariants:** Phase 0 data shape (only the publish allowlist widens), Phase 1 tokens/eases/fonts, Phase 2 data layer (`useStats`/`StatsGate`/types), Phase 3 hero + `format.ts` (only ADDED to), Phase 4 grid + `LiveLinkButton` (only reused) — all untouched. Phase 5 adds components + `composition.ts`, extends `format.ts` + `gsap-context.ts` (one plugin) + replaces `ProjectDetail.tsx`'s body.

---

## Cascade (corrections this deepening forces elsewhere)

Apply in the deepen commit (and re-verify via the "Cascade prerequisite" gates) before Phase 5 executes. Items specified in full under **Cascade prerequisite** above; the doc edits below are APPLIED in this deepen commit (not just specified):
- **A** — `strip-for-publish.ts`: DROP `largestSingleCommit.sha` (denylist + omit from `ALLOWED_KEY_PATHS`); record the commit-date cadence disclosure as a conscious decision; re-run `pnpm test`. Note in Phase 0 frontmatter. (NOT a broad allowlist widening — Phase 0's test #5 already forces the detail paths in.)
- **B** — this document's body: AUTHORED BY + Tier breakdown sections deleted (done in this deepening).
- **C** — `README.md`: drop AUTHORED-BY language from gate 8/8a; remove the stale "AUTHORED BY block stacks vertically" line in the mobile bullet; add a detail-page resolution/not-found gate.
- **D** — `ideation.md` §3: add the WORK-sections + no-authorship-claim note (light touch).
- **E** — `ideation.md` §1 (PROPAGATE Briggsy's 2026-05-24 "how the magic was made isn't the story" call): the §1 claim that peers find the authored-vs-pipeline *provenance* split "compelling" is now stale — soften it so peers geek on the WORK + the tool, not a provenance scoreboard. (Resolves the product-review premise crack: the page surfaces breadth/kind, never a provenance/authorship frame.)
- **F** — `phase-1-scaffold.md` Decision 3: EDIT the stale "Phase 5's tier breakdown uses a CSS transition" clause INLINE (not a footnote — deepening-drift rule) to "Phase 5 cut the tier breakdown and registers DrawSVGPlugin for the AssetDonut."

Additional reconciliations:
- **`phase-4-grid.md` Decision 1 / Cascade** forward-flagged "the cut tier bar may belong [on the detail page]." Now resolved: it does NOT (Decision 2). No edit needed — Phase 4's flag was conditional ("if Phase 5 wants it"); Phase 5 doesn't.

---

## Out of scope for Phase 5 (explicit "later")

- **Per-archive / per-shelved detail pages** — no `ProjectReport` exists for them in v1 (Decision 8). The `status: 'shelved'` schema value stays open for a post-v1 add.
- **The route cross-fade transition** — the `[data-route-transition]` seam (Phase 1) stays no-op; the cross-fade animation is a later phase.
- **About page taxonomy explainer** — Phase 6 (it may reuse the now-published `tiers[]`).
- **`topSubcategories` rendering** — superseded by the composition inventory; Phase 0 still computes it (unconsumed by the site; a Phase 9 JSON-slimming could drop it from publish).
- **Editorial copy** (descriptions, one-liners, `largestCommitCaption`, gallery curation) → each project's `project-metrics.config.yaml` + the editorial worksheet (preflight −1.5). Phase 5 renders whatever the data carries.
- **Final donut palette + sparkline curve *visual* polish + negative-space pass** → Phase 9 (Phase 5 ships a correct, on-spec first build with placeholder-safe semantic colors). NOTE: the sparkline curve *algorithm* is NOT deferred — it is locked to monotone cubic at build time (honesty lock, see the component row above + phase-9), because Phase 8 deploys before Phase 9 and the interim sparkline must not be dishonest. Only its visual polish (negative space, stroke weight, fill alpha) is a Phase 9 dial.
- **Component DOM/jsdom tests** → only if a later component needs render-level assertions; `composition.ts` + `formatShortDate` carry the unit-testable logic, the rest is verified eye-on-browser (manifesto).

---

## Verification (Phase 5 done gate)

1. ✅ `pnpm test` green — `composition.test.ts` (curated kinds + unit mapping + zero-omit + missing-node + no-mutate; `findProject` projects-hit/meta-name→null/archive-name→null/unknown/empty) and `format.test.ts` `formatShortDate`; Phase 2/3/4 tests still green.
2. ✅ `pnpm typecheck` clean.
3. ✅ `pnpm dev` AND `pnpm build && pnpm preview`: `/project/<real names>` render every applicable section from real data; no `NaN`/`undefined`/broken `<img>`.
4. ✅ Unknown `/project/xxx` AND a shelved name both show the deliberate not-found block + back-link; `document.title` is "Not found · ai-journey-stats" (not the raw URL); client-side nav; never blank/crash.
4a. ✅ **Data-sparse / combined-null (Decision 12):** a project null on tokens+media+gallery at once — and the leanest real projects (`tic-tac-toe`, `pacman`) — still reads as a composed story (opener + description prose + sparkline + ≤3-item inventory as a centered row, no empty grid columns); never a broken stub. Editorial (`oneLiner`+`description`) is present for every detail-page project.
5. ✅ Hero is a magazine-opener split desktop (text/image), stacks text→image on mobile; `heroImage` null → type-forward, no broken glyph.
6. ✅ Tokens movement: GOLD total (the page's one gold), per-model ledger, window + sidechain footnotes; `tokens === null` → movement absent, no "0 tokens", no orphan gold.
7. ✅ Composition inventory renders curated kinds in natural units; a project with no audio/video omits those callouts (never "0"); bare callouts, no boxes.
8. ✅ AssetDonut: stroked-arc SVG, draws per-segment on scroll-in (staggered), legend + byte amounts fade in after the ring settles, center total static; all-zero media → omitted; `aria-label` present.
9. ✅ Cadence sparkline full-bleed, no axes; 3 callouts (active days / peak day via `formatShortDate` / largest commit); iteration caption is ONE quiet line built from non-zero counts.
10. ✅ Gallery (if present) grid → lightbox opens/closes (Esc/click-out), focus trapped + restored; broken tile hidden. Absent gallery → movement omitted.
11. ✅ Try-it / Source via `LiveLinkButton`; each omitted if its URL is null; both carry `rel="noopener noreferrer"`. `editorial.description` renders as a text node (raw HTML in a description shows as literal text, never executes).
11a. ✅ Published `stats.json` (post-`pnpm refresh`) carries `tiers`/`timeline`/`tokens.byModel`/`proxies` and does NOT carry `largestSingleCommit.sha` (Cascade A); Phase 0 `pnpm test` (incl. `stats-shape.test.ts`) green with `sha` removed.
12. ✅ **P0:** force a dead motion layer → donut fully drawn, every movement visible. Load-bearing.
13. ✅ Block reveals: block-level fade+rise, once each; top movement reveals on load; positions self-heal after image/fonts settle (throttled). Not per-child jank.
14. ✅ `prefers-reduced-motion`: donut fully drawn instantly, all movements visible, no draw/reveal/stagger; lightbox still opens (no scale-in).
15. ✅ BOTH modes (light + dark, OS + `?theme=`): editorial scroll reads deliberate, NOT a dashboard of cards; gold ONLY on the tokens total; donut legend legible without relying on hue.
16. ✅ 360 / 375 / 390 / 430px: hero stacks (image a deliberate band), inventory 2-col, sparkline full-width, no horizontal scroll, tap targets ≥44px.
17. ✅ A11y: back-link, gallery tiles, both invitation links keyboard-reachable with `:focus-visible` rings; donut `aria-label`; lightbox focus management.
18. ✅ No console errors; no CSP violations in preview; DrawSVG registration confirmed in the BUILT bundle.
19. ✅ Record a scroll of the detail page in both modes. The donut draws once, blocks reveal calmly, the page reads as one project's STORY (opener → magnitude → story → work → rhythm → proof → invitation). If you react "wow Claude built this" instead of "wow this is slick" — keep polishing (Phase 9, but the first build should be close).

Then open [phase-6-about.md](phase-6-about.md) and start.

---

← [Phase 4 — Project grid](phase-4-grid.md) | [Index](README.md) | Next → [Phase 6 — About page](phase-6-about.md)
