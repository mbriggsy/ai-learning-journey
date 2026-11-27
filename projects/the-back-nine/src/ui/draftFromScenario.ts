/**
 * U8 decrypt-on-return — the hydration inverse of {@link scenarioFromDraft} (SLICE 2 correctness
 * spine; council 2026-06-30, Fork D).
 *
 * On unlock, the session hands back the decoded `CurrentScenario` (`currentModel()`); the result screen
 * renders from the in-memory `ScenarioDraft` (`appModel`). This seam turns the one into the other so
 * the reload path can `appModel.update(() => hydrated.draft)` and recompute — exactly mirroring the
 * `?seed` hydration (IntakeApp), never a field-mapping layer that could drift from the codec.
 *
 * WHY IT'S ALMOST A CLEAN STRIP, PROVEN BY THE COMPILE. `memoryModel.ts:234-238` asserts, at
 * type-check time, that `keyof ScenarioDraft ⊆ keyof CurrentScenario` AND `keyof CurrentScenario ⊆ keyof
 * ScenarioDraft ∪ {schemaVersion}` — i.e. a `CurrentScenario` IS a `ScenarioDraft` plus the
 * `schemaVersion` discriminant. So the field SET is a shallow strip of that one key; every other
 * concrete value already satisfies the draft's wider Partial/hole-tolerant field types. (The strip also
 * drops the label, which is why a version-3 plan the codec relabeled leaves no trace here: the next
 * save writes the current version.)
 *
 * THE ONE ARITY GAP (why this returns a RESULT, not a bare draft). The draft types `people` as a
 * strict two-tuple (the married-couple model; single-user is deferred — TODO), but the codec only
 * gates `people.length >= 1` (scenarioCodec.ts:323 — it also validates the legacy v1/v2 degenerate
 * case). A vault WE wrote is always two-person (scenarioFromDraft encodes a two-tuple, GCM-
 * authenticated on disk), so the failure arm is defensive: a `!== 2` scenario is an unsupported shape
 * we refuse to silently coerce into the two-tuple (that would be the calm-but-wrong sin — dropping or
 * inventing a spouse on reload). The caller routes it to the same "use your backup" surface a damaged
 * decode takes.
 *
 * WHY THE HAPPY PATH IS CORRECTNESS-CRITICAL (the cardinal rule). A field dropped on the way back to
 * the draft would recompute a DIFFERENT scenario than the one saved — a calm-but-wrong reload. The
 * round-trip guard (`draftFromScenario.test.ts`) binds `scenarioFromDraft(draftFromScenario(v3))`
 * byte-identical to the saved `v3`, so no future field added to `CurrentScenario` can slip past the strip
 * untested. Fork D's reload-determinism (force the FINAL tier, never replay a persisted provisional
 * band) rides ON TOP of this: this seam proves the INPUT is identical; the engine's own determinism
 * (`simulate.test.ts`) proves the OUTPUT is.
 *
 * THE ONE OPEN-TIME MINT (schema version 6, the workbench plan's U9). A plan saved before version 6
 * carries no id on its accounts and budget lines; this seam gives each one missing its DETERMINISTIC id
 * (`withMissingIds`, `src/shared/stableIds.ts` — kind and position at open), so two opens of one plan
 * agree. It runs HERE, before anything compares the draft for unsaved changes: the re-entry chain
 * (`IntakeApp`) builds BOTH the live draft and the persist seed from this function's output, so a
 * freshly opened version-5 plan reads as saved, and the round-trip guard above holds for every plan
 * that already carries its ids. Ids never reach the engine (no params builder reads one), so the
 * minted draft builds byte-identical params and the same solver fingerprint as the plan without them.
 */
import type { PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { CurrentScenario } from '@shared/model'
import { withMissingIds } from '@shared/stableIds'

export type HydratedDraft =
  | { readonly ok: true; readonly draft: ScenarioDraft }
  /** The decoded scenario is not the two-person shape the draft (and the rest of the app) models —
   *  refused rather than coerced. Reachable only by a future single-user vault or defeated-GCM
   *  tampering; the reload UI treats it like a damaged decode (steer to the backup). */
  | { readonly ok: false; readonly reason: 'unsupported-shape'; readonly detail: string }

/** The decoded persisted scenario → the in-memory draft the result screen recomputes from. A strip of
 *  the `schemaVersion` discriminant (the ONLY key a `CurrentScenario` carries that the draft does not —
 *  memoryModel.ts:230-238) plus the two-person arity narrowing the codec's `>= 1` array can't prove,
 *  with an id minted on every account and budget line that lacks one (the open-time mint, above). */
export function draftFromScenario(scenario: CurrentScenario): HydratedDraft {
  if (scenario.people.length !== 2) {
    return {
      ok: false,
      reason: 'unsupported-shape',
      detail: `expected exactly 2 people, got ${scenario.people.length}`,
    }
  }
  const { schemaVersion: _schemaVersion, people, ...rest } = withMissingIds(scenario)
  // length === 2 established above; the non-null assertions are that invariant, not a guess (each
  // concrete PersonInputsV3 is a valid PersonDraft = Partial<PersonInputsV3>).
  const pair: readonly [PersonDraft, PersonDraft] = [people[0]!, people[1]!]
  return { ok: true, draft: { ...rest, people: pair } }
}
