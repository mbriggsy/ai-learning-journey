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

import { NEVER_DEPLETED, type Scenario, type ScenarioV2 } from '../model'
import { decodeScenario, encodeScenario } from '../scenarioCodec'

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

/** Encode, surgically mutate the JSON, return the re-encoded bytes. */
function mutated(base: Scenario | ScenarioV2, mutate: (obj: Record<string, unknown>) => void): Uint8Array {
  const obj = JSON.parse(new TextDecoder().decode(encodeScenario(base))) as Record<string, unknown>
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
    const bytes = mutated(V1, (o) => {
      o.schemaVersion = 3
    })
    expect(decodeScenario(bytes)).toEqual({ ok: false, reason: 'newer-version', got: 3 })
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
