---
title: "Origin Trailer — Phase 1: Beat Sheet Lock"
type: feat
phase: 1
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: 2026-05-17
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

  Plan: 1862 → 2728 lines after deepening.

  ===================================================================
  DOCUMENT-REVIEW PASS landed 2026-05-17 via 7-CE-persona parallel
  review (coherence / feasibility / product-lens / design-lens /
  security-lens / scope-guardian / adversarial-document-reviewer).
  83 raw findings → ~50 unique after dedup; mitigation pass below.
  Phase 0 precedent: 59 findings absorbed in same pattern.
  ===================================================================

  Product-level re-opens (Briggsy-decided live during synthesis):
  - R1: Cold-open candidate #5 PROMOTED over #4 ("Briggsy didn't
    write this one either. He's getting good at not writing them.")
    — carries explicit repeatability + autonomous-build claim;
    #4's "machine" double meaning was decode-fragile.
  - R2: Cascade content KEPT as locked (SDLC-translated engineering
    output). Loses water-beads tiebreaker BY DESIGN per brainstorm
    R3. Open Risk added — Phase 6 QA must screen against §2 with a
    critical engineering peer; if dominant reaction is "wow Claude
    built this" rather than "I want to play this game," cascade
    reopens at the roadmap level.
  - R3: R15 cold-decode STRENGTHENED via NEW R15 #5 closing card at
    frame 2835 ("DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS
    AGENTS." + 30%-opacity subhead "Briggsy didn't write this part
    either.") — survives trailer-in-isolation embedding + echoes
    promoted S01 line as bookend. R15 #1-#4 stay in-world diegetic.

  P0 mechanical fixes (review math broken in prior deepening pass):
  - Cascade payoff cue table — 16-word line at 1950 in 2.0s window
    = 8.0 wps, FIVE TIMES the declared 1.6-1.8 payoff ceiling. The
    deepening claimed this resolved; it wasn't. REWRITTEN: payoff
    collapses to 4-word truth-collision ("They WERE the operation.")
    fitting 60-frame window at 2.0 wps controlled-deadpan. The
    cascade items become the verbal antecedent of "they" — the
    visible cascade chrome at 30% IS the cascade-callback the old
    17-word line tried to verbalize. SHOWING beats TELLING.
  - Stat 4 source mismatch — "one in the basement" was Phase 1
    fiction; ActRoster.tsx:153-158 says Otto is "busy with the
    research budget." REWRITTEN to "One on the research budget"
    matching source. Risk-register "Resolved" claim retracted.
  - JetBrains Mono variable-axis range '100 800' → '100 900'
    (matches src/client/howtoplay/fonts-mono-htp.css:9 source).
  - Font copy path violated ADR #15 — fonts at videos/trailer/public/
    fonts/ would be UNREACHABLE to staticFile() during render.
    Fonts already at BURNED's public/fonts/; useFonts.ts reads
    through Phase 0 ADR #8 setPublicDir('../../public'). Copy step
    REMOVED.
  - Line schema in script.ts missing fields Phase 2 deepening
    declared it needs (expectedFrames, leadFramesHint, cueType,
    driftToleranceOverride, fadeInMs, fadeOutMs, skipSilenceremove).
    EXTENDED — Phase 1 ships the full Phase 2 consumption contract.
  - Per-line table mixed absolute + "S05-rel 240" / "S06-rel 30"
    relative frames with no type disambiguator. ADR #16 audio
    placement would misplace the scream from 2400 → 360. CONVERTED
    to absolute frames throughout; invariant added (every frame
    satisfies S{N}_START ≤ frame < S{N}_END).
  - S05/S06 trim policy contradicted tolerance band (Phase 4
    trim-to-target made S05_BUDGET_MIN/MAX_FRAMES decorative).
    LOCKED trim-to-target; MIN/MAX dropped as exported constants;
    band documented as Phase 5 prose constraint only.
  - S01 visual composition was entirely unspecified (Unit 1.10
    covered S02/S03/S06 only). S01 block ADDED to Unit 1.10 with
    composition, card-flash cadence, brass-hook timing, BURNED-logo
    treatment differential vs S06.
  - Phase 0 cadence-spec wps band claim — Phase 0 Unit 0.2 Step 0
    declares pitch/pace/articulation but NOT a numeric wps band.
    Phase 1 was citing a band that doesn't exist as a Phase 0
    output. REDECLARED as Phase-1-authored research-supported
    provisional defaults; Phase 2 first-batch validates.
  - Path D timing — Unit 1.3 (Voice Cast Lock) restructured to
    split Path-A/B/C-conditional locks (fire immediately on Phase
    0 exit) from Path-D-conditional locks (wait 1-3 weeks for
    actor delivery; Phase 2 voice pipeline can begin against the
    Path-A/B/C subset).

  P1 quality fixes:
  - Sterling-coded scream guardrail reframed — success criterion =
    Archer-aware listener feels "that's the Archer scream" (the
    joke is the recognition); no-attribution-claim in distribution
    copy. Guard against identity attribution, not against
    successful cadence recognition.
  - Phrasing! close rewritten — "Try not to embarrass me." → "...
    Phrasing." was unearned (no innuendo to call out). New S06
    close: "That's the briefing. Operation Pendleton is in your
    hands. Hold it tight." → "Phrasing." — "hold it tight" carries
    physical-double-meaning shape Phrasing! responds to. Also
    differentiates from S02's "Try not to embarrass me."
  - script.test.ts simplified — id-reference comment pattern
    (BEAT-SHEET.md embeds `<!-- @line: S04-payoff -->` markers,
    test asserts every Line.id appears exactly once by marker
    grep). Avoids Markdown-table-cell parser fragility +
    [BEAT NNNms] verbatim-match drift.
  - R6 grep verification ported to PowerShell-native (`rg ... |
    Select-String -Pattern 'Agent X' -NotMatch`) + $env:TEMP path
    (Briggsy's Windows host has no /tmp; default rg release on
    Windows lacks PCRE2).
  - Cold-read gate consensus threshold replaced with per-reviewer-
    floor ("≥2 of 3 reviewers each score ≥1 on the same pairing"
    — old threshold passed with N=1 zealous reviewer).
  - Side-band-right coordinates SPECIFIED — and decay destination
    moved INSIDE safe-square (mobile-X autoplay would otherwise
    crop the accumulating chrome off-screen, losing the cascade's
    rising-action reading).
  - Dossier-page wipe direction clarified (left-to-right reveal of
    destination — old clip-path math direction contradicted the
    "page peeling away rightward" diegetic framing).
  - S05 gameplay audio treatment SPECIFIED (level relative to 30%
    music bed; BURNED-draw-frame duck shape; edit policy).
  - Suno fallback HARDENED — catalog audition expanded (8-10
    finalists not 3); per-track marketplace ($30-$200) elevated
    to second-tier-before-Suno; music_disclosure_required: true
    flag added to BEAT-SHEET.md preamble for Phase 7 consumption
    if Suno fires.
  - Player-name scrub gap CLOSED — gameplay-markers.json contract
    extends with `player_names_scrubbed: boolean`; Phase 5 must
    either capture with synthetic test names OR obtain written
    consent from named players before Phase 6 finalizes render.
  - Briefing-room composition rule TIGHTENED — same ">2 elements
    at full visual weight" rule the cascade rewrite applied now
    applies to S02/S03/S06. S02 had 8 elements competing for 12s
    — same AI-slop trap the cascade was just rewritten to avoid.
  - Cascade meaning-stack vs visual-density DISAMBIGUATED. R3's
    "stack" is the audio-visual meaning-collision at frame 1950,
    not a visual-density frame. Phase 4 must not interpret
    "stack" as "load more pixels into one frame."
  - BEAT-SHEET.signoff sentinel ADDED per Phase 0 ADR #22
    pattern (machine-readable freeze gate; Phase 2 asserts
    sentinel existence before consuming script.ts).
  - P5 ("engine.test.ts, which feels redundant") FLAGGED R6-
    ineligible (raw filename = SDLC vocab) + removed from soft-
    fail backup list. R6 grep scope extended to scan visual stat
    caption text in cascade-composition.md, not just
    BURNED_TRAILER_LINES VO body.
  - Hat-count audit MOVED to Unit 1.6 Step 1 (pre-gate) — was
    Step 5 post-gate, which meant cold-read evaluated stat
    phrasing that might still rewrite.

  P2 polish:
  - CASE BANNER per-scene copy table ADDED (S02/S03/S06 each
    declare label, operation, sub, divider, footer text).
  - Dossier-interior content spec ADDED (clearance level token,
    visible field names, render owner).
  - S03 operative-portraits vs S04 card-art-halo reconciled (6
    operative portraits exit at S03→S04 dossier-wipe; halo cards
    are the 6 action cards that pair with the 4 locked stats).
  - Open Questions "Resolved During Planning" section TRIMMED
    (32 bullets restating Units → cross-references only). Saves
    ~50 lines; "Deferred to Implementation" + "New Open Questions
    Surfaced by Deepening" kept (they're action items).
  - Suno litigation procedural status STRIPPED (date-stale at
    execution time); ToS-derived obligations kept.

  P3 cleanup:
  - First-draft 37-word S02 scratchpad REMOVED (kept locked 28w).
  - Banned Transition List trimmed (architectural bans now live in
    Step 1, not duplicated in Step 5).
  - Remotion API URLs REMOVED from Sources (Phase 4 consults docs
    at execution time).
  - _archive directory exclusion noted in card-count citation.
  - 16-frame dossier-wipe perceptual threshold cited
    (emil-design-eng motion-shape vocabulary).
  - Citation-verification step ADDED to Unit 1.10 (grep over
    src/client/...:lines refs; documented in
    citation-verification.md).

  Plan: 2728 → ~3500 lines after document-review pass (1.28×).
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

### Per-cue words-per-second band (Phase-1-authored; Phase 2 validates)

**Provenance correction (DOCUMENT-REVIEW PASS):** the deepening draft
claimed the wps band came from Phase 0's `cadence-spec.md`. Phase 0
Unit 0.2 Step 0 declares pitch / pace / articulation / intonation /
mannerisms / volume dynamics — it does **NOT** declare a numeric wps
band. Phase 1 is the authoring layer for the bands; Phase 2's
first-batch TTS output is the validation gate.

Phase 1 plans against these **provisional research-supported defaults**:

- **Sustained narration (S02 briefing, S03 background):** 1.9–2.3 wps
- **List / stat reads (S04 cascade stat lines):** 2.4–2.6 wps (ceiling)
- **Declarative payoff lines (S04 stacked payoff, S06 close):** 1.6–2.0 wps
  *(payoff ceiling raised from 1.8 → 2.0 to fit a 4-word Sterling-deadpan
  "They WERE the operation." inside a 60-frame window without
  contradicting the cue table — see Unit 1.2 Step 5 doc-review rewrite)*

**Source basis (Phase-1-authored):**
- Sustained band derived from mid-Atlantic narration norms (Mancini-
  era spy-jazz underscore VO timing); declarative-payoff band derived
  from Sterling-CODED deliberate-pause cadence (slower than
  conversational baseline by ~30%).
- Phase 0 `cadence-spec.md` carries the qualitative register; Phase 1
  carries the quantitative budget. These are layered, not redundant.

**Per-cue wps validation is required at lock time** — every cue in the
S04 cascade table must have its wps computed and verified against the
band. If a cue exceeds the relevant ceiling, either the line shortens
or the cue window widens. This was a load-bearing gap in the first-
draft Phase 1 (several cues landed at 3.0–4.5 wps, infeasible for
Sterling-coded delivery). **DOC-REVIEW NOTE: the deepening pass
claimed the cascade payoff cue was resolved — it wasn't (16 words in
60 frames = 8.0 wps, 5× over ceiling). Rewritten in Step 5 below.**

**Phase 2 validation gate:** Phase 2 Unit 2.4 must compare each cue's
actual TTS-generated audio duration against this band. If any cue's
delivered wps falls outside the band, Phase 2 either (a) re-steers
the engine with cadenceAdapter overrides, (b) re-times the cue
window via Phase 4 hand-off note, or (c) escalates to Phase 1 reopen
for line-trim. Bands are firm-but-not-frozen until Phase 2 confirms.

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

**Step 0 — Phase 0 scaffold prerequisite (DOC-REVIEW FEASIBILITY
GATE).** Before Phase 1 begins, verify Phase 0 Unit 0.1 scaffold
output exists. Run:

```powershell
Test-Path videos/trailer/src/Root.tsx                  # must be $true
Test-Path videos/trailer/package.json                  # must be $true
Test-Path videos/trailer/remotion.config.ts            # must be $true
Test-Path docs/plans/origin-trailer/PHASE-0-EXIT.md    # must be $true
Test-Path docs/plans/origin-trailer/PHASE-0-EXIT.signoff # ADR #22 sentinel
# Run typecheck inside trailer subproject:
Set-Location videos/trailer; pnpm typecheck; Set-Location ../..
```

If any check fails, Phase 1 BLOCKS — Phase 0 Unit 0.1 scaffold
must complete first. Was implicit dependency in prior draft; the
feasibility review surfaced that `videos/trailer/` doesn't exist
in the working tree at Phase 1 lock time and the unconditional
write to that path would fail.

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
// the 4-word truth-collision "They WERE the operation." VO completes
// at PAYOFF_VO_END_FRAME. 1.0s visual hold + music-bed-only after
// VO ends. Hard cut to S05 gameplay at S04_END (frame 2040). NO
// cross-dissolve — see Unit 1.4 deepening lock.
// DOC-REVIEW (2026-05-17): payoff line collapsed from 17+5-word
// split to single 4-word truth-collision. 60-frame window at 2.0
// wps controlled-deadpan fits cleanly. Cascade chrome at 30% IS
// the visual antecedent of "they"; SHOWING beats TELLING.
export const STACKED_PAYOFF_FRAME = 1950;
export const PAYOFF_VO_END_FRAME = 2010;   // 60 frames / 2.0s for 4 words at 2.0 wps controlled-deadpan
export const PAYOFF_HOLD_FRAMES = 30;      // 1.0s silent visual hold after VO ends
// Music duck pre-anticipated: starts at PAYOFF_VO_END_FRAME - 30 = 1980,
// completes at PAYOFF_VO_END_FRAME (2010), so duck lands as VO ends.
export const PAYOFF_MUSIC_DUCK_START_FRAME = PAYOFF_VO_END_FRAME - 30; // 1980
export const PAYOFF_MUSIC_DUCK_END_FRAME = PAYOFF_VO_END_FRAME;       // 2010
// Hard cut to gameplay at S04_END = PAYOFF_VO_END_FRAME + PAYOFF_HOLD_FRAMES = 2040 ✓

