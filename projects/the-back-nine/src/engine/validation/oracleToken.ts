/**
 * The oracle-cleared token — U14's structural gate (plan contract #1; the Act-4 reconciliation
 * supersession items 4/5; council wf_d873be6e-5b2).
 *
 * U15's `solve`-as-recommendation entry point takes an {@link OracleClearedToken} as a REQUIRED
 * parameter, and the token is constructable ONLY by this module on a clean pass — so shipping a
 * recommendation without a passing validation harness is a TypeScript COMPILE error, never a
 * discipline failure (the Act-1 no-unkeyed-write mirror). The type-level gate proves ORDER (no
 * recommendation without a token), never predicate CORRECTNESS — which is why every clause below
 * is SOURCE-BOUND (the consumed-set derivation, the trend witness, the sentinel reads) and the
 * S6.4 planted-mutant battery proves each refusal actually fires.
 *
 * This module hosts the PER-RUN clauses (S0): the pinning clause over the run's own consumed
 * constants, the Medicare-trend block, the ACA freshness clause, and the ε-calibration clause.
 * The S6 assembly (`mintOracleToken`) composes them with the fixture-battery reports from the
 * S2–S5 runners (all shipped, U14 2026-07-18); the clauses are exported pure so each carries its own planted-fail tests
 * (insight 048 — never an honesty gate inlined where tests can't drive it).
 */
import type { SimulationParams } from '@shared/model'
import {
  isCalibrated,
  isPricedState,
  isUnsourced,
  medicareCostTrend,
  acaEnhancedSubsidyStatus,
  solverAcaFreshnessWindowDays,
  solverBFamilySize,
  solverConversionNearTieDemotionSeMultiple,
  solverMinBPaths,
  solverSelectionTieZ,
  type ConstantEntry,
  type PricedState,
} from '@engine/constants'
import { PART_B_PRICING_MODE } from '../taxOverlay'
import { consumedConstantEntries, type ConsumedConstant } from './consumedConstants'
import type { OracleReport } from './optimalityOracle'
import type { RankingStabilityReport } from './rankingStability'
import type { SolverRunFingerprint } from './solverRunFingerprint'

// ---- The withheld-reason enum (S6.3 — first-class, so U17's gate-red branch names the TRUE
//      reason, never blaming the law when a primary is merely un-pinned) ----------------------

export type WithheldReason =
  | { readonly kind: 'aca-unverified'; readonly ageDays: number }
  | { readonly kind: 'rec-relevant-primary-directional'; readonly name: string }
  | { readonly kind: 'epsilon-uncalibrated'; readonly name: string }
  | { readonly kind: 'medicare-trend-unsourced' }
  | { readonly kind: 'state-certification-pending'; readonly state: PricedState }

/** The pinning clause's full result: what blocks, and what ships-disclosed (the
 *  methodology-substrate directional levels the grade must surface — S4.5's input). */
export interface PinningEvaluation {
  readonly blocking: readonly WithheldReason[]
  /** Registry keys of consumed methodology-substrate entries still directional — the grade
   *  ships difference-keyed with these DISCLOSED (never laundered to pinned). */
  readonly disclosedDirectional: readonly string[]
}

// ---- Clause 1: the per-run-consumed pinning clause (S0.1/S0.2) ------------------------------

/** Derive a state code from a `state.*` registry key (`state.ncRateSchedule` → `'NC'`). */
function stateOfKey(key: string): PricedState | null {
  const m = /^state\.([a-z]{2})/.exec(key)
  if (m === null) return null
  const code = m[1]!.toUpperCase()
  return isPricedState(code) ? code : null
}

/**
 * Evaluate the pinning clause over THE CONSTANTS THE GRADED RUN ACTUALLY CONSUMES (the
 * per-run-consumed scoping — insights 080/081/088). Directional KIND splits the outcome:
 *  - `certification-pinnable` → BLOCKS this household's token, and only this one (a household in
 *    an already-pinned state on the same build is untouched). ⚠️ NO LIVE ENTRY since 2026-08-02:
 *    NC was the only one and S.L. 2026-41 pinned it, so this arm currently fires for nobody — it
 *    stays for the next directional state, not as a description of today;
 *  - `methodology-substrate` → collected into `disclosedDirectional`, never blocking;
 *  - an UNCLASSIFIED directional entry (shape-test-forbidden) fails CLOSED as blocking —
 *    the mint predicate never guesses a household's honesty posture optimistically.
 */
export function evaluatePinningClause(params: SimulationParams): PinningEvaluation {
  return classifyConsumedConstants(consumedConstantEntries(params))
}

/** The pure classification seam behind {@link evaluatePinningClause} (insight 048 — tests
 *  drive synthetic entries through it; the binding above supplies the real derivation). */
