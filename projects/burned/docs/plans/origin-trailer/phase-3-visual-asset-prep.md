---
title: "Origin Trailer — Phase 3: Visual Asset Prep"
type: feat
phase: 3
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: pending
status: active
---

<!--
  Deepening pass landed 2026-05-17 via 8-agent parallel review
  (best-practices, framework-docs, repo-research, adversarial,
  scope-guardian, coherence, feasibility, design-lens) + emil-design-eng
  lens + /brief over docs/insights/. Tiered amendments below mirror Phase
  0+1+2 deepening commit shapes (b9617d9d, 43d44ef4, e56e69e5).

  Load-bearing fixes (would fail at first execution):
  - HYBRID architecture pivot — Path A (Remotion imports BURNED components)
    formally REJECTED. GSAP ScrollTrigger needs real scroll; Remotion drives
    time. UMB precedent has zero cross-package imports. Phase 3 ships
    Path B HYBRID: staticFile for existing PNGs (arena/roster/howtoplay)
    + COPY of BURNED HTP component vocabulary (Stamp, Crest, RedactBar,
    ClassificationBanner, DossierPage + .module.css peers) into
    `videos/trailer/src/components/burned-vocabulary/` at Phase 3 entry.
    `diff -r` CI catch for drift. Roadmap ADR #2 refined + NEW ADR #15.
  - PUBLIC-DIR collision fix — `Config.setPublicDir('../../public')` from
    Phase 0 ADR #8 makes `videos/trailer/public/` UNREACHABLE during
    render. All Phase 3-new assets land in `public/trailer/...` inside
    BURNED's existing public/. Single setPublicDir resolves both BURNED
    game assets and trailer-only assets. Phase 4 staticFile paths use
    `trailer/...` prefix (e.g., `staticFile('trailer/r15-chrome/stamp-1-frame.svg')`).
  - CARD-ROSTER TABLE — Phase 3 lines 504-524 hallucinated 9+ filenames
    that DO NOT EXIST. Replaced with actual 17 webp inventory from
    `public/assets/cards/`. Real names: dash-barlowe, vera-khan,
    sable-ashworth, janet-broadside, neal-proctor, agent-x (operatives,
    6) + back-channel, burn-the-files, burned, call-in-a-favor,
    direct-order, extraction, falsify-intel, go-dark, intel-briefing,
    intercepted, reassign (actions, 11). NO Otto card art (roster-only
    per spec §1). NO Dolores card art (she's on Intercepted card).
  - R15 #4 TRIPLE DRIFT — Copy "AGENT-BUILT, ARCHER-GRADE" →
    "OPERATION STATUS: FIELD-READY" (Phase 1 Unit 1.9 lock); frame
    2800 → 2820; filename `subhead-4-agent-built.svg` →
    `subhead-4-field-ready.svg`. Downstream Phase 4 line 1880 sync.
  - PLAYWRIGHT package name + install context — `from 'playwright'` →
    `from '@playwright/test'` (matches UMB precedent + BURNED's
    installed devDep `@playwright/test ^1.59.1`). Script runs from
    BURNED root cwd. `pnpm exec playwright install chromium` one-time
    setup documented.
  - HTP CAPTURE timing redo — 80ms-per-scroll-step + 500ms-end-settle
    is 20× faster than BURNED's 900ms GSAP reveal duration → produces
    partial-opacity captures. Replaced with positive-completion gate:
    `page.waitForFunction(() => [...querySelectorAll('[data-reveal]')]
    .every(el => getComputedStyle(el).opacity === '1'), {timeout: 20s})`.
    Fallback: `ScrollTrigger.getAll().forEach(st => st.animation?.progress(1))`
    if useScrollReveal exposes window globals in DEV.
  - DPR=2 DROPPED from Playwright capture — match UMB precedent at
    DPR=1. Use Remotion `--scale=2` at render time for output-side
    crispness (Phase 6). Cuts decode cost ~4×; current DPR=2 produces
    ~50-100MB PNG that risks Remotion <Img> OOM at render time.
  - HTP CAPTURE URL strategy locked — primary
    `https://burned-cxa.pages.dev/howtoplay` (no .html — Pages strips
    extension per TODO landmine) post-deploy-migration; localhost
    fallback `http://localhost:5173/howtoplay.html` for pre-migration
    script development. Phase 0 explicitly deferred this decision to
    Phase 3.
  - CaseBanner.tsx GHOST REFERENCE — Phase 3 lines 836-838 cite
    `src/client/board/CaseBanner.tsx` which DOES NOT EXIST. Per Phase
    1 Unit 1.10 explicit directive: "There is NO standalone
    CaseBanner.tsx — the trailer ports JSX from `GameTable.tsx:67-72`."
  - PENDLETON CREST resolution — Phase 3 "locate via Glob" was NULL
    (no .svg file exists). But Crest.tsx:41-121 has the SVG INLINE as
    React JSX. AND `public/assets/howtoplay/pendleton-crest.png`
    already exists at 1.5MB Imagen-generated. No Imagen escalation
    needed; Path B vendoring covers crest via Crest.tsx vendored copy,
    Path A staticFile covers the PNG poster.
  - R15 STAMPS as SPLIT-LAYER exports — each stamp produces 2 SVG
    files (frame.svg + text.svg) so Phase 4 composes with
    transform-origin: center for Phase 1's scale(0.95) → 1.04 → 1.0
    stamp-slap motion. Monolithic SVG with baked rotation breaks the
    overshoot animation.
  - R15 #3 BURN-FIRE hex MISMATCH — Phase 3 had #c63b1e; Phase 1
    Unit 1.8 lock is `--color-burned-fire: #be2e27`. Plus #947226
    bare hex → `--color-ochre-9` token. SVGs consume tokens via
    `currentColor` or inline `<style>` pattern.
  - PHASE 1 UNIT 1.10 DEPTH-PLANE add ABSORBED — Phase 1 deepening
    line 2278-2293 added foreground depth-plane element (Option A
    brass nameplate / B manila folders stack / C doorframe vignette)
    with explicit "add to Phase 3 unit 3.3 briefing-room-assets shot
    list." Phase 3 had missed it.
  - HEX-CODES-IN-IMAGEN-PROMPTS landmine REWORDED — visual inspection
    of shipped assets (pendleton-crest.png, operations-manual-plate.png,
    blotter.png, mahogany-horizontal.png) shows NO hex bake-in.
    Working recipe: hex OK if explicit "NO text, NO numbers, NO hex
    codes, NO color codes" negatives at end of prompt. Phase 3
    references `feedback-imagen-hex-codes-bake-in.md` which DOES NOT
    EXIST in memory — actual landmine lives in TODO.md and gets
    rewording in TODO update.

  Structural additions:
  - NEW §"Visual Asset Architecture" (Path B hybrid) under Critical
    Constraints — explains staticFile-for-PNG + copy-for-component.
  - NEW §"Imagen Prompt Template" — mandatory structure for every
    Imagen call: fractional layout / continuity prescription /
    emotional payload named / Archer-coded character anchor
    (NOT typographer anchor — Imagen 4's IP behavior post-2025 is
    more conservative). Per insight 050.
  - NEW §"Insight 018 Stop-and-Re-architect Gate" — after 4
    iterations on same concept-pair producing same failure → STOP.
    Re-architect: remove element / recontextualize / stronger IP
    ref. Codified inline at every Imagen escalation path.
  - NEW §"Imagen Spend Tracker" — running `sample-eval/visual-asset-
    prep/imagen-spend.md` with per-path running total + global cap.
    Hard abort at $5; `IMAGEN_BUDGET_OVERRIDE=1` for explicit override.
  - NEW §"Asset Tier Taxonomy" (HERO / TEXTURE / CHROME) — added to
    Critical Constraints; column added to Requirements Trace. HERO =
    cascade payoff stamp + HTP fullpage + cold-open logo. TEXTURE =
    card halo + venetian-blind + chevron-bg + paper-grain. CHROME =
    R15 stamps 1/2/4 + case-banner + comms-ticker + classification
    banner + crest watermark. Phase 4 composition priority follows
    tier.
  - NEW §"Briggsy-Eyeball Gate Protocol" — explicit
    [BRIGGSY-REVIEW GATE] named stop at exit of Units 3.1, 3.3, 3.4,
    3.6 (the four novel-visual units). Each gate poses 2-3 fluency
    questions, not property checks (per insight 050: agent-style
    verification misses perceptual continuities).
  - NEW §"CVD Probe Script for R15 Chrome" — per insight 051. 20-line
    `scripts/probe-r15-chrome-cvd.ts` using project's existing culori
    pipeline against ochre-9 (#947226) + burn-fire (#be2e27) on cream
    parchment through filterDeficiencyDeuter/Prot/Trit + oklab
    distance at 0.10 floor.
  - NEW Unit 3.5 §"Pre-execution Gates" — verify Artlist Pro OR
    Epidemic Sound Pro active subscription; verify Suno Pro for
    fallback; if neither funded, Unit 3.5 BLOCKED.
  - NEW Unit 3.5 §"Music License Rights-Trail" — operator-action step
    to download license PDF immediately after track add-to-project;
    encode script gated on existsSync('music-license.pdf'). Active-
    subscription billing screenshot for Suno path.
  - NEW Unit 3.7 §"PHASE-3-EXIT.md Template" — single document Phase
    4 consumes for: HTP outcome + capture method + dimensions,
    card-roster final assignments, R15 chrome filenames + frames,
    music-bed track + duration + license path, briefing-room
    inventory, Imagen spend actual. Mirrors Phase 0/1/2 exit-document
    pattern.
  - NEW Unit 3.7 §"Phase 0 Stub Manifest" — `visual-manifest.ts`
    ships as `export const VISUAL_ASSETS: readonly VisualAsset[] =
    [] as const` at Phase 0 Unit 0.1 scaffold so Phase 4 typecheck
    imports resolve before Phase 3 runs. Mirrors Phase 2's
    audio-manifest stub pattern.
  - NEW Unit 3.2 §"Cascade Ring Layout" — Phase 3 ships
    `videos/trailer/src/lib/cascade-ring-layout.json` declaring
    per-card ring position (angle, radius, z-order) + entry-stagger
    frame offset (Phase 1's 2-frame per item lock). Codifies
    "sequential revelation, NOT layered-simultaneous" so Phase 4
    can't accidentally render the AI-slop-shape.
  - NEW Unit 3.4 §"Safe-Square Composite Audit" — per-asset-family
    PNG at 1920×1080 with 1080×1080 center-square guide overlay.
    Critical for R15 stamp #3 (1200×280) which has mobile-crop risk.
  - NEW Unit 3.6 §"Operative Card Composite Proof" —
    `sample-eval/visual-asset-prep/operative-card-composite-proof.png`
    via Playwright static-HTML render. Verifies name-plate readable
    at 1/3-canvas cold-open size before Phase 4 commits.
  - REPLACED Unit 3.7 codegen + .meta.json sidecar pattern — visuals
    don't churn, no regeneration driver, sidecar files never
    materialized in current draft. Phase 3 ships hand-edited
    `visual-manifest.ts` (~15 entries). safeSquareRole becomes
    REQUIRED field per-entry.
  - MERGED 4 per-unit eval markdowns (htp-capture.md, briefing-room-
    assets.md, r15-chrome.md, title-sequence.md) into single
    asset-inventory.md per scope-guardian Q6. Keep music-audition-
    log.md + card-curation.md + music-license.pdf standalone.

  Cross-phase dependencies surfaced for downstream absorption
  (Phase 4 deepening must consume; some Phase 6 + Phase 7 impacts):
  - **Phase 4:** Imports BURNED vocabulary from
    `./components/burned-vocabulary/` (NOT from `../../src/client/`);
    `<Img>` + `<OffthreadVideo>` from `'remotion'` core (NOT
    @remotion/media — only `<Audio>` is @remotion/media);
    `<Sequence from={asset.startFrame}><Audio src={staticFile(...)} />`
    per Phase 2 lock; cascade-ring-layout.json consumption for halo
    layout; R15 split-layer composition with transform-origin:
    center; stat captions inline React (no Phase 3 asset); Otto S03
    treatment (6 card-art + Otto-aside, NOT 7 portraits);
    `setPublicDir('../../public')` + trailer assets at
    `public/trailer/...`.
  - **Phase 4 SPIKE NEEDED:** Variable woff2 `weight: '200 700'`
    syntax with `@remotion/fonts.loadFont()` — framework-docs found
    Remotion docs don't demonstrate the variable-font range pattern
    with a single woff2 file. Either (i) splits-into-per-weight
    static subsets, or (ii) verifies at render time. Phase 4 entry
    spike resolves before scenes lock.
  - **Phase 6:** HTP captured at DPR=1; Phase 6 production render
    uses `--scale=2` for output crispness.
  - **Phase 6:** Trace-video output is `.webm` (Playwright default),
    not `.mp4`. Either Phase 3 renames or Phase 6 transcodes via
    FFmpeg `-c:v libx264 -c:a aac` before Remotion consumption (both
    formats decode through Mediabunny anyway).
  - **Phase 7:** Music-bed license-trail (Artlist/Epidemic PDF OR
    Suno active-subscription billing screenshot + DDEX disclosure)
    feeds Phase 7 distribution-defensibility documentation.

  Hallucinated references corrected:
  - `feedback-imagen-hex-codes-bake-in.md` (Phase 3 line 961) — NOT
    a real memory file. Actual landmine in TODO.md (gets reword in
    TODO update).
  - `src/client/board/CaseBanner.tsx` (Phase 3 line 836-838) — file
    does NOT exist. Replaced with inline JSX reference at
    `GameTable.tsx:67-72` per Phase 1 Unit 1.10 directive.
  - Card-roster table (Phase 3 lines 504-524) — 9+ hallucinated
    filenames including `vera-aubrey.webp`, `sable-vance.webp`,
    `janet-mallory.webp`, `dolores-grieves.webp`, `otto-...`,
    `counter.webp`, `skip.webp`, `defuse.webp`, `steal-2.webp`,
    `steal-3.webp`, `see-future-3.webp`, `shuffle.webp`. None
    exist on disk. Replaced with verified Glob output.

  Design locks (emil-design-eng + insights 018/019/050/051 applied):
  - R15 stamps SPLIT-LAYER (frame + text SVGs) so Phase 4's stamp-
    slap motion scale(0.95) → 1.04 → 1.0 lands correctly.
  - Imagen prompts adopt fractional layout + continuity + emotional
    payload structure per insight 050. Imagen 4 character-IP refs
    (Archer-coded character anchors) preferred over typographer-IP
    refs (which Imagen 4 handles inconsistently post-2025).
  - Briggsy-eyeball gates with fluency questions (NOT property
    checks) at exit of every novel-visual unit per insight 050.
  - CVD probe script for R15 chrome contrast pairs per insight 051
    (never edit color based on prose direction alone).
  - Cohesion review at Unit 3.7 — side-by-side composite of one
    frame per asset family (HTP / briefing-room / R15 chrome / card
    halo / title-sequence). Emil's "review next day" + cohesion
    principle.

  Roadmap impact:
  - ADR #2 REFINED — trailer isolation maintained for dependency
    management; vocabulary from BURNED's `src/client/howtoplay/
    components/` COPIED into `videos/trailer/src/components/burned-
    vocabulary/` at Phase 3 entry (Path B hybrid). Drift verified
    via diff -r in CI.
  - NEW ADR #15 — Public-directory architecture. All Phase 3+
    trailer-only assets land in `public/trailer/...` inside BURNED's
    existing public/. Single `setPublicDir('../../public')` works
    for both. staticFile paths use `trailer/` prefix for trailer-
    only files.

  Plan: 1737 → expected ~3200 lines.
-->


# Phase 3 — Visual Asset Prep

## Overview

Phase 3 produces every static visual asset the Remotion composite
(Phase 4) consumes: the HTP dossier fullpage capture, curated card-
art selections, briefing-room set-dressing, R15 chrome stamp graphics
(as SPLIT-LAYER frame + text SVGs), cold-open title-sequence assets,
and the music bed audio file. Phase 3 also ships the **vendored BURNED
HTP component vocabulary** (Stamp, Crest, RedactBar,
ClassificationBanner, DossierPage + their `.module.css` peers) into
`videos/trailer/src/components/burned-vocabulary/` so Phase 4's
Remotion scenes render with visual continuity to the live game.

**Public-directory architecture (NEW — ADR #15).** Phase 0 ADR #8
locks `Config.setPublicDir('../../public')` pointing at BURNED's
`public/` directory. New trailer-only assets land in
`public/trailer/...` INSIDE BURNED's public/ — single setPublicDir
reaches both BURNED game assets (via `staticFile('assets/cards/...')`)
and trailer-only assets (via `staticFile('trailer/r15-chrome/...')`).
Writing to `videos/trailer/public/...` would be UNREACHABLE to
Remotion render — that location is now reserved only for non-render
sample-eval artifacts.

Phase 3 produces:

**Asset outputs (rendered via staticFile + setPublicDir = `../../public`):**

- `public/trailer/htp-fullpage.png` — BURNED's how-to-play dossier
  rendered as a single tall PNG (clone of UMB's `capture-htp-scroll.ts`
  pattern, adapted to BURNED's HTP route). Captured at DPR=1 (UMB
  precedent); Phase 6 uses Remotion `--scale=2` at render time for
  output-side crispness. Trace-video MP4 fallback at
  `public/trailer/htp-scroll.webm` (Playwright recordVideo default
  format) if static under-delivers.
- `public/trailer/cards/` (logical category only — physical files
  STAY at `public/assets/cards/`; Phase 4 imports via
  `staticFile('assets/cards/dash-barlowe.webp')` through Phase 0
  ADR #8). Curation surfaced via `card-roster.ts`, not file copy.
- `public/trailer/briefing-room/` — NEW set-dressing assets ONLY
  (venetian-blind shadow SVG, 2× dossier-folder state SVGs, plus the
  Phase 1 Unit 1.10 depth-plane element — brass nameplate SVG OR
  manila folders stack SVG OR doorframe vignette SVG per Phase 3
  Unit 3.3 Step 7 pick). All other briefing-room visuals (mahogany
  desk surfaces, blotter, classified stamp, operative portraits)
  ALREADY EXIST in `public/assets/arena/` and `public/assets/roster/`
  — Phase 3 inventories and references them, does not regenerate.
- `public/trailer/r15-chrome/` — 4 R15 chrome instances as SPLIT-LAYER
  exports (8 SVG files total: 4× `stamp-N-frame.svg` + 4× `stamp-N-
  text.svg`). Split-layer composition lets Phase 4 apply Phase 1's
  scale(0.95) → 1.04 → 1.0 stamp-slap motion with correct transform-
  origin per layer (monolithic SVG with baked rotation breaks the
  overshoot animation).
- `public/trailer/title-sequence/` — cold-open composition elements:
  `operative-card-frame.svg` (chrome template; operative portrait
  composites at Phase 4), `chevron-motif-bg.svg` (background pattern),
  `burned-logo.svg` (SINGLE file used at both cold-open S01 frame
  180-210 and closing S06 frame 2790 — plan's previous two-file
  duplication merged). Pendleton crest references existing
  `public/assets/howtoplay/pendleton-crest.png` (1.5MB Imagen-
  generated, verified clean, used at HTP App.tsx hero already);
  operations-manual-plate references existing
  `public/assets/howtoplay/operations-manual-plate.png` for the cold-
  open title plate role.
- `public/trailer/audio/music-bed.mp3` — the licensed music bed track
  per Phase 1 Unit 1.7 lock (Artlist Pro OR Epidemic Sound Pro
  $199-204/yr); Suno Pro $10/mo generative fallback as EXPECTED
  (not last-resort) path per Phase 1 deepening.

**Code outputs (TypeScript / vendored components):**

- `videos/trailer/src/components/burned-vocabulary/` — COPIED from
  `src/client/howtoplay/components/`: Stamp.tsx + Stamp.module.css,
  Crest.tsx + Crest.module.css, RedactBar.tsx + RedactBar.module.css,
  ClassificationBanner.tsx + ClassificationBanner.module.css,
  DossierPage.tsx + DossierPage.module.css. **Drift catcher**:
  `pnpm verify:vocab-sync` runs `diff -r videos/trailer/src/components/
  burned-vocabulary/ src/client/howtoplay/components/` (excluding
  the 5 vendored files; non-empty diff = stale copy → re-vendor).
  See Phase 3 Unit 3.X (NEW) for vendor procedure.
- `videos/trailer/src/lib/visual-manifest.ts` — hand-edited typed
  manifest (~15 entries). Initial stub `[] as const` ships at Phase 0
  Unit 0.1 scaffold so Phase 4 typecheck imports resolve early
  (mirrors Phase 2's audio-manifest stub pattern).
- `videos/trailer/src/lib/card-roster.ts` — typed export declaring
  which webps appear in which trailer role (`COLD_OPEN_CARDS`,
  `S03_ROSTER`, `CASCADE_HALO`).
- `videos/trailer/src/lib/cascade-ring-layout.json` — declares per-card
  ring position (angle, radius, z-order) + entry-stagger frame offset
  (Phase 1's 2-frame per item lock). Codifies "sequential revelation
  with focal hierarchy, NOT layered-simultaneous" so Phase 4 can't
  accidentally render the AI-slop-shape that Phase 1 Unit 1.5
  deepening anti-pattern-guarded.

**Sample-eval outputs (operator artifacts, NOT consumed by Remotion):**

- `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md` —
  CONSOLIDATED inventory (replaces htp-capture.md + briefing-room-
  assets.md + r15-chrome.md + title-sequence.md per-unit eval-md
  duplication).
- `videos/trailer/sample-eval/visual-asset-prep/card-curation.md` —
  per-card role rationale (kept standalone).
- `videos/trailer/sample-eval/visual-asset-prep/music-audition-log.md`
  — 20-30 candidate-per-platform audition records (kept standalone).
- `videos/trailer/sample-eval/visual-asset-prep/music-license.pdf` —
  legal record (kept standalone; Suno path uses billing screenshot
  per DDEX disclosure note in Unit 3.5).
- `videos/trailer/sample-eval/visual-asset-prep/imagen-spend.md` —
  cumulative Imagen spend tracker with hard abort at $5 cap.
- `videos/trailer/sample-eval/visual-asset-prep/safe-square-composites/`
  — per-asset-family PNG at 1920×1080 with 1080×1080 center-square
  guide overlay; verification gate before Phase 4 consumes.
- `videos/trailer/sample-eval/visual-asset-prep/operative-card-composite-proof.png`
  — single composite proof for cold-open card-flash readability.

**Exit document (Phase 4 consumes single source of truth):**

- `videos/trailer/PHASE-3-EXIT.md` — single document Phase 4 reads
  for: HTP outcome (static / trace-video), capture method (URL,
  fullpage dimensions, scrollHeight), card-roster final assignments
  (COLD_OPEN_CARDS / S03_ROSTER / CASCADE_HALO), R15 chrome filenames
  + frames, music-bed track + duration + license-path, briefing-room
  inventory (existing-via-staticFile + new-via-Phase-3), Imagen spend
  actual. Mirrors Phase 0/1/2 exit-document pattern.

Phase 3 runs **in parallel with Phase 2** (per roadmap §3 phase table)
— they share no dependencies. Phase 3 exits when every asset called
out in BEAT-SHEET.md visual cues either (a) exists at
`public/{trailer,assets}/...` resolvable via `staticFile()` OR (b) is
already in BURNED's `public/assets/{arena,roster,howtoplay,cards}/`
and referenced by the visual-manifest's curation, the
`burned-vocabulary` vendored copy passes `diff -r` against
`src/client/howtoplay/components/`, the `visual-manifest.ts`
typechecks, and PHASE-3-EXIT.md is written.

---

## Problem Frame

Phase 1 Unit 1.10's briefing-room visual environment lock and Unit
1.5's cascade composition lock declare WHAT visual elements appear at
which frame. Phase 3's job is to **produce or vendor those elements**
so Phase 4 can compose, while honoring the §2.2 Archer-frame
acceptance test on every output.

Four production realities shape Phase 3 (UPDATED 2026-05-17 against
on-disk reality + Phase 1+2 deepening contracts):

1. **BURNED has 17 webp card artworks already shipped** at
   `public/assets/cards/`. Verified filenames: 6 operative portraits
   (`dash-barlowe.webp`, `vera-khan.webp`, `sable-ashworth.webp`,
   `janet-broadside.webp`, `neal-proctor.webp`, `agent-x.webp`) + 11
   action cards (`back-channel`, `burn-the-files`, `burned`,
   `call-in-a-favor`, `direct-order`, `extraction`, `falsify-intel`,
   `go-dark`, `intel-briefing`, `intercepted`, `reassign`). **NO Otto
   card art** (Otto is roster-only per spec §1) — S03 reveal handles
   via Otto-aside per Phase 1 narration lock "Seven on the roster,
   six in the deck, one in the basement." **NO Dolores card art**
   (she's the figure on Intercepted card per
   `project-burned-dolores-grieves` memory, not her own card). Phase
   3 curates these 17 assets — does NOT re-generate. Per
   `feedback-imagen-budget.md`.

2. **BURNED already ships briefing-room set-dressing as Imagen-
   generated PNGs at `public/assets/{arena,roster,howtoplay}/`.**
   Verified inventory:
   - `public/assets/arena/`: `mahogany-horizontal.png` (1.8M),
     `mahogany-vertical.png` (1.6M), `blotter.png` (1.4M),
     `stamp-classified.png` (588K), `operative-silhouette.png` (744K),
     6 portrait files (`portrait-dash.png`, `portrait-vera.png`,
     `portrait-otto.png`, `portrait-janet.png`, `portrait-neal.png`,
     `portrait-agent-x.png`) — 11 PNGs ~10.7MB total.
   - `public/assets/roster/`: 6 higher-resolution portrait files
     (1.1-1.3MB each) for dossier-quality use: `dash-barlowe.png`,
     `vera-khan.png`, `sable-ashworth.png`, `janet-broadside.png`,
     `neal-proctor.png`, `agent-x.png`.
   - `public/assets/howtoplay/`: `pendleton-crest.png` (1.5MB
     Imagen-generated, visually verified clean) + `operations-manual-
     plate.png` (1.4MB title plate, visually verified clean).

   **Phase 3 INVENTORIES first, generates-fresh only what's
   missing.** Net-new SVG assets in Unit 3.3: venetian-blinds shadow,
   2× dossier-folder states (closed + open), depth-plane foreground
   element (Phase 1 Unit 1.10 deepening add: pick from brass-
   nameplate / manila-folders-stack / doorframe-vignette). Plus
   CASE BANNER + COMMS ticker strips authored from BURNED's
   `GameTable.tsx:67-72` inline JSX (NOT from a non-existent
   `CaseBanner.tsx` — that file was a ghost reference in the
   pre-deepening draft).

3. **BURNED's HTP dossier (`src/client/howtoplay/`) is a live
   GSAP+React app**, not a static image. Rendering it as a Remotion
   asset uses an adapted UMB `capture-htp-scroll.ts` pattern — but
   the 80ms-per-scroll-step + 500ms-end-settle timing in UMB's
   precedent is **too short for BURNED's 900ms GSAP reveal duration**
   (per `useScrollReveal.ts:47` `duration: 0.9`). Phase 3 replaces
   the timing heuristic with a **positive-completion gate**:
   `page.waitForFunction(() => [...document.querySelectorAll(
   '[data-reveal]')].every(el => getComputedStyle(el).opacity ===
   '1'), {timeout: 20_000})`. Fallback if useScrollReveal exposes
   `window.gsap`/`window.ScrollTrigger` (DEV gate):
   `await page.evaluate(() => window.ScrollTrigger.getAll()
   .forEach(st => st.animation?.progress(1)))`. See Unit 3.1 Step 3
   for the full implementation.

4. **The trailer-as-isolated-package architecture (ADR #2) RULES OUT
   importing BURNED React components directly into Remotion scenes**
   (formerly considered as "Path A"). Three independent technical
   reasons:
   - BURNED HTP components use CSS modules + custom-property tokens
     loaded via Vite's CSS pipeline. Remotion's bundler may not match.
   - `useScrollReveal` uses `window.matchMedia` + DOM `querySelectorAll`
     — Remotion runs headless per-frame, no real viewport scroll.
   - **GSAP ScrollTrigger fundamentally requires a viewport with real
     scroll position — Remotion drives TIME, not SCROLL.**

   Plus the empirical reason: UMB's trailer at
   `projects/undercover-mob-boss/videos/trailer/` has **ZERO cross-
   package imports** (verified — UMB scenes import only from local
   `./components/`, `./lib/`, `remotion` packages).

   Phase 3 ships **Path B hybrid** instead: **staticFile-via-Phase-0-
   ADR-#8** for existing PNGs (arena, roster, howtoplay, cards), plus
   **vendored copy** of the 5 BURNED HTP component pairs (Stamp,
   Crest, RedactBar, ClassificationBanner, DossierPage) into
   `videos/trailer/src/components/burned-vocabulary/` with a
   `diff -r` drift-catcher in CI. Phase 4 imports the vendored copies
   as if they were local components.

   This matters for the §2 quality bar: BURNED's
   `Stamp.tsx` ships `ink` (4 token-backed colors), `tilt` (rotation),
   `size` (sm/md/lg), `animate="slam"` (the exact stamp-slap motion
   Phase 1 Unit 1.4 locked), `caption` — every property Phase 4 needs
   already exists. Phase 3 reinventing this as monolithic raw SVG
   (the pre-deepening draft) would BREAK visual continuity between
   the trailer and a user clicking through to the live game, failing
   the §2.2 Archer-frame test on internal consistency grounds.

The largest risks Phase 3 manages (in priority order):

1. **Public-directory placement.** `Config.setPublicDir('../../public')`
   makes `videos/trailer/public/` UNREACHABLE during render. All new
   trailer assets must land in `public/trailer/...` inside BURNED's
   `public/` (NEW ADR #15).

2. **HTP capture fidelity.** The 80ms heuristic captures partial-
   opacity reveals. Positive-completion gate replaces it (Unit 3.1
   Step 3).

3. **Imagen prior-fight cost.** The cold-open operative card frame
   template is the highest-risk Imagen ask (target-reticle + mid-
   century chrome are out-of-distribution priors). Insight 018 stop-
   gate codified inline: after 4 same-failure iterations → STOP and
   re-architect.

4. **Music procurement preconditions.** Phase 3 Unit 3.5 requires
   Artlist Pro / Epidemic Sound Pro active subscription OR explicit
   Briggsy approval to skip licensing and go straight to Suno Pro.
   Pre-execution gate prevents executing into a blocker.

5. **R15 chrome animation-readiness.** Monolithic SVG with baked
   `transform="rotate(...)"` breaks Phase 1's stamp-slap motion at
   render time. Split-layer exports (frame.svg + text.svg per stamp)
   preserve composability.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 1 §Critical Constraints, Phase 2
§Critical Constraints, and BURNED institutional knowledge in
`docs/insights/{018,019,050,051}.md`.

### Visual Asset Architecture: Path B Hybrid (NEW — locks ADR #2 refinement + ADR #15)

The trailer is an isolated package per roadmap ADR #2 (own
`node_modules`, own `pnpm-lock.yaml`, not in `pnpm-workspace.yaml`).
The HARD question Phase 3 deepening surfaced: *how does the trailer
consume BURNED's existing visual vocabulary?*

**Path A (cross-package import) — REJECTED.** Phase 4 Remotion scenes
cannot `import { Stamp } from '../../src/client/howtoplay/components/
Stamp'` for three independent technical reasons:

1. BURNED HTP components use CSS modules + custom-property tokens
   (`--color-cream-12`, `--color-ochre-9`, `--stamp-red/black/blue/
   amber`) loaded via Vite's CSS pipeline. Remotion's bundler may
   not match the resolution chain.
2. `useScrollReveal.ts` uses `window.matchMedia` + DOM
   `querySelectorAll` + GSAP ScrollTrigger. Remotion runs in a
   headless context per frame; no real viewport scroll exists.
3. **GSAP ScrollTrigger fundamentally requires a viewport with real
   scroll position. Remotion drives TIME, not SCROLL.** This is an
   architectural incompatibility, not a bundler issue.

Plus the empirical reason: UMB v3 trailer at
`projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx` has
**zero cross-package imports** (verified). The setPublicDir contract
in `remotion.config.ts` is the only crossing point.

**Path C (raw SVG reimplementation) — REJECTED for the same §2.2
quality bar reason.** A trailer that ships hand-rolled SVG stamps
while the live game ships React-component stamps creates a visible
inconsistency for users clicking trailer → game. The §2.2 Archer-
frame test fails on internal consistency grounds.

**Path B Hybrid — LOCKED.** Phase 3 ships two distinct production
modes for two distinct asset categories:

- **Set-dressing PNGs (Path A via staticFile):** Mahogany desk, blotter,
  classified stamp, dossier portraits, Pendleton crest, operations-
  manual-plate. These are ALREADY in `public/assets/{arena,roster,
  howtoplay}/`. Phase 3 inventories and surfaces them via
  `visual-manifest.ts`; Phase 4 imports via
  `staticFile('assets/arena/mahogany-horizontal.png')` through Phase
  0 ADR #8. **No copy, no regeneration.**

- **In-frame React chrome (Path B via vendored copy):** Stamp.tsx,
  Crest.tsx, RedactBar.tsx, ClassificationBanner.tsx, DossierPage.tsx
  + their `.module.css` peers. Phase 3 COPIES these 10 files (5 pairs)
  into `videos/trailer/src/components/burned-vocabulary/` at unit
  3.X (NEW vendor unit, ordered before Unit 3.4). Phase 4 imports
  `import { Stamp } from './components/burned-vocabulary/Stamp'`.
  Drift catcher: `pnpm verify:vocab-sync` runs `diff -r
  videos/trailer/src/components/burned-vocabulary/
  src/client/howtoplay/components/` (matching subset only); non-empty
  diff fails the trailer build.

This architecture choice is recorded as **roadmap ADR #2 refinement**
(trailer isolation maintained for dependency management; vocabulary
vendored at Phase 3 entry). Phase 4 deepening absorbs the consequence:
all React imports are local.

### Public-Directory Architecture (NEW — ADR #15)

Phase 0 ADR #8 sets `Config.setPublicDir('../../public')` so the
trailer reads BURNED's existing `public/` directory directly. This
means `staticFile('assets/cards/dash-barlowe.webp')` resolves to
`projects/burned/public/assets/cards/dash-barlowe.webp` — correct.

**BUT:** Remotion supports exactly ONE public directory at a time.
Files at `videos/trailer/public/...` are UNREACHABLE to `staticFile()`
during render. The pre-deepening Phase 3 plan wrote new trailer assets
to `videos/trailer/public/assets/{briefing-room,r15-chrome,title-
sequence}/` — these would 404 silently at Phase 4 render time.

**Lock (ADR #15):** All NEW Phase 3 trailer-only assets land in
`public/trailer/...` INSIDE BURNED's existing `public/` directory.
Naming convention:

| Asset class | Disk path | staticFile arg |
|---|---|---|
| HTP fullpage | `public/trailer/htp-fullpage.png` | `staticFile('trailer/htp-fullpage.png')` |
| Trace-video fallback | `public/trailer/htp-scroll.webm` | `staticFile('trailer/htp-scroll.webm')` |
| R15 chrome (split-layer) | `public/trailer/r15-chrome/stamp-N-{frame,text}.svg` | `staticFile('trailer/r15-chrome/stamp-1-frame.svg')` |
| Briefing-room NEW (venetian, dossier-folder, depth-plane) | `public/trailer/briefing-room/*.svg` | `staticFile('trailer/briefing-room/venetian-blinds.svg')` |
| Title-sequence NEW | `public/trailer/title-sequence/{operative-card-frame, chevron-motif-bg, burned-logo}.svg` | `staticFile('trailer/title-sequence/burned-logo.svg')` |
| Music bed | `public/trailer/audio/music-bed.mp3` | `staticFile('trailer/audio/music-bed.mp3')` |
| BURNED cards (existing — Path A) | `public/assets/cards/*.webp` (unchanged) | `staticFile('assets/cards/dash-barlowe.webp')` |
| BURNED arena (existing — Path A) | `public/assets/arena/*.png` (unchanged) | `staticFile('assets/arena/mahogany-horizontal.png')` |
| BURNED howtoplay (existing — Path A) | `public/assets/howtoplay/{pendleton-crest, operations-manual-plate}.png` (unchanged) | `staticFile('assets/howtoplay/pendleton-crest.png')` |

`videos/trailer/public/` is **reserved for sample-eval artifacts ONLY**
(safe-square composite proofs, capture screenshots, audition-log
reference clips) — files Phase 4's Remotion render does NOT need to
load.

### HTP capture mode: static PNG default; trace-video upgrade reserved (UPDATED with completion gate)

Phase 1 Unit 1.5 Step 6 locked HTP rendering as a static PNG via
adapted clone of UMB's `capture-htp-scroll.ts`. Phase 3 Unit 3.1
executes this default with a critical refinement: **positive-
completion gate replaces the 80ms-scroll-step timing heuristic.**

Why the change: BURNED's `useScrollReveal.ts` runs each reveal as a
GSAP tween with `duration: 0.9` (900ms) + `ease: 'power3.out'` +
`start: 'top 85%'` + `once: true`. UMB's precedent scrolls 200px every
80ms — that's 1000px covered in 400ms, ~20× faster than a single
tween needs to settle. By the time an element passes its trigger and
the next scroll fires 80ms later, the reveal tween has executed ~9%
of its arc. The 500ms end-settle is shorter than ONE reveal duration.
Net: pre-deepening capture would produce scattered opacity-0 /
rotateX:6deg sections — the EXACT failure mode the plan warns about.

**New capture pattern:**
```ts
// Scroll loop to trigger all ScrollTrigger thresholds
let scrolled = 0;
while (scrolled < initialScrollHeight + 500) {
  await page.evaluate((y) => window.scrollTo(0, y), scrolled);
  await page.waitForTimeout(80);
  scrolled += 200;
}

// PRIMARY completion gate — positive verification all reveals settled
await page.waitForFunction(() => {
  const reveals = document.querySelectorAll('[data-reveal]');
  return Array.from(reveals).every((el) => {
    const cs = getComputedStyle(el);
    // Reveal target state: opacity 1, no transform
    return cs.opacity === '1' && (cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  });
}, { timeout: 20_000 });

// FALLBACK (DEV-only) if useScrollReveal exposes window globals
// — useful when completion gate times out
// await page.evaluate(() => {
//   if (window.ScrollTrigger) {
//     window.ScrollTrigger.getAll().forEach((st) => st.animation?.progress(1));
//   }
// });

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ fullPage: true, path: OUT });
```

If the completion gate times out (some reveal is stuck), the script
logs the offending element selectors and exits non-zero — operator
investigates rather than shipping a partial capture.

**Trace-video escalation reserved.** If positive-completion gate
cannot reach all-opacity-1 state (e.g., an animation has no terminal
state, or `[data-reveal]` selector misses elements), Unit 3.1 Step 6
escalates to Playwright `recordVideo` to capture actual scroll
motion. Output is `public/trailer/htp-scroll.webm` (Playwright's
default WebM/VP8 format — NOT `.mp4` as the pre-deepening plan
said). Remotion `<OffthreadVideo>` decodes both formats via
Mediabunny. Phase 6 can optionally transcode to `.mp4` via FFmpeg
`-c:v libx264 -c:a aac` for X distribution compatibility.

### DPR=1 capture, Remotion `--scale=2` at render time

Pre-deepening Phase 3 set `deviceScaleFactor: 2` for the HTP capture.
UMB precedent does NOT use DPR=2. At 1920×1080 viewport @ DPR=2 over
~8000-12000px scroll height, the resulting PNG is ~3840×16000-24000px
= 50-100 MB raw. Remotion `<Img>` decodes the full PNG per frame load
through Chromium — at this size, OOM and frame-decode stalls are
real risks at Phase 6 render time.

**Lock:** DPR=1 at capture time (matches UMB precedent and current
empirical evidence that UMB's trailer ships acceptable HTP read at
DPR=1). Phase 6 render uses Remotion `--scale=2` for output-side
crispness — per Remotion docs, "text, SVG, and sufficiently high-
resolution images benefit from this scaling." BURNED's HTP is
overwhelmingly typographic + SVG, so render-side scale=2 gives
equivalent visual sharpness at ~1/4 source decode cost.

### HTP capture URL strategy

Phase 0 Unit 0.5 spike validated capture against localhost dev URL
only. Phase 3 production capture runs **after deploy migration
completes** (per TODO.md §1 active priorities note about the in-
flight partykit → Cloudflare Workers migration). Phase 0 explicitly
deferred the production URL choice to Phase 3.

**Lock:**
- Primary capture URL: `https://burned-cxa.pages.dev/howtoplay`
  (Cloudflare Pages strips `.html` extension per TODO.md line
  257-260 landmine — verify with the migration-final URL).
- Pre-migration / script-development fallback:
  `http://localhost:5173/howtoplay.html` (Vite dev server requires
  `.html` extension per CLAUDE.md Vite Dev URLs section).
- Selection mechanism: `process.env.HTP_URL` overrides; default is
  production URL.

Production URL is the right primary because Cloudflare Pages serves
the production-bundle CSS + font hashing + minification that the
trailer ships against — same render Phase 4 will composite. Localhost
dev serves source CSS through Vite's pipeline which can differ subtly
from production at the pixel level. UMB precedent uses production
URL exactly for this reason.

### Playwright package + install context

Phase 3 capture scripts import `from '@playwright/test'` (NOT bare
`'playwright'` as the pre-deepening draft had). Rationale:

- BURNED root `package.json` has `@playwright/test ^1.59.1` as
  devDep — installed.
- UMB precedent imports `from '@playwright/test'` (verified at
  `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts:7`).
- Bare `'playwright'` would resolve to a DIFFERENT package (the lower-
  level driver) that is NOT installed and would fail with `Cannot
  find module 'playwright'`.

**Operator workflow:**
- Scripts run from BURNED root cwd: `pnpm tsx videos/trailer/scripts/
  capture-htp-scroll-burned.ts` (resolves `@playwright/test` via
  BURNED's `node_modules/`).
- One-time setup if browsers not yet installed:
  `pnpm exec playwright install chromium`. The script writes
  `videos/trailer/sample-eval/visual-asset-prep/.playwright-installed`
  sentinel; if absent, prints the install command and exits non-zero.

### Card-art curation: selection, not generation

Per `feedback-imagen-budget.md`: H&S spent $25 on ugly Imagen output;
UMB v3 spent <$3 for a masterpiece because of the one-test-image-first
+ tight-budget discipline. BURNED already has 17 high-quality Imagen
artworks at `public/assets/cards/`. Phase 3 does NOT generate new
card art.

**Verified inventory (Glob `public/assets/cards/*.webp`, sorted):**

Operative portraits (6 — Otto absent because Otto is roster-only per
spec §1; Dolores absent because she's a figure on the Intercepted
card per `project-burned-dolores-grieves` memory, not a card herself):
- `agent-x.webp`, `dash-barlowe.webp`, `janet-broadside.webp`,
  `neal-proctor.webp`, `sable-ashworth.webp`, `vera-khan.webp`

Action cards (11):
- `back-channel.webp`, `burn-the-files.webp`, `burned.webp`,
  `call-in-a-favor.webp`, `direct-order.webp`, `extraction.webp`,
  `falsify-intel.webp`, `go-dark.webp`, `intel-briefing.webp`,
  `intercepted.webp`, `reassign.webp`

Total: 17 webp files.

S03 roster slide-in: 6 card-art operatives + Otto-aside chrome
treatment (per Phase 1 narration lock: "Seven on the roster, six in
the deck, one in the basement. Don't ask."). Otto's visual presence
in S03 (if needed) comes from `public/assets/arena/portrait-otto.png`
or a REDACTED-bar overlay on a placeholder slot — Phase 4 decides
composition, Phase 3 ensures both options have asset coverage.

### Imagen Prompt Template (NEW — per insight 050)

Every Phase 3 Imagen call follows this mandatory structure (per
`docs/insights/050-agent-verification-misses-perceptual-continuities
.md`):

```
[FRACTIONAL LAYOUT DIRECTIVE]
"subject occupies LEFT TWO-THIRDS of frame, [chrome element] at FAR
RIGHT edge as compositionally subordinate"

[CONTINUITY PRESCRIPTION]
"[element] CONTINUES to [edge of frame], NO hard truncation
mid-frame, [light/shadow/gradient] fades GRADUALLY with soft
falloff"

[EMOTIONAL PAYLOAD NAMED]
"FEELING the moment of [specific event] — [reactive pose / mood],
NOT [passive alternative]"

[STYLE / CHARACTER REFERENCE]
"in the style of Archer FX animated TV show (Dreamland season 8) /
visually modeled on [Archer character archetype]" — use CHARACTER
references for IP anchor, NOT typographer references (Imagen 4's
typography prior is "modern web/screen-style" and resists "in the
style of Herb Lubalin"-type prompts; character refs are more reliable)

[STYLE BLOCK]
[established BURNED palette description in WORDS, optionally
followed by parenthetical hex codes; explicit "NO photographic NO
realistic NO 3D render NO cartoon NO anime"]

[NEGATIVE SUPPRESSORS — REQUIRED if hex codes used in palette]
"absolutely NO additional text NO words NO numbers NO hex codes NO
color codes beyond [whitelisted text if any]"
```

**Hex codes in Imagen prompts — UPDATED stance** (resolves a
contradiction between TODO.md landmine and shipped scripts): BURNED's
production `generate-htp-assets.ts` and `generate-briefing-assets.ts`
both use hex codes in prompts AND ship clean outputs (verified
visually: pendleton-crest.png, operations-manual-plate.png,
blotter.png, mahogany-horizontal.png have ZERO baked-in hex text).
The working recipe is: hex codes OK IF the negative suppressor list
at the end explicitly forbids hex/numbers/color-codes. The TODO.md
landmine's strict "DO NOT reference hex codes" wording is overstated;
gets rewording in TODO update accompanying this deepening.

### Insight 018 Stop-and-Re-architect Gate (NEW)

Every Imagen escalation path in Phase 3 has this gate codified
inline:

> **STOP gate:** If iterations 4-6 on the same prompt-concept pair
> produce essentially the same failure mode, STOP iterating on the
> prompt. Re-architect via one of the four insight-018 strategies:
> (a) REMOVE the problem element entirely, (b) RECONTEXTUALIZE the
> scene so the prior is satisfied irrelevantly, (c) Use a STRONGER
> IP REFERENCE (Archer character anchor; not Imagen-IP-aware
> typographer refs which are unreliable post-2025), (d) Strip to
> minimum-viable prompt (5 short clauses, each element mentioned
> ONCE).

Token cost of arguing with the model grows linearly; the probability
of winning the argument does not. Re-architecting is cheaper.

### Imagen Spend Tracker (NEW)

Phase 3 caps Imagen spend at **<$5 total**. Pre-deepening plan had 4
escalation paths (cold-open template <$5, Pendleton crest fallback
<$1, mahogany desk Option B unbudgeted, logo polish <$2) summing
to >$8 worst case — over cap.

**Lock:** Most paths NO LONGER need Imagen post-deepening:
- Mahogany desk Option B Imagen: CUT (existing
  `public/assets/arena/mahogany-horizontal.png` covers).
- Pendleton crest Imagen fallback: CUT (existing
  `public/assets/howtoplay/pendleton-crest.png` covers; Crest.tsx
  also has full inline SVG variant at lines 41-121 for vector use).
- BURNED logo polish: CUT (operations-manual-plate.png from
  `public/assets/howtoplay/` covers the cold-open title plate role;
  hand-authored SVG covers the rest).

Remaining Imagen path: **operative card frame template** at
`<$5` (Unit 3.6). Plus optional depth-plane foreground element
(Unit 3.3) if hand-authored SVG doesn't carry trailer weight, at
`<$1`. Total worst case: <$6 — within cap.

Tracker: `sample-eval/visual-asset-prep/imagen-spend.md` with running
total. Per-call entry logs: asset name, prompt iteration count, image
hash, cost, outcome (kept / re-architected / aborted). Hard abort at
$5 cumulative; `IMAGEN_BUDGET_OVERRIDE=1` env var for explicit
operator override with reason logged.

### Asset Tier Taxonomy (NEW — Phase 4 composition priority signal)

Phase 3 produces ~15-30 assets spanning a wide range of visual
weight. Without an explicit hierarchy, Phase 4 risks treating R15
stamp #3 (the trailer's load-bearing visual stamp at frame 1950
payoff) at the same composition priority as `comms-ticker-strip.svg`
(background chrome). Lock:

| Tier | Visual role | Assets |
|------|-------------|--------|
| **HERO** | Trailer-load-bearing visual moments | HTP fullpage (cascade backdrop), R15 #3 payoff stamp (frame 1950), BURNED logo (cold-open landing + closing), operative-card-frame composites (S01 cold-open flashes), payoff-card-art selections (S04 cascade focal items) |
| **TEXTURE** | Continuous-presence atmosphere | Card halo cluster (right-edge 40% opacity throughout cascade), venetian-blind shadow, chevron-motif-bg, paper-grain noise, mahogany-desk surface |
| **CHROME** | Information-carrying labels + frames | R15 stamps #1/#2/#4, case-banner strip, comms-ticker strip, classification banners, Pendleton crest watermark, operative dossier-frame metadata |

Phase 4 composition priority: HERO assets get full visual weight in
the central 1080×1080 safe-square; TEXTURE assets stay at ≤40%
opacity in non-focal positions; CHROME assets occupy bottom-third or
edge bands. This tiering enforces Phase 1's "sequential revelation
with focal hierarchy, NOT layered-simultaneous" cascade lock.

### Briggsy-Eyeball Gate Protocol (NEW — per insight 050)

Per `docs/insights/050-agent-verification-misses-perceptual-
continuities.md`: agent-style verification decomposes images into
checkable properties (composition, anatomy, frame-fit, no-text-leak)
but **misses CONTINUITIES** — light physics, shadow direction,
atmospheric perspective, emotional weight, motion timing. These
continuities are exactly the properties that determine §2.2 Archer-
frame acceptance. The eye reads them in one glance; agents miss
them systematically.

**Lock:** Every novel-visual Unit in Phase 3 (Units 3.1, 3.3, 3.4,
3.6 — NOT Unit 3.2 which is curation, NOT Unit 3.5 which is
procurement, NOT Unit 3.7 which is codegen) has an explicit
`[BRIGGSY-REVIEW GATE]` named stop at unit exit. Each gate poses
2-3 **fluency questions** (not property checks). Example gate text
embedded at unit ends:

> ```
> [BRIGGSY-REVIEW GATE — Unit 3.4 R15 Chrome]
> Cannot proceed to Unit 3.5 until Briggsy eyes-on review of all
> 4 R15 stamp composites at `sample-eval/visual-asset-prep/safe-
> square-composites/r15-*.png`. Reviewer answers:
>
> (1) Does stamp #3 ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED")
>     feel like INK SLAPPED ONTO PAPER, or like a CSS box with a
>     filter applied? (If the latter, ink-bleed filter parameters
>     need re-tuning against Stamp.tsx's actual filter values.)
> (2) Does the burn-fire ink read as AUTHORITATIVE/ALARMING, or
>     as generic red? (If generic, hex value needs review against
>     --color-burned-fire token actual rendering.)
> (3) Would this stamp be embarrassing next to an actual Archer
>     episode screenshot? (Binary — if yes, the §2.2 quality bar
>     is missed; investigate before proceeding.)
> ```

Phase 4 import of any Phase 3 asset is gated on the corresponding
unit's Briggsy-review sign-off (file presence:
`sample-eval/visual-asset-prep/briggsy-review-unit-N.signoff`).

### CVD Probe for R15 Chrome (NEW — per insight 051)

Per `docs/insights/051-prose-cvd-recommendations-are-wrong-direction
.md`: "Never edit based on prose direction alone. Run a probe
script." Briggsy is color-blind (per `user_color_blind` memory). R15
chrome uses ochre (`--color-ochre-9` = `#947226`) + burn-fire
(`--color-burned-fire` = `#be2e27`) on cream parchment backgrounds.
These pairs MUST clear CVD distance thresholds under all 3
deficiency simulations — but the pre-deepening plan asserted
"distinguishable from cream by luminance, not hue alone" as prose,
without measurement.

**Lock:** Unit 3.4 Step 5b adds a 20-line `scripts/probe-r15-chrome-
cvd.ts` (run-and-delete pattern per insight 051) using the project's
existing culori pipeline. The probe runs ochre-9-on-cream-N and
burn-fire-on-cream-N pairs through `filterDeficiencyDeuter`,
`filterDeficiencyProt`, `filterDeficiencyTrit`, and
`differenceEuclidean('oklab')` at the project's 0.10 STRICT floor.
If either pair fails any sim, substitute a higher-L* variant of the
ink color — read the candidate table, don't guess directions. Both
pairs must clear before Unit 3.4 ships R15 stamps. Probe script
deleted post-amendment.

### Mobile safe-square audit at every asset (UPDATED — now with per-asset composite proof)

Every Phase 3 asset has a placement note. Per BEAT-SHEET.md (Phase 1
Unit 1.5 Step 3 + Unit 1.10 Step 4 mobile safe-square audit), critical
narrative elements must live inside the central 1080×1080 square of
the 1920×1080 frame. Assets PLACED outside the safe square (side-band
captions, chrome strips, ticker text) are explicitly OK-to-crop on
mobile — they are flourish, not load-bearing.

Phase 3 marks each asset's "safe-square role" in `visual-manifest.ts`
as a **REQUIRED field** (no default): `'safe-square'` (in critical
1:1 zone — Phase 4 keeps inside central 1080×1080) or `'side-band'`
(acceptable mobile crop — Phase 4 may place in edge bands).

**NEW verification step (Unit 3.7 Step 4):** Phase 3 ships per-
asset-family PNG composite at 1920×1080 with 1080×1080 center-square
guide overlay, output to `sample-eval/visual-asset-prep/safe-square-
composites/`. Each composite is a Briggsy-eyeball verification that
critical text actually fits. R15 stamp #3 at 1200×280 with -3°
rotation is the highest-risk case — verifying "ASSET DELIVERED" text
lands inside the safe-square is non-optional.

---

## Requirements Trace

- **R1** (in-world Pendleton briefing): Unit 3.3 (briefing-room
  set-dressing).
- **R3** (stacked-climax cascade): Unit 3.1 (HTP capture for cascade
  hero) + Unit 3.2 (card-art halo curation).
- **R8** (mobile-safe central square): every Phase 3 asset is tagged
  with its safe-square role in the manifest (Unit 3.7).
- **R9** (Archer-coded mid-century music bed): Unit 3.5 (music
  procurement).
- **R10** (HTP dossier hero): Unit 3.1.
- **R12** (Imagen-generated card art curation): Unit 3.2.
- **R14** (compressed-Archer cold-open): Unit 3.6 (title-sequence
  assets — operative card flashes, BURNED logo treatment, chevron
  motifs).
- **R15** (on-screen text signal layer): Unit 3.4 (R15 chrome stamp
  graphics — 4 instances per Unit 1.9).

---

## Key Technical Decisions

**Architecture:**

- **Path B Hybrid architecture (ADR #2 refinement).** Set-dressing
  PNGs flow via `staticFile` from BURNED's existing
  `public/assets/{arena,roster,howtoplay}/` (Path A through Phase 0
  ADR #8). In-frame React chrome (Stamp, Crest, RedactBar,
  ClassificationBanner, DossierPage + .module.css peers) COPIED into
  `videos/trailer/src/components/burned-vocabulary/` at Phase 3 entry
  (Path B). `diff -r` CI catch for drift. Phase 4 imports vocabulary
  as local components.
- **Public-directory architecture (ADR #15).** All Phase 3 NEW
  trailer-only assets land in `public/trailer/...` inside BURNED's
  existing `public/`. Single `Config.setPublicDir('../../public')`
  serves both BURNED game assets (`staticFile('assets/cards/...')`)
  and trailer-only assets (`staticFile('trailer/r15-chrome/...')`).
  `videos/trailer/public/` is reserved for sample-eval artifacts
  that Remotion render does NOT load.

**HTP capture:**

- **HTP capture adapts UMB pattern with POSITIVE-COMPLETION GATE** —
  scrolls via 200px-per-80ms loop to fire all `[data-reveal]`
  triggers, then `page.waitForFunction(() => [...querySelectorAll(
  '[data-reveal]')].every(el => getComputedStyle(el).opacity ===
  '1'), {timeout: 20_000})` BEFORE the fullpage screenshot.
  Eliminates the 80ms-vs-900ms-GSAP-tween mismatch that the pre-
  deepening plan inherited from UMB. Trace-video MP4 fallback at
  `public/trailer/htp-scroll.webm` (Playwright recordVideo default
  WebM format) if completion gate cannot reach all-opacity-1.
- **HTP capture URL strategy: production primary, localhost
  fallback.** Primary: `https://burned-cxa.pages.dev/howtoplay` (no
  `.html` — Pages strips extension); fallback:
  `http://localhost:5173/howtoplay.html`. Selection via
  `process.env.HTP_URL`. Phase 0 explicitly deferred this to Phase 3
  post-deploy-migration.
- **DPR=1 capture, Remotion `--scale=2` at render time.** Match UMB
  precedent. Phase 6 render uses `--scale=2` for output-side
  crispness; ~1/4 the source decode cost vs the pre-deepening
  DPR=2 plan.
- **Playwright package: `@playwright/test`** (NOT bare `'playwright'`).
  BURNED root devDep `@playwright/test ^1.59.1`. Scripts run from
  BURNED root cwd. `pnpm exec playwright install chromium` one-time
  setup.

**Cards + curation:**

- **Card-art is curated, never regenerated** per Imagen budget rule.
  17 webp files verified at `public/assets/cards/` (6 operative + 11
  action — see Critical Constraints §Card-art curation for exact
  filenames). `card-roster.ts` typed export declares trailer-role
  assignments (`COLD_OPEN_CARDS`, `S03_ROSTER`, `CASCADE_HALO`).

**Briefing-room (Path A staticFile + minimal new SVG):**

- **Mahogany desk + blotter + operative dossier portraits + classified
  stamp ALREADY EXIST** at `public/assets/{arena,roster,howtoplay}/`.
  Phase 3 inventories and surfaces via manifest; does NOT re-capture
  via Playwright or re-generate via Imagen.
- **NEW briefing-room SVG assets (4-5 files):** venetian-blinds
  shadow, dossier-folder-closed, dossier-folder-open, depth-plane
  foreground element (Phase 1 Unit 1.10 deepening add — Option A
  brass nameplate / B manila folders stack / C doorframe vignette;
  Phase 3 Unit 3.3 Step 7 picks), CASE BANNER + COMMS ticker
  strips authored from `GameTable.tsx:67-72` inline JSX (NOT from
  non-existent `CaseBanner.tsx` — that was a ghost reference).
- **Pendleton crest:** Use existing
  `public/assets/howtoplay/pendleton-crest.png` for poster role;
  vendored `Crest.tsx` (with inline SVG variant) covers in-frame
  React use. No Imagen escalation needed.

**R15 chrome (split-layer for Phase 4 stamp-slap motion):**

- **R15 chrome stamps as SPLIT-LAYER SVG exports.** Each of the 4
  R15 instances produces 2 SVG files: `stamp-N-frame.svg` (border
  + ink-bleed filter, no text) + `stamp-N-text.svg` (text only).
  Phase 4 composes as 2 Img layers with `transform-origin: center`
  for Phase 1 Unit 1.4's stamp-slap motion (scale(0.95) → 1.04 →
  1.0 overshoot). Monolithic SVG with baked `transform="rotate(...)"`
  would break the overshoot animation.
- **R15 chrome typography:** R15 #1 (classification stamp), #2
  (ticker), #3 (payoff stamp) all use JetBrains Mono 700 (matches
  Phase 1 Unit 1.8 chrome hierarchy). R15 #4 (closing subhead) also
  JetBrains Mono per Phase 1 (NOT Clash Display). Cold-open
  operative name-plate uses Clash Display 700 (Phase 1 display
  hierarchy — different role than chrome).
- **R15 chrome colors via tokens, not bare hex.** SVG `fill`
  attributes consume CSS custom properties via `currentColor` +
  Phase 4-applied inline style, OR via inlined `<style>` block in
  the SVG. Tokens: `--color-ochre-9` (#947226) for stamps #1/#2/#4;
  `--color-burned-fire` (#be2e27 — NOT the pre-deepening hex
  #c63b1e) for stamp #3 payoff. CVD probe script
  (`scripts/probe-r15-chrome-cvd.ts`) verifies both pairs clear
  deuter/prot/trit at 0.10 oklab floor.
- **R15 #4 copy + frame + filename (TRIPLE drift fix):** Copy is
  **"OPERATION STATUS: FIELD-READY"** (Phase 1 Unit 1.9 lock — was
  "AGENT-BUILT, ARCHER-GRADE" in pre-deepening); frame **2820**
  (was 2800); filenames `subhead-4-field-ready-frame.svg` +
  `subhead-4-field-ready-text.svg` (was `subhead-4-agent-built.svg`).
  Phase 4 `phase-4-remotion-composite.md:1880` syncs.

**Cold-open title sequence:**

- **Operative card frame template via Imagen** (one test image
  first, insight-018 stop-gate codified inline). Imagen prompt
  follows the §"Imagen Prompt Template" structure (fractional
  layout / continuity prescription / emotional payload / Archer-
  character anchor / negative suppressors). UMB asset-prompts.ts
  `--only` flag pattern + `#FF00FF` chroma-key extraction for clean
  transparency. <$5 budget per `imagen-spend.md` tracker.
- **BURNED logo: SINGLE SVG file** (`burned-logo.svg`) used at both
  cold-open S01 frame 180-210 and closing S06 frame 2790. Pre-
  deepening plan's two-file duplication merged. Existing
  `public/assets/howtoplay/operations-manual-plate.png` covers the
  cold-open TITLE PLATE role (different from logo wordmark).

**Music:**

- **Music bed format: MP3 at 192 kbps**, mono or stereo per source.
  MP3 over WAV for music-bed:
  - ~95s duration; WAV would be ~16 MB, MP3 ~2 MB.
  - Phase 4 `<Audio>` (from `@remotion/media`) uses Mediabunny
    decoder; handles MP3 natively (framework-docs verified).
  - Voice WAVs from Phase 2 use lossless because per-line splicing
    benefits from sample-accurate cuts; music bed doesn't need this.
- **Music source per Phase 1 Unit 1.7 lock:** Artlist Pro OR
  Epidemic Sound Pro ($199-$204/yr minimum tier; covers portfolio
  embed + Twitter/X distribution). Suno Pro ($10/mo) generative
  fallback as EXPECTED path (not last-resort). Udio struck from
  candidate pool (Nov 2025 settlement disabled exports).
- **Pre-execution gates (Unit 3.5 Step 0):** Verify Briggsy has
  Artlist OR Epidemic Sound Pro active subscription. If not,
  escalate for procurement decision (which may legitimately be
  "skip licensing, go straight to Suno Pro"). Suno Pro
  verification for fallback path. Without either funded, Unit 3.5
  is BLOCKED, not auto-fallback.
- **License rights-trail:** Operator-action step to download
  Artlist/Epidemic license PDF immediately after track add-to-
  project; place at
  `sample-eval/visual-asset-prep/music-license.pdf`. Encode script
  gated on `existsSync('music-license.pdf')`. Suno path
  alternative: active-subscription billing screenshot at generation
  date + DDEX AI-disclosure metadata pre-populated in the file
  (X doesn't enforce DDEX yet, but pre-populate for future
  streaming-platform distribution).
- **Audition pool 20-30 candidates per platform** (was 10-15 in
  pre-deepening — best-practices research updated for the brass/
  bossa-with-95s-cascade-arc hostile catalog hit rate).

**Manifests + code-gen:**

- **`Img` and `OffthreadVideo` import from `'remotion'` core**, NOT
  `@remotion/media`. Only `<Audio>` and `<Video>` migrated to
  `@remotion/media` per Phase 0 ADR #5. Phase 3 Unit 3.7 visual-
  manifest type comments document the consumption pattern.
- **Visual manifest is HAND-EDITED** (~15 entries). Pre-deepening
  plan had codegen-walker + per-asset `.meta.json` sidecars —
  CUT because (a) no regeneration driver (static visuals don't
  churn like TTS regenerates on text edits), (b) sidecar files
  were never specified as deliverables anywhere in the plan.
  `safeSquareRole` becomes REQUIRED field per-entry (no default).
- **Phase 0 ships stub `visual-manifest.ts`** as
  `export const VISUAL_ASSETS: readonly VisualAsset[] = [] as const`
  in Unit 0.1 scaffold so Phase 4 typecheck imports always resolve
  before Phase 3 runs. Mirrors Phase 2's audio-manifest stub
  pattern.
- **`cascade-ring-layout.json`** declares per-card ring position
  (angle, radius, z-order) + 2-frame entry-stagger (Phase 1 Unit
  1.5 lock) for the 17-mosaic halo. Phase 4 consumes via JSON
  import; cannot accidentally render layered-simultaneous.

**Security / portability:**

- **All shell-outs use `execFileSync` argv** (Phase 2 precedent —
  project security convention).
- **Inventory patterns use Node `readdirSync` / Glob**, NOT
  PowerShell `Get-ChildItem` (cross-platform portability — Mac/
  Linux contributors).
- **CLI args via `node:util.parseArgs` strict mode** for Phase 3
  scripts (matches Phase 2's strict-mode lock).

**Gates + verification:**

- **Briggsy-eyeball gate at exit of each novel-visual unit** (Units
  3.1, 3.3, 3.4, 3.6). Fluency questions, not property checks per
  insight 050. Phase 4 import gated on
  `briggsy-review-unit-N.signoff` sentinel file presence.
- **Safe-square composite proof per asset family** at 1920×1080
  with 1080×1080 center-square overlay (Unit 3.7 Step 4 NEW).
- **CVD probe script for R15 chrome** (Unit 3.4 Step 5b NEW). Per
  insight 051 — never edit color based on prose direction.
- **§2.2 perceptual gate** applied at each Briggsy-eyeball gate:
  *"Could this look like a frame from an Archer episode?"* Binary
  yes/no. Mirrors Phase 1 Unit 1.5 perceptual gate for HTP
  rendering.

---

## Implementation Units

### Unit 3.1 — HTP Dossier Capture

- [ ] **Unit 3.1: HTP Dossier Capture**

**Goal:** Produce a single fullpage PNG of BURNED's how-to-play
dossier (`src/client/howtoplay/`) rendered with all GSAP ScrollTrigger
animations resolved to their post-reveal state. Output:
`public/trailer/htp-fullpage.png` (per ADR #15 — INSIDE BURNED's
public/, NOT `videos/trailer/public/`). Trace-video fallback at
`public/trailer/htp-scroll.webm` if static under-delivers.

**Requirements:** R10 (HTP dossier hero). HERO tier.

**Dependencies:** Phase 0 Unit 0.1 trailer scaffold shipped
(verified via `videos/trailer/package.json` exists + `pnpm
typecheck` clean in trailer/). BURNED root has `@playwright/test`
in devDeps (`package.json`); chromium installed via `pnpm exec
playwright install chromium` one-time. **HTP URL accessible** —
production `https://burned-cxa.pages.dev/howtoplay` is primary
(post deploy-migration); localhost `http://localhost:5173/howtoplay.html`
is the pre-migration / script-development fallback.

**Files:**

- Create: `videos/trailer/scripts/capture-htp-scroll-burned.ts` —
  adapted clone of UMB pattern with positive-completion gate.
- Create: `public/trailer/htp-fullpage.png` — output (DPR=1, ~1920×
  scrollHeight, ~3-8 MB depending on HTP content).
- (Conditional) Create: `public/trailer/htp-scroll.webm` — trace-
  video escalation output (Playwright recordVideo default WebM/VP8).
- Create: `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`
  (this unit appends to the consolidated inventory; per scope-
  guardian deepening, individual per-unit eval markdowns merged).

**Approach:**

**Step 1 — UMB pattern study + BURNED-specific deltas.**

Read `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
for the canonical pattern. Key UMB choices:
- Imports `from '@playwright/test'` (matches BURNED's installed dep).
- Uses `chromium.launch({ headless: true })` (explicit).
- Default DPR=1 (no `deviceScaleFactor: 2`).
- Uses production URL (Vercel), not localhost.
- `resolve()` for output path (cwd-independent).

BURNED-specific deltas:
- URL: production `https://burned-cxa.pages.dev/howtoplay` (no
  `.html` — Cloudflare Pages strips extension per TODO landmine
  line 257-260). Localhost fallback retains `.html` (Vite requires
  it per CLAUDE.md Vite Dev URLs).
- Selector: BURNED's HTP wraps each act in `<DossierPage>` which
  marks itself with `data-reveal` (verified `DossierPage.tsx:39`).
  Wait for `[data-reveal]` to exist before scroll loop.
- Reveal duration: BURNED's `useScrollReveal.ts:47` sets `duration:
  0.9` (900ms ease-out). UMB's 80ms-per-scroll-step is too short.
  Replace timing heuristic with positive-completion gate.

**Step 2 — Script skeleton (production-ready).**

```ts
// videos/trailer/scripts/capture-htp-scroll-burned.ts
import 'dotenv/config';
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HTP_URL = process.env.HTP_URL ?? 'https://burned-cxa.pages.dev/howtoplay';
const OUT = resolve(process.cwd(), 'public/trailer/htp-fullpage.png');
const META = resolve(
  process.cwd(),
  'videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md',
);
const VIEWPORT = { width: 1920, height: 1080 };

async function main() {
  // Assert we're at BURNED root (script paths are relative to repo root)
  if (!existsSync('public/assets/cards')) {
    console.error('ERROR: script must run from BURNED repo root (public/assets/cards not found).');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  console.log(`NAV  ${HTP_URL}`);
  await page.goto(HTP_URL, { waitUntil: 'networkidle' });

  // Wait for hero/reveal elements to mount + gsap.set() to apply initial state
  await page.waitForSelector('[data-reveal]', { state: 'attached', timeout: 10_000 });
  await page.waitForTimeout(500); // gsap.set() initial-state settle

  // Scroll loop — fires every ScrollTrigger threshold
  const initialScrollHeight = Number(
    await page.evaluate(() => document.documentElement.scrollHeight),
  );
  console.log(`SCROLL initial scrollHeight=${initialScrollHeight}px`);

  let scrolled = 0;
  const step = 200;
  while (scrolled < initialScrollHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), scrolled);
    await page.waitForTimeout(80);
    scrolled += step;
  }
  // Scroll to absolute bottom to ensure final triggers fire
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);

  // PRIMARY completion gate — positive verification all reveals settled
  console.log('WAIT all [data-reveal] reach opacity=1...');
  try {
    await page.waitForFunction(
      () => {
        const reveals = document.querySelectorAll('[data-reveal]');
        if (reveals.length === 0) return false;
        return Array.from(reveals).every((el) => {
          const cs = getComputedStyle(el);
          const transformOk =
            cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)';
          return cs.opacity === '1' && transformOk;
        });
      },
      { timeout: 20_000 },
    );
    console.log('  OK all reveals at opacity=1');
  } catch (err) {
    // FALLBACK: force-complete via ScrollTrigger if exposed on window
    // (useScrollReveal.ts may expose in DEV; verify before relying)
    const exposed = await page.evaluate(
      () => typeof (window as any).ScrollTrigger !== 'undefined',
    );
    if (exposed) {
      console.warn('  WARN waitForFunction timeout; falling back to ScrollTrigger.progress(1)');
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).ScrollTrigger.getAll().forEach(
          (st: any) => st.animation && st.animation.progress(1),
        );
      });
      await page.waitForTimeout(500);
    } else {
      console.error('  ERROR completion gate timed out + ScrollTrigger not exposed on window.');
      console.error('  Diagnose: open HTP_URL manually, identify stuck reveal element.');
      throw err;
    }
  }

  // Scroll back to top for capture starting position
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Capture fullpage at DPR=1 (UMB precedent; Phase 6 renders with --scale=2)
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ fullPage: true, path: OUT, type: 'png' });
  console.log(`OK   captured to ${OUT}`);

  const finalHeight = Number(
    await page.evaluate(() => document.documentElement.scrollHeight),
  );

  // Append to consolidated inventory markdown
  mkdirSync(dirname(META), { recursive: true });
  // (append mode — see Unit 3.7 for inventory shape)
  const stats = await import('node:fs/promises').then((fs) => fs.stat(OUT));
  console.log(
    `OK   PNG ${finalHeight}px tall, ${(stats.size / 1024 / 1024).toFixed(1)}MB`,
  );
  console.log(`     Phase 4 Remotion translateY range: 0 → -${finalHeight - 1080}px`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 3 — Trace-video fallback (conditional).**

If Step 2's positive-completion gate cannot reach all-opacity-1
(e.g., a reveal animation has no terminal state, or `[data-reveal]`
selector misses elements), Step 6 below escalates to Playwright
recordVideo capture. Currently the script throws on gate timeout —
operator runs the trace-video variant explicitly via env var:

```ts
// videos/trailer/scripts/capture-htp-trace-video.ts (SEPARATE script,
// or branch the main script on TRACE_VIDEO=1)
const TRACE_VIDEO = process.env.TRACE_VIDEO === '1';
// ...
const context = TRACE_VIDEO
  ? await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: {
        dir: resolve(process.cwd(), 'public/trailer/'),
        size: VIEWPORT,
      },
    })
  : await browser.newContext({ viewport: VIEWPORT });
// ... same scroll + completion gate logic ...
if (TRACE_VIDEO) {
  await context.close(); // FINALIZES the .webm file
  // Playwright auto-names; rename to canonical:
  // public/trailer/<random>.webm → public/trailer/htp-scroll.webm
} else {
  await page.screenshot({ fullPage: true, path: OUT });
  await browser.close();
}
```

Output: `public/trailer/htp-scroll.webm` (Playwright's default
WebM/VP8 format — NOT `.mp4`). Phase 4 imports via
`<OffthreadVideo src={staticFile('trailer/htp-scroll.webm')} />`
(from `'remotion'` core; Mediabunny decodes WebM natively). Phase 6
can optionally transcode to `.mp4` via FFmpeg if X-distribution
compatibility is preferred.

**Step 4 — Operator workflow.**

```bash
# One-time setup (if Playwright browsers not installed):
pnpm exec playwright install chromium

# Static PNG capture (primary, against production URL):
pnpm tsx videos/trailer/scripts/capture-htp-scroll-burned.ts

# Static PNG against localhost (pre-deploy-migration):
HTP_URL=http://localhost:5173/howtoplay.html \
  pnpm tsx videos/trailer/scripts/capture-htp-scroll-burned.ts

# Trace-video escalation:
TRACE_VIDEO=1 pnpm tsx videos/trailer/scripts/capture-htp-trace-video.ts
```

Scripts run from BURNED repo root (cwd check at script entry).

**Step 5 — Verification (agent + operator).**

Agent verification (in script, exits non-zero on failure):
- `htp-fullpage.png` exists with non-zero size at expected path.
- `finalHeight` reported.
- `mkdirSync` succeeded for output + meta paths.

Operator verification (open `htp-fullpage.png` in image viewer):
- All 10 DossierPage acts visible (Cover, Mission, Roster, Loop,
  Arsenal, Combos, TurnInheritance, Intercept, Remote, Signoff).
- No element visibly at opacity 0 (completion gate prevented partial,
  but eyeball confirms).
- Typography crisp at DPR=1 (Phase 6 `--scale=2` adds the render-
  side polish).
- No layout artifacts at section boundaries.

**[BRIGGSY-REVIEW GATE — Unit 3.1 HTP Capture]**

Cannot proceed to Unit 3.2 until Briggsy eyes-on review of
`public/trailer/htp-fullpage.png` answers:

1. **Does the HTP fullpage feel like a complete dossier or like a
   long screenshot?** (Continuous narrative vs sectioned-tiled
   read.) If sectioned-tiled, capture timing/completion gate may
   need re-tuning.
2. **Are any sections visibly mid-reveal?** (Half-opacity, rotated,
   shifted from final position.) If yes, completion gate failed —
   re-investigate trigger conditions.
3. **Would this capture be embarrassing next to a frame from
   Archer's title sequence?** (§2.2 acceptance test.) Binary; if
   yes, escalate to trace-video.

Sentinel on pass: `videos/trailer/sample-eval/visual-asset-prep/briggsy-review-3.1.signoff`
(operator writes after eyeball pass).

**Patterns to follow:**

- UMB v3 capture pattern: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`.
- BURNED's `useScrollReveal()` ScrollTrigger pattern (per
  `src/client/howtoplay/hooks/useScrollReveal.ts`) — explains the
  `[data-reveal]` selector + 900ms tween duration.
- Playwright `fullPage: true` screenshot pattern.
- Playwright recordVideo pattern (per
  `https://playwright.dev/docs/videos`) — finalize on
  `context.close()`, NOT `page.close()`.

**Test scenarios:**

- **Happy path:** Production URL accessible → script produces 1920×
  <scrollHeight>px PNG with all reveals at opacity=1 verified by
  completion gate.
- **Happy path:** Localhost URL with `HTP_URL=...` env override →
  same flow against local Vite dev.
- **Edge case:** URL unreachable → Playwright `page.goto` rejects
  with clear error.
- **Edge case:** Completion gate timeout → if `window.ScrollTrigger`
  exposed (DEV), fallback to `progress(1)` force-completion; else
  fail-fast with diagnostic hint.
- **Edge case:** `[data-reveal]` selector empty → fail at
  `waitForSelector` with clear timeout.
- **Performance:** Capture completes in <90s (scroll loop +
  completion gate + screenshot encode). PNG size <50 MB at DPR=1.

**Verification:**

- `public/trailer/htp-fullpage.png` exists, non-zero, <50 MB.
- Asset entry added to `asset-inventory.md` with dimensions +
  HTP_URL used + DPR=1 + scrollHeight reported.
- Briggsy-review gate signoff sentinel present.

---

### Unit 3.2 — Card-Art Curation

- [ ] **Unit 3.2: Card-Art Curation**

**Goal:** Curate the 17 existing webp card artworks at
`public/assets/cards/` into trailer-purpose-organized subsets. NO new
Imagen generation. No file copies (Phase 0 ADR #8 + ADR #15 cover
read-through via `staticFile('assets/cards/...')`). Output: typed
`card-roster.ts` declaring trailer-role assignments + per-card
rationale in `card-curation.md`.

**Requirements:** R12 (Imagen card-art curation).

**Dependencies:** None — Phase 3 parallel-OK with Unit 3.1 + 3.3 + 3.4 + 3.6.

**Files:**

- Create: `videos/trailer/src/lib/card-roster.ts` — typed export
  declaring `COLD_OPEN_CARDS`, `S03_ROSTER`, `CASCADE_HALO`
  subsets indexed by webp filename.
- Create: `videos/trailer/sample-eval/visual-asset-prep/card-curation.md` —
  per-card selection rationale.
- (Conditional) Create: `videos/trailer/src/lib/cascade-ring-layout.json`
  — per-card ring geometry + entry-stagger for the 17-mosaic halo
  (also covered in Unit 3.7 if cleaner there; see Step 5).
- NO file copies, NO symlinks — Phase 4 imports webps via
  `staticFile('assets/cards/dash-barlowe.webp')` resolving through
  Phase 0 ADR #8 `setPublicDir('../../public')`.

**Approach:**

**Step 1 — Source-asset inventory (cross-platform).**

```ts
// videos/trailer/scripts/audit-card-inventory.ts
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const CARDS_DIR = resolve(process.cwd(), 'public/assets/cards');
const entries = readdirSync(CARDS_DIR)
  .filter((f) => f.endsWith('.webp'))
  .sort();

console.log(`Found ${entries.length} webp files at ${CARDS_DIR}:`);
for (const e of entries) {
  const stat = statSync(resolve(CARDS_DIR, e));
  console.log(`  ${e}  (${(stat.size / 1024).toFixed(1)} KB)`);
}
```

Expected: **17 webp files** (verified 2026-05-17 via `Glob
public/assets/cards/*.webp`). If count differs, update TODO.md +
brainstorm + Phase 3 plan + this script per the single-source rule
(`feedback-stats-single-source.md`).

**Verified card inventory (2026-05-17):**

Each artwork is one of:
- **Operative portrait** (6 — named operative): `dash-barlowe.webp`,
  `vera-khan.webp`, `sable-ashworth.webp`, `janet-broadside.webp`,
  `neal-proctor.webp`, `agent-x.webp`. **NO Otto card art** — Otto
  is roster-only per spec §1 ("Roster only — not in card deck").
  **NO Dolores card art** — Dolores Grieves is the figure on the
  Intercepted card per `project-burned-dolores-grieves` memory, not
  her own card.
- **Action-card illustration** (11): `back-channel.webp`,
  `burn-the-files.webp`, `burned.webp`, `call-in-a-favor.webp`,
  `direct-order.webp`, `extraction.webp`, `falsify-intel.webp`,
  `go-dark.webp`, `intel-briefing.webp`, `intercepted.webp`,
  `reassign.webp`.

Total: 17. Card names use BURNED's RETHEMED vocabulary (per spec
§1 — "Defuse → Extraction, Nope → Intercepted, See the Future →
Intel Briefing"). The pre-deepening plan referenced raw Exploding-
Kittens mechanic names (`counter.webp`, `skip.webp`, `defuse.webp`,
`steal-2.webp`, `shuffle.webp`) that DO NOT EXIST in BURNED.

**Step 2 — Trailer-purpose categorization (VERIFIED filenames).**

Each artwork is assigned to one or more trailer roles. Table replaces
the pre-deepening hallucinated version:

| Asset (webp) | Type | Cold-open flash | S03 roster reveal | S04 cascade halo | Closing card | Notes |
|---|---|---|---|---|---|---|
| `dash-barlowe.webp` | Operative (Dash) | ✓ (frame 90-150 — briefer establishes) | ✓ | ✓ (halo focal at frame 1410) | — | The narrator's portrait; recurs at S02/S03 |
| `vera-khan.webp` | Operative (Vera) | ✓ (if R14 cold-open speaker = Vera) OR scream-target frame 2400 | ✓ | ✓ | — | Per Phase 1 deepening: screamer is Dash; Vera is the addressee |
| `sable-ashworth.webp` | Operative (Sable) | ✓ (if R14 cold-open speaker = Sable) | ✓ | ✓ | — | Phase 0 Unit 0.3 outcome picks the cold-open speaker |
| `janet-broadside.webp` | Operative (Janet-M) | ✓ (if R14 cold-open speaker = Janet) | ✓ | ✓ | — | Phase 0 Unit 0.3 outcome |
| `neal-proctor.webp` | Operative (Neal) | optional 3rd flash (frame 150-210) | ✓ | ✓ | — | High visual distinctness from Dash + Vera/Sable/Janet |
| `agent-x.webp` | Operative (Wild) | — | ✓ (with REDACTED-bar overlay from `RedactBar.tsx`) | ✓ | — | Wild card; Phase 4 may composite with RedactBar React component |
| `back-channel.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `burn-the-files.webp` | Action (BURNED-mechanic namesake) | — | — | ✓ (halo, PROMINENT — the card the trailer is themed for) | optional inset on payoff stamp frame 1950 | HERO-tier asset within cascade — Phase 4 should weight this |
| `burned.webp` | Action (BURNED-card itself, lose condition) | — | — | ✓ (halo, PROMINENT — the card the game is named for) | optional inset on payoff stamp frame 1950 | HERO-tier asset within cascade |
| `call-in-a-favor.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `direct-order.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `extraction.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `falsify-intel.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `go-dark.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `intel-briefing.webp` | Action | — | — | ✓ (halo texture) | — | — |
| `intercepted.webp` | Action (Dolores Grieves illustrated here) | — | — | ✓ (halo texture; Dolores's only trailer appearance) | — | Per `project-burned-dolores-grieves` memory |
| `reassign.webp` | Action | — | — | ✓ (halo texture) | — | — |

(All 17 entries above verified against actual `Glob
public/assets/cards/*.webp` output — no hallucinated names.)

**Step 3 — Cold-open flash selection (per Unit 1.5 Step 2 + Unit 1.10).**

S01 (frames 0–210) shows 3 operative cards flash:
- Frame 30–90: cold-open speaker portrait (Vera / Sable / Janet — per
  Phase 0 Unit 0.3 outcome locked in PHASE-0-EXIT.md)
- Frame 90–150: Dash portrait (the briefer)
- Frame 150–210: one more operative for cast density (Neal is the
  default pick — see rationale below)

**Third-operative selection rationale (named-operative density bar-
raise, Success Criteria axis 1):** Pick the operative MOST visually
distinct from cold-open speaker + Dash to maximize "different
operatives per sampled frame." Visual DNA against `public/assets/
cards/`:
- Dash: man, mid-tone hair, sharp suit (per Phase 1 roster portrait)
- Vera: woman, auburn red waves
- Sable: woman, blonde
- Janet: woman, silver hair (severe, terrifying-composed)
- Neal: man, sandy thinning hair, anxious bureaucrat
- Agent X: man, fake beard + fedora

If cold-open speaker is **Vera**, third should be light-toned + male
→ Neal (max distinctness).
If cold-open speaker is **Sable**, third should be dark-toned →
Neal (still distinct; he's the only other male in active deck).
If cold-open speaker is **Janet**, third can be Neal OR Agent X
(adds wild-card flavor to S01).

Otto and Agent X cannot easily fill the 3rd slot:
- Otto has NO card art (roster-only per spec §1) — would require
  Phase 4 to composite from `public/assets/arena/portrait-otto.png`
  with chrome treatment (acceptable but not card-art-equivalent).
- Agent X with REDACTED-bar overlay tells a different story (wild
  card / rival agency) — better held for S03 roster reveal.

**Default: Neal as the 3rd cold-open flash** regardless of speaker
identity. Phase 4 can override per Briggsy's eyeball-review of S01
composite.

**Step 4 — S03 roster reveal selection.**

S03 (frames 750–1050) shows the active roster slide in along the
right edge (Unit 1.10 Step 1). **Six card-art operatives + Otto-aside
chrome treatment**, NOT "all 7 active-roster operatives" as the pre-
deepening plan claimed.

Per Phase 1 narration lock: *"Seven on the roster, six in the deck,
one in the basement. Don't ask."* The visual must match the line:
- 6 operative card-arts slide in: `dash-barlowe`, `vera-khan`,
  `sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`.
- Agent X composites with vendored `RedactBar.tsx` overlay (per Phase
  4 vocabulary import; Unit 3.X vendors the component) — face
  obscured per the wild-card narrative.
- Otto's exclusion is the joke. Phase 4 composes a 7th slot with
  classification-style chrome ("BASEMENT" or "REDACTED" treatment)
  using the vendored `ClassificationBanner.tsx` red-tone, OR uses
  `public/assets/arena/portrait-otto.png` with heavy redaction. Phase
  3 ensures both options have asset coverage:
  - `portrait-otto.png` is already in `public/assets/arena/`.
  - Vendored `RedactBar.tsx` + `ClassificationBanner.tsx` are in
    `videos/trailer/src/components/burned-vocabulary/` per Unit 3.X.
- **Dolores is NOT in S03.** She's depicted on the Intercepted card
  artwork only (per `project-burned-dolores-grieves` memory). She has
  no separate slide-in role.

**Step 5 — S04 cascade halo cluster + cascade-ring-layout.json.**

The halo cluster at frames 1410–1560 reveals 3 card portraits as
initial focal cluster (Phase 1 Unit 1.5 Step 2: Vera + Otto + Neal
per cue table at frame 1410), then expands to 17-mosaic halo at
frames 1560–1860.

**Phase 1 cascade lock echoed VERBATIM** (anti-pattern guard):

> Phase 1 Unit 1.5 lock: "Sequential revelation with focal hierarchy,
> NOT layered-simultaneous." Card-art halo is right-edge-only at 40%
> opacity throughout (texture, not focal). Comms-ticker stays dim
> background until frame 1860 (cascade peak intensification). The
> 1950 stamp slap is the trailer's ONLY "everything at once"
> moment — every other cascade frame has exactly one element at
> full visual weight.

Phase 3 ships **`videos/trailer/src/lib/cascade-ring-layout.json`**
declaring per-card position in the 17-mosaic halo so Phase 4
cannot accidentally render layered-simultaneous:

```json
{
  "$schema": "./cascade-ring-layout.schema.json",
  "ring": {
    "centerX": 1700,        "comment_centerX": "right-edge focal centroid; HTP hero occupies left ~70% of frame",
    "centerY": 540,
    "radiusInner": 280,
    "radiusOuter": 360,
    "opacityCeiling": 0.4,  "comment_opacityCeiling": "Phase 1 lock: halo stays ≤40% opacity throughout"
  },
  "entryStaggerFrames": 2,  "comment_entryStaggerFrames": "Phase 1 lock: 2-frame stagger per item (Emil's 30-80ms range at 30fps)",
  "entries": [
    { "filename": "dash-barlowe.webp",   "angleDeg":   0, "zOrder":  1, "entryFrameOffset":  0 },
    { "filename": "vera-khan.webp",      "angleDeg":  21, "zOrder":  2, "entryFrameOffset":  2 },
    { "filename": "sable-ashworth.webp", "angleDeg":  42, "zOrder":  3, "entryFrameOffset":  4 },
    { "filename": "janet-broadside.webp","angleDeg":  63, "zOrder":  4, "entryFrameOffset":  6 },
    { "filename": "neal-proctor.webp",   "angleDeg":  84, "zOrder":  5, "entryFrameOffset":  8 },
    { "filename": "agent-x.webp",        "angleDeg": 105, "zOrder":  6, "entryFrameOffset": 10 },
    { "filename": "burn-the-files.webp", "angleDeg": 126, "zOrder":  7, "entryFrameOffset": 12, "comment": "HERO-tier within halo — Phase 4 may elevate" },
    { "filename": "burned.webp",         "angleDeg": 147, "zOrder":  8, "entryFrameOffset": 14, "comment": "HERO-tier within halo — Phase 4 may elevate" },
    { "filename": "intercepted.webp",    "angleDeg": 168, "zOrder":  9, "entryFrameOffset": 16 },
    { "filename": "extraction.webp",     "angleDeg": 189, "zOrder": 10, "entryFrameOffset": 18 },
    { "filename": "intel-briefing.webp", "angleDeg": 210, "zOrder": 11, "entryFrameOffset": 20 },
    { "filename": "falsify-intel.webp",  "angleDeg": 231, "zOrder": 12, "entryFrameOffset": 22 },
    { "filename": "direct-order.webp",   "angleDeg": 252, "zOrder": 13, "entryFrameOffset": 24 },
    { "filename": "reassign.webp",       "angleDeg": 273, "zOrder": 14, "entryFrameOffset": 26 },
    { "filename": "call-in-a-favor.webp","angleDeg": 294, "zOrder": 15, "entryFrameOffset": 28 },
    { "filename": "back-channel.webp",   "angleDeg": 315, "zOrder": 16, "entryFrameOffset": 30 },
    { "filename": "go-dark.webp",        "angleDeg": 336, "zOrder": 17, "entryFrameOffset": 32 }
  ]
}
```

Phase 4 consumes via `import ring from './lib/cascade-ring-layout.json'`
+ iterates `ring.entries` to position each card. Angles distributed
evenly around 360° (21° step ≈ `360 / 17`); the two HERO-tier cards
(`burn-the-files`, `burned`) sit at 126°/147° which is the natural
focal arc as cards complete the ring; Phase 4 may elevate their
opacity transiently when they enter (still capped at 40% — Phase 1
lock — but at the high end of the band rather than 25-30%).

**Step 6 — Closing-card image (unchanged from pre-deepening).**

S06 (frames 2580–2850) renders the BURNED logo center-frame at 2790.

Per Unit 1.10 Step 1 (S06 visual): the dossier closes (reverse of S02
opening), BURNED logo lands, R15 stamp #4 ("OPERATION STATUS:
FIELD-READY" — per Phase 1 lock; NOT "AGENT-BUILT, ARCHER-GRADE")
slaps on at frame 2820 (NOT 2800). **No card art in S06.** The logo
+ dossier-folder-closing graphic + R15 stamp carry the closing frame.
Dash card art appears only in S02/S03 (briefing context); S06
doesn't need a portrait.

No card-art assignment to S06 in this curation pass.

**Step 7 — Asset resolution: staticFile through ADR #8 (locked).**

Phase 0 ADR #8 + Phase 3 deepening ADR #15 lock the resolution:
- BURNED's `public/assets/cards/*.webp` are reachable via
  `staticFile('assets/cards/dash-barlowe.webp')` through
  `setPublicDir('../../public')`.
- Phase 3 does NOT copy or symlink card-art files.
- Phase 3 documents curation in `card-curation.md` + exports
  `card-roster.ts` for typed access.

Phase 4 imports the typed roster:

```ts
import { CARD_ROSTER, COLD_OPEN_CARDS, S03_ROSTER, CASCADE_HALO } from './lib/card-roster';
import { staticFile } from 'remotion';
// ...
<Img src={staticFile(`assets/cards/${entry.filename}`)} />
```

**Step 8 — `card-roster.ts` (VERIFIED entries).**

```ts
// videos/trailer/src/lib/card-roster.ts
export interface CardRosterEntry {
  /** webp filename relative to public/assets/cards/. Verified to exist on disk. */
  filename: string;
  /** Display name for chrome labels in S03 roster reveal. */
  displayName: string;
  /** Card type — narrowed per BURNED domain. */
  type: 'operative' | 'action';
  /** Trailer role assignments. */
  roles: ReadonlyArray<'cold-open' | 's03-roster' | 'cascade-halo-focal-3' | 'cascade-halo-17'>;
  /** Tier per Phase 3 Critical Constraints §Asset Tier Taxonomy. */
  tier: 'hero' | 'texture' | 'chrome';
}

export const CARD_ROSTER: readonly CardRosterEntry[] = [
  // Operatives (6 — in card deck; Otto roster-only excluded; Dolores on Intercepted card only)
  { filename: 'dash-barlowe.webp',    displayName: 'Dash Barlowe',    type: 'operative', roles: ['cold-open', 's03-roster', 'cascade-halo-focal-3', 'cascade-halo-17'], tier: 'hero' },
  { filename: 'vera-khan.webp',       displayName: 'Vera Khan',       type: 'operative', roles: ['cold-open', 's03-roster', 'cascade-halo-focal-3', 'cascade-halo-17'], tier: 'hero' },
  { filename: 'sable-ashworth.webp',  displayName: 'Sable Ashworth',  type: 'operative', roles: ['cold-open', 's03-roster', 'cascade-halo-17'], tier: 'hero' },
  { filename: 'janet-broadside.webp', displayName: 'Janet Broadside', type: 'operative', roles: ['cold-open', 's03-roster', 'cascade-halo-17'], tier: 'hero' },
  { filename: 'neal-proctor.webp',    displayName: 'Neal Proctor',    type: 'operative', roles: ['cold-open', 's03-roster', 'cascade-halo-focal-3', 'cascade-halo-17'], tier: 'hero' },
  { filename: 'agent-x.webp',         displayName: 'Agent X',         type: 'operative', roles: ['s03-roster', 'cascade-halo-17'], tier: 'hero' },
  // Action cards (11)
  { filename: 'back-channel.webp',    displayName: 'Back Channel',    type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'burn-the-files.webp',  displayName: 'Burn the Files',  type: 'action', roles: ['cascade-halo-17'], tier: 'hero' /* mechanic-namesake card; Phase 4 may elevate within cascade */ },
  { filename: 'burned.webp',          displayName: 'Burned',          type: 'action', roles: ['cascade-halo-17'], tier: 'hero' /* game-namesake card; Phase 4 may elevate */ },
  { filename: 'call-in-a-favor.webp', displayName: 'Call In A Favor', type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'direct-order.webp',    displayName: 'Direct Order',    type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'extraction.webp',      displayName: 'Extraction',      type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'falsify-intel.webp',   displayName: 'Falsify Intel',   type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'go-dark.webp',         displayName: 'Go Dark',         type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'intel-briefing.webp',  displayName: 'Intel Briefing',  type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
  { filename: 'intercepted.webp',     displayName: 'Intercepted',     type: 'action', roles: ['cascade-halo-17'], tier: 'texture' /* Dolores Grieves depicted on this card */ },
  { filename: 'reassign.webp',        displayName: 'Reassign',        type: 'action', roles: ['cascade-halo-17'], tier: 'texture' },
] as const;

// Compile-time check: 17 entries
type AssertLen17 = typeof CARD_ROSTER['length'] extends 17 ? true : never;
const _len: AssertLen17 = true; void _len;

export const COLD_OPEN_CARDS  = CARD_ROSTER.filter((c) => c.roles.includes('cold-open'));
export const S03_ROSTER       = CARD_ROSTER.filter((c) => c.roles.includes('s03-roster'));
export const CASCADE_HALO_FOCAL_3 = CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo-focal-3'));
export const CASCADE_HALO     = CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo-17'));
```

Compile-time assertion catches drift if the array ever loses/gains
entries. Phase 0 stub ships `[] as const`; Unit 3.2 replaces with the
full roster.

**Patterns to follow:**

- BURNED's existing card-art organization at `public/assets/cards/`.
- `feedback-imagen-budget.md` — no new Imagen runs without budget
  justification.
- Phase 0 ADR #8 (`setPublicDir('../../public')`) — read upstream
  assets, don't duplicate.
- Phase 3 ADR #15 (new trailer-only assets land in `public/trailer/...`).
- `feedback-stats-single-source.md` — if card count drifts, all
  surfaces (TODO + brainstorm + Phase 3 + roadmap) update in one
  pass.

**Test scenarios:**

- **Happy path:** `card-roster.ts` typechecks; compile-time
  assertion holds at 17 entries; `audit-card-inventory.ts` script
  finds exactly 17 webp files.
- **Verification (CI):** Vitest test `card-roster.test.ts` asserts
  every `CARD_ROSTER[i].filename` exists via
  `existsSync('public/assets/cards/' + entry.filename)`. Fails on
  drift.
- **Verification (CI):** Same test asserts every filename returned by
  `readdirSync('public/assets/cards')` appears in `CARD_ROSTER`
  (catches BURNED adding card art without trailer noticing).
- **Edge case:** Future card addition → CI test fails; Phase 3
  deepening reopens to assign trailer role.
- **Edge case:** Card removal → CI test fails; Phase 4 import breaks
  at typecheck.

**Verification:**

- `card-curation.md` exists with per-card rationale.
- `card-roster.ts` exists; typechecks; 17 entries; CI test green.
- `cascade-ring-layout.json` exists; Phase 4 consumes for halo
  composition.
- No card art moved or copied (Phase 0 ADR #8 honored).
- Otto-aside treatment selected (Phase 4 composes; Phase 3 ensures
  both `arena/portrait-otto.png` and vocabulary components are
  available).

---

### Unit 3.0 — BURNED HTP Vocabulary Vendoring (NEW per Path B architecture)

- [ ] **Unit 3.0: BURNED HTP Vocabulary Vendoring**

**Goal:** Copy the 5 BURNED HTP component pairs (Stamp, Crest,
RedactBar, ClassificationBanner, DossierPage + their `.module.css`
peers) from `src/client/howtoplay/components/` into
`videos/trailer/src/components/burned-vocabulary/`. Add a CI drift-
catcher script. Phase 4 imports vendored components as local —
giving the trailer the EXACT visual primitives BURNED's HTP renders
in-game (stamps with `animate="slam"`, crest with `variant="svg|image"`,
classification banner with `tone="red|amber|navy"`, redact-bar with
hover-reveal + tilt, dossier-page with `[data-reveal]` + paperclip/
staple affordance).

This unit IS the Path B architecture lock from Critical Constraints
§Visual Asset Architecture. Without it, Phase 3 falls back to raw-
SVG reimplementation (Path C) which breaks §2.2 visual continuity.

**Requirements:** Cross-cutting — every unit producing in-frame chrome
benefits. Strictly required for Unit 3.3 (CASE BANNER + COMMS ticker
visual-diff verification) + Unit 3.4 (R15 chrome stamp filter
parameter cross-reference + Phase 4 stamp-slap composition).

**Dependencies:** Phase 0 Unit 0.1 trailer scaffold shipped
(`videos/trailer/src/components/` directory exists; `pnpm
typecheck` clean in trailer/). BURNED HTP components present at
`src/client/howtoplay/components/` (verified — 10 components, the
5 vocabulary ones we vendor are Stamp, Crest, RedactBar,
ClassificationBanner, DossierPage; the other 5 — Card, EyebrowLabel,
Marginalia, PlayCTA, ReadingProgress — are HTP-app-specific and NOT
vendored).

**Files:**

- Create: `videos/trailer/src/components/burned-vocabulary/Stamp.tsx`
- Create: `videos/trailer/src/components/burned-vocabulary/Stamp.module.css`
- Create: `videos/trailer/src/components/burned-vocabulary/Crest.tsx`
- Create: `videos/trailer/src/components/burned-vocabulary/Crest.module.css`
- Create: `videos/trailer/src/components/burned-vocabulary/RedactBar.tsx`
- Create: `videos/trailer/src/components/burned-vocabulary/RedactBar.module.css`
- Create: `videos/trailer/src/components/burned-vocabulary/ClassificationBanner.tsx`
- Create: `videos/trailer/src/components/burned-vocabulary/ClassificationBanner.module.css`
- Create: `videos/trailer/src/components/burned-vocabulary/DossierPage.tsx`
- Create: `videos/trailer/src/components/burned-vocabulary/DossierPage.module.css`
- Create: `videos/trailer/src/components/burned-vocabulary/README.md` —
  documents vendor source + drift-catcher + token dependencies.
- Create: `videos/trailer/scripts/vendor-burned-vocab.ts` — initial
  copy + re-sync script (run on every Phase 3 entry).
- Create: `videos/trailer/scripts/verify-vocab-sync.ts` — CI drift
  check (compares vendored copy against source).
- Add to `videos/trailer/package.json` scripts: `"vendor:vocab":
  "tsx scripts/vendor-burned-vocab.ts"` + `"verify:vocab-sync":
  "tsx scripts/verify-vocab-sync.ts"`.

**Approach:**

**Step 1 — Vendor copy script.**

```ts
// videos/trailer/scripts/vendor-burned-vocab.ts
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_DIR = resolve(process.cwd(), '../../src/client/howtoplay/components');
const TARGET_DIR = resolve(process.cwd(), 'src/components/burned-vocabulary');

const VENDORED_FILES = [
  'Stamp.tsx', 'Stamp.module.css',
  'Crest.tsx', 'Crest.module.css',
  'RedactBar.tsx', 'RedactBar.module.css',
  'ClassificationBanner.tsx', 'ClassificationBanner.module.css',
  'DossierPage.tsx', 'DossierPage.module.css',
] as const;

function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`ERROR: source dir missing: ${SOURCE_DIR}`);
    console.error('Run from videos/trailer/ — script paths are relative.');
    process.exit(1);
  }
  mkdirSync(TARGET_DIR, { recursive: true });

  for (const f of VENDORED_FILES) {
    const src = resolve(SOURCE_DIR, f);
    const dst = resolve(TARGET_DIR, f);
    if (!existsSync(src)) {
      console.error(`ERROR: source file missing: ${src}`);
      process.exit(1);
    }
    cpSync(src, dst);
    console.log(`OK   copied ${f}`);
  }
  console.log(`OK   ${VENDORED_FILES.length} files vendored to ${TARGET_DIR}`);
  console.log(`     Run \`pnpm verify:vocab-sync\` to verify no drift.`);
}

