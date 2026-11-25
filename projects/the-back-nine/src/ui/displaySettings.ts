/**
 * src/ui/displaySettings.ts: the Display drawer's two choices (Act 6 · RC18; plan docs/plans/6-rightcapital-ui-plan.md,
 * "RC18"; ref 2.20, `rc-analysis/FRAME_display-settings-drawer.png`). Pure: no React.
 *
 * - **The time axis**: every chart drawn over the plan's years reads either the first person's age (the default, as
 *   RightCapital's) or the calendar year. One choice for every such chart, so two pages never disagree.
 * - **One scale for both halves**: Probability's two balance bars share one dollar scale (the default: two bars on two
 *   scales draw ~$1.1mm and ~$675k the same height, `docs/landmines.md`, UI and product); off, each bar takes its own
 *   scale, and the page says the heights no longer compare.
 *
 * The dollars are today's dollars, the engine's own unit (it runs in real dollars): the drawer states it and offers no
 * future-dollars switch until `src/engine/priceIndex.ts` backs one (critique 12; plan section 6's "A future-dollars view").
 *
 * The choices last for the session only (the shell holds them): no saved shape in this act (plan 7.2).
 */

export type TimeAxis = 'ages' | 'years'

export interface DisplaySettings {
  readonly timeAxis: TimeAxis
  readonly sameScale: boolean
}

export const DEFAULT_DISPLAY: DisplaySettings = { timeAxis: 'ages', sameScale: true }

/**
 * One time axis's clock: the plan's first calendar year and the first person's age in it. Every chart over the plan's
 * years keys its points either by years from the plan's start (`t`), by the first person's age, or by the calendar
 * year; the clock turns any of the three into the number the axis prints.
 */
export interface AxisClock {
  /** The plan's first calendar year (t = 0). */
  readonly startYear: number
  /** The first person's age in that year. */
  readonly startAge: number
}

/** The number the axis prints at `t` years from the plan's start: the first person's age, or the calendar year. */
export function axisNumberAt(axis: TimeAxis, clock: AxisClock, t: number): number {
  return axis === 'years' ? clock.startYear + t : clock.startAge + t
}

/** What to add to a point keyed by the first person's AGE to put it on the axis (0 on the ages axis). */
export function offsetFromAge(axis: TimeAxis, clock: AxisClock): number {
  return axis === 'years' ? clock.startYear - clock.startAge : 0
}

/** What to add to a point keyed by the CALENDAR YEAR to put it on the axis (0 on the years axis). */
export function offsetFromYear(axis: TimeAxis, clock: AxisClock): number {
  return axis === 'years' ? 0 : clock.startAge - clock.startYear
}
