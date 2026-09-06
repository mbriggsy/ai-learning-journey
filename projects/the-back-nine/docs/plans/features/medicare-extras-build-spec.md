---
title: "The Ask-for-Medicare-Extras Unit — build spec (council-ratified)"
doc-type: build-spec
status: shipped
---

# The Ask-for-Medicare-Extras Unit — build spec (council-ratified)

> **Identity:** a wf-tracked Act-3 follow-up engine+intake unit, **not a U-number**. Ratified by
> council **wf_efc6ece2-675** (2026-07-11, full bench, 17 agents, **high 8/10, action: execute**)
> on **Briggsy's GO** (2026-07-11, "definite go") with his **binding product directive**:
> national-average FIRST-PASS adoption is sanctioned — *"valuable for a user's first pass thru
> and then refine in subsequent passes."* Provenance: his live cold-read arc (the residual's
> ownership clause bounced three rounds → "why don't we just ask for it? … correctness always
> out rules everything"). This unit AMENDS the Medicare containment ruling's F3 scope
> (wf_4c8cd836-b22) by its author's own directive — it EXTENDS the additive premise (the tool
> adds what it knows; the user now tells it what it can't derive), never reverses it.
> **Tier split:** council-decided on ALL mechanics below (execute); tone/copy — the
> payment-fork wording, the load-bearing MA-$0 fork line, the door-sheet disclosure copy, the
> bi-directional standing-disclosure wording — produced by the build, then routed to the Caddie
> pre-walk and **pilot-cleared + shipped per the 2026-07-11 batched-oracle grant** (his eye
> audits any-time + at the Briggsy-bar gauntlet; the tape scores every prediction).
> **Status: SHIPPED 2026-07-11 (`503213f4`) + CLOSED 2026-07-12.** Per-unit status lives in the
> roadmap's You-Are-Here table ([`docs/roadmap.md`](../../roadmap.md), the U11 row) — never
> re-typed here. The sections below record WHAT SHIPPED and why it took that shape; the hawk's
> six forbidden shapes and the preserved dissent remain standing constraints on any revision.
> The Caddie pre-walk (wf_7a620d35-4ca, the codified panel's first run) chaired FIVE cards
> PILOT-CLEARED with two chair fixes folded live: the assumption panel's unanswered-fork
> STANDING line (the rule-38 details home for the funded typical, without pre-checking an arm
> the user never chose) and the spend step's keep-state-tax-INSIDE instruction.

## F1 — intake shape

The `medicare-extras` step (`src/intake/questions.tsx:878-898`) renders a **per-person PAIRED
fieldset on ONE screen** (the two-person law) through the shared `Paired` wrapper — never
household-combined-then-split (that fabricates a split the domain doesn't support, forfeits the
survivor-precision win, and the ACA combined-then-split precedent is a FALSE analogy here).

- Each person's own combined monthly Part D / Medigap / Medicare-Advantage premium is asked as
  **one dollar figure** behind a **legible three-arm PAYMENT FORK** — `MedicareExtrasFork`
  (`src/intake/questions.tsx:790`), a vertical `SegmentedControl` over
  `'none' | 'entered' | 'typical'` — never a plan-type/MA-vs-Medigap taxonomy the user can't
  self-sort. The shipped arm labels (`src/ui/copy.ts`) are "About nothing beyond Part B (common
  on Medicare Advantage)", "A monthly premium — entered below", and the slot-templated "Not
  sure — use a typical figure (about $N a month)". **The MA-$0 fork line is LOAD-BEARING copy,
  not polish.** The dollar field appears only under the entered arm (the COLA-mode precedent),
  and re-tapping that arm keeps an already-entered dollar (idempotent) while a fresh pick starts
  blank.
- **Optional-with-average, never a required fact** (a required fact strands the non-finance
  survivor and blocks the calm first pass — U12 doctrine; R5 never-gate). Nothing on the step
  blocks advance except the self-contradictory entered-with-no-dollar half-answer, which the R19
  sanity rule `medicare-extras-entered-blank` (`src/intake/sanity.ts:291-306`) names at the field.
