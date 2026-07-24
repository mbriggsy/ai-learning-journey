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
 * The aged-plan wall-time anchor (U13 one-screen-one-time-base law, applied to the CHART —
 * caught live on the first `?vault=datestale` walk, 2026-07-10: the band's year 0 read
 * "Today 58 / 59" beside a gate that had just said "saved about 2 years ago"). The fan's
 * year 0 is the PLAN's own start year — on an aged plan that column is not today.
 * When `yearsSincePlanBuilt > 0`: the year-0 endpoint renames to "Plan built" (the BUILD-era
 * ages, id 'built') and the REAL "Today" marker lands at x = yearsSincePlanBuilt wearing the
 * household's CURRENT ages — the reader finds themselves ON the picture. A plan clock of 0
 * (every fresh session) derives BYTE-IDENTICALLY to the un-anchored call. This is Result's own
 * memoized `dateAnchor` (the ONE local-calendar chain) — never a second ad-hoc clock read.
 *
 * THE CLOCK IS THE BUILD CLOCK, NOT THE SAVE CLOCK (U17 §S0.2 — the rename that made the field
 * say what it always computed). Both members derive from `startCalendarYear`, which is written
 * ONCE when the plan is built (`memoryModel.ts:522`) and survives every re-save untouched. The
 * SAVE's own vintage is `savedAt` and lives on a separate rail (`agedBalancesYearFor`) — a
 * re-saver (built last year, saved five minutes ago) has an aged plan clock and NO aged
 * balances at all, which is exactly the household the old 'Your save' label lied to.
 *
 * (FILED, not done here: the type name still says "Saved". Renaming it touches eight import
 * sites across three layers and is not this stage's decided scope — U17 §S0 renames the field.)
 */
export interface BandSavedAnchor {
  /** The plan's BUILD year — `startCalendarYear`, the calendar the fan's year 0 sits in. */
  readonly startCalendarYear: number
  /** Calendar years since the plan was BUILT (wall year − `startCalendarYear`), clamped at 0
   *  by {@link planClockAnchor}. 0 on every fresh session — the byte-identity. */
  readonly yearsSincePlanBuilt: number
}

/**
 * MINT THE PLAN CLOCK — the ONE derivation, consumed by `Result.tsx` and by its tests.
 *
 * This exists because a test that RE-TYPES the mint pins nothing: the U17 §S0 verifier planted
 * `wallYear - startCalendarYear + 3` in the component and the whole suite stayed green (1096
 * tests), because the seam test had copied the arithmetic into its own helper under a comment
 * claiming it matched. A comment is not a bind (insight 032); re-deriving a producer's inputs
 * forks at its first divergence (insight 081). So the arithmetic lives HERE, once, and the
 * component calls it — the same idiom `offsetHasPassed` uses for the arrived predicate.
 *
 * `Math.max(0, …)` is the LOW-end refusal: a device clock reading BEHIND the build year is a
 * broken clock, not a household state, and the honest answer is to decline to age the surface
 * at all (the fresh identity) rather than to crash a reader over their own system settings.
 * The HIGH end refuses aloud instead — see {@link planClockWithin} — because only a POSITIVE
 * claim ("this plan is N years old") can be out of the drawable domain.
 */
export function planClockAnchor(startCalendarYear: number, wallCalendarYear: number): BandSavedAnchor {
  return {
    startCalendarYear,
    yearsSincePlanBuilt: Math.max(0, wallCalendarYear - startCalendarYear),
  }
}

/**
 * The plan clock resolved against the DRAWN horizon — the ONE gate every aged x-axis re-base
 * passes through (U17 §S0.2).
 *
 * `[0, horizonYears)` is the whole domain in which "the plan was built N years before today"
 * can be DRAWN: at N ≥ horizon, today itself is off the right edge of the chart, so there is no
 * honest picture to re-base — the fan would be a run of years that are all in the past, wearing
 * a wall-Today marker that does not exist on it. A clock that lands there is SKEWED (a corrupt
 * or imported `startCalendarYear`, a device clock set decades wrong), and a skewed clock
 * REFUSES ALOUD — it never redraws. This is `resolveBandData`'s fail-loud-at-the-producer-seam
 * idiom, deliberately: a silently-degraded axis is the calm-but-wrong sin, and there is no calm
 * sentence a pure annotation deriver could render instead.
 *
 * The LOW end clamps rather than throws, and the asymmetry is deliberate: the producer already
 * mints `Math.max(0, …)` (Result.tsx), and clamping to 0 IS the refusal to redraw — the fresh
 * identity, not a re-based picture. Only a POSITIVE claim ("this plan is N years old") can be
 * out of the drawable domain, so only a positive claim can refuse.
 */
function planClockWithin(anchor: BandSavedAnchor | undefined, horizonYears: number): number {
  const years = anchor?.yearsSincePlanBuilt ?? 0
  if (years <= 0) return 0 // the fresh identity — nothing is re-based, no domain question arises
  if (!Number.isInteger(years) || years >= horizonYears) {
    throw new Error(
      `bandAnnotations: yearsSincePlanBuilt ${String(years)} is outside the drawable domain ` +
        `[0, ${String(horizonYears)}) — a skewed plan clock refuses, it never redraws (U17 §S0.2).`,
    )
  }
  return years
}

/** The year-0 endpoint: "Today" on a fresh session; "Plan built" (the BUILD year + the ages the
 *  household entered then) on an aged plan — never a claim about the SAVE (U17 §S0.2). */
function yearZeroMarker(ageA: number, ageB: number, aged: BandSavedAnchor | null): XAnnotation {
  return aged !== null
    ? {
        id: 'built',
        yearsFromNow: 0,
        label: copy.bandClockBuiltLabel,
        ages: slots.bandClockAges(ageA, ageB),
        // The BUILD year comes from the anchor itself — there is no arm in which the year is
        // unavailable, so nothing is ever fabricated or suppressed here.
        description: slots.bandClockBuiltDesc(aged.startCalendarYear, ageA, ageB),
      }
    : {
        id: 'today',
        yearsFromNow: 0,
        label: copy.bandClockTodayLabel,
        ages: slots.bandClockAges(ageA, ageB),
        description: slots.bandClockTodayDesc(ageA, ageB),
      }
}

/** The aged arm's WALL-TIME "Today" marker at x = years-since-built (current ages), or null when
 *  it would crowd the horizon endpoint (a vanishing-rare decade-old plan whose today sits at the
 *  chart's far edge — the 'built' year-0 label alone stays honest there). */
function wallTodayMarker(
  ageA: number,
  ageB: number,
  yearsSincePlanBuilt: number,
  horizonYears: number,
): XAnnotation | null {
  if (yearsSincePlanBuilt >= horizonYears - HORIZON_TICK_PAD_YEARS) return null
  return {
    id: 'today',
    yearsFromNow: yearsSincePlanBuilt,
    label: copy.bandClockTodayLabel,
    ages: slots.bandClockAges(ageA + yearsSincePlanBuilt, ageB + yearsSincePlanBuilt),
    description: slots.bandClockTodayDesc(ageA + yearsSincePlanBuilt, ageB + yearsSincePlanBuilt),
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
  const yearsSinceBuilt = planClockWithin(savedAnchor, horizonYears)
  const aged = yearsSinceBuilt > 0 && savedAnchor !== undefined ? savedAnchor : null
  const markers: XAnnotation[] = [yearZeroMarker(currentAgeA, currentAgeB, aged)]
  const wallToday =
    aged !== null
      ? wallTodayMarker(currentAgeA, currentAgeB, yearsSinceBuilt, horizonYears)
      : null
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
  const yearsSinceBuilt = planClockWithin(savedAnchor, horizonYears)
  const aged = yearsSinceBuilt > 0 && savedAnchor !== undefined ? savedAnchor : null
  const markers: XAnnotation[] = [yearZeroMarker(currentAgeA, currentAgeB, aged)]
  const wallToday =
    aged !== null
      ? wallTodayMarker(currentAgeA, currentAgeB, yearsSinceBuilt, horizonYears)
      : null
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
