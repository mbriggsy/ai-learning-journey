---
title: A filed prescription does not inherit the trust of its diagnosis — audit the fix, not just the finding
date: 2026-07-27
phase: U17 — the S5 residue sweep (the pre-work before S6)
modules: [TODO.md, src/ui/styles/recommendation.css, src/ui/__tests__/recommendationSaveGesture.test.tsx, src/ui/devSeeds.ts, .claude/workflows/caddie.js]
tags: [process, queue, prescriptions, verification, mobile-first, mutation-testing, dev-seeds, insight-017, entry-premise, impossible-household, prescription-vs-negative, walk-refuter, retired-wordings, copyguard, plan-r-lines, x_t, the-pair, comparison-metric]
---

## Problem

The S5 residue was filed exactly as this repo's own law demands — "Unfinished Fixes must be
prescriptions, not diagnoses. Write the exact file, line, and change needed." Before working it, a
22-agent audit re-read every claim against source, each verdict adversarially refuted by a second
agent.

**Of 11 claims, ZERO were substantively false. SIX of eleven PRESCRIPTIONS were wrong.** Three were
wrong in ways that would have cost the session:

- **The date-route mutant's recipe would have gone RED on unmutated source.** It prescribed asserting
  `exposureForDraft` is never called on a date mount — but `IntakeApp.tsx:851` calls it
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

## Extended (2026-10-29, Phase B, b9-1) — a register entry's PREMISE is checked before its size is measured

The Tier 1 premium entry assumed a marketplace spouse beside a worker — a household the intake refuses outright
(`employerCoverageUnpriced`). The real shape, her share of the plan at work inside an ENTERED W, changed the remedy
from an engine step to words. A diagnosis inherits no more trust than its prescription does: before measuring an
entry's size, check the household it describes can exist in the code.

## Extended (2026-11-23, moved from TODO's distill list): check a prescription's formula against its own entry's NEGATIVE

A register entry can carry a prescription that breaks the binding NEGATIVE written beside it. Build 2's (B) prescribed
the working-year tax as tax(W + X) − tax(W), which charges $0 where Social Security alone is taxable; that broke the
entry's own NEGATIVE, and the plan's KTD1 added the T(0, ss) term before building. Before building a filed
prescription, run its formula through every case the entry's own NEGATIVE names.

## Extended (2026-11-23): a walk refuter's prescription is checked against the target's plan, the retired words and the comparison the defect was found with

Three build 2 walk fixes. Each diagnosis was right and each prescription broke something the refuter never read:
- **The target's own plan.** Walk 8's W8-R10 put dollars and a lean on the methodology row. Build 2's R14 holds that
  row static (no dollars, no direction word), because the row reads the live draft far above the seat (insight 035).
  The clash was resolved in the spec's "As built" and flagged for the walk (b9-4, U4). Before building a card's fix,
  grep the target row's or slot's plan for its R-lines and NEGATIVEs.
- **The retired words.** Walk 7's R1 refuter checked its sentence against every line on TM's screens and handed over
  "Your answer takes none of those shortfalls", a phrase council `wf_7fa86902-35c` had struck two walks earlier.
  copyGuard's retired-wordings sweep caught it only at build (b9-6, `d4c38295`, built instead in B's ruled clause). A
  refuter checks its fix against the page, not against the rulings that shaped the page. The chair's verify step owes a
  pass over the retired-wordings list before a refuter's words become a fix (`docs/landmines.md`, Copy and copyGuard).
- **The comparison the defect was found with.** Walk 6 measured the retype as this answer's credit against the honest
  answer's credit (the pair: $16,985 against $10,985, every year). The walk-7 round review's prescription silently
  switched to x_t (the credit minus the print at the quote), which matches the pair only in year 0, because the
  honest answer stays capped at its own year-0 print while pay rises. Four seats, three refuters and the plan's own
  research inherited it. Only council `wf_f74697d1-f2e`'s red team re-read the comparison: on A, $6,000 in 2033–2034
  where x_t said nothing; on TM, $11,000 where x_t said $762 (the typed-below rebuild spec's KD1).

**Rule:** before building a reviewer's or refuter's prescription, check it against three things it may not have read:
the target's plan (its R-lines and NEGATIVEs), the words a ruling retired, and the comparison the original
measurement made, written beside the new formula to confirm they are the same quantity.
