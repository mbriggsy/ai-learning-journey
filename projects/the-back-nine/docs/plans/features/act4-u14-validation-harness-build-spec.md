# U14 — The Solver Validation Harness — build spec (council-ratified)

> **Identity:** Act 4's first unit (`U14`, the oracle that GATES U15 — plan contract #1).
> **Provenance:** the Act-4 runway reconciliation (Briggsy's GO 2026-07-18): the 8-agent
> ground-truth audit **wf_1369c7e7-698** (per-agent reports in its journal) → the pre-build
> council **wf_d873be6e-5b2** (full bench, 21 agents, **high 8/10, action: execute**,
> tier: council-decided; `docs/council-log.md` top row). The council ratified the packet's
> five rulings **with red-team amendments** — every material red-team hit verified against
> source and adopted (the asymmetric CRN residual, the productionMarket permanent-flag
> contradiction, gate-list-means-BLOCK, type-gate-proves-order-not-predicate, the clockless
> engine-domain inversion). **The honesty-hawk's surgical veto fired + was honored** (§V).
> **Precedence:** this spec supersedes `docs/plans/4-recommendation.md`'s Unit-14 section
> where they conflict; the plan's dated **RECONCILIATION SUPERSESSION (2026-07-18)** block
> supersedes the plan body everywhere else. One reviewable commit, no riders (insight 051).
> **U14 ships NO user-facing surface** — no Caddie walk; the oracle IS the reviewer.

## S0 — the pinning pass + the mint predicate (contradictions mean STOP; lands FIRST)

1. **The token's pinning semantics are RULED (supersession item 5):** the oracle-cleared
   token evaluates over **the constants the graded run actually consumes** (per-run-consumed
   — the producer's-output shape, insights 080/081/088), split by **directional KIND**:
   - **certification-pinnable** (a dated pin event exists): the NC out-year rate (~Aug-2026
     FY25-26 certification; `verify:state-tax` `nextDue: 2026-09-01`), any healthcare /
     Strand-5 primary that goes directional → **BLOCKS that household's token until its
     event pins it**. An NC household stays honestly blocked to ~Aug-2026 — never laundered.
     FL/PA households are not hostage to NC's calendar.
   - **methodology substrate** (no dated pin event exists): `productionMarket`, ε's
     calibration context, `survivorSpendingRatio` → does **NOT** block; the grade ships
     **difference-keyed** with the directional level **DISCLOSED** (S4.5). **Flipping
     `productionMarket.directionalUntilPinned` to `false` to clear the gate is a REJECT**
     (laundering — the NC sin in mirror).
2. **SOURCE-BIND the mint predicate** (the council's Attack-5 fold): the consumed-constant
   set is **DERIVED from the run's own built params/overlay** (never a hand-maintained
   list), and planted-mutant tests prove **NC-blocks / FL-mints** (an NC household's token
   refused while `ncRateSchedule` is directional; an FL household's token minted on the
   same build) — because the type-level token proves *order* (no recommendation without a
   token), never predicate *correctness*.
3. **The pin worklist executed in S0** (census: 22 directional entries, wf_1369c7e7-698):
   - **FRA tables** (`socialSecurity.ts:59,88`) — **reachable-band pinning**: both built
     cohorts resolve to the confirmed 67; document the reachable-band basis in the entry
     notes and browser-pull the graduated 1955–61 bands to byte-pin when cheap. The
     consumed-set derivation reads the *reachable* value's pin status, so the coarse
     entry-level flag no longer falsely blocks.
   - **`medicareExtrasTypical`** (`health.ts:207`) — pin to a 2026 Medigap-G / Part-D
     refresh (the $164 figure lags 2026 filings +12–26%, the **optimistic** direction —
     this is a real pin task, not paperwork).
   - **`survivorSpendingRatio`** (`methodology.ts:85`) — methodology-substrate KIND
     (ships-disclosed); if ever pinned it needs a **sourced equivalence-scale anchor**
     (the U12 advisory's ≈⅔ note), never a guessed one.
   - **The 16 state-tax entries** — PA/FL confirmable on the annual `verify:state-tax`
     cadence; NC out-years wait for the certification (KIND (a)).
   - **`OOP_MEDICAL_TYPICAL_HOUSEHOLD`** — engine-INERT (intake hint only, traced); not in
     the gate. `validationMarket` — validation-only; not in the gate.
4. **The Medicare-cost-trend constant is HARD solver-BLOCKING (supersession item 4):** the
   token **withholds the conversion ranking** until a **sourced** trend constant lands AND
   is **genuinely consumed** by the Part-B pricing (insight 074 — a stamp nothing reads
   prices nothing). **Disclose-and-ship is FORBIDDEN** (a disclosure fixes a number, never
   a mis-ranking). The sourcing task is its own small unit (sourced constant + engine
   consumption + re-derived fixtures); this spec only enforces the block. The withheld
   reason is **enumerated** (S6.3) so U17's gate-red branch can name it honestly.

## S1 — `src/engine/solver/candidates.ts` (the SHARED enumerator, authored here)

- The policy × cliff-anchored-conversion-grid candidate generation + the **RMD-first
  legality filter** (RMD is a forced ordinary-income floor taken first, non-convertible;
  a grid amount exceeding post-RMD convertible headroom is **rejected as infeasible** — an
  out-of-range sentinel, never silently scored; the filter keys on the hazard creator's own
  domain: RMD age × pre-tax balance — insight 027).
- **The search axis is the 4 named policies** `{proportional, taxable-first, pre-tax-first,
  bracket-fill}`; the module imports the shipped **5-wide** `DRAWDOWN_POLICIES` and exposes
  the injection point for the user's `custom`+`drawdownOrder` as an **out-of-grid labeled
  baseline** (supersession item 8). The conventional-order / conversion-0 baseline is
  **always present** (the no-change oracle case + the shrinkage prior both require it).
- **Cliff-anchored, not uniform:** grid points pinned just under every active ACA/IRMAA
  threshold + local bisection refinement — and the bisection **segments its bracket at each
  jump** (a bisection spanning a discontinuity finds a phantom root — insight 013). The
  ceiling substrate is the shipped `bracketFillCeilings` seam (`model.ts:407-416`) — reuse,
  never re-derive (insight 068: fill to the *binding effective* ceiling via the branch's own
  predicate, never the nominal bracket top).
- Imported by BOTH this harness and U15's `search.ts` — the two can never drift to
  different candidate sets (the plan's design, unchanged).

## S2 — `src/engine/validation/optimalityOracle.ts` (the five hand-derived cases)

- The five cases as planned — (i) constant-rate conventional-order, (ii) stripped
  bracket-fill optimum, (iii) cliff-aware healthcare inversion, (iv) after-tax leave-more
  §1014/IRD inversion, (v) the no-change case — **plus the state precondition dimension**
  (supersession item 1): every fixture declares `state: absent | NC | PA | FL` alongside its
  on/off preconditions, and the harness **REFUSES to apply a fixture's known-best outside
  its declared preconditions** — a federal-only known-best never grades a priced-state run.
  Add the NC/PA priced fixtures whose hand-derived lifetime-tax dollars **include** state
  (the state spec's NC-vs-PA conversion-delta DND-012 fixture is the pattern).
- **Fixture discipline (the insight battery):** `src/engine/reference/solver-cases/` is
  committed, hand-derived (DND 012 — the zero-return read-off technique, insight 011), and
  **test-time RE-DERIVED, not just committed** (insight 032 — an unbound artifact is
  silently mutable); vectors pinned **in full** (insight 021); each fixture **pins WHICH
  RULE it asserts** in its preconditions (insight 023 — a panel that confirms arithmetic on
  a wrong rule-selection crowns the wrong known-best); reference-table cells cross-verified
  by independent paths (insight 009).
- **The planted wrong-best self-test** (burned/070, insight 016): a fixture whose declared
  "best" is inferior must make the oracle **fail loud** — with a control arm and
  exact-ranking assertions, or the gate is theater.
- **Presence companions everywhere** (insights 029/070/014): every boundary a case claims
  to exercise carries a *minted-state* witness (≥1 path crossed the survivor transition /
  the ACA cliff / an IRMAA step — a stamped crossing count, never `toHaveCount(0)` on a
  transient), and the cliff cases drive the **crossing year**, not a static in-bracket
  position.
- **Insight-025 discharge:** before authoring each fixture, verify the mechanism is live in
  the SHIPPED engine (the plan predates U9–U13; a fixture for a mechanism that shipped
  differently is a false gate).

## S3 — `src/engine/validation/rankingStability.ts` (K-candidate CRN)

- All K candidates from `candidates.ts`, within one seed-set, consume the normals
  **identical path-for-path across the survivor MFJ→single transition**; perturbing one
  candidate's conversion amount perturbs no other candidate's draw consumption. Runs over
  the SAME candidate set U15 will score (the shared module is the proof).
- Runs on **both** A and B (B carries the rendered figures + the grade, not only the grade).
- The `ENGINE_MAX_*` finiteness seam stays live across every candidate evaluation (a
  long-horizon large-pre-tax candidate can overflow inside the fixed point and void the
  convergence proof — insight 028; the regime-disjointness premise of the contraction is a
  per-candidate obligation — insight 007).

## S4 — `src/engine/validation/gradeCalibration.ts` (robust / coin-flip, honestly)

1. Grades calibrated against the hand-supplied known-robust + known-fragile cases; "just do
   it" only when the winner's advantage holds on held-out B beyond the ε-band; the
   **minimum-B-path floor** + the **grade-stability check** over the deterministic
   **seedB-derived B-family** (`seedB[0..m-1]`, re-derivable from the one persisted seedB —
   byte-reproducible on re-entry); a luck-flippable borderline case is FORCED conservative.
2. **The named-driver sensitivity probe** (re-rank under the ACA-enhanced toggle + a
   fixture-vintage perturbation); a pure seed-B near-tie carries the
   `sampling-noise-near-tie` sentinel — never a fabricated input cause.
3. **THE COUNCIL'S Q3 AMENDMENT (supersession item 7a):** the difference-keyed grade's
   shape-bias cancellation is **asymmetric** — conversion front-loads balance reduction, so
   the non-cancelling residual **flatters conversion in the near-tie regime**. The grade
   **DEMOTES "just do it" on conversion near-ties** (a conversion-lever winner inside the
   demotion margin grades coin-flip), and the calibration battery carries a case proving
   the demotion fires. The demotion margin is calibrated here, sentinel-guarded like ε.
4. **Grade vs display resolution reconciled** (plan, unchanged): a graded advantage that
   rounds below one display tenth must not render an unchanged `X of 10` under "just do
   it" — clear both the ε-band AND one display tenth, or collapse into no-change.
5. **The methodology-substrate disclosure seam:** the grade's output carries the
   machine-readable flag that the level is directional (the productionMarket KIND-(b)
   ruling) so U16 renders the shape-limitation note **adjacent in the same DOM lockup** as
   the grade — composed as a pure exported seam (insight 048: never inline the honesty
   gate in an undrivable render path).
6. **Fresh-draw protocol** (plan, unchanged): seed-set B + thresholds are used-once-per-
   release, re-drawn on any change to candidates/thresholds; N=1 feedback never re-tunes
   against B-derived outputs.

## S5 — `src/engine/validation/heldOutSeed.ts` (A/B + the ε split)

- Select on A, grade AND display on B; the `seedA` selection score is **never rendered**
  (for the winner OR the runner-up — insight 056's every-field law is U16's test, minted
  here as the output contract).
- **`seedB` = a hash/SplitMix expansion of `seedA` into a well-separated stream** — never
  `seedA + 1`; the decorrelation test rejects a planted near-integer sibling. seedB is
  **derived, not top-level-persisted**: it is written into the `savedRecommendation?`
  record at U17's explicit save (the record never exists without seedB+goal — supersession
  item 3); the solver-code version stamp (U17) covers derivation-function drift.
- **The ε SPLIT (plan, unchanged + sentinel law):** the **selection tie-tolerance** is
  CRN-difference-keyed (pre-specified / A-side; deciding survival-equivalence on a
  B-measured level band re-contaminates the held-out — planted-fail arm) and the **display
  band** is B-measured; both stored with **out-of-range sentinel defaults** (burned/062) —
  an uncalibrated ε is detectably unset, and a NaN margin must not pass the `> ε` compare
  (finiteness at the chokepoint — insights 008/010/039).

## S6 — the oracle-cleared token (the structural gate)

1. **Opaque nominal token**, constructable only by this harness on a clean pass; U15's
   `solve`-as-recommendation entry takes it as a required parameter (compile-level order —
   the plan's design, unchanged).
2. **Withheld until:** all five oracle cases pass on their declared preconditions ·
   K-candidate ranking stability · grade calibration (incl. the conversion-near-tie
   demotion case) · the held-out defense + ε calibrated (sentinel absent) · **the
   per-run-consumed pinning clause (S0.1) clears for the graded household** · the
   Medicare-trend block (S0.4) clears for any candidate set containing conversions.
3. **The withheld-reason is a first-class enum** (aca-unverified · rec-relevant-primary-
   directional(name) · epsilon-uncalibrated · medicare-trend-unsourced · state-
   certification-pending(state)) — U17's gate-red branch names the TRUE reason, never
   blames the law when a primary is merely un-pinned (the plan's branch, now enumerable).
4. **Planted-mutant battery:** the token refused on a planted directional rec-relevant
   constant · refused on the ε sentinel · refused on a planted wrong-best · **NC-blocks
   while FL-mints on the same build** (S0.2) · minted-then-refused when a consumed
   constant flips directional (the derivation is live, not a snapshot).

## Ship gates

- DND-012 externally-derived fixtures for every oracle case (incl. the state-dimension
  NC/PA dollar fixtures) — never the engine validating itself; full-vector pins + test-time
  re-derivation (021/032); presence companions (027/029/070).
- Every S6.4 mutant RED with a named killing test, then reverted (Edit-only on a dirty
  tree — never `git checkout --`).
- Engine purity holds: the harness lives under `src/engine/validation/**` — no clock, no
  entropy, no env (the lint owns it; the deterministic tie-break sub-stream is seeded,
  orthogonal to A/B).
- **Gates:** typecheck · lint · FULL suite · `verify:bundle` (fresh build first — 057) ·
  `verify:fit` (must stay green untouched — U14 renders nothing; a fit delta means scope
  leaked) · `verify:doc-stats` · `verify:aca` · `verify:state-tax` · CI green **by explicit
  run id**.
- Docs amended in-pass: roadmap U14 row → in-progress/shipped, the plan's U14 section
  pointer to this spec, TODO re-stamp. **No Caddie walk** (no user-facing surface).
- ONE commit, no riders (051). Build discipline: 083's charter facts (solver-cases +
  `devSeeds.ts` are decide-before-dispatch surfaces for any parallel agents; scratch probes
  live OUTSIDE the collected vitest globs); 084's size law on every workflow schema;
  019/063/077 on the review fleet's vote-math.

## V — the hawk's veto (fired + honored; a STANDING Act-4 constraint, lands at U16)

**VETOED: the bald surplus-pivot absolute — "you're safe either way."** The false belief:
a friend reads absolute survival as a GIVEN at the ceiling, while `market-model.md` §3–§6
names survival OVERSTATED on sequence/inflation regime risk in exactly the 70–90% band
where the pivot fires — they stop stress-testing on the axis most likely to break them.
**§7 trigger-1 fires DETERMINISTICALLY for that claim** (settled correctness — routing it
to a U16 tone cold-read is the reverse-oracle error). The bald absolute never ships; the
sanctioned exits are the **reframe** (delta-as-hero, inheriting the spine's disclosed
directional level) **or the richer-draw build**. U16's council inherits this veto verbatim.

## Dissent (preserved — the Reading-A minority)

The difference-keyed grade ITSELF may be too close to a calibrated-probability claim at
the 85% near-tie line: the non-cancelling residual is seed-invariant and systematically
flatters the IRREVERSIBLE conversion lever exactly where the recommender lives — Reading A
(the block-bootstrap richer draw as a **U14 prerequisite**) is the fully-honest call.
**Flip condition:** a near-tie stress test showing the difference-keyed grade INVERTS a
conversion-vs-no-conversion ranking under the richer draw at the boundary → the richer
draw becomes a U14 prerequisite immediately, not a deferred tripwire.

## Explicitly OUT (do not build here)

- U15's `search.ts`/`objective.ts`/`select.ts`/`cancel.ts`/`profile.ts`, the K-candidate
  wire shape, the solve `ModelAnswer` arm (tier-less — supersession item 8) — U15's own
  pre-build council.
- The richer market draw (unless the dissent's flip condition fires first).
- The Medicare-cost-trend SOURCING unit (its own small unit; this spec only enforces the
  block).
- U16/U17 surfaces, the GoalPicker, the invited affordance (⚑ digest items for Briggsy's
  eye at U16), the `savedRecommendation` record write path (U17).
- Roster growth (a graduated state reopens S2.8 + mandates the not-yet-state-optimized
  caveat — standing constraints, not this unit).
