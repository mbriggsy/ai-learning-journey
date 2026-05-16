---
title: "Origin Trailer — Phase 3: Visual Asset Prep"
type: feat
phase: 3
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 3 — Visual Asset Prep

## Overview

Phase 3 produces every static visual asset the Remotion composite
(Phase 4) consumes: the HTP dossier fullpage capture, curated card-
art selections, briefing-room set-dressing, R15 chrome stamp graphics,
cold-open title-sequence assets, and the music bed audio file. All
assets land in `videos/trailer/public/` ready for Phase 4 `<Img>` /
`<Audio>` / `<OffthreadVideo>` imports.

Phase 3 produces:

- `videos/trailer/public/htp-fullpage.png` — BURNED's how-to-play
  dossier rendered as a single tall PNG (clone of UMB's
  `capture-htp-scroll.ts` pattern, adapted to BURNED's HTP route)
- `videos/trailer/public/assets/cards/` — curated subset of BURNED's
  17 webp card artworks, organized for cascade halo + S03 roster
  reveals
- `videos/trailer/public/assets/briefing-room/` — set-dressing layers
  (venetian-blind shadow, mahogany desk surface, dossier folder
  graphics, Pendleton crest watermark)
- `videos/trailer/public/assets/r15-chrome/` — 4 stamp / ticker /
  subhead graphics matching Unit 1.9's R15 copy lock
- `videos/trailer/public/assets/title-sequence/` — cold-open
  composition elements (chevron motifs, BURNED logo treatments,
  operative card frame templates)
- `videos/trailer/public/audio/music-bed.mp3` — the licensed music
  bed track (or generative fallback per Unit 1.7)
- `videos/trailer/src/lib/visual-manifest.ts` — typed manifest Phase 4
  imports
- `videos/trailer/sample-eval/visual-asset-prep/` — capture proofs,
  curation rationale, license documentation, cascade composition
  preview frames

Phase 3 runs **in parallel with Phase 2** (per roadmap §3 phase table)
— they share no dependencies. Phase 3 exits when every asset called
out in BEAT-SHEET.md visual cues has a corresponding file in
`videos/trailer/public/` and the `visual-manifest.ts` typechecks.

---

## Problem Frame

Phase 1 Unit 1.10's briefing-room visual environment lock and Unit
1.5's cascade composition lock declare WHAT visual elements appear at
which frame. Phase 3's job is to **produce those elements as static
assets** that Phase 4 can compose.

Two production realities shape Phase 3:

1. **BURNED has 17 webp card artworks already shipped** at
   `public/assets/cards/`. Phase 3 curates — selects subsets,
   organizes by visual function (cold-open flash candidates, S03
   roster reveal set, cascade halo cluster) — and does NOT
   re-generate. Per `feedback-imagen-budget.md`, no new Imagen runs
   without explicit Briggsy approval.

2. **BURNED's HTP dossier (`src/client/howtoplay/`) is a live
   GSAP+React app**, not a static image. Rendering it as a Remotion
   asset requires the UMB `capture-htp-scroll.ts` pattern: spin up
   Vite dev server, navigate Playwright to `/howtoplay.html`, scroll
   to trigger ScrollTrigger animations, screenshot as fullpage PNG.

The largest risk Phase 3 manages: **HTP capture fidelity**. The
GSAP-driven scroll-reveal animations in `src/client/howtoplay/` only
fire as ScrollTrigger detects elements entering the viewport. If
Playwright captures fullpage WITHOUT scrolling first, every reveal
element ships at opacity 0. UMB's working pattern handles this:
scroll-by-200px-then-wait-80ms loop until `scrollHeight` reached,
THEN fullpage screenshot.

Smaller but real risks:
- Briefing-room set-dressing requires graphics BURNED doesn't currently
  ship as separate assets (the venetian-blind shadow layer, the
  Pendleton crest at trailer-poster size, the dossier-folder texture).
  Phase 3 produces these as SVG / PNG composites.
- R15 chrome stamps need PRINT-STYLE typographic treatments (stamp
  rotation, ink-blot edges, slight registration offset). Generated
  as SVG with optional Imagen reference if the SVG read isn't
  trailer-grade.
- Music-bed sourcing per Unit 1.7 may hit "no track lands the mood
  across 15 auditions"; generative fallback (Suno) per the lock.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 1 §Critical Constraints.

### HTP capture mode: static PNG default; trace-video upgrade reserved

Phase 1 Unit 1.5 Step 6 locked HTP rendering as a static PNG via
clone of UMB's `capture-htp-scroll.ts`. Phase 3 Unit 3.1 executes
this default. **If** the static PNG under-delivers (GSAP animations
missing, viewport-only-revealing elements absent), the escalation
path is Playwright `page.video()` API to capture an actual MP4 of
the scroll motion. The trace-video MP4 composes into Remotion via
`<OffthreadVideo>`.

Don't pre-escalate. Static PNG works for ~95% of HTP cascade use
cases (the dossier ScrollTrigger reveals one section at a time;
freezing them all at full opacity in a single fullpage capture is
visually equivalent to the live scroll for trailer purposes).

### Card-art curation: selection, not generation

Per `feedback-imagen-budget.md`: H&S spent $25 on ugly Imagen output;
UMB v3 spent <$3 for a masterpiece because of the one-test-image-first
+ tight-budget discipline. BURNED already has 17 high-quality Imagen
artworks (verified per `TODO.md` §1 squeaky 2026-05-16). Phase 3 does
NOT generate new card art.

What Phase 3 DOES generate (new Imagen runs, gated): the cold-open
**operative card frame template** (a single "operative card"
template that hosts each operative's portrait — bold mid-century
geometric chrome, target-reticle motif, Bass/Ferro-lineage
typography). One test image first per Briggsy's budget rule; align
on style; batch generate the few template variants needed (3–4 cards
for the cold-open flash sequence).

Budget: **<$5 total for Phase 3 Imagen spend** (per
`feedback-imagen-budget.md`).

### Briefing-room asset gap analysis

BURNED's existing `src/client/board/CaseBanner.tsx` + `DossierFeed.tsx`
+ `MinimalCard.module.css` set the visual vocabulary. The TRAILER
needs static-asset versions of these vocabulary elements for Remotion
to render — Remotion doesn't load React components from BURNED's
`src/client/`.

Gap analysis identifies which existing CSS-driven looks need
materializing as static SVGs / PNGs for the trailer:

- **Mahogany desk surface**: a tiled or full-bleed background image.
  Current BURNED implementation is a CSS gradient + texture overlay.
  Trailer needs the rendered composite as PNG.
- **Venetian-blind shadow**: BURNED renders this via SVG mask in
  CSS. Trailer needs a standalone SVG asset.
- **Dossier-folder graphic**: not currently a BURNED asset (in-game
  uses card-style components, not folder-style). Trailer NEEDS this
  for S02/S03/S06 — produced fresh as SVG or Imagen.
- **Pendleton crest at full-poster size**: BURNED has a small crest
  watermark; trailer needs a larger version. Vector source preferred
  (SVG) so resolution-independent for 1920×1080.
- **CASE BANNER + COMMS ticker chrome strips**: SVGs derived from
  BURNED's existing components, sized to trailer scale.

### Music-bed sourcing protocol

Unit 1.7 locked: royalty-free licensed via Artlist or Musicbed,
generative fallback via Suno. Phase 3 EXECUTES the audition + procure.

Audition protocol from Unit 1.7 Step 2 + 3:
- Search Artlist + Musicbed for tags spy + jazz + mid-century brass
- Audition 10–15 candidates against BEAT-SHEET.md timing
- Pick rationale: 95s+ length, cascade-supporting dynamic structure,
  brass/bossa core, license clean, ≤$30 equivalent
- Generative fallback: Suno prompt per Unit 1.7 Step 4

Generative path is only triggered if 15 licensed auditions fail.
Phase 3 documents BOTH outcomes (which licensed candidates auditioned,
why none cleared, generative prompt + output) if fallback fires.

### Mobile safe-square audit at every asset

Every Phase 3 asset has a placement note. Per BEAT-SHEET.md (Phase 1
Unit 1.5 Step 3 + Unit 1.10 Step 4 mobile safe-square audit), critical
narrative elements must live inside the central 1080×1080 square of
the 1920×1080 frame. Assets PLACED outside the safe square (side-band
captions, chrome strips, ticker text) are explicitly OK-to-crop on
mobile — they are flourish, not load-bearing.

Phase 3 marks each asset's "safe-square role" in `visual-manifest.ts`:
`'safe-square'` (in critical 1:1 zone) or `'side-band'` (acceptable
mobile crop).

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

- **HTP capture clones `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`**
  adapted to BURNED's `/howtoplay.html` route. Vite dev server is
  prerequisite; script fails fast if not running.
- **Card-art is curated, never regenerated** per Imagen budget rule.
  Curation table in Unit 3.2 lists which of 17 artworks land in
  cascade halo, S03 roster reveal, and cold-open flashes.
- **Briefing-room assets produced as SVG where vector-friendly**
  (Pendleton crest, blinds shadow), PNG where raster-friendly
  (mahogany desk, dossier-folder texture). SVG preferred —
  resolution-independent, smaller files, edit-friendly.
- **R15 chrome stamps as SVG** with text rendered in Clash Display
  / JetBrains Mono via embedded `<text>` elements. SVG over PNG
  preserves typographic crispness at any scale. Phase 4 imports
  via `<Img src={staticFile('assets/r15-chrome/stamp-1.svg')}>`
  with no resolution penalty.
- **Cold-open operative card template via Imagen (one test image
  first)**. Per Briggsy budget rule. The template hosts existing
  card-art portraits; the chrome (target-reticle + chevrons + name
  plate) is the new generation. <$5 total budget; ONE test, align,
  then batch 3–4 variants if needed.
- **Music bed format: MP3 at 192 kbps**, mono or stereo per source.
  MP3 over WAV for music-bed because:
  - Music-bed has ~95s duration; WAV would be ~16 MB, MP3 ~2 MB.
  - Phase 4 `<Audio>` consumption uses Mediabunny decoder which
    handles MP3 natively.
  - Voice WAVs from Phase 2 use lossless because per-line splicing
    benefits from sample-accurate cuts; music bed doesn't need this.
- **All shell-outs use `execFileSync` argv** (Phase 2 precedent —
  project security convention).
- **Visual manifest is auto-generated from a per-asset metadata
  file.** Manual `visual-manifest.ts` editing is brittle; Phase 3
  produces an asset-inventory generator that walks
  `videos/trailer/public/assets/` and emits the manifest from each
  asset's adjacent `.meta.json` sidecar.

---

## Implementation Units

### Unit 3.1 — HTP Dossier Capture

- [ ] **Unit 3.1: HTP Dossier Capture**

**Goal:** Produce a single fullpage PNG of BURNED's how-to-play
dossier (`src/client/howtoplay/`) rendered with all GSAP ScrollTrigger
animations resolved to their post-reveal state. Output:
`videos/trailer/public/htp-fullpage.png`.

**Requirements:** R10 (HTP dossier hero).

**Dependencies:** None — Phase 3 entry unit. Requires Vite dev server
running at `localhost:5173`.

**Files:**

- Create: `videos/trailer/scripts/capture-htp-scroll-burned.ts` —
  clone of UMB's pattern, adapted to BURNED.
- Create: `videos/trailer/public/htp-fullpage.png` — output.
- Create: `videos/trailer/sample-eval/visual-asset-prep/htp-capture.md` —
  capture proof, dimensions, verification screenshots.

**Approach:**

**Step 1 — UMB pattern study.**

Read `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`.
Pattern shape:

1. Launch Playwright Chromium (1920×1080 viewport).
2. Navigate to local HTP URL (UMB used `localhost:5173/howtoplay.html`).
3. Wait for initial render (network idle + JS-ready).
4. Scroll loop: `page.evaluate(() => window.scrollBy(0, 200))` then
   `await page.waitForTimeout(80)`. Repeat until `document.body.scrollHeight`
   is reached.
5. Scroll back to top (`window.scrollTo(0, 0)`), wait briefly for any
   ScrollTrigger reset behavior.
6. Take fullpage screenshot (`page.screenshot({ fullPage: true, path: ... })`).
7. Report final `scrollHeight` so Phase 4 can compute Remotion
   `<Img>` `translateY` range.

**Step 2 — BURNED adaptation.**

Key adjustments:

- URL: `http://localhost:5173/howtoplay.html` (BURNED's Vite dev path
  per CLAUDE.md "Vite Dev URLs" rule — `.html` extension required).
- Selector waits: BURNED's HTP uses `[data-reveal]` attributes on
  each `DossierPage`. Wait for `'[data-reveal]'` to be present before
  starting the scroll loop.
- Viewport: 1920×1080 matches Remotion render dimensions.
- DPI: 2x device-pixel-ratio for crisp text in 1920×1080 output;
  Playwright option `deviceScaleFactor: 2`.

**Step 3 — Script skeleton.**

```ts
// videos/trailer/scripts/capture-htp-scroll-burned.ts
import 'dotenv/config';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const URL = process.env.HTP_URL ?? 'http://localhost:5173/howtoplay.html';
const OUT = 'videos/trailer/public/htp-fullpage.png';
const META = 'videos/trailer/sample-eval/visual-asset-prep/htp-capture.md';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // 2x DPI for crisp text
  });
  const page = await context.newPage();

  console.log(`NAV  ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-reveal]', { state: 'attached', timeout: 10_000 });

  // Scroll loop — triggers ScrollTrigger animations on each DossierPage
  const initialScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`SCROLL initial scrollHeight=${initialScrollHeight}px`);

  let scrolled = 0;
  while (scrolled < initialScrollHeight + 500) { // small buffer past nominal end
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(80);
    scrolled += 200;
    if (scrolled % 1000 === 0) console.log(`  scrolled ${scrolled}px`);
  }

  // Allow last ScrollTrigger reveals to settle
  await page.waitForTimeout(500);

  // Scroll back to top for capture starting position (and to capture top-of-page sticky elements)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Capture fullpage
  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ fullPage: true, path: OUT });
  console.log(`OK   captured to ${OUT}`);

  const finalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewport = page.viewportSize();

  // Emit metadata
  const meta = `
# HTP Capture — ${new Date().toISOString()}

- Source URL: \`${URL}\`
- Output: \`${OUT}\`
- Viewport: ${viewport?.width}x${viewport?.height} @ DPR 2
- Fullpage height: ${finalHeight}px
- Phase 4 Remotion \`translateY\` range: 0 → -${finalHeight - 1080}px

## Verification

- [ ] Open ${OUT} and visually verify every DossierPage section reveals visible
- [ ] No \`opacity: 0\` elements (ScrollTrigger triggered)
- [ ] Typography sharp (DPR 2 captured)
- [ ] No layout artifacts at section boundaries
`.trim();
  if (!existsSync(dirname(META))) mkdirSync(dirname(META), { recursive: true });
  writeFileSync(META, meta);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 4 — Operator workflow.**

