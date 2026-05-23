# Phase 3 — Visual Asset Inventory

Consolidated inventory of every visual asset Phase 4 consumes from the
trailer composite. Per Phase 3 deepening (scope-guardian Q6): single
inventory doc replaces the 4 per-unit eval markdowns
(`htp-capture.md`, `briefing-room-assets.md`, `r15-chrome.md`,
`title-sequence.md`). Standalone docs preserved:
[`card-curation.md`](./card-curation.md),
`music-audition-log.md` (Unit 3.5), `music-license.pdf` (Unit 3.5).

Source-of-truth pointers:
- Phase 0 ADR #8: `Config.setPublicDir('../../public')` — all `staticFile`
  paths resolve relative to BURNED's `public/` (not
  `videos/trailer/public/` which is unreachable during render).
- Phase 3 ADR #15: NEW SVGs land at `public/trailer/<unit-prefix>/`
  inside BURNED's existing public/.

---

## Unit 3.1 — HOW-TO-PLAY fullpage capture (HERO)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/htp-fullpage.png` | Playwright capture of production `https://burned-cxa.pages.dev/howtoplay` (positive-completion gate per insight #064 — opacity-only, transform excluded) | 1920 × ~21000 (full scrolling page) | HERO | S05 deep-scroll reveal of operations manual chrome |

Capture script: `videos/trailer/scripts/capture-htp-scroll-burned.ts`.
Re-run: `pnpm capture:htp` (production default) or
`HTP_URL=http://localhost:5173/howtoplay.html pnpm capture:htp`.

---

## Unit 3.2 — Card-art curation

See [`card-curation.md`](./card-curation.md) for the 17-entry roster
breakdown + per-card selection rationale. Phase 4 imports via
`staticFile('assets/cards/<filename>')`.

Cascade halo column geometry: `videos/trailer/src/lib/cascade-halo-column.json`.
Typed roster: `videos/trailer/src/lib/card-roster.ts`.

---

## Unit 3.3 — Briefing-Room Set-Dressing

### Existing assets (Path A via staticFile through ADR #8)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `assets/arena/mahogany-horizontal.png` | Imagen-gen (`scripts/generate-briefing-assets.ts`) | 1.8 MB raster | HERO | S02 / S06 desk backdrop |
| `assets/arena/mahogany-vertical.png` | Same | 1.6 MB raster | TEXTURE | Vertical frame elements |
| `assets/arena/blotter.png` | Same | 1.4 MB raster | TEXTURE | Paper-pad backdrop |
| `assets/arena/stamp-classified.png` | Same | 599 KB raster | CHROME | Classification stamp primitive |
| `assets/arena/operative-silhouette.png` | Same | 759 KB raster | CHROME | Agent X REDACTED treatment |
| `assets/arena/portrait-{dash,vera,otto,janet,neal,agent-x}.png` | Same | 700KB–1.3MB ea | HERO | S03 dossier portraits |
| `assets/roster/{operative}.png` | Same | 1.1–1.3MB ea | HERO | Higher-res alternative (Sable available HERE only — not in arena/) |
| `assets/howtoplay/pendleton-crest.png` | Imagen-gen (`scripts/generate-htp-assets.ts`) | 1.5 MB raster | CHROME | Poster crest watermark (S02 corner + S06 closing-folder dressing) |
| `assets/howtoplay/operations-manual-plate.png` | Same | 1.4 MB raster | HERO | Cold-open title plate (Unit 3.6 consumes) |

