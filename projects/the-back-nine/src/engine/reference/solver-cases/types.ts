/**
 * The committed solver-oracle fixture schema (U14 S2 — `docs/plans/features/
 * act4-u14-validation-harness-build-spec.md` §S2).
 *
 * Each fixture is a HAND-DERIVED known-best world (DND-012): a deterministic engine world
 * (zero-vol / fixed-horizon) whose candidate ranking is derivable by closed-form arithmetic
 * spelled out in the fixture's own comments, with the expected quantities RE-DERIVED at test
 * time from the canonical constants via `expected()` (insight 032 — the constants table is
 * the committed source artifact; the derivation runs on every suite run, never a stale
 * literal) using arithmetic that is ALGEBRAICALLY equal but OPERATIONALLY distinct from the
 * engine's (closed forms + band-walks vs the fixed-point iteration + allocation machinery —
 * the historical.test blended-multiplier precedent).
 *
 * PRECONDITIONS ARE A CONTRACT, NOT DOCUMENTATION (insight 023 — a panel that confirms
 * arithmetic on a wrong rule-selection crowns the wrong known-best): every fixture declares
 * the rule-boundaries its world deliberately sits on one side of, and the harness REFUSES to
 * apply a fixture's known-best outside them — most load-bearingly the STATE dimension
 * (supersession item 1): a federal-only known-best never grades a priced-state run. The NC
 * companion proves WHY that refusal is load-bearing: NC's flat state rate stacked on the
 * federal 22% band flips the optimal conversion anchor from the 22%-top down to the 12%-top —
 * the same candidate set, a DIFFERENT known-best.
 */
import type { SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '../../solver/candidates'
import type { OracleGoal } from '../../validation/evaluate'

/** The state precondition dimension (supersession item 1). `absent` = the disclosed-out
 *  federal-only world; a named state = the fixture's dollars INCLUDE that state's tax. */
export type FixtureState = 'absent' | 'NC' | 'PA' | 'FL'

/** The rule-boundary axes a fixture pins (each declared ON means the world exercises the
 *  mechanism; OFF means the world provably sits outside it — and the derivation depends on
 *  that). The harness cross-checks the cheap ones against the built params. */
export interface FixturePreconditions {
  readonly state: FixtureState
  /** Zero-vol / fixed-horizon: every path is byte-identical and the ledger is deterministic. */
  readonly deterministic: true
  /** Survivor machinery exercised? (fixed-horizon mode never samples a death.) */
  readonly survivorTransition: boolean
  /** Social Security priced? (pia 0 ⇒ every SS term provably 0 — taxCore.ts:156 gate.) */
  readonly socialSecurity: boolean
  /** Capital-gains realization possible? (basis === value ⇒ realizedGain provably 0.) */
  readonly capitalGains: boolean
  /** ACA / IRMAA cliffs priced? */
  readonly healthcareCliffs: boolean
  /** RMD forced? (all ages below every RMD start age within the horizon ⇒ rmd provably 0.) */
  readonly rmd: boolean
  /** The declared first-order heir bracket for the leave-more bequest (a FIXTURE parameter,
   *  never a minted constants default — burned/062 has no sourced figure to offer here). */
  readonly heirBracket?: number
  /** The named rule-boundaries this world deliberately sits on one side of (insight 023). */
  readonly ruleBoundaries: readonly string[]
}

/** One committed oracle fixture. */
export interface SolverCaseFixture {
  readonly id: string
  readonly title: string
  readonly goal: OracleGoal
  readonly preconditions: FixturePreconditions
  /** The CRN seed (any integer — the zero-vol worlds are draw-invariant BY DERIVATION, and
   *  the suite proves it by running a second seed on one case). */
  readonly seed: number
  /** The deterministic engine world. */
  readonly buildBase: () => SimulationParams
  /** The candidate set (built through the SHARED enumerator where the world's rails are
   *  exact; explicit where the anchor skeleton cannot see gross-dependent income — each
   *  fixture documents which). */
  readonly buildCandidates: () => readonly CandidateStrategy[]
  /** The hand-derived expected ranking, as candidate ids (see {@link solverCandidateId}),
   *  BEST FIRST — the full vector, never only the crown (insight 021). */
  readonly expectedRankingIds: readonly string[]
  /** Re-derive the fixture's expected quantities from the canonical constants (test-time,
   *  insight 032). Keys are fixture-defined; the test asserts them against the engine. */
  readonly expected: () => Readonly<Record<string, number>>
  /** The selection tie-tolerance the ranking runs at (deterministic worlds pass 0). */
  readonly tieTolerance: number
}

/** The candidate identity the expected rankings are written in — provenance-widened + injective
 *  (U15 §S0.4). Its canonical home is now `solver/candidates.ts` (with the candidate it names);
 *  re-exported here so every U14 import path (`{@link SolverCaseFixture.expectedRankingIds}`,
 *  the oracle, the fixtures) is unbroken. */
export { solverCandidateId } from '../../solver/candidates'
