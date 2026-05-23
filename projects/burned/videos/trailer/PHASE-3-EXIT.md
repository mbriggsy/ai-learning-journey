# Phase 3 Exit Document

> Single doc Phase 4 reads at entry. Consolidates every Phase 3
> outcome Phase 4 needs (asset paths, picks, gotchas, spends, deferred
> decisions). Mirrors Phase 0 / 1 / 2 exit-document pattern.

**Date:** 2026-05-22
**Phase 3 entry commit:** prior to `99ff0779` (Unit 3.5 close)
**Phase 3 closeout commit (Unit 3.7):** filled at commit time
**Status:** ✅ CLOSED — all 8 units (3.0 through 3.7) landed.

---

## Vocabulary Vendoring (Unit 3.0)

- **Vendored:** 10 files at `videos/trailer/src/components/burned-vocabulary/`
  (`Stamp`, `Crest`, `RedactBar`, `ClassificationBanner`, `DossierPage`
  — `.tsx` + `.module.css` each).
- **Allowlist source-of-truth:** `videos/trailer/scripts/lib/vocab-files.ts`
  (`VENDORED_FILES` const; consumed by both `vendor-burned-vocab.ts`
  + `verify-vocab-sync.ts` per insight #063 sync-pair correction).
- **Drift gate:** `pnpm verify:vocab-sync` — SHA256 compare BURNED
  source ↔ vendored copy. CI gate; exit 1 on any drift. Last run
  clean.
- **Phase 4 token-import strategy:** **DEFERRED to Phase 4
  deepening.** Three options on the table (A vendor token CSS files /
  B path-import from BURNED / C Phase-4-specific token shim). Insight
  #060 flag: this MUST be picked at Phase 4 deepening, not at first-
  render time. README at the vendor dir spells out the three options.

## HTP Capture (Unit 3.1)

- **Method:** static PNG (positive-completion gate, opacity-only per
  insight #064 — transform excluded to avoid GSAP-translate noise).
- **Capture URL:** production `https://burned-cxa.pages.dev/howtoplay`
  (default); `HTP_URL=http://localhost:5173/howtoplay.html` override
  for local-dev iteration.
- **Output:** `public/trailer/htp-fullpage.png`
- **Dimensions:** 1920 × 19848 pixels @ DPR=1 (33.5 MB raster).
- **Phase 4 Remotion `<Img translateY>` range:** 0 → -18768px
  (= 19848 - 1080 viewport).
- **Capture script:** `videos/trailer/scripts/capture-htp-scroll-burned.ts`
- **Re-run:** `pnpm capture:htp`

## Card Roster (Unit 3.2)

- **`card-roster.ts` exports:**
  - `COLD_OPEN_CARDS` — 3 entries (Janet + Dash + Neal per Phase 0
    EXIT lock — Janet locked as cold-open speaker).
  - `S03_ROSTER` — 6 entries (all operatives; Phase 4 composes Otto-
    aside chrome separately per "research budget" exclusion gag).
  - `CASCADE_HALO` — 6 entries (same 6 operatives; geometry in
    `cascade-halo-column.json`).
- **`cascade-halo-column.json`:** Phase 1 Unit 1.5 lock — right-edge
  column, x=1560-1880, 40% opacity ceiling, 2-frame entry stagger,
  haloStartFrame=1560, haloCompleteFrame=1572. NOT a 360° ring
  (explicit AI-slop anti-pattern guard).
- **Drift gates passing** (`card-roster.test.ts`): 17 entries,
  roster↔disk bidirectional, roster↔cascade-halo-column.json
  bidirectional, Phase 1 column-geometry lock.

## Briefing-Room Set-Dressing (Unit 3.3)

- **NEW assets at `public/trailer/briefing-room/`:**
  - `venetian-blinds.svg` (1920×1080) — sun-from-right bias, 7
    irregular slats + back-layer parallax. Phase 4 animates
    translateX 1.5–2px/frame.
  - `dossier-folder-closed.svg` (1000×1300) — manila + TOP SECRET
    + Pendleton crest watermark + filing chrome.
  - `dossier-folder-open.svg` (1000×1300) — cream case-sheet,
    classification ribbon, REDACTED operative, ACTIVE·BURNED status,
    PEN-22-CF footer.
  - `depth-plane.svg` (600×160) — **Option A — brass nameplate**
    (locked: M. PENDLETON / BUREAU CHIEF; engraved-into-brass filter
    + corner phillips screws + plate-drop shadow). Options B
    (folders stack) + C (doorframe vignette) NOT shipped; A judged
    sufficient at cross-family review.
- **Existing assets surfaced** (Path A through ADR #8):
  mahogany-horizontal, mahogany-vertical, blotter, stamp-classified,
  operative-silhouette, 6 arena portraits, pendleton-crest.png,
  operations-manual-plate (consumed by Unit 3.6).
- **Reference renders:** `case-banner-reference.png` +
  `comms-ticker-reference.png` **deferred to Phase 4 invocation** —
  capture requires BURNED in playing-state game (see capture script
  header). Phase 4 visual-diff source.

## R15 Chrome (Unit 3.4)

- **8 SVGs across 4 instances** at `public/trailer/r15-chrome/`
  (SPLIT-LAYER: each instance ships frame.svg + text.svg so Phase 4
  wraps both in a single transform-origin:center AbsoluteFill for the
  stamp-slap pivot):
  - `stamp-1-operation-pendleton-{frame,text}.svg` — S01 frame 150,
    ochre-9 ink, rotated -8°.
  - `ticker-2-method-repeatable-{frame,text}.svg` — S04 frame 1680,
    bottom-strip ticker, axis-aligned.
  - `stamp-3-asset-delivered-{frame,text}.svg` — S04 frame 1950
    **PAYOFF**, burn-fire ink, rotated -3°, scaleSlap heavier
    16-frame curve per HERO weight.
  - `subhead-4-field-ready-{frame,text}.svg` — S06 frame 2820 closing
    "OPERATION STATUS: FIELD-READY", axis-aligned.
- **CVD probe last run 2026-05-22 — PASS.** All 6 ink/background
  pairs clear STRICT 0.10 oklab floor under deuter / prot / trit
  deficiency sims. Narrowest pair: ochre-9 on cream-11 at 0.250 (2.5×
  floor). HERO #3 burn-fire/cream-12 at 0.404.
- **Probe script:** `videos/trailer/scripts/probe-r15-chrome-cvd.ts`.
  Re-run: `pnpm tsx videos/trailer/scripts/probe-r15-chrome-cvd.ts`.
- **Phase 4 composition pattern** (encoded in asset-inventory.md):
  ```tsx
  <AbsoluteFill style={{
    transformOrigin: 'center',
    transform: `rotate(${tilt}deg) ${scaleSlap(frame)}`,
  }}>
    <Img src={staticFile(`trailer/r15-chrome/${slug}-frame.svg`)} />
    <Img src={staticFile(`trailer/r15-chrome/${slug}-text.svg`)} />
  </AbsoluteFill>
  ```
  Rotations: #1 = -8°; #2 = 0°; #3 = -3°; #4 = 0°.

## Music Bed (Unit 3.5)

- **Track:** **"Spy Glass" by Kevin MacLeod** (incompetech.com)
- **License:** **CC-BY 4.0** — free; **paid-source ladder
  (Artlist/Epidemic/Marmoset/Songtradr/Suno) bypassed** per Briggsy
  directive "not paying for music" captured in
  `project-burned-music-bed-budget` memory.
- **Output:** `public/trailer/audio/music-bed.mp3` — 226.98s (3:46.98),
  44.1kHz stereo, 256 kbps MP3 (7.3 MB).
- **Phase 4 clips:** 106s window from the 226.98s track per
  music-cue map in BEAT-SHEET.md preamble.
- **DDEX disclosure required:** **N/A** — Spy Glass is human-composed;
  Tier 3 Suno generative path NOT taken; no AI-music disclosure
  flows to Phase 7.
- **Attribution obligation:** ON every distribution surface (verbatim
  text + per-surface checklist at
  `videos/trailer/sample-eval/visual-asset-prep/music-license.md`).
  On-screen credit OPTIONAL per CC-BY 4.0.
- **Music-cue map verification:** Phase 1 Unit 1.7 Step 5 map remains
  the source of truth; Phase 4 ducks the bed per the map's per-cue
  schedule. Loudnorm drift on cues ≤3s noted in TODO §"Phase 2
  carry-forwards → Phase 4 mix tests" — manual ducking math may need
  a tiny bump on 4 short cues if mix-tests show them ducking too far.

## Title-Sequence (Unit 3.6)

- **Path taken for operative-card-frame:** **Step 1b hand-authored
  SVG fallback** — Imagen escalation skipped per insight #018 stop-
  gate + `feedback-imagen-budget.md` "one-test-first" preference.
  Verified readable at 1/3-canvas size via composite proof.
- **NEW assets at `public/trailer/title-sequence/`:**
  - `operative-card-frame.svg` (800×1000) — S01 cold-open chrome
    template; Phase 4 composites operative portrait + Clash Display
    name overlay.
  - `chevron-motif-bg.svg` (1920×1080) — S01 background pattern
    (Bass/Ferro lineage), ochre-9 at 0.14 opacity, radial vignette.
  - `burned-logo.svg` (1200×400) — **S06 closing wordmark ONLY**
    (frame 2780). S01 cold-open uses existing
    `public/assets/cards/burned.webp` per Phase 1 Unit 1.10
    differential (S01 = card-art in-world; S06 = wordmark out-of-
    world bookend).
- **Cold-open title plate:** existing
  `public/assets/howtoplay/operations-manual-plate.png` (1.4 MB
  Imagen-gen). NOT regenerated.
- **Composite proof:**
  `sample-eval/visual-asset-prep/operative-card-composite-proof.png`
  — verifies name-plate text reads at cold-open canvas ratio.

## Visual Manifest (Unit 3.7)

- **`videos/trailer/src/lib/visual-manifest.ts`** — typed manifest
  with explicit `safeSquareRole` + `tier` for every entry. Phase 4
  consumes via `staticFile(asset.staticPath)`. Helper exports:
  `HTP_ASSET`, `R15_CHROME` (8), `BRIEFING` (10), `TITLE_SEQ` (4),
  `MUSIC_BED`.
- **Card-art INTENTIONALLY NOT enumerated** — `card-roster.ts` is
  the SSoT. Phase 4 reads card-roster + cascade-halo-column.json for
  card-art surfaces.
- **Drift gate:** `videos/trailer/src/lib/visual-manifest.test.ts` —
  forward (every entry exists on disk) + reverse for Path B only
  (every file under `public/trailer/` not in EXCLUDED_TRAILER_DIRS is
  in the manifest) + helper export shapes + temp-HTML-leak canary.

## Safe-Square + Cross-Family Composite Proofs (Unit 3.7 Step 4 + 4b)

- **Per-family composites** (9 PNGs) at
  `sample-eval/visual-asset-prep/safe-square-composites/per-family-*.png`:
  R15 #1 / #2 / #3 / #4, briefing-folder-closed / -open / depth-plane,
  title-operative-card-frame / -burned-logo. Each shows the asset
  stack inside 1920×1080 with the red-dashed 1080×1080 central
  safe-square overlay — critical text verified inside center zone
  across the board.
- **Cross-family composites** (2 PNGs) at same dir:
  - `cross-family-s02-frame-300.png` — briefing-room reveal scene
    (mahogany + blotter + venetian-blinds + dossier-folder-closed +
    R15 #1 stamp + depth-plane + Pendleton crest). Approximates Phase
    4 scene composition for cohesion review.
  - `cross-family-s04-frame-1950.png` — cascade-payoff stamp slap
    (HTP background at 32% + 6 cascade-halo cards + 4 stat caption
    placeholders + R15 #3 stamp dead-center with vignette behind).
    Stamp dominates per R3 truth-collision payoff hierarchy.
- **Build script:** `videos/trailer/scripts/build-safe-square-composites.ts`.
  Re-run all: `pnpm exec tsx videos/trailer/scripts/build-safe-square-composites.ts`.
  Single: append composite name as argv[2].

## Imagen Spend (cumulative across Phase 3)

- **Budget cap:** $6 total (matches the $5+$1 worst-case ceiling).
- **Actual spend:** **$0.00.** Every NEW asset hand-authored OR
  pre-existing.
- **Per-unit ledger:** `sample-eval/visual-asset-prep/imagen-spend.md`
  — all 7 units (3.0 through 3.6) at $0.00 cumulative.
- **Re-open clause:** if Phase 4 visual review surfaces an asset
  that DOES need an Imagen run, Phase 3 can re-open under the $6 cap
  with the insight #018 stop-gate (4-iteration cap per concept-pair).

---

## Cross-phase contracts surfaced for Phase 4

- **Imports BURNED vocabulary from** `./components/burned-vocabulary/`
  (Path B copy; NOT `../../src/client/howtoplay/`).
- **Remotion components:** `<Img>` + `<OffthreadVideo>` from
  `'remotion'` core (NOT `@remotion/media`).
- **Audio placement:** `<Sequence from={asset.startFrame -
  (leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} />
  </Sequence>` (Phase 2 lock).
- **R15 split-layer composition** with
  `transform-origin: center` (single AbsoluteFill wraps both
  frame.svg + text.svg layers per instance).
- **Card-art surfaces:** read `card-roster.ts` + `cascade-halo-column.json`
  directly — NOT through visual-manifest.ts (SSoT split).
- **Stat captions** (S04): pure React text (Clash Display 700) on
  semi-transparent classification-bar backdrop — NO Phase 3 asset
  needed.
- **Otto S03 handling:** 6 card-art operatives + Otto-aside chrome
  (RedactBar + ClassificationBanner "research budget" treatment).
  Otto's exclusion IS the joke — per Phase 1 lock.
- **Token-import strategy DEFERRED to Phase 4 deepening** (Option A/
  B/C — see Vocabulary Vendoring section above).
- **Variable woff2 weight syntax SPIKE** needed at Phase 4 entry —
  `weight: '200 700'` syntax untested in Remotion 4.x; fall back to
  per-weight static woff2 subsets if needed (framework-docs flagged
  unresolved).
- **Trace-video fallback output is `.webm`** (Playwright default),
  not `.mp4` — Phase 6 may transcode if X-distribution preference
  emerges. Reserve clause; not active.
- **`setPublicDir('../../public')`** in `remotion.config.ts` —
  resolves both Path A (`assets/...`) and Path B (`trailer/...`)
  through BURNED's single public/ root (Phase 3 ADR #15).

## Files added/modified summary

Authoritative source: `git diff --stat 99ff0779..HEAD` at Phase 3
closeout commit.

Major additions in Unit 3.7:
- `videos/trailer/src/lib/visual-manifest.ts` (NEW)
- `videos/trailer/src/lib/visual-manifest.test.ts` (NEW)
- `videos/trailer/scripts/build-safe-square-composites.ts` (NEW)
- `videos/trailer/sample-eval/visual-asset-prep/safe-square-composites/`
  (11 PNGs)
- `videos/trailer/PHASE-3-EXIT.md` (this file)

Major work from Units 3.0–3.6 (already committed prior to this
closeout): vendor + drift-gate scripts, HTP capture, card-roster +
cascade geometry, 4 briefing-room SVGs, 8 R15-chrome SVGs, music bed
+ license artifacts, 3 title-sequence SVGs + composite proof.
