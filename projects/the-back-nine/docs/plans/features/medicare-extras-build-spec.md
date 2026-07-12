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

## F1 — intake shape

- **Per-person PAIRED fieldset, ONE screen** (the two-person law) — never
  household-combined-then-split (fabricates a split the domain doesn't support; forfeits the
  survivor-precision win; the ACA combined-then-split precedent is a FALSE analogy here).
- Each person enters their own combined monthly Part D / Medigap / Medicare-Advantage premium as
  **one dollar figure** via a **legible PAYMENT FORK at entry**:
  `[I pay ~nothing beyond Part B (common on Medicare Advantage)]` / `[I pay $__/mo]` /
  `[not sure → use a typical figure]` — never a plan-type/MA-vs-Medigap taxonomy the user can't
  self-sort. **The MA-$0 fork line is LOAD-BEARING copy, not polish.**
- **Optional-with-average, never a required fact** (a required fact strands the non-finance
  survivor and blocks the calm first pass — U12 doctrine; R5 never-gate).
- **WHO:** everyone whose run route-prices Medicare — all-65+ AND the near-65 date route. Never
  a 65+ carve-out.
- **Degradation:** absent/skip → the conservative-HIGH typical **FUNDED**, never a silent $0
  (post-flip, absent-means-$0 deletes a real recurring bill = the cardinal optimistic sin — the
  MIRROR of `oopMedicalAnnual`, whose absence is pessimistic-safe). The field starts **BLANK** —
  never pre-filled with the high anchor — so the MA plurality actively lands on $0. An AFFIRMED
  $0 is honest; a SILENT $0 is the sin.

## F2 — anchor + provenance

- The typical is a **conservative-HIGH regime figure** (the Medigap+PartD path, ~$175–240/person
  — **primary-sourced at build**: CMS national base beneficiary Part D premium + a sourced
  national Medigap typical), carried as `{ value, citation, directionalUntilPinned }`, throws if
  unvalued. **NEVER a population MEAN** (the bimodal MA/Medigap distribution's mean is dragged
  down by the MA-$0 mass → understates the Medigap couple = optimistic). Never from model memory.
- **Per-person explicit persisted provenance stamp** `{ adoptedTypical, adoption-vintage }`,
  keyed to the SAVED era — never re-derived from `value == current-typical` (the
  appDefaults.ts:9-15 inversion trap). The system NEVER silently writes the value field.
- **Standing disclosure is PER-PERSON** ("a typical figure for [name], not your bill") and
  **BI-DIRECTIONAL** ("could sit higher OR lower — including ~$0 on Medicare Advantage"),
  mechanism-named (corpus rule 37). Refine path = assumption-panel seat + the U13 re-entry walk.
- **R7 via a TOP-LEVEL draft key** (a nested `health.*` sub-field dodges the compile gate —
  assumptionRegistry.ts:84 landmine).

## F3 — engine channel (HARD LOCK — red-team Attack 2, verified healthOverlay.ts:486)

- Extras fund as a **per-person HETEROGENEOUS VECTOR** — Σ over {living ∩ enrolled} of that
  person's own premium × 12, **ending at each death** — **NEVER `enrolledCount × average`**
  (count×avg reproduces the exact optimistic survivor under-charge per-person was chosen to
  kill; it passes symmetric couples and hides in aggregate). base+surcharge stays the existing
  count×uniform line.
- **Ship gate:** a DND-012 externally-derived **ASYMMETRIC survivor golden** — one spouse $0,
  one ~$200, the low-cost spouse dies first → the survivor is still charged their full ~$200; a
  count×avg mutant goes RED (planted before trust — insights 080/081).
- Reduce-to-spine: all-zero extras reduces **byte-identically**; the shipped Medicare goldens
  (wf_4c8cd836-b22) re-pass UNCHANGED with extras off (superset, not perturbation).
- Real-flat like Part B (disclosed; inherits the Act-4 IRMAA-cliff landmine).

## F4 — boundary + fence

