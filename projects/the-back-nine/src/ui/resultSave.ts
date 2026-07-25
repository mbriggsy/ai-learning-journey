/**
 * The edit-and-re-save DECISION as a pure seam (insight 048 — IntakeApp's render path is not
 * drivable in jsdom, so the honesty-critical state machine lives here, planted-fail tested).
 *
 * This retires the U8-review finding ②'s interim sticky-`saved` guard. The old shape had ONE
 * boolean and ONE save path (the firstSave ceremony), so a saved-then-edited plan either
 * re-offered the ceremony — which `firstSave` refuses with 'not-locked', mapped to a lying
 * "Saving didn't finish. Try again." — or hid the edit behind a stale badge. The machine below
 * makes both dead-ends UNREPRESENTABLE: once a vault exists (`persist.kind !== 'unsaved'`) the
 * derived view can never be 'first', so the ceremony is unreachable; and 'clean' is not a
 * sticky flag but a LIVE comparison of the current answer against what is actually on disk.
 *
 * DIRTY IS COMPUTED, NEVER TRACKED: both scenarios come out of `scenarioFromDraft` (which
 * round-trips the codec) and are compared on `scenarioIdentity` — the scenario MINUS the
 * `savedAt` wall-time stamp (P3·U13: scenarioFromDraft stamps a fresh epoch-day per encode,
 * so a raw compare would read an untouched session as dirty the day after its save — the
 * badge would lie about mouse activity, the exact thing this machine exists to never do).
 * An edit that changes nothing, or is edited back, reads clean — the badge tells the truth
 * about the DISK, not about mouse activity. That law holds from the 'save-failed' state
 * too: editing back to the on-disk answer clears the failure alert (nothing is unfinished
 * once the disk matches — alarm-when-fine is a lie in the safe direction, still a lie).
 *
 * THE COMPARE IS KEY-ORDER-INSENSITIVE (U17·S3, correcting this header's own old claim). It
 * used to read `JSON.stringify(scenarioIdentity(a)) === JSON.stringify(scenarioIdentity(b))`,
 * justified here by *"decodeScenario builds every object."* IT DOES NOT: `scenarioCodec.ts`'s v3
 * arm is a validated PASS-THROUGH CAST of `JSON.parse`'s output — the codec constructs nothing,
 * and the key order it "guarantees" is really `JSON.parse` preserving the source text's order,
 * which nothing pins. Worse, one operand is already re-ordered in practice: `IntakeApp`'s
 * persist-seed reconstruction destructures `savedAt` off and re-appends it, moving that key to
 * LAST on the disk side only (it survives today solely because `scenarioIdentity` then strips
 * that very key). A future field-order change in `encodeScenario` would silently flip an
 * untouched session to a permanently-dirty badge. So the DEPENDENCY is gone rather than
 * documented: `scenarioIdentityKey` (model.ts) canonicalizes with SORTED object keys — while
 * keeping ARRAY order, because a real people/budget/drawdown reorder MUST still read dirty.
 */
import { scenarioIdentityKey, type ScenarioV3 } from '@shared/model'
import { epochDayToCalendarYear } from '@store/staleness'
import type { SaveReady } from './scenarioFromDraft'
import type { ResaveCopyKey } from './unlockCopy'

/** What is on disk, as IntakeApp tracks it. `scenario` is always the LAST COMMITTED model
 *  (during 'saving' and after 'save-failed' the disk still holds the previous commit). */
export type PersistState =
  | { readonly kind: 'unsaved' }
  | { readonly kind: 'saved'; readonly scenario: ScenarioV3 }
  | { readonly kind: 'saving'; readonly scenario: ScenarioV3 }
  | { readonly kind: 'save-failed'; readonly scenario: ScenarioV3; readonly errorKey: ResaveCopyKey }

/** The Result screen's save slot, handler-free (IntakeApp attaches the callbacks). */
export type ResultSaveView =
  | { readonly kind: 'none' } // not persistable (incomplete answer) — no claim either way
  | { readonly kind: 'first' } // no vault yet — the firstSave ceremony CTA
  | { readonly kind: 'clean' } // disk matches the current answer — the saved badge
  | { readonly kind: 'dirty' } // disk is BEHIND the current answer — the re-save CTA
  | { readonly kind: 'saving' } // update write in flight
  | { readonly kind: 'failed'; readonly errorKey: ResaveCopyKey } // last re-save refused — alert + retry

/** Disk-identity on everything EXCEPT the wall-time stamp, compared on the CANONICAL key (the
 *  ONE shared normalizer — model.ts `scenarioIdentityKey`, which wraps the same
 *  `scenarioIdentity` the round-trip guard uses). Two scenarios with identical content in a
 *  different key order are the SAME answer and must read clean; a nested VALUE difference — or a
 *  reordered people/budget/drawdown ARRAY — must still read dirty. See the header. */
const sameScenario = (a: ScenarioV3, b: ScenarioV3): boolean =>
  scenarioIdentityKey(a) === scenarioIdentityKey(b)

