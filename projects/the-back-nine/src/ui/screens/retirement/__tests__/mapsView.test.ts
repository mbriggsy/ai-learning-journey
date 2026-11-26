import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { LedgerYearRow } from '@shared/model'
import type { ModelAnswer } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { tableRunFor, type TableMeta, type TableView } from '../../../workbench/tableRun'
import { formatTableDollars, payCheckNotes } from '../../../workbench/yearTableChrome'
import { cashFlowsView, type CashFlowsInput, type SummaryDrill } from '../cashFlowsView'
import { MAP_GAP_MIN, mapsView, type MapNode, type MapsInput, type MapsView } from '../mapsView'

/**
 * Retirement → Cash Flows → Maps' composer (plan 6, RC20). ONE SOURCE OF TRUTH: every leaf of a year's map is the very
 * cell the Summary (or its drill) prints for the same run, year and future; a group and a total are sums of the printed
 * leaves beside them. THE BALANCE: over every dev seed's rows in both futures, money in equals money out as the row's
 * own fields give them (the employer's deposits and the moves inside savings off the map), so no year draws the gap; a
 * year that does not balance draws the gap as its own named node, never absorbed. A ran-out year and a working year
 * with no W get words, never a map; the scrubber's years and ages are the rows'.
 */

type Run = { readonly name: string; readonly meta: TableMeta; readonly view: TableView; readonly rows: readonly LedgerYearRow[] }

/** Every dev seed's table runs in both futures, from the same request the page makes (`tableRunFor`; a working seed at a
 *  band four years out, its lifestyle track). */
function seedRuns(names?: readonly string[]): Run[] {
  const out: Run[] = []
  for (const [name, draft] of Object.entries(DEV_SEEDS)) {
    if (names !== undefined && !names.includes(name)) continue
    let run = tableRunFor({ kind: 'headline', tier: 'final', draft, inputKey: 'k' } as unknown as ModelAnswer)
    if (run.kind === 'withheld' && run.reason === 'no-date-answer') {
      run = tableRunFor({
        kind: 'date',
        tier: 'final',
        draft,
        outcome: { kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1, band: { offsetYears: 4, track: 'lifestyle' } },
        inputKey: 'k',
      } as unknown as ModelAnswer)
    }
    if (run.kind !== 'run') continue
    for (const view of ['steady', 'rough'] as const) {
      const ask = run.views[view]
      if (ask.kind !== 'run') continue
      const res = simulate(ask.request.params, ask.request.seed, ask.request.options)
      const rows = res.indeterminate || res.infeasible ? [] : (res.distribution.ledgerRows ?? [])
      if (rows.length > 0) out.push({ name, meta: run.meta, view, rows })
    }
  }
  return out
}

const at = (run: Pick<Run, 'meta' | 'view' | 'rows'>, t: number | null, over: Partial<MapsInput> = {}): MapsView =>
  mapsView({ rows: run.rows, meta: run.meta, future: run.view, t, choice: 'flow', runName: copy.workbenchRailPlanLabel, roughEndYear: 1995, readOnly: false, ...over })

const mapOf = (v: MapsView) => {
  if (v.body.kind !== 'map') throw new Error(`no map: ${JSON.stringify(v.body)}`)
  return v.body
}

const dollarsOf = (text: string): number => Number(text.replace(/[^0-9]/g, ''))

