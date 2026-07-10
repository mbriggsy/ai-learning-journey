import { describe, expect, it } from 'vitest'
import { agedBalancesYearFor, deriveResultSave, type PersistState } from '../resultSave'
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
