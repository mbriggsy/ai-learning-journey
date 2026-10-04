/**
 * THE ACTIONABLE DISPLAY LATTICE — the step a solver-proposed conversion amount is FLOORED to when the
 * card quotes it (`ui/money.ts` `formatActionableDollar`, whose docblock carries why the floor is a
 * correctness rule and why the ladder stops at $1,000). Hoisted here, out of `ui`, so the engine's
 * gap-fill (`engine/solver/candidates.ts`) and the card read ONE rule (SOLVER_CODE_VERSION 10, council
 * wf_a51047f0-f4b): a fill point is minted ON this lattice, so the card's floor is the identity on it,
 * and a fill whose floored figure would read the same as another candidate's is dropped at enumeration.
 * Never re-typed in either layer.
 */

/** The display step at a magnitude: $100 under $10,000, $1,000 at or above. */
export const actionableDisplayStep = (dollars: number): number => (dollars < 10_000 ? 100 : 1_000)

/**
 * The amount the card quotes for a solver-proposed dollar: floored to its step, clamped at 0. A figure
 * smaller than its own step floors to its whole dollars instead of to 0 (a rendered "$0" would be a
 * falsehood, not a rounding).
 */
export function actionableFloor(dollars: number): number {
  const v = Math.max(0, dollars)
  const step = actionableDisplayStep(v)
  const stepped = Math.floor(v / step) * step
  return stepped >= 1 ? stepped : Math.floor(v)
}
