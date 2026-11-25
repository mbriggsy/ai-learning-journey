import { describe, expect, it } from 'vitest'
import { DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import type { Headline } from '@shared/model'
import { copy, slots } from '../../../copy'
import { DEV_SEEDS } from '../../../devSeeds'
import { ringFace } from '../../../ringReading'
import { START_SETTINGS, stressOffers, type StressBarId, type StressBarRun } from '../../../workbench/useStress'
import type { WhatIfReading } from '../../../workbench/whatIfRun'
import { STRESS_COLOR, stressTrayView, stressView, type StressPageView } from '../stressView'

/**
 * Act 6 · RC11's page and tray views (plan RC11, "Test scenarios"): Baseline equals the plan's own reading as Probability
 * prints it (the ring's one composer); every bar prints its count through the copy slots and stands to the ring's arc;
 * a bar with no count yet draws no column, a failed one says why, never a borrowed count; the working route names the
 * stop year; the subsidy row is absent with no years before 65; the stopgap line rides under the chart.
 */

const START = 2026
const headline = (n: number, state = 'on-track'): WhatIfReading => ({ kind: 'headline', headline: { xOfTen: { value: n }, outcomeState: state } as unknown as Headline })
const offset = (sf: number, offsetYears = 5, track: 'full' | 'floor' = 'full'): WhatIfReading => ({ kind: 'offset', reading: offsetReading({ offsetYears, survivalFraction: sf }, DATE_SEARCH_PATHS.final), track })

function barsOf(v: StressPageView) {
  if (v.kind !== 'bars') throw new Error(`[test] ${v.kind}`)
  return v
}
const view = (plan: WhatIfReading | null, bars: [StressBarId, StressBarRun][], offers = stressOffers(DEV_SEEDS.health), stateClause: string | null = null) =>
  stressView({ startCalendarYear: START, plan, planClockYears: 0, offers, committed: START_SETTINGS, bars: new Map(bars), stateClause })

describe('stressView — the bars', () => {
  it('Baseline is the plan’s own reading, worded exactly as the ring composer words it (Probability’s count)', () => {
    for (const plan of [headline(8), headline(9, 'over-funded'), headline(0, 'already-failing'), offset(0.73)]) {
      const v = barsOf(view(plan, []))
      const face = ringFace(plan, START)
      expect(v.bars[0]).toMatchObject({ id: 'baseline', role: 'baseline', name: copy.stressBaseline, count: face.centre, height: face.arc, colorIndex: STRESS_COLOR.baseline })
    }
  })

  it('every bar prints its count through the X-of-10 slots and stands to the ring’s arc; the ceiling never reads 10 of 10', () => {
    const v = barsOf(
      view(headline(8), [
        ['social-security', { kind: 'ready', reading: headline(6), updating: false }],
        ['out-of-pocket', { kind: 'ready', reading: headline(9, 'over-funded'), updating: false }],
        ['combined', { kind: 'ready', reading: headline(4), updating: false }],
      ]),
    )
    expect(v.bars.map((b) => [b.id, b.count, b.height])).toEqual([
      ['baseline', slots.xOfTen(8), 8],
      ['social-security', slots.xOfTen(6), 6],
      ['out-of-pocket', slots.xOfTenAtCeiling(), 9],
      ['combined', slots.xOfTen(4), 4],
    ])
    expect(v.bars.map((b) => b.role)).toEqual(['baseline', 'stress', 'stress', 'combined'])
    expect(v.bars.some((b) => /10 of 10|%/.test(b.count))).toBe(false)
    expect(v.bars[1]!.detail).toBe(slots.stressPctLess(20))
    expect(v.bars[2]!.detail).toBe(slots.stressPctHigher(50))
    expect(v.bars[1]!.point).toBe(slots.stressBarPoint(copy.stressSocialSecurity, slots.stressPctLess(20), slots.xOfTen(6)))
    expect(v.loading).toBe(false)
  })

  it('in flight: a bar keeps its last landed count under the veil, or draws no column; a failure says why and prints no count', () => {
    const v = barsOf(
      view(headline(8), [
        ['social-security', { kind: 'loading', held: headline(6) }],
        ['out-of-pocket', { kind: 'loading' }],
        ['combined', { kind: 'error' }],
      ]),
    )
    expect(v.loading).toBe(true)
    expect(v.bars.map((b) => [b.id, b.count, b.height])).toEqual([
      ['baseline', slots.xOfTen(8), 8],
      ['social-security', slots.xOfTen(6), 6],
      ['out-of-pocket', '', null],
      ['combined', '', null],
    ])
    expect(v.notes).toContain(slots.stressBarError(copy.stressCombined))
    const refused = barsOf(view(headline(8), [['social-security', { kind: 'refused', refusal: { kind: 'futures-differ', field: 'paths' } }]]))
    expect(refused.bars[1]).toMatchObject({ count: '', height: null })
    expect(refused.notes).toContain(slots.stressBarWithheld(copy.stressSocialSecurity))
  })

  it('the stopgap line first under the chart, then each stress the plan cannot run by name, then the state clause', () => {
    const v = barsOf(view(headline(8), [], stressOffers(DEV_SEEDS.retired), 'STATE'))
    expect(v.notes).toEqual([copy.stressStopgap, copy.stressRefusedNoOop, copy.stressRefusedNoMarketplace, 'STATE'])
    expect(copy.stressStopgap).toBe('Market drops, higher inflation, higher taxes, lower returns and longer lives come with B9’s stress-test build.')
  })

  it('every stressed bar with a count at Baseline’s count: one note, first after the stopgap; one bar off it: no note', () => {
    const same = barsOf(
      view(headline(9), [
        ['social-security', { kind: 'ready', reading: headline(9), updating: false }],
        ['out-of-pocket', { kind: 'ready', reading: headline(9), updating: false }],
        ['combined', { kind: 'error' }],
      ]),
    )
    expect(same.notes.slice(0, 2)).toEqual([copy.stressStopgap, copy.stressNoneMoves])
    expect(copy.stressNoneMoves).not.toMatch(/%/)
    const differs = barsOf(
      view(headline(9), [
        ['social-security', { kind: 'ready', reading: headline(9), updating: false }],
        ['combined', { kind: 'ready', reading: headline(8), updating: false }],
      ]),
    )
    expect(differs.notes).not.toContain(copy.stressNoneMoves)
    // No stressed bar with a count (none offered, or all still running): no note.
    expect(barsOf(view(headline(9), [])).notes).not.toContain(copy.stressNoneMoves)
    expect(barsOf(view(headline(9), [['social-security', { kind: 'loading', held: headline(9) }]])).notes).not.toContain(copy.stressNoneMoves)
  })

  it('the working route names the stop year every bar reads, and the essentials-only pass where that is the reading', () => {
    expect(barsOf(view(headline(8), [])).readsAt).toEqual([])
    expect(barsOf(view(offset(0.73, 5), [])).readsAt).toEqual([slots.stressReadsAt(slots.snapshotRingStopIn(START + 5))])
    expect(barsOf(view(offset(0.73, 5, 'floor'), [])).readsAt).toEqual([slots.stressReadsAt(slots.snapshotRingStopIn(START + 5)), copy.snapshotRingEssentialsNote])
  })

  it('no plan reading: words, never a bar', () => {
    expect(view(null, [])).toEqual({ kind: 'words', words: copy.stressNoReading })
  })
})

describe('stressTrayView — the sentence rows', () => {
  it('a row per offered stress the tray has on, each with its slider and its size; the subsidy row absent with no years before 65', () => {
    const t = stressTrayView(START_SETTINGS, START_SETTINGS, stressOffers(DEV_SEEDS.health))
    expect(t.rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ['social-security', copy.stressTraySs, slots.stressPctLess(20)],
      ['out-of-pocket', copy.stressTrayOop, slots.stressPctHigher(50)],
    ])
    expect(t.refusals).toEqual([copy.stressRefusedCurrentLaw])
    expect(t.pendingDiffers).toBe(false)
    const retired = stressTrayView(START_SETTINGS, START_SETTINGS, stressOffers({ ...DEV_SEEDS.retired, enhancedSubsidies: true }))
    expect(retired.rows.map((r) => r.id)).toEqual(['social-security'])
    expect(retired.refusals).toEqual([copy.stressRefusedNoOop, copy.stressRefusedNoMarketplace])
    const enhanced = stressTrayView(START_SETTINGS, START_SETTINGS, stressOffers({ ...DEV_SEEDS.health, enhancedSubsidies: true }))
    expect(enhanced.rows.map((r) => r.id)).toEqual(['social-security', 'out-of-pocket', 'subsidy-rules'])
  })

  it('an edit waiting for Refresh says so; a stress turned off leaves its row and keeps its box in the Edit list', () => {
    const pending = { ...START_SETTINGS, on: { ...START_SETTINGS.on, 'out-of-pocket': false } }
    const t = stressTrayView(pending, START_SETTINGS, stressOffers(DEV_SEEDS.health))
    expect(t.pendingDiffers).toBe(true)
    expect(t.rows.map((r) => r.id)).toEqual(['social-security'])
    expect(t.edit).toEqual([
      { id: 'social-security', label: copy.stressSocialSecurity, checked: true },
      { id: 'out-of-pocket', label: copy.stressOutOfPocket, checked: false },
    ])
  })
})
