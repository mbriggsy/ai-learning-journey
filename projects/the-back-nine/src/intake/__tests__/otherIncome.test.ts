import { describe, expect, it } from 'vitest'
import type { IncomeStream } from '@shared/model'
import { compileIncomeStreams, effectiveTaxableFraction } from '../otherIncome'

/**
 * R40 Unit 2 — `compileIncomeStreams` correctness, GOLDEN-GATED (KTD-5 / DND-012).
 *
 * Every numeric expectation is EXTERNALLY derived — hand-computed via an independent Python pass that
 * cross-checked the closed-form power against an iterative recurrence (they agreed to 1e-9), NEVER by
 * running `compileIncomeStreams` itself (a self-derived golden proves typing, not correctness — DND/012).
 * The deterministic inflation point estimate is 0.03 (the market's `inflation.mean`, KTD-2).
 */

const INFL = 0.03

describe('compileIncomeStreams (R40 U2)', () => {
  it('real-flat: holds the real value; gross[0] === annualRealToday (the KTD-8b anchor) + survivor variant', () => {
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 30_000,
      startAge: 62, // already-receiving (≤ currentAge 65): start clamps to t=0
      colaMode: 'real-flat',
      survivorPct: 0.5,
    }
    const out = compileIncomeStreams([s], [65, 70], 10, INFL)!
    const leaf = out.incomeByPerson[0]!
    expect(leaf.grossFull![0]).toBe(30_000) // the anchor golden
    expect(leaf.grossFull!).toHaveLength(10)
    expect(leaf.grossFull!.every((v) => v === 30_000)).toBe(true) // real-flat ⇒ flat real
    expect(leaf.taxableFull!.every((v) => v === 30_000)).toBe(true) // pension fully taxable (default 1)
    expect(leaf.grossSurvivor!.every((v) => v === 15_000)).toBe(true) // × survivorPct 0.5
    expect(leaf.taxableSurvivor!.every((v) => v === 15_000)).toBe(true)
    expect(out.incomeByPerson[1]).toEqual({}) // owner 1 has no stream ⇒ empty leaf
  })

  it('nominal-flat: deflates at the inflation point estimate (no COLA ⇒ erodes in real terms)', () => {
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 30_000,
      startAge: 60,
      colaMode: 'nominal-flat',
      survivorPct: 0.6,
    }
    const leaf = compileIncomeStreams([s], [65, 70], 5, INFL)!.incomeByPerson[0]!
    // externally derived: 30000 / 1.03^t
    expect(leaf.grossFull![0]).toBeCloseTo(30_000, 4)
    expect(leaf.grossFull![1]).toBeCloseTo(29_126.213592, 4)
    expect(leaf.grossFull![2]).toBeCloseTo(28_277.877274, 4)
    expect(leaf.grossSurvivor![1]).toBeCloseTo(17_475.728155, 4) // 29126.21 × 0.6
  })

  it('fixed-pct: grows nominal at colaPct then deflates (real net = ((1+cola)/(1+infl))^t)', () => {
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 40_000,
      startAge: 60,
      colaMode: 'fixed-pct',
      colaPct: 0.02,
      survivorPct: 1,
    }
    const leaf = compileIncomeStreams([s], [66, 70], 6, INFL)!.incomeByPerson[0]!
    // externally derived: 40000 × (1.02/1.03)^t
    expect(leaf.grossFull![0]).toBeCloseTo(40_000, 4)
    expect(leaf.grossFull![1]).toBeCloseTo(39_611.650485, 4)
    expect(leaf.grossFull![5]).toBeCloseTo(38_095.591980, 4)
    expect(leaf.grossSurvivor![5]).toBeCloseTo(38_095.591980, 4) // survivorPct 1 ⇒ survivor === full
  })

  it('fixed-pct with an absent/corrupt colaPct fails loud as NaN at EVERY year — NO t=0 laundering, never silently nominal-flat (the optimistic-erosion sin)', () => {
    // The restore-path corruption shape: a fixed-pct stream whose REQUIRED colaPct is missing. Because
    // `x ** 0 === 1` for any x (even NaN), a naive power form would launder this to a clean
    // `annualRealToday` at t=0 — modeling a no-growth stream as non-eroding (the cardinal sin).
    const s = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 30_000,
      startAge: 62, // already-receiving ⇒ startOffset 0, so t=0 IS a paying year (the laundering index)
      colaMode: 'fixed-pct',
      survivorPct: 0.5,
    } as IncomeStream // colaPct deliberately absent
    const leaf = compileIncomeStreams([s], [65, 70], 3, INFL)!.incomeByPerson[0]!
    expect(Number.isNaN(leaf.grossFull![0])).toBe(true) // NOT a clean 30000 (the laundering guard)
    expect(Number.isNaN(leaf.grossFull![1])).toBe(true)
  })

  it('fixed-pct corrupt + SINGLE-year (endAge === currentAge): the whole vector is NaN, not a finite escape from a downstream finiteness gate', () => {
    const s = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 40_000,
      startAge: 60,
      endAge: 65, // currentAge 65 ⇒ last paying t = 0 only (the single-year escape shape)
      colaMode: 'fixed-pct',
      survivorPct: 1,
    } as IncomeStream
    const leaf = compileIncomeStreams([s], [65, 70], 5, INFL)!.incomeByPerson[0]!
    expect(Number.isNaN(leaf.grossFull![0])).toBe(true) // a t=0-laundering bug would leave a finite 40000 here
  })

  it('future-start: zero before startOffset; the deflation exponent is the ABSOLUTE sim-year t, never the elapsed age (KTD-8b)', () => {
    // currentAge 60, startAge 67 ⇒ startOffset 7; nominal-flat.
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 20_000,
      startAge: 67,
      colaMode: 'nominal-flat',
      survivorPct: 0.5,
    }
    const leaf = compileIncomeStreams([s], [60, 62], 10, INFL)!.incomeByPerson[0]!
    expect(leaf.grossFull![6]).toBe(0) // not yet started
    // externally derived: 20000 / 1.03^7 = 16261.830227. The elapsed-age bug (exponent t−startOffset = 0)
    // would give 20000 — this assertion is the discriminator.
    expect(leaf.grossFull![7]).toBeCloseTo(16_261.830227, 4)
    expect(leaf.grossFull![7]).toBeLessThan(20_000) // refute the elapsed-age anchor
    expect(leaf.grossFull![8]).toBeCloseTo(15_788.184686, 4)
  })

  it('already-receiving on a DEFLATING curve: gross[0] === annualRealToday — the exponent is the clamped sim-year, NEVER the elapsed age since the stream started (KTD-8b)', () => {
    // nominal-flat, startAge 60 < currentAge 65 ⇒ receiving for 5 years already. The "honor the real age"
    // bug would deflate gross[0] by those 5 elapsed years (30000/1.03^5 ≈ 25879); the correct anchor reads
    // exactly 30000 at t=0, then deflates from there. real-flat can't catch this — it's flat regardless.
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 60, colaMode: 'nominal-flat', survivorPct: 0.5 }
    const leaf = compileIncomeStreams([s], [65, 70], 4, INFL)!.incomeByPerson[0]!
    expect(leaf.grossFull![0]).toBe(30_000) // the anchor — NOT 30000/1.03^5
    expect(leaf.grossFull![1]).toBeCloseTo(29_126.213592, 4) // deflates from t=0
  })

  describe('alimony — the agreement-date tax fork (KTD-6) and survivorPct = 0 by law (§71(b)(1)(D))', () => {
    const base = {
      ownerIndex: 0 as const,
      annualRealToday: 12_000,
      startAge: 60,
      colaMode: 'real-flat' as const,
      survivorPct: 0, // alimony terminates at death by law
    }
    it('post-2018: NOT taxable, MAGI-invisible (gross present to net the draw; taxable + survivor dropped)', () => {
      const s: IncomeStream = { ...base, type: 'alimony', executedAfter2018: true }
      const leaf = compileIncomeStreams([s], [62, 64], 5, INFL)!.incomeByPerson[0]!
      expect(leaf.grossFull!.every((v) => v === 12_000)).toBe(true) // nets the withdrawal (seam 1)
      expect(leaf.taxableFull).toBeUndefined() // MAGI-invisible ⇒ dropped (the ACA subsidy correctly rises)
      expect(leaf.grossSurvivor).toBeUndefined() // survivorPct 0 ⇒ dropped
      expect(leaf.taxableSurvivor).toBeUndefined()
    })
    it('pre-2019 (unmodified): fully taxable', () => {
      const s: IncomeStream = { ...base, type: 'alimony', executedAfter2018: false }
      const leaf = compileIncomeStreams([s], [62, 64], 5, INFL)!.incomeByPerson[0]!
      expect(leaf.taxableFull!.every((v) => v === 12_000)).toBe(true)
    })
    it('pre-2019 EXPRESSLY modified to adopt the post-2018 rules: NOT taxable', () => {
      const s: IncomeStream = {
        ...base,
        type: 'alimony',
        executedAfter2018: false,
        modifiedAdoptsPost2018Rules: true,
      }
      const leaf = compileIncomeStreams([s], [62, 64], 5, INFL)!.incomeByPerson[0]!
      expect(leaf.taxableFull).toBeUndefined()
    })
  })

  it('non-qualified annuity: effective taxable = 1 − exclusionFraction (KTD-6)', () => {
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'annuity',
      qualified: false,
      exclusionFraction: 0.25, // tax-free ratio ⇒ effective taxable 0.75
      annualRealToday: 24_000,
      startAge: 60,
      colaMode: 'real-flat',
      survivorPct: 0.5,
    }
    const leaf = compileIncomeStreams([s], [66, 70], 4, INFL)!.incomeByPerson[0]!
    expect(leaf.grossFull![0]).toBe(24_000)
    expect(leaf.taxableFull![0]).toBeCloseTo(18_000, 6) // 24000 × 0.75
    expect(leaf.grossSurvivor![0]).toBeCloseTo(12_000, 6) // 24000 × 0.5
    expect(leaf.taxableSurvivor![0]).toBeCloseTo(9_000, 6) // 12000 × 0.75
  })

  it('qualified annuity: fully taxable', () => {
    const s: IncomeStream = {
      ownerIndex: 0,
      type: 'annuity',
      qualified: true,
      annualRealToday: 24_000,
      startAge: 60,
      colaMode: 'real-flat',
      survivorPct: 0,
    }
    const leaf = compileIncomeStreams([s], [66, 70], 4, INFL)!.incomeByPerson[0]!
    expect(leaf.taxableFull!.every((v) => v === 24_000)).toBe(true)
  })

  it('sums multiple streams per owner and gates each owner INDEPENDENTLY; survivor is per-STREAM, not a FULL reweight (KTD-4/KTD-7)', () => {
    const pension0: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0.5 }
    const rental0: IncomeStream = { ownerIndex: 0, type: 'rental', annualRealToday: 12_000, startAge: 60, colaMode: 'real-flat', survivorPct: 1 }
    const pension1: IncomeStream = { ownerIndex: 1, type: 'pension', annualRealToday: 20_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0.75 }
    const out = compileIncomeStreams([pension0, rental0, pension1], [66, 64], 3, INFL)!
    expect(out.incomeByPerson[0]!.grossFull!.every((v) => v === 42_000)).toBe(true) // 30000 + 12000
    // per-STREAM survivor: 30000×0.5 + 12000×1 = 27000 — NOT 42000 × any single scalar (the swap-mutant bug)
    expect(out.incomeByPerson[0]!.grossSurvivor!.every((v) => v === 27_000)).toBe(true)
    expect(out.incomeByPerson[1]!.grossFull!.every((v) => v === 20_000)).toBe(true) // owner 1 separate
    expect(out.incomeByPerson[1]!.grossSurvivor!.every((v) => v === 15_000)).toBe(true) // 20000 × 0.75
  })

  it('endAge stops the stream at its last paying year (inclusive); absent ≡ lifetime', () => {
    // startAge 65 = currentAge 65 (startOffset 0); endAge 70 ⇒ last paying t = 70 − 65 = 5 (inclusive).
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 65, endAge: 70, colaMode: 'real-flat', survivorPct: 0.5 }
    const leaf = compileIncomeStreams([s], [65, 67], 10, INFL)!.incomeByPerson[0]!
    expect(leaf.grossFull!.slice(0, 6).every((v) => v === 30_000)).toBe(true) // t = 0..5 paying
    expect(leaf.grossFull!.slice(6).every((v) => v === 0)).toBe(true) // t ≥ 6 stopped
  })

  describe('reduce-to-spine (R40.6 — presence is the key)', () => {
    it('no streams ⇒ undefined', () => {
      expect(compileIncomeStreams([], [65, 70], 5, INFL)).toBeUndefined()
    })
    it('only $0 streams ⇒ undefined (all-zero vectors dropped)', () => {
      const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 0, startAge: 60, colaMode: 'real-flat', survivorPct: 0.5 }
      expect(compileIncomeStreams([s], [65, 70], 5, INFL)).toBeUndefined()
    })
    it('an already-ended stream (endAge < currentAge) ⇒ undefined', () => {
      const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 50, endAge: 60, colaMode: 'real-flat', survivorPct: 0.5 }
      expect(compileIncomeStreams([s], [65, 70], 5, INFL)).toBeUndefined() // currentAge 65 > endAge 60
    })
  })

  it('an out-of-range ownerIndex (restore-path corruption) is skipped gracefully — never a throw (the entity gate owns ownerIndex ∈ {0,1})', () => {
    const corrupt = { ownerIndex: 5, type: 'pension', annualRealToday: 30_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0.5 } as unknown as IncomeStream
    expect(compileIncomeStreams([corrupt], [65, 70], 5, INFL)).toBeUndefined() // contributes nothing, no TypeError
  })
})

describe('effectiveTaxableFraction (R40 U2 · KTD-6)', () => {
  it('pension/rental/other default to fully taxable (1); an entered fraction is the disclosed-optimistic opt-in', () => {
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'pension', annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(1)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'rental', annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 1 })).toBe(1)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'other', annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(1)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'pension', taxableFraction: 0.8, annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(0.8)
  })
  it('alimony derives from the agreement date; annuity from qualified/exclusion', () => {
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'alimony', executedAfter2018: true, annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(0)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'alimony', executedAfter2018: false, annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(1)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'annuity', qualified: true, annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBe(1)
    expect(effectiveTaxableFraction({ ownerIndex: 0, type: 'annuity', qualified: false, exclusionFraction: 0.4, annualRealToday: 1, startAge: 60, colaMode: 'real-flat', survivorPct: 0 })).toBeCloseTo(0.6, 12)
  })
})
