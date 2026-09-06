/**
 * THE SOLVER-RUN FINGERPRINT (U15 §S0 — the honored honesty-hawk veto's first binding).
 *
 * THE FALSE BELIEF IT KILLS: an oracle-cleared token attests "THIS household's recommendation is
 * validated" while proving only that SOME household passed. `mintedOver` (oracleToken.ts) bound
 * the run's params + the candidates' CONVERSION AMOUNTS only, and `RankingStabilityReport`
 * (rankingStability.ts) carried counts/seeds — neither carried an identity that a SECOND solve
 * entry (U15's `solve()`, the second consumer being born) could refuse when handed a token minted
 * over a DIFFERENT (household, candidate set, goal). U14's single in-line call site made that
 * harmless; the fingerprint closes it before the second site exists.
 *
 * WHAT IT IS: a pure, deterministic identity string over EVERY ranking-affecting input of a solve
 * run. Two runs share a fingerprint IFF every such input matches; `solve()` (S5) recomputes it
 * from the run it is asked to bless and REFUSES a token/report whose fingerprint differs.
 *
 * THE INPUT SET — a FAIL-CLOSED SUPERSET of the spec's enumerated list. §S0.1 enumerates
 * per-person per-bucket balances, the Tier-2 goal, `heirBracket`, the budget/spending inputs,
 * horizon + dates, people (ages/filing), the overlay feature flags, and the full ordered
 * candidate-id list. But the RANKING also genuinely depends on the market moments, `stockWeight`,
 * `paths`, `survivorSpendingRatio`, and every overlay STREAM VALUE (an enrolled-premium change
 * re-prices the ACA cliff → re-ranks) — none of which that compact list names. Under-inclusion is
 * the DANGEROUS direction (a stale token blesses a run that differs in an omitted field — the
 * cardinal calm-but-wrong sin); over-inclusion only refuses MORE (fail-closed). So the fingerprint
 * serializes the WHOLE built `params` + the WHOLE candidate roster + the ranking objective + the RUN
 * PAIR (`seedA`, `tieTolerance`), and the §S0.3 moved-witness battery red-arms each ENUMERATED class
 * explicitly on top of that. `seedA` decides the shared draws (and therefore the winner near a tie);
 * `tieTolerance` decides survival-equivalence (and therefore which candidates enter the Tier-2 goal
 * contest, and therefore the winner) — both are genuinely ranking-affecting, and both were omitted from
 * the v1 (params, candidates, ranking) triple, so a token minted at one (seedA, tieTolerance) could
 * bless a solve at another (the same under-inclusion — calm-but-wrong — the whole clause guards).
 *
 * NOT `consumedConstantEntries` (§S0.1, red-team-falsified): that walk is HOUSEHOLD-BLIND
 * (consumedConstants.ts derives from overlay FLAGS alone — two different households in one state
 * fingerprint identically, and the goal is not a constant at all).
 *
 * PURE (engine-purity lint): no clock, no entropy, no environment — a deterministic function of
 * its four arguments (the run pair joined the v1 triple in the §S0.2 v2 widening, 2026-07-19).
 */
import type { SimulationParams } from '@shared/model'
import { solverCandidateId, type CandidateStrategy } from '../solver/candidates'
import type { OracleGoal } from './evaluate'

/**
 * The ranking objective the fingerprint pins. NOT on `SimulationParams` on purpose: the engine is
 * GOAL-AGNOSTIC (`simulate` produces a distribution; the goal selects WHICH statistic ranks — the
 * seam evaluate.ts:29 names). It is threaded explicitly so a token minted for `leave-more` can
 * never bless a `pay-less-tax` solve (a different objective ⇒ a different winner over the same
 * candidates). `heirBracket` rides here because it too is ranking-affecting (it sets the IRD
 * discount every leave-more bequest is scored at) and is absent from the engine params.
 */
export interface SolverRunRanking {
  readonly goal: OracleGoal
  /** The first-order heir bracket the leave-more bequest is scored at (leave-more only;
   *  pay-less-tax carries none). */
  readonly heirBracket?: number
}

