/*
 * src/ui/bandAnnotations.ts — derive the band's household-clock x-axis markers from the scenario.
 *
 * The confidence band's x-axis is a household clock (years from today), and each load-bearing moment
 * gets a vertical rule + text (an {@link XAnnotation}) so the reader can place "where am I on this
 * picture" without a calendar. The U7 preview harness uses a hand-built fixture (HOUSEHOLD_ANNOTATIONS);
 * the live product DERIVES the markers from the real scenario — this is that deriver.
 *
 * SPINE route only (this slice). On the already-retired spine route BOTH spouses are retired
 * (retirementAge ≤ currentAge — guaranteed by the work-status router: any still-working member routes
 * to the DATE surface instead), so a "work stops" marker would point into the PAST and read dishonestly
 * (back-nine-design honest-axis law). The spine band therefore carries exactly two markers: Today and
 * the plan horizon. The date route's deriver (which DOES carry a future "work stops" marker) lands with
 * the date band drawer.
 *
 * THE HORIZON IS THE FAN'S ACTUAL LAST YEAR, never a nominal maxHorizon: the living-cohort fan can end
 * before maxHorizonYears (it stops when the last couple dies), and the x-annotation must track that or
 * it would float past the drawn band. The caller passes the fan's last `yearsFromNow`.
 *
 * STRING-FREE (cross-cutting #4): the marker label is a copy key; the ages + the a11y sentence enter
 * through typed slots (numerals never inline) — both gated by copyGuard.
 */
import { copy, slots } from './copy'
import type { XAnnotation } from '@viz/bandData'

const DECADE = 10
/** Don't place an intermediate tick within this many years of the horizon — the Plan-horizon
 *  marker already labels the end, and a tick on top of it just collides. */
const HORIZON_TICK_PAD_YEARS = 3
/** Stop ticking past this age: beyond ~100 the cohort is vanishingly thin (the faded tail), so a
 *  tick there is clutter, not a useful clock reference. The Plan-horizon endpoint still labels the
 *  true end (which can be older). */
const MAX_TICK_AGE = 100

/**
 * The household-clock markers for an already-retired couple's spine band. Named ENDPOINTS — Today
 * (year 0) and the plan horizon (the fan's ACTUAL last year, not the nominal maxHorizon) — bracket a
 * run of intermediate decade-age TICKS (the primary person's round decades: 70, 80, 90, 100) so the
 * years between the endpoints are readable. The ticks carry just the ages (no named moment); the age
 * gap between spouses is preserved at every mark. NO "work stops" marker: on the spine route both
 * spouses are already retired, so it would point into the past (back-nine-design honest-axis law).
 *
 * @param currentAgeA  spouse A's (the primary "you") current whole-year age
 * @param currentAgeB  spouse B's current whole-year age
 * @param horizonYears the fan's actual last `yearsFromNow`
 */
export function deriveSpineBandAnnotations(
  currentAgeA: number,
  currentAgeB: number,
  horizonYears: number,
): readonly XAnnotation[] {
  const ageGap = currentAgeA - currentAgeB
  const markers: XAnnotation[] = [
    {
      id: 'today',
      yearsFromNow: 0,
      label: copy.bandClockTodayLabel,
      ages: slots.bandClockAges(currentAgeA, currentAgeB),
      description: slots.bandClockTodayDesc(currentAgeA, currentAgeB),
    },
  ]
  // Intermediate decade-age reference ticks — the primary person's next round decade onward, while
  // they sit clear of the horizon and inside the meaningful (non-vanishing-cohort) range. Ages only,
  // on the same baseline as the endpoints' ages (the endpoints alone carry a named word above).
  for (
    let ageA = Math.ceil((currentAgeA + 1) / DECADE) * DECADE;
    ageA <= MAX_TICK_AGE && ageA - currentAgeA < horizonYears - HORIZON_TICK_PAD_YEARS;
    ageA += DECADE
  ) {
    const ageB = ageA - ageGap
    markers.push({
      id: `age-${ageA}`,
      yearsFromNow: ageA - currentAgeA,
      label: '',
      ages: slots.bandClockAges(ageA, ageB),
      description: slots.bandClockAgesDesc(ageA, ageB),
    })
  }
  markers.push({
    id: 'horizon',
    yearsFromNow: horizonYears,
    label: copy.bandClockHorizonLabel,
    ages: slots.bandClockAges(currentAgeA + horizonYears, currentAgeB + horizonYears),
    description: slots.bandClockHorizonDesc(currentAgeA + horizonYears, currentAgeB + horizonYears),
  })
  return markers
}
