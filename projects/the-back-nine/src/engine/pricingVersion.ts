/**
 * ENGINE_PRICING_VERSION + ENGINE_PRICING_LEDGER — the verdict-side record of the engine's OWN
 * pricing changes (the engine-domain council, 2026-09-27, wf_bc99b1b1-f34, 8/10).
 *
 * WHY THIS EXISTS: every staleness clock (`src/store/staleness.ts`) diffs a CONSTANTS vintage
 * stamp. A change to how the ENGINE CODE prices something — a deflation per sim year, a price
 * frame, a line made inclusive — moves what a saved household's verdict, band and date recompute
 * to with every stamp equal, so the recompute arrived with no note (the U13 honesty spine: never
 * silently changed). `SOLVER_CODE_VERSION` re-stales a saved RECOMMENDATION; nothing covered the
 * spine answer. This ledger is that record: one row per engine-code change that moves a household's
 * recompute, with the exposure FAMILIES it reaches and the day it shipped.
 *
 * THE ENGINE NEVER READS IT. It is a pure code-side record: no clock, no draw, no run input — a
 * saved plan is always recomputed under the CURRENT code (the U13 rejection of a vintage-injection
 * seam stands). Its one reader is `deriveStaleness`'s `pricing` block, which compares each row's
 * ship day with the vault's own `savedAt` (persisted since 2026-07-09 — the first row's own ship day,
 * so a vault with no `savedAt` predates EVERY row, and a 2026-07-09 save is that row's ambiguous day)
 * — so no new persisted field is needed for the disclosure to ride WITH the recompute.
 *
 * THE BACKFILL (rows 1–9) was audited against git history 2026-09-27: every commit from 2026-07-09
 * that moves a saved household's recompute with no vintage stamp moving. Two such commits are NOT
 * rows because no family here can name them — the date-route band following the full-lifestyle track
 * (8d4d4e58, 2026-07-30) and the verdict's spending-room figure moving from a proxy to the spend solve
 * (6e4c065d, 2026-09-26): the register's *The engine-pricing ledger cannot name a date-route or
 * spending-figure change…* carries them.
 * Row 10 (the IRMAA growth base) shipped in `252b88da` — its own commit, so its `commits` field could
 * only carry a placeholder. Row 11 (the budgetless survivor-medical lean) likewise ships in its own
 * commit and carries a placeholder; its `shippedOn` must be that commit's local date.
 *
 * THE PARKED RESIDUALS (one-way doors the council parked, stated so no one reads the ledger as
 * total): (1) a save made AFTER a ship day by an OLD build (a stale PWA) reads as covered but was
 * figured by old code — a persisted `{ version, savedAt }` stamp would close it; (2) a
 * `reconfirm-input` row keys on the save day, so a pre-flip vault re-saved after the flip without its
 * spending being re-entered stops being asked — an affirmation-written marker would close it.
 *
 * APPEND-ONLY. A row is never edited or removed once shipped (a saved vault's disclosure depends on
 * it); a correction is a NEW row. `ENGINE_PRICING_VERSION` is the newest row's `version`.
 *
 * WHEN TO APPEND A ROW (the discipline, enforced by `pricingWitness.test.ts`): any change that can
 * move a figure a saved household's recompute shows — a tax, state-tax, Medicare, Marketplace or
 * contribution PRICER's output, or how a saved draft maps into run params — WITHOUT a constants
 * vintage stamp moving in the same change. (A constants change with a vintage bump is the vintage
 * clocks' job; do not double-disclose it here.) Declare EVERY family whose witness digest moved
 * (under-declaring reds; over-declaring is allowed but names a line that may not be true — declare
 * honestly). If the family is SCORED (it moves a ranked figure), bump `SOLVER_CODE_VERSION` in the
 * same change and record it on the row. Then re-pin the witness digest under the new version.
 *
 * `kind`:
 *  - `'reprice'` — the engine now prices a figure differently; the household is told the METHOD
 *    changed (never "the rules" — no law moved — and never a direction: a rosier and a harsher move
 *    read the same, the recompute itself carries the verdict).
 *  - `'reconfirm-input'` — what a household's OWN INPUT means changed (a premium the plan now prices
 *    itself used to belong inside typed spending), so the household is asked a conditional
 *    re-confirm instead.
 *
 * `sinceEpochDay` is the SHIP day (the commit's local calendar date, as an epoch-day — the same
 * date-level basis `savedAt` is minted on). A save made ON that day cannot be attributed to either
 * build, so the reader speaks it namelessly; a save strictly before it crossed the row.
 */
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'