```
pnpm dev                             # in one terminal (Vite + Wrangler launcher)
pnpm tsx videos/trailer/scripts/capture-htp-scroll-burned.ts
```

Script fails fast if `localhost:5173` is unreachable.

**Step 5 — Verification.**

Open `htp-fullpage.png` in any image viewer. Visually verify:

- All 10 DossierPage acts visible (Cover, Mission, Roster, Loop,
  Arsenal, Combos, TurnInheritance, Intercept, Remote, Signoff).
- No element at opacity 0 (ScrollTrigger reveals fired).
- Typography is crisp (DPR 2 captured).
- No layout artifacts at section boundaries (e.g., a mid-scroll
  screenshot that left half a card visible).

If any check fails: route to Step 6 escalation.

**Step 6 — Escalation: Playwright trace-video.**

If static PNG under-delivers, upgrade to MP4 capture via Playwright's
`page.video()` API. The MP4 captures the actual scroll motion with
animations intact.

```ts
// optional: in the same script, replace page.screenshot with:
const context = await browser.newContext({
  recordVideo: { dir: 'videos/trailer/public/', size: { width: 1920, height: 1080 } },
  // ...
});
// after the scroll loop:
await context.close(); // finalizes the video file
```

Output: `videos/trailer/public/htp-scroll.mp4`. Phase 4 imports via
`<OffthreadVideo>` — composes into the cascade similarly to the
static PNG path but with live motion.

