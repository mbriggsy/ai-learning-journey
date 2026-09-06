---
title: A slot that silently returns a WORDED BOUND leaks rhetoric into every composing template — hedge prefixes stack and valence inverts at the sentinel
date: 2026-07-18
phase: Act 3 (oracle lane — the rule-36 of/in odds-dialect sweep, council wf_67c72e89-e77)
modules: [ui/copy, ui/dateOdds, ui/oddsLadderChrome, ui/healthSheetChrome, ui/verdictSentence]
tags: [copy-slots, hedge, valence, ceiling-clamp, composition, calm-but-wrong, honesty-clamp]
---

## Problem

`slots.xOfTen(n)` is the pinned count formatter — but at `n >= 10` it silently returns the
honesty-clamp SENTINEL `XOFTEN_CEILING` ("better than 9 in 10"), a fully-worded rhetorical
phrase, not a number. Every template that composed around the slot assumed it was composing
around a bare count, and two distinct defect shapes grew at the sentinel:

1. **Hedge stacking.** Templates that prefix a hedge — `withOdds` ("about ${x} odds"),
   `ladderMarkAria` ("${when}: about ${x}${tail}") — rendered "about better than 9 in 10
   odds" at the ceiling: two hedges on one figure, because "better than" IS a hedge (a bound)
   and the template's "about" was written for the count arm. Reachable live on the date hero,
   the AnswerStrip DateLine, the split floor line, and four ladder ceiling rungs.

2. **Valence inversion.** The sentinel's wording carries GOOD-NEWS valence ("better than" =
   things are even rosier than shown). `acaCostCliff` fed it an ADVERSE frequency — the share
   of futures where "the year's discount disappears entirely" — so a ≥0.95 over-cliff
   household read its worst fact wrapped in reassurance: "In about better than 9 in 10
   futures … the discount disappears entirely." The calm-but-wrong shape, on the exact
   deep-over-cliff household the sheet exists to warn (the hawk's veto).

## Root Cause

The clamp comment called the `n >= 10` branch "a DEFENSIVE backstop" — but a backstop that
returns a different KIND of value (worded rhetoric vs. a numeral phrase) is not defensive; it
is a silent register switch every downstream composition inherits. The bound's hedge-ness and
its valence are properties of the SENTENCE it lands in, which the slot cannot see.

## Fix (the pattern)

- **Composition sites branch on the STATE, never on the rendered string** (a string sniff
  orphans itself the moment a wording moves): `dateOddsText` branches on the count to
  `withOddsAtCeiling()` (bound stands alone, no "about"); `ladderMarkAria` takes the mark's
  own state-derived `atCeiling` flag (curveMarks already carried it).
- **Valence-opposite consumers get a valence-matched constant**: `XOFTEN_CEILING_ADVERSE`
  ("more than 9 in 10") via `adverseOddsPhrase` — same proportion form, same never-"10 of
  10", zero good-news framing. The count stays UNCLAMPED at the producer.
- **The ceiling arm is fixture-proven through the real chrome** (worstOfTen ≥ 10 driving both
  templates, mutant red→reverted) — the sentinel path had zero test coverage before this
  (fixtures stopped at count 6; insight 048's untested-gate trap at the copy layer).

## Key Insight

1. When a formatter can return a WORDED phrase in place of a numeral phrase, audit every
   composing template at the sentinel: does a prefix hedge stack? does the sentinel's valence
   match the sentence's fact? The tell is a template written for the common arm with the
   sentinel arm unreviewed and untested.
2. A bound ("better than / more than") IS a hedge — it never wears a second one.
3. A shared rhetorical constant may only serve facts of ONE valence; an adverse-frequency
   consumer needs its own constant, not the good-news twin.
