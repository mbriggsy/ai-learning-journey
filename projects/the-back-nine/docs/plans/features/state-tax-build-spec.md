---
title: "The State-Tax Engine Unit — build spec (council-ratified)"
doc-type: build-spec
status: shipped
---

# The State-Tax Engine Unit — build spec (council-ratified)

> **Shipped 2026-07-15** (build + ultramode fold wf_e485b96d-85a → 388b8821 + Caddie pre-walk
> wf_96397de6-244; the state seed increment followed 2026-07-16). This document is the as-built
> record of the unit: the decisions, their reasoning, and the shape that actually landed. Per-unit
> status lives in the roadmap's You-Are-Here table
> ([`docs/roadmap.md`](../../roadmap.md)), never here.
>
> **Identity:** a wf-tracked Act-3-adjacent engine+intake unit, **not a U-number**. Scope was
> ratified by council **wf_cc065e3b-bc1** (2026-07-11 — roster-exact coverage, broad brush
> REJECTED WITH CAUSE); this BUILD PLAN was ratified by the pre-build council
> **wf_d04148cb-1e5** (2026-07-15, full bench, 21 agents, **high 8/10, action: execute**,
> tier: council-decided) over the 14-agent primary-source research packet (wf_7bc1f76d-6cc:
> NC+PA deep dossiers with per-figure adversarial second-source verification — 82 CONFIRMED,
> 71 PRIMARY-PINNED; the packet is journaled with the run). **Trigger was MET at filing:** NC
> taxes IRA withdrawals and Roth conversions; Briggsy lives there — the unit landed before
> anyone bet real money on the answer.
> **The red team broke the emerging consensus THREE times (all cardinal-direction/optimistic,
> all conceded in rebuttal and folded below):** the 3.49%/2027 posture (→ the hawk's veto,
> §V), the bare `isDateRoute` predicate disjunct (→ S5), and the truthiness-keyed
> reduce-to-spine short-circuit (→ S2.5).
> **Tier split:** council-decided on ALL mechanics below. The three ⚑ yours-to-close calls
> (ship-at-high-confidence per the 2026-07-11 batched-oracle grant) — FL's presence in the v1
> picker, the affirmation wording, the picker's rendered feel — were closed by the Caddie
> pre-walk; Briggsy's eye still supersedes.
> **Built as ONE reviewable commit, no riders (insight 051).** Run-record note: the council's first
> pass lost three seats to oversized StructuredOutput calls; the size-law patch (efd8585e) is
> already in `council.js` — all nine seats voted on the resumed run.

## S0 — the sentinel reconciliation (landed first; contradictions mean STOP)

