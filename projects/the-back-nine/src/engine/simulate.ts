/**
 * The Monte Carlo spine — a pure, deterministic function of (params, seed).
 *
 * It owns:
 *  - the CRN draw schedule (contract #1): {@link buildDraws} generates the normals
 *    matrix + the longevity uniforms as a pure function of (seed, DIMENSIONS) ONLY —
 *    never of the financial inputs — so two parameter sets under one seed consume
 *    identical draws path-for-path (the substrate the P4 solver ranks K candidates on);
 *  - the single shared market draw (contract #2): one (stock, bond) return pair per
 *    path-year drives the whole portfolio; buckets (U2) differ only in tax treatment;
 *  - the cash-term seam (contract #3): spending → earned-income bridge (nets down) →
 *    Social-Security step-down → the SINGLE `runDecumulation` the historical backtest
 *    also uses, so within-year order can never drift;
 *  - the engine's R19 half: invalid/degenerate input returns the defined indeterminate
 *    output rather than computing — no NaN/Infinity escapes a percentile.
 */
import { mulberry32, standardNormal, simpleReturnFromNormal, toLogMoments } from '@engine/rng'
import { runDecumulation, type PortfolioState, type DecumulationResult } from '@engine/decumulation'
import { sampleCouplePath, type LongevityPerson } from '@engine/longevity'
import {
  runTaxAwareDecumulation,
  type HealthYearSink,
  type TaxOverlayConfig,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
  type YearContribution,
} from '@engine/taxOverlay'
import { totalAcrossBuckets } from '@engine/sequencing'
import { householdBenefits, survivorBenefitAnnual, realizedClaimAgeAtDeath, type BenefitPerson } from '@engine/socialSecurityBenefit'
import { irmaa } from '@engine/constants'
import { isPricedState, earliestPricedRateYear } from '@engine/constants/stateTax'
import {
  DRAWDOWN_ORDER_KEYS,
  DRAWDOWN_POLICIES,
  NEVER_DEPLETED,
  isRetirementState,
  type AccumulationParams,
  type BandFan,
  type BandFanYear,
  type DepletionYear,
  type Distribution,
  type HealthReadout,
  type HealthReadoutYear,
  type IncomeParams,
  type PersonInputs,
  type SimulationParams,
  type SurvivorConditioned,
} from '@shared/model'

/** The CRN draw matrices — pure in (seed, dimensions). */
export interface Draws {
  /** Standard normals for the stock leg: [path][year], allocated to maxHorizon. */
  readonly stockZ: readonly (readonly number[])[]
  /** Standard normals for the bond leg (pre-correlation): [path][year]. */
  readonly bondZ: readonly (readonly number[])[]
  /** Longevity uniforms: [path][person]. */
  readonly longevityU: readonly (readonly number[])[]
}

/**
 * Generate the CRN draws from ONE mulberry32 stream in a FIXED dimension-only order:
 * all market normals first (path-major, year, stock-then-bond), then all longevity
 * uniforms (path-major, person). Because the order + counts depend ONLY on
 * (seed, paths, maxHorizon, peopleCount) and never on a financial input, two parameter
 * sets with the same dimensions draw byte-identically — the structural basis of CRN.
 */
export function buildDraws(
  seed: number,
  paths: number,
  maxHorizon: number,
  peopleCount: number,
): Draws {
  const rand = mulberry32(seed)
  const stockZ: number[][] = []
  const bondZ: number[][] = []
  for (let p = 0; p < paths; p++) {
    const sRow: number[] = []
    const bRow: number[] = []
    for (let t = 0; t < maxHorizon; t++) {
      sRow.push(standardNormal(rand))
      bRow.push(standardNormal(rand))
    }
    stockZ.push(sRow)
    bondZ.push(bRow)
  }
  const longevityU: number[][] = []
  for (let p = 0; p < paths; p++) {
    const row: number[] = []
    for (let k = 0; k < peopleCount; k++) row.push(rand())
    longevityU.push(row)
  }
  return { stockZ, bondZ, longevityU }
}

/** A resolved simulation: the full distribution (with the tax-aware solver surfaces when
 *  the run carried the overlay). The `infeasible?: never` lets a consumer narrow the
 *  three-arm union with plain truthiness (`out.infeasible` is undefined here). */
export interface SimResolved {
  readonly indeterminate: false
  readonly distribution: Distribution
  readonly infeasible?: never
}

/** The defined indeterminate output (R19): the INPUT was incomputable — rejected by
 *  `validateParams` BEFORE any path ran. Distinct from {@link SimInfeasible}. */
export interface SimIndeterminate {
  readonly indeterminate: true
  readonly reason: string
  readonly infeasible?: never
}

/** The typed per-candidate INFEASIBLE sentinel (U3·M6 — the strategic review's P1):
 *  the input passed the R19 gate but a path's overlay computation FAILED mid-run (a
 *  solver non-convergence — the gross-up 128-pass cap, the ACA bisection, a fail-loud
 *  backstop). The contract: the CANDIDATE is infeasible as a whole — never a silently
 *  dropped path (the banned silent measurement: the dropped class would be exactly the
 *  aggressive near-cliff candidates) and never an uncaught throw (which would abort a
 *  future K-candidate solver batch). A P4 solver ranks this WORST; the headline route
 *  surfaces it as a calm error; the date route fails the run with the named reason
 *  (all-or-nothing — an unevaluated offset voids the "earliest" claim). DND/009: all
 *  fields are plain JSON-safe values (they cross the worker wire). Deterministic in
 *  (params, seed) like every other output — the same candidate fails at the same path.
 *
 *  REACHABILITY (M6; the boundary review's claim-refuter CORRECTED the first draft of
 *  this note): reachable ONLY through the FLOAT-OVERFLOW class. Every overlay SOLVER cap
 *  is closed over the gated domain — each known overlay throw has a validateParams
 *  mirror (the two-layer R19 discipline), and with the ENGINE_MAX_* domain bounds the
 *  gross-up's worst case is ~113 passes < the 128 cap (the eps-bound now covers the
 *  whole domain; the earlier "float saturation closes any scale" claim was REFUTED —
 *  saturation assumes finite iterates, and an overflowed bucket yields Infinity −
 *  Infinity = NaN, which never converges). What remains reachable: a path whose values
 *  overflow despite the gate (the measure-zero stochastic tail, or any future cap
 *  drift) — the per-path finiteness seam in the loop routes exactly that class here.
 *  The arm is otherwise the typed contract for the unknown-unknown + future overlay
 *  couplings, decided before the P4 solver layers on. */
export interface SimInfeasible {
  readonly indeterminate: false
  readonly infeasible: true
  /** The thrown overlay error's message — names the failing quantity (fail-loud style). */
  readonly reason: string
  /** The path whose computation threw (the first one — evaluation stops there). */
  readonly pathIndex: number
}

/** A valid distribution, the defined indeterminate output (R19), or the per-candidate
 *  infeasible sentinel (M6). */
export type SimOutput = SimResolved | SimIndeterminate | SimInfeasible

/** Per-person, simulation-relative offsets (whole years from year 0). */
export interface PersonOffsets {
  readonly retire: number
  readonly claim: number
  readonly earnedIncomeReal: number
  /** The claim-age-adjusted OWN Social Security benefit (annual real), resolved pre-loop by the SS
   *  sub-engine (`householdBenefits().ownAnnual`). The slot name is retained from the pre-`pia`
   *  scalar; it now holds the DERIVED own benefit, not the entered figure. */
  readonly socialSecurityReal: number
  /** The Method-C spousal EXCESS (annual real), resolved pre-loop (`householdBenefits().spousalExcessAnnual`).
   *  0 for the higher earner and for an earner whose own PIA ≥ 50% of the higher PIA. The seam gates its
   *  START at max(this person's claim, the higher earner's claim) and its END at the first death (it lives
   *  only in the all-alive branch — once a spouse dies the §202 survivor benefit replaces it; plan §7). */
  readonly spousalExcessAnnual: number
}

/**
 * One year's per-OWNER-death-gated ongoing other-income SELECT (R40 · KTD-4/KTD-7) — the
 * structural sibling of {@link contributionsForYear}, NOT a refactor-share (the gate domains
 * differ: contributions gate on alive∧WORKING `t < retire`; ongoing income gates on the owner's
 * DEATH alone — it keeps paying after work stops, never `t < retire`; insight 027). Per OWNER `i`:
 * `select = (t < deathOffset_i) ? FULL : (anySpouseAlive ? SURVIVOR : 0)` — locked at the death
 * offset, NEVER ramped. Each person's bundle is gated on THAT person's OWN death (a single
 * household-level death gate is the cross-owner-death-order swap-mutant bug — KTD-7). Returns the
 * summed household `{gross, taxable}`: `gross` nets the withdrawal (seam 1), `taxable` enters
 * `nonSSordinary` (seam 2; SS-§86 / ACA-MAGI / IRMAA-MAGI all ride it — KTD-1). Zero `new Array`,
 * two household scalars, integer death-offset comparisons only (the hot-loop zero-alloc contract).
 * Consumes ZERO draws (CRN-safe — a pure function of the death timeline + the compiled vectors).
 * Exported for direct unit testing of the seam (the per-owner death gate, the survivor select).
 */
export function ongoingIncomeForYear(
  t: number,
  income: IncomeParams,
  deathOffsets: readonly number[],
): { readonly gross: number; readonly taxable: number } {
  const leaves = income.incomeByPerson
  // Is ANY person other than a given dead owner still alive? (The SURVIVOR-continuation gate: a
  // dead owner's stream pays its survivor variant only while a spouse remains — KTD-4.) Computed
  // once per year, not per owner — a household scalar, but the OWNER's own death (below) is what
  // selects FULL vs SURVIVOR/0, so the per-owner gate is preserved (KTD-7).
  let aliveCount = 0
  for (let i = 0; i < deathOffsets.length; i++) if (t < (deathOffsets[i] ?? 0)) aliveCount++
  let gross = 0
  let taxable = 0
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i]
    if (leaf === undefined) continue
    const ownerAlive = t < (deathOffsets[i] ?? 0)
    if (ownerAlive) {
      // FULL — the owner is alive and collecting their own stream.
      gross += leaf.grossFull?.[t] ?? 0
      taxable += leaf.taxableFull?.[t] ?? 0
    } else if (aliveCount >= 1) {
      // The owner has died but ≥1 spouse remains: the per-stream SURVIVOR variant (KTD-4). Both
      // dead ⇒ this branch is skipped ⇒ $0 (the survivor both-dead floor).
      gross += leaf.grossSurvivor?.[t] ?? 0
      taxable += leaf.taxableSurvivor?.[t] ?? 0
    }
  }
  return { gross, taxable }
}

/**
 * The full cash decomposition for one year: the survivor-adjusted spending, the earned-income
 * bridge (alive AND still working), the ongoing other-income gross (R40 · death-gated, NOT
 * retire-truncated — it keeps paying after work stops), the Social-Security benefit (summed while
 * both claim; the larger single benefit once a survivor remains — the step-down), and the clamped
 * `net` withdrawal the portfolio must fund (`max(0, spending − earned − ongoing − ss)`).
 *
 * `net` and `ss` play DISTINCT roles downstream: `net` is the cash the portfolio funds (SS + the
 * ongoing-income gross have already reduced it); `ss` is the SAME benefit the U2 tax overlay taxes
 * as provisional income. The R40 taxable portion rides the same KTD-9 split the overlay applies:
 * `ongoingTaxableGrossUp` is the taxable the overlay grosses up for + nets (seam 2), and
 * `ongoingTaxableIrmaaOnly` is the working-year-clamped taxable that feeds IRMAA-MAGI but NOT the
 * gross-up netting (the wages fund its tax outside the portfolio — no phantom withdrawal, KTD-9).
 * The clamp (`accumulating && livingWorker`) is single-sourced HERE so the two seams can never
 * disagree about which years are clamped. Consumes ZERO draws (CRN-safe — a pure function of the
 * death timeline + the financial inputs).
 */
