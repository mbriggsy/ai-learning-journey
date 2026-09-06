---
title: "The State-Tax Engine Unit — build spec (council-ratified)"
doc-type: build-spec
status: shipped
---

# The State-Tax Engine Unit — build spec (council-ratified)

> **Identity:** a wf-tracked Act-3-adjacent engine+intake unit, **not a U-number**. Scope was
> ratified by council **wf_cc065e3b-bc1** (2026-07-11 — roster-exact coverage, broad brush
> REJECTED WITH CAUSE); this BUILD PLAN was ratified by the pre-build council
> **wf_d04148cb-1e5** (2026-07-15, full bench, 21 agents, **high 8/10, action: execute**,
> tier: council-decided) over the 14-agent primary-source research packet (wf_7bc1f76d-6cc:
> NC+PA deep dossiers with per-figure adversarial second-source verification — 82 CONFIRMED,
> 71 PRIMARY-PINNED; the packet is journaled with the run). **Trigger was MET at filing:** NC
> taxes IRA withdrawals and Roth conversions; Briggsy lives there — the unit lands before
> anyone bets real money on the answer.
> **The red team broke the emerging consensus THREE times (all cardinal-direction/optimistic,
> all conceded in rebuttal and folded below):** the 3.49%/2027 posture (→ the hawk's veto,
> §V), the bare `isDateRoute` predicate disjunct (→ S5), and the truthiness-keyed
> reduce-to-spine short-circuit (→ S2.5).
> **Tier split:** council-decided on ALL mechanics below (execute now). ⚑ yours-to-close
> (ship-at-high-confidence, audited by the Caddie pre-walk + Briggsy's eye per the 2026-07-11
> batched-oracle grant): FL's presence in the v1 picker, the affirmation wording, the picker's
> rendered feel.
> **ONE reviewable commit, no riders (insight 051).** Run-record note: the council's first
> pass lost three seats to oversized StructuredOutput calls; the size-law patch (efd8585e) is
> already in `council.js` — all nine seats voted on the resumed run.

## S0 — the sentinel reconciliation lands FIRST (contradictions mean STOP)