/** The exposure family a pricing change reaches — each maps onto ONE existing producer's-output
 *  exposure read in `src/store/staleness.ts` (`PRICING_FAMILY_READS`, exhaustive by type).
 *  `spending` (row 11, 2026-10-08 council): how a saved household's own spend figure maps into the
 *  per-year spend the engine funds — today the budgetless survivor-medical lean, read through the
 *  engine's `survivorMedicalLeanMoves` (budgetless ∧ couple ∧ sampled ∧ M > 0 ∧ S > 0 ∧ r ≠ 1 —
 *  r = 1 is unmoved up to one ulp when M carries cents; r > 1, refused when committed but still
 *  priced if a vault carries it, moves the spend the other way). */
export type PricingFamily = 'tax' | 'stateTax' | 'medicare' | 'aca' | 'contributions' | 'spending'

export interface PricingLedgerRow {
  /** 1, 2, 3 … — strictly increasing, no gaps (shape-tested). */
  readonly version: number
  readonly kind: 'reprice' | 'reconfirm-input'
  /** Non-empty by type — a row that reaches no family discloses nothing and must not exist. */
  readonly families: readonly [PricingFamily, ...PricingFamily[]]
  /** For a `stateTax` row: the priced states whose profile the change reaches (a PA household
   *  is not told NC's standard deduction moved). Absent ⇔ the row declares no `stateTax`. */
  readonly states?: readonly string[]
  /** The ship day, ISO (the commit's local date). */
  readonly shippedOn: string
  readonly sinceEpochDay: number
  /** The `SOLVER_CODE_VERSION` that re-stales a saved recommendation for this change (the first
   *  version at or after it — `be0e1e76` shipped without a bump and v4 covered it). Non-decreasing
   *  across rows; the newest never exceeds the live constant. `null` = predates the solver (U15). */
  readonly solverCodeVersion: number | null
  /** The commit(s) that shipped it — the audit trail, never read. */
  readonly commits: readonly string[]
  /** What moved, for the next reader of this file — never rendered. Direction may be recorded
   *  HERE (a ledger comment), never in copy. */
  readonly what: string
}

const row = (r: Omit<PricingLedgerRow, 'sinceEpochDay'>): PricingLedgerRow => ({
  ...r,
  sinceEpochDay: epochDayFromIsoDate(r.shippedOn),
})

