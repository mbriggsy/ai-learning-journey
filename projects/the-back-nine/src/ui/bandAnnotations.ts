/*
 * src/ui/bandAnnotations.ts — derive the band's household-clock x-axis markers from the scenario.
 *
 * The confidence band's x-axis is a household clock (years from today), and each load-bearing moment
 * gets a vertical rule + text (an {@link XAnnotation}) so the reader can place "where am I on this
 * picture" without a calendar. The U7 preview harness uses a hand-built fixture (HOUSEHOLD_ANNOTATIONS);
 * the live product DERIVES the markers from the real scenario — this is that deriver.
 *
 * TWO ROUTES, TWO DERIVERS. The already-retired SPINE route ({@link deriveSpineBandAnnotations}) carries
 * Today + decade-age ticks + the plan horizon, but NO "work stops" marker: both spouses are already
 * retired (retirementAge ≤ currentAge — the work-status router sends any still-working member to the DATE
 * surface), so a work-stops marker would point into the PAST and read dishonestly (back-nine-design
 * honest-axis law). The DATE route ({@link deriveDateBandAnnotations}) adds a FUTURE "work stops" marker
 * at the crowned fuck-off date — honest precisely because the household has not stopped working yet.
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

/**
 * The household-ages closure for the band's hover/scrub readout: maps a lattice year (years-from-now,
 * possibly fractional) to the both-spouses ages string. SINGLE-SOURCED with the x-axis annotations — it
 * reuses the SAME `slots.bandClockAges` slot and the SAME `currentAge + yearsFromNow` rule, so a readout
 * age can never disagree with the axis tick at the same x. The fractional lattice year is rounded to
 * whole years (the annotations only ever sit at whole-year decade ticks; the readout matches that
 * convention). Passed to `resolveBandData` as `formatAges` — viz never owns the slot or the age math.
 *
 * @param currentAgeA spouse A's (the primary "you") current whole-year age
 * @param currentAgeB spouse B's current whole-year age
 */
export function deriveBandAgesAt(
  currentAgeA: number,
  currentAgeB: number,
): (yearsFromNow: number) => string {
  return (yearsFromNow: number) =>
    slots.bandClockAges(Math.round(currentAgeA + yearsFromNow), Math.round(currentAgeB + yearsFromNow))
}

const DECADE = 10
/** Don't place an intermediate tick within this many years of the horizon — the Plan-horizon
 *  marker already labels the end, and a tick on top of it just collides. */
const HORIZON_TICK_PAD_YEARS = 3
/** Stop ticking past this age: beyond ~100 the cohort is vanishingly thin (the faded tail), so a
 *  tick there is clutter, not a useful clock reference. The Plan-horizon endpoint still labels the
 *  true end (which can be older). */
const MAX_TICK_AGE = 100

/** One intermediate decade-age tick: the primary person's round decade, both ages carried. */
export interface AgeTick {
  readonly yearsFromNow: number
  readonly ageA: number
  readonly ageB: number
  /** The rendered pair via `slots.bandClockAges` — the ONE ages dialect every chart speaks. */
  readonly ages: string
}

/**
 * The intermediate decade-age reference ticks — the primary person's next round decade onward,
 * while they sit clear of the horizon pad and inside the meaningful (non-vanishing-cohort) range.
 * THE ONE canonical tick rule (Briggsy's 2026-07-10 cold-read: every chart's x-axis speaks the
 * SAME ages dialect — the fan's annotations AND the TwoFutures charts both derive from HERE, so
 * the two can never grow separate clock grammars).
 */
