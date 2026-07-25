/**
 * THE SOURCE-BIND for the saved-recommendation's mirrored engine vocabulary (U17·S3·D1).
 *
 * `src/shared` is a LEAF — it must not import a feature layer (the eslint layer ban), so
 * `SAVED_RECOMMENDATION_GRADES` is a RE-DECLARED copy of the engine's `Grade` union rather than an
 * import. A TEST is exempt from that ban (the established idiom: `MAX_REAL_DOLLAR` ↔
 * `ENGINE_MAX_DOLLAR`, scenarioCodec.ts:53-63 + scenarioCodec.test.ts's source-bind arm), so this
 * is where the mirror is held to the original.
 *
 * WHAT GOES WRONG WITHOUT IT: the engine adds a third grade (say `'wait'`). Nothing breaks. The
 * solver mints records carrying it; the codec's `needVocab` calls it out-of-vocab; the U17 non-
 * fatal-atom rule DROPS every such record — silently, calmly, forever. Every household that
 * saved a `'wait'` recommendation just loses it with no error anywhere. The mirror drifting is
 * exactly the class of silent loss this repo refuses, so a new engine member must RED the build.
 *
 * THE BIND IS BIDIRECTIONAL AND HAS BOTH A COMPILE ARM AND A RUNTIME ARM, deliberately:
 *  - the `Record<Grade, …>` literal below cannot compile unless its key set is EXACTLY the
 *    engine union's extension (missing key ⇒ TS2741; extra key ⇒ excess-property error), and
 *  - the runtime `toEqual` then proves the shared ARRAY carries that same set — so adding the
 *    new member to the record while forgetting the array (the likely half-fix) still reds, in
 *    vitest, where a reader will see it. A compile-only bind would pass `pnpm test` silently.
 *
 * THE GRADE'S DECISION AXIS HAS NO MIRROR HERE, DELIBERATELY (the F-pass). The record does not
 * persist the axis: `gradeAxisFor(goal, surplusRegime)` derives it from two fields the record
 * already carries, and storing the output beside its own inputs made 8 of the 12 triples
 * representable-but-impossible (model.ts `SavedRecommendationVerdictV3` has the full reasoning).
 * A mirror of `GradeStatistic` would be a vocabulary for a field that does not exist — so the
 * engine union stays where it belongs, unmirrored, and the card calls the engine's own producer.
 */
import { describe, expect, it } from 'vitest'
import type { Grade } from '@engine/validation/gradeCalibration'
import { SAVED_RECOMMENDATION_GRADES, type SavedRecommendationGrade } from '../model'

// Compile-time, both directions: the mirrored union and the engine union are the SAME type. A
// new engine member (or a shared-side member the engine does not have) fails `pnpm typecheck`
// here — `never` is not assignable from `true`.
type _GradeMirrorCovers = SavedRecommendationGrade extends Grade ? true : never
type _GradeMirrorCovered = Grade extends SavedRecommendationGrade ? true : never
const _mirrorsTied: _GradeMirrorCovers & _GradeMirrorCovered = true
void _mirrorsTied

/** The engine union's FULL extension, enumerated under a compile gate: `Record<Grade, true>`
 *  admits exactly the engine's members, no more and no fewer. Its keys are therefore the engine's
 *  own vocabulary, reachable at RUNTIME from a type that has no runtime form. */
const ENGINE_GRADES: Record<Grade, true> = { 'just-do-it': true, 'coin-flip': true }

describe('the saved-recommendation vocab mirror is source-bound to the engine union', () => {
  it('SAVED_RECOMMENDATION_GRADES is the engine Grade union, exactly (a new engine grade reds here — it never silently drops a household’s record)', () => {
    expect([...SAVED_RECOMMENDATION_GRADES].sort()).toEqual(Object.keys(ENGINE_GRADES).sort())
  })

  it('the mirror carries NO duplicate and NO empty member (a vocab a needVocab check would accept twice or vacuously)', () => {
    expect(new Set(SAVED_RECOMMENDATION_GRADES).size).toBe(SAVED_RECOMMENDATION_GRADES.length)
    expect(SAVED_RECOMMENDATION_GRADES.every((v) => v.length > 0)).toBe(true)
  })
})
