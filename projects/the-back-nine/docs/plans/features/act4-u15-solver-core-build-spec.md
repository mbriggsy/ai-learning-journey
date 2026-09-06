---
title: "U15 — The Solver Core — build spec (council-ratified)"
doc-type: build-spec
status: shipped
---

# U15 — The Solver Core — build spec (council-ratified)

> **Identity:** Act 4's second unit (`U15` — search / objective / select / cancel / profile
> under `src/engine/solver/`), gated by U14's harness (plan contract #1).
> **Provenance:** the pre-build council **wf_45d9d56b-d1c** (full bench, 21 agents, zero
> crashes, **high 8/10, RATIFY-W/-AMENDMENTS, action: execute**, tier: council-decided;
> `docs/council-log.md`'s 2026-07-18 U15 row). The forward seams it inherited were written
> into plan 4's U14 stamp first (700319e8) so this charter reads from a durable home.
> **The honesty-hawk's veto fired + was HONORED** (§S0). Both red-team amendments were
> **PROMOTED TO BLOCKING** and both were discharged: the complete household+candidate-set
> fingerprint (§S0) shipped, and the dispersed-world fixture (§S2) was attempted in full and
> came back INTRACTABLE, so the council's Intractable exit shipped instead (the mean ranks;
> the skew is disclosed).
> **Precedence:** this spec supersedes `docs/plans/4-recommendation.md`'s Unit-15 section
> where they conflict; elsewhere the plan body + its dated supersession block stand.
> One reviewable commit, no riders (insight 051). **U15 shipped NO user-facing surface**
> (the GoalPicker + every rendered beat are U16's) — no Caddie walk; the harness was the
> reviewer. The Q6 store/worker touches are wiring, not chrome: every user-READ state they
> emit is a structured flag+label consumed later, never copy authored here.
> **The two calls shipped at high confidence are both settled since:** the trend-unit CALENDAR
> took the immediate-follow arm (the Medicare-cost-trend unit landed 2026-07-19, the day after
> this unit), and the pending-state CHARACTER was cut by U16's Caddie walk (2026-07-23 — the
> "few minutes" pending line).
> Per-unit build status lives in the roadmap's You-Are-Here table, never here.

## S0 — the honored veto: BOTH mint bindings closed (landed first)

