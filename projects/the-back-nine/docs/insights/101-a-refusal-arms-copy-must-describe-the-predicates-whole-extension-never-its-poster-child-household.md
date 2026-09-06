---
title: A refusal arm's copy must describe the predicate's whole extension — never its poster-child household
date: 2026-07-23
phase: The median-advantage + typed-refusal steer increment (review wf_6f89fe6f-35a)
modules: [src/ui/copy.ts, src/intake/solveDispatch.ts, src/engine/solver/candidates.ts]
tags: [copy-contract, refusal-arm, predicate-extension, calm-but-wrong, no-pretax, superset]
---

## Problem

The same copy defect shipped TWICE in one day, by two different authors, on one
refusal arm. The original `recommendBucketsNote` claimed "your savings are entered
as one lump sum" — describing a household the intake **cannot produce** (every
`EnteredAccount` carries a mandatory `kind`; a lump-sum entry does not exist).
The same-day replacement claimed "this plan has none entered" — true for the
poster-child household (zero pre-tax dollars) but **false for a reachable
sibling**: a household with a $25k traditional IRA sitting below every
rail-anchored conversion amount (`candidates.ts:323` rejects over-headroom
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