export function deriveDecadeAgeTicks(
  currentAgeA: number,
  currentAgeB: number,
  horizonYears: number,
): readonly AgeTick[] {
  const ageGap = currentAgeA - currentAgeB
  const ticks: AgeTick[] = []
  for (
    let ageA = Math.ceil((currentAgeA + 1) / DECADE) * DECADE;
    ageA <= MAX_TICK_AGE && ageA - currentAgeA < horizonYears - HORIZON_TICK_PAD_YEARS;
    ageA += DECADE
  ) {
    const ageB = ageA - ageGap
    ticks.push({ yearsFromNow: ageA - currentAgeA, ageA, ageB, ages: slots.bandClockAges(ageA, ageB) })
  }
  return ticks
}

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
  const markers: XAnnotation[] = [
    {
      id: 'today',
      yearsFromNow: 0,
      label: copy.bandClockTodayLabel,
      ages: slots.bandClockAges(currentAgeA, currentAgeB),
      description: slots.bandClockTodayDesc(currentAgeA, currentAgeB),
    },
  ]
  // Intermediate decade-age reference ticks (the ONE canonical rule — deriveDecadeAgeTicks). Ages
  // only, on the same baseline as the endpoints' ages (the endpoints alone carry a named word above).
  for (const t of deriveDecadeAgeTicks(currentAgeA, currentAgeB, horizonYears)) {
    markers.push({
      id: `age-${t.ageA}`,
      yearsFromNow: t.yearsFromNow,
      label: '',
      ages: t.ages,
      description: slots.bandClockAgesDesc(t.ageA, t.ageB),
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

/**
 * The household-clock markers for a NOT-yet-retired couple's DATE band — the spine deriver's markers
 * (Today + decade-age ticks + plan horizon) PLUS a FUTURE "work stops" marker at the crowned fuck-off
 * date: the moment the household's last earner stops (the date search retires every still-working member
 * at currentAge + offsetYears). Unlike the spine route this marker points into the FUTURE, so it is
 * honest (back-nine-design honest-axis law) — it is the inflection where the fan turns from accumulation
 * to decumulation. Omitted at offset 0 ("work-optional today" — Today already marks it) and skipped if it
 * would sit on top of the horizon; a decade tick within the pad of the work-stops moment is dropped so a
 * bare tick never collides with the named marker. Markers are returned in household-clock order.
 *
 * @param currentAgeA  spouse A's (the primary "you") current whole-year age
 * @param currentAgeB  spouse B's current whole-year age
 * @param offsetYears  the crowned fuck-off offset — years from today the household stops working
 * @param horizonYears the fan's actual last `yearsFromNow`
 */
export function deriveDateBandAnnotations(
  currentAgeA: number,
  currentAgeB: number,
  offsetYears: number,
  horizonYears: number,
): readonly XAnnotation[] {
  const markers: XAnnotation[] = [
    {
      id: 'today',
      yearsFromNow: 0,
      label: copy.bandClockTodayLabel,
      ages: slots.bandClockAges(currentAgeA, currentAgeB),
      description: slots.bandClockTodayDesc(currentAgeA, currentAgeB),
    },
  ]
  // The FUTURE work-stops moment (the fuck-off date) — only when strictly in the future AND clear of
  // the horizon endpoint. At offset 0 the household stops TODAY (already marked by Today). When the
  // crowned offset lands within the horizon pad, the HERO marker itself is dropped (not just bare
  // ticks) to avoid colliding with Plan horizon — a SHALLOW-horizon residual reachable only by a
  // near-window-top offset on an unusually short fan (inside dateSearch's disclosed shallow-window
  // envelope); for realistic working ages the fan horizon is decades out, so it always renders.
  const workStops =
    offsetYears > 0 && offsetYears < horizonYears - HORIZON_TICK_PAD_YEARS ? offsetYears : undefined
  if (workStops !== undefined) {
    markers.push({
      id: 'work-stops',
      yearsFromNow: workStops,
      label: copy.bandClockWorkStopsLabel,
      ages: slots.bandClockAges(currentAgeA + workStops, currentAgeB + workStops),
      description: slots.bandClockWorkStopsDesc(currentAgeA + workStops, currentAgeB + workStops),
    })
  }
  // Intermediate decade-age reference ticks (the ONE canonical rule — deriveDecadeAgeTicks),
  // skipping any within the pad of the NAMED markers they would crowd: Today (year 0) and the
  // work-stops moment (the horizon endpoint is already handled by the rule's own bound). On the
  // date route the first decade can fall just a year or two out (a 58-year-old's age-60 tick),
  // stacking on top of Today and the hero "Work stops" marker — the named moments carry the early
  // story, so drop the colliding tick.
  for (const t of deriveDecadeAgeTicks(currentAgeA, currentAgeB, horizonYears)) {
    if (t.yearsFromNow < HORIZON_TICK_PAD_YEARS) continue
    if (workStops !== undefined && Math.abs(t.yearsFromNow - workStops) < HORIZON_TICK_PAD_YEARS)
      continue
    markers.push({
      id: `age-${t.ageA}`,
      yearsFromNow: t.yearsFromNow,
      label: '',
      ages: t.ages,
      description: slots.bandClockAgesDesc(t.ageA, t.ageB),
    })
  }
  markers.push({
    id: 'horizon',
    yearsFromNow: horizonYears,
    label: copy.bandClockHorizonLabel,
    ages: slots.bandClockAges(currentAgeA + horizonYears, currentAgeB + horizonYears),
    description: slots.bandClockHorizonDesc(currentAgeA + horizonYears, currentAgeB + horizonYears),
  })
  return markers.sort((a, b) => a.yearsFromNow - b.yearsFromNow)
}
