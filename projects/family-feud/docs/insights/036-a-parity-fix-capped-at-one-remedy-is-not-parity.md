---
title: A parity fix capped at one remedy was not parity, and three instruments lied while I checked it
date: 2026-10-23
phase: in-season
modules: [scripts/trade_eval.py, tests/test_trade_eval.py, tests/trade_eval_net.py]
tags: [trade-eval, counterfactual, parity, strawman, insight-035, mutation-testing, bytecode-cache, line-endings, false-positive, calm-but-wrong]
---

## Problem

The whole-file review of `trade_eval.py` (9 opus lenses, 18 verifiers) found insight 035's defect
inside 035's own fix. "Both worlds get one optional swap" let a trade that freed a spot make a fill
AND a swap while today's full roster got one swap (frozen night: Kaeperni added Goff and McConkey
after, McConkey only before). A Mini dead-for-dead 2-for-1 priced +40; the truth is 0.

## Root Cause

**The fix made the procedure identical, not the reachable outcomes.** A cap of one swap binds the
full roster, not the one with an open spot. Same shape again: the over-cap drop was judged with the
dropped man gone, then scored with him streamable, and only the over-cap world used that rule.

## Fix

Swaps repeat until none gains; every drop is judged in the pool it is committed to; a tied add goes
to the player the market values most, a tied drop to the least. Moving to repeated swaps raised drops
at processing time, which exposed a waiver assumption that had been harmless at low volume: the other
side streamed a man the week he was cut, though this league's waivers run Wednesdays. Step by step on
the frozen night (us three sites / Sleeper):

| change | us | Kaeperni |
|---|---|---|
| shipped 10-22 | −36.85 / −47.83 | +43.72 / +53.88 |
| swaps repeat | −32.74 / −45.76 | +39.34 / +50.18 |
| tied add → most valued; IR back needs 2 of 3 sites; 1-week ratio carries r | −32.83 / −45.76 | +38.93 / +50.18 |
| a drop at processing waits for waivers (unverified, printed) | **−36.25 / −45.53** | **+43.19 / +50.43** |

Landing near −36.9 again is two opposite moves, not a confirmation.

## Key Insight

**Parity is about outcomes each world can reach, not about running the same steps.** For every cap,
limit or tie-break in a shared procedure, ask: *can it bind in one world and not the other?* A limit
of one binds whoever has no slack. And **when a fix changes how often something happens, re-check
every assumption whose effect scales with it** — the waiver rule was worth ~0 at one swap and 3.4
points at thirteen. Their side's number also moved up to 4 points on coin-flip tie-breaks: an
indifferent choice for one side is never indifferent for the other.

**Three instruments lied during the check.** `grep -c $'\r$'` in Git Bash inverted CRLF counts, so my
pre-commit "every file is CRLF" was false (they are LF; count bytes in Python). The mutant harness
reloaded `trade_eval` but kept `trade_eval_net`, so tests patched modules nobody ran: baseline 29/36
RED, every "kill" void. Then same-size mutants in one second shared a `.pyc` stamp and M44 ran M15's
code — [`009`](009-the-test-suite-was-red-against-source-that-no-longer-existed.md), re-hit because
I wrote the harness without reading the corpus. **A mutant harness runs its baseline first and
refuses unless clean**; one file per mutant, `sys.dont_write_bytecode`, reload every module that
patches, no network. Final: 37/37 on a clean baseline; last night's 38/38 is unverified.

## Also Applies To

- Any A/B simulation with move budgets (claims, streams, swaps) or a shared cap, threshold or tie-break.
- Any harness that swaps a module while another module still holds the old one.
