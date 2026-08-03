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

  it('each PRICED state NAMES the state, affirms it is REFLECTED, and drops the unpriced "isn’t priced yet" clause', () => {
    const nc = composeVerdictMedicareResidual('NC')
    expect(nc).toContain('North Carolina')
    expect(nc).toContain('reflected in these numbers')
    expect(nc, 'the unpriced "isn’t priced yet" clause dies for a priced household').not.toContain('isn’t priced yet')

    const pa = composeVerdictMedicareResidual('PA')
    expect(pa).toContain('Pennsylvania')
    expect(pa, 'PA is honest about its near-zero reality').toContain('leaves most retirement income untaxed')
    expect(pa).not.toContain('isn’t priced yet')

    const fl = composeVerdictMedicareResidual('FL')
    expect(fl, 'FL names the genuinely-zero fact').toContain('Florida has no state income tax')
    expect(fl).not.toContain('isn’t priced yet')
  })

  it('the affirmation NEVER renders alone — every priced variant ships WITH the narrowed residual (the still-flat clause)', () => {
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
    expect(composeRothOmissionsNote(false, false, false)).toBe(copy.rothOmissionsNote)
    const priced = composeRothOmissionsNote(true, false, false)
    expect(priced, 'the run prices state tax ⇒ it is no longer "not counted"').not.toContain('state income tax')
    expect(priced, 'the NIIT + pre-65 items STAY for an age-mixed non-ACA household').toContain('net-investment-income tax')
    expect(priced).toContain('pre-65 health-plan side effects')
    // 'roth' prefix ⇒ require-hedge-swept: the priced variant still wears its hedge.
    expect(lintCopy(priced, ['require-hedge'])).toEqual([])
  })

  // O9 (closed 2026-07-17, rode the O14 sweep): the age arm of the pre-65 axis — an all-65+
  // household has no pre-65 years, so the "pre-65 health-plan side effects" item drops; the
  // state axis composes independently. The FALSE arm of the age axis is the conservative default
  // (an unknown age keeps a clause — the caller's predicate, medicareOnlyPriced, is false there).
  it('composeRothOmissionsNote all-65+ axis: the pre-65 item drops; both all-65+ variants wear their hedge', () => {
    const all65Unpriced = composeRothOmissionsNote(false, true, false)
    expect(all65Unpriced).toBe(copy.rothOmissionsNoteAll65)
    expect(all65Unpriced, 'state-tax item STAYS while unpriced').toContain('state income tax')
    expect(all65Unpriced, 'the pre-65 clause dies for an all-65+ household').not.toContain('pre-65')

    const all65Priced = composeRothOmissionsNote(true, true, false)
    expect(all65Priced).toBe(copy.rothOmissionsNoteStatePricedAll65)
    expect(all65Priced, 'both axes drop their items — the NIIT alone remains').not.toContain('state income tax')
    expect(all65Priced).not.toContain('pre-65')
    expect(all65Priced).toContain('net-investment-income tax')
    expect(all65Priced, 'the single-item variant reads "it", never a dangling "each"').not.toContain('each')

    for (const v of [all65Unpriced, all65Priced]) {
      expect(lintCopy(v, ['require-hedge'])).toEqual([])
    }
  })

  // O16 (council 2026-07-17, wf_fd7f75cb-916 — the hawk-shaped middle state): an ACA-priced run
  // makes the blanket "pre-65 health-plan side effects — not counted" claim FALSE (the engine
  // prices the conversion→MAGI→discount coupling in both preview arms), so the clause NARROWS to
  // the true residual — plan cost-sharing — and the note AFFIRMS the discount coupling is in.
  // Routing this household to the All65 words instead was VETOED: it would silently drop the
  // cost-sharing omission (one-way optimistic on the conversion delta).
  it('composeRothOmissionsNote ACA-priced axis: the blanket pre-65 claim dies, cost-sharing named, the discount affirmed in', () => {
    const acaUnpricedState = composeRothOmissionsNote(false, false, true)
    expect(acaUnpricedState).toBe(copy.rothOmissionsNoteAcaPriced)
    expect(acaUnpricedState, 'the blanket claim is gone').not.toContain('pre-65 health-plan side effects')
    expect(acaUnpricedState, 'the TRUE residual is named (never silently dropped — the veto)').toContain('differences in plan cost-sharing')
    expect(acaUnpricedState, 'the affirmation names the priced coupling').toContain('income-based discount')
    expect(acaUnpricedState, 'state-tax item STAYS while unpriced').toContain('state income tax')

    const acaPricedState = composeRothOmissionsNote(true, false, true)
    expect(acaPricedState).toBe(copy.rothOmissionsNoteStatePricedAcaPriced)
    expect(acaPricedState).not.toContain('state income tax')
    expect(acaPricedState).toContain('differences in plan cost-sharing')
    expect(acaPricedState).toContain('income-based discount')

    for (const v of [acaUnpricedState, acaPricedState]) {
      expect(lintCopy(v, ['require-hedge'])).toEqual([])
      expect(lintCopy(v, ['false-certainty', 'advice-verb', 'superlative'])).toEqual([])
    }
  })

  it('composeRothOmissionsNote precedence: age WINS over ACA (an all-65+ run has no ACA years — the composer makes the structural fact explicit)', () => {
    expect(composeRothOmissionsNote(false, true, true)).toBe(copy.rothOmissionsNoteAll65)
    expect(composeRothOmissionsNote(true, true, true)).toBe(copy.rothOmissionsNoteStatePricedAll65)
  })

  it('composeControlHealthOmissionsNote: priced DROPS the state-tax item; the rest of the list STAYS; unpriced verbatim', () => {
    expect(composeControlHealthOmissionsNote(false)).toBe(copy.controlHealthOmissionsNote)
    const priced = composeControlHealthOmissionsNote(true)
    expect(priced).not.toContain('state income tax')
    expect(priced).toContain('net-investment-income tax')
    expect(priced, 'the cost-sharing/top-ups/survivor items stay').toContain('plan cost-sharing')
    expect(priced).toContain('state-level subsidy top-ups')
    expect(priced).toContain('rechecked sooner')
    // NEITHER list may claim the benchmark premium is uncounted — it is the §36B PTC basis
    // (`taxOverlay.ts:264`) and `slidingScalePtc` computes the credit FROM it. This arm pinned the
    // FALSE claim until 2026-08-03, which is how it survived; it now pins the correction on both
    // arms so a re-add goes red rather than green.
    for (const v of [composeControlHealthOmissionsNote(false), priced]) {
      expect(v, 'the benchmark IS priced — never list it as "not counted"').not.toContain('benchmark')
    }
    // 'control' prefix ⇒ require-hedge-swept: keeps "could move this picture".
    expect(lintCopy(priced, ['require-hedge'])).toEqual([])
  })
})