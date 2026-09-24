import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { buildPartBPricingSchedule } from '@engine/healthOverlay'
import { irmaa, medicareCostTrend, partB2026 } from '@engine/constants'
import { copy, MEDICARE_PART_D_HOLD_CONSEQUENCE } from '@ui/copy'
import { METHODOLOGY_DISCLOSURES } from '@ui/assumptionRegistry'

/*
 * The conversion-tax disclosure PAIR — the assumptions row (`assumptionConversionTaxValue`, rendered
 * for EVERY household) and the Roth sheet's residual note (`rothMedicareResidualNote`, rendered only
 * when the run priced Medicare AND the household has no Healthcare door — `showMedicarePricedNote`,
 * in practice the all-65+ household) — pinned to each other and to the engine rule they describe.
 *
 * The defect (the register's "never oversold" entry; Card 7 of the 2026-09-13 sibling-sheets Caddie
 * walk): the row ended "…reads understated, never oversold" while the sheet one door over disclosed
 * ONE lean the other way — past the 2035 edge of the Trustees' printed tables the Part D surcharge
 * scales HOLD their edge-year real level, so a far-out conversion's own surcharge is priced a shade
 * easier than it will likely be. One such lean anywhere makes "never oversold" false; and because the
 * sheet is ABSENT for a pre-65 household, the row was that household's only disclosure — a
 * self-assured lie with no counter-disclosure anywhere. SWAPPED 2026-09-23 on Briggsy's cold ruling
 * of the words (re-ruled the same session after the 153-agent review: the hold's lean is stated as
 * CONDITIONAL — it under-prices post-edge surcharges in BOTH arms of the comparison, so only the
 * conversion's OWN far-out bill is the proven direction).
 *
 * The pins:
 *  - REFERENT: the lean the copy discloses is the SHIPPED rule — the edge year carries the SOURCED
 *    V.E4 row (an independent DND-012 oracle: nominal ÷ (1 + near-term CPI)^edge ÷ anchor, by
 *    Math.pow against the resolver's iterative product) and the years after it HOLD that value —
 *    asserted HERE beside the copy, not only in partBTrend.test.ts, so that if the hold is ever
 *    lifted (a sourced tail) THIS file reds with the instruction to retire the disclosure on both
 *    surfaces by editing the ONE constant;
 *  - the row never says "never oversold" while that hold ships (the register's prescription);
 *  - the row is SELF-CONTAINED: it names the hold's year (pinned to the engine's own table edge, so a
 *    typed year that drifts from the table reds here) and its consequence, and never points at the
 *    Roth sheet (a pointer that dangles for the pre-65 household — the 2026-09-13 verify pass);
 *  - the sheet and the row read ONE constant for the consequence — exactly once each, AND at the
 *    SOURCE level (the clause's bytes live only in the constant's declaration; both surfaces
 *    interpolate the name), so an inlined copy can never outlive the constant's retirement;
 *  - the DIRECTION words, in order — the funding rule's lean, then the hold's lead-in, then the
 *    consequence — and the constant's ratified hedge phrase ("could look a shade easier").
 *
 * LEXEME DISCIPLINE, stated honestly: this file asserts lexemes where the defect IS the lexeme —
 * the absence of "never oversold" (the defect), the absence of a Roth-sheet pointer (the dangling
 * pointer), and the RULED direction/hedge phrases (the direction lives only in the words; a plant
 * that drops the first lean, inverts either lean, or de-hedges the consequence must red). Everything
 * else is pinned through the constant and the engine's table edge.
 */

const trend = medicareCostTrend.value
/** anchorYear + |premiums| — the last deflated table year (2035 on the 2026 Trustees edition). */
const tableEdgeYear = trend.anchorYear + trend.premiums.length
/** The t-index of the edge year in a schedule anchored at `trend.anchorYear`. */
const edge = tableEdgeYear - trend.anchorYear

/** The RULED direction phrases (Briggsy, 2026-09-23). The direction IS the defect this entry
 *  fixes, so these lexemes are pinned on purpose — see LEXEME DISCIPLINE above. */
const RULED_FUNDING_LEAN = /\bleans against converting\b/i
const RULED_HOLD_LEADIN = /\bcan lean the other way\b/i
const RULED_HEDGE = /\bcould look a shade easier\b/i