export function classifyConsumedConstants(
  consumed: readonly ConsumedConstant[],
): PinningEvaluation {
  const blocking: WithheldReason[] = []
  const disclosed: string[] = []
  for (const { key, entry } of consumed) {
    if (!entry.directionalUntilPinned) continue
    if (entry.directionalKind === 'methodology-substrate') {
      disclosed.push(key)
      continue
    }
    // certification-pinnable — or UNCLASSIFIED, which fails CLOSED (blocking): the shape test
    // forbids an unclassified directional entry from existing, but the predicate never guesses
    // a household's honesty posture optimistically if one somehow does.
    const state = stateOfKey(key)
    if (state !== null) {
      if (!blocking.some((r) => r.kind === 'state-certification-pending' && r.state === state)) {
        blocking.push({ kind: 'state-certification-pending', state })
      }
      continue
    }
    blocking.push({ kind: 'rec-relevant-primary-directional', name: key })
  }
  return { blocking, disclosedDirectional: disclosed }
}

// ---- Clause 2: the Medicare-cost-trend block (S0.4 — HARD solver-blocking) ------------------

/**
 * The conversion ranking is withheld while Part B is priced without a sourced trend: real-flat
 * under-penalizes late-year IRMAA cliff-crossing, the exact payoff channel of conversion
 * candidates. Fires iff the candidate set contains ANY nonzero-conversion candidate; clears only
 * when the trend constant is SOURCED **and** the Part-B pricing genuinely consumes it (both
 * halves — insight 074). Disclose-and-ship is FORBIDDEN (a disclosure fixes a number, never a
 * mis-ranking). The pure `_evaluate` form exists so tests can drive the counterfactuals (a
 * fake-sourced entry with an unmoved pricing mode must STILL block — the lying-mirror arm).
 */
export function evaluateMedicareTrendClause(candidateSetHasConversions: boolean): WithheldReason | null {
  return _evaluateMedicareTrendClause(candidateSetHasConversions, medicareCostTrend, PART_B_PRICING_MODE)
}

/** The pure seam behind {@link evaluateMedicareTrendClause} (insight 048). */
export function _evaluateMedicareTrendClause(
  candidateSetHasConversions: boolean,
  trendEntry: ConstantEntry,
  partBPricingMode: 'real-flat' | 'trended',
): WithheldReason | null {
  if (!candidateSetHasConversions) return null
  if (isUnsourced(trendEntry)) return { kind: 'medicare-trend-unsourced' }
  if (partBPricingMode !== 'trended') return { kind: 'medicare-trend-unsourced' }
  return null
}

// ---- Clause 3: the ACA legislative freshness clause -----------------------------------------

/** Pure civil-date → epoch-day (days since 1970-01-01), Howard Hinnant's days_from_civil —
 *  the engine reads no clock and the `Date` global is lint-banned; the CALLER injects today. */