Escalation triggers documented in `htp-capture.md`.

**Patterns to follow:**

- UMB v3 capture pattern: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- BURNED's `useScrollReveal()` ScrollTrigger pattern (per
  `src/client/howtoplay/useScrollReveal.ts`) — relevant for the
  `[data-reveal]` selector.
- Playwright `fullPage: true` screenshot pattern.

**Test scenarios:**

- **Happy path:** Vite dev running → script produces 1920×<scrollHeight>px
  PNG with all reveals fired.
- **Edge case:** Vite dev NOT running → script fails fast with clear
  `ECONNREFUSED` error pointing to expected URL.
- **Edge case:** Reveal animations don't trigger (`[data-reveal]`
  selector returns empty) → script logs warning + captures anyway;
  Step 5 verification fails; escalate to Step 6.
- **Performance:** Capture completes in <60s (~50 scroll steps × 80ms
  + 500ms settle + screenshot encode).

**Verification:**

- `htp-fullpage.png` exists with non-zero size.
- `htp-capture.md` documents dimensions + verification checklist.
- Visual inspection passes Step 5 checks.

---

### Unit 3.2 — Card-Art Curation

- [ ] **Unit 3.2: Card-Art Curation**

**Goal:** Curate the 17 existing webp card artworks at
`public/assets/cards/` into trailer-purpose-organized subsets. No new
Imagen generation. Output: organized symlinks / copies + a curation
rationale doc.

**Requirements:** R12 (Imagen card-art curation).

**Dependencies:** None — Phase 3 parallel-OK with Unit 3.1.

**Files:**

- Create: `videos/trailer/public/assets/cards/` — curated subset (or
  symlinks to source).
- Create: `videos/trailer/sample-eval/visual-asset-prep/card-curation.md` —
  per-card selection rationale.

**Approach:**

**Step 1 — Source-asset inventory.**

```
Get-ChildItem ../../public/assets/cards -Filter '*.webp' | Sort-Object Name
```

Expected: 17 webp files. Verify count matches brainstorm + TODO.md
§1. If count differs, update TODO.md / brainstorm / spec per the
single-source rule.

Each artwork is one of:
- **Operative portrait** (named operative — Dash, Vera, Otto, Janet,
  Neal, Sable, Agent X, Dolores Grieves)
- **Action-card illustration** (the 16 non-operative card types —
  Counter, Skip, Future, Steal-2, Steal-3, Burn, Falsify, Defuse,
  See-Future-3, See-Future-5, Shuffle, etc.)

**Step 2 — Trailer-purpose categorization.**

Each artwork is assigned to one or more trailer roles:

| Asset (webp) | Operative? | Cold-open flash | S03 roster reveal | S04 cascade halo | Closing card | Other |
|--------------|-----------|-----------------|-------------------|------------------|--------------|-------|
| `dash-barlowe.webp` | ✓ Dash | ✓ (briefer establishes) | ✓ | ✓ | ✓ | — |
| `vera-aubrey.webp` | ✓ Vera | ✓ (if cold-open speaker) OR scream-target | ✓ | ✓ | — | — |
| `sable-vance.webp` | ✓ Sable | ✓ (if cold-open speaker) | ✓ | ✓ | — | — |
| `janet-mallory.webp` | ✓ Janet (M) | ✓ (if cold-open speaker) | ✓ | ✓ | — | — |
| `otto-...` | ✓ Otto | — | ✓ | ✓ | — | — |
| `neal-...` | ✓ Neal | — | ✓ | ✓ | — | — |
| `agent-x.webp` | ✓ Agent X | — | ✓ (with REDACTED bar over face) | ✓ | — | — |
| `dolores-grieves.webp` | ✓ Dolores NPC | — | — | ✓ (halo only — NPC not in active roster) | — | — |
| `counter.webp` | (action) | — | — | ✓ (halo) | — | — |
| `skip.webp` | (action) | — | — | ✓ (halo) | — | — |
| `burn-the-files.webp` | (action — the BURNED mechanic!) | — | — | ✓ (halo, prominent — this is the card the deck is named for) | — | optional inset on payoff stamp |
| `falsify-intel.webp` | (action) | — | — | ✓ (halo) | — | — |
| `defuse.webp` | (action) | — | — | ✓ (halo) | — | — |
| `steal-2.webp` | (action) | — | — | ✓ (halo) | — | — |
| `steal-3.webp` | (action) | — | — | ✓ (halo) | — | — |
| `see-future-3.webp` | (action) | — | — | ✓ (halo) | — | — |
| `shuffle.webp` | (action) | — | — | ✓ (halo) | — | — |
| `extraction.webp` | (action) | — | — | ✓ (halo) | — | — |

(Final asset names verified by Get-ChildItem; table is illustrative
of curation logic.)

**Step 3 — Cold-open flash selection (per Unit 1.5 Step 2 + Unit 1.10).**

S01 (frames 0–210) shows 3 operative cards flash:
- Frame 30–90: cold-open speaker portrait (Vera/Sable/Janet — per Phase 0
  Unit 0.3 outcome)
- Frame 90–150: Dash portrait (the briefer)
- Frame 150–210: one more operative (Otto / Neal / Sable — for cast
  density)

Lock the third operative based on **named-operative density bar-raise**
(Success Criteria axis 1): pick the operative MOST visually distinct
from cold-open speaker + Dash to maximize "different operatives per
sampled frame." If cold-open speaker is Vera (woman, dark hair), Dash
(man, mid-tone), third should be light-toned or markedly different —
e.g., Sable (woman, blonde) or Otto (man, dark).

**Step 4 — S03 roster reveal selection.**

S03 (frames 750–1050) shows all 7 active-roster operatives slide in
along the right edge (Unit 1.10 Step 1). All 7 included; Agent X
displayed with REDACTED bar over face (existing BURNED chrome from
Card component); Dolores NPC excluded (she's HR-Director NPC, not
active-roster).

Required asset prep: assemble Agent X's portrait with the REDACTED-
bar overlay as a single composite. Either:
- Source from `src/client/board/MinimalCard.module.css` rendered live
  via the same Playwright pattern as Unit 3.1, OR
- Composite via Phase 4 React component in Remotion at scene-build
  time. (Decision deferred to Phase 4 — Phase 3 ships both the bare
  portrait AND the REDACTED-bar SVG so Phase 4 can compose either way.)

**Step 5 — S04 cascade halo cluster.**

The halo cluster at frames 1410–1560 reveals card portraits around the
HTP hero, then expands to a 17-mosaic halo at frames 1560–1860 (per
Unit 1.5 Step 2).

For the 3-card right-edge halo opener: Vera + Otto + Neal (per Unit
1.5 Step 2 cue table at frame 1410).

For the 17-mosaic halo: ALL 17 artworks, arranged in a ring around the
HTP hero. Phase 4 lays out the ring; Phase 3 just ensures all 17 files
are present in `videos/trailer/public/assets/cards/`.

**Step 6 — Closing-card image.**

S06 (frames 2580–2850) renders the BURNED logo center-frame at 2790.
Question: does the closing card include any card art or just the
logo + R15 subhead?

Per Unit 1.10 Step 1 (S06 visual): the dossier closes (reverse of S02
opening), BURNED logo lands, R15 stamp #4 slaps on. **No card art in
S06.** The logo + dossier-folder-closing graphic + R15 stamp carry
the closing frame. Dash card art appears only in S02/S03 (briefing
context); S06 doesn't need a portrait.

Mark: no card-art assignment to S06 in this curation pass.

**Step 7 — Symlink vs copy.**

Three options for asset organization:

| Option | Pros | Cons |
|--------|------|------|
| **Symlinks** from `videos/trailer/public/assets/cards/` to BURNED's `public/assets/cards/*.webp` | Single source of truth; if BURNED regens card art, trailer auto-picks up | Windows symlink support requires admin OR developer mode; Briggsy's environment may not have this set; portability risk |
| **Copies** | Self-contained trailer project; no symlink dependency | Drift risk if BURNED card art updates and trailer copies aren't synced |
| **Remotion `staticFile()` path traversal** (`../../public/assets/cards/...`) | No duplication; Remotion supports relative paths | Phase 0 ADR #8 set `Config.setPublicDir('../../public')` — trailer already reads BURNED's `public/` directly. **No symlinks/copies needed.** |