// === S05 budget ===
// Phase 5 captures ≥30s of raw gameplay containing at least one
// BURNED-card-draw moment. Phase 4 ALWAYS trims to S05_BUDGET_TARGET_
// FRAMES (540 frames / 18s); S05_END is invariant. The "tolerance
// band" 14-22s applies only to Phase 5's RAW capture (capture must
// contain enough lead-in/tail for trim flexibility), NOT to the
// trailer's S05 scene length.
// DOC-REVIEW (2026-05-17): S05_BUDGET_MIN/MAX_FRAMES were exported
// constants implying Phase 4 trim-to-captured-length. They contradicted
// the TOTAL_FRAMES = 2850 invariant. Removed. Tolerance band lives in
// Phase 5 plan prose only.
export const S05_BUDGET_TARGET_FRAMES = 540; // 18.0s — Phase 4 always trims to this

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
- **Edge case:** `S05_BUDGET_TARGET_FRAMES === 540` (Phase 4 trim
  target locked; tolerance band lives in Phase 5 capture stage only
  per doc-review fix).
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
  Phase 2.** Typed `readonly Line[]` const export (EXTENDED per
  document-review feasibility fix — Phase 2 deepening declared these
  fields as required consumption surface; the previous Line shape
  forced Phase 2 to silently extend the contract or block on a
  Phase 1 amendment):
  ```ts
  export type CueType =
    | 'sustained'   // briefing / background narration; 1.9-2.3 wps
    | 'list'        // cascade stats; 2.4-2.6 wps ceiling
    | 'payoff'      // declarative truth-collision; 1.6-2.0 wps
    | 'cold-open'   // S01 establishing cue
    | 'scream';     // S05-scream Sterling-CODED volume-discontinuous

  export type Line = {
    readonly id: string;          // e.g., 'S04-payoff'
    readonly scene: 'S01'|'S02'|'S03'|'S04'|'S05'|'S06';
    readonly frame: number;       // ABSOLUTE composition frame (NOT scene-relative)
    readonly voice: 'dash'|'sable'|'janet'|'vera';
    readonly text: string;        // verbatim, no embedded direction

    // Cue-type drives Phase 2's per-engine fade/silenceremove behavior
    // and Phase 6's QA tolerance band selection.
    readonly cueType: CueType;

    // Phase 2 computes expectedFrames at TTS generation time; Phase 1
    // ships the budgeted target so the drift gate has a reference.
    readonly expectedFrames: number;

    // Phase 4 places <Audio> at <Sequence from={frame - leadFramesHint}>
    // per ADR #16 composition-level audio placement. Phase 1 sets the
    // perceptual-sync hint per cue (default 0; payoff cues use 2;
    // scream uses 1).
    readonly leadFramesHint: number;

    // Per-cue tolerance override; falls back to cueType band when
    // omitted. Sustained ±5% / list ±7% / payoff ±4% / scream ±20%.
    readonly driftToleranceOverride?: number;

    // Per-cue fade-in/fade-out shape overrides (defaults 30ms/30ms
    // for sustained; payoff = 5ms in / 30ms out; phrasing = 30ms in /
    // 50ms out + qsin curve; scream = 0ms in / 30ms out).
    readonly fadeInMs?: number;
    readonly fadeOutMs?: number;

    // Scream cue (frame 2400) must preserve full attack envelope —
    // FFmpeg silenceremove would clip the volume-discontinuous onset.
    readonly skipSilenceremove?: boolean;

    readonly cadenceAdapter?: {  // optional per-engine annotations
      readonly engine: 'elevenlabs-v3'|'gemini-tts'|'openai-tts'|'voice-actor';
      readonly prefixTag?: string;  // e.g., '[shouts]' (ElevenLabs v3 ONLY; SELF-CLOSING tag) or '[mood: shouting]' (Gemini)
      readonly notes?: string;      // free-text director notes
    };
  };

  export const BURNED_TRAILER_LINES: readonly Line[] = [/* ... */] as const;
  ```
  Mirrors UMB v3 `narrator-prompts.ts` `TRAILER_V3_PROMPTS` precedent
  (lines 648–685). Phase 2 imports this; BEAT-SHEET.md is the human
  contract; `script.ts` is the machine contract.

  **Frame absolute-only invariant (DOC-REVIEW FEASIBILITY FIX):**
  every `Line.frame` is an absolute composition frame (0 ≤ frame <
  TOTAL_FRAMES). NO scene-relative encoding. `script.test.ts`
  asserts `frame >= S{N}_START && frame < S{N}_END` for the
  declared scene N. The previous draft mixed absolute frames (60,
  240, 600...) with relative (`S05-rel 240`, `S06-rel 30`) which
  would have caused Phase 4's `<Audio from={frame}>` to misplace
  the scream from frame 2400 to frame 360 (mid-roster S03).
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

Speaker: cold-open speaker per Phase 0 Unit 0.3 outcome. **Candidate
#5 LOCKED via document-review re-open (2026-05-17):**

> *"Briggsy didn't write this one either. He's getting good at not
> writing them."*

