import { describe, expect, it } from 'vitest'
import { axisDollarFormatterFor, formatAbsoluteDollar, formatActionableDollar, formatAxisDollar, formatDeltaDollar, formatEnteredDollar, formatPerMonth } from '../money'
import { buildYTicks } from '@viz/bandData'

/**
 * formatAxisDollar — the ONE dollar-axis dialect (fan gridlines, TwoFutures gridlines, the
 * scrub readout, the C2 AT sentence all ride it). Every expectation below is HAND-DERIVED
 * from the formatting rules, never computed by running the function (DND 012 discipline).
 *
 * EXACT-WHEN-ROUND (Caddie O5, 2026-07-10): niceCeil's {1.5, 3, 5}×10^k ceilings put quarter
 * gridlines at values like 2,250,000 and 1,125,000; the old 1-decimal path labeled them
 * "$2.3M" / "$1.1M" — an evenly-spaced ladder reading UNEVEN, a gridline label misstating its
 * own line. Round values (exact thousands in the M range, exact hundreds in the k range) now
 * render exactly; arbitrary values keep the humane rounding.
 */
describe('formatAxisDollar — exact-when-round gridline labels', () => {
  it('the filed witnesses: dirty-quarter ceilings label their gridlines EXACTLY', () => {
    // ceiling 3M → quarter 3 sits at 2,250,000: exactly 2.25M, never "2.3M"
    expect(formatAxisDollar(2_250_000)).toBe('$2.25M')
    // ceiling 1.5M → quarter 3 sits at 1,125,000: exactly 1.125M, never "1.1M"
    expect(formatAxisDollar(1_125_000)).toBe('$1.125M')
    // ceiling 5M → quarters at 1.25M / 3.75M: exact, never "1.3M" / "3.8M"
    expect(formatAxisDollar(1_250_000)).toBe('$1.25M')
    expect(formatAxisDollar(3_750_000)).toBe('$3.75M')
    // ceiling 150k → quarter at 37,500: exactly 37.5k, never "38k"
    expect(formatAxisDollar(37_500)).toBe('$37.5k')
  })

  it('clean quarters are byte-identical to the old dialect (no churn where the ladder was already clean)', () => {
    expect(formatAxisDollar(0)).toBe('$0')
    expect(formatAxisDollar(250_000)).toBe('$250k')
    expect(formatAxisDollar(500_000)).toBe('$500k')
    // Composed, not literal: 750,000 collides with a DISTINCTIVE constants-gate figure (the
    // IRMAA MFJ frozen top tier) — the arithmetic states the intent (quarter 3 of the LIVE
    // retired seed's $3M ceiling) and keeps the gate's single-source sweep clean.
    expect(formatAxisDollar(3_000_000 / 4)).toBe('$750k')
    expect(formatAxisDollar(1_000_000)).toBe('$1M')
    expect(formatAxisDollar(1_500_000)).toBe('$1.5M')
    expect(formatAxisDollar(2_000_000)).toBe('$2M')
    expect(formatAxisDollar(4_500_000)).toBe('$4.5M')
    expect(formatAxisDollar(7_500_000)).toBe('$7.5M')
  })

  it('ARBITRARY values (the scrub readout / AT-sentence path) keep the humane rounding — exactness is for the ruler, not spurious precision', () => {
    // 1,234,567 is not a round thousand → the old 1-decimal path, unchanged
    expect(formatAxisDollar(1_234_567)).toBe('$1.2M')
    // 123,456 is not a round hundred → integer-k rounding, unchanged
    expect(formatAxisDollar(123_456)).toBe('$123k')
    // sub-$1k stays whole dollars
    expect(formatAxisDollar(999)).toBe('$999')
    expect(formatAxisDollar(412.4)).toBe('$412')
  })

  it('the round-ness gate is integer arithmetic, not a float round-trip: 1.1M (not binary-exact in M units) still labels exactly', () => {
    expect(formatAxisDollar(1_100_000)).toBe('$1.1M')
    expect(formatAxisDollar(999_900)).toBe('$999.9k')
  })

  it('defensive |x|: a stray sign never prints "$-"', () => {
    expect(formatAxisDollar(-2_250_000)).toBe('$2.25M')
  })
})

