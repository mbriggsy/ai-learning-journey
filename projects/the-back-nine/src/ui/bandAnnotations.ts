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

/**
 * The aged-vault wall-time anchor (U13 one-screen-one-time-base law, applied to the CHART —
 * caught live on the first `?vault=datestale` walk, 2026-07-10: the band's year 0 read
 * "Today 58 / 59" beside a gate that had just said "saved about 2 years ago"). The fan's
 * year 0 is the PLAN's start (the save moment) — on an aged vault that column is not today.
 * When `elapsedPlanYears > 0`: the year-0 endpoint renames to "Your save" (saved ages,
 * id 'saved') and the REAL "Today" marker lands at x = elapsedPlanYears wearing the
 * household's CURRENT ages — the reader finds themselves ON the picture. elapsed 0 (every
 * fresh session) derives BYTE-IDENTICALLY to the un-anchored call. This is Result's own
 * memoized `dateAnchor` (the ONE local-calendar chain) — never a second ad-hoc clock read.
 */
export interface BandSavedAnchor {
  readonly elapsedPlanYears: number
}

/** The year-0 endpoint: "Today" on a fresh session; "Your save" (saved ages) on an aged vault. */
function yearZeroMarker(ageA: number, ageB: number, aged: boolean): XAnnotation {
  return aged
    ? {
        id: 'saved',
        yearsFromNow: 0,
        label: copy.bandClockSavedLabel,
        ages: slots.bandClockAges(ageA, ageB),
        description: slots.bandClockSavedDesc(ageA, ageB),
      }
    : {
        id: 'today',
        yearsFromNow: 0,
        label: copy.bandClockTodayLabel,
        ages: slots.bandClockAges(ageA, ageB),
        description: slots.bandClockTodayDesc(ageA, ageB),
      }
}

/** The aged arm's WALL-TIME "Today" marker at x = elapsed (current ages), or null when it
 *  would crowd the horizon endpoint (a vanishing-rare decades-old vault whose today sits at
 *  the chart's far edge — the 'saved' year-0 label alone stays honest there). */
function wallTodayMarker(
  ageA: number,
  ageB: number,
  elapsedPlanYears: number,
  horizonYears: number,
): XAnnotation | null {
  if (elapsedPlanYears >= horizonYears - HORIZON_TICK_PAD_YEARS) return null
  return {
    id: 'today',
    yearsFromNow: elapsedPlanYears,
    label: copy.bandClockTodayLabel,
    ages: slots.bandClockAges(ageA + elapsedPlanYears, ageB + elapsedPlanYears),
    description: slots.bandClockTodayDesc(ageA + elapsedPlanYears, ageB + elapsedPlanYears),
  }
}
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
  savedAnchor?: BandSavedAnchor,
): readonly XAnnotation[] {
  const elapsed = savedAnchor?.elapsedPlanYears ?? 0
  const markers: XAnnotation[] = [yearZeroMarker(currentAgeA, currentAgeB, elapsed > 0)]
  const wallToday =
    elapsed > 0 ? wallTodayMarker(currentAgeA, currentAgeB, elapsed, horizonYears) : null
  if (wallToday !== null) markers.push(wallToday)
  // Intermediate decade-age reference ticks (the ONE canonical rule — deriveDecadeAgeTicks). Ages
  // only, on the same baseline as the endpoints' ages (the endpoints alone carry a named word above).
  // On the AGED arm a tick within the pad of the wall-time Today marker is dropped — the named
  // moment carries that x (the same crowd rule the date deriver applies around its named markers).
  for (const t of deriveDecadeAgeTicks(currentAgeA, currentAgeB, horizonYears)) {
    if (wallToday !== null && Math.abs(t.yearsFromNow - wallToday.yearsFromNow) < HORIZON_TICK_PAD_YEARS)
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
  // Household-clock order even on the aged arm (the wall-Today x can exceed an early decade
  // tick's) — the label stagger reads neighbors in x order.
  return markers.sort((a, b) => a.yearsFromNow - b.yearsFromNow)
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
 * @param savedAnchor  the aged-vault wall-time anchor (see {@link BandSavedAnchor})
 */
export function deriveDateBandAnnotations(
  currentAgeA: number,
  currentAgeB: number,
  offsetYears: number,
  horizonYears: number,
  savedAnchor?: BandSavedAnchor,
): readonly XAnnotation[] {
  const elapsed = savedAnchor?.elapsedPlanYears ?? 0
  const markers: XAnnotation[] = [yearZeroMarker(currentAgeA, currentAgeB, elapsed > 0)]
  const wallToday =
    elapsed > 0 ? wallTodayMarker(currentAgeA, currentAgeB, elapsed, horizonYears) : null
  if (wallToday !== null) markers.push(wallToday)
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
  // skipping any within the pad of the NAMED markers they would crowd: the year-0 endpoint, the
  // work-stops moment, and (aged arm) the wall-time Today marker (the horizon endpoint is already
  // handled by the rule's own bound). On the date route the first decade can fall just a year or
  // two out (a 58-year-old's age-60 tick), stacking on top of the named early moments — the named
  // moments carry the early story, so drop the colliding tick.
  for (const t of deriveDecadeAgeTicks(currentAgeA, currentAgeB, horizonYears)) {
    if (t.yearsFromNow < HORIZON_TICK_PAD_YEARS) continue
    if (workStops !== undefined && Math.abs(t.yearsFromNow - workStops) < HORIZON_TICK_PAD_YEARS)
      continue
    if (wallToday !== null && Math.abs(t.yearsFromNow - wallToday.yearsFromNow) < HORIZON_TICK_PAD_YEARS)
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