export function epochDayFromIsoDate(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (m === null) throw new Error(`[oracleToken] not an ISO date: ${iso}`)
  let y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`[oracleToken] out-of-range date: ${iso}`)
  y -= mo <= 2 ? 1 : 0
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy = Math.floor((153 * (mo + (mo > 2 ? -3 : 9)) + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

/** How many days old the ACA legislative check is, against the injected clock. THE one age
 *  derivation — every surface that speaks about this record's freshness reads it here rather
 *  than re-typing `today − verifiedOn` (and, worse, its own copy of the window). */
export function acaCheckAgeDays(todayEpochDay: number): number {
  if (!Number.isFinite(todayEpochDay) || !Number.isInteger(todayEpochDay)) {
    throw new Error('[oracleToken] todayEpochDay must be an integer epoch-day (injected, finite)')
  }
  return todayEpochDay - epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn)
}

/**
 * Is the ACA legislative check past its re-verify window? THE one calendar, now read by THREE
 * enforcement layers that must never disagree about the same fact: the `verify:aca` CI gate
 * (build time), this token clause (run time, below), and the Healthcare sheet's dated status
 * line (`healthSheetChrome.composeHealthSheet`) — which past this boundary stops speaking as
 * though the check were current. Before the split, the sheet had no calendar at all and stayed
 * calm while the recommendation beside it refused; the window is deliberately NOT re-typed.
 *
 * (The CI gate compares float-ms and so flips ~one day earlier than this integer-epoch-day
 * compare. That ordering is the safe one — the build goes red before the app changes what it
 * says — and it is the reason this is a boolean here, not a shared instant.)
 */
export function acaCheckOverdue(todayEpochDay: number): boolean {
  return acaCheckAgeDays(todayEpochDay) > solverAcaFreshnessWindowDays.value
}

/**
 * The ACA legislative status can flip the whole pre-65 model (and therefore which strategy
 * wins), so the token enforces the SAME freshness calendar as the verify:aca CI gate. Fires
 * only for runs that actually price the ACA fixed point (the hazard creator's own domain —
 * insight 027: an enrolled-premium stream is what triggers ACA pricing), with `todayEpochDay`
 * INJECTED by the caller (engine purity — no clock).
 */
export function evaluateAcaFreshnessClause(
  params: SimulationParams,
  todayEpochDay: number,
): WithheldReason | null {
  // The clock is validated BEFORE the domain gate on purpose: a malformed injected today is a
  // caller defect and must fail loud even for a household this clause would not fire for.
  const ageDays = acaCheckAgeDays(todayEpochDay)
  if (params.overlay?.enrolledPremium === undefined) return null
  if (!acaCheckOverdue(todayEpochDay)) return null
  return { kind: 'aca-unverified', ageDays }
}

// ---- Clause 4: the ε / calibration sentinel clause (burned/062; insights 008/010/039) -------

/**
 * Every calibration quantity the harness leans on must be CALIBRATED (finite AND in-domain —
 * finiteness first, so a NaN can never pass a `> ε` compare downstream). An out-of-range
 * sentinel is a typed refusal, never a throw and never a plausible default.
 */
export function evaluateEpsilonClause(): readonly WithheldReason[] {
  return _evaluateEpsilonClause([
    ['solver.solverSelectionTieZ', solverSelectionTieZ.value],
    ['solver.solverMinBPaths', solverMinBPaths.value],
    ['solver.solverBFamilySize', solverBFamilySize.value],
    ['solver.solverConversionNearTieDemotionSeMultiple', solverConversionNearTieDemotionSeMultiple.value],
    // The freshness window rides the SAME finiteness-first discipline (U14 fold): it feeds
    // the one `>` compare in the ACA clause, and `ageDays > NaN` is false — a non-finite
    // window would otherwise fail OPEN (optimistic), the only clause constant left unguarded.
    ['solver.solverAcaFreshnessWindowDays', solverAcaFreshnessWindowDays.value],
  ])
}

/** The pure seam behind {@link evaluateEpsilonClause} (insight 048 — the planted-sentinel and
 *  planted-NaN arms drive this form; the binding above reads the live constants). */
export function _evaluateEpsilonClause(
  required: ReadonlyArray<readonly [string, number]>,
): readonly WithheldReason[] {
  const out: WithheldReason[] = []
  for (const [name, value] of required) {
    if (!isCalibrated(value)) out.push({ kind: 'epsilon-uncalibrated', name })
  }
  return out
}

// ---- Shared helper: does a candidate set contain any real conversion? -----------------------

/** True iff any candidate carries a nonzero conversion amount (the S0.4 trigger's domain). */
export function candidateSetHasConversions(
  conversionAmounts: ReadonlyArray<number | undefined>,
): boolean {
  return conversionAmounts.some((a) => a !== undefined && Number.isFinite(a) && a > 0)
}

// ---- S6: the token assembly -----------------------------------------------------------------

declare const ORACLE_CLEARED: unique symbol

/**
 * The opaque oracle-cleared token (plan contract #1). U15's `solve`-as-recommendation entry
 * point takes this as a REQUIRED parameter — a recommendation path without a token is a
 * compile error. Constructable ONLY by {@link mintOracleToken} on a clean pass (external
 * construction requires a deliberate double-cast — the compile-level discipline bar; the
 * S6.4 mutant battery + the gates-stage planted mutants prove the refusals actually fire).
 */
export interface OracleClearedToken {
  readonly [ORACLE_CLEARED]: true
  /** What this token was minted over — carried for U17's staleness re-derivation. */
  readonly mintedOver: {
    readonly oracleCaseIds: readonly string[]
    readonly stabilityCandidateCount: number
    readonly todayEpochDay: number
    readonly disclosedDirectional: readonly string[]
    /** THE RUN FINGERPRINT (U15 §S0.2) — COPIED verbatim from the stability report this token
     *  composes (the single fingerprint authority, never a re-computation here), so the token's
     *  identity is EXACTLY the roster ranking-stability was proven over. `solve()` (S5) refuses a
     *  token whose fingerprint differs from the run it is asked to bless — the household binding
     *  the un-fingerprinted `mintedOver` lacked (the honored honesty-hawk veto). */
    readonly fingerprint: SolverRunFingerprint
  }
}

export type MintOutcome =
  | { readonly token: OracleClearedToken; readonly disclosedDirectional: readonly string[] }
  | { readonly withheld: readonly WithheldReason[]; readonly disclosedDirectional: readonly string[] }

/**
 * Mint the oracle-cleared token for ONE graded household (S6.2's withheld-until list):
 *
 *  - the seven oracle cases (i)–(v) + the NC/PA state companions of (i) passed on their declared preconditions → the branded
 *    {@link OracleReport} is a REQUIRED parameter (mintable only by `runOptimalityOracle`
 *    on a clean roster — a planted wrong-best yields failures, never a report, so no token);
 *  - K-candidate ranking stability → the branded {@link RankingStabilityReport} likewise;
 *  - grade calibration (incl. the conversion-near-tie demotion case) + the held-out defense
 *    → the ε clause: every calibration constant calibrated (sentinel absent), enforced live;
 *  - the per-run-consumed pinning clause for THIS household (a household whose state carries a
 *    directional rate entry blocks while its siblings mint on the same build — no priced state
 *    is directional since the 2026-08-02 NC pin, so this leg is seam-driven; methodology
 *    substrate ships DISCLOSED, never laundered);
 *  - the Medicare-trend block for any candidate set containing conversions;
 *  - the ACA legislative freshness window (injected today — the engine reads no clock).
 *
 * The clause walk re-derives the consumed set AT CALL TIME (the derivation is live, not a
 * snapshot — a constant flipping directional between two mints changes the second answer).
 */
export function mintOracleToken(inputs: {
  readonly params: SimulationParams
  readonly candidateConversionAmounts: ReadonlyArray<number | undefined>
  readonly todayEpochDay: number
  readonly oracleReport: OracleReport
  readonly stabilityReport: RankingStabilityReport
  /** TEST-SEAM ONLY (insight 048, U14 fold): overrides the ε clause's live constant list so
   *  the MINT's epsilon leg can be driven red — without it, deleting the leg stays green.
   *  The live binding never passes this. */
  readonly _epsilonRequired?: ReadonlyArray<readonly [string, number]>
  /** TEST-SEAM ONLY (insight 048, the trend sourcing unit): overrides the trend clause's live
   *  (entry, mode) pair so the MINT's trend leg can be driven red now that the live clause is
   *  CLEAR (sourced + consumed) — without it, deleting the trend push below would stay green on
   *  every live test (the exact `_epsilonRequired` precedent). The live binding never passes this. */
  readonly _trendOverride?: { readonly entry: ConstantEntry; readonly mode: 'real-flat' | 'trended' }
  /** TEST-SEAM ONLY (insight 048, the NC pin of 2026-08-02): overrides the pinning clause's live
   *  result so the MINT's state-blocking leg can be driven red now that the priced roster is
   *  FULLY PINNED. S.L. 2026-41 retired `ncRateSchedule` — the last directional entry — so NO
   *  live household blocks here any more, and without this seam deleting the
   *  `...pinning.blocking` push below would stay green on every live test (the exact
   *  `_trendOverride` precedent, minted for the same reason when the trend clause cleared).
   *  The live binding never passes this. */
  readonly _pinningOverride?: PinningEvaluation
}): MintOutcome {
  const { params, candidateConversionAmounts, todayEpochDay, oracleReport, stabilityReport } = inputs
  if (oracleReport.caseIds.length === 0) {
    // A zero-case oracle report proves nothing (runOptimalityOracle refuses to build one —
    // reaching here requires a deliberate cast, and the mint still fails loud, never green).
    throw new Error('[oracleToken] an oracle report over ZERO cases cannot clear a token — a vacuous gate is theater')
  }
  const pinning = inputs._pinningOverride ?? evaluatePinningClause(params)
  const withheld: WithheldReason[] = [...pinning.blocking]
  const trend =
    inputs._trendOverride === undefined
      ? evaluateMedicareTrendClause(candidateSetHasConversions(candidateConversionAmounts))
      : _evaluateMedicareTrendClause(
          candidateSetHasConversions(candidateConversionAmounts),
          inputs._trendOverride.entry,
          inputs._trendOverride.mode,
        )
  if (trend !== null) withheld.push(trend)
  const aca = evaluateAcaFreshnessClause(params, todayEpochDay)
  if (aca !== null) withheld.push(aca)
  withheld.push(...(inputs._epsilonRequired === undefined ? evaluateEpsilonClause() : _evaluateEpsilonClause(inputs._epsilonRequired)))
  if (withheld.length > 0) {
    return { withheld, disclosedDirectional: pinning.disclosedDirectional }
  }
  const token = {
    mintedOver: {
      oracleCaseIds: oracleReport.caseIds,
      stabilityCandidateCount: stabilityReport.candidateCount,
      todayEpochDay,
      disclosedDirectional: pinning.disclosedDirectional,
      // COPIED from the stability report (§S0.2) — the single fingerprint authority. The token's
      // identity is therefore EXACTLY the roster ranking-stability was proven over; in a real S5
      // solve `params`, the stability `base`, and the recompute all derive from the ONE household.
      fingerprint: stabilityReport.fingerprint,
    },
  } as unknown as OracleClearedToken
  return { token, disclosedDirectional: pinning.disclosedDirectional }
}

export type { ConsumedConstant }
