/**
 * Act-4 · U17 · S3 — the re-entry TRICHOTOMY battery (`store/savedRecommendation.ts`).
 *
 * Laws under test, each with BOTH directions (a conjunct that cannot fail is insight-048's
 * untested gate; a conjunct that always fails is alarm-when-fine):
 *   1. All three conjuncts hold ⇒ `current`, `causes` EMPTY (the re-presentable case is real).
 *   2. Each conjunct alone flips it, with its OWN named cause.
 *   3. INSIGHT 101: when several hold, EVERY one is reported — never just the first found.
 *   4. The era conjunct compares the RECORD's era, NOT the scenario's re-minted stamps.
 *   5. `rulesMoved`, not `anyStale`: a lapsed budget window is a calendar prompt on a
 *      byte-identical recompute and must NEVER demote a still-valid recommendation.
 *   6. `!==`, not `<`, on the solver code version — a record from a NEWER build is equally
 *      un-re-presentable (this build cannot reproduce that ranking).
 *   7. A record whose era is INCOMPLETE never reaches this module at all: the codec refuses it and
 *      drops the atom. That arm lives at the bottom of this file, because the fail-open hole it
 *      closes is a TRICHOTOMY hole (a stampless era pins `rulesMoved: false` forever) even though
 *      the gate that closes it is the codec's.
 */
import { describe, expect, it } from 'vitest'
import { deriveSavedRecommendationStatus } from '../savedRecommendation'
import { deriveStaleness } from '../staleness'
import { scenarioFromDraft, currentEpochDay } from '@ui/scenarioFromDraft'
import { DEV_SEEDS } from '@ui/devSeeds'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'
import type { ScenarioV3, SavedRecommendationV3, SavedRecommendationEraV3 } from '@shared/model'

const TODAY = currentEpochDay()
const FINGERPRINT = 'solver-run-fp/v2:{"goal"=s"leave-more"}'

/** A real, fully-stamped save-ready scenario (the retired household — spine route). */
function freshSave(): ScenarioV3 {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be save-ready')
  return r.scenario
}

/** The five era-bearing fields of a REAL save, as a record's era must carry them — ALL FIVE
 *  present (model.ts `SavedRecommendationEraV3` names why the scenario's absent-is-quiet contract
 *  does not transplant to a record). It THROWS rather than `!`-asserting: a fixture that quietly
 *  built a stampless era would be exercising the exact fail-open shape the codec now refuses, and
 *  every arm below would then be testing a record no minter can produce. */
function eraOf(s: ScenarioV3): SavedRecommendationEraV3 {
  const { taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage } = s
  if (
    taxVintageDetail === undefined ||
    stateTaxVintage === undefined ||
    healthcareVintage === undefined ||
    dateVintage === undefined
  ) {
    throw new Error('scenarioFromDraft stamps all four vintages at every save — this fixture is not a real save')
  }
  return { appDefaultVersion: s.appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage }
}

/** A record minted against THIS scenario's era — the all-three-hold baseline. Built from the
 *  scenario's own stamps so the era conjunct starts quiet and every arm below moves ONE thing. */
function recordFor(scenario: ScenarioV3, over: Partial<SavedRecommendationV3> = {}): SavedRecommendationV3 {
  return {
    mintedAt: TODAY - 10,
    fingerprint: FINGERPRINT,
    solverCodeVersion: SOLVER_CODE_VERSION,
    goal: 'leave-more',
    action: { candidateId: 'baseline:taxable-first:0', policy: 'taxable-first' },
    verdict: {
      grade: 'just-do-it',
      subTenthCollapse: false,
      noChange: false,
      surplusRegime: false,
      noDollarRegister: false,
    },
    era: eraOf(scenario),
    ...over,
  }
}

const statusOf = (
  scenario: ScenarioV3,
  record: SavedRecommendationV3,
  freshFingerprint: string | null = FINGERPRINT,
) => deriveSavedRecommendationStatus({ record, scenario, freshFingerprint, todayEpochDay: TODAY })

