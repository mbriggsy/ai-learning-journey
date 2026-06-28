/*
 * src/ui/answerView.ts — D2 state-adaptive routing (the per-household choice of LEAD surface).
 *
 * The route is already decided upstream and we re-derive NONE of it here: the work-status router
 * (`memoryModel.recompute` + `intakeMap.isDateRoute` — "is anyone still working?"), mirrored
 * defensively by the engine's §0 all-retired guard (`dateSearch.ts`), commits an `answer.kind` that
 * already encodes the route. A household with ≥ 1 person still working resolves `kind: 'date'` (the
 * fuck-off-date lead → {@link FuckOffDate}); an all-retired household resolves `kind: 'headline'`
 * (the spine confidence statement → {@link ConfidenceStatement}). This selector reads the committed
 * answer the engine crowned and shapes it for the surface — no threshold, grade, or predicate is
 * recomputed (the U7/D2 honesty contract: the drill-down can never disagree with the crowning).
 *
 * NON-ANSWER STATES. `pending` / `compute-error` route to the elevated surface's OWN calm wait /
 * retry mode, picked by `isDateRoute(draft)` so the correct surface shows it (the route is not yet in
 * the answer at that point). `idle`, the date route's `input-failure`, a `headline`'s `indeterminate`,
 * and the never-committed `cancelled` fall to `fallback` — the quiet {@link AnswerStrip}, which NAMES
 * the still-missing inputs. Post-completion the render anchor (no-missing ⟺ validateParams accepts)
 * makes `fallback` near-unreachable on the result screen; it is the honest defensive arm, not a state
 * the finished household is expected to land in.
 */
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { isDateRoute } from '@intake/intakeMap'
import type { FuckOffDateView } from './FuckOffDate'
import type { ConfidenceStatementView } from './ConfidenceStatement'

/** Which elevated lead renders, and the view it is handed. `fallback` ⇒ render the quiet AnswerStrip
 *  (defensive incomplete/hold arm — see the module note). */
export type ElevatedAnswer =
  | { readonly kind: 'date'; readonly view: FuckOffDateView }
  | { readonly kind: 'spine'; readonly view: ConfidenceStatementView }
  | { readonly kind: 'fallback' }

/**
 * Map the committed snapshot to the elevated lead surface + its view. A pure function of the snapshot
 * except for `onRetry`, which is threaded verbatim into the `compute-error` view (the surfaces own the
 * retry button; the model owns the recompute). The result is provisional-free by construction — the
 * elevated hero shows only the FINAL answer (the provisional reading lives in the quiet strip during
 * intake), so the `provisional` eyebrow is never set here.
 */
export function selectElevatedAnswer(
  snapshot: MemoryModelSnapshot,
  onRetry: () => void,
): ElevatedAnswer {
  const { answer, draft } = snapshot
  const dateRoute = isDateRoute(draft)

  switch (answer.kind) {
    case 'idle':
      return { kind: 'fallback' }

    case 'pending':
      return dateRoute
        ? { kind: 'date', view: { kind: 'pending' } }
        : { kind: 'spine', view: { kind: 'pending' } }

    case 'compute-error':
      return dateRoute
        ? { kind: 'date', view: { kind: 'compute-error', onRetry } }
        : { kind: 'spine', view: { kind: 'compute-error', onRetry } }

    case 'date': {
      const outcome = answer.outcome
      if (outcome.kind === 'dates') {
        // v1 degenerate budget: the floor track IS the rendered date (floor ≡ lifestyle, one date).
        return {
          kind: 'date',
          view: { kind: 'dates', track: outcome.floor, windowTopYears: outcome.windowTopYears },
        }
      }
      // input-failure (names what's missing) | cancelled (never committed by memoryModel) → fallback.
      return { kind: 'fallback' }
    }

    case 'headline': {
      const { headline, dollar } = answer.result
      // Indeterminate is "incomplete, not a verdict" — name what's missing rather than crown a hero
      // reading on undetermined data (calm-but-wrong is the sin). The quiet strip carries that copy.
      if (headline.outcomeState === 'indeterminate') return { kind: 'fallback' }
      return { kind: 'spine', view: { kind: 'reading', headline, dollar } }
    }
  }
}

/**
 * A stable key that changes only when a RESOLVED reading first appears — bumped into the surface's
 * `focusSignal` so the magic-moment heading is announced exactly once on landing. Undefined while
 * pending / error / fallback, so focus is left alone until the real answer lands (no announce on the
 * wait frame, no re-announce on an unchanged re-render).
 */
export function resolvedFocusKey(elevated: ElevatedAnswer): string | undefined {
  if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    const track = elevated.view.track
    const where = track.kind === 'no-date-in-window' ? 'none' : track.offsetYears
    return `date:${track.kind}:${where}`
  }
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading') {
    return `spine:${elevated.view.headline.outcomeState}:${elevated.view.headline.xOfTen.value}`
  }
  return undefined
}
