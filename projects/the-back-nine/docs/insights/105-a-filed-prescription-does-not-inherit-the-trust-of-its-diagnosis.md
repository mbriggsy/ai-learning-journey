---
title: A filed prescription does not inherit the trust of its diagnosis — audit the fix, not just the finding
date: 2026-07-27
phase: U17 — the S5 residue sweep (the pre-work before S6)
modules: [TODO.md, src/ui/styles/recommendation.css, src/ui/__tests__/recommendationSaveGesture.test.tsx, src/ui/devSeeds.ts, .claude/workflows/caddie.js]
tags: [process, queue, prescriptions, verification, mobile-first, mutation-testing, dev-seeds, insight-017]
---

## Problem

The S5 residue was filed exactly as this repo's own law demands — "Unfinished Fixes must be
prescriptions, not diagnoses. Write the exact file, line, and change needed." Before working it, a
22-agent audit re-read every claim against source, each verdict adversarially refuted by a second
agent.

**Of 11 claims, ZERO were substantively false. SIX of eleven PRESCRIPTIONS were wrong.** Three were
wrong in ways that would have cost the session:

- **The date-route mutant's recipe would have gone RED on unmutated source.** It prescribed asserting
  `exposureForDraft` is never called on a date mount — but `IntakeApp.tsx:589` calls it
  unconditionally inside the hydrate effect, before the phase the arm names.
- **The phone-CLS fix named a tier that does not exist.** It prescribed "a `@media` bump on
  `.rec-save-slot` at the phone tier" in a **mobile-first** codebase whose only breakpoint is
  `@media (min-width: 68rem)`. The base rule *was* the phone; the repair had to run downward.
- **The Q7a rider's fix re-creates the absurdity its own producer exists to prevent.** Deriving the
  delta from ROUNDED endpoints prints "a difference of about $0" over a real $18,000 delta, and the
  prescribed test (`rendered_B − rendered_A === rendered_delta`) passes it vacuously, 0 === 0.

The same shape appeared in source comments. `devSeeds.ts` stated flatly that the aged surface's
arrived hero "is NOT coherently mintable" — true of the `datesplit` base it was written against
(lifestyle crown 10), false as the general claim it reads as. Measured through the real date search,
`dip` crowns lifestyle at **5**, so the plant the queue had filed as a shape problem is constructible
at aging depth 6.

## Root Cause

A correct diagnosis and its prescription are written in the same breath, by the same author, at the
moment of discovery — so the prescription arrives wearing the diagnosis's credibility. But they are
different claims with different evidence: the diagnosis is a report of something OBSERVED (a mutant
survived, a box grew 18.13px), while the prescription is a PREDICTION about code the author did not
run. Nothing tests it at filing time. It then sits in the queue accumulating the authority of age,
and the next reader — reasonably — treats the whole entry as one verified unit.

Two failure modes recur, and both are invisible to a re-read of the diagnosis:

1. **The prescription names a mechanism that does not exist at the destination** (a phone tier in a
   mobile-first sheet; an `it(` at a line holding an `expect`).
2. **The prescription is scoped to the instance it was discovered on, but is phrased universally**
   ("NOT coherently mintable" — for one base seed, stated for all).

## Fix

The sweep verified each prescription against source *before* executing it, then executed the
corrected version:

- The two surviving mutants got arms that were **planted, proven RED, and restored with Edit** —
  `git diff --stat src/ui/IntakeApp.tsx` empty afterward. The date-route arm carries its control in
  the same `it(` one variable apart, because the memo has five conjuncts and only one is under test.
- The phone reservation inverted to mobile-first (10rem base / 8rem at 68rem), **re-measured across
  the sub-laptop range first**: 390×844 is the governing width at 146.13px, and 320×844 is *shorter*
  (145.25px) — narrower is not monotonically taller. The phone then JOINED the fit reservation loop,
  so the fix is guarded rather than merely made.
- Three mis-cited pointers were corrected **with the strike recorded in place**, so the next reader
  knows the pointer moved instead of re-deriving the old one.
- The false source comment was corrected with the measured crown table beside it.

## Key Insight

**A prescription earns the same source-verification a diagnosis gets, and never inherits trust from
the correct diagnosis sitting above it.** "Prescriptions, not diagnoses" raises the bar on what gets
written down; it does not make what was written down true. Before executing a filed fix, re-read it
against source as if a stranger wrote it — specifically checking that every mechanism it names still
exists, and that any claim phrased universally was not discovered on a single instance.

The cheap tell for the second mode: **if a note says something is impossible, ask "impossible for
WHICH fixture?"** An impossibility claim scoped to one seed and phrased for all is how a
constructible artifact gets filed as a design problem for months.

## Also Applies To

Any long-lived work queue, any `⚑ FILED` note, any in-source comment that tells a future builder what
to do. It is the same class as insight 018 (grep the plan BODIES, headers lie) and insight 081 (a
re-derivation forks at the producer's first early return) — a statement that was true where it was
written, believed somewhere it is not. It also sharpens insight 086: when splitting or reordering,
re-point every consumer *and* re-check every note that described the old shape. And it is
insight 017 at build altitude — 017 found the same law inside a doc-review fold (even confirmed
prescriptions need source-verification before folding), this one inside a filed queue entry.
