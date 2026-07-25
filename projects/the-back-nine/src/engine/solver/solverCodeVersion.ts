/**
 * SOLVER_CODE_VERSION — the solver's ranking-logic version stamp (U15 §S0.5; the runway
 * ratification's hard requirement).
 *
 * WHY IT EXISTS: a saved recommendation (U17) persists the WINNER + the retained runner-up
 * scored under a SPECIFIC version of the ranking code. When that recommendation is re-opened,
 * the solver code may have moved (a new objective statistic, a re-calibrated shrinkage, a
 * widened candidate grid) — and a ranking silently produced under an OLD code stamp, presented
 * as current advice, is the calm-but-wrong sin. This stamp rides the solve payload (S5) so U17
 * can detect "minted under an older solver" and RE-RUN rather than trust blind.
 *
 * BUMP DISCIPLINE (the whole point): increment this on ANY change that can move a candidate
 * ranking or the selection —
 *   - the objective statistic (objective.ts / evaluate.ts's Tier-2 read),
 *   - the shrinkage / deterministic-selection math (select.ts),
 *   - the deterministic tie-break (candidateTieBreak),
 *   - the candidate enumerator's grid or the RMD-first legality filter (candidates.ts),
 *   - the shared apply seam (applyCandidate),
 *   - a SCORED overlay's pricing (a change that moves a ranked figure).
 * A pure refactor that provably cannot move any ranked figure does NOT bump it. When in doubt,
 * BUMP — an over-cautious re-run is honest; a stale ranking read as current is not.
 *
 * U17 owns the persistence + the re-entry staleness compare; U15 only MINTS this and EMITS it
 * on the payload (S5). It is a monotone integer, never a float / sentinel (the shape test pins
 * that).
 *
 * U17's COMPARE IS `!==`, NOT `<` (shipped at U17·S3 — a dated correction of this file's own
 * earlier prediction, swept here so the comment cannot become a false description of live code:
 * insight 087). `store/savedRecommendation.ts` refuses to re-present a saved recommendation whose
 * `solverCodeVersion` differs from this constant IN EITHER DIRECTION. A record from an OLDER
 * build is the obvious case; a record from a NEWER build — a vault written by a later build and
 * opened by this one, which the backup-restore and multi-device paths make real — is EQUALLY
 * un-re-presentable, because THIS build's ranking code cannot reproduce that build's ranking. A
 * `<` would silently bless it. Fail closed both ways.
 */
export const SOLVER_CODE_VERSION = 1
