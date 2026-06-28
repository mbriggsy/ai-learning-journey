import { describe, it, expect } from 'vitest'
import { dateTradeoffPoint } from '../dateTradeoff'
import { slots } from '../copy'
import type { DateOffsetReading, DateTrackOutcome } from '@shared/model'

/*
 * The date↔confidence tradeoff helper (R28). Externally-constructed curves (not engine output): the
 * helper reads the curve, never re-derives a threshold. The honesty pins are the suppression rules
 * (window-edge / non-monotone / free-today never offer a "go sooner" point) and the strictly-lower
 * selection (a cleared-then-dipped earlier offset at the crowned odds is NOT a tradeoff).
 */

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: qlb + 0.03,
  quantizedLowerBound: qlb,
  clears: qlb >= 0.85,
})

const confirmed = (
  offsetYears: number,
  qlb: number,
  curve: readonly DateOffsetReading[],
  nonMonotoneOffsets: readonly number[] = [],
): DateTrackOutcome => ({
  kind: 'confirmed-date',
  offsetYears,
  grade: { quantizedLowerBound: qlb, survivalFraction: qlb + 0.03, marginAboveBar: qlb - 0.85 },
  nonMonotoneOffsets,
  curve,
})

describe('dateTradeoffPoint — the R28 earlier lower-odds point', () => {
  it('returns the LATEST earlier offset with strictly-lower odds (the smallest-sacrifice point)', () => {
    // crowned at 4 (qlb 0.88 → 9 of 10); offsets 2 and 3 read 8 of 10 — the LATEST is 3 (1yr sooner)
    const track = confirmed(4, 0.88, [reading(2, 0.78), reading(3, 0.82), reading(4, 0.88)])
    expect(dateTradeoffPoint(track)).toEqual({ yearsSooner: 1, oddsText: slots.xOfTen(8) })
  })

  it('EXCLUDES a cleared-then-dipped earlier offset reading at the crowned odds (strictly-lower only)', () => {
    // offset 2 cleared (0.86 → 9, same as crowned 9) but dips; it must NOT be offered as a tradeoff.
    // offset 1 reads 7 of 10 — that is the real earlier point.
    const track = confirmed(4, 0.88, [reading(1, 0.7), reading(2, 0.86), reading(4, 0.88)])
    expect(dateTradeoffPoint(track)).toEqual({ yearsSooner: 3, oddsText: slots.xOfTen(7) })
  })

  it('returns null for a NON-MONOTONE result (the ACA-cliff disclosure is the priority earlier-message)', () => {
    const track = confirmed(6, 0.86, [reading(2, 0.8), reading(6, 0.86)], [2, 3])
    expect(dateTradeoffPoint(track)).toBeNull()
  })

  it('returns null for a WINDOW-EDGE result (it carries the edge-of-window disclosure)', () => {
    const track: DateTrackOutcome = {
      kind: 'window-edge-unconfirmed',
      offsetYears: 30,
      grade: { quantizedLowerBound: 0.85, survivalFraction: 0.88, marginAboveBar: 0 },
      nonMonotoneOffsets: [],
      curve: [reading(15, 0.74), reading(30, 0.85)],
    }
    expect(dateTradeoffPoint(track)).toBeNull()
  })

  it('returns null for a NO-DATE result and for free-today (no earlier offset to offer)', () => {
    const noDate: DateTrackOutcome = {
      kind: 'no-date-in-window',
      nonMonotoneOffsets: [],
      curve: [reading(0, 0.55), reading(30, 0.72)],
    }
    expect(dateTradeoffPoint(noDate)).toBeNull()
    expect(dateTradeoffPoint(confirmed(0, 0.92, [reading(0, 0.92)]))).toBeNull()
  })

  it('returns null when every earlier offset already reads at the crowned odds (no real tradeoff)', () => {
    const track = confirmed(3, 0.88, [reading(1, 0.88), reading(2, 0.9), reading(3, 0.88)])
    expect(dateTradeoffPoint(track)).toBeNull()
  })
})