### NEW assets (Path B vector SVGs at `public/trailer/briefing-room/`)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/briefing-room/venetian-blinds.svg` | Hand-authored | 1920×1080 viewBox | TEXTURE | S02 sun-through-blinds shadow mask; Phase 4 animates translateX 1.5–2px/frame per Phase 1 lock. Sun-from-right bias (peak shadow ~62% from left edge); 7 irregular slats + back-layer parallax slats so slow translate doesn't read as repeating gradient |
| `trailer/briefing-room/dossier-folder-closed.svg` | Hand-authored | 1000×1300 viewBox | HERO | S02 cold-open pre-reveal state. Manila body + diagonal TOP SECRET stamp (burned-fire ink-bleed via feMorphology+blur) + // OPERATION / PENDLETON / CASE FILE 02 · MAYFAIR wordmark + Pendleton crest watermark (0.30 opacity) + hand-tab "PEN · 62 · 02" + paperclip (top-left, 7° tilt) + filing stamp "FILED 1962 · NOV · 14" |
| `trailer/briefing-room/dossier-folder-open.svg` | Hand-authored | 1000×1300 viewBox | HERO | S02 reveal post-state. Inner cream case-sheet with "// CASE FILE / 02 · MAYFAIR" header + left-margin classification ribbon (burned-fire) + OPERATIVE [redacted bar] + STATUS "ACTIVE · BURNED" callout + BRIEF (3 redaction bars) + LAST CONTACT date + small TOP SECRET stamp + CLEARANCE / FORM PEN-22-CF footer + Pendleton crest watermark (0.18 opacity). Designed as "what's revealed when cover lifts" — Phase 4 layers closed.svg on top + animates cover away |
| `trailer/briefing-room/depth-plane.svg` | Hand-authored (Step 7 pick: **Option A — brass nameplate**) | 600×160 viewBox | HERO | S02 foreground depth-plane element per Phase 1 Unit 1.10 deepening. Diagonal-specular brass gradient + 4 corner phillips-slot screws + serif "M. PENDLETON" + mono-caps "BUREAU CHIEF" engraved-into-brass via filter (dark-down + light-up offsets simulate depression) + plate-drop cast shadow |

### Reference renders (Phase 4 visual-diff only — NOT shipped to public/)

