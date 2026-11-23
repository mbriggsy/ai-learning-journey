/**
 * The workbench plan's U4 measurements (KTD3, KTD9), printed as the tables in
 * `docs/decisions/workbench-one-future.md`. Writes nothing; re-run it to re-read the record's numbers.
 *
 * 1. The rough market's pick at 40%, 50%, 60% and 100% stocks, in two frames:
 *    - history's own frame: `rankRoughWindows` (bisection on `backtestWindow` over the committed series);
 *    - the plan's market: each window's standardized scores (`shillerJointZSeries`) through the engine's own
 *      transform (`simpleReturnFromNormal` on the production market's log moments), ranked by the closed form
 *      x* = 1 / Σ_k 1 / Π_{j<k} g_j (a start-of-year flat real draw, rebalanced growth g). A second ranking,
 *      never a reuse of `rankRoughWindows`.
 * 2. On every shipped seed, on the run the year-by-year table would show (KTD9: an all-retired seed's spine;
 *    a dated working seed's candidate at its band's offset on its band's track, from the final-tier date
 *    search the result screen commits; a working seed with no date on either track, the window-top
 *    candidate's full pass):
 *    (a) the steady future's year-by-year total against the band's middle line (n/a where the product draws
 *        no band: the window-top pass);
 *    (b) where the rough future sits among the plan's many futures, year by year, on that same run and
 *        track: the band slot (below the 10th percentile, 10th to 25th, …) its total falls in.
 *    Plus the guard U4's Verification names: the rough path ending above the steady one, or sitting above
 *    the middle line, is printed as a STOP line.
 *
 * 1b. Why (a) parts by stock share: a yearly-rebalanced mix's typical compound growth against the steady path's.
 *
 * Run: `pnpm tsx scripts/measure-one-future.ts`  (the dated seeds each run an 11-candidate sweep at 16,000
 * paths; about 20 minutes in all). `--quick` prints 1 and 1b only, in seconds.
 */
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'
import {
  DATE_OFFSET_WINDOW_TOP,
  DATE_SEARCH_PATHS,
  buildCandidateParams,
  runDateSearch,
} from '@engine/dateSearch'
import { simulate, steadyFuture } from '@engine/simulate'
import { ROUGH_WINDOW_YEARS, rankRoughWindows, roughFuture } from '@engine/reference/roughSequence'
import { shillerJointZSeries } from '@engine/validation/blockBootstrap'
import { productionMarket } from '@engine/reference/methodology'
import { simpleReturnFromNormal, toLogMoments } from '@engine/rng'
import type { BandFan, DateTrackOutcome, LedgerYearRow, NamedFuture, SimulationParams } from '@shared/model'

