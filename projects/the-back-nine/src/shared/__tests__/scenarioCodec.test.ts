/**
 * scenarioCodec.ts — the restore semantic-validation battery (strategic-review P2:
 * GCM-valid ≠ semantically valid; the decoded plaintext is UNTRUSTED until its shape
 * is proven).
 *
 * The codec proves SHAPE (types, enums, finiteness-first per insight 010, the
 * schemaVersion ladder); the engine's R19 `validateParams` proves SEMANTICS — a
 * decoded scenario still passes the R19 gate before any answer renders, so the codec
 * never re-implements (and can never drift from) the engine's domain rules.
 */
import { describe, expect, it } from 'vitest'

import {
  NEVER_DEPLETED,
  SCENARIO_V3_FIELDS,
  type Scenario,
  type ScenarioV2,
  type ScenarioV3,
} from '../model'
import { decodeScenario, encodeScenario } from '../scenarioCodec'

type Obj = Record<string, unknown>

const V1: Scenario = {
  schemaVersion: 1,
  initialPortfolio: 1_200_000,
  annualSpendingReal: 60_000,
  stockWeight: 0.6,
  people: [
    {
      sex: 'male',
      currentAge: 51,
      retirementAge: 58,
      earnedIncomeReal: 120_000,
      socialSecurityReal: 28_000,
      socialSecurityClaimAge: 67,
    },
    {
      sex: 'female',
      currentAge: 49,
      retirementAge: 56,
      earnedIncomeReal: 90_000,
      socialSecurityReal: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'taxable-first',
  seed: 0x1234abcd,
}

const V2: ScenarioV2 = {
  ...V1,
  schemaVersion: 2,
  accounts: [
    {
      birthYear: 1975,
      taxable: 300_000,
      taxableBasis: 220_000,
      pretax: 500_000,
      roth: 100_000,
      hsa: 40_000,
      // Arbitrary stream values on purpose — the copyGuard forbids re-typing the
      // REAL dated limits (they live only in @engine/constants); shape is what's tested.
      contributions: { pretax: [12_345, 12_345], employerMatch: [6_789, 6_789], hsa: [1_234] },
    },
    { birthYear: 1977, taxable: 100_000, taxableBasis: 80_000, pretax: 180_000, roth: 20_000 },
  ],
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'defaults-2026-06',
}

// The forward-written v3 shape (U8) — exercises the live pia/birthYear person, entered accounts,
// BOTH discriminated unions (ticker classification + the income-stream tax treatment), every income
// `type` arm, the fixed-pct colaPct, and the optional health fields. Hand-authored (not engine-derived).
const V3: ScenarioV3 = {
  schemaVersion: 3,
  people: [
    { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 0, pia: 36_000, socialSecurityClaimAge: 67, name: 'Pat', workStatus: 'retired' },
    { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 62, earnedIncomeReal: 80_000, pia: 28_000, socialSecurityClaimAge: 67, name: 'Sam', workStatus: 'working' },
  ],
  enteredAccounts: [
    { ownerIndex: 0, kind: 'brokerage', manualBlend: { kind: 'exact', stockPct: 60, bondPct: 35, cashPct: 5 }, valueToday: 400_000, basis: 250_000 },
    { ownerIndex: 1, kind: '401k', ticker: 'VFIAX', valueToday: 500_000, annualContribution: 23_000, employerMatchAnnual: 9_000 },
    { ownerIndex: 1, kind: 'hsa', manualBlend: { kind: 'simple', choice: 'stocks' }, valueToday: 40_000, hsaEmployerAnnual: 1_000 },
  ],
  tickerClassifications: {
    VFIAX: { kind: 'simple', choice: 'stocks' },
    BIICX: { kind: 'exact', stockPct: 0, bondPct: 100, cashPct: 0 },
  },
  health: {
    enrolledPremiumMonthlyToday: 1_200,
    slcspMonthlyToday: 1_100,
    oopMedicalAnnual: 6_000,
    irmaaMagiSeed: [180_000, 190_000],
    workingYearIrmaaMagiByPerson: [0, 95_000],
  },
  annualSpendingReal: 90_000,
  spendEntryPeriod: 'year',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'defaults-2026-06',
  seed: 0x0badf00d,
  incomeStreams: [
    { ownerIndex: 0, annualRealToday: 24_000, startAge: 65, colaMode: 'fixed-pct', colaPct: 0.02, survivorPct: 0.5, type: 'pension', taxableFraction: 1 },
    { ownerIndex: 1, annualRealToday: 12_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0, type: 'alimony', executedAfter2018: false, modifiedAdoptsPost2018Rules: false },
    { ownerIndex: 0, annualRealToday: 18_000, startAge: 70, endAge: 90, colaMode: 'nominal-flat', survivorPct: 1, type: 'annuity', qualified: false, exclusionFraction: 0.3 },
    { ownerIndex: 1, annualRealToday: 10_000, startAge: 67, colaMode: 'real-flat', survivorPct: 1, type: 'annuity', qualified: true },
  ],
}

/** Encode, surgically mutate the JSON, return the re-encoded bytes. */
function mutated(base: Scenario | ScenarioV2 | ScenarioV3, mutate: (obj: Obj) => void): Uint8Array {
  const obj = JSON.parse(new TextDecoder().decode(encodeScenario(base))) as Obj
  mutate(obj)
  return new TextEncoder().encode(JSON.stringify(obj))
}

describe('round-trip', () => {
  it('v1 round-trips exactly — including the seed (the determinism field)', () => {
    const decoded = decodeScenario(encodeScenario(V1))
    expect(decoded).toEqual({ ok: true, scenario: V1 })
    if (decoded.ok) expect(decoded.scenario.seed).toBe(0x1234abcd)
  })

  it('v2 round-trips exactly — including optional hsa + contribution streams', () => {
    const decoded = decodeScenario(encodeScenario(V2))
    expect(decoded).toEqual({ ok: true, scenario: V2 })
  })

  it('the NEVER_DEPLETED sentinel survives a JSON round-trip as -1 (DND/009 — the reason it is an integer)', () => {
    expect(JSON.parse(JSON.stringify({ d: NEVER_DEPLETED }))).toEqual({ d: -1 })
  })
})

describe('the schemaVersion ladder (read FIRST, branch before any field is trusted)', () => {
  it('an unknown newer version → the calm newer-version state, never a mis-parse', () => {
    // v3 is now a LIVE ladder member (U8), so the "newer than this build" case is 4.
    const bytes = mutated(V1, (o) => {
      o.schemaVersion = 4
    })
    expect(decodeScenario(bytes)).toEqual({ ok: false, reason: 'newer-version', got: 4 })
  })

  it('a newer version with OTHERWISE GARBAGE fields is still newer-version (version is judged before shape)', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ schemaVersion: 7, complete: 'nonsense' }))
    expect(decodeScenario(bytes)).toEqual({ ok: false, reason: 'newer-version', got: 7 })
  })

  it('a missing schemaVersion is corruption', () => {
    const bytes = mutated(V1, (o) => {
      delete o.schemaVersion
    })
    const decoded = decodeScenario(bytes)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('corrupt')
  })

  it('a non-integer / non-numeric schemaVersion is corruption, not a version branch', () => {
    for (const bad of [1.5, '1', null, true]) {
      const bytes = mutated(V1, (o) => {
        o.schemaVersion = bad
      })
      const decoded = decodeScenario(bytes)
      expect(decoded.ok).toBe(false)
      if (!decoded.ok) expect(decoded.reason).toBe('corrupt')
    }
  })
})

