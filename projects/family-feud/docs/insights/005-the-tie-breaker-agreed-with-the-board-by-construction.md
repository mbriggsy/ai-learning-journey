---
title: The VORP tie-breaker was arithmetically incapable of changing a decision
date: 2026-08-07
phase: machinery-rebuild
modules: [draft-kit/players_data.json, docs/ranking-methodology.md, draft-kit/draft_engine.py]
tags: [vorp, vbd, rankings, circularity, order-statistics, methodology, doctrine]
---

## Problem

`docs/ranking-methodology.md` states the rule the engine's VBD chip exists to serve:

> *"VBD is the tie-breaker, never the boss. When two players sit in the same tier and the badges
> don't decide it, the VORP chip decides it."*

Rebuilding the VORP pipeline meant reproducing it first. Reproduction succeeded — mean absolute
difference **0.1 points across 150 players** (Gibbs 268.4 → 268.4, Chase 242.7 → 242.8). But
checking the result surfaced something the numbers had been hiding.

## Root Cause

**`vbdRank` is strictly monotone in `pr` within every position — 0 order violations across all 150
skill players** (QB 23, RB 48, WR 59, TE 20).

That is not a coincidence, it is the method. The curve is a **rank → points lookup**, and the
board's own positional rank `pr` is its *input*. So within a position, `vbdDelta` mechanically
restates the board rank it was derived from. Tiers on this board are per-position, so *"same tier"*
means *"same position"* — and the rule is invoked precisely where VBD carries **no independent
information**. It agrees with the board by construction, every time.

A second problem rides along. The curve is an **order statistic on realized outcomes** — the player
who finishes RB1 is whoever's variance broke best — so mapping it onto preseason rank inflates the
elite tier. Year-over-year churn, 2022-2025:

```
mean top-5 retention   RB 1.3/5   WR 1.7/5   QB 1.7/5   TE 2.7/5
reigning RB1 finished  RB26  ·  RB68  ·  RB3   the following year
```

"RB1 = 385.9 points" therefore describes **no identifiable player**, and it inflates the
elite-to-replacement *gap* — which is exactly the number that says how hard to pay up early.

## Fix

Doctrine, not code. What survives is everything **cross-positional**, because that is where the
baselines genuinely differ: `RB41 = 117.5` vs `WR47 = 144.7` is the arithmetic behind the rounds
3-5 RB-over-WR tie-breaker, and QB-in-6-9 and K/DEF-last hold. What retires is using VORP to
separate two players *inside a tier*.

Per-player projections break the circularity — a projected player can genuinely outperform his
board slot — and Sleeper ships a free (undocumented) 2026 projections endpoint that also carries
ADP. That is v2 of the pipeline; v1 keeps the curve, which reproduces the board exactly.

## Key Insight

**A derived metric cannot disagree with its own input.** Before trusting a number to arbitrate,
check whether it is a function of the thing it is arbitrating — the test is one line
(is rank A monotone in rank B?) and it either exonerates the metric or retires the rule.

Note the methodology doc *already* carried an honest caveat that the Thunderdome scorekeeper shared
VBD's worldview. That caveat understated it: VBD shares the **board's** worldview.

The happy ending is that the measurement vindicated the older doctrine — *"tiers, not ranks, are the
draft-day decision unit."* Layer 4 was right; the chip layered on top was claiming precision it
never had.

## Also Applies To

- Any ranking blend where one layer's output feeds a later layer that then "checks" it.
- The Thunderdome sim: its scorekeeper runs on the same projections as the bot it grades, so the
  53.8% edge is an upper bound, not a floor.
- Reading a regenerated board after the rebuild — re-run the monotonicity check; if projections
  landed correctly, violations should now be **non-zero**. Zero would mean the rebuild silently
  fell back to the curve.