const WEIGHTS = [0.4, 0.5, 0.6, 1] as const
const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`

// ---------------------------------------------------------------------------------------------
// 1. The pick in two frames
// ---------------------------------------------------------------------------------------------

interface Ranked {
  readonly startYear: number
  readonly rate: number
}

const pickOf = (ranks: readonly Ranked[]): Ranked =>
  ranks.reduce((worst, r) => (r.rate < worst.rate ? r : worst), ranks[0]!)

const closedFormRate = (gs: readonly number[]): number => {
  let pv = 0
  let grown = 1
  for (const g of gs) {
    pv += 1 / grown
    grown *= g
  }
  return 1 / pv
}

function rankInPlanMarket(w: number): Ranked[] {
  const m = productionMarket.value
  const lmS = toLogMoments(m.stock.mean, m.stock.stdDev)
  const lmB = toLogMoments(m.bond.mean, m.bond.stdDev)
  const joint = shillerJointZSeries()
  const out: Ranked[] = []
  for (let s = 0; s + ROUGH_WINDOW_YEARS <= joint.length; s++) {
    const gs = joint
      .slice(s, s + ROUGH_WINDOW_YEARS)
      .map((y) => w * (1 + simpleReturnFromNormal(lmS, y.zStock)) + (1 - w) * (1 + simpleReturnFromNormal(lmB, y.zBond)))
    out.push({ startYear: joint[s]!.year, rate: closedFormRate(gs) })
  }
  return out
}

const rankOf = (ranks: readonly Ranked[], year: number): number =>
  [...ranks].sort((a, b) => a.rate - b.rate || a.startYear - b.startYear).findIndex((r) => r.startYear === year) + 1

function printPicks(): void {
  console.log('## The pick in two frames\n')
  console.log('| Stocks | History’s frame: worst start (rate) | 1966’s place | The plan’s market: worst start (rate) | 1966’s place | Agree? |')
  console.log('|---|---|---|---|---|---|')
  for (const w of WEIGHTS) {
    const hist = rankRoughWindows(w).map((r) => ({ startYear: r.startYear, rate: r.sustainableRate }))
    const plan = rankInPlanMarket(w)
    const hp = pickOf(hist)
    const pp = pickOf(plan)
    console.log(
      `| ${pct(w, 0)} | ${hp.startYear} (${pct(hp.rate)}) | ${rankOf(hist, 1966)} of ${hist.length} (${pct(hist.find((r) => r.startYear === 1966)!.rate)}) | ` +
        `${pp.startYear} (${pct(pp.rate)}) | ${rankOf(plan, 1966)} of ${plan.length} (${pct(plan.find((r) => r.startYear === 1966)!.rate)}) | ${hp.startYear === pp.startYear ? 'yes' : 'no'} |`,
    )
  }
  // The five worst starts at 50% in each frame, for the record's "where they disagree".
  const five = (ranks: readonly Ranked[]) =>
    [...ranks]
      .sort((a, b) => a.rate - b.rate || a.startYear - b.startYear)
      .slice(0, 5)
      .map((r) => `${r.startYear} (${pct(r.rate)})`)
      .join(', ')
  for (const w of WEIGHTS) {
    console.log(`\nFive worst at ${pct(w, 0)}: history ${five(rankRoughWindows(w).map((r) => ({ startYear: r.startYear, rate: r.sustainableRate })))}; plan’s market ${five(rankInPlanMarket(w))}`)
  }
  console.log('')
}

// ---------------------------------------------------------------------------------------------
// 1b. Why steady and the middle line part: a rebalanced mix's typical growth against steady's
// ---------------------------------------------------------------------------------------------

/** Over many years the middle of a product of independent yearly growth factors compounds at exp(E[log g]), so a
 *  yearly-rebalanced mix's typical growth beats the steady path's (each asset at its middle return) by
 *  E[log g] − log g(0, 0). Integrated on a grid over the two independent standard normals. */
function printMixGain(): void {
  const m = productionMarket.value
  const s = toLogMoments(m.stock.mean, m.stock.stdDev)
  const b = toLogMoments(m.bond.mean, m.bond.stdDev)
  const n = 1201
  const h = 16 / (n - 1)
  const phi = (z: number) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI)
  console.log('## A rebalanced mix’s typical growth against the steady path’s (the production market)\n')
  console.log('| Stocks | Typical growth a year | Steady growth a year | Gap (points a year) |')
  console.log('|---|---|---|---|')
  for (const w of [0.4, 0.56, 0.6, 0.67, 0.97, 0.98, 1]) {
    let e = 0
    let mass = 0
    for (let i = 0; i < n; i++) {
      const zs = -8 + i * h
      for (let j = 0; j < n; j++) {
        const zb = -8 + j * h
        const p = phi(zs) * phi(zb) * h * h
        e += p * Math.log(w * Math.exp(s.mu + s.sigma * zs) + (1 - w) * Math.exp(b.mu + b.sigma * zb))
        mass += p
      }
    }
    const steady = Math.log(w * Math.exp(s.mu) + (1 - w) * Math.exp(b.mu))
    const gap = Math.abs(e / mass - steady) < 5e-7 ? 0 : e / mass - steady // all stocks: no mix, no gap (not "-0.000")
    console.log(`| ${pct(w, 0)} | ${pct(Math.exp(e / mass) - 1, 3)} | ${pct(Math.exp(steady) - 1, 3)} | ${(gap * 100).toFixed(3)} |`)
  }
  console.log('')
}

// ---------------------------------------------------------------------------------------------
// 2. The two measurements on every seed
// ---------------------------------------------------------------------------------------------

type Track = 'full' | 'floor'
interface TableRun {
  readonly route: string
  readonly base: SimulationParams
  readonly track: Track
  /** The many-futures fan on the table's run and track. */
  readonly fan: BandFan
  /** True where the product draws this fan as the band (so (a) reads); false on the window-top pass. */
  readonly bandDrawn: boolean
}

const dated = (t: DateTrackOutcome) => t.kind === 'confirmed-date' || t.kind === 'window-edge-unconfirmed'

async function tableRunOf(key: string, seed: number): Promise<TableRun | string> {
  const d = DEV_SEEDS[key as keyof typeof DEV_SEEDS]
  const spine = buildSpineParams(d)
  if (spine !== null) {
    const many = simulate(spine, seed, { bandFan: true })
    if (many.indeterminate || many.infeasible) return `spine run refused: ${JSON.stringify(many).slice(0, 200)}`
    return { route: 'spine', base: spine, track: 'full', fan: many.distribution.bandFan!, bandDrawn: true }
  }
  const input = buildDateInput(d)
  if (input === null) return 'no date input (the draft builds no run)'
  const out = await runDateSearch(input, seed, { tier: 'final' })
  if (out.kind !== 'dates') return `date search: ${out.kind}${'reason' in out ? ` (${out.reason})` : ''}`
  if (out.band !== undefined) {
    const track: Track = out.band.track === 'floor' ? 'floor' : 'full'
    return {
      route: `dated, offset ${out.band.offsetYears}${track === 'floor' ? ', floor' : ''}`,
      base: buildCandidateParams(input, out.band.offsetYears, DATE_SEARCH_PATHS.final),
      track,
      fan: out.band.fan,
      bandDrawn: true,
    }
  }
  if (dated(out.lifestyle) || dated(out.floor)) return 'a track has a date and the band is missing: the table is withheld'
  const base = buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS.final)
  const many = simulate(base, seed, { bandFan: true })
  if (many.indeterminate || many.infeasible) return `window-top run refused: ${JSON.stringify(many).slice(0, 200)}`
  return { route: 'no date, window top', base, track: 'full', fan: many.distribution.bandFan!, bandDrawn: false }
}

interface Named {
  /** Total balance by year from now (index 0 = today), the run's own band-fan observation. */
  readonly total: readonly number[]
  readonly rows?: readonly LedgerYearRow[]
}

function namedRun(run: TableRun, seed: number, future: NamedFuture): Named {
  const one: SimulationParams = { ...run.base, paths: 1 }
  const withRows = one.overlay?.taxEnabled === true
  const out = simulate(one, seed, {
    namedFuture: future,
    bandFan: true,
    ...(run.track === 'floor' ? { bandFanTrack: 'floor' as const } : {}),
    ...(withRows ? { ledgerRows: true, ...(run.track === 'floor' ? { ledgerTrack: 'floor' as const } : {}) } : {}),
  })
  if (out.indeterminate || out.infeasible) throw new Error(`named run refused: ${JSON.stringify(out).slice(0, 300)}`)
  return { total: out.distribution.bandFan!.byYear.map((y) => y.p50), rows: out.distribution.ledgerRows }
}

const SLOTS = ['under p10', 'p10–p25', 'p25–p50', 'p50–p75', 'p75–p90', 'over p90'] as const
/** Where a total sits among the many futures in one year. A total equal to a percentile sits AT it, never above
 *  it, so a run that is out of money among futures that are too is level with them, not above the middle. */
function slotOf(v: number, y: BandFan['byYear'][number]): number {
  if (v < y.p10) return 0
  if (v <= y.p25) return 1
  if (v <= y.p50) return 2
  if (v <= y.p75) return 3
  if (v <= y.p90) return 4
  return 5
}
/** True where the total is $0 and so is the middle line: out of money with at least half the futures. */
const tiedAtZero = (v: number, y: BandFan['byYear'][number]) => v === 0 && y.p50 === 0
const placeAt = (v: number, y: BandFan['byYear'][number]) =>
  tiedAtZero(v, y) ? '$0 with the middle' : SLOTS[slotOf(v, y)]!

const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`
const ratio = (a: number, b: number) => (b > 0 ? `${(a / b).toFixed(2)}×` : b === 0 && a === 0 ? '0 = 0' : 'mid $0')

