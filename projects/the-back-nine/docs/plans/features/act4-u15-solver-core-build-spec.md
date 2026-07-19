# U15 — The Solver Core — build spec (council-ratified)

> **Identity:** Act 4's second unit (`U15` — search / objective / select / cancel / profile
> under `src/engine/solver/`), gated by U14's harness (plan contract #1).
> **Provenance:** the pre-build council **wf_45d9d56b-d1c** (full bench, 21 agents, zero
> crashes, **high 8/10, RATIFY-W/-AMENDMENTS, action: execute**, tier: council-decided;
> `docs/council-log.md` top row, 2026-07-18). The forward seams it inherited were written
> into plan 4's U14 stamp first (700319e8) so this charter reads from a durable home.
> **The honesty-hawk's veto fired + was HONORED** (§S0). Two red-team amendments are
> **PROMOTED TO BLOCKING**: the dispersed-world fixture (§S2) and the complete
> household+candidate-set fingerprint (§S0).
> **Precedence:** this spec supersedes `docs/plans/4-recommendation.md`'s Unit-15 section
> where they conflict; elsewhere the plan body + its dated supersession block stand.
> One reviewable commit, no riders (insight 051). **U15 ships NO user-facing surface**
> (the GoalPicker + every rendered beat are U16's) — no Caddie walk; the harness IS the
> reviewer. The Q6 store/worker touches are wiring, not chrome: every user-READ state they
> emit is a structured flag+label consumed later, never copy authored here.
> **⚑ Digest (his eye, shipped-at-high-confidence):** the trend-unit CALENDAR (co-runway
> preferred vs immediate-follow) + the profile-informed pending-state character.

## S0 — the honored veto: close BOTH mint bindings (lands FIRST)

**The false belief the veto kills:** an un-fingerprinted token attests "THIS household's
recommendation is validated" while proving only that SOME household passed —
`mintedOver` binds no household (oracleToken.ts:288-295) and `RankingStabilityReport`
carries counts/seeds only (rankingStability.ts:66). U14's single in-line call site made
that harmless; U15's solve entry is the second consumer being born (insight 020's shape).

1. **The COMPLETE run-derived fingerprint.** A pure `solverRunFingerprint(params,
   candidates)` derives — from the run's own **built** params + the **enumerated** roster,
   never a hand-maintained list — every ranking-affecting input: per-person per-bucket
   balances, the Tier-2 goal, `heirBracket`, the budget/spending inputs, horizon + dates,
   people (ages/filing), the overlay feature flags, and the **full ordered candidate-id
   list**. **NOT `consumedConstantEntries`** — red-team-falsified as HOUSEHOLD-BLIND
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
   moved-witness idiom (insight 093: a guard over a subset passes reallocation).
4. **`solverCandidateId` widened with PROVENANCE — SAME commit.** The collision is MODAL,
   not exotic: `candidates.ts` and a `userBaseline` both mint `taxable-first:0` when the
   user's current strategy is the common default. Widen the id with its provenance
   (`grid:` / `baseline:` / `conventional:` arms — injective by construction); **widen,
   never dedup** (two same-shaped candidates with different provenance are both real
   points with different jobs). Every existing fixture's `expectedRankingIds` updates in
   the same edit — the committed hand-derivations do not change, only their labels.
5. **The solver-code VERSION STAMP is minted here** (the runway ratification's hard
   requirement): a `SOLVER_CODE_VERSION` constant in `src/engine/solver/`, carried on the
   solve payload, bumped on any ranking-affecting change (discipline comment + shape
   test). U17 owns its persistence + the re-entry consumption; U15 only mints and emits.

## S1 — `objective.ts`: the thin adapter (Q1 — CONSUME, never re-score)

- **The ONE scoring home is the harness:** `evaluate.ts`'s `scoreFromDistribution` +
  `rankCandidates` + `candidateTieBreak` (the plan-contract-#4 reference ranking, already
  fixture-validated). `objective.ts` is a **thin adapter** — it maps the chosen Tier-2
  goal to the statistic the harness already computes and forwards; it hosts **no parallel
  scorer** (a solver-native scorer pins finitely many fixtures and drifts between them —
  the seam contract evaluate.ts:5-13 names for exactly this council).
