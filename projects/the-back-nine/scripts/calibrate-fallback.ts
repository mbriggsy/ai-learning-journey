/**
 * THE §S0.1 REFERENCE-DEVICE FALLBACK-KNOB CALIBRATION (U16 build spec; council wf_8d4c6f65-415
 * Q3: knob-pin is TASK ZERO, calibrated for RANK-STABILITY, never latency alone).
 *
 * Measures, on the reference device (Briggsy's real laptop — the dev machine), through the
 * SHIPPED search→select path (`runSearch` + `selectRecommendation` — the exact crown U16
 * renders; the 095 shipped-path law):
 *
 *  1. `solverInteractivePaths` — the smallest path rung at which EVERY battery cell's crown is
 *     IDENTICAL to its 16k-truth crown (winner-cannot-flip), then ONE RUNG of headroom (the
 *     class-plus-headroom idiom). tieTolerance runs at 0 — the STRICTEST regime (a looser live
 *     tolerance only makes flips rarer), so the pin is conservative-safe.
 *  2. `solverCoarseSurvivors` — at the pinned rung, the worst rank-position of the 16k-truth
 *     crown inside the rung's own selection ordering, +1 to convert position→count, +1 headroom:
 *     the refine set provably contains the true optimum on every measured cell.
 *  3. `solverCandidateCeiling` — the largest roster whose FULL-precision (16k, both seed-sets)
 *     search fits the ~20s interactive-window anchor (the shipped FuckOffDate working-sweep
 *     precedent — base.css names the ~20s breathe as the accepted working wait), from the
 *     measured per-candidate cost on the worst-case world.
 *
 * The BATTERY deliberately includes the measured near-tie class (the Q4d world + a dense
 * conversion grid) — the flip-prone regime that DRIVES the rank-stability requirement — plus
 * the profile worst case (both healthcare regimes, longest horizon) and the fast known-robust
 * world (the easy contrast cell).
 *
 * Run: `pnpm tsx scripts/calibrate-fallback.ts`  (~4–8 min on the reference device)
 * The measured values pin `fallback.ts` with THIS script + date in the citation.
 */