**Lock**: Option 3. Phase 0 ADR #8 already locked
`Config.setPublicDir('../../public')` for exactly this reason — the
trailer reads BURNED's existing `public/` without duplication. Phase 3
Unit 3.2 documents the curation in `card-curation.md` but does NOT
move card-art files. Phase 4 imports via
`staticFile('assets/cards/dash-barlowe.webp')` and the path resolves
to BURNED's existing files.

Card-art curation outputs:
- A documentation pass (`card-curation.md`)
- A typed export `videos/trailer/src/lib/card-roster.ts` declaring
  which webps appear in which trailer role, so Phase 4 imports a
  named const (`COLD_OPEN_CARDS`, `S03_ROSTER`, `CASCADE_HALO_17`)
  not a magic string.

**Step 8 — `card-roster.ts`.**

```ts
// videos/trailer/src/lib/card-roster.ts
export interface CardRosterEntry {
  /** webp filename relative to public/assets/cards/. */
  filename: string;
  /** Display name for chrome labels in S03 roster reveal. */
  displayName: string;
  /** True if active-roster operative (vs action card or NPC). */
  isOperative: boolean;
  /** Trailer role assignments. */
  roles: ReadonlyArray<'cold-open' | 's03-roster' | 'cascade-halo-3' | 'cascade-halo-17'>;
}

export const CARD_ROSTER: readonly CardRosterEntry[] = [
  // populated per Step 2–6 curation, against actual filenames verified by Get-ChildItem
  // ...
] as const;

export const COLD_OPEN_CARDS = CARD_ROSTER.filter((c) => c.roles.includes('cold-open'));
export const S03_ROSTER = CARD_ROSTER.filter((c) => c.roles.includes('s03-roster'));
export const CASCADE_HALO_3 = CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo-3'));
export const CASCADE_HALO_17 = CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo-17'));
```

**Patterns to follow:**

- BURNED's existing card-art organization at `public/assets/cards/`.
- `feedback-imagen-budget.md` — no new Imagen runs without budget
  justification.
- Phase 0 ADR #8 (`setPublicDir('../../public')`) — read upstream
  assets, don't duplicate.

**Test scenarios:**

- **Happy path:** `card-roster.ts` typechecks; all referenced webp
  files exist in BURNED's `public/assets/cards/`.
- **Verification:** Vitest test (`card-roster.test.ts`) asserts every
  filename exists via `existsSync('public/assets/cards/' + entry.filename)`.
- **Edge case:** Brainstorm-stated card count (17) doesn't match actual
  Get-ChildItem count → flag in `card-curation.md`, update TODO/spec
  per single-source rule.
- **Edge case:** Operative count vs active-roster count drift → audit
  against brainstorm "7 operatives in active roster" claim.

**Verification:**

- `card-curation.md` exists with per-card rationale.
- `card-roster.ts` exists; test passes (all referenced files
  resolvable).
- No card art moved or copied (Phase 0 ADR #8 honored).

---

### Unit 3.3 — Briefing-Room Set-Dressing

- [ ] **Unit 3.3: Briefing-Room Set-Dressing**

**Goal:** Produce static visual assets for the briefing-room
environment that Phase 4 composes into S02 / S03 / S06: mahogany desk
surface, venetian-blind shadow, dossier-folder graphic, Pendleton crest
at trailer-poster size, CASE BANNER + COMMS ticker chrome strips.

**Requirements:** R1 (in-world Pendleton briefing).

**Dependencies:** None — parallel with Units 3.1 + 3.2.

**Files:**

- Create: `videos/trailer/public/assets/briefing-room/mahogany-desk.png` —
  desk surface, full-bleed 1920×1080.
- Create: `videos/trailer/public/assets/briefing-room/venetian-blinds.svg` —
  shadow mask layer.
- Create: `videos/trailer/public/assets/briefing-room/dossier-folder-closed.svg`
- Create: `videos/trailer/public/assets/briefing-room/dossier-folder-open.svg`
- Create: `videos/trailer/public/assets/briefing-room/pendleton-crest.svg` —
  trailer-poster size, vector.
- Create: `videos/trailer/public/assets/briefing-room/case-banner-strip.svg`
- Create: `videos/trailer/public/assets/briefing-room/comms-ticker-strip.svg`
- Create: `videos/trailer/sample-eval/visual-asset-prep/briefing-room-assets.md`

**Approach:**

**Step 1 — Mahogany desk surface.**

BURNED renders this in-game via CSS:
- `background: linear-gradient(...)` with mahogany tones
- Subtle wood-grain texture overlay (could be a CSS-painted SVG noise filter, or an existing texture image)

For the trailer, render this as a static 1920×1080 PNG:

Option A — **Rasterize from BURNED component**. Use Playwright to
navigate to a board view, take a screenshot, crop to a single mahogany
section. Pro: pixel-match with in-game style.

Option B — **Imagen generation**. Generate a "mahogany executive desk
surface, top-down view, subtle wood grain, warm amber tones, briefing-
room lighting" via Imagen 4 (per `feedback-imagen4-over-nbp.md`). One
test image first per budget rule.

**Lock**: Option A. Self-rasterize from BURNED's existing CSS via
Playwright — guarantees visual continuity with the in-game arena
(brainstorm key invariant). Capture script:

```ts
// scripts/capture-mahogany-desk.ts
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Inject the briefing-room background HTML as a standalone test page,
  // OR navigate to an existing BURNED dev URL with the briefing background.
  // For trailer prep, simplest: load a minimal HTML with BURNED's CSS
  // tokens applied to a full-viewport div with the mahogany background.

  await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="http://localhost:5173/src/client/board/semantic.board.css">
  <style>
    html, body { margin: 0; height: 100vh; }
    body { background: var(--color-mahogany, #4a2c1e); /* + texture per token */ }
  </style>
</head>
<body></body>
</html>`);

  await page.waitForTimeout(500);
  if (!existsSync('videos/trailer/public/assets/briefing-room')) {
    mkdirSync('videos/trailer/public/assets/briefing-room', { recursive: true });
  }
  await page.screenshot({ path: 'videos/trailer/public/assets/briefing-room/mahogany-desk.png' });
  await browser.close();
}
main();
```

If the simple-setContent approach doesn't pick up CSS tokens (Vite
dev server context lost), fall back to navigating to BURNED's actual
board route and cropping.

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

**Step 4 — Pendleton crest (trailer-poster size).**

BURNED's existing crest is at HTP-asset-size in `public/assets/`.
For trailer use (S02 corner watermark, S06 closing-folder dressing),
the crest needs to scale crisply to ~200px wide. Vector source is
preferred.

Approach: re-export BURNED's existing crest from its source SVG (if
exists in repo) OR commission an Imagen-style vectorization
(SVG-rasterize → Imagen "render this Pendleton agency crest as a
detailed vector emblem in 1960 spy-agency style" → use the result).

**Lock**: re-export from BURNED's existing SVG source. The crest
exists somewhere in BURNED's `public/` or `src/assets/`. Locate via
Glob; use the existing file.

```
Glob "**/pendleton-crest*"
Glob "**/crest*.svg"
```

If no SVG source exists (only PNG): Imagen-generate a vectorizable
version at <$1 budget.

**Step 5 — CASE BANNER + COMMS ticker chrome strips.**

BURNED's existing components:
- `src/client/board/CaseBanner.tsx` — top-strap chrome with
  "OPERATION PENDLETON" + case-banner-style typography
- `src/client/board/DossierFeed.tsx` — bottom-edge ticker with idle
  text rotation

For the trailer, render static SVG versions:

**`case-banner-strip.svg`** — 1920×80 chrome strip with placeholder
text region where Phase 4 fills in scene-specific copy.

**`comms-ticker-strip.svg`** — 1920×40 chrome strip, JetBrains Mono
typography, placeholder text region for the rotating ticker copy.

Both produced as templates; Phase 4 overlays specific copy at the
right frames via `<text>` elements or React-rendered text composited
over the SVG.

**Step 6 — Inventory documentation.**

`briefing-room-assets.md`:

```md
# Briefing-Room Asset Inventory