export function cashTermsForYear(
  t: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  higherClaimOffset: number,
): {
  readonly net: number
  /** P3·U9 — the FLOOR (essentials-only) track's portfolio-funded withdrawal, through the
   *  SAME clamp/income terms as `net` (one call, two nets — the income work is track-
   *  invariant). Equals `net` when no budget construct is present (the degenerate);
   *  consumed only by the budget run's second decumulation pass. */
  readonly netFloor: number
  readonly ss: number
  readonly ongoingTaxableGrossUp: number
  readonly ongoingTaxableIrmaaOnly: number
  /** The year's NON-PORTFOLIO household income (U7 e1b) = earned + ongoing other income + SS — every
   *  dollar that funds spending BEFORE any portfolio withdrawal. UNCLAMPED by the §7 working-year
   *  draw clamp (the clamp zeroes the WITHDRAWAL, never the income). Pure observation; consumed by the
   *  survivor income step-down's counterfactual, never by the decumulation. */
  readonly nonPortfolioIncomeReal: number
} {
  let aliveCount = 0
  for (let i = 0; i < deathOffsets.length; i++) if (t < (deathOffsets[i] ?? 0)) aliveCount++
  const allAlive = aliveCount === offsets.length

  // P3·U9 — the per-year spend, two tracks. r (the survivor step-down selector) is realized
  // HERE, per path-year, off the sampled death timeline (insight 040 — the first death is a
  // stochastic per-path event) — never baked into the compiled profiles. Un-itemized (budget
  // absent): the flat scalar with ratio-on-total — byte-identical to every pre-U9 run.
  // Itemized: the three-component expansion at k = years since the household work-stop
  // anchor; `sticky` (survivor-fixed costs incl. the injected OOP-medical floor) deliberately
  // does NOT scale at widowhood (council 2026-07-02 — scaling the survivor's fixed costs by
  // the couple ratio understates the survivor floor, the cardinal calm-but-wrong direction).
  // k clamps at 0: a survivor drawing BEFORE the planned work-stop (the worker died early,
  // the §7 clamp stopped firing) spends the budget's own opening-year composition — never an
  // out-of-window 0. The anchor reads PLANNED retirement offsets (windows are calendar-
  // planned; only the ratio is path-realized), so the expansion is deterministic + CRN-safe.
  const budget = params.budget
  let spending: number
  let essentialsSpending: number
  if (budget !== undefined) {
    let anchor = 0
    for (const o of offsets) if (o.retire > anchor) anchor = o.retire
    const k = Math.max(0, t - anchor)
    const r = allAlive ? 1 : params.survivorSpendingRatio
    essentialsSpending = (budget.sticky[k] ?? 0) + r * (budget.scalableEssentials[k] ?? 0)
    spending = essentialsSpending + r * (budget.discretionary[k] ?? 0)
  } else {
    spending = allAlive
      ? params.annualSpendingReal
      : params.annualSpendingReal * params.survivorSpendingRatio
    essentialsSpending = spending
  }

  let earned = 0
  let ss = 0
  let survivorIdx = -1
  let deceasedIdx = -1
  let livingWorker = false
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i]
    const death = deathOffsets[i] ?? 0
    if (o === undefined) continue
    const alive = t < death
    if (alive && t < o.retire) {
      earned += o.earnedIncomeReal
      livingWorker = true
    }
    if (allAlive) {
      // Own benefit once claimed + the Method-C spousal EXCESS once BOTH the recipient and the higher
      // earner have filed (start = max(this claim, the higher earner's claim) — RS 00202.001's worker-
      // must-be-entitled gate). The excess is 0 for the higher earner and for a non-recipient, so adding
      // it gated is safe. Its END gate is THIS branch: once a spouse dies, `allAlive` is false and the
      // §202 survivor benefit (below) owns SS — the excess vanishes at the first death, never
      // double-counting with the survivor stream (plan §7).
      if (alive && t >= o.claim) ss += o.socialSecurityReal
      if (alive && t >= Math.max(o.claim, higherClaimOffset)) ss += o.spousalExcessAnnual
    } else if (alive) {
      survivorIdx = i
    } else {
      deceasedIdx = i
    }
  }
  // §202 survivor benefit (plan §6) — replaces the old `$0-until-own-claim` stub. Once one spouse has
  // died, the survivor each year collects max(their OWN benefit, the survivor benefit on the deceased's
  // record). The survivor benefit's age-reduction factor is LOCKED at the survivor's age when the stream
  // starts (max(60, age at the first death)) and held FLAT — it does NOT ramp toward 100% as the survivor
  // ages (a ramp would optimistically overstate the early-widowhood floor: the cardinal calm-but-wrong
  // sin). The deceased's DRCs flow through and RIB-LIM caps a deceased who claimed reduced — all inside
  // `survivorBenefitAnnual`, applied to the deceased's REALIZED claim age: a worker can't file after death,
  // so a deceased who died before their PLANNED claim age realized only the credits they lived to earn —
  // `realizedClaimAgeAtDeath` caps the planned age at age-at-death (an unfiled pre-FRA death lands on the
  // full PIA, never a phantom delayed credit; 20 CFR §404.313 / RS 00615.301). Passing the planned age
  // verbatim would overstate the survivor floor on early-death paths — the cardinal optimistic sin, on
  // exactly the early-widowhood scenario this branch exists to harden. The spousal excess does NOT carry
  // into widowhood (it ended at the death). The `aliveCount >= 1` + index guards skip the people-of-one
  // all-dead case (ss stays 0). Constant once the death offset is fixed (CRN-safe: a pure function of the
  // death timeline + inputs).
  if (!allAlive && aliveCount >= 1 && survivorIdx >= 0 && deceasedIdx >= 0) {
    const s = params.people[survivorIdx]
    const d = params.people[deceasedIdx]
    const sOff = offsets[survivorIdx]
    if (s !== undefined && d !== undefined && sOff !== undefined) {
      const deceasedDeathOffset = deathOffsets[deceasedIdx] ?? 0
      const deceasedClaim = realizedClaimAgeAtDeath(d.socialSecurityClaimAge, d.birthYear, d.currentAge + deceasedDeathOffset)
      const deceased: BenefitPerson = { piaAnnual: d.pia, claimAge: deceasedClaim, birthYear: d.birthYear }
      const survivorStartAge = Math.max(60, s.currentAge + deceasedDeathOffset)
      const survivorStream = survivorBenefitAnnual(deceased, s.birthYear, survivorStartAge)
      const survivorEligible = s.currentAge + t >= 60 // the §202 widow(er) benefit is not payable before age 60
      const ownStream = t >= sOff.claim ? sOff.socialSecurityReal : 0
      ss = Math.max(ownStream, survivorEligible ? survivorStream : 0)
    }
  }

  // C2 §7 — the working-year zero-withdrawal clamp, PRESENCE-GATED on the accumulation construct
  // and DEATH-AWARE. While the construct is present AND at least one LIVING person is still working
  // (`t < deathOffset_i && t < retire_i` — the bridge's own dead-earner predicate shape), the
  // household lives on salary: the spending net is 0, never a portfolio draw (you cannot both save
  // and fund a spending gap from the same household cash — the contribute-and-draw double-count).
  // DEATH-AWARE because a death-blind `t < Y` clamp would zero a surviving retiree's REAL draws for
  // the rest of the runway — flipping the engine's deliberately-conservative survivor paths
  // (survivor step-down above, the dead-earner bridge, the survivor-SS understatement) maximally
  // OPTIMISTIC on exactly the top-of-window candidates that decide a date crowning: the cardinal
  // calm-but-wrong direction. Once the last living worker dies, the clamp simply stops firing and
  // the existing survivor cash semantics draw normally. PRESENCE-gated (never value-derived) so a
  // 1¢ contribution change can never flip the draw regime, and a construct-ABSENT run — every
  // shipped pre-C2 caller — is byte-identical by construction. Direction: the clamp only ever
  // REMOVES withdrawals → weakly higher balances → a weakly earlier date; optimistic ONLY for a
  // household that really draws from the portfolio while working (disclosed — D2 owns the copy).
  // `ss` is NOT clamped: a claimed-while-working benefit still flows to the tax overlay as
  // provisional income (an overlay-forced working-year outflow is legal — §2's overlap-safe fold).
  // R40 seam 1 — the ongoing other-income SELECT (per-owner death-gated, KTD-4/KTD-7), netted into
  // the cash need exactly like SS. It is NOT retire-truncated: a pension/rental keeps paying after
  // work stops. The select runs only when the income construct is present (presence-keyed — an
  // income-absent run never calls it, so reduce-to-spine is byte-identical by construction).
  const income = params.overlay?.income
  const sel = income !== undefined ? ongoingIncomeForYear(t, income, deathOffsets) : { gross: 0, taxable: 0 }

  const accumulating = params.overlay?.accumulation !== undefined
  // The clamp single-sources the working-year regime (C2 §7): a living worker on the accumulation
  // construct lives on salary → net 0. The R40 taxable portion splits on the SAME clamp (KTD-9):
  //  - UNCLAMPED ⇒ `ongoingTaxableGrossUp` (the overlay grosses it up for tax AND nets it into the
  //    withdrawal — the income is what funds the spend, the tax is funded by the portfolio).
  //  - CLAMPED working year ⇒ `ongoingTaxableIrmaaOnly` (the wages fund the income's tax OUTSIDE
  //    the portfolio, so it must NOT mint a phantom gross-up withdrawal — but it STILL lifts
  //    IRMAA-MAGI, where the wages alone do not reach; the engine owns each modeled stream's
  //    IRMAA-MAGI contribution in all years — KTD-9).
  const clamped = accumulating && livingWorker
  const net = clamped ? 0 : Math.max(0, spending - earned - sel.gross - ss)
  const netFloor = clamped ? 0 : Math.max(0, essentialsSpending - earned - sel.gross - ss)
  return {
    net,
    netFloor,
    ss,
    ongoingTaxableGrossUp: clamped ? 0 : sel.taxable,
    ongoingTaxableIrmaaOnly: clamped ? sel.taxable : 0,
    // The raw non-portfolio income (U7 e1b) — earned + ongoing + SS, independent of the draw clamp.
    nonPortfolioIncomeReal: earned + sel.gross + ss,
  }
}

/**
 * The net withdrawal the portfolio funds for one year — spending net of the earned-income bridge
 * and Social Security, clamped at 0. The clamp means income never flows back INTO the portfolio
 * through this seam; contributions are the accumulation construct's EXPLICIT signed inflow term
 * (C2 §2 — assembled separately and credited end-of-year by `stepYear`), never a negative
 * withdrawal here. With the construct present, working years with a living worker return 0
 * outright (the §7 clamp — the household lives on salary). A thin projection of
 * {@link cashTermsForYear}; exported for direct unit testing of the seam (bridge truncation at
 * death, SS step-down, clamp).
 */
export function netWithdrawalForYear(
  t: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  higherClaimOffset: number,
): number {
  return cashTermsForYear(t, params, offsets, deathOffsets, higherClaimOffset).net
}

/**
 * One path-year's per-bucket contribution inflow (C2 §7's B×C consequence) — the assembly seam.
 * Person-keyed streams → the alive∧working filter (`t < deathOffset_i && t < retire_i`, the
 * bridge's own dead-earner predicate shape) → the HSA owner-enrollment zeroing → person→bucket
 * aggregation. PER-PATH because death truncation is per-path (a dead spouse's phantom
 * contributions would overstate the nest egg — the optimistic direction); an already-retired
 * person (retire offset ≤ 0) has an empty window and contributes never, with zero special-casing.
 * Consumes ZERO draws (CRN-safe — a pure function of the death timeline + the entered streams).
 * Exported for direct unit testing of the seam (death truncation, match→pretax routing, the
 * owner-keyed HSA zeroing) — the same convention as {@link cashTermsForYear}.
 */
export function contributionsForYear(
  t: number,
  accumulation: AccumulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  people: readonly PersonInputs[],
  medicareOnsetSimYear?: readonly number[],
): YearContribution {
  const byPerson = accumulation.contributionsByPerson
  // EVERY channel stays per-person through the wire (never collapsed to a household scalar):
  // per-person attribution is what lets the overlay's dead-slot guard vet all four channels
  // precisely — an unattributable aggregate can neither be death-vetted nor safely rejected
  // (the C2 boundary review, wave 2). The overlay sums each channel internally.
  const cTaxableByPerson: number[] = new Array(people.length).fill(0)
  const cPretaxByPerson: number[] = new Array(people.length).fill(0)
  const cRothByPerson: number[] = new Array(people.length).fill(0)
  const cHsaByPerson: number[] = new Array(people.length).fill(0)
  for (let i = 0; i < byPerson.length; i++) {
    const pc = byPerson[i]
    const o = offsets[i]
    const person = people[i]
    if (pc === undefined || o === undefined || person === undefined) continue
    const aliveWorking = t < (deathOffsets[i] ?? 0) && t < o.retire
    if (!aliveWorking) continue
    cTaxableByPerson[i] = pc.taxable?.[t] ?? 0
    cRothByPerson[i] = pc.roth?.[t] ?? 0
    // Employer match → pretax ALWAYS (the confirmed default rule — a Roth employer match is a
    // deferred SECURE 2.0 §604 option), credited to the contributing person's OWN ledger slot
    // alongside their deferral.
    cPretaxByPerson[i] = (pc.pretax?.[t] ?? 0) + (pc.employerMatch?.[t] ?? 0)
    // HSA contributions zero from THIS person's Medicare-enrollment onset — keyed to the
    // contributing OWNER, never the spouse (C2 §3b; mirrors the constants table's separation of
    // medicareZeroesContribution from the premium privilege). The C3 per-person onset signal
    // threads through this predicate: absent-signal default = the owner's 65th sim-year
    // (`t < 65 − currentAge_i` ⇔ `currentAge_i + t < 65` — today's biological predicate
    // verbatim); with a work-past-65 onset (employer coverage delays Medicare) the owner's HSA
    // contribution stays LIVE in [their 65th sim-year, onset) — a planted age-keyed zeroing
    // fails the discriminating test.
    if (t < (medicareOnsetSimYear?.[i] ?? 65 - person.currentAge)) cHsaByPerson[i] = pc.hsa?.[t] ?? 0
  }
  return {
    taxableByPerson: cTaxableByPerson,
    pretaxByPerson: cPretaxByPerson,
    rothByPerson: cRothByPerson,
    hsaByPerson: cHsaByPerson,
  }
}

// =========================================================================
// The engine's computable-domain bounds (M6 boundary review — the float-overflow
// class). Finiteness of the INPUTS does not bound the COMPUTATION: a gate-valid
// 1e300 portfolio (or a 900%/yr mean over a 300-year horizon) compounds past
// Number.MAX_VALUE mid-path, and the first Infinity either poisons the gross-up
// into its 128-pass throw (Infinity − Infinity = NaN) or — worse — RESOLVES with
// Infinity reported as a SURVIVING terminal (the calm-but-wrong-OPTIMISTIC sin,
// violating the DND/009 finite contract every wire-crossing surface carries). So
// the R19 gate bounds the domain itself. The caps are far beyond any real
// household input (a personal tool: a $1T portfolio, a 100%/yr return assumption,
// and a 120-year horizon are each absurd) so they can never falsely reject a real
// user — while making the mean-path compounding provably finite (ln(1e12) +
// 120·ln(2) ≈ 111 ≪ 709 = ln(MAX_VALUE)) AND closing the gross-up's convergence
// story over the whole gated domain (max tax ≈ 0.31 × 0.85 × 1e12 ⇒ ~113 worst-case
// passes < the 128 cap — the eps-bound now covers everything; no saturation
// argument needed). The stochastic TAIL (a ~3.5σ draw every year for 120 years,
// P ≈ 1e-437) and any future cap drift are caught by the per-path finiteness seam
// in the path loop below — the two-layer rule applied to the engine's own float
// domain (gate = the cause; seam = the consequence).
// =========================================================================
/** Max dollar magnitude for any entered dollar/ratio figure (real $). */
export const ENGINE_MAX_DOLLAR = 1e12
/** Max market moment (mean and stdDev each ≤ 100%/yr). */
export const ENGINE_MAX_MOMENT = 1
/** Max cohort horizon (the mortality table's own terminal age bounds any real run). */
export const ENGINE_MAX_HORIZON_YEARS = 120

/** Validate the engine's numeric domain (R19, engine half). Returns a reason string
 *  for an indeterminate input, or null when the params are computable. EXPORTED for the
 *  date-search's all-or-nothing up-front pass (C3 §3): every candidate is validated
 *  BEFORE any 16k-path run is dispatched, so a rejecting candidate fails the RUN with the
 *  named reason — never drop-and-continue (an unevaluated offset voids the "earliest"
 *  claim), never a wasted sweep. Cheap and draw-free by construction. */
