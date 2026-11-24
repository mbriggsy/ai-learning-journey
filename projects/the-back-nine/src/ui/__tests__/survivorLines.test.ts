import { describe, expect, it } from 'vitest'
import { spendingBasisLine } from '../survivorLines'

/*
 * THE SURVIVOR CARD'S SPENDING-BASIS LINE, asserted on its one producer (Act 6's RC0) — the honesty law
 * `survivorSpendingBasisSeedGate.test.tsx` pins through the rendered card on every card-bearing household, re-asserted
 * here before the card goes (RC4). Briggsy's sentence (RULED 2026-10-14, b9-toronto1), exactly; the dollars through the
 * app's $/month formatter (the nearest $10, half up); and FAIL TO ABSENT (insight 044) — never "$0", "NaN" or "∞".
 * The figures are that gate's hand-derived rows (DND 012): the retired family's S $78,000 at r 0.75, `offtracktypical`'s
 * $102,000, and the health seeds' $4,958.33.
 */

const line = (survivor: string, together: string) =>
  `This assumes about $${survivor} a month of spending on your own (today: $${together} together).`

describe('the survivor card’s spending-basis line (ruled 2026-10-14)', () => {
  it('names both figures in his sentence, each rounded to the nearest $10, half up', () => {
    // 0.75 × 78,000 = 58,500 a year → $4,875.00 → "4,880"; 78,000 / 12 = $6,500.
    expect(spendingBasisLine({ survivorMonthlyReal: 58_500 / 12, coupleMonthlyReal: 78_000 / 12, steady: true })).toBe(line('4,880', '6,500'))
    // 0.75 × 102,000 = 76,500 → $6,375.00 → "6,380" (the half rounds up).
    expect(spendingBasisLine({ survivorMonthlyReal: 76_500 / 12, coupleMonthlyReal: 102_000 / 12, steady: true })).toBe(line('6,380', '8,500'))
    expect(spendingBasisLine({ survivorMonthlyReal: 4_958.33, coupleMonthlyReal: 6_500, steady: true })).toBe(line('4,960', '6,500'))
  })

  it('FAILS TO ABSENT: no basis, a basis that is not steady, a non-finite figure, or either figure rounding to $0', () => {
    expect(spendingBasisLine(undefined)).toBeNull()
    expect(spendingBasisLine({ survivorMonthlyReal: 4_875, coupleMonthlyReal: 6_500, steady: false })).toBeNull()
    expect(spendingBasisLine({ survivorMonthlyReal: Number.NaN, coupleMonthlyReal: 6_500, steady: true })).toBeNull()
    expect(spendingBasisLine({ survivorMonthlyReal: 4_875, coupleMonthlyReal: Number.POSITIVE_INFINITY, steady: true })).toBeNull()
    expect(spendingBasisLine({ survivorMonthlyReal: 4, coupleMonthlyReal: 6_500, steady: true })).toBeNull()
    expect(spendingBasisLine({ survivorMonthlyReal: 4_875, coupleMonthlyReal: 0, steady: true })).toBeNull()
  })
})