describe('the trichotomy — all three conjuncts hold', () => {
  it('a matching fingerprint + a matching solver version + a record era equal to the live constants ⇒ CURRENT, with NO causes', () => {
    const s = freshSave()
    const status = statusOf(s, recordFor(s))
    expect(status.current).toBe(true)
    expect(status.causes).toEqual([])
    // Non-vacuity: the era report really ran (it is a full StalenessReport, not a stub), and it
    // agrees with the live comparator on a fresh save.
    expect(status.eraStaleness.rulesMoved).toBe(false)
    expect(status.eraStaleness.wallYear).toBe(deriveStaleness(s, TODAY).wallYear)
  })
})

describe('the trichotomy — conjunct 1: the household inputs', () => {
  it('a DIFFERENT fresh fingerprint ⇒ inputs-changed (and only that)', () => {
    const s = freshSave()
    const status = statusOf(s, recordFor(s), 'solver-run-fp/v2:{"goal"=s"pay-less-tax"}')
    expect(status.current).toBe(false)
    expect(status.causes).toEqual(['inputs-changed'])
  })

  it('NO fresh fingerprint at all ⇒ inputs-UNAVAILABLE, a DISTINCT cause (fail-closed: an unanswerable identity question is never answered “yes”)', () => {
    const s = freshSave()
    const status = statusOf(s, recordFor(s), null)
    expect(status.current).toBe(false)
    // Distinct from 'inputs-changed' on purpose: the two want different words from S4's register
    // ("your answer changed" vs "we can't check yet"), and collapsing them would make the copy
    // claim knowledge the store does not have.
    expect(status.causes).toEqual(['inputs-unavailable'])
  })
})

describe('the trichotomy — conjunct 2: the solver code version (`!==`, never `<`)', () => {
  it('an OLDER record version ⇒ solver-changed', () => {
    const s = freshSave()
    const status = statusOf(s, recordFor(s, { solverCodeVersion: SOLVER_CODE_VERSION - 1 }))
    expect(status.causes).toEqual(['solver-changed'])
  })

  it('a NEWER record version (a vault written by a LATER build, opened by this one) is EQUALLY un-re-presentable — the `<` a plain ordering compare would bless', () => {
    // THE MUTANT-SENSITIVE ARM (insight 029: it routes differently under `<`). A record from a
    // future build carries a ranking THIS build's code cannot reproduce; a `record < CURRENT`
    // compare reads false here and would silently re-present it as current advice.
    const s = freshSave()
    const status = statusOf(s, recordFor(s, { solverCodeVersion: SOLVER_CODE_VERSION + 1 }))
    expect(status.current).toBe(false)
    expect(status.causes).toEqual(['solver-changed'])
  })
})

