/**
 * THE NO-DOLLAR WITNESS HUNT (the U16 fold's filed increment, 2026-07-23) — a bounded probe for a
 * dev-seed household whose LIVE solve routes the committed recommendation to the honest no-dollar
 * register via the F1 fold's guards — the seed-B DISPLAY INVERSION (`winnerDisplaysAhead` false) or
 * the ZERO-COLLAPSE sibling (`formatDeltaDollar(delta) === '0'`) — with `noChange` FALSE (a real
 * crown, not the designed compose face). The filed item says "if constructible": a dry sweep is an
 * honest refusal, recorded, never a faked seed.
 *
 * THE CONSTRUCTIBLE REGIME (why this can exist at all): with the live `tieTolerance: 0` the
 * survival top-set is the STRICT max, so in a non-surplus world the crown is decided on SEED-A
 * SURVIVAL alone — the goal dollar never voted. A candidate that survives a hair better than the
 * conventional prior while paying MORE lifetime tax (or leaving LESS) at seed-B display is exactly
 * an inversion; a candidate whose goal-dollar edge is real-but-sub-step is the zero-collapse.
 *
 * METHOD (the shipped-path law, insight 095): every probe drives the REAL intake builder
 * (`buildSolveRequest` over a ScenarioDraft variant of the shipped `retired` seed) → the REAL
 * `runSearch` → `selectRecommendation` — the exact crown U16 renders. SCREEN at 4,000 paths
 * (rank-stable per the §S0.1 calibration), CONFIRM hits at the live 16,000 through the FULL
 * `solveWithMint` (the mint must clear — a witness that token-withholds walks nothing).
 *
 * Run: `pnpm tsx scripts/hunt-no-dollar-witness.ts`  (background; ~10–20 min on the dev laptop)
 */
import { performance } from 'node:perf_hooks'
import type { ScenarioDraft } from '@store/memoryModel'
import type { EnteredAccount } from '@shared/model'
import { DEV_SEEDS } from '../src/ui/devSeeds'
import { buildSolveRequest } from '../src/intake/solveDispatch'
import { solveWithMint } from '@engine/solver/solveEntry'
import { runSearch } from '@engine/solver/search'
import { selectRecommendation } from '@engine/solver/select'
import { goalHeadlineStatistic } from '@engine/solver/objective'
import { evaluateMedicareTrendClause } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'

// ---- the view-model predicates, mirrored EXACTLY (recommendationView.ts / money.ts) --------------

/** money.ts `formatDeltaDollar` — the sign-agnostic magnitude-scaled step (mirrored verbatim; the
 *  witness pin in the build re-imports the real one — this script only screens). */
const formatDeltaDollar = (deltaReal: number): string => {
  const v = Math.abs(deltaReal)
  const step = v < 10_000 ? 100 : v < 100_000 ? 1_000 : 10_000
  return new Intl.NumberFormat('en-US').format(Math.round(v / step) * step)
}

const FRESH = ((): number => {
  // devSeeds.test convention: pinned inside the ACA freshness window so the mint clears on any wall-clock.
  const iso = acaEnhancedSubsidyStatus.value.verifiedOn
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000) + 5
})()

// ---- the variant family --------------------------------------------------------------------------

/** A realistic all-retired couple: the shipped `retired` household's shape with the IRA split into
 *  pretax/roth/brokerage variants and the spend swept. Owner alternates so per-person RMD stays real. */
function variant(opts: {
  readonly pretax: number
  readonly roth: number
  readonly brokerage: number
  readonly basisFraction: number
  readonly spendAnnual: number
}): ScenarioDraft {
  const base = DEV_SEEDS.retired
  // Every no-ticker account REQUIRES a per-account manualBlend (burned/062 — never a silent
  // default); the first run missed this and the builder nulled every variant at 0ms.
  const blend = { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } as const
  const accounts: EnteredAccount[] = []
  if (opts.pretax > 0) accounts.push({ ownerIndex: 0, kind: 'traditional-ira', valueToday: opts.pretax, manualBlend: blend })
  if (opts.roth > 0) accounts.push({ ownerIndex: 1, kind: 'roth-ira', valueToday: opts.roth, manualBlend: blend })
  if (opts.brokerage > 0) {
    accounts.push({
      ownerIndex: 0,
      kind: 'brokerage',
      valueToday: opts.brokerage,
      basis: Math.round(opts.brokerage * opts.basisFraction),
      manualBlend: blend,
    })
  }
  return {
    ...base,
    enteredAccounts: accounts,
    annualSpendingReal: opts.spendAnnual,
    // Budget lines, if any, must reconcile with annualSpendingReal — the retired seed's shape is
    // scalar-only (no budget), so overriding the scalar alone stays reconciled.
  }
}

