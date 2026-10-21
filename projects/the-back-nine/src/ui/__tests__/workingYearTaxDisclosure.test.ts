import { describe, it, expect } from 'vitest'
import { copy } from '@ui/copy'
import { METHODOLOGY_DISCLOSURES, requiredSeats } from '@ui/assumptionRegistry'
import { lintCopy } from '@ui/copyGuard'
import { prepareWorkingYearFloor, workingYearFederalCharge } from '@engine/taxOverlay'
import { ordinaryPlusCapitalGainsTax } from '@engine/taxCore'

/*
 * The working-year tax disclosure row (R13 — the working-year tax floor, 2026-10-20,
 * `docs/plans/features/working-year-tax-floor-build-spec.md` U7; council wf_ef6cf7c5-a2b, 7/10): the
 * sixth METHODOLOGY_DISCLOSURES row, which tells the household how a §7-clamped working year's
 * entered investment income is priced (the costliest of three readings — `taxOverlay.ts`'s
 * `prepareWorkingYearFloor` / `workingYearFederalCharge`) and what is left out. The council made the
 * row the PRICE of option (A): the engine change and these words ship in one commit, or neither.
 *
 * The words are PLAIN by his ruling (2026-10-20, on the first Caddie walk's draft — "I feel like I need
 * a PHD or lawyer with me to read our own verbiage"): three short paragraphs — the premise and its
 * one-way cost, the costliest-of-a-few-ways rule, what is left out.
 *
 * The pins:
 *  - CENSUS: the registry carries exactly six rows, in order, each on its own seat (`seat === id`,
 *    the way the five before it pick theirs), and the R7 seat walk (`requiredSeats()`, rendered by
 *    `assumptionPanel.test.tsx`'s completeness arm) demands this row's seat;
 *  - BANNED (the Hawk's narrowed ban): no string the row renders says "conservative", "worst case" or
 *    "only later" — the floor's own simplifications are regime-conditional (KTD4), so the row says
 *    HOW they price, never which way. The sweep reads the row's strings THROUGH the registry entry,
 *    so a line added to it later is swept with no edit here; a planted corpus proves each pattern bites;
 *  - R13 COVERAGE: each point the row owes is still present (LEXEME DISCIPLINE, stated honestly: these
 *    patterns pin the OBLIGATION, deliberately loose; a reword that keeps the point updates its
 *    pattern, one that drops the point reds here). One of them is HIS words verbatim — the NIIT clause
 *    (`recDiscNiit`, 2026-10-05) — so it pins as an exact string, never a loose pattern;
 *  - REFERENT: the row's floor claims are TRUE of the shipped floor, on figures derived by hand from
 *    Rev. Proc. 2025-32 (DND 012 — never computed by the function under test): "uses whichever comes
 *    out highest" (the charge IS the costliest reading); "your real tax could still be higher or
 *    lower" (a 20/80 split costs MORE than the charge, and an all-gains household is charged MORE than
 *    its real tax — both directions, so the sentence is a fact, never decoration); and pay covering
 *    "the tax on your pay and investment income" (with no portfolio income the charge is T(0, ss), here
 *    0, whatever B and I are). Its clamp claim — "It doesn’t check that your pay really covers all of
 *    that" — is the §7 clamp, pinned where it lives: `simulate.test.ts`'s "a working year with a living
 *    worker draws ZERO — even when spending exceeds salary + SS".
 */

const entry = METHODOLOGY_DISCLOSURES.find((m) => m.id === 'working-year-tax')

/** Every string the row renders — its name and each line, read THROUGH the registry entry. */
function rowStrings(): readonly string[] {
  if (entry === undefined) throw new Error('[test setup] no working-year-tax row in METHODOLOGY_DISCLOSURES')
  return [copy[entry.nameKey], ...entry.lineKeys.map((k) => copy[k])]
}

/** The Hawk's narrowed ban — each pattern with the samples it must catch (non-vacuity, burned/070). */
const BANNED: readonly { readonly word: string; readonly re: RegExp; readonly mustCatch: readonly string[] }[] = [
  {
    word: 'conservative',
    re: /\bconservativ/i,
    mustCatch: ['A conservative reading of your investment income.', 'Priced conservatively, on purpose.', 'The Conservative choice.'],
  },
  {
    word: 'worst case',
    re: /\bworst[\s-]+case\b/i,
    mustCatch: ['The tool takes the worst case.', 'A worst-case reading.', 'Worst  case, it costs more.'],
  },
  {
    word: 'only later',
    re: /\bonly\s+later\b/i,
    mustCatch: ['It applies only later, once you stop.', 'Only later years count.'],
  },
]

