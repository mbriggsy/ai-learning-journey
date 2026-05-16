---
title: "Origin Trailer — Phase 1: Beat Sheet Lock"
type: feat
phase: 1
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
  lens applied to design locks. Tiered amendments below per Phase 0's
  precedent. See commit message for full 60+ amendment summary.

  Load-bearing fixes (would have failed at first execution):
  - Variable woff2 fonts (3 files), not 6 weight-specific files
  - timing.ts now uses bare <Series> not <TransitionSeries> — no overlap math
  - R3 cross-dissolve REPLACED with hard cut at S04→S05 (more Archer; dissolves 3 internal contradictions)
  - R6 grep regex (POSIX ERE lookahead unsupported on Windows; rg --pcre2 + 2-pass)
  - CaseBanner reference re-anchored from non-existent file to GameTable.tsx:67-88
  - useFonts.ts: Promise.all pattern per Phase 0 prescription, not race-condition sync flag
  - Sterling-screams-Lana framing → cadence-spec citation (ADR #13 register-recognition)
  - Cascade composition restructured to sequential revelation (was AI-slop-shaped)
  - Per-cue wps unbuildable as drafted (Stat 3 at 3.0 wps, opener at 4.5 wps) — rewritten
  - Udio dropped from candidate pool (Nov 2025 settlement disabled exports)
  - Suno Pro/Premier tier names (was "Producer"); March 2026 ToS — no copyright vesting
  - Artlist/Musicbed pricing 4x corrected ($199-204/yr minimum, not $50/yr)
  - R11-cut bridge line drafted in plan (was punted to Phase 2 execution)
  - Color tokens use Radix-style scale+step (--color-cream-12 not --color-cream)
  - 6-vs-7 operative count: "seven personnel, six in deck and one in basement"

  Structural additions:
  - Step 2 of Unit 1.4: bare <Series> + overlay components, not TransitionSeries
  - Step 2.5 of Unit 1.7: track-shape decision matrix (Path A/B/C) before audition
  - script.ts machine contract for Phase 2 (UMB precedent: TRAILER_V3_PROMPTS)
  - Vitest devDep added to trailer package.json (Phase 0 scaffold gap)
  - HTP trace-video fallback budgeted as conditional Phase 3 deliverable
  - Phase 5 ships gameplay-raw.mp4 + gameplay-markers.json contract
  - Custom emil easing curves (cubic-bezier) added to transitions.ts
  - S05 budget tolerance band 14-22s (S05_BUDGET_MIN/MAX_FRAMES)

  Design locks (emil-design-eng lens validated):
  - Stamp slap: scale(0.95) → scale(1.04) overshoot → scale(1.0) settle (never scale(0))
  - Asymmetric stat-caption timing: fast in 200ms, read pause 1s, slow decay 400ms
  - Card-art halo stagger 2 frames (emil's 30-80ms range)
  - Venetian-blind shadow motion 1.5-2px/frame (survives H.264 compression)
  - Briefing-room S02 depth-plane foreground element added
  - R15 #4 status grammar — differentiated from #3 origin claim

  Plan: 1862 → expected ~2500+ lines.
-->


# Phase 1 — Beat Sheet Lock

## Overview

Phase 1 absorbs the Phase 0 gate outcomes (voice cast, tone thesis,
composite viability, cold-open speaker + line, scream disposition) and
locks the trailer's structural contract in one canonical document:
`videos/trailer/BEAT-SHEET.md`. After Phase 1 ships, every downstream
phase reads from BEAT-SHEET.md as the single source of truth for
runtime, scene count, line set, transition vocabulary, voice
assignments, cascade composition, music-bed source, typography system,
goofy-stats list, R15 chrome copy, and briefing-room visual environment.

Phase 1 produces:

- `videos/trailer/BEAT-SHEET.md` — the locked structural document. 95s
  6-scene layout. Every line of narration written verbatim. Voice
  assignments per line. Frame-accurate timing per scene + per cue.
  Transition vocabulary picked per scene boundary.
- `videos/trailer/src/lib/timing.ts` — frame constants exported for
  Phase 4 scene files (mirroring UMB's `timing-v3.ts` pattern).
- `videos/trailer/sample-eval/beat-sheet/` — supporting eval artifacts
  (goofy-stats cold-read gate, tone-prototype reapplication on the
  full script, music-bed candidate clips).
- 10 locked decisions answering the brainstorm's Deferred-to-Planning
  questions (scene count, transition vocabulary, typography, cascade
  composition, VO-sync model, scream placement, R15 chrome copy, music
  source, briefing-room composition, HTP rendering method).

Phase 1 exits when BEAT-SHEET.md is reviewed by Briggsy and frozen as
the contract for Phases 2–4. Subsequent edits to BEAT-SHEET.md require
a roadmap-level reopening — not a quiet line tweak in Phase 4.

---

## Problem Frame

The brainstorm's "Deferred to Planning" section enumerates 12 distinct
structural decisions that all collapse into one logical artifact: the
beat sheet. The brainstorm names six structural beats (cold open /
briefing setup / mission background / receipts cascade / gameplay
dissolve / closing directive) but explicitly defers scene-count lock,
cascade composition, transition vocabulary, typography system, VO-sync
model, scream placement, music source, R15 chrome copy, briefing-room
visual composition, HTP rendering method, goofy-stats list, and the
cold-open visual composition specifics.

Without Phase 1, Phase 2 (Voice Pipeline) cannot generate WAVs because
the line set is undefined. Phase 3 (Visual Asset Prep) cannot capture
HTP or curate card art because the cascade composition is undefined.
Phase 4 (Remotion Composite Build) cannot assemble scenes because the
scenes don't exist as named files yet. **Phase 1 is the load-bearing
joint between Phase 0's research outcomes and Phases 2–7's production
work.**

The risk Phase 1 manages: deferring "small" decisions into Phase 4
("we'll figure out the transition between S03 and S04 when we get
there") creates compounding ambiguity that produces inconsistent scene
files. The Phase 0 spike (Unit 0.5) validated the *mechanics* of
Remotion compositing; Phase 1 validates the *script* those mechanics
will execute.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5. These shape Phase 1's locks materially.

### 95-second total runtime, 30fps → 2850 frames

R7 mandates 90–100s, "force economy" per Scope Boundaries. UMB v3 ran
148s @ 30fps = 4440 frames (brainstorm cited ~124s; corrected per
roadmap §6 C1 against `timing-v3.ts`). BURNED targets the bottom-middle
of R7's range: **95s = 2850 frames**.

Per-scene density: 95s ÷ 6 scenes = 15.83s/scene avg. UMB density was
148s ÷ 9 = 16.4s/scene. **Comparable density**, not categorically
denser — the brainstorm Key Decisions explicitly correct the earlier
"shorter and denser" rhetorical framing. The bar-raise lives in
per-frame quality (every shot Archer-grade) and the stacked-payoff
beat UMB doesn't have, not in runtime arithmetic.

### Mobile-crop discipline: 1:1 safe square within 16:9

Per roadmap §5.3, X serves a 1.91:1 in-feed preview crop on mobile.
Critical text in BEAT-SHEET.md scene cues must specify text placement
inside the central 1080×1080 safe square within the 1920×1080 frame.

### Sterling-CODED voice register (ADR #13)

Per roadmap §5.1, the cadence target is **Sterling-coded register**
(deadpan mid-Atlantic, sardonic lift, deliberate pace, declarative
falling intonation on punchlines) — never an actor impression. Phase 1
narration must be writable in a cadence the steerable engines from
Phase 0 Unit 0.2 can land. Lines that depend on a specific actor
inflection don't ship.

**Register-recognition aligned (per Phase 0 §5.2 deepening).** Phase 1
narration references the *cadence-spec.md* from Phase 0 Unit 0.2 Step 0
as the authoritative description of Sterling-CODED. **Never identify a
specific Archer scene or performance in BEAT-SHEET.md** — that's
identity-replication framing the ADR #13 deepening explicitly removed
from roadmap §5.2. Acceptable framings: "Sterling-coded volume-
discontinuous register," "deadpan mid-Atlantic falling-intonation."
Unacceptable framings: "the Sterling-screams-Lana cadence," "the
Archer-S03E08 briefing cadence," anything that points at a literal
performance moment.

### Per-cue words-per-second band (cadence-spec dependent)

The cadence-spec.md from Phase 0 Unit 0.2 Step 0 must declare a wps
band — otherwise Phase 1's scene budgets float. Phase 1 plans against:

- **Sustained narration (S02 briefing, S03 background):** 1.9–2.3 wps
- **List / stat reads (S04 cascade stat lines):** 2.4–2.6 wps (ceiling)
- **Declarative payoff lines (S04 stacked payoff, S06 Phrasing):** 1.6–1.8 wps

**Per-cue wps validation is required at lock time** — every cue in the
S04 cascade table must have its wps computed and verified against the
band. If a cue exceeds 2.6 wps, either the line shortens or the cue
window widens. This was a load-bearing gap in the first-draft Phase 1
(several cues landed at 3.0–4.5 wps, infeasible for Sterling-coded
delivery).

### Tone gate result feeds back into the script

Per Phase 0 Unit 0.4, the played-straight thesis is gated on two
listeners articulating "the gap is the joke." Phase 1's narration
script is written assuming the gate cleared. If the gate did NOT
clear, Phase 1 cannot lock until the brainstorm-level Key Decision
re-opens — which bubbles to Briggsy as a structural reset.

### Voice-cast cap: 2 speaking roles in all outcomes

Per brainstorm Scope Boundaries: "Voice cast is 2–3 operatives: Dash
(required, ~90% runtime), cold-open speaker (required — Sable, Vera,
or Janet), Vera scream cameo (conditional on R5 authenticity).
Maximum three distinct voices."

The "scream cameo" must be re-read carefully: **the scream is BY Dash
shouting VERA's name** per Phase 0 Unit 0.6 deepening (the screamer
is Dash, in Sterling-coded volume-discontinuous register; archival
scream is NOT used, voice actor portfolio sample sourced instead).
Vera does not vocalize the scream — Dash does. Vera's "cameo"
is being the named target. This means:

| R5 outcome | R14 cold-open speaker | **Speaking roles** | Scream beat |
|---|---|---|---|
| Kept | Sable | 2 (Dash + Sable) | Dash screams "VERAAA!!!" at frame 2400; Vera in S03 card flash only |
| Kept | Janet | 2 (Dash + Janet) | Dash screams "VERAAA!!!" at frame 2400; Vera in S03 card flash only |
| Kept | Vera | 2 (Dash + Vera) | Vera owns one cold-open line + card flash; Dash screams her name |
| Cut (Vera removed) | Sable | 2 (Dash + Sable) | Frame 2400 beat replaced with chuckle SFX from gameplay |
| Cut (Vera removed) | Janet | 2 (Dash + Janet) | Same |

**Speaking roles = 2 in all R5/R14 outcome branches.** The brainstorm
cap of 3 was a ceiling, not a target. Phase 1 plans for 2 speaking
roles.

**Path D (voice-actor) caveat — RESOURCE MODEL DIFFERS.** If Phase 0
Path D wins (voice actor pre-recorded over TTS), "2 speaking roles"
becomes "2 human actors" — NOT 2 TTS engine presets. The resource
model shifts:

| Aspect | Paths A/B/C (TTS) | Path D (voice actor) |
|---|---|---|
| Per-role unit | Engine + voice preset | Human, in studio |
| Scheduling | Async, parallel | Coordinated, serial within actor |
| Re-record loop cost | ~$0, ~30s per take | Studio + actor time per session |
| Phase 2 budget input | API spend (~$24 ceiling) | Actor fee + studio + NDA (per roadmap §5.3) |
| Cadence steering | Cadence-spec.md JSON adapter | Director direction with cadence-spec excerpts |

**Single-actor doing both characters is harder to source than two
actors each doing one** — one performer holding two distinct voices
through a 95s trailer is a portfolio-rare ask. Default Path D plan
is 2 actors. Confirm with each actor's availability before locking
the recording schedule.

### R6 vocabulary discipline: zero raw SDLC vocab in audio

Per brainstorm R6 translation key: agents → autonomous field assets,
spec → forensic dossier, tests → mission rehearsal artifacts, code →
operational tradecraft, deploy → field deployment, commits → log
entries. Phase 1 line set is grep-able for SDLC vocab violations as
a verification step.

### Cascade-VO sync model is load-bearing

The stacked-payoff beat (R3) is the trailer's single largest bar-raise
moment vs UMB v3 (per success-criteria axis 3). Phase 1 specifies:
which Dash line lands AT the visual cascade peak (Unit 1.5 Step 2);
what visual event delivers the moment (heavy 16-frame stamp slap +
HTP hero drop-to-50%); how many frames the silent visual hold after
the payoff VO runs before the **hard cut** to gameplay (30 frames /
1.0s — was 1.5s + cross-dissolve in first draft; deepening replaced
with hard-cut-after-hold per Unit 1.4 Step 2 lock).

---

## Requirements Trace

- **R1** (in-world Pendleton briefing spine): Unit 1.10 (briefing-room
  visual environment lock).
- **R2** (deadpan, played straight): inherited from Phase 0 Unit 0.4
  tone gate; Unit 1.2 (narration script draft) validates against the
  Phase 0 sample paragraph register.
- **R3** (stacked-climax visual + audio reveal): Unit 1.5 (cascade
  composition lock — specifies the stacked-payoff beat frame +
  surrounding silence).
- **R4** (Dash sustained narration ~90% runtime): Unit 1.2 + Unit 1.3
  (per-line voice assignment + total runtime accounting).
- **R5** (Vera scream cameo, authentic or cut): Unit 1.3 (scream
  placement contingent on Phase 0 Unit 0.6 outcome).
- **R6** (Pendleton vocabulary discipline end-to-end): Unit 1.2
  applies the translation key; verification grep step blocks raw SDLC
  vocab from shipping.
- **R7** (90–100s runtime, 5–7 scenes): Unit 1.1 (beat sheet scaffold
  + scene count lock at 6).
- **R8** (16:9 landscape, mobile-safe central square): Unit 1.5 cascade
  composition + Unit 1.10 briefing-room composition both apply the safe-
  square rule.
- **R9** (Archer-coded mid-century brass / bossa music bed): Unit 1.7
  (music source lock).
- **R10** (HTP dossier hero in cascade): Unit 1.5 cascade composition
  + locks HTP rendering method (Playwright clone-and-adapt of UMB
  pattern, per brainstorm Deferred default).
- **R11** (goofy stats with comedy-first companion pairing): Unit 1.6
  (goofy-stats list draft + cold-read gate).
- **R12** (Imagen-generated card art curation): Unit 1.5 cascade
  composition + Unit 1.6 stat-card art selection.
- **R13** (live gameplay footage closer): Unit 1.5 (cascade composition
  ends at the dissolve; gameplay clip shape declared here for Phase 5).
- **R14** (compressed-Archer cold-open + repeatability declaration):
  Unit 1.1 (scene 1 specification — cold-open card flashes, line,
  R15 stamp, brass hook).
- **R15** (on-screen text signal layer): Unit 1.9 (R15 chrome copy
  lock — specific text for each stamp/ticker line, frame placement).

---

## Key Technical Decisions

- **6 scenes, 95-second runtime, 2850 frames @ 30fps.** The brainstorm
  names 6 structural beats; 6 maps cleanly without forcing merges.
  Some beats span an unevenly long share (cascade is 33s; closing
  directive is 9s).
- **`videos/trailer/BEAT-SHEET.md` is the human contract; `script.ts`
  is the machine contract.** BEAT-SHEET.md is the prose source of
  truth Briggsy reviews. Phase 2 (voice pipeline) consumes a parallel
  TypeScript constant export at `videos/trailer/src/lib/script.ts`
  that mirrors the line set as structured data (`{id, scene, frame,
  voice, text, cadenceAdapter}`). Mirrors UMB v3's
  `TRAILER_V3_PROMPTS` precedent. Edits to either require updating
  both (asserted in `script.test.ts` — every BEAT-SHEET.md line
  appears in `script.ts` with matching text).
- **`videos/trailer/src/lib/timing.ts`** exports frame constants
  (S01_START, S01_END, etc.) so Phase 4 scene files reference timing
  by named constant, not magic numbers. Mirrors UMB's `timing-v3.ts`
  pattern. **Scene durations sum exactly to TOTAL_FRAMES** — we use
  bare `<Series>` not `<TransitionSeries>` (see Unit 1.4 lock), so
  there is no transition-overlap subtraction. timing.test.ts asserts
  the sum.
- **Typography system inherits BURNED's stack** (Clash Display +
  General Sans + JetBrains Mono per HTP dossier), not a new
  Remotion-specific stack. **Three variable woff2 files** at
  `public/fonts/` (ClashDisplay-Variable, GeneralSans-Variable,
  JetBrainsMono-Variable) — NOT six weight-specific files. Variable
  fonts carry their weight range as a CSS axis; `useFonts.ts` loads
  three files with `weight: '200 700'` ranges, blocks render on
  `Promise.all([loadFont(...)])` per Phase 0 Unit 0.1 prescription.
  Reasoning: the trailer's visual brand reads consistent with the
  game's; engineering-peer viewer who clicks through to play the
  game encounters identical typographic vocabulary. UMB v3 split
  into a separate video stack because UMB's in-game typography was
  less refined; BURNED's HTP dossier typography IS the brand
  identity, and the trailer should claim it.
- **HTP rendering method: clone of UMB's `capture-htp-scroll.ts`**
  (per brainstorm Deferred-to-Planning default). Static Remotion
  recreation declined as last-resort only. **Playwright trace-video
  upgrade is a budgeted conditional Phase 3 deliverable**, not an
  unbudgeted escalation. Phase 1 declares a perceptual acceptance
  criterion: render a 6-second prototype of the PNG scroll at
  cascade frame range; verify against §2.2 quality bar before Phase
  3 commits to static-only.
- **VO-sync model: continuous Dash narration over cascade, paced
  per-receipt**, with a single 1.0-second visual hold after the
  payoff VO ends, then a hard cut to gameplay. Continuous narration
  honors R3's "stacked payoff" mechanic — the reveal lands during
  the cascade, not before or after.
- **Transition vocabulary: scoped library of 5 named transitions
  (4 requiring implementation; hard cut is a `<Sequence>` boundary,
  not a component).** Hard cut (S01→S02 via stamp slap finishing
  into S02 head; S02→S03; **S04→S05 — replaces former
  cross-dissolve, see Unit 1.4 lock**; S06 → end). Stamp slap
  (overlay component on S01 tail). Dossier-page wipe (overlay
  component on S03 tail, **16 frames**). Iris wipe (overlay
  component on S05 tail / S06 head, 45 frames). **No cross-dissolve.**
  Generic crossfade defaults remain banned per brainstorm. We use
  bare `<Series>` + scene-internal overlay components for the
  motion transitions — NOT `<TransitionSeries>` presentations
  (matches UMB v3 precedent + avoids overlap-math headache).
- **Music source: royalty-free licensed brass/bossa track via
  Artlist Pro OR Epidemic Sound Pro ($199–$204/yr minimum tier
  covering portfolio embed + Twitter/X + future engineering blog
  reposts).** Lower "Social/Creator" tiers ($120/yr) excluded —
  they don't cover portfolio-site embedding when the site touches
  client/employer work. Reasoning: licensed tracks give published
  metadata + clear rights for a portfolio piece. **Suno Pro
  ($10/mo, $120/yr) generative is the budgeted expected fallback**
  if catalog audition pass doesn't land the 95s cascade-arc within
  20–30 candidates — the brass/bossa-with-distinct-dynamic-arc-at-
  95s constraint is hostile to catalog hit rate. Udio is OUT
  (Nov 2025 settlement disabled external downloads).
- **R15 chrome copy: 4 instances across the trailer.** One in cold
  open (classification stamp), one mid-trailer (comms-ticker pulse
  during cascade), one at the stacked-payoff peak (dossier stamp),
  one at the closing card (subhead). The brainstorm requires "at
  least two"; we ship four for redundancy on the no-context-viewer
  decode mechanism. **#3 carries the agentic-SDLC origin claim
  ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED"); #4 shifts to
  status grammar ("OPERATION STATUS: FIELD-READY") so the two
  signals don't redundantly re-tread the origin claim.**
- **Cascade composition: sequential revelation with focal hierarchy,
  not layered-simultaneous.** Each cascade element enters at full
  visual weight INSIDE the central 1080×1080 safe square (R11 lands
  inside the decode region for mobile X autoplay), reads for its
  window, then decays to 30–40% opacity chrome at side-band position
  as the next element enters. The card-art halo is right-edge-only
  at 40% opacity throughout (texture, not focal). The comms-ticker
  stays dim background until frame 1860 (cascade peak intensification).
  **The 1950 stamp slap is the trailer's ONLY "everything at once"
  moment** — every other cascade frame has exactly one element at
  full visual weight. Anti-pattern guard: layered-simultaneous
  composition reads as AI-generated product-demo template, not
  Archer. The §2.2 quality bar binds Phase 1 to this restraint.

---

## Implementation Units

### Unit 1.1 — Beat Sheet Scaffold + Scene Count Lock

- [ ] **Unit 1.1: Beat Sheet Scaffold + Scene Count Lock**

**Goal:** Create the BEAT-SHEET.md skeleton with 6 named scenes,
frame-accurate timing constants, and per-scene structural placeholders.
Lock the scene count at 6 within the brainstorm's 5–7 range.

**Requirements:** R7 (90–100s, 5–7 scenes), R8 (16:9 landscape).

**Dependencies:** Phase 0 exit (voice cast, tone gate, composite
viability all resolved).

**Files:**

- Create: `videos/trailer/BEAT-SHEET.md` — skeleton with 6 scene
  headings + timing table.
- Create: `videos/trailer/src/lib/timing.ts` — exports frame
  constants.
- Test: `videos/trailer/src/lib/timing.test.ts` — verifies frame
  constants sum to TOTAL_FRAMES and TOTAL_FRAMES = 95 × FPS.

**Approach:**

**Step 1 — Scene table.** Lock the 6 scenes with frame ranges:

| # | Name | Duration (s) | Frame range | Notes |
|---|------|--------------|-------------|-------|
| S01 | Cold Open | 7.0 | 0–210 | R14 compressed-Archer title sequence |
| S02 | Briefing Setup | 12.0 | 210–570 | R1 spine begins; venetian-blind establishing |
| S03 | Mission Background | 16.0 | 570–1050 | Operative roster + deck-of-120 setup |
| S04 | Receipts Cascade w/ Stacked Payoff | 33.0 | 1050–2040 | R3 climax; HTP scroll + card art + goofy stats + Dash reveal line |
| S05 | Gameplay Dissolve | 18.0 | 2040–2580 | R13 live gameplay closer; possible Dash-screams-Vera beat |
| S06 | Closing Directive | 9.0 | 2580–2850 | Final Dash line + Phrasing + BURNED logo + R15 closing stamp |
| **TOTAL** | **—** | **95.0** | **0–2850** | **2850 frames @ 30fps** |

**Step 2 — `timing.ts` exports.**

```ts
// videos/trailer/src/lib/timing.ts
//
// Scene durations sum EXACTLY to TOTAL_FRAMES. We use bare <Series>
// (NOT <TransitionSeries>) — transitions are scene-internal overlay
// components (stamp slap, dossier-page wipe, iris wipe), not
// presentation primitives. No overlap-math subtraction. Matches
// UMB v3 TrailerV3.tsx precedent.
export const FPS = 30;
export const TOTAL_FRAMES = 2850;
export const TOTAL_DURATION_SEC = TOTAL_FRAMES / FPS; // 95.0

export const S01_START = 0;
export const S01_END = 210;     // 7.0s — Cold Open
export const S02_START = 210;
export const S02_END = 570;     // 12.0s — Briefing Setup
export const S03_START = 570;
export const S03_END = 1050;    // 16.0s — Mission Background
export const S04_START = 1050;
export const S04_END = 2040;    // 33.0s — Receipts Cascade w/ Stacked Payoff
export const S05_START = 2040;
export const S05_END = 2580;    // 18.0s — Gameplay Dissolve (BUDGET — see TOLERANCE constants)
export const S06_START = 2580;
export const S06_END = 2850;    // 9.0s — Closing Directive

// === S04 Stacked-payoff beat (R3) ===
// Stamp slaps onto HTP hero overprint at frame 1950 + Dash VO begins
// the stacked-payoff line. VO continues through PAYOFF_VO_END_FRAME.
// 1.0s visual hold + music-bed-only after VO ends. Hard cut to S05
// gameplay at S04_END (frame 2040). NO cross-dissolve — see Unit 1.4
// deepening lock.
export const STACKED_PAYOFF_FRAME = 1950;
export const PAYOFF_VO_END_FRAME = 2010;   // ~60 frames / 2.0s of VO at 1.6-1.8 wps payoff cadence
export const PAYOFF_HOLD_FRAMES = 30;      // 1.0s silent visual hold after VO ends
// Music duck pre-anticipated: starts at PAYOFF_VO_END_FRAME - 30 = 1980,
// completes at PAYOFF_VO_END_FRAME (2010), so duck lands as VO ends.
export const PAYOFF_MUSIC_DUCK_START_FRAME = PAYOFF_VO_END_FRAME - 30; // 1980
export const PAYOFF_MUSIC_DUCK_END_FRAME = PAYOFF_VO_END_FRAME;       // 2010
// Hard cut to gameplay at S04_END = PAYOFF_VO_END_FRAME + PAYOFF_HOLD_FRAMES = 2040 ✓

// === S05 budget tolerance band ===
// Phase 5 captures gameplay; final clip length lands inside this band.
// Phase 4 trims captured footage to fit; S06_START shifts to S05_START
// + actual S05 length. S06's 9s closer has 0.3s of buffer (per Unit
// 1.2 Step 8) absorbing ±10 frames of S05 length variance.
export const S05_BUDGET_MIN_FRAMES = 420;  // 14.0s minimum
export const S05_BUDGET_MAX_FRAMES = 660;  // 22.0s maximum
export const S05_BUDGET_TARGET_FRAMES = 540; // 18.0s ideal (locked unless Phase 5 reports drift)

// === Custom easing curves (emil-design-eng vocabulary) ===
// Strong custom curves — built-in CSS easings (ease, ease-out, etc.)
// are too weak for trailer-grade motion. Phase 4 scene files import
// these as cubic-bezier strings via `transitions.ts`.
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';        // entries, slaps
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';    // page wipes, iris, on-screen movement
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';     // dossier-folder-opens (iOS drawer feel)
```

**Step 2a — `package.json` Vitest devDep.**

Phase 0 Unit 0.1 scaffolded `videos/trailer/package.json` with `studio`,
`render`, `render:final`, `render:thumbnail`, `typecheck` scripts but
**no `test` script and no Vitest dependency**. Phase 1 adds:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.0.0"
  }
}
```

This is additive to Phase 0's scaffold and lives inside the trailer
subproject (matches BURNED's `pnpm-workspace.yaml` isolation per Phase
0 ADR #2).

**Step 3 — BEAT-SHEET.md skeleton.** Each scene gets a heading +
structural placeholders Units 1.2–1.10 fill in:

```markdown
# BURNED Origin Trailer — Beat Sheet (LOCKED)