export function validateParams(params: SimulationParams): string | null {
  // Finite, ≥ 0, AND inside the engine's computable dollar domain (the upper bound is
  // what keeps every downstream compounding finite — see ENGINE_MAX_DOLLAR above; it
  // also bounds the ratio fields it guards, harmlessly).
  const finiteNonNeg = (x: number) => Number.isFinite(x) && x >= 0 && x <= ENGINE_MAX_DOLLAR
  if (!finiteNonNeg(params.initialPortfolio)) return 'initialPortfolio invalid'
  if (!finiteNonNeg(params.annualSpendingReal)) return 'annualSpendingReal invalid'
  if (!Number.isFinite(params.stockWeight) || params.stockWeight < 0 || params.stockWeight > 1)
    return 'stockWeight out of [0,1]'
  if (!finiteNonNeg(params.survivorSpendingRatio)) return 'survivorSpendingRatio invalid'
  if (!Number.isInteger(params.paths) || params.paths <= 0) return 'paths must be a positive integer'
  if (!Number.isInteger(params.maxHorizonYears) || params.maxHorizonYears <= 0)
    return 'maxHorizonYears must be a positive integer'
  if (params.maxHorizonYears > ENGINE_MAX_HORIZON_YEARS)
    return 'maxHorizonYears exceeds the engine horizon domain'
  // Enum params cross the SAME untyped structured-clone worker boundary as the numbers; validate
  // membership HERE (R19) so an out-of-union value returns the defined indeterminate output. Without
  // this, a bad `drawdownPolicy` reaches allocateWithdrawal's switch (no default) → undefined → a
  // TypeError caught as a calm-error (an internal-failure, not the contracted indeterminate reading),
  // and any `longevityMode` ≠ 'fixed-horizon' SILENTLY runs the sampled survival model — a calm-but-
  // wrong answer, the cardinal sin. (Both fields predate the per-stream R19 hardening and were never
  // re-audited — surfaced by the U3-exit code-review pilot.)
  if (!DRAWDOWN_POLICIES.includes(params.drawdownPolicy)) return 'drawdownPolicy unsupported'
  // P3·U10 — the custom-order biconditional, mirrored from the codec (the two-gate rule:
  // the codec proves the PERSISTED pair; this proves the WIRE pair — a direct caller / a
  // desynced builder crossing the untyped worker boundary gets the contracted indeterminate,
  // never allocateWithdrawal's mid-path throw surfacing as a calm-error).
  if (params.drawdownPolicy === 'custom' && params.drawdownOrder === undefined)
    return "drawdownOrder required for the 'custom' policy"
  if (params.drawdownOrder !== undefined) {
    if (params.drawdownPolicy !== 'custom') return "drawdownOrder is only meaningful under the 'custom' policy"
    const order = params.drawdownOrder
    if (
      order.length !== DRAWDOWN_ORDER_KEYS.length ||
      new Set(order).size !== DRAWDOWN_ORDER_KEYS.length ||
      !order.every((k) => DRAWDOWN_ORDER_KEYS.includes(k))
    )
      return 'drawdownOrder must name each general bucket exactly once'
  }
  if (params.longevityMode !== 'sampled' && params.longevityMode !== 'fixed-horizon')
    return 'longevityMode unsupported'
  if (params.people.length === 0) return 'no people'
  // The model is a COUPLE (1 person is the degenerate case; 2 is the couple). Beyond two, the
  // survivor step-down (`allAlive` flips on the FIRST death) and the MFJ→single filing flip
  // (`living.length >= 2`) no longer agree — there is no real filing status for a 3-adult household
  // — so reject it as indeterminate rather than compute a calm-but-wrong answer (model.ts: MVP couple).
  if (params.people.length > 2) return 'more than two people unsupported (the model is a couple)'
  for (const p of params.people) {
    if (!Number.isInteger(p.currentAge) || p.currentAge <= 0) return 'person age invalid (whole years)'
    if (!finiteNonNeg(p.earnedIncomeReal) || !finiteNonNeg(p.pia)) return 'person income invalid'
    // birthYear keys the SS sub-engine's FRA lookup (`fraMonthsForBirthYear`), called pre-loop
    // EVEN when pia=0 (the FRA factor is computed before the zero short-circuits) — so a non-finite
    // / out-of-[1900,2200] / fractional birthYear would make the pre-loop `householdBenefits` THROW
    // a bare Error (surfaced as a calm-error, misattributing the cause) rather than the contracted
    // indeterminate output. Number.isInteger rejects NaN/Infinity/fractional FIRST (insight 010).
    if (!Number.isInteger(p.birthYear) || p.birthYear < 1900 || p.birthYear > 2200) return 'person birthYear invalid (finite integer year)'
    // retirementAge / socialSecurityClaimAge drive the offsets (retire/claim = age − currentAge). A
    // NaN there makes `t < o.retire` / `t >= o.claim` silently FALSE (every comparison with NaN is
    // false, insight 010), so the earned-income bridge AND Social Security would be DROPPED → a larger
    // net → a calm-but-wrong, too-pessimistic survival reading, not the indeterminate output R19
    // promises. INTEGER, not just finite — model.ts documents all three ages as whole-year, and the
    // date route derives sim-year INDICES from them (medicareOnsetForPerson = max(65 − currentAge,
    // retireOffset), healthcareStreams' windowStart = max retireOffset → `new Array(windowStart)`):
    // a fractional age would either throw a bare RangeError or be rejected downstream as a derived-
    // field error ("medicareOnsetSimYear invalid") that misattributes the root cause; reject the
    // entered field here instead. An already-retired/claimed person (age < currentAge ⇒ a negative
    // offset) is legitimate, so no ≥currentAge floor. `sex` indexes the cohort mortality table
    // (survivalProbability r[sex]); an out-of-union value → NaN survival → max longevity, silently
    // changing the answer. (Original U1 person fields, never re-audited — U3-exit code-review pilot;
    // integer-ness tightened by the C3 boundary review.)
    if (!Number.isInteger(p.retirementAge)) return 'person retirementAge invalid (whole years)'
    if (!Number.isInteger(p.socialSecurityClaimAge)) return 'person socialSecurityClaimAge invalid (whole years)'
    // The RIB claim window [62, 70]: the SS sub-engine's `assertClaimAge` THROWS outside it (below 62
    // the reduction schedule extrapolates to a negative benefit). Gate it HERE (R19 = the cause) so an
    // out-of-window claim returns the named indeterminate, not a bare pre-loop throw (the sub-engine
    // assert is the backstop). 62 = earliest RIB eligibility, 70 = the delayed-credit ceiling.
    if (p.socialSecurityClaimAge < 62 || p.socialSecurityClaimAge > 70) return 'person socialSecurityClaimAge outside the [62, 70] claim window'
    if (p.sex !== 'male' && p.sex !== 'female') return 'person sex invalid'
  }
  for (const m of [params.market.stock, params.market.bond]) {
    // mean must be > -1 so phi = 1 + mean > 0 stays in toLogMoments' domain; mean <= -1
    // yields ±Infinity / NaN log-moments that would escape as NaN percentiles (R19). A
    // simple per-period return is bounded below by -1 anyway. The UPPER bound (M6 review,
    // ENGINE_MAX_MOMENT): an unbounded finite mean (e.g. 9 = 900%/yr) compounds a bucket
    // past Number.MAX_VALUE within a gate-valid horizon — Infinity then reaches the wire
    // on a path counted as SURVIVED (the reproduced calm-but-wrong-optimistic escape).
    if (!Number.isFinite(m.mean) || m.mean <= -1 || m.mean > ENGINE_MAX_MOMENT) return 'market moment invalid'
    if (!Number.isFinite(m.stdDev) || m.stdDev < 0 || m.stdDev > ENGINE_MAX_MOMENT) return 'market moment invalid'
  }
  const rho = params.market.stockBondCorrelation
  if (!Number.isFinite(rho) || rho < -1 || rho > 1) return 'stockBondCorrelation out of [-1, 1]'
  // The spine models SIMPLE-space, REAL moments only (the methodology defaults). Log-space
  // / nominal moments are a future scope expansion needing new externally-derived golden
  // fixtures (DND/012) — reject them here as indeterminate rather than silently mis-model
  // (calm-but-wrong: log-space double-applies the σ²/2 drag; nominal-as-real overstates
  // survival, the unsafe direction). The worker boundary is untyped (structured clone), so
  // this runtime gate defends even a type-safe caller.
  if (params.market.space !== 'simple') return 'market.space unsupported (spine is simple-space only)'
  if (!params.market.returnsAreReal) return 'market.returnsAreReal must be true (spine is real-return only)'

  // Tax-and-accounts overlay (U2): reject an incomputable overlay HERE as the defined indeterminate
  // output, rather than letting runTaxAwareDecumulation throw mid-path (the engine's R19 contract —
  // a bad input returns indeterminate, never a crash). The overlay's own fail-loud guards remain the
  // backstop. NOTE: basis > taxable is NOT rejected — it is a valid underwater (loss) position the
  // overlay floors the realized gain at 0 for.
  const o = params.overlay
  if (o !== undefined) {
    // INTEGER, not merely finite (the sunset unit's review fold, 2026-07-09): the senior-bonus
    // window guard (taxCore.seniorBonusFor) THROWS on a non-integer calendar year — a finite
    // 2026.5 passing this gate would crash mid-path instead of returning the R19 indeterminate.
    if (!Number.isInteger(o.startCalendarYear)) return 'overlay startCalendarYear invalid'
    // `filing` crosses the untyped structured-clone worker boundary like every other enum — validate
    // membership HERE (R19), exactly as the U3-exit pilot did for drawdownPolicy/longevityMode/sex. An
    // out-of-union value silently selects the `single` branch in every `filing === 'mfj' ? …` dispatch
    // (taxOverlay), taxing a couple on single brackets + half deduction + lower SS thresholds = calm-but-
    // wrong. NOTE: the `simulate` path OVERRIDES this per-year in resolveYear (filing is derived from the
    // living-count when a householdYears stream is present, which simulate always supplies), so this seed
    // bites only a direct runTaxAwareDecumulation caller's static fallback — but R19 validates every
    // boundary input regardless of which path consumes it. (U3-exit code-review-pilot follow-up.)
    if (o.filing !== 'mfj' && o.filing !== 'single') return 'overlay filing invalid'
    // retirementState (the state-tax unit) is an ENUM-MEMBERSHIP gate exactly like `filing` — it
    // crosses the untyped structured-clone worker boundary, so an out-of-vocabulary value must return
    // the defined indeterminate (R19), NEVER silently take the unpriced `+ 0` branch (a corrupted
    // `'NC'` silently dropped would UNDERSTATE tax for a household that meant a priced state — the
    // survival-overstating, calm-but-wrong direction). ABSENT/undefined is valid (state unpriced — the
    // disclosed-out posture); a recognised roster code (including an unbuilt one) or `'elsewhere'`
    // passes (legitimately unpriced ⇒ byte-identical to the spine). The `as string` reflects the
    // untyped boundary the compile-time `RetirementState` type cannot police.
    if (o.retirementState !== undefined && !isRetirementState(o.retirementState as string))
      return 'overlay retirementState invalid'
    // A PRICED state's rate schedule starts at its earliest step (2026 for NC/PA) and the rate
    // lookup FAIL-LOUD-throws below it — so a priced household whose startCalendarYear precedes
    // its schedule (a device clock set back past New Year, an aged dev plant) would throw inside
    // the overlay on EVERY path/candidate instead of returning the R19 calm indeterminate,
    // asymmetric with a federal-only household (bracketsFor is year-agnostic). The two-layer law
    // (M6, this file's header): every known overlay throw gets a validateParams twin. FL has no
    // schedule (null ⇒ no year read). (The ultramode review's boundary adversary, 2026-07-15.)
    if (o.retirementState !== undefined && isPricedState(o.retirementState)) {
      const earliest = earliestPricedRateYear(o.retirementState)
      if (earliest !== null && o.startCalendarYear < earliest)
        return 'overlay startCalendarYear precedes the priced state rate schedule'
    }
    const b = o.buckets
    if (!finiteNonNeg(b.taxable) || !finiteNonNeg(b.pretax) || !finiteNonNeg(b.roth)) return 'overlay buckets invalid'
    // The hsa bucket (U3 · M5) is optional (absent ⇒ 0, reduce-to-spine) but when PRESENT it is
    // finiteness-checked like its siblings — a NaN here would poison the hsa-inclusive total and
    // the qualified-spend clamp, both of which sit behind relational guards a NaN sails through
    // (insights 008/010: finiteness FIRST, before any compare).
    if (b.hsa !== undefined && !finiteNonNeg(b.hsa)) return 'overlay buckets invalid'
    // The overlay's total IS the portfolio: the buckets (ALL FOUR — the medical-earmarked hsa is
    // part of the portfolio and rides the one shared market draw) must sum to initialPortfolio (a
    // relative tolerance absorbs the caller's float dust) so a collapsed-pool overlay reduces to
    // the spine. The sum is the CANONICAL totalAcrossBuckets — never re-derived inline, so a future
    // 5th bucket cannot silently desync the gate from the engine's own total (single-source).
    const bucketSum = totalAcrossBuckets(b)
    if (Math.abs(bucketSum - params.initialPortfolio) > 1e-6 * Math.max(1, Math.abs(params.initialPortfolio)))
      return 'overlay buckets must sum to initialPortfolio'
    // Finiteness is checked UNCONDITIONALLY when present — NOT gated on `b.taxable > 0`. A NaN basis with
    // an EMPTY starting taxable bucket would otherwise slip both this gate and the overlay backstop, sit
    // dormant (year 0's realizedGain short-circuits on taxableValue===0), then poison the gross-up once an
    // RMD relocation rebuilds the taxable bucket → an uncaught mid-path throw instead of the indeterminate
    // output R19 promises (insight 008/010 — a `?? 0` does not coalesce NaN). The required-when-non-empty
    // check stays separate. (U3-exit code-review pilot.)
    if (o.initialTaxableBasis !== undefined && !finiteNonNeg(o.initialTaxableBasis))
      return 'overlay initialTaxableBasis invalid'
    if (o.taxEnabled && b.taxable > 0 && o.initialTaxableBasis === undefined)
      return 'overlay initialTaxableBasis required (tax on + taxable bucket non-empty)'
    if (o.conversions !== undefined && !o.conversions.every(finiteNonNeg)) return 'overlay conversions invalid'
    // bracket-fill ceilings: a non-finite entry poisons the allocation (a NaN survives `?? +Infinity`
    // and makes the gross-up never converge → an uncaught throw, or a NaN ledger with tax off). Allow
    // finite ≥ 0 OR the +Infinity no-ceiling sentinel; reject NaN / −Infinity / negative (R19).
    if (
      o.bracketFillCeilings !== undefined &&
      !o.bracketFillCeilings.every((c) => (Number.isFinite(c) && c >= 0) || c === Number.POSITIVE_INFINITY)
    )
      return 'overlay bracketFillCeilings invalid'
    // Per-person pre-tax split (M6b·B): one finite ≥ 0 entry per person, summing to the aggregate
    // pre-tax. Guard the new stream at the R19 gate exactly like its siblings — a NaN or a length
    // mismatch would otherwise detonate mid-path (a NaN divisor poisons the ledger; a short array
    // mis-maps a spouse's IRA) instead of returning the defined indeterminate output (insight 008).
    if (o.pretaxByPerson !== undefined) {
      if (!o.pretaxByPerson.every(finiteNonNeg)) return 'overlay pretaxByPerson invalid'
      if (o.pretaxByPerson.length !== params.people.length) return 'overlay pretaxByPerson length must match people'
      const ppSum = o.pretaxByPerson.reduce((acc, x) => acc + x, 0)
      if (Math.abs(ppSum - b.pretax) > 1e-6 * Math.max(1, Math.abs(b.pretax)))
        return 'overlay pretaxByPerson must sum to buckets.pretax'
    }
    // U3 healthcare cost streams (consumed from M3 Slice 4; gated here at the R19 frontline so a bad
    // premium returns the defined indeterminate output rather than detonating mid-path). Finiteness
    // FIRST, mirroring the `conversions` guard — DELIBERATELY NOT `bracketFillCeilings`: a real dollar
    // premium has NO +Infinity no-ceiling sentinel, so +Infinity is REJECTED here. A NaN/Infinity/negative
    // SLCSP or enrolled premium is rejected (insight 008/010 — a NaN sails through the later `enrolled > 0`
    // relational predicate and would silently DROP a real premium → the calm-but-wrong understatement).
    if (o.slcsp !== undefined && !o.slcsp.every(finiteNonNeg)) return 'overlay slcsp invalid'
    if (o.enrolledPremium !== undefined && !o.enrolledPremium.every(finiteNonNeg))
      return 'overlay enrolledPremium invalid'
    // IRMAA pre-sim MAGI seed (M4): finiteness FIRST whenever present (insight 008/010 — a NaN would
    // sail through the seed-required relational check below AND poison the surcharge tier compare). A
    // seed is a real IRMAA-MAGI (AGI), so finite ≥ 0 (0 is the legitimate low-income value).
    if (o.irmaaMagiSeed !== undefined && !o.irmaaMagiSeed.every(finiteNonNeg)) return 'overlay irmaaMagiSeed invalid'
    // C3 §3b — the per-person Medicare onset: finite INTEGER sim-year indices (any sign — ≤ 0 is
    // "enrolled before the sim"), one per person (the canonical alignment, mirroring pretaxByPerson).
    // A NaN onset makes `t >= onset` false forever — a silently never-enrolled member (zero Medicare
    // cost, the optimistic direction; insight 010). Guarded UNCONDITIONALLY when present — the
    // contribution-zeroing predicate consumes it even with healthcare off.
    if (o.medicareOnsetSimYear !== undefined) {
      if (!o.medicareOnsetSimYear.every((x) => Number.isInteger(x))) return 'overlay medicareOnsetSimYear invalid'
      if (o.medicareOnsetSimYear.length !== params.people.length)
        return 'overlay medicareOnsetSimYear length must match people'
    }
    // C3 §3b — the working-year IRMAA-MAGI override: a real-dollar MAGI, finite ≥ 0 (holes legal —
    // the coverage arm below decides WHICH years need it). NaN-first, mirroring its stream siblings.
    if (o.irmaaMagiOverride !== undefined && !o.irmaaMagiOverride.every(finiteNonNeg))
      return 'overlay irmaaMagiOverride invalid'
    // The ask-for-Medicare-extras per-person vector: finite ≥ 0 per entry (a negative premium
    // inside the funding Σ is the insight-046 netted-away optimistic class; a NaN silently
    // un-prices a member), and EXACTLY one entry per person (the medicareOnsetSimYear
    // per-person length discipline — a short vector would silently $0 the missing member).
    if (o.medicareExtrasMonthly !== undefined) {
      if (!o.medicareExtrasMonthly.every(finiteNonNeg)) return 'overlay medicareExtrasMonthly invalid'
      if (o.medicareExtrasMonthly.length !== params.people.length)
        return 'overlay medicareExtrasMonthly length must match people'
    }
    // U3 · M5 — the HSA spend-side inputs, guarded like their siblings (insights 008/010):
    // oopMedical is a real dollar cost — finite ≥ 0, NO +Infinity sentinel (mirror slcsp, NOT the
    // bracket-fill ceilings). A NaN would poison the qualified-spend cap's Math.min mid-path.
    if (o.oopMedical !== undefined && !o.oopMedical.every(finiteNonNeg)) return 'overlay oopMedical invalid'
    // The HSA owner identity: REQUIRED when tax is on and the hsa bucket is non-empty (the 65+
    // Medicare-premium privilege keys to the OWNER's age — a person-0 default would turn the
    // privilege on early for a spouse-owned HSA, the optimistic direction; burned/062). When
    // present it must be a canonical-people index (integer membership, the M6b alignment).
    if (o.hsaOwnerIndex !== undefined) {
      if (!Number.isInteger(o.hsaOwnerIndex) || o.hsaOwnerIndex < 0 || o.hsaOwnerIndex >= params.people.length)
        return 'overlay hsaOwnerIndex invalid (must index the household people)'
    }
    // C2: the accumulation construct — validated BEFORE the hsa-owner requirement below, because
    // hsa LIVENESS is now derived from the contribution streams too (a NaN hsa stream must read
    // as invalid input here, never silently decide liveness — insights 008/010 finiteness-FIRST).
    const acc = o.accumulation
    if (acc !== undefined) {
      // Aligned per person (mirror pretaxByPerson): a short/long array silently mis-maps a
      // spouse's contributions — reject, never re-index.
      if (acc.contributionsByPerson.length !== params.people.length)
        return 'overlay accumulation contributionsByPerson length must match people'
      // Every stream entry finite ≥ 0 (NaN-first; real dollars — NO +Infinity sentinel; a negative
      // is a disguised withdrawal bypassing the draw allocation). Holes/short tails stay legal ($0).
      let maxLen = 0
      for (const pc of acc.contributionsByPerson) {
        for (const stream of [pc.taxable, pc.pretax, pc.roth, pc.hsa, pc.employerMatch]) {
          if (stream === undefined) continue
          if (!stream.every(finiteNonNeg)) return 'overlay accumulation contribution stream invalid'
          if (stream.length > maxLen) maxLen = stream.length
        }
      }
      // The ASSEMBLED per-year sums must be finite too (the wave-2 numerical adversary's catch):
      // two finite per-slot entries can sum to +Infinity, and an Infinity credit rides through
      // stepYear to a non-finite terminal counted as SURVIVED — the calm-but-wrong-optimistic
      // escape per-entry finiteness alone cannot stop. The all-alive sum is the MAXIMUM any
      // death-truncated assembly can produce (entries are ≥ 0), so finite here ⇒ finite per-path.
      for (let t = 0; t < maxLen; t++) {
        let yearTotal = 0
        for (const pc of acc.contributionsByPerson) {
          yearTotal +=
            (pc.taxable?.[t] ?? 0) +
            (pc.pretax?.[t] ?? 0) +
            (pc.roth?.[t] ?? 0) +
            (pc.hsa?.[t] ?? 0) +
            (pc.employerMatch?.[t] ?? 0)
        }
        if (!Number.isFinite(yearTotal))
          return 'overlay accumulation contributions overflow (a year’s assembled total is non-finite)'
      }
      // The zero-balance start (C2 §2): stepYear's depletion predicate (`afterWithdrawal <= 0`)
      // would mark a $0-start run depleted at t = 0 and the depleted branch would silently swallow
      // every later contribution — reject as indeterminate (calm: "enter at least one account
      // balance"), removing the t=0 instance WITHOUT touching the spine's depletion predicate.
      if (params.initialPortfolio === 0)
        return 'accumulation requires a non-zero starting balance — enter at least one account balance'
      // §6 empty-overlap (run-level conservative arm; the overlay throw is the per-path mirror): a
      // priced ACA year (finite enrolled > 0, any person pre-65 that year — entered ages, the
      // all-alive conservative reading) carrying ANY entered contribution is incoherent v1 input —
      // contributions occupy working years, ACA pricing the retired pre-65 window (R31 + R33).
      if (o.healthcareEnabled) {
        const enrolled = o.enrolledPremium ?? []
        for (let t = 0; t < enrolled.length; t++) {
          const e = enrolled[t]
          if (e === undefined || !Number.isFinite(e) || e <= 0) continue
          if (!params.people.some((pp) => pp.currentAge + t < 65)) continue
          const anyContribution = acc.contributionsByPerson.some((pc) =>
            [pc.taxable, pc.pretax, pc.roth, pc.hsa, pc.employerMatch].some((s) => (s?.[t] ?? 0) > 0),
          )
          if (anyContribution)
            return 'overlay accumulation contribution overlaps a priced ACA year (contributions and ACA pricing are temporally disjoint — C2 §6)'
        }
      }
    }
    // R40 — the other-income construct (mirror the accumulation block above): the engine validates
    // VECTORS ONLY — finiteness-FIRST + ≤ ENGINE_MAX_DOLLAR (insights 008/010; a NaN in a gross
    // vector would silently DROP real income → understate the draw-offset → overstate the gap, or a
    // NaN taxable would poison `nonSSordinary`'s gross-up into non-convergence). The entity SCALARS
    // (`survivorPct` / `taxableFraction` / `exclusionFraction` ∈ [0,1]) are multiplied away at compile
    // (`compileIncomeStreams`) and do NOT exist on the leaf, so the engine CANNOT range-check them —
    // that gate lives ENTITY-side (intake sanity + the U8 codec; KTD-4 / KTD-3). Per-person alignment
    // mirrors the accumulation length check (a short/long array silently mis-maps a spouse's income).
    // `startAge < currentAge` is ALLOWED here by design (already-receiving clamps to t=0 at compile,
    // KTD-8b — there is no age field on the leaf to reject). Income is Y-invariant (KTD-8a).
    const inc = o.income
    if (inc !== undefined) {
      if (inc.incomeByPerson.length !== params.people.length)
        return 'overlay income incomeByPerson length must match people'
      for (const leaf of inc.incomeByPerson) {
        for (const v of [leaf.grossFull, leaf.taxableFull, leaf.grossSurvivor, leaf.taxableSurvivor]) {
          if (v === undefined) continue
          if (!v.every(finiteNonNeg)) return 'overlay income vector invalid'
        }
      }
    }
    // The hsa-owner requirement keys off the C2-re-derived LIVENESS property (insight 020 — gate on
    // the property, not its first consumer): an initial balance OR a positive hsa contribution
    // inflow makes the run hsa-live, and the 65+ Medicare-premium privilege then needs the owner.
    const hsaContributionInflow =
      acc !== undefined &&
      acc.contributionsByPerson.some((pc) => (pc.hsa ?? []).some((x) => x > 0))
    if (o.taxEnabled && ((b.hsa ?? 0) > 0 || hsaContributionInflow) && o.hsaOwnerIndex === undefined)
      return 'overlay hsaOwnerIndex required (tax on + the run can hold hsa dollars)'
    // Healthcare pricing is MAGI-driven and MAGI comes ONLY from the tax solver, so healthcare with
    // tax OFF is incoherent — reject it as indeterminate rather than silently drop the premium (the
    // survival-overstating, unsafe direction). The R19 frontline mirror of the overlay's own backstop
    // (taxOverlay throws the same condition for a direct caller). M3 Slice 4.
    if (o.healthcareEnabled && !o.taxEnabled) return 'overlay healthcareEnabled requires taxEnabled'
    // Slcsp COVERAGE: a priced ACA year (enrolled > 0 AND pre-65) needs a finite §36B benchmark; a
    // missing slcsp there would make the overlay throw mid-path. Priced years ⊆ enrolled>0 years, so
    // requiring slcsp[t] finite wherever enrolledPremium[t] is finite-positive shields `simulate` —
    // it returns the defined indeterminate output, never a mid-path throw (the same pre-check the
    // required taxable basis gets above). slcsp[t] = 0 is the EXPLICIT no-subsidy value; absent is an error.
    if (o.healthcareEnabled) {
      const enrolled = o.enrolledPremium ?? []
      const slcsp = o.slcsp ?? []
      for (let t = 0; t < enrolled.length; t++) {
        const e = enrolled[t]
        if (e !== undefined && Number.isFinite(e) && e > 0 && !Number.isFinite(slcsp[t]))
          return 'overlay slcsp must cover every enrolled-premium year'
      }
      // IRMAA seed COVERAGE (M4; mirrors the overlay backstop — the "fail-loud at BOTH layers" rule): a
      // year t < lookback whose surcharge keys off pre-sim IRMAA-MAGI[t−lookback] needs `irmaaMagiSeed[t]`
      // whenever a member is Medicare-ENROLLED that year. C3 §3b RE-KEYED this off the per-person onset:
      // enrolled in year t ⇔ t ≥ onset_i, with the absent-signal default onset_i = 65 − currentAge_i —
      // PROVABLY today's biological predicate verbatim (t ≥ 65 − currentAge ⇔ currentAge + t ≥ 65; the
      // overlay's birthYear = startCalendarYear − currentAge). Without the re-key, a member 65+ but still
      // WORKING inside the first lookback years (onset = their work stop) would spuriously force the
      // whole date-search indeterminate — a loud FALSE rejection blocking the date (under the sweep's
      // all-or-nothing policy a per-candidate rejection is never silently dropped). CONSERVATIVE on
      // death: require the seed if ANY person is enrollment-eligible (they are enrolled on the paths
      // where they live). Missing → the defined indeterminate output, never a mid-path throw and never a
      // default 0 (a phantom $0 surcharge → understated cost → overstated survival; burned/062). The
      // lookback is READ from the constant so this can never drift from the overlay's own lookback.
      const lookback = irmaa.value.magiLookbackYears
      const seed = o.irmaaMagiSeed ?? []
      const onsetFor = (i: number): number => {
        const pp = params.people[i]
        return o.medicareOnsetSimYear?.[i] ?? (pp !== undefined ? 65 - pp.currentAge : Number.POSITIVE_INFINITY)
      }
      const anyoneEnrolledAt = (t: number): boolean => params.people.some((_, i) => t >= onsetFor(i))
      for (let t = 0; t < lookback; t++) {
        if (anyoneEnrolledAt(t) && !Number.isFinite(seed[t]))
          return `overlay irmaaMagiSeed[${t}] required (a member is Medicare-enrolled within ${lookback}yr of the start)`
      }
      // The t ≥ lookback MIRROR (C3 §3b — the latent shipped hole, ENFORCED here rather than resting
      // on caller discipline): a BRIDGE year u inside the IRMAA lookback of any member's onset is a
      // year a future Medicare bill will LAG-READ — and the recorded MAGI there is the §7-clamped
      // working year's computed ≈$0 (FINITE, so the overlay's seed throw can never fire) → lowest
      // tier → understated surcharge → a falsely-EARLY date, SILENTLY. Require finite working-year
      // override coverage of every such year; the overlay's masked lagged-read throw is the per-path
      // backstop arm (the two-layer rule).
      //
      // THE PREDICATE IS KEYED TO THE HAZARD'S CREATOR, not to the bridge alone (insight 020 — gate
      // a guard on the PROPERTY, its third recurrence): the ≈$0 recorded MAGI has TWO creators with
      // different domains. (1) A salaried worker's wages are invisible to the overlay (MagiComponents
      // has no wage term) — income-positive, construct or not. (2) The §7 working-year clamp zeroes
      // the draws whose MAGI the overlay would otherwise compute — and the clamp's own predicate
      // (`livingWorker`, cashTermsForYear) is income-BLIND, firing for a zero-earned-income
      // still-working person too (earnedIncomeReal 0 is a first-class bridge-off state, model.ts).
      // So under the accumulation construct EVERY still-working person's years are guard-relevant,
      // not just the salaried — an earned>0-only predicate here let the zero-income worker's clamped
      // ≈$0 reach the lag-read unguarded (the C3 boundary review's P1). Without the construct the
      // clamp never fires and a zero-income worker's computed draw-MAGI is honest, so the income-
      // positive shape stays exact there. The honest override for a zero-income worker is their
      // entered working-year MAGI figure (K-1/investment/deferred comp — or an explicit 0, which for
      // a genuinely-zero-MAGI household is the CORRECT lowest-tier answer, never a rejection).
      const accumulating = o.accumulation !== undefined
      const override = o.irmaaMagiOverride ?? []
      const isBridgeYear = (u: number): boolean =>
        params.people.some(
          (pp) => u < pp.retirementAge - pp.currentAge && (pp.earnedIncomeReal > 0 || accumulating),
        )
      for (let u = 0; u + lookback < params.maxHorizonYears; u++) {
        if (!isBridgeYear(u)) continue
        if (anyoneEnrolledAt(u + lookback) && !Number.isFinite(override[u]))
          return `overlay irmaaMagiOverride[${u}] required (bridge year ${u} is inside the IRMAA lookback of a Medicare-enrolled year — a clamped working year's computed MAGI is ≈$0, silently understating the surcharge)`
      }
      // The wage-blind ACA sibling arm (C3 §3b): a PRICED ACA year landing on a BRIDGE year computes
      // ACA-MAGI with NO wage component (`earnedIncomeReal` is netted away upstream of the overlay;
      // MagiComponents has no wage term) — wage-blind in BOTH directions, OPTIMISTIC in the subsidy
      // band (wages shrink the net withdrawal → computed MAGI ≈ withdrawals only → phantom near-max
      // PTC → understated cost), conservative only below the 100%-FPL floor — so the year is
      // UNPRICEABLE, not one-directionally boundable: rejection beats disclosure. Unreachable in both
      // v1 routes by construction (healthcareStreams zeroes premiums while anyone works; an
      // all-retired household has no bridge years) — this guards a direct caller / the deferred
      // per-person-asymmetry feature (whose retired-on-ACA + working-spouse household is the
      // canonical instance and is pinned blocked on this arm).
      {
        const enrolledStream = o.enrolledPremium ?? []
        for (let t = 0; t < enrolledStream.length; t++) {
          const e = enrolledStream[t]
          if (e !== undefined && Number.isFinite(e) && e > 0 && isBridgeYear(t))
            return `overlay enrolledPremium[${t}] prices an ACA year on a BRIDGE year (working wages are invisible to ACA-MAGI — the year is unpriceable wage-blind; premiums belong in the retired window)`
        }
      }
      // The date-route ACA coverage rule (C3 §3b / D1): with the accumulation construct present (the
      // v1 date-route marker — every `buildCandidateParams(Y)` candidate carries it for the §7
      // clamp), forcing `healthcareEnabled` alone is NOT sufficient — an ABSENT stream passes the
      // guards above as `?? []` with zero iterations, and the overlay then prices ZERO healthcare:
      // the silent healthcare-blind date, the cardinal optimistic direction. Every PRE-65 RETIRED
      // year of every member (entered ages, death-blind/conservative) must carry FINITE
      // enrolledPremium + slcsp coverage — an explicit 0 is the legitimate "no marketplace cost"
      // entry (employer retiree coverage); ABSENT is the error. The all-65+-at-Y=0 household needs
      // nothing (every window below is empty — the per-person Medicare onset machinery suffices).
      if (o.accumulation !== undefined) {
        const enrolledStream = o.enrolledPremium ?? []
        const slcspStream = o.slcsp ?? []
        for (let i = 0; i < params.people.length; i++) {
          const pp = params.people[i]
          if (pp === undefined) continue
          const windowStart = Math.max(0, pp.retirementAge - pp.currentAge)
          const windowEnd = Math.min(65 - pp.currentAge, params.maxHorizonYears)
          for (let t = windowStart; t < windowEnd; t++) {
            if (!Number.isFinite(enrolledStream[t]) || !Number.isFinite(slcspStream[t]))
              return `overlay enrolledPremium/slcsp must cover sim-year ${t} (a pre-65 retired year) — an absent entry silently prices ZERO healthcare into the date (enter 0 explicitly for a no-marketplace year)`
          }
        }
      }
    }
  }

  // P3·U9 — the compiled budget construct (R19, engine half). Three per-retirement-year
  // component profiles; every entry finite ≥ 0 within the dollar domain (NaN-FIRST, insights
  // 008/010 — a NaN entry would ride the per-year sum into a poisoned withdrawal). The
  // survivor r-selection happens per-path in cashTermsForYear; the profiles are r-free.
  const bud = params.budget
  if (bud !== undefined) {
    for (const profile of [bud.sticky, bud.scalableEssentials, bud.discretionary]) {
      if (!profile.every(finiteNonNeg))
        return 'budget profile invalid (every entry must be a finite dollar ≥ 0)'
    }
    // THE CONTAINMENT GATE (council 2026-07-02, build-gate a — FAIL-LOUD, replacing the HSA
    // cap's silent fundingNeed clamp as the defense): the FLOOR track's essentials spend must
    // dominate the overlay's oopMedical[t] in EVERY year — the qualified-medical dollars the
    // HSA cap is sized off must live INSIDE the floor's spending, or the HSA pays for medical
    // the budget never funded (the portfolio is relieved of spending it should bear → survival
    // overstated → the floor date crowned too early: the cardinal optimistic sin). The
    // compile's OOP injection makes this true by construction when both sides read the same
    // intake scalar (float-safe: fl(a+b) ≥ max(a,b) for non-negative doubles); this gate is
    // the belt to those braces. Worst-case essentials = sticky + min(1, ratio)·scalableEss
    // (sticky never scales; ratio > 1 makes the both-alive year the minimum).
    const oopStream = params.overlay?.oopMedical
    if (oopStream !== undefined) {
      let anchor = 0
      for (const pp of params.people) {
        const off = pp.retirementAge - pp.currentAge
        if (off > anchor) anchor = off
      }
      const rMin = Math.min(1, params.survivorSpendingRatio)
      for (let t = 0; t < params.maxHorizonYears; t++) {
        const oop = oopStream[t] ?? 0
        if (oop <= 0) continue
        const k = Math.max(0, t - anchor)
        const essentialsMin = (bud.sticky[k] ?? 0) + rMin * (bud.scalableEssentials[k] ?? 0)
        if (essentialsMin < oop)
          return `budget floor-track essentials at sim-year ${t} is below the out-of-pocket medical the HSA cap is sized off — the floor cannot budget below qualified medical (the containment premise)`
      }
    }
    // THE RECONCILIATION BACKSTOP (U9a review fold, 2026-07-02): whenever a budget rides,
    // `annualSpendingReal` MUST equal the compiled year-0 full-track total (sticky +
    // scalableEssentials + discretionary at k=0). The store's `budgetDraftPatch` maintains
    // the invariant atomically, but the engine cannot see WHO wrote the scalar — a second,
    // budget-blind writer (the spend question, a tampered vault) would desync them and the
    // headline's dollar grammar (`buildDollar` reads the scalar) would render an OPTIMISTIC
    // spend the budget never funds: the cardinal direction, invisible to every other gate.
    // Fail loud to the calm indeterminate instead (the buckets-sum-to-portfolio precedent).
    // Relative tolerance absorbs float summation-order dust between the compile's slot adds
    // and the reconciliation helper's running total.
    const yearZeroFull = (bud.sticky[0] ?? 0) + (bud.scalableEssentials[0] ?? 0) + (bud.discretionary[0] ?? 0)
    if (
      Math.abs(yearZeroFull - params.annualSpendingReal) >
      1e-6 * Math.max(1, Math.abs(params.annualSpendingReal))
    ) {
      return 'budget does not reconcile: annualSpendingReal must equal the budget’s year-0 full-track total (the reconciliation invariant)'
    }
  }
  return null
}

