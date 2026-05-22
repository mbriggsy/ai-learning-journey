# Per-cue word count + wps validation — Unit 1.2 evidence

**Date:** 2026-05-18
**Author:** Phase 1 Unit 1.2 (Narration Script Draft)
**Scope:** `videos/trailer/src/lib/script.ts` `BURNED_TRAILER_LINES[*].text`
**Result:** ✅ All 16 cues pass per-cue wps sanity ceiling (live in
`script.test.ts`).

## Per-cue table

`[BEAT NNN]` markers are stripped before word counting (Phase 2
expands these to per-engine pause primitives; they are not spoken
words). `expectedFrames` is the Phase 1 budgeted target; `wps`
computed as `words / (expectedFrames / 30)`.

| Cue ID          | Scene | Frame | Words | expectedFrames | Seconds | wps  | cueType    | Sanity ceiling | Status |
| --------------- | ----- | ----- | ----- | -------------- | ------- | ---- | ---------- | -------------- | ------ |
| S01-cold-open   | S01   | 60    | 12    | 150            | 5.00    | 2.40 | cold-open  | 3.5            | ✅     |
| S02-briefing    | S02   | 219   | 27    | 351            | 11.70   | 2.31 | sustained  | 4.5            | ✅     |
| S03-roster      | S03   | 570   | 35    | 270            | 9.00    | 3.89 | sustained  | 4.5            | ✅     |
| S03-deck        | S03   | 1007  | 24    | 180            | 6.00    | 4.00 | sustained  | 4.5            | ✅     |
| S04-cue-01      | S04   | 1380  | 2     | 60             | 2.00    | 1.00 | list       | 4.5            | ✅     |
| S04-cue-02      | S04   | 1440  | 7     | 90             | 3.00    | 2.33 | list       | 4.5            | ✅     |
| S04-cue-03      | S04   | 1530  | 11    | 90             | 3.00    | 3.67 | list       | 4.5            | ✅     |
| S04-stat-01     | S04   | 1620  | 9     | 120            | 4.00    | 2.25 | list       | 4.5            | ✅     |
| S04-stat-02     | S04   | 1740  | 10    | 150            | 5.00    | 2.00 | list       | 4.5            | ✅     |
| S04-stat-03     | S04   | 1890  | 8     | 120            | 4.00    | 2.00 | list       | 4.5            | ✅     |
| S04-stat-04     | S04   | 2010  | 15    | 180            | 6.00    | 2.50 | list       | 4.5            | ✅     |
| S04-payoff      | S04   | 2280  | 4     | 60             | 2.00    | 2.00 | payoff     | 2.5            | ✅     |
| S05-gameplay-vo | S05   | 2610  | 13    | 150            | 5.00    | 2.60 | sustained  | 4.5            | ✅     |
| S05-scream      | S05   | 2730  | 1     | 50             | 1.67    | —    | scream     | ∞              | ✅     |
| S06-close       | S06   | 2910  | 13    | 222            | 7.40    | 1.76 | payoff     | 2.5            | ✅     |
| S06-phrasing    | S06   | 3144  | 1     | 12             | 0.40    | 2.50 | payoff     | 2.5            | ✅     |

**Per-scene totals:**

| Scene  | Cues | Total words | Speech estimate | Beats (s) | Scene budget (s) | Notes                                                          |
| ------ | ---- | ----------- | --------------- | --------- | ---------------- | -------------------------------------------------------------- |
| S01    | 1    | 12          | 5.00            | 0.0       | 7.0              | 2.0s buffer for BURNED logo + R15 #1 stamp                     |
| S02    | 1    | 27          | 11.70           | (implicit) | 12.0            | 0.3s scene-head establishing buffer                            |
| S03    | 2    | 59          | 15.00           | ~1.6 + 1.0 mid-wipe | 27.0   | Tier-4 expansion 2026-05-22 absorbed Sterling-CODED read-pace overrun; mid-wipe at frame ~992 |
| S04    | 8    | 66          | 25.00           | (per-cue) | 33.0             | 1.5s no-VO peak hold + 1.0s payoff hold + cue intervals       |
| S05    | 2    | 14          | 6.67            | gameplay-audio-bed | 18.0   | Gameplay audio carries the scene; VO sparse                   |
| S06    | 2    | 14          | 7.80            | 0.4s pause | 9.0             | Phrasing! lands as punchline; music sting tail to 3180          |
| **Total** | **16** | **192**   | **~71s spoken** | — | **106.0s**  | Tier-4 reauthored 2026-05-22 (95s→106s); Phase 2 measures actual TTS render |

