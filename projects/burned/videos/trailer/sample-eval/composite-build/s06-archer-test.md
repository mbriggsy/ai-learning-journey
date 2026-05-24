# S06 Closing Directive — Archer Test

**Unit:** 4.7 — S06 Closing Directive Scene
**Date:** 2026-05-23 (R1)
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.7
**Composition:** `PreviewS06ClosingDirective`
**Duration:** 270 frames / 9.0 s @ 30 fps
**Render output:** `videos/trailer/out/s06-closing-directive.mp4` (2.9 MB, H264 CRF 18, standalone — no composition audio)
**Key stills:** `videos/trailer/out/s06-frame-{0,22,45,100,200,210,240,250,255,269}.png` (local-only — `out/` gitignored per convention)

---

## Scope note — closing-card cold-decode

S06 is the trailer's last impression — the BURNED wordmark + Pendleton-
agency status stamp + "drafted, rendered, and shipped by autonomous
agents" cold-decode reveal. Phase 1 Unit 1.9 locked the R15 #5 closing-
card content as the trailer's META beat: the visual that admits "this
was built by AI" via the pronoun pivot bookend with Janet's S01 kicker
(*"I'm just impressed."* → *"we're just impressed."*). Phase 4 Unit
4.7 ships the scene + R15 #5 hand-authored SVG assets (Phase 3 Unit
3.4 stopped at R15 #1-#4; #5 lock came AFTER 3.4's ship — same family
as insight 066 deepening-miss pattern).

---

## Scene composition (verified against `src/scenes/S06_ClosingDirective.tsx`)

