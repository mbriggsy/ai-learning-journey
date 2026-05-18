# Preflight Decision — Phase 0 Unit 0.2 Step 0.5

> **Sentinel file Step 1.5 gates on.** Both readers must independently
> sign off (status: `PASS`) before Step 1.5 (full three-engine adapter
> translation + matrix generation) begins. See
> `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.2 Step
> 0.5 for the canonical procedure.

## Subject

| Field | Value |
|---|---|
| Audio file | `gemini-spec-test.wav` (this directory) |
| Duration | 14.80 s |
| Generated | 2026-05-18 (UTC — see `generation-log.md` for exact ts) |
| Model | `gemini-3.1-flash-tts-preview` |
| Voice | `Charon` (Informative — mid-baritone preset) |
| Adapter | `videos/trailer/sample-eval/r4-dash/cadence-spec-gemini.md` |
| Transcript | `PARAGRAPH_1_PREFLIGHT` — 32-word trim of paragraph 1 |
| Cadence spec | `videos/trailer/sample-eval/r4-dash/cadence-spec.md` |

## The question (asked of each reader independently)

> *Listen to this clip. Does it land in the deadpan-spy / noir-narrator
> / sardonic-detective cluster? Does it sound like a Benjamin
> impression? Answer in your own words (~30 seconds).*

## Reader A — Archer-fan (Briggsy or Harry)

| Field | Value |
|---|---|
| Reader identity | Briggsy |
| Auditioned at | 2026-05-18 (same session as generation) |
| Free-form reaction (~30s) | *"It sounds more like Patrick Warburton."* |
| Band disposition | **Target Band** (cluster-adjacent via Warburton — known deadpan-baritone-sardonic voice actor, archetype overlaps with Brock Samson / Lemony Snicket narrator). Not Floor (specific archetype, not "generic narrator"). Not Ceiling (no Benjamin / Sterling Archer / catchphrase reference volunteered). |
| Benjamin / Sterling Archer / catchphrase reference volunteered? | **No** — Warburton is a different actor; Ceiling diagnostic per cadence-spec §5.2 is specifically Benjamin / Sterling Archer name. |
| Vote | **PASS** with sub-note: register reads as identifiable-actor-archetype-adjacent (Warburton-cluster). Worth flagging into Step 2 engine matrix so Path A (ElevenLabs preset) selection avoids overshooting into a single recognizable commercial voice. |

## Reader B — engineering peer, non-Archer-fan (Discord cold reader)

| Field | Value |
|---|---|
| Reader identity | **n/a — single-reader fallback elected** |
| Discord thread / message link | n/a |
| Outbound message sent at | n/a |
| 48 h SLA deadline | n/a |
| Free-form reaction (~30s) | n/a |
| Band disposition | n/a |
| Benjamin / Sterling Archer / catchphrase reference volunteered? | n/a |
| Vote | **FALLBACK** — `single-reader fallback` flag per plan §Step 0.5 step 6. Briggsy elected this path 2026-05-18 in lieu of recruiting a Discord cold reader. Reduced confidence on cold-reader vector noted in Disposition rationale below. |

## Acceptance rubric (cadence-spec §5)

| Band | Listener descriptions | Disposition |
|---|---|---|
| **Floor** (insufficient) | "generic narrator," "doesn't sound like anything in particular," "could be any audiobook," "documentary voiceover," "neutral male voice," "AI assistant," "podcast intro voice" | Re-steer — tighten Director's Notes; revise `cadence-spec-gemini.md` then re-run preflight. |
| **Target Band** (success) | "deadpan briefing voice," "spy register," "film noir," "sardonic detective," "Archer-coded register," "briefing room," "Rod Serling-adjacent," "Chandler narrator," "noir narrator," "wry / dry / arched," "Twilight Zone narrator," "world-weary," "1940s detective" | **PASS** |
| **Ceiling** (too close) | "this is impersonating Jon Benjamin," "this IS Sterling Archer," "trying to BE Archer," "Benjamin doing Archer," "literal Archer clone" | Re-spec — strip identity-suggesting characteristics from `cadence-spec.md` upstream, then revise `cadence-spec-gemini.md` then re-run preflight. |

## Disposition

| Field | Value |
|---|---|
| Final status | **PASS — single-reader fallback (Step 1.5 unblocked pending ElevenLabs Creator key)** |
| Decision rationale | Reader A (Briggsy) volunteered "Patrick Warburton" — a recognized deadpan-baritone-sardonic voice actor (Brock Samson, Lemony Snicket narrator, Kronk). Archetype is in the Target Band cluster (cadence-spec §5.1) — not Floor (specific archetype, not "generic narrator"), not Ceiling (no Benjamin / Sterling Archer / catchphrase reference volunteered per §5.2). Single-reader fallback elected per plan §Step 0.5 step 6 in lieu of recruiting a Discord cold reader — reduced confidence on cold-reader vector accepted. **Sub-note carried forward to Step 2:** Warburton-adjacent register means Path A (ElevenLabs preset) voice selection should avoid overshooting into a single recognizable commercial voice; aim for less archetype-distinctive Voice Library options. Path C-Gemini Charon stays the validated baseline. |
| Step 1.5 readiness | **Unblocked at the spec layer.** Gating dependency is now the ElevenLabs Creator API key (OpenAI key landed 2026-05-18, ElevenLabs still missing). Re-run `pnpm check:tts` when ElevenLabs lands to refresh `account-readiness.md` before Step 1.5 begins. |

## Tiebreaker rules (plan §Step 0.5 step 5)

- **Split (one PASS, one FAIL):** No vote wins. Revise
  `cadence-spec-gemini.md` based on No-voter's specific feedback, re-run
  preflight, re-vote.
- **Both FAIL:** Spec is too generic. Revise upstream
  `cadence-spec.md`, then `cadence-spec-gemini.md`, then re-run.
- **Revision cap: 3 rounds.** After three failures, surface to Briggsy
  as a brainstorm-level question — the Sterling-CODED thesis may need
  restructuring before Phase 1.

## Fallback paths (plan §Step 0.5 step 6)

If Reader B is unreachable within 48 h:

- Harry can substitute as Reader A; Briggsy substitutes as Reader B.
  Note "Reader B was a degraded substitute; reduced confidence on
  cold-reader vector" in the Disposition rationale above.
- If neither cold-reader option is reachable: proceed with Reader A
  only AND log `single-reader fallback` in Disposition. Step 1.5 then
  gates on either single-reader PASS or explicit
  `STEP_0_5_OVERRIDE=1` from Briggsy with documented rationale.

## Revision log

| Date | Round | Reader A vote | Reader B vote | Adapter change | Notes |
|---|---|---|---|---|---|
| 2026-05-18 | 1 | PASS (Target Band, Warburton-adjacent) | n/a (single-reader fallback elected) | n/a (initial) | Initial preflight generated + signed off Reader-A-only. Sub-note: Warburton-adjacent register flagged into Step 2 Path A voice-selection. |
