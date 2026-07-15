import { describe, expect, it } from 'vitest'
import {
  composeVerdictMedicareResidual,
  composeRothOmissionsNote,
  composeControlHealthOmissionsNote,
} from '../stateTaxDisclosure'
import { copy } from '../copy'
import { lintCopy } from '../copyGuard'

/*
 * The S5 disclosure composition — the honesty decision (which state clause each home shows) lives
 * in the pure chrome seam and is tested HERE (insight 048), never in a render path. Four homes,
 * each gated INDEPENDENTLY on the producer's-output predicate (insight 078). The predicate itself
 * (which run is priced) is tested in intakeMap.test (spineStatePriced/dateStatePriced/
 * pricedStateForRun). The HARD LAWS: keep the unpriced words verbatim; the affirmation ships as an
 * affirm+narrowed-residual SET (never affirm-alone); name the STATE, never a rate (§V hawk veto).
 */

describe('S5 — composeVerdictMedicareResidual (the verdict home, clause swaps in place)', () => {
  it('UNPRICED (undefined) is the shipped monolith, VERBATIM — a non-priced/elsewhere/unbuilt/degenerate household reads today’s words', () => {
    expect(composeVerdictMedicareResidual(undefined)).toBe(copy.verdictMedicareResidual)
  })

  it('the split cannot drift from the monolith: verdictMedicareResidual starts with the lead and ends with the tail', () => {
    // Single-source drift guard — the priced compose builds `lead + affirm + tail`, so if either
    // endpoint diverged from the verbatim monolith, the priced households would read a different
    // lead/tail than the unpriced ones. (The composeMedicareExtras split-part precedent.)
    expect(copy.verdictMedicareResidual.startsWith(copy.verdictResidualLead)).toBe(true)
    expect(copy.verdictMedicareResidual.endsWith(copy.verdictResidualTail)).toBe(true)
  })

  it('each PRICED state NAMES the state, affirms it is REFLECTED, and drops the "isn’t counted" clause', () => {
    const nc = composeVerdictMedicareResidual('NC')
    expect(nc).toContain('North Carolina')
    expect(nc).toContain('reflected in these numbers')
    expect(nc, 'the unpriced "isn’t counted" clause dies for a priced household').not.toContain('isn’t counted')

    const pa = composeVerdictMedicareResidual('PA')
    expect(pa).toContain('Pennsylvania')
    expect(pa, 'PA is honest about its near-zero reality').toContain('leaves most retirement income untaxed')
    expect(pa).not.toContain('isn’t counted')

    const fl = composeVerdictMedicareResidual('FL')
    expect(fl, 'FL names the genuinely-zero fact').toContain('Florida has no state income tax')
    expect(fl).not.toContain('isn’t counted')
  })

  it('the affirmation NEVER renders alone — every priced variant ships WITH the narrowed residual (premiums held flat)', () => {
    for (const s of ['NC', 'PA', 'FL'] as const) {
      const out = composeVerdictMedicareResidual(s)
      expect(out, `${s} ships the residual sibling`).toContain(copy.verdictResidualTail.trim())
      expect(out, `${s} ships the lead`).toContain(copy.verdictResidualLead)
    }
  })

  it('NEVER an optimization claim (§V/S2.8): no priced variant claims the recommendation was state-optimized, and none quotes a rate (hawk veto)', () => {
    for (const s of [undefined, 'NC', 'PA', 'FL'] as const) {
      const out = composeVerdictMedicareResidual(s)
      expect(out.toLowerCase(), `${s}: no optimization language`).not.toMatch(/optimi|optimal|state-optimi/)
      // The verdict surface is free-numeral gated; the composed residual quotes the STATE, never a
      // rate — a stray digit would be a rate/dollar leak (the hawk veto's exact target).
      expect(lintCopy(out, ['free-numeral']), `${s}: no bare numeral (no rate/dollar quote)`).toEqual([])
      expect(lintCopy(out, ['false-certainty', 'advice-verb', 'superlative']), `${s}: verdict voice holds`).toEqual([])
    }
  })
})

describe('S5 — the omission-list homes (state-tax item drops when priced, gated independently)', () => {
  it('composeRothOmissionsNote: priced DROPS the state-tax item; unpriced keeps today’s words verbatim', () => {
    expect(composeRothOmissionsNote(false)).toBe(copy.rothOmissionsNote)
    const priced = composeRothOmissionsNote(true)
    expect(priced, 'the run prices state tax ⇒ it is no longer "not counted"').not.toContain('state income tax')
    expect(priced, 'the NIIT + pre-65 items STAY (O9 not widened)').toContain('net-investment-income tax')
    expect(priced).toContain('pre-65 health-plan side effects')
    // 'roth' prefix ⇒ require-hedge-swept: the priced variant still wears its hedge.
    expect(lintCopy(priced, ['require-hedge'])).toEqual([])
  })

  it('composeControlHealthOmissionsNote: priced DROPS the state-tax item; the rest of the list STAYS; unpriced verbatim', () => {
    expect(composeControlHealthOmissionsNote(false)).toBe(copy.controlHealthOmissionsNote)
    const priced = composeControlHealthOmissionsNote(true)
    expect(priced).not.toContain('state income tax')
    expect(priced).toContain('net-investment-income tax')
    expect(priced, 'the benchmark/cost-sharing/top-ups/survivor items stay').toContain('the benchmark premium itself')
    expect(priced).toContain('rechecked sooner')
    // 'control' prefix ⇒ require-hedge-swept: keeps "could move this picture".
    expect(lintCopy(priced, ['require-hedge'])).toEqual([])
  })
})