interface Probe {
  readonly id: string
  readonly draft: ScenarioDraft
}

const probes: Probe[] = []
const total = 1_055_000 // the shipped retired household's portfolio scale (post trend re-tune)
const FAMILY = process.env.HUNT_FAMILY === 'b' ? 'b' : 'a'
if (FAMILY === 'a') {
  // FAMILY A — the broad split × spend sweep (borderline/on-track worlds; survival-crowned regime).
  for (const pretaxF of [0.5, 0.7, 0.85]) {
    for (const rothF of [0.05, 0.15]) {
      const brokerageF = 1 - pretaxF - rothF
      if (brokerageF < 0.05) continue
      for (const basisFraction of [0.5, 0.9]) {
        for (const spend of [58_000, 66_000, 74_000]) {
          probes.push({
            id: `p${Math.round(pretaxF * 100)}-r${Math.round(rothF * 100)}-b${Math.round(basisFraction * 100)}-s${spend / 1000}k`,
            draft: variant({
              pretax: Math.round(total * pretaxF),
              roth: Math.round(total * rothF),
              brokerage: Math.round(total * brokerageF),
              basisFraction,
              spendAnnual: spend,
            }),
          })
        }
      }
    }
  }
} else {
  // FAMILY B — the NEAR-TIE window (the SE analysis's regime): a dominant pre-tax pool with tiny
  // taxable/roth side buckets (the sequencing policies nearly coincide), the user's own policy set
  // to the CONVENTIONAL taxable-first (the baselines merge), and FINE spend steps hunting the
  // narrow adv_A ∈ (z·SE, display-step) window where a crown survives shrinkage on seed-A while the
  // seed-B display delta formats to '0' (or inverts on the independent held-out draw).
  for (const taxable of [15_000, 30_000]) {
    for (const roth of [10_000, 25_000]) {
      for (const spend of [56_000, 60_000, 64_000, 68_000, 72_000]) {
        probes.push({
          id: `nt-t${taxable / 1000}k-r${roth / 1000}k-s${spend / 1000}k`,
          draft: {
            ...variant({
              pretax: total - taxable - roth,
              roth,
              brokerage: taxable,
              basisFraction: 1,
              spendAnnual: spend,
            }),
            drawdownPolicy: 'taxable-first',
          },
        })
      }
    }
  }
}

// ---- the screen ----------------------------------------------------------------------------------

interface Hit {
  readonly probeId: string
  readonly goal: 'pay-less-tax' | 'leave-more'
  readonly route: 'inversion' | 'zero-collapse'
  readonly winnerId: string
  readonly conventionalId: string
  readonly deltaReal: number
  readonly formatted: string
  readonly survivalGapA: number
  readonly surplus: boolean
}

function screen(probe: Probe, goal: 'pay-less-tax' | 'leave-more', paths: number): Hit | null {
  const draft: ScenarioDraft = { ...probe.draft, chosenGoal: goal }
  const req = buildSolveRequest(draft, FRESH)
  if (typeof req === 'string') return null // the builder's typed refusal — not this probe's regime
  const base = { ...req.base, paths }
  const heirBracket = req.ranking.heirBracket
  const search = runSearch({
    base,
    candidates: req.candidates, // trend sourced ⇒ the WHOLE roster ranks (asserted below at startup)
    seedA: req.seedA,
    goal,
    tieTolerance: req.tieTolerance,
    ...(heirBracket !== undefined ? { heirBracket } : {}),
  })
  const sel = selectRecommendation(search)
  if (sel.kind !== 'selected' || sel.noChange) return null
  const winnerEval = search.evaluations[sel.winnerIndex]!
  const conv = search.conventionalBaseline
  if (winnerEval.b.kind !== 'scored' || conv.b.kind !== 'scored') return null
  const winB = goalHeadlineStatistic(winnerEval.b.score, goal)
  const baseB = goalHeadlineStatistic(conv.b.score, goal)
  const deltaReal = goal === 'leave-more' ? winB - baseB : baseB - winB
  const winnerDisplaysAhead = goal === 'leave-more' ? winB >= baseB : winB <= baseB
  const collapses = formatDeltaDollar(deltaReal) === '0'
  if (winnerDisplaysAhead && !collapses) return null
  const winA = winnerEval.a.kind === 'scored' ? winnerEval.a.score.survival : NaN
  const convA = conv.a.kind === 'scored' ? conv.a.score.survival : NaN
  return {
    probeId: probe.id,
    goal,
    route: winnerDisplaysAhead ? 'zero-collapse' : 'inversion',
    winnerId: sel.winnerId,
    conventionalId: search.evaluations.indexOf(conv) >= 0 ? sel.rankedIds[sel.rankedIndices.indexOf(search.evaluations.indexOf(conv))] ?? 'conventional' : 'conventional',
    deltaReal,
    formatted: formatDeltaDollar(deltaReal),
    survivalGapA: winA - convA,
    surplus: sel.surplusRegime,
  }
}