| Asset | Format | Dimensions | Source method | Verification |
|-------|--------|------------|---------------|--------------|
| mahogany-desk.png | PNG @ 2x DPR | 3840×2160 | Playwright capture from BURNED CSS tokens | Visual: warm amber tone, subtle grain |
| venetian-blinds.svg | SVG vector | 1920×1080 viewport | Hand-authored | Visual: 6 horizontal bands, edge-faded |
| dossier-folder-closed.svg | SVG vector | 1000×1300 viewport | Hand-authored | Visual: manila-tone, crest centered, classification stamp |
| dossier-folder-open.svg | SVG vector | 1000×1300 viewport | Hand-authored | Visual: folder open state with case-sheet inside |
| pendleton-crest.svg | SVG vector | 400×400 viewport | Re-export from BURNED source | Visual: matches in-game crest |
| case-banner-strip.svg | SVG vector | 1920×80 | Hand-authored from BURNED component | Visual: matches in-game CaseBanner |
| comms-ticker-strip.svg | SVG vector | 1920×40 | Hand-authored from BURNED component | Visual: matches in-game DossierFeed |
```

**Patterns to follow:**

- BURNED arena vocabulary (per `project-burned-arena-direction`).
- SVG-first authoring (resolution independence + edit-friendliness).
- Playwright capture for CSS-token-driven backgrounds.

**Test scenarios:**

- **Happy path:** Every asset file lands at expected path.
- **Visual:** Render each SVG in a browser; verify visual match to
  in-game arena.
- **Edge case:** mahogany-desk capture without Vite dev server →
  setContent fallback used.
- **Edge case:** Pendleton crest SVG source not found in BURNED →
  Imagen-generate at <$1 budget; document in inventory.

**Verification:**

- 7 asset files in `videos/trailer/public/assets/briefing-room/`.
- `briefing-room-assets.md` documents each asset.
- Visual inspection passes BURNED arena-vocabulary match.

---

### Unit 3.4 — R15 Chrome Stamps

- [ ] **Unit 3.4: R15 Chrome Stamps**

**Goal:** Produce the 4 R15 on-screen text signal assets per Unit
1.9's locked copy. Each as SVG with embedded typography.

**Requirements:** R15 (on-screen text signal layer).

**Dependencies:** Unit 1.9 (R15 copy lock), Unit 1.8 (typography
stack lock).

**Files:**

- Create: `videos/trailer/public/assets/r15-chrome/stamp-1-operation-pendleton.svg`
- Create: `videos/trailer/public/assets/r15-chrome/ticker-2-method-repeatable.svg`
- Create: `videos/trailer/public/assets/r15-chrome/stamp-3-asset-delivered.svg`
- Create: `videos/trailer/public/assets/r15-chrome/subhead-4-agent-built.svg`
- Create: `videos/trailer/sample-eval/visual-asset-prep/r15-chrome.md`

**Approach:**

**Step 1 — R15 instance #1: classification stamp (S01 cold open, frame 150).**

Copy: **"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"**

Treatment: classification stamp, lower-left, slight rotation (~-8°
for stamp-slap reality), red-or-ochre ink on cream stamp paper
edges, JetBrains Mono 700 28px.

```svg
<!-- stamp-1-operation-pendleton.svg -->
<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="inkBleed">
      <feTurbulence baseFrequency="0.9" numOctaves="2" />
      <feDisplacementMap in="SourceGraphic" scale="2" />
    </filter>
  </defs>
  <g transform="rotate(-8 400 120)">
    <!-- Stamp paper outline -->
    <rect x="40" y="20" width="720" height="200" fill="none" stroke="#947226" stroke-width="6" />
    <text x="400" y="80"  text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="28"
          fill="#947226"
          filter="url(#inkBleed)">
      OPERATION PENDLETON
    </text>
    <text x="400" y="120" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="28"
          fill="#947226"
          filter="url(#inkBleed)">
      CASE FILE 02
    </text>
    <text x="400" y="180" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="32"
          fill="#947226"
          filter="url(#inkBleed)">
      METHOD: AUTONOMOUS
    </text>
  </g>
</svg>
```

Note: color hex must be VERBAL ("ochre") in the trailer Imagen brief
if Imagen-generated; here as SVG it's a CSS color. Per
`feedback-imagen-hex-codes-bake-in.md` (TODO.md landmine), hex codes
in Imagen prompts render as literal text. SVG doesn't have this issue.

**Step 2 — R15 instance #2: comms-ticker pulse (S04 cascade, frame 1680).**

Copy: **"OPERATIVE [REDACTED] — METHOD REPEATABLE"**

Treatment: ticker text scrolling left-to-right along bottom edge,
JetBrains Mono 500 22px, ochre ink on dark briefing-bottom strip.

```svg
<!-- ticker-2-method-repeatable.svg -->
<svg viewBox="0 0 1920 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1920" height="40" fill="#1a1a1a" />
  <text x="960" y="28" text-anchor="middle"
        font-family="JetBrains Mono" font-weight="500" font-size="22"
        fill="#947226">
    OPERATIVE [REDACTED] — METHOD REPEATABLE
  </text>
</svg>
```

Phase 4 may animate the text position for scrolling effect, OR leave
static if the read holds at 22px.

**Step 3 — R15 instance #3: stacked-payoff stamp (S04, frame 1950).**

Copy: **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"**

Treatment: BIG dossier stamp center-frame, JetBrains Mono 700 38px,
burn-fire ink (red-orange, BURNED's signature color), heavier
ink-bleed filter (this is the trailer's load-bearing visual stamp).

```svg
<!-- stamp-3-asset-delivered.svg -->
<svg viewBox="0 0 1200 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="heavyInkBleed">
      <feTurbulence baseFrequency="0.7" numOctaves="3" />
      <feDisplacementMap in="SourceGraphic" scale="4" />
    </filter>
  </defs>
  <g transform="rotate(-3 600 140)">
    <rect x="40" y="20" width="1120" height="240" fill="none" stroke="#c63b1e" stroke-width="8" />
    <text x="600" y="120" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="38"
          fill="#c63b1e"
          filter="url(#heavyInkBleed)">
      AUTONOMOUS FIELD UNIT
    </text>
    <text x="600" y="200" text-anchor="middle"
          font-family="JetBrains Mono" font-weight="700" font-size="42"
          fill="#c63b1e"
          filter="url(#heavyInkBleed)">
      ASSET DELIVERED
    </text>
  </g>
</svg>
```

**Step 4 — R15 instance #4: closing subhead (S06, frame 2800).**

Copy: **"AGENT-BUILT, ARCHER-GRADE"**

Treatment: subhead under BURNED logo, JetBrains Mono 700 32px, ochre
ink on cream parchment.

```svg
<!-- subhead-4-agent-built.svg -->
<svg viewBox="0 0 800 60" xmlns="http://www.w3.org/2000/svg">
  <text x="400" y="40" text-anchor="middle"
        font-family="JetBrains Mono" font-weight="700" font-size="32"
        fill="#947226">
    AGENT-BUILT, ARCHER-GRADE
  </text>
</svg>
```

**Step 5 — Font-asset embedding.**

The SVGs reference `font-family="JetBrains Mono"`. Remotion loads the
font via `useFonts()` (Phase 1 Unit 1.8 / Phase 0 Unit 0.5 Unit 0.1).
The font load completes BEFORE the SVG renders in MP4 export — per
`@remotion/fonts.loadFont()` auto-block behavior. Verified by Phase 0
spike.

**Step 6 — Inventory documentation.**

`r15-chrome.md`:

```md
# R15 Chrome Asset Inventory

| Instance | Frame | File | Dimensions | Treatment |
|----------|-------|------|------------|-----------|
| #1 Classification stamp | 150 (S01) | stamp-1-operation-pendleton.svg | 800×240 | -8° rotation, ochre ink, JetBrains Mono 700 28px |
| #2 Comms ticker pulse | 1680 (S04) | ticker-2-method-repeatable.svg | 1920×40 | Bottom-strip ticker, JetBrains Mono 500 22px |
| #3 Stacked-payoff stamp | 1950 (S04) | stamp-3-asset-delivered.svg | 1200×280 | -3° rotation, burn-fire ink, JetBrains Mono 700 38–42px |
| #4 Closing subhead | 2800 (S06) | subhead-4-agent-built.svg | 800×60 | Centered, ochre ink, JetBrains Mono 700 32px |