- **WHO:** the step is gated on `anyNearMedicare` (`src/intake/questions.tsx:1185-1186`) — any
  member aged 64 or older, the same cohort gate as the IRMAA seed
  (`src/intake/questions.tsx:1204` pushes both under the one predicate). That covers the all-65+
  household and the NEAR-65 date route, but it is narrower than the ratified intent of "everyone
  whose run route-prices Medicare": a household with nobody yet 64 is never asked, while its date
  route still prices Medicare from each member's 65-crossing. Two things keep that gap honest and
  make it a deferred ask rather than forbidden shape (b): the engine-side degradation below funds
  the conservative typical at each crossing (the crossing year itself is a shipped golden,
  `src/engine/__tests__/medicareExtras.test.ts:191-225`), never a silent $0; and the F5 disclosure
  homes key off the run's built params, not ages, so the never-asked household is still TOLD the
  typical is being funded. Widening the gate is a live option, not a correction.
- **Degradation:** `resolveMedicareExtrasMonthly` (`src/intake/intakeMap.ts:996`) is the ONE
  fork→dollar owner. An absent field, an `'unanswered'` entry, a `'typical'` entry, and a
  half-entered `'entered'` with no committed dollar ALL fund the conservative-HIGH typical;
  only the affirmed `'none'` arm resolves to $0. Absent-means-$0 would delete a real recurring
  bill post-flip = the cardinal optimistic sin — the MIRROR of `oopMedicalAnnual`, whose absence
  is pessimistic-safe. Nothing is pre-selected, so the MA plurality actively lands on $0. An
  AFFIRMED $0 is honest; a SILENT $0 is the sin.

## F2 — anchor + provenance

- The typical is a **conservative-HIGH regime figure** — the Medigap+Part-D path — carried as the
  single canonical entry `medicareExtrasTypical` in `src/engine/constants/health.ts`, with its two
  primary-sourced components (the CMS national base beneficiary Part D premium and a sourced
  national Medigap Plan-G typical) each held verbatim and the COMBINED monthly figure DERIVED by
  `medicareExtrasTypicalMonthly()`, never re-typed anywhere — including here. The entry carries
  `{ value, citation, directionalUntilPinned }` and throws if unvalued
  ([`docs/architecture.md §8`](../../architecture.md)). **NEVER a population MEAN** (the bimodal
  MA/Medigap distribution's mean is dragged down by the MA-$0 mass → understates the Medigap
  couple = optimistic). Never from model memory: both components were researched and adversarially
  second-sourced, and the U14 S0 pin pass (2026-07-18) PINNED the entry
  (`directionalUntilPinned: false`) and refreshed the Medigap component, minting the vintage
  `extras-2026a` → `extras-2026b` deliberately to fire the staleness clock on vaults that had
  adopted the old figure. No official national Medigap average exists to pin to; the constant's
  `pinTo` says so explicitly rather than naming a source that isn't published.
- **Per-person explicit persisted provenance stamp.** `MedicareExtrasEntryV3`
  (`src/shared/model.ts:2064`) discriminates on `kind` — `'none' | 'entered' | 'typical' |
  'unanswered'` — with `adoptionVintage` recording the era adopted, keyed to the SAVED era and
  never re-derived from `value == current-typical` (the `src/shared/appDefaults.ts:8-15`
  saved-era inversion trap). `'unanswered'` is the honest persisted hole: it funds the typical
  but carries NO adoption stamp, so the system never fabricates an adoption the user didn't make,
  and it never silently writes the value field.
- **Standing disclosure is PER-PERSON and BI-DIRECTIONAL**, mechanism-named (corpus rule 37).
  It ships in three shapes in `src/ui/copy.ts`: the picked-typical note at the fork
  (`medicareExtrasTypicalPicked`, a fixed string that carries no figure at all), the hero's
  residual appendix (`medicareExtrasTypicalOne`, which names the person, and
  `medicareExtrasTypicalBoth`, which collapses two on-typical people into one unnamed sentence —
  each saying real costs "run higher or lower, including next to nothing on many Medicare
  Advantage plans"), and the door sheet's per-person fact line (`medicareExtrasFactTypical`,
  which names the person). Every template that carries the dollar carries it as a pre-formatted
  SLOT, never a digit in the string. Refine path = the assumption-panel
  seat + the U13 re-entry walk.
- **R7 via a TOP-LEVEL draft key.** `medicareExtrasByPerson` sits at the top level of
  `ScenarioDraft` by deliberate design (`src/ui/assumptionRegistry.ts:87`) — a nested `health.*`
  sub-field would dodge the compile gate (the assumptionRegistry.ts:84 landmine) — and is
  registered `{ kind: 'row-editable', seats: ['medicare-extras'] }` at
  `src/ui/assumptionRegistry.ts:153`. The panel seat (`src/intake/AssumptionPanel.tsx:814-830`)
  re-hosts the SAME `MedicareExtrasFork` face over the same write shape, `onWrite` adapting to
  the host's commit seam — and passes `standingNote`, which the intake step does not: when the
  fork is UNANSWERED the panel shows the read-only line naming the typical the plan is funding
  meanwhile. That was a Caddie chair fix (2026-07-12): the details home has to let the reader
  CONFIRM the dollar the verdict quotes (rule 38), but pre-checking the typical arm would
  fabricate a choice the user never made (rule 14), so the fork stays blank and the STANDING is
  disclosed beside it. Never at intake, where the user is mid-answer and "it's already handled"
  steers toward inertia.