/** An opaque per-run identity string. Compared with `===`; never parsed. A schema tag is embedded
 *  so a future change to the fingerprint FORMAT can never let an old persisted value spuriously
 *  match a new recompute (U17 persists these). */
export type SolverRunFingerprint = string

/** The fingerprint FORMAT version — bumped if the serialized SHAPE below changes (distinct from
 *  SOLVER_CODE_VERSION, which versions the ranking CODE; this versions the identity ENCODING). */
const FINGERPRINT_SCHEMA = 'solver-run-fp/v2'

/**
 * A deterministic, key-order-invariant, non-finite-SAFE canonical serialization.
 *  - Object keys are SORTED, so a params builder's insertion order never perturbs identity.
 *  - A non-finite number is encoded as a DISTINCT token — `JSON.stringify` coerces Infinity/NaN
 *    to `null` (DND 009), which would collapse two DIFFERENT runs onto one fingerprint (a false
 *    "same household"); `bracketFillCeilings` legitimately carries `+Infinity`, so it must be
 *    preserved DISTINCTLY, never nulled.
 *  - `undefined` object values are OMITTED (absent ≡ present-undefined for the optional fields).
 *  - Every primitive carries a TYPE PREFIX so a number, a numeric-looking string, and a boolean
 *    can never share an encoding at the same position.
 */
function canon(v: unknown): string {
  if (v === null) return 'N'
  if (v === undefined) return 'U'
  switch (typeof v) {
    case 'number':
      return Number.isFinite(v) ? `n${v}` : `x${String(v)}` // x = the non-finite token (never null)
    case 'boolean':
      return v ? 'bT' : 'bF'
    case 'string':
      return `s${JSON.stringify(v)}`
    case 'object': {
      if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
      const o = v as Record<string, unknown>
      const keys = Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
      return `{${keys.map((k) => `${JSON.stringify(k)}=${canon(o[k])}`).join(',')}}`
    }
    default:
      // functions / symbols / bigint never appear in a params or candidate structure.
      throw new Error(
        `[solverRunFingerprint] non-serializable value of type ${typeof v} — a run identity must be plain data`,
      )
  }
}

/**
 * Compute the fingerprint of a solve run: its built `params`, the enumerated candidate roster, and
 * the ranking objective. The candidate roster is captured by BOTH its ordered id list (§S0.1's
 * literal requirement) AND each candidate's full ranking-relevant fields (`policy`, `provenance`,
 * `conversion`, `drawdownOrder`) — the full fields make the identity complete even where the id
 * string is lossy (two different custom drawdown orders share `baseline:custom:0`; the
 * `drawdownOrder` field distinguishes them). `anchoredRail` is deliberately EXCLUDED: it is grid
 * metadata the engine never reads, so it is not ranking-affecting.
 */
export function solverRunFingerprint(
  params: SimulationParams,
  candidates: readonly CandidateStrategy[],
  ranking: SolverRunRanking,
  run: { readonly seedA: number; readonly tieTolerance: number },
): SolverRunFingerprint {
  return canon({
    fp: FINGERPRINT_SCHEMA,
    goal: ranking.goal,
    heirBracket: ranking.heirBracket,
    // The RUN PAIR (§S0.2 v2): seedA fixes the shared draws (⇒ the winner near a tie); tieTolerance
    // fixes survival-equivalence (⇒ which candidates reach the Tier-2 contest ⇒ the winner). Both
    // ranking-affecting, both absent from the v1 triple — a token minted at one pair must never bless
    // a solve at another (the under-inclusion the whole clause fails closed against).
    seedA: run.seedA,
    tieTolerance: run.tieTolerance,
    // The WHOLE built params — every field is run-defining (see the header on fail-closed scope).
    params,
    // The full ordered roster: the id list + the ranking-relevant fields behind each id.
    candidates: candidates.map((c) => ({
      id: solverCandidateId(c),
      policy: c.policy,
      provenance: c.provenance,
      conversion: c.conversion,
      drawdownOrder: c.drawdownOrder,
    })),
  })
}
