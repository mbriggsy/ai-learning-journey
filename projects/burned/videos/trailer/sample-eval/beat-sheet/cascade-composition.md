# Cascade composition lock — S04 Receipts Cascade w/ Stacked Payoff

> **Status:** LOCKED at Phase 1 Unit 1.5 (2026-05-18).
> **Source plan:** `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` §Unit 1.5 (lines 1978–2268).
> **Companion to** `videos/trailer/BEAT-SHEET.md` §S04 (the Phase 2/4 consumption contract). This file is the storyboard spec — the storyboard table + coordinates are mirrored verbatim in BEAT-SHEET so a Phase 4 consumer never has to cross-reference; this file adds the entry-choreography rationale, ASCII peak-frame sketches, and the acceptance checklist that the sign-off sentinel `BEAT-SHEET.signoff` will be written against.

---

## 1. Composition decision

**Sequential revelation with focal hierarchy.**

Each cascade element enters at full visual weight INSIDE the central
1080×1080 safe square, reads at full weight for 30 frames (1.0 s),
then decays to 30% opacity chrome at the right-edge slot column as
the next element enters. Card-art halo right-edge-only at 40% opacity
throughout — texture, not focal. Comms-ticker stays dim background
until frame 1800, then a 60-frame ease to "bright" by frame 1860 and
HELD bright through stamp + VO + silent hold.

**The frame 1950 payoff stamp is the trailer's ONLY frame where
multiple elements peak simultaneously.** Every other cascade frame
has exactly one element at full visual weight.

### Why this matters

