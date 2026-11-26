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
import { cashFlowsView, leavesOf, type CashFlowsInput, type SummaryDrill } from '../cashFlowsView'
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
function seedRuns(names?: readonly string[], track: 'lifestyle' | 'floor' = 'lifestyle'): Run[] {
  const out: Run[] = []
  for (const [name, draft] of Object.entries(DEV_SEEDS)) {
    if (names !== undefined && !names.includes(name)) continue
    let run = tableRunFor({ kind: 'headline', tier: 'final', draft, inputKey: 'k' } as unknown as ModelAnswer)
    if (run.kind === 'withheld' && run.reason === 'no-date-answer') {
      run = tableRunFor({
        kind: 'date',
        tier: 'final',
        draft,
        outcome: { kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1, band: { offsetYears: 4, track } },
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
/** A sum's words, worked out here on their own: "~" when any part carries one, the dollars grouped. */
const sumText = (parts: readonly { text: string; dollars: number }[]): string =>
  `${parts.some((p) => p.text.startsWith('~')) ? '~' : ''}$${parts.reduce((s, p) => s + p.dollars, 0).toLocaleString('en-US')}`

/** Cash Flows on Maps for one run, as the page asks for it. */
const mapsInput = (run: Run, over: Partial<CashFlowsInput> = {}): CashFlowsInput => ({
  tab: 'maps',
  drill: null,
  maps: { t: null, choice: 'flow' },
  readOnly: false,
  accounts: 'end',
  future: run.view,
  pick: 'plan',
  offers: { working: null, kept: [], recommended: false, paired: null },
  plan: { kind: 'ready', rows: run.rows, meta: run.meta, updating: false, answerKey: 'k' },
  roughYears: { start: 1966, end: 1995, years: ROUGH_WINDOW_YEARS },
  wallCalendarYear: run.meta.startCalendarYear + 1,
  stateClause: null,
  ...over,
})

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
        const who = `${run.name} ${run.view} t=${r.t}`
        const m = v.body
        const byId = new Map(m.nodes.map((n) => [n.id, n]))
        // F1: a flow speaks the figure it carries (its source into Total inflows, else the node it feeds), and that
        // node's dollars are the flow's width.
        for (const l of m.links) {
          const from = byId.get(l.from)!
          const to = byId.get(l.to)!
          const carried = l.to === 'total-in' ? from : to
          expect(l.spoken, `${who} ${l.from}→${l.to}`).toBe(slots.mapsLinkWords(from.name, to.name, carried.text))
          expect(carried.dollars, `${who} ${l.from}→${l.to}: the width is the carried figure`).toBe(l.weight)
        }
        // F3: the sums' words. Each sum (the total, a group) prints the sum of its parts' printed dollars, with "~"
        // exactly when one of its parts carries one.
        const leavesOf = (g: string) => m.nodes.filter((n) => n.group === g && n.value !== null)
        expect(total.text, `${who}: Total inflows' words`).toBe(sumText(m.nodes.filter((n) => n.column === 0)))
        for (const g of m.nodes.filter((n) => n.column === 2 && n.value === null && n.group !== 'gap')) expect(g.text, `${who} ${g.id}`).toBe(sumText(leavesOf(g.group)))
        // The tiles, the phone's only view: each tile's words are its parts' sum (or its one node's), its parts listed
        // as the nodes print them, and the tiles add up to each side's total.
        for (const t of [...m.inTiles, ...m.outTiles]) {
          const parts = t.group === 'gap' ? m.nodes.filter((n) => n.group === 'gap') : leavesOf(t.group)
          expect(t.text, `${who} tile ${t.id}`).toBe(parts.length === 1 ? parts[0]!.text : sumText(parts))
          if (t.leaves.length > 0) expect(t.leaves.map((x) => [x.id, x.text]), `${who} tile ${t.id}'s parts`).toEqual(parts.map((n) => [n.id, n.text]))
        }
        expect(m.inTiles.reduce((s, t) => s + dollarsOf(t.text), 0), `${who}: the in tiles add to Total inflows`).toBe(dollarsOf(m.totalIn))
        expect(m.outTiles.reduce((s, t) => s + dollarsOf(t.text), 0), `${who}: the out tiles add to Total outflows`).toBe(dollarsOf(m.totalOut))
        expect(m.totalIn).toBe(total.text)
        expect(m.totalOut, `${who}: Total outflows' words`).toBe(sumText(m.nodes.filter((n) => n.value !== null && (n.column === 3 || (n.column === 2 && n.group !== 'total')))))
        expect(m.totalInWords).toBe(slots.mapsTotalWords(copy.mapsTotalIn, m.totalIn))
        expect(m.totalOutWords).toBe(slots.mapsTotalWords(copy.mapsTotalOut, m.totalOut))
        // A year that balances is called rounding only where the printed sides differ.
        expect(v.notes.includes(copy.mapsRoundingNote), `${who}: the rounding note`).toBe(dollarsOf(m.totalIn) !== dollarsOf(m.totalOut))
      }
    }
    expect(maps, '[test setup] maps drawn').toBeGreaterThan(1000)
  })

  it('every year’s own sentences, never collapsed: a first death names the one on their own, a not-kept year says so on every year of its run, the rough view’s first steady year says so', () => {
    let deaths = 0
    let notKept = 0
    let steadyFrom = 0
    for (const run of runs) {
      run.rows.forEach((r, k) => {
        const v = at(run, r.t)
        const year = run.meta.startCalendarYear + r.t
        expect(v.yearNotes.some((n) => n.includes('The same each year through')), `${run.name} ${year}: never collapsed`).toBe(false)
        const prev = run.rows[k - 1]
        if (run.meta.people.length === 2 && r.alive.filter(Boolean).length === 1 && (prev === undefined ? 2 : prev.alive.filter(Boolean).length) === 2) {
          const s = run.meta.people[r.alive.indexOf(true)]!
          expect(v.yearNotes, `${run.name} ${year}: the first death`).toContain(slots.cashFlowsYearNote(year, slots.workbenchRowSurvivor(s.mid, s.you)))
          deaths++
        }
        if (formatTableDollars(r.incomeNotKept) !== '0') {
          const amount = formatTableDollars(r.incomeNotKept)
          if (r.workingYear === undefined) expect(v.yearNotes, `${run.name} ${year}: not kept`).toContain(slots.cashFlowsYearNote(year, slots.workbenchRowNotKeptRetired(amount)))
          else expect(v.yearNotes.some((n) => n.startsWith(`${year}: `) && n.includes(`~$${amount}`)), `${run.name} ${year}: the left over not kept`).toBe(true)
          notKept++
        }
        if (run.view === 'rough' && r.t === ROUGH_WINDOW_YEARS) {
          expect(v.yearNotes[0], `${run.name}: the rough view's steady-from line`).toBe(slots.cashFlowsYearNote(year, slots.workbenchRoughSteadyFrom(1995)))
          steadyFrom++
        }
      })
    }
    expect([deaths, notKept, steadyFrom].every((n) => n > 0), `[test setup] deaths ${deaths}, not-kept years ${notKept}, steady-from ${steadyFrom}`).toBe(true)
  })

  it('no word on Maps names a table, a row or a column (the Summary’s own words stay the Summary’s)', () => {
    const tableWords = /\b(table|rows?|columns?)\b/i
    for (const run of runs) {
      const v = cashFlowsView(mapsInput(run))
      if (v.body.kind !== 'maps') throw new Error('no maps')
      for (const line of [...v.lines, ...v.stopgaps, ...v.footnotes, ...v.sourceKey.map((e) => e.accounts)]) expect(line, `${run.name} ${run.view}`).not.toMatch(tableWords)
      for (const r of run.rows) {
        const y = at(run, r.t)
        const words = [...y.notes, ...y.yearNotes, y.heading, y.phoneNote, y.body.kind === 'words' ? y.body.words : '']
        for (const w of words) expect(w, `${run.name} ${run.view} t=${r.t}`).not.toMatch(tableWords)
      }
    }
  })

  it('a ran-out year gets words, never a map, and every other year of that run says when the money runs out', () => {
    const run = runs.find((r) => r.rows.some((x) => x.ranOut))!
    const last = run.rows.at(-1)!
    expect(last.ranOut).toBe(true)
    const year = run.meta.startCalendarYear + last.t
    const v = at(run, last.t)
    expect(v.body).toEqual({ kind: 'words', tone: 'status', words: slots.mapsRanOut(year) })
    expect(at(run, run.rows[0]!.t).runsOut).toBe(slots.mapsRunsOut(year))
    expect(v.scrubber.endMark).toBe(copy.cashFlowsShortYear)
  })
})