describe('mapsView — the balance over every dev seed, both futures', () => {
  const runs = seedRuns()

  it('[test setup] reaches working and retired households, maps and ran-out years', () => {
    expect(runs.length).toBeGreaterThan(40)
    expect(runs.some((r) => r.rows.some((x) => x.workingYear !== undefined))).toBe(true)
    expect(runs.some((r) => r.rows.some((x) => x.ranOut))).toBe(true)
  })

  it('every year with a map balances: no gap, and the two printed totals differ only by the leaves’ rounding', () => {
    let maps = 0
    for (const run of runs) {
      for (const r of run.rows) {
        const v = at(run, r.t)
        if (v.body.kind !== 'map') continue
        maps++
        const leaves = v.body.nodes.filter((n) => n.value !== null)
        expect(v.body.gap, `${run.name} ${run.view} t=${r.t}`).toBe(false)
        expect(Math.abs(dollarsOf(v.body.totalIn) - dollarsOf(v.body.totalOut)), `${run.name} ${run.view} t=${r.t}`).toBeLessThanOrEqual(leaves.length)
        // A sum is the sum of the printed parts beside it.
        const total = v.body.nodes.find((n) => n.id === 'total-in')!
        expect(total.dollars).toBe(v.body.nodes.filter((n) => n.column === 0).reduce((s, n) => s + n.dollars, 0))
        for (const g of v.body.nodes.filter((n) => n.column === 2 && n.value === null && n.group !== 'gap')) {
          expect(g.dollars, `${run.name} ${g.id}`).toBe(v.body.nodes.filter((n) => n.column === 3 && n.group === g.group).reduce((s, n) => s + n.dollars, 0))
        }
      }
    }
    expect(maps, '[test setup] maps drawn').toBeGreaterThan(1000)
  })

  it('a ran-out year gets words, never a map, and every other year of that run says when the money runs out', () => {
    const run = runs.find((r) => r.rows.some((x) => x.ranOut))!
    const last = run.rows.at(-1)!
    expect(last.ranOut).toBe(true)
    const year = run.meta.startCalendarYear + last.t
    const v = at(run, last.t)
    expect(v.body).toEqual({ kind: 'words', tone: 'alert', words: slots.mapsRanOut(year) })
    expect(at(run, run.rows[0]!.t).runsOut).toBe(slots.mapsRunsOut(year))
    expect(v.scrubber.endMark).toBe(copy.cashFlowsShortYear)
  })
})

describe('mapsView — one source of truth: every leaf is the Summary’s own cell for the same run, year and future', () => {
  const DRILLS: readonly (SummaryDrill | null)[] = [null, 'income', 'distribution', 'expenses', 'saving']
  for (const run of seedRuns(['retired', 'dip', 'tablewidest'])) {
    it(`${run.name} ${run.view}: each leaf's id, field and printed words match the Summary's cell in every year`, () => {
      const input = (drill: SummaryDrill | null): CashFlowsInput => ({
        tab: 'summary',
        drill,
        maps: { t: null, choice: 'flow' },
        readOnly: false,
        accounts: 'end',
        future: run.view,
        pick: 'plan',
        offers: { working: null, kept: [], recommended: false, paired: null },
        plan: { kind: 'ready', rows: run.rows, meta: run.meta, updating: false, answerKey: 'k' },
        roughYears: { start: 1966, end: 1995, years: ROUGH_WINDOW_YEARS },
        wallCalendarYear: run.meta.startCalendarYear,
        stateClause: null,
      })
      // Every cell the Summary and its drills print, by column id and row.
      const cells = new Map<string, { text: string; value: number | null }>()
      for (const d of DRILLS) {
        const v = cashFlowsView(input(d))
        if (v.body.kind !== 'table') throw new Error('no table')
        v.body.rows.forEach((row) => {
          for (const [id, c] of Object.entries(row.cells)) cells.set(`${row.key}|${id}`, c)
        })
      }
      let checked = 0
      for (const r of run.rows) {
        const v = at(run, r.t)
        if (v.body.kind !== 'map') continue
        const leaves: { id: string; text: string; value: number }[] = [
          ...v.body.nodes.filter((n): n is MapNode & { value: number } => n.value !== null),
          ...[...v.body.inTiles, ...v.body.outTiles].flatMap((t) => t.leaves),
        ]
        for (const leaf of leaves) {
          const cell = cells.get(`${r.t}|${leaf.id}`)
          expect(cell, `${run.name} t=${r.t} ${leaf.id}: a column the Summary prints`).toBeDefined()
          expect(leaf.value, `${run.name} t=${r.t} ${leaf.id}: the same field`).toBe(cell!.value)
          // The Summary's cell drops the "$" (table law); the map prints it after the mark.
          expect(leaf.text.replace('$', ''), `${run.name} t=${r.t} ${leaf.id}: the same printed figure`).toBe(cell!.text)
          checked++
        }
      }
      expect(checked, '[test setup] leaves checked').toBeGreaterThan(20)
    })
  }
})

