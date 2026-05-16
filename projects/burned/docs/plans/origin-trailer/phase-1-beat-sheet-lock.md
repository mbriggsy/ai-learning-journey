---
title: "Origin Trailer — Phase 1: Beat Sheet Lock"
type: feat
phase: 1
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

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

### Tone gate result feeds back into the script

Per Phase 0 Unit 0.4, the played-straight thesis is gated on two
listeners articulating "the gap is the joke." Phase 1's narration
script is written assuming the gate cleared. If the gate did NOT
clear, Phase 1 cannot lock until the brainstorm-level Key Decision
re-opens — which bubbles to Briggsy as a structural reset.

### Voice-cast cap: 3 distinct voices maximum

Per brainstorm Scope Boundaries: "Voice cast is 2–3 operatives: Dash
(required, ~90% runtime), cold-open speaker (required — Sable, Vera,
or Janet), Vera scream cameo (conditional on R5 authenticity).
Maximum three distinct voices; Vera-doubling (cold-open AND scream)
reduces to two."

The "scream cameo" must be re-read carefully: **the scream is BY Dash
shouting VERA's name** in the iconic Sterling-screams-Lana cadence
(R5). Vera does not vocalize the scream — Dash does. Vera's "cameo"
is being the named target. This means:

- **R5 kept, Vera was the cold-open speaker:** Vera owns one cold-open
  line + appears in card flash, Dash screams her name. Voice cast = 2
  (Dash + Vera).
- **R5 kept, Sable/Janet was the cold-open speaker:** Cold-open speaker
  owns one line + appears in card flash; Vera appears only as a card
  flash (the scream target). Voice cast = 2 (Dash + cold-open speaker).
  *Vera is visual-only.*
- **R5 cut, Vera was the cold-open speaker:** Vera removed entirely per
  cut-handling rule. Cold-open re-selects to Sable or Janet from R4
  Step 4. Voice cast = 2.
- **R5 cut, Sable/Janet was the cold-open speaker:** Vera removed
  entirely; cold-open speaker unchanged. Voice cast = 2.

In all four cases voice cast lands at 2, not 3. The brainstorm cap of
3 was a ceiling, not a target. Phase 1 plans for 2-voice production.

### R6 vocabulary discipline: zero raw SDLC vocab in audio

Per brainstorm R6 translation key: agents → autonomous field assets,
spec → forensic dossier, tests → mission rehearsal artifacts, code →
operational tradecraft, deploy → field deployment, commits → log
entries. Phase 1 line set is grep-able for SDLC vocab violations as
a verification step.

### Cascade-VO sync model is load-bearing

The stacked-payoff beat (R3) is the trailer's single largest bar-raise
moment vs UMB v3 (per success-criteria axis 3). Phase 1 must specify:
which Dash line lands AT the visual cascade peak; what visual event
delivers the moment; how many frames the silence-after-payoff beat
runs before the gameplay dissolve.

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
- **`videos/trailer/BEAT-SHEET.md` is the single source of truth.**
  Phases 2–4 inherit from it. Edits require explicit Phase 1
  reopening.
- **`videos/trailer/src/lib/timing.ts`** exports frame constants
  (S01_START, S01_END, etc.) so Phase 4 scene files reference timing
  by named constant, not magic numbers. Mirrors UMB's `timing-v3.ts`
  pattern.
- **Typography system inherits BURNED's stack** (Clash Display +
  General Sans + JetBrains Mono per HTP dossier), not a new
  Remotion-specific stack. Reasoning: the trailer's visual brand
  reads consistent with the game's; engineering-peer viewer who
  clicks through to play the game encounters identical typographic
  vocabulary. UMB v3 split into a separate video stack because UMB's
  in-game typography was less refined; BURNED's HTP dossier
  typography IS the brand identity, and the trailer should claim it.
- **HTP rendering method: clone of UMB's `capture-htp-scroll.ts`**
  (per brainstorm Deferred-to-Planning default). Static Remotion
  recreation declined as last-resort only; Playwright trace-video
  upgrade reserved as Phase 3 escalation if static capture
  under-delivers in the cascade.
- **VO-sync model: continuous Dash narration over cascade, paced
  per-receipt**, with a single 1.5-second silence-after-payoff beat
  before the dissolve. Continuous narration honors R3's "stacked
  payoff" mechanic — the reveal lands during the cascade, not before
  or after.
- **Transition vocabulary: scoped library of 4 named transitions.**
  Hard cut (cuts: S1→S2). Stamp slap (S2→S3). Dossier-page wipe
  (S3→S4). Cross-dissolve (S4→S5 — the stacked-payoff bridge, the
  R3 mechanic, via `<TransitionSeries>` + `fade()`). Iris wipe
  (S5→S6 — the closing). Each transition has an established
  Archer-grammar precedent. **Generic crossfade defaults are banned**
  per brainstorm: "Crossfade reads as generic editor defaults and
  fails §2 before any content evaluation."
- **Music source: royalty-free licensed brass/bossa track via
  Artlist or Musicbed.** Reasoning: generative (Suno/Udio) lacks the
  controlled rights story for a portfolio trailer; licensed tracks
  give published metadata + clear rights. Specific track candidates
  documented in Unit 1.7. Generative remains as fallback if no
  licensed track lands the mood after Phase 1 listening pass.
- **R15 chrome copy: 4 instances across the trailer.** One in cold
  open (classification stamp), one mid-trailer (comms-ticker pulse
  during cascade), one at the stacked-payoff peak (dossier stamp),
  one at the closing card (subhead). The brainstorm requires "at
  least two"; we ship four for redundancy on the no-context-viewer
  decode mechanism.

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
export const FPS = 30;
export const TOTAL_FRAMES = 2850;
export const TOTAL_DURATION_SEC = TOTAL_FRAMES / FPS; // 95.0

export const S01_START = 0;
export const S01_END = 210;     // 7.0s
export const S02_START = 210;
export const S02_END = 570;     // 12.0s
export const S03_START = 570;
export const S03_END = 1050;    // 16.0s
export const S04_START = 1050;
export const S04_END = 2040;    // 33.0s
export const S05_START = 2040;
export const S05_END = 2580;    // 18.0s
export const S06_START = 2580;
export const S06_END = 2850;    // 9.0s

