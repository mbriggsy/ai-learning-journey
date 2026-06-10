import { describe, it, expect } from 'vitest'
import { TICKER_BLEND_ROWS, findBlendRow, stockWeightForBlend } from '../tickerBlend'

describe('ticker → blend reference table (C1, R37)', () => {
  it('every row carries a citation + the directional marker + a valid allocation (shape; burned/057,063)', () => {
    for (const row of TICKER_BLEND_ROWS) {
      const id = row.family[0] ?? '(empty)'
      expect(row.family.length, `${id} family non-empty`).toBeGreaterThan(0)
      expect(row.citation.length, `${id} citation non-empty`).toBeGreaterThan(0)
      expect(row.directionalUntilPinned, `${id} directional until the EDGAR pin pass`).toBe(true)
      for (const v of [row.stock, row.bond, row.cash]) {
        expect(Number.isFinite(v) && v >= 0, `${id} components finite ≥ 0 (DND/009)`).toBe(true)
      }
      // The issuer's own figures are never renormalized; the structural bound covers the
      // observed "other"-sleeve range (97.2–101.1) without admitting a garbled row.
      const sum = row.stock + row.bond + row.cash
      expect(sum >= 97 && sum <= 101.5, `${id} sums ~100 (got ${sum})`).toBe(true)
      for (const t of row.family) expect(t, `${id} tickers stored UPPERCASE`).toBe(t.toUpperCase())
      if (row.tdfTargetYear !== undefined) {
        expect(Number.isFinite(row.tdfTargetYear) && row.tdfTargetYear >= 2020, `${id} sane TDF year`).toBe(true)
        expect(row.asOf, `${id} a TDF static snapshot must carry its as-of date (plan §5 disclosure)`).toBeDefined()
      }
    }
  })

  it('tickers are unique across families, and BOTH population axes hold (presence companion, burned/027; review fold — a family floor asserted on a ticker count guards neither)', () => {
    const seen = new Set<string>()
    for (const row of TICKER_BLEND_ROWS) {
      for (const t of row.family) {
        expect(seen.has(t), `${t} appears in exactly one family`).toBe(false)
        seen.add(t)
      }
    }
    expect(TICKER_BLEND_ROWS.length, '~160 FAMILIES shipped').toBeGreaterThanOrEqual(160)
    expect(seen.size, '240+ TICKERS shipped').toBeGreaterThanOrEqual(240)
  })

  it('share-class family keying: VTI and VTSAX resolve to the SAME row; lookup is case-insensitive + trims (R37)', () => {
    const viaEtf = findBlendRow('VTI')
    expect(viaEtf).toBeDefined()
    expect(findBlendRow('vtsax'), 'mutual-fund class → the identical row object').toBe(viaEtf)
    expect(findBlendRow(' voo ')).toBe(findBlendRow('VFIAX'))
  })

  it('an unrecognized ticker returns undefined (→ the D1 manual classifier; never a default blend, burned/062)', () => {
    expect(findBlendRow('ZZZZZZ')).toBeUndefined()
    expect(findBlendRow('')).toBeUndefined()
  })

  it('the collapse: 100/0/0 → 1.0; 60/40/0 → 0.6; 0/0/100 → 0.0 (cash folds into the bond sleeve, plan §5)', () => {
    expect(stockWeightForBlend({ stock: 100, bond: 0, cash: 0 })).toBe(1)
    expect(stockWeightForBlend({ stock: 60, bond: 40, cash: 0 })).toBe(0.6)
    expect(stockWeightForBlend({ stock: 0, bond: 0, cash: 100 })).toBe(0)
    // an "other"-sleeve row (sum 97.2) distributes the residual pro-rata — divide by the ACTUAL sum
    expect(stockWeightForBlend({ stock: 58.6, bond: 32.4, cash: 6.2 })).toBeCloseTo(58.6 / 97.2, 12)
  })

  it('externally-known anchors (DND/012): all-stock, all-bond, cash-like, the named 60/40, income-tilted Wellesley', () => {
    expect(stockWeightForBlend(findBlendRow('VTI')!)).toBe(1)
    expect(stockWeightForBlend(findBlendRow('BND')!)).toBe(0)
    expect(stockWeightForBlend(findBlendRow('SGOV')!)).toBe(0)
    expect(stockWeightForBlend(findBlendRow('BIL')!)).toBe(0)
    const aor = stockWeightForBlend(findBlendRow('AOR')!)
    expect(aor > 0.57 && aor < 0.63, `AOR is the named 60/40 product (got ${aor})`).toBe(true)
    const wellesley = stockWeightForBlend(findBlendRow('VWINX')!)
    expect(wellesley > 0.33 && wellesley < 0.45, `VWINX income-tilted ~35-42% equity (got ${wellesley})`).toBe(true)
    // TDF snapshot anchors (the C1 spec scenario "a TDF snapshot row → its pinned blend";
    // review fold): range anchors from EXTERNAL knowledge of the products (DND/012 — a
    // row-derived expectation would be circular), wide enough to survive issuer-snapshot
    // churn until the EDGAR pin pass, tight enough that a garbled row fails loud.
    const trIncome = stockWeightForBlend(findBlendRow('VTINX')!)
    expect(trIncome > 0.28 && trIncome < 0.36, `VTINX (Target Retirement Income) ~30% equity (got ${trIncome})`).toBe(true)
    const tr2030 = stockWeightForBlend(findBlendRow('VTHRX')!)
    expect(tr2030 > 0.55 && tr2030 < 0.65, `VTHRX (Target Retirement 2030) ~60% equity (got ${tr2030})`).toBe(true)
  })

  it('the iShares allocation ETFs match their NAME-encoded splits (review fold — kills the sum-preserving conservative↔aggressive row swap, the optimistic-direction hazard)', () => {
    // The committed `name` field encodes the split ("Core 30/70", "40/60", "60/40",
    // "80/20") — a free cross-axis (insight 009): swapping AOK's values with AOA's
    // passes every shape/sum check but fails THIS.
    const expected: ReadonlyArray<readonly [string, number]> = [
      ['AOK', 0.3],
      ['AOM', 0.4],
      ['AOR', 0.6],
      ['AOA', 0.8],
    ]
    for (const [ticker, split] of expected) {
      const w = stockWeightForBlend(findBlendRow(ticker)!)
      expect(Math.abs(w - split) <= 0.03, `${ticker} within ±0.03 of its name-encoded ${split} (got ${w})`).toBe(true)
    }
  })

  it('every TDF/allocation series holds: the income/landing fund < the 2050-class fund (review fold — the swap-within-a-series residual)', () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['VTINX', 'VFIFX'], // Vanguard income vs 2050
      ['FIKFX', 'FIPFX'], // Fidelity Freedom Index income vs 2050
      ['FFFAX', 'FFFHX'], // Fidelity Freedom (active) income vs 2050
      ['TRRIX', 'TRRMX'], // T. Rowe Balanced/income vs 2050
      ['SSFOX', 'SSDLX'], // State Street landing vs 2050
      ['JIYBX', 'JNYAX'], // JPMorgan SmartRetirement income vs 2050
    ]
    for (const [income, growth] of pairs) {
      const a = findBlendRow(income)
      const b = findBlendRow(growth)
      expect(a !== undefined && b !== undefined, `${income}/${growth} present`).toBe(true)
      if (!a || !b) continue
      expect(
        stockWeightForBlend(a) < stockWeightForBlend(b),
        `${income} (income/landing) holds less stock than ${growth} (2050-class)`,
      ).toBe(true)
    }
  })

  it('TDF series shape: each issuer series holds less stock at 2030 than at 2050 (coarse — glide-plateau noise is REAL issuer data, strict monotonicity is deliberately NOT asserted)', () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['VTHRX', 'VFIFX'], // Vanguard Target Retirement
      ['FXIFX', 'FIPFX'], // Fidelity Freedom Index
      ['FFFEX', 'FFFHX'], // Fidelity Freedom (active)
      ['SWYEX', 'SWYMX'], // Schwab Target Index
      ['TRRCX', 'TRRMX'], // T. Rowe Price Retirement
      ['RFETX', 'RFITX'], // American Funds Target Date (R6)
      ['SSBYX', 'SSDLX'], // State Street Target Retirement (K)
      ['JRBYX', 'JNYAX'], // JPMorgan SmartRetirement Blend (R6)
    ]
    for (const [early, late] of pairs) {
      const a = findBlendRow(early)
      const b = findBlendRow(late)
      expect(a !== undefined && b !== undefined, `${early}/${late} present`).toBe(true)
      if (!a || !b) continue
      expect(
        stockWeightForBlend(a) < stockWeightForBlend(b),
        `${early} (2030-class) holds less stock than ${late} (2050-class)`,
      ).toBe(true)
    }
  })

  it('the collapse guards throw finiteness-FIRST on NaN/negative/zero-sum (insights 008/010; burned/062)', () => {
    expect(() => stockWeightForBlend({ stock: NaN, bond: 50, cash: 0 })).toThrow(/finite/)
    expect(() => stockWeightForBlend({ stock: Number.POSITIVE_INFINITY, bond: 0, cash: 0 })).toThrow(/finite/)
    expect(() => stockWeightForBlend({ stock: -1, bond: 50, cash: 0 })).toThrow(/finite/)
    expect(() => stockWeightForBlend({ stock: 0, bond: 0, cash: 0 })).toThrow(/zero/)
  })
})