describe('the conversion-tax disclosure pair (the register’s "never oversold" entry, 2026-09-23)', () => {
  it('REFERENT — the disclosed lean is the SHIPPED rule: the edge year carries the sourced V.E4 row (independent oracle) and the years past it HOLD it, while Part B keeps escalating', () => {
    const anchor = partB2026.value.standardPremiumMonthly
    const partDAnchor = irmaa.value.tiers.map((t) => t.partDSurchargeMonthly)
    const sched = buildPartBPricingSchedule(trend, anchor, partDAnchor, trend.anchorYear, edge + 3)
    // The DND-012 oracle for the edge year: V.E4's edge row, deflated horizon-matched by Math.pow
    // (operationally distinct from the resolver's cumulative multiply), over the anchor add-ons.
    const edgeRow = trend.partDIrmaa.find((r) => r.calendarYear === tableEdgeYear)
    if (!edgeRow) throw new Error(`[test setup] no V.E4 row for the edge year ${tableEdgeYear}`)
    const oracle = edgeRow.addOnsMonthly.map((nominal, k) => nominal / Math.pow(1 + trend.cpiNearTermAvg, edge) / partDAnchor[k]!)
    expect(oracle.length, 'the tier vector is non-empty (a vacuous equality proves no hold)').toBeGreaterThan(0)
    oracle.forEach((o, k) => {
      expect(sched[edge]!.scales.partDByTier[k], `tier ${k} at the ${tableEdgeYear} edge is the SOURCED row`).toBeCloseTo(o, 10)
      expect(
        sched[edge + 1]!.scales.partDByTier[k],
        `tier ${k} the year after the edge must HOLD the sourced edge value — if this reds, the hold was lifted: retire MEDICARE_PART_D_HOLD_CONSEQUENCE and the two sentences that carry it`,
      ).toBeCloseTo(o, 10)
      expect(sched[edge + 2]!.scales.partDByTier[k], `tier ${k} two years after the edge`).toBeCloseTo(o, 10)
    })
    // Control: Part B rides its sourced escalator past the same edge — the equality above is the
    // HOLD on Part D, not a frozen schedule.
    expect(sched[edge + 1]!.scales.partB).toBeGreaterThan(sched[edge]!.scales.partB)
  })

  it('the row never says "never oversold" while that hold ships — and is SELF-CONTAINED (the hold’s year from the engine, its consequence, no pointer to a sheet the pre-65 household never sees)', () => {
    const row = copy.assumptionConversionTaxValue
    expect(row).not.toMatch(/never oversold/i)
    expect(row, 'the year is the engine’s own table edge').toContain(String(tableEdgeYear))
    expect(row, 'the consequence is the ONE constant').toContain(MEDICARE_PART_D_HOLD_CONSEQUENCE)
    expect(row, 'a pointer to the Roth sheet dangles for a pre-65 household (the sheet’s note renders only under showMedicarePricedNote)').not.toMatch(/roth sheet/i)
  })

  it('the row names BOTH directions in the ruled order — the funding rule’s lean, then the hold’s conditional lead-in, then the consequence', () => {
    const row = copy.assumptionConversionTaxValue
    const a = row.search(RULED_FUNDING_LEAN)
    const b = row.search(RULED_HOLD_LEADIN)
    const c = row.indexOf(MEDICARE_PART_D_HOLD_CONSEQUENCE)
    expect(a, 'the funding rule’s lean is named').toBeGreaterThan(-1)
    expect(b, 'the hold’s lead-in is named, after the funding lean').toBeGreaterThan(a)
    expect(c, 'the consequence follows the lead-in').toBeGreaterThan(b)
    expect(row, 'the hold’s lean is CONDITIONAL, never an overall direction (the hold under-prices post-edge surcharges in both arms)').not.toMatch(/\bleans the (opposite|other) way\b/i)
  })

  it('the Roth sheet’s note reads the SAME constant — one home for the lean, exactly once on each surface', () => {
    const sheet = copy.rothMedicareResidualNote
    expect(sheet).toContain(MEDICARE_PART_D_HOLD_CONSEQUENCE)
    expect(sheet, 'the sheet’s year is the same engine edge').toContain(String(tableEdgeYear))
    const count = (s: string) => s.split(MEDICARE_PART_D_HOLD_CONSEQUENCE).length - 1
    expect(count(sheet), 'once on the sheet (twice would read as two leans)').toBe(1)
    expect(count(copy.assumptionConversionTaxValue), 'once on the row').toBe(1)
  })

  it('at the SOURCE, the clause’s bytes live only in the constant’s declaration and both surfaces interpolate its NAME (an inlined copy could outlive the constant’s retirement)', () => {
    const src = readFileSync(new URL('../copy.ts', import.meta.url), 'utf8')
    expect(src.split(MEDICARE_PART_D_HOLD_CONSEQUENCE).length - 1, 'the literal appears exactly once — the declaration').toBe(1)
    expect(src.split('${MEDICARE_PART_D_HOLD_CONSEQUENCE}').length - 1, 'two interpolations — the row and the sheet').toBe(2)
    for (const key of ['assumptionConversionTaxValue', 'rothMedicareResidualNote'] as const) {
      const at = src.indexOf(`${key}:`)
      expect(at, `${key} is declared`).toBeGreaterThan(-1)
      const body = src.slice(at, src.indexOf('`,', at) + 2)
      expect(body, `${key} interpolates the constant by name`).toContain('${MEDICARE_PART_D_HOLD_CONSEQUENCE}')
    }
  })

  it('the constant carries the ratified hedge phrase — a direction the plan CAN lean, never a certainty (rule 36 vocabulary)', () => {
    expect(MEDICARE_PART_D_HOLD_CONSEQUENCE).toMatch(RULED_HEDGE)
    expect(MEDICARE_PART_D_HOLD_CONSEQUENCE).not.toMatch(/\b(will|always|never|certainly|definitely)\b/i)
  })

  it('the row IS the registry’s conversion-tax line (the panel renders every disclosure row unconditionally)', () => {
    const entry = METHODOLOGY_DISCLOSURES.find((m) => m.id === 'conversion-tax')
    expect(entry?.lineKeys).toEqual(['assumptionConversionTaxValue'])
  })
})