describe('mapsView — the parts of a year', () => {
  const [retired] = seedRuns(['retired'])
  const dip = seedRuns(['dip'])[0]!

  it('the scrubber’s years and both ages are the rows’, the first year chosen by default, an asked year clamped', () => {
    const v = at(retired!, null)
    expect(v.scrubber.years).toHaveLength(retired!.rows.length)
    expect(v.scrubber.index).toBe(0)
    const r5 = retired!.rows[5]!
    const y5 = at(retired!, r5.t).scrubber.years[5]!
    expect(y5.year).toBe(retired!.meta.startCalendarYear + r5.t)
    expect(y5.ages).toBe(retired!.meta.people.map((p, i) => (r5.alive[i] ? String(p.currentAge + r5.t) : '–')).join('/'))
    expect(at(retired!, r5.t).heading).toBe(y5.text)
    expect(at(retired!, 999).scrubber.index).toBe(retired!.rows.length - 1)
  })

  it('a working household: the stop year marked, each year named working or after work stops; its pay check and own deposits on the map, with their notes', () => {
    const v = at(dip, null)
    expect(v.scrubber.stopIndex).toBeGreaterThan(0)
    expect(v.scrubber.years[0]!.text).toContain('a working year')
    expect(v.scrubber.years[v.scrubber.stopIndex!]!.text).toContain('work has stopped')
    const m = mapOf(v)
    const ids = m.nodes.map((n) => n.id)
    expect(ids).toContain('payroll')
    expect(ids).toContain('into-savings')
    for (const n of payCheckNotes(dip.meta.stateTaxReading)) expect(v.notes).toContain(n)
    expect(v.notes).toContain(copy.mapsEmployerNote)
    // Never the employer-inclusive put-ins, never income tax folded with payroll.
    expect(ids.some((id) => id.startsWith('put-in-'))).toBe(false)
  })

  it('a group with one part draws as that part; a group with more draws its parts in the last column', () => {
    const m = mapOf(at(dip, null))
    const taxes = m.nodes.find((n) => n.id === 'taxes')!
    expect(taxes.column).toBe(2)
    expect(m.nodes.filter((n) => n.column === 3 && n.group === 'taxes').length).toBeGreaterThan(1)
    expect(m.nodes.find((n) => n.id === 'spending')!.column).toBe(2)
    for (const l of m.links) {
      expect(m.nodes.some((n) => n.id === l.from)).toBe(true)
      expect(m.nodes.some((n) => n.id === l.to)).toBe(true)
    }
  })

  it('names its future in the key sentence (a one-path view says so, plan 4.0)', () => {
    expect(mapOf(at(retired!, null)).key).toContain('in the steady market')
    const rough = seedRuns(['retired']).find((r) => r.view === 'rough')!
    expect(mapOf(at(rough, null)).key).toContain('in the rough market')
  })

  it('the moves inside savings stay off the map, said in words; Medicare’s surcharge is said, never a second node', () => {
    const r0 = retired!.rows[0]!
    const row: LedgerYearRow = { ...r0, conversion: 25_000, rmdToTaxable: 1_200, premiums: { ...r0.premiums, medicare: 6_120, irmaaSurcharge: 1_032 } }
    const v = at({ ...retired!, rows: [row] }, null)
    expect(v.notes).toContain(slots.mapsConversion('25,000'))
    expect(v.notes).toContain(copy.mapsRmdOff)
    expect(v.notes).toContain(slots.mapsIrmaa(formatTableDollars(6_120), formatTableDollars(1_032)))
    expect(mapOf(v).nodes.some((n) => n.id === 'irmaa' || n.id === 'conversion' || n.id === 'rmd-to-taxable')).toBe(false)
  })

  it('a year that does not balance draws the gap as its own named node on the short side, with its note', () => {
    const r0 = retired!.rows[0]!
    const moreIn: LedgerYearRow = { ...r0, socialSecurity: r0.socialSecurity + 5_000 }
    const out = mapOf(at({ ...retired!, rows: [moreIn] }, null))
    const gap = out.nodes.find((n) => n.id === 'gap')!
    expect(out.gap).toBe(true)
    expect(gap).toMatchObject({ name: copy.mapsGap, column: 2, group: 'gap' })
    expect(gap.dollars).toBeGreaterThanOrEqual(5_000 - 3)
    expect(at({ ...retired!, rows: [moreIn] }, null).notes).toContain(copy.mapsGapNote)
    expect(out.outTiles.at(-1)!.name).toBe(copy.mapsGap)
    const moreOut: LedgerYearRow = { ...r0, spending: (r0.spending ?? 0) + 5_000 }
    const inside = mapOf(at({ ...retired!, rows: [moreOut] }, null))
    expect(inside.nodes.find((n) => n.id === 'gap')!.column).toBe(0)
    expect(inside.inTiles.at(-1)!.name).toBe(copy.mapsGap)
    // Under the grain: no gap.
    const grain: LedgerYearRow = { ...r0, socialSecurity: r0.socialSecurity + MAP_GAP_MIN / 4 }
    expect(mapOf(at({ ...retired!, rows: [grain] }, null)).gap).toBe(false)
  })

  it('a working year with no W gets the "not asked yet" words, never a map', () => {
    const r0 = dip.rows[0]!
    const { spending: _drop, workingYear: _w, ...rest } = r0
    const v = at({ ...dip, rows: [rest as LedgerYearRow] }, null)
    expect(v.body).toEqual({ kind: 'words', tone: 'status', words: copy.mapsWorkingCostUnasked })
  })

  it('read-only: Maps writes nothing, so a read-only view is the same view, with no action in it', () => {
    const v = at(dip, 3, { readOnly: true })
    expect(v).toEqual(at(dip, 3, { readOnly: false }))
    expect(JSON.stringify(v)).not.toMatch(/"(door|onClick|apply|keep|save|delete)"/i)
  })
})

