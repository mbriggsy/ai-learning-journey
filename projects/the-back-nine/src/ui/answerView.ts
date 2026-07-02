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
import type { BandFan, DateBand, DateSearchOutcome, SimulationResult } from '@shared/model'
import type { XAnnotation } from '@viz/bandData'
import { deriveBandAgesAt, deriveDateBandAnnotations, deriveSpineBandAnnotations } from './bandAnnotations'
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
/**
 * The spine band + its household-clock annotations, SCREENED for the $0-portfolio household.
 * `resolveBandData` FAILS LOUD on an all-$0 fan — a VALID Social-Security-funded $0-portfolio
 * household (insight 044) — because there is no honest dollar scale to plot. So the band is handed on
 * ONLY when the fan carries a positive dollar somewhere; the $0-portfolio household renders its verdict
 * with NO band (nothing to plot but the $0 floor — the verdict still stands). The screen reads the RAW
 * per-year grid (does ANY year carry p90 > 0?); `resolveBandData` throws on the RESAMPLED lattice's
 * `dollarMax === 0`. The two agree for every real household: the today anchor is always positive and
 * the positive-portfolio years are contiguous, so a positive grid year is always struck by a lattice
 * sample while `horizonYears < 2·(LATTICE_POINTS − 1)` (≈ 96) — and a longevity-bounded horizon sits far
 * below that. (Were LATTICE_POINTS shrunk or the horizon cap raised past that bound, make the screen
 * read the same resampled quantity.) A malformed fan (a producer bug, never a valid household) is
 * deliberately NOT screened here — it is left to fail loud at the producer seam (back-nine-design §3).
 */
function spineBand(
  result: SimulationResult,
  draft: MemoryModelSnapshot['draft'],
): {
  readonly band?: BandFan
  readonly bandAnnotations?: readonly XAnnotation[]
  readonly bandAges?: (yearsFromNow: number) => string
} {
  const fan = result.distribution.bandFan
  if (!fan || fan.byYear.length < 2) return {}
  const last = fan.byYear[fan.byYear.length - 1]
  if (!last || !fan.byYear.some((y) => y.p90 > 0)) return {}
  const ageA = draft.people[0].currentAge
  const ageB = draft.people[1].currentAge
  // Annotations + the readout-ages closure share the SAME currentAge guard + slot, so they appear (or
  // defensively withhold) together — the scrub readout's ages can never disagree with the axis ticks.
  const haveAges = ageA !== undefined && ageB !== undefined
  const bandAnnotations = haveAges ? deriveSpineBandAnnotations(ageA, ageB, last.yearsFromNow) : undefined
  const bandAges = haveAges ? deriveBandAgesAt(ageA, ageB) : undefined
  return { band: fan, bandAnnotations, bandAges }
}

/**
 * The DATE band + its household-clock annotations — the date-route analog of {@link spineBand}. The
 * engine carries the crowned candidate's projection fan bundled with its outcome-state tag in
 * `outcome.band` (present iff a date was crowned; a no-date run has none). The annotations add the
 * FUTURE "work stops" marker at the crowned offset — honest precisely because the household has not
 * stopped working yet. $0-portfolio screen mirrors the spine: `resolveBandData` fails loud on an
 * all-$0 fan, so the band is handed on ONLY when a positive dollar exists somewhere (a crowned date is
 * on-track-or-better, so this is defensive — but it keeps the producer seam honest, never a render-throw).
 */
function dateBand(
  outcome: Extract<DateSearchOutcome, { kind: 'dates' }>,
  draft: MemoryModelSnapshot['draft'],
): {
  readonly band?: DateBand
  readonly bandAnnotations?: readonly XAnnotation[]
  readonly bandAges?: (yearsFromNow: number) => string
} {
  const band = outcome.band
  if (!band || band.fan.byYear.length < 2 || !band.fan.byYear.some((y) => y.p90 > 0)) return {}
  const last = band.fan.byYear[band.fan.byYear.length - 1]!
  const ageA = draft.people[0].currentAge
  const ageB = draft.people[1].currentAge
  // The work-stops marker sits at the band's OWN crowned offset — read from the band (the engine's
  // authority tag), never re-derived from a sibling track field (the "UI re-derives nothing" law). The
  // still-working member(s) retire at currentAge + offset. The readout-ages closure shares the same
  // currentAge guard + slot as the annotations, so the scrub ages and the axis ticks agree.
  const haveAges = ageA !== undefined && ageB !== undefined
  const bandAnnotations = haveAges
    ? deriveDateBandAnnotations(ageA, ageB, band.offsetYears, last.yearsFromNow)
    : undefined
  const bandAges = haveAges ? deriveBandAgesAt(ageA, ageB) : undefined
  return { band, bandAnnotations, bandAges }
}

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
        // U9b: BOTH tracks cross, carried verbatim (insight 045) — the surface's pure
        // composeDateSplit decides one-date vs split (the value-coincident degenerate renders the
        // single composition verbatim; the shipped v1 floor-only render presented an essentials
        // date AS the fuck-off date — the calm-but-wrong gap this threading closes). The crowned
        // FLOOR projection band + its future-marker annotations ride alongside (dateBand screens
        // the $0-portfolio case + derives the household-clock x-axis from the draft + the fan's
        // last year).
        return {
          kind: 'date',
          view: {
            kind: 'dates',
            floor: outcome.floor,
            lifestyle: outcome.lifestyle,
            windowTopYears: outcome.windowTopYears,
            ...dateBand(outcome, draft),
          },
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
      // The "show me the range" band rides the worded spine reading (the engine's per-year fan, now
      // carried across the worker wire). spineBand screens the $0-portfolio household (no honest scale)
      // and derives the household-clock annotations from the draft + the fan's actual last year.
      // The "as the survivor" reading rides the same spine view (present iff the run carried a survivor
      // phase — the parent decides; SurvivorReadout mounts below the band). Carried verbatim from the
      // result, never re-derived (insight 045). Spine-only: the date route is a timing claim, not a joint verdict.
      // U9b: the essentials-floor verdict rides presence-keyed, carried verbatim (insight 045) —
      // the surface's floorRelief gate decides whether it earns the subordinate relief line (the
      // value-equal degenerate renders the single-metric statement verbatim).
      return {
        kind: 'spine',
        view: {
          kind: 'reading',
          headline,
          dollar,
          ...spineBand(answer.result, draft),
          ...(answer.result.survivorReading ? { survivorReading: answer.result.survivorReading } : {}),
          ...(answer.result.floorReading ? { floorReading: answer.result.floorReading } : {}),
        },
      }
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
    // Keyed to the FLOOR track only (U9b build-gate 3, insight 047): a lifestyle-only sharpen must
    // never look like a fresh landing — the lifestyle claim's change reaches AT through the
    // surface's own polite live region instead.
    const track = elevated.view.floor
    const where = track.kind === 'no-date-in-window' ? 'none' : track.offsetYears
    return `date:${track.kind}:${where}`
  }
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading') {
    return `spine:${elevated.view.headline.outcomeState}:${elevated.view.headline.xOfTen.value}`
  }
  return undefined
}
