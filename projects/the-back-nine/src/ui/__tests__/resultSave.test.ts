import { describe, expect, it } from 'vitest'
import { agedBalancesYearFor, deriveResultSave, unsavedWorkPending, type PersistState } from '../resultSave'
import { scenarioFromDraft, currentEpochDay, type SaveReady } from '../scenarioFromDraft'
import { DEV_SEEDS, doctorRecordHolds, doctorRecordSuperseded } from '../devSeeds'
import { scenarioIdentity, type SavedRecommendationV3, type ScenarioV3 } from '@shared/model'

/**
 * The edit-and-re-save machine (resultSave.ts) — the pure seam that retires the U8-review ②
 * interim sticky-`saved`. The load-bearing laws:
 *   1. Once a vault exists, 'first' (the firstSave ceremony) is UNREPRESENTABLE — the
 *      'not-locked' → "Try again" lying dead-end has no path to the screen.
 *   2. 'clean' is a live comparison against the DISK, not a sticky flag: an edit dirties it,
 *      editing back cleans it.
 *   3. An incomplete answer makes NO claim (never a stale badge, never an unbuildable CTA).
 */
function readyFor(seed: keyof typeof DEV_SEEDS): Extract<SaveReady, { ready: true }> {
  const r = scenarioFromDraft(DEV_SEEDS[seed])
  if (!r.ready) throw new Error(`DEV_SEEDS.${seed} should be a ready draft`)
  return r
}

const retired = readyFor('retired')
const borderline = readyFor('borderline')
const notReady: SaveReady = { ready: false, detail: 'incomplete' }

/**
 * TWO REAL SAVED-RECOMMENDATION RECORDS for this same household — lifted off the shipped `?vault=rec`
 * / `?vault=recold` plants, i.e. minted by `mintSavedRecommendation` over a `solverRunFingerprint`
 * the engine's own producer computed for this draft. NOT hand-typed (DND 012): the era snapshot is
 * fifteen dated fields and the fingerprint is an opaque canon serialization, so a literal would pin
 * a fiction the moment either producer moved — and both are inside the identity key this file's
 * compare walks. They differ in the two fields the plants differ in (identity + ranking-code
 * version), which is what makes A-vs-B a real edit rather than a typo.
 */
function recordFromPlant(doctor: (s: ScenarioV3, today: number) => ScenarioV3): SavedRecommendationV3 {
  const record = doctor(retired.scenario, currentEpochDay()).savedRecommendation
  if (record === undefined) throw new Error('the record plants exist to produce a record')
  return record
}
const recordA = recordFromPlant(doctorRecordHolds)
const recordB = recordFromPlant(doctorRecordSuperseded)

/** The LIVE operand, built the way a real save builds it: the record goes on the DRAFT and the
 *  whole thing goes through `scenarioFromDraft`'s codec round-trip. Hand-assembling a `SaveReady`
 *  here would bypass the codec entirely — see the dropped-record block's header. */
function liveWith(record: SavedRecommendationV3): Extract<SaveReady, { ready: true }> {
  const r = scenarioFromDraft({ ...DEV_SEEDS.retired, savedRecommendation: record })
  if (!r.ready) throw new Error(`the retired draft must stay save-ready with a record on it: ${r.detail}`)
  return r
}

