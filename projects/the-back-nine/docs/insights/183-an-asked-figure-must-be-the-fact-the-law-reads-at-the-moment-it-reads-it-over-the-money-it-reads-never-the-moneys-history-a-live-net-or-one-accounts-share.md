---
title: An asked figure must be the fact the law reads, at the moment it reads it, over the money it reads — gap 3's questions asked the money's history (and would have refused the rollover IRA the build exists for), netted a live figure against a gross one ($12,000 required read $4,000), and took one account's balance where the law reads all the money ($91 required on $198,000)
date: 2026-11-27
phase: The RightCapital mandate, gap 3 (the inherited IRA): the plan's review (b9-9) and the whole-file review's rounds 1 to 3 (b9-10, b9-11)
modules: [src/intake/inheritedIraQuestions.ts, src/intake/inheritedIra.ts, src/engine/inheritedRmd.ts, src/ui/copy.ts]
tags: [question-design, law-reads, moment, base, as-of-date, net-vs-gross, double-netting, refusal-question, rollover, merged-account, custodian-figure, cross-check, inherited-ira, 1.408-8, calm-but-wrong, d7]
---

## Problem

Three questions in the inherited IRA's drawer each asked something true that the law does not read.

- **The money's history.** The plan refused an inherited IRA whose money "came from" the owner's job plan. An IRA the
  owner rolled over from a 401(k) during their life is the owner's IRA at the death (Treas. Reg. 1.408-8(b)(1)(i): its
  required beginning date goes by age alone), and it is served. The wording would have refused the very account the
  build exists for. The plan's adversarial review found it (P1-1).
- **A live figure beside a gross one.** The drawer asked how much of the owner's death-year amount was "still to come
  out" (net, as of today) and how much was "taken out so far" (gross), and the engine took the second off the first.
  A $12,000 requirement with $4,000 taken read $4,000, and a make-up taken this year shrank the year's own minimum. Four
  of eight reviewers found it on their own; every test passed, because every fixture had nothing taken.
- **One account's balance where the law reads all the money.** Two IRAs inherited from one owner, one moved into the
  other in February: the household honestly gave the receiving account's own $2,000 December 31 balance, and the year
  required $91 where the law's base is $198,000 (1.408-8(b)(2) and (d)). The custodian's figure, also for that account
  alone, passed the cross-check.

## Root Cause

Each question was written from the household's view of the money (where it came from, what is left today, what this
account held) rather than from the rule's own input. The law reads one fact (where the money sat at the death), at one
moment (December 31 of a named year), over one base (all the money that belongs in the calculation, wherever it was
held). A figure asked on another moment or base is a different number that agrees with the right one only in the
simple case, and the simple case is what every fixture held: nothing taken, nothing merged, no rollover.

## Fix

- `e1676b76` asks the fact at the death: "When the person who left it died, was the money in their own IRA, or still in
  their job's retirement plan?" (`inheritedHeldLegend`).
- `3d472807` asks the death-year amount at a fixed moment, December 31 of the death year, for a death last year, so
  what was taken in the new year is never netted twice. For a death this year, the custodian's live figure is already
  net of what came out, so the engine adds that back before taking the year's withdrawals against it.
- `7927693f` asks "Has any money moved into this account since December 31?" (`inheritedMovedInLegend`) and, on Yes,
  the balance of all that money wherever it was held on that date. It skips the custodian's figure, which is built on
  the same narrow base.

## Key Insight

Before wording a question, write down what the rule reads: which fact, as of when, over which money. Then ask exactly
that, in the household's words. A question about the money's history, today's balance or "this account" is asking for
a different number that matches only in the simple case. Where the engine combines two asked figures, each must name
its moment, and the test must run the pair with both non-zero. A cross-check against a figure built on the same base
proves nothing about the base.

## Also Applies To

- Every as-of balance the engine asks for: the prior year-end balance an RMD reads, a cost basis, a Social Security
  statement's figure (which assumes work continues).
- Any refusal question: it must test the predicate the law keys on, or it refuses served cases and serves refused ones
  ([[101]]: refusal copy must describe the predicate's whole extension).
- [[167]]: store an edit in the frame of the thing it edits. The same frame trap, on time and on scope.
- [[146]]: money has a grain. Another way two figures that look comparable are not.
