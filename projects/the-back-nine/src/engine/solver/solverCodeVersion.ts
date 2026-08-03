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
/*
 * VERSION 2 (2026-08-03) — the displayed baseline and `noChange` were re-anchored from the
 * CONVENTIONAL arm onto the HOUSEHOLD'S OWN entered strategy (`solve.ts` step (6), `select.ts`'s
 * `isNoChange`). The candidate RANKING did not move — the shrinkage prior and the incumbent
 * tie-break still anchor on the conventional arm — but `noChange` is PERSISTED on
 * `SavedRecommendationV3`, and a v1 record's `noChange` was computed against a different question
 * ("is the winner the conventional default?") than a v2 record's ("is the winner what you already
 * run?"). Re-presenting a v1 flag under v2 copy would say "you're already on one of the strongest
 * paths" on exactly the households this change exists to stop lying to. Bumped under this file's
 * own when-in-doubt rule: an over-cautious re-run is honest; a stale flag read as current is not.
 */
/*
 * VERSION 3 (2026-08-03) — the injected user baseline now carries the household's OWN ROTH
 * CONVERSION, not just their withdrawal order. v2 re-anchored the displayed arm onto the household's
 * entered strategy but `enumerateCandidates` had no field in which a conversion could be expressed,
 * so the arm was minted `conversion: null` and `applyCandidate` stripped the base's schedule — the
 * plan labelled "your plan today" was theirs with their conversion deleted. This one DOES move the
 * ranking (unlike v2): the roster gains a candidate the rail-anchored grid never contained, that
 * candidate can be crowned, `solverCandidateId` for the baseline arm is no longer always `:0`, and
 * `sameDecumulationPlan` — hence the persisted `noChange` — now compares a conversion that used to be
 * unconditionally absent. Every saved record therefore re-runs. Bumped on the enumerator clause of
 * the discipline above, not the when-in-doubt clause.
 */
export const SOLVER_CODE_VERSION = 3
