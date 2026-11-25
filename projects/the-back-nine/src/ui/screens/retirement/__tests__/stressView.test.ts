import { describe, expect, it } from 'vitest'
import { DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import type { Headline } from '@shared/model'
import { copy, slots } from '../../../copy'
import { DEV_SEEDS } from '../../../devSeeds'
import { ringFace } from '../../../ringReading'
import { barRun, START_SETTINGS, stressOffers, type StressBarId, type StressBarRun } from '../../../workbench/useStress'
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
const view = (plan: WhatIfReading | null, bars: [StressBarId, StressBarRun][], offers = stressOffers(DEV_SEEDS.health), stateClause: string | null = null, more: { refiguring?: boolean; noDate?: boolean } = {}) =>
  stressView({ startCalendarYear: START, plan, planClockYears: 0, offers, committed: START_SETTINGS, bars: new Map(bars), stateClause, refiguring: more.refiguring ?? false, noDate: more.noDate ?? false })

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

  it('every stressed bar with a count at Baseline’s count: one note, first after the stopgap; one bar off it, or one with no count: no note', () => {
    const same = barsOf(
      view(headline(9), [
        ['social-security', { kind: 'ready', reading: headline(9), updating: false }],
        ['out-of-pocket', { kind: 'ready', reading: headline(9), updating: false }],
      ]),
    )
    expect(same.notes.slice(0, 2)).toEqual([copy.stressStopgap, copy.stressNoneMoves])
    expect(copy.stressNoneMoves).not.toMatch(/%/)
    // A stress that failed shows no count: "none of these stresses moves" would claim it did not move.
    const failed = barsOf(
      view(headline(9), [
        ['social-security', { kind: 'ready', reading: headline(9), updating: false }],
        ['out-of-pocket', { kind: 'ready', reading: headline(9), updating: false }],
        ['combined', { kind: 'error' }],
      ]),
    )
    expect(failed.notes).not.toContain(copy.stressNoneMoves)
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

  it('an indeterminate plan reading is no reading (words, never a 0-height Baseline); an indeterminate stress draws no column, names itself in the notes, and blocks "none moves"', () => {
    expect(view(headline(0, 'indeterminate'), [])).toEqual({ kind: 'words', words: copy.stressNoReading })
    const v = barsOf(
      view(headline(8), [
        ['social-security', { kind: 'ready', reading: headline(0, 'indeterminate'), updating: false }],
        ['out-of-pocket', { kind: 'ready', reading: headline(8), updating: false }],
      ]),
    )
    expect(v.bars[1]).toMatchObject({ id: 'social-security', height: null })
    // Its empty slot has no label (Highcharts draws none on a null column): the note says which stress and why.
    expect(v.notes).toContain(slots.stressBarNoCount(copy.stressSocialSecurity))
    // A stress with no number is never one that "did not move": the line would print over its empty slot.
    expect(v.notes).not.toContain(copy.stressNoneMoves)
    const onlyIndeterminate = barsOf(view(headline(8), [['social-security', { kind: 'ready', reading: headline(0, 'indeterminate'), updating: false }]]))
    expect(onlyIndeterminate.notes).not.toContain(copy.stressNoneMoves)
  })

  it('while the answer is worked out again the old bars stay under the re-figuring line', () => {
    const v = barsOf(view(headline(8), [['social-security', { kind: 'ready', reading: headline(6), updating: false }]], undefined, null, { refiguring: true }))
    expect(v.tag).toBe(copy.answerRefiguringCaption)
    expect(v.bars.map((b) => b.count)).toEqual([slots.xOfTen(8), slots.xOfTen(6)])
    expect(barsOf(view(headline(8), [])).tag).toBeUndefined()
  })

  it('a plan whose answer found no date reads every bar at the window’s last year, and says so (never "the stop year your plan’s answer uses")', () => {
    const v = barsOf(view(offset(0.4, 15), [], undefined, null, { noDate: true }))
    expect(v.readsAt).toEqual([slots.stressReadsAtNoDate(slots.snapshotRingStopIn(START + 15))])
  })
})

describe('barRun — a bar from its slot', () => {
  it('a reading landed on an older answer is updating on its first frame back, never current', () => {
    const ready = (answerKey: string, updating = false) =>
      ({ kind: 'shown', many: { kind: 'ready', value: { whatIf: headline(6) }, answerKey, updating }, steady: { kind: 'loading' }, rough: { kind: 'loading' }, planHealth: { kind: 'loading' } }) as unknown as Parameters<typeof barRun>[0]
    expect(barRun(ready('headline:final:k1'), undefined, 'headline:final:k1')).toEqual({ kind: 'ready', reading: headline(6), updating: false })
    expect(barRun(ready('headline:final:k1'), undefined, 'headline:final:k2')).toEqual({ kind: 'ready', reading: headline(6), updating: true })
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
