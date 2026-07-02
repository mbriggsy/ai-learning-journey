import { describe, expect, it } from 'vitest'
import { deriveResultSave, type PersistState } from '../resultSave'
import { scenarioFromDraft, type SaveReady } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'

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