describe('deriveResultSave — the edit-and-re-save machine', () => {
  it('no vault yet + a ready answer → the firstSave ceremony CTA', () => {
    expect(deriveResultSave({ kind: 'unsaved' }, retired)).toEqual({ kind: 'first' })
  })

  it('a hydrated/saved session whose answer matches the disk → clean (the decrypt-on-return dead-end fix)', () => {
    // scenarioFromDraft is deterministic — the same draft yields byte-identical JSON, so the
    // comparison this machine rests on cannot false-dirty an untouched session.
    expect(JSON.stringify(readyFor('retired').scenario)).toBe(JSON.stringify(retired.scenario))
    const persist: PersistState = { kind: 'saved', scenario: retired.scenario }
    expect(deriveResultSave(persist, retired)).toEqual({ kind: 'clean' })
  })

  it('an edit that changes the answer → dirty; editing BACK → clean again (live comparison, never a sticky flag)', () => {
    const persist: PersistState = { kind: 'saved', scenario: retired.scenario }
    expect(deriveResultSave(persist, borderline)).toEqual({ kind: 'dirty' })
    expect(deriveResultSave(persist, retired)).toEqual({ kind: 'clean' })
  })

  it('U13 — an untouched session over a vault saved on an EARLIER day reads clean (the scenarioIdentity normalizer; a raw byte compare would false-dirty every next-day return)', () => {
    // The disk carries the save-day stamp; today's re-derived answer carries today's. Identical
    // content must still read clean — savedAt is wall-time provenance, not an edit.
    const monthOld: PersistState = {
      kind: 'saved',
      scenario: { ...retired.scenario, savedAt: (retired.scenario.savedAt ?? 20_000) - 30 },
    }
    expect(deriveResultSave(monthOld, retired)).toEqual({ kind: 'clean' })
    // PLANTED-FAIL companion: the normalizer strips ONLY savedAt — a real content edit on the
    // same old vault still reads dirty (the normalizer must never widen into content-blindness).
    expect(deriveResultSave(monthOld, borderline)).toEqual({ kind: 'dirty' })
    // The save-failed arm rides the same normalizer: an old-day disk + matching content clears.
    const failedOld: PersistState = {
      kind: 'save-failed',
      scenario: { ...retired.scenario, savedAt: (retired.scenario.savedAt ?? 20_000) - 30 },
      errorKey: 'saveErrorFailed',
    }
    expect(deriveResultSave(failedOld, retired)).toEqual({ kind: 'clean' })
  })

  it('a READ-ONLY session derives NO save CTA for ANY disk state — the View-only banner is the whole disclosure (the read-only-verdict fix)', () => {
    // A 2nd tab holds the writer, so session.save() would REFUSE: a 'dirty' CTA is a lying dead-end
    // and a 'clean' badge would claim a save THIS tab never made. Every disk state collapses to 'none'.
    const saved: PersistState = { kind: 'saved', scenario: retired.scenario }
    // read-only + DIRTY → no CTA (the exact case an edit in a 2nd tab hit before this fix)
    expect(deriveResultSave(saved, borderline, true)).toEqual({ kind: 'none' })
    // read-only + a would-be-'clean' matching answer still makes no claim (no misleading Saved badge)
    expect(deriveResultSave(saved, retired, true)).toEqual({ kind: 'none' })
    // read-only + a would-be re-save failure is suppressed too — no retry that can never succeed
    const failed: PersistState = { kind: 'save-failed', scenario: retired.scenario, errorKey: 'saveErrorFailed' }
    expect(deriveResultSave(failed, borderline, true)).toEqual({ kind: 'none' })
  })

  it('the read-only flag is NOT a global mute — a WRITABLE dirty edit still derives the re-save CTA', () => {
    const saved: PersistState = { kind: 'saved', scenario: retired.scenario }
    // Explicit writable session: the CTA is unchanged from the flag being off.
    expect(deriveResultSave(saved, borderline, false)).toEqual({ kind: 'dirty' })
    // …and the default (2-arg) call is writable — read-only is opt-in, never the fallthrough.
    expect(deriveResultSave(saved, borderline)).toEqual({ kind: 'dirty' })
  })

  it('THE DEAD-END LOCK: once a vault exists, the ceremony can never be offered again', () => {
    const persists: PersistState[] = [
      { kind: 'saved', scenario: retired.scenario },
      { kind: 'saving', scenario: retired.scenario },
      { kind: 'save-failed', scenario: retired.scenario, errorKey: 'saveErrorFailed' },
    ]
    for (const persist of persists) {
      for (const ready of [retired, borderline, notReady]) {
        expect(deriveResultSave(persist, ready).kind, `${persist.kind} must never yield 'first'`).not.toBe('first')
      }
    }
  })

  it('saving and save-failed pass through with the failure copy key intact', () => {
    expect(deriveResultSave({ kind: 'saving', scenario: retired.scenario }, borderline)).toEqual({ kind: 'saving' })
    expect(
      deriveResultSave({ kind: 'save-failed', scenario: retired.scenario, errorKey: 'saveErrorReadOnly' }, borderline),
    ).toEqual({ kind: 'failed', errorKey: 'saveErrorReadOnly' })
  })

  it('an edit BACK to the on-disk answer clears a save failure (the disk matches — the alert would be alarm-when-fine)', () => {
    const persist: PersistState = { kind: 'save-failed', scenario: retired.scenario, errorKey: 'saveErrorFailed' }
    expect(deriveResultSave(persist, retired)).toEqual({ kind: 'clean' })
    // A STILL-different draft keeps the failure — its retry is the CTA.
    expect(deriveResultSave(persist, borderline)).toEqual({ kind: 'failed', errorKey: 'saveErrorFailed' })
  })

  it('clean is STRUCTURAL equality, never reference identity — distinct-but-equal instances read clean (kills the reference-equality mutant)', () => {
    // Production never compares the same instance: persist.scenario is captured at save/hydrate
    // while ready.scenario is freshly re-derived each render. A mutant downgrading the JSON
    // comparison to `===` would make a genuinely-saved plan nag "Save your changes" forever.
    const other = readyFor('retired')
    expect(other.scenario).not.toBe(retired.scenario) // distinct instances, same content
    expect(deriveResultSave({ kind: 'saved', scenario: other.scenario }, retired)).toEqual({ kind: 'clean' })
  })

  it('an incomplete answer makes NO claim regardless of the disk state', () => {
    expect(deriveResultSave({ kind: 'unsaved' }, notReady)).toEqual({ kind: 'none' })
    expect(deriveResultSave({ kind: 'saved', scenario: retired.scenario }, notReady)).toEqual({ kind: 'none' })
  })
})