import { performance } from 'node:perf_hooks'
import type { SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '@engine/solver/candidates'
import { runSearch } from '@engine/solver/search'
import { selectRecommendation } from '@engine/solver/select'
import type { OracleGoal } from '@engine/validation/evaluate'
import { q4dNearTieWorld } from '@engine/validation/nearTieInversion'

const TRUTH_PATHS = 16_000
const RUNGS = [1_000, 2_000, 4_000, 8_000] as const
const SEED_A = 0xca11b
const INTERACTIVE_WINDOW_MS = 20_000 // the shipped ~20s working-route precedent (base.css)

// ---- The battery ----------------------------------------------------------------------------

const conv = (amount: number): CandidateStrategy => ({
  policy: 'taxable-first',
  conversion: { annualAmountReal: amount, startYearOffset: 0, years: 3 },
  provenance: 'grid',
  anchoredRail: { kind: 'bracket-edge', edge: 100_000 + amount },
})

/** The profile-solver worst case (scripts/profile-solver.ts — both healthcare regimes, 45y). */
const worstCase = (paths: number): SimulationParams => ({
  initialPortfolio: 1_400_000,
  annualSpendingReal: 80_000,
  stockWeight: 0.55,
  people: [
    { sex: 'female', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
    { sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 22_000, socialSecurityClaimAge: 67 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'taxable-first',
  market: {
    stock: { mean: 0.04, stdDev: 0.12 },
    bond: { mean: 0.015, stdDev: 0.05 },
    inflation: { mean: 0.03, stdDev: 0.041 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  },
  paths,
  maxHorizonYears: 45,
  longevityMode: 'sampled',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 500_000, pretax: 800_000, roth: 100_000 },
    initialTaxableBasis: 400_000,
    filing: 'mfj',
    healthcareEnabled: true,
    enhancedSubsidies: true,
    slcsp: Array.from({ length: 45 }, () => 18_000),
    enrolledPremium: Array.from({ length: 45 }, () => 18_000),
    irmaaMagiSeed: [130_000, 130_000],
  },
})

/** The fast known-robust world (the gradeCalibration probe world's shape). */
const robustWorld = (paths: number): SimulationParams => ({
  initialPortfolio: 700_000,
  annualSpendingReal: 52_000,
  stockWeight: 0.5,
  people: [
    { sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
    { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'taxable-first',
  market: {
    stock: { mean: 0.04, stdDev: 0.12 },
    bond: { mean: 0.015, stdDev: 0.05 },
    inflation: { mean: 0.03, stdDev: 0.041 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  },
  paths,
  maxHorizonYears: 14,
  longevityMode: 'fixed-horizon',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 250_000, pretax: 400_000, roth: 50_000 },
    initialTaxableBasis: 200_000,
    filing: 'mfj',
  },
})

interface Cell {
  readonly name: string
  readonly world: (paths: number) => SimulationParams
  readonly candidates: readonly CandidateStrategy[]
  readonly goal: OracleGoal
  readonly heirBracket?: number
}

const CELLS: readonly Cell[] = [
  {
    name: 'W1 worst-case (both-regime healthcare, 45y, 8-roster, leave-more)',
    world: worstCase,
    candidates: [
      { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
      { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
      { policy: 'proportional', conversion: null, provenance: 'grid' },
      conv(10_000),
      conv(20_000),
      conv(30_000),
      conv(40_000),
      conv(50_000),
    ],
    goal: 'leave-more',
    heirBracket: 0.25,
  },
  {
    name: 'W2 near-tie class (Q4d Medicare-bearing, dense conversion grid, pay-less-tax)',
    world: q4dNearTieWorld,
    candidates: [
      { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
      conv(10_000),
      conv(20_000),
      conv(30_000),
      conv(40_000),
      conv(50_000),
    ],
    goal: 'pay-less-tax',
  },
  {
    name: 'W3 known-robust (fast contrast cell, leave-more)',
    world: robustWorld,
    candidates: [
      { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
      { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
      { policy: 'taxable-first', conversion: { annualAmountReal: 250_000, startYearOffset: 0, years: 1 }, provenance: 'grid' },
    ],
    goal: 'leave-more',
    heirBracket: 0.25,
  },
]

// ---- The measurement ------------------------------------------------------------------------

interface CellReading {
  readonly winnerId: string
  readonly rankedIds: readonly string[]
  readonly searchMs: number
}

function crownAt(cell: Cell, paths: number): CellReading {
  const t0 = performance.now()
  const search = runSearch({
    base: cell.world(paths),
    candidates: cell.candidates,
    seedA: SEED_A,
    goal: cell.goal,
    tieTolerance: 0,
    ...(cell.heirBracket !== undefined ? { heirBracket: cell.heirBracket } : {}),
  })
  const searchMs = performance.now() - t0
  const sel = selectRecommendation(search)
  if (sel.kind !== 'selected') {
    throw new Error(`[calibrate] ${cell.name} @ ${paths}: selection WITHHELD (${sel.kind}) — the battery must select`)
  }
  return { winnerId: sel.winnerId, rankedIds: sel.rankedIds, searchMs }
}

console.log('[calibrate-fallback] reference-device measurement (the dev laptop IS the reference device)…')

const truths = new Map<string, CellReading>()
for (const cell of CELLS) {
  const t = crownAt(cell, TRUTH_PATHS)
  truths.set(cell.name, t)
  console.log(`\nTRUTH ${cell.name}\n  16k crown = ${t.winnerId}  [search ${(t.searchMs / 1000).toFixed(1)}s, ${cell.candidates.length} candidates]`)
}

interface RungRow {
  readonly rung: number
  readonly allMatch: boolean
  readonly worstTruthPosition: number
  readonly detail: string[]
}

const rows: RungRow[] = []
for (const rung of RUNGS) {
  let allMatch = true
  let worstTruthPosition = 0
  const detail: string[] = []
  for (const cell of CELLS) {
    const truth = truths.get(cell.name) as CellReading
    const r = crownAt(cell, rung)
    const match = r.winnerId === truth.winnerId
    const pos = r.rankedIds.indexOf(truth.winnerId)
    if (pos < 0) throw new Error(`[calibrate] truth crown ${truth.winnerId} missing from the rung ranking`)
    allMatch &&= match
    worstTruthPosition = Math.max(worstTruthPosition, pos)
    detail.push(`    ${cell.name.slice(0, 14)}… crown ${match ? '==' : '!= (' + r.winnerId + ')'} truth; truth at rung-position ${pos}`)
  }
  rows.push({ rung, allMatch, worstTruthPosition, detail })
  console.log(`\nRUNG ${rung}: crowns ${allMatch ? 'ALL MATCH truth' : 'DIVERGE'}; worst truth-position ${worstTruthPosition}`)
  for (const d of detail) console.log(d)
}

// ---- The derivations ------------------------------------------------------------------------

const passing = rows.filter((r) => r.allMatch)
const smallestPassing = passing.length > 0 ? (passing[0] as RungRow) : undefined
// Every rung above the smallest passing one must ALSO pass (a non-monotone pass is suspicious —
// report it loudly rather than pin on a lucky rung).
const monotone =
  smallestPassing !== undefined && rows.filter((r) => r.rung >= smallestPassing.rung).every((r) => r.allMatch)

console.log('\n---- DERIVATIONS ----')
if (smallestPassing === undefined || !monotone) {
  console.log(
    smallestPassing === undefined
      ? 'NO rung matched truth on every cell → solverInteractivePaths pins to 16000 (the interactive tier cannot reduce paths safely on this battery — the honest outcome).'
      : `NON-MONOTONE pass pattern (smallest passing ${smallestPassing.rung} but a higher rung diverged) — pin 16000 and investigate before trusting a reduced tier.`,
  )
  console.log('solverInteractivePaths = 16000')
} else {
  const idx = RUNGS.indexOf(smallestPassing.rung as (typeof RUNGS)[number])
  const headroom = idx + 1 < RUNGS.length ? RUNGS[idx + 1] : TRUTH_PATHS
  console.log(`smallest all-match rung = ${smallestPassing.rung} → +1 rung headroom → solverInteractivePaths = ${headroom}`)
  // Survivors: at the PINNED rung, the worst truth-position (+1 → count, +1 headroom).
  const pinnedRow = rows.find((r) => r.rung === headroom)
  const worstPos = pinnedRow !== undefined ? pinnedRow.worstTruthPosition : smallestPassing.worstTruthPosition
  console.log(`worst truth-position at the pinned rung = ${worstPos} → solverCoarseSurvivors = ${worstPos + 2} (position+1 → count, +1 headroom)`)
}

// Ceiling: per-candidate FULL-precision cost on the worst-case cell (search runs BOTH seed-sets).
const w1 = truths.get(CELLS[0]?.name as string) as CellReading
const perCandidateMs = w1.searchMs / (CELLS[0] as Cell).candidates.length
console.log(
  `W1 16k search ${(w1.searchMs / 1000).toFixed(1)}s / ${(CELLS[0] as Cell).candidates.length} candidates = ${(perCandidateMs / 1000).toFixed(2)}s per candidate (both seed-sets)`,
)
console.log(
  `solverCandidateCeiling = floor(${INTERACTIVE_WINDOW_MS / 1000}s window / per-candidate) = ${Math.floor(INTERACTIVE_WINDOW_MS / perCandidateMs)}`,
)
console.log('\n[calibrate-fallback] done — pin fallback.ts with these values + this script/date in the citations.')
