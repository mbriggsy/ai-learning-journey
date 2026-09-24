/**
 * The two shipped Medicare-era seeds through the REAL pipeline — buildSpineParams → runEngine with
 * the app's own options → composeHealthSheet — the council's gate for the era-loud premium card
 * (2026-09-13, 8/10): the WIRE-read enrollment frame renders `retired` (66/65 — everyone enrolled
 * from the first billed year) BYTE-IDENTICAL to the pre-build sentence, and `healthnc` (61/59 — one
 * enrolled at the anchor, both two years later) era-loud with the step card's anchor UNMOVED.
 *
 * Every dollar below is the engine's own output through this file's pipeline (first measured
 * 2026-09-13) at the $100 grain the sheet speaks. A constants re-verify that moves Part B or the
 * Medicare-cost trend moves them — re-run THIS gate, read the engine's numbers off the failure, and
 * re-pin; never hand-edit a number into agreement (DND 012: the expectation is derived OUTSIDE the
 * composer, by the engine's run, never by the composer's formula). This file IS the instrument.
 *
 * Lives beside the unit arms (not inside them) so the fast file stays fast: two 2,000-path runs.
 */
import { describe, it, expect } from 'vitest'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { composeHealthSheet, medicareAnchor, medicareEraYear } from '@ui/healthSheetChrome'
import { copy, slots } from '@ui/copy'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants/health'
import type { HealthReadout } from '@shared/model'

/** A clock inside the ACA re-verify window, RELATIVE to the live record (the status line is not
 *  under test here; the facts are). */
const FRESH = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 1

const readoutOf = (name: 'retired' | 'healthnc' | 'healthgap'): HealthReadout => {
  const d = DEV_SEEDS[name]
  const params = buildSpineParams(d)
  if (params === null) throw new Error(`${name}: not a spine seed`)
  if (d.seed === undefined) throw new Error(`${name}: the dev seed carries no engine seed`)
  const wire = runEngine(params, d.seed, { bandFan: true, survivorConditioned: true, healthReadout: true })
  if (wire.kind !== 'resolved' || wire.healthReadout === undefined) throw new Error(`${name}: no health readout on the wire`)
  return wire.healthReadout
}
const factOf = (view: ReturnType<typeof composeHealthSheet>, id: string) => view.facts.find((f) => f.id === id)

describe('the Medicare premium card on the shipped seeds, through the real engine', () => {
  it('`retired` (66/65): everyone enrolled from the first billed year → the era IS the anchor → the pre-build sentence, byte-identical (base 4,870 → 4,900; MAGI 90,129 → 90,100; headroom 127,871 → 127,900; the two-of-you step)', () => {
    const readout = readoutOf('retired')
    expect(medicareEraYear(readout, 2)).toBe(medicareAnchor(readout))
    const view = composeHealthSheet(readout, DEV_SEEDS.retired, FRESH)
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicare,
      figure: slots.healthFigPerYear('4,900'),
      lines: [copy.irmaaStepStory, slots.irmaaStepNowBase('4,900')],
    })
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAdd('2,300'),
      lines: [slots.irmaaStepNext('218,000', '90,100', '127,900', '1,100', '2,300', true)],
    })
  })

  it('`healthnc` (61/59): the anchor is year 5 with ONE enrolled (2,703), the era is year 7 with two (5,765) → the loud figure 5,800, the on-ramp 2,700 over two years, neither surcharged, the extras spoken per quoted year (5,856 → 5,900 once both are on it; 2,928 → 2,900 while one is) — and the step card keeps the anchor (MAGI 46,020 → the each-of-you arm)', () => {
    const readout = readoutOf('healthnc')
    const anchor = medicareAnchor(readout)
    const era = medicareEraYear(readout, 2)
    expect(anchor?.yearsFromNow).toBe(5)
    expect(anchor?.medicareEnrolledP50).toBe(1)
    expect(era?.yearsFromNow).toBe(7)
    expect(era?.medicareEnrolledP50).toBe(2)
    const view = composeHealthSheet(readout, DEV_SEEDS.healthnc, FRESH)
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicareBoth,
      figure: slots.healthFigPerYear('5,800'),
      lines: [
        copy.irmaaStepStory,
        slots.irmaaStepEraStart('5,800', 6, 2032),
        slots.irmaaStepOnRampSpan(2, '2,700', 4, 2030),
        copy.irmaaStepEraTrendNote,
        copy.irmaaStepBothBase,
        slots.irmaaStepExtrasAddBoth('5,900', '2,900'),
      ],
    })
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAddEach('1,100'),
      lines: [slots.irmaaStepNext('218,000', '46,000', '172,000', '1,100', '2,300', false)],
    })
  })

  it('`healthgap` (61/40 — the wide-gap witness, council wf_9921d7e3-55b): the enrolled median is NON-MONOTONIC (one at 25, two at 26, one at 27 — the elder gone on the median path), the era arm fires on that one-year window by the bare first-crossing rule the council KEPT, the hero is framed by its eyebrow, the on-ramp span reads 21 years', () => {
    const readout = readoutOf('healthgap')
    const at = (yearsFromNow: number) => readout.byYear.find((y) => y.yearsFromNow === yearsFromNow)!
    expect(medicareAnchor(readout)?.yearsFromNow).toBe(5)
    expect(at(5).medicareEnrolledP50).toBe(1)
    // The blip, pinned: the both-enrolled median window is exactly year 26.
    expect(at(25).medicareEnrolledP50).toBe(1)
    expect(at(26).medicareEnrolledP50).toBe(2)
    expect(at(27).medicareEnrolledP50).toBe(1)
    const era = medicareEraYear(readout, 2)
    expect(era?.yearsFromNow).toBe(26)
    const view = composeHealthSheet(readout, DEV_SEEDS.healthgap, FRESH)
    const fact = factOf(view, 'medicare')!
    expect(fact.eyebrow).toBe(copy.healthFactMedicareBoth)
    expect(fact.figure).toBe(slots.healthFigPerYear('8,100'))
    expect(fact.lines[1]).toBe(slots.irmaaStepEraStart('8,100', 25, 2051))
    expect(fact.lines[2]).toBe(slots.irmaaStepOnRampSpan(21, '2,700', 4, 2030))
    expect(fact.lines[3], 'the ONE basis clause — why this pair is 3× while the extras pair is 2× (Briggsy 2026-09-24)').toBe(copy.irmaaStepEraTrendNote)
    expect(fact.lines[4]).toBe(copy.irmaaStepBothBase)
    expect(fact.lines[5]).toBe(slots.irmaaStepExtrasAddBoth('5,900', '2,900'))
  }, 120_000)
})