// The aged-balances clause's year derivation (review 2026-07-10): the honest anchor is the
// persist machine's own saved scenario's savedAt — never startCalendarYear (the BUILD year,
// which survives every re-save and mislabels a household that just updated its numbers).
describe('agedBalancesYearFor — the honest entered-in year', () => {
  const day = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  const TODAY = day(2026, 7, 10)
  const savedIn = (savedAt: number | undefined): PersistState => ({
    kind: 'saved',
    scenario: savedAt === undefined ? (({ savedAt: _s, ...rest }) => rest)(retired.scenario) as typeof retired.scenario : { ...retired.scenario, savedAt },
  })
  const CLEAN = { kind: 'clean' } as const
  const DIRTY = { kind: 'dirty' } as const

  it('a clean answer over a save from an EARLIER calendar year names that year', () => {
    expect(agedBalancesYearFor(savedIn(day(2024, 5, 1)), CLEAN, TODAY)).toBe(2024)
    expect(agedBalancesYearFor(savedIn(day(2025, 12, 31)), CLEAN, TODAY)).toBe(2025) // one year is enough
  })

  it('a same-year save is not aged — no clause', () => {
    expect(agedBalancesYearFor(savedIn(day(2026, 1, 2)), CLEAN, TODAY)).toBeUndefined()
  })

  it('an in-session EDIT (dirty view) suppresses the clause — the rendered numbers are no longer the save', () => {
    expect(agedBalancesYearFor(savedIn(day(2024, 5, 1)), DIRTY, TODAY)).toBeUndefined()
  })

  it('a legacy vault (no savedAt) SUPPRESSES rather than fabricates (the staleness reader law)', () => {
    expect(agedBalancesYearFor(savedIn(undefined), CLEAN, TODAY)).toBeUndefined()
  })

  it('a clean view over a non-saved persist (edit-back after a failed re-save) makes no claim', () => {
    const failed: PersistState = {
      kind: 'save-failed',
      scenario: { ...retired.scenario, savedAt: day(2024, 5, 1) },
      errorKey: 'saveErrorFailed',
    }
    expect(agedBalancesYearFor(failed, CLEAN, TODAY)).toBeUndefined()
  })

  it('the POST-UPDATE household reads NO stale claim: a re-save stamps a fresh savedAt and the clause dies with it (the review scenario)', () => {
    // Built 2024, updated + re-saved today: the persist scenario now carries TODAY's stamp,
    // whatever startCalendarYear still says.
    expect(agedBalancesYearFor(savedIn(TODAY), CLEAN, TODAY)).toBeUndefined()
  })
})