interface SeedReading {
  readonly key: string
  readonly route: string
  readonly a: string
  readonly b: string
  readonly stops: string[]
  readonly ledgerGap: number
}

async function measureSeed(key: string): Promise<SeedReading> {
  const d = DEV_SEEDS[key as keyof typeof DEV_SEEDS]
  const seed = d.seed
  if (seed === undefined) return { key, route: 'no seed', a: 'n/a', b: 'n/a', stops: [], ledgerGap: 0 }
  const run = await tableRunOf(key, seed)
  if (typeof run === 'string') return { key, route: run, a: 'n/a', b: 'n/a', stops: [], ledgerGap: 0 }

  const steady = namedRun(run, seed, steadyFuture(run.base))
  const roughF = roughFuture(run.base)
  if (!roughF.ok) return { key, route: run.route, a: 'n/a', b: `refused: ${roughF.reason}`, stops: [], ledgerGap: 0 }
  const rough = namedRun(run, seed, roughF.future)
  const stops: string[] = []

  // The ledger cross-check: the steady run's own rows' end balances sum to the fan's total a year on.
  let ledgerGap = 0
  for (const r of steady.rows ?? []) {
    const sum = r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa
    const fanTotal = steady.total[r.t + 1]
    if (fanTotal !== undefined) ledgerGap = Math.max(ledgerGap, Math.abs(sum - fanTotal))
  }

  const last = steady.total.length - 1 // the steady lifespans' last year (both named runs share them)
  const checkpoints = [10, 20, 30, last].filter((t, i, a) => t >= 1 && t <= last && a.indexOf(t) === i)

  // (a) steady against the band's middle line.
  let a = 'n/a (no band drawn)'
  if (run.bandDrawn) {
    let above = 0
    let compared = 0
    let lo = Number.POSITIVE_INFINITY
    let hi = Number.NEGATIVE_INFINITY
    for (let t = 1; t <= last; t++) {
      const mid = run.fan.byYear[t]?.p50
      if (mid === undefined || mid <= 0) continue
      compared++
      if (steady.total[t]! > mid) above++
      const r = steady.total[t]! / mid
      lo = Math.min(lo, r)
      hi = Math.max(hi, r)
    }
    const at = checkpoints
      .map((t) => {
        const mid = run.fan.byYear[t]?.p50
        return mid === undefined ? `y${t} past the band` : `y${t} ${ratio(steady.total[t]!, mid)}`
      })
      .join(', ')
    a =
      compared === 0
        ? 'the middle line is $0 from year 1: nothing to compare'
        : `above the middle line in ${above} of ${compared} years; steady ÷ middle ${lo.toFixed(2)}–${hi.toFixed(2)}×; ${at}`
  }

  // (b) the rough future's slot among the many futures, year by year. A year where the rough run and the
  // middle line are both $0 is level, counted apart; every other year is below or above the middle line.
  let worstSlot = -1
  let worstYear = -1
  let belowMid = 0
  let level = 0
  let compared = 0
  for (let t = 1; t <= last; t++) {
    const y = run.fan.byYear[t]
    if (y === undefined) continue
    if (tiedAtZero(rough.total[t]!, y)) {
      level++
      continue
    }
    compared++
    const s = slotOf(rough.total[t]!, y)
    if (s <= 2) belowMid++
    if (s > worstSlot) {
      worstSlot = s
      worstYear = t
    }
    if (s >= 3) stops.push(`rough above the middle line at year ${t} (${money(rough.total[t]!)} against ${money(y.p50)})`)
  }
  const slotsAt = checkpoints
    .map((t) => {
      const y = run.fan.byYear[t]
      return y === undefined ? `y${t} past the band` : `y${t} ${placeAt(rough.total[t]!, y)}`
    })
    .join(', ')
  const b =
    (compared === 0
      ? `out of money with the middle line from year 1`
      : `below the middle line in ${belowMid} of ${compared} years${level > 0 ? ` (${level} more at $0 with it)` : ''}; ` +
        `highest slot ${SLOTS[worstSlot] ?? '—'} (year ${worstYear}); ${slotsAt}`) +
    `; rough ends ${money(rough.total[last]!)} against steady ${money(steady.total[last]!)}`
  if (rough.total[last]! > steady.total[last]!) stops.push(`rough ends above steady (${money(rough.total[last]!)} > ${money(steady.total[last]!)})`)

  return { key, route: `${run.route}, ${Math.round(run.base.stockWeight * 100)}% stocks`, a, b, stops, ledgerGap }
}