The cascade is the trailer's load-bearing scene — 33 s of the 95 s
runtime; the R3 stacked-payoff happens here. If the composition
reads as the AI-slop "exciting product trailer" template
(everything at once, six focal points competing), the §2.2
acceptance test ("Could this look like a frame from an Archer
episode?") fails. The single-focal-point + texture-chrome hierarchy
IS the Archer composition vocabulary — and the deliberate
reservation ("never more than one full-weight element, ever, except
at 1950") is what makes the stacked moment land.

---

## 2. Alternatives rejected

| Candidate | Description | Verdict |
|-----------|-------------|---------|
| Full-bleed sequential | One receipt fills the frame; cuts to the next | **Rejected** — loses stacked-payoff impact (sequential ≠ stacked; viewers see receipts come and go but never experience them ACCUMULATING) |
| Layered simultaneous | Everything at peak — HTP hero + 17-card halo + 4 stat captions ringing the safe-square edge + comms-ticker + payoff stamp, 6 focal points competing | **Rejected** (first-draft default) — AI-slop-shaped per design-lens. Reads as Loom/HeyGen/Runway "exciting product trailer" template, not Archer's single-focal-point grammar. Fails §2.2. |
| **Sequential revelation with focal hierarchy** | Elements ACCUMULATE but visual weight transfers — each enters at full weight for its read window, then decays to 30–40% chrome opacity as the next enters. Only the 1950 payoff stamp is the "everything peaks" moment. | **LOCKED** — supports R3 by reserving the stacked moment for the actual payoff frame. Every other cascade frame has exactly one element at full weight. Passes §2.2. |

---

## 3. Frame-by-frame storyboard

Mirrors the BEAT-SHEET.md §S04 Visual storyboard table. Cross-cuts
to the Audio cue table in BEAT-SHEET §S04 by frame.

| Frame range | Focal element (100%) | Texture chrome (30–40%) | Ticker | VO cue |
|-------------|----------------------|--------------------------|--------|--------|
| 1050–1110 | HTP hero slides up from bottom (60 f `EASE_OUT`) | parchment bg only | dim | `S04-cue-01` @ 1050 |
| 1110–1290 | HTP dossier scroll (top portion) | — | dim | `S04-cue-02` @ 1110, `S04-cue-03` @ 1200 |
| 1290–1410 | **Stat 1 caption** enters (6 f `EASE_OUT`, scale 0.95→1.0, 30 f hold) | HTP 70% under active caption | dim | `S04-stat-01` @ 1290 |
| 1410–1560 | **Stat 2 caption** enters; **Stat 1 decays** (12 f `EASE_IN_OUT`, position → right-edge slot, opacity 1→0.3, scale 1→0.65) | Stat 1 30% right-edge; HTP 70% | dim | `S04-stat-02` @ 1410 |
| 1560–1680 | **Stat 3 caption** enters; **Stat 2 decays**; halo begins building (per-card slap, 2-f stagger, top 6 of 17-art set) | Stats 1+2 30%; HTP 70%; halo 40% right-edge | dim | `S04-stat-03` @ 1560 |
| 1680–1860 | **Stat 4 caption** enters; **Stat 3 decays**; halo completes (6-card right-edge column at 40%) | Stats 1–3 30%; HTP 70%; halo 40% | dim → brightening (60-f ease 1800–1860) | `S04-stat-04` @ 1680 |
| 1860–1950 | **Cascade peak HELD** — bright ticker is active signal; HTP/halo/stats are texture | HTP 70%; stats 30%; halo 40% | **BRIGHT (held)** — R15 #2 ticker pulse | — (silent build) |
| **1950** | **Heavy stamp slap onto HTP hero overprint** (16 f, scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle, `EASE_OUT`); HTP drops to 50%; **stamp is SOLE focal point — the ONLY "everything at once" moment** | — | bright | `S04-payoff` @ 1950 |
| 1950–2010 | Stamp held; Dash VO delivers payoff line | — | bright | (payoff cue continues) |
| 1980–2010 | Music duck ramp (`PAYOFF_DUCK_RAMP_FRAMES` = 30, 90% → 30%) completing as VO ends | — | bright | (payoff cue continues) |
| 2010–2040 | **Silent visual hold (30 f)** — stamp + HTP + halo + stats all static; music bed-only at 30%; no VO | — | held bright | — |
| **2040** | **Hard cut to S05 gameplay** | — | — | — |

---

## 4. Stat-slot decayed coordinates

Right-edge column INSIDE the 1080×1080 safe-square (mobile-X
autoplay sees all 4 accumulated stats). The active-caption
center-bottom slot at (x = 960, y = 900) and the decayed right-edge
column at (x = 1380) don't overlap — Δx = 420 px gap.

| Stat slot | Decayed x | Decayed y | Decayed scale | Decayed opacity |
|-----------|-----------|-----------|---------------|-----------------|
| Stat 1 (decay at 1410) | 1380 | 740 | 0.65 | 0.30 |
| Stat 2 (decay at 1560) | 1380 | 790 | 0.65 | 0.30 |
| Stat 3 (decay at 1680) | 1380 | 840 | 0.65 | 0.30 |
| Stat 4 (decay at 1860) | 1380 | 890 | 0.65 | 0.30 |

Active stat caption (during 30-f read window): x = 960, y = 900,
36 px dry / 22 px italic companion (collapse rule in §8).

---

## 5. Entry choreography per element

emil-coded asymmetric timing — **fast in, deliberate read, slow
decay.** The asymmetry IS the comedic structure: emil's "slow where
user is deciding, fast where system is responding" rule INVERTED
because here the viewer is reading, not deciding. Fast-in lands
focus; long-read lets the joke breathe; slow-decay hands focus to
the next element without stealing it back.

### 5.1 HTP hero
- Slide up from bottom over **60 frames (2.0 s), `EASE_OUT`**.
- Position interpolates 0% → 100% simultaneously with opacity 50% → 100%.
- Drops to **70% opacity at frame 1290** (first stat enters); stays at 70% as texture under captions.
- Drops further to **50% at frame 1950** to cede focus to the payoff stamp.

### 5.2 Card-art halo (right-edge only — NOT encircling)
- 6 cards from the 17-art set, stacked vertically along the right edge band (x = 1560–1880, OUTSIDE the safe square — texture only, acceptable to crop on mobile).
- Per-card stamp-slap entry: **8 frames `STAMP_SLAP_FRAMES`, `EASE_OUT`**, scale 0.95 → 1.04 overshoot → 1.0 settle, opacity 0 → 0.4.
- Per-card stagger: **2 frames (67 ms) `HALO_CARD_STAGGER_FRAMES`** — emil's 30–80 ms sequential-reveal range.
- Halo caps at **40% opacity** throughout — texture, not focal.
- The 11 remaining cards of the 17-art set DO NOT enter the trailer cascade (they live in S03 dossier-mosaic context only).

### 5.3 Comms-ticker
- Existing BURNED chrome animation pattern (continuous scroll).
- Stays **dim background level** through the entire cascade until frame 1800.
- **60-frame ease (1800 → 1860)** to "bright" state.
- **Held bright** through stamp + VO + silent hold.
- Dim again at `S05_START` (frame 2040 — S04→S05 is a hard cut, so the dim restart happens implicitly in S05).

### 5.4 Stat captions (the comedic load-bearing element)
- **Enter:** 6 frames (200 ms) `STAT_CAPTION_ENTER_FRAMES`, `EASE_OUT`. Scale 0.95 → 1.0 + opacity 0 → 1. Position: safe-square center-bottom (x = 960, y = 900).
- **Hold:** 30 frames (1.0 s) `STAT_CAPTION_READ_HOLD_FRAMES` at full weight, center-bottom.
- **Decay:** 12 frames (400 ms) `STAT_CAPTION_DECAY_FRAMES`, `EASE_IN_OUT`. Position morphs to right-edge slot (x = 1380, y per §4 slot table) + opacity 1 → 0.3 + scale 1 → 0.65.
- Mobile-X visibility: decayed-stat column at x = 1380 sits **inside** the safe-square's right edge (x = 1500 boundary). The accumulation reading is load-bearing — it's the visual antecedent of "they" in the payoff line — and would have been cropped if the column had landed at the prior-draft x = 1620.

### 5.5 Stacked-payoff stamp (frame 1950, R15 #3)
- Heavy stamp slap: **16 frames `STAMP_SLAP_HEAVY_FRAMES`**.
- Scale envelope: **0.85 → 1.06** (overshoot at 12/16 of the 16-frame window) **→ 1.0** (settle), `EASE_OUT`.
- Overprints HTP hero. HTP drops to 50% simultaneously.
- **Never `scale(0)`** — pop-in from invisible reads as cheap motion-graphics template, not as a physical stamp landing. Start scale 0.85 IS the "stamp lifted, ready to land" pose; the overshoot is the "punch" of contact; the settle is the "ink absorbing."

### 5.6 Transition out
- **NO cross-dissolve** — hard cut at 2040 per Unit 1.4 lock. The 1.0 s silent visual hold (2010–2040) is the resolution; the cut is the punch line of the cut itself.

---

## 6. HTP rendering method lock

### 6.1 Primary path: static PNG + translateY scroll

Clone UMB's selector-agnostic
`projects/undercover-mob-boss/scripts/capture-htp-scroll.ts` (70
lines, verified selector-free — drives `window.scrollY` in 200 px
increments with 80 ms waits between steps, then takes a full-page
screenshot). Adapt for BURNED: change URL to local dev
`http://localhost:5173/howtoplay.html`. **No selector-level code
adaptation needed** — BURNED's `useScrollReveal()` +
`[data-reveal]` ScrollTrigger machinery fires natively on real
scroll events identical to UMB's mechanism.

Output: `videos/trailer/public/htp-fullpage.png` (full-page PNG).

Phase 4 imports as `<Img>` inside an `<AbsoluteFill>` wrapper:

```tsx
<AbsoluteFill style={{ overflow: 'hidden' }}>
  <Img
    src={staticFile('trailer/htp-fullpage.png')}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1920,
      transform: `translateY(${translateY}px)`,
    }}
  />
</AbsoluteFill>
```

The `translateY` driver interpolates over the cascade window with
`EASE_OUT_EMIL` (Phase 0 Unit 0.5 spike-validated curve, same
coefficients as `EASE_OUT` per insight #057 single-source rule).

### 6.2 Static-only acceptance gate (Phase 3 entry)

Static PNG captures the post-reveal state of every `[data-reveal]`
element. GSAP reveal fades, stagger, transform-ins are FROZEN in the
PNG and never re-animate in the trailer — the only "scroll motion"
the trailer delivers is the `translateY` translation.

This is acceptable IFF the dossier reads Archer-grade as static-
content-scrolling. Phase 3 entry adds a perceptual gate: render a
6-second prototype scroll at cascade frame range against the chosen
typography + chrome stack, verify it passes §2.2 quality bar. If
reveal-state-frozen content reads visually flat or motion-graphics-
stalled, escalate to trace-video fallback.

### 6.3 Trace-video fallback (BUDGETED Phase 3 conditional deliverable)

Playwright `page.video()` API records the actual scroll motion as a
`.webm` (transcoded to `.mp4` via ffmpeg). Composed into Remotion
via `<OffthreadVideo>`.

| Trade-off | Static PNG | Trace video |
|-----------|------------|-------------|
| File size | ~500 KB | 5–20 MB |
| Animations | frozen (post-reveal only) | intact |
| Phase 4 complexity | trivial (`<Img>` + interpolate) | `<OffthreadVideo>` frame-sync quirks (allocate 30 min micro-spike if it fires) |
| Phase 3-entry gate | passes IFF static read survives §2.2 | conditional escalation |

### 6.4 Static Remotion recreation — DECLINED

Recreating the 10-act HTP dossier in Remotion is **last-resort**.
The HTP surface is a complex GSAP+React tree; recreating in
Remotion would consume Phase 4 budget disproportionally. Declined
as a primary option; preserved as theoretical fallback if both
static PNG and trace-video fail Phase 3 acceptance (unlikely).

---

## 7. Anti-pattern guard (LOAD-BEARING)

**Rule:** no frame in the cascade except the 1950 payoff stamp has
more than two elements at full visual weight. Accumulated elements
past their read window must hold at ≤ 40% opacity.

**Why load-bearing:** the §2.2 quality bar ("Could this look like
a frame from an Archer episode?") fails if any non-payoff frame
stacks multiple focal elements. The composition's whole shape —
sequential revelation + texture-chrome accumulation — exists to
RESERVE the stacked moment for frame 1950. Violating the rule
anywhere else breaks the reservation and reads as AI-slop.

**Verification:**
- Phase 4 in-studio walkthrough flags any violating frame for
  retuning before MP4 export.
- Phase 6 final QA re-checks against this rule.
- Acceptance criteria in §10 below.

---

## 8. Mobile safe-square placement

The 1080×1080 central square within the 1920×1080 frame
(x = 420–1500, y = 0–1080) contains every element that must survive
mobile-X autoplay crop.

**Inside the safe square (visible on mobile X autoplay):**
- HTP hero (centered at x = 960, ~500 px wide max — reduced from a
  prior 600 px draft to give stat captions room).
- Active stat caption (x = 960, y = 900 ± 30).
- Decayed stat slot column (x = 1380, y = 740 / 790 / 840 / 890).
- Payoff stamp at frame 1950 (centered at x = 960, y = 540, overprinting HTP hero).

**Outside the safe square (acceptable to crop on mobile):**
- Card-art halo right-edge band (x = 1560–1880, 40% opacity — texture only; cropping doesn't damage reading because halo is decorative chrome).
- Comms-ticker (bottom edge y = 1020–1080 — dim background that brightens at 1860; established as ambient chrome).
- Pendleton crest watermark (top-left x = 120, y = 80, 25% opacity — pure ambient).

The decayed-stat column at x = 1380 sits **inside** the safe-square's
right edge (x = 1500 boundary). This was a DOC-REVIEW lock per Phase 1
deepening — a prior draft put decayed stats at x = 1620 (outside the
safe-square), which would have lost the accumulation on mobile-X
autoplay. The accumulation is the **load-bearing visual antecedent
of "they"** in the payoff line "They WERE the operation." — losing
it on the primary distribution surface (mobile-X autoplay) would have
broken the R3 stacked payoff for that audience.

**Caption two-line collapse mechanism.** Minimum legible size:
28 px dry / 22 px italic companion. If composition compression at any
future revision forces below this floor, collapse to dry-stat-only
(drop the companion). Phase 4 enforces the floor at render time;
Phase 1 declares it.

---

## 9. ASCII storyboard sketches — peak frames

Three pivotal frames. Each sketch is a coarse 16-column × 11-row mock
of the 1920×1080 frame (each column ≈ 120 px wide, each row ≈ 98 px
tall). The safe-square spans columns 4–13 (x = 420–1500).

### 9.1 Frame 1680 — Stat 4 enters; halo built; ticker still dim

```
   ┌────────────────────────────────────────────────────┐
   │ ░ crest                                            │  ← row 1: top chrome
   │                                                    │
   │            ┌──────────────────────┐    ╔══╗        │  ← row 3: HTP hero top
   │            │                      │    ║ A║        │  ← halo card #1 (40%)
   │            │       HTP HERO       │    ╠══╣        │
   │            │        (70%)         │    ║ B║        │  ← halo card #2
   │            │     center-frame     │    ╠══╣        │
   │            │                      │    ║ C║        │  ← halo card #3
   │            │                      │    ╠══╣        │
   │            │                      │    ║ D║        │  ← halo card #4
   │            └──────────────────────┘    ╠══╣        │
   │       ┏━━━━━━━━━━━━━━━━━━━━━━━━┓      ║ E║        │  ← halo card #5
   │       ┃   Stat 4 caption        ┃      ╠══╣        │
   │       ┃   (full weight,         ┃      ║ F║        │  ← halo card #6
   │       ┃    center-bottom)       ┃ ┌──┐ ╚══╝        │
   │       ┗━━━━━━━━━━━━━━━━━━━━━━━━┛ │S1│              │  ← right-edge decayed column
   │                                   │S2│              │     (S1+S2+S3 at 30%; S4 still active)
   │                                   │S3│              │
   │ ░░░░░ COMMS TICKER (dim) ░░░░░░░░░░░░░░░░░░░░░░░░  │  ← bottom: ticker still dim
   └────────────────────────────────────────────────────┘
                                                halo OUTSIDE safe-square right boundary
   safe-square: columns 4–13 (x = 420 to x = 1500)
```

### 9.2 Frame 1860 — Cascade peak hold begins; ticker JUST hit bright

```
   ┌────────────────────────────────────────────────────┐
   │ ░ crest                                            │
   │                                                    │
   │            ┌──────────────────────┐    ╔══╗        │
   │            │                      │    ║ A║        │  ← halo at 40%
   │            │       HTP HERO       │    ╠══╣        │     (full 6-card column built)
   │            │        (70%)         │    ║ B║        │
   │            │     texture only     │    ╠══╣        │
   │            │  (no active focal    │    ║ C║        │
   │            │   in the safe-square │    ╠══╣        │
   │            │    interior)         │    ║ D║        │
   │            └──────────────────────┘    ╠══╣        │
   │                                  ┌──┐  ║ E║        │
   │                                  │S1│  ╠══╣        │
   │                                  │S2│  ║ F║        │
   │                                  │S3│  ╚══╝        │
   │                                  │S4│              │  ← all 4 stats at 30% right-edge
   │                                  └──┘              │     (Stat 4 finished decay at 1860)
   │ █████ COMMS TICKER (BRIGHT held) █████████████████ │  ← ticker now at full bright,
   └────────────────────────────────────────────────────┘     hits HELD state at 1860
                                          ↑
                              Ticker is the SOLE bright signal — HTP+halo+stats
                              are all texture chrome at 70%/40%/30%. No active
                              caption (Stat 4 just decayed). Silent build to 1950.
```

### 9.3 Frame 1950 — Heavy stamp slap (the ONLY "everything at once" moment)

```
   ┌────────────────────────────────────────────────────┐
   │ ░ crest                                            │
   │                                                    │
   │            ┌──────────────────────┐    ╔══╗        │
   │            │                      │    ║ A║        │  ← halo unchanged at 40%
   │            │       HTP HERO       │    ╠══╣        │
   │            │        (50%)         │    ║ B║        │  ← HTP dimmed 70 → 50%
   │            │                      │    ╠══╣        │     to cede focus
   │            │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │    ║ C║        │
   │            │   ▓                ▓ │    ╠══╣        │
   │            │   ▓   PAYOFF      ▓  │    ║ D║        │  ← stamp overprints HTP center
   │            │   ▓    STAMP      ▓  │    ╠══╣        │     (R15 #3 chrome,
   │            │   ▓   (SOLE       ▓  │    ║ E║        │      heavy 16-f slap,
   │            │   ▓   FOCAL)      ▓  │    ╠══╣        │      0.85 → 1.06 → 1.0 scale)
   │            │   ▓                ▓ │    ║ F║        │
   │            │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │    ╚══╝        │
   │            └──────────────────────┘                 │
   │                                  ┌──┐              │
   │                                  │S1│              │  ← 4 stats unchanged at 30%
   │                                  │S2│              │     (right-edge column held)
   │                                  │S3│              │
   │                                  │S4│              │
   │                                  └──┘              │
   │ █████ COMMS TICKER (BRIGHT held) █████████████████ │  ← ticker still bright (held
   └────────────────────────────────────────────────────┘     through stamp + VO + silent hold)
                                          ↑
                              THE ONLY frame in the cascade where the focal element
                              (stamp) shares the frame with bright supporting chrome
                              (ticker + halo + accumulated decayed stats). The
                              composition's whole shape exists to RESERVE this moment.
                              Dash VO "They WERE the operation." begins on this frame.
```

The 30-frame silent hold (frames 2010–2040) leaves the same
composition static — stamp + HTP at 50% + halo + 4 stats + bright
ticker — with music dropped to 30% bed-only and no VO. The hard cut
to S05 lands on frame 2040.

---

## 10. Acceptance criteria

Phase 1 Unit 1.5 verification (this file + BEAT-SHEET.md §S04):

- [x] Composition decision: sequential revelation w/ focal hierarchy LOCKED + 2 alternatives documented as rejected with rationale (§1, §2).
- [x] Frame-by-frame storyboard table populated and consistent across this file (§3) + BEAT-SHEET.md §S04.
- [x] Stat-slot decayed coordinate table populated; all coordinates verified inside 1080×1080 safe-square (§4, §8).
- [x] Entry choreography per element documented with emil-vocabulary timing + named transitions.ts constants (§5).
- [x] HTP rendering method primary path locked (static PNG + translateY) with Phase 3-entry perceptual gate + trace-video fallback budgeted (§6).
- [x] Anti-pattern guard rule stated as LOAD-BEARING with Phase 4 + Phase 6 verification ownership (§7).
- [x] Mobile safe-square placement: every focal/active element verified inside safe-square; every cropped element verified as ambient/texture-only chrome (§8).
- [x] Caption two-line collapse mechanism declared at 28 px / 22 px floor (§8).
- [x] ASCII storyboard sketches for 3 peak frames (1680, 1860, 1950) (§9).

Phase 4 in-studio walkthrough verification (post-render):

- [ ] No non-payoff frame contains > 2 elements at full visual weight (§7 rule).
- [ ] All 4 decayed stats remain visible inside the mobile-X safe-square through the cascade peak (frames 1860–2040).
- [ ] Stamp slap scale envelope rendered as 0.85 → 1.06 → 1.0 with overshoot at frame 12/16 of the 16-frame window.
- [ ] Comms-ticker brightening ease completes at frame 1860; held bright through frame 2040.
- [ ] Music duck completes at frame 2010 (as payoff VO ends) — no audible click.
- [ ] Silent visual hold 2010–2040 carries no music ramp / no VO / no animation.

---

## 11. Phase 4 consumption contract

This spec is the source of truth for the Phase 4 S04 cascade scene
component. Phase 4 consumers should:

1. **Import frame ranges + named constants** from `src/lib/timing.ts`
   (`S04_START`, `S04_END`, `STACKED_PAYOFF_FRAME`,
   `PAYOFF_VO_END_FRAME`, `PAYOFF_HOLD_FRAMES`,
   `PAYOFF_MUSIC_DUCK_START_FRAME`, `EASE_OUT`, `EASE_IN_OUT`) and
   `src/lib/transitions.ts` (`STAT_CAPTION_*`, `HALO_CARD_STAGGER_FRAMES`,
   `STAMP_SLAP_HEAVY_*`, `PAYOFF_DUCK_RAMP_FRAMES`,
   `PEAK_MUSIC_VOLUME`, `POST_PAYOFF_BED_VOLUME`). Unit 1.5 introduces
   ZERO new constants — Unit 1.4 already shipped them all.
2. **Bake coordinates** from §4 (decayed stat slots) + §8 (active
   caption, HTP hero, payoff stamp, crest, ticker bands) directly into
   the Phase 4 cascade scene component. The coordinate tables here ARE
   the contract — no separate JSON or YAML, no parameter sheet.
3. **Follow entry choreography from §5** verbatim. The asymmetric
   stat-caption timing (6 / 30 / 12) is comedic-load-bearing; do NOT
   simplify to symmetric easing without re-walking §2.2.
4. **Run anti-pattern guard from §7** as a Phase 4 walkthrough gate
   before the first MP4 export.

This file does NOT define the cascade scene component; Phase 4 owns
that. This file defines the contract that component must satisfy.

---

## 12. Sign-off

This document is **READY FOR REVIEW** but **NOT YET SIGNED OFF.**

Per ADR #22 (sentinel discipline), the sign-off sentinel
`videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is written
ONLY when Briggsy reviews and freezes BEAT-SHEET.md as the Phase
2/3/4 consumption contract — which folds in the cascade composition
lock authored here. Phase 1 closes when that sentinel lands.

When the sentinel lands, this file becomes the immutable Phase 4
cascade scene contract. Until then, Phase 4 may treat this as the
authoritative draft; deltas before sign-off get reconciled with this
file's §1–§9 in the next pass.

---

## References

- Source plan: `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` §Unit 1.5
- BEAT-SHEET.md §S04 — Phase 2 voice-pipeline + Phase 4 composition contract
- `videos/trailer/src/lib/timing.ts` — frame constants + easing curves (Unit 1.1)
- `videos/trailer/src/lib/transitions.ts` — transition + cascade entry-choreography constants (Unit 1.4)
- `videos/trailer/src/components/SpikeHtpCascade.tsx` — Phase 0 Unit 0.5 spike (validates HTP-capture-via-translateY in MP4 export)
- `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts` — UMB selector-agnostic full-page capture script (clone target for BURNED's HTP rendering primary path)
- `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx` — UMB cascade scene precedent
- Insight #029 — downstream consumers need structured data (tables), not authorial prose
- Insight #057 — spike-locked constants WIN over plan-body declarations
- Insight #009 — spec authoring: lock decisions + rationale, don't bloat with implementation
- §2.2 Quality bar acceptance test — `docs/PRODUCT-SPECIFICATION.md`
