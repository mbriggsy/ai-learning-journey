/*
 * src/ui/assumptionRegistry.ts — the R7 COMPILE-ENFORCED assumption registry (U12 · C1;
 * council wf_dff75c2f-9e3 supersession #6: "R7 completeness is compile-enforced").
 *
 * R7 says every assumption behind the answer is visible and editable. The old way to hold
 * that promise was author discipline — a new ScenarioDraft field could silently ship with
 * no seat in the assumption panel and nobody would notice until a cold read. This registry
 * makes the omission a BUILD ERROR instead:
 *
 *  - {@link DRAFT_DISPOSITIONS} is a `Record<keyof ScenarioDraft, AssumptionDisposition>`
 *    (the ScenarioDraft⟷ScenarioV3 tie precedent, memoryModel.ts:133-155): a future draft
 *    field WITHOUT a declared disposition fails `tsc`, and an entry for a REMOVED field
 *    fails as an excess property. The registry can never lag the model.
 *  - {@link METHODOLOGY_DISCLOSURES} carries the NON-draft methodology constants — the
 *    four non-parameters (supersession #1: longevity table, survivor-SS §202, death-order
 *    mixture, conversion-tax funding) plus the hardcoded market moments. These are baked
 *    engine behavior, not draft fields, so the compiler cannot tie them to a model key;
 *    the rendered-seat test walks this list instead (the runtime half of the pin).
 *
 * THE SEAT WALK (the R7 completeness pin, tested in assumptionPanel.test.tsx): every
 * `row-*` / `via-*` disposition names the panel seat(s) where it renders
 * (`data-assumption-seat` stamps in AssumptionPanel.tsx). The test renders the panel and
 * asserts every named seat exists — delete a row and the pin goes red. `internal` entries
 * carry a one-line justification instead of a seat: the WHY a user never sees this knob,
 * auditable in one screen.
 *
 * ui-layer home: the panel (src/intake) and the tests both read it; ui is the established
 * meeting point (intake→@ui/copy is the standing carve-out).
 */
import type { ScenarioDraft } from '@store/memoryModel'
import type { CopyKey } from './copy'

/** A rendering seat in the AssumptionPanel — the `data-assumption-seat` vocabulary the
 *  completeness test walks. Adding a seat here without stamping it in the panel fails the
 *  walk; stamping an unnamed seat is inert (the walk is one-directional by design — the
 *  panel may render MORE than the registry demands, never less). */
export type AssumptionSeat =
  | 'survivor-ratio' // the ONE real R7-editable methodology knob (council F1/F3)
  | 'spend-period' // the entry-period toggle (hidden while a budget governs — the period is inert there)
  | 'market' // the productionMarket disclosure block (visible-with-provenance; editor FILED behind the sourced-bounds flip)
  | 'longevity' // SSA cohort tables — disclosure (a baked constant, not a parameter)
  | 'survivor-ss' // §202 RIB-LIM law — disclosure (law-computed, not a parameter)
  | 'outlive-order' // the per-path sampled death-order mixture — disclosure (no conditional knob exists)
  | 'conversion-tax' // the v1 per-policy gross-up funding rule — disclosure + its conservative direction
  | 'drawdown' // via-sheet → SequencingControl (one editor home per fact, insight 058)
  | 'roth-conversion' // via-sheet → RothLever
  | 'subsidy-regime' // via-sheet → HealthcareSheet
  | 'spend' // the spend row (inline editor ungoverned; routes to the BudgetBuilder when a budget governs)
  | 'person-birth' // per-person birth year (refuse-to-commit blanks)
  | 'person-stop' // per-person stop age (retired members only — a working member's date IS the answer)
  | 'person-ss-amount' // per-person monthly benefit at FRA
  | 'person-ss-claim' // per-person Social Security start age
  | 'health-oop' // OOP medical (re-reconciles atomically under a governing budget — the oopStep pattern)
  | 'health-quote' // the ACA quote pair (pre-65 households)
  | 'work-investment' // working-year investment income (date route, per working member)
  | 'medicare-extras' // the per-person Medicare-extras payment fork (the ask-for-Medicare-extras unit — the refine path + the details home for the funded typical)
  | 'retirement-state' // the household's retirement state (the state-tax unit S3 — a changeable best guess; edit → re-run the SC-vs-GA what-if)
  | 'collections' // accounts + other income — via-intake ("edit in the walk-through")