**The false belief the veto killed:** an un-fingerprinted token attests "THIS household's
recommendation is validated" while proving only that SOME household passed —
`mintedOver` bound no household and `RankingStabilityReport` carried counts/seeds only.
U14's single in-line call site made that harmless; U15's solve entry was the second consumer
being born (insight 020's shape). Both shapes carry a `fingerprint` field today
(oracleToken.ts:258-269, rankingStability.ts:66) precisely because the veto fired.

1. **The COMPLETE run-derived fingerprint.** The pure `solverRunFingerprint(params,
   candidates, ranking, { seedA, tieTolerance })` lives in
   `src/engine/validation/solverRunFingerprint.ts` and derives — from the run's own **built**
   params + the **enumerated** roster, never a hand-maintained list — every ranking-affecting
   input: the whole built `SimulationParams` (a fail-closed SUPERSET of the enumerated
   list — per-person per-bucket balances, the budget/spending inputs, horizon + dates,
   people (ages/filing), the overlay feature flags all ride inside it), the Tier-2 goal,
   `heirBracket`, and the **full ordered roster** — each candidate's id plus the fields
   behind it (`policy`, `provenance`, `conversion`, `drawdownOrder`), because the id string
   is lossy where two custom orders share `baseline:custom:0`. `anchoredRail` is
   deliberately excluded: grid metadata the engine never reads is not ranking-affecting.
   The schema is `solver-run-fp/v2` — the 2026-07-19 review fold added `seedA` and
   `tieTolerance` (both ranking-affecting siblings that had lived beside the serialized
   triple). `tieTolerance`'s finiteness refusal lives one layer up, in `solve()`'s input
   validation AHEAD of the fingerprint gate (`tie-tolerance-invalid`, solve.ts:411-417) — a
   NaN tolerance admits every candidate to the survival-top set, so it is refused before any
   identity is computed.
   **NOT `consumedConstantEntries`** — red-team-falsified as HOUSEHOLD-BLIND
   (consumedConstants.ts:89-138 derives from overlay flags alone; two different households
   in one state fingerprint identically; the goal is not a constant at all).
2. **Both reports carry it; the solve entry refuses a mismatch.** The fingerprint joins
   `mintedOver` AND `RankingStabilityReport`; `solve()` refuses a token/report whose
   fingerprint differs from the run it is asked to bless — a structured refusal, never a
   silent proceed.
3. **The moved-witness battery (the vacuity arm, red-armed):** each enumerated input class
   — a balance, the goal, `heirBracket`, a budget line, a candidate id — changed alone
   MUST change the fingerprint; an inert fingerprint (identical across a genuinely-changed
   input) is a NAMED violation. Mirror of the fold's `decisionSurfaceIdentical` +
   moved-witness idiom (insight 093: a guard over a subset passes reallocation). The
   review fold grew the battery `seedA` / `tieTolerance` / conversion-window arms alongside
   the v2 schema.
4. **`solverCandidateId` widened with PROVENANCE — SAME commit.** The collision was MODAL,
   not exotic: `candidates.ts` and a `userBaseline` both minted `taxable-first:0` when the
   user's current strategy is the common default. The id carries its provenance arm
   (`grid:` / `conventional:` / `baseline:`, mapped from the `grid` /
   `conventional-baseline` / `user-baseline` provenance — injective by construction);
   **widened, never deduped** (two same-shaped candidates with different provenance are
   both real points with different jobs). Every existing fixture's `expectedRankingIds`
   was updated in the same edit — the committed hand-derivations did not change, only
   their labels. The id's home is `candidates.ts`, re-exported from
   `src/engine/reference/solver-cases/types.ts` (and on through that directory's `index.ts`)
   so every U14 import path stayed unbroken.
   The provenance-BLIND question ("is the crowned plan the one the household already
   runs?") is a separate predicate, `sameDecumulationPlan`, which compares
   `drawdownOrder` element-wise where the id is lossy.
5. **The solver-code VERSION STAMP is minted here** (the runway ratification's hard
   requirement): the `SOLVER_CODE_VERSION` constant in
   `src/engine/solver/solverCodeVersion.ts`, carried on the solve payload, bumped on any
   ranking-affecting change (discipline comment + shape test). U15 only mints and emits;
   U17 shipped its persistence + the re-entry consumption (`src/store/savedRecommendation.ts`
   invalidates a saved recommendation on `!==`, not `<`).

## S1 — `objective.ts`: the thin adapter (Q1 — CONSUME, never re-score)

- **The ONE scoring home is the harness:** `evaluate.ts`'s `scoreFromDistribution` +
  `rankCandidates` + `candidateTieBreak` (the plan-contract-#4 reference ranking, already
  fixture-validated). `objective.ts` is a **thin adapter** — it maps the chosen Tier-2
  goal to the statistic the harness already computes and forwards; it hosts **no parallel
  scorer** (a solver-native scorer pins finitely many fixtures and drifts between them —
  the seam contract evaluate.ts:5-13 names for exactly this council). The adapter is
  `rankForGoal`, test-pinned identical to `rankCandidates`.
- **`tier2` was un-privated and exported** (evaluate.ts:168) so `select.ts` composes shrinkage
  and tie-break on the one orientation — no re-derived sign conventions.
- The lexicographic contract is unchanged from the plan: Tier-1 survival floor in the
  spine's `X of 10`; survival-equivalence decided by the **A-side CRN-difference selection
  tie-tolerance**, never the B display band; Tier-2 = the goal's statistic in the exact
  units the headline renders (objective ≡ headline, contract #4 — locked).

## S2 — the Q2 resolution rule + the dispersed-world fixture verdict (INTRACTABLE)

- **ONE statistic ranks AND displays.** Contract #4 forbids ranking on a mean while
  displaying a quantile — two definitions of "leave more" to one user is the calm-but-wrong
  shape. The statistic that survived this section is the MEAN, and it is BOTH the selection
  quantity and the rendered quantity.
- **The blocking amendment (red-team-proven):** `caseLeaveMore` is DEGENERATE for this
  question — r=0 / deterministic / tieTolerance:0, every path identical, so
  mean = median = every quantile and a mean→robust switch passes `expectedRankingIds`
  byte-identically. That proves TYPING, not the switch (DND 012). So the amendment required
  the dispersed-world hand-derived ORDERING fixture FIRST — a small-N explicit-paths world
  (hand-enumerable path outcomes: the zero-return read-off technique generalized to a
  hand-summable dispersed set) where the candidate ordering under the mean provably DIFFERS
  from the ordering under the downside statistic, both derived exactly by hand — before any
  switch could ship.
- **The resolution rule (the council's, verbatim) and the exit that fired:**
  - **Tractable + exact** would have taken the leave-more statistic **downside-aware**
    (median / low-quantile of after-tax-to-heirs), ranked AND displayed, with the fixture
    joining the committed oracle battery as the switch's living proof.
  - **Intractable** (the closed form cannot be made exact on a dispersed world without
    loosening tolerance — insight 091 forbids buying tractability with tolerance) → the
    **mean ranks** (the architect's dissent wins by default: `expectedRankingIds` stays
    genuinely oracled), the grade carries the per-path robustness, and the mean's skew is
    **disclosed adjacent** wherever the figure renders (a U16 copy obligation, recorded on
    the solve payload as a structured flag — never silent).
  - **INTRACTABLE is the exit that fired** (2026-07-18, the full verdict + its derivation in
    the build stamp below): the flip is REAL and hand-derived in
    `src/engine/solver/__tests__/objective.test.ts`'s `dispersedWorld` block, but it cannot
    become an engine-run oracle fixture, so the mean RANKS and `leaveMoreSkewDisclosure`
    (`objective.ts`) carries the skew beside it. The fixture attempt is on the record, which
    was the rule's other requirement — neither exit could ship without it.
- The grade's robustness axis stays what the fold built: a separate per-path CRN axis over
  the ranked vectors (insight 093), finiteness-first — never a second ranking authority.

## S3 — `search.ts`: rank, never re-decumulate

- Built on the SHARED `candidates.ts` enumerator + `applyCandidate` (the one apply seam),
  driven through `evaluateCandidates` — U15 imports, never re-implements; each candidate
  runs the existing spine + overlays through the same per-year update the manual controls
  drive.
- **Reduce-to-spine inherited, test-pinned:** conversion-0 + conventional order is
  byte-identical (same seed) to the validated spine distribution — the goldens are never
  perturbed by the solver layer.
- **Identical CRN draws across all K candidates** (contract #5) — the U14 K-candidate
  stability check runs over this exact set (the shared module is the proof).
- **The labeled baselines:** the user's CURRENT strategy is forced into the set (a custom
  per-bucket order = an out-of-grid labeled baseline point scored on the same draws; since
  2026-08-03 that baseline also carries the household's OWN conversion when they run one, an
  amount the rail-anchored grid has no reason to contain); the conventional-order /
  conversion-0 candidate is ALWAYS present and `search.ts` REFUSES a set without it (the
  no-change oracle case and the shrinkage prior both require it). Provenance ids from S0.4
  locate every arm — never a lossy `policy:amount` match.
- **A/B discipline:** selection on seed-set A; seed-set B (the `deriveSeedB` family)
  carries every displayed figure + the grade. Both evaluated per candidate — the profile
  (§S6) budgets both plus the m-draw B-family, never extrapolates from one.
- Legality is the enumerator's (RMD-first sentinels, already shipped + mutant-proven):
  over-headroom amounts sit in `CandidateSet.rejected` and never reach `search.ts`, which
  scores exactly the set it is handed and NEVER re-filters. A candidate feasible by headroom
  that hits a typed per-path `SimInfeasible` is folded by `evaluateCandidates` into an
  `infeasible` outcome and ranked WORST — never a dropped path, never a throw that aborts
  the batch.

## S4 — `select.ts`: shrinkage + deterministic selection (Q3)

- **The mechanism (ratified):** a **deterministic** shrinkage of each candidate's seed-A
  **advantage over the conventional prior** toward zero, keyed to the **ALREADY-BUILT
  CRN-difference SE** (the selection tie-tolerance substrate — no second constant, no new
  calibration surface). An advantage that **survives** shrinkage displaces the
  conventional pick; a known-dominant strategy survives unchanged. A-side only; a pure
  exported seam (insight 048 — never an honesty gate inlined where tests can't drive it).
- **The prior is the conventional taxable-first ordering — NEVER the user's custom**
  (shrinking toward the user's own habit would launder the status quo into advice).
- **The two BLOCKING tests (the council's second promoted amendment — shrink-then-argmax is a
  NEW unoracled selection surface) are live in `select.test.ts`:**
  1. the **insight-025 shrinkage calibration case**, deferred from U14 by design: a
     planted near-tie between two non-conventional candidates defaults to the
     conventional (shrunk) pick unless an advantage survives; a known-dominant candidate
     is unaffected;
  2. the **zero-shrinkage identity**: with shrinkage forced off, `selectRecommendation`'s
     winner ≡ `rankCandidates(...)[0]` on every committed oracle fixture — the new
     surface collapses provably onto the oracled one.
- Selection then = quantized lexicographic over shrunk scores + `candidateTieBreak` (the
  harness's fixed tie-break: policy enum order → amount → years); the winner + the
  **retained runner-up** (R23) byte-reproducible from `(model, seedA, seedB, goal)`.
- **The surplus-regime flag** shipped per the plan: raw pre-clamp Tier-1 governs
  equivalence; the flag trips ONLY when A and B agree within the over-funded ε — both
  disagreement directions test-pinned (no false "safe either way"; no pivot on an A-side
  survival-edge pick).
- **The demotion margin stays FAIL-CLOSED (Q4d):** the conversion near-tie margin is a
  **scale-free SE-multiple**, and its calibration CLASS was measured on the **SURVIVAL axis
  only** (the Medicare-bearing post-trend-flip worlds, 2026-07-19) — so a conversion-winner
  near-tie on a **dollar** statistic is UNCALIBRATED and refuses rather than silently
  comparing against a survival-measured multiple (a pre-flip calibration would have
  under-priced the IRMAA cliff, the conversion payoff channel — insight 091). The condition
  has ONE home, `demotionAxisCalibrated` (`src/engine/validation/gradeCalibration.ts`): the
  grade path throws on it via `assertDemotionAxisCalibrated`, and `select.ts` reads the same
  predicate — conjoined with the surplus-regime flag, since it is the surplus regime that puts
  the grade on the goal's DOLLAR axis — to route the refusal to a **structured withheld state**
  (`reason: 'demotion-axis-uncalibrated'`, the refused axis INTERPOLATED into `detail`, never a
  shared literal that could say "pay-less-tax" to a leave-more household) — never an uncaught
  worker throw. **The refusal is REACHABLE
  live** (it stopped being unreachable on 2026-07-19, when the sourced trend cleared the
  token's trend clause and conversion candidates began ranking), and since 2026-08-03 BOTH
  goals route through it — `leave-more` used to fall through to `gradeCalibration`'s plain
  throw and no longer does.

## S5 — the solve entry, the gate, the wire (Q5 + Q6)

- **`solve()` takes the `OracleClearedToken` as a REQUIRED parameter** (compile-level,
  contract #1) and additionally REFUSES a fingerprint mismatch (§S0.2) — order AND
  identity both enforced.
- **Built against the live fail-closed trend gate (Q5, ratified):** the conversion/sequencing
  partition DERIVES from the token's Medicare-trend clause — never a hardcoded filter. At
  build time the clause blocked (`medicare-trend-unsourced`), so conversion-bearing sets were
  withheld by design and sequencing-only sets minted and ranked. **The clause has been CLEAR
  since 2026-07-19** (the Medicare-cost-trend unit sourced `medicareCostTrend` and
  `PART_B_PRICING_MODE` became `'trended'`), so the whole roster ranks, conversion
  candidates included. The blocking arm is still live code, not dead: if the clause ever
  re-blocks (a vintage regression flipping the entry back to unsourced), the conversion
  subset drops out of ranking and **every withheld lever is NAMED with its reason and its
  anchored-rail direction** in the structured output (insight 092 — a silently-dropped
  channel is an abstention, not a pass), so U16 renders a disclosed gap instead of a
  silently-shrunken space. That pre-sourcing posture is exercised by test through the pure
  `_evaluateMedicareTrendClause` seam, and a re-wire tripwire proves the partition still reads
  the clause end-to-end. What remains outstanding for a conversion recommendation is the
  dollar-axis demotion margin (§S4), not the trend.
- **The goal precondition:** `chosenGoal` rides the scenario model —
  **additive-optional within schemaVersion 3, NO bump** (the runway supersession already ruled
  the bump narrative counterfactual) — and the explicit **unset sentinel is ABSENCE**
  (burned/062): an unchosen goal is the field undefined, never a plausible default. The solve
  is never dispatched while unset (`memoryModel`'s `goal-unset` blocked arm), and no
  Tier-1-only tie-break is ever crowned as advice. The codec `needVocab`-gates it against
  `RECOMMENDATION_GOALS`, so an out-of-vocab string is corruption named loud rather than
  coerced to a goal the user never picked. The bucket precondition (never run on a defaulted
  split) shipped in TWO shapes: engine-side `solve()` refuses a run carrying no tax overlay
  (`reason: 'bucket-precondition'`), and store-side it reaches the household as the typed
  builder refusal `no-pretax` — one of the two `SolveBlockReason` arms beside `goal-unset`
  (`spine-unready` is the other). The store name is a 2026-07-23 re-cut: the earlier
  builder-NULL convention collapsed every unbuildable draft into one `buckets-defaulted` gap
  whose note told a false accounts story on a facts-broken re-dispatch.
- **The wire shape** (plan, unchanged): ONE structured payload — full seed-B distributions
  for winner + retained runner-up + no-action baseline (buffers on the transfer list),
  scalar lexicographic scores for the pruned field, marked never-rendered; grade +
  named-driver + surplus-regime + withheld-lever enumeration + `SOLVER_CODE_VERSION` ride as
  structured clone. `packSolveWire` (engineProtocol.ts) and `solveFromWire` (engineWire.ts)
  are the two halves; the token is minted and consumed entirely inside `solveWithMint`, so it
  never crosses the wire. The review fold added the per-arm **floor track** a budgeted
  household's distribution carries, packed presence-keyed.
- **The TIER-LESS pending arm (Q6):** the solve's dispatch/pending/committed lifecycle in
  `memoryModel` mirrors U12's tier-less arm — every user-READ state is a structured
  flag+label, no fabricated tier, no copy authored in this unit. The pending-state
  CHARACTER (what the wait feels like) was deliberately deferred past `profile.ts`'s real
  numbers and was cut in U16 — the Caddie walk's "few minutes" pending line (2026-07-23).

## S6 — `cancel.ts` (SPLIT) + `profile.ts` (commit-after-core) — Q6

- **cancel.ts, the ratified split:** the **commit-epoch guard is UNCONDITIONAL** — a
  superseded solve NEVER commits (the Act-2 request-epoch discipline extended; the guard
  exists whatever the solve's speed). `shouldCommitSolve` is the seam, wired into
  `memoryModel.commitSolve`. **Mid-solve cooperative abort granularity** (checking between
  candidates / between seed-sets) was **gated on the profile's measurement** — built only if
  solves are slow enough for staleness to be user-felt: U15 shipped the seam plus COARSE
  per-stage checkpoints, and the finer per-candidate checkpoints and the live worker-epoch
  transport are still deferred. Purity: the engine side takes an injected
  `shouldAbort?: () => boolean` — the caller owns the epoch; the engine reads no environment.
- **profile.ts shipped IN this unit as commit-after-core** (landed after the core solve path
  was green, same reviewable commit): it measures the REAL worst case — longest horizon,
  largest cliff-anchored grid (most active thresholds → most pinned points + bisection),
  both the pre-65 ACA and post-65 IRMAA regimes, BOTH seed-sets plus the m-draw held-out
  B-family. **Purity:** `profile.ts` is pure and takes an injected `now: () => number` (the
  seed-injection idiom; `performance`/`Date` stay lint-banned in `src/engine/**`) — the
  caller-side runner `scripts/profile-solver.ts` supplies the clock, and it is not a CI gate.
  The first datapoints came off the DEV LAPTOP (below); the **reference-device** measurement
  was the WASM trigger and the knob-pin event.
- **The WASM trigger is measured, never guessed;** the port is still deferred — no WASM
  ships. The bounded fallback ladder shipped with the unit (`src/engine/solver/fallback.ts`):
  coarse-then-refine (cliff anchoring applied around survivors), the candidate-count ceiling,
  and the honest degrade (explicitly labeled reduced-path interactive solve + full-precision
  confirm — never a silent down-sample below the held-out path floor; the grade and every
  displayed figure always run at `solverMinBPaths`). Its three knobs shipped as `-1`
  fail-closed sentinels and were **PINNED 2026-07-22** by the reference-device calibration
  (`scripts/calibrate-fallback.ts`, U16 council wf_8d4c6f65-415 Q3 — pinned on RANK
  STABILITY, never latency): 4,000 interactive search paths, a 5-candidate ceiling, 2 coarse
  survivors, each with its measurement in the constant's own citation. The ladder is still
  READY-not-consumed — no shipped path reads a knob, because U16's interactive tier is
  deferred on record.

## S7 — the proof battery

- **The plan's test scenarios stood, and every one has a live test** — the sweep that
  proved it, plus the two gaps it found and authored, is in the build stamp below (golden
  reduce-to-spine; K-candidate CRN;
  lexicographic floor-absolute; objective≡headline planted-divergence; byte-identical
  deterministic selection; surplus-regime both disagreement directions + the sub-ε
  rounding arm; the labeled no-action baseline incl. the custom-order arm; goal + bucket
  preconditions refused; spending immutable; compute fallback; cliff-anchored grid;
  legality; cancellation commit-epoch; the contract-#1 gate integration; the profile
  integration) — plus this spec's additions: the S0 moved-witness battery, the S2
  dispersed-world fixture (which landed as its dated intractability record + the disclosure
  flag), the S4 zero-shrinkage identity + insight-025 case, the S5 withheld-lever
  enumeration.
- **Planted mutants, red→reverted, named killers** (the standing discipline): six were
  planted and each was killed by a named test — a fingerprint-blind mint (S0), a parallel
  scorer smuggled into objective.ts (S1), a mean/quantile display-vs-rank split (S2),
  shrinkage toward the user's custom prior (S4), a trend-blocked conversion silently scored
  as a recommendation (S5), a stale solve committing past the epoch guard (S6). Never
  `git checkout --` on a dirty tree — Edit only (the standing landmine).
- **Gates:** full suite + typecheck + lint (engine purity — profile/cancel injection
  seams hold it) + `verify:doc-stats` + `verify:aca` + `verify:bundle` (the solver is
  engine-side; entry-JS delta ≈ 0 — the worker chunk is the watch) + CI green by
  explicit run id. All ran green at close; `/ultramode-code-review` ran at the boundary
  (its fold is stamped below), insights were distilled, and the docs were synced one pass
  (README / roadmap You-Are-Here / TODO / this spec's build stamp).

## Build stamp

### 2026-07-18 — §S7 the proof battery: scenario sweep + 2 authored gaps + 6 planted mutants + FULL gates (UNIT CLOSED)

**The sweep.** Every plan §S7 scenario has a LIVE test, cited (not duplicated) in the build handoff — reduce-to-spine, K-candidate CRN, objective≡headline, deterministic selection, surplus (both directions + sub-ε), no-action baseline incl. custom-order, goal/bucket preconditions, compute fallback (the fail-closed sentinel form), cliff-anchored grid (the just-under law + case iii), legality, cancellation commit-epoch, the contract-#1 gate, the profile, and the spec additions (S0 moved-witness, S2 dispersed-world, S4 zero-shrinkage + insight-025, S5 withheld-lever).

**Two GAPS the sweep found and authored (no live test existed):**
1. **Lexicographic FLOOR-ABSOLUTE (R21)** — every committed oracle fixture is survival = 1.0, so none exercised the survival PARTITION. NEW `select.test.ts` battery: `rankCandidates`/`selectCore` crown the higher-survival candidate over a strictly-better-Tier-2 candidate sitting outside the tolerance (shrinkage on AND off); a widened tolerance flips it (non-vacuity).
2. **Spending immutable (contract #8a)** — no live test. NEW `search.test.ts` battery: `applyCandidate` preserves the budget line for every provenance arm; `CandidateStrategy` carries no budget key (immutable by construction); `runSearch` mutates no field of the base.
   *(A third — "the shrinkage prior is the conventional baseline, never the user's custom" — was authored as the mutant-#4 killer: the insight-025 tests pass `conventionalIndex` explicitly to `selectCore`, so nothing caught a `selectRecommendation` anchor flip.)*

**The 6 planted mutants (each RED→reverted, Edit-only, killer named in the handoff):** a fingerprint-blind mint (killed by the S0 moved-witness), a parallel scorer in `objective.ts` (killed by the rankForGoal≡rankCandidates identity), a mean/quantile display-vs-rank split (killed by the S2 "MEAN ranking crowns A"), shrinkage toward the user's custom prior (killed by the new anchor test), a trend-blocked conversion silently scored (killed by the withheld-lever enumeration), a stale solve committing past the epoch guard (killed by `shouldCommitSolve` + the store's stale-discard test).

**Gates (all green):** typecheck + lint clean; the full suite **2677 tests / 143 files** (+7 vs S6's 2670 — floor-absolute 3 + anchor 1 + spending 3; NO new files); `pnpm build` OK; `verify:bundle` **249.7 KiB ≤ 300** (UNCHANGED — every S7 edit is test-side, entry-JS delta = 0); `verify:doc-stats` OK (README + roadmap reconciled to 2677/143); `verify:aca` OK. No user surface (U16's) — no Caddie walk.

### 2026-07-18 — §S6 the cancel/profile split + the fallback ladder + the FIRST profile datapoint (dev-laptop)

**cancel.ts (`src/engine/solver/cancel.ts`, NEW) — the ratified split, both halves PURE + exported (insight 048):**
- `shouldCommitSolve(resolvedEpoch, committedEpoch)` — the UNCONDITIONAL commit-epoch guard (a superseded solve NEVER commits, whatever its speed), finiteness-FIRST (a NaN epoch never commits — the `setLatestEpoch` posture). Wired into `memoryModel.commitSolve` (replacing the inline `<=` check); the existing "commits the NEWER solve and DISCARDS a stale in-flight one" store test now exercises the seam, and a NEW "HOLDS on a cooperatively-ABORTED solve" store test pins the hold.
- `abortRequested(shouldAbort)` + `solveAborted(detail)` + the `SolveAborted` named bin (`kind: 'aborted'`, insight 092). The injected `shouldAbort?: () => boolean` seam is threaded through `solveWithMint` (checkpoints: before the harness gates; after stability, before the mint) AND `solve` (before the K-candidate search; before the grade B-family) — each returns the `aborted` bin, plain-data across the wire (`packSolveWire`/`solveFromWire` carry it verbatim; the store HOLDS it, never renders it). **Granularity DEFERRED per §S6:** the live worker-epoch transport (a `setLatestSolveEpoch` analog + a macrotask yield) + finer (per-candidate) checkpoints wait on the profile's numbers — U15 ships the seam + coarse per-stage checkpoints, test-driven (`cancel.test.ts` drives every checkpoint; deleting any goes red).

**profile.ts (`src/engine/solver/profile.ts`, NEW) — PURE, injected `now: () => number`** (the seed-injection idiom; `performance`/`Date` stay lint-banned in `src/engine/**`). `profileSolve(request, now)` times one full `solveWithMint` against a single-`simulate` baseline; refuses a non-finite/backwards clock (a lying clock is a measurement fault, never a datapoint) and an indeterminate/infeasible baseline (validation cost is not compute cost); surfaces `payloadKind` so a short-circuited solve (token-withheld / mint-failed / aborted) can NEVER masquerade as a measured full solve (the `outcomeKind` discipline). The caller-side runner **`scripts/profile-solver.ts`** (OUTSIDE `src/engine`, supplies `() => performance.now()`, NOT a CI gate) records the first datapoint.

**THE FIRST PROFILE DATAPOINT (dev-laptop, NOT the reference device — the reference-device measurement is the WASM trigger + the knob-pin event):** worst-case shape = 16,000 paths × 45 yr, an 8-candidate roster (3 sequencing + a 5-amount cliff-anchored conversion grid), tax overlay (IRMAA regime), the m=5 held-out B-family, both seed-sets — a `recommended` (full-solve) measurement. **This world was healthcare-BLIND and the review fold re-measured it a day later (2026-07-19): single simulate 1.57 s, full solve 72.4 s, ratio 45.9× — those are the numbers to carry.** The under-measured originals, kept for the shape they proved:
- single `simulate` (16k × 45, overlay) ≈ **1.29 s**
- full `solveWithMint` ≈ **48.1 s**
- ratio ≈ **37.4×** a single simulate — **LINEAR in the candidate count**, matching the stated budget shape (≈ 2·|roster| + 2·|rankable| + 2·m + O(1) = 16 + 6 + 10 + probe ≈ 37). No super-linear regression.
- **Reading:** a synchronous full-precision solve at either number is FAR past any interactive window — so the fallback ladder (the interactive/full split + coarse-then-refine) and the mid-solve cooperative-abort seam are load-bearing, and the WASM port question is live. The DECISION (enable mid-solve abort, its granularity, the interactive path count, the candidate ceiling) waited on the reference-device number, per §S6; the three ladder knobs were pinned there on 2026-07-22, and the mid-solve abort granularity is still deferred.

**The fallback ladder (`src/engine/solver/fallback.ts`, NEW) — sentinel-guarded, not guessed (burned/062):** the `SolveComputeTier` (`interactive`/`full-precision`) + `CoarseThenRefinePlan` structured shapes; the three tuning knobs (`solverInteractivePaths`, `solverCandidateCeiling`, `solverCoarseSurvivors`) are `sourced(-1)` out-of-range sentinels (`methodology-substrate` — pinned by MEASUREMENT, never read by the oracle token nor any ranking; NOT added to the canonical constants registry — compute-routing, not a dated figure); `assertFallbackCalibrated()` THROWS while any knob is un-tuned (the `assertDemotionAxisCalibrated` posture — the U16 router cannot route on a guessed threshold). The core U15 solve consumes NONE of them (it ranks the full set at the base's path count) — they shipped READY + FAIL-CLOSED. `fallback.test.ts` proves the sentinel bites. **All three knobs were PINNED 2026-07-22** by the reference-device calibration (`scripts/calibrate-fallback.ts`): 4,000 interactive search paths, a 5-candidate ceiling, 2 coarse survivors — so the guard no longer bites, and no shipped path reads a knob yet.

Gates: `pnpm typecheck` + `pnpm lint` clean; the full suite **2670 tests / 143 files** green (+124 tests / +10 files across U15's S0–S6); `verify:doc-stats` reconciled (README + roadmap You-Are-Here). No user surface (U16's) — no Caddie walk.

### 2026-07-18 — §S2 the dispersed-world fixture verdict: **INTRACTABLE → the architect's default ships** (mean ranks; skew disclosed)

The blocking amendment was attempted in full and **the ordering flip is REAL** — it is derived
exactly by hand in `src/engine/solver/__tests__/objective.test.ts` (the `dispersedWorld` block):
a right-skewed after-tax-to-heirs world where candidate A ranks FIRST on the mean (480 vs 300)
and B ranks first on the median / p10 (300 vs 100) — the mean and the downside statistic produce
the **exact reverse** ordering, both derived by hand and both re-checked through the REAL
`scoreFromDistribution` + `distributionSkew`.

**But it CANNOT become an engine-run oracle fixture** (a `SolverCaseFixture` graded via `simulate`
with exact `expected()`), so the RANKING statistic **cannot** be switched to a downside quantile
without moving the ranking onto an un-oracled quantity:

1. Every exact oracle world is **zero-vol / fixed-horizon** — there mean = median = every quantile,
   so `caseLeaveMore` is degenerate for this question by construction (as §S2 itself states). A
   deterministic fixture can never distinguish a mean switch from a median switch.
2. The engine's **only** dispersion sources are (a) market returns via Box-Muller
   (`rng.standardNormal` = `Math.sqrt`/`Math.log`/`Math.cos` — not hand-derivable, and per CLAUDE.md
   not bit-identical across JS engines) and (b) the mortality table (whose by-hand re-derivation
   re-implements the engine → proves typing, not correctness → DND-012). A dispersed ledger cannot be
   made exact without loosening tolerance, and **insight 091 forbids buying tractability with tolerance.**

**Resolution shipped (the council's Intractable exit, verbatim):** the **mean RANKS** (the
deterministic battery genuinely oracles `expectedRankingIds`); the grade's per-path CRN axis carries
robustness (insight 093); and the mean's skew is **disclosed, never silent** via
`leaveMoreSkewDisclosure` (`objective.ts`) — a structured flag carrying the ranked mean beside the
median + p10 + skew direction/magnitude, riding the solve payload for U16 to voice ("the average
leans on a few lucky futures; the typical bequest is $X"; insight 092 — a dropped channel is an
abstention, not a pass). The disclosure is **never a second ranking authority**: one statistic (the
mean) both ranks and is the primary display (contract #4). The dispersed-world demonstration is the
durable record of the attempt; it is deliberately a direct-to-scorer test, **not** a `SolverCaseFixture`
(it has no engine world producing those exact dispersed paths — which is precisely the intractability).

### 2026-07-19 — the `/ultramode-code-review` FOLD (review wf_284d845b-a1b · 14 lenses / 34 verified findings / zero refuted outright)

**The confirmed roots, FIXED:** (1) the solve lane's **blocked-state epoch gap** (10/10 refuter
votes, 4-lens convergence) — `dispatchSolve`'s blocked branches assigned `solveAnswer` directly, so a
stale in-flight solve resolving after a precondition regression committed a recommendation OVER the
refusal (calm-but-wrong); blocked now mints + commits through `commitSolve`, AND the resolve arms
hold unless the dispatch is still the latest (`epoch !== solveDispatchedEpoch` — the solve lane has
no worker-side cancel yet, so the epoch pair carries the WHOLE staleness discipline; the old comment
rationalizing the gap stated a false premise and is rewritten). (2) the **namedDriver probed the raw
`rankCandidates[0]` argmax while the shipped crown is the SHRUNK selection winner** (4/4) — the probe
now takes an injected `crownFor` (solve wires the real runSearch→selectRecommendation path) +
`baselineCrown` (the already-computed winner, killing the redundant baseline re-evaluation), and its
internal crown id uses `solverCandidateId` (the hand-derived pre-provenance format is dead).

**The hand-verified materiality-split folds (the 077 law — unanimous-real, split-impact, coordinator
verdict):** the **fingerprint under-included its own SolveInput siblings** — `seedA` and
`tieTolerance` are ranking-affecting but lived beside the serialized triple; both join the
fingerprint (schema `solver-run-fp/v2`), `tieTolerance` gains a finiteness refusal
(`tie-tolerance-invalid`), and the moved-witness battery grows seedA/tieTolerance/conversion-window
arms. The **winner-positive paired-diffs convention had TWO homes** (solve.ts's private copy vs
gradeCalibration's private `pairedGoalDiffs`) — consolidated to ONE exported
`pairedDecisionDiffs` in gradeCalibration (the leave-more arm lands there; the sign convention is
numerically pinned for all three axes, sign-flip mutant proven). The **grade catch was over-broad**
— narrowed to the typed `GradeFloorRefusal`; the demotion-axis fail-closed guard and every
programming error now propagate LOUD (a fail-closed refusal must never launder to a calm
"unavailable"). A **leave-more solve without an heir bracket** refuses NAMED
(`heir-bracket-missing`) instead of throwing to compute-error. Every **goal dispatch is exhaustive**
(switch + never-guard ×4 — a third `RECOMMENDATION_GOALS` member now fails tsc, never silently
scores as leave-more). The **solve arm's wire dropped the floor track** a budgeted household's
distribution carries — `SolveArmWire` packs/reconstructs it presence-keyed (`floorReading` per arm
was REFUSED as prescribed-wrong: it is a `summarize()`-level product absent from a per-candidate
`Distribution` — if U16 wants a floor VERDICT per arm, that is a new per-arm-summarize decision, not
a packer fix). The **trend-unblock tripwire** shipped (a test that reds the day `medicareCostTrend` is
sourced, naming the two seams — the hardcoded conversion partition + the withheld-lever reason —
that must re-wire to the token's trend clause, or conversions stay silently orphaned). **It fired
the same day and its re-wire was discharged:** the partition now derives from the clause, and
`solve.test.ts`'s "conversions RANK" arm proves the whole field ranks with an EMPTY withheld
enumeration, doubling as the partition-revert mutant killer.

**THE DATAPOINT CORRECTION (an under-measurement the review caught):** the §S6 profile world carried
NO `healthcareEnabled` — the spec's own worst case demands both ACA (pre-65) + IRMAA regimes priced.
Healthcare-priced re-measurement (dev-laptop): single simulate **1.57 s**, full solve **72.4 s**,
ratio **45.9×**. The fallback-ladder/abort/WASM stakes are HIGHER than the S6 stamp read.

**Advisory, FILED (not built at U15's close):** the solve lane's draft-mutation staleness (a
committed recommendation survives an input edit un-invalidated) + the single-worker monopolization
(a 72 s solve starves the first-beat lane) = U16's router/invalidation charter, named landmines
there. **The staleness half was BUILT** — U16's stale card plus U17's `savedRecommendation`
supersession causes (`inputs-changed` / `inputs-unavailable` / `solver-changed` / `rules-changed`),
and a ranking-affecting edit during a pending solve demotes it to `stale`. The lane still runs on
ONE worker (`engineClient.ts`). The
unknown-`chosenGoal` vault-wide decode refusal = the 3rd-goal unit's forward-compat decision; the
skew-disclosure percentile convention single-sources against `confidence.ts` when U16 renders both.

**Gates (all green, coordinator-verified):** 2696 tests / 143 files; typecheck + lint clean;
doc-stats reconciled; bundle 249.7 KiB unchanged.