- `src/engine/constants/tax.ts:336-344` `stateIncomeTax` is `OUT-but-disclosed` with the note
  *"Configurable context; neither sequencing nor conversion moves it"* — now **FALSE** for the
  roster (NC taxes conversions at the flat rate; the D6 falsifiable rule "IN iff sequencing or
  a conversion can move it" **reclassifies state IN** for priced states). Reconcile the
  sentinel, the `inOutRule` sibling (tax.ts:347-354), and the module banner (tax.ts:1-9)
  BEFORE any pricing code, and sweep every consumer of the old "state isn't priced" wording
  (the S5 disclosure map is the render-side half of this sweep).

## S1 — the v1 roster + constants

- **PRICED_STATES v1 = {NC, PA, FL}.** NC + PA are the real households (Briggsy NC, Craig PA),
  every load-bearing figure PRIMARY-PINNED + second-source CONFIRMED. FL ships as a **sourced
  constitutional $0** (Fla. Const. Art. VII §5(a) — a pinned figure with its own re-verify
  record, NEVER a silent default; burned/062). **SC/GA/DE are DEFERRED** (SC verification
  incomplete, GA rate/SD secondary-graded for the highest-stakes lever, DE military tier
  disputed) — an unbuilt state keeps today's disclosed-out posture VERBATIM.
- **Constants discipline:** a new year-keyed state table in `src/engine/constants/` (joins
  `taxConstants` so ALL_CONSTANTS / the shape test / the vintage digest pick it up
  automatically): per-state `{ rateByYear, standardDeduction: {mfj, single}, ssExempt,
  retirementIncomeTreatment, conversionTreatment, capGainsTreatment }`, every figure
  `{value, citation, directionalUntilPinned}`, per-figure citations split statute-vs-DOR
  (insight 022). Distinctive figures join the copyGuard DISTINCTIVE allowlist and appear
  nowhere else in src/.
- **NC (TY2026, primary-pinned):** flat **3.99%** on (federal-AGI-derived base − standard
  deduction **$25,500 MFJ / $12,750 single**, fixed, no 65+ add-on); SS **fully exempt**
  (G.S. 105-153.5(b)(3)); conversions **fully taxed**; dividends/gains **ordinary** (no LTCG
  preference); **no local income tax**; Bailey/military carve-outs OUT (private-sector
  household; named in the constants note, never modeled).
- **NC out-years — THE VETO POSTURE (§V):** the rate table prices **3.99% for ALL years**,
  `directionalUntilPinned`. The codified 2027+ cuts are revenue-TRIGGER-conditional
  (G.S. 105-153.7(a1), FY2025-26 certification lands ~Aug 2026) and the reported July-2026
  budget-deal schedule could not be located to primary session law — **never price 3.49%/2027
  until one of them pins it.** Holding the higher rate overstates tax = conservative. The S6
  re-verify record carries the Aug-2026 checkpoint; the instant a lower rate pins, update the
  table + the U13 tax clock stales saved vaults honestly. **⚑ SUPERSEDED 2026-08-02:** S.L. 2026-41 § 44.1(a) enacted the step schedule — `ncRateSchedule` now prices the enacted out-year rates with `directionalUntilPinned: false`, the Aug-2026 checkpoint is retired, and `verify:state-tax` sits on the annual cadence (`nextDue: 2027-08-02`); [architecture.md §7.1 / §8](../../architecture.md).
- **PA (primary-pinned):** flat **3.07%** (stable since 2004, no scheduled change); **NO**
  standard deduction/exemption; **eight income classes, NOT AGI-based** — the engine assembles
  PA's base from its own converged channels (S2.2), never a rate on the federal figure.
  Retirement-plan withdrawals, Roth conversions, and SS all **EXEMPT at qualified age
  (≥59.5)**; taxable-account interest/dividends/gains taxed at 3.07% with **no LTCG
  preference**. NOT modeled, each named in the constants note + S5 residual, all
  conservative-direction: the US/PA-obligation interest exemption, Tax Forgiveness
  (Schedule SP), local EIT (mechanism-confirmed $0 for decumulation income), Philadelphia SIT.

## S2 — engine shape

1. **Placement:** a pure per-state family beside taxCore's primitives, joining the SAME
   per-year gross-up fixed point as a **second addend at `taxOverlay.ts:888`**
   (`solveGrossWithdrawal`) — never bolted on after convergence. `GrossUpContext` gains the
   state code; the calendar threads as `startCalendarYear + t` (the senior-bonus pattern —
   the rate lookup **CONSUMES the year** so a future pinned step-down actually prices,
   insight 074).
2. **Per-state bases from converged channels:**
   - **NC:** `nonSSordinary + realizedGain` (SS component NEVER enters; gains ordinary),
     minus the NC standard deduction for the year's `resolveYear` filing status, floored at 0,
     × the year's rate.
   - **PA:** qualified-age (≥59.5) arm = `(ongoingTaxable-class income + realizedGain)` ×
     3.07% — withdrawals/conversions/SS contribute **zero**. Under-59.5 arm: conversions and
     pre-tax withdrawals **TAXED** (the conservative arm — the primary sentence for the
     under-59.5 conversion exemption could not be pinned; the date route can reach those
     ages). Age gates read the per-person ledger/resolveYear ages where attribution exists.
   - **FL:** the sourced $0 module (literal `0`, byte-exact).
3. **Conversion pricing per state (the ranking-relevant term):** NC taxes the full taxable
   conversion at the flat rate; PA qualified-age conversions cost $0. The NC-vs-PA conversion
   DELTA is a mandatory DND-012 fixture — this asymmetry is exactly why the broad brush was
   rejected.
4. **The k re-derivation (insights 006/007 — a correctness obligation, PROVEN in code):**
   NC/PA exempt SS, so the state term rides WITHOUT the ×1.85 torpedo multiplier:
   `k_state = m_state × (1 + 0) ≈ 0.0399`, additive at the federal-worst corner →
   `k_total ≈ 0.74 + 0.04 ≈ 0.78` (architect-verified against taxOverlay.ts:447-490).
   **`GROSS_UP_MAX_PASSES` 128 → ~192**, justified in the comment with the new corner, and
   the convergence stress sweep **RE-RUN STATE-ON at the federal-worst corner** (small-net ×
   low-basis × large-SS × NC) — a state-OFF or large-net probe samples the benign regime
   (insight 006's exact trap).
5. **Reduce-to-spine byte-identity — MEMBERSHIP, not truthiness (red-team fold):** the
   state branch keys on **`PRICED_STATES` membership** — `'elsewhere'`, absent, and every
   unbuilt state take the **literal `+ 0` no-op branch structurally** (a truthy-string key
   would CALL the module and compute-then-zero, perturbing float lineage). Byte-identity
   arms: absent field, `'elsewhere'`, and each unbuilt roster state, all against the golden
   spine.
6. **validateParams / R19:** the state code is an ENUM-MEMBERSHIP gate (the `filing` idiom,
   simulate.ts:620) — an out-of-union value crossing the worker boundary returns the calm
   indeterminate, never a silently-selected branch; mirrored fail-loud backstop in
   `runTaxAwareDecumulation` for direct callers.
7. **Survivor transition (insight 014):** the NC standard deduction moves $25,500 → $12,750
   at the `resolveYear` MFJ→single crossing (same-year semantics as the federal transition);
   the **crossing-year externally-derived fixture is MANDATORY** (the widow's state cliff).
   PA has no deduction — its survivor delta is structural (nothing to halve).
8. **Bracket-fill ceiling rails: state stays OUT in v1** — provably near-lossless while every
   priced state is flat-or-zero (a constant flat rate cannot move the conversion-size
   optimum; NC engineNotes, five-elder triangulation). **This ruling REOPENS the moment a
   graduated state (SC/GA/DE) joins the roster** — standing constraint, named in the rails
   comment.
9. **Accounting:** state tax folds into the year's tax-paid surface the way federal does
   (`taxPaidThisYear`, taxOverlay.ts:1707 family) — one lifetime-tax lens, no parallel ledger
   in v1.

## S3 — intake + the R7 seat

- **The state question is a HOUSEHOLD-level single-question step placed BEFORE `spendStep`**
  (so `spendHelp` can conditionalize on the answered state, S5.1). Framed as a changeable
  best guess; optional-with-explicit-`'elsewhere'` — never a hard wall, never a silent
  default to any state.
- **Picker: REUSE the existing vertical SegmentedControl** (fields.tsx:296-357 — native
  radios in fieldset/legend, active state by weight+fill+text never hue, sr-only radio focus
  surfaced via `:focus-within`, ≥24px rows): **4 arms — NC · PA · FL · "another state"**. NO
  new component, NO bespoke div-listbox (CSP + a11y + calm); native `<select>` is the
  sanctioned fallback only if the priced roster ever outgrows a calm row count. A picker arm
  only exists for a state whose pick CHANGES the answer — never a theater option that
  collapses to 'elsewhere' (advocate's trust law).
- **R7 seat:** `retirementState` is a TOP-LEVEL ScenarioDraft key (the compile gate ties
  top-level keys only — nested would dodge the registry AND the seat walk);
  `'retirement-state'` joins `AssumptionSeat`, disposition `row-editable` (the seat IS the
  SC-vs-GA what-if lever: edit → re-run), `<Row seat>` stamped in AssumptionPanel, commits
  via `commitOpen`. ONE state per run — a real move rides the U13 update walk-through.

## S4 — persistence + staleness

- `ScenarioV3.retirementState?` additive-optional; key joins `SCENARIO_V3_FIELDS` (compile
  tie); **`STATE_ROSTER` single-sourced in model.ts** (the MEDICARE_EXTRAS_KINDS precedent)
  with `'elsewhere'` as an EXPLICIT vocab member (a chosen "somewhere else" is a fact worth
  persisting — distinct from never-asked ABSENT); codec `needVocab` inside an
  additive-optional guard (tolerant reader: pre-unit vaults pass).
- **`StateTaxVintageV3` stamp** written fresh at save (the healthcareVintage precedent) and
  **CONSUMED by `src/store/staleness.ts`** as a real clock — a state-rule change stales the
  vault (074's law: a stamp nothing reads prices nothing).
- **Installed base (red-team fold):** state tax needs a NEW input a pre-unit vault lacks —
  the U13 update walk-through **PROMPTS the (unanswered) state step**; until answered the
  household keeps the disclosed-out posture. Never a silent geographic default.

## S5 — disclosure routing (the render-side of S0)

1. **`spendHelp` goes state-aware** (the step order in S3 makes the state known): a
   PRICED-state household is told the tool prices its state tax — **leave it out of
   spending** (the keep-it-inside instruction would DOUBLE-COUNT the moment pricing ships —
   the federal double-count class the 2026-07-11 oracle settled); `'elsewhere'`/unanswered
   keeps today's keep-it-inside instruction verbatim. spendHelp is intake-only (seeds/vaults
   bypass it) — the always-rendered surfaces below carry the installed-base correction.
2. **The four monolithic strings SPLIT into composed clause-parts** (the
   composeMedicareExtrasTypicalNote pattern) — `verdictMedicareResidual` (copy.ts ~831),
   `rothOmissionsNote` (~755), `controlHealthOmissionsNote` (~803), and the spendHelp branch —
   each home gated INDEPENDENTLY (insight 078's sibling-by-chrome law), **each gate proven
   RED under a planted mutant**.
3. **The statePriced predicate is PRODUCER'S-OUTPUT ONLY, roster-gated (red-team fold):**
   read the state-pricing flag from the route's own BUILT params (the
   `spineMedicarePriced` shape — buildSpineParams' overlay output; the date route reads its
   own builder's output). **The bare `isDateRoute` disjunct is STRIPPED for state** —
   Medicare's version works only because dateSearch forces healthcare for every household;
   state pricing is roster-gated, so `isDateRoute ||` would falsely affirm "counted" for an
   'elsewhere' date-route household (insight 080's exact recurrence). Pin the out-of-roster
   date-route mutant RED, plus the degenerate-overlay divergence witness (insight 081 — the
   $0-portfolio household prices no state tax; its clause must NOT die).
4. **The affirmation ships OUTCOME-scoped, as an affirm+narrowed-residual SET** (never
   affirm-alone): "your NC state income tax is reflected in these numbers"-class language —
   **never an optimization claim** (honest for a flat roster where conversion size is
   provably state-neutral; the not-yet-state-optimized caveat becomes MANDATORY when a
   graduated state joins — the S2.8 twin constraint). AT-reachable labelled text in DOM
   order; reveals as ONE opacity unit inside confidence-reveal (no per-clause stagger);
   copyGuard-routed.
5. **Display home = option (b), leaner v1:** the engine prices NOW into every headline; the
   R7 seat is the input's rendered home; the qualitative affirmation/residual set is the
   output's home. **The dollar-figure detail door stays OUT** — it is a cold-read-bearing
   surface unit that earns its own commit + walk (options (a) build-the-door-as-rider and
   (c) gate-behind-the-door both REJECTED).

## S6 — the re-verify hook

- **`verify:state-tax`** mirrors `verify:aca`: per-state `*-last-verified.json` records for
  NC/PA/FL + a CI gate that fails when stale/unconfirmed. **NC's record carries the
  Aug-2026 checkpoint** (the FY2025-26 revenue certification + a codified-statute re-fetch);
  annual cadence otherwise. Deferred states get a record only when built.

## Ship gates

- **DND-012 externally-derived fixtures per state:** NC hand-computed (AGI-derived base −
  SD × 3.99%, MFJ and single), PA class-based (taxable-account-only for 59.5+), the
  **NC-vs-PA conversion delta**, the **PA 59.5-crossing year**, the **NC survivor SD-halving
  crossing year**, FL $0. Never the engine validating itself.
- **The k proof:** the re-derived contraction comment + MAX_PASSES ~192 + the state-ON
  worst-corner stress sweep, in-code, before ship.
- **Byte-identity battery:** absent / 'elsewhere' / each-unbuilt-state → golden-spine
  byte-identical (same seed); FL priced-$0 exactness.
- **Planted mutants RED:** every disclosure gate (×4 homes), the out-of-roster date-route
  predicate, the membership short-circuit (module-called-on-'elsewhere'), the vintage-clock
  consumer.
- **Gates:** typecheck · lint · full suite · verify:bundle (fresh build) · verify:fit
  (picker step + panel row + shortened-residual frames re-proven; the ubuntu arm) ·
  verify:doc-stats · verify:state-tax · CI green by explicit run id.
- **Caddie pre-walk** on every changed user-facing surface (picker, panel row, affirmation
  set, spendHelp branch) before "shipped"; cards chair-filed per the batched-oracle grant.

## V — the hawk's veto (fired + honored; a STANDING build constraint)

**VETOED: pricing NC 3.49% for TY2027.** The false belief it would create: that NC's 2027
rate is confirmed law. It is revenue-trigger-conditional on a certification that does not
exist until ~Aug 2026, and the alleged budget-deal schedule is unlocated at primary; pricing
the lower rate understates out-year tax on the RMD/withdrawal stream — the optimistic
cardinal-sin direction. **Build 3.99% flat, directionalUntilPinned. Building 3.49%/2027
violates the veto** — the S6 hook is the sanctioned self-correction path.

## Dissent (preserved)

**Minimalist:** ship NC+PA ONLY (3-arm picker, no FL) — FL is a named-maybe nobody bets on;
the calmest on-ramp. **Flip condition:** if FL's null-module + primary pin proves non-trivial,
or the 4th arm breaks the picker's calm or the one-frame law, drop FL into "another state."
Five elders carried FL as the honesty-demonstrating sourced-$0; Briggsy's eye can override
toward NC+PA-only via the digest. ⚑

## Explicitly OUT (do not build)

- The dollar-figure state-tax detail door (rides the filed Medicare-only door family as its
  own later cold-read-bearing unit).
- SC/GA/DE pricing (deferred until primary-pinned + hooked; their arrival REOPENS S2.8 and
  mandates the graduated-state caveat).
- State tax in the bracket-fill ceiling rails (v1; see S2.8).
- PA Tax Forgiveness, US/PA-obligation interest exemptions, Philadelphia SIT, NC
  out-of-state muni addback, Bailey/military carve-outs (each conservative-direction or
  out-of-population; named in constants notes/residual, never silently modeled).
- Any 50-state generic model (REJECTED WITH CAUSE — never revive without a council).
