# S03 Mission Background — Archer Test

**Unit:** 4.4 — S03 Mission Background Scene
**Date:** 2026-05-23 (R3, post-redo + VO-beat wiring)
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.4
**Composition:** `PreviewS03MissionBackground`
**Duration:** 810 frames / 27.0 s @ 30 fps (post-Tier-4 expansion;
plan body's 480-frame budget is stale per insight #061)
**Render output:** `videos/trailer/out/s03-mission-background.mp4` (7.5 MB, H264 CRF 18)
**With-audio review build:** `videos/trailer/out/s03-with-audio.mp4` (7.0 MB; FFmpeg-muxed S03 VO #1 + VO #2 at correct scene-relative offsets for ear-checked beat alignment — NOT shipped, review-only)
**Key stills:** `videos/trailer/out/s03-frame-{90,130,220,460,580,680,750}.png`

---

## Three-revision history

- **R1 (HARD ZERO, commit `07ce2498` + `d645db30`).** Vertical-stack
  layout — 6 thumbnail cards (106×148) on the canvas right edge with
  inline cream-matte chrome. Briggsy: "cards look like shit. Barry
  [Agent X] is clipped. Everything looks smaller than it needs to be
  and kinda fuzzy. Hard fucking zero." Diagnosis + prescription
  captured in `TODO.md` Unfinished Fix section.
- **R2 (interstitial).** Cards rebuilt with `OperativeCardFrame` at
  scale 0.45 (360×450 — 4× area increase) in a diagonal file-fan
  cascade. Briggsy validated cards-are-now-bigger but flagged dead
  time: "It plays beautifully. All animation complete about the
  7 second mark. … white bar flashes left to right [at ~14s]. And
  then continues to play with no movement to complete 27 seconds."
- **R3 (current, shipped).** VO-aligned beats wired across the full
  27-second window. Cards restagger to land while Dash narrates;
  Otto-aside + paperwork marginalia carry VO #1 callbacks; new
  `DeckStack` + `BurnedCardReveal` components carry VO #2; subtle
  awkward-lean cascade settle carries the dark-sting closing.

---

## VO content (verified against `src/lib/script.ts`)

**S03-roster (VO #1, abs 570, scene-rel 0-407, 407f / 13.57s):**
> "Our autonomous field assets infiltrated the contract last quarter.
> [BEAT 0.3s] Seven operatives in the active roster. [BEAT 0.3s] One
> who insists on being called 'Agent X' and refuses to file any
> paperwork whatsoever."

**S03-deck (VO #2, abs 1007, scene-rel 437-799, 362f / 12.07s):**
> "Mission: a deck of one hundred and twenty operations. [BEAT 0.4s]
> One ends your career instantly. [BEAT 0.3s] The rest help you survive.
> Or ensure your colleagues don't."

**Drift caught mid-flight:** R3 design proposal originally referenced
"Fourteen thousand pages. Six sticky notes covered in lipstick.
Seventeen asset illustrations from the design system" — that's the
**S04** cue text, not S03. Caught during script.ts verification before
component implementation. R1's `s03-archer-test.md` body also carried
this same misread (line 88 "Fourteen thousand pages. Six sticky notes"
claim); corrected in this R3 rewrite.

---

## Beat-aligned visual choreography

| Scene-rel | Visual event | VO word landing |
|---|---|---|
| 0–99 | Cards cascade in 1-by-1 (stagger 15f, settle 24f each, EASE_OUT_EMIL) | "…autonomous field assets infiltrated the contract last quarter" |
| 110–134 | Otto-aside fades in (24f ramp) — "// OPERATIVE 07: BASEMENT — DO NOT ASK" | "Seven operatives in the active roster" |
| 160–260 | Agent X subtle scale-pulse (1.0 → 1.04 → 1.0 over 100f) | "One who insists on being called 'Agent X'…" |
| 200–224 | Paperwork marginalia upper-right (24f ramp) — "// FILE: [REDACTED]  // PAPERWORK: 0" | "…refuses to file any paperwork whatsoever" |
| 296–407 | Hold (laugh-room tail before wipe) | (silence) |
| 415–431 | `DossierPageWipe` — cream-12 panel sweeps L→R | (30-frame silence gap between VO #1 and VO #2) |
| 437–453 | `DeckStack` lands via `archerStampSlap('payoff')` envelope — 3 nested card-backs + big "120" badge + "// OPERATIONS" subtitle, lower-left | "Mission: a deck of one hundred and twenty operations" |
| 540–558 | `BurnedCardReveal` spring entry — burned.webp 440×440 dead-center with burned-fire multi-shadow glow ring, `LOGO_SPRING_COLD` config | "One ends your career instantly" |
| 650–720 | Cascade "awkward lean" — operatives scale 1.0 → 1.02 → 1.0 + rotate +1° (triangle envelope) | "Or ensure your colleagues don't" |
| 700–740 | BURNED card opacity 1 → 0 (40f ramp) — lets cascade re-emerge | (tail / sting settle) |
| 740–810 | Hold — cascade + DeckStack + Otto-aside + marginalia all present | (closing silence) |

---

## §2 Quality Bar (per BURNED CLAUDE.md + insight #050)

- [x] **Could this be from an Archer episode?** — Briggsy-eye approved
  in MP4-with-audio playback: "pretty sweet" + "lock it" (2026-05-23).
- [x] **Cards SHOW OFF the artwork.** R2 nailed this — 360×450 OperativeCardFrame at scale 0.45 reveals portrait detail + frame chrome (kicker label, file code, target reticle, name plate) at appreciable size. Each operative identifiable on first glance.
- [x] **Cascade reads as classified files dropped on the briefing-room desk.** Progressive tilt -8° → +12°, ~56% horizontal reveal per card.
- [x] **Agent X redacted as the punchline.** Final cascade position (z-top) with inlined black-bar redact (charcoal-1 fill — see "RedactBar inline-styling" finding below).
- [x] **Otto-aside reads as classified marginalia.** ochre-11 + JetBrains Mono caps + bottom-left placement; lands during VO #1's "Seven operatives in the active roster" beat (the joke: 6 visible + Otto's line = 7).
- [x] **Paperwork marginalia reads as bureaucratic dryness joke.** "// FILE: [REDACTED] // PAPERWORK: 0" upper-right, lands during the "refuses to file paperwork" Dash beat.
- [x] **DeckStack reads as the deck on the desk.** Lower-left position is spatially natural — operative dossiers are spread across the desk (cascade), mission deck sits at the side waiting to be drawn.
- [x] **BURNED card reveal reads as danger-card landing.** 440×440 with burned-fire glow, dead-center, disrupts the team photo. Card art (noir car-by-night scene) visible at full size during the hero beat.
- [x] **Continuity with S02.** `BriefingRoomBackground` re-used — mahogany base + venetian-blind drift carry through without seams. CommsTicker re-used.

## Motion polish (per emil + Phase 1 lock)

- [x] **EASE_OUT_EMIL on cascade entries.** cubic-bezier(0.16, 1, 0.3, 1) — snap into place; verified by frame 130 showing all cards fully settled.
- [x] **Stagger 15f / settle 24f** — each card gets ~0.5s of individual entry attention; cascade completes by rel 99 (~3.3s) without front-loading.
- [x] **archerStampSlap('payoff')** envelope for DeckStack — 16-frame slap with overshoot 1.06 → settle 1.0. Matches S01 R15 stamp vocabulary.
- [x] **LOGO_SPRING_COLD** for BURNED card — same spring config as S01 BURNED-logo reveal (mass 0.5, damping 11, stiffness 200, overshoot uncapped). Visceral entry consistent with the brand-bookend vocabulary.
- [x] **DossierPageWipe 16-frame duration** matches `transitions.ts` `DOSSIER_WIPE_FRAMES` Phase 1 lock.
- [x] **Awkward-lean envelope** — triangle 0 → 1 → 0 across 70 frames with subtle scale (+0.02) + rotate (+1°). Telegraphs "team reaction" without breaking cascade composition.

## R3 acceptance (mission-background reveal)

- [x] **VO #1 cards-as-narrated.** Cascade entries land with Dash's
  "field assets infiltrated the contract" line, not pre-emptively.
- [x] **VO #1 "seven operatives" joke earned visually.** 6 cards visible
  + Otto's chrome line at rel 110 = seven.
- [x] **VO #1 paperwork joke doubled.** Marginalia "// PAPERWORK: 0"
  reinforces Dash's "refuses to file any paperwork whatsoever."
- [x] **VO #2 deck callout lands.** "120 OPERATIONS" badge with stack
  of card-backs lower-left, archer-coded stamp-slap entry.
- [x] **VO #2 "ends your career instantly" beat hits.** 440×440 burned.
  webp dead-center with burned-fire glow ring + LOGO_SPRING_COLD spring.
- [x] **VO #2 dark sting carried by cascade re-emergence.** BURNED card
  fades rel 700-740 → cascade is the closing image. "Or ensure your
  colleagues don't" reads against the team-photo backdrop.
- [x] **DeckOf120 NOT present as 120-literal-cards** per amendment SA-5;
  represented via stack-of-3 + "120" badge instead. Stays within the
  Phase 1 BEAT-SHEET intent (the line says "deck of 120," not "see
  120 cards").

## Mid-flight findings + fixes (R3 specific)

- **RedactBar inline-styling.** The vendored `burned-vocabulary/RedactBar.module.css` references CSS custom properties (`--redact-fill`, `--color-cream-11`, `--color-charcoal-1`) that are defined in BURNED's main app stylesheet but NOT loaded into the Remotion render context — trailer's `src/lib/tokens.css` is never imported anywhere (the file exists as a CSS-module-compile-time shim per Phase 4 ADR-15 but `:root` rules don't take effect at runtime). The standalone-form RedactBar was invisible at the larger 0.45-scale; original R1 thumbnail render was the same broken state, small enough to read as redaction by intention. Fix: inline the redact-bar style directly in `OperativeCardFrame.tsx` (charcoal-1 #0a0906 fill, hardcoded width 640, tilt -2°). No CSS-module-variable dependency; renders at any scale. The vendored RedactBar component stays for non-trailer use cases.
- **Plan body's "frames 0-480 relative" timing is stale.** Tier-4 expansion grew S03 to 810 frames; VO landings shifted to abs 570/1007 (= scene-rel 0/437). All visual anchors re-derived against the Phase 2 audio-manifest at execution time per insight #061.
- **R1 cascade overflow → R2 reframe.** R1's vertical column at 106×148 fit inside the safe-square but lost portrait detail. R2 widened the cascade to spread across the full 1920×1080 canvas (cards 360×450 with progressive tilts -8° → +12°). Edge cards bleed slightly past the mobile safe-square (420-1500); trailer ships landscape primary so the bleed is acceptable.
- **VO content drift.** Original R3 design proposal cited S04 cue text ("Fourteen thousand pages…" etc.) due to misread of script.ts; corrected before component implementation. Beat alignment table now ties each visual landing to the actual S03 script line.

## Briggsy-eye sentinel

- [x] `briggsy-review-4.4.signoff` — "lock it" (2026-05-23, ear-checked
  against `out/s03-with-audio.mp4`).

## Verdict

**SHIPPED.** Scene delivers the roster-reveal arc + deck-introduction
arc + dark-sting closing across 27 seconds with no static dead time.
Component inventory now includes `DeckStack` + `BurnedCardReveal`
(new, S03-specific) on top of the shared briefing-room kit
(`BriefingRoomBackground`, `CommsTicker`, `DossierPageWipe`,
`OperativeCardFrame`). Unit 4.10 master-render gate advances to 4/6
sentinels collected (Unit 4.1 scaffold + Unit 4.2 S01 + Unit 4.3 S02 +
Unit 4.4 S03). Remaining: S04 / S05 / S06.