**Why #5 over #4 (doc-review product-lens re-open):** Candidate #4
("He's a machine, this kid…") relied on "machine" as the engineering-
peer hook — a decode-fragile double meaning a no-context viewer hears
as "this kid grinds." #4 also dropped "AGAIN" — the repeatability
claim that's the central engineering bet per roadmap §1 ("the
bar-raise is the repeat itself"). Candidate #5 carries the
repeatability claim AND the autonomous-build claim explicitly in one
line, with direct UMB v3 callback via "this one either." The
"didn't write" decode mechanic is verbatim, not metaphorical —
satisfies Phase 0 Unit 0.3 R14 decode-gate criterion ("at least one
of two testers surfaces 'AI / agent / autonomous / built itself'
unprompted within first 30 seconds"). Briggsy ratified the swap
during doc-review synthesis.

**Word count:** 13 words. At ~2.5 wps (deadpan pace), ≈ 5.2s. Leaves
~1.8s of scene runtime for the BURNED logo land + brass hook + R15 #1
stamp without spoken audio overlap.

**S06 closing-card bookend:** the new R15 #5 closing card at frame
2835 carries the 30%-opacity subhead *"Briggsy didn't write this part
either."* — explicit echo of the S01 line, bookending the trailer
with the autonomous-build claim. See Unit 1.9 Step 1 + Unit 1.10 S06.

**Step 3 — Briefing Setup (S02, frames 210–570, ~12.0s).**

Speaker: Dash. Sterling-coded cadence (deadpan, deliberate, mid-Atlantic
clip). Pacing target: ~2.4 wps for briefing-room formality (slower than
S01's casual debrief).

> *"Good morning. The agency has decided you can be trusted with
> Operation Pendleton. Code-name in the field: BURNED. Pull up a
> chair. Try not to embarrass me."*

**Word count:** 28 words. At ~2.4 wps ≈ 11.7s. Fits with a ~0.3s
buffer for the venetian-blind shadow establishing shot at scene head
before the line drops.

*(Doc-review scope-guardian: previous draft's 37-word scratchpad
removed; only the locked 28-word delivery shown here.)*

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

**DOC-REVIEW REWRITE (2026-05-17 — math was still broken after the
deepening).** The deepening pass claimed per-cue wps was resolved.
It wasn't: the payoff cue at frame 1950 held a 16-word line in a
60-frame (2.0s) window = **8.0 wps**, five times the declared 1.6-1.8
payoff ceiling. The cue at 2010 added a second VO row claiming "5w
in 1.0s = 1.67 wps" while the next row simultaneously declared
"2010-2040 = silent visual hold, no VO" — internal contradiction.

The fix: **collapse the payoff to a single 4-word truth-collision.**
The cascade items remain visible in chrome at 30% opacity at frame
1950 — they ARE the verbal antecedent of "they." Sterling-CODED
delivery is deadpan-short, not multi-clause; the previous 16-word
explanation was telling-not-showing. The visual cascade IS the
cascade-callback the old line tried to verbalize.

Structure (frame-accurate timing in BEAT-SHEET.md table):

| Cue frame | Window (s) | Visual | VO line (words) | wps |
|-----------|-----------|--------|-----------------|-----|
| 1050 | 2.0s | HTP dossier slides into hero position (Playwright capture) | *"Operational planning."* (2 w) | 1.0 |
| 1110 | 3.0s | HTP scroll begins (top portion) | *"Fourteen thousand pages of forensic dossiers."* (7 w) | 2.3 |
| 1200 | 3.0s | HTP scroll continues (middle portion) | *"Drafted on weekends, by a field asset who, for compliance reasons, is not named."* (15 w) | 2.5 |
| 1290 | 4.0s | Stat 1 caption enters safe-square center-bottom at full weight | *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* (9 w) | 2.25 |
| 1410 | 5.0s | Stat 1 decays to chrome side-band; Stat 2 enters safe-square center-bottom | *"Six of them, deliberately unrehearsed — the 'memorable ones.'"* (10 w) | 2.0 |
| 1560 | 4.0s | Stat 2 decays to chrome; Stat 3 enters safe-square center-bottom | *"Seventeen asset illustrations. Two of them with hats."* (8 w) | 2.0 |
| 1680 | 6.0s | Stat 3 decays to chrome; Stat 4 enters safe-square center-bottom | *"Seven on the roster. Six in the deck. One on the research budget. Don't ask."* (15 w) | 2.5 |
| 1860 | 3.0s | Cascade peak — comms-ticker brightens to held-bright state; HTP hero + accumulated halo (40%) + bright ticker; **no VO** | — | — |
| **1950** | 2.0s | **Stacked payoff stamp slaps onto HTP hero overprint (heavy slap, 16 frames). HTP hero drops to 50% opacity. Cascade chrome (4 stats at 30% side-band, halo at 40%, bright ticker) IS the visual antecedent of "they." Dash VO delivers the 4-word truth-collision.** | *"They WERE the operation."* (4 w) | **2.0** (controlled-deadpan; sits at the doc-review-revised payoff ceiling) |
| **1980** | (within prior cue) | Music duck pre-anticipated ramp begins (90% → 30% over 30 frames, completes at 2010 as VO ends) | (VO continues) | — |
| 2010–2040 | 1.0s | **Silent visual hold: HTP hero + stamp + halo + 4 stats in chrome all static. Music at bed-only level (30%). No VO. The meaning-collision lands in the silence after the line, not in a second cue.** | — | — |
| 2040 | — | **Hard cut to S05 gameplay.** | — | — |

**Word count: 76 words across cascade VO** (was 89 pre-rewrite —
removed 13-word redundant cascade-callback verbal cue at 1950 ;
Stat 4 lost 1 word with the source-fixed reframe). At per-cue wps
validated ≤2.6 ceiling, all cues fit their windows. Total S04 VO
clock: 30.5s of speech + 1.0s payoff hold + 1.5s no-VO peak hold
1860-1950 = 33.0s. Fits scene budget exactly.

**Roster reframe (Stat 4, frame 1680) — DOC-REVIEW SOURCE FIX.**
Previous draft locked *"Seven operatives on the roster. Six in the
deck, one in the basement. Don't ask."* — the "in the basement"
phrasing was Phase 1 fiction, not source-grounded. The Phase 1
deepening claimed this "matches the dossier viewers can freeze-
frame" but `ActRoster.tsx:153-158` actually says Otto is *"busy
with the (unsanctioned, off-books, almost certainly illegal)
research budget."* No basement appears in the source. New phrasing:
*"Seven on the roster. Six in the deck. One on the research budget.
Don't ask."* — matches the dossier line viewers can freeze-frame
exactly while preserving the comedy (the "Don't ask." is the
deadpan glaze on the off-books research-budget reveal). The
risk-register row claiming this was Resolved is now retracted —
see Risks section below.

**Meaning-stack disambiguation (DOC-REVIEW).** R3's "stacked
payoff" refers to the **audio-visual meaning-collision** at frame
1950 (the cascade items shown in chrome visually + Dash saying
"They WERE the operation" verbally = the receipts ARE the
operation). It is **NOT** a visual-density stack (a frame where
many elements peak). Only the stamp + HTP-50% + cascade-chrome
combination matters; Phase 4 must not interpret "stack" as "load
more pixels into the 1950 frame."

**Step 6 — Gameplay Dissolve (S05, frames 2040–2580 fixed at
trim-to-target; tolerance band 14–22s applies to Phase 5 raw
capture only — Phase 4 ALWAYS trims to the 18s target).**

**Trim policy LOCKED (doc-review fix):** Phase 4 ALWAYS trims
captured gameplay to the 18s target (540 frames). The 14-22s
tolerance band applies to Phase 5's raw `gameplay-raw.mp4` (the
capture must contain at least one BURNED-card-draw moment plus
enough lead-in/tail for trim flexibility). The band does NOT apply
to Phase 4's composition output — `S05_END = 2580` is invariant,
asserted in `timing.test.ts`. The previous draft had `S05_BUDGET_
MIN/MAX_FRAMES` exported as constants implying runtime variance;
removed in timing.ts (see Unit 1.1 Step 2 doc-review edit).

**Hard cut in from S04** (replaces former cross-dissolve, see Unit
1.4 deepening lock). Real gameplay plays for 18s at scene-time with
sparse Dash VO; iris-wipe overlay component begins at frame 2535
(`S05_END - 45`).

Visual: hard cut to phone-controller + TV-shared-screen gameplay
capture (Phase 5 deliverable). R15 chrome layer floats: comms ticker
reads "OPERATIVE [REDACTED] — METHOD REPEATABLE" at frame 2200
(target ~5.3s into the scene).

**Phase 5 contract (LOCKED by Phase 1, consumed by Phase 4):**

Phase 5 ships `gameplay-raw.mp4` (≥30s playthrough containing at
least one BURNED-card-draw moment) AND `gameplay-markers.json`
declaring:

```ts
type GameplayMarkers = {
  readonly inPoint: number;              // frame in raw capture where Phase 4 starts trim
  readonly burnedDrawFrame: number;      // frame in raw capture of BURNED-card draw moment
  readonly player_names_scrubbed: boolean; // see scrub policy below
  readonly capture_resolution: '1920x1080' | '1080x1920'; // landscape only for trailer
  readonly source_seat_count: number;    // 2 minimum (phone + board)
};
```

Phase 4 trims with `<OffthreadVideo startFrom={inPoint}
endAt={inPoint + 540}>` so the BURNED draw lands at scene-relative
frame 160 (absolute frame 2200; matches the R15 #2 ticker pulse).
Trim ownership = Phase 4 composition; capture + marker shipping =
Phase 5.

**Player-name scrub policy (DOC-REVIEW SECURITY FIX — new gate).**
Real gameplay captures show player-chosen names + room codes on
phone + board surfaces at 1080p. Those identifiers would be frozen
into the publicly distributed MP4. Phase 5 MUST either:

- (a) Capture with synthetic test names only — `AGENT_A`, `AGENT_B`,
  `AGENT_C`, `AGENT_D` (matches Pendleton diegetic frame; preferred
  default), OR
- (b) Obtain explicit written consent from every named player
  before Phase 6 finalizes the render (filed in
  `videos/trailer/sample-eval/beat-sheet/player-consent.md`).

`gameplay-markers.json` MUST set `player_names_scrubbed: true` for
path (a) OR include `consent_records: ConsentRecord[]` field for
path (b). Phase 4 hard-fails the build if both are missing.

**Gameplay audio treatment (DOC-REVIEW DESIGN-LENS FIX).**

- **Diegetic gameplay audio level:** -12 dBFS RMS normalized
  (Phase 5 ships pre-normalized audio in capture).
- **Music bed under gameplay:** holds at 30% (per Unit 1.7 Step 5
  music-cue map row "2040–2535").
- **BURNED-card-draw moment** (frame 2200): music ducks to 15%
  for 15 frames around the draw event (`ramp(8 frames in / hold
  6 frames / ramp 8 frames out`), then returns to 30%. This is the
  natural editorial beat — the audio focuses on the gameplay
  reaction at the draw moment.
- **Edit policy on raw capture audio:** Phase 4 keeps the raw
  gameplay audio (board ambient + phone-tap SFX + occasional player
  laugh) UNEDITED beyond the level normalization. The "rough live
  authentic" reading is intentional — trying to clean it up would
  collapse the trailer's gameplay scene back into produced-feel.
- **VERAAA!!! scream cue overlap:** when R5 fires, the scream VO
  is mixed at +6dB over the gameplay audio bed (the scream IS the
  focal element at that beat; gameplay audio recedes to texture).

VO (sparse):

| Cue frame (absolute) | VO line |
|---------------------|---------|
| 2040 | (gameplay sound dominates; no Dash) |
| 2280 | *"And — between you and me — they appear to be enjoying it."* (12 w in 5.0s = 2.4 wps) |
| 2400 | **Scream beat (R5 contingent):** in-game BURNED card draws on capture → Dash VO interjects *"VERAAA!!!"* in **Sterling-CODED volume-discontinuous register per Phase 0 Unit 0.6 cadence-spec.** Success criterion: an Archer-aware listener hears it as "that's the Archer scream" recognition — that recognition IS the joke. ADR #13 guards against IDENTITY ATTRIBUTION (don't credit / characterize / claim it's Benjamin in distribution copy), NOT against successful cadence recognition. If R5 cut, this beat is silent or replaced with a chuckle SFX from the gameplay capture. |
| 2535 | (silence; iris-wipe overlay begins) |

Word count: ~12 words of Dash VO across S05. ~5s total speech vs
18s scene budget = the gameplay AUDIO carries the scene; Dash
sparse on top.

**Step 7 — Closing Directive (S06, frames 2580–2850, ~9.0s).**

Speaker: Dash. Final scene returns to briefing-room frame; venetian-
blind shadows reestablish. BURNED logo final treatment lands at
frame 2780 (10 frames earlier than first-draft 2790 — gives logo
40 frames of breathing room before R15 stamps). R15 #4 closing
stamp ("OPERATION STATUS: FIELD-READY" — status grammar per Unit
1.9 deepening) slaps onto the logo card at frame 2820. **R15 #5
cold-decode closing card slaps at frame 2835** (NEW per
document-review pass — see Unit 1.9 Step 1 + Unit 1.10 S06).

> *"That's the briefing. Operation Pendleton is in your hands.
> Hold it tight."*
>
> [BEAT 0.4s]
>
> *"Phrasing."*

**Phrasing! earned (DOC-REVIEW PRODUCT-LENS FIX).** Previous draft
landed *"Try not to embarrass me."* → *"…Phrasing."* — but the
preceding line had no innuendo to call out, so Phrasing! read as
fan-service-callout rather than earned-beat. Spec §3.5 says
Phrasing! lands when the prior line carries inadvertent double
meaning. The new close substitutes *"Hold it tight."* — physical-
action ambiguity that the Phrasing! response actually picks up on.
**Bonus fix:** also differentiates from S02's *"Try not to embarrass
me."* (the doubled line was a P3 doc-review finding — bookend was
unintentional, so the duplicate was a tell of word-budget pressure
rather than craft).

Word count: 14 words + Phrasing. At ~1.9 wps (slowest pace — Dash
delivers the close with maximum deliberateness) ≈ 7.4s + 0.4s beat +
0.4s on Phrasing + 0.8s music-final-sting tail = 9.0s. Fits.

**Step 8 — Total word count + runtime validation (post-document-review).**

Word counts recomputed against actual lines after doc-review-pass
rewrites (cold-open #5 promotion, S04 payoff collapse, S06 close
rewrite). Run `pnpm test` against `script.test.ts` to verify these
remain in sync with `BURNED_TRAILER_LINES`.

| Scene | Words | Mean wps | Speech estimate | Scene budget | Buffer | Notes |
|-------|-------|----------|-----------------|--------------|--------|-------|
| S01 | 13 | 2.5 | 5.2s | 7.0s | 1.8s | Cold-open #5; brass hook + stamp at scene head |
| S02 | 28 | 2.4 | 11.7s | 12.0s | +0.3s | Ellipsis pauses (Step 3) give headroom; deadpan pace |
| S03 | 65 | 2.4 | 14.0s + 1.0s mid-beat = 15.0s | 16.0s | +1.0s | Ellipsis pauses inserted after "...last quarter." + "...all classified." |
| S04 | 76 | 2.3 (mean; cue-validated ≤2.6) | 30.5s VO + 1.0s payoff hold + 1.5s no-VO peak hold = 33.0s | 33.0s | 0.0s | Per-cue wps validated in Step 5 table; payoff collapsed to 4-word truth-collision per doc-review |
| S05 | 12 | 2.4 | 5.0s | 18.0s (trim-to-target) | gameplay audio fills | Tolerance band documented at Phase 5 capture stage only; Phase 4 always trims to 540 frames |
| S06 | 14 + Phrasing | 1.9 (deliberate close) | 7.4s + 0.4s beat + 0.4s Phrasing + 0.8s tail = 9.0s | 9.0s | 0.0s | Phrasing! earned via "hold it tight" innuendo; differentiates from S02 |
| **Total** | **209** | **2.30 mean** | — | **95.0s** | within ±0.5s | — |

**S06 buffer note (doc-review trim-policy fix):** S06_START is
fixed at 2580 because Phase 4 ALWAYS trims S05 to the 540-frame
target. The previous draft's "S06 absorbs S05 overrun" framing is
removed — that contradicted the `TOTAL_FRAMES = 2850` invariant and
implied an S05 tolerance-band consumer that doesn't exist.

**Word-count verification gate:** Phase 1 ships
`sample-eval/beat-sheet/script-word-count.md` documenting the
mechanical `wc -w` per-line + per-scene + total. If the table here
drifts from the actual lines, `script.test.ts` catches it (Phase 2
won't generate against drifted budgets).

**Step 9 — R6 grep verification (DOC-REVIEW PORTED TO POWERSHELL +
SCOPE EXTENDED).** **POSIX ERE has no negative lookahead** — the
original `grep -iE '...|agent(?!\s+X)|...'` regex quietly mismatches
everything containing the pattern. `grep -P` fails on Briggsy's
Windows shell. The default Windows ripgrep release does NOT ship
with PCRE2 (it's a separate `ripgrep-pcre2` build); `rg --pcre2`
returns *"PCRE2 is not available in this build of ripgrep"* on
unbuilt installations. The doc-review-corrected approach uses
**PowerShell-native 2-pass** (works on Briggsy's host without
requiring a PCRE2 ripgrep build):

```powershell
# 2-pass approach (PowerShell-native, no /tmp, no grep dependency):
# Pass 1: catch all SDLC vocab including the expanded tells.
$hits = rg -i --no-line-number `
  '\b(code|tests?|deploy(s|ment)?|commit(s)?|spec(s|ification)?|agent|agents|LLM|Claude|AI|model|prompt|chat|github|repo|build|sprint(s)?|backlog|ticket(s)?|issue(s)?|PR|merge|pipeline|microservice(s)?|frontend|backend|API|REST|GraphQL|schema)\b' `
  videos/trailer/src/lib/script.ts

# Pass 2: filter out the in-character "Agent X" hits.
$hits | Select-String -Pattern 'Agent X' -NotMatch | Out-File -FilePath "$env:TEMP\r6-hits.txt"

# If ripgrep-pcre2 IS installed (verify with: rg --version | Select-String 'pcre2'):
rg --pcre2 -i `
  '\b(code|tests?|deploy(s|ment)?|commit(s)?|spec(s|ification)?|agent(?!\s+X)|agents|LLM|Claude|AI|model|prompt|chat|github|repo|build|sprint(s)?|backlog|ticket(s)?|issue(s)?|PR|merge|pipeline|microservice(s)?|frontend|backend|API|REST|GraphQL|schema)\b' `
  videos/trailer/src/lib/script.ts
```

**Vocabulary list — 25 terms ORGANIZED BY CATEGORY (DOC-REVIEW
SCOPE-GUARDIAN PRINCIPLE FIX).** The brainstorm named 11 vocabulary
*categories*. The deepening expanded to 25 specific *terms* without
documenting the category-to-term derivation, leaving future
maintainers no rule for extension. The categories + their term lists:

| Category | Terms blocked |
|----------|---------------|
| **Code/source** | code, source, implementation |
| **Tests** | tests, test, testing |
| **Deploy/ship** | deploy, deployment, deploys, ship, shipping |
| **Version control** | commit, commits, merge, PR, github, repo |
| **Specs/docs** | spec, specs, specification |
| **AI vocab** | agent (excluding "Agent X"), agents, LLM, Claude, AI, model, prompt, chat |
| **Build/CI** | build, pipeline |
| **Project management** | sprint, backlog, ticket, issue |
| **Architecture vocab** | microservice, frontend, backend, API, REST, GraphQL, schema |

Future extensions: add terms only when (a) they fit an existing
category AND (b) a drafted line is found to leak them. Don't pre-
emptively add Kubernetes / Docker / CICD — the gate guards against
*observed drift*, not against the entire SDLC dictionary.

**Scope extension (DOC-REVIEW SECURITY-LENS FIX):** the grep also
runs against `videos/trailer/sample-eval/beat-sheet/cascade-
composition.md` (visual stat caption text), not just
`BURNED_TRAILER_LINES[*].text`. The previous draft's R6 gate only
covered VO; a stat caption swapped from the pool (e.g., the soft-
fail backup P5 *"engine.test.ts, which feels redundant"*) would
ship a raw SDLC filename to screen unflagged. The pool entry P5
is now annotated **R6-INELIGIBLE** in Unit 1.6 Step 1; removed from
the soft-fail backup list.

Phase 2 voice pipeline runs this gate against `BURNED_TRAILER_LINES
[*].text` (machine contract). Phase 3/4 scene-build runs the
expanded gate against `cascade-composition.md` visual caption text
before any caption can lock for asset prep.

Expected: zero matches inside both scopes. Document the grep result
in `sample-eval/beat-sheet/script-grep-r6.md`, including the literal
PowerShell commands run + their output.

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

**Step 2 — Per-line table (DOC-REVIEW REVISED — absolute frames
throughout, payoff collapsed, Stat 4 source-fixed, cold-open #5
locked, S06 close rewritten for earned Phrasing!).** Mirrors
`BURNED_TRAILER_LINES` machine contract in `script.ts`; both are
kept in sync via `script.test.ts`. **All frames are ABSOLUTE
composition frames** (was mixed absolute + S05-rel / S06-rel in
prior draft — feasibility found this would misplace audio per
ADR #16).

| id | Scene | Frame (abs) | Voice | Line | cueType | expectedFrames | leadFramesHint | cadenceAdapter notes |
|---|---|---|---|---|---|---|---|---|
| S01-coldopen | S01 | 60 | Cold-open speaker | "Briggsy didn't write this one either. He's getting good at not writing them." | cold-open | 156 | 0 | Brass hook lands at frame 0; line drops at frame 60 (2.0s in). 13 w at 2.5 wps ≈ 5.2s = 156 frames |
| S02-greeting | S02 | 240 | Dash | "Good morning. The agency has decided you can be trusted with Operation Pendleton. Code-name in the field: BURNED. Pull up a chair. Try not to embarrass me." | sustained | 351 | 0 | Venetian-blind establishing 0.5s before line. 28w at 2.4 wps ≈ 11.7s |
| S03-roster | S03 | 600 | Dash | "Our autonomous field assets infiltrated the contract last quarter. Seven operatives in the active roster. Six expense reports, all classified. One field agent who insists on being called 'Agent X' and refuses to file any paperwork whatsoever." | sustained | 408 | 0 | Dossier-page settle at frame 570; 3 internal `[BEAT 0.3s]` pauses |
| S03-mission | S03 | 870 | Dash | "Mission: a deck of one hundred and twenty operations. One of them ends your career instantly. The rest exist to help you survive it. Or to ensure your colleagues don't." | sustained | 405 | 0 | After 1.0s mid-scene dossier-page beat; 3 internal `[BEAT 0.3s]/[BEAT 0.4s]` |
| S04-open | S04 | 1050 | Dash | "Operational planning." | list | 60 | 0 | Cascade opens (2-word ledge) |
| S04-htp-1 | S04 | 1110 | Dash | "Fourteen thousand pages of forensic dossiers." | list | 90 | 0 | HTP scroll begins (top portion) |
| S04-htp-2 | S04 | 1200 | Dash | "Drafted on weekends, by a field asset who, for compliance reasons, is not named." | list | 90 | 0 | HTP scroll continues (middle portion) |
| S04-stat-1 | S04 | 1290 | Dash | "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." | list | 120 | 0 | Stat 1 caption enters safe-square center-bottom |
| S04-stat-2 | S04 | 1410 | Dash | "Six of them, deliberately unrehearsed — the 'memorable ones.'" | list | 150 | 0 | Stat 1 decays to chrome; Stat 2 enters |
| S04-stat-3 | S04 | 1560 | Dash | "Seventeen asset illustrations. Two of them with hats." | list | 120 | 0 | Stat 2 decays to chrome; Stat 3 enters. Stat 3 phrasing/hat-count audit completes at Unit 1.6 Step 1 BEFORE cold-read gate (was Step 5 post-gate; doc-review reorder) |
| S04-stat-4 | S04 | 1680 | Dash | "Seven on the roster. Six in the deck. One on the research budget. Don't ask." | list | 180 | 0 | Stat 3 decays to chrome; Stat 4 enters. **Source-fixed (DOC-REVIEW): "one on the research budget" matches `ActRoster.tsx:153-158` exactly; previous "in the basement" was Phase 1 fiction** |
| **S04-payoff** | S04 | **1950** | Dash | **"They WERE the operation."** | **payoff** | **60** | **2** | **R3 truth-collision (DOC-REVIEW COLLAPSED to 4 words from prior 17+5 split that was 5× over wps ceiling). Stamp slaps heavy 16 frames; HTP hero drops to 50%; cascade chrome (4 stats at 30%, halo at 40%) IS visual antecedent of "they." 4 w at 2.0 wps controlled-deadpan = 2.0s. Lead-frames hint 2 frames for perceptual A/V sync** |
| S05-pleasure | S05 | 2280 | Dash | "And — between you and me — they appear to be enjoying it." | sustained | 150 | 0 | Sparse over gameplay. (Was "S05-rel 240" → absolute 2040+240=2280) |
| S05-scream | S05 | 2400 | Dash | "VERAAA!!!" | scream | 27 | 1 | R5 contingent; cadenceAdapter prefixTag `[shouts]` (ElevenLabs v3 — SELF-CLOSING) or `[mood: shouting]` (Gemini). Sterling-CODED volume-discontinuous register per Phase 0 Unit 0.6. **Success criterion = Archer-aware listener identity recognition (the joke).** ADR #13 guards distribution attribution, NOT cadence recognition. `skipSilenceremove: true` preserves scream attack envelope; `fadeInMs: 0`. (Was "S05-rel 360" → absolute 2040+360=2400) |
| S06-close | S06 | 2610 | Dash | "That's the briefing. Operation Pendleton is in your hands. Hold it tight." | sustained | 222 | 0 | Final scene; 1.9 wps deliberate close. **Rewritten (DOC-REVIEW) — "Hold it tight" carries innuendo shape Phrasing! actually responds to + differentiates from S02 "Try not to embarrass me"** (Was "S06-rel 30" → absolute 2580+30=2610) |
| S06-phrasing | S06 | 2790 | Dash | "Phrasing." | payoff | 27 | 0 | After 0.4s beat. `fadeInMs: 30`, `fadeOutMs: 50` with qsin curve. (Was "S06-rel 210" → absolute 2580+210=2790) |

**Frame-encoding invariant (DOC-REVIEW):** `script.test.ts` asserts
`Line.frame >= S{N}_START && Line.frame < S{N}_END` for the declared
scene N, AND `0 <= Line.frame < TOTAL_FRAMES`. Catches both mis-
encoded relative frames AND any line that drifts past its scene
boundary.

**Step 3 — Engine per voice cell.**

- **Dash lines + scream**: engine + voice preset that cleared R4 Path
  (A/B/C) — per Phase 0 Unit 0.2 results. Cadence steering = the
  Step 0 cadence-spec.md from Phase 0.
- **Cold-open speaker (1 line)**: engine + voice preset matching
  whichever character (Vera/Sable/Janet) cleared R14 cadence-match.
  Per Phase 0 Unit 0.3 results.

**Step 3a — Path-A/B/C vs Path-D conditional unit split (DOC-REVIEW
ADVERSARIAL FIX).** Phase 0 explicitly states Path D voice-actor
delivery is **1-3 weeks wall-clock** (`phase-0-gate-resolution.md:51`).
The previous draft treated this as a "caveat" but Unit 1.3 itself is
a Phase 1 lock-bearing unit. If Path D fires, Phase 1 cannot fully
lock until the actor delivers. Restructure:

- **Unit 1.3a (fires immediately on Phase 0 exit, Path-A/B/C path):**
  Engine selection, cadence-adapter prefixTag locks, voice-preset
  IDs, cadence-spec hash. Phase 2 can begin against this subset
  even if Path D is the actual outcome (Phase 2 generates
  placeholder Dash WAVs for runtime-validation purposes while
  waiting for actor delivery).
- **Unit 1.3b (fires when Phase 0 Path D delivery completes,
  Path-D path):** Voice actor casting (1-2 actors), recording
  schedule, cadence-direction packet (the cadence-spec.md excerpts
  serve as director notes), studio booking, NDA. Phase 2 Unit 2.X
  (Path D ingestion) consumes this.

The previous draft's "speaking roles = 2 becomes 2 human actors"
language stays in Critical Constraints. The unit-level split lets
Phase 2 begin voice-pipeline work without 1-3-week blocking
dependency on Path D delivery.

**Step 4 — Total runtime accounting.**

R4 requires "Dash sustained narration ~90% runtime." **DOC-REVIEW
PRODUCT-LENS RESOLUTION:** locked reading is **"of voiced runtime"**
(not of total clock). Hedge removed — Phase 1 doesn't ship a "Briggsy
re-open lever" in a locked plan.

- Dash speech (all lines + scream): ~78s across S02–S06.
- Cold-open speaker speech: ~5.2s in S01 (cold-open #5 promotion;
  was 4.4s for #4).
- Gameplay-audio coverage (non-voice): ~13s of S05.
- Silence beats: ~1.8s total.

**Dash share of voiced runtime: 78 / (78 + 5.2) ≈ 93.8%.** Clears
the ~90% R4 target. The "of voiced runtime" reading is canonical
per R4's "Owns" framing — Dash *owns* the speaking budget; gameplay
audio (S05) is its own category, not Dash's territory.

(If Briggsy ever revisits this and reads R4 as "of total clock"
giving 82%, the lever is `S05_END - S05_START` Dash-VO time —
adding 1-2 sentences to S05's currently-sparse VO band. Reserved
as a roadmap-level reopen, not a Phase 1 internal lever.)

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
| 3 | **Dossier-page wipe** | Page-turn motif: a dossier page peels rightward, revealing the destination scene underneath from LEFT-TO-RIGHT (the physical-page metaphor: the source-scene "page" peels off-screen to the right; the destination "page" beneath is revealed starting from the left edge). **16 frames** (0.53s) — 8-frame draft was below emil-design-eng's perceptual threshold for "physical motion" reading (movement perceived as "physical object" requires ≥10 frames @ 30fps per emil motion-shape vocabulary). | Overlay component on the SOURCE scene's tail frames. The source-scene wipes OUT via `clip-path: inset(0 0 0 0)` → `clip-path: inset(0 0 0 100%)` (NOT `inset(0 100% 0 0)` per prior draft — that was right-to-left collapse, contradicted the page-peel diegetic framing). The destination scene sits beneath the source-scene layer; as the source-scene collapses leftward, the destination is revealed left-to-right. Easing: `EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`. |
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

**Step 5 — Banned-transition list (anti-pattern guard, style only —
architectural bans live in Step 1).**

DOC-REVIEW SCOPE-GUARDIAN P3 TRIM: the prior 5-item list mixed style
prohibitions with architectural decisions (cross-dissolve ban is
already covered by Step 2's hard-cut lock; `<TransitionSeries>` ban
is already covered by Step 1's bare-`<Series>` lock + enforced by
`timing.test.ts`'s no-overlap-math assertion). Style-prohibitions
only:

- **Push transitions** (the slide-in-from-right thing). Reads as
  generic motion-graphics templates.
- **3D cube flips.** Not in the Archer vocabulary.
- **Glitch effects.** Not in the Archer vocabulary.

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
| 1860–1950 | **Cascade peak HELD — comms-ticker at full bright state** (brightening ease completed AT frame 1860 per prior row; ticker now holds bright for 90 frames — NOT continuing to brighten). HTP hero still 70% (NOT full weight — saving that for 1950 stamp). 4 stat captions at 30% side-band-right. Halo at 40% right-edge. Music intensifies, no VO. **Three layers with clear hierarchy: bright ticker = active signal; HTP + halo + stats = texture.** **Disambiguation locked 2026-05-17 per Phase 7 deepening cross-phase amendment + ADR #25 composed-not-mid-motion rule: frame 1860 is the FIRST frame of the held-bright state (the +0.5s buffer past ease completion for any cutdown START_FRAME consumer per Phase 6 Unit 6.8 lands cleanly at frame ≥1880).** | (texture: HTP 70%, stats 30%, halo 40%) | **BRIGHT** (held — "OPERATIVE [REDACTED] — METHOD REPEATABLE" R15 #2 ticker pulse) |
| **1950** | **Payoff stamp slaps onto HTP hero overprint** (heavy slap, 16 frames; scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle, EASE_OUT). HTP hero drops to 50% opacity to let the stamp dominate. **Stamp becomes the SOLE focal point — only "everything at once" moment in the trailer.** Dash VO begins. | — (stamp is alone at full weight) | held bright as audio-visual support |
| 1950–2010 | Stamp held; Dash VO delivers payoff line. | — | bright |
| **1980–2010** | (Stamp + VO continue) — **Music duck pre-anticipated ramp** (`PAYOFF_DUCK_RAMP_FRAMES = 30`, volume 90% → 30% via Audio volume interpolation) completing as VO ends. | — | bright |
| 2010 | "They WERE the operation." VO ends. | — | bright |
| 2010–2040 | **Silent visual hold (30 frames).** HTP hero + payoff stamp + halo + stats all static. Music at 30% bed-only. No VO. | — | held bright |
| **2040** | **Hard cut to S05 gameplay.** | — | — |

**Step 3 — Mobile safe-square placement (DEEPENING + DOC-REVIEW
DESIGN-LENS COORDINATE LOCK + ADVERSARIAL CROP-RECONSIDERATION).**

The 1080×1080 central square within the 1920×1080 frame (x =
420–1500, y = 0–1080) contains:

- **HTP hero** (centered at x=960, ~500px wide max — reduced from
  600px to give stat captions room).
- **Active stat caption** at safe-square center-bottom (x=960
  centered, y=900 ± 30, line-height-adjusted). 36px dry / 22px
  italic companion. **Inside the safe square at the moment it's
  the focal point.** Resolves the prior Phase 1 contradiction (R11
  is comedy-load-bearing AND mobile-X-cropped) by placing the
  caption inside the decode region during its read window.
- **Payoff stamp at frame 1950** (centered at x=960, y=540,
  overprinting HTP hero).
- **R15 #1 cold-open stamp** (S01 — applies in S01, not S04 cascade,
  but listed for placement-policy completeness).

**DOC-REVIEW DECAY-DESTINATION RECONSIDERED.** Prior draft had
decayed stat captions migrate to "side-band-right" at x=1620 ± 80
(outside the 1080×1080 safe-square — mobile-X would crop them
entirely). But the adversarial review surfaced that the cascade's
*accumulation* reading is a load-bearing visual mechanic — viewers
who track the rising-action need to SEE the stats accumulate, not
just see the active stat individually then watch each disappear.
**Mobile-X autoplay viewers were going to lose the accumulation.**

**LOCK: decayed captions stay INSIDE the safe-square, stacked
vertically at the right edge of the safe-square (x=1380 ± 30,
inside the 420–1500 mobile-decode region).** Stack positions:

| Stat slot | Decayed x | Decayed y | Decayed scale | Decayed opacity |
|-----------|-----------|-----------|---------------|-----------------|
| Stat 1 (decayed at frame 1410) | 1380 | 740 | 0.65 | 0.30 |
| Stat 2 (decayed at frame 1560) | 1380 | 790 | 0.65 | 0.30 |
| Stat 3 (decayed at frame 1680) | 1380 | 840 | 0.65 | 0.30 |
| Stat 4 (decayed at frame 1860) | 1380 | 890 | 0.65 | 0.30 |

The decayed-stat column sits in the right portion of the safe-
square at 30% opacity — mobile-X viewers see all 4 accumulated
stats stacked alongside the HTP hero. The active caption (when
present) is at safe-square center-bottom (x=960, y=900). The two
positions don't overlap.

OUTSIDE the safe square (acceptable to crop on mobile X autoplay):

- **Card-art halo** (right-edge band x=1560–1880, 40% opacity —
  texture only, not focal; cropping doesn't damage reading because
  cards are decorative chrome here).
- **Comms-ticker** (bottom edge y=1020–1080 — dim background,
  brightens at 1860; mobile autoplay typically shows the bottom
  edge but the ticker is established as ambient chrome).
- **Pendleton crest watermark** (top-left x=120, y=80, 25% opacity
  — pure ambient).

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
  - **Enter:** 6 frames (200ms), `EASE_OUT`, scale 0.95 → 1.0 +
    opacity 0 → 1. Position: safe-square center-bottom (x=960,
    y=900).
  - **Hold:** 30 frames (1.0s) at full weight, safe-square
    center-bottom.
  - **Decay:** 12 frames (400ms), `EASE_IN_OUT`, position morphs
    to safe-square-right-edge stack (x=1380, y per stat-slot table
    in Step 3) + opacity drops 1 → 0.3, scale 1 → 0.65 (smaller
    chrome — was 0.85 in prior draft; reduced to 0.65 to allow
    the right-edge column to read as accumulating texture without
    crowding the HTP hero).
  - This asymmetry (fast in, read pause, slow decay) IS the comedic
    structure — emil's "slow where user is deciding, fast where system
    is responding" inverted because here the user is reading not
    deciding.
  - **Mobile-X visibility (DOC-REVIEW):** decayed-stat column stays
    INSIDE the 1080×1080 safe-square (x=1380, well inside x=420–
    1500 mobile-decode band). Accumulation reading survives mobile
    autoplay crop.
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

**Clone-and-adapt scope (DOC-REVIEW FEASIBILITY CORRECTION).** UMB's
`capture-htp-scroll.ts` (70 lines, verified 2026-05-17) is
**selector-agnostic** — it does NOT query `[data-reveal]` or any
specific markup. It simply drives `window.scrollY` in 200px
increments with 80ms waits between steps, then takes a full-page
screenshot. ScrollTrigger animations fire naturally on real scroll
in either codebase. Prior draft claimed the script had selector-
specific logic that BURNED needed to "adapt"; that was false. The
actual port surface is **URL only**:

- **URL:** UMB hits `https://undercover-mob-boss.vercel.app/how-to-play.html`;
  BURNED clone targets a local dev server (`http://localhost:5173/howtoplay.html`)
  during capture — BURNED's deploy migration (`burned-cxa.pages.dev`)
  is in progress per TODO §1.
- **Selectors:** N/A. The script is mechanism-agnostic. BURNED's
  `useScrollReveal()` + `[data-reveal]` ScrollTrigger machinery
  fires natively on real scroll events the same way UMB's does.
  No code adaptation needed.

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
| P5 | 68 mission-rehearsal files | One named "engine.test.ts," which feels redundant | test-file count + Engine test name. **R6-INELIGIBLE (DOC-REVIEW SECURITY-LENS):** raw `engine.test.ts` filename is unprocessed SDLC vocab; would ship to screen as on-screen text if swapped in from this pool. Removed from soft-fail backup list. |
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

**Step 1.5 — Hat-count audit (DOC-REVIEW REORDER — was Step 5
post-gate).** Audit the actual `public/assets/cards/*.webp`
operative portraits BEFORE the cold-read gate fires. Open each
of the 6 operative portraits (`dash-barlowe`, `vera-khan`,
`sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`).
Count hat-bearing characters. Document the count in
`goofy-stats-list.md`.

- If hat count = 2: Stat 3 phrasing locks as drafted ("Two of them
  with hats.").
- If hat count = 1: rewrite Stat 3 to "One of them with a hat."
- If hat count = 0 or ≥3: rewrite to actual count OR drop the
  "with hats" companion in favor of an alternative absurd
  companion (candidate: *"Two of them appear to be the same
  person at different ranks."*).

Audit OUTCOME locks Stat 3 phrasing BEFORE the cold-read gate
runs. The previous draft ran the audit post-gate, which meant
reviewers evaluated phrasing that might still rewrite — undermining
the gate.

**Step 3 — 4 finalists (DEEPENING + DOC-REVIEW SOURCE FIX).**

| Slot | Finalist | Source-verified | Rationale |
|------|----------|-----------------|-----------|
| S04 Stat 1 (frame 1290) | P2: "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." | TODO.md §1 (1,407 tests pass, verified 2026-05-16). **NOTE: previous draft's "14,000 pages" was unverified; Step 5 must run actual `wc -w` if a pages-stat is wanted.** | Opens the cascade with mission-rehearsal cadence — translates the SDLC-as-spywork concept verbally as the cascade visually begins. |
| S04 Stat 2 (frame 1410) | P2-companion: "Six of them, deliberately unrehearsed — the 'memorable ones.'" | TODO.md §1 (6 expected-fail) | Engineering-peer callback (expected-fail tests = bugs we're deliberately not fixing yet) without breaking diegetic frame. |
| S04 Stat 3 (frame 1560) | P3: "Seventeen asset illustrations. Two of them with hats." (or audit-revised per Step 1.5) | `public/assets/cards/*.webp` count = 17 ✓ (verified 2026-05-17, excluding `_archive/`). Hat count auditing per Step 1.5 BEFORE cold-read gate. | Lands hardest visually because the right-edge halo IS building during this line. |
| S04 Stat 4 (frame 1680) | **DOC-REVIEW SOURCE FIX** P4'': "Seven on the roster. Six in the deck. One on the research budget. Don't ask." | `ActRoster.tsx:18-75` OPERATIVES array = 6 entries (Dash, Vera, Sable, Janet, Neal, Agent X); `ActRoster.tsx:153-158` aside: Otto *"is on the roster but **not in the deck.** He's busy with the (unsanctioned, off-books, almost certainly illegal) research budget."* New phrasing matches the dossier source EXACTLY — "research budget" is the literal source phrase. Previous draft's "in the basement" was Phase 1 fiction. | Closes cascade pacing with the Otto-research-budget beat — funnier than first-draft "plus Agent X who is all of them" and survives freeze-frame audit. The "Don't ask." remains the deadpan glaze on the off-books reveal. |

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
4. **Gate threshold (ship R11) — DOC-REVIEW ADVERSARIAL FIX
   (per-reviewer-floor consensus, not sum-of-3-reviewers):**
   - **≥2 pairings where ≥2 of 3 reviewers each score ≥1** (each
     reviewer independently flags the pairing as landing — prevents
     single-zealous-reviewer false-pass that the sum-of-3-reviewers
     threshold allowed). AND
   - **No pairing scores 0 across all 3 reviewers** (any pairing all
     three flatlines is auto-cut even if other pairings clear).
6. **Soft-fail handling (partial cut):**
   - If exactly **1 pairing fails the per-reviewer-floor** (i.e., not
     ≥2 reviewers each scoring ≥1), that pairing drops; swap from
     pool (Step 1 P6 deck-of-120, P11 weekend-asset-turnaround. **P5
     mission-rehearsal-files REMOVED from backup list per
     doc-review — raw filename ineligible for visual stat caption**).
7. **Hard-fail handling (full R11 cut):**
   - If ≥2 pairings fail the per-reviewer-floor: **R11 cuts.**
     Cascade VO Stat 1–4 cues drop; cascade becomes purely visual
     (HTP scroll + card-art halo + R15 chrome). Dash VO lines for
     stats are replaced with a single bridging line.

**R11-cut bridge line (DRAFTED NOW so Phase 2 doesn't wait — DOC-
REVIEW: now a 2-line structure to avoid 8s of dead air before the
payoff):**

If R11 cuts, S04 VO between frames 1110 (HTP scroll begins) and 1950
(payoff stamp) collapses to TWO bridge lines:

> *Bridge cue 1 (frame ~1400, 10 words, 4.0s at 2.5 wps):* "Fourteen
> thousand pages of forensic dossiers. Drafted on weekends."
>
> *Bridge cue 2 (frame ~1740, 8 words, 3.2s at 2.5 wps):* "By a
> field asset, deliberately not named. Don't ask."

**DOC-REVIEW FIX (adversarial P2-4 surface):** prior draft had ONE
bridge at frame ~1400 which left 250+ frames (8s+) of silence before
the payoff stamp. That's a long unfilled stretch in the trailer's
load-bearing scene. Two-bridge structure breaks the silence and
preserves the cascade's pacing. Bridge cue 2 lands during the
cascade peak (1740) where the ticker is brightening, creating audio-
visual alignment.

Cascade visual still plays per Unit 1.5 Step 2 frame-by-frame
storyboard but **without the stat captions** — card-art halo
(right-edge 40%) + HTP hero scroll + comms-ticker bright-at-1860 carry
the entire visual content. The 1950 payoff stamp is unaffected. Both
bridge cues land before frame 1860 (cascade peak hold begins) to
leave a clean 90-frame silent build to the stamp.

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
- **P3** `Glob public/assets/cards/*.webp` excluding `_archive/` — 17
  files ✓ (verified 2026-05-17). **"Two with hats" audit moved to
  Step 1.5 (pre-gate) per DOC-REVIEW** — see Step 1.5 above for
  protocol + outcome handling.
- **P4''** Roster from `ActRoster.tsx`:
  - OPERATIVES array (deck): Dash, Vera, Sable, Janet, Neal, Agent X = **6 in deck**
  - Otto (in roster, NOT in deck): line 153-158 explicit aside —
    *"busy with the (unsanctioned, off-books, almost certainly
    illegal) research budget."*
  - Dolores Grieves (NPC, not in roster): per character memory
  - **"Seven on the roster. Six in the deck. One on the research
    budget. Don't ask." matches the dossier source EXACTLY** (DOC-
    REVIEW source-fix; prior draft's "in the basement" was Phase 1
    fiction that the deepening pass falsely marked Resolved). ✓

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
| Royalty-free library — Artlist Pro / Epidemic Sound Pro | Clear sync license covering portfolio + Twitter/X + future engineering blog reposts | Track is fixed-length; trailer must cut to track or track edited. **Pro tier $199–$204/yr is the minimum** covering portfolio-site embed when site touches client/employer work. Social/Creator tiers ($120/yr) explicitly EXCLUDE this use case. | **Locked as primary** |
| **Per-track marketplace — Marmoset / Songtradr** | **Hand-picked match possible; per-track sync license; explicit copyright vesting** | $30–$200/track | **DOC-REVIEW ELEVATED: Second-tier-before-Suno** (was reserve-only). For a portfolio-piece recruiting artifact, copyright-vesting + non-AI source matters; $200/track is portfolio-piece-priced. |
| Generative — Suno | Cuts to fit cascade arc; Pro/Premier tier covers commercial use | Suno **grants commercial-use license but does NOT warrant copyright vesting** in outputs. AI-generated audio disclosure required on some platforms. Subscription must be active at generation time. **DOC-REVIEW: for a portfolio recruiting artifact, "no copyright vesting" + AI-disclosure requirement is a substantive distribution risk** (trailer's whole thesis is "agentic-SDLC built this" + adding AI music = stacked AI-disclosure exposure). Disclosure obligation flows downstream to Phase 7 via `music_disclosure_required: true` flag in BEAT-SHEET.md preamble. | **Last-resort fallback** (was "expected fallback"). Only if Artlist Pro / Epidemic Pro 20–30-candidate pass + Marmoset/Songtradr hand-picked search both fail. |
| Royalty-free library — Musicbed Individual / Business | Curated higher-end catalog | $329.89–$1,208.88/yr (Individual) or $1,099–$2,428.88/yr (Business). Over budget for portfolio-piece. | Alternate only |
| Licensed track (published artist) | Cultural caché if recognizable | $500–5000+ for sync license; not justified at portfolio-trailer scale | Declined |

**DOC-REVIEW SOURCE-PRIORITY LADDER (was unordered prior):**
1. **Artlist Pro / Epidemic Sound Pro** subscription catalog (primary).
2. **Marmoset / Songtradr** per-track marketplace (second-tier, hand-
   picked at $30-$200/track if (1) doesn't land after 20-30 candidates
   per platform + 8-10 finalists audition).
3. **Suno Pro** generative (last-resort only; triggers
   `music_disclosure_required: true` flag for Phase 7 distribution
   copy).

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

Candidate auditioning protocol (DEEPENING + DOC-REVIEW: per-track
marketplace search added as Tier 2 before Suno fallback):

- **Tier 1 — Subscription catalog:**
  - **Artlist Pro:** pull 20–30 results across multiple tag intersections
    ("spy/jazz", "bossa/instrumental", "mid-century/lounge").
  - **Epidemic Sound Pro:** pull 20–30 results, same tag spread.
  - Filter to **8–10 candidates** (was "3 finalists" pre-doc-review;
    expanded to give the per-finalist beat-sheet audition more depth
    before locking) matching BPM 100–130 + ≥95s + dynamic arc.
  - Audition each in 30s clips against BEAT-SHEET.md timing.
  - Narrow to 3 finalists. Three listening passes per finalist against
    the full beat sheet. **Lock 1 if any finalist clears §2.2 quality
    bar; else escalate to Tier 2.**
- **Tier 2 (DOC-REVIEW NEW) — Per-track marketplace:**
  - **Marmoset:** hand-pick 5–8 candidates matching BPM 100–130 + brass/
    bossa core ($30–$200/track range).
  - **Songtradr:** hand-pick 5–8 candidates same criteria.
  - Audition each against BEAT-SHEET.md timing.
  - **Lock 1 if any candidate clears §2.2; else escalate to Tier 3
    (Suno) with explicit `music_disclosure_required: true` flag.**
- **Tier 3 — Suno generative (last resort; see Step 4).**

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

**Step 4 — Generative fallback (DEEPENING + DOC-REVIEW: Suno is
LAST-RESORT, not expected; disclosure flag wires to Phase 7).**

Suno is the **last-resort** fallback per the doc-review-revised
priority ladder (Step 1): catalog → per-track marketplace → Suno.
**Udio is OUT** (Nov 2025 settlement disabled exports). Other 2026
generative options surveyed (Mubert, Beatoven, Loudly) — none
Sterling-coded; documentation hygiene only, not real alternatives.

Suno commercial-use rights (ToS — check current at execution time):

- Apply to **Pro ($10/mo) and Premier ($30/mo)** tiers — NOT a
  "Producer" tier (early-2025 draft naming, no longer used).
- Subscription must be **active at time of generation**. Free-tier
  generations cannot be retroactively commercialized by upgrading.
- Suno grants perpetual commercial-use license but **does not
  represent that copyright vests in the output**. For a portfolio
  piece this means the trailer's music bed is un-copyrightable as
  a discrete asset.
- AI-generated audio disclosure required on platforms that demand it.

**If Suno fires (DOC-REVIEW SECURITY-LENS):** the BEAT-SHEET.md
preamble locks `music_disclosure_required: true`. Phase 7
distribution copy MUST include AI-music disclosure language in the
X post body + portfolio embed caption ("Music: AI-generated via
Suno Pro" or equivalent). This is separate from the cold-decode
copy about agentic-build origin — the disclosure obligations are
distinct claims. Phase 7 plan must absorb the AI-music-disclosure
obligation if Suno fires.

Budget Pro $10/mo as last-resort insurance (no longer "expected
fallback"). If fallback fires, retain subscription receipt +
generation timestamp + the disclosure-flag in `music-license.pdf`.

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
- ~~Create: `videos/trailer/public/fonts/`~~ — **REMOVED per
  DOC-REVIEW ADR #15 fix.** Fonts already live at BURNED's
  `public/fonts/` and are reachable via Phase 0 ADR #8
  `setPublicDir('../../public')`. No copy step.
- Create: `videos/trailer/src/hooks/useFonts.ts` — replaces stub from
  Phase 0 Unit 0.1; loads the 3 fonts from BURNED's `public/fonts/`.
- Create: `videos/trailer/sample-eval/beat-sheet/typography.md` —
  decision rationale + sample frames + Phase 4 spike outcome
  (ADR #18 variable-axis range validation).

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

**Step 2 — Font asset sourcing (DEEPENING + DOC-REVIEW: variable
fonts at BURNED's `public/fonts/`, NO copy step per ADR #15).**

BURNED ships **three variable woff2 files** at `public/fonts/`
(verified 2026-05-17 via `ls public/fonts/`):

- `ClashDisplay-Variable.woff2` (weight range 200–700)
- `GeneralSans-Variable.woff2` (weight range 200–700)
- `JetBrainsMono-Variable.woff2` (weight range **100–900** —
  source verified at `src/client/howtoplay/fonts-mono-htp.css:9`;
  prior deepening draft said `100 800`, off-by-100 typo)

There are NO weight-specific files like `clash-display-700.woff2` —
the first-draft Phase 1 named files that don't exist (same shape as
Phase 0's `burned-display.woff2` ghost-reference catch).

**DOC-REVIEW ADR #15 FIX:** the previous draft prescribed copying
the 3 variable files to `videos/trailer/public/fonts/`. ADR #15
(locked 2026-05-17 per Phase 3 deepening, `roadmap.md:143`)
explicitly states *"Files at `videos/trailer/public/...` are
UNREACHABLE to `staticFile()` during render"* — Phase 0 ADR #8
configured `Config.setPublicDir('../../public')` so Remotion reads
through BURNED's project-root `public/` directory. The copy step
would have produced font 404s at render time. **NO COPY** —
`useFonts.ts` reads the fonts directly from BURNED's `public/
fonts/` via `staticFile('fonts/ClashDisplay-Variable.woff2')`,
etc.

**Sub-issue:** BURNED's JetBrains Mono is declared separately in two
per-bundle stylesheets (`src/client/shared/fonts-mono.css` for the
board, `src/client/howtoplay/fonts-mono-htp.css` for the HTP page).
The trailer creates its own scope via `useFonts.ts` below — does NOT
import either BURNED stylesheet.

**ADR #18 spike caveat:** Remotion's `loadFont()` docs don't
explicitly document variable-axis range syntax (e.g., `'100 900'`).
The DOM `FontFace` constructor accepts range syntax per CSS Fonts
Module Level 4 and BURNED's CSS uses it, but Remotion's worker-
thread Chromium that produces frame PNGs may resolve axes
differently than studio preview. **Phase 4 Unit 4.0 reserves a
60-min spike** to validate variable-axis weight resolution in MP4
export against per-weight static woff2 fallback. The typography
lock in Phase 1 is **provisional pending Phase 4 spike outcome**
— if the spike fails, Phase 1 reopens to ship per-weight static
woff2 files (5 weights × 3 families = 15 files via
`pyftsubset --variation-instance="wght=N"`).

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
      weight: '100 900',  // matches src/client/howtoplay/fonts-mono-htp.css:9; was '100 800' (typo)
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
- **3 variable woff2 files** verified at BURNED's `public/fonts/`
  (ClashDisplay-Variable, GeneralSans-Variable, JetBrainsMono-
  Variable). NO copy to `videos/trailer/public/fonts/` per ADR #15.
- `staticFile('fonts/...')` paths resolve through Phase 0 ADR #8
  `setPublicDir('../../public')`.
- Typography assignments documented per element with variable-axis
  weights resolving correctly.
- `typography.md` records decision + sample frames + Phase 4 spike
  outcome (ADR #18 variable-axis range validation).

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

**Step 1 — R15 instance table (DEEPENING + DOC-REVIEW R15 #5
COLD-DECODE CLOSING CARD ADDITION).**

The first-draft Phase 1 had #3 ("AUTONOMOUS FIELD UNIT — ASSET
DELIVERED") and #4 ("AGENT-BUILT, ARCHER-GRADE") both carrying the
agentic-SDLC origin claim. To an engineering peer that reads as
double-stamping the same signal; the second instance felt like a
sticker, not a new claim. **#4 shifts to status-grammar — the closing
chrome asserts operational STATUS (the asset is field-ready), not
re-treads the origin question (handled at #1 + #3).**

**DOC-REVIEW PRODUCT-LENS RE-OPEN (Briggsy-decided):** R15 #1–#4
serve in-world diegetic readings + engineering-peer-confirmation
decode, but the deepening admitted *"R15 alone does NOT carry the
cold-decode"* — meaning the trailer-as-artifact-in-isolation
(embedded, screenshot-shared, downloaded for portfolio) lost the
central engineering claim. Phase 7 distribution copy was named as
the carrier, but the trailer can escape its wrapper. **NEW R15 #5
closing card at frame 2835 carries the literal cold-decode work**;
R15 #1–#4 stay in-world diegetic.

| # | Frame | Scene | Copy | Treatment | Decode axis |
|---|-------|-------|------|-----------|-------------|
| 1 | 150 | S01 cold open | **"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"** | Classification stamp slap, lower-left, JetBrains Mono 700 28px, `--color-ochre-9` ink on `--color-cream-12` stamp paper | In-world diegetic (origin: method is autonomous) |
| 2 | 1680 | S04 cascade | **"OPERATIVE [REDACTED] — METHOD REPEATABLE"** | Comms-ticker pulse, bottom edge, JetBrains Mono 500 22px, scrolling left-to-right | In-world diegetic (reproducibility claim) |
| 3 | 1950 | S04 stacked payoff | **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"** | Dossier stamp slap (heavy 16-frame slap, overprints HTP hero), JetBrains Mono 700 38px, `--color-burned-fire` ink | In-world diegetic (R3 payoff carrier) |
| 4 | 2820 | S06 closing | **"OPERATION STATUS: FIELD-READY"** (status grammar; replaces former "AGENT-BUILT, ARCHER-GRADE") | Subhead under BURNED logo, JetBrains Mono 700 32px, `--color-ochre-9` ink | In-world diegetic (status: asset is ready) |
| **5** | **2835** | **S06 closing card** | **"DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS."** + 30%-opacity subhead **"Briggsy didn't write this part either."** | **Closing-card stamp slap (8-frame standard slap; lands 15 frames after R15 #4); subhead in JetBrains Mono 500 italic 22px at 30% opacity. Main line JetBrains Mono 700 32px in `--color-ochre-9` ink. Both lines centered below R15 #4.** | **Cold-decode literal: cold viewer in trailer-isolation reads the autonomous-build claim explicitly. Subhead echoes promoted S01 cold-open line ("Briggsy didn't write this one either") as bookend.** |

**Frame 2820 (was 2800) per Unit 1.10 deepening cadence — logo lands
at 2780, settles for 40 frames, then R15 #4 stamps onto the closing
card.** Frame 2835 (R15 #5) lands 15 frames after R15 #4; both hold
through the final 15 frames until hard cut to black at 2850.

**Step 2 — R15 brainstorm-mandate trace.**

Brainstorm R15 acceptance: "at least one signal lands in the cold-
open frame, at least one in the cascade or closer."

- ≥1 in cold-open: #1 (frame 150 in S01). ✓
- ≥1 in cascade or closer: #2 (cascade comms-ticker, frame 1680), #3
  (cascade stacked payoff, frame 1950), #4 (closing status, frame
  2820), **#5 (closing-card cold-decode, frame 2835)**. ✓ — four
  signals across cascade + closer.

**Total: 5 R15 signals** (was 4 pre-doc-review). Brainstorm minimum
is "at least two." BURNED ships 5 for redundancy on the no-context-
viewer decode mechanism: #1-#4 carry in-world diegetic
+ engineering-peer-confirmation; #5 carries the literal cold-decode
load explicitly.

**Step 3 — Layered decode model (DOC-REVIEW PRODUCT-LENS REOPEN
CLOSED — R15 #5 now carries cold-decode).**

R15 chrome operates on **three layers** post-doc-review:

- **(a) In-world diegetic:** the cold Twitter/X viewer with no
  context reads the chrome as Pendleton-agency flavor (classification
  stamps, comms-ticker pulses, operation-status briefing terminals).
  R15 #1–#4 carry this load.
- **(b) Engineering-peer confirmation:** the engineering peer who
  already knows the trailer is about agentic SDLC reads R15 #1–#4
  as confirmation alongside the in-world reading. The decode lands
  via wordplay ("METHOD: AUTONOMOUS" reads both as briefing-room
  classification AND as autonomous-build claim).
- **(c) Literal cold-decode (NEW — R15 #5):** a cold viewer in
  trailer-isolation (no Phase 7 wrapper, no engineering context)
  reads R15 #5's closing card unambiguously: *"DRAFTED, RENDERED,
  AND SHIPPED BY AUTONOMOUS AGENTS."* This is the safety net that
  ensures the trailer-as-artifact-in-isolation carries the central
  engineering claim regardless of distribution context.

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
- **#5 "DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS." +
  "Briggsy didn't write this part either."**: NOT in-world — this is
  the closing-card author-stamp that breaks the fourth wall
  deliberately. The diegetic frame closes with R15 #4; #5 is the
  acknowledgment that the trailer is itself an autonomous-agent
  artifact. Subhead echoes the S01 cold-open line ("Briggsy didn't
  write this one either") as bookend — the trailer opens with the
  claim and closes confirming it. ✓ — carries cold-decode
  unambiguously without context.

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

**S01 — Cold Open.** Frame composition (DOC-REVIEW DESIGN-LENS
NEW — previous Phase 1 had no S01 visual spec; Unit 1.10 covered
S02/S03/S06 only; Phase 4 implementer would default to generic
AI-aesthetic black-background card-flash montage).

Total scene budget: 210 frames / 7.0s. Cold-open speaker VO drops
at frame 60 (2.0s in) per Step 2 of Unit 1.2 — the visual builds
through the first 2 seconds, the line lands, the visual settles
into S02 hand-off.

- **Background (full-bleed, frames 0–60):** **NOT a black slate.**
  Mahogany desk surface (`--color-ochre-3`) but dim — the briefing
  room is pre-establishing in shadow, as if the lights haven't
  come up yet. **Venetian-blind shadow bands at 1.5–2px/frame
  motion** establish across the desk (same shadow grammar as
  S02/S03 — visual continuity primer). Pendleton crest watermark
  at 15% opacity (much dimmer than S02's 25%) top-left.
- **Foreground card flash (frames 0–60):** Six BURNED card backs
  flash in rapid succession over the dimmed-desk background. **Per-
  card cadence: 6 frames each (200ms), no easing — hard cuts.**
  Cards: `burned.webp` last (frame 50, 10-frame hold), preceded
  by `intercepted`, `burn-the-files`, `extraction`, `back-channel`,
  `falsify-intel` (random pre-shuffled order; locked sequence in
  `BEAT-SHEET.md`). Each card occupies 60% of safe-square center,
  hard-edged drop shadow at `--color-ochre-3` 40% opacity. **NOT
  a slow reveal — a rapid-fire deck-shuffle establishing the
  trailer's primary asset (operations) in cinematic compressed
  time.**
- **Cold-open speaker VO drops (frame 60):** dimmed-desk + last
  card frame (`burned.webp`) held under the line. Line completes
  ~frame 215 (within S01 boundary at frame 210 if speech runs at
  2.5 wps; the 0.5s of overlap into S02 is intentional — the line
  bridges the cut).
- **R15 #1 stamp (frame 150):** classification stamp slap onto
  the held `burned.webp` card. Lower-left position, 8-frame
  standard slap. JetBrains Mono 700 28px, `--color-ochre-9` ink
  on `--color-cream-12` stamp paper. The stamp peels into S02 as
  the venetian-blind lights "come up" — same shadow grammar
  continues, but mahogany desk goes from dim (S01) to fully lit
  (S02). This is the visual transition into the briefing.
- **BURNED logo treatment (frame 60–210):** *NOT* the full
  closing-card BURNED logo. S01 shows the BURNED card art (the
  game asset) as the focal element during the cold-open VO,
  NOT the wordmark logo. The wordmark only appears in S06
  closing card at frame 2780 (where it lands as the trailer's
  capstone). **Differential**: S01 establishes BURNED as a card
  inside the deck (in-world); S06 establishes BURNED as the
  game's title (out-of-world bookend). The two BURNED
  treatments do different jobs.
- **Brass hook (audio, frame 0):** the music bed's intro brass
  hook hits at frame 0 — full-volume open. The hook completes at
  frame 60 ramping down to 40% as the cold-open VO drops.

**Anti-pattern guard:** S01 does NOT default to generic action-
trailer aesthetics (cards slamming in with motion blur / glow,
dramatic single-color background, title appears). The Archer-coded
opener is *compressed restraint* — six hard-cut flashes against a
dim establishing shot, then a single line over the held last frame.

**S02 — Briefing Setup.** Frame composition (DEEPENING — depth-plane
foreground element added; shadow motion bumped for H.264 survival).
**DOC-REVIEW LAYERED-SIMULTANEOUS GUARD:** the same ">2 elements at
full visual weight" rule the cascade rewrite applied now applies
here. Previous draft listed 8 elements competing for 12 seconds
(mahogany + venetian blinds + depth-plane foreground + open dossier
+ Pendleton crest + comms-ticker + CASE BANNER + R15 stamp), which
fails §2.2 the same way the cascade's layered-simultaneous draft
did. **Sequencing rule:** at any given frame, ≤2 elements at full
visual weight; others at 30–40% chrome or dim background. Specific
sequencing:
- Frames 210–240: venetian-blind shadow establishes (single focal),
  dossier closed in midground (dim).
- Frames 240–300: dossier opens (60-frame ease, single focal action;
  shadow continues at chrome level).
- Frames 300–500: Dash VO carries the scene; dossier interior text
  + CASE BANNER are the two simultaneous focal elements; comms-
  ticker stays at chrome level (rotates idle text quietly).
- Frames 500–570: case-sheet header settles; depth-plane foreground
  element + Pendleton crest never reach full weight (they're
  texture).
- R15 #1 stamp lives in S01 tail, NOT S02 (slap settles into S02
  head — already counted at S01 frame 150).

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
  the "object opens" motion better than ease-out). **Inside the
  dossier (DOC-REVIEW DESIGN-LENS CONTENT SPEC):**
  - **Header (Clash Display 700 36px, `--color-cream-1` ink):**
    "OPERATION PENDLETON / CASE FILE 02"
  - **Operative line (General Sans 600 22px):** "ASSIGNED ASSET:
    D. BARLOWE"
  - **Clearance line (JetBrains Mono 700 18px):** "CLEARANCE:
    ALPHA-SEVEN"
  - **Case-file date (JetBrains Mono 500 16px):** "FILED:
    [REDACTED] / CASE OPENED: [REDACTED]"
  - **Classification chevron (JetBrains Mono 700 14px, top-right
    of case-sheet):** "EYES-ONLY · NOT FOR REDISTRIBUTION"
  - **Redaction bars** (3 horizontal black bars, `--color-charcoal-1`,
    covering "sensitive" fields the viewer doesn't need to read)
  Phase 3 owns rendering this as a layered SVG/PNG asset OR Phase
  4 owns it as JSX text overlay (Phase 4 decides based on chrome-
  motion needs — if the case-sheet text needs to animate
  independently of the dossier-open, JSX wins; if it's static-
  on-paper, asset wins).
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

  **CASE BANNER per-scene content (DOC-REVIEW DESIGN-LENS NEW —
  prior draft never declared the 5 GameTable.tsx text fields'
  content for trailer scenes):**

  | Scene | label | operation | sub | divider | footer |
  |-------|-------|-----------|-----|---------|--------|
  | S02 | "CASE FILE" | "OPERATION PENDLETON" | "BRIEFING ROOM · BUREAU CHIEF M. PENDLETON" | "—" | "02 / EYES-ONLY" |
  | S03 | "CASE FILE" | "OPERATION PENDLETON" | "MISSION DOSSIER · ASSET ROSTER" | "—" | "02 / EYES-ONLY" |
  | S06 | "CASE FILE" | "OPERATION PENDLETON" | "DEBRIEF · STATUS UPDATE" | "—" | "02 / FIELD-READY" |

  The label / operation / divider / footer hold steady across all
  three briefing-room scenes (S02 establishes them, S03 carries
  them as continuity, S06 footer mutates "EYES-ONLY" → "FIELD-
  READY" mirroring the R15 #4 status arc). The `sub` field
  refreshes per scene to indicate the current briefing phase.
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
  cards** slide in along the right edge. **DOC-REVIEW LOCK:** the 6
  portraits are the 6 deck operatives — `dash-barlowe`, `vera-khan`,
  `sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`
  (Agent X with REDACTED-bar over face). Otto is NOT in the
  portrait cluster (he's not in the deck — matches the Stat 4 line
  "Six in the deck. One on the research budget."). The deck-of-6
  visual primes Stat 4's verbal "Six in the deck" payoff.
- **S03→S04 transition resolution (DOC-REVIEW DESIGN-LENS RECONCILE):**
  The 6 operative portraits EXIT at the S03→S04 dossier-page wipe
  (frame 1034–1050, 16-frame wipe — see Unit 1.4). They do NOT
  persist into S04's halo. **S04's right-edge halo is 6 ACTION
  cards from the 11-card action set**, locked to:
  - `burned.webp` (the game's namesake — must appear in cascade)
  - `intercepted.webp` (R5 scream cue context — Dash interrupts
    when an intercept card draws)
  - `burn-the-files.webp` (literal R6 "burn" verbal callback)
  - `extraction.webp` (Pendleton mission-vocabulary primer)
  - `intel-briefing.webp` (matches S02 dossier-open setup)
  - `direct-order.webp` (high-stakes operation primer for S05
    gameplay)
  The remaining 5 action cards (`back-channel`, `call-in-a-favor`,
  `falsify-intel`, `go-dark`, `reassign`) DO NOT enter the trailer
  cascade — they remain in the S03 dossier mosaic context only
  (the 4×6 grid revealed inside the dossier viewport per Unit
  1.10 S03 Step 1).
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
- **Frame 2835 (DOC-REVIEW NEW — R15 #5 cold-decode closing card):**
  R15 #5 stamp slaps below R15 #4 ("DRAFTED, RENDERED, AND SHIPPED
  BY AUTONOMOUS AGENTS." + 30%-opacity subhead "Briggsy didn't write
  this part either."). 8-frame standard slap (lighter envelope than
  R15 #4 to maintain hierarchy). The subhead echoes the promoted
  S01 cold-open line as bookend.
- **Frame 2843:** Final brass sting on the music bed (volume 60→100%
  ramp lands here); logo + R15 #4 + R15 #5 all hold static.
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
  `script.ts` + cadenceAdapter annotations + consumes the 7 extended
  Line fields (`cueType`, `expectedFrames`, `leadFramesHint`,
  `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`,
  `skipSilenceremove`) per Phase 2 deepening declared surface. Phase
  3 (Visual Asset Prep) loads the visual inventory + the goofy-stats
  list + the HTP rendering method + the briefing-room composition
  from BEAT-SHEET.md + emits trace-video MP4 conditional on Phase 3-
  entry perceptual gate (per Unit 1.5 Step 6 deepening). Phase 4
  (Remotion Composite Build) imports `timing.ts`, `transitions.ts`,
  builds scene-internal overlay components for stamp slap / dossier-
  page wipe / iris wipe (bare `<Series>` composition, no
  `<TransitionSeries>` presentations). Phase 5 (Gameplay Capture)
  ships `gameplay-raw.mp4` + the **extended `gameplay-markers.json`
  contract** (DOC-REVIEW SECURITY-LENS FIX) declaring: `inPoint`,
  `burnedDrawFrame`, `player_names_scrubbed: boolean`,
  `capture_resolution: '1920x1080'|'1080x1920'`,
  `source_seat_count: number`. Phase 4 trims to land marker at
  scene-relative frame 160 (~5.3s into S05) AND hard-fails the
  build if `player_names_scrubbed: false` without
  `consent_records[]`. Phase 6 (Final Render + QA) uses the beat-
  sheet for QA criteria + screens against §2 with a critical
  engineering peer (cascade-content open risk). Phase 7
  (Distribution) reads the X-native cutdown brief from BEAT-SHEET.md
  notes (Unit 1.5 + 1.9 surface candidate cutdown beats).
  **DOC-REVIEW PRODUCT-LENS REOPEN CLOSED:** R15 #5 closing card
  (frame 2835) carries the trailer-in-isolation cold-decode load
  explicitly. Phase 7 distribution copy provides the wrapper, but
  the trailer-as-artifact stands on its own without it.

- **Cross-phase deepening dependencies surfaced:**
  - **Phase 3 must deepen with BOTH static-PNG AND trace-video paths
    budgeted** (Unit 1.5 Step 6). The first-draft Phase 3 plan budgets
    static-only; that's a load-bearing gap.
  - **Phase 5 must ship extended `gameplay-markers.json` contract**
    declaring raw-capture in-point + BURNED-draw-frame +
    player_names_scrubbed + capture_resolution + source_seat_count.
    Phase 1 locks the contract here; Phase 5 plan must absorb it +
    commit to a scrub path (synthetic names OR consent records).
  - **Phase 2 must consume `script.ts` not Markdown** for line set;
    BEAT-SHEET.md drift is detected by `script.test.ts` via id-
    comment-marker pattern (DOC-REVIEW simplification).
  - **Phase 4 Unit 4.0 spike must validate variable-axis font weight
    resolution** in MP4 export (ADR #18); Phase 1 typography lock
    is provisional pending outcome.
  - **Phase 6 QA must screen against §2 with a critical engineering
    peer** for cascade-content water-beads outcome (cascade content
    open risk).

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

## Risks & Dependencies (DEEPENING + DOC-REVIEW PASS — false-Resolved
claims retracted + new open risks declared)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Per-cue wps unbuildable for Sterling-coded delivery** | Low (after DOC-REVIEW rewrite of payoff line; deepening claim was false-Resolved — 16-word line at 1950 was 8× over ceiling) | High (Phase 2 cannot generate WAVs) | Unit 1.2 Step 5 doc-review rewrite — payoff collapsed to 4-word truth-collision fitting 60-frame window at 2.0 wps controlled-deadpan. Phase 1 lock requires every cue's wps computed + verified before Phase 2 ships. Phase 2 first-batch TTS validates against the Phase-1-authored band. |
| **R6 grep regex broken (POSIX ERE lookahead unsupported) + Windows portability** | Resolved (DOC-REVIEW Windows port) | High (gate silently always-passes) | Unit 1.2 Step 9 rewrite — PowerShell-native 2-pass approach (rg + Select-String -NotMatch); $env:TEMP path not /tmp; ripgrep-pcre2 install-check documented. R6 vocab list documented by category (9 categories, 25 terms). Scope extended to scan cascade-composition.md visual stat captions, not just VO body. |
| Narration script word count overshoots scene budget | Low (after DOC-REVIEW Step 8 recompute against actual lines) | Medium | Per-scene mean wps + per-cue wps validation in Unit 1.2 Step 8 + Step 5; word counts recomputed mechanically against actual lines post-doc-review rewrites. Total: 209 words / 2.30 mean wps / 95.0s. |
| Cold-read gate for R11 fails | Medium | Medium | R11 cuts cleanly; pre-drafted bridge line in Unit 1.6 Step 4 (candidates A + B). DOC-REVIEW: consensus threshold rewritten to per-reviewer-floor (≥2 of 3 reviewers each score ≥1 on same pairing) — old sum-of-3 threshold passed with N=1 zealous reviewer. |
| Music sourcing returns no clean candidates | **Medium-High** (95s cascade-arc + brass/bossa is a low-hit-rate ask) | Medium | DOC-REVIEW HARDENED — per-track marketplace ($30–$200 Marmoset/Songtradr) elevated to second-tier-before-Suno. Suno fallback adds `music_disclosure_required: true` flag to BEAT-SHEET.md preamble for Phase 7. Audition pass 20-30 candidates per platform + 8-10 finalists (was 3). Step 2.5 track-shape decision committed before search. |
| HTP capture under-delivers visually in static PNG | **Medium** (GSAP ScrollTrigger animations frozen in PNG; only translateY scrolling reads as "motion") | Medium | **Phase 3 BUDGETS BOTH paths** per Unit 1.5 Step 6 deepening — static-PNG primary, trace-video conditional on Phase 3-entry perceptual gate. Phase 3 plan must deepen with this conditional. DOC-REVIEW: UMB capture-htp-scroll.ts confirmed selector-agnostic; no adaptation work needed beyond URL change. |
| R5 cut, cold-open speaker re-selection | Low (covered by Phase 0 Unit 0.6 outcome) | Low (BEAT-SHEET.md reflects whichever speaker locked) | Per Unit 1.3 Step 1 outcome matrix (4 reachable rows; Cut+Vera unreachable). |
| Cascade VO timing doesn't line up with visual cues | Medium | Medium | Frame-accurate cue table in Unit 1.5 Step 2; per-cue wps validated; Phase 4 verification via studio playback. |
| **Cascade composition reads as AI-slop, not Archer** | **Resolved at cascade; tightened at S02/S03/S06** | High (fails §2.2) | Unit 1.5 Step 1-2 deepening rewrite + DOC-REVIEW briefing-room tightening — "no frame except 1950 payoff has >2 elements at full visual weight" rule now applies to ALL briefing-room scenes (S02 had 8 simultaneous elements; sequenced per Unit 1.10 update). |
| Stacked-payoff stamp slap competes visually with HTP hero overprint | Low (after Step 5 deepening) | High (R3 fail) | HTP hero drops to 50% at 1950 to cede focus to the heavy slap; stamp is the sole focal point at the trailer's "meaning-stack" moment (DOC-REVIEW: disambiguated from "visual-density stack" — the stack is the audio-visual collision, not pixel-density). |
| **Variable fonts not weight-specific files** | Resolved (DEEPENING) + JBM weight typo Resolved (DOC-REVIEW) + ADR #15 path violation Resolved (DOC-REVIEW) | High (first render 404s) | Unit 1.8 Step 2 — 3 variable woff2 files; JBM range `'100 900'` (was `'100 800'` typo); fonts at BURNED's `public/fonts/` via `staticFile()` (no copy to `videos/trailer/public/fonts/` per ADR #15). |
| **CaseBanner.tsx ghost-reference** | Resolved | Medium | Source-of-truth re-anchored to `GameTable.tsx:67-88` inline `.caseBanner` aside; Unit 1.10 Patterns section corrected. DOC-REVIEW: per-scene content table added for the 5 text fields. |
| **6-vs-7 operative count mismatch** | Resolved at Stat 4 (DOC-REVIEW source-fix; deepening's "matches dossier" claim was FALSE — "in the basement" was Phase 1 fiction) | Medium (freeze-frame viewer audit catches it) | Stat 4 rewritten to "Seven on the roster. Six in the deck. One on the research budget. Don't ask." per `ActRoster.tsx:153-158` literal source phrasing. |
| **R3 cross-dissolve had 3 internal timing contradictions** | Resolved | High (R3 mechanic incoherent) | Unit 1.4 Step 2 deepening — cross-dissolve REPLACED with hard cut at 2040 after 1.0s payoff visual hold; music ducks pre-anticipated ramp completes at 2010. |
| **`<TransitionSeries>` overlap math contradicts TOTAL_FRAMES** | Resolved | High (timing.test.ts asserts wrong invariant) | Unit 1.4 Step 1 deepening — bare `<Series>` + scene-internal overlay components; scene durations sum exactly to TOTAL_FRAMES. |
| **useFonts.ts race condition (sync flag before async loads)** | Resolved | Medium | Unit 1.8 Step 3 deepening — Promise.all pattern, second consumers await shared promise. |
| **Mobile safe-square crops accumulating chrome** | Resolved (DOC-REVIEW DESIGN-LENS + ADVERSARIAL — decayed stats moved INSIDE safe-square, prior side-band-right would have lost the accumulation on mobile autoplay) | High (R11 cascade rising-action invisible on primary distribution surface) | Unit 1.5 Step 3 doc-review — decayed-stat column at x=1380 inside safe-square; 4-row stat-slot coordinate table locked. |
| Music volume cliff at 1950 would click | Resolved | Medium | Unit 1.7 Step 5 deepening — all transitions are ramped envelopes or held holds; 60-pt cliff replaced with pre-anticipated 30-frame duck completing at VO end. |
| Sterling-screams-Lana identity-replication drift | Resolved at framing, **REFRAMED at success criterion (DOC-REVIEW)** | Medium (ADR #13 violation if shipped) | Unit 1.2 Step 6 + Unit 1.3 Step 2 — cadence-spec citation only; no Archer-scene identity reference IN PLAN. **Success criterion explicit: an Archer-aware listener feels "that's the Archer scream" recognition — recognition IS the joke. ADR #13 guards distribution attribution (don't credit / claim Benjamin), NOT successful cadence recognition.** |
| Late beat-sheet reopening during Phase 4 | Low | High | Per-Phase-1-exit roadmap update + BEAT-SHEET.md status freeze; reopens require explicit roadmap-level action. DOC-REVIEW: BEAT-SHEET.signoff sentinel added per Phase 0 ADR #22 pattern. |
| **Phase 5 gameplay trim ownership undeclared** | Resolved + DOC-REVIEW player-name scrub gap closed | Medium | System-Wide Impact + Unit 1.2 Step 6 — Phase 5 ships `gameplay-raw.mp4` + `gameplay-markers.json`; Phase 4 trims via `<OffthreadVideo>` ALWAYS to 540-frame target. Markers contract extended with `player_names_scrubbed: boolean` + `capture_resolution` + `source_seat_count` fields. |
| **Vitest dep missing from trailer scaffold** | Resolved | Medium (timing.test.ts has no runner) | Unit 1.1 Step 2a deepening — Vitest devDep + test scripts added to trailer package.json. |
| **`script.test.ts` drift between BEAT-SHEET.md and `script.ts`** | Low (after DOC-REVIEW simplification to id-comment-reference pattern) | Medium | DOC-REVIEW SIMPLIFICATION — test asserts every `Line.id` appears exactly once in BEAT-SHEET.md via `<!-- @line: S04-payoff -->` comment markers, NOT verbatim text match. Avoids Markdown-table parser fragility + [BEAT NNNms] verbatim-match drift. |
| **`Line` schema missing fields Phase 2 needs** | Resolved (DOC-REVIEW FEASIBILITY FIX) | High (Phase 2 would silently extend Phase 1 contract or block) | Unit 1.2 Step 0 — `Line` extended with `cueType`, `expectedFrames`, `leadFramesHint`, `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`, `skipSilenceremove`. Phase 2 deepening's required consumption surface now present in Phase 1 contract. |
| **Mixed absolute/relative frame encoding** | Resolved (DOC-REVIEW FEASIBILITY FIX) | High (Phase 4 ADR #16 audio placement would misplace scream to frame 360) | Unit 1.3 Step 2 — all frames converted to absolute. `Line.frame` invariant: `0 <= frame < TOTAL_FRAMES` AND scene-bounded. `script.test.ts` asserts both. |
| **S05 trim policy contradicted tolerance band** | Resolved (DOC-REVIEW FEASIBILITY FIX) | Medium (timing.test.ts would assert wrong invariant) | Unit 1.1 Step 2 + Unit 1.2 Step 6 — Phase 4 ALWAYS trims to 540-frame target; S05_BUDGET_MIN/MAX_FRAMES removed as exported constants; tolerance band documented as Phase 5 raw-capture constraint only. |
| **S01 visual composition unspecified** | Resolved (DOC-REVIEW DESIGN-LENS NEW) | High (Phase 4 would default to generic AI-slop opener) | Unit 1.10 — S01 block added with composition, card-flash cadence (6 cards × 6 frames hard-cut), brass-hook timing, BURNED-as-card-not-wordmark differential vs S06 closing. |
| **R15 #5 cold-decode closing card** | New (DOC-REVIEW PRODUCT-LENS RE-OPEN) | High (trailer-in-isolation loses central engineering claim) | Unit 1.9 + Unit 1.10 S06 — R15 #5 added at frame 2835 ("DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS." + subhead echoing S01 cold-open). R15 #1–#4 stay in-world diegetic. |
| **Cold-open candidate locked the wrong line** | Resolved (DOC-REVIEW PRODUCT-LENS RE-OPEN) | High (R14 cold-decode mechanism fragile under #4) | Unit 1.2 Step 2 — Candidate #5 promoted ("Briggsy didn't write this one either. He's getting good at not writing them."). Carries repeatability + autonomous-build claims explicitly. |
| **OPEN RISK: cascade content vs water-beads tiebreaker** | New (DOC-REVIEW PRODUCT-LENS RE-OPEN — Briggsy ratified KEEP + flag) | Strategic | Cascade contents are SDLC-translated engineering output (R3 brainstorm lock). This deliberately leans into "engineers talk about how it was built" side of the roadmap-named tiebreaker. **Phase 6 QA MUST screen the cut against §2 with a critical engineering peer; if dominant reaction is "wow Claude built this" rather than "I want to play this game," cascade content reopens at roadmap level.** Open risk, not pre-mitigated. |
| **OPEN RISK: Path D wall-clock delay** | Existing (DOC-REVIEW ADVERSARIAL surface) | Schedule | Unit 1.3 split into 1.3a (Path A/B/C-conditional, fires on Phase 0 exit) + 1.3b (Path D-conditional, waits 1-3 weeks for actor delivery). Phase 2 begins against 1.3a subset; Phase 2 Unit 2.X Path-D ingestion gated on 1.3b. Open until Phase 0 path resolves. |
| **OPEN RISK: Phase 4 variable-axis font spike outcome** | New (DOC-REVIEW FEASIBILITY surface re: ADR #18) | Medium (typography re-lock if spike fails) | Phase 4 Unit 4.0 reserves 60-min spike for variable-axis weight resolution in MP4 export. Phase 1 typography lock is PROVISIONAL pending spike. Fallback path: ship per-weight static woff2 files (15 files via `pyftsubset`). |
| **OPEN RISK: Phrasing! close acceptability** | New (DOC-REVIEW PRODUCT-LENS) | Low (worst case: drop Phrasing! at Phase 2 cold-read) | S06 close rewritten to "Hold it tight." → Phrasing! — innuendo shape Phrasing! actually responds to. If a pre-Phase-2 cold-read says it still doesn't land, drop Phrasing! beat entirely (S06 ends on "Hold it tight." silence). |

---

## Open Questions

### Resolved (cross-references)

All locked decisions live in their owning Unit. DOC-REVIEW SCOPE-
GUARDIAN TRIM: the prior section restated 32 decisions already
present in the Units; removed in favor of this cross-reference
table.

| Decision | Locked in | Notes |
|----------|-----------|-------|
| Scene count (6) | Unit 1.1 Step 4 | |
| Cold-open line | Unit 1.2 Step 2 | DOC-REVIEW: Candidate #5 promoted |
| Per-cue wps band | Critical Constraints | DOC-REVIEW: Phase-1-authored; Phase 2 validates |
| Cascade payoff line | Unit 1.2 Step 5 | DOC-REVIEW: collapsed to 4-word truth-collision |
| Stat 4 source-fix | Unit 1.2 Step 5 + Unit 1.6 Step 3 | DOC-REVIEW: "on the research budget" matches ActRoster |
| S06 close + Phrasing | Unit 1.2 Step 7 | DOC-REVIEW: "Hold it tight." → earned Phrasing! |
| Per-line voice + frame table | Unit 1.3 Step 2 | DOC-REVIEW: absolute frames; extended Line schema |
| R4 share reading | Unit 1.3 Step 4 | DOC-REVIEW: "of voiced runtime" canonical; hedge removed |
| Path A/B/C vs D unit split | Unit 1.3 Step 3a | DOC-REVIEW: 1.3a fires immediately; 1.3b waits for Path D |
| Transition vocabulary (5) | Unit 1.4 Step 1-2 | bare `<Series>` + overlay components; no `<TransitionSeries>` |
| Dossier-wipe direction | Unit 1.4 Step 2 row 3 | DOC-REVIEW: left-to-right reveal; clip-path corrected |
| R3 cross-dissolve → hard cut | Unit 1.4 Step 2 | |
| Cascade spatial layout | Unit 1.5 Step 1-2 | sequential revelation; meaning-stack disambiguated |
| Decayed-stat coordinates | Unit 1.5 Step 3 | DOC-REVIEW: inside safe-square; 4-row coord table |
| HTP rendering method | Unit 1.5 Step 6 | DOC-REVIEW: UMB script confirmed selector-agnostic |
| Goofy stats (4 finalists) | Unit 1.6 Step 3 | DOC-REVIEW: Stat 4 source-fixed + hat audit pre-gate |
| Cold-read gate threshold | Unit 1.6 Step 4 | DOC-REVIEW: per-reviewer-floor consensus |
| Music source type | Unit 1.7 Step 1 | DOC-REVIEW: per-track marketplace tier elevated |
| Music-cue map | Unit 1.7 Step 5 | ramped envelopes; no cliffs |
| Typography stack | Unit 1.8 | DOC-REVIEW: JBM weight '100 900'; no copy step (ADR #15); Phase 4 spike caveat |
| Color tokens | Unit 1.8 Step 5 | Radix scale+step (--color-cream-12 etc.) |
| R15 chrome copy (5 instances) | Unit 1.9 | DOC-REVIEW: #5 cold-decode closing card added |
| S01-S06 visual environment | Unit 1.10 | DOC-REVIEW: S01 added; briefing-room layered-simultaneous tightened; CASE BANNER per-scene table |
| script.ts machine contract | Unit 1.2 Step 0 | DOC-REVIEW: Line type extended with 7 Phase-2 fields |
| Frame-encoding invariant | Unit 1.2 Step 0 + Unit 1.3 Step 2 | DOC-REVIEW: absolute frames only |
| BEAT-SHEET.signoff sentinel | Unit 1.1 Step 0 + ADR #22 | DOC-REVIEW: machine-readable freeze gate |
| Phase 5 gameplay contract | Unit 1.2 Step 6 + System-Wide Impact | DOC-REVIEW: scrub policy + capture_resolution + source_seat_count fields added |
| S05 trim policy | Unit 1.1 Step 2 + Unit 1.2 Step 6 | DOC-REVIEW: always trim to 540 target |

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

### New Open Questions Surfaced by Deepening + Document-Review

- **Cold-viewer engineering decode**: ~~R15 chrome alone doesn't carry
  the "built by autonomous agents" signal for cold Twitter/X
  viewers.~~ **DOC-REVIEW CLOSED:** R15 #5 closing card added at
  frame 2835 explicitly carries the cold-decode load. R15 #1–#4 stay
  in-world diegetic + engineering-peer-confirmation. Phase 7
  distribution copy provides the wrapper, but the trailer-as-
  artifact-in-isolation now stands on its own.
- **Phase 0 cadence-spec wps band**: ~~Phase 0 Unit 0.2 Step 0 should
  declare the wps band.~~ **DOC-REVIEW CLOSED:** Phase 0 declares
  qualitative register; Phase 1 declares quantitative band as
  Phase-1-authored provisional defaults. Phase 2 first-batch TTS
  validates. No Phase 0 reopen needed.
- **HTP local-dev capture URL**: BURNED's deploy migration in progress
  (TODO §1). Capture script targets `localhost:5173/howtoplay.html`
  during Phase 3 execution; verify dev server is running. If migration
  lands first, capture against `briggsy007.workers.dev` /
  `burned-cxa.pages.dev` instead.

**DOC-REVIEW PASS opened these:**

- **Cascade content vs water-beads tiebreaker (Briggsy-ratified
  KEEP + Phase 6 QA screen).** Cascade contents are SDLC-translated
  engineering output (R3 brainstorm lock). This deliberately leans
  into "engineers talk about how it was built" — the side of the
  roadmap-named tiebreaker that water-beads is supposed to win.
  Phase 6 QA MUST screen the rendered cut against §2 with a
  critical engineering peer; if dominant first-watch reaction is
  "wow Claude built this" rather than "I want to play this game,"
  cascade content reopens at roadmap level. Open risk.
- **Phase 4 variable-axis weight resolution (ADR #18 spike).**
  Remotion `loadFont()` docs don't explicitly document range
  syntax. Phase 4 Unit 4.0 reserves a 60-min spike to validate
  variable-axis weight resolution in MP4 export. Phase 1 typography
  is PROVISIONAL pending outcome. Fallback path: per-weight static
  woff2 files via `pyftsubset --variation-instance="wght=N"`.
- **Phrasing! close acceptability (pre-Phase-2 cold-read).** Rewritten
  S06 "Hold it tight." → Phrasing! carries innuendo shape, but the
  Phrasing! beat earning is subjective. Pre-Phase-2 cold-read with
  N=2 Archer-aware listeners — if both say it doesn't land, drop
  Phrasing! beat (S06 ends on "Hold it tight." silence).
- **Phase 5 player-name scrub policy execution.** New Phase 1 contract
  requires Phase 5 to either capture with synthetic test names OR
  obtain written consent. Open until Phase 5 deepening absorbs the
  contract + commits to a path.
- **Citation verification for all `src/client/...:lines` references.**
  4+ ghost references caught during prior deepenings (CaseBanner.tsx,
  --color-mahogany, --color-burn-fire, burned-display.woff2). Add a
  Phase 1 verification step running grep/glob over every cited path
  + line range; document outcomes in
  `videos/trailer/sample-eval/beat-sheet/citation-verification.md`.

---

## Documentation / Operational Notes

- All Phase 1 artifacts land in `videos/trailer/BEAT-SHEET.md` and
  `videos/trailer/sample-eval/beat-sheet/`.
- BEAT-SHEET.md is the canonical contract for Phases 2–4. Briggsy's
  signoff freezes it; late edits require explicit Phase 1 reopening.
- **`BEAT-SHEET.signoff` sentinel (DOC-REVIEW SECURITY-LENS NEW per
  Phase 0 ADR #22 pattern):** Phase 1 exit produces a sha256-of-
  artifact + git-author-verified sentinel file at
  `videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff`. Phase
  2 Unit 2.1 (which reads `script.ts`) asserts sentinel existence
  before proceeding. Prevents autonomous Phase 2 execution from
  consuming an unfrozen BEAT-SHEET.md.
- `timing.ts` exports are the single source of truth for frame
  numbers. Phase 4 scene files MUST import frame constants by name —
  no magic numbers (linted by Phase 4 convention).
- Cold-read gate (Unit 1.6) and tone reapplication (Unit 1.2) are
  listener-judgment passes; no automated test substitutes.
- Stats are verified against authoritative sources per
  `feedback-stats-single-source.md` — never working-memory recall.
- **Citation verification (DOC-REVIEW ADVERSARIAL NEW — 4+ ghost
  references caught during prior deepenings).** Before Phase 1
  freeze, run grep/glob over every `src/client/...:lines` reference
  in BEAT-SHEET.md + this plan. Confirm each path exists and the
  cited line range exists. Document outcomes in
  `videos/trailer/sample-eval/beat-sheet/citation-verification.md`.
  Pattern enforcement prevents the next CaseBanner.tsx / --color-
  mahogany / --color-burn-fire / burned-display.woff2 ghost-
  reference shape.

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
- Card art: `public/assets/cards/*.webp` excluding `_archive/` subdir (17 unique webp — verified 2026-05-17 via `Glob` with `_archive/` exclusion). Operative portraits (6): `dash-barlowe`, `vera-khan`, `sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`. Action cards (11): `back-channel`, `burn-the-files`, `burned`, `call-in-a-favor`, `direct-order`, `extraction`, `falsify-intel`, `go-dark`, `intel-briefing`, `intercepted`, `reassign`. **DOC-REVIEW (P3 polish):** count excludes `public/assets/cards/_archive/` subdirectory — a recursive count would yield different totals. Trailer cascade consumes 6 of these 11 action cards (`burned`, `intercepted`, `burn-the-files`, `extraction`, `intel-briefing`, `direct-order` — per Unit 1.10 S03 lock).
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

**Music sourcing (DEEPENING + DOC-REVIEW — date-stable obligations
only; litigation-procedural status stripped per scope-guardian P2-4):**
- Artlist Pro: https://artlist.io ($199/yr — covers portfolio site + Twitter/X for personal/commercial accounts). Social tier $120/yr excludes portfolio embedding.
- Epidemic Sound Pro: https://www.epidemicsound.com (~$204/yr) — equivalent commercial coverage.
- Musicbed Individual ($329-$1,208/yr) / Business ($1,099-$2,428/yr) — over budget for portfolio-piece.
- Marmoset / Songtradr per-track marketplace — $30-$200/track for hand-picked. **DOC-REVIEW: elevated to second-tier-before-Suno** for portfolio-piece risk profile.
- Suno: https://suno.com (Pro $10/mo, Premier $30/mo). ToS obligations (date-stable): perpetual commercial-use license, no copyright vesting in outputs, AI-generated-audio disclosure required on some platforms. **Check current Suno ToS at execution time** for any updates to the obligations. (Litigation procedural status removed per doc-review — date-stale at plan-execution time; ToS-derived obligations are what matter.)
- **Udio:** DEAD as commercial-fallback (Nov 2025 settlement — in-platform streaming/remixing only; no `.mp3` export).
- Mid-century reference points: Bacharach, Mancini Pink Panther underscore, Brubeck Take Five.

**Remotion documentation (DOC-REVIEW SCOPE-GUARDIAN TRIM — Phase 4
consults docs at execution time; Phase 1 cites the architectural
decision, not the API surface):**
- Bare `<Series>` composition: UMB v3 `TrailerV3.tsx:28-56` precedent.
  Architecture decision locked in Unit 1.4 Step 1; Phase 4 implements.
- `loadFont()` variable-axis range syntax: PROVISIONAL pending Phase
  4 Unit 4.0 spike (ADR #18).
- Audio composition-level placement per ADR #16: Phase 4 owns
  implementation; Phase 1 provides `Line.leadFramesHint` field.

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
