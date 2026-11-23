import { describe, expect, it } from 'vitest'
import {
  accountSources,
  buildDateInput,
  buildSpineParams,
  buildTableBase,
  sourceBalance,
} from '../intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'
import type { DateBand, DateSearchOutcome, DateTrackOutcome, EnteredAccount } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'

/**
 * The year-by-year table's data path, before any UI (workbench plan U7, KTD6, KTD9): the ONE account grouping the
 * engine's ledger balances are summed from, and the base builder that picks the run the table shows.
 */

const account = (kind: EnteredAccount['kind'], ownerIndex: number, valueToday: number, basis?: number): EnteredAccount =>
  ({ ...DEV_SEEDS.retired.enteredAccounts[0]!, kind, ownerIndex, valueToday, ...(basis !== undefined ? { basis } : {}) }) as EnteredAccount

/** AE1's household: two Roth IRAs with different owners, a traditional IRA each, a brokerage account and an HSA —
 *  every balance distinct, so a swapped or mis-bucketed account moves a sum. */
const AE1: ScenarioDraft = {
  ...DEV_SEEDS.retired,
  enteredAccounts: [
    account('roth-ira', 0, 101_000),
    account('traditional-ira', 0, 302_000),
    account('roth-ira', 1, 47_000),
    account('traditional-ira', 1, 113_000),
    account('brokerage', 0, 250_000, 180_000),
    account('hsa', 1, 9_000),
  ],
}

describe('accountSources — the one grouping', () => {
  it('AE1: one Roth source naming both Roth IRAs, a pre-tax source per person, each in the draft’s order', () => {
    const s = accountSources(AE1)
    expect(s.roth.map((a) => [a.index, a.ownerIndex])).toEqual([
      [0, 0],
      [2, 1],
    ])
    expect(s.pretaxByPerson.map((p) => p.map((a) => a.index))).toEqual([[1], [3]])
    expect(s.pretax.map((a) => a.index)).toEqual([1, 3])
    expect(s.taxable.map((a) => a.index)).toEqual([4])
    expect(s.hsa.map((a) => a.index)).toEqual([5])
  })

  it('each source opens the engine’s ledger at its accounts’ sum: the built overlay reads the same grouping', () => {
    const s = accountSources(AE1)
    const overlay = buildSpineParams(AE1)?.overlay
    expect(overlay).toBeDefined()
    expect(overlay!.buckets).toMatchObject({
      roth: sourceBalance(s.roth),
      pretax: sourceBalance(s.pretax),
      taxable: sourceBalance(s.taxable),
      hsa: sourceBalance(s.hsa),
    })
    expect(overlay!.pretaxByPerson).toEqual(s.pretaxByPerson.map(sourceBalance))
    // The figures themselves, so a grouping that agreed with itself but not with the household fails too.
    expect([sourceBalance(s.roth), ...s.pretaxByPerson.map(sourceBalance)]).toEqual([148_000, 302_000, 113_000])
  })
})

// --- the base builder, one arm each ---

const dated = (offsetYears: number): DateTrackOutcome =>
  ({ kind: 'confirmed-date', offsetYears, nonMonotoneOffsets: [], curve: [] }) as unknown as DateTrackOutcome
const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: [] }
const outcomeOf = (floor: DateTrackOutcome, lifestyle: DateTrackOutcome, band?: Partial<DateBand>): DateSearchOutcome =>
  ({
    kind: 'dates',
    floor,
    lifestyle,
    tier: 'final',
    windowTopYears: DATE_OFFSET_WINDOW_TOP,
    seed: 1,
    ...(band ? { band } : {}),
  }) as DateSearchOutcome

const WORKING = DEV_SEEDS.date
const input = buildDateInput(WORKING)!

describe('buildTableBase — the run the table shows (KTD9)', () => {
  it('all retired: the spine, the full pass', () => {
    const base = buildTableBase(DEV_SEEDS.retired, undefined)
    expect(base).toMatchObject({ kind: 'run', route: 'spine', track: 'full' })
    expect(base.kind === 'run' && base.params).toEqual(buildSpineParams(DEV_SEEDS.retired))
  })

  it('a lifestyle date: the candidate at the BAND’s offset, the full pass', () => {
    const base = buildTableBase(WORKING, outcomeOf(dated(2), dated(4), { offsetYears: 4, track: 'lifestyle' }))
    expect(base).toMatchObject({ kind: 'run', route: 'dated', track: 'full' })
    expect(base.kind === 'run' && base.params).toEqual(buildCandidateParams(input, 4, DATE_SEARCH_PATHS.final))
  })

  it('a floor-only date: the band’s floor offset and the essentials pass (the band’s own track, never re-derived)', () => {
    const base = buildTableBase(WORKING, outcomeOf(dated(6), noDate, { offsetYears: 6, track: 'floor' }))
    expect(base).toMatchObject({ kind: 'run', route: 'dated', track: 'floor' })
    expect(base.kind === 'run' && base.params).toEqual(buildCandidateParams(input, 6, DATE_SEARCH_PATHS.final))
  })

  it('no date on either track: the window top, the full pass', () => {
    const base = buildTableBase(WORKING, outcomeOf(noDate, noDate))
    expect(base).toMatchObject({ kind: 'run', route: 'no-date', track: 'full' })
    expect(base.kind === 'run' && base.params).toEqual(
      buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS.final),
    )
  })

  it('a track dated but no band: withheld, never a guessed offset', () => {
    expect(buildTableBase(WORKING, outcomeOf(noDate, dated(3)))).toEqual({ kind: 'withheld', reason: 'band-missing' })
    expect(buildTableBase(WORKING, outcomeOf(dated(3), noDate))).toEqual({ kind: 'withheld', reason: 'band-missing' })
  })

  it('the date route with no committed date search, or a failed one: withheld', () => {
    expect(buildTableBase(WORKING, undefined)).toEqual({ kind: 'withheld', reason: 'no-date-answer' })
    expect(buildTableBase(WORKING, { kind: 'input-failure', reason: 'x' })).toEqual({
      kind: 'withheld',
      reason: 'no-date-answer',
    })
  })

  it('the sources ride with the run they were grouped for', () => {
    const base = buildTableBase(AE1, undefined)
    expect(base.kind === 'run' && base.sources).toEqual(accountSources(AE1))
  })
})