## Verification

- [ ] Each SVG renders in browser with JetBrains Mono loaded (Adobe
  Fonts / local woff2)
- [ ] Each SVG composites cleanly over its target background
- [ ] Ink-bleed filter renders without artifacts at 1920×1080 final
- [ ] Color contrast acceptable on cream/parchment background
```

**Patterns to follow:**

- BURNED chrome typography (per CLAUDE.md typography section).
- SVG filter primitives (`feTurbulence` + `feDisplacementMap` for
  ink-bleed).
- Phase 1 Unit 1.9 R15 copy lock (verbatim copy).

**Test scenarios:**

- **Happy path:** Each SVG renders in a test HTML page with the
  expected typography + treatment.
- **Edge case:** Font fallback if JetBrains Mono not loaded — verify
  Phase 4 useFonts.ts loads before render.
- **Edge case:** Ink-bleed filter performance at 1920×1080 export —
  if filter is slow, simplify or rasterize once.
- **Accessibility:** Color blind safe — ochre + burn-fire both
  distinguishable from cream by luminance, not hue alone.

**Verification:**

- 4 SVG files in `videos/trailer/public/assets/r15-chrome/`.
- `r15-chrome.md` documents each instance.
- Visual inspection: each SVG matches Unit 1.9 treatment specs.

---

### Unit 3.5 — Music Bed Procurement

- [ ] **Unit 3.5: Music Bed Procurement**

**Goal:** Audition + procure the licensed music bed track per Unit
1.7 lock. Or trigger the generative-Suno fallback if 15 auditions
fail.

**Requirements:** R9 (Archer-coded mid-century brass / bossa).

**Dependencies:** Unit 1.7 (source decision locked).

**Files:**

- Create: `videos/trailer/public/audio/music-bed.mp3` — the licensed
  track.
- Create: `videos/trailer/sample-eval/visual-asset-prep/music-license.pdf` —
  license document.
- Create: `videos/trailer/sample-eval/visual-asset-prep/music-audition-log.md`

**Approach:**

**Step 1 — Audition workflow.**

Per Unit 1.7 Step 2 audition protocol:

1. Artlist search: tags = `spy + jazz + 60s + mid-century brass`.
   Pull top 10 results.
2. Musicbed search: tags = `mid-century + brass + bossa`. Pull top 5
   results.
3. For each candidate, download/stream + audition against BEAT-SHEET.md
   timing:
   - 95s+ playable length OR loop-friendly
   - Cascade-friendly structure (intro → build → peak → fall →
     close)
   - Brass / bossa core (NOT piano-led generic)
   - License covers portfolio + Twitter distribution
   - ≤$30/track equivalent at subscription rate

**Step 2 — Audition log.**

```md
# Music Audition Log

| # | Source | Track | License | Length | Cascade-structure? | Verdict |
|---|--------|-------|---------|--------|--------------------|---------|
| 1 | Artlist | <name> | <terms> | 120s | yes | Audition / Pass |
| 2 | Artlist | <name> | <terms> | 95s | no (no peak) | Pass |
| ... | | | | | | |
```

Documented per audition. Pick rationale recorded for the lock.

**Step 3 — Procurement + encoding.**

For the locked track:
- Download from Artlist / Musicbed at highest available quality (WAV /
  FLAC).
- Re-encode to MP3 192 kbps for `public/audio/music-bed.mp3` (smaller
  file, Remotion-compatible).
- File license document to `music-license.pdf`.

```ts
// scripts/encode-music-bed.ts
import { execFileSync } from 'node:child_process';

// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-i', 'source-music-bed.wav',
  '-codec:a', 'libmp3lame',
  '-b:a', '192k',
  'videos/trailer/public/audio/music-bed.mp3',
]);
```

**Step 4 — Generative fallback (only if Step 1 fails 15 auditions).**

Per Unit 1.7 Step 4 Suno prompt template. Generative path triggered
only when:
- 15 licensed auditions fail to land mood/structure/budget
- Briggsy approves the fallback escalation

If triggered:
- Run Suno prompt
- Re-encode output to MP3 192 kbps
- File generative rights documentation (Suno Pro tier commercial use
  terms) to `music-license.pdf`
- Document in `music-audition-log.md` that fallback fired + why

**Step 5 — Music-cue map verification.**

Per Unit 1.7 Step 5 music-cue map, verify the locked track supports
the volume + dynamic transitions called for at each scene boundary.
If the track's intrinsic dynamics conflict with the cue map (e.g.,
no natural fall at frame 1995 cross-dissolve), Phase 4 handles via
manual `volume` automation in `<Audio>` interpolation — track choice
isn't blocked.

**Patterns to follow:**

- UMB v3 music procurement workflow (Suno + license documentation).
- `feedback-imagen-budget.md` audition-first discipline (one
  candidate first, align, batch).
- `execFileSync` argv pattern for FFmpeg encode.

**Test scenarios:**

- **Happy path:** A licensed track lands within 15 auditions.
- **Happy path:** MP3 file at expected path with correct bitrate.
- **Edge case:** 15 auditions fail → generative fallback triggered
  with Briggsy approval logged.
- **License-check:** Both licensed and generative paths produce a
  `music-license.pdf` (or terms-page archive) for portfolio
  defensibility.
- **Security:** No shell-string interpolation in FFmpeg encode.

**Verification:**

- `music-bed.mp3` at expected path; FFprobe verifies bitrate +
  duration.
- `music-license.pdf` filed.
- `music-audition-log.md` documents pick rationale.

---

### Unit 3.6 — Cold-Open Title-Sequence Assets

- [ ] **Unit 3.6: Cold-Open Title-Sequence Assets**

**Goal:** Produce the compressed-Archer cold-open visual elements —
operative card frame templates, chevron / target-reticle motifs, and
the BURNED logo treatment for the cold-open landing card.

**Requirements:** R14 (compressed-Archer cold-open).

**Dependencies:** Unit 3.2 (card-art curation; cold-open card
selections), Unit 1.4 (transition vocabulary — stamp-slap precedent),
Unit 1.8 (typography).

**Files:**

- Create: `videos/trailer/public/assets/title-sequence/operative-card-frame.svg` —
  template chrome (chevron + target-reticle + name-plate frame); the
  operative portrait fills the center.
- Create: `videos/trailer/public/assets/title-sequence/chevron-motif-bg.svg` —
  background chevron pattern (Bass / Ferro lineage).
- Create: `videos/trailer/public/assets/title-sequence/burned-logo-cold-open.svg` —
  bold mid-century geometric BURNED treatment for the cold-open
  landing card (frame 180–210).
- Create: `videos/trailer/public/assets/title-sequence/burned-logo-closing.svg` —
  closing-card BURNED treatment (S06 frame 2790). Likely the same logo
  as cold-open, but isolated file simplifies Phase 4 imports.
- Create: `videos/trailer/sample-eval/visual-asset-prep/title-sequence.md`

**Approach:**

**Step 1 — Operative card frame template.**

Inspired by Archer's title-sequence card-flash frames — bold
geometric chrome, target-reticle motif, name-plate at bottom edge.

```svg
<!-- operative-card-frame.svg -->
<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
  <!-- Bold border -->
  <rect x="20" y="20" width="760" height="960" fill="none" stroke="#947226" stroke-width="12" />
  <!-- Inner shadow band -->
  <rect x="40" y="40" width="720" height="920" fill="none" stroke="#947226" stroke-width="2" />
  <!-- Target-reticle motif in upper-right corner -->
  <g transform="translate(680 60)">
    <circle cx="0" cy="0" r="60" fill="none" stroke="#947226" stroke-width="3" />
    <circle cx="0" cy="0" r="40" fill="none" stroke="#947226" stroke-width="2" />
    <circle cx="0" cy="0" r="4"  fill="#c63b1e" />
    <line x1="-80" y1="0" x2="-65" y2="0" stroke="#947226" stroke-width="3" />
    <line x1="65"  y1="0" x2="80"  y2="0" stroke="#947226" stroke-width="3" />
    <line x1="0" y1="-80" x2="0" y2="-65" stroke="#947226" stroke-width="3" />
    <line x1="0" y1="65"  x2="0" y2="80"  stroke="#947226" stroke-width="3" />
  </g>
  <!-- Center region: operative portrait (Phase 4 fills via Img layer) -->
  <rect x="100" y="100" width="600" height="700" fill="#1a1a1a" /> <!-- placeholder -->
  <!-- Name-plate strip at bottom -->
  <rect x="40" y="840" width="720" height="120" fill="#947226" />
  <text x="400" y="910" text-anchor="middle"
        font-family="Clash Display" font-weight="700" font-size="72"
        fill="#1a1a1a">
    OPERATIVE NAME
  </text>
