---
title: A refusal arm's copy must describe the predicate's whole extension — never its poster-child household
date: 2026-07-23
phase: The median-advantage + typed-refusal steer increment (review wf_6f89fe6f-35a)
modules: [src/ui/copy.ts, src/intake/solveDispatch.ts, src/engine/solver/candidates.ts]
tags: [copy-contract, refusal-arm, predicate-extension, calm-but-wrong, no-pretax, superset, stopgap-help, household-shapes, ruled-words, render-sites, conditional-sentence, judging-side, time-axis, dated-figure, when-you-answered, decider-input, narrowest-witness]
---

## Problem

The same copy defect shipped TWICE in one day, by two different authors, on one
refusal arm. The original `recommendBucketsNote` claimed "your savings are entered
as one lump sum" — describing a household the intake **cannot produce** (every
`EnteredAccount` carries a mandatory `kind`; a lump-sum entry does not exist).
The same-day replacement claimed "this plan has none entered" — true for the
poster-child household (zero pre-tax dollars) but **false for a reachable
sibling**: a household with a $25k traditional IRA sitting below every
rail-anchored conversion amount (`candidates.ts:643` rejects over-headroom
amounts) yields a conversion-free roster and lands the SAME `'no-pretax'` arm.
That household read a confident claim about its own entries that was simply wrong
— the calm-but-wrong cardinal sin, inside a note that had just been rewritten to
fix exactly that sin.

## Root Cause

Both drafts were authored from a **modal example** of the arm ("who typically
lands here?") instead of from the arm's **predicate** ("what exactly routes
here?"). The predicate was `no anchored conversion candidate in the roster` —
whose extension includes zero-pretax households, degenerate no-account households,
AND entered-but-under-every-rail households. Copy written from the example is true
on the example and unfalsified until someone enumerates the extension; the review
refuters found the third member in one trace. A comment in the builder that
*equated* the predicate with the example ("no pre-tax dollars at all") laundered
the error forward — the next author trusts the comment, not the enumeration.

## Fix

`recommendNoPretaxNote` now states the predicate's shared truth — "doesn't have
enough of them entered for one order to beat another" — true on every member
(zero is not enough; $25k under every rail is not enough). The builder comments
name the widened extension explicitly. Both non-poster arms got REAL-builder
witnesses (probed before pinning): the degenerate $0-accounts draft and the
small-IRA draft each assert `buildSolveRequest(...) === 'no-pretax'`, so the
reworded sentence's justification is bitten, not narrated.

## Key Insight

When a structured refusal reason gets a rendered sentence, derive the sentence
from the refusal's **predicate** and enumerate the predicate's extension before
writing: every guard clause that returns the reason is a household the sentence
must be true FOR. If the sentence needs an example to read humanely, pick
phrasing whose truth is monotone across the extension ("not enough" covers zero
and small alike; "none entered" does not). And when a code comment claims the
predicate equals its example, that comment is itself a copy-contract defect —
correct it in the same commit, or it mints the next false sentence.

## Extended (2026-10-30, Phase B's Caddie card) — a STOPGAP help sentence is read by every household shape too

The same enumerate-the-extension law holds for help text written as a stopgap. Phase B's ruling 1 told the W step to
count "health premiums before anyone's Medicare starts" — right for its poster child (a retired spouse on the
worker's plan), and it told `dateshort` (one spouse already on Medicare, one working) to count no premium at all. And
"leave out Medicare premiums" turned a register gap (no sentence covers it) into an instruction that hides the cost.
Walk a help sentence against each seed's household shape before shipping it (b9-3's Caddie card).

## Extended (2026-11-23, moved from TODO's distill list): a ruled word change can be false on a route its ruling never saw

A word Briggsy rules is ruled for the screens he saw. b9-1 (2026-10-16) traced every render site of a ruled string
through a workflow before the first edit, and the trace found two routes where the new words were false: the aged
plan ("starting now") and the wide gap ("add none"). The same law as this insight's: copy describes every household
its predicate reaches, so trace each render site of a ruled string before changing it, and bring a route that
falsifies it back to him with the measured case.

## Extended (2026-11-23): the law holds on the JUDGING side, across TIME, and for a decider's INPUT

Three cases from U11's walks on the working-year left-over question, each the extension law applied somewhere new:

- **Judge a conditional sentence over the extension it states, never at the one point on screen (b9-3, walk 2).** "Any
  working year your pay doesn't cover" is empty for `datesavedrisen` at $90,000, so the walk-2 chair first called the
  counterweight vacuous. The refuter caught that "a check at $90,000 or more" spans every figure at or above the
  spending, which includes the figures where it bites. The same reading kept the non-saved "can look better" honest:
  across that whole range it only adds cost. A reviewer who judges a conditional at the screen's one value makes this
  insight's authoring error in reverse.
- **A fix that dates a stored figure must hold for every household and every LATER answer (walk 2; walk 5's round).**
  "The $16,985 left over at $84,000" was false for the later couple, whose left over at $84,000 is now $26,985. The
  same wording came back in walk 5's round and was false after a later "Yes" at another figure. "When you answered"
  is true in every case. Date a stored figure by when it was answered, never by the figure held today: the extension
  runs across time as well as across households.
- **A decider keyed on one answer leaves every other answer reading the old promise (the walk-6 round review).** R3's
  sheet half (`865e7426`) keyed B's "no until" words on `workingYearCheckAtQuote`, which reads a "saved" answer only.
  An unanswered, spent or not-sure B kept "Until then, no money left over is added", though on B no honest update
  brings the money back under any answer. Three of four review lenses found it; `360bea64` keyed the words on the
  predicate's real input (year 0 at the quote). The sentence's extension is every answer the household can hold, so
  the decider must read the quantity that sets the truth, never the narrowest witness that happens to carry it.