/**
 * THE KEY-ORDER LAW (U17·S3·D5) — the CONSUMER-side arm. `model.test.ts` proves
 * `scenarioIdentityKey` itself is order-canonical; only this file can prove `deriveResultSave`
 * still ROUTES THROUGH IT (insight 032/081: calling a shared function from a test proves the
 * function, never that the consumer still calls it).
 *
 * WHY IT MATTERS. The old compare was `JSON.stringify(scenarioIdentity(a)) === …(b)`, defended by
 * a comment claiming `decodeScenario` builds every object. It does not — `scenarioCodec.ts`'s v3
 * arm is a validated PASS-THROUGH CAST of `JSON.parse` output. The compare rested on `JSON.parse`
 * preserving source key order, which nothing pins, while IntakeApp's persist-seed reconstruction
 * already re-orders one operand's keys. The arm below is NON-VACUOUS by construction: it FAILS
 * against that old implementation (the witness assertion states so explicitly).
 */
describe('deriveResultSave — the dirty compare is key-order-INSENSITIVE (never a badge that lies about the disk)', () => {
  /** A legal JSON re-serialization: the same content with every object's keys reversed. */
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

  it('(a) a disk operand whose keys are in a DIFFERENT order reads CLEAN — and the raw-stringify compare it replaced would read DIRTY (the arm witnesses the fix, not the accident)', () => {
    const reordered = reverseKeys(retired.scenario)
    const persist: PersistState = { kind: 'saved', scenario: reordered }
    expect(deriveResultSave(persist, retired)).toEqual({ kind: 'clean' })
    // THE NON-VACUITY WITNESS: the OLD mechanism disagrees on this very pair, so a revert to
    // `JSON.stringify(scenarioIdentity(...))` inside sameScenario turns the assertion above RED.
    expect(JSON.stringify(scenarioIdentity(retired.scenario))).not.toBe(
      JSON.stringify(scenarioIdentity(reordered)),
    )
    // The same law from the save-failed state (it runs the identical comparator).
    const failed: PersistState = { kind: 'save-failed', scenario: reordered, errorKey: 'saveErrorFailed' }
    expect(deriveResultSave(failed, retired)).toEqual({ kind: 'clean' })
  })

  it('(b) a NESTED VALUE difference under a reordered disk operand still reads DIRTY — order-blindness never widened into content-blindness', () => {
    const edited: ScenarioV3 = { ...retired.scenario, annualSpendingReal: retired.scenario.annualSpendingReal + 1 }
    const persist: PersistState = { kind: 'saved', scenario: reverseKeys(edited) }
    expect(deriveResultSave(persist, retired)).toEqual({ kind: 'dirty' })
    // …and a deep, nested edit (a person's claim age) under the same reordering.
    const deepEdited: ScenarioV3 = {
      ...retired.scenario,
      people: [
        { ...retired.scenario.people[0]!, socialSecurityClaimAge: retired.scenario.people[0]!.socialSecurityClaimAge + 1 },
        retired.scenario.people[1]!,
      ],
    }
    expect(deriveResultSave({ kind: 'saved', scenario: reverseKeys(deepEdited) }, retired)).toEqual({ kind: 'dirty' })
  })

  it('a REORDERED people array is a real edit and still reads DIRTY (arrays keep their order — sorting them would make swapping the spouses read clean)', () => {
    const swapped: ScenarioV3 = {
      ...retired.scenario,
      people: [retired.scenario.people[1]!, retired.scenario.people[0]!],
    }
    expect(deriveResultSave({ kind: 'saved', scenario: swapped }, retired)).toEqual({ kind: 'dirty' })
  })

  it('the saved-recommendation record participates in the compare: same plan, a DIFFERENT remembered record reads DIRTY (a mint is a real change to what is on disk)', () => {
    // BOTH records are REAL MINTS (the `?vault=rec` / `?vault=recold` plants' own doctors — the
    // shipped `mintSavedRecommendation` over the engine's own run-identity producer). A hand-typed
    // literal here would prove the codec's SHAPE gate and nothing about the era snapshot or the
    // identity string the compare actually walks (DND 012).
    const onDisk: ScenarioV3 = { ...retired.scenario, savedRecommendation: recordA }
    const live = liveWith(recordB)
    expect(live.droppedAtoms, 'the differing record must SURVIVE — a dropped one proves nothing here').toEqual([])
    expect(deriveResultSave({ kind: 'saved', scenario: onDisk }, live)).toEqual({ kind: 'dirty' })
    // …and an identical record on both sides (in a different key order) reads clean.
    const sameLive = liveWith(recordA)
    expect(deriveResultSave({ kind: 'saved', scenario: reverseKeys(onDisk) }, sameLive)).toEqual({ kind: 'clean' })
  })
})

