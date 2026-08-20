# The Torture Chamber — Campaign 1 battle plan

> **Status: DRAFT — awaiting Briggsy's eye. Nothing below is a build order until he ratifies it.**
> Proposed 2026-08-20 (9 days out, draft unscheduled). A side experiment, explicitly subordinate
> to draft-day readiness: it dies instantly if it ever competes with the advisor-mode mock, the
> ~Aug 27 refresh, or the 48-hour freeze.

## Objective

Find defects in the **draft POLICY** — the lineup-delta queue, the ladder, the ENDGAME forcing,
the K/DEF deferral — that only fire in room shapes we have not met. The proof such defects exist
is [insight 030](insights/030-the-naive-queue-replayed-to-five-quarterbacks.md): replaying **one**
recorded room found the naive queue drafting nine WRs and five QBs, and the fix was worth
**+391.8 startable VORP**. We have never run a thousand rooms. This campaign runs thousands.

## Non-goals — measured dead, imported as constraints

- **Not a re-ranking.** Four independent kills stand: opponent priors lost to always-guess-WR
  (022), availability negative in our room (027), the curve 2.55× overstated at RB1 (023), and
  backtest arms that never clear 2σ (024). The board's ordering is not the patient here.
- **Not opponent prediction.** 022's verdict — *nothing predicts* — is a design input, not an
  obstacle. Synthetic rooms are a **behavior ensemble spanning plausible room-space**, never a
  model of a named manager. Measured room facts (no K before round 10, 18/18 · TE waits past R5,
  15/18 · first QB earlier than the ADP board says, 6/7 distinct drafts) enter as scenario
  **bounds**, never as predictions.
- **Not "unbeatable."** The target is **unexploitable**: a policy with no structural leak. In an
  8-team room the season is won elsewhere; the draft's job is to not lose it.

## The unit under test

**Queue-top drafted unattended, through the real code path** — the same pathway
`scripts/replay_mock.py` used to gate the lineup-delta queue. That is simultaneously the
blown-clock actor (auto-pick drains queue-top), the floor of the advisory (THE CALL is queue-top
plus judgment), and the cleanest formalization we own. Briggsy's human overlay is explicitly NOT
simulated; every finding is framed as "what auto-pick or the four lines would have done."

🚨 **The chamber must drive `precompute_ladder.py` + `draft-kit/lineup_value.py` as they ship** —
not a reimplementation. A fast in-process copy is permitted ONLY under the U3 discipline: two
runtimes proven equal, cross-checked on sampled rooms every run, hard-fail on divergence.

## Design decisions