describe('the trichotomy — conjunct 3: the rulebooks, judged against the RECORD’s era', () => {
  it('THE WHOLE REASON THE ERA SNAPSHOT EXISTS: a scenario whose stamps are FRESH but whose RECORD was minted under an older tax vintage reads rules-changed', () => {
    // This is the re-saver hole. `scenarioFromDraft` re-mints every vintage at every save, so
    // `deriveStaleness(scenario)` — which the U13 gate runs — reports NOTHING here. The record's
    // own era is the only thing that remembers what priced the ranking.
    const s = freshSave()
    const record = recordFor(s, {
      era: { ...eraOf(s), taxVintageDetail: { taxYear: s.taxVintageDetail!.taxYear - 1, legalBasis: 'TCJA (pre-OBBBA)' } },
    })
    // The scenario-level reader is silent — the exact false-clean this conjunct closes.
    expect(deriveStaleness(s, TODAY).rulesMoved).toBe(false)
    const status = statusOf(s, record)
    expect(status.current).toBe(false)
    expect(status.causes).toEqual(['rules-changed'])
    expect(status.eraStaleness.controls.taxMoved).toBe(true)
  })

  it('ALL FIVE era fields route through the ONE comparator: drifting the RECORD’s era reads exactly as drifting the SCENARIO’s own field would (no second copy of the compare logic)', () => {
    // The binding property, per field. It is NOT circular: the left side goes through the record
    // → explicit overlay → deriveStaleness path, the right side hands deriveStaleness a scenario
    // directly. They can only agree if the overlay actually carries that field. A drifted era
    // field that silently failed to reach the comparator (the blind-spread class, and any future
    // forgotten key) makes this red on exactly the field that was dropped.
    const s = freshSave()
    const nc = scenarioFromDraft(DEV_SEEDS.nc)
    if (!nc.ready) throw new Error('DEV_SEEDS.nc should be save-ready')
    // The state-tax clock is route-gated on the household's OWN priced state (a stateless seed
    // prices no state tax and legitimately never fires), so that arm runs on the NC household.
    const drifts: ReadonlyArray<readonly [string, ScenarioV3, Partial<ScenarioV3>]> = [
      ['appDefaultVersion', s, { appDefaultVersion: 'p0-ancient' }],
      ['taxVintageDetail', s, { taxVintageDetail: { ...s.taxVintageDetail!, taxYear: s.taxVintageDetail!.taxYear - 1 } }],
      [
        'stateTaxVintage',
        nc.scenario,
        { stateTaxVintage: { ncProfile: '{"old":1}', paProfile: '{"old":1}', flProfile: '{"old":1}' } },
      ],
      ['healthcareVintage', s, { healthcareVintage: { ...s.healthcareVintage!, coverageYear: s.healthcareVintage!.coverageYear - 1 } }],
      ['dateVintage', s, { dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }],
    ]
    let firedCount = 0
    for (const [label, base, drift] of drifts) {
      const driftedScenario: ScenarioV3 = { ...base, ...drift }
      const viaScenario = deriveStaleness(driftedScenario, TODAY)
      const viaRecord = statusOf(base, recordFor(driftedScenario))
      expect(viaRecord.eraStaleness, `${label}: the era overlay must reproduce the scenario-side report`).toEqual(
        viaScenario,
      )
      expect(viaRecord.causes.includes('rules-changed'), `${label}`).toBe(viaScenario.rulesMoved)
      if (viaScenario.rulesMoved) firedCount += 1
    }
    // NON-VACUITY, STATED HONESTLY — this comment used to claim more than the test delivers.
    // FOUR of the five are pinned BEHAVIOURALLY here: their drift fires `rules-changed` through
    // the record path exactly as it does through the scenario path, so a key that failed to reach
    // the comparator reds on that key.
    //
    // `appDefaultVersion` IS NOT — and cannot be, today. staleness.ts keys the spine clock on the
    // SAVED era being a KNOWN one (`appDefaultEraFor`), and `ERAS` holds exactly ONE entry
    // (`p2-d1`, which IS `CURRENT_APP_DEFAULT_VERSION`), so `appDefaultMoved` is FALSE on both
    // sides of every assertion above no matter what this overlay does with the key. A verifier
    // proved it: deleting `appDefaultVersion` from the overlay left the ENTIRE suite green.
    // That key is pinned STRUCTURALLY instead — `savedRecommendation.ts` types the overlay as
    // `Required<Pick<ScenarioV3, keyof SavedRecommendationEraV3>>`, so omitting it is a COMPILE
    // error (TS2741), not a green run. A behavioural arm for it can only exist once a SECOND era
    // ships; until then the compiler is the only honest gate, and pretending otherwise here would
    // be the vacuous-assertion class this file exists to refuse.
    expect(firedCount).toBe(4)
  })

  it('household FACTS still come from the CURRENT scenario — only the five era fields are overlaid (the record does not freeze who the household is)', () => {
    // The era overlay must not smuggle the record's world into the household's identity: the
    // budget windows, people and start year that gate the clocks are TODAY's.
    const s = freshSave()
    const status = statusOf(s, recordFor(s))
    const live = deriveStaleness(s, TODAY)
    expect(status.eraStaleness.wallYear).toBe(live.wallYear)
    expect(status.eraStaleness.elapsed).toEqual(live.elapsed)
    expect(status.eraStaleness.budget.expiredLines).toEqual(live.budget.expiredLines)
  })

  it('`rulesMoved`, NOT `anyStale`: a LAPSED BUDGET WINDOW raises anyStale but must NOT demote the recommendation (alarm-when-fine on a byte-identical recompute)', () => {
    const r = scenarioFromDraft(DEV_SEEDS.budget)
    if (!r.ready) throw new Error('DEV_SEEDS.budget should be save-ready')
    const s = r.scenario
    // Age the plan's build year past a time-boxed line's window — the spine-route calendar prompt.
    const lapsed: ScenarioV3 = {
      ...s,
      startCalendarYear: s.startCalendarYear - 40,
      budget: (s.budget ?? []).map((line, i) => (i === 0 ? { ...line, endYear: 1 } : line)),
    }
    const live = deriveStaleness(lapsed, TODAY)
    // The fixture must actually raise anyStale WITHOUT rulesMoved, or this arm proves nothing.
    expect(live.budget.expiredLines.length).toBeGreaterThan(0)
    expect(live.anyStale).toBe(true)
    expect(live.rulesMoved).toBe(false)
    const status = statusOf(lapsed, recordFor(lapsed))
    expect(status.current).toBe(true)
    expect(status.causes).toEqual([])
  })
})