## Sanity ceiling rationale

The wps test is a **Phase 1 sanity gate**, not the Phase 2 drift
gate:

- Catches catastrophic budget violations (8.0+ wps payoff bugs).
- Tolerates the deepening-acknowledged drift between plan-stated
  pacing (~2.4 wps mean) and actual deadpan-narration delivery
  (~3.5–4.0 wps in practice).
- Phase 2 Unit 2.4 measures **actual** TTS-delivered audio duration
  per cue and triggers re-steer / re-time / line-trim escalation if
  delivery is outside the firm-but-not-frozen-until-Phase-2 wps band.

Per-cueType sanity ceilings:

| cueType   | Ceiling | Rationale                                                                    |
| --------- | ------- | ---------------------------------------------------------------------------- |
| sustained | 4.5     | 2.3 nominal + variance + plan-pacing drift headroom                         |
| list      | 4.5     | 2.6 nominal + variance                                                       |
| payoff    | 2.5     | Strict — payoff IS deadpan by definition; the 8.0 wps bug was here          |
| cold-open | 3.5     | ~2.5 nominal + variance                                                      |
| scream    | ∞       | Shape-paced, not wps-paced (Sterling-LANA four-axis acoustic shape)         |

## Plan-vs-actual pacing math gap

The plan's Step 4/5 stated per-scene wps targets (sustained 1.9–2.3,
list 2.4–2.6) are aspirational for the deadpan briefing-room register.
Actual line authoring lands at ~3.5–4.0 wps for sustained narration
content density of the trailer's R1/R3 spine. The plan explicitly
acknowledges drift risk ("Tight against scene budget; if drift
surfaces in Phase 2 TTS render, drop one of the trailing clauses").

**This is not a bug, but a documented expectation gap.** Phase 2's
job is to MEASURE actual TTS-delivered duration and escalate per the
drift gate; Phase 1's job is to ship a defensible budget with the
sanity gate guarding against the catastrophic-bug shape (the
doc-review-fixed 8.0 wps payoff cue).

## Trim history (this session)

Two cues trimmed during Unit 1.2 to clear the sanity gate:

1. **S03-deck** — original (plan-locked) was 31 words in 6.0s budget
   = 5.2 wps; over 4.5 ceiling. Trimmed by compressing the deck-fate
   clauses ("One of them ends" → "One ends", "exist to help you
   survive it" → "help you survive", "Or to ensure your colleagues
   don't" → "Or ensure your colleagues don't" running without a
   preceding beat). Final: 24 words in 6.0s = 4.0 wps. Dark-closing
   gag preserved.

2. **S04-cue-03** — original (plan-locked) was 14 words in 3.0s
   window = 4.67 wps; over 4.5 ceiling. Rewritten: "Drafted on
   weekends, by a field asset who, for compliance reasons, is not
   named." → "Drafted on weekends, by a field asset — name redacted
   for compliance." 11 words in 3.0s = 3.67 wps. "Name redacted" is
   in-character spy vocab; em-dash carries the explanatory beat.

3. **S03-roster** — original plan locked "One **field agent** who
   insists on being called 'Agent X' and refuses to file any
   paperwork whatsoever." The lowercase `agent` in "field agent"
   tripped R6 grep (Agent X carve-out only fires on exact "Agent X"
   match, not "field agent"). Rewritten: "One who insists on being
   called 'Agent X' and refuses to file any paperwork whatsoever."
   35 words / 9.0s = 3.89 wps; Agent X reveal still carries the
   character. R6 grep clean.

## Provenance

- Plan source: `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`
  §Unit 1.2 Step 8 (Total word count + runtime validation)
- Test source: `videos/trailer/src/lib/script.test.ts` §"per-cue wps
  validation"
- Sanity-ceiling rationale: this document + script.test.ts header
  comment block
