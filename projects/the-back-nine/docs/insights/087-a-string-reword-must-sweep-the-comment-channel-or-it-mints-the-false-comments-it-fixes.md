---
title: A string reword must sweep the COMMENT channel by meaning — or it mints the exact false-comment class it set out to fix
date: 2026-07-17
phase: Act 3 (oracle lane — the O14+O12+O9 copy sweep)
modules: [ui, intake]
tags: [copy-sweep, comments, prop-docs, drift, false-comment, review, same-meaning-sweep]
---

## Problem

The O14 sweep's own council found a comment at `copy.ts:114` claiming a drift-pin
("a copyGuard test pins the shared endpoints") that did not exist — a false comment that
would have bitten the very next twin reword. The sweep fixed that class: the pin was built
first, the comment corrected. Then the post-sweep ultramode review (9 lenses, 2 adversaries,
per-finding refuters) returned SIX findings — and all six were fresh instances of the same
shape, minted BY the sweep itself: two consumer prop-docs still quoting the retired
"isn't counted" words as "today's words verbatim," and a prop-doc still asserting the
same-`<p>` symmetry the F6(ii) date-route split had just removed.

## Root Cause

The sweep treated rendered strings as first-class (every catalog string, test pin, fit
literal, and doc surface was swept by meaning — insight 078's law) but treated comments as
incidental. Comments that QUOTE copy, DESCRIBE render structure, or CLAIM a guard exists are
duplicated state with no compiler, no test, and no lint binding them to the thing they
describe. A reword updates the single source of truth and every *executable* consumer goes
green — while the comment channel silently keeps the old claim. In a repo whose comments are
load-bearing law (dated rulings, invariant descriptions, "verbatim" claims), a stale comment
is not noise: it is a false claim a future maintainer will act on (the `copy.ts:114` case
nearly did exactly that).

## Fix

Folded the three roots (both prop-docs re-quoted to "isn't priced yet"; the FuckOffDate
appendix prop-doc rewritten to name the deliberate spine/date asymmetry) — and the sweep
discipline gains a step: after any reword, grep the OLD wording (and the old structural
claim) across `src/**` INCLUDING comments, not just executable code. The pre-commit sweep
tonight did grep the old strings but only audited hits in *rendered/test* positions; comment
hits were skimmed as "history."

## Key Insight

A comment that quotes a string, claims a guard, or describes a render shape is a COPY of
that fact, and every copy drifts unless swept. When a sweep rewords meaning, its blast
radius includes the comment channel — grep the old words and audit every hit, treating a
comment hit exactly like a code hit (update it or explicitly mark it as historical record).
The tell that you've missed this: your review's findings all share one shape — comments
asserting the world you just changed.

## Also Applies To

- Any invariant comment beside a composition seam (`lead + affirm + tail`, shared
  prefix/suffix claims) when the seam's parts move.
- Prop-docs on components whose render structure changes in a sibling file (the prop-doc
  lives in the interface, the render in the body — they drift independently).
- Doc surfaces that paraphrase copy (README prose quoted the old "isn't counted" and was
  caught only because doc-stats forced the file open).
- The 044 family ("a comment is a claim, not a fact") — this is its sweep-time corollary:
  rewords MANUFACTURE 044-class comments unless the comment channel is swept.