export function deriveResultSave(persist: PersistState, ready: SaveReady, readOnly = false): ResultSaveView {
  // A READ-ONLY session (a 2nd tab holds the writer — captured ONCE at unlock, session.ts) has no
  // functioning save surface: `session.save()` REFUSES (not-writable → "reload to edit"), so a
  // 'dirty' CTA here is the same lying dead-end the edit-and-re-save machine exists to retire, and a
  // 'clean' badge would claim a save THIS tab never made. Make no claim at all — App's standing
  // View-only banner is the whole disclosure. This overrides every disk state, so an edit in a
  // read-only session can NEVER derive the dirty CTA (the U8-review read-only-verdict fix).
  if (readOnly) return { kind: 'none' }
  // An incomplete answer can't be compared OR saved: make no claim (never a stale "Saved"
  // badge over an answer that no longer matches the disk, never a CTA that can't build a
  // scenario). The intact vault is untouched; completing the answer re-derives honestly.
  if (!ready.ready) return { kind: 'none' }
  switch (persist.kind) {
    case 'unsaved':
      return { kind: 'first' }
    case 'saving':
      return { kind: 'saving' }
    case 'save-failed':
      // An edit BACK to what is on disk clears the failure honestly: `persist.scenario` is
      // provably the on-disk model (session.save installs it only on {ok:true}), so a matching
      // answer has nothing unfinished to report — keeping the alert would be alarm-when-fine
      // (ultramode 2026-07-02). A STILL-different draft stays 'failed': its retry IS the CTA,
      // so surfacing 'dirty' there would just duplicate the affordance under a vaguer label.
      return sameScenario(ready.scenario, persist.scenario)
        ? { kind: 'clean' }
        : { kind: 'failed', errorKey: persist.errorKey }
    case 'saved':
      return sameScenario(ready.scenario, persist.scenario)
        ? { kind: 'clean' }
        : { kind: 'dirty' }
    default: {
      const _exhaustive: never = persist
      throw new Error(`deriveResultSave: unmapped persist state ${String(_exhaustive)}`)
    }
  }
}

/**
 * THE PERSIST SEED for a decrypt-on-return hydrate — ONE producer, called by IntakeApp.
 *
 * WHAT IT DOES. `scenarioFromDraft` re-stamps a FRESH `savedAt` on every encode, but
 * `PersistState.scenario`'s contract is "the LAST COMMITTED model", and `agedBalancesYearFor`
 * (below) reads its `savedAt` as the year the household's numbers were ENTERED. Seeding the fresh
 * stamp silently killed the aged-balances clause on every hydrated vault (review 2026-07-10). So
 * the normalized scenario supplies every field EXCEPT the stamp, and the DISK's own `savedAt` is
 * re-attached — or, for a legacy vault that has none, omitted entirely (suppression over
 * fabrication; `agedBalancesYearFor` already treats an absent stamp as "make no claim").
 *
 * WHY IT IS EXPORTED RATHER THAN INLINE IN THE COMPONENT. It used to be four lines inside
 * `IntakeApp.tsx`, and the test that claimed to exercise it RE-TYPED those four lines under a
 * comment saying it matched. That is this repo's named landmine verbatim — *"a copy of a
 * producer's arithmetic under a comment claiming it matches IS NOT A PIN"* — and it is what cost
 * stage S0 a failed verification (a `+ 3` planted in the component left 1096 tests green). The
 * reconstruction lives here, at the persistence seam (insight 048: the honesty-critical decisions
 * come out of the un-drivable render path into a pure, planted-fail-testable module), and the test
 * calls THIS. Calling it from a test still proves only the FUNCTION — a SOURCE-BIND arm on the
 * consumer (`draftFromScenario.test.ts`) is what proves IntakeApp still calls it (insights
 * 032/081).
 *
 * The key ORDER this produces differs from the normalized scenario's (`savedAt` moves to last).
 * That is harmless BY CONSTRUCTION, not by luck: the dirty compare goes through
 * `scenarioIdentityKey`, which sorts keys — see the header.
 */
export function persistSeedFor(normalized: ScenarioV3, diskSavedAt: number | undefined): ScenarioV3 {
  const { savedAt: _freshStamp, ...diskIdentity } = normalized
  return diskSavedAt !== undefined ? { ...diskIdentity, savedAt: diskSavedAt } : diskIdentity
}

/**
 * The aged-balances clause's HONEST year (review 2026-07-10, the caveat's year-source catch):
 * the year the rendered numbers were ENTERED is the persist machine's own saved scenario's
 * `savedAt` — NEVER `startCalendarYear`, which is the plan's BUILD year, survives every
 * re-save untouched, and mislabels a re-saver (staleness.ts's own documented law). Present
 * ONLY while the current answer still MATCHES that save (view 'clean' over persist 'saved'):
 * an in-session edit (dirty) or a completed re-save (fresh savedAt) each make the "as you
 * entered them in YEAR" claim false, and the machine's own state carries exactly that truth —
 * no second bookkeeping. A legacy vault (no savedAt) SUPPRESSES rather than fabricates; a
 * same-year save (wallYear − saveYear < 1) is not aged and stays quiet.
 */
export function agedBalancesYearFor(
  persist: PersistState,
  view: ResultSaveView,
  todayEpochDay: number,
): number | undefined {
  if (view.kind !== 'clean' || persist.kind !== 'saved') return undefined
  const savedAt = persist.scenario.savedAt
  if (savedAt === undefined) return undefined
  const saveYear = epochDayToCalendarYear(savedAt)
  return epochDayToCalendarYear(todayEpochDay) - saveYear >= 1 ? saveYear : undefined
}