| Layer | Component | Notes |
|---|---|---|
| Background | `<BriefingRoomBackground />` | Mahogany horizontal + venetian-blind drift restart (BackgroundDuration tied to scene length via `useVideoConfig`). S02/S03/S06 share this base — bookend continuity. |
| Watermark | `<Img>` Pendleton crest | Top-left 60/60, size 140, opacity 0.3. S02 bookend. |
| Foreground | `<Img>` depth-plane brass nameplate | Bottom-right 100/80, 540×144. S02 bookend (Phase 3 Unit 3.3 Option A — actual on-disk filename `depth-plane.svg`, NOT `brass-nameplate.svg` per insight #057). |
| Dossier | `<DossierFolder openStart={-60} closeStart={30} />` wrapped in opacity-fade div | Enters fully-open (openStart=-60 puts opening interp at 1.0 at frame 0) → closes 30-60 via EASE_DRAWER → opacity fades 1.0 → 0 over frames 60-110. Dossier serves the closing GESTURE, not the final tableau (R1 first cut had residual 0.15 opacity but the closed-folder "PENDLETON" text bled into R15 stamp landing zone; R1.1 patch fades to 0). |
| Logo | `<AbsoluteFill>` BURNED wordmark | burned-logo.svg at 720×auto, scale-spring + opacity ramp at frame 200. LOGO_SPRING_CLOSING (mass 0.9, damping 18, stiffness 110) — settled NOT snappy per amendment SA-9. Scale envelope 0.95 → 1.04 → 1.0 (Phase 1 lock). |
| R15 #4 | `<R15Stamp variant="payoff" landFrame={240}>` | "OPERATION STATUS: FIELD-READY" subhead under logo. Anchor `top-left`, offsetPx `{560, 680}` (horiz-center 800-wide; 50px below logo bottom). Heavy slap payoff envelope, tilt 0 (documented status, not slapped chrome). |
| R15 #5 | `<R15Stamp variant="standard" landFrame={255}>` | Closing-card cold-decode. Anchor `top-left`, offsetPx `{460, 770}` (horiz-center 1000-wide; 30px below R15 #4). Standard slap envelope — LIGHTER weight than R15 #4 to maintain hierarchy. Tilt 0. |
| Iris | `<IrisWipe fromFrame={0} toFrame={45} direction="opening" />` | Z-index 1000 paints black surround on top until pinhole reaches diagonal radius. Single source per amendment SA-5 — S06 imports from `transitions/IrisWipe.tsx`, NOT inline duplicate. |

**NOT in S06** (design judgment, R1):

- No CommsTicker bottom strip — BEAT-SHEET specifies a CASE BANNER row but the
  depth-plane nameplate + R15 #4 + R15 #5 stack already crowds the
  bottom-third weight. Adding a ticker would dilute the breathing-room
  hold and visually compete with R15 #5's italic subhead. If Briggsy
  eye-checks and wants the CASE BANNER restored, position as a top-edge
  banner in R2 (top-third is currently quiet — Pendleton crest top-left
  only).

---

## Composition-level audio (NOT in standalone render — auto-served by master)

Per ADR #16, all VO cues live in `TrailerComposition.tsx`'s audio map.
The standalone `PreviewS06ClosingDirective` render is silent visual;
the cues play only when the master `BurnedTrailer` composition renders.

| cue | abs frame | scene-rel | actualFrames | text |
|---|---|---|---|---|
| s06-cue-2910-dash | 2910 | 0 | 157 | "That's the briefing. Operation Pendleton is in your hands. Hold it tight." (`[sarcastic]`, deliberate-close pace; "Hold it tight" is the entendre setup for the Phrasing! callback) |
| s06-cue-3144-dash | 3144 | 234 | 19 | "Phrasing." (`[excited]`, PHRASING_INTERJECTIVE_SETTINGS — snappy rise on "Phra-" / fall on "-sing." Sterling-CODED callback). FFmpeg fade curve qsin per Phase 2 spec. |

Per audio-manifest.ts notes on s06-cue-3144: "R15 #4 stamp lands at frame
3150 (concurrent with Phrasing audio tail). R15 #5 closing-card lands at
frame 3165 (post-audio)." Scene-internal landFrame values (240, 255) map
to absolute 3150 / 3165 via `S06_START = 2910`. SHOWING-beats-TELLING:
R15 #4 stamp lands ON the second syllable of "Phrasing" — visual
punctuation for the catchphrase.

---

## §2 Quality Bar — agent-eye PASS, Briggsy-eye sentinel pending

### Sample-frame mechanical checks

- [x] **Frame 0** (`s06-frame-0.png`): iris fully closed — full-canvas
  black. File compresses to ~5 KB (pure black has high RLE/PNG-zlib
  efficiency). Mask at radius=0 covers entire canvas. ✓
- [x] **Frame 22** (`s06-frame-22.png`): iris ~50% open — pinhole reveals
  fully-open dossier (MAYFAIR case file content visible through circular
  reveal). Vignette outside pinhole is solid black. EASE_IN_OUT_FN on
  the 0→maxRadius interp gives the bloom-out feel. ✓
- [x] **Frame 45** (`s06-frame-45.png`): iris fully open + dossier mid-
  close (closing crossfade scene-rel 30-60, frame 45 = 15/30 = 50%
  through close interp). Closed-side TOP SECRET stamp + Pendleton-crest
  watermark visible bleeding through the still-translucent opening side.
  Brass nameplate + crest watermark visible. Briefing-room established. ✓
- [x] **Frame 100** (`s06-frame-100.png`): dossier opacity = 0 (faded
  60-110). Closing card background is CLEAN mahogany + venetian-blind
  drift. Crest top-left + brass nameplate bottom-right hold. Pre-logo
  quiet state. ✓
- [x] **Frame 200** (`s06-frame-200.png`): BURNED wordmark LANDS at
  scene-rel 200 — spring=0, scale=0.95 (start of envelope), opacity=1
  (fade-in 195-200 completes at 200). Logo visible center, slightly
  smaller than settled state. ✓
- [x] **Frame 210** (`s06-frame-210.png`): logo mid-spring — by frame 210
  (10 frames post-land) the spring has progressed to ~0.6, hitting the
  scale peak 1.04 then settling toward 1.0. Visually a subtle "weight"
  press; reads as SETTLED, not snappy. Distinct from S01's
  LOGO_SPRING_COLD vocabulary (snappier overshoot). ✓
- [x] **Frame 240** (`s06-frame-240.png`): R15 #4 begins land (local=0,
  opacity ramp 0→1 over 3 frames; at exact frame 240 opacity ~= 0 / not
  yet visible — opacity reaches 1.0 at frame 243). Logo settled, holding
  static. ✓
