/*
 * src/ui/dateTradeoff.ts — the date↔confidence tradeoff point (R28), pure.
 *
 * The crowned date is the EARLIEST on-track offset (the "yes you can" answer). R28 forbids a single
 * deterministic line, so the surface offers one EARLIER, lower-odds point from the curve: "or about
 * N years sooner, the odds are nearer X of 10." This reads that point off the engine's curve — it
 * re-derives nothing; the odds use the SAME round(qlb·10) mapping the headline odds do (dateOdds.ts).
 *
 * THE RULES (each a calm-but-wrong guard, R25):
 *  - ONLY a clean confirmed-date carries a tradeoff. A window-edge already carries the edge-of-window
 *    disclosure, and a non-monotone result the ACA-cliff disclosure — a second "go earlier" message
 *    would muddy the priority signal, so both suppress the tradeoff.
 *  - The point is the LATEST earlier offset whose odds are STRICTLY LOWER than the crowned's — the
 *    smallest-sacrifice marginal tradeoff. Strictly-lower also EXCLUDES a non-monotone cleared-then-
 *    dipped earlier offset (it reads at the crowned odds), which is the disclosure's job, not a
 *    "go sooner at lower odds" claim.
 *  - On an AGED vault (the U13 wall-time anchor, insight 078's same-meaning sweep) a candidate whose
 *    stop-year has already PASSED ({@link offsetHasPassed} — the ONE exported predicate, U17 §S0.1;
 *    never a re-typed compare) is never offered — this line OFFERS a choice, and a passed year is
 *    not pickable. Re-based today (planOffset == yearsSincePlanBuilt) stays offerable (stop-now is a
 *    real choice — the heroLead offset-0 precedent). Excluding past candidates can only move the
 *    offer later or remove it: conservative. A plan clock of 0 is the arithmetic identity, so every
 *    fresh session is byte-identical.
 *  - The honesty is in the number: a steep earlier drop reads plainly as "much riskier" — no floor
 *    gate invents a threshold the engine doesn't name. `yearsSooner` stays the OFFSET difference
 *    (sooner than the crowned date) — invariant under the re-base, so it needs no anchor arithmetic.
 */
import { slots } from './copy'
import { offsetHasPassed } from '@viz/curveMarks'
import type { DateTrackOutcome } from '@shared/model'

export interface DateTradeoffPoint {
  /** Whole sim-years earlier than the crowned date. */
  readonly yearsSooner: number
  /** The earlier point's "X of 10" odds reading (the headline register). */
  readonly oddsText: string
}

/** The earlier lower-odds tradeoff point for a track, or null when none should show (per the rules
 *  above). The crowned odds and the earlier odds share the round(qlb·10) mapping with dateOdds.ts.
 *  `yearsSincePlanBuilt` is the U13 anchor's plan clock — calendar years since the plan was BUILT
 *  (0 = fresh, the identity; U17 §S0.2 — it was never "years since your save"). */
export function dateTradeoffPoint(
  track: DateTrackOutcome,
  yearsSincePlanBuilt = 0,
): DateTradeoffPoint | null {
  if (track.kind !== 'confirmed-date') return null
  if (track.nonMonotoneOffsets.length > 0) return null
  const crownedOdds = Math.round(track.grade.quantizedLowerBound * 10)
  let best: { offsetYears: number; odds: number } | null = null
  for (const r of track.curve) {
    if (r.offsetYears >= track.offsetYears) continue
    if (offsetHasPassed(r.offsetYears, yearsSincePlanBuilt)) continue // a passed stop-year is not offerable
    const odds = Math.round(r.quantizedLowerBound * 10)
    if (odds >= crownedOdds) continue // strictly-lower only (excludes cleared-then-dipped earlier offsets)
    if (best === null || r.offsetYears > best.offsetYears) best = { offsetYears: r.offsetYears, odds }
  }
  if (best === null) return null
  return { yearsSooner: track.offsetYears - best.offsetYears, oddsText: slots.xOfTen(best.odds) }
}
