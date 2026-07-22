/**
 * THE §S0.2 NEAR-TIE INVERSION STRESS GATE — the full-scale run (U16 build spec; the runway
 * item-7 dissent's recorded flip condition, absorbed by the U16 pre-build council wf_8d4c6f65-415).
 *
 * Runs the measured near-tie class (the Q4d Medicare-bearing world at the 16k calibrated floor)
 * through `runNearTieInversionProbe`: the conversion-vs-no-conversion advantage under the shipped
 * i.i.d.-lognormal draw (control) vs the block-bootstrap historical-shape draw, at three block
 * lengths — L=10 (primary), L=5 (robustness), L=1 (the i.i.d. permutation null: expected NOT to
 * fire, the criterion's own control arm). The FIRES criterion is PRE-REGISTERED in
 * `nearTieInversion.ts` (never tuned against this output).
 *
 * IF ANY REAL ARM (L=10 / L=5) FIRES: the richer draw is a HARD upstream prerequisite — STOP,
 * re-convene per the spec. The verdict lands as a dated stamp in
 * `docs/plans/features/act4-u16-recommendation-surface-build-spec.md` §S0.2 either way.
 *
 * Run: `pnpm tsx scripts/stress-near-tie-inversion.ts`  (~5–10 min on the reference device)
 */
import {
  nearTieRunnerUp,
  nearTieWinner,
  q4dNearTieWorld,
  runNearTieInversionProbe,
  type InversionProbeResult,
} from '@engine/validation/nearTieInversion'

const PATHS = 16_000 // the calibrated floor — the same scale the demotion class was measured at
const HEIR_BRACKET = 0.25 // observational tier-2 column only (never part of the criterion)

// Pre-registered rep seeds — distinct primes ×1e3-ish, fixed BEFORE the first run.
const SEEDS = [10007, 20011, 30011, 40009, 50021, 60013, 70001, 80021, 90001, 100003, 110017, 120011] as const

const base = q4dNearTieWorld(PATHS)

const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(5)

function report(label: string, r: InversionProbeResult): void {
  console.log(`\n=== ${label} ===`)
  console.log('  seed      ctrl-adv    boot-adv')
  for (const rep of r.readings) {
    console.log(`  ${String(rep.seed).padEnd(8)} ${fmt(rep.control.advantage)}   ${fmt(rep.bootstrap.advantage)}`)
  }
  console.log(`  control  mean advantage : ${fmt(r.controlMeanAdvantage)}  (winner in ${r.controlWinnerReps}/${r.readings.length} reps)`)
  console.log(`  bootstrap mean advantage: ${fmt(r.bootstrapMeanAdvantage)}  (winner in ${r.bootstrapWinnerReps}/${r.readings.length} reps)  SE-of-mean ${r.bootstrapAdvantageSeOfMean.toFixed(6)}`)
  console.log(`  shape penalty           : ${fmt(r.shapePenalty)}  (positive = historical shape harsher on conversion — the §3–§5 direction)`)
  console.log(`  FIRES                   : ${r.fires ? '*** YES — STOP, the richer draw is a prerequisite ***' : 'no'}`)
}

console.log('[stress-near-tie-inversion] the Q4d Medicare-bearing near-tie class at 16k paths ×', SEEDS.length, 'reps…')
console.log('  world: all-65+ MFJ, $2.15M (1.9M pretax), 124k spend, trended Part B + IRMAA; pair: 30k×3yr conversion vs conversion-0')

for (const [label, blockLength] of [
  ['PRIMARY — moving-block L=10', 10],
  ['ROBUSTNESS — moving-block L=5', 5],
  ['NULL CONTROL — L=1 (i.i.d. permutation; expected NOT to fire)', 1],
] as const) {
  const t0 = Date.now()
  const result = runNearTieInversionProbe({
    base,
    winner: nearTieWinner,
    runnerUp: nearTieRunnerUp,
    seeds: SEEDS,
    blockLength,
    heirBracket: HEIR_BRACKET,
  })
  report(`${label}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`, result)
}

console.log('\n[stress-near-tie-inversion] done — record the verdict as a dated stamp in the U16 build spec §S0.2.')
