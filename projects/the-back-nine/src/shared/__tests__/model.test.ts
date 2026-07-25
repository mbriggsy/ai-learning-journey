import { describe, it, expect } from 'vitest'
import {
  OUTCOME_STATES,
  NEVER_DEPLETED,
  isDepleted,
  DRAWDOWN_POLICIES,
  DRAWDOWN_ORDER_KEYS,
  expandRothConversion,
  scenarioIdentity,
  scenarioIdentityKey,
  type ScenarioV3,
  type OutcomeState,
  type DepletionYear,
  type DateOffsetReading,
  type DateSearchOutcome,
  type DateTrackOutcome,
} from '@shared/model'

describe('outcome-state set (single-sourced engine vocabulary)', () => {
  it('lists exactly the six first-answer states, no duplicates', () => {
    expect([...OUTCOME_STATES].sort()).toEqual(
      [
        'already-failing',
        'borderline',
        'indeterminate',
        'off-track',
        'on-track',
        'over-funded',
      ].sort(),
    )
    expect(new Set(OUTCOME_STATES).size).toBe(OUTCOME_STATES.length)
  })

  it('every listed state is assignable to OutcomeState (compile + runtime parity)', () => {
    // The array is `as const`, so this is really a compile-time guarantee; the
    // runtime loop documents intent and fails loud if the union/array ever diverge.
    for (const s of OUTCOME_STATES) {
      const typed: OutcomeState = s
      expect(typeof typed).toBe('string')
    }
  })
})

describe('never-depleted sentinel (DND/009 — survives JSON/IndexedDB)', () => {
  it('is a finite, out-of-domain integer — never Infinity/NaN/null', () => {
    expect(Number.isFinite(NEVER_DEPLETED)).toBe(true)
    expect(Number.isInteger(NEVER_DEPLETED)).toBe(true)
    expect(NEVER_DEPLETED).toBeLessThan(0) // real depletion years are >= 0
  })

  it('round-trips through JSON.stringify intact (the failure mode Infinity/NaN hit)', () => {
    const before: DepletionYear[] = [0, 5, NEVER_DEPLETED, 29]
    const after = JSON.parse(JSON.stringify(before)) as DepletionYear[]
    expect(after).toEqual(before)
    // Contrast: Infinity/NaN would have become null here.
    expect(JSON.parse(JSON.stringify([Infinity, NaN]))).toEqual([null, null])
  })

  it('isDepleted distinguishes a real depletion year from the sentinel', () => {
    expect(isDepleted(NEVER_DEPLETED)).toBe(false)
    expect(isDepleted(0)).toBe(true)
    expect(isDepleted(29)).toBe(true)
  })
})

describe('drawdown policy set (sequencing substrate)', () => {
  it("names exactly the four locked policies plus 'custom' (P3·U10 — the user's own order)", () => {
    expect([...DRAWDOWN_POLICIES].sort()).toEqual(
      ['bracket-fill', 'custom', 'pre-tax-first', 'proportional', 'taxable-first'].sort(),
    )
  })

  it('the custom-order vocabulary is the three GENERAL buckets — hsa is unrepresentable', () => {
    expect([...DRAWDOWN_ORDER_KEYS].sort()).toEqual(['pretax', 'roth', 'taxable'].sort())
  })
})

// ---------------------------------------------------------------------------
// P3·U10 — expandRothConversion: the ONE shared expander (the intake builder and
// the two-arm orchestrator both derive from it, so the lever and the comparison
// can never disagree about which years convert). Hand-derived expectations.
// ---------------------------------------------------------------------------
describe('expandRothConversion (the lever → per-year engine vector)', () => {
  it('expands a window inside the horizon: zeros before the start, the amount for each active year', () => {
    expect(expandRothConversion({ annualAmountReal: 40_000, startYearOffset: 2, years: 3 }, 30)).toEqual([
      0, 0, 40_000, 40_000, 40_000,
    ])
  })

  it('a start-now window has no zero prefix', () => {
    expect(expandRothConversion({ annualAmountReal: 25_000, startYearOffset: 0, years: 2 }, 30)).toEqual([
      25_000, 25_000,
    ])
  })

  it('truncates at the horizon (years past it are inert, never an over-long array)', () => {
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 28, years: 5 }, 30)).toEqual([
      ...new Array<number>(28).fill(0),
      10_000,
      10_000,
    ])
  })

  it('a window entirely past the horizon returns UNDEFINED — absence, never a zero-fill (reduce-to-spine is presence-keyed)', () => {
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 30, years: 5 }, 30)).toBeUndefined()
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 31, years: 1 }, 30)).toBeUndefined()
  })

  it('the expansion is JSON-safe end to end (DND-009: finite entries only)', () => {
    const vec = expandRothConversion({ annualAmountReal: 40_000, startYearOffset: 1, years: 2 }, 10)!
    expect(vec.every((v) => Number.isFinite(v))).toBe(true)
    expect(JSON.parse(JSON.stringify(vec))).toEqual(vec)
  })
})