/**
 * THE DROPPED-RECORD TRICHOTOMY (U17 §S5 step 14) — the badge's answer when the codec DELETES the
 * record on the way to the compare.
 *
 * WHY THE OPERAND IS BUILT THROUGH THE REAL PIPELINE AND NEVER HAND-WRITTEN. `deriveResultSave` does
 * not run the codec — it compares two `scenarioIdentityKey`s (resultSave.ts:63-64) — so a
 * hand-assembled `SaveReady` whose scenario simply LACKS a record would make every assertion below
 * pass against a hand-typed ABSENCE, while the mutant that matters (removing
 * `delete o.savedRecommendation`, scenarioCodec.ts:900) stayed green. Driving the live operand
 * through `scenarioFromDraft` — the SAME round-trip the real save runs — makes the delete itself the
 * thing under test: `droppedAtoms.length === 1` witnesses the codec REPORTING the drop, and the
 * absence assertion witnesses it MUTATING the object it returns.
 *
 * AND BOTH DIRECTIONS MATTER. "An invalid mint reads CLEAN" is TRUE — but only on a record-free
 * disk, where nothing was lost. Put a GOOD record on disk and the same invalid mint reads DIRTY,
 * and the reason is the data-loss case `IntakeApp`'s gesture header names: the codec deleted the
 * good record from the LIVE side only, so the household's next plan-save would write a record-FREE
 * scenario over it. Pinning only the calm direction would read as "a dropped record is harmless".
 */
