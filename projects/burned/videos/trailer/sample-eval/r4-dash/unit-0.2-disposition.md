# Unit 0.2 Disposition — R4 Dash TTS Cadence-Match Gate

> **Phase 0 Unit 0.2 closure record.** Step 5 winner selection
> executed via single-reader fallback (per plan §Step 0.5 step 6;
> continued through Step 4). Engine matrix produced 8 of 9 cells;
> Reader A (Briggsy) audited and elected a winner.

## Status

**✅ CLOSED 2026-05-18 — Path A (ElevenLabs) locked as winning engine.**

Final voice tuning deferred to Phase 4 trailer assembly per
plan-aligned "engine bake-off picks the engine; voice refinement
happens during render."

## Winner

| Field | Value |
|---|---|
| Engine | **ElevenLabs v3** (model_id `eleven_v3`) |
| Path | **Path A** (Voice Library preset) |
| Voice | **Roger — Laid-Back, Casual, Resonant** |
| Voice ID | `CwhRBWXzGAHq8TQ4Fs17` |
| Adapter | `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json` |
| Char-budget consumed | 2.81% (2,814 / 100K, May 2026 cycle) |

## Reader A audition (Briggsy, 2026-05-18)

Three-engine bake-off auditioned on paragraphs 1 + 2 + 3 (8 clips).
Free-form reaction:

> *"OpenAI — too robotic. ElevenLabs prolly the best although Gemini
> was very good as well."*

Interpretation against cadence-spec §5 three-band rubric:

| Path | Voice | Free-form signal | Band |
|---|---|---|---|
| Path C-OpenAI | onyx | "too robotic" | **Floor** — synthetic gravity well; OpenAI's `instructions` parameter insufficient to humanize the read |
| Path C-Gemini | Charon | "very good" | **Target Band** (secondary candidate) |
| Path A (ElevenLabs) | Roger | "prolly the best" | **Target Band** (winning candidate) — note hedge phrasing carried forward as Phase 4 refinement signal |

## Phase 4 carry-forward sub-notes

The hedge in "prolly the best" is a real signal — the read is inside
Target Band but not WOW'd. The trailer assembly phase should
exercise ElevenLabs's downstream tunability before committing to the
final mix:

1. **Voice_settings tuning headroom.** Roger was generated at
   `stability=0.70, style=0.15, speed=0.95`. Test alternates:
   - `style=0.05` for more compression (closer to deadpan briefer)
   - `stability=0.80` for tighter F0 spread (closer to §3.1 monotone)
   - `speed=0.92` for more deliberate pace (closer to §3.2)
2. **Alternate Voice Library voices.** Roger scored 6 in the auto-
   pick; Daniel (authoritative news-anchor archetype) and other
   ranked alternates were not auditioned. Re-pick if the trailer's
   actual narration script needs different archetype emphasis.
3. **Warburton-adjacent register flag** (carried from Step 0.5
   preflight). Avoid voice library options that overshoot into
   recognizable-actor cluster.
4. **Bracket-tag policy refinement.** The adapter prescribes
   `[deadpan]` + `[exhale]` + `[sarcastic]` + `[shouts]` at specific
   anchor phrases. Step 4 trailer mix should test whether each tag
   improves vs. degrades vs. the voice_settings baseline alone —
   tags can over-perform.
5. **Path B (voice clone) opportunity.** Skipped this run per opt-in
   protocol. Briggsy's own voice via Instant Voice Cloning remains a
   creative option for the trailer narrator — would land in
   Phase 4 as an alternate-path test if elected.

## Dropped engines

| Path | Voice | Reason | Recovery option |
|---|---|---|---|
| Path C-OpenAI | onyx | Reader A "too robotic" — Floor. The `instructions` parameter approach can't shake the synthetic gravity well even with ~700 words of cadence steering. Alternate voices (ash, echo, verse, sage, marin, cedar) and per-paragraph 250-word instruction splits documented in `cadence-spec-openai.md` §3 but NOT exercised. | Re-test with alternate voice / per-paragraph split if Phase 4 wants to revisit. Not blocking. |
| Path C-Gemini | Charon | Reader A "very good" — Target Band, but Path A leading. Plus the scream paragraph hard-blocked by Gemini's prompt-level safety filter (`PROHIBITED_CONTENT`), which would force a multi-engine final mix if Gemini were selected as primary. | Available as backup engine if Path A fails any Phase 4 / 6 acceptance gate. |

## Path B (voice clone) — not exercised this run

Skipped per opt-in protocol. Adapter (`cadence-spec-elevenlabs.json`
§path_B_voice_clone) carries the full recording-conditions +
retention-policy + post-Phase-0 cleanup procedure. If elected during
Phase 4, the workflow is:

1. Record 10s neutral text (cardioid mic, quiet room, peak -12 dBFS)
2. Verify ElevenLabs deletion-on-request procedure with throwaway clone first
3. Submit Path B sample → mint clone
4. Regenerate Path B row of the matrix
5. A/B audition Path A (Roger) vs Path B (Briggsy clone)
6. Delete clone within 7 days of Phase 0 exit if not selected

## Unit 0.2 Step coverage

| Step | Disposition | Artifact |
|---|---|---|
| 0 | ✅ shipped 2026-05-17 | `cadence-spec.md` |
| 0a | ✅ scaffolded 2026-05-17; probe re-run all-green 2026-05-18 | `account-readiness.md`, `char-budget.json` |
| 0.5 | ✅ PASS (single-reader fallback) 2026-05-18 | `preflight/preflight-decision.md`, `preflight/gemini-spec-test.wav` |
| 1 | ✅ scaffolded 2026-05-17 | `sample-script-dash.ts` |
| 1.5 | ✅ shipped 2026-05-18 | `cadence-spec-elevenlabs.json`, `cadence-spec-gemini.md`, `cadence-spec-openai.md` |
| 2 | ✅ 8 / 9 generated 2026-05-18 | `matrix/results.md` + 8 audio files (gitignored) |
| 3a | **N/A — skipped** | Hosting decision unnecessary because Step 4 listener panel was bypassed. |
| 3 | ✅ scaffolded 2026-05-17; not executed | `MUSHRA-protocol.md` (preserved for future revivals) |
| 4 | **N/A — skipped** | WebMUSHRA listener panel bypassed; Reader A audition produced clear winner. Plan §Step 0.5 step 6 fallback path applied (continued through Step 4 by extension). |
| 5 | ✅ this document | Winner locked: Path A (ElevenLabs Roger). |

## Authoritative pointers

- Engine adapter (winning path): `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- Matrix evidence: `videos/trailer/sample-eval/r4-dash/matrix/results.md`
- Reader A audition record: this document, §"Reader A audition"
- Char-budget tracker: `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Preflight (Step 0.5) sign-off: `videos/trailer/sample-eval/r4-dash/preflight/preflight-decision.md`
- Plan source-of-truth: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.2

## Phase 0 progress after Unit 0.2 closure

- **Unit 0.1 (scaffold):** ✅ shipped `e5ca0d7e`
- **Unit 0.2 (R4 Dash TTS):** ✅ CLOSED this disposition
- **Unit 0.5 (composite-viability spike):** ✅ CLEARED `b971d3d6`
- **Unit 0.6 (R5 scream Sterling-Cameo Eval):** pending — next active work
- **Unit 0.4 (tone prototype):** gated on Unit 0.6 closure
- **Unit 0.3 (R14 cold-open decode):** gated on Unit 0.4 closure

`PHASE-0-EXIT.md` will consolidate all five dispositions when Phase 0
closes; this document is the durable Unit 0.2 record that the exit
doc cites.