// ---- main ----------------------------------------------------------------------------------------

const t0 = performance.now()
if (evaluateMedicareTrendClause(true) !== null) {
  throw new Error('[hunt] the Medicare trend clause is BLOCKING — the roster partition below is wrong; rewrite the screen')
}
console.log(`[hunt] ${probes.length} probes × 2 goals; screen at 4,000 paths, confirm at 16,000`)

const hits: Hit[] = []
let done = 0
for (const probe of probes) {
  for (const goal of ['pay-less-tax', 'leave-more'] as const) {
    const t = performance.now()
    let hit: Hit | null = null
    let err: string | null = null
    try {
      hit = screen(probe, goal, 4_000)
    } catch (e) {
      err = (e as Error).message
    }
    done++
    const ms = Math.round(performance.now() - t)
    if (err !== null) {
      console.log(`[hunt] ${done} ${probe.id}/${goal} ERROR ${ms}ms: ${err.slice(0, 140)}`)
    } else if (hit !== null) {
      hits.push(hit)
      console.log(`[hunt] ${done} ${probe.id}/${goal} *** HIT (${hit.route}) delta=${hit.deltaReal.toFixed(0)} fmt=${hit.formatted} survGapA=${hit.survivalGapA.toFixed(4)} winner=${hit.winnerId} ${ms}ms`)
    } else {
      console.log(`[hunt] ${done} ${probe.id}/${goal} miss ${ms}ms`)
    }
  }
}

console.log(`\n[hunt] screen done: ${hits.length} raw hits in ${Math.round((performance.now() - t0) / 1000)}s`)

// ---- confirm at the LIVE counts through the FULL mint --------------------------------------------

for (const hit of hits) {
  const probe = probes.find((p) => p.id === hit.probeId)!
  const draft: ScenarioDraft = { ...probe.draft, chosenGoal: hit.goal }
  const req = buildSolveRequest(draft, FRESH)
  if (typeof req === 'string') {
    console.log(`[confirm] ${hit.probeId}/${hit.goal}: builder refused (${req}) at confirm (?!) — dropped`)
    continue
  }
  const t = performance.now()
  const payload = solveWithMint(req) // the LIVE 16k paths — the real arc, mint included
  const ms = Math.round(performance.now() - t)
  if (payload.kind !== 'recommended') {
    console.log(`[confirm] ${hit.probeId}/${hit.goal}: payload=${payload.kind} (not recommended) ${ms}ms — dropped`)
    continue
  }
  const winB = payload.winner.headlineStatisticB
  const baseB = payload.noActionBaseline.headlineStatisticB
  const deltaReal = hit.goal === 'leave-more' ? winB - baseB : baseB - winB
  const ahead = hit.goal === 'leave-more' ? winB >= baseB : winB <= baseB
  const collapses = formatDeltaDollar(deltaReal) === '0'
  const noDollar = payload.noChange || !ahead || collapses
  console.log(
    `[confirm] ${hit.probeId}/${hit.goal}: kind=recommended noChange=${payload.noChange} surplus=${payload.surplusRegime} ` +
      `delta=${deltaReal.toFixed(0)} fmt=${formatDeltaDollar(deltaReal)} ahead=${ahead} → ${
        noDollar && !payload.noChange ? '*** LIVE WITNESS ***' : 'no witness at 16k'
      } ${ms}ms`,
  )
  console.log(`[confirm]   draft knobs: ${JSON.stringify({ accounts: probe.draft.enteredAccounts, spend: probe.draft.annualSpendingReal })}`)
}
console.log(`[hunt] total ${Math.round((performance.now() - t0) / 1000)}s`)