describe('deriveResultSave — a record the codec DROPS, in all three disk states', () => {
  /** The same real mint with its epoch-DAY stamp replaced by epoch-MILLISECONDS: a finite integer
   *  that silently reads as year ~55000, which the codec's range gate refuses (insight 046). A
   *  REJECTED-BY-A-REAL-RULE record, never a shape this codec was never going to accept anyway. */
  const brokenRecord: SavedRecommendationV3 = { ...recordA, mintedAt: recordA.mintedAt * 86_400_000 }

  const dropped = liveWith(brokenRecord)
  const kept = liveWith(recordA)

  it('the codec REPORTS the drop and DELETES the atom from the object it returns (the witness the rest of this block rests on)', () => {
    // The save still PROCEEDS — the plan is never held hostage to a defect in our minting code
    // (scenarioFromDraft's own ruling) — but the atom is named on the way out…
    expect(dropped.ready, 'a bad record must never make the whole plan unsaveable').toBe(true)
    if (!dropped.ready) return
    expect(dropped.droppedAtoms, 'exactly one atom, named').toHaveLength(1)
    expect(dropped.droppedAtoms[0]).toContain('savedRecommendation')
    expect(dropped.droppedAtoms[0]).toContain('mintedAt')
    // …and it is GONE from the returned scenario. MUTANT (delete the `delete` at
    // scenarioCodec.ts:867): the report still fires, this line reds, and case (b) below flips.
    expect(dropped.scenario.savedRecommendation).toBeUndefined()
    // NON-VACUITY: the SAME pipeline keeps a valid record, so the drop above is the record being
    // bad — not this pipeline losing records.
    expect(kept.droppedAtoms).toEqual([])
    expect(kept.scenario.savedRecommendation).toEqual(recordA)
  })

  it('(a) a record-free disk + a VALID live record reads DIRTY — a mint IS a change to what the vault would hold', () => {
    expect(deriveResultSave({ kind: 'saved', scenario: retired.scenario }, kept)).toEqual({ kind: 'dirty' })
    // The disk operand really is record-free (the arm is not passing on a shared record).
    expect(retired.scenario.savedRecommendation).toBeUndefined()
  })

  it('(b) a record-free disk + a DROPPED live record reads CLEAN — nothing was lost, so nothing is unsaved', () => {
    // The calm direction, and it is honest ONLY here: the vault has no record, the codec threw the
    // bad one away, and the two post-codec operands genuinely describe the same plan. The gesture —
    // not this compare — is what owes the household the "we could not save the recommendation"
    // refusal (insight 100); the badge must not invent a second, contradictory claim about the plan.
    expect(deriveResultSave({ kind: 'saved', scenario: retired.scenario }, dropped)).toEqual({ kind: 'clean' })
  })

  it('(c) a disk HOLDING a valid record + a DROPPED live record reads DIRTY — because the GOOD record was deleted from the LIVE side, never because the mint landed', () => {
    // THE DATA-LOSS CASE. The vault holds a good record; the new mint is invalid, so the codec
    // deletes it from the live operand — and the two identity keys now differ by exactly that good
    // record. The badge reading DIRTY is what keeps the plan rail's re-save CTA on screen; what it
    // must never do is read CLEAN and let the household believe the vault still matches, one
    // plan-save away from a record-FREE scenario written over the record they had.
    const onDisk: ScenarioV3 = { ...retired.scenario, savedRecommendation: recordA }
    expect(deriveResultSave({ kind: 'saved', scenario: onDisk }, dropped)).toEqual({ kind: 'dirty' })
    // …and the direction is the record's, not the plan's: the same disk against the live operand
    // that KEPT that very record reads clean.
    expect(deriveResultSave({ kind: 'saved', scenario: onDisk }, kept)).toEqual({ kind: 'clean' })
  })
})

describe('unsavedWorkPending — the beforeunload guard’s one decision (would a reload lose typed work?)', () => {
  const saved: PersistState = { kind: 'saved', scenario: retired.scenario }
  const failed: PersistState = { kind: 'save-failed', scenario: retired.scenario, errorKey: 'saveErrorQuota' }

  it('no vault + a draft that has NOT moved from its baseline → nothing to lose', () => {
    expect(unsavedWorkPending({ kind: 'unsaved' }, retired, false)).toBe(false)
    expect(unsavedWorkPending({ kind: 'unsaved' }, notReady, false)).toBe(false)
  })

  it('no vault + a moved draft → armed, complete or not (a reload recovers nothing)', () => {
    expect(unsavedWorkPending({ kind: 'unsaved' }, retired, true)).toBe(true)
    expect(unsavedWorkPending({ kind: 'unsaved' }, notReady, true)).toBe(true)
  })

  it('a vault whose disk matches the current answer → nothing to lose, whatever the baseline says (disk-derived, never tracked)', () => {
    expect(unsavedWorkPending(saved, retired, true)).toBe(false)
    expect(unsavedWorkPending(saved, retired, false)).toBe(false)
  })

  it('a vault behind the current answer → armed (the same compare the dirty badge makes)', () => {
    expect(unsavedWorkPending(saved, borderline, false)).toBe(true)
  })

  it('a vault + an INCOMPLETE answer → armed (hydrate refuses a non-ready model, so a later !ready can only be typing)', () => {
    expect(unsavedWorkPending(saved, notReady, false)).toBe(true)
  })

  it('save-failed + an answer edited back to the disk → nothing to lose (alarm-when-fine is a lie in the safe direction)', () => {
    expect(unsavedWorkPending(failed, retired, false)).toBe(false)
    expect(unsavedWorkPending(failed, borderline, false)).toBe(true)
  })

  it('an in-flight re-save still holds the PREVIOUS commit on disk → armed until the write lands; the same answer → clean', () => {
    const saving: PersistState = { kind: 'saving', scenario: retired.scenario }
    expect(unsavedWorkPending(saving, borderline, false)).toBe(true)
    expect(unsavedWorkPending(saving, retired, false)).toBe(false)
  })
})
