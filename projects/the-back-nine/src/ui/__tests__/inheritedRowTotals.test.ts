/**
 * The Act 5 plan's U12, slice 2: every UI reader of a row's opening or closing total, and of the year's withdrawals,
 * counts each inherited IRA (KTD22). A total of the four buckets alone would show a faster inherited pace leaving
 * MORE money (the pace moves money from the uncounted ledger into the counted taxable bucket), and a withdrawal rate
 * over a start that counts the ledgers, with a withdrawal that leaves their spending out, would read low.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { endTotal, startTotal, withdrawn } from '../screens/retirement/analysisRuns'
import { ledgerRowStartTotal } from '@engine/sequencing'
import { steadyStats } from '../screens/dashboard/snapshotView'
import type { LedgerInheritedEntry, LedgerYearRow } from '@shared/model'

const entry = (over: Partial<LedgerInheritedEntry>): LedgerInheritedEntry => ({
  start: 0,
  booked: 0,
  required: 0,
  taken: 0,
  aboveRequired: 0,
  movedToTaxable: 0,
  leftTheRun: 0,
  end: 0,
  last: false,
  ...over,
})

/** A retired row: $400,000 open across the four buckets, $30,000 drawn and $2,000 of HSA spend; `inherited` rides. */
const row = (t: number, inherited?: readonly LedgerInheritedEntry[]): LedgerYearRow => ({
  t,
  start: { taxable: 100_000, pretax: 200_000, roth: 80_000, hsa: 20_000 },
  conversion: 0,
  rmd: 0,
  draw: { taxable: 10_000, pretax: 15_000, roth: 5_000 },
  hsaSpend: 2_000,
  rmdToTaxable: 0,
  contribution: { taxable: 0, pretax: 0, roth: 0, hsa: 0 },
  leftOverCredit: 0,
  growthScale: 1,
  end: { taxable: 90_000, pretax: 185_000, roth: 75_000, hsa: 18_000 },
  ...(inherited !== undefined ? { inherited } : {}),
  taxPaid: 3_000,
  premiums: { acaNet: 0, medicare: 0, irmaaSurcharge: 0, medicareExtras: 0 },
  filing: 'mfj',
  alive: [true, true],
  rolledOver: false,
  earlyPretaxDraw: false,
  ranOut: false,
  payByPerson: [0, 0],
  payTaxableByPerson: [0, 0],
  otherIncomeByPerson: [],
  socialSecurity: 0,
  incomeNotKept: 0,
})

// Two inherited IRAs: one paid $12,000 (of which $4,000 moved to taxable, so $8,000 spent), one left the run at the
// heir's death ($30,000: never spending).
const TWO = [entry({ start: 100_000, taken: 12_000, required: 3_000, aboveRequired: 9_000, movedToTaxable: 4_000, end: 88_000 }), entry({ start: 30_000, leftTheRun: 30_000 })]

describe('the analysis readers (analysisRuns): Comparisons, Retirement Details, Snapshot', () => {
  it('the opening and closing totals count each inherited ledger, less a balance leaving at the year’s top; a row without one reads the four buckets', () => {
    // The second IRA's $30,000 leaves the run at the year's top (left to someone else, the year after its heir's death):
    // never the household's that year, so the opening total leaves it out (gap 3's review, round 3, `7927693f`), while
    // the engine's own helper keeps it for the reconciliation.
    expect(startTotal(row(0, TWO))).toBe(400_000 + 100_000)
    expect(ledgerRowStartTotal(row(0, TWO))).toBe(400_000 + 100_000 + 30_000)
    expect(endTotal(row(0, TWO))).toBe(368_000 + 88_000)
    expect(startTotal(row(0))).toBe(400_000)
    expect(endTotal(row(0))).toBe(368_000)
  })

  it('the year’s withdrawals add each ledger’s spent part (taken less moved), never a balance that left the run', () => {
    expect(withdrawn(row(0, TWO))).toBe(32_000 + 8_000)
    expect(withdrawn(row(0))).toBe(32_000)
  })

  it('Snapshot’s first-year withdrawal rate counts the inherited ledgers in both parts of its fraction, never a balance leaving the run', () => {
    const meta = { route: 'spine' as const, stopYear: undefined, startCalendarYear: 2026 }
    expect(steadyStats([row(0, TWO)], meta).ratePercent).toBeCloseTo((40_000 / 500_000) * 100, 12)
    expect(steadyStats([row(0)], meta).ratePercent).toBeCloseTo((32_000 / 400_000) * 100, 12)
  })
})

describe('no UI module totals a row by hand (insight 058: a total with many readers is fixed only when every reader is)', () => {
  // Every reader of a row's opening or closing total goes through the engine's helpers (`ledgerRowStartTotal`,
  // `ledgerRowEndTotal`) or analysisRuns' `startTotal` / `endTotal`, which wrap them. A new reader written as a sum of
  // the four buckets (or `totalAcrossBuckets` of a row's `start` / `end`) would leave the inherited ledgers out.
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') walk(p)
      } else if (/\.tsx?$/.test(name)) {
        files.push(p)
      }
    }
  }
  walk(join(__dirname, '..'))
  const HAND_TOTAL = [/totalAcrossBuckets\(\s*\w+\.(start|end)\s*\)/, /\.(start|end)\.taxable\s*\+\s*\w+\.(start|end)\.pretax/]

  it('scans the UI tree (a scan that found nothing would prove nothing)', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some((f) => f.endsWith('analysisRuns.ts'))).toBe(true)
  })

  it('finds no hand total of a row’s four buckets', () => {
    const offenders = files.flatMap((f) => {
      const text = readFileSync(f, 'utf8')
      return HAND_TOTAL.some((re) => re.test(text)) ? [f] : []
    })
    expect(offenders).toEqual([])
  })

  it('the patterns catch the shapes they name (a control for each)', () => {
    expect(HAND_TOTAL[0]!.test('read: (r) => totalAcrossBuckets(r.end)')).toBe(true)
    expect(HAND_TOTAL[1]!.test('const start = first.start.taxable + first.start.pretax + first.start.roth')).toBe(true)
    expect(HAND_TOTAL.some((re) => re.test('read: (r) => ledgerRowEndTotal(r)'))).toBe(false)
  })
})