- spendHelp's "(including any Part D or Medigap premiums)" clause **flips OUT** — a copy change,
  re-entry-visible + mechanism-named ("now asked separately and added on top — leave them out of
  your spending total"), never a silent rewrite.
- **The boundary NEVER flips ahead of the engine funding** (fund-first if phased: the forward
  gap is a double-OMISSION = optimistic; the reverse is a double-count = pessimistic-safe).
- **Perform the insight-058 writer enumeration** (every `annualSpendingReal` writer +
  `budgetYearZeroFullTotal` under the flipped semantics) as a ship gate, not an assertion —
  confirm extras is funding-side and NOT a writer of `annualSpendingReal`.
- Installed-base double-count is pessimistic-safe → named follow-up, never silent migration.
- The residual pair moves **as a set**: the Part D/Medigap clause DIES · the state-tax clause
  STAYS (endogenous — wf_cc065e3b-bc1) · the real-flat clause EXPANDS to cover the new base.
  (Likely resolves O11 — oopHelp's blanket "premiums" becomes literally true.)

## F5 — disclosure routing (HARD LOCK — red-team Attack 1, verified healthSheetChrome.ts:325 + Result.tsx:170)

- The extras affirmative + per-person adopted-typical provenance + the bi-directional disclosure
  MUST have a **RENDERED HOME for BOTH populations** — `verdictMedicareResidual`
  (non-door/all-65+) AND `controlHealthOmissionsNote` / the door sheet (near-65 date-route) —
  because `showMedicarePricedNote` structurally suppresses the verdict residual for every
  pre-65-window household (the exact cohort this unit insists must be priced). Its own legible
  line on the door sheet — never buried in the six-item run-on.
- Predicate keys off the run's route-aware **BUILT-params output** (three-way:
  extras-priced-nonzero / confirmed-$0 / on-typical), never ages/inputs; **planted-RED** that a
  near-65 adopted-typical household actually SEES the disclosure.
- **FLOOR:** if the build cannot deliver a door disclosure home, extras pricing for door
  households GATES until it exists (or becomes a required entry-time disambiguation) — a silent,
  permanent, undisclosed typical on the door path is worse than a small ask.

## Ship gates

- Codec range-gate the persisted per-person dollar with the EXISTING `needNonNegativeDollar`
  (scenarioCodec.ts:342-351, throws Corrupt) — NOT the siblings' optFinite (a negative extras
  premium is optimistic). ScenarioV3 additive-optional (no v4).
- DND-012 externally-derived fixtures (incl. the F3 asymmetric survivor golden).
- verify:fit arms re-pinned **WITHOUT assuming monotone shrink** (the omission axis shrinks but
  the real-flat clause broadens).
- Color-blind-safe encoding on adopted-vs-entered / typical-vs-your-bill / priced-vs-residual
  (text+shape/label, never color alone).
- Insight-076 re-audit of `validateParams` if a fail-loud backstop is added.
- Dev-seed drift recorded before any re-tune. ONE commit (the ACA-sheet real-flat gap rides its
  own touch, never a rider). Then: ultramode review → Caddie pre-walk → pilot-clear + ship
  (the 2026-07-11 batched-oracle grant — his eye audits any-time + at the gauntlet).

## The hawk's scoped veto — SIX FORBIDDEN SHAPES (standing build constraints)

(a) a population-MEAN adoptable default · (b) $0 for an unasked near-65 date-route household ·
(c) the "extras priced in" affirmative without the narrowed residual, or spendHelp flipped ahead
of funding · (d) door/near-65 extras priced without a disclosure home surviving
`showMedicarePricedNote`'s suppression · (e) a count×avg engine build · (f) a
household-combined-then-split value feeding the per-person channel.
The veto is not live against this spec — the recommended build IS the honest alternative the
hawk endorsed (conf 9). The six shapes remain forbidden.

## Dissent (preserved — red team Attack 3, hawk partially holding)

The conservative-HIGH default systematically over-prices the ~half of enrollees on Medicare
Advantage (calm-but-ALARMIST — later fuck-off dates for the MA plurality), and every disclosure
surface warns only one direction. Resolved via the legible payment fork + bi-directional
disclosure. **Flip condition:** empirical evidence (Caddie / his eye) that the fork does NOT
reliably steer MA users to the $0 path. Even then the fix is steering prominence — **the anchor
direction never flips** (lowering it re-introduces the optimistic sin for Medigap couples).