/** How one draft field reaches the panel. The four visible kinds name their seat(s); an
 *  `internal` field instead carries the one-line justification for why no user-facing row
 *  exists (the auditable half of the R7 claim — "every assumption visible OR accounted for"). */
export type AssumptionDisposition =
  | {
      readonly kind: 'row-editable' | 'row-disclosure' | 'via-sheet' | 'via-intake'
      readonly seats: readonly AssumptionSeat[]
    }
  | { readonly kind: 'internal'; readonly why: string }

/**
 * EVERY ScenarioDraft key, mapped. `Record<keyof ScenarioDraft, …>` is the compile gate:
 * a new draft field (which, by the memoryModel shape tie, is a new persisted v3 field)
 * cannot ship without deciding — and declaring — how the user sees it.
 */
export const DRAFT_DISPOSITIONS: Record<keyof ScenarioDraft, AssumptionDisposition> = {
  people: {
    kind: 'row-editable',
    seats: ['person-birth', 'person-stop', 'person-ss-amount', 'person-ss-claim'],
  },
  enteredAccounts: { kind: 'via-intake', seats: ['collections'] },
  incomeStreams: { kind: 'via-intake', seats: ['collections'] },
  tickerClassifications: {
    kind: 'internal',
    why: 'Rides the accounts: a per-ticker classification is edited where its account is edited (the walk-through), never as a free-floating row.',
  },
  health: { kind: 'row-editable', seats: ['health-oop', 'health-quote', 'work-investment'] },
  annualSpendingReal: { kind: 'row-editable', seats: ['spend'] },
  spendEntryPeriod: { kind: 'row-editable', seats: ['spend-period'] },
  survivorSpendingRatio: { kind: 'row-editable', seats: ['survivor-ratio'] },
  drawdownPolicy: { kind: 'via-sheet', seats: ['drawdown'] },
  drawdownOrder: { kind: 'via-sheet', seats: ['drawdown'] },
  filing: {
    kind: 'internal',
    why: 'mfj IS the product — the married-couple posture is the precondition, not a setting.',
  },
  startCalendarYear: {
    kind: 'internal',
    why: 'The wall clock at first run — a fact of when the plan started, never a choice to revisit.',
  },
  taxVintage: {
    kind: 'internal',
    why: 'The LEGACY opaque tax-vintage string (P2-era; rides the draft unchanged, never re-stamped). Superseded by taxVintageDetail — U13 staleness reads THAT; this stays for the add-only vault law only.',
  },
  appDefaultVersion: {
    kind: 'internal',
    why: 'The app methodology-vintage stamp — app-written at save, never user-set.',
  },
  seed: {
    kind: 'internal',
    why: 'Minted once and persisted unchanged — the CRN anchor that keeps the saved headline byte-reproducible; a knob here would be a jitter machine.',
  },
  budget: { kind: 'via-sheet', seats: ['spend'] },
  rothConversion: { kind: 'via-sheet', seats: ['roth-conversion'] },
  enhancedSubsidies: { kind: 'via-sheet', seats: ['subsidy-regime'] },
  medicareExtrasByPerson: { kind: 'row-editable', seats: ['medicare-extras'] },
  retirementState: {
    // S3: the changeable best guess IS an R7-editable row (edit → re-run answers the SC-vs-GA
    // what-if manually; no new lever in v1). Stamped in AssumptionPanel via <Row seat> over the
    // shared StateResidencePicker, committed through commitOpen.
    kind: 'row-editable',
    seats: ['retirement-state'],
  },
  healthcareVintage: {
    kind: 'internal',
    why: 'Stamped fresh at Save from the current build’s constants (scenarioFromDraft) — whatever the draft carries mid-session is never the written truth.',
  },
  savedAt: {
    kind: 'internal',
    why: 'The save wall-time anchor (epoch-day), stamped fresh at every save-commit — U13’s “~N years since your save” clock reads the RAW persisted value at unlock; never a user-facing knob.',
  },
  taxVintageDetail: {
    kind: 'internal',
    why: 'The structured tax vintage (taxVintageStamp), stamped fresh at Save — read by U13 staleness against the live constants; the controls surface names the drift, the user never sets it.',
  },
  dateVintage: {
    kind: 'internal',
    why: 'The date-surface vintage (contribution-limit year + ticker-blend snapshot as-of), stamped fresh at Save — read by U13 staleness; app-written, never user-set.',
  },
  stateTaxVintage: {
    kind: 'internal',
    why: 'The state-tax vintage (serialized per-state roster profiles), stamped fresh at Save from the current build’s stateTaxConstants — read by staleness.ts’s controls.stateTaxMoved clock; app-written, never user-set (the taxVintageDetail/dateVintage precedent).',
  },
  chosenGoal: {
    kind: 'internal',
    why: 'The recommender’s Tier-2 goal (leave-more / pay-less-tax) — NOT an assumption behind the FIRST answer (the spine): it is the recommendation-time pick set via the U16 GoalPicker (the second beat’s first interaction), never a silent default (burned/062). The solve is refused while it is unset, so no panel row asserts a goal the user never chose; its editable home is the GoalPicker, not the intake assumption panel.',
  },
  savedRecommendation: {
    kind: 'internal',
    why: 'A MEMORY of a past recommendation, not an assumption behind the current answer: nothing in the projection reads it, so no R7 row could honestly say “this is what we assumed.” It is minted once by the explicit save gesture (U17·S5) and is never user-settable — an editable row would let a household hand-edit what the solver is recorded as having said, the one thing that must stay a faithful record. Its rendering home is the record card on the recommendation surface (which also owns the staleness trichotomy that decides whether it may be re-presented as current); the honest edit is re-solving and re-saving, never a knob.',
  },
}

