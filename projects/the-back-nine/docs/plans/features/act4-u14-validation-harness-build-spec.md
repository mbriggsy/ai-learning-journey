---
title: "U14 — The Solver Validation Harness — build spec (council-ratified)"
doc-type: build-spec
status: shipped
---

# U14 — The Solver Validation Harness — build spec (council-ratified)

> **Identity:** Act 4's first unit (`U14`, the oracle that GATES U15 — plan contract #1).
> **Built 2026-07-18** under this shape, in one commit; the ultramode fold landed the same
> night. Per-unit status is the roadmap's You-Are-Here table, never re-typed here.
> **Provenance:** the Act-4 runway reconciliation (Briggsy's GO 2026-07-18): the 8-agent
> ground-truth audit **wf_1369c7e7-698** (per-agent reports in its journal) → the pre-build
> council **wf_d873be6e-5b2** (full bench, 21 agents, **high 8/10, action: execute**,
> tier: council-decided; the 2026-07-18 ACT-4 RUNWAY RECONCILIATION row of `docs/council-log.md` — three
> rows carry that date, and the U15 and Rule-36 rows are not this one). The council ratified the packet's
> five rulings **with red-team amendments** — every material red-team hit verified against
> source and adopted (the asymmetric CRN residual, the productionMarket permanent-flag
> contradiction, gate-list-means-BLOCK, type-gate-proves-order-not-predicate, the clockless
> engine-domain inversion). **The honesty-hawk's surgical veto fired + was honored** (§V).
> **Precedence:** this spec supersedes `docs/plans/4-recommendation.md`'s Unit-14 section
> where they conflict; the plan's dated **RECONCILIATION SUPERSESSION (2026-07-18)** block
> supersedes the plan body everywhere else. One reviewable commit, no riders (insight 051).
> **U14 ships NO user-facing surface** — no Caddie walk; the oracle IS the reviewer.

## S0 — the pinning pass + the mint predicate (contradictions mean STOP; landed FIRST)

1. **The token's pinning semantics are RULED (supersession item 5):** the oracle-cleared
   token evaluates over **the constants the graded run actually consumes** (per-run-consumed
   — the producer's-output shape, insights 080/081/088), split by **directional KIND**:
   - **certification-pinnable** (a dated pin event exists): any state-rate / healthcare /
     Strand-5 primary awaiting a dated event → **BLOCKS that household's token until its
     event pins it**, and siblings in other states mint freely on the same build — never
     laundered. The worked example that built this KIND was the NC out-year rate, which
     blocked every NC household to its ~Aug-2026 FY25-26 certification while FL/PA minted;
     **that blockade is history** — S.L. 2026-41 § 44.1(a) struck the trigger rows and pinned
     the schedule outright on 2026-08-02 (`directionalUntilPinned: false`,
     `state-tax-nc-last-verified.json`, `nextDue` now the annual `2027-08-02` drift cadence),
     so **no live entry is certification-pinnable today** and this leg of the mint is
     seam-driven rather than live-fired.
   - **methodology substrate** (no dated pin event exists): `productionMarket`, ε's
     calibration context, `survivorSpendingRatio` → does **NOT** block; the grade ships
     **difference-keyed** with the directional level **DISCLOSED** (S4.5). **Flipping
     `productionMarket.directionalUntilPinned` to `false` to clear the gate is a REJECT**
     (laundering — the NC sin in mirror).
2. **SOURCE-BIND the mint predicate** (the council's Attack-5 fold): the consumed-constant
   set is **DERIVED from the run's own built params/overlay** (`consumedConstants.ts`, held
   honest by an import audit + a witness table + a doc-row exclusion test), never a
   hand-maintained list — because the type-level token proves *order* (no recommendation
   without a token), never predicate *correctness*. The council's flagship **NC-blocks /
   FL-mints on the same build** pair shipped live at U14 and went **history on 2026-08-02**
   when NC pinned; the refusal is now proven on the pure classification seam
   (`classifyConsumedConstants` with a planted directional `state.*` row blocking as
   `state-certification-pending`, deduped per state), while the live arms assert the
   complementary property — every priced state MINTS, and a regression to a directional
   roster entry fails loud.
3. **The pin worklist executed in S0** (census: 22 directional entries, wf_1369c7e7-698):
   - **FRA tables** (`socialSecurity.ts:59,88`) — planned as **reachable-band pinning**
     (both built cohorts resolve to the confirmed 67, so the coarse entry-level flag would
     have falsely blocked), but the browser pull was cheap and both schedules were
     **BYTE-pinned instead**, in real Chromium against SSA's own primaries: the retirement
     NRA chart across every band, and the survivor calculator driven at every graduated edge
     1944→1962. Both entries carry `directionalUntilPinned: false`, so no reachable-band
     argument is load-bearing. The consumed-set derivation still reads the *reachable*
     value's pin status.
   - **`medicareExtrasTypical`** (`health.ts:265`) — PINNED to a 2026 Medigap-G / Part-D
     refresh, because the inherited KFF-2023 anchor lagged the 2026 carrier filings by
     +12–26% in the **optimistic** direction (a real pin task, not paperwork). Both
     components now carry their own primary — the Part-D base is CMS-primary-pinned; the
     Medigap-G component is a conservative-HIGH multi-source anchor, since no government or
     actuarial national average exists to pin to — and the combined figure is DERIVED by
     `medicareExtrasTypicalMonthly()`, never re-typed. The entry's `vintage` bump
     deliberately fires the U13 staleness clock on vaults that adopted the old figure, and
     the `?seed=dip` knife-edge was re-tuned to restore its `nm=[0,1,2]` shape.
   - **`survivorSpendingRatio`** (`methodology.ts:85`) — methodology-substrate KIND
     (ships-disclosed, `directionalKind: 'methodology-substrate'`); if ever pinned it needs a
     **sourced equivalence-scale anchor** (the U12 advisory's ≈⅔ note), never a guessed one.
   - **The 16 state-tax entries** — 15 pinned in this pass on the annual `verify:state-tax`
     cadence, leaving `ncRateSchedule` the SOLE directional state entry (KIND (a): a
     2026-07-15 honesty-hawk veto held the then-current flat rate forward for one stated
     reason — the reported out-year schedule could not be located to primary session law).
     It pinned 2026-08-02 once S.L. 2026-41 § 44.1(a) was located, so the roster is now
     fully pinned.
   - **`OOP_MEDICAL_TYPICAL_HOUSEHOLD`** (`src/intake/referenceData.ts`) — engine-INERT
     (intake hint only, traced); not in the gate. `validationMarket` — validation-only; not
     in the gate.
4. **The Medicare-cost-trend constant is HARD solver-BLOCKING (supersession item 4):** the
   token **withholds the conversion ranking** until a **sourced** trend constant lands AND
   is **genuinely consumed** by the Part-B pricing (insight 074 — a stamp nothing reads
   prices nothing). **Disclose-and-ship is FORBIDDEN** (a disclosure fixes a number, never
   a mis-ranking). U14 shipped the block itself: `medicareCostTrend` became the codebase's
   first live `Unsourced` sentinel, joined to a `PART_B_PRICING_MODE` consumption witness so
   a sourced-but-unconsumed trend still blocks. The sourcing task was its own small unit and
   **landed 2026-07-19** (`ca41256f`, extended by the Part-D pass `45a69496`) — the trend
   table is sourced to the Trustees' path at `vintage: 'medicare-trend-2026a'` and
   `PART_B_PRICING_MODE` is `'trended'`, so **both halves clear and live conversion-bearing
   candidate sets no longer withhold**. Both halves stay armed: the planted lying-mirror arm
   (sourced trend, unmoved real-flat pricing) is still refused. The withheld reason is
   **enumerated** (S6.3) so U17's gate-red branch can name it honestly.

## S1 — `src/engine/solver/candidates.ts` (the SHARED enumerator, authored here)

- The policy × cliff-anchored-conversion-grid candidate generation + the **RMD-first
  legality filter** (RMD is a forced ordinary-income floor taken first, non-convertible;
  a grid amount exceeding post-RMD convertible headroom is **rejected as infeasible** — an
  out-of-range sentinel, never silently scored; the filter keys on the hazard creator's own
  domain: RMD age × pre-tax balance — insight 027).
- **The search axis is the 4 named policies** `{proportional, taxable-first, pre-tax-first,
  bracket-fill}`: `SEARCHED_POLICIES` filters the shipped **5-wide** `DRAWDOWN_POLICIES`
  (`model.ts:191`) down by excluding `custom`, which stays the injection point for the
  user's own `drawdownOrder` as an **out-of-grid labeled baseline** — never searched, always
  scored beside the grid (supersession item 8). The conventional-order / conversion-0
  baseline is **always present**, exported as `CONVENTIONAL_POLICY = 'taxable-first'` (the
  no-change oracle case + the shrinkage prior both require it). `applyCandidate` is the ONE
  apply seam, its dimension-invariance test-pinned.
- **Cliff-anchored, not uniform:** grid points pinned just under every active rail — the
  400%-FPL ACA cliff, each IRMAA step above the committed baseline, each federal
  ordinary-bracket edge — with local bisection refinement. **Insight-013 compliance is by
  construction, not by segmenting a bracket:** the anchor thresholds come from the tables'
  OWN jump lists (`cliffMagiFor`, the IRMAA tier walk, the bracket edges), and the only maps
  bisected are continuous and monotone in the conversion amount (ACA-MAGI linear, IRMAA-MAGI
  / federal-taxable piecewise-linear continuous) — the PRICED discontinuous surfaces (the
  PTC cliff, the IRMAA bill steps) are never bisected at all, so no bisection can span a
  discontinuity and find a phantom root. The rail substrate is the shipped `magiLandscape`
  fill model, which carries the same well-behavedness contract the `bracketFillCeilings`
  seam (`model.ts:445`) already carries — reuse, never re-derive (insight 068: fill to the
  *binding effective* ceiling via the branch's own predicate, never the nominal bracket top),
  so the enumerator and the engine agree on the geometry by construction.
- Imported by BOTH this harness and U15's `search.ts` — the two can never drift to
  different candidate sets (the plan's design, unchanged).

## S2 — `src/engine/validation/optimalityOracle.ts` (the hand-derived case roster)

- The five cases as planned — (i) constant-rate conventional-order, (ii) stripped
  bracket-fill optimum, (iii) cliff-aware healthcare inversion, (iv) after-tax leave-more
  §1014/IRD inversion, (v) the no-change case — **plus the state precondition dimension**
  (supersession item 1): every fixture declares `state: absent | NC | PA | FL` alongside its
  on/off preconditions, and the harness **REFUSES to apply a fixture's known-best outside
  its declared preconditions** — a federal-only known-best never grades a priced-state run.
  The NC/PA priced fixtures whose hand-derived dollars **include** state shipped alongside
  (the state spec's NC-vs-PA conversion-delta DND-012 fixture is the pattern), giving
  `SOLVER_CASES` its **seven committed fixtures**. **NC is the proof the refusal is
  load-bearing, not ceremonial:** NC's flat rate stacked on the federal band prices a 22%-band
  conversion at ≈26%, above the fixture's 0.23 heir bracket, while the 12% band prices at
  ≈16% — the optimum DROPS from the federal 22%-top anchor to the 12%-top anchor on the SAME
  candidate set, so a federal-only known-best applied to an NC household would crown the wrong
  candidate by ~$3,300 of after-tax estate. **PA is the priced-zero pole:** a 59½+ conversion
  is not PA-taxable and gains are zero, so PA adds literally $0 on every pass of the fixed
  point and the run is BYTE-IDENTICAL to its state-absent twin. Fixture preconditions and the
  pinning clause stay deliberately orthogonal — fixtures gate CORRECTNESS, the clause gates
  MINTING — which is why the NC fixture kept ranking correctly through the whole period the
  clause was blocking NC's token.
- **Fixture discipline (the insight battery):** `src/engine/reference/solver-cases/` is
  committed, hand-derived (DND 012 — the zero-return read-off technique, insight 011), and
  **test-time RE-DERIVED, not just committed** (insight 032 — an unbound artifact is
  silently mutable); vectors pinned **in full** (insight 021); each fixture **pins WHICH
  RULE it asserts** in its preconditions (insight 023 — a panel that confirms arithmetic on
  a wrong rule-selection crowns the wrong known-best); reference-table cells cross-verified
  by independent paths (insight 009).
- **The planted wrong-best self-test** (burned/070, insight 016): a fixture whose declared
  "best" is inferior makes the oracle **fail loud** — a planted roster yields failures and
  no report at all, so no token can be minted from it, and the arm ships with a control arm
  plus exact-ranking assertions rather than a bare "something failed".
- **Presence companions everywhere** (insights 029/070/014): every boundary a case claims
  to exercise carries a *minted-state* witness (≥1 path crossed the survivor transition /
  the ACA cliff / an IRMAA step — a stamped crossing count, never `toHaveCount(0)` on a
  transient), and the cliff cases drive the **crossing year**, not a static in-bracket
  position.
- **Insight-025 discharge:** each fixture's mechanism was verified live in the SHIPPED engine
  before the fixture was authored (the plan predates U9–U13; a fixture for a mechanism that
  shipped differently is a false gate).

## S3 — `src/engine/validation/rankingStability.ts` (K-candidate CRN)

- All K candidates from `candidates.ts`, within one seed-set, consume the normals
  **identical path-for-path across the survivor MFJ→single transition**; perturbing one
  candidate's conversion amount perturbs no other candidate's draw consumption. Runs over
  the SAME candidate set U15 scores (the shared module is the proof). The perturbation law
  byte-compares the FULL decision surface, not just the headline (`decisionSurfaceIdentical`
  — Tier-1 survival + depletion, the gross terminal sample, and every tax-aware Tier-2
  vector, because the total alone conserves under a pretax→Roth reallocation), and carries a
  moved-witness with an inert-world red arm so "sibling unchanged" can never be a vacuous
  decoupling proof (insights 029/093). The report also carries the `solverRunFingerprint` the
  U15 mint binding joined it to, so the token's identity is exactly the roster stability was
  proven over.
- Runs on **both** A and B (B carries the rendered figures + the grade, not only the grade).
- The `ENGINE_MAX_*` finiteness seam stays live across every candidate evaluation (a
  long-horizon large-pre-tax candidate can overflow inside the fixed point and void the
  convergence proof — insight 028; the regime-disjointness premise of the contraction is a
  per-candidate obligation — insight 007).

## S4 — `src/engine/validation/gradeCalibration.ts` (robust / coin-flip, honestly)

1. Grades calibrated against the hand-supplied known-robust + known-fragile cases; "just do
   it" only when the winner's advantage holds on held-out B beyond the ε-band. Grade
   stability is **built into the rule rather than bolted on as a second check**: the
   advantage is read on EVERY member of the deterministic **seedB-derived B-family**
   (sized by `solverBFamilySize`, re-derivable from the one persisted seedA — byte-reproducible
   on re-entry), and `just-do-it` requires every member's margin strictly beyond its own
   `zB · SE` band, so a single luck-flippable member FORCES the conservative reading. The
   **minimum-B-path floor** (`solverMinBPaths`) is a typed refusal, not a downgrade — a member
   read on fewer paths is thrown, because the margin-vs-band decision must not itself be
   noise.
2. **The named-driver sensitivity probe:** re-rank under each probe world and name the FIRST
   one whose crown flips. The probe list is caller-supplied and defaults to the single
   built-in `ACA_ENHANCED_PROBE` (the enhanced-subsidies toggle, self-declaring inapplicable
   on a healthcare-blind world); the planned fixture-vintage perturbation was never a second
   built-in, and the ACA probe alone genuinely flips the cliff fixture's crown, so the
   mechanism is exercised rather than asserted. A near-tie no probe can flip carries the
   `sampling-noise-near-tie` sentinel — never a fabricated input cause. U15's fold added an
   optional INJECTED crown function so the probe can reflect the SHIPPED selection path
   (shrinkage + the withhold arm) rather than the raw argmax, which would otherwise let it
   name a driver the user never sees.
3. **THE COUNCIL'S Q3 AMENDMENT (supersession item 7a):** the difference-keyed grade's
   shape-bias cancellation is **asymmetric** — conversion front-loads balance reduction, so
   the non-cancelling residual **flatters conversion in the near-tie regime**. The grade
   **DEMOTES "just do it" on conversion near-ties** (a conversion-lever winner inside the
   demotion margin grades coin-flip), and the calibration battery carries a real-engine case
   proving the demotion fires. The margin was calibrated here, sentinel-guarded like ε, and is
   **axis-guarded** — it applies only on the survival axis its class was measured on, and only
   when the winner carries a nonzero conversion and the runner-up does not; any other axis
   refuses fail-closed until its own margin is calibrated. U14 shipped it as an absolute
   measured Medicare-BLIND; that value was **superseded 2026-07-19**, once the trend sourcing
   unit made Part-B pricing trended, by `solverConversionNearTieDemotionSeMultiple` — a
   dimensionless multiple of the run's own per-member paired-difference SE, so it travels
   across worlds whose margins differ in magnitude, re-measured on the mandated
   Medicare-bearing post-trend-flip class.
4. **Grade vs display resolution reconciled** (plan, unchanged): a graded advantage that
   rounds below one display tenth must not render an unchanged `X of 10` under "just do
   it" — clear both the ε-band AND one display tenth, or collapse into no-change. When the
   winner's and runner-up's displayed tenths agree on ANY member the grade carries
   `subTenthCollapse`, and U15/U16 route it into the no-change state; `xOfTenClamp`
   (`confidence.ts`) is the one canonical clamp home the tenth is read through.
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
  (for the winner OR the runner-up — insight 056's every-field law became U16's test, minted
  here as the output contract).
- **`seedB` = the canonical SplitMix-avalanche expansion of `seedA` into a well-separated
  stream** — never `seedA + 1`, and the independence is enforced twice with separate
  falsifiable arms: `isCanonicalSeedB` STRUCTURALLY refuses every non-canonical value
  (including the planted near-integer sibling), while `decorrelationReport` measures the two
  seeds' actual normals streams EMPIRICALLY and refuses a degenerate derivation — an identity
  or near-copy that the structural check alone would bless if the derivation function itself
  rotted. seedB is **derived, not top-level-persisted**: it is written into the `savedRecommendation?`
  record at U17's explicit save (the record never exists without seedB+goal — supersession
  item 3); the solver-code version stamp (U17) covers derivation-function drift.
- **The ε SPLIT (plan, unchanged + sentinel law):** the **selection tie-tolerance** is
  CRN-difference-keyed (pre-specified / A-side; deciding survival-equivalence on a
  B-measured level band re-contaminates the held-out — planted-fail arm) and the **display
  band** is B-measured; both stored with **out-of-range sentinel defaults** (burned/062) —
  an uncalibrated ε is detectably unset, and a NaN margin must not pass the `> ε` compare
  (finiteness at the chokepoint — insights 008/010/039).

## S6 — the oracle-cleared token (the structural gate)

1. **Opaque nominal token** — `OracleClearedToken`, branded by a `unique symbol` and
   constructable only by `mintOracleToken` on a clean pass, so external construction needs a
   deliberate double-cast. U15's `solve`-as-recommendation entry takes it as a required
   parameter (compile-level order — the plan's design, unchanged), and carries `mintedOver`
   for U17's staleness re-derivation.
2. **Withheld until:** the oracle cases pass on their declared preconditions and
   K-candidate ranking stability holds — each a BRANDED report that is itself a required
   mint parameter, so a failing battery yields no report and therefore no token · grade
   calibration (incl. the conversion-near-tie demotion case) · the held-out defense + ε
   calibrated (sentinel absent) · **the per-run-consumed pinning clause (S0.1) clears for the
   graded household** · the Medicare-trend block (S0.4) clears for any candidate set
   containing conversions · **the ACA legislative freshness window** for any run that
   actually prices the ACA fixed point (an `enrolledPremium` stream is the clause's domain —
   insight 027; the ONE calendar `verify:aca` and the Healthcare sheet's dated status line also
   read, never re-typed, against an INJECTED today — the engine holds no clock). The ε clause covers
   the freshness window itself, since `ageDays > NaN` is false and an unguarded window would
   fail OPEN, which is the optimistic direction. U15's honored hawk veto added a conjunct at the
   OTHER end — not in the mint at all: `solve()` re-computes the run fingerprint and refuses,
   structurally, a token whose `mintedOver.fingerprint` differs from the run it is asked to
   bless (`solve.ts:8-11,419-425`), so the mint proves ORDER and the fingerprint proves
   IDENTITY.
3. **The withheld-reason is a first-class enum** (aca-unverified · rec-relevant-primary-
   directional(name) · epsilon-uncalibrated · medicare-trend-unsourced · state-
   certification-pending(state)) — U17's gate-red branch names the TRUE reason, never
   blames the law when a primary is merely un-pinned (the plan's branch, now enumerable).
4. **Planted-mutant battery:** the token refused on a planted directional rec-relevant
   constant · refused on the ε sentinel (and on a planted NaN or Infinity — finiteness
   first) · refused on a planted wrong-best · refused fail-CLOSED on an UNCLASSIFIED
   directional entry, so the predicate never guesses optimistically · **blocks on a planted
   directional state row while its siblings mint on the same build** (S0.2 — the live
   NC/FL pair until the 2026-08-02 NC pin, the pure seam since) · minted-then-refused when a
   consumed constant flips directional (the derivation is live, not a snapshot).

## Ship gates (all cleared at the 2026-07-18 build)

- DND-012 externally-derived fixtures for every oracle case (incl. the state-dimension
  NC/PA dollar fixtures) — never the engine validating itself; full-vector pins + test-time
  re-derivation (021/032); presence companions (027/029/070).
- Every S6.4 mutant went RED with a named killing test, then was reverted (Edit-only on a
  dirty tree — never `git checkout --`); six planted mutants at the build, plus the fold's
  own arms.
- Engine purity holds: the harness lives under `src/engine/validation/**` — no clock, no
  entropy, no env (the lint owns it; the deterministic tie-break sub-stream is seeded,
  orthogonal to A/B).
- **Gates:** typecheck · lint · FULL suite · `verify:bundle` (fresh build first — 057) ·
  `verify:fit` (must stay green untouched — U14 renders nothing; a fit delta means scope
  leaked) · `verify:doc-stats` · `verify:aca` · `verify:state-tax` · CI green **by explicit
  run id**.
- Docs amended in-pass: the roadmap U14 row, the plan's U14 section pointer to this spec, a
  TODO re-stamp. **No Caddie walk** (no user-facing surface).
- ONE commit, no riders (051). Build discipline: 083's charter facts (solver-cases +
  `devSeeds.ts` are decide-before-dispatch surfaces for any parallel agents; scratch probes
  live OUTSIDE the collected vitest globs); 084's size law on every workflow schema;
  019/063/077 on the review fleet's vote-math.

## V — the hawk's veto (fired + honored; a STANDING Act-4 constraint, discharged at U16)

**VETOED: the bald surplus-pivot absolute — "you're safe either way."** The false belief:
a friend reads absolute survival as a GIVEN at the ceiling, while `market-model.md` §3–§6
names survival OVERSTATED on sequence/inflation regime risk in exactly the 70–90% band
where the pivot fires — they stop stress-testing on the axis most likely to break them.
**§7 trigger-1 fires DETERMINISTICALLY for that claim** (settled correctness — routing it
to a U16 tone cold-read is the reverse-oracle error). The bald absolute never ships; the
sanctioned exits are the **reframe** (delta-as-hero, inheriting the spine's disclosed
directional level) **or the richer-draw build**. U16's council inherited the veto verbatim,
re-fired it on its own charter, and honored it into the shape: the shipped surface takes the
reframe exit — delta-as-hero, with the survival context SOURCE-BOUND by reference to the
spine's own rendered confidence object rather than a re-authored parity string.

## Dissent (preserved — the Reading-A minority)

The difference-keyed grade ITSELF may be too close to a calibrated-probability claim at
the 85% near-tie line: the non-cancelling residual is seed-invariant and systematically
flatters the IRREVERSIBLE conversion lever exactly where the recommender lives — Reading A
(the block-bootstrap richer draw as a **U14 prerequisite**) is the fully-honest call.
**Flip condition:** a near-tie stress test showing the difference-keyed grade INVERTS a
conversion-vs-no-conversion ranking under the richer draw at the boundary → the richer
draw becomes a U14 prerequisite immediately, not a deferred tripwire.

**The flip condition was TESTED and did NOT fire** (U16 §S0.2, run 2026-07-22 on the
reference device, before any conversion-grade render landed). `blockBootstrap.ts` resamples
the committed Shiller real series in moving blocks — same marginal level, historical temporal
shape only — and `nearTieInversion.ts` scores it through the shipped apply/simulate/score
path with a PRE-REGISTERED fires criterion fixed in code before the first full run. Across 36
rep-arms (primary L=10, robustness L=5, the L=1 permutation null) the conversion advantage
never inverted sign, and the shape penalty was small enough — and matched by the null arm —
to read as empirical-marginal texture rather than temporal shape. So the richer-draw deferral
is **ratified on the record** and the conversion-near-tie demotion stays the standing valve.
The dissent's substance survives the result: the residual's true magnitude remains
UNQUANTIFIED, and a later fire re-derives the demotion multiple rather than bumping it.

## Explicitly OUT of U14 — the scope fence, and where each item landed

- U15's `search.ts`/`objective.ts`/`select.ts`/`cancel.ts`/`profile.ts`, the K-candidate
  wire shape, the solve `ModelAnswer` arm (tier-less — supersession item 8): fenced out to
  U15's own pre-build council, which ratified them (wf_45d9d56b-d1c) and shipped them the
  same day as this unit.
- The richer market draw: still not in the shipped engine, and the dissent's flip condition
  did not fire. `blockBootstrap.ts` is a committed module under `src/engine/validation/` that no
  shipped path imports — only its own tests, the grade battery, and
  `scripts/stress-near-tie-inversion.ts` — so it is the U16 §S0.2 probe draw, never the engine's.
- The Medicare-cost-trend SOURCING unit: its own small unit, which landed 2026-07-19; this
  spec only ever enforced the block (S0.4).
- U16/U17 surfaces, the GoalPicker, the invited affordance (all ⚑ digest items for Briggsy's
  eye that the U16 council owned), the `savedRecommendation` record write path: all shipped
  in their own units, none of them here.
- Roster growth: a graduated state reopens the state spec's S2.8 rails constraint and
  mandates the not-yet-state-optimized caveat (S5.4). Standing constraints, not this unit —
  and none has fired: the roster is still the flat {NC, PA, FL}.
