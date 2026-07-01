/**
 * U8 decrypt-on-return — the hydration inverse of {@link scenarioFromDraft} (SLICE 2 correctness
 * spine; council 2026-06-30, Fork D).
 *
 * On unlock, the session hands back the decoded `ScenarioV3` (`currentModel()`); the result screen
 * renders from the in-memory `ScenarioDraft` (`appModel`). This seam turns the one into the other so
 * the reload path can `appModel.update(() => hydrated.draft)` and recompute — exactly mirroring the
 * `?seed` hydration (IntakeApp), never a field-mapping layer that could drift from the codec.
 *
 * WHY IT'S ALMOST A CLEAN STRIP, PROVEN BY THE COMPILE. `memoryModel.ts:113-117` asserts, at
 * type-check time, that `keyof ScenarioDraft ⊆ keyof ScenarioV3` AND `keyof ScenarioV3 ⊆ keyof
 * ScenarioDraft ∪ {schemaVersion}` — i.e. a `ScenarioV3` IS a `ScenarioDraft` plus the
 * `schemaVersion` discriminant. So the field SET is a shallow strip of that one key; every other
 * concrete V3 value already satisfies the draft's wider Partial/hole-tolerant field types.
 *
 * THE ONE ARITY GAP (why this returns a RESULT, not a bare draft). The draft types `people` as a
 * strict two-tuple (the married-couple model; single-user is deferred — TODO), but the codec only
 * gates `people.length >= 1` (scenarioCodec.ts:209 — it also validates the legacy v1/v2 degenerate
 * case). A vault WE wrote is always two-person (scenarioFromDraft encodes a two-tuple, GCM-
 * authenticated on disk), so the failure arm is defensive: a `!== 2` scenario is an unsupported shape
 * we refuse to silently coerce into the two-tuple (that would be the calm-but-wrong sin — dropping or
 * inventing a spouse on reload). The caller routes it to the same "use your backup" surface a damaged
 * decode takes.
 *
 * WHY THE HAPPY PATH IS CORRECTNESS-CRITICAL (the cardinal rule). A field dropped on the way back to
 * the draft would recompute a DIFFERENT scenario than the one saved — a calm-but-wrong reload. The
 * round-trip guard (`draftFromScenario.test.ts`) binds `scenarioFromDraft(draftFromScenario(v3))`
 * byte-identical to the saved `v3`, so no future field added to `ScenarioV3` can slip past the strip
 * untested. Fork D's reload-determinism (force the FINAL tier, never replay a persisted provisional
 * band) rides ON TOP of this: this seam proves the INPUT is identical; the engine's own determinism
 * (`simulate.test.ts`) proves the OUTPUT is.
 */
import type { PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { ScenarioV3 } from '@shared/model'

export type HydratedDraft =
  | { readonly ok: true; readonly draft: ScenarioDraft }
  /** The decoded scenario is not the two-person shape the draft (and the rest of the app) models —
   *  refused rather than coerced. Reachable only by a future single-user vault or defeated-GCM
   *  tampering; the reload UI treats it like a damaged decode (steer to the backup). */
  | { readonly ok: false; readonly reason: 'unsupported-shape'; readonly detail: string }

/** The decoded persisted scenario → the in-memory draft the result screen recomputes from. A strip of
 *  the `schemaVersion` discriminant (the ONLY key a `ScenarioV3` carries that the draft does not —
 *  memoryModel.ts:109-117) plus the two-person arity narrowing the codec's `>= 1` array can't prove. */
export function draftFromScenario(scenario: ScenarioV3): HydratedDraft {
  if (scenario.people.length !== 2) {
    return {
      ok: false,
      reason: 'unsupported-shape',
      detail: `expected exactly 2 people, got ${scenario.people.length}`,
    }
  }
  const { schemaVersion: _schemaVersion, people, ...rest } = scenario
  // length === 2 established above; the non-null assertions are that invariant, not a guess (each
  // concrete PersonInputsV3 is a valid PersonDraft = Partial<PersonInputsV3>).
  const pair: readonly [PersonDraft, PersonDraft] = [people[0]!, people[1]!]
  return { ok: true, draft: { ...rest, people: pair } }
}