export const ENGINE_PRICING_LEDGER: readonly PricingLedgerRow[] = Object.freeze([
  row({
    version: 1,
    kind: 'reprice',
    families: ['tax'],
    shippedOn: '2026-07-09',
    solverCodeVersion: null,
    commits: ['9c9eb6ad'],
    what: 'The OBBBA senior bonus is priced only in calendar 2025–2028 (it had been credited in every sim year — a phantom ~$12k/yr MFJ deduction from 2029; harsher). Shipped the same day `savedAt` did (77ed4fa7), so a 2026-07-09 save is the ambiguous day.',
  }),
  row({
    version: 2,
    kind: 'reconfirm-input',
    families: ['medicare'],
    shippedOn: '2026-07-10',
    solverCodeVersion: null,
    commits: ['3454c224'],
    what: 'Medicare pricing: base Part B and its income surcharge moved OUT of typed spending — the plan prices them itself, so a vault whose spending still carries them double-counts (conservative). It also re-priced the population (an all-65+ household went from $0 Medicare to priced) — that half is named by the later Medicare rows.',
  }),
  row({
    version: 3,
    kind: 'reconfirm-input',
    families: ['medicare'],
    shippedOn: '2026-07-11',
    solverCodeVersion: null,
    commits: ['503213f4'],
    what: 'Medicare extras: Part D / Medigap / Medicare Advantage premiums moved OUT of typed spending (the same double-count, conservative); an absent or unanswered extras fork is now funded at the typical figure.',
  }),
  row({
    version: 4,
    kind: 'reprice',
    families: ['medicare'],
    shippedOn: '2026-07-19',
    solverCodeVersion: 1,
    commits: ['ca41256f', '45a69496'],
    what: 'Part B priced on the Trustees cost trend instead of real-flat (its IRMAA surcharges scale with it), and the Part D IRMAA add-ons trended per tier (Table V.E4; held at the 2035 level after — the disclosed optimistic tail). Harsher. The trend stamp is NEW in ca41256f, so a vault saved before it carries no `partBTrendVintage` and its clock stays quiet (absent = not-comparable) — this row is what discloses it.',
  }),
  row({
    version: 5,
    kind: 'reprice',
    families: ['tax'],
    shippedOn: '2026-09-24',
    solverCodeVersion: 4,
    commits: ['be0e1e76'],
    what: 'The §86 Social Security taxation thresholds deflate per sim year (frozen nominal) — more of the benefit taxed each year out (harsher; `retired` moved 9/10 → 8/10). Shipped without a solver bump; v4 covered it.',
  }),
  row({
    version: 6,
    kind: 'reprice',
    families: ['tax', 'stateTax', 'contributions'],
    states: ['NC'],
    shippedOn: '2026-09-25',
    solverCodeVersion: 4,
    commits: ['e04823a4'],
    what: 'Frozen-nominal siblings: the NC standard deduction and the OBBBA senior bonus deflate per sim year, the senior bonus phases out per person, the HSA catch-up erodes on the runway (harsher).',
  }),
  row({
    version: 7,
    kind: 'reprice',
    families: ['medicare'],
    shippedOn: '2026-09-26',
    solverCodeVersion: 5,
    commits: ['42b078cf'],
    what: 'The top IRMAA line is inclusive ("at least"): a MAGI exactly on it bills the 85 % tier (harsher at the line).',
  }),
  row({
    version: 8,
    kind: 'reprice',
    families: ['medicare'],
    shippedOn: '2026-09-26',
    solverCodeVersion: 6,
    commits: ['1c97f55d'],
    what: 'The IRMAA price frame: every line compared as the law compares it, in the MAGI year’s real dollars — from bill 2028 each line sits about a CPI year higher, fewer surcharges billed (rosier).',
  }),
  row({
    version: 9,
    kind: 'reprice',
    families: ['medicare'],
    shippedOn: '2026-09-27',
    solverCodeVersion: 6,
    commits: ['2a0f6d80'],
    what: 'The health sheet’s Medicare step card prices a crossing at the BILL year’s scales, not 2026’s (a readout figure only — no scored number; e.g. `healthnc` $1,100 → $1,700 each).',
  }),
  row({
    version: 10,
    kind: 'reprice',
    families: ['medicare'],
    shippedOn: '2026-09-27',
    solverCodeVersion: 7,
    commits: ['(the IRMAA growth-base change, b9-11)'],
    what: 'The IRMAA growth base: tiers 1–4 carry CPI from their August-2025 base through `cpiGrowth` — the clamped level quotient had dropped a year (e.g. the 2028 tier-1 MFJ line $224,000 → $232,000; rosier).',
  }),
  row({
    version: 11,
    kind: 'reprice',
    families: ['spending'],
    shippedOn: '2026-10-09',
    solverCodeVersion: 11,
    commits: ['(the budgetless survivor-medical lean, b9-1)'],
    what: 'A budgetless couple’s entered out-of-pocket medical M is held whole in the survivor years: a survivor year spends m + r·(S − m), m = min(M, S), where it spent r·S (council wf_7eb3303c-7f3, 2026-10-08 — a DISCLOSED CONSERVATIVE LEAN under insight 055, the budget arm’s sticky-medical composition brought to the flat path; never a correction). Harsher at r < 1: +m·(1 − r) a survivor year (+$1,000 on `health` / `healthnc` / `healthgap` at M $4,000, r 0.75); `healthgap` borderline 7/10 → off-track 6/10 at the app’s spine run. Budgeted, single, OOP-blank (or M = 0) households are unmoved, and r = 1 ones up to one ulp when M carries cents (the exposure read is `survivorMedicalLeanMoves`); r > 1 is refused when committed, but a vault that carries one is priced, and there the spend falls by m·(r − 1). SCORED: the solver ranks on survival, so v11 re-stales saved recommendations.',
  }),
])

export const ENGINE_PRICING_VERSION: number = ENGINE_PRICING_LEDGER[ENGINE_PRICING_LEDGER.length - 1]!.version

/**
 * The first epoch-day on which a save is unambiguously THIS build's — the day after the newest row
 * shipped. `savedAt` has day granularity, so a save ON a ship day may have been figured under either
 * build and the reader speaks it namelessly (by design). A dev plant or test fixture that models "saved
 * by the current build" must stamp `savedAt` at or after this day, never at the wall clock's today:
 * on a ship day that is the ambiguous day, and a fixture keyed to it reds CI on exactly the day a new
 * row lands and greens the next — a date bomb, not a test.
 */
export const FIRST_UNAMBIGUOUS_SAVE_DAY: number = ENGINE_PRICING_LEDGER[ENGINE_PRICING_LEDGER.length - 1]!.sinceEpochDay + 1