</svg>
```

Phase 4 imports this frame template + per-operative portrait images
+ overlays the operative's actual name (Dash / Vera / etc.) via React
text composition.

**Step 2 — Chevron motif background.**

A subtle diagonal-chevron repeating pattern for the cold-open
background:

```svg
<!-- chevron-motif-bg.svg -->
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"
     preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="chevronPattern" x="0" y="0" width="120" height="120"
             patternUnits="userSpaceOnUse">
      <path d="M0,60 L60,0 L120,60 L60,120 Z" fill="none" stroke="#947226"
            stroke-width="2" opacity="0.12" />
    </pattern>
  </defs>
  <rect x="0" y="0" width="1920" height="1080" fill="#1a1a1a" />
  <rect x="0" y="0" width="1920" height="1080" fill="url(#chevronPattern)" />
</svg>
```

**Step 3 — BURNED logo treatment.**

Hand-author SVG in Clash Display 700 (very large — ~360px tall),
classification-stamp aesthetic, bold mid-century geometric. Two
variants:

- **Cold-open landing** (frame 180–210): logo lands with stamp-slap
  motion, possibly with subtle ink-bleed.
- **Closing** (frame 2790): same logo treatment, R15 #4 subhead
  added below per Unit 1.9.

```svg
<!-- burned-logo-cold-open.svg -->
<svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
  <text x="600" y="280" text-anchor="middle"
        font-family="Clash Display" font-weight="700" font-size="320"
        fill="#c63b1e"
        letter-spacing="-8">
    BURNED
  </text>
</svg>
```

(Logo treatment may refine in Phase 4 with kerning / weight tuning;
Phase 3 ships a clean baseline.)

**Step 4 — Optional Imagen pass for logo polish.**

If the hand-authored SVG doesn't carry trailer-grade visual weight,
escalate to Imagen 4 (per `feedback-imagen4-over-nbp.md`):

Imagen prompt template (NO hex codes — per the HTP landmine):
> *"BURNED — bold mid-century geometric logotype, ~10 inches wide on
> a vintage spy-agency dossier, warm burnt-orange ink, slight stamp-
> rotation, ink-bleed edges, 1962 Bass / Ferro influence. Single
> word centered on a cream parchment field."*

Budget: <$2 (test image first, align, batch only if needed).

**Step 5 — Inventory documentation.**

`title-sequence.md`:

```md
# Title-Sequence Asset Inventory

| Asset | Format | Use | Source |
|-------|--------|-----|--------|
| operative-card-frame.svg | SVG vector | S01 card-flash chrome template | Hand-authored |
| chevron-motif-bg.svg | SVG vector | S01 background | Hand-authored, pattern primitive |
| burned-logo-cold-open.svg | SVG vector | S01 landing (frame 180–210) | Hand-authored Clash Display |
| burned-logo-closing.svg | SVG vector | S06 closing (frame 2790) | Hand-authored Clash Display |
```

**Patterns to follow:**

- Archer title-sequence aesthetic (bold mid-century, Bass / Ferro).
- `feedback-imagen-budget.md` — one test first, align, batch.
- BURNED's existing chrome typography (Clash Display 700 — per spec).

**Test scenarios:**

- **Happy path:** Each SVG renders cleanly with embedded font fallback.
- **Visual:** Operative card frame template composites with an actual
  card portrait at 1920×1080 → fills frame well, name-plate readable.
- **Edge case:** Imagen-polished logo escalation under <$2 budget.

**Verification:**

- 4 SVG files in `videos/trailer/public/assets/title-sequence/`.
- `title-sequence.md` documents each asset.
- Visual inspection: card-frame template composites cleanly with
  Phase 4 portrait overlays.

---

### Unit 3.7 — Visual Manifest + Phase 4 Hand-Off

- [ ] **Unit 3.7: Visual Manifest + Phase 4 Hand-Off**

**Goal:** Single typed manifest Phase 4 imports to access every Phase
3 asset. Asset-walker codegen pattern (mirrors Phase 2's audio
manifest).

**Requirements:** Cross-cutting — Phase 4 needs to load each visual
asset by named import.

**Dependencies:** Units 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 complete.

**Files:**

- Create: `videos/trailer/src/lib/visual-manifest.ts` — typed
  manifest.
- Create: `videos/trailer/scripts/generate-visual-manifest.ts` —
  codegen.
- Create: `videos/trailer/sample-eval/visual-asset-prep/asset-inventory.md`

**Approach:**

**Step 1 — Manifest type.**

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

export interface VisualAsset {
  category: AssetCategory;
  /** Static-file path consumable by Remotion staticFile(). */
  staticPath: string;
  /** Used by Phase 4 for mobile crop discipline. */
  safeSquareRole: SafeSquareRole;
  /** Optional dimensions for layout calculations. */
  width?: number;
  height?: number;
  /** Optional notes (e.g., "fullpage capture, scroll range 0 → -8400px"). */
  notes?: string;
}

export const VISUAL_ASSETS: readonly VisualAsset[] = [
  {
    category: 'htp',
    staticPath: 'htp-fullpage.png',
    safeSquareRole: 'safe-square',
    notes: 'Fullpage capture; Phase 4 Remotion <Img> with translateY animation',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/briefing-room/mahogany-desk.png',
    safeSquareRole: 'safe-square',
    width: 3840,
    height: 2160,
    notes: 'Full-bleed background',
  },
  // ... auto-generated, see codegen below
] as const;
```

**Step 2 — Codegen script.**

```ts
// videos/trailer/scripts/generate-visual-manifest.ts
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const publicDir = 'videos/trailer/public';

const categories: Record<string, string> = {
  '/htp-fullpage.png':         'htp',
  '/assets/cards':             'cards',
  '/assets/briefing-room':     'briefing-room',
  '/assets/r15-chrome':        'r15-chrome',
  '/assets/title-sequence':    'title-sequence',
  '/audio':                    'audio',
};

const entries: any[] = [];

function walk(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!/\.(png|svg|webp|jpg|mp3|wav)$/i.test(entry)) continue;
    const staticPath = relative(publicDir, full).replace(/\\/g, '/');
    const cat = Object.entries(categories).find(([prefix]) =>
      ('/' + staticPath).startsWith(prefix)
    )?.[1];
    if (!cat) continue;
    entries.push({
      category: cat,
      staticPath,
      safeSquareRole: 'safe-square', // default; per-asset overrides in adjacent .meta.json
    });
  }
}

walk(publicDir);

// Sort for stable output
entries.sort((a, b) => a.staticPath.localeCompare(b.staticPath));

const tsBody = `
// AUTOGENERATED by scripts/generate-visual-manifest.ts — do not edit by hand.

export type AssetCategory =
  | 'htp'
  | 'cards'
  | 'briefing-room'
  | 'r15-chrome'
  | 'title-sequence'
  | 'audio';

export type SafeSquareRole = 'safe-square' | 'side-band';

export interface VisualAsset {
  category: AssetCategory;
  staticPath: string;
  safeSquareRole: SafeSquareRole;
  width?: number;
  height?: number;
  notes?: string;
}

export const VISUAL_ASSETS: readonly VisualAsset[] = ${JSON.stringify(entries, null, 2)} as const;
`.trim();

writeFileSync('videos/trailer/src/lib/visual-manifest.ts', tsBody + '\n');
console.log(`OK visual-manifest.ts generated with ${entries.length} entries`);
```

**Step 3 — Asset-inventory README.**