// =========================================================================
// The U6/U7 band fan (a presence-keyed PRESENTATION accounting surface). A pure post-loop
// reduction of the per-year living-cohort balances `simulate` observes through the
// decumulation sink — see {@link BandFan}. It reads state already computed; it never
// perturbs the distribution (the reduce-to-spine band-fan byte-identity guard).
// =========================================================================

/** Percentile of an ASCENDING-sorted, non-empty array — the R-7 / Excel PERCENTILE.INC method
 *  (linear interpolation between the two closest ranks), the standard quantile a reader expects.
 *  `n === 1` returns the lone value (a single surviving household IS its own every-percentile —
 *  the honest reading of a one-couple late-year cohort). */
export function bandPercentile(sortedAsc: readonly number[], p: number): number {
  const n = sortedAsc.length
  if (n === 1) return sortedAsc[0]!
  const h = (n - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sortedAsc[lo]! + (h - lo) * (sortedAsc[hi]! - sortedAsc[lo]!)
}

/** The year-major healthcare collectors (P3·U11) — the {@link buildHealthReadout} input. */
interface HealthAgg {
  readonly acaNetPremium: number[][]
  readonly medicareBase: number[][]
  readonly irmaaSurcharge: number[][]
  readonly medicareExtras: number[][]
  readonly acaMagi: number[][]
  readonly irmaaMagi: number[][]
  readonly overCliff: number[]
  readonly acaPriced: number[]
  readonly cohort: number[]
}

/** Reduce the year-major healthcare observations into the {@link HealthReadout} series
 *  (P3·U11) — the {@link buildBandFan} discipline verbatim: medians among the year's funded
 *  living paths, ending at the first empty-cohort year (an empty year is never emitted), the
 *  over-cliff signal a FRACTION of the year's ACA-priced paths (a mean would smear the
 *  discontinuity — insight 062). No yearsFromNow-0 anchor: today has no flow to observe. */
export function buildHealthReadout(agg: HealthAgg, paths: number): HealthReadout {
  const byYear: HealthReadoutYear[] = []
  const median = (values: readonly number[]): number =>
    values.length === 0 ? 0 : bandPercentile([...values].sort((a, b) => a - b), 0.5)
  for (let t = 0; t < agg.cohort.length; t++) {
    const count = agg.cohort[t] ?? 0
    if (count === 0) break // no household survives to year t+1 — the series ends here (honest)
    const priced = agg.acaPriced[t] ?? 0
    byYear.push({
      yearsFromNow: t + 1,
      acaNetPremiumP50: median(agg.acaNetPremium[t] ?? []),
      medicareBaseP50: median(agg.medicareBase[t] ?? []),
      irmaaSurchargeP50: median(agg.irmaaSurcharge[t] ?? []),
      // No UI consumer yet — DELIBERATELY reserved (extras ultramode 2026-07-12, conscious
      // call): the per-year extras median completes the base/surcharge/extras split for the
      // filed Medicare-only detail door (medicare-pricing-build-spec.md — the rule-38 dollars
      // home). The user-facing extras disclosure travels the draft-side per-person channel
      // (medicareExtrasDisclosureView), which survives the date route where this readout
      // is absent — this field is the future readout's, not the disclosure's.
      medicareExtrasP50: median(agg.medicareExtras[t] ?? []),
      acaMagiP50: median(agg.acaMagi[t] ?? []),
      irmaaMagiP50: median(agg.irmaaMagi[t] ?? []),
      overCliffFraction: priced > 0 ? (agg.overCliff[t] ?? 0) / priced : 0,
      acaPricedFraction: paths > 0 ? priced / paths : 0,
      cohortFraction: paths > 0 ? count / paths : 0,
    })
  }
  return { byYear }
}

/** Reduce the year-major living-cohort balances into the {@link BandFan} the band renders.
 *  Index t of `valuesByYear` holds the END-of-sim-year-t portfolio value of every household
 *  that still EXISTS that year ($0 for an alive-but-broke path; a both-dead path is simply
 *  absent — the living-cohort + ruin-floor rule). The today anchor (yearsFromNow 0 = every path
 *  at `initialPortfolio`) is prepended. The fan STOPS at the first year no household survives —
 *  an empty cohort has no honest percentile, so an empty late year is never drawn. */
export function buildBandFan(
  valuesByYear: readonly number[][],
  cohortByYear: readonly number[],
  initialPortfolio: number,
  paths: number,
): BandFan {
  const byYear: BandFanYear[] = [
    {
      yearsFromNow: 0,
      p10: initialPortfolio,
      p25: initialPortfolio,
      p50: initialPortfolio,
      p75: initialPortfolio,
      p90: initialPortfolio,
      cohortFraction: 1,
    },
  ]
  for (let t = 0; t < valuesByYear.length; t++) {
    const count = cohortByYear[t] ?? 0
    if (count === 0) break // no household survives to year t+1 — the fan ends here (honest)
    const sorted = [...(valuesByYear[t] ?? [])].sort((a, b) => a - b)
    byYear.push({
      yearsFromNow: t + 1,
      p10: bandPercentile(sorted, 0.1),
      p25: bandPercentile(sorted, 0.25),
      p50: bandPercentile(sorted, 0.5),
      p75: bandPercentile(sorted, 0.75),
      p90: bandPercentile(sorted, 0.9),
      cohortFraction: count / paths,
    })
  }
  return { byYear }
}

/** True iff a path has an observed SURVIVOR PHASE (U7 e1): one spouse outlives the other WITHIN the
 *  window — the earliest death is strictly before the latest AND falls inside `maxHorizonYears`. The
 *  `firstDeath < maxHorizonYears` bound matches the engine's own simulated window exactly (a path runs
 *  to `min(lastDeath, maxHorizon)`, so a first death AT/after the window end is never widowed in-sim).
 *  A people-of-one household (and a both-die-same-year path) has none. PURE — observed from the
 *  sampled death offsets only. */
export function isSurvivorPhasePath(deathOffsets: readonly number[], maxHorizonYears: number): boolean {
  if (deathOffsets.length < 2) return false
  let firstDeath = deathOffsets[0]!
  let lastDeath = deathOffsets[0]!
  for (let i = 1; i < deathOffsets.length; i++) {
    const off = deathOffsets[i]!
    if (off < firstDeath) firstDeath = off
    if (off > lastDeath) lastDeath = off
  }
  return firstDeath < lastDeath && firstDeath < maxHorizonYears
}

/** Reduce per-path observations into the {@link SurvivorConditioned} surface (U7 e1) — PURE, the
 *  observed-not-perturbed reduction (the {@link buildBandFan} precedent). `deathOffsetsByPath` and
 *  `depletionYears` are paths-aligned. A path joins the DENOMINATOR iff it has a survivor phase
 *  ({@link isSurvivorPhasePath}); the NUMERATOR iff it ALSO never depleted — the survivor inherits the
 *  plan, so ANY depletion (even pre-first-death, while both were alive) is a survivor failure (the
 *  equal-weight definition). Returns null when no path had a survivor phase (presence-keyed — the
 *  surface is then absent, so a fixed-horizon / people-of-one run emits nothing: reduce-to-spine). */
export function buildSurvivorConditioned(
  deathOffsetsByPath: readonly (readonly number[])[],
  depletionYears: readonly DepletionYear[],
  maxHorizonYears: number,
): Pick<SurvivorConditioned, 'survivorPhasePaths' | 'survivorSurvivors' | 'survivalFraction'> | null {
  let survivorPhasePaths = 0
  let survivorSurvivors = 0
  for (let p = 0; p < deathOffsetsByPath.length; p++) {
    if (!isSurvivorPhasePath(deathOffsetsByPath[p]!, maxHorizonYears)) continue
    survivorPhasePaths++
    if ((depletionYears[p] ?? NEVER_DEPLETED) === NEVER_DEPLETED) survivorSurvivors++
  }
  if (survivorPhasePaths === 0) return null
  return {
    survivorPhasePaths,
    survivorSurvivors,
    survivalFraction: survivorSurvivors / survivorPhasePaths,
  }
}

/** The survivor income step-down magnitude (U7 e1b) — the MEDIAN drop in monthly non-portfolio
 *  household income at widowhood, real $/month, across the survivor-phase paths. PURE: it re-runs the
 *  draw-free {@link cashTermsForYear}, so it consumes no entropy and cannot perturb the spine
 *  (byte-identity to a survivor-off run holds — the helper is called only in the post-loop reduction).
 *
 *  Per survivor-phase path, the drop is a COUNTERFACTUAL: the household's non-portfolio income if BOTH
 *  were alive at the measurement year (every death offset pushed past it, so the all-alive cash branch
 *  runs) MINUS the income the survivor actually has there. The measurement year is the STEADY-STATE year
 *  `tStar` — the later of the first death `fd` and both spouses' SS-claim offsets (`claimYear`), held
 *  inside the survivor's living window `[fd, survivorDeath − 1]` and the horizon. The steady-state anchor
 *  is load-bearing for honesty: at the RAW first-death year a death that lands AFTER retirement but
 *  BEFORE claiming would read the all-alive leg with $0 SS (neither spouse claimed yet) while the
 *  survivor already draws a §202 widow(er) benefit at 60 — so the raw diff goes NEGATIVE (income
 *  "rising" at widowhood) and UNDERSTATES the true permanent cliff (the household really steps from two
 *  retirement benefits to one once both would have claimed). Anchoring at `tStar` lets both would-be
 *  benefits be in pay status before differencing, capturing exactly what the survivor permanently loses.
 *  Each per-path drop is then FLOORED at 0 — the anchor already yields ≥ 0 in every both-claimed case;
 *  the floor covers the residual edge where the survivor dies before the steady state is reached
 *  (`tStar` clamped pre-claim), so a transient §202-ahead-of-an-unclaimed-benefit year can never read as
 *  a negative step-down (the cardinal understating direction). Median (not mean) so a handful of
 *  early-widowhood outliers cannot drag the representative figure. Returns 0 only on the unreachable
 *  no-survivor-phase input (the caller computes it solely when a survivor surface exists). */
export function survivorIncomeStepDownMonthlyReal(
  deathOffsetsByPath: readonly (readonly number[])[],
  maxHorizonYears: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  higherClaimOffset: number,
): number {
  // `claimYear` = the later of the two SS-claim offsets — the first year BOTH would-be retirement
  // benefits are in pay status (negative for an already-claiming spouse; the per-path max(fd, …) below
  // floors it at fd, so an already-claiming household measures at the death itself).
  let claimYear = offsets.length > 0 ? offsets[0]!.claim : 0
  for (let i = 1; i < offsets.length; i++) if (offsets[i]!.claim > claimYear) claimYear = offsets[i]!.claim
  const annualDrops: number[] = []
  for (let p = 0; p < deathOffsetsByPath.length; p++) {
    const deaths = deathOffsetsByPath[p]!
    if (!isSurvivorPhasePath(deaths, maxHorizonYears)) continue
    let fd = deaths[0]!
    let survivorDeath = deaths[0]!
    for (let i = 1; i < deaths.length; i++) {
      if (deaths[i]! < fd) fd = deaths[i]!
      if (deaths[i]! > survivorDeath) survivorDeath = deaths[i]!
    }
    // The steady-state measurement year — as early as both-claimed, kept within the survivor's living
    // window and the horizon. survivorDeath > fd for a survivor phase, so tStar ≥ fd ≥ 0.
    const tStar = Math.min(maxHorizonYears - 1, survivorDeath - 1, Math.max(fd, claimYear))
    // "Both alive at tStar": every offset that died at/before tStar (the first-dier) pushed one year
    // past it; the survivor (death > tStar) is untouched.
    const bothAlive = deaths.map((d) => (d <= tStar ? tStar + 1 : d))
    const incomeBothAlive = cashTermsForYear(tStar, params, offsets, bothAlive, higherClaimOffset).nonPortfolioIncomeReal
    const incomeSurvivor = cashTermsForYear(tStar, params, offsets, deaths, higherClaimOffset).nonPortfolioIncomeReal
    annualDrops.push(Math.max(0, incomeBothAlive - incomeSurvivor))
  }
  if (annualDrops.length === 0) return 0
  annualDrops.sort((a, b) => a - b)
  const mid = Math.floor(annualDrops.length / 2)
  const medianAnnual =
    annualDrops.length % 2 === 1 ? annualDrops[mid]! : (annualDrops[mid - 1]! + annualDrops[mid]!) / 2
  return medianAnnual / 12
}

/**
 * Run the Monte Carlo spine. Deterministic in (params, seed): a fixed seed reproduces
 * a byte-identical distribution on one JS engine.
 *
 * `options.bandFan` (opt-in) additionally emits the per-year living-cohort percentile fan
 * (`distribution.bandFan`) for the U6/U7 confidence band — a PARALLEL presentation surface
 * observed from per-year state already computed, byte-identical to a fan-off run on
 * `terminalValuesReal` / `survivalFraction` / `depletionYears` (the reduce-to-spine guard).
 * `options.survivorConditioned` (opt-in) likewise emits `distribution.survivorConditioned` — the
 * survivor-conditioned survival statistic (U7 e1), observed from the sampled deaths + the resolved
 * depletion, equally byte-identical to an opt-out run. The single headline run sets these; the
 * date-search's many candidates never do (perf + wire).
 *
 * P3·U9 — `params.budget` (PARAM-driven, not an option): when the compiled budget construct is
 * present the run evaluates BOTH tracks — full lifestyle and essentials-only floor — as two
 * decumulation+overlay passes per path on the SAME draws/deaths/returns (a tier is a different
 * SPEND on the same paths; zero draws consumed by either pass, so CRN holds), emitting
 * `distribution.floor` presence-keyed. UNLIKE the option surfaces above this is a genuine second
 * compute — the byte-identity guard is the degenerate-identity golden, not an opt-out diff.
 * `options.bandFanTrack` picks which pass feeds the fan ('full' default; 'floor' only for the
 * date route's floor-crowned band re-run).
 */
export function simulate(
  params: SimulationParams,
  seed: number,
  options?: {
    readonly bandFan?: boolean
    readonly survivorConditioned?: boolean
    /** P3·U9 — which track's balances feed the band fan. The date route's floor-crowned
     *  band re-run passes 'floor' so all three DateBand fields (fan, state, offset) ride
     *  ONE track; everything else — incl. the spine headline run — reads the FULL track
     *  (the user's intended spending). 'floor' without a budget construct reads as 'full'
     *  (there is no second pass to observe). Default 'full'. */
    readonly bandFanTrack?: 'full' | 'floor'
    /** P3·U11 — emit the per-year healthcare readout series ({@link HealthReadout}): the
     *  net-ACA-premium / Medicare base-vs-IRMAA / MAGI-anchor medians + the per-year
     *  over-cliff fraction, observed from the FULL track's overlay pass. Emitted iff the
     *  overlay priced healthcare (`healthcareEnabled`) — absence is the honest shape for a
     *  household outside the engine's priced healthcare domain (the categorical-door
     *  contract). Observe-only: byte-identical to an opt-out run on every joint field. */
    readonly healthReadout?: boolean
    /** VALIDATION-HARNESS-ONLY (the `_epsilonRequired` test-seam idiom; U16 §S0.2). Substitute
     *  the CRN draw matrices — the near-tie inversion stress gate feeds block-bootstrap
     *  market sequences through the WHOLE shipped machinery (transform, decumulation, overlay,
     *  scoring) so only the DRAW SOURCE varies (the 095 shipped-path law). Passing
     *  `buildDraws(seed, …)` itself is proven byte-identical to omitting the option. NEVER set
     *  from product code — a shape test pins the only non-test consumers; dimensions are
     *  fail-loud-guarded (a mismatched matrix would read as silent NaN paths). */
    readonly _injectedDraws?: Draws
  },
): SimOutput {
  // The seed is part of the R19 surface (U4 persists it with a bit-identical
  // reproduction contract, matching dateSearch's reject): mulberry32(seed|0) would
  // silently coerce a NaN/fractional seed (NaN|0 === 0) and reproduce a DIFFERENT
  // plan than was saved — indeterminate, never a quiet coercion.
  if (!Number.isInteger(seed)) {
    return { indeterminate: true, reason: `seed must be a finite integer (got ${seed})` }
  }
  const invalid = validateParams(params)
  if (invalid !== null) return { indeterminate: true, reason: invalid }

  const { paths, maxHorizonYears: maxHorizon, market } = params
  const people = params.people
  const injected = options?._injectedDraws
  if (injected !== undefined) {
    // Fail-loud dimension guard (harness seam, not R19 user input — a mismatched matrix would
    // silently read undefined→NaN into every path; refuse it as the caller bug it is).
    if (
      injected.stockZ.length !== paths ||
      injected.bondZ.length !== paths ||
      injected.longevityU.length !== paths ||
      injected.stockZ.some((r) => r.length !== maxHorizon) ||
      injected.bondZ.some((r) => r.length !== maxHorizon) ||
      injected.longevityU.some((r) => r.length !== people.length)
    ) {
      throw new Error(
        `[simulate] _injectedDraws dimensions mismatch the run (need paths=${paths}, horizon=${maxHorizon}, ` +
          `people=${people.length}) — the harness built its matrix against different dims (fail-loud, never NaN paths)`,
      )
    }
  }
  const draws = injected ?? buildDraws(seed, paths, maxHorizon, people.length)

  // Log-space moments + the Cholesky factor, computed once.
  const logStock = toLogMoments(market.stock.mean, market.stock.stdDev)
  const logBond = toLogMoments(market.bond.mean, market.bond.stdDev)
  const rho = market.stockBondCorrelation
  const sqrt1mRho2 = Math.sqrt(Math.max(0, 1 - rho * rho))

  // The SS sub-engine resolves each person's actual benefit AMOUNTS from their PIA + claim age + birth
  // year — own (claim-age-adjusted) + the Method-C spousal excess — ONCE, pre-loop. It depends on NONE
  // of the date-search-swept fields (the sweep varies only retirementAge → the retire offset; claim
  // offsets, pia, and birthYear are held verbatim), so it is candidate-invariant and consumes ZERO draws
  // (CRN-safe). PIA=0 ⇒ {ownAnnual:0, spousalExcessAnnual:0} ⇒ byte-identical to the legacy
  // socialSecurityReal=0 spine (validated birthYear keeps `fraMonthsForBirthYear` from throwing).
  const benefitPeople: BenefitPerson[] = people.map((p) => ({
    piaAnnual: p.pia,
    claimAge: p.socialSecurityClaimAge,
    birthYear: p.birthYear,
  }))
  const benefits = householdBenefits(benefitPeople)
  const offsets: PersonOffsets[] = people.map((p, i) => ({
    retire: p.retirementAge - p.currentAge,
    claim: p.socialSecurityClaimAge - p.currentAge,
    earnedIncomeReal: p.earnedIncomeReal,
    socialSecurityReal: benefits[i]?.ownAnnual ?? 0,
    spousalExcessAnnual: benefits[i]?.spousalExcessAnnual ?? 0,
  }))
  // The higher earner's claim offset — the START gate for the spousal excess (the worker must have filed,
  // RS 00202.001). argmax pia, strict-`>` tie-to-first, mirroring householdBenefits' own `higher` rule (an
  // equal-PIA tie carries a 0 excess either way, so the tie resolution is immaterial). Pre-loop, candidate-
  // invariant (pia + claim are not swept). For people-of-one the lone person is its own "higher" and the
  // excess is 0, so the gate has no effect.
  let higherIdx = 0
  for (let i = 1; i < people.length; i++) if ((people[i]?.pia ?? 0) > (people[higherIdx]?.pia ?? 0)) higherIdx = i
  const higherClaimOffset = offsets[higherIdx]?.claim ?? 0
  const longevityPeople: LongevityPerson[] = people.map((p) => ({ sex: p.sex, currentAge: p.currentAge }))

  // Tax-and-accounts overlay (U2 · M6a) setup, computed once. `overlayPeople[i]` carries each
  // person's birth year (startCalendarYear − age at year 0); the aggregated pre-tax pool's static
  // owner is people[0] (the survivor inherits it — handled per-year via the householdYears regime
  // built in the path loop). With a per-year stream always supplied, `household.owner`/`spouse` are
  // never read for the resolution (only `startCalendarYear` is); the config is the EXHAUSTIVE-OFF
  // pass-through (no household) unless tax or RMD is on.
  const overlay = params.overlay
  const overlayPeople: readonly OverlayPerson[] = overlay
    ? people.map((pp) => ({ birthYear: overlay.startCalendarYear - pp.currentAge }))
    : []
  const owner = overlayPeople[0]
  const spouse = overlayPeople[1]
  const overlayConfig: TaxOverlayConfig =
    overlay && (overlay.taxEnabled || overlay.rmdEnabled) && owner
      ? {
          taxEnabled: overlay.taxEnabled,
          rmdEnabled: overlay.rmdEnabled,
          household: {
            startCalendarYear: overlay.startCalendarYear,
            filing: overlay.filing,
            owner,
            ...(spouse ? { spouse } : {}),
            // The state-tax unit: thread the household state (presence-keyed — absent ⇒ the field is
            // omitted ⇒ the engine's structural `+ 0` no-op, byte-identical to the spine). The engine
            // keys pricing on `isPricedState` membership; the BUILT `params.overlay.retirementState`
            // is what the S5 producer's-output predicate reads (never a geography re-derivation).
            ...(overlay.retirementState !== undefined ? { retirementState: overlay.retirementState } : {}),
          } satisfies Household,
        }
      : { taxEnabled: false, rmdEnabled: false }

  const terminalValuesReal: number[] = new Array(paths)
  const depletionYears: DepletionYear[] = new Array(paths)
  let survivors = 0

  // P3·U9 — the floor-track tallies, allocated iff the budget construct is present. The
  // floor is a GENUINE second decumulation+overlay pass per path (the essentials-only
  // withdrawals on the SAME draws/deaths/returns — a tier is a different SPEND on the same
  // paths, never a re-simulation), so unlike bandFan/survivorConditioned it is param-driven,
  // not caller-opt-in, and the bandFan byte-identity-guard pattern proves nothing about it —
  // its correctness anchor is the degenerate-identity golden. It emits NO terminals: the
  // floor verdict needs survival + depletion depth only; the band/dollar read the full track.
  const floorDepletionYears: DepletionYear[] | undefined = params.budget ? new Array(paths) : undefined
  let floorSurvivors = 0

  // U6/U7 band fan (opt-in): year-major living-cohort balance bins + per-year household-existence
  // count, allocated ONLY when requested (the single headline run). Index t = END of sim-year t
  // (yearsFromNow t+1); the today anchor is added at reduction. A run WITHOUT the option allocates
  // nothing, passes no sink, and is byte-identical (presence-keyed — the reduce-to-spine guard).
  const wantFan = options?.bandFan === true
  // P3·U9 — the fan's source track (see the options doc): 'floor' only when a budget rode
  // the run; the degenerate/no-budget fallback is the full pass, which IS the only pass.
  const fanTrack: 'full' | 'floor' = options?.bandFanTrack === 'floor' && params.budget ? 'floor' : 'full'
  const fanValuesByYear: number[][] | undefined = wantFan
    ? Array.from({ length: maxHorizon }, () => [])
    : undefined
  const fanCohortByYear: number[] | undefined = wantFan
    ? new Array<number>(maxHorizon).fill(0)
    : undefined

  // U7 e1 survivor-conditioned surface (opt-in): collect each path's sampled death offsets (paths-
  // aligned with depletionYears below), reduced after the loop. Nothing allocated / pushed when opted
  // out ⇒ byte-identical (presence-keyed). Observed-not-perturbed (the bandFan precedent).
  const wantSurvivor = options?.survivorConditioned === true
  const survivorDeathOffsets: number[][] | undefined = wantSurvivor ? [] : undefined

  // P3·U11 healthcare readout (opt-in): year-major healthcare observation bins, allocated only
  // when requested AND the overlay actually prices healthcare (`healthcareEnabled` — the honest
  // domain gate: a household the engine prices no healthcare for gets NO series, matching the
  // categorical door). FULL track only (the user's intended spending — the floor pass never
  // observes). Observed-not-perturbed (the bandFan precedent, byte-identity presence-keyed).
  const wantHealth = options?.healthReadout === true && params.overlay?.healthcareEnabled === true
  const healthAgg = wantHealth
    ? {
        acaNetPremium: Array.from({ length: maxHorizon }, (): number[] => []),
        medicareBase: Array.from({ length: maxHorizon }, (): number[] => []),
        irmaaSurcharge: Array.from({ length: maxHorizon }, (): number[] => []),
        medicareExtras: Array.from({ length: maxHorizon }, (): number[] => []),
        acaMagi: Array.from({ length: maxHorizon }, (): number[] => []),
        irmaaMagi: Array.from({ length: maxHorizon }, (): number[] => []),
        overCliff: new Array<number>(maxHorizon).fill(0),
        acaPriced: new Array<number>(maxHorizon).fill(0),
        cohort: new Array<number>(maxHorizon).fill(0),
      }
    : undefined

  // The per-path tax-aware solver surfaces (U3·M6 — the solver output contract), collected
  // iff the run carries the overlay (presence-keyed: a spine run has no tax data, and
  // zero-fill would contradict terminalValuesReal — absence is the honest shape). Each
  // overlay call already runs to THIS path's own horizon (min(sampled last death,
  // maxHorizonYears)), so the overlay's horizon-end buckets/basis ARE the sampled-death-year
  // snapshot the §1014/IRD objective needs — this is pure collection, no new overlay math.
  const taxAware = overlay
    ? {
        lifetimeTaxPaidReal: new Array<number>(paths),
        terminalTaxableReal: new Array<number>(paths),
        terminalPretaxReal: new Array<number>(paths),
        terminalRothReal: new Array<number>(paths),
        terminalHsaReal: new Array<number>(paths),
        terminalTaxableBasisReal: new Array<number>(paths),
        // P3·U11 — the lifetime healthcare Σ pair (already returned by every overlay call,
        // previously dropped here): the regime-toggle preview's median health-cost delta.
        lifetimeNetPremiumReal: new Array<number>(paths),
        lifetimeMedicareCostReal: new Array<number>(paths),
      }
    : undefined

  for (let p = 0; p < paths; p++) {
    // Death years per person on this path (sampled), then the per-path horizon.
    let deathOffsets: number[]
    let horizon: number
    if (params.longevityMode === 'fixed-horizon') {
      deathOffsets = people.map(() => maxHorizon) // nobody dies within the horizon
      horizon = maxHorizon
    } else {
      const uRow = draws.longevityU[p] ?? []
      const path = sampleCouplePath(longevityPeople, uRow)
      deathOffsets = [...path.deathYearOffsets]
      horizon = Math.min(path.lastDeathYear, maxHorizon)
    }
    // Paths-aligned with depletionYears (pushed for EVERY path, BEFORE the horizon≤0 continue, so the
    // reduction can index both by p). The reference is safe to retain — deathOffsets is never mutated.
    if (survivorDeathOffsets) survivorDeathOffsets.push(deathOffsets)
    if (horizon <= 0) {
      terminalValuesReal[p] = params.initialPortfolio
      depletionYears[p] = NEVER_DEPLETED
      survivors++
      if (floorDepletionYears) {
        // A zero-length horizon never ran either pass — the floor mirrors the full track.
        floorDepletionYears[p] = NEVER_DEPLETED
        floorSurvivors++
      }
      if (taxAware && overlay) {
        // A zero-length horizon never ran the overlay: the path's "horizon-end" state IS the
        // initial state — no tax paid, the entered buckets/basis verbatim.
        taxAware.lifetimeTaxPaidReal[p] = 0
        taxAware.terminalTaxableReal[p] = overlay.buckets.taxable
        taxAware.terminalPretaxReal[p] = overlay.buckets.pretax
        taxAware.terminalRothReal[p] = overlay.buckets.roth
        taxAware.terminalHsaReal[p] = overlay.buckets.hsa ?? 0
        taxAware.terminalTaxableBasisReal[p] = overlay.initialTaxableBasis ?? 0
        taxAware.lifetimeNetPremiumReal[p] = 0
        taxAware.lifetimeMedicareCostReal[p] = 0
      }
      continue
    }

    // Real returns + net withdrawals for this path's horizon. When the overlay is on we also build
    // the per-year SS benefit (taxed as provisional income — distinct from `net`, which already has
    // SS subtracted) and the survivor-aware household regime (living = the people alive that year,
    // in people-order ⇒ living[0] is the pre-tax pool holder: people[0] while alive, else the
    // surviving spouse who inherited it). All three are pure functions of the death timeline (zero
    // draws), so CRN holds across the survivor MFJ→single transition.
    const sRow = draws.stockZ[p]
    const bRow = draws.bondZ[p]
    const realStock: number[] = []
    const realBond: number[] = []
    const withdrawals: number[] = []
    // P3·U9 — the floor track's per-year net-withdrawal vector, assembled beside the full
    // track's from the SAME cashTermsForYear call (the income terms are track-invariant).
    const withdrawalsFloor: number[] | undefined = floorDepletionYears ? [] : undefined
    const ssBenefits: number[] = []
    const householdYears: HouseholdYear[] = []
    const contributionYears: YearContribution[] = []
    const bridgeMask: boolean[] = []
    // R40 — the two KTD-9 taxable feeds, assembled per-path beside `ssBenefits` (the income SELECT
    // is per-OWNER-death-gated, and deaths are per-path). `ongoingTaxableGrossUp` enters
    // `nonSSordinary` (seam 2 — grossed up + nets); `ongoingTaxableIrmaaOnly` feeds IRMAA-MAGI ONLY
    // (the clamped working-year taxable — no phantom gross-up withdrawal, KTD-9). Both empty unless
    // the income construct is present (presence-keyed spread below ⇒ byte-identical reduce-to-spine).
    const ongoingTaxableGrossUp: number[] = []
    const ongoingTaxableIrmaaOnly: number[] = []
    for (let t = 0; t < horizon; t++) {
      const zs = sRow?.[t]
      const zbRaw = bRow?.[t]
      if (zs === undefined || zbRaw === undefined) break
      const zb = rho * zs + sqrt1mRho2 * zbRaw
      realStock.push(simpleReturnFromNormal(logStock, zs))
      realBond.push(simpleReturnFromNormal(logBond, zb))
      const cash = cashTermsForYear(t, params, offsets, deathOffsets, higherClaimOffset)
      withdrawals.push(cash.net)
      if (withdrawalsFloor) withdrawalsFloor.push(cash.netFloor)
      if (overlay) {
        ssBenefits.push(cash.ss)
        // R40 — record this year's KTD-9 taxable split for the overlay (presence-keyed on
        // `overlay.income` below; pushed unconditionally here because `cashTermsForYear` returns 0/0
        // for both when income is absent, so an income-absent run carries all-zero arrays that the
        // presence-keyed spread never forwards — byte-identical reduce-to-spine).
        if (overlay.income) {
          ongoingTaxableGrossUp.push(cash.ongoingTaxableGrossUp)
          ongoingTaxableIrmaaOnly.push(cash.ongoingTaxableIrmaaOnly)
        }
        const living: OverlayPerson[] = []
        for (let i = 0; i < overlayPeople.length; i++) {
          const op = overlayPeople[i]
          if (op !== undefined && t < (deathOffsets[i] ?? 0)) living.push(op)
        }
        householdYears.push({ living })
        // C3 §3b: the per-path bridge-year mask — the dead-earner predicate shape
        // (`t < retire_i && t < death_i && (earned_i > 0 || accumulation present)`), assembled here
        // because deaths are per-path. The construct-gated income-blind widening mirrors
        // validateParams' isBridgeYear EXACTLY (insight 020 — the guard keys to the hazard's
        // creator): under the accumulation construct the §7 clamp zeroes a zero-income worker's
        // draw-MAGI too, so their working years must also arm the overlay's fail-loud reads.
        // Zero-draw, CRN-safe; consumed only by the overlay's two throw-or-nothing
        // fail-loud arms (the masked lagged read + the ACA price gate), so supplying it can
        // never perturb a value (byte-identity by construction).
        if (overlay.healthcareEnabled) {
          const accumulating = overlay.accumulation !== undefined
          bridgeMask.push(
            offsets.some(
              (o, i) =>
                (o.earnedIncomeReal > 0 || accumulating) && t < o.retire && t < (deathOffsets[i] ?? 0),
            ),
          )
        }
        // C2 §7 (the B×C consequence): this PATH's per-year per-bucket contribution amounts,
        // assembled per-path because deathOffsets exist only inside the path loop (one
        // per-candidate transform cannot see per-path deaths). CRN-safe zero-draw work, exactly
        // like the cash terms above — see {@link contributionsForYear}. The per-person Medicare
        // onset threads into the HSA zeroing predicate (C3 §3b).
        if (overlay.accumulation) {
          contributionYears.push(
            contributionsForYear(t, overlay.accumulation, offsets, deathOffsets, people, overlay.medicareOnsetSimYear),
          )
        }
      }
    }

    // U6/U7 band fan: this path's per-year balance sink (the decumulation pushes each year's
    // post-step total into it). Undefined unless the run opted in ⇒ no sink ⇒ byte-identical.
    // P3·U9: the sink attaches to exactly ONE pass — `fanTrack` picks which (the full pass
    // for every shipped caller; the floor pass only for the date route's floor-crowned band).
    const pathBalances: number[] | undefined = wantFan ? [] : undefined
    const fullSink = fanTrack === 'full' ? pathBalances : undefined
    const floorSink = fanTrack === 'floor' ? pathBalances : undefined
    // P3·U11 — this path's healthcare observation sink (FULL track only; fresh per path).
    const healthSink: HealthYearSink | undefined = wantHealth
      ? { acaNetPremium: [], medicareBase: [], irmaaSurcharge: [], medicareExtras: [], acaMagi: [], irmaaMagi: [], acaCliffState: [] }
      : undefined
    let res: DecumulationResult
    let floorRes: DecumulationResult | undefined
    if (overlay) {
      // Tax-aware decumulation. `overlay.buckets` (sum === initialPortfolio, validated) IS the
      // total, so a collapsed pool under the EXHAUSTIVE OFF condition reduces byte-identically to
      // the spine branch below (the reduce-to-spine golden, contract #3).
      // P3·U9: the tax inputs are built ONCE and shared by both passes — the floor pass differs
      // ONLY in its withdrawals vector (a tier is a different SPEND on the SAME paths; identical
      // streams, config, and buckets; zero draws consumed by either decumulation, so CRN holds).
      const taxInputs = {
          ssBenefits,
          conversions: overlay.conversions ?? [],
          initialTaxableBasis: overlay.initialTaxableBasis,
          householdYears,
          bracketFillCeilings: overlay.bracketFillCeilings ?? [],
          // Per-person pre-tax split (M6b·B): aligned to `people` (= the overlay's canonical
          // owner→spouse order). Absent ⇒ the aggregate pool (byte-identical M6a path).
          ...(overlay.pretaxByPerson ? { initialPretaxByPerson: overlay.pretaxByPerson } : {}),
          // U3 · M5 HSA spend-side inputs: spread only when present (absent ⇒ the byte-identical
          // pre-M5 taxInputs). They ride with tax alone — an HSA pays OOP medical MAGI-invisibly
          // even when the ACA/IRMAA pricing (healthcareEnabled) is off (medicareCost is just 0).
          ...(overlay.oopMedical ? { oopMedical: overlay.oopMedical } : {}),
          ...(overlay.hsaOwnerIndex !== undefined ? { hsaOwnerIndex: overlay.hsaOwnerIndex } : {}),
          // C2: the per-path assembled contribution inflows — spread ONLY when the accumulation
          // construct is present (absent ⇒ the byte-identical pre-C2 taxInputs, presence-keyed §1).
          ...(overlay.accumulation ? { contributions: contributionYears } : {}),
          // R40: the two KTD-9 taxable feeds — spread ONLY when the income construct is present
          // (absent ⇒ the byte-identical no-income taxInputs, presence-keyed R40.6). `…GrossUp`
          // enters `nonSSordinary` (seam 2); `…IrmaaOnly` lifts IRMAA-MAGI alone (the clamped
          // working-year taxable — no phantom gross-up withdrawal, KTD-9).
          ...(overlay.income
            ? {
                ongoingTaxableGrossUp,
                ongoingTaxableIrmaaOnly,
              }
            : {}),
          // U3 · M3 Slice 4 healthcare streams: spread ONLY when the overlay is enabled, so a
          // healthcare-off run passes the byte-identical pre-Slice-4 taxInputs (reduce-to-spine).
          // validateParams has already rejected healthcareEnabled with tax off (indeterminate).
          ...(overlay.healthcareEnabled
            ? {
                healthcareEnabled: true,
                enhancedSubsidies: overlay.enhancedSubsidies ?? false,
                slcsp: overlay.slcsp ?? [],
                enrolledPremium: overlay.enrolledPremium ?? [],
                // IRMAA pre-sim MAGI seed (M4): only the lagged early years read it; the validateParams
                // gate has already required it whenever a member is Medicare-ENROLLED (per-person onset,
                // biological-65 default) in years 0..lookback−1.
                irmaaMagiSeed: overlay.irmaaMagiSeed ?? [],
                // C3 §3b: the per-person onset + the working-year additive override + the per-path
                // bridge mask, all inside this healthcareEnabled spread so the healthcare-off
                // taxInputs stay byte-identical. The mask is always supplied (throw-or-nothing —
                // it can never perturb a value); onset/override spread only when present.
                bridgeYearMask: bridgeMask,
                ...(overlay.medicareOnsetSimYear ? { medicareOnsetSimYear: overlay.medicareOnsetSimYear } : {}),
                ...(overlay.irmaaMagiOverride ? { irmaaMagiOverride: overlay.irmaaMagiOverride } : {}),
                // The ask-for-Medicare-extras per-person vector — inside the healthcareEnabled
                // spread (extras price ONLY where Medicare prices; a healthcare-off run keeps
                // the byte-identical taxInputs), spread only when present (absent ⇒ Σ 0).
                ...(overlay.medicareExtrasMonthly ? { medicareExtrasMonthly: overlay.medicareExtrasMonthly } : {}),
              }
            : {}),
      }
      let taxRes: ReturnType<typeof runTaxAwareDecumulation>
      let floorTaxRes: ReturnType<typeof runTaxAwareDecumulation> | undefined
      try {
        taxRes = runTaxAwareDecumulation(
          overlay.buckets,
          realStock,
          realBond,
          withdrawals,
          params.stockWeight,
          params.drawdownPolicy,
          overlayConfig,
          // U6/U7 band fan + U11 health readout: spread each sink ONLY when observing (absent ⇒
          // the byte-identical pre-sink taxInputs — presence-keyed, reduce-to-spine). The health
          // sink rides the FULL pass only (the user's intended spending).
          { ...taxInputs, ...(fullSink ? { balancesOut: fullSink } : {}), ...(healthSink ? { healthOut: healthSink } : {}) },
          params.drawdownOrder,
        )
        // P3·U9 — the floor pass: identical inputs, the essentials-only withdrawals. Runs
        // inside the SAME tight catch: a floor-arm failure is the same typed per-candidate
        // INFEASIBLE (the tier is part of the candidate, never a silently dropped surface).
        // taxAware collection below stays FULL-track only — the solver surfaces describe
        // the user's actual plan, not the floor counterfactual.
        if (withdrawalsFloor) {
          floorTaxRes = runTaxAwareDecumulation(
            overlay.buckets,
            realStock,
            realBond,
            withdrawalsFloor,
            params.stockWeight,
            params.drawdownPolicy,
            overlayConfig,
            { ...taxInputs, ...(floorSink ? { balancesOut: floorSink } : {}) },
            params.drawdownOrder,
          )
        }
      } catch (e) {
        // The typed per-candidate INFEASIBLE sentinel (M6 — the strategic review's P1). The
        // catch is deliberately TIGHT around the overlay call: validateParams has already
        // converted every known-bad INPUT into `indeterminate`, so a throw here is a
        // mid-computation failure (a solver non-convergence, a fail-loud backstop). The
        // CANDIDATE fails as a whole — never a silently dropped path (the banned silent
        // measurement: the dropped class would be exactly the aggressive near-cliff
        // candidates the optimizer's curse bites hardest), never an uncaught throw (which
        // would today collapse to a generic calm-error and tomorrow abort a P4 K-batch).
        // Deterministic in (params, seed): the same candidate fails at the same path.
        return {
          indeterminate: false,
          infeasible: true,
          reason: e instanceof Error ? e.message : String(e),
          pathIndex: p,
        }
      }
      res = taxRes
      floorRes = floorTaxRes
      // The per-path FINITENESS SEAM (M6 review — the consequence half of the two-layer
      // domain rule; the ENGINE_MAX_* gate is the cause half). The gate bounds every real
      // input, but float overflow remains constructible in the measure-zero stochastic
      // tail (~3.5σ every year for the whole horizon) and would re-open under any future
      // cap drift — and an Infinity here otherwise RESOLVES as a surviving terminal and
      // crosses the wire in surfaces that contract DND/009 finiteness. Throw-or-nothing
      // (never perturbs a value — byte-identity safe); routed to the typed sentinel (the
      // input is outside the engine's computable float domain for this seed).
      // P3·U9: the FLOOR pass is checked too — lower withdrawals mean HIGHER balances, so
      // the floor arm is strictly MORE overflow-prone than the full arm, not less.
      if (
        !Number.isFinite(taxRes.terminalReal) ||
        !Number.isFinite(taxRes.totalTaxPaidReal) ||
        !Number.isFinite(taxRes.finalTaxableBasis) ||
        !Number.isFinite(taxRes.finalBuckets.taxable) ||
        !Number.isFinite(taxRes.finalBuckets.pretax) ||
        !Number.isFinite(taxRes.finalBuckets.roth) ||
        !Number.isFinite(taxRes.finalBuckets.hsa ?? 0) ||
        (floorTaxRes !== undefined &&
          (!Number.isFinite(floorTaxRes.terminalReal) || !Number.isFinite(floorTaxRes.totalTaxPaidReal)))
      ) {
        return {
          indeterminate: false,
          infeasible: true,
          reason: 'non-finite portfolio value (float overflow) — the input magnitudes are outside the engine’s computable domain for this path',
          pathIndex: p,
        }
      }
      if (taxAware) {
        // The path's OWN horizon just ended (sampled: the couple's last death, capped at the
        // window) — the overlay's horizon-end figures are this path's death-year snapshot.
        taxAware.lifetimeTaxPaidReal[p] = taxRes.totalTaxPaidReal
        taxAware.terminalTaxableReal[p] = taxRes.finalBuckets.taxable
        taxAware.terminalPretaxReal[p] = taxRes.finalBuckets.pretax
        taxAware.terminalRothReal[p] = taxRes.finalBuckets.roth
        taxAware.terminalHsaReal[p] = taxRes.finalBuckets.hsa ?? 0
        taxAware.terminalTaxableBasisReal[p] = taxRes.finalTaxableBasis
        taxAware.lifetimeNetPremiumReal[p] = taxRes.totalNetPremiumReal
        taxAware.lifetimeMedicareCostReal[p] = taxRes.totalMedicareCostReal
      }
    } else {
      const initial: PortfolioState = {
        stock: params.stockWeight * params.initialPortfolio,
        bond: (1 - params.stockWeight) * params.initialPortfolio,
      }
      res = runDecumulation(initial, realStock, realBond, withdrawals, params.stockWeight, undefined, fullSink)
      // P3·U9 — the spine floor pass (the validation twin of the overlay's): same initial
      // state and returns, the essentials-only withdrawals. Pure + draw-free ⇒ CRN holds.
      if (withdrawalsFloor) {
        floorRes = runDecumulation(
          initial,
          realStock,
          realBond,
          withdrawalsFloor,
          params.stockWeight,
          undefined,
          floorSink,
        )
      }
      // The spine arm of the finiteness seam (see the overlay arm above): a pre-existing
      // gap the M6 review surfaced — the spine, too, could resolve an overflowed terminal
      // as a surviving Infinity before the ENGINE_MAX_* gate bounded the domain. The floor
      // arm is checked too (lower withdrawals ⇒ higher balances ⇒ more overflow-prone).
      if (!Number.isFinite(res.terminalReal) || (floorRes !== undefined && !Number.isFinite(floorRes.terminalReal))) {
        return {
          indeterminate: false,
          infeasible: true,
          reason: 'non-finite portfolio value (float overflow) — the input magnitudes are outside the engine’s computable domain for this path',
          pathIndex: p,
        }
      }
    }
    terminalValuesReal[p] = res.terminalReal
    depletionYears[p] = res.depletionYear
    if (res.depletionYear === NEVER_DEPLETED) survivors++
    if (floorDepletionYears && floorRes !== undefined) {
      floorDepletionYears[p] = floorRes.depletionYear
      if (floorRes.depletionYear === NEVER_DEPLETED) floorSurvivors++
    }

    // U6/U7 band fan fold: this path's household EXISTS for years [0, horizon) (horizon =
    // min(sampled last death, maxHorizon)). Each such year takes the recorded END-of-year value,
    // or $0 for an alive-but-broke year after depletion (the decumulation stops recording at
    // depletion; the household lives on, broke — the ruin floor that MUST stay in the cohort). A
    // both-dead year (t ≥ horizon) is absent (no household to hold a portfolio). The horizon ≤ 0
    // continue above never reaches here, so a couple already dead at year 0 joins no year's cohort.
    if (wantFan && fanValuesByYear && fanCohortByYear && pathBalances) {
      for (let t = 0; t < horizon; t++) {
        fanCohortByYear[t]!++
        fanValuesByYear[t]!.push(t < pathBalances.length ? pathBalances[t]! : 0)
      }
    }

    // P3·U11 health readout fold: the household EXISTS for years [0, horizon) (the fan's
    // cohort rule); the sink recorded only the FUNDED years (the overlay stops at depletion —
    // the Σ-accrual sibling rule), so a depleted-but-alive year counts in the cohort but joins
    // no cost median (a broke household pays nothing; a $0 premium in the median would read as
    // a phantom full subsidy — the optimistic direction). The over-cliff numerator/denominator
    // count only ACA-PRICED funded years (acaCliffState ≥ 0).
    if (healthAgg && healthSink) {
      for (let t = 0; t < horizon; t++) {
        healthAgg.cohort[t]!++
        if (t < healthSink.acaCliffState.length) {
          healthAgg.acaNetPremium[t]!.push(healthSink.acaNetPremium[t]!)
          healthAgg.medicareBase[t]!.push(healthSink.medicareBase[t]!)
          healthAgg.irmaaSurcharge[t]!.push(healthSink.irmaaSurcharge[t]!)
          healthAgg.medicareExtras[t]!.push(healthSink.medicareExtras[t]!)
          healthAgg.acaMagi[t]!.push(healthSink.acaMagi[t]!)
          healthAgg.irmaaMagi[t]!.push(healthSink.irmaaMagi[t]!)
          const cliffState = healthSink.acaCliffState[t]!
          if (cliffState >= 0) {
            healthAgg.acaPriced[t]!++
            if (cliffState === 1) healthAgg.overCliff[t]!++
          }
        }
      }
    }
  }

  // U7 e1: reduce the collected death offsets into the survivor-conditioned surface (null ⇒ no path
  // had a survivor phase ⇒ absent, presence-keyed). Reads state already computed, so byte-identical
  // to an opt-out run on the joint fields below.
  const survivorTrio =
    wantSurvivor && survivorDeathOffsets
      ? buildSurvivorConditioned(survivorDeathOffsets, depletionYears, maxHorizon)
      : null
  // U7 e1b: the income step-down rides alongside the fraction trio — computed ONLY when a survivor
  // surface exists (≥1 survivor phase ⇒ ≥1 counterfactual drop). The helper re-runs the PURE cash
  // function at each path's first-death year (zero draws), so byte-identity to a survivor-off run still
  // holds on every joint field below.
  const survivorConditioned: SurvivorConditioned | null =
    survivorTrio && survivorDeathOffsets
      ? {
          ...survivorTrio,
          incomeStepDownMonthlyReal: survivorIncomeStepDownMonthlyReal(
            survivorDeathOffsets,
            maxHorizon,
            params,
            offsets,
            higherClaimOffset,
          ),
        }
      : null

  return {
    indeterminate: false,
    distribution: {
      terminalValuesReal,
      depletionYears,
      survivalFraction: paths > 0 ? survivors / paths : 0,
      // The per-path solver surfaces ride iff the overlay ran (presence-keyed, M6).
      ...(taxAware ? { taxAware } : {}),
      // The per-year band fan rides iff the caller opted in (presence-keyed; observed from
      // state already computed, so byte-identical to a fan-off run on the fields above).
      ...(wantFan && fanValuesByYear && fanCohortByYear
        ? { bandFan: buildBandFan(fanValuesByYear, fanCohortByYear, params.initialPortfolio, paths) }
        : {}),
      // The per-year healthcare readout rides iff opted in AND the overlay priced healthcare
      // (P3·U11; presence-keyed; observed from the FULL pass, byte-identical to an opt-out run).
      ...(healthAgg ? { healthReadout: buildHealthReadout(healthAgg, paths) } : {}),
      // The survivor-conditioned surface rides iff opted in AND ≥1 survivor phase occurred (U7 e1).
      ...(survivorConditioned ? { survivorConditioned } : {}),
      // P3·U9 — the essentials-floor track rides iff the budget construct did (param-driven,
      // a genuine second pass; see the FloorTrack contract in model.ts).
      ...(floorDepletionYears
        ? {
            floor: {
              survivalFraction: paths > 0 ? floorSurvivors / paths : 0,
              depletionYears: floorDepletionYears,
            },
          }
        : {}),
    },
  }
}