describe('cashFlowsView — Maps as the first folder tab', () => {
  const [retired] = seedRuns(['retired'])
  const input = (over: Partial<CashFlowsInput> = {}): CashFlowsInput => ({
    tab: 'maps',
    drill: null,
    maps: { t: null, choice: 'flow' },
    readOnly: false,
    accounts: 'end',
    future: 'steady',
    pick: 'plan',
    offers: { working: null, kept: [], recommended: false, paired: 'New what-if' },
    plan: { kind: 'ready', rows: retired!.rows, meta: retired!.meta, updating: false, answerKey: 'k' },
    roughYears: { start: 1966, end: 1995, years: ROUGH_WINDOW_YEARS },
    wallCalendarYear: retired!.meta.startCalendarYear,
    stateClause: copy.verdictStateUnpricedNote,
    ...over,
  })

  it('Maps first in the tabs; its body the map; its view select its title; no CSV; the page’s own lines and stopgaps ride', () => {
    const v = cashFlowsView(input())
    expect(v.tabs.items.map((i) => i.id)).toEqual(['maps', 'summary', 'accounts'])
    expect(v.body.kind).toBe('maps')
    expect(v.mapsSelect?.items.map((i) => i.value)).toEqual(['flow', 'breakdown'])
    expect(v.breadcrumb).toBeNull()
    expect(v.csv).toBeNull()
    expect(v.lines[0]).toBe(copy.workbenchSteadyWhat)
    expect(v.stopgaps).toContain(copy.verdictStateUnpricedNote)
    expect(v.footnotes[0]).toBe(copy.workbenchApproxNote)
  })

  it('offers no "Your plan beside the what-if" (one map draws one run); a held pair reads your plan', () => {
    const v = cashFlowsView(input({ pick: 'paired' }))
    expect(v.planSelect.items.map((i) => i.value)).not.toContain('paired')
    expect(v.planSelect.value).toBe('plan')
    expect(cashFlowsView(input({ tab: 'summary' })).planSelect.items.map((i) => i.value)).toContain('paired')
  })

  it('every answer state shows as the Summary shows it; rows from before a change ride busy with the Updating line', () => {
    expect(cashFlowsView(input({ plan: { kind: 'loading' } })).body).toEqual({ kind: 'state', tone: 'status', words: copy.workbenchTableLoading })
    expect(cashFlowsView(input({ plan: { kind: 'error' } })).body).toEqual({ kind: 'state', tone: 'alert', words: copy.workbenchTableError })
    expect(cashFlowsView(input({ plan: { kind: 'withheld', words: copy.workbenchWithheldNoRun } })).body).toEqual({ kind: 'state', tone: 'status', words: copy.workbenchWithheldNoRun })
    const busy = cashFlowsView(input({ plan: { kind: 'ready', rows: retired!.rows, meta: retired!.meta, updating: true, answerKey: 'k' } }))
    expect(busy.body).toMatchObject({ kind: 'maps', busy: true })
    expect(busy.updating).toBe(copy.workbenchTableUpdating)
  })
})