- [x] **Frame 250** (`s06-frame-250.png`): R15 #4 OPERATION STATUS:
  FIELD-READY mid-settle (local=10, scale 1.036 from STAMP_SLAP_PAYOFF
  envelope's peak→settle ramp). Text legible ochre-9 on mahogany with
  the underline-rule + ticks frame ornament anchoring the read. ✓
- [x] **Frame 255** (`s06-frame-255.png`): R15 #5 begins land (local=0,
  opacity=0). R15 #4 fully settled. Frame 255 captures the visual hand-
  off moment between the two closing-card stamps. ✓
- [x] **Frame 269** (`s06-frame-269.png`): FINAL TABLEAU — 1 frame
  before hard cut. BURNED wordmark + R15 #4 + R15 #5 all settled.
  italic subhead "Honestly at this point we're just impressed." visible
  below the main two-row "DRAFTED, RENDERED, AND / SHIPPED BY AUTONOMOUS
  AGENTS." Mobile safe-square (1080×1080 center, x=420-1500): R15 #4
  (560-1360) ✓, R15 #5 (460-1460) ✓ — all critical text inside. ✓

### Briggsy-eye §2 read (full HD viewer experience — sentinel pending)

- [ ] **Could this be from an Archer episode?** — Pendleton agency
  closing card grammar with meta-wink. Briefing-room set-dressing +
  classification chrome + Sterling-CODED Phrasing! audio at frame 234
  + R15 #4 stamp on the second syllable. Reads as a real Archer
  closing-credit tag with the BURNED meta-decode layered on.
- [ ] **Iris-wipe-IN reads as classic title-sequence closer, NOT
  generic Apple Keynote** — SVG mask with EASE_IN_OUT_FN radius interp.
  Diagonal-reach + 8px overshoot clears corner antialiasing. Pinhole-
  to-full-cover over 1.5s; bloom feel, NOT linear zoom.
- [ ] **BURNED logo land feels SETTLED — cinematic NOT snappy** —
  LOGO_SPRING_CLOSING (mass 0.9, damping 18, stiffness 110) vs
  LOGO_SPRING_COLD (0.5/11/200). The heavier mass + higher damping make
  the spring "press in" rather than "pop in." Verify by eye-checking
  frame 205-220 sequence in the MP4 — should read as the wordmark
  "arriving with weight."
- [ ] **R15 #4 reads as documented status, NOT slapped chrome** — tilt
  0, underline + ticks frame ornament, ochre-9 ink. Same envelope shape
  as R15 #3 payoff but at smaller scale; reads as the closing-stamp
  echo of the trailer's load-bearing visual beat.