| Path | Source | Status | Purpose |
|---|---|---|---|
| `sample-eval/visual-asset-prep/case-banner-reference.png` | Playwright crop of BURNED live `<aside[class*="caseBanner"]>` (partial-class selector survives Vite CSS-module hashing per insight #064) | **Deferred to Phase 4 invocation** — capture requires BURNED in playing-state game (see script header) | Phase 4 visual-diff against the vendored-component render of `GameTable.tsx:67-88` JSX |
| `sample-eval/visual-asset-prep/comms-ticker-reference.png` | Playwright crop of BURNED live DossierFeed (`div[class*="folder"]`) | **Deferred to Phase 4 invocation** — same prereqs | Same — Phase 4 visual-diff against vendored DossierFeed-equivalent render |

Capture script: `videos/trailer/scripts/capture-banner-references.ts`.
Re-run (after dev servers + room in playing state): `pnpm capture:banner-refs`.

### Depth-plane option lock

Phase 1 Unit 1.10 deepening offered three options for the foreground
depth-plane element:

- **Option A — brass nameplate** "M. PENDLETON / BUREAU CHIEF" ✅ **shipped**
- Option B — manila folders stack (3-4 folders, slight rotations, paperclip affordances, edge classification stamps)
- Option C — doorframe vignette (large architectural frame at viewport edge, gradient-shadow into desk plane)

**Reasoning for Option A:** strongest single narrative element. Anchors
the agency naming ("M. Pendleton" = Bureau Chief = the M. in
"Briefed by **M.**" on the live CASE BANNER). Reads cleanly in-frame
at small dimensions (Phase 4 may treat as 1/3-canvas accent OR full-
nameplate hero across S02 → S06). Typographic family matches the
existing `pendleton-crest.png` serif anchor.

If Phase 4 review during Unit 3.7 consolidated-gate finds Option A
underweight in collision with HTP hero + R15 chrome, Option B (folders
stack) is the recommended fallback per insight #018 stop-and-re-architect:
remove the brass element, recontextualize as additional dossiers.

---

## Unit 3.4 — R15 Chrome Stamps (SPLIT-LAYER)

### R15 chrome inventory (Path B vector SVGs at `public/trailer/r15-chrome/`)

Each instance ships as TWO SVG files (frame + text) per Phase 4 stamp-
slap motion constraint — Phase 4 wraps both layers in an `<AbsoluteFill
style={{ transformOrigin: 'center', transform: 'rotate(…) scale(…)' }}>`
so the rotation/scale-slap geometry pivots from a single point. A
monolithic SVG with baked rotation would force scale onto the pre-
rotated raster bbox and break Phase 1 Unit 1.4's overshoot perception.

| Instance | Frame | Copy | Files | Dimensions | Ink token | Tier |
|---|---|---|---|---|---|---|
| #1 Classification stamp | 150 (S01) | OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS | `stamp-1-operation-pendleton-{frame,text}.svg` | 800×240 viewBox | `--color-ochre-9` (#947226) | CHROME |
| #2 Comms ticker pulse | 1680 (S04) | OPERATIVE [REDACTED] — METHOD REPEATABLE | `ticker-2-method-repeatable-{frame,text}.svg` | 1920×40 viewBox | `--color-ochre-9` on `--color-charcoal-3` (#1a1812) strip | CHROME |
| #3 Stacked-payoff stamp | 1950 (S04) | AUTONOMOUS FIELD UNIT — ASSET DELIVERED | `stamp-3-asset-delivered-{frame,text}.svg` | 1200×280 viewBox | `--color-burned-fire` (#be2e27) | **HERO** |
| #4 Closing subhead | 2820 (S06) | OPERATION STATUS: FIELD-READY | `subhead-4-field-ready-{frame,text}.svg` | 800×60 viewBox | `--color-ochre-9` | CHROME |

**Design elevations from plan starter:**

- **#1** ships double border (outer 6px + inner hairline 1.5px at 0.78 opacity, 14px inset) — sells "official rubber-stamp" vocabulary over plain rectangle. 3rd line ("METHOD: AUTONOMOUS") weighted 800/32px vs the 700/28px stack above so the decode hook lands heaviest.
- **#2** strip uses vertical sheen gradient (#1a1812 top/bottom, #0f0d09 middle) so the strip reads as inset/sunken into the dark surface. Hairline ochre rules at y=0 and y=38.5 + double-chevron bookends in the margins (left `>>`, right `<<`) establish dispatch-ticker vocabulary.
- **#3** (HERO) ships double border (outer 8px + inner 2px at 0.82 opacity, 18px inset) PLUS 4 corner bracket marks — institutional classification-file iconography. Ink-bleed parameters bumped from plan's `scale="4"` to `scale="4.8"` for more aggressive edge-roughening at HERO weight; eye-loop verified reads as hand-stamped not CSS-noise. ASSET DELIVERED line weighted 800/46px (was plan's 700/42px) to land the payoff verb harder.
- **#4** frame ships minimal — hairline underline at 0.42 opacity flanked by two short tick marks at 0.56 opacity. Phase 4 may hide the rule via opacity if it competes with the BURNED logo above.

**Phase 4 composition pattern:**

```tsx
<AbsoluteFill style={{
  transformOrigin: 'center',
  transform: `rotate(${tilt}deg) ${scaleSlap(frame)}`,
}}>
  <Img src={staticFile(`trailer/r15-chrome/${slug}-frame.svg`)} />
  <Img src={staticFile(`trailer/r15-chrome/${slug}-text.svg`)} />
</AbsoluteFill>
```

Rotations per instance: #1 = -8°; #2 = 0° (ticker is axis-aligned); #3 = -3°; #4 = 0°. `scaleSlap(frame)` interpolates Phase 1 Unit 1.4 lock (0.95 → 1.04 overshoot → 1.0 settle); heavier 16-frame slap on #3 per the HERO payoff weight.

**CVD verification (insight #051):**

Probe script `videos/trailer/scripts/probe-r15-chrome-cvd.ts` clears
all 6 ink/background pairs against the STRICT floor 0.10 oklab
distance under deuter / prot / trit deficiency simulations.

| Pair | Normal | Deuter | Prot | Trit | Min | Verdict |
|---|---|---|---|---|---|---|
| ochre-9 on cream-12 (fresh paper) | 0.375 | 0.370 | 0.391 | 0.369 | 0.369 | PASS |
| ochre-9 on cream-11 (aged paper)  | 0.255 | 0.250 | 0.270 | 0.250 | 0.250 | PASS |
| ochre-9 on charcoal-3 ticker      | 0.373 | 0.380 | 0.352 | 0.380 | 0.352 | PASS |
| burn-fire on cream-12             | 0.445 | 0.489 | 0.571 | 0.404 | 0.404 | PASS |
| burn-fire on cream-11             | 0.334 | 0.368 | 0.448 | 0.302 | 0.302 | PASS |
| ochre-9 on cream-12 closing       | 0.375 | 0.370 | 0.391 | 0.369 | 0.369 | PASS |

Narrowest pair: ochre-9 on cream-11 at 0.250 (2.5× floor). HERO #3
burn-fire/cream-12 hits 0.404 — strong contrast for the trailer's
load-bearing visual stamp. Re-run probe if R15 ink palette ever
amends: `pnpm tsx videos/trailer/scripts/probe-r15-chrome-cvd.ts`.

**Plan-vs-reality drift caught during execution (insight #061):**

Phase 3 plan §Unit 3.4 Step 5b CVD pair list cited
`cream-3 #e6d5a9` and `charcoal-12 #1a1812`. Actual palette tokens
per `src/client/shared/tokens/palette.generated.ts` + `primitives.css`:
`cream-3 = #252016`, `charcoal-12 = #f1ebdc`, `charcoal-3 = #1a1812`.
The plan transcribed snapshot values that drifted from
post-deepening palette state. Probe re-derived from real source:
ochre-9 / burn-fire on `cream-11 + cream-12` (paper variants) +
`charcoal-3` (ticker bg). Insight #061's catch shape: never transcribe
the plan's enumeration; derive from the canonical source at
execution time.

**Token isolation under Img-loaded SVGs:**

SVG `<style>` blocks define `--ink: var(--color-<token>, #<hex>)` at
the root element. The CSS-isolated Img-loaded SVG can't reach Phase 4's
parent custom-property scope, so the fallback hex resolves —
self-contained file that still documents the token name in source.
Child elements consume `fill="currentColor"` (inside a `<g style="color:
var(--ink)">`) or `fill="var(--ink)"` directly.

**Font fallback chain:**

Every text element declares `font-family="'JetBrains Mono', 'IBM Plex
Mono', 'Courier New', monospace"`. Remotion `<Img>`-loaded SVGs do not
inherit `useFonts()`-registered fonts (CSS isolation); Phase 4 may
pivot to inline-SVG rendering OR per-weight static subsets if the
generic-mono fallback reads wrong in MP4 export. Flagged in plan
Step 5 framework-docs unresolved spike. Dev/preview renders use the
generic-mono fallback cleanly.

---

## Unit 3.5 — Music Bed Procurement

### Landed track

| staticFile arg | Source | Format | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/audio/music-bed.mp3` | **"Spy Glass" by Kevin MacLeod** (incompetech.com) — CC-BY 4.0 | MP3, 44.1kHz stereo, 256 kbps, 226.98s (3:47) | TEXTURE | Continuous music bed under trailer narration (95–106s). Phase 4 clips a 106s window per the music-cue map in BEAT-SHEET.md preamble. Path A (full-length-clipped). |

### Why this track

R9 spec hit cleanly on first audition. BPM 110 (mid-R9 range 100-130).
Instrumentation Saxes + Trumpet (brass leads) + Piano + Bass + Drums +
Vibes + Flute. Mood "Grooving, Mysterious" — Incompetech description:
*"Super cool jazz for your hardcore detectives! Timeless quality.
Could be now, could be in the 1950s."* Briggsy first-listen verdict
2026-05-22: *"oh that's fucking money!"*

### Cost + budget

**$0.** Free CC-BY 4.0 catalog. The Phase 1 Unit 1.7 paid-source
ladder (Artlist/Epidemic/Marmoset/Songtradr/Suno) was bypassed per
the 2026-05-22 Briggsy directive *"not paying for music"* — captured
in `project-burned-music-bed-budget` memory.

### Audit trail + license artifact

- `videos/trailer/sample-eval/visual-asset-prep/music-audition-log.md`
  — full audition record (catalogs evaluated, Incompetech candidates
  table with BPM/instrumentation/verdict columns, decision trace).
- `videos/trailer/sample-eval/visual-asset-prep/music-license.md` —
  CC-BY 4.0 attribution text + posting checklist + platform-specific
  Content-ID dispute procedure. Replaces the Phase 3 plan's
  `music-license.pdf` filename placeholder (CC-BY 4.0 ships no
  per-track PDF; the deed URL + attribution wording IS the license
  artifact).

### Phase 7 distribution obligation

Attribution text MUST appear in the post body / video description
on every distribution surface (Twitter/X, portfolio, engineering
blog reposts, LinkedIn, YouTube). On-screen credit OPTIONAL per
CC-BY 4.0. See `music-license.md` for the verbatim attribution
text + per-surface posting checklist.

`music_disclosure_required` stays **`false`** — Spy Glass is
human-composed; Tier 3 Suno generative path NOT taken; no
AI-music disclosure obligation flows to Phase 7.

---

## Unit 3.6 — Cold-Open Title-Sequence Assets

### NEW assets (Path B vector SVGs at `public/trailer/title-sequence/`)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/title-sequence/operative-card-frame.svg` | Hand-authored (Step 1b fallback path — Imagen escalation skipped per insight #018 + `feedback-imagen-budget.md`) | 800×1000 viewBox | HERO | S01 cold-open card-flash chrome template (frames 30–210). Phase 4 composites operative portrait (`assets/cards/<operative>.webp`) into the center region + Clash Display 700 name overlay onto the bottom ochre name-plate strip. Reticle motif upper-right + chevron flanks bottom-strip echo `chevron-motif-bg.svg` vocabulary. |
| `trailer/title-sequence/chevron-motif-bg.svg` | Hand-authored (corrected chevron geometry per plan design F11 — pre-deepening starter shipped diamonds/rhombuses, not chevrons) | 1920×1080 viewBox | TEXTURE | S01 cold-open background. Diagonal chevron pattern (Bass / Ferro lineage), 120×60 tile with two strokes per tile pointing right. Ochre-9 ink at 0.14 opacity on charcoal-3 ground + radial vignette pulls eye to center. |
| `trailer/title-sequence/burned-logo.svg` | Hand-authored | 1200×400 viewBox | HERO | **S06 closing wordmark ONLY** (frame 2780). **S01 cold-open uses `public/assets/cards/burned.webp`** per Phase 1 Unit 1.10 differential (S01 = card-art in-world; S06 = wordmark out-of-world bookend). Clash Display 700 320px, burn-fire ink (#be2e27), letter-spacing -8 (compressed-slab feel), subtle drop-shadow gives presence on the cream closing card without competing with the R15 #4 subhead beneath. |

### EXISTING assets (Path A via staticFile through ADR #8) — title-sequence consumers

| staticFile arg | Source | Use |
|---|---|---|
| `assets/howtoplay/operations-manual-plate.png` | Imagen-gen (`scripts/generate-htp-assets.ts`) — 1.4 MB raster, "OPERATION / BURNED / FIELD OPERATIONS MANUAL" Saul-Bass title-card | S01 title-plate reveal (frame ~210, follows BURNED card-art landing). NOT regenerated. |
| `assets/howtoplay/pendleton-crest.png` | Imagen-gen — 1.5 MB raster | S02 corner watermark + S06 closing-folder dressing. NOT regenerated. |
| `assets/cards/burned.webp` | BURNED card-art (game asset) | **S01 cold-open** BURNED reveal moment (the "card" reads as in-world game iconography flashing). |

### Reference proof (Phase 4 visual-diff only — NOT shipped to public/)

| Path | Source | Purpose |
|---|---|---|
| `sample-eval/visual-asset-prep/operative-card-composite-proof.png` | Playwright static-HTML composite via `videos/trailer/scripts/build-operative-card-composite-proof.ts` — composes `operative-card-frame.svg` + `dash-barlowe.webp` + name overlay "DASH BARLOWE" at 1/3-canvas size (640×800 card region) inside 1920×1080 stage | Verifies name-plate readable at the cold-open canvas ratio (58px Clash Display renders ~19px on full trailer display) BEFORE Phase 4 commits. Briggsy reviews; if readability fails, Phase 4 elevates cold-open card scale OR widens the frame. |

**Composite-proof script gotchas (encoded inline for future
maintainers):**

- **`page.setContent()` cross-origin issue.** Pre-deepening starter
  used `setContent` + relative paths; doc-review fix tried absolute
  `file://` URLs. BOTH fail because `setContent` makes the page
  origin `about:blank`, which Chromium treats as cross-origin to
  `file://` and silently refuses to load images (`naturalWidth=0`
  with `complete=true`). Fix shipped in 2026-05-22 execution: write
  the HTML to a temp file under `BURNED_ROOT/public/trailer/`,
  navigate via `pathToFileURL(...)`, clean up in `finally`. Same-
  origin file:// then resolves the asset paths.
- **`page.waitForFunction(fn, opts)` signature trap.** Options is
  the THIRD positional arg (`fn, arg, options`); passing options as
  second arg silently lands in the `arg` slot and the timeout
  defaults to 30s. Pass `null` as arg explicitly when there is none.

### Title-sequence design notes

- **`operative-card-frame.svg`** elevations from plan Step 1b
  starter: chevron flanks (`>>` left / `<<` right) on the bottom
  name-plate strip echo the `chevron-motif-bg.svg` vocabulary —
  visual DNA continuity across cold-open elements. Kicker labels
  `// OPERATIVE FILE` (upper-left) + `PEN · 62 · 02` (upper-right)
  sit in the portrait region's padding area; render only when
  Phase 4's portrait is inset, not when it covers full-bleed.
- **`chevron-motif-bg.svg`** elevations: added radial vignette
  (40%-to-100% radius, 0 → 0.48 black opacity) pulls eye to
  center where the operative card-flash lands. Pattern bumped from
  plan's 0.12 to 0.14 opacity for slightly stronger texture under
  vignette.
- **`burned-logo.svg`** elevations: added drop-shadow filter (3px
  Gaussian blur + 6px dy offset + cordovan-1 fill at 0.42 opacity)
  for closing-card presence. Plan starter was bare text.
- **Font isolation note** (matches Unit 3.3/3.4 pattern): SVG
  declares `'Clash Display', 'Clash Display Fallback', system-ui,
  sans-serif`. Img-loaded SVGs do NOT inherit Remotion's
  `useFonts()` — Phase 4 may pivot to inline-SVG rendering OR
  per-weight static subsets if the system-ui fallback reads wrong
  in MP4 export. Dev preview uses sans-serif fallback cleanly.

### Imagen spend

**Unit 3.6 cumulative: $0.00** (hand-authored Step 1b fallback path
taken — see `imagen-spend.md` cumulative ledger).

---

## Spend tracker pointer

Running Imagen spend tracker:
`videos/trailer/sample-eval/visual-asset-prep/imagen-spend.md` (when
Unit 3.x produces it). Hard abort at $6 per plan §"Imagen Spend
Tracker." **Unit 3.3 consumed $0** (all assets hand-authored OR
pre-existing).