## F3 — engine channel (HARD LOCK — red-team Attack 2)

- Extras fund as a **per-person HETEROGENEOUS VECTOR** — Σ over {living ∩ enrolled} of that
  person's own premium × 12, **ending at each death** — **NEVER `enrolledCount × average`**
  (count×avg reproduces the exact optimistic survivor under-charge per-person was chosen to
  kill; it passes symmetric couples and hides in aggregate). The Σ lives in the tax overlay's
  year loop (`src/engine/taxOverlay.ts:1603-1607`), indexing
  `OverlayParams.medicareExtrasMonthly` by `regime.medicareEnrolledIndices` — the canonical
  living∩enrolled index set minted for exactly this purpose
  (`src/engine/taxOverlay.ts:548-559`), which holds only IDENTITY-MATCHED members so a stranger
  ref throws at the year loop's identity guard rather than silently dropping a member's premium
  from the Σ (the cost-understating direction). base+surcharge stays the existing count×uniform
  line in `medicareAnnualCost` (`src/engine/healthOverlay.ts:689-702`), untouched.
- **Ship gate, met:** the DND-012 externally-derived **ASYMMETRIC survivor golden** ships as
  `src/engine/__tests__/medicareExtras.test.ts:86-159` — extras `[0, 200]` with the $0 owner
  dying first, hand-derived per year, so the survivor is still charged their full $200×12; the
  mirrored ordering `[200, 0]` proves the two orderings genuinely differ (a count×avg build
  cannot separate them). Planted count×avg mutants went RED three times before trust (the
  planted-witness discipline is insight 081; insight 080 is this unit's OTHER lesson — the
  disclosure predicate of F5 — and says nothing about mutants).
- Reduce-to-spine holds: absent ≡ all-zero extras is **byte-identical** across terminal,
  lifetime Medicare, tax, and the per-year sink
  (`src/engine/__tests__/medicareExtras.test.ts:160-190`), and the shipped Medicare goldens
  (wf_4c8cd836-b22, `src/engine/__tests__/medicarePricing.test.ts`) re-pass UNCHANGED with extras
  off — the unit's commit `503213f4` does not touch that file at all, so no golden expectation was
  edited to accommodate the vector: a superset, not a perturbation.
- The vector is validated like its per-person siblings: `validateParams` rejects a negative
  entry (the insight-046 netted-away optimistic class), a NaN entry, and a length mismatch
  (`src/engine/simulate.ts:721-724`), and the overlay's direct callers get their own up-front
  length backstop (`src/engine/taxOverlay.ts:1260-1264`) so a short vector on a two-person
  household throws rather than under-charging.
- Extras are **real-flat**, and deliberately NOT ridden on the Part B trend: Medigap/Part D plan
  premiums are user-entered market figures with no sourced trend. The 2026-07-19 trend sourcing
  unit (council wf_c673339e-257) moved Part B, its surcharge, and later the drug-plan surcharge
  piece onto sourced trends, which NARROWED the still-flat residual's referent to the extra-
  coverage premiums alone — a swap in the disclosure, never an add. The real-flat choice stays
  disclosed and inherits the Act-4 IRMAA-cliff landmine
  ([`docs/architecture.md §7.2`](../../architecture.md)).
- Extras are excluded from the HSA qualified-spend cap (Pub 969): the cap stays OOP medical plus
  base Medicare, and extras ride the funding need instead
  (`src/engine/__tests__/medicareExtras.test.ts:226-257`).

## F4 — boundary + fence

- spendHelp's "(including any Part D or Medigap premiums)" clause **flipped OUT** in the same
  commit as the engine funding. The shipped line (`src/ui/copy.ts`, `spendHelp`) is
  mechanism-named, never a memory referent: "Leave out the Medicare premiums the tool prices
  itself: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium —
  the tool handles those separately and adds them on top itself."