/**
 * axisDollarFormatterFor — O8 (2026-07-17): ONE dialect per tick lattice (corpus rule 36, the
 * fcc35556 axis family). The per-value formatter mixed units on any $M-class ceiling whose
 * quarters dip under $1M ("$750k" between "$1.5M" gridlines). The factory locks the lattice to
 * the TOP tick's unit; the scrub/tooltip path deliberately keeps per-value units (the readout
 * is prose, the axis is the ruler). Expectations hand-derived (DND 012).
 */
describe('axisDollarFormatterFor — the unit-locked tick lattice (O8)', () => {
  it('the filed witness: a $3M ceiling reads one dialect — "$0.75M", never "$750k" among "$M" gridlines', () => {
    const labels = buildYTicks(3_000_000, axisDollarFormatterFor(3_000_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.75M', '$1.5M', '$2.25M', '$3M'])
  })

  it('the retired-seed shape: a $2M ceiling locks its half-million quarters to M', () => {
    const labels = buildYTicks(2_000_000, axisDollarFormatterFor(2_000_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.5M', '$1M', '$1.5M', '$2M'])
  })

  it('the budget-seed shape: a $1.5M ceiling keeps the exact-when-round law in the locked dialect', () => {
    const labels = buildYTicks(1_500_000, axisDollarFormatterFor(1_500_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.375M', '$0.75M', '$1.125M', '$1.5M'])
  })

  it('the $0 ruin-floor anchor stays plain "$0" — never "$0M"', () => {
    expect(axisDollarFormatterFor(3_000_000)(0)).toBe('$0')
  })

  it('a sub-$1M ceiling keeps the per-value dialect verbatim (its quarters never cross a unit boundary)', () => {
    const labels = buildYTicks(800_000, axisDollarFormatterFor(800_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$200k', '$400k', '$600k', '$800k'])
    expect(axisDollarFormatterFor(800_000)).toBe(formatAxisDollar)
  })

  it('the one-dialect property: no $≥1M lattice ever mixes a "k" label among its "M" gridlines', () => {
    for (const ceiling of [1_000_000, 1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000]) {
      const labels = buildYTicks(ceiling, axisDollarFormatterFor(ceiling)).map((t) => t.label)
      for (const label of labels.slice(1)) {
        expect(label, `${ceiling} lattice: ${labels.join(' ')}`).toMatch(/M$/)
      }
    }
  })

  it('a non-round stray falls back to the humane 1-decimal in the locked unit (defensive, mirrors the per-value M branch)', () => {
    expect(axisDollarFormatterFor(2_000_000)(1_234_567)).toBe('$1.2M')
  })
})

/**
 * formatAbsoluteDollar — the recommendation lockup's ABSOLUTE-magnitude PROSE dialect (the §S2 median
 * quote + the §S3b viz-aria endpoints). A portfolio-scale level ≥ $1M joins the spine's humane "$X.XM"
 * prose (ONE decimal — deliberately NOT formatAxisDollar's exact-when-round RULER precision, and never
 * full grouped digits); a sub-$1M level stays the DELTA's grouped dialect (formatDeltaDollar), never a
 * "$Xk" axis unit. Returns BARE of the "$" glyph — the copy slot supplies it. Every expectation is
 * HAND-DERIVED from the rules (DND 012), never computed by running the function.
 */
describe('formatAbsoluteDollar — the lockup absolute prose dialect (≥ $1M → "$X.XM", < $1M → grouped, bare glyph)', () => {
  it('≥ $1M reads the spine humane $X.XM prose — one decimal, never full digits', () => {
    // 4,160,000 / 1e6 = 4.16 → toFixed(1) "4.2" (the calm gap line's typical bequest)
    expect(formatAbsoluteDollar(4_160_000)).toBe('4.2M')
    // 5,760,000 / 1e6 = 5.76 → "5.8"
    expect(formatAbsoluteDollar(5_760_000)).toBe('5.8M')
    // an exact million strips the ".0" → "1M", never "1.0M"
    expect(formatAbsoluteDollar(1_000_000)).toBe('1M')
    expect(formatAbsoluteDollar(1_200_000)).toBe('1.2M')
    expect(formatAbsoluteDollar(2_000_000)).toBe('2M')
  })

  it('< $1M stays GROUPED humane digits (the delta dialect), never formatAxisDollar’s "$Xk" axis unit', () => {
    // delegates to formatDeltaDollar: the $10k step above $100k rounds 276,000 → 280,000
    expect(formatAbsoluteDollar(276_000)).toBe('280,000')
    expect(formatAbsoluteDollar(280_000)).toBe('280,000')
    // the $100 step below $10k keeps 6,300 exact
    expect(formatAbsoluteDollar(6_300)).toBe('6,300')
  })

  it('is BARE of the "$" glyph — the copy SLOT supplies it (unlike formatAxisDollar, which carries it)', () => {
    expect(formatAbsoluteDollar(4_160_000).startsWith('$')).toBe(false)
    expect(formatAbsoluteDollar(280_000).startsWith('$')).toBe(false)
  })

  it('defensive |x|: a stray sign never leaks (the copy WORD carries direction)', () => {
    expect(formatAbsoluteDollar(-4_160_000)).toBe('4.2M')
  })
})

describe('formatPerMonth — the $10-step humane verdict figure (pinned behavior, unchanged)', () => {
  it('steps to $10 and strips the sign (the clause WORD carries direction)', () => {
    expect(formatPerMonth(427.13)).toBe('430')
    expect(formatPerMonth(-427.13)).toBe('430')
    expect(formatPerMonth(0)).toBe('0')
  })
})

/* ---------------------------------------------------------------------------------------------
 * formatActionableDollar — the RE-TYPEABLE dialect. These are correctness tests, not formatting
 * ones: the figure this dialect renders is a conversion amount the reader can enter into the Roth
 * lever, and every amount the solver's GRID proposes sits at or under a rail (the IRMAA-step and
 * bracket-edge arms via `largestWholeDollarWithin`, the ACA-cliff arm via a closed-form floor).
 * Rounding to nearest (what the delta dialect does, and what this surface would otherwise have
 * used) quotes a number PAST the rail.
 *
 * ⚠️ SCOPE, corrected 2026-08-05: this block used to say EVERY solver-proposed amount came from
 * `largestWholeDollarWithin`. It does not — the ACA arm inverts in closed form, and the injected
 * USER-BASELINE candidate carries the household's own unscreened figure with no rail at all. That
 * third source is why {@link formatEnteredDollar} exists and why the two are split by PROVENANCE.
 * ------------------------------------------------------------------------------------------- */
describe('formatActionableDollar — rounds DOWN so a re-typed figure never crosses the rail it was anchored under', () => {
  it('NEVER renders above its input — the whole reason this dialect exists', () => {
    // The paired arm is the point: the same inputs through the delta dialect round UP and over.
    const overRail = [43_600, 9_960, 104_000, 187_500]
    for (const a of overRail) {
      const shown = Number(formatActionableDollar(a).replace(/,/g, ''))
      expect(shown, `${a} must not be quoted above itself`).toBeLessThanOrEqual(a)
    }
    // …and the delta dialect really does round up on these, so the test is not vacuous.
    expect(Number(formatDeltaDollar(43_600).replace(/,/g, ''))).toBeGreaterThan(43_600)
    expect(Number(formatDeltaDollar(9_960).replace(/,/g, ''))).toBeGreaterThan(9_960)
  })

  it('the cliff case, concretely: an anchored $43,600 quotes $43,000 — never the $44,000 that crosses', () => {
    expect(formatActionableDollar(43_600)).toBe('43,000')
    expect(formatDeltaDollar(43_600)).toBe('44,000') // the unsafe sibling, pinned so the contrast cannot rot
  })

  it('the ladder STOPS at $1,000 — it does not inherit the delta dialect’s $10,000 top step', () => {
    expect(formatActionableDollar(9_960)).toBe('9,900')
    expect(formatActionableDollar(43_600)).toBe('43,000')
    expect(formatActionableDollar(187_500)).toBe('187,000')
  })

  it('the worst-case under-quote is $999, not $9,999 — a display step must not eat the recommendation', () => {
    // Bought on a real frame (2026-08-05): `?seed=surplus` crowns a conversion anchored in
    // [$140k, $150k), and the shared $10,000 top step rendered it "~$140,000" — up to $9,999 a year,
    // over a nine-year window, of the crowned move discarded by a formatter. Step size does not affect
    // SAFETY (flooring a monotone metric clears the rail at any granularity), so the coarse step bought
    // nothing. These are the cases the old ladder got wrong.
    expect(formatActionableDollar(148_300)).toBe('148,000')
    expect(formatActionableDollar(104_000)).toBe('104,000')
    expect(formatActionableDollar(109_999)).toBe('109,000')
    // Still never above its input — the safety property is unchanged by the finer step.
    for (const a of [148_300, 104_000, 109_999, 187_500, 1_000_500]) {
      expect(Number(formatActionableDollar(a).replace(/,/g, '')), `${a}`).toBeLessThanOrEqual(a)
    }
    // NON-VACUITY: the delta dialect still coarsens these — it is a magnitude nobody types.
    expect(formatDeltaDollar(148_300)).toBe('150,000')
    expect(formatDeltaDollar(104_000)).toBe('100,000')
  })

  it('a round figure floors to itself — the flooring costs nothing when the amount is already on a step', () => {
    expect(formatActionableDollar(20_000)).toBe('20,000')
    expect(formatActionableDollar(40_000)).toBe('40,000')
  })

  it('⛔ but it is NOT safe on an UN-round figure, which is why it never renders one the household typed', () => {
    // The premise this dialect's docblock used to lean on — "on the household's own (already round)
    // amount the floor is a no-op" — is unenforced: the Roth lever takes any finite positive number.
    // A typed $43,617 through THIS dialect is a $617 downward misquote of the reader's own figure.
    expect(formatActionableDollar(43_617)).toBe('43,000')
    expect(formatEnteredDollar(43_617), 'the provenance sibling quotes it back whole').toBe('43,617')
  })

  it('never renders a falsehood for a figure smaller than its own step (would floor to "0")', () => {
    expect(formatActionableDollar(60)).toBe('60')
    expect(formatActionableDollar(99)).toBe('99')
    expect(formatActionableDollar(0)).toBe('0')
  })

  it('is BARE of the "$" glyph — the copy SLOT supplies it', () => {
    expect(formatActionableDollar(43_600).startsWith('$')).toBe(false)
  })
})

/* ---------------------------------------------------------------------------------------------
 * formatEnteredDollar — the PROVENANCE sibling. A figure the READER typed is quoted back whole;
 * both humane dialects move a number off its true value, which is right for a figure the TOOL
 * produced and a misquote for one the household did. Expectations are hand-derived (DND 012).
 * ------------------------------------------------------------------------------------------- */
describe('formatEnteredDollar — the household’s own figure, quoted back exactly', () => {
  it('renders an un-round entered amount whole, where BOTH humane dialects would move it', () => {
    expect(formatEnteredDollar(43_617)).toBe('43,617')
    // Non-vacuity, both directions: one dialect shaves $617 off, the other adds $383 on.
    expect(formatActionableDollar(43_617)).toBe('43,000')
    expect(formatDeltaDollar(43_617)).toBe('44,000')
  })

  it('groups thousands and shows no cents (the model carries whole dollars)', () => {
    expect(formatEnteredDollar(20_000)).toBe('20,000')
    expect(formatEnteredDollar(1_234_567)).toBe('1,234,567')
    expect(formatEnteredDollar(999)).toBe('999')
    expect(formatEnteredDollar(43_617.4)).toBe('43,617')
  })

  it('matches the intake layer’s own exact dialect, so one entered plan reads identically in both places', () => {
    // `src/intake/fields.tsx`'s `formatMoney` is `Intl.NumberFormat('en-US', {maximumFractionDigits: 0})`.
    // ui does not import across the layer boundary (the copy.ts convention), so the agreement is
    // restated here rather than shared — and pinned, so a drift in either place is visible.
    const intakeDialect = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    for (const v of [43_617, 20_000, 999, 1_234_567]) {
      expect(formatEnteredDollar(v)).toBe(intakeDialect.format(v))
    }
  })

  it('is BARE of the "$" glyph, like the rest of the family — the copy SLOT supplies it', () => {
    expect(formatEnteredDollar(43_617).startsWith('$')).toBe(false)
  })
})