async function main(): Promise<void> {
  printPicks()
  printMixGain()
  if (process.argv.includes('--quick')) return // the pick and the mix's gain only: no seed runs
  console.log('## The two measurements, every shipped seed\n')
  const keys = Object.keys(DEV_SEEDS)
  const readings: SeedReading[] = []
  for (const key of keys) {
    const t0 = Date.now()
    const r = await measureSeed(key)
    readings.push(r)
    console.error(`[${readings.length}/${keys.length}] ${key}: ${r.route} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
  }
  console.log('| Seed | The table’s run | (a) steady against the band’s middle line | (b) the rough future among the many |')
  console.log('|---|---|---|---|')
  for (const r of readings) console.log(`| \`${r.key}\` | ${r.route} | ${r.a} | ${r.b} |`)
  const gap = Math.max(...readings.map((r) => r.ledgerGap))
  console.log(`\nLedger cross-check: the steady run's rows' end balances against its fan total, largest gap ${gap.toFixed(6)} dollars.`)
  const stops = readings.flatMap((r) => r.stops.map((s) => `${r.key}: ${s}`))
  console.log(stops.length === 0 ? '\nSTOP lines: none.' : `\nSTOP lines (${stops.length}):\n${stops.map((s) => `- ${s}`).join('\n')}`)
}

void main()