- `src/engine/constants/tax.ts:342-359` `stateIncomeTax` had been `OUT-but-disclosed` with the
  note *"Configurable context; neither sequencing nor conversion moves it"* — **FALSE** for the
  roster (NC taxes conversions at the flat rate; the D6 falsifiable rule "IN iff sequencing or
  a conversion can move it" **reclassifies state IN** for priced states). The sentinel was
  reconciled BEFORE any pricing code and now carries
  `{ status: 'IN-for-roster; OUT-but-disclosed-elsewhere', pricedRoster: 'NC, PA, FL' }`; the
  `inOutRule` sibling (tax.ts:361-369) and the module banner (tax.ts:1-9) moved with it, and
  every consumer of the old "state isn't priced" wording was swept (the S5 disclosure map is
  the render-side half of that sweep).

## S1 — the v1 roster + constants

- **PRICED_STATES v1 = {NC, PA, FL}.** NC + PA are the real households (Briggsy NC, Craig PA),
  every load-bearing figure PRIMARY-PINNED + second-source CONFIRMED. FL ships as a **sourced
  constitutional $0** (Fla. Const. Art. VII §5(a) — a pinned figure with its own re-verify
  record, NEVER a silent default; burned/062). **SC/GA/DE are DEFERRED** (SC verification
  incomplete, GA rate/SD secondary-graded for the highest-stakes lever, DE military tier
  disputed) — an unbuilt state keeps today's disclosed-out posture VERBATIM.
- **Constants discipline:** the year-keyed state table is its own module,
  `src/engine/constants/stateTax.ts` (joins `taxConstants` so ALL_CONSTANTS / the shape test /
  the vintage digest pick it up automatically, and so a state-only rate change gets its OWN
  staleness clock rather than riding the federal tax stamp). Per state: a
  `StateFlatRateSchedule` of dated steps plus `standardDeduction {mfj, single}`, base system,
  and the SS / retirement-income / conversion / capital-gains treatments — every figure
  `sourced` with `{value, citation, directionalUntilPinned}`, per-figure citations split
  statute-vs-DOR (insight 022). Distinctive figures live ONLY here behind the copyGuard
  DISTINCTIVE gate; NC's $25,500 MFJ collides with an unrelated SS-taxable figure elsewhere in
  `src/`, so it is pinned by a shape-test assertion instead of the substring gate.
- **NC (primary-pinned):** the flat rate applies to (federal-AGI-derived base − standard
  deduction **$25,500 MFJ / $12,750 single**, fixed statutory dollars, not indexed, no 65+
  add-on); SS **fully exempt** (G.S. 105-153.5(b)(3)); conversions **fully taxed** at the flat
  rate with no age or source condition; dividends/gains **ordinary** (no LTCG preference);
  **no local income tax** statewide; Bailey/military carve-outs OUT (private-sector household;
  named in the constants note, never modeled).
- **NC out-years — the enacted step schedule (see §V for the veto this retired):**
  `ncRateSchedule` prices the dated steps enacted by **S.L. 2026-41 (SB 257) § 44.1(a)**, the
  base budget act that rewrote G.S. 105-153.7(a) (ratified 2026-07-02, signed 2026-07-07;
  session-law text fetched from ncleg.gov and pinned 2026-08-02, `directionalUntilPinned:
  false`). The rates themselves are not re-typed here — they live in the constant and in
  [architecture.md §7.1](../../architecture.md). The same section also rewrote the revenue-trigger
  table at **G.S. 105-153.7(a1)**, STRIKING every trigger row through FY2032-33, so the 2027+ rates are no longer trigger-conditional and the first
  surviving row is FY2033-34 → TY2035 (step 0.50pp → 0.25pp, floor unchanged) — the next
  live-flip event is the Office of the State Controller's **August-2034** accounting, a decade
  out. **SOURCE LANDMINE:** NCDOR's rate-schedules page still shows the struck "after 2025 —
  3.99%" citing SL 2023-134, and the codified G.S. page had not recompiled at pin date; both
  read as CONTRADICTING the table until they catch up — session law wins, do NOT "correct" it
  back. `ncRateSchedule` keeps `reVerifyEveryBuild` anyway (a budget act rewrote this table
  mid-session once already); the S6 record carries the annual cadence, `nextDue` 2027-08-02.
  Adding the steps moved the `StateTaxVintageV3` stamp, so saved NC vaults stale on unlock by
  design — the out-years they priced genuinely changed.
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
   per-year gross-up fixed point as a **second addend at `taxOverlay.ts:867-879`**
   (`solveGrossWithdrawal`) — never bolted on after convergence. `GrossUpContext` carries the
   state code; the calendar threads as `startCalendarYear + t` (the senior-bonus pattern —
   the rate lookup **CONSUMES the year**, insight 074). That last point stopped being
   hypothetical on 2026-08-02: NC's enacted step-down now prices out-year by out-year, and an
   overlay that had frozen the rate at t=0 would misprice every year after 2026.
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
   DELTA ships as a DND-012 fixture — this asymmetry is exactly why the broad brush was
   rejected.
4. **The k re-derivation (insights 006/007 — a correctness obligation, PROVEN in code):**
   NC/PA exempt SS, so the state term rides WITHOUT the ×1.85 torpedo multiplier — the state's
   flat rate enters additively at the federal-worst corner instead of multiplied. The
   re-derived worst-case contraction factor and the raised `GROSS_UP_MAX_PASSES` have ONE home,
   [architecture.md §7.1](../../architecture.md) and `taxOverlay.ts:507`; the derivation is
   justified in the comment at `taxOverlay.ts:466-490` with the new corner. The convergence
   stress sweep was **RE-RUN STATE-ON at the federal-worst corner** (small-net × low-basis ×
   large-SS × NC) — a state-OFF or large-net probe samples the benign regime (insight 006's
   exact trap).
5. **Reduce-to-spine byte-identity — MEMBERSHIP, not truthiness (red-team fold):** the
   state branch keys on **`PRICED_STATES` membership** — `'elsewhere'`, absent, and every
   unbuilt state take the **literal `+ 0` no-op branch structurally** (a truthy-string key
   would CALL the module and compute-then-zero, perturbing float lineage). Byte-identity
   arms: absent field, `'elsewhere'`, and each unbuilt roster state, all against the golden
   spine.
6. **validateParams / R19:** the state code is an ENUM-MEMBERSHIP gate (the `filing` idiom,
   simulate.ts:622) — an out-of-union value crossing the worker boundary returns the calm
   indeterminate, never a silently-selected branch; mirrored fail-loud backstop in
   `runTaxAwareDecumulation` for direct callers.
7. **Survivor transition (insight 014):** the NC standard deduction moves $25,500 → $12,750
   at the `resolveYear` MFJ→single crossing (same-year semantics as the federal transition);
   the crossing-year externally-derived fixture ships (the widow's state cliff).
   PA has no deduction — its survivor delta is structural (nothing to halve).
8. **Bracket-fill ceiling rails: state stays OUT in v1** — provably near-lossless while every
   priced state is flat-or-zero (a constant flat rate cannot move the conversion-size
   optimum; NC engineNotes, five-elder triangulation). **This ruling REOPENS the moment a
   graduated state (SC/GA/DE) joins the roster** — a standing constraint carried in the
   k-derivation comment (`taxOverlay.ts:475-478`) and re-stated in
   [architecture.md §7.1](../../architecture.md).
9. **Accounting:** state tax folds into the year's tax-paid surface the way federal does
   (`taxPaidThisYear`, taxOverlay.ts:1787 family) — one lifetime-tax lens, no parallel ledger
   in v1.

## S3 — intake + the R7 seat

- **The state question is a HOUSEHOLD-level single-question step placed BEFORE `spendStep`**
  (so `spendHelp` can conditionalize on the answered state, S5.1) — `questions.tsx` pushes it
  between `ssStep` and `spendStep`, and the placement is load-bearing. It is a changeable best
  guess: NON-BLOCKING (`fields: []`, so attempt-to-advance finds no rule to fire),
  optional-with-explicit-`'elsewhere'` — never a hard wall, never a silent default to any
  state. Two route-true faces share one body (the Caddie chair fix, 2026-07-15): a working
  household reads "Where WILL you live…", an already-retired one the present-tense heading
  (`stateStepRetired`, picked by `anyWorking`).
- **Picker: the existing vertical SegmentedControl, REUSED** (fields.tsx:296-357 — native
  radios in fieldset/legend, active state by weight+fill+text never hue, a visible ring via
  `.segment:has(input:focus-visible)`, ≥24px rows): **4 arms — NC · PA · FL · "somewhere
  else"**, and NOTHING is active until the household answers (the honest not-set face). NO
  new component, NO bespoke div-listbox (CSP + a11y + calm); native `<select>` is the
  sanctioned fallback only if the priced roster ever outgrows a calm row count. A picker arm
  only exists for a state whose pick CHANGES the answer — never a theater option that
  collapses to 'elsewhere' (advocate's trust law); the deferred {SC, GA, DE} are values the
  persistence layer accepts but the picker does not expose. The one control
  (`StateResidencePicker`) is shared by the intake step and the R7 panel seat, host-supplied
  commit seam (the MedicareExtrasFork precedent).
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
  vault (074's law: a stamp nothing reads prices nothing). The comparator is EXPOSURE-GATED on
  the state the run actually priced (`pricedStateForRun`'s built-overlay answer), so a
  household reads a stale-clock only for rules that moved under it. The stamp fingerprints the
  whole serialized schedule rather than a current-year scalar — which is why the 2026-08-02 NC
  step addition staled saved NC vaults by design.
- **Installed base (red-team fold):** state tax needs a NEW input a pre-unit vault lacks, so
  the step lands **UNCONDITIONALLY** in `intakeSteps` and the U13 update walk-through therefore
  prompts it; until answered the household keeps the disclosed-out posture. Never a silent
  geographic default.

## S5 — disclosure routing (the render-side of S0)

1. **`spendHelp` goes state-aware** (the step order in S3 makes the state known): a
   PRICED-state household is told the tool prices its state tax — **leave it out of
   spending** (the keep-it-inside instruction would DOUBLE-COUNT now that pricing has shipped —
   the federal double-count class the 2026-07-11 oracle settled); `'elsewhere'`/unanswered
   keeps today's keep-it-inside instruction verbatim. spendHelp is intake-only (seeds/vaults
   bypass it) — the always-rendered surfaces below carry the installed-base correction.
2. **The monolithic strings SPLIT into composed clause-parts** (the
   composeMedicareExtrasTypicalNote pattern), re-composed in ONE pure home,
   `src/ui/stateTaxDisclosure.ts` — the honesty decision lives there and is tested there, never
   in a render path (insight 048). The UNPRICED composition is byte-identical to the shipped
   monolith (a copyGuard drift-pin proves it), so a non-priced / `'elsewhere'` / unbuilt-state
   household reads today's words verbatim. The per-state affirmation switch is EXHAUSTIVE by
   construction — no catch-all arm, so widening `PricedState` fails `tsc` until the new state's
   own affirmation ships, rather than silently dressing a future SC household in Florida's
   "no state income tax" words.
3. **FIVE disclosure homes, not the four this plan first named** — `verdictMedicareResidual`
   (copy.ts:1060), `rothOmissionsNote` (copy.ts:915), `controlHealthOmissionsNote`
   (copy.ts:1012), the spendHelp branch (`spendHelpKeyFor`, intakeMap:981), and the
   RECOMMENDATION surface's disclosure rail (`recDiscStateTax`). The fifth was born unguarded:
   it shipped as the only household-DEPENDENT builder with no condition, so an NC household
   would read "this compares federal tax only" three inches under a spine that had just named
   their state. It had never co-rendered before the 2026-08-02 NC lift — no priced-state
   household could reach a committed recommendation — so the contradiction was newly reachable,
   not a regression. Each home is gated INDEPENDENTLY (insight 078's sibling-by-chrome law).
   The four shipped gates were each proven RED under a planted mutant; the fifth carries its own
   killing pair instead — the rides-unpriced / drops-for-every-roster-state assertion plus a
   pin that the view actually FORWARDS `pricedStateForRun` to the disclosure builder (the defect
   was never a wrong decision — the predicate was computed and simply never handed down).
4. **The statePriced predicate is PRODUCER'S-OUTPUT ONLY, roster-gated (red-team fold):**
   `pricedStateForRun` (intakeMap:808) reads the state-pricing answer off the route's own BUILT
   params (the `spineMedicarePriced` shape — buildSpineParams' overlay output; the date route
   reads its own builder's output), never geography and never ages. It returns a `PricedState`
   or `undefined`, so every one of the five homes swaps its clause by the SAME rule. **The bare `isDateRoute` disjunct is STRIPPED for state** —
   Medicare's version works only because dateSearch forces healthcare for every household;
   state pricing is roster-gated, so `isDateRoute ||` would falsely affirm "counted" for an
   'elsewhere' date-route household (insight 080's exact recurrence). The out-of-roster
   date-route mutant is pinned RED, as is the degenerate-overlay divergence witness (insight
   081 — the $0-portfolio household prices no state tax; its clause must NOT die).
5. **The affirmation ships OUTCOME-scoped, as an affirm+narrowed-residual SET** (never
   affirm-alone): "your NC state income tax is reflected in these numbers"-class language —
   **never an optimization claim** (honest for a flat roster where conversion size is
   provably state-neutral; the not-yet-state-optimized caveat becomes MANDATORY when a
   graduated state joins — the S2.8 twin constraint). AT-reachable labelled text in DOM
   order; reveals as ONE opacity unit inside confidence-reveal (no per-clause stagger);
   copyGuard-routed.
6. **Display home = option (b), leaner v1:** the engine prices NOW into every headline; the
   R7 seat is the input's rendered home; the qualitative affirmation/residual set is the
   output's home. **The dollar-figure detail door stays OUT** — it is a cold-read-bearing
   surface unit that earns its own commit + walk (options (a) build-the-door-as-rider and
   (c) gate-behind-the-door both REJECTED).

## S6 — the re-verify hook

- **`verify:state-tax`** (`scripts/verify-state-tax.ts`) mirrors `verify:aca`: a per-state
  `state-tax-{nc,pa,fl}-last-verified.json` record at the project root, plus a CI gate that fails
  when any is missing, hollow, unconfirmed, or past its `nextDue`. The gate is REAL, not
  local-only: `pnpm verify:state-tax` runs in the monorepo-root workflow
  `.github/workflows/verify-the-back-nine.yml` (line 48, beside `verify:aca`) — note the
  workflow sits ABOVE this project directory, which is why a search inside `projects/the-back-nine`
  finds no `.github/`. The roster is single-sourced
  from `PRICED_STATES`, so a new priced state cannot ship without a record. RED-proven on both
  a planted-stale record and a missing one. **All three states now sit on the ANNUAL drift
  cadence** — NC's FY2025-26 rate-certification checkpoint was retired 2026-08-02 when
  S.L. 2026-41 § 44.1(a) struck the trigger rows it waited on. **One cadence is not one deadline:**
  NC's `nextDue` is 2027-08-02 while PA's and FL's are 2027-07-15, and `scripts/verify-state-tax.ts:120`
  judges each record against its own `nextDue` (`:104-112`), so the gate reds in TWO waves 18 days
  apart — the roster's real deadline is PA/FL's, not NC's, and a July pass that clears PA + FL leaves
  NC red in August. Shape difference from the ACA mirror: these records carry an ABSOLUTE `nextDue`,
  while `aca-last-verified.json` uses a ROLLING window from `verifiedOn` + `maxAgeDays` —
  grepping `nextDue` to inventory deadlines silently misses the ACA gate. Deferred states get a
  record only when built.

## Ship gates

These were the conditions for calling the unit shipped; all were met on 2026-07-15 and the
gates still run.

- **DND-012 externally-derived fixtures per state:** NC hand-computed from the DOR worksheet
  (AGI-derived base − SD, at the year's rate, MFJ and single), PA class-based
  (taxable-account-only for 59.5+), the **NC-vs-PA conversion delta**, the **PA 59.5-crossing
  year**, the **NC survivor SD-halving crossing year**, FL $0. Never the engine validating
  itself.
- **The k proof:** the re-derived contraction comment, the raised `GROSS_UP_MAX_PASSES`, and
  the state-ON worst-corner stress sweep, all in-code.
- **Byte-identity battery:** absent / 'elsewhere' / each-unbuilt-state → golden-spine
  byte-identical (same seed); FL priced-$0 exactness.
- **Planted mutants RED:** every disclosure gate, the out-of-roster date-route predicate, the
  membership short-circuit (module-called-on-'elsewhere'), the vintage-clock consumer. Six
  mutants with named killing tests at ship; the fifth disclosure home (S5.3) was gated after
  the 2026-08-02 NC lift made it reachable.
- **Gates:** typecheck · lint · full suite · verify:bundle (fresh build) · verify:fit
  (picker step + panel row + shortened-residual frames re-proven; the ubuntu arm) ·
  verify:doc-stats · verify:state-tax · CI green by explicit run id. The CSP walk learned the
  step too — NC pricing is now proven under the enforced headers.
- **Caddie pre-walk** on every changed user-facing surface (picker, panel row, affirmation
  set, spendHelp branch): wf_96397de6-244, three cards PILOT-CLEARED with two chair fixes
  (live re-verified), filed per the batched-oracle grant.

## V — the hawk's veto (fired, honored, and RETIRED 2026-08-02 by the law changing)

**The rule today: NC prices the enacted S.L. 2026-41 § 44.1(a) step schedule, pinned** — the
out-year rates are transcription from session law, not prediction. What the veto forbade was
pricing an *unlocated* schedule, and that condition no longer holds.

**The veto as fired (2026-07-15), because a future builder will re-derive the question:**
pricing NC 3.49% for TY2027 was VETOED. The false belief it would have created is that NC's
2027 rate was confirmed law. It was revenue-trigger-conditional on a certification that did not
yet exist, and the reported budget-deal schedule **could not be located to primary session
law**; pricing the lower rate would have understated out-year tax on the RMD/withdrawal stream
— the optimistic cardinal-sin direction. So the table held 3.99% flat, `directionalUntilPinned`,
with the S6 hook named as the sanctioned self-correction path.

**That hook fired as designed.** On 2026-08-02 the schedule was located — S.L. 2026-41 (SB 257)
§ 44.1(a), ratified 2026-07-02 and signed 2026-07-07 — and the enacted steps went into
`ncRateSchedule` with `directionalUntilPinned: false`. The veto was right when written; what
changed is the law, not the bar. The standing constraint it leaves behind is the general one:
**never price an out-year rate that primary session law does not carry.**

## Dissent (preserved)

**Minimalist:** ship NC+PA ONLY (3-arm picker, no FL) — FL is a named-maybe nobody bets on;
the calmest on-ramp. **Flip condition:** if FL's null-module + primary pin proves non-trivial,
or the 4th arm breaks the picker's calm or the one-frame law, drop FL into "another state."
Five elders carried FL as the honesty-demonstrating sourced-$0, and that is what shipped — the
flip condition never fired: the FL module is a structural `0`, and the 4-arm picker cleared the
Caddie walk and the one-frame fit gate. Briggsy's eye can still override toward NC+PA-only.

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