describe('corruption (structural) — finiteness-first, paths named', () => {
  it('non-JSON bytes → corrupt', () => {
    const decoded = decodeScenario(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('corrupt')
  })

  it('JSON that is not an object (array / null / number) → corrupt', () => {
    for (const doc of ['[]', 'null', '42', '"scenario"']) {
      const decoded = decodeScenario(new TextEncoder().encode(doc))
      expect(decoded.ok).toBe(false)
      if (!decoded.ok) expect(decoded.reason).toBe('corrupt')
    }
  })

  it('a null where a number belongs is corruption NAMING the path (never silently zero, never never-depleted)', () => {
    const bytes = mutated(V1, (o) => {
      ;(o.people as Record<string, unknown>[])[0]!.currentAge = null
    })
    const decoded = decodeScenario(bytes)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok && decoded.reason === 'corrupt') expect(decoded.detail).toContain('people[0].currentAge')
  })

  it('an out-of-vocabulary enum is corruption (sex / drawdownPolicy / filing)', () => {
    const badSex = mutated(V1, (o) => {
      ;(o.people as Record<string, unknown>[])[0]!.sex = 'unknown'
    })
    expect(decodeScenario(badSex).ok).toBe(false)

    const badPolicy = mutated(V1, (o) => {
      o.drawdownPolicy = 'yolo'
    })
    expect(decodeScenario(badPolicy).ok).toBe(false)

    const badFiling = mutated(V2, (o) => {
      o.filing = 'hoh'
    })
    expect(decodeScenario(badFiling).ok).toBe(false)
  })

  it('a non-integer seed is corruption (the persisted seed carries the bit-identical reproduction contract)', () => {
    for (const bad of [1.5, null, '42']) {
      const bytes = mutated(V1, (o) => {
        o.seed = bad
      })
      expect(decodeScenario(bytes).ok).toBe(false)
    }
  })

  it('an empty people array is corruption (a scenario about nobody is shape-invalid)', () => {
    const bytes = mutated(V1, (o) => {
      o.people = []
    })
    expect(decodeScenario(bytes).ok).toBe(false)
  })

  it('v2: a malformed accounts entry is corruption naming the path', () => {
    const bytes = mutated(V2, (o) => {
      ;(o.accounts as Record<string, unknown>[])[1]!.taxableBasis = null
    })
    const decoded = decodeScenario(bytes)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok && decoded.reason === 'corrupt') expect(decoded.detail).toContain('accounts[1].taxableBasis')
  })

  it('v2: a contribution stream containing a null entry is corruption', () => {
    const bytes = mutated(V2, (o) => {
      ;((o.accounts as Record<string, unknown>[])[0]!.contributions as Record<string, unknown>).pretax = [12_345, null]
    })
    expect(decodeScenario(bytes).ok).toBe(false)
  })

  it('v2: the string/integer top-level fields each have a live negative arm', () => {
    const badVintage = mutated(V2, (o) => {
      o.taxVintage = null
    })
    expect(decodeScenario(badVintage).ok).toBe(false)

    const badYear = mutated(V2, (o) => {
      o.startCalendarYear = 2026.5
    })
    expect(decodeScenario(badYear).ok).toBe(false)

    const badAppVersion = mutated(V2, (o) => {
      o.appDefaultVersion = 7
    })
    expect(decodeScenario(badAppVersion).ok).toBe(false)
  })

  it('v2: a contribution stream that is not an array is corruption (not just a bad entry inside one)', () => {
    const bytes = mutated(V2, (o) => {
      ;((o.accounts as Record<string, unknown>[])[0]!.contributions as Record<string, unknown>).pretax = 'lots'
    })
    expect(decodeScenario(bytes).ok).toBe(false)
  })

  it('v2: accounts misaligned with people (extra entry) is corruption (the index-aligned contract)', () => {
    const bytes = mutated(V2, (o) => {
      const accounts = o.accounts as Record<string, unknown>[]
      accounts.push({ birthYear: 1980, taxable: 0, taxableBasis: 0, pretax: 0, roth: 0 })
    })
    expect(decodeScenario(bytes).ok).toBe(false)
  })
})