describe('mapsView — one source of truth: every leaf is the Summary’s own cell for the same run, year and future', () => {
  const DRILLS: readonly (SummaryDrill | null)[] = [null, 'income', 'distribution', 'expenses', 'saving']
  // Lifestyle runs and a floor-band run (its spending after work the essentials, `meta.track === 'floor'`), and
  // `surpluswidest` (its other income: leaf `other-0`).
  for (const run of [...seedRuns(['retired', 'dip', 'tablewidest', 'surpluswidest']), ...seedRuns(['dip'], 'floor').map((r) => ({ ...r, name: `${r.name} floor` }))]) {
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
      const ids = new Set<string>()
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
          ids.add(leaf.id)
          checked++
        }
      }
      expect(checked, '[test setup] leaves checked').toBeGreaterThan(20)
      if (run.name === 'surpluswidest') expect(ids.has('other-0'), '[test setup] surpluswidest reaches other income').toBe(true)
    })
  }

  it('[test setup] the floor band reaches a floor-track run', () => {
    expect(seedRuns(['dip'], 'floor').some((r) => r.meta.track === 'floor')).toBe(true)
  })
})

describe('mapsView — the parts of a year', () => {
  const [retired] = seedRuns(['retired'])
  const dip = seedRuns(['dip'])[0]!

  it('the slider speaks each person by name with their age, one on their own after a death, never a dash', () => {
    const run = seedRuns().find((x) => x.meta.people.length === 2 && x.rows.some((r) => r.alive.filter(Boolean).length === 1))!
    const v = at(run, null)
    run.rows.forEach((r, k) => {
      const spoken = v.scrubber.years[k]!.spoken
      expect(spoken.startsWith(`${run.meta.startCalendarYear + r.t}: `)).toBe(true)
      expect(spoken).not.toContain('–')
      run.meta.people.forEach((p, i) => {
        if (r.alive[i] === true) expect(spoken, `${run.name} t=${r.t}`).toContain(`${p.mid} ${p.you ? 'are' : 'is'} ${p.currentAge + r.t}`)
        else expect(spoken, `${run.name} t=${r.t}`).not.toContain(`${p.mid} `)
      })
      if (r.alive.filter(Boolean).length === 1) expect(spoken).toMatch(/, on (your|their) own/)
    })
    // The readout still prints both ages, a dash for the one gone.
    const gone = run.rows.findIndex((r) => r.alive.filter(Boolean).length === 1)
    expect(v.scrubber.years[gone]!.text).toContain('–')
  })

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
    for (const n of payCheckNotes(dip.meta.stateTaxReading, 'map')) expect(v.notes).toContain(n)
    expect(v.notes[0]).toBe(slots.mapsApproxNote(dip.meta.startCalendarYear))
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

  it('a negative part (an ACA year’s income tax below zero) is never called rounding: the printed sides’ difference is drawn as the gap, the tax never clamped', () => {
    const r0 = retired!.rows[0]!
    // Signed, the year still balances: the tax's swing to −$800 is moved into spending. Printed unsigned, the two sides
    // differ by twice the tax.
    const row: LedgerYearRow = { ...r0, taxPaid: -800, spending: (r0.spending ?? 0) + r0.taxPaid + 800 }
    const v = at({ ...retired!, rows: [row] }, null)
    const m = mapOf(v)
    expect(m.nodes.find((n) => n.id === 'income-tax')).toMatchObject({ dollars: 800, value: -800 })
    expect(m.gap).toBe(true)
    const gap = m.nodes.find((n) => n.id === 'gap')!
    expect(Math.abs(gap.dollars - 1_600)).toBeLessThanOrEqual(m.nodes.filter((n) => n.value !== null).length)
    expect(gap.column).toBe(0)
    expect(v.notes).toContain(copy.mapsGapNote)
    expect(v.notes).not.toContain(copy.mapsRoundingNote)
  })

  it('a year with payroll tax and no income tax on pay still carries the pay check’s notes, on Maps and under the Summary', () => {
    const run = seedRuns(['dateshort']).find((x) => x.view === 'steady')!
    const k = run.rows.findIndex((r) => r.workingYear !== undefined && formatTableDollars(r.workingYear.taxOnOutsideIncome) === '0' && formatTableDollars(r.workingYear.payrollTax) !== '0')
    expect(k, '[test setup] dateshort has a year with payroll tax and no income tax on pay').toBeGreaterThanOrEqual(0)
    const v = at(run, run.rows[k]!.t)
    expect(mapOf(v).nodes.some((n) => n.id === 'payroll')).toBe(true)
    expect(mapOf(v).nodes.some((n) => n.id === 'tax-on-pay')).toBe(false)
    for (const n of payCheckNotes(run.meta.stateTaxReading, 'map')) expect(v.notes).toContain(n)
    // The Summary: its pay check's notes ride a payroll column alone too (the run's every income tax on pay set to 0, so
    // that column drops out of the whole table).
    const noPayTax = run.rows.map((r) => (r.workingYear === undefined ? r : { ...r, workingYear: { ...r.workingYear, taxOnOutsideIncome: 0 } }))
    const sv = cashFlowsView(mapsInput({ ...run, rows: noPayTax }, { tab: 'summary' }))
    if (sv.body.kind !== 'table') throw new Error('no table')
    const shown = new Set(leavesOf(sv.body.columns).map((l) => l.id))
    expect(shown.has('payroll'), '[test setup] the Summary shows payroll').toBe(true)
    expect(shown.has('tax-on-pay'), '[test setup] and no income tax on pay').toBe(false)
    for (const n of payCheckNotes(run.meta.stateTaxReading)) expect(sv.footnotes).toContain(n)
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
    expect(v.footnotes[0]).toBe(slots.mapsApproxNote(retired!.meta.startCalendarYear))
    // Maps' wording where the Summary names a table; the Summary keeps its own.
    expect(v.stopgaps).toContain(copy.mapsKindsMissing)
    expect(v.stopgaps).not.toContain(copy.workbenchKindsMissing)
    const summary = cashFlowsView(input({ tab: 'summary' }))
    expect(summary.stopgaps).toContain(copy.workbenchKindsMissing)
    expect(summary.footnotes[0]).toBe(copy.workbenchApproxNote)
    // An aged plan: the first year shown, not "row one".
    const aged = input({ wallCalendarYear: retired!.meta.startCalendarYear + 2 })
    expect(cashFlowsView(aged).lines).toContain(slots.mapsAged(retired!.meta.startCalendarYear))
    expect(cashFlowsView({ ...aged, tab: 'summary' }).lines).toContain(slots.workbenchAged(retired!.meta.startCalendarYear))
  })

  it('the Summary’s source key rides Maps: what each savings source holds, for the same run and future', () => {
    const v = cashFlowsView(input())
    expect(v.sourceKey.length).toBeGreaterThan(0)
    expect(v.sourceKey).toEqual(cashFlowsView(input({ tab: 'summary' })).sourceKey)
  })

  it('a working run’s stop line names these figures, never a table', () => {
    const dip = seedRuns(['dip']).find((r) => r.view === 'steady')!
    expect(dip.meta.stopYear, '[test setup] dip stops in a year').toBeDefined()
    const v = cashFlowsView(input({ plan: { kind: 'ready', rows: dip.rows, meta: dip.meta, updating: false, answerKey: 'k' } }))
    expect(v.lines).toContain(dip.meta.route === 'dated' ? slots.mapsStopsIn(dip.meta.stopYear!) : slots.mapsNoDate(dip.meta.stopYear!))
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
    expect(busy.updating).toBe(copy.mapsUpdating)
  })
})