main();
```

Script runs from `videos/trailer/` cwd. The `../../src/client/...`
relative path stays stable across Phase 3 + Phase 4 + Phase 5.

**Step 2 — Drift verification script (CI).**

```ts
// videos/trailer/scripts/verify-vocab-sync.ts
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const SOURCE_DIR = resolve(process.cwd(), '../../src/client/howtoplay/components');
const TARGET_DIR = resolve(process.cwd(), 'src/components/burned-vocabulary');

const VENDORED_FILES = [
  'Stamp.tsx', 'Stamp.module.css',
  'Crest.tsx', 'Crest.module.css',
  'RedactBar.tsx', 'RedactBar.module.css',
  'ClassificationBanner.tsx', 'ClassificationBanner.module.css',
  'DossierPage.tsx', 'DossierPage.module.css',
] as const;

function sha(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function main() {
  const failures: string[] = [];
  for (const f of VENDORED_FILES) {
    const src = resolve(SOURCE_DIR, f);
    const dst = resolve(TARGET_DIR, f);
    if (!existsSync(dst)) {
      failures.push(`MISSING vendored: ${f}`);
      continue;
    }
    if (!existsSync(src)) {
      failures.push(`MISSING source (BURNED moved/renamed?): ${f}`);
      continue;
    }
    const srcSha = sha(readFileSync(src, 'utf-8'));
    const dstSha = sha(readFileSync(dst, 'utf-8'));
    if (srcSha !== dstSha) {
      failures.push(`DRIFT in ${f}: BURNED source has changed; re-run \`pnpm vendor:vocab\``);
    } else {
      console.log(`OK   ${f}`);
    }
  }
  if (failures.length > 0) {
    console.error('\nVOCAB SYNC FAILURES:');
    failures.forEach((f) => console.error(`  ${f}`));
    process.exit(1);
  }
  console.log(`\nOK   all ${VENDORED_FILES.length} vendored files in sync.`);
}

main();
```

This runs as a CI gate (add to GitHub Actions `verify-burned` job).
Drift = build failure. Operator either re-vendors (BURNED's source
is the canonical update) OR rolls back BURNED's source change (if
the change was unintentional).

**Step 3 — Token-dependency note in README.**

The vendored components reference CSS custom properties defined in
BURNED's `src/client/howtoplay/styles.css` + `dossier.css` + token
files. Phase 4 must ensure the trailer's `src/Root.tsx` imports the
equivalent token CSS (either vendored or via path-relative import
through Phase 0 ADR #8). Currently Phase 4 deepening will absorb
this dependency — flag here for downstream:

```md
# burned-vocabulary/

VENDORED from `src/client/howtoplay/components/` at Phase 3 entry.
Sync verified via `pnpm verify:vocab-sync` (CI gate).

## Token dependencies

These components consume CSS custom properties from BURNED's HTP
token stylesheets. Phase 4 must import equivalent tokens before
mounting any vocabulary component:

- `--stamp-red`, `--stamp-black`, `--stamp-blue`, `--stamp-amber`
  (Stamp.tsx ink colors)
- `--color-cream-N`, `--color-ochre-N`, `--color-mahogany-N`,
  `--color-burned-fire`, `--color-charcoal-N` (Radix-style scale+
  step tokens per Phase 1 Unit 1.8)
- Font families: ClashDisplay-Variable, GeneralSans-Variable,
  JetBrainsMono-Variable (loaded via `@remotion/fonts` in Phase 4
  Root)

Token CSS imports — Phase 4 wiring decision (deferred to Phase 4
deepening):
- Option A: vendor the token CSS files alongside the components
  (full self-contained). +cohesion, -drift risk
- Option B: import via Phase 0 ADR #8 path
  (`import '../../../src/client/shared/tokens/primitives.css'`).
  +canonical source, -bundler compatibility uncertain
- Option C: ship a Phase-4-specific token shim that mirrors the
  required tokens at fixed values. +bundler-safe, -drift risk

Phase 4 picks.
```

**Step 4 — Operator workflow.**

```bash
# Phase 3 entry: vendor the vocabulary
cd videos/trailer
pnpm vendor:vocab

# Verify (CI runs this on every PR):
pnpm verify:vocab-sync
```

**Step 5 — Failure modes + recovery.**

- **Source file moved/renamed in BURNED:** `verify:vocab-sync` reports
  `MISSING source`. Either (a) update vendored file list to track new
  path (rare), or (b) roll back BURNED's rename if accidental.
- **Source content drifted:** Operator inspects the diff (`diff
  src/client/howtoplay/components/Stamp.tsx
  videos/trailer/src/components/burned-vocabulary/Stamp.tsx`). If
  BURNED's change is intentional (Stamp.tsx got a new prop), re-run
  `pnpm vendor:vocab` to absorb. If BURNED's change is destructive,
  push back in BURNED.
- **Trailer bundler complains about CSS module:** Phase 4 deepening
  resolves via Token Option A/B/C above.

**Patterns to follow:**

- BURNED's HTP component vocabulary as the canonical source.
- UMB precedent's zero-cross-package-imports principle
  (`projects/undercover-mob-boss/videos/trailer/`) — vendoring honors
  the isolation contract.
- `feedback-write-it-down.md` — drift-catcher script is the cross-
  session promise enforcement.

**Test scenarios:**

- **Happy path:** Phase 3 entry → `pnpm vendor:vocab` copies 10
  files → `pnpm verify:vocab-sync` reports all in sync → Phase 4
  imports succeed.
- **Edge case:** BURNED adds new prop to `Stamp.tsx` →
  `verify:vocab-sync` reports drift → operator re-runs `vendor:vocab`
  → Phase 4 absorbs new prop.
- **Edge case:** BURNED renames `Stamp.tsx` →
  `verify:vocab-sync` reports `MISSING source` → operator decides
  rename impact.
- **CI gate:** PR touching BURNED HTP components + missing
  re-vendor → trailer build fails. Operator either re-vendors or
  rolls back.

**Verification:**

- 10 files in `videos/trailer/src/components/burned-vocabulary/`.
- `verify:vocab-sync` exits 0.
- `videos/trailer/src/components/burned-vocabulary/README.md`
  documents source + token-dependency.
- Phase 4 deepening absorbs the token-import decision (Option A/B/C).

---

### Unit 3.3 — Briefing-Room Set-Dressing

- [ ] **Unit 3.3: Briefing-Room Set-Dressing**

**Goal:** Inventory existing briefing-room assets (most already exist
on disk per Phase 3 deepening discovery), then produce ONLY the gap
SVGs Phase 4 needs to compose S02 / S03 / S06. Per Path B
architecture: most chrome rendering uses vendored React components
(Unit 3.0); only static backdrop SVGs ship here.

**Requirements:** R1 (in-world Pendleton briefing). HERO tier for
mahogany-desk surface + depth-plane element; TEXTURE tier for
venetian-blinds + paper textures; CHROME tier for case-banner + comms-
ticker reference renderings.

**Dependencies:** Unit 3.0 (vendored vocabulary — CaseBanner JSX +
ClassificationBanner + Crest components needed for visual-diff
verification). Parallel-OK with Units 3.1 + 3.2 + 3.4 + 3.6.

**Files (post-inventory — most assets ALREADY EXIST):**

**EXISTING — surfaced via manifest, NOT regenerated:**

- `public/assets/arena/mahogany-horizontal.png` (1.8 MB Imagen, clean
  wood-grain) — covers the mahogany desk surface role at S02 + S06
- `public/assets/arena/mahogany-vertical.png` (1.6 MB) — covers
  vertical-oriented mahogany frame elements
- `public/assets/arena/blotter.png` (1.4 MB cream paper texture) —
  covers the desk-blotter / paper-pad backdrop
- `public/assets/arena/stamp-classified.png` (588 KB) — covers
  classification stamp visual primitive
- `public/assets/arena/operative-silhouette.png` (744 KB) — REDACTED-
  bar silhouette for Agent X chrome treatment
- `public/assets/arena/portrait-{dash,vera,otto,janet,neal,agent-x}.png`
  (6 portraits, 700KB-1.3MB each) — dossier-quality operative
  portraits for S03 roster
- `public/assets/roster/{dash-barlowe,vera-khan,sable-ashworth,
  janet-broadside,neal-proctor,agent-x}.png` (6 higher-res portraits,
  1.1-1.3 MB each) — Sable's roster portrait (only available here,
  NOT in arena/) + alternative higher-res for any operative
- `public/assets/howtoplay/pendleton-crest.png` (1.5 MB Imagen
  generated, visually verified clean — used at HTP App.tsx hero) —
  covers Pendleton crest at poster size
- `public/assets/howtoplay/operations-manual-plate.png` (1.4 MB
  Imagen-generated title plate "OPERATION / BURNED / FIELD OPERATIONS
  MANUAL", visually verified clean) — covers cold-open title plate
  role (Unit 3.6)

**NEW — Phase 3 produces (at `public/trailer/briefing-room/` per ADR #15):**

- Create: `public/trailer/briefing-room/venetian-blinds.svg` — shadow
  mask layer.
- Create: `public/trailer/briefing-room/dossier-folder-closed.svg` —
  manila folder shape, classification stamp diagonal, Pendleton crest
  centered. Closed state.
- Create: `public/trailer/briefing-room/dossier-folder-open.svg` —
  folder opens to reveal case-sheet template.
- Create: `public/trailer/briefing-room/depth-plane.svg` (NEW per
  Phase 1 Unit 1.10 deepening — depth-plane foreground element; pick
  in Step 7 below from Option A brass nameplate / B manila folders
  stack / C doorframe vignette).

**REFERENCE renders for Phase 4 (NOT shipped; only used for visual-
diff verification in Step 6):**

- `videos/trailer/sample-eval/visual-asset-prep/case-banner-reference.png`
  — Playwright-captured render of BURNED's `GameTable.tsx:67-72`
  inline `<aside className={styles.caseBanner}>` at 1920×80 crop.
  Phase 4 ports the JSX + className into a trailer-local component
  consuming vendored vocabulary tokens. (NO `case-banner-strip.svg`
  file — that was a pre-deepening artifact from the Path C raw-SVG
  approach.)
- `videos/trailer/sample-eval/visual-asset-prep/comms-ticker-reference.png`
  — Playwright-captured render of BURNED's `DossierFeed.tsx` at
  1920×40 crop. Same Phase 4 porting pattern.
- `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`
  (this unit appends).

**Approach:**

**Step 1 — Mahogany desk surface (USE EXISTING).**

Pre-deepening Phase 3 planned a Playwright capture script with
`setContent` + `<link rel="stylesheet" href="http://localhost:5173/
src/client/board/semantic.board.css">`. This approach was **CUT**
during deepening for two reasons:

1. **Asset already exists** at `public/assets/arena/mahogany-
   horizontal.png` (1.8 MB Imagen-generated, visually verified clean
   wood-grain). Generated via `scripts/generate-briefing-assets.ts`
   with prompt "photorealistic horizontal mahogany wood plank
   surface, warm reddish-brown color, visible horizontal wood grain
   pattern running the entire length left to right..." — already
   trailer-grade.
2. **The setContent approach was broken** — loading a bare
   `semantic.board.css` URL via Vite serves the raw source, NOT the
   processed version. Token definitions (`--color-mahogany`,
   `--color-cream-N`) live in `primitives.css` / generated palette
   files that the bare link wouldn't load. The setContent capture
   would render with undefined tokens (transparent or black).

**Lock:** No new mahogany-desk capture. Phase 4 imports existing
asset via `staticFile('assets/arena/mahogany-horizontal.png')`
through Phase 0 ADR #8. If a non-horizontal orientation is needed,
`mahogany-vertical.png` covers; both are 16:9-friendly textures
designed to tile or full-bleed.

**Step 2 — Venetian-blind shadow.**

SVG mask layer rendering horizontal shadow bands:

```svg
<!-- videos/trailer/public/assets/briefing-room/venetian-blinds.svg -->
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <linearGradient id="bandFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="30%" stop-color="rgba(0,0,0,0.18)" />
      <stop offset="70%" stop-color="rgba(0,0,0,0.18)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  <!-- 6 horizontal shadow bands across 1080px height -->
  <rect x="0" y="40"   width="1920" height="80" fill="url(#bandFade)" />
  <rect x="0" y="220"  width="1920" height="80" fill="url(#bandFade)" />
  <rect x="0" y="400"  width="1920" height="80" fill="url(#bandFade)" />
  <rect x="0" y="580"  width="1920" height="80" fill="url(#bandFade)" />
  <rect x="0" y="760"  width="1920" height="80" fill="url(#bandFade)" />
  <rect x="0" y="940"  width="1920" height="80" fill="url(#bandFade)" />
</svg>
```

Phase 4 composes this over the mahogany-desk PNG at scene start;
animates `transform: translateX(...)` slowly to simulate sun moving
across blinds (per Unit 1.10 S02 visual cue — subtle 0.5px/frame).

**Step 3 — Dossier folder graphics.**

Two SVG states:

- **`dossier-folder-closed.svg`** — manila folder shape, Pendleton
  crest centered, "TOP SECRET / OPERATION PENDLETON / CASE FILE 02"
  classification stamp diagonal across.
- **`dossier-folder-open.svg`** — folder cover opens to reveal an
  inner case-sheet template, with placeholder text regions Phase 4
  text-overlays.

Folder shape: bevelled rectangle with shadow, manila-yellow fill
(BURNED's `--color-cream` token shifted to manila tone), faint paper-
grain texture (SVG noise filter).

For S02's folder-opening choreography (Unit 1.10 Step 1), Phase 4
ease-animates between the two SVG states via the standard
`<TransitionSeries>` overlay OR a custom SVG morph (Phase 4 decision).

**Step 4 — Pendleton crest (USE EXISTING — two sources available).**

Pre-deepening plan said "locate via Glob" — that was a NULL operation
(no `.svg` crest file exists in the repo). And the Imagen fallback
was a category error (Imagen produces raster, not SVG). Phase 3
deepening verified two existing sources cover the trailer's crest
needs:

**Source A — Imagen-generated PNG at poster size:**
`public/assets/howtoplay/pendleton-crest.png` (1.5 MB, visually
verified clean — used at the HTP App.tsx hero already; the file
shipped in BURNED ages ago via `scripts/generate-htp-assets.ts`).
Use case: S02 corner watermark + S06 closing-folder dressing at
trailer-poster size. Phase 4 imports via
`staticFile('assets/howtoplay/pendleton-crest.png')`.

**Source B — Pure-vector SVG INLINE in Crest.tsx component:**
`src/client/howtoplay/components/Crest.tsx` lines 41-121 — complete
inline SVG with `viewBox="0 0 200 200"`, currentColor-driven for
tinting via parent color, includes:
- 3 outer rings (concentric stroked circles)
- Pendleton-Agency text along outer ring via `<textPath>` (text
  "THE PENDLETON AGENCY · EST. 1962 ·")
- Inner classification text ("TS // SCI" + "EYES ONLY")
- Inner ring + center medallion "P"
- Crossed pen + olive-pick implements
- Laurel half-rings + leaves
- Subtle ink-bleed noise filter overlay

Use case: small trailer chrome positions where vector resolution-
independence is needed; consumed via the vendored
`<Crest variant="svg" size="sm|md|lg" />` React component (Unit 3.0).

**Lock:** No new asset generation needed. Phase 4 picks Source A
(staticFile PNG) for poster moments + Source B (vendored Crest.tsx
component) for in-frame chrome that needs vector scaling or
currentColor tinting. **Zero Imagen budget consumed for the crest.**

**Step 5 — CASE BANNER + COMMS ticker (Phase 4 renders via vendored components — Phase 3 produces visual-diff reference renders only).**

**Critical correction:** Pre-deepening plan referenced
`src/client/board/CaseBanner.tsx` — that file DOES NOT EXIST. Per
Phase 1 Unit 1.10 explicit directive: *"There is NO standalone
CaseBanner.tsx component — the trailer's Phase 4 scene file ports
the JSX + classNames directly from `GameTable.tsx:67-88` (lines 67-
72 + matching `.caseBanner` styles in GameTable.module.css)."*

Per Path B architecture lock (Critical Constraints), the CASE BANNER
and COMMS ticker are rendered by **vendored React components in
Phase 4**, NOT hand-authored SVG. Specifically:

- **CASE BANNER:** Phase 4 ports the JSX from `GameTable.tsx:67-72`
  inline `<aside className={styles.caseBanner}>` + the matching CSS
  rules from `GameTable.module.css`. Or composes via the vendored
  `ClassificationBanner.tsx` (from Unit 3.0) which has `tone="red"
  | "amber" | "navy"` + `position="top" | "bottom"` props and ships
  the same triple-repeat-text-for-wide-layouts pattern.
- **COMMS ticker:** Phase 4 composes via the vendored
  `DossierFeed`-equivalent. (DossierFeed lives at
  `src/client/board/DossierFeed.tsx` in BURNED; not yet vendored —
  if Phase 4 finds it needs DossierFeed at compose time, add to
  Unit 3.0's `VENDORED_FILES` array and re-vendor. Currently the
  vocabulary set is the 5 HTP components only.)

**Phase 3's deliverable for Unit 3.3 Step 5: REFERENCE RENDERS for
visual-diff verification, NOT shipping SVGs.**

```ts
// videos/trailer/scripts/capture-banner-references.ts
// Playwright-render BURNED's live CASE BANNER + COMMS ticker
// (against running Vite dev server at localhost:5173 — board view
// in a lobby state to expose the chrome). Crop to 1920×80 and
// 1920×40 strips. Output to sample-eval for Phase 4 to visual-diff
// against the vendored-component renders.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const OUT_DIR = resolve(process.cwd(), 'videos/trailer/sample-eval/visual-asset-prep');

async function main() {
  if (!existsSync('public/assets/cards')) {
    console.error('Run from BURNED repo root.');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173/board.html?room=PHASE3', { waitUntil: 'networkidle' });
  // Wait for CaseBanner aside to render in lobby state
  await page.waitForSelector('aside.caseBanner', { timeout: 10_000 });
  const bannerHandle = await page.$('aside.caseBanner');
  if (bannerHandle) {
    await bannerHandle.screenshot({ path: resolve(OUT_DIR, 'case-banner-reference.png') });
  }
  // Same for DossierFeed
  const feedHandle = await page.$('[data-testid="dossier-feed"]'); // adjust selector
  if (feedHandle) {
    await feedHandle.screenshot({ path: resolve(OUT_DIR, 'comms-ticker-reference.png') });
  }
  await browser.close();
}
main().catch((err) => { console.error(err); process.exit(1); });
```

Phase 4 visual-diff: composite the vendored-component render side-
by-side with the reference PNG at same dimensions. Any visible
discrepancy in type-weight, spacing, height = pre-Phase-4 fix
(re-vendor or re-port).

**Step 6 — Inventory documentation.**

This step appends to the consolidated
`videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`
(per scope-guardian deepening — single inventory doc replaces the
4 per-unit eval markdowns the pre-deepening plan had).

Section to append:

```md
## Briefing-Room Inventory

### Existing assets (Path A via staticFile through ADR #8)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `assets/arena/mahogany-horizontal.png` | Imagen-gen (briefing-assets script) | 1.8 MB | HERO | S02/S06 desk backdrop |
| `assets/arena/mahogany-vertical.png` | Same | 1.6 MB | TEXTURE | Vertical frame elements |
| `assets/arena/blotter.png` | Same | 1.4 MB | TEXTURE | Paper-pad backdrop |
| `assets/arena/stamp-classified.png` | Same | 588 KB | CHROME | Classification stamp primitive |
| `assets/arena/operative-silhouette.png` | Same | 744 KB | CHROME | Agent X REDACTED treatment |
| `assets/arena/portrait-{dash,vera,otto,janet,neal,agent-x}.png` | Same | 700KB-1.3MB ea | HERO | S03 dossier portraits |
| `assets/roster/{operative}.png` | Same | 1.1-1.3MB ea | HERO | Higher-res alternative (Sable only here) |
| `assets/howtoplay/pendleton-crest.png` | Imagen-gen (htp-assets script) | 1.5 MB | CHROME | Poster crest watermark |
| `assets/howtoplay/operations-manual-plate.png` | Same | 1.4 MB | HERO | Cold-open title plate (Unit 3.6) |

### New assets (NEW SVG at public/trailer/briefing-room/)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/briefing-room/venetian-blinds.svg` | Hand-authored | 1920×1080 viewport | TEXTURE | S02 sun-through-blinds; 1.5-2px/frame slow translateX (Phase 1 lock — was 0.5px subpixel) |
| `trailer/briefing-room/dossier-folder-closed.svg` | Hand-authored | 1000×1300 viewport | HERO | S02 cold-open pre-reveal state |
| `trailer/briefing-room/dossier-folder-open.svg` | Hand-authored | 1000×1300 viewport | HERO | S02 reveal post-state |
| `trailer/briefing-room/depth-plane.svg` | Hand-authored (Step 7 pick) | varies by option | HERO | S02 foreground depth-plane element per Phase 1 Unit 1.10 deepening |

### Reference renders (Phase 4 visual-diff only; NOT shipped to public/)

| Path | Source | Purpose |
|---|---|---|
| `sample-eval/visual-asset-prep/case-banner-reference.png` | Playwright crop of BURNED live `<aside.caseBanner>` | Phase 4 visual-diff against vendored-component render |
| `sample-eval/visual-asset-prep/comms-ticker-reference.png` | Playwright crop of BURNED live DossierFeed | Same |
```

**Step 7 — Depth-plane foreground element (NEW per Phase 1 Unit 1.10 deepening).**

Phase 1 Unit 1.10 deepening added: *"Foreground depth-plane element
requirement: one of Option A (brass nameplate 'M. PENDLETON, BUREAU
CHIEF'), Option B (manila folders stack), Option C (doorframe
vignette). The depth-plane element is a Phase 3 visual-asset-prep
item (add to Phase 3 unit 3.3 briefing-room-assets shot list)."*

Phase 3 Unit 3.3 Step 7 picks ONE of the three options. Default
recommendation: **Option A (brass nameplate)** — strongest single
narrative element ("M. Pendleton" anchors the agency naming + reads
in-frame at small dimensions; matches existing
`public/assets/howtoplay/pendleton-crest.png` typographic family).

```svg
<!-- public/trailer/briefing-room/depth-plane.svg — Option A: Brass nameplate -->
<svg viewBox="0 0 540 140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brassFinish" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--color-ochre-7, #c98a5c)" />
      <stop offset="35%" stop-color="var(--color-ochre-9, #947226)" />
      <stop offset="65%" stop-color="var(--color-ochre-11, #5a4514)" />
      <stop offset="100%" stop-color="var(--color-ochre-9, #947226)" />
    </linearGradient>
    <filter id="brassDepth">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
      <feOffset dx="0" dy="3" result="offsetblur" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#brassDepth)">
    <rect x="10" y="10" width="520" height="120" rx="4" ry="4" fill="url(#brassFinish)" stroke="var(--color-ochre-12, #3c2d0c)" stroke-width="2" />
    <text x="270" y="55" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="20"
          fill="var(--color-cream-1, #f6ebce)">
      M. PENDLETON
    </text>
    <text x="270" y="95" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="500" font-size="14"
          fill="var(--color-cream-3, #e6d5a9)" letter-spacing="2">
      BUREAU CHIEF
    </text>
  </g>
</svg>
```

If Option B (manila folders stack) preferred: hand-author a stack of
3-4 manila folders at slight rotations (~-2° to +3°) with paperclip
affordances + faint classification stamps visible on edges. If
Option C (doorframe vignette) preferred: large architectural frame
SVG at edge of viewport casting subtle gradient shadow into the
desk plane.

**[BRIGGSY-REVIEW GATE — Unit 3.3 Briefing-Room]**

Cannot proceed to Unit 3.4 until Briggsy eyes-on review of the
briefing-room composite asset family answers:

1. **Does the composite (mahogany + blotter + venetian-blinds +
   dossier-folder-closed + depth-plane) READ as M's office from
   ISIS / a Pendleton-era spy-agency briefing room, OR as a CSS
   rendering with PendletonStyleProps?** If the latter, individual
   asset visual treatments need re-investigation.
2. **Does the depth-plane element pull the eye forward in the
   composition (creating actual depth perception), or does it sit
   flat alongside the desk surface?** Foreground depth-plane is
   load-bearing for the S02 reveal cinematic.
3. **Would this composite be embarrassing next to a frame from the
   Archer Dreamland briefing scenes?** §2.2 acceptance.

Sentinel on pass: `sample-eval/visual-asset-prep/briggsy-review-3.3.signoff`.

**Patterns to follow:**

- BURNED arena vocabulary (per `project-burned-arena-direction`
  memory).
- SVG-first authoring for NEW assets (resolution independence + edit-
  friendliness); PNG via staticFile for EXISTING Imagen-generated
  set-dressing.
- BURNED HTP `ClassificationBanner.tsx` + `Crest.tsx` from vendored
  vocabulary (Unit 3.0) — visual-family DNA reference.
- `feedback-imagen-budget.md` — NO new Imagen runs in Unit 3.3
  (everything either exists already or hand-authored as SVG).

**Test scenarios:**

- **Happy path:** All EXISTING assets surfaced in manifest with
  correct `staticFile` args. 4 NEW SVGs land at `public/trailer/
  briefing-room/`. CASE BANNER + COMMS ticker reference renders
  capture cleanly.
- **Visual:** Render each NEW SVG in a browser at intended scale;
  verify visual match to in-game arena vocabulary.
- **Edge case:** BURNED's `aside.caseBanner` selector doesn't match
  (selector changed) → reference-render script fails fast; operator
  inspects GameTable.tsx for current selector + updates script.
- **Edge case:** Depth-plane SVG doesn't carry trailer weight on
  Briggsy review → escalate to Imagen <$1 (insight-018 stop-gate
  applies; STOP after 4 iterations + re-architect via Option A→B→C
  fallback or pure typographic-only approach).

**Verification:**

- 4 NEW SVG files in `public/trailer/briefing-room/` (venetian-
  blinds, dossier-folder-closed, dossier-folder-open, depth-plane).
- 2 reference renders in `sample-eval/visual-asset-prep/`
  (case-banner-reference.png + comms-ticker-reference.png).
- Existing-asset inventory surfaced in `asset-inventory.md`.
- Briggsy-review gate signoff sentinel present.

---

### Unit 3.4 — R15 Chrome Stamps (SPLIT-LAYER for Phase 4 stamp-slap)

- [ ] **Unit 3.4: R15 Chrome Stamps**

**Goal:** Produce the 4 R15 on-screen text signal assets per Unit
1.9's locked copy. **Each as TWO SVG files (frame + text) so Phase 4
composes with `transform-origin: center` for Phase 1 Unit 1.4's
stamp-slap motion (scale(0.95) → 1.04 → 1.0 overshoot).** Monolithic
SVG with baked `transform="rotate(...)"` would force scale-onto-pre-
rotated-raster which breaks the overshoot animation perceptually.

**Requirements:** R15 (on-screen text signal layer). CHROME tier for
#1 + #2 + #4; HERO tier for #3 (the trailer's load-bearing visual
stamp at the 1950 payoff peak).

**Dependencies:** Unit 1.9 (R15 copy lock), Unit 1.8 (typography
stack lock), Unit 3.0 (vendored vocabulary — Stamp.tsx.module.css
provides canonical ink-bleed filter parameters to cross-reference).

**Files:**

8 SVG files (4 instances × frame + text split-layer):

- Create: `public/trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg`
- Create: `public/trailer/r15-chrome/stamp-1-operation-pendleton-text.svg`
- Create: `public/trailer/r15-chrome/ticker-2-method-repeatable-frame.svg`
  (chrome strip background)
- Create: `public/trailer/r15-chrome/ticker-2-method-repeatable-text.svg`
  (ticker text overlay)
- Create: `public/trailer/r15-chrome/stamp-3-asset-delivered-frame.svg`
- Create: `public/trailer/r15-chrome/stamp-3-asset-delivered-text.svg`
- Create: `public/trailer/r15-chrome/subhead-4-field-ready-frame.svg`
  (NOTE: renamed from pre-deepening `subhead-4-agent-built.svg` per
  Phase 1 Unit 1.9 R15 #4 copy lock)
- Create: `public/trailer/r15-chrome/subhead-4-field-ready-text.svg`

Plus:

- Create: `videos/trailer/scripts/probe-r15-chrome-cvd.ts` — CVD
  probe script (Step 5b, run-and-delete pattern per insight 051)
- Append to: `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`

**Approach:**

**R15 copy lock (verified against Phase 1 Unit 1.9 deepening):**

| Instance | Frame | Copy | Treatment |
|---|---|---|---|
| #1 Classification stamp | **150** (S01 cold open) | `OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS` | -8° rotation, ochre ink, JetBrains Mono 700 28px |
| #2 Comms ticker pulse | **1680** (S04 cascade) | `OPERATIVE [REDACTED] — METHOD REPEATABLE` | Bottom-strip ticker, JetBrains Mono 500 22px |
| #3 Stacked-payoff stamp | **1950** (S04 payoff) | `AUTONOMOUS FIELD UNIT — ASSET DELIVERED` | -3° rotation, burn-fire ink, JetBrains Mono 700 38-42px — HERO |
| #4 Closing subhead | **2820** (S06 closing) | **`OPERATION STATUS: FIELD-READY`** (Phase 1 lock — was "AGENT-BUILT, ARCHER-GRADE" in pre-deepening; status-grammar differentiates from #3's origin-claim) | Subhead under BURNED logo, JetBrains Mono 700 32px, ochre ink |

**Color tokens (NOT bare hex):**

SVG `fill` attributes consume CSS custom properties via `currentColor`
(propagated from a Phase 4 wrapping `<g style="color: var(--color-
ochre-9)">`) OR an inlined `<style>` block at SVG root. Token values
verified against Phase 1 Unit 1.8 lock:
- `--color-ochre-9` = `#947226` (R15 #1, #2, #4 ink)
- `--color-burned-fire` = `#be2e27` (R15 #3 ink — **NOT `#c63b1e` as
  pre-deepening had**)
- `--color-charcoal-12` = `#1a1812` (ticker background)
- `--color-cream-1` = `#f6ebce` (paper backdrop)

**Step 1 — R15 instance #1: classification stamp (SPLIT-LAYER).**

Frame layer (border rectangle only, NO text, NO rotation in the SVG
— Phase 4 applies rotation + transform-origin: center):

```svg
<!-- public/trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg -->
<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226)">
  <defs>
    <!-- Filter parameters matched to Stamp.module.css (Unit 3.0 vendored) -->
    <filter id="inkBleed" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
      <feDisplacementMap in="SourceGraphic" scale="2" />
    </filter>
  </defs>
  <!-- Stamp paper outline -->
  <rect x="40" y="20" width="720" height="200"
        fill="none" stroke="currentColor" stroke-width="6"
        filter="url(#inkBleed)"
        style="color: var(--ink)" />
</svg>
```

Text layer (3-line text only, NO frame, NO rotation):

```svg
<!-- public/trailer/r15-chrome/stamp-1-operation-pendleton-text.svg -->
<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226)">
  <defs>
    <filter id="inkBleed" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
      <feDisplacementMap in="SourceGraphic" scale="2" />
    </filter>
  </defs>
  <g style="color: var(--ink)" filter="url(#inkBleed)">
    <text x="400" y="80"  text-anchor="middle"
          font-family="'JetBrains Mono', monospace" font-weight="700" font-size="28"
          fill="currentColor">
      OPERATION PENDLETON
    </text>
    <text x="400" y="120" text-anchor="middle"
          font-family="'JetBrains Mono', monospace" font-weight="700" font-size="28"
          fill="currentColor">
      CASE FILE 02
    </text>
    <text x="400" y="180" text-anchor="middle"
          font-family="'JetBrains Mono', monospace" font-weight="700" font-size="32"
          fill="currentColor">
      METHOD: AUTONOMOUS
    </text>
  </g>
</svg>
```

Phase 4 composition:

```tsx
// In Phase 4 S01 scene
<AbsoluteFill style={{ transformOrigin: 'center', transform: `rotate(-8deg) ${scaleSlap(frame)}` }}>
  <Img src={staticFile('trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg')} />
  <Img src={staticFile('trailer/r15-chrome/stamp-1-operation-pendleton-text.svg')} />
</AbsoluteFill>
```

`scaleSlap(frame)` interpolates Phase 1 lock: 0.95 → 1.04 (overshoot)
→ 1.0 (settle) over Phase 4's stamp-slap duration. Both Img layers
share the wrapping `transformOrigin: center` so they scale together
and rotate together — the SVG content itself is in identity space.

**Step 2 — R15 instance #2: comms-ticker pulse (SPLIT-LAYER).**

Frame layer (chrome strip background):

```svg
<!-- public/trailer/r15-chrome/ticker-2-method-repeatable-frame.svg -->
<svg viewBox="0 0 1920 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1920" height="40"
        fill="var(--color-charcoal-12, #1a1812)" />
</svg>
```

Text layer (ticker text only — Phase 4 may animate `translateX` for
scrolling effect):

```svg
<!-- public/trailer/r15-chrome/ticker-2-method-repeatable-text.svg -->
<svg viewBox="0 0 1920 40" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226)">
  <text x="960" y="28" text-anchor="middle"
        font-family="'JetBrains Mono', monospace" font-weight="500" font-size="22"
        fill="var(--ink)">
    OPERATIVE [REDACTED] — METHOD REPEATABLE
  </text>
</svg>
```

**Step 3 — R15 instance #3: stacked-payoff stamp (SPLIT-LAYER, HERO).**

This is the trailer's load-bearing visual stamp. Heavier ink-bleed
+ burn-fire ink.

Frame layer:

```svg
<!-- public/trailer/r15-chrome/stamp-3-asset-delivered-frame.svg -->
<svg viewBox="0 0 1200 280" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-burned-fire, #be2e27)">
  <defs>
    <filter id="heavyInkBleed" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence baseFrequency="0.7" numOctaves="3" seed="7" />
      <feDisplacementMap in="SourceGraphic" scale="4" />
    </filter>
  </defs>
  <rect x="40" y="20" width="1120" height="240"
        fill="none" stroke="currentColor" stroke-width="8"
        filter="url(#heavyInkBleed)"
        style="color: var(--ink)" />
</svg>
```

Text layer:

```svg
<!-- public/trailer/r15-chrome/stamp-3-asset-delivered-text.svg -->
<svg viewBox="0 0 1200 280" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-burned-fire, #be2e27)">
  <defs>
    <filter id="heavyInkBleed" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence baseFrequency="0.7" numOctaves="3" seed="7" />
      <feDisplacementMap in="SourceGraphic" scale="4" />
    </filter>
  </defs>
  <g style="color: var(--ink)" filter="url(#heavyInkBleed)">
    <text x="600" y="120" text-anchor="middle"
          font-family="'JetBrains Mono', monospace" font-weight="700" font-size="38"
          fill="currentColor">
      AUTONOMOUS FIELD UNIT
    </text>
    <text x="600" y="200" text-anchor="middle"
          font-family="'JetBrains Mono', monospace" font-weight="700" font-size="42"
          fill="currentColor">
      ASSET DELIVERED
    </text>
  </g>
</svg>
```

**Step 4 — R15 instance #4: closing subhead (SPLIT-LAYER + COPY/FRAME/FILENAME CORRECTION).**

**Triple-drift fix from Phase 1 Unit 1.9 deepening:**
- Copy was "AGENT-BUILT, ARCHER-GRADE" → **"OPERATION STATUS: FIELD-READY"**
- Frame was 2800 → **2820**
- Filename was `subhead-4-agent-built.svg` → **`subhead-4-field-ready-{frame,text}.svg`**
- Downstream sync: `phase-4-remotion-composite.md:1880` references
  `subhead-4-agent-built.svg`. Phase 4 deepening absorbs the filename
  + frame correction.

Frame layer (this instance has minimal frame — just optional faint
underline; closing subhead is mostly typographic):

```svg
<!-- public/trailer/r15-chrome/subhead-4-field-ready-frame.svg -->
<svg viewBox="0 0 800 60" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226)">
  <!-- Faint underline divider, optional — Phase 4 may hide -->
  <line x1="180" y1="52" x2="620" y2="52"
        stroke="currentColor" stroke-width="1.5" opacity="0.4"
        style="color: var(--ink)" />
</svg>
```

Text layer:

```svg
<!-- public/trailer/r15-chrome/subhead-4-field-ready-text.svg -->
<svg viewBox="0 0 800 60" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226)">
  <text x="400" y="40" text-anchor="middle"
        font-family="'JetBrains Mono', monospace" font-weight="700" font-size="32"
        fill="var(--ink)">
    OPERATION STATUS: FIELD-READY
  </text>
</svg>
```

**Step 5 — Font-asset embedding.**

Each SVG references `font-family="'JetBrains Mono', monospace"`
(quoted family name + generic fallback). Remotion loads JetBrains
Mono via `useFonts()` (Phase 1 Unit 1.8 / Phase 0 Unit 0.5 +
Unit 0.1). The font load completes BEFORE the SVG renders in MP4
export — per `@remotion/fonts.loadFont()` auto-block behavior. Phase
0 spike validated; Phase 4 entry-spike re-verifies the variable
woff2 `weight: '200 700'` syntax (framework-docs flagged as
unresolved — may need per-weight static subsets).

**Step 5b — CVD probe script (NEW per insight 051).**

Per `docs/insights/051-prose-cvd-recommendations-are-wrong-direction
.md`: Briggsy is color-blind; "never edit color based on prose
direction alone — run a probe script." Phase 3 ships a 60-line
run-and-delete probe script verifying R15 chrome contrast pairs
clear deficiency simulations.

```ts
// videos/trailer/scripts/probe-r15-chrome-cvd.ts
// Run once with `pnpm tsx videos/trailer/scripts/probe-r15-chrome-cvd.ts`
// Inspect output table; delete script post-amendment per insight 051.
import {
  parse, filterDeficiencyDeuter, filterDeficiencyProt,
  filterDeficiencyTrit, differenceEuclidean,
} from 'culori';

const MIN_DISTANCE = 0.10; // STRICT floor per project convention

const PAIRS: Array<[name: string, fg: string, bg: string]> = [
  // R15 ink-on-cream pairs (the trailer's primary R15 backgrounds are
  // cream parchment via existing assets/howtoplay/operations-manual-plate)
  ['R15-#1 ochre-on-cream-1',     '#947226', '#f6ebce'],
  ['R15-#1 ochre-on-cream-3',     '#947226', '#e6d5a9'],
  // R15-#3 burn-fire payoff stamp on cream
  ['R15-#3 burn-fire-on-cream-1', '#be2e27', '#f6ebce'],
  ['R15-#3 burn-fire-on-cream-3', '#be2e27', '#e6d5a9'],
  // R15-#2 ochre-on-charcoal for ticker
  ['R15-#2 ochre-on-charcoal-12', '#947226', '#1a1812'],
];

const SIMS = [
  ['deuter', filterDeficiencyDeuter()],
  ['prot',   filterDeficiencyProt()],
  ['trit',   filterDeficiencyTrit()],
] as const;

const distance = differenceEuclidean('oklab');

console.log(`pair                              | normal | deuter | prot   | trit   | min   | verdict`);
console.log(`----------------------------------|--------|--------|--------|--------|-------|--------`);
let failures = 0;
for (const [name, fgHex, bgHex] of PAIRS) {
  const fg = parse(fgHex)!;
  const bg = parse(bgHex)!;
  const dNorm = distance(fg, bg);
  const dSims = SIMS.map(([_, sim]) => distance(sim(fg)!, sim(bg)!));
  const dMin = Math.min(dNorm, ...dSims);
  const verdict = dMin >= MIN_DISTANCE ? 'PASS' : 'FAIL';
  if (verdict === 'FAIL') failures++;
  console.log(
    `${name.padEnd(34)}| ${dNorm.toFixed(3)} | ${dSims.map((d) => d.toFixed(3)).join(' | ')} | ${dMin.toFixed(3)} | ${verdict}`,
  );
}
if (failures > 0) {
  console.error(`\n${failures} pair(s) failed STRICT floor ${MIN_DISTANCE}.`);
  console.error('Per insight 051: substitute higher-L* ink variant; read the table, do not guess.');
  console.error('Recommended candidate exploration: probe ochre-7 (#c98a5c) and ochre-8 (#b08c3a)');
  console.error('against the failing background to find a passing alternative.');
  process.exit(1);
}
console.log(`\nAll ${PAIRS.length} pairs clear STRICT floor ${MIN_DISTANCE}. R15 chrome CVD-safe.`);
```

Operator runs the script before locking R15 SVGs. If failures, the
output table directs which substitution to explore (higher-L*
variants of ochre-9 → ochre-7 or ochre-8). Probe script deleted
post-amendment per insight 051 ("one-shot tools, not permanent
infra").

**Step 6 — Inventory documentation (append to asset-inventory.md).**

```md
## R15 Chrome Inventory (SPLIT-LAYER per Path B vocabulary architecture)

| Instance | Frame | Copy | Files | Dimensions | Ink token | Tier |
|---|---|---|---|---|---|---|
| #1 Classification stamp | 150 (S01) | OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS | stamp-1-operation-pendleton-{frame,text}.svg | 800×240 each | `--color-ochre-9` (#947226) | CHROME |
| #2 Comms ticker pulse | 1680 (S04) | OPERATIVE [REDACTED] — METHOD REPEATABLE | ticker-2-method-repeatable-{frame,text}.svg | 1920×40 each | `--color-ochre-9` on `--color-charcoal-12` | CHROME |
| #3 Stacked-payoff stamp | 1950 (S04) | AUTONOMOUS FIELD UNIT — ASSET DELIVERED | stamp-3-asset-delivered-{frame,text}.svg | 1200×280 each | `--color-burned-fire` (#be2e27) | **HERO** |
| #4 Closing subhead | **2820** (S06) | **OPERATION STATUS: FIELD-READY** | subhead-4-field-ready-{frame,text}.svg | 800×60 each | `--color-ochre-9` | CHROME |

**Phase 4 composition pattern:**
```tsx
<AbsoluteFill style={{ transformOrigin: 'center', transform: `rotate(${tilt}deg) ${scaleSlap(frame)}` }}>
  <Img src={staticFile(`trailer/r15-chrome/${slug}-frame.svg`)} />
  <Img src={staticFile(`trailer/r15-chrome/${slug}-text.svg`)} />
</AbsoluteFill>
```

**Verification:**
- [x] CVD probe passed STRICT floor 0.10 across all 3 deficiency sims
- [ ] Each split-layer pair renders with JetBrains Mono loaded
- [ ] Frame + text layers composite cleanly when stacked
- [ ] Phase 4 stamp-slap motion validates with split-layer geometry
- [ ] Safe-square composite (Unit 3.7) confirms #3 fits at -3° rotation
```

**[BRIGGSY-REVIEW GATE — Unit 3.4 R15 Chrome]**

Cannot proceed to Unit 3.5 until Briggsy eyes-on review of all 4 R15
stamp composites at `sample-eval/visual-asset-prep/safe-square-
composites/r15-*.png` answers:

1. **Does stamp #3 ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED") feel
   like INK SLAPPED ONTO PAPER, or like a CSS box with a filter
   applied?** If the latter, ink-bleed filter parameters need re-
   tuning against `Stamp.module.css` actual filter values (vendored
   at Unit 3.0).
2. **Does the burn-fire ink read as AUTHORITATIVE/ALARMING, or as
   generic red?** If generic, hex value needs review against
   `--color-burned-fire` token actual rendering.
3. **Does stamp #4 ("OPERATION STATUS: FIELD-READY") differentiate
   tonally from stamp #3?** Per Phase 1 lock, #3 carries origin
   claim, #4 carries status grammar — they shouldn't read
   identically.
4. **Would these stamps be embarrassing next to an actual Archer
   episode screenshot?** (§2.2 binary.) If yes, escalate to insight-
   018 stop-gate + re-architect.

Sentinel on pass: `sample-eval/visual-asset-prep/briggsy-review-3.4.signoff`.

**Patterns to follow:**

- BURNED HTP Stamp.tsx + Stamp.module.css vendored at Unit 3.0 —
  cross-reference for canonical `feTurbulence baseFrequency` +
  `numOctaves` + displacement scale values.
- Phase 1 Unit 1.9 R15 copy lock (verbatim copy — verified against
  deepening header lines).
- Phase 1 Unit 1.4 stamp-slap motion lock (scale(0.95) → 1.04 →
  1.0).
- Insight 051 (`docs/insights/051-prose-cvd-recommendations-are-
  wrong-direction.md`) — probe before editing color.

**Test scenarios:**

- **Happy path:** Each split-layer pair renders cleanly; CVD probe
  passes; safe-square composite confirms text fits.
- **Edge case:** Font fallback if JetBrains Mono not loaded by
  Phase 4 → Phase 4 useFonts.ts spike catches; SVG `font-family`
  declarations include `, monospace` generic fallback for browser
  rendering during dev/preview.
- **Edge case:** CVD probe fails → substitute higher-L* ink variant
  per insight 051 table direction (not prose guess); re-probe.
- **Edge case:** Stamp-slap motion looks wrong on Briggsy review →
  verify split-layer composition (`transform-origin: center` on
  wrapping element, NOT on individual layers).
- **Performance:** Ink-bleed filter renders cleanly at 1920×1080
  H.264 export. If Phase 6 reports filter performance bottleneck,
  rasterize SVG → PNG at Phase 3 lock time (loses scale flexibility
  but cuts decode cost).

**Verification:**

- 8 SVG files in `public/trailer/r15-chrome/` (4 instances × frame
  + text).
- CVD probe script ran + cleared all pairs.
- Safe-square composite (Unit 3.7 Step 4) confirms #3 stamp text
  lands inside central 1080×1080 zone.
- Asset-inventory section appended.
- Briggsy-review gate signoff sentinel present.

---

### Unit 3.5 — Music Bed Procurement

- [ ] **Unit 3.5: Music Bed Procurement**

**Goal:** Audition + procure the licensed music bed track per Unit
1.7 deepened lock. Or trigger the generative Suno Pro fallback as
the EXPECTED path (not last-resort) if licensed pool doesn't deliver.

**Requirements:** R9 (Archer-coded mid-century brass / bossa).
TEXTURE tier (continuous-presence atmosphere; the cascade payoff is
visual, not musical).

**Dependencies:** Unit 1.7 (source decision locked); **Step 0 pre-
execution gates** (verify Briggsy has active Artlist Pro or Epidemic
Sound Pro subscription, OR explicit approval to skip licensing and go
straight to Suno Pro). Parallel-OK with all other Units.

**Files:**

- Create: `public/trailer/audio/music-bed.mp3` — the locked track
  (per ADR #15 location).
- Create: `videos/trailer/sample-eval/visual-asset-prep/music-license.pdf`
  — license document (Artlist/Epidemic OR Suno Pro billing
  screenshot + DDEX disclosure).
- Create: `videos/trailer/sample-eval/visual-asset-prep/music-audition-log.md`
  — per-candidate audition records (kept standalone, NOT merged into
  asset-inventory.md — distinct artifact shape).

**Approach:**

**Step 0 — Pre-execution gates (NEW; cannot start Step 1 until cleared).**

Unit 3.5 requires PAID subscription access. Three preflight checks
gate execution:

```bash
# Operator runs from BURNED root:
pnpm tsx videos/trailer/scripts/preflight-music.ts
```

The preflight script asks (interactively or via env vars):

1. **Artlist Pro / Epidemic Sound Pro subscription:** Verify Briggsy
   has at least one active. Set env var:
   ```
   PRIMARY_MUSIC_SOURCE=artlist          # OR
   PRIMARY_MUSIC_SOURCE=epidemic-sound   # OR
   PRIMARY_MUSIC_SOURCE=skip-licensed    # (Briggsy explicit approval
                                          to go straight to Suno Pro)
   ```
   If neither set + not skipped → preflight exits non-zero with
   message: "Artlist Pro / Epidemic Sound Pro accounts at $199-204/yr
   each; if not procurable for this trailer, set
   PRIMARY_MUSIC_SOURCE=skip-licensed to use Suno Pro as expected
   fallback."

2. **Suno Pro subscription** (for fallback OR primary if skipped):
   ```
   SUNO_PRO_ACTIVE=1   # confirmed active subscription
   ```
   Without this set → preflight exits non-zero: "Suno Pro ($10/mo,
   $96/yr annual) required for generative fallback. Subscribe at
   suno.com before continuing."

3. **FFmpeg ≥5.0 available** (Phase 2 Unit 2.0 preflight already
   enforces; re-checked here for Unit 3.5 isolation):
   ```bash
   ffmpeg -version  # must report ≥5.0
   ```

If all three pass → write
`sample-eval/visual-asset-prep/music-preflight.signoff` sentinel +
proceed to Step 1.

**Step 1 — Audition workflow (per Phase 1 Unit 1.7 deepened lock).**

Phase 1 Unit 1.7 deepening locked the source pool:
- **Artlist Pro OR Epidemic Sound Pro** ($199-$204/yr minimum tier
  covering portfolio embed + Twitter/X + future engineering blog
  reposts).
- **Suno Pro $10/mo** as EXPECTED fallback (not last-resort) — the
  brass/bossa-with-distinct-dynamic-arc-at-95s constraint is hostile
  to licensed-catalog hit rate.
- Musicbed REMOVED (over-budget at $329-$1,208/yr Individual tier
  per Phase 1 deepening).
- Udio REMOVED (Nov 2025 settlement disabled exports).

Audition pool size **20-30 per platform** (was 10-15 in pre-deepening
— best-practices 2026 research increased the pool because brass/
bossa + 95s cascade arc is a narrow target).

For each candidate:
- 95s+ playable length OR loop-friendly with seamless loop point
- Cascade-supporting dynamic structure (intro → build → peak around
  ~70s → falloff)
- Brass / bossa core (NOT piano-led generic, NOT synth-lead, NOT
  drum-loop-only)
- License covers portfolio + Twitter distribution + 3 channels/platform
- ≤$30/track equivalent at subscription rate (Artlist + Epidemic both
  cover via subscription; per-track cost is $0 marginal)

**Step 2 — Audition log.**

```md
# Music Audition Log

## Platform: Artlist Pro (account verified Step 0 preflight)
| # | Track | Artist | Length | License | Cascade-structure? | Notes | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | <name> | <artist> | 120s | Pro/Commercial | yes | brass-led, builds to ~75s peak | AUDITION |
| 2 | <name> | <artist> | 95s | Pro/Commercial | no (no peak) | flat dynamics | PASS |
| ... 18+ more ... |

## Platform: Suno Pro (fallback path triggered + auditioned)
| # | Prompt iteration | Length | Cascade-structure? | Notes | Verdict |
|---|---|---|---|---|---|
| 1 | "mid-century spy jazz brass quintet, bossa nova rhythm, 95 seconds, builds to dramatic peak at 75s..." | 92s | partial | brass-led but synth pad muddies mid | RE-PROMPT |
| 2 | ... insight-018 stop-gate (4-iter cap) ... |

Final pick rationale: <selected track + why it cleared> + cumulative
spend.
```

**Step 3 — Procurement + encoding + rights-trail.**

**Path A — Licensed (Artlist Pro / Epidemic Sound Pro):**

```bash
# Operator action: download license PDF from Artlist/Epidemic dashboard
# IMMEDIATELY after the track is added to project (licenses are
# generated per add-to-project, not per-download). Place at:
videos/trailer/sample-eval/visual-asset-prep/music-license.pdf

# Then encode (gated on license PDF existence):
pnpm tsx videos/trailer/scripts/encode-music-bed.ts
```

```ts
// videos/trailer/scripts/encode-music-bed.ts
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const LICENSE_PDF = resolve(process.cwd(),
  'videos/trailer/sample-eval/visual-asset-prep/music-license.pdf');
const SOURCE = process.env.MUSIC_SOURCE_FILE ?? 'source-music-bed.wav';
const OUT = resolve(process.cwd(), 'public/trailer/audio/music-bed.mp3');

if (!existsSync(LICENSE_PDF)) {
  console.error(`ERROR: ${LICENSE_PDF} missing. Download from Artlist/Epidemic dashboard first.`);
  process.exit(1);
}

execFileSync('ffmpeg', [
  '-y',
  '-i', SOURCE,
  '-codec:a', 'libmp3lame',
  '-b:a', '192k',
  '-ac', '2',  // stereo
  OUT,
]);
console.log(`OK encoded to ${OUT}`);
```

**Path B — Suno Pro generative (expected fallback, not last-resort):**

If Step 0 set `PRIMARY_MUSIC_SOURCE=skip-licensed` OR Path A's audition
pool didn't deliver after 20-30 candidates:

```ts
// videos/trailer/scripts/encode-music-bed-suno.ts
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SUNO_DOWNLOAD = process.env.SUNO_DOWNLOAD_PATH ?? 'suno-output.mp3';
const LICENSE_DOC = resolve(process.cwd(),
  'videos/trailer/sample-eval/visual-asset-prep/music-license.pdf');
const OUT = resolve(process.cwd(), 'public/trailer/audio/music-bed.mp3');

// Verify Suno billing screenshot pre-populated (rights-trail per March 2026 ToS:
// commercial use granted for songs created during ACTIVE subscription period;
// screenshot of suno.com/billing page on generation date is the canonical record).
if (!existsSync(LICENSE_DOC)) {
  console.error('ERROR: music-license.pdf missing.');
  console.error('For Suno path: combine billing-page screenshot + DDEX disclosure into PDF.');
  console.error('Save at:', LICENSE_DOC);
  process.exit(1);
}

// Encode Suno output to canonical bitrate (Suno ships ~192k already; re-encode for consistency)
execFileSync('ffmpeg', [
  '-y',
  '-i', SUNO_DOWNLOAD,
  '-codec:a', 'libmp3lame',
  '-b:a', '192k',
  '-ac', '2',
  OUT,
]);
console.log(`OK encoded Suno output to ${OUT}`);
```

**DDEX disclosure metadata (NEW per best-practices 2026 research):**

DDEX AI-disclosure flag is enforced by Spotify/Apple Music for Suno-
generated audio (late 2025 standard). For X repost it's informational
only (X doesn't enforce DDEX yet). BUT: if the trailer ever lands on
a streaming platform via marketing channel, undisclosed Suno audio
risks demonetization. Pre-populate DDEX metadata in
music-license.pdf:

```
GENERATIVE AI USE DISCLOSURE
============================
Title: BURNED Origin Trailer — Music Bed
Generative model: Suno v4 (Pro subscription)
Generation date: [YYYY-MM-DD]
Subscription verified active: YES (screenshot attached)
Distribution scope: portfolio embed + X.com / Twitter
DDEX flag: USES_GENERATIVE_AI_FOR_MUSIC_COMPOSITION
Commercial use: granted per Suno ToS active subscription period
```

**Step 4 — Music-cue map verification.**

Per Phase 1 Unit 1.7 Step 5 music-cue map, verify the locked track
supports the dynamic transitions called for at each scene boundary.
S04 cascade beat (~1860 peak intensification) needs upward dynamic
build; S05 hard-cut to gameplay benefits from a momentary dynamic
fall pre-cut.

If the track's intrinsic dynamics conflict with the cue map (e.g.,
no natural fall at the S04→S05 boundary), Phase 4 handles via manual
`volume` automation in `<Audio>` interpolation — track choice isn't
blocked, just notes a Phase 4 manual ducking pass.

**Patterns to follow:**

- Phase 1 Unit 1.7 deepening source-pool lock.
- `feedback-imagen-budget.md` audition-first discipline (one
  candidate first, align, batch).
- `execFileSync` argv pattern for FFmpeg encode.
- DDEX 2026 disclosure standard for generative-AI music distribution.
- `execFileSync` argv pattern for FFmpeg encode.

**Test scenarios:**

- **Happy path (licensed):** Account preflight passes; a track lands
  within 20-30 Artlist Pro / Epidemic Sound Pro auditions; license
  PDF downloaded; encode produces 192k MP3 at expected path.
- **Happy path (Suno):** PRIMARY_MUSIC_SOURCE=skip-licensed (Briggsy
  explicit) OR licensed audition fails; Suno Pro prompt iterates
  ≤4 times per insight-018; output downloaded; billing screenshot +
  DDEX disclosure combined into license PDF; encode produces 192k
  MP3.
- **Edge case:** Step 0 preflight fails (no subscriptions) → script
  exits non-zero, operator handles subscription decision.
- **Edge case:** All 20-30 licensed auditions fail + 4 Suno prompts
  fail → escalate to Briggsy with the audition log + insight-018
  failure pattern (re-architect: drop music? use different style
  reference?).
- **License-check (CI):** `videos/trailer/sample-eval/visual-asset-
  prep/music-license.pdf` exists + non-zero size; encode script
  fails fast otherwise.
- **Security:** No shell-string interpolation in FFmpeg encode
  (argv array pattern).

**Verification:**

- `public/trailer/audio/music-bed.mp3` at expected path; FFprobe
  verifies bitrate (192k) + duration (95s ±5%) + stereo channels.
- `music-license.pdf` filed (Artlist/Epidemic PDF OR Suno billing
  screenshot + DDEX disclosure).
- `music-audition-log.md` documents pick rationale + audition pool
  size + which path triggered (A licensed / B Suno).
- `music-preflight.signoff` sentinel present from Step 0.

(No `[BRIGGSY-REVIEW GATE]` named here — music selection IS a
Briggsy decision throughout audition (Phase 3 Unit 3.5 cannot lock
a track without Briggsy's ear-on-track approval). The audition-log
records each approve/reject inline.)

---

### Unit 3.6 — Cold-Open Title-Sequence Assets

- [ ] **Unit 3.6: Cold-Open Title-Sequence Assets**

**Goal:** Produce the compressed-Archer cold-open visual elements —
operative card frame template (NEW Imagen), chevron motif background
(NEW hand-authored SVG), BURNED logo wordmark (SINGLE hand-authored
SVG file used at both cold-open S01 and closing S06). USE EXISTING
`operations-manual-plate.png` for the cold-open title plate role
(NOT a new Imagen-generated asset). USE EXISTING
`pendleton-crest.png` for crest decorations.

**Requirements:** R14 (compressed-Archer cold-open). HERO tier for
operative-card-frame composite + BURNED logo.

**Dependencies:** Unit 3.0 (vendored vocabulary — `Crest.tsx` for
in-frame React composition if needed), Unit 3.2 (card-art curation;
cold-open card selections per `COLD_OPEN_CARDS` export), Unit 1.4
(transition vocabulary — stamp-slap precedent), Unit 1.8 (typography).

**Files:**

- Create: `public/trailer/title-sequence/operative-card-frame.svg`
  — template chrome (target-reticle + chevrons + name-plate frame);
  the operative portrait fills the center. Phase 4 composites portrait
  into template per `COLD_OPEN_CARDS` selection.
- Create: `public/trailer/title-sequence/chevron-motif-bg.svg` —
  background chevron pattern (Bass / Ferro lineage). TEXTURE tier.
- Create: `public/trailer/title-sequence/burned-logo.svg` — SINGLE
  bold mid-century geometric BURNED wordmark. Used at both cold-open
  S01 landing (frame 180-210) AND closing S06 (frame 2790). Pre-
  deepening plan had two separate files for the SAME visual
  treatment — merged per scope-guardian deepening.

**REFERENCE for the cold-open title plate (NOT regenerated):**

- `public/assets/howtoplay/operations-manual-plate.png` (1.4 MB
  Imagen-generated, verified clean — already shipped via
  `scripts/generate-htp-assets.ts`, renders "OPERATION / BURNED /
  FIELD OPERATIONS MANUAL" in Saul-Bass-inspired 1960s spy-movie
  title-card style). Use case: the cold-open scene's title plate
  reveal (S01 setting up the "case file" framing). Phase 4 imports
  via `staticFile('assets/howtoplay/operations-manual-plate.png')`.

**REFERENCE for the cold-open Pendleton crest (NOT regenerated):**

- `public/assets/howtoplay/pendleton-crest.png` (1.5 MB, already
  Imagen-generated + shipped). Use case: S02 corner watermark + S06
  closing-folder dressing.

**Deliverables:**

- Create: `videos/trailer/sample-eval/visual-asset-prep/operative-card-composite-proof.png`
  (NEW per design-lens deepening) — static-HTML composite of
  `operative-card-frame.svg` + `dash-barlowe.webp` at cold-open
  canvas ratio (frame fills ~1/3 of 1920×1080 canvas at the S01 card-
  flash position), Playwright-captured at 1920×1080. Verifies name-
  plate readable at 1/3-canvas size BEFORE Phase 4 commits.
- Append to: `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`

**Approach:**

**Step 1 — Operative card frame template (Imagen + insight 018 stop-gate).**

The operative-card-frame is Phase 3's primary Imagen escalation
(the rest of the title-sequence uses hand-authored SVG OR existing
assets). Budget <$5 per `imagen-spend.md` tracker (Critical
Constraints §Imagen Spend Tracker); insight-018 stop-gate codified
inline.

**Imagen prompt template (per insight 050 structure + insight 018
strategies):**

```
[FRACTIONAL LAYOUT]
"Operative portrait fills CENTER 60% of frame; target-reticle
ornament sits at TOP-RIGHT CORNER 12% as compositionally subordinate;
chevron-bordered name-plate strip occupies BOTTOM 18% width-spanning."

[CONTINUITY PRESCRIPTION]
"Border lines CONTINUE unbroken around the entire frame perimeter,
NO hard truncation at corners. Inner shadow gradient fades GRADUALLY
inward 8px-deep with soft falloff."

[EMOTIONAL PAYLOAD]
"Card chrome should feel like FROZEN AT THE INSTANT OF SUBJECT
RECOGNITION — Archer briefing-pause-on-face moment, NOT a passive
gallery wall display."

[STYLE / CHARACTER ANCHOR]
"In the style of Archer FX animated TV show (Dreamland season 8)
operative-card freeze frames during opening title sequence; chrome
visually consistent with the Pendleton Agency seal (Imagen output
at public/assets/howtoplay/pendleton-crest.png) and the operations
manual title plate (public/assets/howtoplay/operations-manual-plate.png).
Bold flat color illustration, thick black outlines, Saul Bass /
Mauro Ferro inspired mid-century geometric chrome."

[STYLE BLOCK]
"WARM palette: deep teal (#163338), burnt mahogany (#422818), cream
(#f6ebce), cordovan red (#a33340), ochre amber (#b0754c). Bold flat
fills no gradients no shading no photorealism."

[NEGATIVE SUPPRESSORS — REQUIRED if hex codes used]
"Absolutely NO additional text NO words NO numbers NO hex codes NO
color codes NO operative names NO labels — the name-plate strip is
a BLANK template region for Phase 4 text composition."
```

**Insight 018 stop-gate codified inline:**

```ts
// videos/trailer/scripts/generate-operative-card-frame.ts
const MAX_ITERATIONS_PER_CONCEPT = 4;
const PROMPT_VARIANTS = [
  'iter-1-baseline',
  'iter-2-remove-reticle-if-stuck-techno',
  'iter-3-recontextualize-as-dossier-page-not-card',
  'iter-4-minimum-viable-5-clauses-each-element-once',
];
// If iter 4 fails to align, STOP. Re-architect via:
// - Drop Imagen, hand-author SVG (Step 1b below — fallback path)
// - Or accept the closest-aligned output + Phase 4 visual fix
```

**Step 1b — Hand-authored SVG fallback** (if Imagen iter 4 fails or
insight 018 stop-gate triggers):

```svg
<!-- public/trailer/title-sequence/operative-card-frame.svg -->
<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-ochre-9, #947226); --accent: var(--color-burned-fire, #be2e27)">
  <!-- Bold border -->
  <rect x="20" y="20" width="760" height="960" fill="none"
        stroke="var(--ink)" stroke-width="12" />
  <!-- Inner shadow band -->
  <rect x="40" y="40" width="720" height="920" fill="none"
        stroke="var(--ink)" stroke-width="2" opacity="0.6" />
  <!-- Target-reticle motif in upper-right corner -->
  <g transform="translate(680 60)" style="color: var(--ink)">
    <circle cx="0" cy="0" r="60" fill="none" stroke="currentColor" stroke-width="3" />
    <circle cx="0" cy="0" r="40" fill="none" stroke="currentColor" stroke-width="2" />
    <circle cx="0" cy="0" r="4"  fill="var(--accent)" />
    <line x1="-80" y1="0" x2="-65" y2="0" stroke="currentColor" stroke-width="3" />
    <line x1="65"  y1="0" x2="80"  y2="0" stroke="currentColor" stroke-width="3" />
    <line x1="0" y1="-80" x2="0" y2="-65" stroke="currentColor" stroke-width="3" />
    <line x1="0" y1="65"  x2="0" y2="80"  stroke="currentColor" stroke-width="3" />
  </g>
  <!-- Center region: operative portrait (Phase 4 fills via Img layer) -->
  <rect x="100" y="100" width="600" height="700"
        fill="var(--color-charcoal-3, #2a2820)" opacity="0.1" />
  <!-- Name-plate strip at bottom -->
  <rect x="40" y="840" width="720" height="120" fill="var(--ink)" />
  <!-- Name text is RENDERED BY PHASE 4 (Clash Display 700) — NOT baked into SVG -->
  <!-- Phase 4 composes: <Img src="frame.svg" /> + <text>Operative Name</text> -->
</svg>
```

**Operative-name typography in Phase 4 (NOT here):** Phase 4 composes
React `<text>` (or absolutely-positioned `<div>` with Clash Display
700, 72px, `--color-charcoal-12`) over the SVG name-plate strip at
each cold-open card flash. This keeps the SVG template reusable
across Dash / Vera / Sable / Neal portraits with different name
strings — and per Phase 1 Unit 1.8 typography lock, Clash Display
is the OPERATIVE name-plate font (display hierarchy), distinct from
JetBrains Mono used for R15 chrome (classified-info hierarchy).

**Step 2 — Chevron motif background.**

A subtle diagonal-chevron repeating pattern for the cold-open
background:

```svg
<!-- public/trailer/title-sequence/chevron-motif-bg.svg -->
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"
     preserveAspectRatio="xMidYMid slice"
     style="--ink: var(--color-ochre-9, #947226); --bg: var(--color-charcoal-12, #1a1812)">
  <defs>
    <pattern id="chevronPattern" x="0" y="0" width="120" height="120"
             patternUnits="userSpaceOnUse">
      <path d="M0,60 L60,0 L120,60 L60,120 Z" fill="none"
            stroke="var(--ink)" stroke-width="2" opacity="0.12" />
    </pattern>
  </defs>
  <rect x="0" y="0" width="1920" height="1080" fill="var(--bg)" />
  <rect x="0" y="0" width="1920" height="1080" fill="url(#chevronPattern)" />
</svg>
```

**Step 3 — BURNED logo treatment (SINGLE file).**

Hand-author SVG in Clash Display 700 (very large — ~320px tall),
classification-stamp aesthetic, bold mid-century geometric. **SINGLE
file** used at both cold-open S01 (frame 180-210) and closing S06
(frame 2790) — pre-deepening plan had two near-identical files;
Phase 4 imports the one file twice rather than maintaining two:

```svg
<!-- public/trailer/title-sequence/burned-logo.svg -->
<svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"
     style="--ink: var(--color-burned-fire, #be2e27)">
  <text x="600" y="280" text-anchor="middle"
        font-family="'Clash Display', sans-serif" font-weight="700" font-size="320"
        fill="var(--ink)"
        letter-spacing="-8">
    BURNED
  </text>
</svg>
```

Phase 4 imports as:
```tsx
import { staticFile } from 'remotion';
<Img src={staticFile('trailer/title-sequence/burned-logo.svg')} />
```

Used at S01 with stamp-slap entrance; used at S06 with R15 #4
("OPERATION STATUS: FIELD-READY") subhead below.

(Logo treatment may refine in Phase 4 with kerning / weight tuning;
Phase 3 ships a clean baseline. Imagen escalation for logo polish
was CUT from pre-deepening plan — `operations-manual-plate.png`
already shows BURNED's typographic identity in Saul-Bass-inspired
treatment for the cold-open title plate; the logo SVG handles the
wordmark-only landings.)

**Step 4 — Title plate (USE EXISTING).**

The cold-open scene includes a title-plate reveal at S01 (frame ~210
following the BURNED logo landing). Pre-deepening plan implied a
NEW Imagen-generated asset for this; deepening locks USE EXISTING:

- `public/assets/howtoplay/operations-manual-plate.png` (1.4 MB
  Imagen-generated, visually verified clean, ships as the HTP App
  hero — "OPERATION / BURNED / FIELD OPERATIONS MANUAL" in Saul-Bass-
  inspired 1960s spy-movie title-card style).

Phase 4 imports via
`staticFile('assets/howtoplay/operations-manual-plate.png')`. Trial
at the cold-open S01 title-plate slot during Phase 4 scene build —
if it doesn't carry trailer weight at the intended scale (~1080×810
within 1920×1080), Phase 3 can be re-opened to escalate to a fresh
Imagen run with the §"Imagen Prompt Template" structure. Default
posture: existing asset is sufficient.

**Step 5 — Operative card composite proof (NEW per design-lens deepening).**

Before Phase 4 commits, Phase 3 ships a static-HTML composite proof
verifying the operative-card-frame composites readably with an actual
card portrait at intended cold-open canvas ratio.

```ts
// videos/trailer/scripts/build-operative-card-composite-proof.ts
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const OUT_DIR = resolve(process.cwd(), 'videos/trailer/sample-eval/visual-asset-prep');
const OUT_PATH = resolve(OUT_DIR, 'operative-card-composite-proof.png');

async function main() {
  if (!existsSync('public/assets/cards')) {
    console.error('Run from BURNED repo root.');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Static composite — operative-card-frame.svg + dash-barlowe.webp + name overlay
  // at cold-open canvas ratio (frame fills ~1/3 of 1920×1080 → ~640×800 card region)
  await page.setContent(`
<!doctype html>
<html><head><style>
  html, body { margin: 0; background: #1a1812; height: 100vh; font-family: 'Clash Display', sans-serif; }
  .stage { width: 1920px; height: 1080px; position: relative; }
  .card { position: absolute; left: 640px; top: 140px; width: 640px; height: 800px; }
  .frame, .portrait { position: absolute; inset: 0; width: 100%; height: 100%; }
  .portrait { padding: 80px 80px 144px; object-fit: cover; box-sizing: border-box; }
  .name {
    position: absolute; left: 32px; right: 32px; bottom: 32px; height: 96px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 58px; color: #1a1812; letter-spacing: -1px;
  }
</style></head><body>
  <div class="stage">
    <div class="card">
      <img class="frame" src="../../../../public/trailer/title-sequence/operative-card-frame.svg" />
      <img class="portrait" src="../../../../public/assets/cards/dash-barlowe.webp" />
      <div class="name">DASH BARLOWE</div>
    </div>
  </div>
</body></html>
  `);
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT_PATH, fullPage: false });
  await browser.close();
  console.log(`OK composite proof at ${OUT_PATH}`);
}
main().catch((err) => { console.error(err); process.exit(1); });
```

Briggsy reviews the composite proof and verifies the name-plate text
is READABLE at the cold-open canvas ratio (1/3-canvas size means the
58px text renders ~19px on screen at full trailer display — needs
to feel right at that scale, not just at the 800×1000 SVG viewport).

**Step 6 — Inventory documentation (append to asset-inventory.md).**

```md
## Title-Sequence Inventory

### New assets (NEW SVG at public/trailer/title-sequence/)

| Asset | Format | Tier | Use |
|---|---|---|---|
| operative-card-frame.svg | SVG vector + Imagen-or-hand chrome | HERO | S01 card-flash chrome template (frames 30-210); Phase 4 composites with card-art portraits + Clash Display 700 name overlay |
| chevron-motif-bg.svg | SVG vector pattern | TEXTURE | S01 background |
| burned-logo.svg | SVG vector Clash Display 700 | HERO | S01 landing (180-210) AND S06 closing (2790) — single file, dual use |

### Existing assets (Path A via staticFile through ADR #8)

| staticFile arg | Source | Use |
|---|---|---|
| `assets/howtoplay/operations-manual-plate.png` | Imagen-gen (htp-assets script) | S01 title plate reveal |
| `assets/howtoplay/pendleton-crest.png` | Imagen-gen (htp-assets script) | S02 corner watermark + S06 closing-folder dressing |

### Reference proofs (Phase 4 visual-diff only)

| Path | Source | Purpose |
|---|---|---|
| `sample-eval/visual-asset-prep/operative-card-composite-proof.png` | Playwright static-HTML composite | Verify name-plate readable at 1/3-canvas size BEFORE Phase 4 commits |
```

**[BRIGGSY-REVIEW GATE — Unit 3.6 Title-Sequence]**

Cannot proceed to Unit 3.7 until Briggsy eyes-on review of
`operative-card-composite-proof.png` + the BURNED logo SVG +
chevron-motif background composite answers:

1. **Does the BURNED logo carry the WEIGHT of an Archer title plate
   — does it feel CLASSIFIED-DOCUMENT-LOAD-BEARING — or like a
   marketing wordmark?** If wordmark, escalate to Imagen polish per
   insight 018 (cap <$2 if triggered).
2. **At 1/3-canvas size, does the operative card-flash sequence
   feel CINEMATIC (Archer title-sequence-pause-on-face moment), or
   like a UI carousel?** If carousel, frame chrome or portrait
   cropping needs re-tuning.
3. **Does the operative name (Clash Display 700) READ at the cold-
   open viewing distance, or is it noise?** Per design-lens deepening
   Finding 12.
4. **Would this title sequence be embarrassing next to an actual
   Archer cold-open?** §2.2 acceptance.

Sentinel on pass: `sample-eval/visual-asset-prep/briggsy-review-3.6.signoff`.

**Patterns to follow:**

- Archer title-sequence aesthetic (bold mid-century, Bass / Ferro).
- `feedback-imagen-budget.md` — one test first, align, batch; STOP at
  iter 4 per insight 018.
- Insight 050 — Imagen prompt structure (fractional / continuity /
  emotional payload).
- BURNED's existing chrome typography (Clash Display 700 — per spec).
- UMB `scripts/asset-prompts.ts` pattern — `STYLE_PREFIX` +
  `CHROMA_BG_SUFFIX` with `#FF00FF` magenta-key extraction for clean
  transparency when operative-card-frame template needs background
  removal.

**Test scenarios:**

- **Happy path:** Imagen iter 1 of operative-card-frame template
  aligns → batch generate 3-4 portrait variants if needed → composite
  proof confirms readability → Briggsy gate passes.
- **Happy path:** Hand-authored fallback path → SVG renders cleanly
  → composite proof works.
- **Edge case:** Imagen iter 4 fails alignment → insight-018 stop-
  gate triggers → fallback to Step 1b hand-authored SVG.
- **Edge case:** Name-plate readability fails at 1/3-canvas → Phase 4
  may need to elevate cold-open card scale OR widen frame; document
  in proof composite.
- **Visual:** Operative card frame template composites with actual
  card portrait at 1920×1080 → fills frame well, name-plate readable.

**Verification:**

- 3 SVG files in `public/trailer/title-sequence/` (operative-card-
  frame, chevron-motif-bg, burned-logo).
- `operative-card-composite-proof.png` in `sample-eval/visual-asset-prep/`.
- Asset-inventory section appended.
- Briggsy-review gate signoff sentinel present.
- Imagen spend recorded in `imagen-spend.md` (whether Imagen path
  taken or hand-authored fallback used).

---

### Unit 3.7 — Visual Manifest + PHASE-3-EXIT.md + Phase 4 Hand-Off

- [ ] **Unit 3.7: Visual Manifest + Phase 4 Hand-Off**

**Goal:** Single hand-edited typed `visual-manifest.ts` Phase 4
imports for all Phase 3 assets. **PHASE-3-EXIT.md** consolidates
every Phase 3 outcome Phase 4 needs (mirroring Phase 0+1+2's exit-
document pattern). Plus per-asset-family safe-square composite proofs
(Step 4 NEW per design-lens deepening). Per scope-guardian
deepening, the codegen + .meta.json sidecar pattern from pre-
deepening is CUT — no churn driver for static visuals, sidecars
never materialized.

**Requirements:** Cross-cutting — Phase 4 needs to load each visual
asset by named import + consume Phase 3's exit-document for non-
asset state (HTP capture mode, music source path taken, Imagen
budget actual spend, depth-plane option picked).

**Dependencies:** Units 3.0 (vocabulary vendored), 3.1, 3.2, 3.3,
3.4, 3.5, 3.6 complete with their signoff sentinels present.

**Files:**

- Create: `videos/trailer/src/lib/visual-manifest.ts` — typed
  manifest (HAND-EDITED, ~15 entries; pre-deepening codegen CUT).
- Create: `videos/trailer/PHASE-3-EXIT.md` — single document
  Phase 4 reads.
- Create: `videos/trailer/sample-eval/visual-asset-prep/safe-square-composites/`
  — per-asset-family PNG with 1080×1080 center-square guide overlay.
- Create: `videos/trailer/sample-eval/visual-asset-prep/imagen-spend.md`
  — cumulative Imagen spend tracker (populated by Units 3.3 + 3.6 as
  they run).
- Existing: `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`
  — consolidated inventory (Units 3.1/3.3/3.4/3.6 already appended).

**Approach:**

**Step 1 — Manifest type (hand-edited, REQUIRED safeSquareRole).**

```ts
// videos/trailer/src/lib/visual-manifest.ts

export type AssetCategory =
  | 'htp'
  | 'cards'
  | 'briefing-room'
  | 'r15-chrome'
  | 'title-sequence'
  | 'audio';

export type SafeSquareRole = 'safe-square' | 'side-band';

export type AssetTier = 'hero' | 'texture' | 'chrome';

export interface VisualAsset {
  category: AssetCategory;
  /** Static-file path consumable by Remotion staticFile(). Either
   *  Path A (BURNED's public/assets/* via Phase 0 ADR #8) or Path B
   *  (trailer-only at public/trailer/* via ADR #15). Both resolve
   *  through setPublicDir('../../public'). */
  staticPath: string;
  /** REQUIRED — explicit safe-square role (no default). Drives
   *  Phase 4 mobile-crop placement discipline. */
  safeSquareRole: SafeSquareRole;
  /** REQUIRED — composition priority for Phase 4. Hero gets full
   *  visual weight in central 1080×1080; texture caps at 40%
   *  opacity in non-focal positions; chrome occupies bottom-third
   *  or edge bands. */
  tier: AssetTier;
  /** Optional dimensions (for layout calculations). */
  width?: number;
  height?: number;
  /** Optional notes (e.g., "trace-video fallback if static fails"). */
  notes?: string;
}

// VERIFIED entries — match files on disk + Phase 1 cue placements
export const VISUAL_ASSETS: readonly VisualAsset[] = [
  // HTP (Unit 3.1)
  { category: 'htp', staticPath: 'trailer/htp-fullpage.png', safeSquareRole: 'safe-square', tier: 'hero',
    notes: 'Fullpage capture at DPR=1; Phase 6 renders --scale=2 for output crispness. Phase 4 <Img> with translateY animation.' },

  // R15 chrome (Unit 3.4 — SPLIT-LAYER per stamp)
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg', safeSquareRole: 'side-band', tier: 'chrome', notes: 'S01 frame 150, -8° rotation in Phase 4 wrapper' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/stamp-1-operation-pendleton-text.svg', safeSquareRole: 'side-band', tier: 'chrome' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/ticker-2-method-repeatable-frame.svg', safeSquareRole: 'side-band', tier: 'chrome', notes: 'S04 frame 1680, bottom-strip ticker' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/ticker-2-method-repeatable-text.svg', safeSquareRole: 'side-band', tier: 'chrome' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/stamp-3-asset-delivered-frame.svg', safeSquareRole: 'safe-square', tier: 'hero', notes: 'S04 frame 1950 payoff peak, -3° rotation, burn-fire ink' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/stamp-3-asset-delivered-text.svg', safeSquareRole: 'safe-square', tier: 'hero' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/subhead-4-field-ready-frame.svg', safeSquareRole: 'safe-square', tier: 'chrome', notes: 'S06 frame 2820 closing subhead (Phase 1 lock; renamed from -agent-built)' },
  { category: 'r15-chrome', staticPath: 'trailer/r15-chrome/subhead-4-field-ready-text.svg', safeSquareRole: 'safe-square', tier: 'chrome' },

  // Briefing-room — NEW (Unit 3.3)
  { category: 'briefing-room', staticPath: 'trailer/briefing-room/venetian-blinds.svg', safeSquareRole: 'side-band', tier: 'texture', notes: '1920×1080 viewport; Phase 4 animates translateX 1.5-2px/frame' },
  { category: 'briefing-room', staticPath: 'trailer/briefing-room/dossier-folder-closed.svg', safeSquareRole: 'safe-square', tier: 'hero', notes: '1000×1300 viewport; S02 pre-reveal' },
  { category: 'briefing-room', staticPath: 'trailer/briefing-room/dossier-folder-open.svg', safeSquareRole: 'safe-square', tier: 'hero', notes: '1000×1300 viewport; S02 reveal post-state' },
  { category: 'briefing-room', staticPath: 'trailer/briefing-room/depth-plane.svg', safeSquareRole: 'side-band', tier: 'hero', notes: 'Phase 1 Unit 1.10 deepening depth-plane element; Unit 3.3 Step 7 picks Option A/B/C' },

  // Briefing-room — EXISTING (Path A via Phase 0 ADR #8)
  { category: 'briefing-room', staticPath: 'assets/arena/mahogany-horizontal.png', safeSquareRole: 'safe-square', tier: 'hero', notes: 'Existing Imagen-gen; S02/S06 desk backdrop' },
  { category: 'briefing-room', staticPath: 'assets/arena/mahogany-vertical.png', safeSquareRole: 'side-band', tier: 'texture', notes: 'Existing Imagen-gen; vertical frame elements' },
  { category: 'briefing-room', staticPath: 'assets/arena/blotter.png', safeSquareRole: 'safe-square', tier: 'texture', notes: 'Existing Imagen-gen; paper-pad backdrop' },
  { category: 'briefing-room', staticPath: 'assets/arena/stamp-classified.png', safeSquareRole: 'safe-square', tier: 'chrome', notes: 'Existing Imagen-gen; classification stamp primitive' },
  { category: 'briefing-room', staticPath: 'assets/arena/operative-silhouette.png', safeSquareRole: 'safe-square', tier: 'chrome', notes: 'Existing Imagen-gen; Agent X REDACTED treatment' },
  { category: 'briefing-room', staticPath: 'assets/howtoplay/pendleton-crest.png', safeSquareRole: 'side-band', tier: 'chrome', notes: 'Existing Imagen-gen; S02 corner watermark + S06 closing-folder dressing' },

  // Title-sequence — NEW (Unit 3.6)
  { category: 'title-sequence', staticPath: 'trailer/title-sequence/operative-card-frame.svg', safeSquareRole: 'safe-square', tier: 'hero', notes: 'S01 cold-open card-flash chrome template; Phase 4 composites portrait + Clash Display 700 name overlay' },
  { category: 'title-sequence', staticPath: 'trailer/title-sequence/chevron-motif-bg.svg', safeSquareRole: 'side-band', tier: 'texture', notes: 'S01 background' },
  { category: 'title-sequence', staticPath: 'trailer/title-sequence/burned-logo.svg', safeSquareRole: 'safe-square', tier: 'hero', notes: 'Single file; S01 landing 180-210 + S06 closing 2790' },

  // Title-sequence — EXISTING (Path A via Phase 0 ADR #8)
  { category: 'title-sequence', staticPath: 'assets/howtoplay/operations-manual-plate.png', safeSquareRole: 'safe-square', tier: 'hero', notes: 'Existing Imagen-gen; S01 title plate reveal' },

  // Cards (Unit 3.2 — referenced via card-roster.ts; staticFile resolves through Path A)
  // Card-art entries NOT enumerated here — card-roster.ts is the authoritative source.

  // Audio (Unit 3.5)
  { category: 'audio', staticPath: 'trailer/audio/music-bed.mp3', safeSquareRole: 'side-band', tier: 'texture', notes: '95s music bed at 192k MP3; Path A licensed or Path B Suno per Unit 3.5 outcome' },
] as const;

// Helper exports for Phase 4 ergonomics
export const HTP_ASSET   = VISUAL_ASSETS.find((a) => a.category === 'htp')!;
export const R15_CHROME  = VISUAL_ASSETS.filter((a) => a.category === 'r15-chrome');
export const BRIEFING    = VISUAL_ASSETS.filter((a) => a.category === 'briefing-room');
export const TITLE_SEQ   = VISUAL_ASSETS.filter((a) => a.category === 'title-sequence');
export const MUSIC_BED   = VISUAL_ASSETS.find((a) => a.category === 'audio')!;
```

**Step 2 — Phase 0 stub manifest (mirror Phase 2 pattern).**

Phase 0 Unit 0.1 scaffold ships a STUB version so Phase 4 typecheck
imports resolve even before Phase 3 runs:

```ts
// videos/trailer/src/lib/visual-manifest.ts — Phase 0 STUB
export type AssetCategory = 'htp' | 'cards' | 'briefing-room' | 'r15-chrome' | 'title-sequence' | 'audio';
export type SafeSquareRole = 'safe-square' | 'side-band';
export type AssetTier = 'hero' | 'texture' | 'chrome';
export interface VisualAsset {
  category: AssetCategory; staticPath: string; safeSquareRole: SafeSquareRole;
  tier: AssetTier; width?: number; height?: number; notes?: string;
}
export const VISUAL_ASSETS: readonly VisualAsset[] = [] as const;
```

Phase 3 Unit 3.7 replaces with the full version above. Mirrors Phase
2 Unit 2.8's audio-manifest.ts stub pattern.

**Step 3 — Asset-inventory consolidation (final read-through).**

By this step, Units 3.1 / 3.3 / 3.4 / 3.6 have each appended their
section to `videos/trailer/sample-eval/visual-asset-prep/asset-
inventory.md`. Unit 3.7 step:
- Read through and ensure all sections present.
- Cross-reference against `visual-manifest.ts` entries (every
  manifest entry has a documentation row; every documentation row
  has a manifest entry).
- Note any Unit-3.0 vendoring outcomes (which 10 files vendored at
  what timestamp).

**Step 4 — Safe-square composite proofs (NEW per design-lens deepening).**

Per design-lens Finding 5 + Critical Constraints §Mobile safe-square
audit: Phase 4 risks composing scenes that crop critical text on
mobile (X 1.91:1 in-feed preview crop per roadmap §5.3). Phase 3
ships per-asset-family PNG composites verifying critical assets fit.

```ts
// videos/trailer/scripts/build-safe-square-composites.ts
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const OUT_DIR = resolve(process.cwd(),
  'videos/trailer/sample-eval/visual-asset-prep/safe-square-composites');

const FAMILIES = [
  { name: 'r15-stamp-1', assets: ['trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg', 'trailer/r15-chrome/stamp-1-operation-pendleton-text.svg'], wrap: 'rotate(-8deg)' },
  { name: 'r15-stamp-3', assets: ['trailer/r15-chrome/stamp-3-asset-delivered-frame.svg', 'trailer/r15-chrome/stamp-3-asset-delivered-text.svg'], wrap: 'rotate(-3deg)' },
  { name: 'r15-subhead-4', assets: ['trailer/r15-chrome/subhead-4-field-ready-frame.svg', 'trailer/r15-chrome/subhead-4-field-ready-text.svg'], wrap: '' },
  { name: 'briefing-folder-closed', assets: ['trailer/briefing-room/dossier-folder-closed.svg'], wrap: '' },
  { name: 'title-burned-logo', assets: ['trailer/title-sequence/burned-logo.svg'], wrap: '' },
  // ... add as each unit ships
];

async function main() {
  if (!existsSync('public/trailer')) {
    console.error('Run from BURNED repo root.'); process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const family of FAMILIES) {
    const stack = family.assets
      .map((p) => `<img src="../../../../public/${p}" style="position:absolute;inset:0;width:100%;height:100%" />`)
      .join('');
    await page.setContent(`
<!doctype html>
<html><head><style>
  html, body { margin: 0; background: #f6ebce; height: 100vh; }
  .frame { width: 1920px; height: 1080px; position: relative; }
  .safe-square {
    position: absolute; left: 420px; top: 0; width: 1080px; height: 1080px;
    border: 2px dashed #be2e27; box-sizing: border-box; pointer-events: none;
  }
  .asset { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) ${family.wrap}; }
</style></head><body>
  <div class="frame">
    <div class="safe-square"></div>
    <div class="asset" style="width: 800px; height: 600px; position: relative">${stack}</div>
  </div>
</body></html>
    `);
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(OUT_DIR, `${family.name}.png`), fullPage: false });
  }
  await browser.close();
  console.log(`OK ${FAMILIES.length} safe-square composites at ${OUT_DIR}`);
}
main().catch((err) => { console.error(err); process.exit(1); });
```

Briggsy reviews each composite — critical text (R15 stamp #3 "ASSET
DELIVERED") MUST land inside the red-dashed 1080×1080 center-square
overlay. If text clips, Phase 3 reopens to resize/reposition the
asset before Phase 4 commits.

**Step 5 — PHASE-3-EXIT.md template (NEW — single document Phase 4 reads).**

```md
# Phase 3 Exit Document

Date: YYYY-MM-DD
Phase 3 commit SHA: <fill at completion>

## Vocabulary Vendoring (Unit 3.0)
- Vendored: 10 files (Stamp, Crest, RedactBar, ClassificationBanner,
  DossierPage × .tsx + .module.css) at
  `videos/trailer/src/components/burned-vocabulary/`.
- `verify:vocab-sync` last run: <date> — clean.
- Token-import strategy for Phase 4: <Option A / B / C pick from
  Unit 3.0 README — Phase 4 deepening decides>

## HTP Capture (Unit 3.1)
- Method: <static PNG | trace-video fallback>
- Capture URL: <https://burned-cxa.pages.dev/howtoplay | localhost>
- Output: `public/trailer/htp-fullpage.png`
  (or `public/trailer/htp-scroll.webm` if trace-video)
- Fullpage dimensions: 1920×<scrollHeight>px @ DPR=1
- File size: <N MB>
- Phase 4 Remotion `<Img translateY>` range: 0 → -<scrollHeight - 1080>px
- Briggsy-review signoff: <date>

## Card Roster (Unit 3.2)
- `card-roster.ts` exports: COLD_OPEN_CARDS (3 entries),
  S03_ROSTER (6 entries — Otto-aside handled by Phase 4),
  CASCADE_HALO_FOCAL_3 (3 entries: Vera/Neal/Sable per cue table),
  CASCADE_HALO (17 entries — full mosaic).
- `cascade-ring-layout.json` shipped at
  `videos/trailer/src/lib/cascade-ring-layout.json`.

## Briefing-Room (Unit 3.3)
- Existing assets surfaced (Path A): mahogany-horizontal,
  mahogany-vertical, blotter, stamp-classified, operative-silhouette,
  6 arena/portraits, pendleton-crest.png.
- NEW assets shipped (at `public/trailer/briefing-room/`):
  venetian-blinds, dossier-folder-closed, dossier-folder-open,
  depth-plane.
- Depth-plane Option picked: <A brass nameplate | B folders stack | C doorframe vignette>
- CASE BANNER + COMMS ticker reference renders at
  `sample-eval/visual-asset-prep/case-banner-reference.png` +
  `comms-ticker-reference.png` (Phase 4 visual-diff source).
- Briggsy-review signoff: <date>

## R15 Chrome (Unit 3.4)
- 4 instances × 2 layers = 8 SVG files at
  `public/trailer/r15-chrome/`:
  - stamp-1-operation-pendleton-{frame,text}.svg (S01 frame 150)
  - ticker-2-method-repeatable-{frame,text}.svg (S04 frame 1680)
  - stamp-3-asset-delivered-{frame,text}.svg (S04 frame 1950 PAYOFF)
  - subhead-4-field-ready-{frame,text}.svg (S06 frame 2820 CLOSING)
- CVD probe last run: <date>; result: PASS (all pairs cleared 0.10 oklab floor)
- Briggsy-review signoff: <date>

## Music Bed (Unit 3.5)
- Path taken: <A Artlist Pro | A Epidemic Sound Pro | B Suno Pro>
- Track: <name / artist OR Suno prompt hash>
- License: `videos/trailer/sample-eval/visual-asset-prep/music-license.pdf`
- DDEX disclosure pre-populated: <YES if Suno path | N/A if licensed>
- Audition pool size: <N candidates per platform>
- Output: `public/trailer/audio/music-bed.mp3` — 192k stereo MP3, 95s ±5%
- Music-cue map verification (per Phase 1 Unit 1.7 Step 5): <PASS | PHASE 4 MANUAL DUCKING NEEDED>

## Title-Sequence (Unit 3.6)
- Path taken for operative-card-frame: <Imagen | hand-authored SVG fallback>
- BURNED logo: single file at `public/trailer/title-sequence/burned-logo.svg`
- Cold-open title plate: existing
  `public/assets/howtoplay/operations-manual-plate.png` (verified
  acceptable at trailer scale during operative-card-composite-proof
  review).
- Operative card composite proof: `sample-eval/visual-asset-prep/operative-card-composite-proof.png`
- Briggsy-review signoff: <date>

## Imagen Spend (cumulative across Phase 3)
- Budget: $5.00
- Actual spend: $<N.NN>
- Per-path breakdown: <see imagen-spend.md>
- Stop-gate triggers (insight 018): <N hits across N paths>

## Cross-phase contracts surfaced for Phase 4
- Imports BURNED vocabulary from
  `./components/burned-vocabulary/` (Path B; NOT
  `../../src/client/howtoplay/`).
- `<Img>` + `<OffthreadVideo>` from `'remotion'` core (NOT
  @remotion/media).
- `<Sequence from={asset.startFrame}>` + `<Audio src=
  {staticFile(asset.staticPath)} />` for music + voice (Phase 2 lock).
- `cascade-ring-layout.json` consumption for halo composition.
- R15 split-layer composition with `transform-origin: center`.
- Stat captions = pure React text (Clash Display 700) on semi-
  transparent classification-bar backdrop — NO Phase 3 asset.
- Otto S03 handling: 6 card-art operatives + Otto-aside chrome (NOT
  7 portraits).
- Variable woff2 `weight: '200 700'` syntax — SPIKE NEEDED at Phase 4
  entry (framework-docs flagged unresolved).
- Trace-video fallback output is `.webm` (Playwright default), not
  `.mp4` — Phase 6 may transcode if X-distribution preference.

## Files added/modified summary
- See `git diff --stat` against Phase 3 entry commit SHA.
```

**Step 6 — Imagen-spend tracker template.**

```md
# Imagen Spend Tracker (Phase 3)

Budget cap: $5.00 total. Hard abort at $5.00 (override:
IMAGEN_BUDGET_OVERRIDE=1 env var with operator reason logged).

| Date | Asset | Iter | Cost | Cumulative | Status | Notes |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | operative-card-frame | 1 | $0.04 | $0.04 | RETRY | target-reticle prior fight |
| ... |

Per insight 018: STOP at iter 4 same-failure; re-architect.
```

**Patterns to follow:**

- Phase 2 audio-manifest.ts shape (matching `staticPath` field +
  `as const` array + helper exports).
- Phase 0/1/2 exit-document patterns.
- Insight 050 (perceptual-continuity verification via composite
  proofs).
- `feedback-stats-single-source.md` (manifest is one source; entries
  drift = doc-cascade update).

**Test scenarios:**

- **Happy path:** All Unit 3.0-3.6 signoff sentinels present;
  manifest typechecks; PHASE-3-EXIT.md populated; safe-square
  composites all show critical text inside the red-dashed center
  zone.
- **Edge case:** Manifest entry references file that doesn't exist
  → Vitest test `visual-manifest.test.ts` fails CI.
- **Edge case:** Asset on disk not in manifest → same test fails
  (catches Phase 3 forgetting to manifest a deliverable).
- **Edge case:** Safe-square composite shows critical text outside
  the center zone → Phase 3 reopens to resize/reposition.

**Verification:**

- `visual-manifest.ts` typechecks; entries match assets on disk
  (CI test passes).
- `PHASE-3-EXIT.md` populated, all fields filled.
- `asset-inventory.md` complete with all unit sections.
- `imagen-spend.md` shows cumulative spend ≤$5.
- `safe-square-composites/` populated with per-family PNGs;
  Briggsy review passes (no critical text clipped).
- All 4 unit-level Briggsy signoff sentinels present
  (`briggsy-review-3.{1,3,4,6}.signoff`).
- Phase 4 hand-off ready: Phase 4 deepening can read PHASE-3-EXIT.md
  + import visual-manifest.ts + card-roster.ts +
  cascade-ring-layout.json.

---

## System-Wide Impact

- **Interaction graph:** Phase 3 produces static assets; Phase 4
  imports them via the manifests. Phase 5 (Gameplay Capture) is
  upstream of Phase 4 for the gameplay clip but not dependent on
  Phase 3.
- **Error propagation:** Asset missing → Phase 4 scene file fails to
  import; surfaces immediately at typecheck. No silent runtime
  failure.
- **State lifecycle risks:** HTP capture depends on Vite dev server
  being up. Capture script fails fast with clear error.
- **API surface parity:** None — Phase 3 produces video-trailer
  assets, not user-facing surfaces.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated
  Playwright capture pattern + custom-font rendering in MP4.
- **Unchanged invariants:** BURNED game code untouched; phone bundle
  budget unaffected; BURNED's `public/` directory left intact (trailer
  consumes via `setPublicDir('../../public')` per Phase 0 ADR #8).

---

## Risks & Dependencies

(Risk picture updated 2026-05-17 per deepening — many pre-deepening
risks resolved as Tier 0 fixes; new risks surfaced by Path B
architecture + ADR #15 reconciliation.)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| HTP positive-completion gate times out (some reveal stuck) | Medium | Medium | Fallback: `ScrollTrigger.progress(1)` evaluate if useScrollReveal exposes window.ScrollTrigger in DEV. Else fail-fast + manual investigation. |
| Trace-video MP4 fallback needed if static under-delivers | Low (positive-completion gate covers most cases) | Medium | Unit 3.1 Step 6 escalation reserved; output is .webm (Playwright default), Phase 4 OffthreadVideo from `'remotion'` core decodes natively. |
| Vendored vocabulary drifts from BURNED source | Medium | High (visual continuity broken) | `verify:vocab-sync` CI gate fails build on drift; operator re-vendors. |
| Token CSS not loaded by Phase 4 (vocabulary components render with default fallbacks) | Medium | Medium | Unit 3.0 README documents 3 token-import strategies; Phase 4 deepening picks (Option A vendor / B path-import / C shim). |
| `public/trailer/...` assets unreachable to Remotion | Eliminated by ADR #15 | High | All NEW assets land in `public/trailer/...` inside BURNED's `public/` per ADR #15; single setPublicDir reaches both. |
| Playwright NOT installed in BURNED node_modules | Eliminated | High | BURNED root devDep `@playwright/test ^1.59.1` verified; `pnpm exec playwright install chromium` documented as one-time setup. |
| Card-roster references hallucinated filenames | Eliminated by Unit 3.2 deepening | High | Card-roster table replaced with verified Glob output; Vitest test (`card-roster.test.ts`) asserts every entry exists + reverse (every disk webp in roster). |
| Otto card art doesn't exist for S03 reveal | Mitigated by Phase 1 narration | Medium | Phase 1's "Seven on the roster, six in the deck, one in the basement" line frames Otto exclusion as the joke; Phase 4 composes Otto-aside chrome (REDACTED/BASEMENT treatment) using vendored RedactBar.tsx / ClassificationBanner.tsx. |
| Music procurement blocked by missing subscriptions | Medium | Medium | Unit 3.5 Step 0 pre-execution gate verifies Artlist/Epidemic/Suno Pro access before audition; explicit PRIMARY_MUSIC_SOURCE=skip-licensed shortcut for Suno-only path. |
| Music license PDF download missed at procurement | Medium | Medium | Encode script gated on `existsSync('music-license.pdf')`; operator can't accidentally skip rights-trail. |
| R15 chrome SVG typography fallback in MP4 export | Low (Phase 0 spike validated useFonts.ts; SVG includes `, monospace`/`, sans-serif` generic fallbacks) | High | Phase 4 useFonts.ts loads variable woff2 before scene render; spike at Phase 4 entry resolves variable-font weight syntax. |
| Imagen prior-fight exceeds budget on operative-card-frame | Medium (insight 018 is real) | Medium | Insight-018 stop-gate codified in Unit 3.6 Step 1 (4-iter cap → re-architect); fallback to hand-authored SVG in Step 1b. Running spend in `imagen-spend.md`. |
| R15 stamp-slap animation broken by monolithic SVG | Eliminated by split-layer architecture | High | Unit 3.4 ships frame.svg + text.svg as separate Img layers; Phase 4 wraps both with single `transform-origin: center` for stamp-slap. |
| R15 #4 copy/frame/filename drift from Phase 1 | Eliminated by Unit 3.4 deepening | High | Triple-drift fixed: OPERATION STATUS: FIELD-READY, frame 2820, subhead-4-field-ready.svg. Phase 4 line 1880 sync required. |
| CASE BANNER.tsx ghost reference | Eliminated by Unit 3.3 deepening | Medium | Replaced with GameTable.tsx:67-72 inline JSX reference + visual-diff verification via Playwright reference render. |
| Phase 1 depth-plane element missed | Eliminated by Unit 3.3 Step 7 | Medium | Depth-plane (Option A nameplate / B folders / C doorframe) explicitly added to Unit 3.3 deliverables. |
| Cascade halo composed layered-simultaneous (AI-slop shape) | Mitigated by cascade-ring-layout.json | High | Unit 3.2 ships per-card ring geometry + 2-frame entry stagger; Phase 4 can't accidentally render layered. |
| Safe-square mobile-crop violations | Mitigated by Unit 3.7 Step 4 composite proofs | Medium | Per-asset-family safe-square composite at 1920×1080 with 1080×1080 overlay; Briggsy verifies critical text inside center. |
| CVD distance violation on R15 chrome ink-on-cream | Mitigated by Unit 3.4 Step 5b probe | High (Briggsy color-blind) | culori probe script verifies 0.10 oklab floor across 3 deficiency sims; fail = substitute higher-L* variant. |
| Briggsy-review gates skipped on agent enthusiasm | Mitigated by sentinel files | Medium | Each unit gates Phase 4 import on `briggsy-review-3.N.signoff` sentinel; operator must explicitly write. |
| Shell-injection regression in capture / encode scripts | Low (project-wide rule) | High | `execFileSync` argv pattern throughout. |
| Variable woff2 `weight: '200 700'` syntax untested in Remotion 4.x | Medium | Medium | Phase 4 entry SPIKE flagged in PHASE-3-EXIT.md cross-phase contracts; fall back to per-weight static woff2 subsets if needed. |

---

## Open Questions

### Resolved During Planning (post-deepening locks)

- **Architecture path: Path B hybrid.** Set-dressing PNGs via
  staticFile (Path A through ADR #8); React chrome vocabulary
  vendored (Path B copy) into
  `videos/trailer/src/components/burned-vocabulary/`. Path A
  (cross-package import) formally rejected for 3 technical reasons +
  UMB-precedent empirical reason. Path C (raw SVG reimplementation)
  rejected on §2.2 quality-bar grounds. See Critical Constraints
  §Visual Asset Architecture.
- **Public-directory architecture: NEW ADR #15.** All Phase 3 new
  trailer-only assets land in `public/trailer/...` inside BURNED's
  `public/`. Single `setPublicDir('../../public')` works for both.
  Resolves the `videos/trailer/public/` UNREACHABLE-to-staticFile
  collision.
- **HTP rendering method**: static PNG default at DPR=1 (UMB
  precedent); trace-video `.webm` escalation reserved. Capture URL
  primary = production `https://burned-cxa.pages.dev/howtoplay`
  (post-deploy-migration); localhost fallback for script
  development.
- **HTP capture completion gate: positive-verification.**
  `page.waitForFunction()` polling computed opacity replaces the
  80ms-scroll-step heuristic. Fallback `ScrollTrigger.progress(1)`
  if useScrollReveal exposes window globals in DEV.
- **DPR: 1 at capture; Phase 6 `--scale=2` at render.** Match UMB
  precedent. Cuts source PNG file size ~4×.
- **Playwright package: `@playwright/test`.** Matches UMB precedent
  + BURNED's installed devDep. Scripts run from BURNED root cwd.
- **Card-art curation: select from 17 existing, no regeneration.**
  Read via Phase 0 ADR #8 `setPublicDir('../../public')`. Card-
  roster table replaced with verified Glob output. Otto-aside chrome
  treatment for S03 (6 card-art operatives + Otto exclusion aside
  per Phase 1 narration lock).
- **Briefing-room asset strategy: inventory-first.** Most assets
  already exist at `public/assets/{arena,roster,howtoplay}/`. NEW
  SVG only for what's missing (venetian-blinds, 2× dossier-folder
  states, depth-plane element).
- **Pendleton crest source.** Use existing
  `public/assets/howtoplay/pendleton-crest.png` for poster role +
  vendored `Crest.tsx` (with inline SVG variant) for in-frame React.
  No Imagen escalation needed.
- **R15 chrome format: SPLIT-LAYER SVG** (frame.svg + text.svg per
  stamp). Phase 4 composes with `transform-origin: center` for
  stamp-slap motion. Color tokens (NOT bare hex):
  `--color-ochre-9` + `--color-burned-fire`. R15 #4 copy + frame +
  filename triple-drift fix.
- **CVD verification: probe script** (`scripts/probe-r15-chrome-cvd.ts`)
  using project's culori pipeline. Per insight 051 — never edit
  color based on prose direction.
- **Music source pool: Artlist Pro / Epidemic Sound Pro $199-204/yr
  primary; Suno Pro $10/mo EXPECTED fallback (not last-resort).**
  Musicbed removed (over-budget); Udio removed (Nov 2025 settlement).
  Pre-execution account verification gate added (Unit 3.5 Step 0).
- **Music license/rights-trail**: Artlist/Epidemic PDF OR Suno
  billing screenshot + DDEX disclosure. Encode script gated on
  license file existence.
- **Cold-open title plate**: existing
  `public/assets/howtoplay/operations-manual-plate.png` (1.4 MB
  Imagen-generated). No new asset.
- **BURNED logo: SINGLE file** at
  `public/trailer/title-sequence/burned-logo.svg` used at both S01
  + S06 (was two-file in pre-deepening). Optional Imagen polish
  escalation CUT.
- **Operative card frame template: Imagen primary** (Unit 3.6 Step 1
  with insight 050 prompt structure + insight 018 stop-gate);
  hand-authored SVG fallback (Step 1b) if insight-018 stop-gate
  triggers.
- **Asset manifest pattern: HAND-EDITED.** Codegen + .meta.json
  sidecars CUT. ~25 entries (sized to actual asset count post-
  inventory). `safeSquareRole` becomes REQUIRED field.
- **Asset tier taxonomy: HERO / TEXTURE / CHROME** added to manifest
  + Requirements Trace; Phase 4 composition priority follows tier.
- **Briggsy-eyeball gates** at exit of Units 3.1, 3.3, 3.4, 3.6 (4
  novel-visual units). Fluency questions (not property checks) per
  insight 050.
- **PHASE-3-EXIT.md** as single source of truth Phase 4 consumes for
  non-asset state (HTP method, music path, depth-plane option,
  Imagen spend).
- **Per-unit eval markdown consolidation**: 4 per-unit MDs merged
  into single `asset-inventory.md`. Music + card-curation + license
  PDF kept standalone.

### Deferred to Implementation

- **Depth-plane element pick (Option A/B/C):** Phase 3 Unit 3.3 Step
  7 default = Option A brass nameplate; Briggsy may pick alternative
  during Step 7 review.
- **Token-import strategy for Phase 4** (Option A vendor / B path-
  import / C shim): Phase 4 deepening decides per Unit 3.0 README.
- **Variable woff2 `weight: '200 700'` syntax**: Phase 4 entry SPIKE
  resolves; may need per-weight static woff2 subsets if Remotion
  bundler doesn't accept the range syntax.
- **Specific licensed track name + URL** (if Path A licensed
  taken): Unit 3.5 audition log surfaces at Phase 3 execution.
- **Operative-card-frame Imagen path (success or hand-authored
  fallback):** Unit 3.6 Step 1's insight-018 stop-gate decides at
  execution.
- **CASE BANNER + COMMS ticker porting strategy in Phase 4**: either
  ported inline JSX from GameTable.tsx:67-72 + DossierFeed.tsx, OR
  composed via vendored ClassificationBanner.tsx. Phase 4 deepening
  picks per visual-diff against reference renders.
- **Whether DossierFeed.tsx needs vendoring** (Unit 3.0 currently
  vendors 5 vocabulary components; DossierFeed not among them).
  Phase 4 spike at compose time decides.
- **Otto S03 chrome treatment** (REDACTED placeholder slot vs
  `portrait-otto.png` + chrome aside vs purely-typographic
  "BASEMENT" reference): Phase 4 picks during S03 composition.

---

## Documentation / Operational Notes

- **NEW assets land at `public/trailer/...`** inside BURNED's
  existing `public/` directory (per ADR #15). Code lives at
  `videos/trailer/{scripts,src/lib,src/components/burned-vocabulary,
  sample-eval}/`. Phase 4 imports via `staticFile('trailer/...')`
  for new + `staticFile('assets/...')` for existing BURNED assets —
  single `setPublicDir('../../public')` reaches both.
- **HTP capture URL primary: production
  `https://burned-cxa.pages.dev/howtoplay`** (post-deploy-migration).
  Localhost `http://localhost:5173/howtoplay.html` fallback for
  script development. Override via `HTP_URL` env var.
- **Playwright runs from BURNED root cwd** (where
  `@playwright/test ^1.59.1` devDep is installed). One-time browser
  install: `pnpm exec playwright install chromium`.
- **Card-art read via Phase 0 ADR #8** `setPublicDir('../../public')`
  — no copy, no symlink.
- **Vocabulary vendoring** at Phase 3 entry: `pnpm vendor:vocab`
  copies 10 files (5 .tsx + 5 .module.css) from
  `src/client/howtoplay/components/` into
  `videos/trailer/src/components/burned-vocabulary/`. Drift catcher:
  `pnpm verify:vocab-sync` (CI gate).
- **Imagen budget for Phase 3: <$5 total.** Cumulative tracker at
  `sample-eval/visual-asset-prep/imagen-spend.md`. Hard abort at
  cap; `IMAGEN_BUDGET_OVERRIDE=1` env var for explicit override.
  Per `feedback-imagen-budget.md` + insight 018 (4-iter stop-gate).
- **Imagen prompt structure** mandatory: fractional layout +
  continuity prescription + emotional payload + Archer-character
  anchor + style block + negative suppressors. See Critical
  Constraints §"Imagen Prompt Template".
- **Hex codes in Imagen prompts**: OK IF the negative suppressor
  list at the end forbids hex/numbers/color-codes (verified
  empirically — BURNED's shipped `pendleton-crest.png`,
  `operations-manual-plate.png`, `blotter.png`,
  `mahogany-horizontal.png` all used hex in prompts + negatives in
  suffix → clean outputs with zero baked text). TODO.md landmine
  rewording lands in TODO update accompanying this deepening.
- **Music license PDF** filed at
  `sample-eval/visual-asset-prep/music-license.pdf` (Artlist/Epidemic
  PDF for Path A; Suno billing screenshot + DDEX disclosure for Path
  B). Encode script gated on file existence.
- **All shell-out invocations** use `execFileSync` with argv arrays
  (project-wide convention; matches Phase 2 lock).
- **All CLI parsing** via `node:util.parseArgs` strict mode (matches
  Phase 2 lock).
- **Inventory patterns** use Node `readdirSync` / Glob (cross-
  platform; NOT PowerShell `Get-ChildItem`).
- **Briggsy is color blind** — assets rely on typography + position
  + shape for hierarchy, not color alone (per `user_color_blind`
  memory). R15 chrome contrast verified via Unit 3.4 Step 5b CVD
  probe script. Per insight 051 — never edit color based on prose
  direction.
- **Briggsy-eyeball gates** are non-skippable. Sentinel files
  (`briggsy-review-3.{1,3,4,6}.signoff`) gate Phase 4 import. Phase
  4 deepening verifies sentinels exist before scene-build.
- **PHASE-3-EXIT.md** is the single document Phase 4 reads for non-
  asset state (HTP method, music path, depth-plane option, Imagen
  spend). Mirrors Phase 0/1/2 exit-document pattern.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md) (ADR #2 refined + NEW ADR #15 per this deepening)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md) (Unit 1.5 cascade lock, Unit 1.7 music lock, Unit 1.8 typography lock, Unit 1.9 R15 #4 copy lock, Unit 1.10 depth-plane add)
- Phase 2 plan: [`docs/plans/origin-trailer/phase-2-voice-pipeline.md`](./phase-2-voice-pipeline.md) (audio-manifest pattern, `@remotion/media`-only-for-`<Audio>` scoping)
- Product spec: [`docs/PRODUCT-SPECIFICATION.md`](../../PRODUCT-SPECIFICATION.md) (§2.2 Archer-frame acceptance test, §3.7 Dreamland palette reference)

**UMB v3 precedents:**
- HTP capture script: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Composition pattern (verified bare-Series, zero cross-package imports): `projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx`
- Remotion config (setPublicDir precedent): `projects/undercover-mob-boss/videos/trailer/remotion.config.ts`
- Asset-prompts pattern (`--only` flag + `#FF00FF` chroma-key): `projects/undercover-mob-boss/scripts/asset-prompts.ts` + `generate-assets.ts`

**BURNED HTP component vocabulary (vendored at Unit 3.0):**
- `src/client/howtoplay/components/Stamp.tsx` + `Stamp.module.css` (canonical stamp props + slam animation)
- `src/client/howtoplay/components/Crest.tsx` (inline SVG variant at lines 41-121 + image variant)
- `src/client/howtoplay/components/RedactBar.tsx` (Agent X REDACTED chrome)
- `src/client/howtoplay/components/ClassificationBanner.tsx` (CASE BANNER tone variants)
- `src/client/howtoplay/components/DossierPage.tsx` (`[data-reveal]` selector source)
- `src/client/howtoplay/hooks/useScrollReveal.ts` (900ms tween duration — drives Unit 3.1 completion gate design)

**BURNED assets consumed (Path A via Phase 0 ADR #8):**
- Card art: `public/assets/cards/` (17 webp verified 2026-05-17 — 6 operatives, 11 actions; NO Otto, NO Dolores webp)
- Arena set-dressing: `public/assets/arena/` (11 PNGs ~10.7 MB total — mahogany horizontal/vertical, blotter, stamp-classified, operative-silhouette, 6 portraits)
- Roster portraits: `public/assets/roster/` (6 PNGs 1.1-1.3 MB each — higher-res alternative)
- HTP assets: `public/assets/howtoplay/pendleton-crest.png` (1.5 MB) + `operations-manual-plate.png` (1.4 MB)
- Variable fonts: `public/fonts/{ClashDisplay-Variable,GeneralSans-Variable,JetBrainsMono-Variable}.woff2`

**Briefing-room reference sources (NOT vendored — Phase 4 ports inline):**
- CASE BANNER inline JSX: `src/client/board/GameTable.tsx:67-72` `<aside className={styles.caseBanner}>`
- COMMS ticker live render: `src/client/board/DossierFeed.tsx` (selector for reference render)
- BURNED CSS tokens: `src/client/shared/tokens/primitives.css` (Radix-style scale+step `--color-cream-N`, `--color-ochre-N`, `--color-burned-fire`)

**BURNED Imagen-generation precedent scripts (recipe references):**
- `scripts/generate-htp-assets.ts` (3 assets shipped: pendleton-crest, operations-manual-plate, desk-scene; hex codes in prompts + negatives in suffix → clean outputs)
- `scripts/generate-briefing-assets.ts` (15+ assets shipped: dossier portraits, mahogany tiles, blotter, classified stamp, silhouettes; same hex+negatives pattern)

**Playwright documentation:**
- `@playwright/test`: https://playwright.dev/docs/api/class-test
- Page screenshot: https://playwright.dev/docs/api/class-page#page-screenshot
- `recordVideo` (WebM default output): https://playwright.dev/docs/videos
- `waitForFunction`: https://playwright.dev/docs/api/class-page#page-wait-for-function
- ScrollTrigger interaction patterns: https://playwright.dev/docs/api/class-page#page-evaluate

**GSAP / ScrollTrigger documentation:**
- ScrollTrigger `once`: https://gsap.com/docs/v3/Plugins/ScrollTrigger
- `progress(1)` force-complete: https://gsap.com/docs/v3/GSAP/Tween/progress()

**Music sourcing:**
- Artlist Pro: https://artlist.io/pricing ($199-$299/yr range)
- Epidemic Sound Pro: https://www.epidemicsound.com/pricing/ ($204/yr annual)
- Suno commercial-use terms: https://suno.com/legal/terms-of-service (March 2026 ToS)
- DDEX AI-disclosure standard: https://ddex.net/standards (late 2025 release)

**Remotion documentation:**
- Static files: https://www.remotion.dev/docs/staticfile
- `<Img>` (from `remotion` core): https://www.remotion.dev/docs/img
- `<OffthreadVideo>` (from `remotion` core): https://www.remotion.dev/docs/offthreadvideo
- `<Audio>` (from `@remotion/media`): https://www.remotion.dev/docs/media/audio
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font
- `--scale` CLI flag: https://www.remotion.dev/docs/cli/render#--scale
- `setPublicDir` config: https://www.remotion.dev/docs/config#setpublicdir

**Imagen 4 documentation:**
- Model + SDK: https://ai.google.dev/gemini-api/docs/imagen (model `imagen-4.0-generate-001`)
- Prompt engineering guide (2026): https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide

**Institutional learnings (memory + insights):**

*Memory:*
- `feedback-imagen-budget.md` — one-test-first + tight-budget discipline
- `feedback-imagen4-over-nbp.md` — Imagen 4 preferred over NBP for new assets
- `feedback-stats-single-source.md` — verify card-art count against actual filesystem
- `user_color_blind.md` — typography + position + shape carry signal, not color alone
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
- `feedback-wait-for-all-agents.md` — sequential synthesis after parallel agents
- `feedback-elite-team-standard.md` — verify before claiming; eye-in-loop
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — agents miss motion perception
- `feedback-vibes-are-not-specs.md` — spec is the requirement; vibes are suggestions
- `feedback-hallucinated-references.md` — verify against primary source before reference becomes load-bearing
- `project-burned-arena-direction` — "Briefing Room" arena vocabulary locked
- `project-burned-dolores-grieves` — Dolores on Intercepted card only, not her own card

*Insights:*
- `docs/insights/018-imagen-priors-engineer-around-dont-fight.md` — generative model priors don't bend to prompts; 4-iter stop-gate + 4 re-architect strategies
- `docs/insights/019-surface-coherence-review-misses-signature-drift.md` — code-grounded reviewers catch what surface-coherence misses; foundation for this deepening's 8-agent fleet
- `docs/insights/050-agent-verification-misses-perceptual-continuities.md` — agent verification = property check; eye-in-loop = fluency read; Imagen prompt structure (fractional / continuity / emotional payload)
- `docs/insights/051-prose-cvd-recommendations-are-wrong-direction.md` — never edit color based on prose direction alone; probe script with culori pipeline
- `docs/insights/010-art-directed-palettes-fail-apca-radix-guarantees.md` — Dreamland palette needed 20-40% lightness bumps for APCA compliance
- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` — parallel launch + sequential synthesis discipline

*Hallucinated reference correction:*
- Pre-deepening Phase 3 line 961 cited `feedback-imagen-hex-codes-bake-in.md` — that memory file DOES NOT EXIST. Actual landmine lives in TODO.md lines 262-269. Per repo-research-analyst Investigation 4: landmine wording is overstated; rewording lands in TODO update accompanying this deepening commit.

**Deepening pass cross-references:**
- 8-agent fleet output transcripts: `tasks/{a08813dbd195f53d4,a83dc55306b1aa355,abb3291fb34d33258,a5369c2bbc517d0cd,a7f630c57f32e058a,af6293b7993f49641,a82f755adbca574de,a92fefcf5e9e388a8}.output` (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens — see commit message for synthesis)
- Sequential-thinking synthesis: 8 thoughts mapped 69 amendments across 5 tiers (T0-T4)
