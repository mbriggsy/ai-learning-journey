/**
 * The one amount rule (the walk-9 form council `wf_9f28e691-1dc`, call (1): R4 (b) and walk 9's flip (iii);
 * `docs/plans/features/typed-below-walk9-form-build-spec.md`), as a property: random per-year printed figures over a run
 * of consecutive years go through the core's `typedBelowAmountOf` and the REAL slots — a credit, a shortfall and a close
 * on the typed-below line, and a shortfall on W's stale line — and the words are parsed back by this test's own reading,
 * never the catalog's helpers. Every printed figure must sit beside exactly the years whose figure it is (two groups: each
 * group's figure and years, in year order, never crosswise); one figure must be every year's; a band must name the least
 * and the most and only where three or more groups print. "a year" rides one figure or a band on a run of two or more
 * years, never two groups and never a shortfall. A hand-built wrong amount reds the reading first (insight 152).
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { slots, type TypedBelowAmount, type TypedBelowSpanFrame } from '@ui/copy'
import { typedBelowAmountOf, type TypedBelowYearFigure } from '../workingYearLeftOver'

/** A run's per-year figures: two to five printed levels, so ties, runs of equal years and many groups are all common. */
const runArb = fc
  .tuple(fc.integer({ min: 2026, max: 2030 }), fc.array(fc.constantFrom(1_000, 3_652, 4_015, 20_985, 26_985), { minLength: 1, maxLength: 9 }))
  .map(([firstYear, values]) => values.map((dollars, i): TypedBelowYearFigure => ({ calendarYear: firstYear + i, dollars })))

const frame = (years: readonly TypedBelowYearFigure[]): TypedBelowSpanFrame => ({
  answer: 'Your',
  opener: false,
  oneYear: years.length === 1,
  typed: '84,000',
  quote: '105,000',
  source: 'spending',
  bothAlive: false,
  quoteNamed: true,
  typedNamed: true,
  savingsNamed: true,
})

const dollarsOf = (fig: string): number => Number(fig.replace(/,/g, ''))
const fmt = (n: number): string => n.toLocaleString('en-US')
/** "2029" or "2029 through 2031" as the years it names. */
const yearsOf = (words: string): readonly [number, number] => {
  const m = /^(\d{4})(?: through (\d{4}))?$/.exec(words)
  if (m === null) throw new Error(`not years: "${words}"`)
  return [Number(m[1]), Number(m[2] ?? m[1])]
}
/** Groups of consecutive equal figures, this test's own count. */
const groupCount = (years: readonly TypedBelowYearFigure[]): number => years.filter((y, i) => i === 0 || y.dollars !== years[i - 1]!.dollars).length

/** THE READING: an amount's words, with the noun after each figure (`first`, `later`) and whether "a year" may ride, read
 *  back against the run's years — `null` where every figure sits beside exactly its own years, else what broke. */
const readBack = (words: string, years: readonly TypedBelowYearFigure[], noun: { readonly first: string; readonly later: string }, perYear: boolean): string | null => {
  const firstYear = years[0]!.calendarYear
  const lastYear = years.at(-1)!.calendarYear
  const all = years.map((y) => y.dollars)
  const groups = groupCount(years)
  const year = perYear && years.length > 1 ? ' a year' : ''
  const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const one = new RegExp(String.raw`^\$([\d,]+)${esc(year)}${esc(noun.first)}$`).exec(words)
  if (one !== null) {
    if (groups !== 1) return `one figure over ${groups} groups`
    return all.every((v) => v === dollarsOf(one[1]!)) ? null : 'one figure that is not every year’s'
  }
  const two = new RegExp(String.raw`^\$([\d,]+)${esc(noun.first)} in ([\d a-z]+?) and \$([\d,]+)${esc(noun.later)} in ([\d a-z]+)$`).exec(words)
  if (two !== null) {
    if (groups !== 2) return `two groups said over ${groups}`
    const [a0, a1] = yearsOf(two[2]!)
    const [b0, b1] = yearsOf(two[4]!)
    if (a0 !== firstYear || b1 !== lastYear || a1 + 1 !== b0) return 'the two groups’ years do not tile the run in year order'
    for (const y of years) {
      const said = y.calendarYear <= a1 ? dollarsOf(two[1]!) : dollarsOf(two[3]!)
      if (y.dollars !== said) return `${y.calendarYear}’s figure is not the one said beside it`
    }
    return null
  }
  const band = new RegExp(String.raw`^between \$([\d,]+) and \$([\d,]+)${esc(year)}${esc(noun.first)}$`).exec(words)
  if (band !== null) {
    if (groups < 3) return `a band over ${groups} groups`
    return dollarsOf(band[1]!) === Math.min(...all) && dollarsOf(band[2]!) === Math.max(...all) ? null : 'a band that is not the least and the most'
  }
  return `unread: "${words}"`
}

