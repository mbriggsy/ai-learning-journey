---
title: A doc cleanup re-authored "from the ledger" proves coherence, not currency — it cannot catch facts that drifted in the code
date: 2026-06-19
phase: P2 (Act 2 — Where You Stand)
modules: [README.md, docs/roadmap.md, scripts/verify-doc-stats.ts]
tags: [docs, drift, test-count, single-source, verify-gate, coherence-vs-currency, cold-read, summary-surface, spec-drift, reachability-claim, filing-list, verify-against-code, comment-paraphrase, record-folder, inherited-conclusion, direction-bullet, rosy-twin, two-producers, plan-case-list, tier-ladder, gloomy-in-every-case]
---

## Problem

Weeks after an extensive doc restructure (M2–M6: "re-author present-tense from the ledger"), a 5-agent cold-read of the *fresh* root README found four accuracy bugs immediately:
1. **Stale stat** — "942 tests across 44 files" vs a live 962/45 (and the same number stale in `roadmap.md`).
2. **Summary conflation** — "25 tax/health constants verified against IRS/CMS/HHS/eCFR/**SEC**": SEC has **0** citations in `src/engine/constants/` (SEC EDGAR backs the fund-blend in `tickerBlend.ts`, a *separate* dataset); **SSA** is the heaviest non-IRS source and was *omitted*. The count `25` matched no boundary in code.
3. **Present-tense overclaim** — "mandatory encrypted export **is** the survivor's backstop": the crypto primitives are built+tested, but no UI surface invokes them and the first-Save ceremony (U8) is not-started.
4. **Wrong pointer** — "the confidence-band viz is next" when the roadmap says R40 is the next build.

## Root Cause

A doc refactor authored *from the requirements ledger* audits **narrative coherence** (voice, structure, story), never **empirical currency**. It runs no suite and greps no `src/`, so three failure modes pass straight through it: (a) facts that **drift after** the rewrite (tests added, next-build reordered); (b) **summary-surface conflation**, where a compressed front-door fuses two independently-true facts into a false composite (SEC EDGAR is real — for the fund blend, not these constants); (c) **present-tense-from-the-ledger**, which renders unbuilt *intent* as shipped *capability*. The stat also lived on two surfaces with no guard — so they diverged, violating the engine's own "a number is never re-typed" constants discipline, from which the docs were silently exempt.

## Fix

Corrected all four against source. Shipped `scripts/verify-doc-stats.ts` (`pnpm verify:doc-stats`): a drift gate that extracts each tracked surface's "NNN tests across NN files" claim and asserts it matches the **live suite**. Truth source is vitest's **own collection** (`vitest list`), not a glob — a `src/**` glob *undercounts* (misses `scripts/__tests__/**`), so a glob guard would falsely flag the correct count as stale. A missing claim **fails** (a reworded claim that silently stops being checked is the vacuous-guard trap).

## Key Insight

**A documentation cleanup and a cold-read-against-source audit different axes — coherence vs. currency — and a clean pass on one is no evidence for the other.** Re-authoring docs from a design ledger makes them well-told and self-consistent; it does nothing to make them *true against the running code today*. Any fact a doc shares with the code (counts, what's-built, agency attribution, what's-next) needs a drift gate or it WILL stale — and the most compressed surface (the root README) is where independently-true facts fuse into composite falsehoods. Mirrors externally-derived fixtures (DND 012): a value the engine computes against its own formula proves typing, not correctness; a doc authored from the ledger proves coherence, not correctness-against-reality.

## Also Applies To

- Any duplicated stat/figure across surfaces (README ↔ roadmap ↔ CLAUDE.md) — single-source it or gate it.
- "How it works" prose written in present tense while features are still planned — signpost intent vs. shipped (the mermaid solver/REC nodes, the thesis beats).
- Mechanical-step / fixture hypotheses obsoleted by later work ([[041-a-plans-mechanical-step-is-a-hypothesis-obsoleted-by-a-later-decision-in-the-same-effort]]); verifying a gate's target when writing it ([[033-verify-a-gates-target-when-writing-the-gate-not-when-clearing-it]]).

## Extended (2026-10-31) — drafting from a spec inherits the spec's stale sentences