describe('the working-year tax disclosure row (R13 — the working-year tax floor, 2026-10-20)', () => {
  it('CENSUS — six methodology rows, in order, each on its own seat, and the R7 seat walk demands the new one', () => {
    expect(METHODOLOGY_DISCLOSURES.map((m) => m.id)).toEqual([
      'market',
      'longevity',
      'survivor-ss',
      'outlive-order',
      'conversion-tax',
      'working-year-tax',
    ])
    for (const m of METHODOLOGY_DISCLOSURES) {
      expect(m.seat, `${m.id} sits on its own seat (seat === id)`).toBe(m.id)
    }
    expect(requiredSeats(), 'the completeness walk renders-or-reds this seat').toContain('working-year-tax')
    expect(entry?.nameKey).toBe('assumptionWorkingYearTaxName')
    expect(entry?.lineKeys).toEqual([
      'assumptionWorkingYearTaxValue',
      'assumptionWorkingYearTaxReadings',
      'assumptionWorkingYearTaxOmissions',
    ])
  })

  it('BANNED — no string the row renders says "conservative", "worst case" or "only later" (the Hawk’s narrowed ban)', () => {
    const strings = rowStrings()
    expect(strings.length, 'the sweep reads a non-empty row (an empty loop proves nothing)').toBe(4)
    for (const s of strings) {
      for (const b of BANNED) expect(s, `the row says "${b.word}": "${s}"`).not.toMatch(b.re)
    }
  })

  it('BANNED is non-vacuous — every pattern catches its planted corpus', () => {
    for (const b of BANNED) {
      expect(b.mustCatch.length, `${b.word} owns at least one sample`).toBeGreaterThan(0)
      for (const sample of b.mustCatch) expect(sample, `${b.word} must catch: "${sample}"`).toMatch(b.re)
    }
  })

  it('the row keeps the house voice — typographic apostrophes, and clean on the three universal gates', () => {
    for (const s of rowStrings()) {
      expect(s, `a straight apostrophe in "${s}" (the catalog writes ’)`).not.toMatch(/'/)
      expect(lintCopy(s, ['false-certainty', 'advice-verb', 'survival-claim']), s).toEqual([])
    }
  })

  it('R13 COVERAGE — every point the row owes is still said', () => {
    const value = copy.assumptionWorkingYearTaxValue
    const readings = copy.assumptionWorkingYearTaxReadings
    const out = copy.assumptionWorkingYearTaxOmissions
    // Scope: the working years. Pay covers living costs, the tax on pay + investment income (the
    // investment income's own tax is never drawn from savings — R3), and the yearly contributions.
    expect(value).toMatch(/still working/i)
    expect(value).toMatch(
      /pay as covering your living costs, the tax on your pay and investment income, and what you put into savings each year/i,
    )
    // The clamp's one-way cost, named (§7's owed disclosure): pay is never checked against that whole
    // load, and a shortfall makes the answer read better than it is.
    expect(value).toMatch(/doesn’t check that your pay really covers all of that/i)
    expect(value).toMatch(/falls short[^.]*looks better than it really is/i)
    // What savings still produces in those years — taxable income, never "money out" (a conversion
    // moves money inside savings) — its tax figured ON TOP of pay + investment income (KTD1) and paid
    // from savings.
    expect(value).toMatch(/create taxable income[^.]*Roth conversion[^.]*required withdrawal[^.]*Medicare/i)
    expect(value).toMatch(/on top of your pay and investment income[^.]*paid from savings/i)
    // No known tax character, so the costliest of a few ways — which can still sit above or below the
    // household's real tax (the REFERENT arms below prove both directions).
    expect(readings).toMatch(/doesn’t know your split/i)
    expect(readings).toMatch(/a few ways and uses whichever comes out highest/i)
    expect(readings).toMatch(/mix, your real tax could still be higher or lower/i)
    // Investment income counts only for a working member; a retired member's is never asked for.
    expect(out).toMatch(/counts only for whoever is still working/i)
    expect(out).toMatch(/doesn’t ask for it from someone who has stopped/i)
    // HIS words, verbatim: the NIIT clause (recDiscNiit, 2026-10-05). Exact, never loose — a pilot
    // reword is the register's NEGATIVE.
    expect(out).toContain(copy.recDiscNiit)
  })

  // Rev. Proc. 2025-32 (irs.gov/pub/irs-drop/rp-25-32.pdf, read 2026-10-20), MFJ: §4.01 Table 1 — 10 %
  // of taxable income to $24,800, 12 % to $100,800, 22 % above (to $211,400); §4.14(1) standard
  // deduction $32,200; §4.03 the 0 % / 15 % capital-gain edge at $98,900. Nobody 65, no Social
  // Security, calendar 2026 (indexed figures ⇒ flat in real dollars; nothing frozen-nominal is read).
  // The household: pay B = $42,200 ($10,000 taxable after the deduction), entered investment income
  // I = $100,000, and a $10,000 Roth conversion as the year's portfolio income.
  //   I left out:    taxable 10,000 → 20,000, all at 10 %                                      = 1,000
  //   I ordinary:    taxable 110,000 → 120,000, all at 22 % (above 100,800)                    = 2,200
  //   I as gains:    ordinary taxable 10,000 → 20,000 at 10 % = 1,000; the gains sat at
  //                  10,000–110,000 (11,100 above the 98,900 edge, at 15 %) and now sit at
  //                  20,000–120,000 (21,100 above it): 10,000 more at 15 % = 1,500             = 2,500
  //   20/80 split:   $20,000 ordinary + $80,000 gains — ordinary taxable 30,000 → 40,000, all at
  //                  12 % = 1,200; the gains sat at 30,000–110,000 (11,100 above the edge) and
  //                  now sit at 40,000–120,000 (21,100 above it): 10,000 more at 15 % = 1,500    = 2,700
  // So the floor charges the costliest pure reading, $2,500 (the gains reading), and the split costs
  // $2,700 — more than any of the three: the conversion's 12 % ordinary rate (above the $24,800
  // bracket edge the pure-gains base sits under) AND its full 15 % gain push at once.
  const B = 42_200
  const I = 100_000
  const X = 10_000
  const floor = () =>
    prepareWorkingYearFloor(
      { ordinaryBase: B, investmentIncome: I },
      { ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026, minLivingAge: 50 },
    )

  it('REFERENT — "uses whichever comes out highest": the floor charges the costliest pure reading, whichever wins (hand-derived, DND 012)', () => {
    const charged = workingYearFederalCharge(floor(), X, 0).tax
    expect(charged, 'the gains reading — the costliest of 1,000 / 2,200 / 2,500').toBeCloseTo(2_500, 6)
    // A second household where the ORDINARY reading wins, so no single fixed reading passes both
    // (the handoff's ordinary-wins witness, re-derived here from the same Table 1): pay $150,000
    // ($117,800 taxable), I = $80,000, a $34,000 conversion.
    //   I left out:  117,800 → 151,800, all at 22 %                                    = 7,480
    //   I ordinary:  197,800 → 231,800 — 13,600 at 22 % to 211,400, 20,400 at 24 %
    //                (2,992 + 4,896)                                                    = 7,888
    //   I as gains:  ordinary 117,800 → 151,800 at 22 % (7,480); the base already sits above the
    //                98,900 edge, so every gain dollar was at 15 % before and after       = 7,480
    const ordinaryWins = prepareWorkingYearFloor(
      { ordinaryBase: 150_000, investmentIncome: 80_000 },
      { ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026, minLivingAge: 50 },
    )
    expect(
      workingYearFederalCharge(ordinaryWins, 34_000, 0).tax,
      'the ordinary reading — the costliest of 7,480 / 7,888 / 7,480',
    ).toBeCloseTo(7_888, 6)
  })

  it('REFERENT — "your real tax could still be higher or lower": a 20/80 split costs MORE than the charge, an all-gains household LESS (hand-derived)', () => {
    // HIGHER: the 20/80 split above costs more than the max the floor charges.
    const charged = workingYearFederalCharge(floor(), X, 0).tax
    const ordinaryPart = 20_000
    const gainPart = I - ordinaryPart
    const split =
      ordinaryPlusCapitalGainsTax(B + ordinaryPart + X, gainPart, 'mfj', 0, 2026) -
      ordinaryPlusCapitalGainsTax(B + ordinaryPart, gainPart, 'mfj', 0, 2026)
    expect(split, 'the 20/80 split’s increment, by hand').toBeCloseTo(2_700, 6)
    expect(split, 'a mixed character costs more than the max the floor charges — "higher" is true').toBeGreaterThan(charged)
    // LOWER: the ordinary-wins household of the arm above is charged $7,888, but if its $80,000 were
    // really all gains its real increment is $7,480 (its "I as gains" line, by hand from Table 1).
    const ordinaryWins = prepareWorkingYearFloor(
      { ordinaryBase: 150_000, investmentIncome: 80_000 },
      { ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026, minLivingAge: 50 },
    )
    const allGains =
      ordinaryPlusCapitalGainsTax(150_000 + 34_000, 80_000, 'mfj', 0, 2026) -
      ordinaryPlusCapitalGainsTax(150_000, 80_000, 'mfj', 0, 2026)
    expect(allGains, 'the all-gains real increment, by hand').toBeCloseTo(7_480, 6)
    expect(allGains, 'a pure character the max did not pick costs less than the charge — "lower" is true').toBeLessThan(
      workingYearFederalCharge(ordinaryWins, 34_000, 0).tax,
    )
  })

  it('REFERENT — pay covers "the tax on your pay and investment income": with no portfolio income the charge is T(0, ss) — here 0 — whatever B and I are', () => {
    // The pay and the investment income carry real tax by themselves (the ordinary reading alone is
    // $13,624 by Table 1), and none of it is portfolio-funded: R3's NEGATIVE, as the row words it.
    expect(workingYearFederalCharge(floor(), 0, 0).tax).toBe(0)
  })
})