// Stacked-payoff beat (R3) — frame at which the cascade peaks and the
// Dash reveal line lands simultaneously. ~30s into the cascade window.
export const STACKED_PAYOFF_FRAME = 1950;
// 1.5s silence after the reveal before the cross-dissolve begins.
export const PAYOFF_SILENCE_FRAMES = 45;
export const CROSS_DISSOLVE_START_FRAME = STACKED_PAYOFF_FRAME + PAYOFF_SILENCE_FRAMES; // 1995
export const CROSS_DISSOLVE_DURATION_FRAMES = 45; // 1.5s
// S05 begins after dissolve; S04 ends at 2040 = STACKED_PAYOFF_FRAME + 90.
```

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
- **Happy path:** `timing.test.ts` asserts `TOTAL_FRAMES === 95 *
  FPS` and per-scene durations sum to TOTAL_FRAMES.
- **Edge case:** STACKED_PAYOFF_FRAME + PAYOFF_SILENCE_FRAMES +
  CROSS_DISSOLVE_DURATION_FRAMES === S05_START.
- **Verification:** Markdown lint passes on BEAT-SHEET.md skeleton
  (no broken headings, all 6 scenes present with structural
  placeholders).

**Verification:**

- `videos/trailer/BEAT-SHEET.md` exists with 6 scene headings + total
  runtime block.
- `videos/trailer/src/lib/timing.ts` exists; typecheck clean.
- `timing.test.ts` passes (Vitest, runs from BURNED root or
  trailer-local — TBD by `package.json` scripts).
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
- Create: `videos/trailer/sample-eval/beat-sheet/script-grep-r6.md` —
  evidence that grep for SDLC vocab (`code`, `tests`, `deploy`,
  `commits`, `spec`, `agents`, `LLM`, `Claude`, `AI`, `model`,
  `prompt`) returns zero matches across the script body. (Note:
  permitted exceptions for in-character speech that pretends not to
  know the term, but the line set as drafted should contain none.)
- Create: `videos/trailer/sample-eval/beat-sheet/script-word-count.md` —
  per-scene word count vs. target words-per-second pacing.

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

> *"Our autonomous field assets infiltrated the contract last quarter.
> Seven operatives in the active roster. Six expense reports, all
> classified. One field agent who insists on being called 'Agent X'
> and refuses to file any paperwork whatsoever."*
>
> [BEAT — 1.0s, dossier-page wipe to deck reveal]
>
> *"Mission: a deck of one hundred and twenty operations. One of them
> ends your career instantly. The rest exist to help you survive it.
> Or to ensure your colleagues don't."*

Word count: 65 words across both segments. At ~2.5 wps ≈ 13.0s of
speech + 1.0s mid-scene beat + ~2.0s of scene-edge beats (entry from
S02 stamp slap settle + exit to S04 dossier-page wipe) = 16.0s. Fits.

R6 vocabulary check: "autonomous field assets" (clean), "operatives"
(in-character), "Agent X" (in-character), "expense reports"
(in-character), "deck of operations" (slight stretch — *operations*
is the Pendleton word for *cards*, established in HTP dossier; clean),
"mission rehearsal" not yet invoked. No raw SDLC vocab.

**Step 5 — Receipts Cascade with Stacked Payoff (S04, frames
1050–2040, ~33.0s).** The trailer's load-bearing scene. Continuous
Dash VO over the cascade, paced per-receipt, with a 1.5-second silence
after the stacked-payoff reveal.

Structure (frame-accurate timing in BEAT-SHEET.md table):

| Cue frame | Cue content | Visual | VO line |
|-----------|-------------|--------|---------|
| 1050 | Cascade open | HTP dossier slides into hero position (Playwright capture) | *"Operational planning."* |
| 1110 | HTP scroll cue | HTP scrolls top-to-bottom, ~5s | *"Fourteen thousand pages of forensic dossiers. Drafted on weekends. By a field asset who, for compliance reasons, is not named in this briefing."* |
| 1290 | Stat 1 | Comms-ticker pulse + dossier-stamp on side panel | *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* |
| 1410 | Stat 2 | Card-art grid reveals: Vera portrait, Otto portrait, Neal portrait | *"Six of them, deliberately unrehearsed. The agency calls those the 'memorable ones.'"* |
| 1560 | Stat 3 | Card-art grid expands: full 17-artwork mosaic flips in | *"Asset profile illustrations commissioned: seventeen. Two of them with hats."* |
| 1680 | Stat 4 | Comms-ticker pulse: "OPERATIVE [REDACTED] — METHOD REPEATABLE" | *"Operatives deployed in the active roster: seven. Plus one who is, technically, all of them. Don't ask about Agent X. We've stopped asking."* |
| 1860 | Cascade peak | All cascade elements stack in frame: HTP centered, card-art halo, comms-ticker pulsing | (silence — ~3s music sting under cascade visual) |
| **1950** | **Stacked payoff (R3)** | Dossier stamp lands: "AUTONOMOUS FIELD UNIT — ASSET DELIVERED" | *"The autonomous field assets, the forensic dossiers, the mission rehearsal artifacts — they weren't preparing for the operation."* [BEAT 0.6s] *"They WERE the operation."* |
| 1995 | Payoff silence | Visual frozen, music drops to bed-only | (silence, 1.5s = 45 frames) |
| 2040 | Cross-dissolve begins | TransitionSeries fade to S05 | — |

Word count: ~84 words across the cascade VO. At ~2.6 wps (slightly
faster cadence to match cascade pacing) ≈ 32.3s + 0.6s payoff inner-
beat + 1.5s silence after = ~34.4s. Trim the Agent X stat by ~6 words
to land closer to 33.0s.

Tightened Agent X stat:

> *"Operatives in the active roster: seven. Plus one who is,
> technically, all of them. Don't ask."*

(13 words at ~2.6 wps = 5.0s, saves ~3.5s vs prior draft.)

**Step 6 — Gameplay Dissolve (S05, frames 2040–2580, ~18.0s).**
Crossfade in (~1.5s), real gameplay plays ~14s with sparse Dash VO,
crossfade out begins via iris-wipe at frame 2535.

Visual: cascade dissolves to phone-controller + TV-shared-screen
gameplay capture (Phase 5 deliverable). R15 chrome layer floats: comms
ticker reads "OPERATIVE [REDACTED] — METHOD REPEATABLE" at frame
~2200.

VO (sparse):

| Cue frame | VO line |
|-----------|---------|
| 2070 | (gameplay sound dominates; no Dash) |
| 2280 | *"And — between you and me — they appear to be enjoying it."* |
| 2400 | **Scream beat (R5 contingent):** in-game BURNED card draws on capture → Dash VO interjects *"VERAAA!!!"* (the Sterling-screams-Lana cadence). If R5 cut, this beat is silent or replaced with a chuckle SFX from the gameplay capture. |
| 2535 | (silence; iris wipe begins) |

Word count: ~12 words of Dash VO across S05. ~5s total speech vs
18s scene = the gameplay AUDIO carries 13s of the scene; Dash sparse
on top.

**Step 7 — Closing Directive (S06, frames 2580–2850, ~9.0s).**

Speaker: Dash. Final scene returns to briefing-room frame; venetian-
blind shadows reestablish. BURNED logo final treatment lands at
frame ~2790. R15 closing stamp ("AGENT-BUILT, ARCHER-GRADE") slaps
onto the logo card.

> *"That's the briefing. Operation Pendleton is now in your hands.
> Try not to embarrass me."*
>
> [BEAT 0.4s]
>
> *"…Phrasing."*

Word count: 18 words + Phrasing. At ~2.3 wps (slowest pace — Dash
delivers the close with maximum deliberateness) ≈ 7.8s + 0.4s beat +
0.4s on Phrasing = 8.6s + 0.4s music-final-sting tail = 9.0s. Fits.

**Step 8 — Total word count + runtime validation.**

| Scene | Words | Pace (wps) | Estimated speech | Scene budget | Buffer |
|-------|-------|-----------|------------------|--------------|--------|
| S01 | 11 | 2.5 | 4.4s | 7.0s | 2.6s |
| S02 | 28 | 2.4 | 11.7s | 12.0s | 0.3s |
| S03 | 65 | 2.5 | 13.0s + 1.0s mid-beat = 14.0s | 16.0s | 2.0s |
| S04 | ~81 | 2.6 | 31.1s + 0.6s inner + 1.5s silence = 33.2s | 33.0s | -0.2s (trim 1 word) |
| S05 | 12 | 2.5 | 4.8s | 18.0s | 13.2s (gameplay audio fills) |
| S06 | 19 | 2.3 | 8.3s + 0.4s beat = 8.7s | 9.0s | 0.3s |
| **Total** | **~216** | **2.5** | — | **95.0s** | — |

**Step 9 — R6 grep verification.** After the script lands in BEAT-
SHEET.md, run:

```bash
grep -iE '\b(code|tests|deploy|commit|spec(s|ification)?|agent(?!\s+X)|LLM|Claude|AI|model|prompt|chat|github|repo|build)\b' videos/trailer/BEAT-SHEET.md
```

(Note: `agent(?!\s+X)` excludes "Agent X" which is in-character.)

Expected: zero matches inside the VO line set. (Hits inside the
**Pendleton vocabulary translation key** table at the top of the
document are expected and not a violation — they're documenting the
rule, not enforcing it.) Document the grep result in
`sample-eval/beat-sheet/script-grep-r6.md`.

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

The Phase 0 outcomes feed into a 2x2 outcome matrix:

| R5 outcome | R14 cold-open speaker | Voice cast | Scream beat |
|------------|----------------------|------------|-------------|
| Kept (Path a or b cleared) | Vera | Dash + Vera | Dash screams "VERAAA!!!" at frame 2400 |
| Kept | Sable | Dash + Sable | Dash screams "VERAAA!!!" at frame 2400; Vera visible in S03 card flash only |
| Kept | Janet | Dash + Janet | Dash screams "VERAAA!!!" at frame 2400; Vera visible in S03 card flash only |
| Cut | Sable (Vera removed) | Dash + Sable | Frame 2400 beat replaced with chuckle SFX from gameplay |
| Cut | Janet (Vera removed) | Dash + Janet | Same |

Phase 1 locks the per-line **Voice** cell to one specific path per
the Phase 0 results.

**Step 2 — Per-line table.**

| Scene | Frame | Voice | Line | Notes |
|-------|-------|-------|------|-------|
| S01 | 60 | Cold-open speaker | "He's a machine, this kid..." | Brass hook lands at frame 0; line drops at frame 60 (2.0s in) |
| S02 | 240 | Dash | "Good morning..." | Venetian-blind establishing 0.5s before line |
| S03 | 600 | Dash | "Our autonomous field assets..." | Dossier-page settle at frame 570 |
| S03 | 870 | Dash | "Mission: a deck of one hundred and twenty operations..." | After 1.0s mid-scene beat |
| S04 | 1080 | Dash | "Operational planning." | Cascade opens |
| S04 | 1110 | Dash | "Fourteen thousand pages..." | HTP scroll begins |
| S04 | 1290 | Dash | "Mission rehearsal: fourteen hundred and seven..." | Stat 1 cue |
| S04 | 1410 | Dash | "Six of them, deliberately unrehearsed..." | Stat 2 cue |
| S04 | 1560 | Dash | "Asset profile illustrations: seventeen..." | Stat 3 cue |
| S04 | 1680 | Dash | "Operatives in the active roster: seven..." | Stat 4 cue |
| S04 | **1950** | Dash | **"The autonomous field assets... they WERE the operation."** | **R3 stacked payoff** |
| S05 | 2280 | Dash | "And — between you and me — they appear to be enjoying it." | Sparse over gameplay |
| S05 | 2400 | Dash (scream) | "VERAAA!!!" | R5 contingent; cut → silent / chuckle SFX |
| S06 | 2610 | Dash | "That's the briefing..." | Final scene |
| S06 | 2790 | Dash | "...Phrasing." | After 0.4s beat |

**Step 3 — Engine per voice cell.**

- **Dash lines + scream**: engine + voice preset that cleared R4 Path
  (A/B/C) — per Phase 0 Unit 0.2 results. Cadence steering = the
  Step 0 cadence-spec.md from Phase 0.
- **Cold-open speaker (1 line)**: engine + voice preset matching
  whichever character (Vera/Sable/Janet) cleared R14 cadence-match.
  Per Phase 0 Unit 0.3 results.

If Path D won (voice actor): both voices are voice-actor reads. Single
or two actors, depending on whichever lands the cadence-spec best.

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

**Requirements:** R3 (stacked-climax cross-dissolve specifically), R8
(landscape-only — transitions must compose horizontally), R14 (cold-
open hands off cleanly to briefing-setup).

**Dependencies:** Unit 1.1 (scene structure), Phase 0 Unit 0.5 (spike
result establishes which transitions render cleanly in MP4 export).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — add **Transition out** cell
  per scene + 1 transition-vocabulary appendix section.
- Create: `videos/trailer/src/lib/transitions.ts` — exports named
  transition components / props (skeletal; full implementation in
  Phase 4).

**Approach:**

**Step 1 — Scoped library (5 named transitions).**

| # | Name | Archer-grammar precedent | Remotion implementation |
|---|------|--------------------------|-------------------------|
| 1 | **Hard cut** | Cuts between briefing-room and field scenes in Archer; the show's default | `<Sequence>` boundary, no transition component |
| 2 | **Stamp slap** | "CLASSIFIED" / "TOP SECRET" stamp slams in from upper-right with 1-frame scale-up + 1-frame settle | Pure Remotion interpolation of rotation + scale + opacity over 8 frames |
| 3 | **Dossier-page wipe** | Page-turn motif: the next scene is "under" the current one; horizontal wipe reveals it | Custom transition component using `<clipPath>` or CSS `clip-path: inset()` interpolation |
| 4 | **Cross-dissolve via `<TransitionSeries>`** | NOT generic crossfade — this is the R3 stacked-payoff bridge, 45-frame fade, music drops to bed under the fade | `@remotion/transitions` `<TransitionSeries>` + `fade()` + `linearTiming({ durationInFrames: 45 })` |
| 5 | **Iris wipe** | Classic title-sequence closer; circular SVG mask shrinking to point at trailer end | Pure Remotion `<clipPath>` circle radius interpolation |

**Step 2 — Per-boundary picks.**

| Boundary | Transition | Frame range | Rationale |
|----------|-----------|-------------|-----------|
| S01 → S02 | Stamp slap | 200–210 (8 frames inside S01 tail + 2 frames into S02 head) | Cold-open closes with the agentic-SDLC R15 classification stamp; the stamp IS the transition. The slap settles into S02's briefing-room frame as the stamp peels back. |
| S02 → S03 | Hard cut | 570 | Briefing → mission background is a "next slide" beat. Pendleton briefings cut. Archer briefing scenes typically cut. |
| S03 → S04 | Dossier-page wipe | 1042–1050 (8 frames) | Mission Background ends on the deck-of-120 reveal; the dossier page turns and reveals the cascade. Honors the diegetic frame. |
| S04 → S05 | **Cross-dissolve (R3 mechanic)** | 1995–2040 (45 frames) | The trailer's most load-bearing transition. The cascade ENDS on the stacked-payoff reveal, holds silent for 1.5s, then cross-dissolves to live gameplay. Music drops to bed under the dissolve. This is the R3 mechanic literally — visual + audio reveal land then bridge to reality. |
| S05 → S06 | Iris wipe | 2535–2580 (45 frames) | Closing transition. Iris wipes the gameplay frame closed; behind it, the briefing-room frame reestablishes for the closing directive. Title-sequence-shape echo at trailer close. |
| S06 → end | Hard cut to black | 2850 | The trailer ends. No "fade to black" — Archer hard-cuts to credits. |

**Step 3 — `transitions.ts` skeleton.**

```ts
// videos/trailer/src/lib/transitions.ts
import { linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

export const STAMP_SLAP_FRAMES = 8;
export const DOSSIER_WIPE_FRAMES = 8;
export const CROSS_DISSOLVE_FRAMES = 45; // R3 bridge
export const IRIS_WIPE_FRAMES = 45;

// Phase 4 imports these in scene composition files.
export const fadeForR3 = () =>
  fade(); // wrapper for clarity; presentation prop for <TransitionSeries.Transition>
export const r3Timing = () =>
  linearTiming({ durationInFrames: CROSS_DISSOLVE_FRAMES });
```

**Step 4 — Banned-transition list (anti-pattern guard).**

- **Generic crossfade between every scene** (not the R3 one — the
  R3 bridge is a single intentional cross-dissolve). Crossfades read
  as "editor defaults." §2 fail.
- **Push transitions** (the slide-in-from-right thing). Reads as
  generic motion-graphics templates.
- **3D cube flips** etc. Not in the Archer vocabulary.
- **Glitch effects.** Not in the Archer vocabulary.

Document in BEAT-SHEET.md appendix.

**Patterns to follow:**

- Phase 0 Unit 0.5 spike outcome — which transition primitive cleared
  in MP4 export.
- UMB v3 uses `<Series>` + custom `FadeTransition` overlay components
  scene-internally; UMB does NOT use `<TransitionSeries>` cross-
  dissolves. BURNED breaks new ground on the R3 dissolve specifically.
- Remotion docs: https://www.remotion.dev/docs/transitions/transitionseries

**Test scenarios:**

- **Happy path:** BEAT-SHEET.md transition table contains 6
  boundaries each with a named transition + frame range + rationale.
- **Happy path:** `transitions.ts` typechecks and exports constants
  consumed by Phase 4 scene files.
- **Edge case:** Sum of transition frames + sum of scene frames =
  TOTAL_FRAMES (i.e., transitions overlap scene boundaries; they
  don't ADD to runtime). Reflected in timing.ts (Unit 1.1).
- **Anti-pattern guard:** Banned transitions section documents the
  veto list with examples.

**Verification:**

- Transition vocabulary appendix in BEAT-SHEET.md.
- `transitions.ts` typechecks clean.
- Per-boundary picks documented with frame-range + rationale.

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

**Step 1 — Spatial layout decision.**

Three candidate layouts considered (per brainstorm Deferred-to-Planning):

| Candidate | Description | Verdict |
|-----------|-------------|---------|
| Full-bleed sequential | One receipt fills frame; cuts to next | Rejected — loses stacked-payoff impact (sequential ≠ stacked) |
| Two-column UMB v3 S08 pattern | Receipts column-stack with VO timing | Rejected — landscape-wide BURNED palette wastes the central safe-square real estate |
| **Layered simultaneous (locked)** | HTP dossier hero centered, card-art halo cluster around it, comms-ticker pulse along bottom edge, goofy-stat captions appear and persist in lower-third | **Locked** — supports R3 by literally stacking visual elements in frame; payoff line lands as all elements peak simultaneously |

**Step 2 — Frame-by-frame storyboard (text).**

| Frame range | Element timeline |
|-------------|-----------------|
| 1050–1110 | HTP dossier capture slides up from bottom into hero center position (60-frame ease-out). Briefing-room frame fades to dim parchment background. |
| 1110–1290 | HTP dossier scrolls top-to-bottom (~6s of scroll motion, ~1100 px range based on UMB capture-htp-scroll precedent). VO line lands at frame 1110. |
| 1290–1410 | Stat 1 caption (lower-third left): **"PLANNING: 14,000 PAGES"** + paired absurd companion: **"+ 6 STICKY NOTES (RECOVERED)"** appears with stamp-slap entry. |
| 1410–1560 | Card-art reveal: Vera + Otto + Neal portraits flip in along the right edge (right-edge halo cluster begins). Stat 2 caption (lower-third center): **"REHEARSALS: 1,407 CONTINGENCIES — 6 UNREHEARSED"** + companion: **"(THE 'MEMORABLE' ONES)"**. |
| 1560–1680 | Full 17-artwork mosaic flips in around the HTP hero (halo expands to encircle dossier). Stat 3 caption (lower-third right): **"ASSET ILLUSTRATIONS: 17"** + **"(TWO WITH HATS)"**. |
| 1680–1860 | Comms-ticker pulse along bottom edge: **"OPERATIVE [REDACTED] — METHOD REPEATABLE"** scrolls horizontally. Stat 4 caption replaces Stat 1 (LIFO stat rotation): **"OPERATIVES: 7"** + **"(PLUS AGENT X. DON'T ASK.)"**. |
| 1860–1950 | **Cascade peak.** All elements in frame simultaneously: HTP centered + 17-mosaic halo + 4 captions ringing the safe-square edge + comms-ticker pulsing. Music intensifies for 3s with no VO (~frames 1860–1950). |
| **1950** | **Stacked payoff frame.** Dossier-stamp **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"** lands center-frame with stamp-slap animation (overprints the HTP hero). Dash VO drops: *"The autonomous field assets, the forensic dossiers, the mission rehearsal artifacts..."* |
| 1980 | *"...they weren't preparing for the operation."* [BEAT 0.6s] |
| 2010 | *"They WERE the operation."* |
| 1995–2040 | **Payoff silence + cross-dissolve begins (R3 mechanic).** Music falls to bed-only. All cascade elements hold static. Cross-dissolve to S05 gameplay begins at frame 1995 (45-frame fade). |

**Step 3 — Mobile safe-square placement.**

The 1080×1080 central square within the 1920×1080 frame contains:
- HTP hero (centered, ~600px wide max).
- Top edge of card-art halo (the cluster mostly lives in the side bands
  outside the safe square; the top 1–2 cards inside).
- Stamp at frame 1950 (centered).
- Top caption stamp if any.

Comms-ticker pulse + goofy-stat captions live OUTSIDE the safe square
in the side bands. These read on desktop but may crop on mobile X
in-feed preview. **Acceptable tradeoff** — the critical narrative
elements (HTP hero, stamp, payoff stamp) are inside the square. The
captions are flourish, not load-bearing for the cascade's narrative.

**Step 4 — VO-sync model lock.**

**Continuous Dash narration paced per-receipt**, with one 3-second
music sting under the cascade peak (no VO 1860–1950) and one
1.5-second silence after the stacked-payoff (1995–2040). Per Unit
1.2 Step 5 cue table.

Why not silent cascade with VO bookends? Per brainstorm Deferred
question: bookended VO produces a "highlight reel" feel inconsistent
with the briefing spine. Continuous Dash narration keeps the briefer
present through the entire visual climax.

Why not per-receipt with hard silences between? Hard silences between
stats break the cascade's pacing and read as "narrator pause for
chuckle" — broken-rhythm sitcom voiceover, not Archer.

**Step 5 — Entry choreography per element.**

- **HTP hero:** ease-out slide-up from bottom (60-frame). 0% to 100%
  position, 50% to 100% opacity simultaneously.
- **Card-art reveals:** stamp-slap entry (8-frame rotation + scale +
  opacity). Per-card stagger of 4 frames.
- **17-mosaic halo expand:** ease-out scale 0.8 → 1.0 + opacity 0 → 1
  over 30 frames.
- **Comms-ticker:** existing BURNED chrome animation pattern (continuous
  scroll, no entry — already present in dim background from S03 and
  brightens at frame 1680).
- **Stat captions:** stamp-slap entry, identical to card-art reveals.
- **Stacked-payoff stamp:** harder slap (16-frame rotation + scale +
  opacity with a 1-frame settle), overprints HTP hero.
- **Cross-dissolve out:** linear opacity 100 → 0 over 45 frames on all
  cascade elements; S05 gameplay fades in opposite.

**Step 6 — HTP rendering method lock.**

Per brainstorm Deferred-to-Planning default: **clone UMB's
`capture-htp-scroll.ts`** at `projects/undercover-mob-boss/scripts/`.
Adapted to BURNED's `/howtoplay.html` route. Output:
`videos/trailer/public/htp-fullpage.png` (full-page PNG capture).

Phase 4 imports the PNG as a `<Img>` with `translateY` interpolation
to drive the scroll motion at scene-runtime — same trick UMB uses.

Fallback if Phase 3 reveals static PNG under-delivers visually
(GSAP-driven animations missing from the capture, etc.): upgrade to
**Playwright trace-video capture** (`page.video()` API) — produces an
actual mp4 of the scroll motion with animations intact. Trade-off:
higher file size, MP4 needs to compose into Remotion via
`<OffthreadVideo>`. Reserved for Phase 3 escalation.

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

**Step 3 — 4 finalists.**

| Slot | Finalist | Source-verified | Rationale |
|------|----------|-----------------|-----------|
| S04 Stat 1 (frame 1290) | P1: 14,000 pages of forensic dossiers / + 6 sticky notes (recovered) | docs/ word count via wc -w (Phase 1 verifies) | Opens the cascade with a "planning" beat — sets up the SDLC-as-spywork translation visually + textually |
| S04 Stat 2 (frame 1410) | P2: 1,407 mission rehearsal contingencies / 6 deliberately unrehearsed (the "memorable" ones) | TODO.md §1 verified 2026-05-16 | The "memorable ones" framing carries a callback for engineering-peer viewer (expected-fail tests = bugs we're deliberately not fixing yet) |
| S04 Stat 3 (frame 1560) | P3: 17 asset profile illustrations / 2 of them with hats | public/assets/cards/*.webp count | Lands hardest visually because the 17-mosaic halo IS visible in frame as Dash says the line |
| S04 Stat 4 (frame 1680) | P4: 7 operatives in the active roster / + 1 who is, technically, all of them. Don't ask | brainstorm roster | Closes the cascade pacing on Agent X — the "and one more thing" beat |

**Step 4 — Cold-read gate.**

Per brainstorm: "if the finalized stat list doesn't make a
reviewer-who'd-watch-UMB-v3 laugh at least twice on a first read,
**R11 is cut and the cascade becomes purely visual** (card art +
dossier + gameplay). Comedy-stats fail closed, not open."

Protocol:

- Reviewer: 1 engineering-peer (Briggsy's network, Harry, or similar)
  who has watched UMB v3 and would watch BURNED.
- Stimulus: the 4 finalists listed in order, voiced via the engine
  selected in Phase 0 (or read aloud by Briggsy at presentation
  cadence).
- Question: "Read these. React naturally. No need to perform."
- Acceptance: reviewer audibly laughs (or grins / smirks per Briggsy's
  observation) at ≥2 of the 4 pairings, OR articulates "this one's
  good" / "I like this one" unprompted.
- Fail-action: **R11 is cut.** Cascade VO Stat 1–4 cues drop; cascade
  becomes purely visual (HTP scroll + card-art halo + R15 chrome).
  Dash VO lines for stats are replaced with a single bridging line
  between cascade open and the stacked-payoff reveal.

If R11 is cut, Unit 1.2 narration script for S04 needs revision —
collapses to a tighter visual-only cascade. Documented in
`goofy-stats-list.md` as the cut-handling block.

**Step 5 — Stat-source verification.**

Before the cold-read gate runs, verify every dry stat against its
source. Per `feedback-stats-single-source.md`:

- P1: `Get-ChildItem docs/ -Recurse -File | Get-Content | Measure-Object -Line` — actual page-count proxy. If "14,000 pages" doesn't match the count by an order of magnitude, the stat is rewritten with the real number.
- P2: TODO.md §1 says **1,407 pass | 6 expected fail (68/68 files)**. The stat as drafted (1,407 + 6 unrehearsed) matches exactly. ✓
- P3: `Get-ChildItem public/assets/cards/*.webp` — actual count. Brainstorm says 17 unique; verify against current count.
- P4: roster count = 7 operatives (Dash, Vera, Otto, Janet, Neal, Sable, Agent X) + Dolores NPC. The "plus one who is all of them" line is true (Agent X is the wild-card-as-anyone mechanic). ✓

Document verification commands + counts in `goofy-stats-list.md`.

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
without repeating awkwardly), Unit 1.4 (cross-dissolve at frame 1995
needs music to support a 45-frame fade-to-bed under VO).

**Files:**

- Edit: `videos/trailer/BEAT-SHEET.md` — name the locked track in the
  preamble (license + URL + duration).
- Create: `videos/trailer/sample-eval/beat-sheet/music-sourcing.md` —
  candidates auditioned, picked-track rationale, license-document path.
- Create: `videos/trailer/public/audio/music-bed.mp3` — the licensed/
  royalty-free track local copy.

**Approach:**

**Step 1 — Source-type decision.**

| Source type | Pros | Cons | Verdict |
|-------------|------|------|---------|
| Generative (Suno / Udio) | Cuts to fit any beat sheet | Rights story murky for portfolio trailers (training-data lawsuits ongoing 2026); no published metadata | Backup only |
| Royalty-free library (Artlist / Musicbed / Epidemic Sound) | Clear license, published metadata, browseable catalogs of mid-century brass | Track is fixed-length; trailer must cut to track OR track edited (~$50/yr Artlist subscription typically covers project) | **Locked as primary** |
| Licensed track (real published artist) | Cultural caché if recognizable | $500–5000+ for sync license; not justified at portfolio-trailer scale | Declined |

**Step 2 — Candidate catalog.**

Search criteria for Artlist / Musicbed / similar:

- Genre: mid-century brass / bossa nova / spy jazz / lounge
- BPM: 100–130 (matches Archer title sequence pacing)
- Mood: confident, slightly playful, deadpan — NOT goofy / wacky
- Instrumentation: brass (trumpet / sax lead), upright bass, syncopated
  drums, optional vibraphone or organ accent
- Length: ≥95s or loop-friendly
- Has a "drop" / "lift" structure: trailer cascade needs music to swell
  into the stacked-payoff beat at frame 1860–1950, fall to bed at
  1995, swell back for closing at S06

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

Candidate auditioning protocol:

- Artlist search: tags = "spy" + "jazz" + "60s" — pull top 10 results.
- Musicbed search: tags = "mid-century" + "brass" — pull top 5 results.
- Audition each against BEAT-SHEET.md timing: does the 95s structure
  work? Does the cascade peak (1860–1950) line up with a natural
  swell? Does the cross-dissolve at 1995 land on a natural fall?

**Step 3 — Pick rationale criteria.**

A candidate locks IFF:

- 95s+ playable length OR loops cleanly at ≤4-bar increments
- Has a discernible cascade-friendly structure (intro → build → peak →
  fall → close — at least 2 dynamic phases)
- Brass / bossa core, not piano-led generic
- License covers portfolio + Twitter distribution (verify Artlist or
  Musicbed terms)
- ≤$30/track equivalent at subscription rate

Picked track documented with: title, artist, source URL, license type,
download path, BPM, key, duration. License PDF (or terms-page archive)
filed to `videos/trailer/sample-eval/beat-sheet/music-license.pdf`.

**Step 4 — Generative fallback documented.**

If no royalty-free track lands the mood after 10–15 auditions, Suno or
Udio generative fallback. Prompt template documented in
`music-sourcing.md`:

> *"Instrumental mid-century brass / bossa nova spy jazz, 60s
> Mancini-Bacharach influence, syncopated trumpet + saxophone lead,
> upright bass, brushed drums, vibraphone accents on offbeats.
> 110bpm, key of D minor. Mood: confident, sardonic, deadpan, slight
> playfulness. Structure: 8-bar intro / 32-bar build / 4-bar peak /
> 8-bar fall to bass-and-drums-only bed / 16-bar close on lead brass."*

Generative rights: Suno's commercial-use terms apply to paid tiers;
verify before fallback fires.

**Step 5 — Music-cue map in BEAT-SHEET.md preamble.**

| Frame range | Music state | Volume |
|-------------|-------------|--------|
| 0–60 | Brass hook intro | 100% |
| 60–210 | Bed under cold-open speaker | 40% |
| 210–570 | Underscore build (briefing setup) | 50% |
| 570–1050 | Continue build (mission background) | 55% |
| 1050–1680 | Cascade open, music swells | 60–75% |
| 1680–1860 | Peak intensification (no VO) | 90% |
| 1860–1950 | Cascade peak hold | 90% |
| 1950–1995 | Sharp drop to bed under payoff VO | 30% |
| 1995–2040 | Bed only, cross-dissolve | 25% |
| 2040–2535 | Sparse bed under gameplay capture | 25% |
| 2535–2580 | Iris-wipe music returns to ~50% | 50% |
| 2580–2790 | Closing underscore | 60% |
| 2790–2850 | Final brass sting on logo | 100% |

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

- `music-sourcing.md` exists with audition log + pick rationale.
- `public/audio/music-bed.mp3` exists at trailer-project root.
- License document filed.
- Music-cue map in BEAT-SHEET.md preamble.

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

**Step 2 — Font asset sourcing.**

The 3 fonts live in BURNED's `public/fonts/`. Copy to
`videos/trailer/public/fonts/`:

- `clash-display-700.woff2` — Display (headlines, R15 stamps, BURNED
  logo treatment, classification overlays)
- `general-sans-400.woff2` + `general-sans-500.woff2` + `general-sans-600.woff2`
  — Body (captions, briefing-room chrome, comms-ticker text)
- `jetbrains-mono-500.woff2` + `jetbrains-mono-700.woff2` — Monospace
  (operative dossier metadata, "OPERATIVE [REDACTED]"-style chrome,
  any stat-readout overlay)

**Step 3 — `useFonts.ts` implementation.**

```ts
// videos/trailer/src/hooks/useFonts.ts
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let loaded = false;

export function useFonts() {
  if (loaded) return;
  loaded = true;

  loadFont({
    family: 'Clash Display',
    url: staticFile('fonts/clash-display-700.woff2'),
    weight: '700',
    format: 'woff2',
  });

  loadFont({
    family: 'General Sans',
    url: staticFile('fonts/general-sans-400.woff2'),
    weight: '400',
    format: 'woff2',
  });
  loadFont({
    family: 'General Sans',
    url: staticFile('fonts/general-sans-500.woff2'),
    weight: '500',
    format: 'woff2',
  });
  loadFont({
    family: 'General Sans',
    url: staticFile('fonts/general-sans-600.woff2'),
    weight: '600',
    format: 'woff2',
  });

  loadFont({
    family: 'JetBrains Mono',
    url: staticFile('fonts/jetbrains-mono-500.woff2'),
    weight: '500',
    format: 'woff2',
  });
  loadFont({
    family: 'JetBrains Mono',
    url: staticFile('fonts/jetbrains-mono-700.woff2'),
    weight: '700',
    format: 'woff2',
  });
}
```

Called at `Root.tsx` top level. `@remotion/fonts.loadFont()` auto-tracks
the promise via `delayRender` — render blocks until fonts ready, no
manual machinery.

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
| Closing R15 subhead ("AGENT-BUILT, ARCHER-GRADE") | JetBrains Mono | 700 | ~32px |

**Step 5 — Color tokens (locked from BURNED palette).**

| Token | Hex | Use |
|-------|-----|-----|
| `--color-cream` | (per spec.css) | Background tone, parchment |
| `--color-teal` | (per spec.css) | Briefing-room frame accents |
| `--color-ochre-9` | (per spec.css) | Card borders, R15 stamp ink |
| `--color-burn-fire` | (per spec.css) | Critical emphasis (the stacked-payoff stamp ink, the BURNED card flash) |
| `--color-ink` | (per spec.css) | Body text |

Briggsy is color blind — typography + position + shape carry signal,
never color alone. Per BURNED's existing patterns this is already
the case.

**Patterns to follow:**

- UMB v3 useFonts.ts pattern.
- BURNED's existing `public/fonts/` directory + typography conventions
  in `docs/PRODUCT-SPECIFICATION.md`.
- Phase 0 Unit 0.5 spike validated custom-font rendering in MP4.

**Test scenarios:**

- **Happy path:** `useFonts.ts` loads 3 font families with multiple
  weights; render blocks until fonts ready.
- **Happy path:** Sample frame at frame 1950 (stacked-payoff stamp)
  composites with Clash Display + JetBrains Mono visible — verify in
  MP4 export, not just studio preview.
- **Edge case:** Mobile safe-square preview — typography readable at
  1:1 crop centered on 1920×1080.
- **Anti-pattern guard:** No element uses `system-ui` or any web-
  default font fallback in the trailer.

**Verification:**

- `useFonts.ts` exists; typecheck clean.
- 6 woff2 files in `videos/trailer/public/fonts/`.
- Typography assignments documented per element.
- `typography.md` records decision + sample frames.

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

**Step 1 — R15 instance table.**

| # | Frame | Scene | Copy | Treatment | Source brainstorm example |
|---|-------|-------|------|-----------|---------------------------|
| 1 | 150 | S01 cold open | **"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"** | Classification stamp slap, lower-left, JetBrains Mono 700 28px, ochre ink on cream stamp paper | Brainstorm R15 example #1 |
| 2 | 1680 | S04 cascade | **"OPERATIVE [REDACTED] — METHOD REPEATABLE"** | Comms-ticker pulse, bottom edge, JetBrains Mono 500 22px, scrolling left-to-right | Brainstorm R15 example #2 |
| 3 | 1950 | S04 stacked payoff | **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"** | Dossier stamp slap, center, overprinting HTP hero, JetBrains Mono 700 38px, burn-fire ink | Brainstorm R15 example #3 |
| 4 | 2800 | S06 closing | **"AGENT-BUILT, ARCHER-GRADE"** | Subhead under BURNED logo, JetBrains Mono 700 32px, ochre ink | Brainstorm R15 example #4 |

**Step 2 — R15 brainstorm-mandate trace.**

Brainstorm R15 acceptance: "at least one signal lands in the cold-
open frame, at least one in the cascade or closer."

- ≥1 in cold-open: #1 (frame 150 in S01). ✓
- ≥1 in cascade or closer: #2 (cascade comms-ticker, frame 1680), #3
  (cascade stacked payoff, frame 1950), #4 (closing, frame 2800).
  ✓ — three signals across cascade + closer.

Total: 4 R15 signals. Brainstorm minimum is "at least two." BURNED
ships 4 for redundancy on the no-context-viewer decode mechanism.

**Step 3 — In-world authenticity check.**

Each copy line must read as in-character Pendleton-agency chrome
(passes R6 vocab discipline) while remaining engineering-peer-decodable
(carries the agentic-SDLC origin signal). Per-instance check:

- **#1 "OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"**:
  In-world (case file = how the agency labels operations). Decodable:
  "METHOD: AUTONOMOUS" reads as "method of execution" diegetically
  AND as "this was built autonomously by an agent" to an engineering
  peer. ✓
- **#2 "OPERATIVE [REDACTED] — METHOD REPEATABLE"**: In-world
  (operative redaction + method classification standard chrome).
  Decodable: "method repeatable" reads as "tradecraft is reproducible"
  diegetically AND as "the autonomous-SDLC method works twice"
  (the trailer's central engineering claim) to a peer. ✓
- **#3 "AUTONOMOUS FIELD UNIT — ASSET DELIVERED"**: In-world (asset
  delivery is briefing-room vocabulary). Decodable: "AUTONOMOUS FIELD
  UNIT" literally states the agentic-SDLC origin without breaking
  diegetic frame — the *unit* that *delivered* the *asset* was
  autonomous. ✓ This is the R3 stacked-payoff visual carrier — visual
  text + audio reveal land simultaneously.
- **#4 "AGENT-BUILT, ARCHER-GRADE"**: In-world (Pendleton field-agent
  byline). Decodable: "AGENT-BUILT" = "built by autonomous agents"
  to engineering peers. The "ARCHER-GRADE" companion is BURNED's own
  quality claim (per spec §2 quality bar) — closes the loop. ✓

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

**S02 — Briefing Setup.** Frame composition:

- **Background (full-bleed):** mahogany desk surface (the BURNED
  briefing-room `--color-mahogany` token), venetian-blind shadow bands
  animating slowly across the desk (subtle, ~0.5px per frame motion).
- **Foreground center:** an open dossier folder (Pendleton crest on the
  cover before it opens). Folder opens via 60-frame ease over frames
  240–300. Inside: briefing case-sheet with "OPERATION PENDLETON / CASE
  FILE 02" header + Dash's name + clearance level.
- **Top-left corner:** Pendleton crest watermark, ~120px wide.
- **Top-right corner:** comms-ticker idle text (one of the existing
  BURNED idle lines: "CHANNEL OPEN" / "STANDING BY" / "AWAITING
  TRANSMISSION" / "INTERCEPT CLEAR" — chosen per BURNED's existing
  DossierFeed.tsx pattern).
- **R15 stamp** (#1) animates in at frame 150 — pre-Dash-speech.
- **Dash character art**: NOT visible in S02. Dash is the briefer
  *delivering* the briefing — his presence is the VO, not a portrait.
  The briefing-room frame IS the proof of R1, not a Dash silhouette.

**S03 — Mission Background.** Frame composition:

- **Background (full-bleed):** mahogany desk continues (visual
  continuity with S02; the dossier IS the desk's content).
- **Foreground center:** open dossier deepens into the deck reveal.
  Around frame 700, the dossier-page wipe motion turns to reveal the
  full deck-of-120 mosaic — a stylized representation of 120 card
  backs arranged in a 12×10 grid.
- **Operative roster overlay:** at frame 750, 7 operative portrait
  cards (Dash + Vera + Otto + Janet + Neal + Sable + Agent X with
  REDACTED-bar over face) slide in along the right edge (right-edge
  halo cluster, sets up S04's halo expansion).
- **Comms-ticker continues** (idle text at frame head, switches to
  "ACTIVE BRIEFING" or similar at frame ~870 to match the second VO
  line).

**S06 — Closing Directive.** Frame composition:

- **Background:** briefing-room reestablishes via iris-wipe from S05.
  Venetian-blind shadow returns. Mahogany desk surface.
- **Foreground:** dossier closes (reverse of S02 opening — 30-frame
  ease). Dossier cover shows full Pendleton crest + classification
  stamp.
- **Frame 2790:** BURNED logo lands center, sized ~720px wide,
  Clash Display 700 with chrome treatment. R15 stamp #4 ("AGENT-BUILT,
  ARCHER-GRADE") slaps onto the logo card at frame 2800.
- **Frame 2820:** Final brass sting on the music bed; logo holds
  static.
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
- Existing CASE BANNER chrome: `src/client/board/CaseBanner.tsx`.
- Existing comms-ticker: `src/client/board/DossierFeed.tsx`.

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

- **Interaction graph:** BEAT-SHEET.md is the central artifact every
  downstream phase reads. Phase 2 (Voice Pipeline) loads the line set
  + voice assignments. Phase 3 (Visual Asset Prep) loads the visual
  inventory + the goofy-stats list + the HTP rendering method + the
  briefing-room composition. Phase 4 (Remotion Composite Build)
  imports `timing.ts`, `transitions.ts`, and builds scenes per the
  cue tables. Phase 5 (Gameplay Capture) reads the S05 gameplay
  duration + audio policy. Phase 6 (Final Render + QA) uses the
  beat-sheet for QA criteria. Phase 7 (Distribution) reads the
  X-native cutdown brief from BEAT-SHEET.md notes (Unit 1.5 + 1.9
  surface candidate cutdown beats).

- **Error propagation:** If Unit 1.2's R6 grep fails, the script is
  revised in Unit 1.2 itself — Phase 2 doesn't start until the script
  is clean. If Unit 1.6's cold-read gate fails, R11 cuts and Unit 1.2
  S04 VO is revised — cascade VO collapses to a tighter narration
  block. If Unit 1.7's music sourcing returns no candidates after 15
  auditions, generative fallback kicks in; BEAT-SHEET.md notes the
  fallback in the music-cue map.

- **State lifecycle risks:** BEAT-SHEET.md is the contract; once Briggsy
  signs off, downstream phases assume it's frozen. Late edits during
  Phase 2/3/4 require an explicit Phase 1 reopening + roadmap status
  update. Reflected in BEAT-SHEET.md preamble (status block).

- **Unchanged invariants:** BURNED game code untouched. The trailer
  project at `videos/trailer/` is isolated; nothing in BURNED's `src/`
  changes. BURNED's `pnpm-workspace.yaml` packages array unchanged
  (trailer project remains isolated per Phase 0 ADR #2). Phone bundle
  budget unaffected.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Narration script word count overshoots scene budget | Medium | Medium | Per-scene wps + word-count validation in Unit 1.2 Step 8; trim iteratively. |
| R6 grep returns matches in VO body | Low (translation-key applied) | High (kills R6) | Iterate on the script in Unit 1.2 until grep is clean before Phase 2 ships. |
| Cold-read gate for R11 fails | Medium | Medium | R11 cuts cleanly; cascade becomes purely visual; S04 VO collapses to a single bridge line. Cut-handling documented in Unit 1.6 Step 4. |
| Music sourcing returns no clean candidates | Medium | Medium | Generative fallback (Suno/Udio) documented in Unit 1.7 Step 4; rights-check before fallback fires. |
| HTP capture under-delivers visually in static PNG | Medium | Medium | Trace-video upgrade reserved as Phase 3 escalation (Unit 1.5 Step 6). |
| R5 cut, cold-open speaker re-selection | Low (covered by Phase 0 Unit 0.6 outcome) | Low (BEAT-SHEET.md reflects whichever speaker locked) | Per Unit 1.3 Step 1 outcome matrix. |
| Cascade VO timing doesn't line up with visual cues | Medium | Medium | Frame-accurate cue table in Unit 1.5 Step 2; Phase 4 verification via studio playback. |
| Stacked-payoff stamp slap competes visually with HTP hero overprint | Medium | High (R3 fail) | Unit 1.5 Step 5 — the stamp slap has a 16-frame harder slap with 1-frame settle; HTP hero held at 70% opacity during the stamp land; restored at frame 1995. Documented in cascade-composition.md. |
| Briggsy reads R4 as "82% short of 90%" and requests script-lengthening | Low | Low | Unit 1.3 Step 4 reserves the lever; S05 Dash VO can grow by 1–2 sentences if needed. |
| Late beat-sheet reopening during Phase 4 | Low | High | Per-Phase-1-exit roadmap update + BEAT-SHEET.md status freeze; reopens require explicit roadmap-level action. |
| Timing constants drift between BEAT-SHEET.md and `timing.ts` | Low | Medium | Unit 1.1 verification step ensures the test asserts the sum; Unit 1.4 transitions overlap scenes (don't add to runtime); cue tables reference `timing.ts` constants by name. |

---

## Open Questions

### Resolved During Planning

- **Scene count:** 6 (locked in Unit 1.1 Step 4).
- **VO-sync model:** continuous Dash narration over cascade, per-receipt
  pacing, single payoff-silence beat (locked in Unit 1.5 Step 4).
- **HTP rendering method:** clone of UMB's `capture-htp-scroll.ts`
  (locked in Unit 1.5 Step 6).
- **Typography system:** inherit BURNED's stack (Clash Display +
  General Sans + JetBrains Mono); locked in Unit 1.8 Step 1.
- **Transition vocabulary:** scoped library of 5 named transitions
  (locked in Unit 1.4 Step 1–2).
- **R15 chrome copy:** 4 instances locked (Unit 1.9).
- **Cascade spatial layout:** layered simultaneous (locked in
  Unit 1.5 Step 1).
- **Music source type:** royalty-free licensed (locked in Unit 1.7
  Step 1), generative fallback documented.
- **Briefing-room grammar:** inherit BURNED arena vocabulary (locked
  in Unit 1.10).

### Deferred to Implementation

- **Specific licensed track:** Phase 1 execution audits 10–15
  candidates and picks one. Title + URL + license documented in
  `music-sourcing.md`.
- **Specific HTP capture viewport** (exact dimensions, scroll-trigger
  delay tuning): Phase 3 execution dial-in.
- **Operative portraits visible in S03**: which 7 of 7 + Agent X
  treatment — depends on Imagen artwork availability. Phase 3
  curation pass.
- **Goofy-stats final wording**: Unit 1.6 cold-read gate may iterate
  on specific phrasing; the 4 slot picks are locked but the prose
  can tighten on review.
- **Stacked-payoff stamp typography exact size**: 38px is Phase 1
  draft; Phase 4 in-studio render may tune ±4px for visual weight.
- **Dash VO pacing per-line (wps)**: Phase 1 estimates; Phase 2 TTS
  output may produce slightly different runtime — Phase 1 budgets
  include ±5% tolerance; Phase 2 Phase-1 reconciliation step
  documented in Phase 2 plan.
- **R11-cut handling specifics**: if cold-read gate fails, Unit 1.2
  S04 VO collapses; the replacement bridge line drafted in
  `goofy-stats-list.md` cut-handling block needs Briggsy sign-off
  before Phase 2 starts.

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

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)

**UMB v3 precedents:**
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` (4440 frames / 30fps / 148s)
- Narrator prompts (scene-by-scene structure): `projects/undercover-mob-boss/scripts/narrator-prompts.ts`
- Cascade scene precedent: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx`
- HTP capture pattern: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Trailer composition: `projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx`

**BURNED assets consumed:**
- Card art: `public/assets/cards/` (17 unique webp — verified 2026-05-16)
- HTP app: `src/client/howtoplay/App.tsx`
- Dash voice DNA: `src/client/howtoplay/acts/ActRoster.tsx`, `ActArsenal.tsx`, `ActMission.tsx`, `ActIntercept.tsx`
- BURNED Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187`
- COMMS ticker idle lines: `src/client/board/DossierFeed.tsx:20-25`
- Existing arena vocabulary: `src/client/board/CaseBanner.tsx`, `DossierFeed.tsx`
- Verified stats source: `TODO.md` §1 (2026-05-16 squeaky)

**Music sourcing:**
- Artlist: https://artlist.io
- Musicbed: https://musicbed.com
- Suno commercial-use terms (fallback): https://suno.com/legal/terms-of-service
- Mid-century reference points: Bacharach, Mancini Pink Panther underscore, Brubeck Take Five

**Remotion documentation:**
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font
- TransitionSeries + fade: https://www.remotion.dev/docs/transitions/transitionseries
- Audio (new): https://www.remotion.dev/docs/media/audio

**Institutional learnings (memory):**
- `feedback-stats-single-source.md` — stat-source verification discipline
- `feedback-narrator-voice-direction.md` — line set must be raw quotable text, no embedded direction
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
- `feedback-imagen-budget.md` — one-test-image-first discipline (applies to music auditions too)
- `user_color_blind.md` — typography + position carry signal, never color alone
