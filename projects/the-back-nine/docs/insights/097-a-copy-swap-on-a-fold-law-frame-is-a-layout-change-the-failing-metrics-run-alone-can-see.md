---
title: "A copy swap on a fold-law frame is a LAYOUT change only the failing-metrics environment can see — and the shortest true referent is the cure, not whitespace surgery"
date: 2026-07-19
phase: Act 4 (solver & recommendation)
modules: []
tags: [copy-edit, fold-law, frame-law, vertical-fit, layout-change, ci-only-red, ubuntu-metrics, wrap-class, r13-caveat, shortest-referent, whitespace-surgery, qualifier, re-quote, second-sentence, in-clause, form-not-cut, first-year, repeat, verdict-clause, plan-drift, surpluswidestrelief]
---

# 097 — A copy swap on a fold-law frame is a LAYOUT change only the failing-metrics environment can see — and the shortest true referent is the cure, not whitespace surgery

## Problem

**Context (the Medicare-cost-trend unit, 2026-07-19).** The trend unit's interim residual
sentence ("The extra-coverage premiums and the drug-plan piece of the income surcharge are held
flat…", ~+50 chars over its predecessor) passed the local `verify:fit` 28/28 on Windows — and
put CI RED (run 29696587230): on ubuntu's text metrics the sentence wrapped ONE extra line on
the budget composite (the tallest frame), pushing the protected R13 disclaimer to bottom=801
vs the 800 fold.

## Root Cause

One pixel, Linux only — the burned/055 class (a green local Windows run is not proof)
recurring through the COPY channel: nobody edited layout, someone edited a SENTENCE.

## Fix

**The cure was the truth getting shorter, not the frame getting looser.** The same day's Part D
sourcing pass made the interim sentence FALSE (the drug-plan piece now trends), so the referent
narrowed again to "The extra-coverage premiums are held flat…" — back inside the one-line
class — and CI went green (run 29697251176) with zero whitespace surgery. The insight-075 trap
was live and avoided: a whitespace fix authored on Windows would have been a shipped guess,
unprovable in the environment that failed.

## Key Insight

**Rules:**
1. **Treat every copy edit that lands on a fold-law frame as a layout change.** The fit gate's
   per-seed arms are the enforcement, but LOCAL fit green is necessary, never sufficient — the
   breach class lives in the CI metrics delta (~one line taller on the tallest stack). Budget
   fold-law sentences by their WRAP CLASS (does this stay one line at the narrow measure under
   taller metrics?), not by character count deltas alone.
2. **When a residual/disclosure sentence outgrows its line, first ask whether the TRUTH can get
   shorter** — a referent narrowed to what is genuinely still true is both the honest edit and
   the layout fix. Whitespace surgery in a regime you cannot measure locally (075) is the last
   resort, never the first.
3. **A 1px CI-only fold breach is not flaky CI** — it is the fold law working in the one
   environment whose metrics can catch it. Never suppress, re-run, or tolerance it away.

## Also Applies To

**Also applies to:** any real-browser layout gate whose enforcement environment differs from
the dev box (font metrics, DPR, line-height rounding); disclosure/legalese strings that grow by
accretion on the tallest composite frame.

## Extended (2026-11-27): when the truth can't get shorter, the form can — a second sentence that re-quotes a figure pays for the figure twice

Gap 4's U15 (`a7b97513`, b9-16) made Probability's spending clause say when its monthly figure is the first year's and
name the repeating line inside it (a year-0 car read as every year's spending is the rosy side). The pilot first wrote
that as a sentence of its own after the clause: "That $40,000 a month is your first year’s spending, with “Travel” at
$360,000 in it…". On `?seed=surpluswidestrelief` (the widest names) at his 1440×731 window, the fit arm (Gap 4 · U15 in
`e2e/rc-screens.spec.ts`) put the R13 caveat at 733.2 px, under the 731 px frame. The plan had drafted the other form
(U15 in `docs/plans/features/spending-line-repeat-and-rate-build-spec.md`: "$10,000 a month in your first year, with a
$40,000 car in it"), and moving to it held the frame: "There looks to be room to spend more than $40,000 a month in your
first year, with “Travel” at $360,000 in it, which comes back every 5 years." Every fact stayed. `verdictFirstYear` in
`src/ui/copy.ts` carries a comment saying why it sits inside the sentence.

Nothing could be cut here: the first year, the line's name, its price and how often it comes back are each a fact the
household needs. What could go was the re-quote. A second sentence has to point back at the figure ("That $40,000 a month
is…") before it can say anything about it, so it pays for the figure again. A qualifier set right after the figure,
inside the sentence that already carries it, pays nothing extra.

This adds a rung to Rule 2 above. When a sentence on a frame-law page grows, ask first whether the truth can get shorter.
If it can't, look for a new sentence that re-names something the old one already said, and fold its qualifier in beside
the figure it qualifies. That is a change of form, never a cut of content. And when a plan has drafted the words' form,
building a different form is a layout change of its own: here the fit arm was run on the widest names and caught it
before the commit.