## Runtime: 95.0s / 2850 frames @ 30fps / 16:9 (1920×1080)
## Voice cast: 2 (Dash + cold-open speaker per Phase 0 Unit 0.2/0.3)
## Music bed: <Unit 1.7>
## Typography: Clash Display / General Sans / JetBrains Mono (inherits HTP)

---

### S01 — Cold Open (0–210 / 7.0s)

**Visual:** <Unit 1.1 scene cue>
**Audio:** <Unit 1.2 line + 1.7 music timing + 1.9 R15 chrome>
**Voice:** <Unit 1.3>
**Transition out:** <Unit 1.4>
**Mobile safe square copy:** <Unit 1.5 placement>

### S02 — Briefing Setup (210–570 / 12.0s)
...
```

**Step 4 — Scene-count-lock rationale.** Document in BEAT-SHEET.md
why 6 instead of 5 or 7:

- **5 scenes:** would force merging cold-open into briefing-setup, OR
  collapsing closing-directive into the gameplay dissolve. Both moves
  damage the R14 cold-open shape (which needs its own pacing) and the
  R3-payoff-then-closer cadence (which needs the silent beat after
  reveal). 5 fails.
- **7 scenes:** would split either cascade or briefing into two sub-
  beats. The cascade is structurally one rising-action event; splitting
  it kills the R3 stacked-payoff mechanic. The briefing-setup +
  mission-background could split into 3 short scenes, but per-scene
  density would drop below UMB's 16.4s/scene benchmark. 7 fails the
  density comparable-to-UMB threshold.
- **6 scenes** is the cleanest mapping. Locked.

**Patterns to follow:**

- UMB v3 `timing-v3.ts`: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts`
  — pattern of explicit per-scene frame constants + asserted-total.
- BEAT-SHEET.md heading structure: clean Markdown, scene as ###,
  per-scene attributes as bold labels.

**Test scenarios:**

- **Happy path:** `pnpm typecheck` on `videos/trailer/` succeeds with
  `timing.ts` present.
- **Happy path:** `pnpm test` runs `timing.test.ts` via Vitest.
- **Happy path:** `timing.test.ts` asserts `TOTAL_FRAMES === 95 *
  FPS` and per-scene durations sum to TOTAL_FRAMES (bare `<Series>`,
  no transition-overlap subtraction).
- **Edge case:** `STACKED_PAYOFF_FRAME + (PAYOFF_VO_END_FRAME -
  STACKED_PAYOFF_FRAME) + PAYOFF_HOLD_FRAMES === S05_START` (the
  payoff-to-hard-cut math checks out: 1950 + 60 + 30 = 2040).
- **Edge case:** `PAYOFF_MUSIC_DUCK_START_FRAME + 30 ===
  PAYOFF_MUSIC_DUCK_END_FRAME` (duck ramp is 30 frames / 1.0s).
- **Edge case:** `S05_BUDGET_MIN_FRAMES <= S05_BUDGET_TARGET_FRAMES
  <= S05_BUDGET_MAX_FRAMES` (tolerance band is valid).
- **Verification:** Markdown lint passes on BEAT-SHEET.md skeleton
  (no broken headings, all 6 scenes present with structural
  placeholders).

**Verification:**

- `videos/trailer/BEAT-SHEET.md` exists with 6 scene headings + total
  runtime block.
- `videos/trailer/src/lib/timing.ts` exists; typecheck clean.
- `videos/trailer/src/lib/script.ts` exists with the line set as a
  typed `readonly Line[]` const; typecheck clean. See Unit 1.2 Step 0
  for the contract.
- `timing.test.ts` + `script.test.ts` pass (Vitest, trailer-local
  via `pnpm test` per Step 2a above).
- Scene-count-lock rationale block written in BEAT-SHEET.md.

---

### Unit 1.2 — Narration Script Draft (Verbatim, All Lines)

- [ ] **Unit 1.2: Narration Script Draft**

**Goal:** Write every line of trailer narration verbatim, in Pendleton
vocabulary, played-straight Sterling-coded cadence, fitting the scene
durations from Unit 1.1. Output lands in BEAT-SHEET.md alongside the
scene cues. **No raw SDLC vocab.** Verified by grep step.

**Requirements:** R2 (deadpan), R4 (Dash sustained ~90% runtime),
R5 (scream placement contingent on Phase 0 Unit 0.6), R6 (Pendleton
vocab), R14 (cold-open line — inherited from Phase 0 Unit 0.3
candidates 4 or 5).

**Dependencies:** Unit 1.1 (scene table), Phase 0 Unit 0.3 outcome
(cold-open line locked), Phase 0 Unit 0.4 outcome (tone thesis
cleared), Phase 0 Unit 0.6 outcome (scream kept or cut).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — fill in **Audio** block for
  each scene with verbatim lines + per-line voice assignment.
- Create: `videos/trailer/src/lib/script.ts` — **machine contract for
  Phase 2.** Typed `readonly Line[]` const export:
  ```ts
  export type Line = {
    readonly id: string;         // e.g., 'S04-payoff'
    readonly scene: 'S01'|'S02'|'S03'|'S04'|'S05'|'S06';
    readonly frame: number;      // start frame
    readonly voice: 'dash'|'sable'|'janet'|'vera';
    readonly text: string;       // verbatim, no embedded direction
    readonly cadenceAdapter?: {  // optional per-engine annotations
      readonly engine: 'elevenlabs-v3'|'gemini-tts'|'openai-tts'|'voice-actor';
      readonly prefixTag?: string;  // e.g., '[shouts]' for ElevenLabs
      readonly notes?: string;      // free-text director notes
    };
  };
  export const BURNED_TRAILER_LINES: readonly Line[] = [/* ... */] as const;
  ```
  Mirrors UMB v3 `narrator-prompts.ts` `TRAILER_V3_PROMPTS` precedent
  (lines 648–685). Phase 2 imports this; BEAT-SHEET.md is the human
  contract; `script.ts` is the machine contract.
- Create: `videos/trailer/src/lib/script.test.ts` — asserts every
  BEAT-SHEET.md line text appears in `BURNED_TRAILER_LINES` with
  matching scene + frame. Catches drift between human and machine
  contract.
- Create: `videos/trailer/sample-eval/beat-sheet/script-grep-r6.md` —
  evidence that R6 grep (rg --pcre2 + 2-pass, see Step 9) returns
  zero SDLC-vocab matches across the script body. (Note: permitted
  exceptions for in-character speech that pretends not to know the
  term, but the line set as drafted should contain none.)
- Create: `videos/trailer/sample-eval/beat-sheet/script-word-count.md` —
  per-scene + **per-cue** word count vs. target wps band (1.9–2.3
  sustained, 2.4–2.6 list, 1.6–1.8 payoff per Critical Constraints).

**Approach:**

**Step 1 — Pendleton vocabulary translation key reapplication.**
From brainstorm R6, restated in BEAT-SHEET.md preamble:

| Raw SDLC term | Pendleton vocabulary |
|---------------|----------------------|
| agents / AI / autonomous LLMs | autonomous field assets |
| spec / requirements doc | forensic dossier / mission briefing |
| tests / test suite | mission rehearsal artifacts / contingencies war-gamed |
| code / source / implementation | operational tradecraft |
| deploy / production | field deployment / activation |
| commits / git log | log entries / case file revisions |
| Claude / LLM / model | (omitted — the "operative" is the field asset, never the model behind it) |
| prompt / chat | briefing / case-file directive |

**Step 2 — Cold-open line (S01, frames 0–210, ~7.0s).**

Speaker: cold-open speaker per Phase 0 Unit 0.3 outcome. Primary
candidate per Phase 0 candidates table: **Candidate #4** ("He's a
machine, this kid. Honestly at this point I'm just impressed.") —
contains the "machine" double-meaning hook R14 requires. Backup:
**Candidate #5** ("Briggsy didn't write this one either. He's getting
good at not writing them.") — direct UMB v3 callback for engineering
peers who've seen the first trailer.

Drafted line (Candidate #4 path, ~4.5s of speech inside the 7.0s
scene):

> *"He's a machine, this kid. Honestly at this point I'm just
> impressed."*

Word count: 11 words. At ~2.5 wps (deadpan pace), ≈ 4.4s. Leaves ~2.6s
of scene runtime for the BURNED logo land + brass hook + R15 stamp
without spoken audio overlap.

**Step 3 — Briefing Setup (S02, frames 210–570, ~12.0s).**

