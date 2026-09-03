---
title: A named block on one arm of a gate makes the silent arm beside it a louder lie — sweep every arm, and never let a blanket "not a build" header stand in for a per-item reason
date: 2026-09-03
phase: Post-Act-4 (the gap to a friend betting real money) — the 2026-08-20 intake-walk findings
modules: [src/intake/AccountEntry.tsx, src/intake/AllocationEntry.tsx, src/intake/OtherIncomeEntry.tsx, src/intake/__tests__/accountEntry.test.tsx]
tags: [silent-dead-button, wcag-3.3.1, gate-arms, sibling-sweep, insight-054, insight-059, blanket-disposition, walk-findings, ultramode-review, test-enshrined-bug]
---

## Problem

The 2026-08-20 intake walk filed "a bad allocation is silently DISCARDED": type 60/50/10, tap "Add this
account", the account commits with NO blend and no message. It sat under a blanket header — *"ALL
BRIGGSY'S OR COUNCIL-SIZED, not builds"* — for two weeks. A verify→skeptic pass (the only one of twelve
with zero refutations) found the message string AND the block pattern already shipped; it was a build.
The fix landed the named block for the allocation arm. The unit-boundary review then found, three
lenses converging, that the arm ONE LINE ABOVE it — Add with no kind or no balance — was a bare
`return`: a live-looking primary button that did nothing and said nothing. The file's new header
advertised "Add blocks honestly" while that arm still lied. The sibling form (`OtherIncomeEntry`) had
codified the exact law in a comment, nine copy keys and a pinned test — "a blocked Save always names
WHAT is missing (WCAG 3.3.1), never a silent dead button" — a year of commits earlier.

## Root Cause

Two, one per lesson. (1) A multi-arm gate (`save()`: missing fact · invalid allocation · ceiling) was
repaired ONE arm at a time. Naming one arm does not make the gate honest; it makes the surviving mute
arm harder to see, because the function and its header now read as fixed. Insight 054's "enumerate
sibling SURFACES of a fixed failure class" was applied across files and never WITHIN the arms of one
function. (2) A blanket disposition header carried no per-item reason. Findings 1, 3, 4, 5 each named
why they were the owner's (a destructive door, his words, a framing fork); finding 2 was covered by the
header alone — and the header was deference, not a ruling. Under it, a defect with a shipped remedy
pattern was filed as someone else's decision.

## Fix

`41f9edee`: `buildAccount()` — ONE discriminated decision tree (the sibling's shape) whose every
`ok:false` arm carries the copy key of the fact it names; the allocation child reports `valid | blank |
invalid` on every change (insight 059 — preserve the distinction at the primitive), legs parse on the
`parsePercent` grammar (a bare `Number()` had valued "1e2" as 100 and refused "60%" with a message
about the SUM), and a legacy `simple` blend seeds through `blendOf` so the screen shows what an
untouched Add re-commits. The old test — which pinned the discard as the spec — rewritten into arms that
red under three planted mutants. The TODO header corrected in place with the reason it was wrong.

## Key Insight

**When you add a named block to one arm of a gate, read every other arm of the same gate in the same
pass — the fix you just made is the strongest possible camouflage for the arm you didn't.** A function
that now names two of three refusals reads as honest to the next reviewer, and its header will say so.
The check is mechanical: list the early returns in the handler; each one either names its fact or is
a lie waiting for a tap. And the sibling test: **a "not a build" header must carry a per-item reason.**
Read each item under such a header and ask what, specifically, the owner has to decide — if the
answer is "nothing, the pattern and the words already exist", the header is hiding a build. Zero
skeptic refutations on a finding is itself a signal: the code has already settled it.

## Also Applies To

- Every atomic-commit editor with a Save/Add button: `OtherIncomeEntry` (the precedent), the budget
  line editor, any future holdings editor — walk the `save()` early returns, not just the newest one.
- The ceiling arm of this same gate on a REPEAT tap (filed in the register, not built): a block that
  re-renders an identical alert produces no perceptible change.
- Any TODO/backlog list that carries a blanket disposition ("all his", "all parked", "all hygiene") —
  audit it item by item at the next re-rank; the 2026-08-14 list did carry per-item reasons and held.