```md
# Phase 3 Asset Inventory

## HTP capture
- [x] htp-fullpage.png             (BURNED howtoplay fullpage)

## Card art (via Phase 0 ADR #8 — read from ../../public/assets/cards)
- [x] card-roster.ts               (17 entries, see Unit 3.2)

## Briefing-room set-dressing
- [x] mahogany-desk.png
- [x] venetian-blinds.svg
- [x] dossier-folder-closed.svg
- [x] dossier-folder-open.svg
- [x] pendleton-crest.svg
- [x] case-banner-strip.svg
- [x] comms-ticker-strip.svg

## R15 chrome (4 instances per Unit 1.9)
- [x] stamp-1-operation-pendleton.svg
- [x] ticker-2-method-repeatable.svg
- [x] stamp-3-asset-delivered.svg
- [x] subhead-4-agent-built.svg

## Title-sequence
- [x] operative-card-frame.svg
- [x] chevron-motif-bg.svg
- [x] burned-logo-cold-open.svg
- [x] burned-logo-closing.svg

## Music
- [x] music-bed.mp3                (license filed at music-license.pdf)

## Manifests
- [x] src/lib/card-roster.ts
- [x] src/lib/visual-manifest.ts

## Phase 4 hand-off
- Phase 4 scene files import named consts from visual-manifest.ts
  + card-roster.ts
- Phase 4 imports audio assets via Phase 2's audio-manifest.ts
- No further asset generation needed in Phase 4 (composition only)
```

**Patterns to follow:**

- Phase 2 manifest codegen pattern (same approach).
- TypeScript `as const` + JSON.stringify.

**Test scenarios:**

- **Happy path:** All assets present; manifest contains all entries;
  typecheck clean.
- **Edge case:** Asset missing → codegen warns; manifest emits anyway;
  Phase 4 import resolves to a clear error at scene-build time.

**Verification:**

- `visual-manifest.ts` typechecks; entry count matches inventory.
- `asset-inventory.md` all green.
- Phase 4 hand-off ready.

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

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| HTP static capture under-delivers visually | Medium | Medium | Unit 3.1 Step 6 trace-video escalation reserved. |
| Vite dev server not running during HTP capture | Medium | Low | Script fails fast with ECONNREFUSED + clear error message. |
| Mahogany-desk capture lacks BURNED CSS tokens | Medium | Low | Fallback to navigating actual BURNED board route + cropping. |
| Pendleton crest SVG source not in BURNED repo | Medium | Low | Imagen-generate vector replacement at <$1 budget. |
| Music auditioning runs 15 candidates with no match | Medium | Medium | Generative Suno fallback per Unit 1.7 Step 4; Briggsy approval gated. |
| SVG ink-bleed filter slow at 1920×1080 export | Low | Low | Rasterize SVGs once if filter performance bottlenecks Phase 4; simpler filter parameters. |
| Card-roster types reference filenames that don't exist | Low | Medium | Vitest test (`card-roster.test.ts`) asserts `existsSync` for every entry. |
| R15 chrome SVG typography fallback in MP4 export | Low (Phase 0 spike validated useFonts.ts) | High | Phase 4 imports useFonts; rendering blocks until loaded. |
| Imagen generation for logo polish drifts off budget | Low (one-test-first rule) | Low | <$2 cap; bail out if Test 1 doesn't align. |
| Cold-open card frame template doesn't compose with existing portraits | Medium | Medium | Test composite in static HTML before Phase 4 scene build; Phase 3 iterates frame design. |
| BURNED card-art count drifts from claimed 17 | Low | Low | Get-ChildItem audit in Unit 3.2; update TODO/spec single-source per rule. |
| Shell-injection regression in capture / encode scripts | Low (project-wide rule) | High | `execFileSync` argv pattern throughout. |

---

## Open Questions

### Resolved During Planning

- **HTP rendering method**: static PNG default (clone of UMB pattern),
  trace-video MP4 escalation reserved.
- **Card-art curation strategy**: select from 17 existing, no
  regeneration. Read via Phase 0 ADR #8 `setPublicDir('../../public')`.
- **Briefing-room asset format**: SVG vector preferred, PNG where
  raster-friendly (mahogany desk).
- **R15 chrome format**: SVG with embedded typography (Clash Display /
  JetBrains Mono via `useFonts()`).
- **Music format**: MP3 192 kbps via Artlist / Musicbed, Suno fallback.
- **Cold-open logo treatment**: SVG baseline, Imagen escalation only
  if hand-authored doesn't carry trailer weight.
- **Asset manifest pattern**: codegen via filesystem walker + per-asset
  metadata; mirrors Phase 2.

### Deferred to Implementation

- **Whether mahogany-desk capture via Vite live or static setContent
  HTML.** Try Vite live first; fall back to setContent if CSS-token
  hydration unreliable.
- **Specific Pendleton crest source.** Locate via Glob; Imagen
  fallback if not found.
- **Per-operative card-frame template polish** (Imagen tuning if SVG
  baseline insufficient).
- **Specific licensed track name + URL.** Audition log surfaces the
  pick at Phase 3 execution.
- **Whether to symlink or codegen-walk for the audio manifest.**
  Codegen walker (Phase 3 Unit 3.7 pattern) is the lock; matches
  Phase 2's auto-manifest approach.
- **Whether Phase 3 includes a once-rendered cascade preview frame**
  for `sample-eval/visual-asset-prep/cascade-preview.png` to verify
  Unit 1.5 composition. Optional; defer to execution.

---

## Documentation / Operational Notes

- All Phase 3 artifacts land in `videos/trailer/public/assets/`,
  `videos/trailer/public/audio/`, `videos/trailer/scripts/`,
  `videos/trailer/src/lib/`, and
  `videos/trailer/sample-eval/visual-asset-prep/`.
- HTP capture script depends on Vite dev server (`pnpm dev`)
  running at `localhost:5173`. Script fails fast otherwise.
- Card-art read via Phase 0 ADR #8 `setPublicDir('../../public')` —
  no duplication.
- Imagen budget for Phase 3: <$5 total. One test image first per
  asset. Per `feedback-imagen-budget.md`.
- Music license document filed alongside MP3 file at
  `sample-eval/visual-asset-prep/music-license.pdf`.
- All shell-out invocations use `execFileSync` with argv arrays
  (project-wide convention).
- Briggsy is color blind — assets rely on typography + position +
  shape for hierarchy, not color alone (per
  `user_color_blind.md`).

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 2 plan: [`docs/plans/origin-trailer/phase-2-voice-pipeline.md`](./phase-2-voice-pipeline.md)

**UMB v3 precedents:**
- HTP capture script: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Music workflow: UMB Suno workflow (verify against repo history)
- Public asset organization: `projects/undercover-mob-boss/videos/trailer/public/`

**BURNED assets consumed:**
- Card art: `public/assets/cards/` (17 unique webp — verified 2026-05-16)
- HTP app: `src/client/howtoplay/App.tsx` + `useScrollReveal.ts`
- Briefing-room components: `src/client/board/CaseBanner.tsx`, `DossierFeed.tsx`
- BURNED CSS tokens: `src/client/board/semantic.board.css`

**Playwright documentation:**
- Page screenshot: https://playwright.dev/docs/api/class-page#page-screenshot
- Page video / context.recordVideo: https://playwright.dev/docs/videos
- ScrollTrigger interaction patterns: https://playwright.dev/docs/api/class-page#page-evaluate

**Music sourcing:**
- Artlist: https://artlist.io
- Musicbed: https://musicbed.com
- Suno commercial-use terms: https://suno.com/legal/terms-of-service

**Remotion documentation:**
- Static files: https://www.remotion.dev/docs/staticfile
- OffthreadVideo (for trace-video escalation): https://www.remotion.dev/docs/offthreadvideo
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font

**Institutional learnings (memory):**
- `feedback-imagen-budget.md` — one-test-first + tight-budget discipline
- `feedback-imagen4-over-nbp.md` — Imagen 4 preferred over NBP for new assets
- `feedback-imagen-hex-codes-bake-in.md` — never reference hex codes in Imagen prompts
- `feedback-stats-single-source.md` — verify card-art count against actual filesystem
- `user_color_blind.md` — typography + position + shape carry signal, not color alone
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