describe('the trichotomy — INSIGHT 101: every cause, never the first one found', () => {
  it('all three broken ⇒ all three named, in the stable declaration order', () => {
    // A warning that names ONE cause when three hold describes its poster child, not the
    // predicate's extension — and S4's copy register composes directly off this array.
    const s = freshSave()
    const record = recordFor(s, {
      solverCodeVersion: SOLVER_CODE_VERSION + 1,
      era: {
        ...eraOf(s),
        appDefaultVersion: 'defaults-2026-05',
        taxVintageDetail: { taxYear: s.taxVintageDetail!.taxYear - 1, legalBasis: 'TCJA (pre-OBBBA)' },
      },
    })
    const status = statusOf(s, record, 'a-completely-different-fingerprint')
    expect(status.current).toBe(false)
    expect(status.causes).toEqual(['inputs-changed', 'solver-changed', 'rules-changed'])
  })

  it('the UNAVAILABLE variant also reports its siblings (the fail-closed arm is not a short-circuit)', () => {
    const s = freshSave()
    const status = statusOf(s, recordFor(s, { solverCodeVersion: SOLVER_CODE_VERSION + 3 }), null)
    expect(status.causes).toEqual(['inputs-unavailable', 'solver-changed'])
  })

  it('exactly two broken ⇒ exactly those two (no phantom third, no dropped second)', () => {
    const s = freshSave()
    const record = recordFor(s, {
      era: {
        ...eraOf(s),
        healthcareVintage: { ...s.healthcareVintage!, partBStandardMonthly: s.healthcareVintage!.partBStandardMonthly + 10 },
      },
    })
    const status = statusOf(s, record, 'moved')
    expect(status.causes).toEqual(['inputs-changed', 'rules-changed'])
  })

  it('`causes` is EMPTY iff `current` — the two can never disagree', () => {
    const s = freshSave()
    for (const [record, fp] of [
      [recordFor(s), FINGERPRINT],
      [recordFor(s), null],
      [recordFor(s, { solverCodeVersion: SOLVER_CODE_VERSION + 1 }), FINGERPRINT],
    ] as const) {
      const status = statusOf(s, record, fp)
      expect(status.current).toBe(status.causes.length === 0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE ERA MUST BE WHOLE — the fail-OPEN hole this battery replaces.
//
// This file used to assert the OPPOSITE: that a record whose era OMITTED stamps the scenario
// carried was `current: true`, on the scenario-level "absent = not-comparable, keep that clock
// quiet" contract. That premise does not transplant, and the assertion was the defect's second
// copy. THE SCENARIO's absent stamp has a real population — a pre-U13 vault was written by a
// build that had no stamp to write, so judging it against one would be fabricating a comparison.
// THE RECORD is born at U17, minted from a `scenarioFromDraft` scenario that writes all four
// stamps unconditionally at every save; there is no stampless population. And the cost of the
// tolerance is total: EVERY `deriveStaleness` clock is gated on `saved… !== undefined`, so an
// era of `{ appDefaultVersion }` alone pins `rulesMoved: false` FOREVER — conjunct 3 answers "no
// rules moved" however far the law drifts, and the record re-presents as CURRENT. Conjunct 1
// cannot backstop it: `solverRunFingerprint` EXCLUDES the constant vintages by design, which is
// the entire reason conjunct 3 exists.
//
// So the gate is the CODEC's, and it is fail-CLOSED — the record is refused and the atom drops,
// matching conjunct 1's own treatment of the unanswerable case ('inputs-unavailable'). These arms
// live in the trichotomy's own file because the hole they close is a trichotomy hole.
// ─────────────────────────────────────────────────────────────────────────────────────────────
describe('the record’s era is REQUIRED WHOLE — a partial era never reaches the trichotomy', () => {
  /** The vault bytes for a scenario carrying `record`, with the era replaced wholesale. */
  const vaultWithEra = (s: ScenarioV3, era: unknown): Uint8Array => {
    const withRecord: ScenarioV3 = { ...s, savedRecommendation: recordFor(s) }
    const obj = JSON.parse(new TextDecoder().decode(encodeScenario(withRecord))) as Record<string, unknown>
    ;(obj.savedRecommendation as Record<string, unknown>).era = era
    return new TextEncoder().encode(JSON.stringify(obj))
  }

  it('a record carrying ONLY appDefaultVersion is REJECTED at the codec: the atom is dropped and the drop is REPORTED (it would otherwise pin every rulebook clock quiet forever)', () => {
    const s = freshSave()
    const decoded = decodeScenario(vaultWithEra(s, { appDefaultVersion: s.appDefaultVersion }))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.scenario.schemaVersion !== 3) throw new Error('the vault must still open')
    expect(decoded.scenario.savedRecommendation).toBeUndefined()
    expect('savedRecommendation' in decoded.scenario).toBe(false)
    expect(decoded.droppedAtoms).toHaveLength(1)
    expect(decoded.droppedAtoms[0]).toMatch(/^savedRecommendation: /)
  })

  it.each(['taxVintageDetail', 'stateTaxVintage', 'healthcareVintage', 'dateVintage'] as const)(
    'a record missing ONLY %s is rejected too — each stamp is individually load-bearing (its clock is the one that would go quiet)',
    (missing) => {
      const s = freshSave()
      const era: Record<string, unknown> = { ...eraOf(s) }
      delete era[missing]
      const decoded = decodeScenario(vaultWithEra(s, era))
      expect(decoded.ok).toBe(true)
      if (!decoded.ok || decoded.scenario.schemaVersion !== 3) throw new Error('the vault must still open')
      expect(decoded.scenario.savedRecommendation).toBeUndefined()
      // The codec's own reason names the missing stamp — S5's refusal quotes it verbatim.
      expect(decoded.droppedAtoms[0]).toContain(missing)
    },
  )

  it('THE DROP IS NON-FATAL: the plan itself opens INTACT beside the refused record (the record is a memory, the plan is the asset)', () => {
    // The other half of fail-closed. Refusing the record must never cost the household their
    // balances, budget lines and dates — both unlock paths map a `corrupt` decode to the terminal
    // data-damaged door, so a whole-vault reject here would be catastrophic over-reaction.
    const s = freshSave()
    const decoded = decodeScenario(vaultWithEra(s, { appDefaultVersion: s.appDefaultVersion }))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    // Byte-identical to the record-free vault: the drop is surgical, nothing else was touched.
    expect(decoded.scenario).toEqual(s)
  })

  it('the COMPLETE era still round-trips clean and still reads CURRENT — the rejection did not widen into refusing real records', () => {
    // Non-vacuity (burned/070): every arm above passes trivially against a codec that dropped
    // EVERY record. This is the arm that proves it drops only the stampless ones.
    const s = freshSave()
    const decoded = decodeScenario(vaultWithEra(s, eraOf(s)))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.scenario.schemaVersion !== 3) throw new Error('the vault must open')
    expect(decoded.droppedAtoms).toEqual([])
    const record = decoded.scenario.savedRecommendation
    expect(record).toBeDefined()
    if (record === undefined) return
    expect(statusOf(s, record).current).toBe(true)
  })
})

describe('the trichotomy — purity', () => {
  it('is a deterministic function of its inputs: the same (record, scenario, fingerprint, day) yields an equal status twice, and a DIFFERENT injected day is honored', () => {
    const s = freshSave()
    const record = recordFor(s)
    const a = deriveSavedRecommendationStatus({ record, scenario: s, freshFingerprint: FINGERPRINT, todayEpochDay: TODAY })
    const b = deriveSavedRecommendationStatus({ record, scenario: s, freshFingerprint: FINGERPRINT, todayEpochDay: TODAY })
    expect(a).toEqual(b)
    // The injected clock genuinely reaches the era report (no hidden `new Date()` inside).
    const future = deriveSavedRecommendationStatus({
      record,
      scenario: s,
      freshFingerprint: FINGERPRINT,
      todayEpochDay: TODAY + 4_000,
    })
    expect(future.eraStaleness.wallYear).toBeGreaterThan(a.eraStaleness.wallYear)
  })
})