describe('DateSearchOutcome family — DND/009 persisted-finite round-trip (the NEVER_DEPLETED mirror)', () => {
  // The model.ts contract on the C3 vocabulary promises every persisted field is a finite
  // numeric and the no-offset arms simply CARRY NO offset field (never an Infinity/NaN
  // sentinel, never an explicit undefined). The producer (decideTrack) enforces finiteness
  // at runtime today — these tests are the U4-persistence regression guard the sentinel
  // already has at lines above (a future Infinity would silently null on the IndexedDB
  // write and corrupt a reopened plan).
  const curve: readonly DateOffsetReading[] = [
    { offsetYears: 0, survivalFraction: 0.7, quantizedLowerBound: 0.69, clears: false },
    { offsetYears: 1, survivalFraction: 0.91, quantizedLowerBound: 0.9, clears: true },
    { offsetYears: 2, survivalFraction: 0.93, quantizedLowerBound: 0.92, clears: true },
  ]
  const confirmed: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 1,
    grade: { quantizedLowerBound: 0.9, survivalFraction: 0.91, marginAboveBar: 0.05 },
    nonMonotoneOffsets: [],
    curve,
  }

  it('a fully-populated dates outcome round-trips through JSON intact, every numeric FINITE after the trip', () => {
    const before: DateSearchOutcome = {
      kind: 'dates',
      floor: confirmed,
      lifestyle: confirmed,
      tier: 'final',
      windowTopYears: 2,
      seed: 12345,
    }
    const after = JSON.parse(JSON.stringify(before)) as typeof before
    expect(after).toEqual(before)
    // The explicit finiteness sweep is the load-bearing half: toEqual alone cannot catch a
    // future Infinity/NaN (JSON nulls it on BOTH sides of the comparison only when the
    // producer emits it — sweep the post-trip numerics directly).
    expect(Number.isFinite(after.windowTopYears)).toBe(true)
    expect(Number.isFinite(after.seed)).toBe(true)
    for (const track of [after.floor, after.lifestyle]) {
      if (track.kind === 'no-date-in-window') continue
      expect(Number.isFinite(track.offsetYears)).toBe(true)
      expect(Number.isFinite(track.grade.quantizedLowerBound)).toBe(true)
      expect(Number.isFinite(track.grade.survivalFraction)).toBe(true)
      expect(Number.isFinite(track.grade.marginAboveBar)).toBe(true)
      for (const r of track.curve) {
        expect(Number.isFinite(r.offsetYears)).toBe(true)
        expect(Number.isFinite(r.survivalFraction)).toBe(true)
        expect(Number.isFinite(r.quantizedLowerBound)).toBe(true)
      }
      for (const n of track.nonMonotoneOffsets) expect(Number.isFinite(n)).toBe(true)
    }
  })

  it('the no-date arm carries NO offset key — and stays key-ABSENT through the trip', () => {
    // The load-bearing assertion is the `in` check, NOT toEqual: a regression that emits
    // `offsetYears: undefined` serializes away to absent and toEqual would silently pass —
    // only an explicit key-presence check pins the "carry no offset field" promise.
    const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [1], curve }
    const before: DateSearchOutcome = {
      kind: 'dates',
      floor: noDate,
      lifestyle: noDate,
      tier: 'provisional',
      windowTopYears: 2,
      seed: 7,
    }
    const after = JSON.parse(JSON.stringify(before)) as typeof before
    expect(after).toEqual(before)
    expect('offsetYears' in after.floor).toBe(false)
    expect('grade' in after.floor).toBe(false)
  })

  it('the cancelled and input-failure run-level arms round-trip intact', () => {
    const cancelled: DateSearchOutcome = { kind: 'cancelled' }
    expect(JSON.parse(JSON.stringify(cancelled))).toEqual(cancelled)
    const failed: DateSearchOutcome = { kind: 'input-failure', reason: 'candidate Y=0 rejected: x' }
    const afterFailed = JSON.parse(JSON.stringify(failed)) as typeof failed
    expect(afterFailed).toEqual(failed)
    if (afterFailed.kind === 'input-failure') expect(typeof afterFailed.reason).toBe('string')
  })
})

