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
/*
 * VERSION 4 (2026-09-25) — a SCORED overlay's pricing moved, twice in two days: the §86 Social
 * Security thresholds deflate per sim year (`be0e1e76`, 2026-09-24 — which should have bumped this
 * and did not; this bump covers it), and on 2026-09-25 the NC standard deduction deflates per sim
 * year, the OBBBA senior bonus deflates AND phases out per person (IRS Schedule 1-A), and the HSA
 * catch-up erodes on the runway. Every one moves the tax the ranked arms pay, so a v3 record's
 * ranking was scored under pricing this build no longer runs. Bumped on the SCORED-overlay clause.
 *
 * VERSION 5 (2026-09-26) — the top IRMAA tier's line is INCLUSIVE by statute ("at least $500,000",
 * 42 U.S.C. §1395r(i)(3)(C)(i)(III); 150 % joint): a MAGI exactly ON $750,000 MFJ / $500,000 single
 * now bills the 85 % tier (the SCORED-overlay clause — healthOverlay.irmaaTierApplies), and the
 * candidate grid's top IRMAA anchor moved one whole dollar under that line (the enumerator clause —
 * candidates.ts via magiLandscape.nextIrmaaStepLine). A v4 record's top-step arm was scored at a
 * bill the law does not charge.
 *
 * VERSION 6 (2026-09-26) — the IRMAA PRICE FRAME: every line is compared AS the law compares it,
 * nominal MAGI(Y − 2) against nominal line(Y), in the MAGI year's real dollars
 * (healthOverlay.irmaaScheduleAsCompared — §1395r(i)(4)(B)(i) + (i)(5)). From bill year 2028 every line
 * sits about one year of CPI above the pinned 2026 figure, so a SCORED overlay's pricing moved (fewer
 * surcharges billed) and the enumerator's IRMAA anchors moved up (the bracket-fill and solver rails).
 */
export const SOLVER_CODE_VERSION = 6