describe('tolerant reader (additive-within-version fields pass through)', () => {
  it('unknown extra fields do NOT fail the decode (the hsa/contributions pattern relies on this)', () => {
    const bytes = mutated(V1, (o) => {
      o.someFutureAdditiveField = 'present'
      ;(o.people as Record<string, unknown>[])[0]!.nickname = 'Briggsy'
    })
    const decoded = decodeScenario(bytes)
    expect(decoded.ok).toBe(true)
  })
})

describe('v3 — the forward-written persist shape (U8, the first v3 writer)', () => {
  it('v3 round-trips EXACTLY — people(pia/birthYear/name/workStatus), entered accounts, both unions, health, income streams', () => {
    const decoded = decodeScenario(encodeScenario(V3))
    expect(decoded).toEqual({ ok: true, scenario: V3 })
    if (decoded.ok) expect(decoded.scenario.seed).toBe(0x0badf00d) // the determinism field survives
  })

  it('EVERY v3 top-level field is validated — set each to null and the decode rejects as CORRUPT (no silent skip, burned/063)', () => {
    // NOTE: a null on a CONTAINER field (people/enteredAccounts/tickerClassifications/health/incomeStreams)
    // only trips the OUTER needArray/needObject — the inner-shape coverage is the targeted tests below.
    for (const field of SCENARIO_V3_FIELDS) {
      const decoded = decodeScenario(mutated(V3, (o) => { o[field] = null }))
      expect(decoded.ok, `${field}=null must be rejected`).toBe(false)
      if (!decoded.ok) expect(decoded.reason, `${field}=null is corruption, not a mis-routed reason`).toBe('corrupt')
    }
  })

  it('v3 person uses pia + birthYear (the LIVE SS fields, never legacy socialSecurityReal)', () => {
    expect(decodeScenario(mutated(V3, (o) => { delete (o.people as Obj[])[0]!.birthYear })).ok).toBe(false)
    const d = decodeScenario(mutated(V3, (o) => { (o.people as Obj[])[1]!.pia = null }))
    expect(d.ok).toBe(false)
    if (!d.ok && d.reason === 'corrupt') expect(d.detail).toContain('people[1].pia')
    // birthYear is the FRA-lookup key — a non-integer violates the contract
    expect(decodeScenario(mutated(V3, (o) => { (o.people as Obj[])[0]!.birthYear = 1964.5 })).ok).toBe(false)
  })

  it('v3 person name (string) + workStatus (vocab) are validated', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.people as Obj[])[0]!.workStatus = 'semi-retired' })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.people as Obj[])[0]!.name = 42 })).ok).toBe(false)
  })

  it('an enteredAccount with a dangling ownerIndex (outside people range) is corruption', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.ownerIndex = 5 })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.ownerIndex = -1 })).ok).toBe(false)
  })

  it('enteredAccount: bad kind, non-finite valueToday, and a present-but-non-finite optional all reject', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.kind = 'crypto' })).ok).toBe(false)
    const d = decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[1]!.valueToday = null }))
    expect(d.ok).toBe(false)
    if (!d.ok && d.reason === 'corrupt') expect(d.detail).toContain('enteredAccounts[1].valueToday')
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.basis = null })).ok).toBe(false)
  })

  it('the ticker-classification union: bad kind, a simple-arm bad choice, an exact-arm non-finite/missing pct all reject', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.tickerClassifications as Obj).VFIAX = { kind: 'magic' } })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.tickerClassifications as Obj).VFIAX = { kind: 'simple', choice: 'gold' } })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.tickerClassifications as Obj).BIICX = { kind: 'exact', stockPct: null, bondPct: 100, cashPct: 0 } })).ok).toBe(false)
    // a manualBlend on an account runs the SAME union — a missing leg rejects
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.manualBlend = { kind: 'exact', stockPct: 60, bondPct: 35 } })).ok).toBe(false)
  })

  it('health: a present scalar must be finite; a MAGI array with a null entry rejects; all-absent passes', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.health as Obj).slcspMonthlyToday = null })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.health as Obj).irmaaMagiSeed = [180_000, null] })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { o.health = {} })).ok).toBe(true) // every health field is optional
  })

  it('income stream: colaPct is REQUIRED-and-finite under fixed-pct (DND-009 — absent ≠ a silent 0)', () => {
    const d = decodeScenario(mutated(V3, (o) => { delete (o.incomeStreams as Obj[])[0]!.colaPct })) // [0] is fixed-pct
    expect(d.ok).toBe(false)
    if (!d.ok && d.reason === 'corrupt') expect(d.detail).toContain('incomeStreams[0].colaPct')
    // a non-fixed-pct stream MAY omit colaPct
    expect(decodeScenario(mutated(V3, (o) => { delete (o.incomeStreams as Obj[])[1]!.colaPct })).ok).toBe(true)
  })

  it('income stream tax-treatment union (KTD-6): alimony needs executedAfter2018; annuity non-qualified needs exclusionFraction', () => {
    expect(decodeScenario(mutated(V3, (o) => { delete (o.incomeStreams as Obj[])[1]!.executedAfter2018 })).ok).toBe(false) // [1] alimony
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[1]!.executedAfter2018 = 'yes' })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { delete (o.incomeStreams as Obj[])[2]!.exclusionFraction })).ok).toBe(false) // [2] annuity non-qualified
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[3]!.qualified = 'sure' })).ok).toBe(false) // [3] qualified boolean
  })

  it('income stream: a dangling ownerIndex, a bad colaMode, and an out-of-vocab type are corruption', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.ownerIndex = 9 })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.colaMode = 'compound' })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.type = 'lottery' })).ok).toBe(false)
  })

  it('income entity fractions are range-gated to [0,1] — the codec is the SOLE [0,1] guard on restore (KTD-4; the optimistic calm-but-wrong direction)', () => {
    // survivorPct > 1 ⇒ the survivor "inherits" >100% of a benefit — inflating a POSITIVE per-year vector
    // the engine's finiteNonNeg backstop cannot catch. This is the cardinal-sin false-accept the adversarial
    // pass surfaced; the codec is the only [0,1] gate that runs on the restore path.
    const overSurvivor = decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.survivorPct = 5 }))
    expect(overSurvivor.ok).toBe(false)
    if (!overSurvivor.ok && overSurvivor.reason === 'corrupt') expect(overSurvivor.detail).toContain('incomeStreams[0].survivorPct')
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.survivorPct = -0.5 })).ok).toBe(false)
    // taxableFraction (pension arm) out of range ⇒ effectiveTaxableFraction leaves [0,1]
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.taxableFraction = -0.1 })).ok).toBe(false)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.taxableFraction = 1.5 })).ok).toBe(false)
    // exclusionFraction (non-qualified annuity, stream [2]) > 1 ⇒ 1 − f < 0 (negative taxable)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[2]!.exclusionFraction = 5 })).ok).toBe(false)
    // the boundary values 0 and 1 are VALID — the gate is [0,1], not over-strict (false-reject guard)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.survivorPct = 0 })).ok).toBe(true)
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]!.survivorPct = 1 })).ok).toBe(true)
  })

  it('income inner scalars (annualRealToday / startAge / survivorPct) each reject a null — the null-loop only trips the outer array', () => {
    for (const field of ['annualRealToday', 'startAge', 'survivorPct']) {
      expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[0]![field] = null })).ok, `${field}=null`).toBe(false)
    }
  })

  it('alimony modifiedAdoptsPost2018Rules must be a boolean when present (the otherwise-dead union branch)', () => {
    // stream [1] is the pre-2019 alimony carrying modifiedAdoptsPost2018Rules: false — its happy path
    // round-trips above; here a non-boolean value rejects.
    expect(decodeScenario(mutated(V3, (o) => { (o.incomeStreams as Obj[])[1]!.modifiedAdoptsPost2018Rules = 'no' })).ok).toBe(false)
  })

  it('the remaining inner shapes reject a wrong TYPE (not just a missing field): ticker, manualBlend, the MAGI arrays, a ticker-class value', () => {
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[1]!.ticker = 42 })).ok).toBe(false) // non-string ticker
    expect(decodeScenario(mutated(V3, (o) => { (o.enteredAccounts as Obj[])[0]!.manualBlend = 'stocks' })).ok).toBe(false) // non-object manualBlend
    expect(decodeScenario(mutated(V3, (o) => { (o.tickerClassifications as Obj).VFIAX = 'stocks' })).ok).toBe(false) // non-object class value
    expect(decodeScenario(mutated(V3, (o) => { (o.health as Obj).irmaaMagiSeed = 'lots' })).ok).toBe(false) // non-array
    expect(decodeScenario(mutated(V3, (o) => { (o.health as Obj).workingYearIrmaaMagiByPerson = [0, null] })).ok).toBe(false) // array-with-null
    expect(decodeScenario(mutated(V3, (o) => { (o.health as Obj).workingYearIrmaaMagiByPerson = 5 })).ok).toBe(false) // non-array
  })

  it('v3 is a tolerant reader too — an unknown additive field passes', () => {
    const decoded = decodeScenario(mutated(V3, (o) => {
      o.futureAdditiveField = 'present'
      ;(o.people as Obj[])[0]!.nickname = 'P'
    }))
    expect(decoded.ok).toBe(true)
  })
})