Speaker: Dash. Sterling-coded cadence (deadpan, deliberate, mid-Atlantic
clip). Pacing target: ~2.3 wps for briefing-room formality (slower than
S01's casual debrief).

> *"Good morning. You are watching this because somebody with my
> clearance level — fine, **me** — decided you could be trusted with
> the operation. Code-name: BURNED. Pull up a chair. Try not to make
> me look foolish."*

Word count: 37 words. At ~2.3 wps ≈ 16s. **Too long for 12s scene.**

Revised tighter draft (~11.5s):

> *"Good morning. The agency has decided you can be trusted with
> Operation Pendleton. Code-name in the field: BURNED. Pull up a
> chair. Try not to embarrass me."*

Word count: 28 words. At ~2.4 wps ≈ 11.7s. Fits with a ~0.3s buffer
for the venetian-blind shadow establishing shot at scene head before
the line drops.

**Step 4 — Mission Background (S03, frames 570–1050, ~16.0s).**

Speaker: Dash. Two-line construction with a beat between for visual
cue (operative dossier pages turning).

> *"Our autonomous field assets infiltrated the contract last
> quarter."* [BEAT 0.3s] *"Seven operatives in the active
> roster."* [BEAT 0.3s] *"Six expense reports, all
> classified."* [BEAT 0.3s] *"One field agent who insists on
> being called 'Agent X' and refuses to file any paperwork
> whatsoever."*
>
> [BEAT — 1.0s, dossier-page wipe to deck reveal]
>
> *"Mission: a deck of one hundred and twenty
> operations."* [BEAT 0.4s] *"One of them ends your career
> instantly."* [BEAT 0.3s] *"The rest exist to help you survive
> it."* [BEAT 0.3s] *"Or to ensure your colleagues don't."*

**Ellipsis-pause discipline (per Sterling-coded register).** Beats
land at clause boundaries. Sterling-coded delivery doesn't run lines
together — it punctuates. `[BEAT 0.3s]` markers in BEAT-SHEET.md tell
Phase 2 TTS where to insert silence; they appear as `<break time="
300ms"/>` (SSML) or per-engine equivalent in the cadence-adapter
output. These ARE timing constants — the line set declares them; Phase
2 doesn't guess.

Word count: 65 words across both segments. At ~2.4 mean wps ≈ 13.5s of
speech + 1.9s of internal `[BEAT]` pauses + 1.0s mid-scene dossier-
page wipe beat = 16.4s. Tight against scene budget; if drift surfaces
in Phase 2 TTS render, drop one of the trailing clauses (the "or to
ensure your colleagues don't" line is the cuttable one).

R6 vocabulary check: "autonomous field assets" (clean), "operatives"
(in-character), "Agent X" (in-character), "expense reports"
(in-character), "deck of operations" (slight stretch — *operations*
is the Pendleton word for *cards*, established in HTP dossier; clean),
"mission rehearsal" not yet invoked. No raw SDLC vocab.

**Step 5 — Receipts Cascade with Stacked Payoff (S04, frames
1050–2040, ~33.0s).** The trailer's load-bearing scene. Continuous
Dash VO over the cascade, paced per-receipt, with a **1.0-second
silent visual hold after the payoff VO** before the hard cut to S05.

**Per-cue wps validation (load-bearing — the first-draft cue table
had cues at 3.0 and 4.5 wps, infeasible for Sterling-coded delivery).
Every cue's words ÷ (cue window in seconds) must land ≤ 2.6 wps
ceiling per the Critical Constraints band.**

Structure (frame-accurate timing in BEAT-SHEET.md table):

| Cue frame | Window (s) | Visual | VO line (words) | wps |
|-----------|-----------|--------|-----------------|-----|
| 1050 | 2.0s | HTP dossier slides into hero position (Playwright capture) | *"Operational planning."* (2 w) | 1.0 |
| 1110 | 3.0s | HTP scroll begins (top portion) | *"Fourteen thousand pages of forensic dossiers."* (7 w) | 2.3 |
| 1200 | 3.0s | HTP scroll continues (middle portion) | *"Drafted on weekends, by a field asset who, for compliance reasons, is not named."* (15 w) | 2.5 |
| 1290 | 4.0s | Stat 1 caption enters safe-square center-bottom at full weight | *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* (9 w) | 2.25 |
| 1410 | 5.0s | Stat 1 decays to chrome side-band; Stat 2 enters safe-square center-bottom | *"Six of them, deliberately unrehearsed — the 'memorable ones.'"* (10 w) | 2.0 |
| 1560 | 4.0s | Stat 2 decays to chrome; Stat 3 enters safe-square center-bottom | *"Seventeen asset illustrations. Two of them with hats."* (8 w) | 2.0 |
| 1680 | 6.0s | Stat 3 decays to chrome; Stat 4 enters safe-square center-bottom | *"Seven operatives on the roster. Six in the deck, one in the basement. Don't ask."* (16 w) | 2.67 (at ceiling) |
| 1860 | 3.0s | Cascade peak — comms-ticker brightens; HTP hero + accumulated halo (40%) + bright ticker; **no VO** | — | — |
| **1950** | 2.0s | **Stacked payoff stamp slaps onto HTP hero overprint (heavy slap, 16 frames). Dash VO begins.** | *"The autonomous field assets, the forensic dossiers, the rehearsal artifacts — they weren't preparing for the operation."* (17 w) | 1.7 |
| **1980** | (within prior cue) | Music duck pre-anticipated ramp begins (90% → 30% over 30 frames, completes at 2010) | (VO continues) | — |
| 2010 | 1.0s | Payoff inner-beat lands | *"They WERE the operation."* (5 w in 1.0s) | 1.67 |
| 2010–2040 | 1.0s | **Visual hold: HTP hero + stamp + halo all static. Music at bed-only level (30%). No VO.** | — | — |
| 2040 | — | **Hard cut to S05 gameplay.** | — | — |

**Word count: 89 words across cascade VO. At per-cue wps validated
≤2.67 ceiling, all cues fit their windows. Total S04 VO clock:
32.0s of speech + 1.0s payoff hold = 33.0s. Fits scene budget exactly.**

**Roster reframe (Stat 4, frame 1680):** "Seven operatives on the
roster. Six in the deck, one in the basement. Don't ask." This
preserves the comedy while matching BURNED's actual on-screen
dossier reality — `src/client/howtoplay/acts/ActRoster.tsx:153-158`
explicitly says Otto is on the roster but NOT in the deck ("He's
busy with the (unsanctioned, off-books, almost certainly illegal)
research budget."). Stat earlier read "seven" with implicit deck
context, which contradicted the on-screen dossier viewers can
freeze-frame and count.

**Step 6 — Gameplay Dissolve (S05, frames 2040–2580 nominal; tolerance
band 14–22s per `S05_BUDGET_MIN/MAX_FRAMES`).** **Hard cut in from
S04** (replaces former cross-dissolve, see Unit 1.4 deepening lock).
Real gameplay plays ~14–22s with sparse Dash VO, iris-wipe overlay
component begins at frame `S05_END - 45`.

Visual: hard cut to phone-controller + TV-shared-screen gameplay
capture (Phase 5 deliverable). R15 chrome layer floats: comms ticker
reads "OPERATIVE [REDACTED] — METHOD REPEATABLE" at frame `S05_START +
160` (target ~5.3s into the scene).

Phase 5 ships `gameplay-raw.mp4` (≥30s playthrough) AND
`gameplay-markers.json` declaring the in-point + the BURNED-draw
marker frame in the raw capture. Phase 4 trims with `<OffthreadVideo
startFrom={M} endAt={M + S05_BUDGET_TARGET_FRAMES}>` so the BURNED
draw lands at scene-relative frame 160. Trim ownership = Phase 4
composition; capture + marker shipping = Phase 5.

VO (sparse):

| Cue frame (S05-relative) | VO line |
|--------------------------|---------|
| 0 | (gameplay sound dominates; no Dash) |
| 240 | *"And — between you and me — they appear to be enjoying it."* (12 w in 5.0s = 2.4 wps) |
| 360 | **Scream beat (R5 contingent):** in-game BURNED card draws on capture → Dash VO interjects *"VERAAA!!!"* in **Sterling-coded volume-discontinuous register per Phase 0 Unit 0.6 cadence-spec** (NOT identity-replicated from any specific Archer scene — voice actor portfolio sample or steerable engine output, ADR #13). If R5 cut, this beat is silent or replaced with a chuckle SFX from the gameplay capture. |
| `S05_END - 45` | (silence; iris-wipe overlay begins) |

Word count: ~12 words of Dash VO across S05. ~5s total speech vs
14–22s scene budget = the gameplay AUDIO carries the scene; Dash
sparse on top.

**Step 7 — Closing Directive (S06, frames 2580–2850, ~9.0s).**

Speaker: Dash. Final scene returns to briefing-room frame; venetian-
blind shadows reestablish. BURNED logo final treatment lands at
frame 2780 (10 frames earlier than first-draft 2790 — gives logo
40 frames of breathing room before R15 stamps). R15 #4 closing
stamp ("OPERATION STATUS: FIELD-READY" — status grammar per Unit
1.9 deepening) slaps onto the logo card at frame 2820.

> *"That's the briefing. Operation Pendleton is now in your hands.
> Try not to embarrass me."*
>
> [BEAT 0.4s]
>
> *"…Phrasing."*

Word count: 18 words + Phrasing. At ~2.3 wps (slowest pace — Dash
delivers the close with maximum deliberateness) ≈ 7.8s + 0.4s beat +
0.4s on Phrasing = 8.6s + 0.4s music-final-sting tail = 9.0s. Fits.

**Step 8 — Total word count + runtime validation (post-deepening).**

| Scene | Words | Mean wps | Speech estimate | Scene budget | Buffer | Notes |
|-------|-------|----------|-----------------|--------------|--------|-------|
| S01 | 11 | 2.5 | 4.4s | 7.0s | 2.6s | Cold-open hook headroom for brass + stamp |
| S02 | 28 | 2.3 | 12.2s | 12.0s | -0.2s | Add ellipsis pauses (Step 3) to gain headroom; deadpan pace |
| S03 | 65 | 2.4 | 14.0s + 1.0s mid-beat = 15.0s | 16.0s | 1.0s | Ellipsis pauses inserted after "...last quarter." + "...all classified." |
| S04 | 89 | 2.3 (mean; cue-validated ≤2.67) | 32.0s VO + 1.0s payoff hold = 33.0s | 33.0s | 0.0s | Per-cue wps validated in Step 5 table |
| S05 | 12 | 2.4 | 5.0s | 14–22s (band) | gameplay audio fills | Tolerance band per timing.ts S05_BUDGET_MIN/MAX |
| S06 | 19 | 1.9 (deliberate close) | 10.0s | 9.0s | -1.0s | Compresses if S05 lands at upper budget band; or absorb via 2.0 wps |
| **Total** | **224** | **2.36 mean** | — | **95.0s** | within ±0.5s | — |

S06 buffer note: if S05 captures at upper band (660 frames / 22s),
S06 starts later and absorbs the overrun; if S05 captures at target
(540 / 18s), S06 lands at 9.0s exactly with closing speech at 2.0
wps. The mean wps stays comfortably under the sustained-narration
2.3 ceiling.

**Step 9 — R6 grep verification.** **POSIX ERE has no negative
lookahead** — the original `grep -iE '...|agent(?!\s+X)|...'` regex
quietly mismatches everything containing the pattern (verified in
shell: both positive and negative test cases return NO MATCH). `grep
-P` fails on Briggsy's Windows shell (*"grep: -P supports only unibyte
and UTF-8 locales"*). The correct approach is **ripgrep with PCRE2 OR
a 2-pass `agent` carve-out**:

```bash
# 2-pass approach (works on every shell):
# Pass 1: catch all SDLC vocab including 'agent' and the expanded
# tells the brainstorm + best-practices research surfaced.
rg -i --no-line-number \
  '\b(code|tests?|deploy(s|ment)?|commit(s)?|spec(s|ification)?|agent|agents|LLM|Claude|AI|model|prompt|chat|github|repo|build|sprint(s)?|backlog|ticket(s)?|issue(s)?|PR|merge|pipeline|microservice(s)?|frontend|backend|API|REST|GraphQL|schema)\b' \
  videos/trailer/BEAT-SHEET.md > /tmp/r6-hits.txt

# Pass 2: filter out the in-character "Agent X" hits.
grep -v 'Agent X' /tmp/r6-hits.txt

# Or in one ripgrep invocation with PCRE2 lookahead (cross-platform
# when ripgrep is built with --pcre2):
rg --pcre2 -i \
  '\b(code|tests?|deploy(s|ment)?|commit(s)?|spec(s|ification)?|agent(?!\s+X)|agents|LLM|Claude|AI|model|prompt|chat|github|repo|build|sprint(s)?|backlog|ticket(s)?|issue(s)?|PR|merge|pipeline|microservice(s)?|frontend|backend|API|REST|GraphQL|schema)\b' \
  videos/trailer/BEAT-SHEET.md
```

The vocabulary list expanded from the brainstorm's original 11 terms
to **25 terms** including the SDLC drift surfaced during deepening
(sprint, backlog, ticket, issue, PR, merge, pipeline, microservice,
frontend, backend, API, REST, GraphQL, schema). Phase 2 voice
pipeline runs this gate against `BURNED_TRAILER_LINES[*].text` (not
the prose BEAT-SHEET.md) so the **Pendleton vocabulary translation
key** table can keep its illustrative SDLC-side examples without
tripping the gate.

Expected: zero matches inside `BURNED_TRAILER_LINES[*].text`. Document
the grep result in `sample-eval/beat-sheet/script-grep-r6.md`,
including the literal command run + output.

**Patterns to follow:**

- UMB v3 narrator-prompts.ts TRAILER_V3_PROMPTS — per-scene structured
  narration: `projects/undercover-mob-boss/scripts/narrator-prompts.ts`
- BURNED Dash voice DNA citations (Phase 0 Unit 0.2 sample paragraphs):
  ActMission.tsx, ActRoster.tsx, ActArsenal.tsx
- BURNED Phrasing! catalogue: `docs/PRODUCT-SPECIFICATION.md` §3.5

**Test scenarios:**

- **Happy path:** BEAT-SHEET.md contains a verbatim line for every
  cue frame in the table above.
- **Happy path:** R6 grep returns zero matches in VO body.
- **Edge case:** Total word count + pacing arithmetic sums to 95.0s
  ± 1.0s tolerance.
- **Edge case:** No line exceeds 25 words without an explicit beat
  break (long-line cognitive-load risk for blind listeners).
- **Anti-pattern guard:** No line contains a "voice direction" prefix
  ("Dash, deadpan: ..." in the BEAT-SHEET.md prose). This is for
  future TTS hand-off — the line set must be raw quotable text, not
  text with embedded direction.

**Verification:**

- BEAT-SHEET.md contains 6 scenes, each with verbatim VO lines.
- `script-grep-r6.md` documents the grep run + result (expected: 0
  matches).
- `script-word-count.md` documents per-scene word count + pacing
  validation.
- **Narration script lock** for Phase 2 recorded by Briggsy's
  signoff on BEAT-SHEET.md.

---

### Unit 1.3 — Voice Cast Lock & Per-Line Assignment

- [ ] **Unit 1.3: Voice Cast Lock & Per-Line Assignment**

**Goal:** Per-line voice assignment table in BEAT-SHEET.md, locking
which engine + voice path per Phase 0 Unit 0.2's outcome generates
each line. Final voice cast count is 2 (Dash + cold-open speaker)
in all four R5/R14 outcome branches.

**Requirements:** R4, R5, R14.

**Dependencies:** Unit 1.2 (lines exist), Phase 0 Unit 0.2 outcome
(R4 path + cadence steering chosen), Phase 0 Unit 0.3 outcome
(cold-open speaker locked), Phase 0 Unit 0.6 outcome (scream kept/cut).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — add per-line **Voice** cell
  to each scene's audio block.
- Create: `videos/trailer/sample-eval/beat-sheet/voice-cast-lock.md` —
  records: which Phase 0 path won (A/B/C/D), cadence-spec hash, scream
  outcome, cold-open speaker.

**Approach:**

**Step 1 — Translate Phase 0 outcomes into voice assignments.**

The Phase 0 outcomes feed into a **4-row** outcome matrix. The 5th
row (Cut+Vera) is logically unreachable — if R5 is cut, Vera is
removed from the cast and cannot be the cold-open speaker per the
cut-handling rule.

| R5 outcome | R14 cold-open speaker | Speaking roles | Scream beat |
|------------|----------------------|----------------|-------------|
| Kept (Path a or b cleared) | Vera | Dash + Vera | Dash screams "VERAAA!!!" at frame 2400 |
| Kept | Sable | Dash + Sable | Dash screams "VERAAA!!!" at frame 2400; Vera visible in S03 card flash only |
| Kept | Janet | Dash + Janet | Dash screams "VERAAA!!!" at frame 2400; Vera visible in S03 card flash only |
| Cut (Vera removed) | Sable | Dash + Sable | Frame 2400 beat replaced with chuckle SFX from gameplay |
| Cut (Vera removed) | Janet | Dash + Janet | Same |

Phase 1 locks the per-line **Voice** cell to one specific path per
the Phase 0 results. **Speaking roles = 2 in every reachable branch**
(per Critical Constraints voice-cast cap).

**Step 2 — Per-line table** (mirrors `BURNED_TRAILER_LINES`
machine contract in `script.ts`; both are kept in sync via
`script.test.ts`):

| id | Scene | Frame | Voice | Line | cadenceAdapter notes |
|---|---|---|---|---|---|
| S01-coldopen | S01 | 60 | Cold-open speaker | "He's a machine, this kid..." | Brass hook lands at frame 0; line drops at frame 60 (2.0s in) |
| S02-greeting | S02 | 240 | Dash | "Good morning..." | Venetian-blind establishing 0.5s before line |
| S03-roster | S03 | 600 | Dash | "Our autonomous field assets infiltrated..." | Dossier-page settle at frame 570; 3 internal `[BEAT 0.3s]` pauses |
| S03-mission | S03 | 870 | Dash | "Mission: a deck of one hundred and twenty operations..." | After 1.0s mid-scene dossier-page beat; 3 internal `[BEAT 0.3s]/[BEAT 0.4s]` |
| S04-open | S04 | 1050 | Dash | "Operational planning." | Cascade opens (2-word ledge) |
| S04-htp-1 | S04 | 1110 | Dash | "Fourteen thousand pages of forensic dossiers." | HTP scroll begins (top portion) |
| S04-htp-2 | S04 | 1200 | Dash | "Drafted on weekends, by a field asset who, for compliance reasons, is not named." | HTP scroll continues (middle portion) — split from former 27-word cue |
| S04-stat-1 | S04 | 1290 | Dash | "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." | Stat 1 caption enters safe-square center-bottom |
| S04-stat-2 | S04 | 1410 | Dash | "Six of them, deliberately unrehearsed — the 'memorable ones.'" | Stat 1 decays to chrome; Stat 2 enters |
| S04-stat-3 | S04 | 1560 | Dash | "Seventeen asset illustrations. Two of them with hats." | Stat 2 decays to chrome; Stat 3 enters |
| S04-stat-4 | S04 | 1680 | Dash | "Seven operatives on the roster. Six in the deck, one in the basement. Don't ask." | Stat 3 decays to chrome; Stat 4 enters (matches ActRoster.tsx Otto-exclusion aside) |
| **S04-payoff-a** | S04 | **1950** | Dash | **"The autonomous field assets, the forensic dossiers, the rehearsal artifacts — they weren't preparing for the operation."** | **R3 stacked payoff stamp slap (heavy, 16 frames)** |
| **S04-payoff-b** | S04 | **2010** | Dash | **"They WERE the operation."** | After 0.5s internal beat; final 30 frames before music fully bedded |
| S05-pleasure | S05 | 240 (S05-rel) | Dash | "And — between you and me — they appear to be enjoying it." | Sparse over gameplay |
| S05-scream | S05 | 360 (S05-rel) | Dash | "VERAAA!!!" | R5 contingent; cadenceAdapter prefixTag `[shouts]` (ElevenLabs v3) or `[mood: shouting]` (Gemini); Sterling-coded volume-discontinuous register per Phase 0 Unit 0.6 cadence-spec; **NOT** identity-replicated from any Archer performance per ADR #13 |
| S06-close | S06 | 30 (S06-rel) | Dash | "That's the briefing. Operation Pendleton is now in your hands. Try not to embarrass me." | Final scene; 1.9 wps deliberate close |
| S06-phrasing | S06 | 210 (S06-rel) | Dash | "...Phrasing." | After 0.4s beat |

**Step 3 — Engine per voice cell.**

- **Dash lines + scream**: engine + voice preset that cleared R4 Path
  (A/B/C) — per Phase 0 Unit 0.2 results. Cadence steering = the
  Step 0 cadence-spec.md from Phase 0.
- **Cold-open speaker (1 line)**: engine + voice preset matching
  whichever character (Vera/Sable/Janet) cleared R14 cadence-match.
  Per Phase 0 Unit 0.3 results.

**If Path D won (voice actor) — RESOURCE MODEL.** Per Critical
Constraints, "speaking roles = 2" becomes "2 human actors" in Path D.
Default: 2 actors (one for Dash + scream, one for cold-open speaker).
Single-actor doing both characters is feasible only if the actor's
portfolio shows distinct-character range across the relevant register.
Phase 2 voice pipeline owns the casting + scheduling decision; Phase 1
flags the resource shift here so Phase 2 budgets accordingly.

**Step 4 — Total runtime accounting.**

R4 requires "Dash sustained narration ~90% runtime."

- Dash speech (all lines + scream): ~78s across S02–S06.
- Cold-open speaker speech: ~4.4s in S01.
- Gameplay-audio coverage (non-voice): ~12s of S05.
- Silence beats: ~2.5s total.

Dash share of voiced runtime: 78 / (78 + 4.4) ≈ 94.6%. Clears the ~90%
target.

Dash share of total runtime: 78 / 95 ≈ 82%. (Brainstorm R4 says "~90%
runtime" — meaning the speaking budget, not the total clock. Verified
against R4 phrasing: "Owns ~90% of the runtime." Reading interpretation:
of the voiced runtime. Cleared. If Briggsy reads R4 as "82% feels short
of 90%," option to lengthen S05 Dash VO is reserved as a Phase 1
re-open lever; doing so adds 1–2 sentences to S05.)

**Patterns to follow:**

- UMB v3 voice cast: solo Charon narrator (no second voice). BURNED's
  2-voice plan is a richness escalation.
- Phase 0 Unit 0.2 cadence-spec.md path (single source for steering
  input).

**Test scenarios:**

- **Happy path:** Every line in BEAT-SHEET.md has a **Voice** cell
  filled.
- **Happy path:** `voice-cast-lock.md` records the Phase 0 results
  feeding the locks (which path, which engine, which cold-open
  speaker).
- **Edge case:** Voice-cast count = 2 (verified in lock doc).
- **Edge case:** R5-cut branch correctly replaces the scream beat
  (no orphan "VERA scream" line in BEAT-SHEET.md if cut).

**Verification:**

- BEAT-SHEET.md Audio blocks include **Voice** cell per line.
- `voice-cast-lock.md` exists with Phase 0 outcome trace.
- Total runtime accounting block in BEAT-SHEET.md (Step 4 table).

---

### Unit 1.4 — Transition Vocabulary Lock

- [ ] **Unit 1.4: Transition Vocabulary Lock**

**Goal:** Pick the transition between every adjacent scene pair from
the Archer-grammar scoped library (5 named transitions). Document
each pick with rationale + frame-range + Remotion implementation
sketch. Generic crossfade defaults banned.

**Requirements:** R3 (stacked-climax mechanic — implemented via heavy
stamp slap + 1.0s silent visual hold + hard cut, NOT cross-dissolve;
see Step 2 deepening lock), R8 (landscape-only — transitions must
compose horizontally), R14 (cold-open hands off cleanly to
briefing-setup).

**Dependencies:** Unit 1.1 (scene structure), Phase 0 Unit 0.5 (spike
result establishes which transitions render cleanly in MP4 export).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — add **Transition out** cell
  per scene + 1 transition-vocabulary appendix section.
- Create: `videos/trailer/src/lib/transitions.ts` — exports named
  transition components / props (skeletal; full implementation in
  Phase 4).

**Approach:**

**Step 1 — Composition architecture: bare `<Series>` + overlay
components (NOT `<TransitionSeries>`).** Matches UMB v3 TrailerV3.tsx
precedent exactly. UMB v3 uses bare `<Series>` of `<Series.Sequence
durationInFrames=...>` with **zero scene-boundary transitions**;
FadeTransition exists in UMB only as a scene-internal element fader
(V3S08, etc.).

BURNED inherits this pattern. Stamp slap, dossier-page wipe, and iris
wipe are **scene-internal overlay components** rendered inside the
tail (or head) frames of a scene's `<Series.Sequence>`. They do not
shorten the parent scene's `durationInFrames`. Scene durations sum
exactly to TOTAL_FRAMES (asserted in `timing.test.ts`).

This avoids the `<TransitionSeries>` overlap math (`total = sum -
transitions`) that would otherwise contradict `timing.ts`'s declared
constants. The shape:

```tsx
<Series>
  <Series.Sequence durationInFrames={S01_END - S01_START}>
    <ColdOpenScene />
    {/* StampSlap overlay rendered in S01 tail frames 200-210 */}
  </Series.Sequence>
  <Series.Sequence durationInFrames={S02_END - S02_START}>
    <BriefingSetupScene />
  </Series.Sequence>
  {/* ...etc */}
  <Series.Sequence durationInFrames={S05_END - S05_START}>
    <GameplayScene />
    {/* IrisWipe overlay rendered in S05 tail frames 2535-2580 */}
  </Series.Sequence>
  <Series.Sequence durationInFrames={S06_END - S06_START}>
    <ClosingScene />
  </Series.Sequence>
</Series>
```

**Step 2 — Scoped library (5 named transitions; 4 require
implementation — hard cut is a `<Sequence>` boundary).**

| # | Name | Archer-grammar precedent | Remotion implementation |
|---|------|--------------------------|-------------------------|
| 1 | **Hard cut** | Cuts between briefing-room and field scenes in Archer; the show's default. **Replaces former cross-dissolve at S04→S05** (more shocking, more Archer; dissolves 3 internal timing contradictions; music ducks via volume interpolation before the cut, not under a dissolve). | `<Series.Sequence>` boundary, no transition component. |
| 2 | **Stamp slap** | "CLASSIFIED" / "TOP SECRET" stamp slams in from upper-right with overshoot + settle. The slap settles into the next scene's frame as the stamp peels back. | Overlay component on the source scene's tail frames. Emil-curve: `EASE_OUT = cubic-bezier(0.23, 1, 0.32, 1)`. Standard slap = 8 frames (scale 0.95 → 1.04 overshoot at 6/8 → 1.0 settle at 8/8 + 1-frame settle; **never scale(0)** per emil principle). Heavy slap (payoff stamp at frame 1950) = 16 frames (scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle). |
| 3 | **Dossier-page wipe** | Page-turn motif: the next scene is "under" the current one; horizontal wipe reveals it. **16 frames** (0.53s) — 8-frame draft was below perceptual threshold for "physical motion" reading. | Overlay component on the source scene's tail frames. `clip-path: inset(0 0 0 0)` → `clip-path: inset(0 100% 0 0)` over 16 frames with `EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`. Reveals destination scene via clip-path inversion. |
| 4 | **Iris wipe** | Classic title-sequence closer; circular SVG mask shrinking from frame-encompassing to point at trailer close. | Overlay component on S05 tail (45 frames, 1.5s). `clip-path: circle(70.7% at 50% 50%)` → `clip-path: circle(0% at 50% 50%)` with `EASE_IN_OUT`. Phase 4 may experiment with `iris()` from `@remotion/transitions/iris` if the API surface ports cleanly to overlay-component usage (default `iris({width, height})` expects TransitionSeries context). |

**Cross-dissolve REMOVED.** The former R3 cross-dissolve at S04→S05 is
replaced with a hard cut. Reasoning (multi-agent consensus during
deepening):
- **Design-lens:** Cross-dissolve isn't Archer-native; Archer hard-
  cuts or wipes, doesn't dissolve between briefing-room and field
  footage. Hard cut after the 1.0s payoff visual hold is more shocking
  and more earned.
- **Framework-docs:** `<TransitionSeries>` overlap math (`total = sum
  - transitions`) would contradict timing.ts's declared 2850 total.
  Dropping the cross-dissolve lets us use bare `<Series>` (UMB
  precedent) instead.
- **Adversarial:** The former cross-dissolve framing had 3 mutually-
  inconsistent claims about silence + VO + dissolve overlap (1995 vs
  2010 vs 2040). Hard cut at 2040 after a clean 1.0s hold resolves
  all three.
- **Best-practices:** Audio doesn't cross a dissolve for free; music
  needed explicit volume interpolation regardless. Hard cut + pre-
  anticipated music duck completing at 2010 is cleaner.

The R3 mechanic is now: payoff stamp slap (frame 1950) + Dash VO
(1950–2010) + 1.0s silent visual hold (2010–2040) + hard cut to S05.
The cascade-to-reality bridge lives in the silence + cut, not a fade.

**Step 3 — Per-boundary picks.**

| Boundary | Transition | Frame range | Rationale |
|----------|-----------|-------------|-----------|
| S01 → S02 | Stamp slap | 200–210 (8 frames inside S01 tail, settling 2 frames into S02 head) | Cold-open closes with R15 #1 classification stamp; the stamp IS the transition. Slap settles into S02's briefing-room frame as the stamp peels back. |
| S02 → S03 | Hard cut | 570 | Briefing → mission background is a "next slide" beat. Pendleton briefings cut. Archer briefing scenes typically cut. |
| S03 → S04 | Dossier-page wipe | 1034–1050 (16 frames in S03 tail) | Mission Background ends on the deck-of-120 reveal; the dossier page turns and reveals the cascade. Honors the diegetic frame. |
| S04 → S05 | **Hard cut after 1.0s payoff hold** | 2040 | Replaces former cross-dissolve. Payoff stamp + VO land 1950–2010; visual freezes 2010–2040 (music at bed-only); hard cut to gameplay. Music ducks pre-anticipated ramp (1980–2010) so duck completes as VO ends. |
| S05 → S06 | Iris wipe | 2535–2580 (45 frames in S05 tail) | Closing transition. Iris wipes the gameplay frame closed; behind it, the briefing-room frame reestablishes for the closing directive. Title-sequence-shape echo at trailer close. |
| S06 → end | Hard cut to black | 2850 | The trailer ends. No "fade to black" — Archer hard-cuts to credits. |

**Step 4 — `transitions.ts` skeleton (declarative; Phase 4 implements
overlay components).**

```ts
// videos/trailer/src/lib/transitions.ts
//
// Frame-count constants + emil-easing constants. Overlay-component
// implementations live in videos/trailer/src/transitions/ — Phase 4
// builds those. This file is import surface only.
//
// We deliberately do NOT import from @remotion/transitions or
// pre-wire <TransitionSeries> presentations. Phase 1's earlier draft
// had working `fade()` + `linearTiming()` bodies; that crossed into
// Phase 4 implementation territory and assumed the wrong composition
// shape (TransitionSeries overlap math). Bare <Series> + overlay
// components is the locked architecture (see Step 1).

export const STAMP_SLAP_FRAMES = 8;          // standard cascade slaps + S01→S02 boundary
export const STAMP_SLAP_HEAVY_FRAMES = 16;   // R3 payoff stamp at frame 1950
export const DOSSIER_WIPE_FRAMES = 16;       // S03→S04 dossier-page-turn (was 8; doc agreement)
export const IRIS_WIPE_FRAMES = 45;          // S05→S06 closing

// Music-bed duck for payoff (pre-anticipated, completes as VO ends)
export const PAYOFF_DUCK_RAMP_FRAMES = 30;   // 1.0s ramp from 90% → 30% (via Audio volume interpolation)
export const POST_PAYOFF_BED_VOLUME = 0.30;
export const PEAK_MUSIC_VOLUME = 0.90;

// Per-card-art halo stagger (emil's 30-80ms range = 1-2 frames at 30fps)
export const HALO_CARD_STAGGER_FRAMES = 2;   // 67ms between successive card-art reveals

// Stamp slap motion (used by StampSlap overlay component in Phase 4)
export const STAMP_SLAP_OVERSHOOT_SCALE = 1.04;
export const STAMP_SLAP_HEAVY_OVERSHOOT_SCALE = 1.06;
export const STAMP_SLAP_START_SCALE = 0.95;        // NEVER 0 — emil principle
export const STAMP_SLAP_HEAVY_START_SCALE = 0.85;  // heavier entry; still NEVER 0

// Asymmetric stat-caption timing (per emil — fast in, slow read, slower decay)
export const STAT_CAPTION_ENTER_FRAMES = 6;     // 200ms fast in
export const STAT_CAPTION_READ_HOLD_FRAMES = 30; // 1.0s at full weight
export const STAT_CAPTION_DECAY_FRAMES = 12;     // 400ms slow decay to chrome opacity

// Custom easing curves (re-export from timing.ts for transitions consumers)
export { EASE_OUT, EASE_IN_OUT, EASE_DRAWER } from './timing';
```

**Step 5 — Banned-transition list (anti-pattern guard).**

- **Generic crossfade between any scenes.** Crossfades read as
  "editor defaults." §2 fail. (Note: the FORMER R3 cross-dissolve has
  been replaced with a hard cut per Step 2.)
- **Push transitions** (the slide-in-from-right thing). Reads as
  generic motion-graphics templates.
- **3D cube flips** etc. Not in the Archer vocabulary.
- **Glitch effects.** Not in the Archer vocabulary.
- **`<TransitionSeries>` presentations.** Architectural ban — we use
  bare `<Series>` + overlay components per Step 1.

Document in BEAT-SHEET.md appendix.

**Patterns to follow:**

- UMB v3 TrailerV3.tsx — bare `<Series>` composition, no scene-
  boundary transitions; FadeTransition is scene-internal element
  fader only.
- UMB scene-internal overlay component pattern (`V3S08_ThePunchline.tsx`
  imports FadeTransition).
- Phase 0 Unit 0.5 spike outcome — validates which motion primitives
  render cleanly in MP4 export at 30fps.
- emil-design-eng vocabulary (custom cubic-bezier curves, never
  scale(0), asymmetric enter/exit timing).
- `addSound()` from `@remotion/transitions/audio-transitions` —
  candidate for stamp-slap THWAP SFX overlay (Phase 4 micro-spike).

**Test scenarios:**

- **Happy path:** BEAT-SHEET.md transition table contains 6
  boundaries each with a named transition + frame range + rationale.
- **Happy path:** `transitions.ts` typechecks; exports frame constants
  + emil easing constants consumed by Phase 4 overlay components.
- **Edge case:** Scene durations sum **exactly** to TOTAL_FRAMES
  (transitions are scene-internal overlays, NOT TransitionSeries
  presentations; no overlap subtraction). Asserted by `timing.test.ts`.
- **Edge case:** No `<TransitionSeries>` imports in any trailer source
  file (lint rule: `import/no-restricted-paths`). Phase 4 enforces.
- **Anti-pattern guard:** Banned transitions section documents the
  veto list with examples.

**Verification:**

- Transition vocabulary appendix in BEAT-SHEET.md.
- `transitions.ts` typechecks clean.
- Per-boundary picks documented with frame-range + rationale.
- No cross-dissolve at S04→S05 (locked as hard cut per Step 2).

---

### Unit 1.5 — Cascade Composition Lock

- [ ] **Unit 1.5: Cascade Composition Lock**

**Goal:** Spatial layout, ordering, entry choreography, and VO-sync
model for the receipts cascade (S04). The trailer's load-bearing
scene; this lock determines whether R3's stacked payoff can land.

**Requirements:** R3 (stacked climax), R10 (HTP dossier hero), R11
(goofy stats), R12 (Imagen card art), R8 (mobile safe square).

**Dependencies:** Unit 1.1 (scene table), Unit 1.2 (VO line set for
S04 drafted), Unit 1.6 (goofy stats list outcome — bidirectional;
either drafts first), Phase 0 Unit 0.5 (HTP capture mechanism
validated).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — fill S04 scene block with
  full cascade composition table.
- Create: `videos/trailer/sample-eval/beat-sheet/cascade-composition.md` —
  storyboard frames for cascade peak (frame 1860–1995) sketched at
  the safe-square level.

**Approach:**

**Step 1 — Spatial layout decision: sequential revelation with focal
hierarchy (DEEPENING REWRITE).**

The first-draft cascade composition was layered-simultaneous: HTP
hero + 17-card halo + 4 goofy-stat captions ringing the safe-square
edge + comms-ticker + payoff stamp all at peak. Multi-agent design
review identified this as **LOAD-BEARING AI-slop risk**: six
simultaneous focal points at peak fail the §2.2 quality bar ("Could
this look like a frame from an Archer episode?"). Archer's
composition vocabulary is single-focal-point + one supporting
chrome element at a time; layered-simultaneous reads as the AI-
generated "exciting product trailer" template (Loom/HeyGen/Runway).

Three candidate layouts reconsidered:

| Candidate | Description | Verdict |
|-----------|-------------|---------|
| Full-bleed sequential | One receipt fills frame; cuts to next | Rejected — loses stacked-payoff impact (sequential ≠ stacked) |
| Layered simultaneous | Everything at peak, 6 focal points competing | **Rejected** (was first-draft default) — AI-slop-shaped per design-lens; fails §2.2 |
| **Sequential revelation with focal hierarchy (LOCKED)** | Elements ACCUMULATE but visual weight transfers — each element enters at full weight (clear focal point) for its window, then decays to 30–40% chrome opacity as the next element enters. Card-art halo right-edge-only at 40% throughout (texture, not focal). Comms-ticker stays dim background until 1860. Only the **1950 payoff stamp** is the "everything peaks" moment. | **Locked** — supports R3 by reserving the stacked moment for the actual payoff frame; every other cascade frame has exactly one element at full weight. Passes §2.2. |

**Step 2 — Frame-by-frame storyboard (DEEPENING REWRITE).**

| Frame range | Focal element (full visual weight) | Texture / chrome (30–40% opacity) | Comms-ticker |
|-------------|------------------------------------|-----------------------------------|---------------|
| 1050–1110 | HTP hero slides up from bottom (60-frame `EASE_OUT` slide; 0→100% position + 50→100% opacity) | (briefing-room dim parchment background only) | dim background level |
| 1110–1290 | HTP dossier scroll (top portion) — clear focal point | — | dim |
| 1290–1410 | **Stat 1 caption** enters **inside safe-square center-bottom** (`STAT_CAPTION_ENTER_FRAMES = 6`, EASE_OUT, scale 0.95→1.0 + opacity 0→1); reads at 36px/22px (dry/companion) for `STAT_CAPTION_READ_HOLD_FRAMES = 30` (1.0s). | HTP hero continues scrolling at 70% opacity (becomes texture under the active caption) | dim |
| 1410–1560 | **Stat 2 caption** enters safe-square center-bottom. **Stat 1 decays** (`STAT_CAPTION_DECAY_FRAMES = 12`, EASE_IN_OUT, position morphs to side-band-right + opacity drops to 30%). | Stat 1 at 30% side-band-right; HTP hero 70% | dim |
| 1560–1680 | **Stat 3 caption** enters safe-square center-bottom. **Stat 2 decays** to side-band-right at 30% (Stat 1 already there). Card-art halo **right-edge only** begins building (per-card stagger `HALO_CARD_STAGGER_FRAMES = 2`, opacity caps at 40%, top 6 cards of the 17-art set). | Stat 1+2 at 30% side-band-right; HTP hero 70%; halo right-edge 40% | dim |
| 1680–1860 | **Stat 4 caption** enters safe-square center-bottom. **Stat 3 decays** to side-band-right. Card-art halo completes (full right-edge 6-card column at 40%). | Stats 1–3 at 30% side-band-right; HTP hero 70%; halo right-edge 40% | dim → brightening begins frame 1800 (60-frame ease to "bright" state by 1860) |
| 1860–1950 | **Cascade peak intensification — comms-ticker brightens to full state.** HTP hero still 70% (NOT full weight — saving that for 1950 stamp). 4 stat captions at 30% side-band-right. Halo at 40% right-edge. Music intensifies, no VO. **Three layers with clear hierarchy: bright ticker = active signal; HTP + halo + stats = texture.** | (texture: HTP 70%, stats 30%, halo 40%) | **BRIGHT** ("OPERATIVE [REDACTED] — METHOD REPEATABLE" R15 #2 ticker pulse) |
| **1950** | **Payoff stamp slaps onto HTP hero overprint** (heavy slap, 16 frames; scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle, EASE_OUT). HTP hero drops to 50% opacity to let the stamp dominate. **Stamp becomes the SOLE focal point — only "everything at once" moment in the trailer.** Dash VO begins. | — (stamp is alone at full weight) | held bright as audio-visual support |
| 1950–2010 | Stamp held; Dash VO delivers payoff line. | — | bright |
| **1980–2010** | (Stamp + VO continue) — **Music duck pre-anticipated ramp** (`PAYOFF_DUCK_RAMP_FRAMES = 30`, volume 90% → 30% via Audio volume interpolation) completing as VO ends. | — | bright |
| 2010 | "They WERE the operation." VO ends. | — | bright |
| 2010–2040 | **Silent visual hold (30 frames).** HTP hero + payoff stamp + halo + stats all static. Music at 30% bed-only. No VO. | — | held bright |
| **2040** | **Hard cut to S05 gameplay.** | — | — |

**Step 3 — Mobile safe-square placement (DEEPENING FIX).**

The 1080×1080 central square within the 1920×1080 frame contains:

- **HTP hero** (centered, ~500px wide max — reduced from 600px to give
  stat captions room).
- **Active stat caption** at safe-square center-bottom (y ≈ 810–960
  px), 36px dry / 22px italic companion. **Inside the safe square at
  the moment it's the focal point.** Resolves the prior Phase 1
  contradiction (R11 is comedy-load-bearing AND mobile-X-cropped) by
  placing the caption inside the decode region during its read window.
- **Payoff stamp at frame 1950** (centered, overprinting HTP hero).
- **R15 #1 cold-open stamp** (S01 — applies in S01, not S04 cascade,
  but listed for placement-policy completeness).

OUTSIDE the safe square (acceptable to crop on mobile X autoplay):

- **Decayed stat captions** (after their read window). Once a stat
  has been read, it migrates to side-band-right at 30% opacity. Mobile
  X viewers see the active caption inside the square; missing the
  decayed-chrome captions is acceptable because they've already done
  their narrative work.
- **Card-art halo** (right-edge band, 40% opacity — texture).
- **Comms-ticker** (bottom edge — dim background, brightens at 1860).

**Caption two-line collapse mechanism.** Below 28px/22px the dry/
companion structure collapses. Minimum legible size = 28px dry / 22px
companion. If composition compression forces below this floor,
**collapse to dry-stat-only** (drop the companion). Phase 4 enforces
the floor; Phase 1 declares it.

**Anti-pattern guard (LOAD-BEARING, captured in cascade-composition.md
acceptance criteria):** No frame in the cascade except the 1950
payoff stamp has more than two elements at full visual weight.
Accumulated elements past their read window must hold at ≤40%
opacity. Verification: a Phase 4 in-studio walkthrough flags any
violating frame for retuning before MP4 export.

**Step 4 — VO-sync model lock.**

**Continuous Dash narration paced per-receipt**, with one ~3-second
music intensification window under the cascade peak (no VO 1860–1950)
and one 1.0-second silent visual hold after the stacked-payoff VO
(2010–2040). **No cross-dissolve** — hard cut at 2040 per Unit 1.4
deepening lock. Per Unit 1.2 Step 5 cue table.

Why not silent cascade with VO bookends? Per brainstorm Deferred
question: bookended VO produces a "highlight reel" feel inconsistent
with the briefing spine. Continuous Dash narration keeps the briefer
present through the entire visual climax.

Why not per-receipt with hard silences between? Hard silences between
stats break the cascade's pacing and read as "narrator pause for
chuckle" — broken-rhythm sitcom voiceover, not Archer.

**Step 5 — Entry choreography per element (DEEPENING — emil-coded).**

- **HTP hero:** ease-out slide-up from bottom (60-frame, `EASE_OUT`).
  position 0%→100% + opacity 50%→100% simultaneously. Drops to 70%
  opacity at 1290 (when first stat enters), then back to 100% only
  in service of the 1950 stamp moment (actually drops further to 50%
  at 1950 to let the stamp dominate).
- **Card-art reveals:** stamp-slap entry per `transitions.ts`
  (scale 0.95 → 1.04 overshoot → 1.0 settle, 8 frames, EASE_OUT,
  opacity 0 → 0.4 — caps at 40% halo opacity). **Per-card stagger 2
  frames** (67ms — emil's 30–80ms range; faster than the first-draft
  4-frame stagger which was on the slow end).
- **Card-art halo:** right-edge only (NOT encircling). 6 cards
  vertically stacked along right edge, opacity caps at 40%. The
  remaining 11 of the 17-card set DO NOT enter the trailer cascade —
  they live in S03 dossier mosaic context only.
- **Comms-ticker:** existing BURNED chrome animation pattern (continuous
  scroll). **Stays dim background level through the entire cascade
  until frame 1800**, then 60-frame ease to "bright" state by 1860.
  Held bright through stamp + VO + silent hold. Dim again at S05_START.
- **Stat captions:** asymmetric emil-coded timing:
  - **Enter:** 6 frames (200ms), `EASE_OUT`, scale 0.95 → 1.0 + opacity 0 → 1.
  - **Hold:** 30 frames (1.0s) at full weight, safe-square center-bottom.
  - **Decay:** 12 frames (400ms), `EASE_IN_OUT`, position morphs to
    side-band-right + opacity drops 1 → 0.3, scale 1 → 0.85 (smaller
    chrome).
  - This asymmetry (fast in, read pause, slow decay) IS the comedic
    structure — emil's "slow where user is deciding, fast where system
    is responding" inverted because here the user is reading not
    deciding.
- **Stacked-payoff stamp (frame 1950, R15 #3):** heavy slap, 16 frames
  (scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle, `EASE_OUT`).
  Overprints HTP hero. HTP drops to 50% opacity simultaneously to
  cede focus.
- **NO cross-dissolve out** — hard cut at 2040 per Unit 1.4 lock.

**Step 6 — HTP rendering method lock (DEEPENING).**

Per brainstorm Deferred-to-Planning default: **clone UMB's
`capture-htp-scroll.ts`** at `projects/undercover-mob-boss/scripts/`.
Adapted to BURNED's `/howtoplay` route (Vite dev `/howtoplay.html`).
Output: `videos/trailer/public/htp-fullpage.png` (full-page PNG
capture).

**Clone-and-adapt scope:** UMB's script step-scrolls 200px at a time
with 80ms waits between steps to TRIGGER ScrollTrigger animations
before screenshotting. BURNED's HTP page uses identical
`useScrollReveal()` + `[data-reveal]` GSAP ScrollTrigger machinery
(`src/client/howtoplay/hooks/useScrollReveal.ts`) so the step-scroll
mechanism ports directly. Differences requiring local adaptation:
- **URL:** UMB hits `https://undercover-mob-boss.vercel.app/how-to-play.html`;
  BURNED clone targets a local dev server (`http://localhost:5173/howtoplay.html`)
  during capture — BURNED's deploy migration (`burned-cxa.pages.dev`)
  is in progress per TODO §1.
- **Selectors:** BURNED uses `[data-reveal]` (per `useScrollReveal.ts`);
  UMB uses different markup. Adapt scroll-trigger detection accordingly.

Phase 4 imports the PNG as `<Img style={{transform: 'translateY(...)'}}>`
inside an `<AbsoluteFill>` wrapper to drive scroll motion at scene-
runtime — same trick UMB uses.

**Perceptual acceptance criterion (LOAD-BEARING — must clear before
Phase 3 locks static-only path).** Static PNG captures the post-
reveal state of every `[data-reveal]` element. GSAP animations
themselves (reveal fades, stagger, transform-ins) are FROZEN in the
PNG and never re-animate in the trailer. The "scroll motion" Phase 4
delivers is `translateY` translation only.

This is acceptable IFF the dossier reads Archer-grade as static-
content-scrolling. To verify before Phase 3 commits to static-only:
- **Phase 0 Unit 0.5 spike already validated** the rendering pipeline
  (PNG renders + translates in MP4 export).
- **Phase 1 adds an additional perceptual gate** at Phase 3 entry:
  render a 6-second prototype scroll at cascade frame range against
  the chosen typography + chrome stack. Verify it passes §2.2 quality
  bar ("Could this look like a frame from an Archer episode?"). If
  reveal-state-frozen content compositions look visually flat or
  motion-graphics-stalled, escalate to trace-video.

**Trace-video fallback — BUDGETED CONDITIONAL PHASE 3 DELIVERABLE**
(not unbudgeted escalation). Playwright `page.video()` API records
the actual scroll motion as a `.webm` (transcoded to `.mp4` via
ffmpeg). Composed into Remotion via `<OffthreadVideo>`. Trade-offs:
- File size ~5–20 MB vs ~500 KB static PNG.
- Slight rendering complexity (`<OffthreadVideo>` has known frame-
  sync quirks; allocate 30 min Phase 4 micro-spike if it fires).
- Animations intact.

**Phase 3 plan deepening must budget BOTH paths.** Static is default;
trace-video is conditional on Phase 3-entry perceptual gate failing.
Phase 3 plan currently budgets static-only; that's a load-bearing
gap surfaced during Phase 1 deepening and requires Phase 3 plan to
deepen with the conditional path.

**Static Remotion recreation** is last-resort — the 10-act HTP
dossier is a complex GSAP+React surface; recreating it in Remotion
would consume Phase 4 budget disproportionally. Declined as a primary
option.

**Patterns to follow:**

- UMB capture: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- UMB S08 cascade: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx`
- Phase 0 Unit 0.5 spike — validates HTP-capture-via-translateY pattern in MP4 export.

**Test scenarios:**

- **Happy path:** S04 block in BEAT-SHEET.md includes the cue table
  with frame-accurate entries.
- **Happy path:** Cascade-composition.md storyboard frames sketched.
- **Edge case:** Cascade peak frame (1860–1950) contains zero VO; the
  silence is intentional and called out in BEAT-SHEET.md.
- **Edge case:** Stacked-payoff frame (1950) contains stamp slap +
  Dash VO entry; the cue must coincide within ±2 frames.
- **Anti-pattern guard:** No element relies on color alone for meaning
  (Briggsy is color blind — typography + position + shape carry the
  signal).

**Verification:**

- S04 block fully filled in BEAT-SHEET.md.
- `cascade-composition.md` exists with storyboard frames.
- HTP rendering method lock documented.

---

### Unit 1.6 — Goofy-Stats List + Cold-Read Gate

- [ ] **Unit 1.6: Goofy-Stats List + Cold-Read Gate**

**Goal:** Draft the final goofy-stats list (4 stat-pairings, each a
dry-fact + absurd-companion). Submit to cold-read gate: if a
reviewer-who'd-watch-UMB-v3 doesn't laugh at least twice on first
read, R11 is cut and the cascade becomes purely visual.

**Requirements:** R11 (goofy stats with comedy-first pairing), R12
(card art selection ties to stat content).

**Dependencies:** Unit 1.2 (S04 line set drafted; stats are part of
the VO + caption set), Unit 1.5 (cascade composition exists).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — finalize the 4 stat pairings
  in the S04 cue table.
- Create: `videos/trailer/sample-eval/beat-sheet/goofy-stats-list.md` —
  the candidate stat pool (~15 pairings) + the 4 finalists + cold-read
  gate result.

**Approach:**

**Step 1 — Stat pool.** Draft ~15 candidate pairings, sourced from
authoritative BURNED stats (TODO.md §1 squeaky 2026-05-16, README,
git history, source tree). Per `feedback-stats-single-source.md` —
verify counts against the actual source, never working memory.

Pool (drafts; chosen finalists in Step 3):

| # | Dry stat | Absurd companion | Source |
|---|----------|------------------|--------|
| P1 | 14,000 pages of documentation | + 6 sticky notes (recovered) | docs/ + sticky-note inventory (fictional) |
| P2 | 1,407 tests passing | 6 deliberately unrehearsed ("the memorable ones") | TODO.md §1 + 6 expected-fail counts |
| P3 | 17 asset profile illustrations | 2 of them with hats | public/assets/cards/ count + Dash + Otto wear hats |
| P4 | 7 operatives in active roster | + 1 who is, technically, all of them. Don't ask | brainstorm roster + Agent X mechanic |
| P5 | 68 mission-rehearsal files | One named "engine.test.ts," which feels redundant | test-file count + Engine test name |
| P6 | 120 distinct operations in the deck | Including one that ends your career instantly | RULES-REFERENCE.md card count + BURNED card mechanic |
| P7 | 36 protocol revisions | 6 of them are just "we changed our minds" | git log + PROTOCOL_VERSION = 6 |
| P8 | Cover identity: "card game" | Active threat level: medium | self-described BURNED purpose |
| P9 | 0 surviving timeline drafts | (the field asset claims this is intentional) | git history shows iterative spec rewrites |
| P10 | 9 named operatives total | + 1 named Dolores Grieves, who runs HR and may also be the field asset | Pendleton roster + Dolores NPC |
| P11 | Asset turnaround: 4 sessions | Asset turnaround if you don't count weekends: also 4 sessions | session-history-based |
| P12 | 100 KB phone bundle ceiling | Phone bundles currently shipping: 19.17 KB | TODO.md §1 measured |
| P13 | Forensic dossier pages | Number of dossiers with footnotes citing other dossiers: 4 | docs/conventions/ + cross-refs |
| P14 | Mission rehearsal contingencies: 1,407 | Most-rehearsed: "the field asset gets the deck wrong" | top-failing test (BURNED-draw edge cases) |
| P15 | Active runtime in shipped form: 95 seconds | Total time spent timing it: longer than that | meta-stat |

**Step 2 — Selection criteria.**

For S04's 4-stat cue slots, pick 4 from the pool that:

1. Span different stat domains (planning / testing / asset / personnel)
   to avoid "stat about tests, stat about tests, stat about tests" rhythm.
2. The dry stat is verifiable (cite source in BEAT-SHEET.md).
3. The absurd companion is short enough to read in the 60-frame caption
   window (≤8 words ideal, ≤12 words hard cap).
4. The pairing structure (dry + absurd) lands faster than a single long
   sentence — the gap between the two halves IS the joke.
5. No companion line is meaner-than-Archer (no companion targets
   Briggsy, the team, or any real human — only fictional operatives or
   abstract concepts are fair game).

**Step 3 — 4 finalists (DEEPENING: stat 4 reframed to match dossier reality).**

| Slot | Finalist | Source-verified | Rationale |
|------|----------|-----------------|-----------|
| S04 Stat 1 (frame 1290) | P1: "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." | TODO.md §1 (1,407 tests pass, verified 2026-05-16). **NOTE: previous draft's "14,000 pages" was unverified; Step 5 must run actual `wc -w` if a pages-stat is wanted.** | Opens the cascade with mission-rehearsal cadence — translates the SDLC-as-spywork concept verbally as the cascade visually begins. |
| S04 Stat 2 (frame 1410) | P2: "Six of them, deliberately unrehearsed — the 'memorable ones.'" | TODO.md §1 (6 expected-fail) | Engineering-peer callback (expected-fail tests = bugs we're deliberately not fixing yet) without breaking diegetic frame. |
| S04 Stat 3 (frame 1560) | P3: "Seventeen asset illustrations. Two of them with hats." | `public/assets/cards/*.webp` count = 17 ✓ (verified 2026-05-17). Hat count needs Phase 1 visual audit (Step 5). | Lands hardest visually because the right-edge halo IS building during this line. |
| S04 Stat 4 (frame 1680) | **REFRAMED** P4': "Seven operatives on the roster. Six in the deck, one in the basement. Don't ask." | `ActRoster.tsx:18-75` OPERATIVES array = 6 entries (Dash, Vera, Sable, Janet, Neal, Agent X); `ActRoster.tsx:153-158` aside excludes Otto from deck ("Otto, our resident scientist, is on the roster but **not in the deck.** He's busy with the (unsanctioned, off-books, almost certainly illegal) research budget."). New phrasing preserves the comedy AND matches the on-screen dossier viewers can freeze-frame. | Closes cascade pacing with the Otto-in-the-basement beat — funnier than first-draft "plus Agent X who is all of them" and survives freeze-frame audit. |

**Step 4 — Cold-read gate (DEEPENING REWRITE — N=3, 0–2 scale).**

The first-draft gate (N=1 reviewer + binary laugh-count + verbal-
compliment-accepted) is methodologically thin: industry comedy-writers'-
room practice is 5–11 reviewers via table read. N=1 swings on
reviewer mood; the "audibly laughs OR grins OR articulates 'this
one's good'" rubric conflates involuntary laughter with social-
politeness compliments (false-pass risk) and Sterling-coded deadpan
deliberately suppresses overt laughter (false-fail risk).

**Protocol (LOCKED):**

1. **Recorded stimulus.** Briggsy or selected TTS preview reads all 4
   finalists in Sterling-coded cadence as a single ~30s audio clip.
   Distributed asynchronously to reviewers via Discord / DM. Recording
   archived in `goofy-stats-list.md` as evidence.
2. **N=3 reviewers minimum**, drawn from the engineering-peer pool
   (Harry + 2 others from Briggsy's network who've seen UMB v3).
   Reviewers receive the audio + the question, do NOT see each other's
   responses.
3. **Per-pairing 0–2 score:**
   - **0** = flat / no reaction
   - **1** = smirk / light grin / "huh, that's clever"
   - **2** = audible laugh / "oh that's good" / unprompted reread
4. **Gate threshold (ship R11):**
   - Total score across 3 reviewers × 4 pairings ≥ **12 of 24** (50% floor), AND
   - **≥2 pairings score ≥4 across reviewers** (consensus on WHICH
     pairings land, not just total count)
5. **Soft-fail handling (partial cut):**
   - If exactly **1 pairing scores < 3** across all 3 reviewers, that
     pairing drops; swap from pool (Step 1 P5–P15 backups: P5 mission-
     rehearsal-files, P6 deck-of-120, P11 weekend-asset-turnaround).
6. **Hard-fail handling (full R11 cut):**
   - If total < 12 OR fewer than 2 pairings score ≥4: **R11 cuts.**
     Cascade VO Stat 1–4 cues drop; cascade becomes purely visual
     (HTP scroll + card-art halo + R15 chrome). Dash VO lines for
     stats are replaced with a single bridging line.

**R11-cut bridge line (DRAFTED NOW so Phase 2 doesn't wait):**

If R11 cuts, S04 VO between frames 1110 (HTP scroll begins) and 1950
(payoff stamp) collapses to ONE bridge line at frame ~1400:

> *Bridge candidate A (10 words, 4.0s at 2.5 wps):* "Fourteen
> thousand pages of forensic dossiers. Drafted on weekends."
>
> *Bridge candidate B (16 words, 6.5s at 2.5 wps):* "Fourteen
> thousand pages of forensic dossiers. Drafted on weekends. By a
> field asset, deliberately not named."

Cascade visual still plays per Unit 1.5 Step 2 frame-by-frame
storyboard but **without the stat captions** — card-art halo
(right-edge 40%) + HTP hero scroll + comms-ticker bright-at-1860 carry
the entire visual content. The 1950 payoff stamp is unaffected. Both
bridge candidates land before frame 1700 to leave a long silent
build to the stamp.

Phase 2 voice pipeline starts on whichever R11 outcome lands;
candidate bridge lines pre-drafted in `BURNED_TRAILER_LINES`
(commented out for the R11-keep path; activated if R11 cut fires).

**Step 5 — Stat-source verification (DEEPENING).**

Before the cold-read gate runs, verify every dry stat against its
source. Per `feedback-stats-single-source.md`:

- **P1 NOT USED** as a stat in the locked finalist set (the
  "fourteen thousand pages" line moved to S04-htp-1 narration AND
  to R11-cut bridge line, NOT as a Stat-1 caption). If a future
  rev wants "14,000 pages" as a numeric stat caption, run actual
  `Get-ChildItem docs/ -Recurse -File -Filter *.md | Get-Content |
  Measure-Object -Line` to verify magnitude before shipping.
- **P2** TODO.md §1 says **1,407 pass | 6 expected fail (68/68 files)**.
  Stat 1 ("Mission rehearsal: fourteen hundred and seven contingencies
  war-gamed") + Stat 2 ("Six of them, deliberately unrehearsed")
  matches exactly. ✓
- **P3** `Glob public/assets/cards/*.webp` — 17 files ✓ (verified
  2026-05-17). **"Two with hats" audit pending** — Phase 1 visual
  audit step: open each operative portrait, count hat-bearing
  characters. Currently expected: Dash Barlowe (spy-archetype, likely
  hatted) + one other. If hat count != 2, rewrite stat with actual
  count, OR drop the "with hats" companion.
- **P4'** Roster from `ActRoster.tsx`:
  - OPERATIVES array (deck): Dash, Vera, Sable, Janet, Neal, Agent X = **6 in deck**
  - Otto (in roster, NOT in deck): line 153-158 explicit aside
  - Dolores Grieves (NPC, not in roster): per character memory
  - **"Seven on the roster, six in the deck, one in the basement"
    matches the dossier viewers can freeze-frame.** ✓

Document verification commands + counts + hat-audit in
`goofy-stats-list.md`.

**Patterns to follow:**

- UMB v3 stat-list precedent: V3S08_ThePunchline.tsx — cite-and-pair
  pattern.
- `feedback-stats-single-source.md` — grep-and-verify discipline.

**Test scenarios:**

- **Happy path:** All 4 finalist dry stats verified against current
  source counts.
- **Happy path:** Cold-read gate reviewer reports ≥2 laughs / grins.
- **Edge case (R11 cut):** Documented fail-action lands; Unit 1.2
  S04 line set revised; cascade goes visual-only.
- **Anti-pattern guard:** No "167 tests passing" / generic LinkedIn-
  coded stat without absurd companion ships.

**Verification:**

- `goofy-stats-list.md` exists with full pool, 4 finalists, source
  verification, cold-read gate result.
- BEAT-SHEET.md S04 cue table reflects locked stats (or visual-only
  fallback if cut).

---

### Unit 1.7 — Music Source Lock

- [ ] **Unit 1.7: Music Source Lock**

**Goal:** Pick a concrete music-bed track or licensed-track candidate
list for the trailer. Source decision (royalty-free / licensed /
generative) locked; specific track(s) auditioned and named.

**Requirements:** R9 (Archer-coded mid-century brass / bossa).

**Dependencies:** Unit 1.1 (95s runtime — track must support 95s
without repeating awkwardly), Unit 1.4 (hard cut at frame 2040 needs
music to support a pre-anticipated 30-frame duck completing at 2010
under VO).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — name the locked track in the
  preamble (license + URL + duration).
- Create: `videos/trailer/sample-eval/beat-sheet/music-sourcing.md` —
  candidates auditioned, picked-track rationale, license-document path.

**Phase 3 owns** the `videos/trailer/public/audio/music-bed.mp3`
deliverable (per Phase 3 plan). Phase 1 locks source-type +
audition criteria + cue-map; Phase 3 executes the audition + procure +
file-on-disk. Previously listed as a Phase 1 verification artifact —
removed during deepening to fix Phase 1/Phase 3 double-claim.

**Approach:**

**Step 1 — Source-type decision (DEEPENING — pricing + Udio
correction).**

| Source type | Pros | Cons | Verdict |
|-------------|------|------|---------|
| Generative — Udio | (was: cuts to fit any beat sheet) | **DEAD (November 2025 settlement disabled all external downloads — Udio is in-platform streaming/remixing only as of 2026; no `.mp3` export possible)** | **STRUCK from candidate pool.** |
| Generative — Suno | Cuts to fit cascade arc; Pro/Premier tier covers commercial use | March 2026 ToS: Suno **grants commercial-use license but does NOT warrant copyright vesting** in outputs. Active UMG/Sony litigation (summary judgment July 2026); WMG settled Nov 2025. Disclosure of AI-generated audio required on some platforms. Subscription must be active at generation time. | **Expected fallback** (budget Pro $10/mo as expected, not exceptional) |
| Royalty-free library — Artlist Pro / Epidemic Sound Pro | Clear sync license covering portfolio + Twitter/X + future engineering blog reposts | Track is fixed-length; trailer must cut to track or track edited. **Pro tier $199–$204/yr is the minimum** covering portfolio-site embed when site touches client/employer work. Social/Creator tiers ($120/yr) explicitly EXCLUDE this use case. | **Locked as primary** |
| Royalty-free library — Musicbed Individual / Business | Curated higher-end catalog | $329.89–$1,208.88/yr (Individual) or $1,099–$2,428.88/yr (Business). Over budget for portfolio-piece. | Alternate only |
| Per-track marketplace — Marmoset / Songtradr | Hand-picked match possible | $30–$200/track | Reserve for hand-picked candidates if subscription catalog fails |
| Licensed track (published artist) | Cultural caché if recognizable | $500–5000+ for sync license; not justified at portfolio-trailer scale | Declined |

**Step 2 — Candidate catalog (DEEPENING — search budget expanded).**

Search criteria for Artlist Pro / Epidemic Sound Pro:

- Genre: mid-century brass / bossa nova / spy jazz / lounge
- BPM: 100–130 (matches Archer underscore pacing)
- Mood: confident, slightly playful, deadpan — NOT goofy / wacky
- Instrumentation: brass (trumpet / sax lead), upright bass, syncopated
  drums, optional vibraphone or organ accent
- Length: ≥95s or loop-friendly
- Has a "drop" / "lift" structure: trailer cascade needs music to swell
  into the stacked-payoff beat at frame 1860–1950, **duck pre-
  anticipated 90% → 30% over frames 1980–2010** (matching `transitions.ts`
  `PAYOFF_DUCK_RAMP_FRAMES`), swell back for closing at S06.

Specific reference points (from Archer / similar productions):

- Archer title sequence: "Danger Zone" by Kenny Loggins — pop-rock
  saxophone-led 80s; NOT actually the target (Archer's actual title
  music is "Danger Zone"-coded but the SHOW's underscore is more
  brass-bossa). The brainstorm specifies the underscore mood, not the
  title-sequence mood.
- "Take Five" Dave Brubeck — vibraphone-bass-drums cool jazz mid-century
- "The Look of Love" Burt Bacharach — bossa-noir mid-century
- "Sukiyaki" Kyu Sakamoto — sad-cool brass instrumental cover
- Mancini-era Pink Panther underscore — playful brass / vibraphone

Candidate auditioning protocol (DEEPENING — expanded from 10–15 to
20–30 to survive low brass/bossa-cascade-arc hit rate):

- **Artlist Pro:** pull 20–30 results across multiple tag intersections
  ("spy/jazz", "bossa/instrumental", "mid-century/lounge").
- **Epidemic Sound Pro:** pull 20–30 results, same tag spread.
- Filter to 8–10 candidates matching BPM 100–130 + ≥95s + dynamic arc.
- Audition each in 30s clips against BEAT-SHEET.md timing.
- Narrow to 3 finalists. Three listening passes per finalist against
  the full beat sheet. Lock 1.

**Step 2.5 — Track-shape decision (NEW per deepening).**

Brass/bossa catalog tracks come in three shapes; the audition pass
needs to commit to one path BEFORE searching, to avoid wasting time
on mismatched-shape candidates:

| Path | Track shape | Edit complexity | Lossless segments |
|---|---|---|---|
| **A (default)** | Full-length composition (2:30–3:30) | Clip 95s from a high-arc section; lose either natural intro or resolved outro | Intro + ~60s mid + outro (sting) |
| B | 60s cinematic short | Add ~35s loop in mid-section, hide seam under cascade peak | Original intro + outro |
| C | Two stems from one track | Use intro stem 0–30s + climax stem 30–95s | Both stems |

Phase 1 default: **Path A** (full-length, clip-to-95s). Path B
fallback if no Path A candidate survives audition. Path C reserved
for licensed-track-with-stems edge case. Decision logged in
`music-sourcing.md` before audition begins.

**Step 3 — Pick rationale criteria (DEEPENING).**

A candidate locks IFF:

- 95s+ playable length OR loops cleanly at ≤4-bar increments (Path B)
  OR usable stems available (Path C)
- Has a discernible cascade-friendly structure (intro → build → peak
  → fall → close — at least 2 dynamic phases)
- Brass / bossa core, not piano-led generic
- License covers portfolio + Twitter/X distribution (verified via
  Artlist Pro or Epidemic Sound Pro terms-pages)
- **Subscription cost ≤$250/yr** (Artlist Pro $199 OR Epidemic Pro
  $204 covered; Musicbed Individual $329+ over budget); per-track
  marketplace single-license ≤$200 if a hand-picked match outranks the
  subscription catalog

Picked track documented with: title, artist, source URL, license type,
license-active-period, download path, BPM, key, duration, edit path
(A/B/C from Step 2.5). License PDF (or terms-page archive) filed to
`videos/trailer/sample-eval/beat-sheet/music-license.pdf`.

**Step 4 — Generative fallback (DEEPENING — Suno-only, ToS-accurate).**

Suno is the expected fallback if catalog audition pass at 20–30
candidates per platform doesn't land. **Udio is OUT** (Nov 2025
settlement disabled exports). Other 2026 generative options surveyed
(Mubert, Beatoven, Loudly) — none Sterling-coded; documentation
hygiene only, not real alternatives.

Suno commercial-use rights (March 2026 ToS):

- Apply to **Pro ($10/mo) and Premier ($30/mo)** tiers — NOT a
  "Producer" tier (early-2025 draft naming, no longer used).
- Subscription must be **active at time of generation**. Free-tier
  generations cannot be retroactively commercialized by upgrading.
- Suno grants perpetual commercial-use license but **does not
  represent that copyright vests in the output**. For a portfolio
  piece this means the trailer's music bed is un-copyrightable as
  a discrete asset.
- AI-generated audio disclosure required on platforms that demand it.
- Ongoing UMG + Sony litigation (summary judgment July 2026); WMG
  settled Nov 2025. Independent-musician class actions in progress.

Budget Pro $10/mo regardless of whether fallback fires (insurance).
If fallback fires, retain subscription receipt + generation timestamp
in `music-license.pdf`.

Prompt template:

> *"Instrumental mid-century brass / bossa nova spy jazz, 60s
> Mancini-Bacharach influence, syncopated trumpet + saxophone lead,
> upright bass, brushed drums, vibraphone accents on offbeats.
> 110bpm, key of D minor. Mood: confident, sardonic, deadpan, slight
> playfulness. Structure: 8-bar intro / 32-bar build / 4-bar peak /
> 8-bar fall to bass-and-drums-only bed / 16-bar close on lead brass."*

**Step 5 — Music-cue map in BEAT-SHEET.md preamble (DEEPENING —
ramp/step column + post-deepening payoff math).**

Each cell declares whether the volume transition is a `step` (single-
frame jump — only acceptable when masked by other audio) or a
`ramp(N frames)` (linear envelope over N frames, no click). Phase 4
implements via `<Audio volume={(f) => interpolate(...)}>` with the
ramp specs below.

| Frame range | Music state | Volume target | Transition shape |
|-------------|-------------|---------------|------------------|
| 0–60 | Brass hook intro | 100% | step (intro is the start) |
| 60–210 | Bed under cold-open speaker | 40% | ramp(30) from 100→40 starting at frame 30 (pre-anticipates the cold-open line at 60) |
| 210–570 | Underscore build (briefing setup) | 50% | ramp(60) from 40→50 starting at S02_START |
| 570–1050 | Continue build (mission background) | 55% | ramp(60) from 50→55 starting at S03_START |
| 1050–1680 | Cascade open, music swells | 60→75% | ramp(630) linear swell across the whole "stat" portion of cascade |
| 1680–1860 | Peak intensification (no VO from 1680→1860 is wrong — VO continues through 1860; here we just brighten) | 90% | ramp(180) from 75→90 |
| 1860–1950 | Cascade peak hold (no VO) | 90% | hold |
| 1950–1980 | Stamp slap + payoff VO begins; music holds | 90% | hold |
| **1980–2010** | **Pre-anticipated payoff duck** (completes as VO ends) | **30%** | **ramp(30) from 90→30** — `PAYOFF_DUCK_RAMP_FRAMES` per transitions.ts |
| 2010–2040 | Bed-only silent visual hold | 30% | hold |
| 2040–2535 | Sparse bed under gameplay capture | 30% | hold (no cross-dissolve anymore; hard cut at 2040 — music continues at 30% across the cut) |
| 2535–2580 | Iris-wipe (45 frames) — music rises | 50% | ramp(45) from 30→50 |
| 2580–2790 | Closing underscore | 60% | ramp(60) from 50→60 |
| 2790–2850 | Final brass sting on logo land | 100% | ramp(30) from 60→100 across logo-and-stamp window |

**No 60-percentage-point cliffs** (the first-draft 1950 sharp drop
90→30 would have clicked audibly). All transitions are ramped envelopes
or held holds.

**Patterns to follow:**

- UMB v3 music: Charon noir solo narration over restrained
  underscore (Suno-generated per UMB workflow). BURNED elevates to
  licensed brass-bossa per R9.

**Test scenarios:**

- **Happy path:** Locked track URL + license file documented.
- **Happy path:** Music-cue map filled in BEAT-SHEET.md per Step 5.
- **Edge case (generative fallback):** Suno/Udio prompt + rights
  verification documented.
- **Anti-pattern guard:** No track is shipped without explicit license
  documentation (per UMB precedent — Suno rights logged).

**Verification:**

- `music-sourcing.md` exists with audition log + pick rationale + Step 2.5 path decision (A/B/C).
- License document filed.
- Music-cue map in BEAT-SHEET.md preamble (with ramp/step column).
- **NOT in Phase 1 verification (moved to Phase 3):** the actual
  `videos/trailer/public/audio/music-bed.mp3` file — Phase 3 owns
  procurement + download per Phase 3 deepening. Phase 1 locks the
  source-type + criteria + cue-map; Phase 3 executes.

---

### Unit 1.8 — Typography System Lock

- [ ] **Unit 1.8: Typography System Lock**

**Goal:** Decide whether BURNED's existing typography stack (Clash
Display + General Sans + JetBrains Mono per HTP dossier) ships in
the trailer or a new video-specific stack is defined. Decision +
font-asset paths locked in BEAT-SHEET.md.

**Requirements:** R11 (typography for overlays), R8 (mobile-safe
sizing).

**Dependencies:** Unit 1.5 (cascade composition references type
treatment), Phase 0 Unit 0.5 (custom-font-in-MP4-export validated).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — name typography stack in
  preamble.
- Create: `videos/trailer/public/fonts/` — local woff2 files (3 fonts).
- Create: `videos/trailer/src/hooks/useFonts.ts` — replaces stub from
  Phase 0 Unit 0.1; loads the 3 fonts.
- Create: `videos/trailer/sample-eval/beat-sheet/typography.md` —
  decision rationale + sample frames.

**Approach:**

**Step 1 — Decision: inherit BURNED's stack.**

Locked: **inherit BURNED's typography stack** (Clash Display + General
Sans + JetBrains Mono). Three reasons:

1. **Brand consistency.** The trailer's typographic vocabulary should
   read as the same world as the HTP dossier. Engineering-peer viewer
   who clicks through to play the game encounters identical typography
   — the trailer becomes the visual prelude to the game.
2. **UMB v3 split was forced.** UMB's in-game typography was less
   refined; UMB v3 trailer correctly defined a separate video stack
   (NOIR palette + FONT_DISPLAY / FONT_MONO). BURNED's HTP dossier IS
   the brand identity. The trailer claims it.
3. **§2 frame-pass rate.** Sample frames composited in the typography
   audition pass should pass §2 ("could be a frame from an Archer
   episode") with BURNED's existing stack. If they don't, the typography
   stack isn't the problem — the composition is.

**Step 2 — Font asset sourcing (DEEPENING FIX: variable fonts, not
weight-specific files).**

BURNED ships **three variable woff2 files** at `public/fonts/`
(verified 2026-05-17 via Glob):

- `ClashDisplay-Variable.woff2` (weight range 200–700)
- `GeneralSans-Variable.woff2` (weight range 200–700)
- `JetBrainsMono-Variable.woff2` (weight range 100–800)

There are NO weight-specific files like `clash-display-700.woff2` —
the first-draft Phase 1 named files that don't exist (same shape as
Phase 0's `burned-display.woff2` ghost-reference catch). Copy the 3
variable files to `videos/trailer/public/fonts/`. Per-element weights
(see Step 4 table) work against variable fonts at run-time via CSS
`font-weight` — the axis resolves automatically.

**Sub-issue:** BURNED's JetBrains Mono is declared separately in two
per-bundle stylesheets (`src/client/shared/fonts-mono.css` for the
board, `src/client/howtoplay/fonts-mono-htp.css` for the HTP page).
The trailer creates its own scope via `useFonts.ts` below — does NOT
import either BURNED stylesheet.

**Step 3 — `useFonts.ts` implementation (DEEPENING — Promise.all
pattern per Phase 0 prescription).**

Phase 0 Unit 0.1 explicitly prescribed `await Promise.all([loadFont(...),
loadFont(...)])` for multi-font loads. The first-draft Phase 1's
`let loaded = false; if (loaded) return; loaded = true;` synchronous
flag set `loaded=true` before async font loads completed — second
consumers within the same render frame saw `loaded === true` and
skipped without waiting on the underlying promise.

```ts
// videos/trailer/src/hooks/useFonts.ts
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let loadPromise: Promise<unknown> | null = null;

export function useFonts(): Promise<unknown> {
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    loadFont({
      family: 'Clash Display',
      url: staticFile('fonts/ClashDisplay-Variable.woff2'),
      weight: '200 700',  // variable axis range
      format: 'woff2',
    }),
    loadFont({
      family: 'General Sans',
      url: staticFile('fonts/GeneralSans-Variable.woff2'),
      weight: '200 700',
      format: 'woff2',
    }),
    loadFont({
      family: 'JetBrains Mono',
      url: staticFile('fonts/JetBrainsMono-Variable.woff2'),
      weight: '100 800',
      format: 'woff2',
    }),
  ]);

  return loadPromise;
}
```

Called at `Root.tsx` top level. `@remotion/fonts.loadFont()`
auto-tracks each font via `delayRender` — render blocks until all
fonts ready. Returning the Promise lets a second consumer
`await useFonts()` instead of fire-and-forget — fixes the race.

Three `loadFont` calls instead of six. Phase 4 references per-element
weights (Step 4 table) via CSS `font-weight` — the variable axis
resolves at run-time.

**Step 4 — Per-element typography assignments.**

| Element | Font | Weight | Size at 1920×1080 |
|---------|------|--------|------|
| BURNED logo word | Clash Display | 700 | ~180px tall |
| R15 classification stamp ("OPERATION PENDLETON" etc.) | JetBrains Mono | 700 | ~28px |
| Briefing-room CASE BANNER | Clash Display | 700 | ~64px |
| Comms-ticker text | JetBrains Mono | 500 | ~22px |
| Goofy-stat captions (dry stat) | General Sans | 600 | ~36px |
| Goofy-stat captions (absurd companion) | General Sans | 500 italic | ~28px |
| Operative dossier card labels | JetBrains Mono | 700 | ~22px |
| Stacked-payoff stamp ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED") | JetBrains Mono | 700 | ~38px |
| Closing R15 subhead ("OPERATION STATUS: FIELD-READY" — status grammar per Unit 1.9 deepening) | JetBrains Mono | 700 | ~32px |

**Step 5 — Color tokens (DEEPENING — Radix-style scale+step naming).**

BURNED's color tokens use a Radix-inspired 12-step scale per family
(verified in `src/client/shared/tokens/primitives.css:41-132`). Bare
family tokens like `--color-cream` / `--color-teal` / `--color-ink` /
`--color-mahogany` do NOT exist. The trailer references explicit
step indices.

| Token | Hex | Use |
|-------|-----|-----|
| `--color-cream-12` | #f6ebce | Background tone, parchment, stamp paper |
| `--color-cream-1` | #0e0c08 | Body text (was misnamed `--color-ink`) |
| `--color-teal-9` | (per primitives.css) | Briefing-room frame accents |
| `--color-ochre-3` | #321e10 | Mahogany frame dark tone (was misnamed `--color-mahogany`) |
| `--color-ochre-4` | #422818 | Mahogany frame mid tone (alternate) |
| `--color-ochre-9` | #947226 | Card borders, R15 #1 + #2 + #4 stamp ink |
| `--color-burned-fire` | #be2e27 | Critical emphasis — R15 #3 payoff stamp ink, BURNED card flash. Semantic alias: `--color-accent-burned`. (Was misnamed `--color-burn-fire`.) |
| `--color-charcoal-1` | (per primitives.css) | Alternate ink for high-contrast over mahogany |

Briggsy is color blind — typography + position + shape carry signal,
never color alone. Per BURNED's existing patterns this is already
the case. Phase 4 verifies in MP4 export that:
- `--color-ochre-9` ochre ink on `--color-cream-12` paper survives
  H.264 compression contrast.
- `--color-burned-fire` on HTP hero overprint (R15 #3) survives.

Phase 4 may surface that additional ochre steps (e.g., `--color-ochre-11`,
`--color-ochre-10`) work better for the R15 chrome treatment than
`-9` — locked at `-9` for Phase 1, but Phase 4 micro-tune is allowed.

**Patterns to follow:**

- UMB v3 useFonts.ts pattern.
- BURNED's existing `public/fonts/` directory + typography conventions
  in `docs/PRODUCT-SPECIFICATION.md`.
- Phase 0 Unit 0.5 spike validated custom-font rendering in MP4.

**Test scenarios:**

- **Happy path:** `useFonts.ts` loads 3 variable font files via
  `Promise.all([loadFont(...) × 3])`; render blocks until all fonts
  ready (no race condition — verified by deliberately importing
  useFonts in two parallel Sequences and confirming both block on
  the same shared promise).
- **Happy path:** Sample frame at frame 1950 (stacked-payoff stamp)
  composites with Clash Display + JetBrains Mono visible — verify in
  MP4 export, not just studio preview.
- **Edge case:** Mobile safe-square preview — typography readable at
  1:1 crop centered on 1920×1080.
- **Anti-pattern guard:** No element uses `system-ui` or any web-
  default font fallback in the trailer.
- **Anti-pattern guard:** No reference to weight-specific font files
  (e.g., `clash-display-700.woff2`) — grep `trailer/src/**` returns
  zero matches.

**Verification:**

- `useFonts.ts` exists with Promise.all pattern; typecheck clean.
- **3 variable woff2 files** in `videos/trailer/public/fonts/`
  (ClashDisplay-Variable, GeneralSans-Variable, JetBrainsMono-Variable).
- Typography assignments documented per element with variable-axis
  weights resolving correctly.
- `typography.md` records decision + sample frames + Phase 4 micro-
  tune notes if any.

---

### Unit 1.9 — R15 Chrome Copy Lock

- [ ] **Unit 1.9: R15 Chrome Copy Lock**

**Goal:** Final copy for every R15 on-screen text signal (4 instances).
Each instance's frame placement, typography assignment, and visual
treatment locked.

**Requirements:** R15 (on-screen text signal layer).

**Dependencies:** Unit 1.1 (scene table), Unit 1.5 (cascade composition
includes R15 stamps), Unit 1.8 (typography assigned).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — fill R15 instance table in
  preamble + per-scene cues.

**Approach:**

**Step 1 — R15 instance table (DEEPENING — #4 differentiated from #3).**

The first-draft Phase 1 had #3 ("AUTONOMOUS FIELD UNIT — ASSET
DELIVERED") and #4 ("AGENT-BUILT, ARCHER-GRADE") both carrying the
agentic-SDLC origin claim. To an engineering peer that reads as
double-stamping the same signal; the second instance felt like a
sticker, not a new claim. **#4 shifts to status-grammar — the closing
chrome asserts operational STATUS (the asset is field-ready), not
re-treads the origin question (handled at #1 + #3).**

| # | Frame | Scene | Copy | Treatment | Decode axis |
|---|-------|-------|------|-----------|-------------|
| 1 | 150 | S01 cold open | **"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"** | Classification stamp slap, lower-left, JetBrains Mono 700 28px, `--color-ochre-9` ink on `--color-cream-12` stamp paper | Origin (method is autonomous) |
| 2 | 1680 | S04 cascade | **"OPERATIVE [REDACTED] — METHOD REPEATABLE"** | Comms-ticker pulse, bottom edge, JetBrains Mono 500 22px, scrolling left-to-right | Reproducibility claim |
| 3 | 1950 | S04 stacked payoff | **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"** | Dossier stamp slap (heavy 16-frame slap, overprints HTP hero), JetBrains Mono 700 38px, `--color-burned-fire` ink | Origin (R3 payoff carrier) |
| 4 | 2820 | S06 closing | **"OPERATION STATUS: FIELD-READY"** (status grammar; replaces former "AGENT-BUILT, ARCHER-GRADE") | Subhead under BURNED logo, JetBrains Mono 700 32px, `--color-ochre-9` ink | **Status (asset is ready), not origin** |

**Frame 2820 (was 2800) per Unit 1.10 deepening cadence — logo lands
at 2780, settles for 40 frames, then R15 #4 stamps onto the closing
card. Gives the logo breathing room.**

**Step 2 — R15 brainstorm-mandate trace.**

Brainstorm R15 acceptance: "at least one signal lands in the cold-
open frame, at least one in the cascade or closer."

- ≥1 in cold-open: #1 (frame 150 in S01). ✓
- ≥1 in cascade or closer: #2 (cascade comms-ticker, frame 1680), #3
  (cascade stacked payoff, frame 1950), #4 (closing, frame 2820).
  ✓ — three signals across cascade + closer.

Total: 4 R15 signals. Brainstorm minimum is "at least two." BURNED
ships 4 for redundancy on the no-context-viewer decode mechanism.

**Step 3 — In-world authenticity check (DEEPENING — cold-viewer
decode gap acknowledged).**

Each copy line must read as in-character Pendleton-agency chrome
(passes R6 vocab discipline) while remaining engineering-peer-decodable
(carries the agentic-SDLC origin signal). **The decode operates on
two layers:** (a) the engineering peer who already knows the trailer
is about agentic SDLC reads the R15 chrome as confirmation; (b) the
cold Twitter/X viewer reads the chrome as in-world flavor. **R15 alone
does NOT carry the cold-decode** — Phase 7 distribution copy (tweet
body, post description, pinned-reply context) carries the explicit
"built by autonomous agents" claim. R15 in the trailer = in-world +
engineering-peer-confirmation. Cold-viewer signal lives in the
metadata Phase 7 owns.

Per-instance check:

- **#1 "OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"**:
  In-world (case file = how the agency labels operations). Engineering-
  peer decode: "METHOD: AUTONOMOUS" reads as "method of execution"
  diegetically AND as "this was built autonomously by an agent." ✓
- **#2 "OPERATIVE [REDACTED] — METHOD REPEATABLE"**: In-world
  (operative redaction + method classification standard chrome).
  Engineering-peer decode: "method repeatable" reads as "tradecraft
  is reproducible" diegetically AND as "the autonomous-SDLC method
  works twice" (the trailer's central engineering claim). ✓
- **#3 "AUTONOMOUS FIELD UNIT — ASSET DELIVERED"**: In-world (asset
  delivery is briefing-room vocabulary). Engineering-peer decode:
  "AUTONOMOUS FIELD UNIT" literally states the agentic-SDLC origin
  without breaking diegetic frame — the *unit* that *delivered* the
  *asset* was autonomous. ✓ This is the R3 stacked-payoff visual
  carrier — visual text + audio reveal land simultaneously.
- **#4 "OPERATION STATUS: FIELD-READY"**: In-world (operation-status
  briefing-room vocabulary; "field-ready" is the standard mission-
  brief terminal). Engineering-peer decode: shifts axis — closes the
  loop on the *quality* claim (the asset works) rather than the
  *origin* claim already established by #1 + #3. Reads as "this is
  shipping-quality" without re-treading "who built it." ✓

**Step 4 — Color blind safety.**

All four signals use typography + position + treatment (stamp / ticker
/ subhead) for hierarchy, not color. Ochre and burn-fire inks are
visually distinct from cream/parchment background regardless of color
perception.

**Patterns to follow:**

- BURNED's existing chrome typography conventions (HTP, briefing-room).
- UMB v3 chrome treatments: classification stamps + ticker patterns.

**Test scenarios:**

- **Happy path:** All 4 R15 instances locked in BEAT-SHEET.md with
  copy + frame + treatment.
- **Happy path:** R15 brainstorm-mandate trace documented.
- **Anti-pattern guard:** No R15 copy contains raw SDLC vocab — every
  line passes R6 grep.
- **Edge case:** R15 #3 frame (1950) coincides with stacked-payoff
  Dash VO entry — verified in BEAT-SHEET.md cue table.

**Verification:**

- R15 instance table in BEAT-SHEET.md preamble.
- Per-scene cues reference the R15 instance by # for cross-check.

---

### Unit 1.10 — Briefing-Room Visual Environment Lock

- [ ] **Unit 1.10: Briefing-Room Visual Environment Lock**

**Goal:** Visual environment composition for non-cascade scenes (S02,
S03, S06 — ~75% of runtime). Establish whether Dash's character art
appears + in which form; whether venetian-blind / mahogany / brass-
nameplate / CASE BANNER / comms-ticker grammar is full-bleed
background, corner frame, or vignette; whether the ticker animates
during VO.

**Requirements:** R1 (in-world Pendleton briefing spine).

**Dependencies:** Unit 1.1 (scene structure), Unit 1.8 (typography
locked).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — fill **Visual** block per
  scene S02, S03, S06.
- Create: `videos/trailer/sample-eval/beat-sheet/briefing-room-comp.md` —
  storyboard sketches.

**Approach:**

**Step 1 — Visual environment per scene.**

**S02 — Briefing Setup.** Frame composition (DEEPENING — depth-plane
foreground element added; shadow motion bumped for H.264 survival).

- **Background (full-bleed):** mahogany desk surface (`--color-ochre-3`
  / `--color-ochre-4` per primitives.css; was misnamed `--color-mahogany`
  in first draft). Venetian-blind shadow bands animating across the
  desk at **1.5–2px per frame motion** (was 0.5px in first draft —
  subpixel motion gets eaten by H.264 compression; design-lens flagged
  this. 1.5–2px survives compression and reads as "living shadow"
  rather than ambient noise).
- **Foreground depth-plane element (NEW per deepening):** the desk
  composition is **not** flat in the z-axis. Phase 4 picks ONE of:
  - **Option A (default):** a brass nameplate on the near foreground
    desk edge (out-of-focus, ~5% of frame width, lower-left), reading
    "M. PENDLETON, BUREAU CHIEF" — creates implicit "we're seated at
    the briefer's desk, looking up the room."
  - **Option B:** a stack of manila folders in the near foreground
    (out-of-focus, lower-right) — creates "this is one case file
    among many" texture.
  - **Option C:** doorframe vignette implying the viewer is just
    inside the briefing-room doorway — heavier composition lift but
    most Archer-coded.
  Phase 4 picks based on Imagen asset availability + composition
  test. The depth-plane element is a Phase 3 visual-asset-prep item
  (add to Phase 3 unit 3.3 briefing-room-assets shot list).
- **Midground center:** an open dossier folder (Pendleton crest on
  the cover before it opens). Folder opens via 60-frame ease over
  frames 240–300 with `EASE_DRAWER` curve (iOS-drawer-like — fits
  the "object opens" motion better than ease-out). Inside: briefing
  case-sheet with "OPERATION PENDLETON / CASE FILE 02" header +
  Dash's name + clearance level.
- **Background chrome corners:**
  - **Top-left:** Pendleton crest watermark, ~120px wide, ~25% opacity.
  - **Top-right:** comms-ticker idle text (rotating through the
    existing BURNED idle lines: "CHANNEL OPEN", "STANDING BY",
    "AWAITING TRANSMISSION", "INTERCEPT CLEAR" — exact 4-item set
    from `src/client/board/DossierFeed.tsx:20-25`).
- **CASE BANNER chrome:** rendered as a top-center strap with the
  case label, structurally the same shape as BURNED's in-game
  `GameTable.tsx:67-88` `.caseBanner` aside. **There is NO standalone
  `CaseBanner.tsx` component** — the trailer's Phase 4 scene file
  ports the JSX + classNames directly from `GameTable.tsx` +
  `GameTable.module.css` (lines 67-88 + matching styles). Verify the
  CASE BANNER reads clearly at 64px Clash Display 700 against the
  mahogany background; Phase 4 may need a parchment-tone backplate
  if compression eats the contrast.
- **R15 stamp** (#1) animates in at frame 150 — pre-Dash-speech,
  8-frame stamp slap per `transitions.ts` STAMP_SLAP_FRAMES.
- **Dash character art**: NOT visible in S02. Dash is the briefer
  *delivering* the briefing — his presence is the VO, not a portrait.
  The briefing-room frame IS the proof of R1, not a Dash silhouette.

**S03 — Mission Background.** Frame composition (DEEPENING — briefing-
room frame STAYS; deck mosaic appears INSIDE the dossier).

- **Background (full-bleed):** mahogany desk continues (visual
  continuity with S02; the dossier IS the desk's content). Venetian-
  blind shadow motion + depth-plane foreground element from S02
  persist.
- **Midground center:** open dossier deepens. Around frame 700, the
  dossier-page wipe (16 frames per Unit 1.4 lock; was 8 in first
  draft) reveals **a readable 4×6 grid of the top 24 card backs**
  inside the dossier viewport (NOT the full 12×10 grid). A small
  "120 OPERATIONS" chrome counter sits in the upper-right of the
  dossier viewport to communicate the full deck size. **The briefing-
  room frame stays — the dossier-page wipe reveals content INSIDE the
  existing dossier viewport, NOT a frame change to a full-bleed
  mosaic. R1 in-world briefing spine is preserved visually for the
  full 16s of S03.**
- **Operative roster overlay:** at frame 750, **6 operative portrait
  cards (Dash + Vera + Otto + Janet + Neal + Sable; Agent X with
  REDACTED-bar over face for the 7th slot)** slide in along the
  right edge — right-edge halo cluster sets up S04's halo expansion.
  This matches the trailer's stat-4 narration ("seven on the roster,
  six in the deck, one in the basement") visually: 6 named portraits
  + 1 redacted = 7 personnel; Otto is named-and-present per ActRoster
  but his "in the basement" status is implied by the unrelated
  research-budget aside in the actual dossier (off-trailer context).
- **Comms-ticker continues** (idle text at frame head, switches to
  "ACTIVE BRIEFING" or similar at frame ~870 to match the second VO
  line).

**S06 — Closing Directive.** Frame composition (DEEPENING — logo +
R15 cadence retimed for breathing room).

- **Background:** briefing-room reestablishes via iris-wipe from S05.
  Venetian-blind shadow returns. Mahogany desk surface. Depth-plane
  foreground element from S02 returns (visual bookend).
- **Midground:** dossier closes (reverse of S02 opening — 30-frame
  `EASE_DRAWER`). Dossier cover shows full Pendleton crest +
  classification stamp.
- **Frame 2780 (was 2790):** BURNED logo lands center, sized ~720px
  wide, Clash Display 700 with chrome treatment. 8-frame stamp-slap
  entry per STAMP_SLAP_FRAMES.
- **Frame 2780–2820:** Logo holds static. **40-frame breathing room
  (1.3s)** — gives the logo time to settle before being stamped, per
  emil "match motion to mood — closing should breathe." First-draft
  10-frame gap (333ms) was rapid-fire and stepped on the logo's
  presence.
- **Frame 2820:** R15 #4 stamp ("OPERATION STATUS: FIELD-READY")
  slaps onto the closing card (16-frame heavy slap — same envelope
  as the payoff stamp, treating the closing as the trailer's second
  "weight" moment).
- **Frame 2836:** Final brass sting on the music bed (volume 60→100%
  ramp lands here); logo + stamp hold static.
- **Frame 2850:** Hard cut to black. End.

**Step 2 — Briefing-room grammar inventory.**

BURNED's existing briefing-room vocabulary (per CLAUDE.md +
`project-burned-arena-direction` memory):
- Mahogany frame
- Venetian blinds (shadow bands)
- Cream blotter / parchment surfaces
- Operative dossiers (case sheets, stamped folders)
- CASE BANNER (top-center chrome strap)
- COMMS ticker (bottom-edge running text)
- Pendleton crest watermark

Trailer scenes apply this vocabulary literally. Phase 4 builds the
scene compositions from these elements. No new visual element invented
in the trailer that isn't already in the BURNED arena vocabulary.

**Step 3 — Ticker animation policy.**

The comms-ticker animates continuously through S02 + S03 + S06 (idle
text), brightens + intensifies through S04 (R15 #2 surfaces at 1680),
fades during S05 (gameplay-frame replacement), returns at S06 iris
wipe. Per-frame ticker text rotation matches existing BURNED idle
text patterns from `src/client/board/DossierFeed.tsx:20–25`.

**Step 4 — Mobile safe-square placement audit.**

The 1080×1080 central square within 1920×1080 must contain:

- S02: open dossier + R15 stamp + case-sheet text. ✓ Pendleton-crest
  watermark + comms-ticker live in side bands.
- S03: dossier deck reveal + operative portraits (some in side bands,
  but at least 4 portraits land inside the safe-square edges). Acceptable.
- S06: BURNED logo + R15 subhead. ✓ Both centered.

**Patterns to follow:**

- BURNED arena direction: `project-burned-arena-direction` memory +
  CLAUDE.md.
- Existing CASE BANNER chrome: **`src/client/board/GameTable.tsx:67-88`**
  (inline `.caseBanner` aside; **NOT** `CaseBanner.tsx` — that file
  does NOT exist. First-draft Phase 1 cited a ghost file; same
  pattern as the Phase 0 `burned-display.woff2` catch).
- Existing comms-ticker: `src/client/board/DossierFeed.tsx:20-25`
  (IDLE_LINES const with 4 entries: "CHANNEL OPEN", "STANDING BY",
  "AWAITING TRANSMISSION", "INTERCEPT CLEAR").

**Test scenarios:**

- **Happy path:** S02, S03, S06 visual blocks filled in BEAT-SHEET.md
  with element layout + frame-accurate animation cues.
- **Happy path:** Briefing-room grammar inventory documented + every
  element trace-able to an existing BURNED component.
- **Anti-pattern guard:** No element invented for the trailer that
  isn't in the existing BURNED arena vocabulary.
- **Edge case:** Mobile safe-square audit passes for all 3 briefing-
  room scenes.

**Verification:**

- BEAT-SHEET.md visual blocks complete for S02, S03, S06.
- `briefing-room-comp.md` exists with storyboard sketches.
- Element-to-existing-component trace documented.

---

## System-Wide Impact

- **Interaction graph:** BEAT-SHEET.md is the central HUMAN contract;
  `script.ts` is the parallel MACHINE contract that downstream phases
  parse. Phase 2 (Voice Pipeline) loads `BURNED_TRAILER_LINES` from
  `script.ts` + cadenceAdapter annotations. Phase 3 (Visual Asset
  Prep) loads the visual inventory + the goofy-stats list + the HTP
  rendering method + the briefing-room composition from BEAT-SHEET.md
  + emits trace-video MP4 conditional on Phase 3-entry perceptual
  gate (per Unit 1.5 Step 6 deepening). Phase 4 (Remotion Composite
  Build) imports `timing.ts`, `transitions.ts`, builds scene-internal
  overlay components for stamp slap / dossier-page wipe / iris wipe
  (bare `<Series>` composition, no `<TransitionSeries>` presentations).
  Phase 5 (Gameplay Capture) ships `gameplay-raw.mp4` + `gameplay-
  markers.json` declaring the in-point + BURNED-draw-marker frame;
  Phase 4 trims to land marker at scene-relative frame 160 (~5.3s
  into S05). Phase 6 (Final Render + QA) uses the beat-sheet for QA
  criteria. Phase 7 (Distribution) reads the X-native cutdown brief
  from BEAT-SHEET.md notes (Unit 1.5 + 1.9 surface candidate cutdown
  beats) AND carries the explicit "built by autonomous agents" cold-
  viewer decode in post copy (R15 chrome alone doesn't carry the
  cold decode — that gap is acknowledged at Unit 1.9 Step 3).

- **Cross-phase deepening dependencies surfaced:**
  - **Phase 3 must deepen with BOTH static-PNG AND trace-video paths
    budgeted** (Unit 1.5 Step 6). The first-draft Phase 3 plan budgets
    static-only; that's a load-bearing gap.
  - **Phase 5 must ship `gameplay-markers.json` contract** declaring
    raw-capture in-point + BURNED-draw-frame. Phase 1 locks the
    contract here; Phase 5 plan must absorb it in its deepening.
  - **Phase 2 must consume `script.ts` not Markdown** for line set;
    BEAT-SHEET.md drift is detected by `script.test.ts`.
  - **Phase 7 must carry cold-viewer decode** in post copy (engineering
    claim explicit). Phase 1 R15 chrome handles engineering-peer
    confirmation; cold-decode lives in Phase 7's distribution
    metadata.

- **Error propagation:** If Unit 1.2's R6 grep fails, the script is
  revised in Unit 1.2 itself — Phase 2 doesn't start until the script
  is clean. If Unit 1.6's cold-read gate hard-fails (N=3 with 0–2
  scale per deepening), R11 cuts and Unit 1.2 S04 VO collapses to
  the pre-drafted bridge line (candidate A or B). If Unit 1.6's
  cold-read gate soft-fails (one stat scores <3 across reviewers),
  swap from pool — partial cut, not full R11 cut. If Unit 1.7's music
  sourcing returns no clean candidates after 20–30 auditions per
  platform, Suno Pro generative fallback fires (budgeted at $10/mo
  regardless of outcome).

- **State lifecycle risks:** BEAT-SHEET.md is the contract; once Briggsy
  signs off, downstream phases assume it's frozen. Late edits during
  Phase 2/3/4 require an explicit Phase 1 reopening + roadmap status
  update. Reflected in BEAT-SHEET.md preamble (status block).
  `script.ts` shares the same lock — `script.test.ts` enforces sync.

- **Unchanged invariants:** BURNED game code untouched. The trailer
  project at `videos/trailer/` is isolated; nothing in BURNED's `src/`
  changes. BURNED's `pnpm-workspace.yaml` packages array unchanged
  (trailer project remains isolated per Phase 0 ADR #2). Phone bundle
  budget unaffected.

---

## Risks & Dependencies (DEEPENING — refined with multi-agent
findings)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Per-cue wps unbuildable for Sterling-coded delivery** | Low (after deepening rewrite) | High (Phase 2 cannot generate WAVs) | Unit 1.2 Step 5 rewrite — per-cue wps validated ≤ 2.6 ceiling. Phase 1 lock requires every cue's wps computed + verified before Phase 2 ships. |
| **R6 grep regex broken (POSIX ERE lookahead unsupported)** | Resolved | High (gate silently always-passes) | Unit 1.2 Step 9 rewrite — rg --pcre2 OR 2-pass `agent`-carve-out approach. Vocabulary expanded from 11 → 25 terms. Verified on Briggsy's Windows shell. |
| Narration script word count overshoots scene budget | Medium | Medium | Per-scene mean wps + per-cue wps validation in Unit 1.2 Step 8 + Step 5; trim iteratively. |
| Cold-read gate for R11 fails | Medium | Medium | R11 cuts cleanly; pre-drafted bridge line in Unit 1.6 Step 4 (candidates A + B). Soft-fail handling (single weak stat swaps from pool) added per deepening. |
| Music sourcing returns no clean candidates | **Medium-High** (95s cascade-arc + brass/bossa is a low-hit-rate ask) | Medium | **Suno Pro $10/mo budgeted as expected fallback, not exceptional.** Audition pass 20-30 candidates per platform (up from 10-15). Step 2.5 track-shape decision committed before search. |
| HTP capture under-delivers visually in static PNG | **Medium** (GSAP ScrollTrigger animations frozen in PNG; only translateY scrolling reads as "motion") | Medium | **Phase 3 BUDGETS BOTH paths** per Unit 1.5 Step 6 deepening — static-PNG primary, trace-video conditional on Phase 3-entry perceptual gate. Phase 3 plan must deepen with this conditional. |
| R5 cut, cold-open speaker re-selection | Low (covered by Phase 0 Unit 0.6 outcome) | Low (BEAT-SHEET.md reflects whichever speaker locked) | Per Unit 1.3 Step 1 outcome matrix (4 reachable rows; Cut+Vera unreachable). |
| Cascade VO timing doesn't line up with visual cues | Medium | Medium | Frame-accurate cue table in Unit 1.5 Step 2; per-cue wps validated; Phase 4 verification via studio playback. |
| **Cascade composition reads as AI-slop, not Archer** | **Resolved (was load-bearing)** | High (fails §2.2) | Unit 1.5 Step 1-2 deepening rewrite — sequential revelation with focal hierarchy replaces layered-simultaneous. Anti-pattern guard: no frame except 1950 payoff has >2 elements at full visual weight. |
| Stacked-payoff stamp slap competes visually with HTP hero overprint | Low (after Step 5 deepening) | High (R3 fail) | HTP hero drops to 50% at 1950 to cede focus to the heavy slap; stamp is the sole focal point at the trailer's only "everything at once" moment. |
| **Variable fonts not weight-specific files** | Resolved | High (first render 404s) | Unit 1.8 Step 2 deepening — 3 variable woff2 files (ClashDisplay/GeneralSans/JetBrainsMono-Variable), Promise.all loading pattern per Phase 0 prescription. |
| **CaseBanner.tsx ghost-reference** | Resolved | Medium | Source-of-truth re-anchored to `GameTable.tsx:67-88` inline `.caseBanner` aside; Unit 1.10 Patterns section corrected. |
| **6-vs-7 operative count mismatch** | Resolved | Medium (freeze-frame viewer audit catches it) | Stat 4 reframed to "Seven on the roster, six in the deck, one in the basement. Don't ask." per ActRoster:153-158 Otto-exclusion aside. |
| **R3 cross-dissolve had 3 internal timing contradictions** | Resolved | High (R3 mechanic incoherent) | Unit 1.4 Step 2 deepening — cross-dissolve REPLACED with hard cut at 2040 after 1.0s payoff visual hold; music ducks pre-anticipated ramp completes at 2010. |
| **`<TransitionSeries>` overlap math contradicts TOTAL_FRAMES** | Resolved | High (timing.test.ts asserts wrong invariant) | Unit 1.4 Step 1 deepening — bare `<Series>` + scene-internal overlay components; scene durations sum exactly to TOTAL_FRAMES. |
| **useFonts.ts race condition (sync flag before async loads)** | Resolved | Medium | Unit 1.8 Step 3 deepening — Promise.all pattern, second consumers await shared promise. |
| **Mobile safe-square crops R11 captions** | Resolved | High (R11 comedy invisible on primary distribution surface) | Unit 1.5 Step 3 deepening — active stat caption lives INSIDE safe-square center-bottom during read window; decays to side-band-chrome after. |
| Music volume cliff at 1950 would click | Resolved | Medium | Unit 1.7 Step 5 deepening — all transitions are ramped envelopes or held holds; 60-pt cliff replaced with pre-anticipated 30-frame duck completing at VO end. |
| Sterling-screams-Lana identity-replication drift | Resolved | Medium (ADR #13 violation if shipped) | Unit 1.2 Step 6 + Unit 1.3 Step 2 deepening — cadence-spec citation only; no Archer-scene identity reference. |
| Briggsy reads R4 as "82% short of 90%" and requests script-lengthening | Low | Low | Unit 1.3 Step 4 reserves the lever; S05 Dash VO can grow by 1–2 sentences if needed. |
| Late beat-sheet reopening during Phase 4 | Low | High | Per-Phase-1-exit roadmap update + BEAT-SHEET.md status freeze; reopens require explicit roadmap-level action. |
| **Phase 5 gameplay trim ownership undeclared** | Resolved | Medium | System-Wide Impact + Unit 1.2 Step 6 deepening — Phase 5 ships `gameplay-raw.mp4` + `gameplay-markers.json`; Phase 4 trims via `<OffthreadVideo>`. |
| **Vitest dep missing from trailer scaffold** | Resolved | Medium (timing.test.ts has no runner) | Unit 1.1 Step 2a deepening — Vitest devDep + test scripts added to trailer package.json. |
| **`script.test.ts` drift between BEAT-SHEET.md and `script.ts`** | Low | Medium | Script test asserts every line text appears in both surfaces. Phase 1 verification gates on test passing. |

---

## Open Questions

### Resolved During Planning (DEEPENING — expanded)

- **Scene count:** 6 (locked in Unit 1.1 Step 4).
- **VO-sync model:** continuous Dash narration over cascade, per-cue
  wps-validated, single 1.0s silent visual hold after payoff VO,
  hard cut at 2040 (locked in Unit 1.5 Step 4).
- **HTP rendering method:** clone of UMB's `capture-htp-scroll.ts`
  primary, trace-video conditional Phase 3 deliverable (locked in
  Unit 1.5 Step 6).
- **Typography system:** inherit BURNED's stack (3 variable woff2
  files); Promise.all loading pattern (locked in Unit 1.8 Step 1-3).
- **Transition vocabulary:** scoped library of 5 named transitions (4
  implemented; hard cut is `<Sequence>` boundary). Bare `<Series>` +
  scene-internal overlay components, NOT `<TransitionSeries>` (locked
  in Unit 1.4 Step 1-2).
- **R3 cross-dissolve replaced with hard cut at S04→S05** (locked in
  Unit 1.4 Step 2 deepening — dissolves 3 internal timing
  contradictions + 1 audio-cross-dissolve framework gap).
- **R15 chrome copy:** 4 instances locked (Unit 1.9). #4 reframed to
  status-grammar ("OPERATION STATUS: FIELD-READY") differentiating
  from #3 origin-claim ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED").
- **Cascade spatial layout:** sequential revelation with focal
  hierarchy (locked in Unit 1.5 Step 1 — was layered-simultaneous in
  first draft; failed §2.2 design-lens review).
- **Music source type:** royalty-free Pro tier ($199–$204/yr Artlist
  Pro or Epidemic Sound Pro) primary, Suno Pro $10/mo generative as
  expected fallback (locked in Unit 1.7 Step 1). Udio struck (dead
  since Nov 2025 settlement).
- **Briefing-room grammar:** inherit BURNED arena vocabulary +
  foreground depth-plane element (locked in Unit 1.10 Step 1).
- **CASE BANNER source-of-truth:** `GameTable.tsx:67-88` inline
  `.caseBanner` aside (NOT a standalone `CaseBanner.tsx` — that file
  doesn't exist; was first-draft ghost reference).
- **Roster framing:** "Seven on the roster, six in the deck, one in
  the basement. Don't ask." (Stat 4 reframe matches `ActRoster.tsx:
  153-158` Otto-exclusion aside).
- **Sterling-coded scream framing:** cadence-spec citation only, no
  identity reference to Archer scene (locked in Unit 1.2 Step 6 +
  Unit 1.3 Step 2 per ADR #13).
- **R6 grep approach:** rg --pcre2 + 2-pass fallback; vocabulary
  expanded 11 → 25 terms (locked in Unit 1.2 Step 9).
- **Cold-read gate:** N=3 + 0-2 scale + consensus on pairings;
  recorded stimulus; partial-cut + full-cut handling (locked in Unit
  1.6 Step 4).
- **R11-cut bridge line:** 2 candidates drafted inline (Unit 1.6
  Step 4 — Phase 2 doesn't wait for Briggsy approval at cold-read
  gate time; bridge candidates are pre-committed).
- **Color token names:** Radix-style scale+step (e.g.,
  `--color-cream-12`, `--color-ochre-3`, `--color-burned-fire`).
  Bare-family tokens (`--color-cream`, `--color-mahogany`, etc.) do
  NOT exist in `primitives.css` (locked in Unit 1.8 Step 5).
- **timing.ts overlap math:** bare `<Series>` so scene durations sum
  exactly to TOTAL_FRAMES; no transition-overlap subtraction (locked
  in Unit 1.1 Step 2).
- **Vitest dependency:** added to trailer `package.json` devDeps
  (locked in Unit 1.1 Step 2a).
- **`script.ts` machine contract for Phase 2:** typed `BURNED_TRAILER_LINES`
  const; `script.test.ts` enforces sync with BEAT-SHEET.md (locked in
  Unit 1.2 Step 0 / Files block).
- **Phase 5 gameplay deliverable contract:** `gameplay-raw.mp4` +
  `gameplay-markers.json` declaring in-point + BURNED-draw-frame
  (locked in Unit 1.2 Step 6 / System-Wide Impact).

### Deferred to Implementation

- **Specific licensed track:** Phase 1 (or Phase 3, see Unit 1.7
  Files block reframing) executes audition at 20–30 candidates per
  platform and picks one. Title + URL + license documented in
  `music-sourcing.md`.
- **Specific HTP capture viewport** (exact dimensions, scroll-trigger
  delay tuning): Phase 3 execution dial-in.
- **Operative portrait curation in S03**: which 6 of 6 named +
  Agent X redacted-bar treatment — depends on Imagen artwork
  availability. Phase 3 curation pass.
- **Goofy-stats prose tightening**: Unit 1.6 cold-read gate may
  iterate on specific phrasing; the 4 slot picks are locked but
  prose can tighten on review.
- **Stacked-payoff stamp typography exact size**: 38px is Phase 1
  draft; Phase 4 in-studio render may tune ±4px for visual weight.
- **Dash VO pacing per-line (wps)**: Phase 1 estimates; Phase 2 TTS
  output may produce slightly different runtime — Phase 1 budgets
  include ±5% tolerance; Phase 2 Phase-1 reconciliation step
  documented in Phase 2 plan.
- **Briefing-room depth-plane foreground element** (S02 Option A/B/C):
  Phase 4 picks based on Imagen asset availability + composition
  test against §2.2 (Unit 1.10 Step 1 deepening).
- **R15 chrome ochre step**: `-9` locked at Phase 1; Phase 4 micro-
  tune may shift to `-10` / `-11` if MP4 contrast warrants (Unit 1.8
  Step 5).
- **Two-with-hats audit**: pending Phase 1 visual audit of
  `public/assets/cards/` operative portraits (Unit 1.6 Step 5).
- **`addSound()` THWAP SFX overlay for stamp slap**: Phase 4 micro-
  spike candidate (Unit 1.4 Patterns).
- **`iris()` from `@remotion/transitions/iris` as overlay component**:
  Phase 4 micro-spike candidate (Unit 1.4 Step 2 row 4).

### New Open Questions Surfaced by Deepening

- **Cold-viewer engineering decode**: R15 chrome alone doesn't carry
  the "built by autonomous agents" signal for cold Twitter/X viewers.
  Phase 7 distribution copy must carry the explicit claim. Phase 1
  flags this; Phase 7 plan must absorb the responsibility in its
  deepening.
- **Phase 0 cadence-spec wps band**: Phase 0 Unit 0.2 Step 0 should
  declare the wps band (1.9–2.3 sustained / 2.4–2.6 list / 1.6–1.8
  payoff). If it doesn't, Phase 1 reopens to widen scene budgets.
  Phase 0 deepening may need a follow-up amendment.
- **HTP local-dev capture URL**: BURNED's deploy migration in progress
  (TODO §1). Capture script targets `localhost:5173/howtoplay.html`
  during Phase 3 execution; verify dev server is running. If migration
  lands first, capture against `briggsy007.workers.dev` /
  `burned-cxa.pages.dev` instead.

---

## Documentation / Operational Notes

- All Phase 1 artifacts land in `videos/trailer/BEAT-SHEET.md` and
  `videos/trailer/sample-eval/beat-sheet/`.
- BEAT-SHEET.md is the canonical contract for Phases 2–4. Briggsy's
  signoff freezes it; late edits require explicit Phase 1 reopening.
- `timing.ts` exports are the single source of truth for frame
  numbers. Phase 4 scene files MUST import frame constants by name —
  no magic numbers (linted by Phase 4 convention).
- Cold-read gate (Unit 1.6) and tone reapplication (Unit 1.2) are
  listener-judgment passes; no automated test substitutes.
- Stats are verified against authoritative sources per
  `feedback-stats-single-source.md` — never working-memory recall.

---

## Sources & References (DEEPENING — corrected citations)

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- §2.2 quality bar source-of-truth: [`docs/PRODUCT-SPECIFICATION.md`](../../PRODUCT-SPECIFICATION.md) §2.2 ("Could this look like a frame from an Archer episode?"). **NOTE: "water beads off it" phrasing is in `~/.claude/manifesto/elite-engineer.md`, NOT the BURNED spec — don't conflate.**

**UMB v3 precedents:**
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` — `V3_TOTAL_FRAMES = 4440` (sum of 140+630+300+690+540+590+330+440+780) = 148.0s @ 30fps. Note: `TrailerV3.tsx:23` has stale comment "~124 seconds" (legacy v2 figure); 148s is current.
- Narrator prompts: `projects/undercover-mob-boss/scripts/narrator-prompts.ts` — specifically `TRAILER_V3_PROMPTS` (lines 648–685). (TRAILER_V2_PROMPTS at line 628 is the older trailer's prompts; cite V3 for BURNED's voice study.)
- Cascade scene precedent: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx`
- HTP capture pattern: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts` (70 lines; step-scrolls 200px with 80ms waits to TRIGGER ScrollTrigger before screenshot; main signature `async function main()`)
- Trailer composition: `projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx` (lines 28-56) — **bare `<Series>` of `<Series.Sequence>` with ZERO scene-boundary transitions.** FadeTransition exists in UMB only as scene-internal element fader. BURNED inherits this exact composition shape.

**BURNED assets consumed:**
- Card art: `public/assets/cards/` (17 unique webp — verified 2026-05-17 via Glob). Operative portraits (6): `dash-barlowe`, `vera-khan`, `sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`. Action cards (11): `back-channel`, `burn-the-files`, `burned`, `call-in-a-favor`, `direct-order`, `extraction`, `falsify-intel`, `go-dark`, `intel-briefing`, `intercepted`, `reassign`.
- HTP app: `src/client/howtoplay/App.tsx` + `src/client/howtoplay/hooks/useScrollReveal.ts` (GSAP ScrollTrigger on `[data-reveal]` elements, `start: 'top 85%', once: true`)
- Dash voice DNA (specific line ranges per deepening):
  - `src/client/howtoplay/acts/ActMission.tsx:31-65` + Phrasing! at line 74
  - `src/client/howtoplay/acts/ActRoster.tsx:25-46` + marginalia at 161-163 + Phrasing! at 27 and 46
  - `src/client/howtoplay/acts/ActArsenal.tsx:28-49` + footnotes at 165-166 + 197 + Phrasing! at 49
  - `src/client/howtoplay/acts/ActIntercept.tsx:34-41` + Phrasing! at line ~40
- BURNED Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187-194` (6 entries)
- COMMS ticker idle lines: `src/client/board/DossierFeed.tsx:20-25` (`IDLE_LINES` const, 4 entries: "CHANNEL OPEN", "STANDING BY", "AWAITING TRANSMISSION", "INTERCEPT CLEAR")
- **CASE BANNER chrome:** `src/client/board/GameTable.tsx:67-88` (inline `.caseBanner` aside with classNames `caseBannerLabel`, `caseBannerOperation`, `caseBannerSub`, `caseBannerDivider`, `caseBannerFooter`, `nopeSlot`, `manualLink`). Styles in `GameTable.module.css`. **There is NO `CaseBanner.tsx` file** — first-draft Phase 1 cited a ghost reference.
- Existing arena vocabulary: `src/client/board/GameTable.tsx`, `src/client/board/DossierFeed.tsx`, `src/client/board/Arena.tsx`
- Color tokens: `src/client/shared/tokens/primitives.css:41-132` (Radix-style 12-step scales — `--color-cream-1..12`, `--color-teal-1..12`, `--color-ochre-1..12`, `--color-burned-fire` (NOT `--color-burn-fire`), `--color-cordovan-1..12`, `--color-emerald-1..12`, `--color-charcoal-1..12`, `--color-neon-magenta`, `--color-neon-magenta-glow`)
- Fonts: `public/fonts/` — **3 variable woff2 files only** (ClashDisplay-Variable.woff2, GeneralSans-Variable.woff2, JetBrainsMono-Variable.woff2). Loaded by per-bundle stylesheets `src/client/shared/fonts.css` (board+player), `src/client/howtoplay/fonts-mono-htp.css` (HTP only).
- ActRoster Sable Ashworth entry: `src/client/howtoplay/acts/ActRoster.tsx:39`; OPERATIVES array lines 18-75 (6 entries); Otto deck-exclusion aside at lines 153-158
- Verified stats source: `TODO.md` §1 (2026-05-16 squeaky: 1,407 pass / 6 expected fail / 68/68 files / 19.17 KB phone bundle / 100 KB ceiling / 2.34 KB DramaOverlay lazy chunk / PROTOCOL_VERSION 6)

**Music sourcing (DEEPENING — 2026 pricing + ToS):**
- Artlist Pro: https://artlist.io ($199/yr — covers portfolio site + Twitter/X for personal/commercial accounts). Social tier $120/yr excludes portfolio embedding.
- Epidemic Sound Pro: https://www.epidemicsound.com (~$204/yr) — equivalent commercial coverage.
- Musicbed Individual ($329-$1,208/yr) / Business ($1,099-$2,428/yr) — over budget for portfolio-piece.
- Marmoset / Songtradr per-track marketplace — $30-$200/track for hand-picked.
- Suno: https://suno.com (Pro $10/mo, Premier $30/mo). March 2026 ToS — perpetual commercial-use license, no copyright vesting in outputs. Active UMG+Sony litigation (summary judgment July 2026); WMG settled Nov 2025. AI-generated-audio disclosure required on some platforms.
- **Udio:** DEAD as commercial-fallback (Nov 2025 settlement — in-platform streaming/remixing only; no `.mp3` export).
- Mid-century reference points: Bacharach, Mancini Pink Panther underscore, Brubeck Take Five.

**Remotion documentation:**
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font (verified: auto-blocks render via delayRender; `weight: '200 700'` supports variable axis ranges)
- TransitionSeries (NOT used in BURNED — see Unit 1.4 Step 1 architecture lock; bare `<Series>` instead): https://www.remotion.dev/docs/transitions/transitionseries
- `<OffthreadVideo>` for trace-video fallback path: https://www.remotion.dev/docs/offthreadvideo
- `iris()` from `@remotion/transitions/iris` (candidate for iris-wipe overlay component): https://www.remotion.dev/docs/transitions/presentations/iris
- `addSound()` from `@remotion/transitions/audio-transitions` (candidate for stamp-slap THWAP SFX): https://www.remotion.dev/docs/transitions/audio-transitions
- Custom transition Presentation contract: https://www.remotion.dev/docs/transitions/presentations/custom
- Audio: https://www.remotion.dev/docs/media/audio

**Institutional learnings (memory):**
- `feedback-stats-single-source.md` — stat-source verification discipline
- `feedback-narrator-voice-direction.md` — line set must be raw quotable text, no embedded direction
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
- `feedback-imagen-budget.md` — one-test-image-first discipline (applies to music auditions too)
- `user_color_blind.md` — typography + position carry signal, never color alone
- `feedback-wait-for-all-agents.md` — wait for ALL 8 deepening agents before synthesizing
- `feedback-sequential-thinking-always.md` — Sequential Thinking after multi-agent research returns
- `project-burned-sterling-coded-voice.md` — ADR #13 Sterling-CODED cadence mimicry, never Benjamin-cloned identity
- Elite engineer manifesto at `~/.claude/manifesto/elite-engineer.md` — water-beads bar (manifesto-scoped, not spec-scoped)