**D1 — Room ensemble.** Eight behavior archetypes fill the seven non-us seats, drawn per room:
ADP-faithful (FFC ADP + rank noise — the repo's own thesis about this league) · need-aware
ADP (Sleeper-autopick-shaped: fills starters, defers K/DEF) · consensus-faithful (ECR + noise) ·
room-facts-constrained (the three measured near-unanimous facts as hard bounds) · chaos
(heavy-tailed reaches, random run-seeding) · and three adversaries: **the sniper** (takes our
queue-top whenever picking immediately before us), **the run-starter** (ignites positional runs),
**the early-QB seat** (a scenario shaped like the room's measured tendency, used as stress, not
forecast). Rank-noise σ is **swept**, not chosen — findings must survive the sweep (022 says we
cannot know the true σ; a finding tuned to one σ is a finding about the σ).

**D2 — Two oracles, because self-scoring is circular.** The policy greedily maximizes
lineup-delta, so scoring it by lineup-delta against dumb rooms is insight-005 tautology bait.
Therefore: (a) **structural invariants** are the primary defect detector — violations are
findings regardless of score; (b) board-VORP lineup value is used only for **relative**
comparisons between policy variants inside identical rooms; (c) where a score claim matters,
final rosters are re-scored against **realized historical season draws** under
`backtest_board.py`'s leakage discipline, the only reality-anchored yardstick we own.

**D3 — The invariant catalog is Phase 0 and is read from source, never from memory.** Candidate
invariants (to be verified against what the code actually promises before they become oracles):
every mandated slot filled at draft end · no unavailable/duplicate pick · ENDGAME forcing fires
exactly at picks-remaining == open-mandated-slots and every pick thereafter fills one · no second
QB while a mandated slot can still go unfillable (the pick-85 lesson) · the queue-can't-fill-a-
mandated-slot warning fires when true · 16-round shape (the REAL draft) as primary, 15-round as
secondary — the #94 worked example already documents the tail differing between them.

**D4 — The chamber must fail a rigged patient before we trust it on the real one.** Positive
controls, all mandatory before Phase 2 results are readable: reproduce insight 030's exact
replay numbers (695.4 board-order / 1087.2 lineup-delta) through the new harness · a
deterministic no-noise room whose full 128-pick sequence is hand-computable, asserted exactly
(the 021 closed-form law) · **planted policy mutants** — ENDGAME forcing removed, K/DEF deferral
removed, board-order queue restored — each must be CAUGHT by the invariants or the score
collapse. A chamber that cannot detect a planted regression cannot detect a real one.

**D5 — Compute is Python; agents are judgment.** A draft is ~128 pool operations; the real-path
cost gets **profiled first** and scale follows the measurement (target: ≥1k rooms on the pure
real path; more only via a proven-equal fast path per the U3 rule). Agents fan out for what
parallelizes cleanly — scenario authoring, invariant review, adversarial verification, analysis —
while the simulator core is **single-owner** (it is one coupled system; the fan-out-vs-coupling
lesson applies). Verification fleets never verify their own findings.

**D6 — Finding discipline, the insight-030 template.** Candidate → **minimal reproduction**
(smallest room + pick sequence that triggers it) → adversarial verifier that did NOT find it
tries to kill it → cost quantified (startable VORP or slot-unfillable) → only then does it reach
Briggsy. Anything that dies in verification is logged as died-in-verification, not deleted —
false alarms are calibration data for the chamber itself.

**D7 — Blast radius: zero.** The chamber writes to its own sandbox. It has no code path to the
live board, `ladder.json`, or cargo — same probe discipline as `--long-td-probe` and
`availability.py`. Policy FIXES (not chamber code) ship only after: adversarial confirmation,
tests + planted mutants pinning the fix, Briggsy's ratification, and never inside the 48-hour
freeze. Agent fleets sweep their scratch files; the suite runs centrally at the end (the
2026-08-19 six-builder session found the one cross-cutting break exactly that way).

## Phases and gates

| Phase | Work | Gate to pass |
|---|---|---|
| 0 | Inventory the real code paths (`replay_mock`'s drive mechanism, `_synth`, importability) + write the invariant catalog FROM SOURCE | Briggsy has seen the catalog; every invariant cites the line that promises it |
| 1 | Simulator core (single owner) + room ensemble | All D4 controls green: 030 reproduced exactly, closed-form room exact, every planted mutant caught |
| 2 | Scenario battery: full ensemble × σ sweep × adversaries, 16-round primary | Loop-until-dry: two consecutive new-scenario rounds with zero new invariant violations |
| 3 | Adversarial verification of every candidate; minimal repros | Every surviving finding has a repro + an independent kill attempt on record |
| 4 | Ratified fixes + pinning tests/mutants; insight write-up; sweep scratch; full suite | Suite green centrally; findings doc in Briggsy's hands |

**Campaign hooks (same validated simulator, later):** Campaign 2 — greedy vs one-step lookahead,
pre-registered noise floor measured from seed variance BEFORE the comparison runs; my stated
prior is greedy holds in an 8-team room, and confirming that is a freeze-with-confidence result.
Campaign 3 — the Seat Book, all eight seats deep-simulated pre-`draft_order`; output speaks in
**conditions and orderings only** (a percentage would smuggle the killed availability model back
in through the banned list's own front door).

## Risk register — how this experiment could lie to us

- **Self-measurement** (021): mitigated by closed-form controls and the two-oracle split.
- **Synthetic rooms fit every room but ours** (027's shape): mitigated by exact league shape
  (8-team, 2-FLEX, full-PPR, 16 rounds), σ-sweep robustness, and structural-not-statistical
  findings as the primary product.
- **Builder's bias — we built the queue, we want it to pass:** mitigated by adversarial actors,
  planted-mutant sensitivity proof, and verifiers independent of finders.
- **A green chamber read as a clean policy:** only claimable after D4 proves the chamber can
  catch what it is being asked to catch. "0 findings" from an unproven instrument is insight 008's
  zero — it reads like a finding and means nothing.

## Success criteria — pre-registered

1. **Primary:** every candidate defect either survives adversarial verification with a minimal
   repro and a quantified cost, or is logged as killed. Zero survivors after a mutant-verified
   chamber and a dry battery = a genuine clean bill for the policy — a shippable result.
2. **Secondary:** the validated simulator itself, which is the entire cost of Campaigns 2 and 3.
3. **Explicitly not a success metric:** simulated wins/points against the ensemble. That number
   is the tautology this plan exists to avoid quoting.