/** One non-draft methodology constant’s disclosure row: where it renders (`seat`), what the
 *  row is called (`nameKey`), and its static disclosure/provenance sentences (`lineKeys`).
 *  The market row ALSO renders live figures read from `productionMarket.value` (never
 *  re-typed) plus the standing market-floor line — composed in the panel, pinned in tests. */
export interface MethodologyDisclosure {
  readonly id: 'market' | 'longevity' | 'survivor-ss' | 'outlive-order' | 'conversion-tax'
  readonly seat: AssumptionSeat
  readonly nameKey: CopyKey
  readonly lineKeys: readonly CopyKey[]
}

/**
 * The non-parameter methodology constants (council 2026-07-08, supersession #1): all ship
 * as on-your-behalf DISCLOSURE rows — visible, provenance-named, honestly non-editable.
 * Fabricated knobs for them were explicitly rejected; the market editor is FILED behind a
 * sourced two-sided bound (the F1 defer).
 */
export const METHODOLOGY_DISCLOSURES: readonly MethodologyDisclosure[] = [
  {
    id: 'market',
    seat: 'market',
    nameKey: 'assumptionMarketName',
    lineKeys: ['assumptionMarketProvenance'],
  },
  {
    id: 'longevity',
    seat: 'longevity',
    nameKey: 'assumptionLongevityName',
    lineKeys: ['assumptionLongevityValue'],
  },
  {
    id: 'survivor-ss',
    seat: 'survivor-ss',
    nameKey: 'assumptionSurvivorSsName',
    lineKeys: ['assumptionSurvivorSsValue'],
  },
  {
    id: 'outlive-order',
    seat: 'outlive-order',
    nameKey: 'assumptionOutliveName',
    lineKeys: ['assumptionOutliveValue'],
  },
  {
    id: 'conversion-tax',
    seat: 'conversion-tax',
    nameKey: 'assumptionConversionTaxName',
    lineKeys: ['assumptionConversionTaxValue'],
  },
]

/** Every seat the registry PROMISES a rendering home for — the set the completeness test
 *  walks against the rendered panel (`data-assumption-seat`). Pure derivation, exported so
 *  the test cannot drift from the registry it verifies (burned/063 single-source-the-gate). */
export function requiredSeats(): readonly AssumptionSeat[] {
  const seats = new Set<AssumptionSeat>()
  for (const disposition of Object.values(DRAFT_DISPOSITIONS)) {
    if (disposition.kind !== 'internal') for (const s of disposition.seats) seats.add(s)
  }
  for (const m of METHODOLOGY_DISCLOSURES) seats.add(m.seat)
  return [...seats]
}
