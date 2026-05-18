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
| Reader identity | _UNFILLED_ |
| Auditioned at | _UNFILLED_ |
| Free-form reaction (~30s) | _UNFILLED_ |
| Band disposition | _UNFILLED — one of `Floor` / `Target Band` / `Ceiling`_ |
| Benjamin / Sterling Archer / catchphrase reference volunteered? | _UNFILLED — Yes / No (Yes triggers Ceiling per cadence-spec §5.2)_ |
| Vote | _UNFILLED — `PASS` / `FAIL`_ |

## Reader B — engineering peer, non-Archer-fan (Discord cold reader)

| Field | Value |
|---|---|
| Reader identity | _UNFILLED_ |
| Discord thread / message link | _UNFILLED_ |
| Outbound message sent at | _UNFILLED_ |
| 48 h SLA deadline | _UNFILLED_ |
| Free-form reaction (~30s) | _UNFILLED_ |
| Band disposition | _UNFILLED — one of `Floor` / `Target Band` / `Ceiling`_ |
| Benjamin / Sterling Archer / catchphrase reference volunteered? | _UNFILLED — Yes / No (Yes triggers Ceiling per cadence-spec §5.2)_ |
| Vote | _UNFILLED — `PASS` / `FAIL`_ |

## Acceptance rubric (cadence-spec §5)

| Band | Listener descriptions | Disposition |
|---|---|---|
| **Floor** (insufficient) | "generic narrator," "doesn't sound like anything in particular," "could be any audiobook," "documentary voiceover," "neutral male voice," "AI assistant," "podcast intro voice" | Re-steer — tighten Director's Notes; revise `cadence-spec-gemini.md` then re-run preflight. |
| **Target Band** (success) | "deadpan briefing voice," "spy register," "film noir," "sardonic detective," "Archer-coded register," "briefing room," "Rod Serling-adjacent," "Chandler narrator," "noir narrator," "wry / dry / arched," "Twilight Zone narrator," "world-weary," "1940s detective" | **PASS** |
| **Ceiling** (too close) | "this is impersonating Jon Benjamin," "this IS Sterling Archer," "trying to BE Archer," "Benjamin doing Archer," "literal Archer clone" | Re-spec — strip identity-suggesting characteristics from `cadence-spec.md` upstream, then revise `cadence-spec-gemini.md` then re-run preflight. |

## Disposition

| Field | Value |
|---|---|
| Final status | _UNFILLED — `PASS (Step 1.5 unblocked)` / `FAIL — revise spec` / `OVERRIDE (STEP_0_5_OVERRIDE=1, with rationale)`_ |
| Decision rationale | _UNFILLED_ |
| Step 1.5 readiness | _UNFILLED — blocked OR unblocked_ |

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
| 2026-05-18 | 1 | _pending_ | _pending_ | n/a (initial) | Initial preflight generated. |