/** The amount's words out of each real slot, the sentence around them taken off by this test's own reading. */
const between = (s: string, before: string, after: string): string => {
  const at = s.indexOf(before)
  const end = s.indexOf(after, at + before.length)
  if (at === -1 || end === -1) throw new Error(`[test setup] "${before}" … "${after}" not in "${s}"`)
  return s.slice(at + before.length, end)
}
const SLOT_READINGS: readonly (readonly [string, (a: TypedBelowAmount, years: readonly TypedBelowYearFigure[]) => string, { readonly first: string; readonly later: string }, boolean])[] = [
  ['a credit (`workingCostTypedBelowSpanAtQuoteAdds`)', (a, ys) => between(slots.workingCostTypedBelowSpanAtQuoteAdds(frame(ys), a), 'would add at most ', '.'), { first: '', later: '' }, true],
  [
    'a shortfall (`workingCostTypedBelowSpanShort`)',
    (a, ys) => between(slots.workingCostTypedBelowSpanShort(frame(ys), a), ' comes up ', ', which would'),
    { first: ' short', later: ' short' },
    false,
  ],
  [
    'a close (`workingCostTypedBelowSpanLess`)',
    (a, ys) => between(slots.workingCostTypedBelowSpanLess(frame(ys), a, false, null), 'that’s ', ', except for'),
    { first: ' less in your savings', later: ' less' },
    true,
  ],
  [
    'W’s stale line (`workingCostStaleShortLaterYears`)',
    (a, ys) => between(slots.workingCostStaleShortLaterYears(ys[0]!.calendarYear, ys.at(-1)!.calendarYear, a, '84,000', false), ' comes up ', '. '),
    { first: ' short', later: ' short' },
    false,
  ],
]

describe('the one amount rule — every figure beside its own years, through the real slots (the walk-9 form council’s call (1), flip (iii))', () => {
  it('a property (fast-check, 1,000 runs of one to nine years): each slot’s words read back to the run’s own per-year figures — one figure every year’s, two groups each beside exactly its years in year order, a band the least and the most of three or more groups', () => {
    const seen = { one: 0, two: 0, band: 0 }
    fc.assert(
      fc.property(runArb, (years) => {
        const amount = typedBelowAmountOf(years)
        seen[amount.kind] += 1
        // A run of one year never takes a band or two groups; the shortfall slot words only runs of two or more years.
        for (const [name, wordsOf, noun, perYear] of SLOT_READINGS) {
          if (name.startsWith('W’s') && years.length < 2) continue
          const words = wordsOf(amount, years)
          expect(readBack(words, years, noun, perYear), `${name}: ${JSON.stringify(years.map((y) => [y.calendarYear, y.dollars]))} → "${words}"`).toBeNull()
        }
      }),
      { numRuns: 1_000 },
    )
    expect(seen.one, 'one figure drawn').toBeGreaterThan(0)
    expect(seen.two, 'two groups drawn').toBeGreaterThan(0)
    expect(seen.band, 'bands drawn').toBeGreaterThan(0)
  })

  it('the reading reds on a wrong amount beside the right one (insight 152): the pension household’s 2030–2031 credits said crosswise, a band over two groups, one figure over two, a band missing the most', () => {
    const pension = [
      { calendarYear: 2030, dollars: 3_005 },
      { calendarYear: 2031, dollars: 3_368 },
    ]
    const credit = SLOT_READINGS[0]!
    const right = typedBelowAmountOf(pension)
    expect(right, 'the control’s amount, typed by hand').toEqual({ kind: 'two', groups: [{ figure: '3,005', firstYear: 2030, lastYear: 2030 }, { figure: '3,368', firstYear: 2031, lastYear: 2031 }] })
    expect(credit[1](right, pension), 'the control’s words, typed by hand').toBe('$3,005 in 2030 and $3,368 in 2031')
    expect(readBack(credit[1](right, pension), pension, credit[2], credit[3]), 'the control').toBeNull()
    const crosswise: TypedBelowAmount = { kind: 'two', groups: [{ figure: '3,368', firstYear: 2030, lastYear: 2030 }, { figure: '3,005', firstYear: 2031, lastYear: 2031 }] }
    expect(readBack(credit[1](crosswise, pension), pension, credit[2], credit[3]), 'crosswise').toBe('2030’s figure is not the one said beside it')
    const outOfOrder: TypedBelowAmount = { kind: 'two', groups: [{ figure: '3,368', firstYear: 2031, lastYear: 2031 }, { figure: '3,005', firstYear: 2030, lastYear: 2030 }] }
    expect(readBack(credit[1](outOfOrder, pension), pension, credit[2], credit[3]), 'out of year order').toBe('the two groups’ years do not tile the run in year order')
    expect(readBack(credit[1]({ kind: 'band', least: '3,005', most: '3,368' }, pension), pension, credit[2], credit[3]), 'walk 8’s range over two groups').toBe('a band over 2 groups')
    expect(readBack(credit[1]({ kind: 'one', figure: '3,368' }, pension), pension, credit[2], credit[3]), 'one figure over two').toBe('one figure over 2 groups')
    const drift = [20_985, 20_501, 20_002, 19_722].map((dollars, i) => ({ calendarYear: 2026 + i, dollars }))
    expect(credit[1](typedBelowAmountOf(drift), drift), 'the drift witness’s band, typed by hand').toBe('between $19,722 and $20,985 a year')
    expect(readBack(credit[1]({ kind: 'band', least: fmt(19_722), most: fmt(20_501) }, drift), drift, credit[2], credit[3]), 'a band missing the most').toBe('a band that is not the least and the most')
    // W's stale line, B's run as the probe prints it: $4,015 in 2026 through 2030, $3,652 in 2031 and 2032.
    const b = [4_015, 4_015, 4_015, 4_015, 4_015, 3_652, 3_652].map((dollars, i) => ({ calendarYear: 2026 + i, dollars }))
    expect(SLOT_READINGS[3]![1](typedBelowAmountOf(b), b), 'B’s run, typed by hand').toBe('$4,015 short in 2026 through 2030 and $3,652 short in 2031 through 2032')
  })
})