/**
 * `scenarioIdentityKey` (U17·S3·D5) — the canonical disk-identity serialization the dirty/clean
 * compare rests on. The PRODUCER's own contract is pinned here; the CONSUMER-side arm (that
 * `deriveResultSave` actually routes through it) lives in `src/ui/__tests__/resultSave.test.ts`,
 * because calling a shared function from a test proves the FUNCTION, never that the consumer
 * still calls it (insight 032/081).
 */
describe('scenarioIdentityKey — key-order-INSENSITIVE, array-order-SENSITIVE disk identity', () => {
  // A minimal-but-real v3: two people (order-meaningful), a two-line budget (order-meaningful),
  // and a custom drawdown order (order-IS-the-strategy).
  const base = (): ScenarioV3 =>
    JSON.parse(
      JSON.stringify({
        schemaVersion: 3,
        people: [
          { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 0, pia: 36_000, socialSecurityClaimAge: 67, name: 'Pat', workStatus: 'retired' },
          { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 64, earnedIncomeReal: 0, pia: 28_000, socialSecurityClaimAge: 67, name: 'Sam', workStatus: 'retired' },
        ],
        enteredAccounts: [],
        tickerClassifications: {},
        health: { enrolledPremiumMonthlyToday: 0, slcspMonthlyToday: 0, oopMedicalAnnual: 6_000, irmaaMagiSeed: [0, 0], workingYearInvestmentByPerson: [0, 0] },
        annualSpendingReal: 90_000,
        spendEntryPeriod: 'year',
        survivorSpendingRatio: 0.75,
        drawdownPolicy: 'custom',
        drawdownOrder: ['taxable', 'pretax', 'roth'],
        filing: 'mfj',
        startCalendarYear: 2026,
        taxVintage: 'OBBBA-2025',
        appDefaultVersion: 'defaults-2026-06',
        seed: 0x0badf00d,
        incomeStreams: [],
        budget: [
          { category: 'housing', label: 'House', annualAmountReal: 40_000, tier: 'essentials', startYear: 0 },
          { category: 'travel', label: 'Trips', annualAmountReal: 12_000, tier: 'nice-to-have', startYear: 0 },
        ],
        savedAt: 20_500,
      }),
    ) as ScenarioV3

  /** Rebuild an object with its own keys in REVERSE order — a legal JSON re-serialization that a
   *  raw `JSON.stringify` compare treats as a different scenario. */
  const reverseKeys = <T,>(v: T): T => {
    if (Array.isArray(v)) return v.map(reverseKeys) as unknown as T
    if (v !== null && typeof v === 'object') {
      const o = v as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(o).reverse()) out[k] = reverseKeys(o[k])
      return out as T
    }
    return v
  }

  it('two scenarios differing ONLY in key order (at every depth) share one identity key — and the raw stringify they replaced does NOT (the arm is non-vacuous)', () => {
    const a = base()
    const b = reverseKeys(base())
    expect(scenarioIdentityKey(a)).toBe(scenarioIdentityKey(b))
    // The witness that this pins something real: the OLD mechanism disagrees on the same pair.
    expect(JSON.stringify(scenarioIdentity(a))).not.toBe(JSON.stringify(scenarioIdentity(b)))
  })

  it('a nested VALUE difference still separates them (the normalizer never widens into content-blindness)', () => {
    const a = base()
    const b = base()
    ;(b.budget as unknown as { annualAmountReal: number }[])[1]!.annualAmountReal = 12_001
    expect(scenarioIdentityKey(a)).not.toBe(scenarioIdentityKey(b))
  })

  it('ARRAY order is IDENTITY: reordering people, the budget, or the drawdown buckets each read DIFFERENT (sorting them would make a real reorder read clean — a lie in the dangerous direction)', () => {
    const a = base()
    const key = scenarioIdentityKey(a)
    const swappedPeople = { ...base(), people: [base().people[1]!, base().people[0]!] } as ScenarioV3
    expect(scenarioIdentityKey(swappedPeople)).not.toBe(key)
    const swappedBudget = { ...base(), budget: [base().budget![1]!, base().budget![0]!] } as ScenarioV3
    expect(scenarioIdentityKey(swappedBudget)).not.toBe(key)
    // The drawdown order IS the strategy — a reversed sequence is a different plan entirely.
    const reordered = { ...base(), drawdownOrder: ['roth', 'pretax', 'taxable'] } as ScenarioV3
    expect(scenarioIdentityKey(reordered)).not.toBe(key)
  })

  it('it is savedAt-BLIND (it wraps scenarioIdentity) but blind to nothing else — the U13 next-day-clean law survives the rewrite', () => {
    const a = base()
    const b = { ...base(), savedAt: 20_530 }
    expect(scenarioIdentityKey(a)).toBe(scenarioIdentityKey(b))
    // …and the saved-recommendation record is IN the identity: a record present vs absent is a
    // real difference on disk (it is a user fact carried on the draft, not a wall-time stamp).
    const withRecord: ScenarioV3 = {
      ...base(),
      savedRecommendation: {
        mintedAt: 20_500,
        fingerprint: 'fp',
        solverCodeVersion: 1,
        goal: 'leave-more',
        action: { candidateId: 'baseline:custom:0', policy: 'custom', drawdownOrder: ['taxable', 'pretax', 'roth'] },
        verdict: { grade: 'just-do-it', subTenthCollapse: false, noChange: false, surplusRegime: false, noDollarRegister: false },
        // ALL FIVE era fields — required on a RECORD (unlike on a scenario). model.ts
        // `SavedRecommendationEraV3` names the premise that does not transplant.
        era: {
          appDefaultVersion: 'defaults-2026-06',
          taxVintageDetail: { taxYear: 2026, legalBasis: 'OBBBA' },
          stateTaxVintage: { ncProfile: '{"nc":1}', paProfile: '{"pa":1}', flProfile: '{"fl":0}' },
          healthcareVintage: {
            coverageYear: 2026,
            acaStatus: 'reverted',
            acaVerifiedOn: '2026-07-01',
            fplGuidelineYear: 2025,
            irmaaTopTierFrozenThrough: 2028,
            partBStandardMonthly: 206.5,
          },
          dateVintage: { contributionYear: 2026, blendSnapshotAsOf: '2026-01-01' },
        },
      },
    }
    expect(scenarioIdentityKey(withRecord)).not.toBe(scenarioIdentityKey(a))
    // …and an OLD mintedAt vs a fresh one is a difference too — which is precisely what makes the
    // insight-073 aged-vault witness (draftFromScenario.test.ts) able to catch a re-stamp.
    const reminted: ScenarioV3 = {
      ...withRecord,
      savedRecommendation: { ...withRecord.savedRecommendation!, mintedAt: 20_800 },
    }
    expect(scenarioIdentityKey(reminted)).not.toBe(scenarioIdentityKey(withRecord))
  })

  it('a non-finite number gets a DISTINCT token, never JSON.stringify’s null coercion (DND 009 — three different values must not share one encoding)', () => {
    // The codec refuses to decode one, so this can only arrive on a hand-built operand — but a
    // normalizer that collapsed NaN/Infinity/null onto `null` would hide a real difference.
    const nan = { ...base(), annualSpendingReal: Number.NaN } as ScenarioV3
    const inf = { ...base(), annualSpendingReal: Number.POSITIVE_INFINITY } as ScenarioV3
    const nul = { ...base(), annualSpendingReal: null as unknown as number } as ScenarioV3
    const keys = new Set([scenarioIdentityKey(nan), scenarioIdentityKey(inf), scenarioIdentityKey(nul)])
    expect(keys.size).toBe(3)
  })
})