- **Export the module-private `tier2`** (evaluate.ts:155) so `select.ts` composes shrinkage
  and tie-break on the one orientation — no re-derived sign conventions.
- The lexicographic contract is unchanged from the plan: Tier-1 survival floor in the
  spine's `X of 10`; survival-equivalence decided by the **A-side CRN-difference selection
  tie-tolerance**, never the B display band; Tier-2 = the goal's statistic in the exact
  units the headline renders (objective ≡ headline, contract #4 — locked).

## S2 — the Q2 resolution rule + the BLOCKING dispersed-world fixture

- **ONE statistic ranks AND displays.** Contract #4 forbids ranking on a mean while
  displaying a quantile — two definitions of "leave more" to one user is the calm-but-wrong
  shape. Whatever statistic survives this section is BOTH the selection quantity and the
  rendered quantity.
- **The blocking amendment (red-team-proven):** `caseLeaveMore` is DEGENERATE for this
  question — r=0 / deterministic / tieTolerance:0, every path identical, so
  mean = median = every quantile and a mean→robust switch passes `expectedRankingIds`
  byte-identically. That proves TYPING, not the switch (DND 012). **Author the
  dispersed-world hand-derived ORDERING fixture FIRST:** a small-N explicit-paths world
  (hand-enumerable path outcomes — the zero-return read-off technique generalized to a
  hand-summable dispersed set) where the candidate ordering under the mean provably
  DIFFERS from the ordering under the downside statistic, both derived exactly by hand.
- **The resolution rule (the council's, verbatim):**
  - **Tractable + exact** → the leave-more statistic goes **downside-aware**
    (median / low-quantile of after-tax-to-heirs), ranked AND displayed; the fixture joins
    the committed oracle battery as the switch's living proof.
  - **Intractable** (the closed form cannot be made exact on a dispersed world without
    loosening tolerance — insight 091 forbids buying tractability with tolerance) → the
    **mean ranks** (the architect's dissent wins by default: `expectedRankingIds` stays
    genuinely oracled), the grade carries the per-path robustness, and the mean's skew is
    **disclosed adjacent** wherever the figure renders (a U16 copy obligation, recorded on
    the solve payload as a structured flag — never silent).
  - Either exit ships honest; **neither ships without the fixture attempt on the record**
    (a dated note in this spec's build stamp: tractable/intractable + why).
- The grade's robustness axis stays what the fold built: a separate per-path CRN axis over
  the ranked vectors (insight 093), finiteness-first — never a second ranking authority.

## S3 — `search.ts`: rank, never re-decumulate

- Consumes the SHARED `candidates.ts` enumerator + `applyCandidate` (the one apply seam)
  — U15 imports, never re-implements; each candidate runs the existing spine + overlays
  through the same per-year update the manual controls drive.
- **Reduce-to-spine inherited, test-pinned:** conversion-0 + conventional order is
  byte-identical (same seed) to the validated spine distribution — the goldens are never
  perturbed by the solver layer.
- **Identical CRN draws across all K candidates** (contract #5) — the U14 K-candidate
  stability check runs over this exact set (the shared module is the proof).
- **The labeled baselines:** the user's CURRENT strategy is forced into the set (a custom
  per-bucket order = an out-of-grid labeled baseline point scored on the same draws); the
  conventional-order / conversion-0 candidate is ALWAYS present (the no-change oracle case
  and the shrinkage prior both require it). Provenance ids from S0.4 keep every arm
  distinct.
- **A/B discipline:** selection on seed-set A; seed-set B (the `deriveSeedB` family)
  carries every displayed figure + the grade. Both evaluated per candidate — the profile
  (§S6) budgets both plus the m-draw B-family, never extrapolates from one.
- Legality is the enumerator's (RMD-first sentinels, already shipped + mutant-proven) —
  `search.ts` never scores an infeasible candidate.

## S4 — `select.ts`: shrinkage + deterministic selection (Q3)

- **The mechanism (ratified):** a **deterministic** shrinkage of each candidate's seed-A
  **advantage over the conventional prior** toward zero, keyed to the **ALREADY-BUILT
  CRN-difference SE** (the selection tie-tolerance substrate — no second constant, no new
  calibration surface). An advantage that **survives** shrinkage displaces the
  conventional pick; a known-dominant strategy survives unchanged. A-side only; a pure
  exported seam (insight 048 — never an honesty gate inlined where tests can't drive it).
- **The prior is the conventional taxable-first ordering — NEVER the user's custom**
  (shrinking toward the user's own habit would launder the status quo into advice).
- **BLOCKING tests (the council's second promoted amendment — shrink-then-argmax is a NEW
  unoracled selection surface):**
  1. the **insight-025 shrinkage calibration case**, deferred from U14 by design: a
     planted near-tie between two non-conventional candidates defaults to the
     conventional (shrunk) pick unless an advantage survives; a known-dominant candidate
     is unaffected;
  2. the **zero-shrinkage identity**: with the shrinkage term forced to zero, `select()`'s
     winner ≡ `rankCandidates(...)[0]` on every committed oracle fixture — the new
     surface collapses provably onto the oracled one.
- Selection then = quantized lexicographic over shrunk scores + `candidateTieBreak` (the
  harness's fixed tie-break: policy enum order → amount → years); the winner + the
  **retained runner-up** (R23) byte-reproducible from `(model, seedA, seedB, goal)`.
- **The surplus-regime flag** ships per the plan: raw pre-clamp Tier-1 governs
  equivalence; the flag trips ONLY when A and B agree within the over-funded ε — both
  disagreement directions test-pinned (no false "safe either way"; no pivot on an A-side
  survival-edge pick).
- **The demotion margin stays FAIL-CLOSED (Q4d):** `assertDemotionAxisCalibrated` keeps
  its throw; the pay-less-tax (dollar-axis) conversion near-tie margin is a **scale-free
  SE-multiple calibrated ONLY on a Medicare-bearing post-trend-flip world** — so it CANNOT
  be calibrated in U15 (the trend constant is unsourced; a pre-flip calibration would
  under-price the IRMAA cliff, the conversion payoff channel — insight 091). The solve
  path routes this refusal to a **structured withheld state** (never an uncaught worker
  throw). Unreachable live while conversions are trend-blocked; the routing is
  planted-seam-tested anyway.

## S5 — the solve entry, the gate, the wire (Q5 + Q6)

- **`solve()` takes the `OracleClearedToken` as a REQUIRED parameter** (compile-level,
  contract #1) and additionally REFUSES a fingerprint mismatch (§S0.2) — order AND
  identity both enforced.
- **Build against the live fail-closed trend gate (Q5, ratified):** conversion-bearing
  candidate sets stay `medicare-trend-unsourced`-blocked BY DESIGN; sequencing-only sets
  mint and rank today. **Every withheld conversion lever is NAMED with its direction** in
  the structured output (insight 092 — a silently-dropped channel is an abstention, not a
  pass): the payload enumerates which candidates were withheld and why, so U16 can say
  "conversions aren't ranked yet" honestly instead of rendering a silently-shrunken space.
  The trend unit + the post-flip margin calibration remain the **HARD pre-exposure
  blocker** for any conversion recommendation (co-runway preferred — ⚑ digest).
- **The goal precondition:** the chosen-goal field ships in v1 on the model —
  **additive-in-v3, NO schemaVersion bump** (the runway supersession already ruled the
  bump narrative counterfactual) — with an explicit **unset sentinel** (burned/062); the
  solve is never dispatched while unset, and no Tier-1-only tie-break is ever crowned as
  advice. The bucket precondition (never run on a defaulted split) stands as the plan
  wrote it.
- **The wire shape** (plan, unchanged): ONE structured payload — full seed-B distributions
  for winner + retained runner-up + no-action baseline (buffers on the transfer list),
  scalar lexicographic scores for the pruned field; grade + named-driver +
  surplus-regime + withheld-lever enumeration + `SOLVER_CODE_VERSION` ride as structured
  clone.
- **The TIER-LESS pending arm (Q6):** the solve's dispatch/pending/committed lifecycle in
  `memoryModel` mirrors U12's tier-less arm — every user-READ state is a structured
  flag+label, no fabricated tier, no copy authored in this unit; the pending-state
  CHARACTER (what the wait feels like) is decided AFTER `profile.ts` reports real numbers
  (⚑ digest — his eye may re-cut it).

## S6 — `cancel.ts` (SPLIT) + `profile.ts` (commit-after-core) — Q6

- **cancel.ts, the ratified split:** the **commit-epoch guard is UNCONDITIONAL** — a
  superseded solve NEVER commits (the Act-2 request-epoch discipline extended; the guard
  exists whatever the solve's speed). **Mid-solve cooperative abort granularity**
  (checking between candidates / between seed-sets) is **gated on the profile's
  measurement** — built only if solves are slow enough for staleness to be user-felt.
  Purity: the engine side takes an injected `shouldAbort?: () => boolean` — the caller
  owns the epoch; the engine reads no environment.
- **profile.ts ships IN this unit as commit-after-core** (lands after the core solve path
  is green, same reviewable commit): measures the REAL worst case — longest horizon,
  largest cliff-anchored grid (most active thresholds → most pinned points + bisection),
  both the pre-65 ACA and post-65 IRMAA regimes, BOTH seed-sets plus the m-draw held-out
  B-family — on the reference device. **Purity:** `profile.ts` is pure and takes an
  injected `now: () => number` (the seed-injection idiom; `performance`/`Date` stay
  lint-banned in `src/engine/**`) — the worker shell / a script supplies the clock.
- **The WASM trigger is measured, never guessed;** the port stays deferred. The bounded
  fallback ladder ships with the unit: coarse-then-refine (cliff anchoring applied around
  survivors), the stated candidate-count ceiling, and the honest degrade (explicitly
  labeled reduced-path interactive solve + full-precision confirm — never a silent
  down-sample below the held-out path floor).

## S7 — the proof battery

- **The plan's test scenarios stand** (golden reduce-to-spine; K-candidate CRN;
  lexicographic floor-absolute; objective≡headline planted-divergence; byte-identical
  deterministic selection; surplus-regime both disagreement directions + the sub-ε
  rounding arm; the labeled no-action baseline incl. the custom-order arm; goal + bucket
  preconditions refused; spending immutable; compute fallback; cliff-anchored grid;
  legality; cancellation commit-epoch; the contract-#1 gate integration; the profile
  integration) — plus this spec's additions: the S0 moved-witness battery, the S2
  dispersed-world fixture (or its dated intractability record + the disclosure flag), the
  S4 zero-shrinkage identity + insight-025 case, the S5 withheld-lever enumeration.
- **Planted mutants, red→reverted, named killers** (the standing discipline): at minimum —
  a fingerprint-blind mint (S0), a parallel scorer smuggled into objective.ts (S1), a
  mean/quantile display-vs-rank split (S2), shrinkage toward the user's custom prior (S4),
  a trend-blocked conversion silently scored as a recommendation (S5), a stale solve
  committing past the epoch guard (S6). Never `git checkout --` on a dirty tree — Edit
  only (the standing landmine).
- **Gates:** full suite + typecheck + lint (engine purity — profile/cancel injection
  seams hold it) + `verify:doc-stats` + `verify:aca` + `verify:bundle` (the solver is
  engine-side; entry-JS delta expected ≈ 0 — the worker chunk is the watch) + CI green by
  explicit run id. `/ultramode-code-review` at the boundary; insights distilled; docs
  synced one pass (README / roadmap You-Are-Here / TODO / this spec's build stamp).