U11 (b9-8) drafted every doc for the pay check from its spec. Six careful lanes copied R1's "Medicare excepted" and
KTD22's reachability claim into four docs, and both were already false: KTD1 and KTD22's "only dev plants and engine
tests reach a W-absent run" went false the day Phase B ruling 17 made `buildDateInput` carry W only once it is
answered, so the walk's provisional strip runs W-absent before the W step — three lanes found that from the code;
the spec was never re-read. An adversarial verify against the CODE returned 70 findings, 35 of them "wrong", and 0
were rejected on re-check ([[017]]'s extension has the fix pass's own 11). The plan's "file these new entries" list
was a hypothesis too: one of seven was already filed and a second half covered; the scout read entry BODIES, not
headings, before any lane filed.

**Rules:** a docs unit budgets draft → verify against the code → fix → verify the fix. A spec sentence about
reachability ("only X reaches Y") is a claim about every caller: when a carriage rule changes, grep the plan for
"only … reach". A plan's filing list is checked against the register's bodies before anything is filed.

## Extended (2026-11-23): the same inheritance runs through code comments and record folders

**A code comment that paraphrases the plan inherits the plan's mechanism, right or wrong.** Build 2's KTD4 said "a
half-cent tie can print a cent above the float", and the sentence went into `taxOverlay.ts`, though the rounding leaf
it cites rounds a tie down. Seven Phase A review lenses caught it in the code (b9-1). Fixing the comment alone would
have left the plan to re-seed it into U12, so the plan was fixed too. This is [[087]]'s comment channel, with [[146]]'s
grain.

**A docs unit drafted from the record folder inherits the record's conclusions, wrong ones included.** The
frames-outside build's U5 (b9-8) copied b9-7's cause for SHOWCASE's lower doors (DPR; the real cause is `.result`
centering a short frame, [[123]]'s extension on a gap named by the wrong axis) and widened U1's four-frame read-only reading into "every frame
it lowers is already outside or routed". The review's docs lens and three verifiers caught both, plus the unit's own
"worst tall frame" claim (the widest plants read 857.9 and 854.0 px, not 841.5).

**The rule, all three channels:** a spec, a plan's KTD and a record folder are each a draft of the truth. A doc or a
comment written from one is verified against the code and the measurements before it ships, and a wrong sentence is
fixed at its source as well as at the copy.

## Extended (2026-11-27): a direction bullet written from the plan's case list misses the case only the code holds

Gap 4's U11 (b9-17, `969ab33a`) filed the line half's accepted leans as one register entry, *Gap 4's line half leans
harsh in three rare places its plan accepted*, with the Direction "Gloomy in every case". Each case came from the plan
(`docs/plans/features/spending-line-repeat-and-rate-build-spec.md`: KTD4, KTD5, Scope Boundaries), and the plan called
each one harsh. KTD5's case: on a survivor's working year, the part of W held whole is S (never more than W), read
from what the budget charges at k = 0. A sticky repeat that is on in year 0 sits in S at its full amount while W counts it at amount ÷ N, so
more of W is held whole: harsh.

The line half's review (round 1, `4cd23dc8`; its docs lens read U11's docs against the code) found the twin. W's
quote counts a repeat at amount ÷ N whenever it starts inside its first cycle, years 0 to N − 1 (`workingYearQuote`,
`src/intake/workingYearQuote.ts`). S reads only year 0 (`typedStickyAtYearZero`, `src/engine/simulate.ts`). A repeat
that starts in year 2 is in W and missing from S, so on a survivor's working year its share is scaled down by the
survivor ratio instead of held whole: rosy. The direction set the tier. The register's tier ladder sends any entry with
a rosy case to Tier 0 (step 3); "gloomy in every case" had filed it at Tier 1 (step 6). The review moved it to Tier 0,
retitled *Gap 4's line half: four rare places where a repeat or a rate is counted off from what the household said*,
with the Direction "Either".

**The rule:** a direction claim about a rule that two producers read (here intake's W quote and the engine's held
share) is checked against each producer's own list of what it counts, not against the case the plan named. The plan
named the case both producers count. The rosy one was a line one producer counts and the other doesn't. Before writing
"in every case", list what each side counts and walk the lines only one side holds: there the gap can run the other
way. This is the same channel as the extensions above. A doc written from the plan inherits what the plan left out,
not only what it got wrong.