- **The boundary NEVER flips ahead of the engine funding** (fund-first if phased: the forward
  gap is a double-OMISSION = optimistic; the reverse is a double-count = pessimistic-safe). It
  did not have to be phased — `503213f4` carried both.
- The **insight-058 writer enumeration** ran as a ship gate, not an assertion (every
  `annualSpendingReal` writer plus `budgetYearZeroFullTotal` under the flipped semantics) and
  came back clean: extras is funding-side and is NOT a writer of `annualSpendingReal`.
- Installed-base double-count is pessimistic-safe, and **no migration shipped** — by design, but
  no separate follow-up was filed either. A vault saved before the flip keeps a spending figure
  that still contains its Part D/Medigap premiums and now has extras added on top; the reworded
  `spendHelp` is re-entry-visible, so the correction surfaces the next time the household walks
  the spend step rather than through a silent rewrite of their number.
- The residual pair moved **as a set**: the Part D/Medigap "inside your spending" clause DIED ·
  the state-tax clause STAYED (endogenous — wf_cc065e3b-bc1) · the real-flat clause EXPANDED to
  cover the new base. Two later units moved these again and are worth knowing before re-reading
  the shipped strings: the extras pre-walk (2026-07-12) split the tax boundary so federal leaves
  the spending figure while STATE stays inside it (the old "leave out income taxes too" had a
  taxed-state household's state bill landing nowhere — the optimistic direction), and the
  state-tax unit later added the `spendHelpStatePriced` twin that flips only that sentence for a
  priced state. **O11 CLOSED as RESOLVED** by the extras ultramode review: oopHelp's blanket
  "premiums" line traces literally true post-flip, the sole latent nit being the rare purchased
  Part A, which is consistently carved out.

## F5 — disclosure routing (HARD LOCK — red-team Attack 1; healthSheetChrome.ts:325 + Result.tsx:217-221)

- The extras affirmative + per-person adopted-typical provenance + the bi-directional disclosure
  needed a **RENDERED HOME for BOTH populations**, because `showMedicarePricedNote`
  (`src/ui/healthSheetChrome.ts`) structurally suppresses the verdict residual for every
  pre-65-window household — the exact cohort this unit insists must be priced. Both homes
  shipped:
  - **Population A (non-door / all-65+):** the widened `verdictMedicarePriced` affirmation now
    names extra coverage alongside Part B and its surcharge, and an on-typical household gets a
    per-person bi-directional sentence appended INSIDE the residual paragraph via
    `composeMedicareExtrasTypicalNote` (`src/ui/healthSheetChrome.ts:359`), wired at
    `src/ui/Result.tsx:222-229`. Appended, not a new frame row — the one-frame fit law's tallest
    composite.
  - **Population B (near-65 date route / the Healthcare door):** the door sheet carries its OWN
    legible extras block — never buried in the six-item run-on — from
    `composeMedicareExtrasLines` (`src/ui/healthSheetChrome.ts:377`) under the
    `medicareExtrasSheetLead` heading, rendered at `src/intake/HealthcareSheet.tsx:192-206`. The
    per-person fact line carries the provenance as its load-bearing content: whose number, and
    whether it was entered, affirmed, or typical.
- Both homes consume ONE assembly, `medicareExtrasDisclosureView`
  (`src/intake/intakeMap.ts:1051`), which keys off the run's route-aware **BUILT-params output**
  (`buildParams(d)?.overlay`) — never ages or inputs — and returns NULL when the run prices no
  Medicare-bearing overlay at all, so no claim is made. The three-way provenance
  (`'entered' | 'affirmed-zero' | 'typical'`) is read from the draft, which is honest: who chose
  what at the fork is an intake claim, not an engine claim. The dollar is always the producer's
  own output (insight 081). The single-sourcing of this assembly, and a five-arm battery over the
  hero composer's arm selection including a who-correctness mutant seen RED, were the extras
  ultramode review's one confirmed finding, folded 2026-07-12 (`019f5334`).
- **FLOOR (not exercised):** had the build been unable to deliver a door disclosure home, extras
  pricing for door households would have GATED until it existed (or become a required entry-time
  disambiguation) — a silent, permanent, undisclosed typical on the door path is worse than a
  small ask. The door home shipped, so the floor never fired.

## Ship gates (all met at close)

- **Codec.** The persisted per-person entry is range-gated in `src/shared/scenarioCodec.ts:755-784`:
  the `'entered'` dollar runs `needFinite` → `needNonNegativeDollar` (`scenarioCodec.ts:384`,
  throws `Corrupt`) — deliberately NOT the siblings' `optFinite` / finite-only
  `checkFiniteArray`, because a negative extras premium inside the funding sum is the insight-046
  optimistic class the engine cannot backstop. Both biconditionals are enforced in both
  directions (`monthly` iff `'entered'`; `adoptionVintage` iff `'typical'`), so a mismatched pair
  is unrepresentable-persisted, and the array must hold exactly one entry per person. ScenarioV3
  additive-optional — no v4.
- **DND-012 externally-derived fixtures**, including the F3 asymmetric survivor golden (F3 above).
- **verify:fit arms re-pinned WITHOUT assuming monotone shrink** — the omission axis shrank but
  the real-flat clause broadened. The fit spec now pins non-typical extras arms explicitly
  (`e2e/vertical-fit.spec.ts:817`, `:1401-1403`), and the CSP intake walk learned the fork step
  (`e2e/csp.spec.ts:231`, the one integration gap `503213f4` left, fixed in `e921f2bb`).
- **Color-blind-safe encoding** on adopted-vs-entered / typical-vs-your-bill / priced-vs-residual:
  every distinction is carried in words, never a hue. Each door fact line states its provenance in
  prose ("the figure you entered" / "as you answered" / "a typical figure … not an actual bill"),
  the hero appendix names the person and the direction in a sentence, and the panel's
  unanswered-fork line says so outright. The fork carries no requiredness marker at all — it is
  optional-with-average by design, so there is no red-asterisk state to encode.
- **Insight-076 re-audit of `validateParams`.** The overlay length backstop that was added is
  purely downstream of the existing gate, so it narrows no contract — noted in place at
  `src/engine/taxOverlay.ts:1258-1259`.
- **Dev-seed drift recorded before any re-tune.** The flagship `retiredOnTrack` seed carries the
  mixed-provenance showcase — one entered dollar, one affirmed MA-$0
  (`src/ui/devSeeds.ts:107-108`) — and the `borderline` / `?seed=dip` seeds were re-probed under
  the extras engine on 2026-07-11 and again through the U14 S0 typical refresh.
- The unit landed as ONE feature commit (`503213f4`, the ACA-sheet real-flat gap kept to its own
  touch, never a rider), then the integration fix `e921f2bb`, the ultramode fold `019f5334`, and
  the Caddie close `cad2529e`. Sequence as ratified: ultramode review → Caddie pre-walk →
  pilot-clear + ship (the 2026-07-11 batched-oracle grant — his eye audits any-time + at the
  gauntlet).
- **Staleness.** The `extras-typical` clock (`src/store/staleness.ts:524-543`) fires only when the
  saved stamp carries an extras vintage, that vintage differs from the current one, AND the
  household is actually exposed (an absent or `typical`/`unanswered` fork answer). It is mapped
  to the `medicare` family in the exhaustive `HEALTHCARE_CLOCK_FAMILIES` record, so a clock with
  no explanatory line is a compile error rather than a nameless alarm.

## The hawk's scoped veto — SIX FORBIDDEN SHAPES (standing build constraints)

(a) a population-MEAN adoptable default · (b) $0 for an unasked near-65 date-route household ·
(c) the "extras priced in" affirmative without the narrowed residual, or spendHelp flipped ahead
of funding · (d) door/near-65 extras priced without a disclosure home surviving
`showMedicarePricedNote`'s suppression · (e) a count×avg engine build · (f) a
household-combined-then-split value feeding the per-person channel.
The veto was never live against this spec — the build that shipped IS the honest alternative the
hawk endorsed (conf 9). The six shapes remain forbidden for any future revision.

## Dissent (preserved — red team Attack 3, hawk partially holding)

The conservative-HIGH default systematically over-prices the ~half of enrollees on Medicare
Advantage (calm-but-ALARMIST — later fuck-off dates for the MA plurality), and every disclosure
surface warns only one direction. Resolved via the legible payment fork + bi-directional
disclosure, both of which shipped: the MA-$0 arm leads the fork, and every typical-figure
sentence in the product says real costs run higher OR lower, "including next to nothing on many
Medicare Advantage plans." **Flip condition, still open:** empirical evidence (Caddie / his eye)
that the fork does NOT reliably steer MA users to the $0 path. The Caddie pre-walk cleared the
fork on 2026-07-12 without raising it. Even if it flips, the fix is steering prominence — **the
anchor direction never flips** (lowering it re-introduces the optimistic sin for Medigap
couples), and the 2026-07-18 U14 S0 refresh moved the anchor UP, not down.