- [ ] **R15 #5 closing-card cold-decode lands** — corner-bracket frame
  + JBM 700 32px main copy + italic JBM 500 22px subhead. Stroke
  outline + ink-halo filter boost legibility against mahogany (added
  R1.1 patch when first render's faint contrast surfaced — ochre vs
  mahogany hue separation alone was failing the WCAG-grade read on
  the venetian-blind drift's brighter bands).
- [ ] **The "// we're just impressed" pronoun pivot pays off Janet's
  cold-open kicker** — *"I'm just impressed."* (S01 frame 60-199) →
  *"we're just impressed."* (S06 frame 255-269). The collective
  speaker frames the trailer as an autonomous-agent-built artifact.
- [ ] **Final 15 frames (255-269) hold static** — both R15 #4 and R15
  #5 settled; logo settled; only venetian-blind drift continues
  subtly. The frozen-tableau feel makes the hard-cut-to-black at
  frame 270 read as a deliberate end-of-act, NOT a glitch.

---

## Master-render-only verdicts (Phase 4 Unit 4.10)

These checks fire when `pnpm render:full` produces the master composite
with the audio map active. Skipped during standalone S06 preview.

- [ ] Composition-level Dash close VO at absolute frame 2910 (= scene-
  rel 0) "That's the briefing..." lands cleanly over the closing
  music-bed underbuild (0.5 envelope volume at frame 2910).
- [ ] Phrasing! cue at absolute frame 3144 (= scene-rel 234) lands AT
  the R15 #4 stamp slap moment — visual punctuation synchronized to
  the second syllable.
- [ ] Final brass sting on music bed (60→100% ramp 3120→3179) lands
  with both R15 stamps holding static — sting becomes the audio
  punctuation matching the visual freeze.
- [ ] No audible click at the S05→S06 boundary — music-bed envelope
  interpolation is continuous across the boundary (0.25 → 0.5 ramp
  begins at frame 2865 = S05 tail-15).
- [ ] No visible flash at the S05→S06 boundary — iris-wipe-IN paints
  full black over the first frame of S06 (frame 2910), masking the
  S05 gameplay's last frame from peeking through.

---

## Briggsy-eye sentinel

- [ ] `briggsy-review-4.7.signoff` written — gates Unit 4.10 master-
  render entry per amendment NN-1. Eye-check the rendered MP4 +
  full-HD stills (NOT just this doc's preview-scale stills which
  understate contrast).

---

## Verdict (R1): agent-eye PASS, perceptual sentinel deferred to Briggsy

All Phase 4 Unit 4.7 deliverables shipped:

- `S06_ClosingDirective.tsx` replaces the Unit 4.1 scaffold with full
  production code — pure visual, no Audio import (ADR #16), iris-wipe
  imported from transitions/ (SA-5 single source), LOGO_SPRING_CLOSING
  used (NOT LOGO_SPRING_COLD nor generic spring), R15 #4 + R15 #5
  positioned via explicit anchor='top-left' offsets (more legible
  than center-anchor offsetPx which R15Stamp's switch statement
  silently ignores).
- `transitions/IrisWipe.tsx` ships as the single-source iris-wipe
  component — `useId()` for SVG mask collision safety, `useVideoConfig()`
  for resolution-agnostic diagonal-reach math.
- R15 #5 hand-authored SVG assets (`subhead-5-closing-card-frame.svg`
  + `subhead-5-closing-card-text.svg`) — Phase 3 deepening miss filled
  in by Phase 4. Two-row main copy (line-break at "AND" for mobile
  safe-square fit) + italic-oblique subhead. Stroke + ink-halo filter
  for contrast against mahogany.
- `LOGO_SPRING_CLOSING` added to `lib/animations.ts` — settled-not-
  snappy spring config (mass 0.9, damping 18, stiffness 110), distinct
  vocabulary from `LOGO_SPRING_COLD`.
- `visual-manifest.ts` + `visual-manifest.test.ts` updated for R15 #5
  entries (R15_CHROME count 8 → 10, 5 instances × frame+text split-
  layer).
- Standalone preview renders clean (270/270 frames, 2.9 MB H264 CRF
  18, 9.000s).

R1.1 patch landed during render verification: dossier opacity fades to
0 (not 0.15) over frames 60-110 to prevent closed-folder "PENDLETON"
text bleeding into R15 stamp landing zone. R15 #5 SVG text adds stroke
+ ink-halo filter for ochre-9-on-mahogany contrast.

Open questions for Briggsy-eye:

1. **CASE BANNER omission** — BEAT-SHEET specifies a CASE BANNER row
   at S06; R1 design judgment was to skip it (depth-plane + R15 stack
   already crowds bottom-third). Reinstate as top-edge banner in R2
   if you want the spec line ("CASE FILE · OPERATION PENDLETON ·
   DEBRIEF · STATUS UPDATE · — · 02 / FIELD-READY") visible.
2. **R15 #5 italic subhead opacity (0.55)** — kept subordinate to main
   two-row per BEAT-SHEET hierarchy lock. If full-HD viewer-experience
   eye-check says it reads too faint, bump opacity in R2.
3. **40-frame breathing-room hold (200-240)** — Phase 4 carry-forward
   note allowed 45-50 frames as alternative. R1 ships at 40; expand if
   the BURNED wordmark hold feels rushed in master render.
