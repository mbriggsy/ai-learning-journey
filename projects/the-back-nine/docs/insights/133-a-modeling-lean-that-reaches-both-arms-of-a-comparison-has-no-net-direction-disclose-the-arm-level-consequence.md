---
title: "A modeling lean that reaches BOTH arms of a comparison has no net direction on that comparison: the post-2035 Part D hold under-prices the surcharge a conversion trips AND the RMD-driven surcharges converting avoids, so a row saying the hold \"leans toward converting\" was unproven — disclose the arm-level consequence, hedged to the case it names"
date: 2026-09-23
phase: Act 4 hardening (the assumptions row's "never oversold" — Card 7 of the 2026-09-13 sibling-sheets walk)
modules: [src/ui/copy.ts, src/engine/healthOverlay.ts, src/engine/roth.ts, src/engine/taxOverlay.ts, src/ui/__tests__/conversionTaxDisclosure.test.ts]
tags: [calm-but-wrong, disclosure, direction-honesty, two-arm-comparison, roth-conversion, irmaa, part-d, hold, copy-law, review-fleet, re-anchor]
---

## Problem

The assumptions row ended "…errs against converting, so the lever's benefit reads understated, never oversold" while
the Roth sheet one door over disclosed an optimistic hold (past 2035 the Part D surcharge scales are held flat). The
first fix, ruled cold by Briggsy, replaced the absolute with two named directions: the funding rule "leans against
converting" and "One other choice leans the opposite way" (the hold). It read clean, every gate was green, six
mutants were red. A 153-agent review then found the second direction was NOT a fact of the engine: three of six
lenses filed it independently and the refuters let it stand.

## Root Cause

`buildArmParams` (`roth.ts`) builds the with- and without-conversion arms from ONE base; the Part B/D pricing
schedule is a function of the start year and horizon only (`taxOverlay.ts`), so the same held scales price EVERY
post-2035 surcharge bill in BOTH arms. A conversion's own far-out bill is under-priced (leans toward converting) —
but so are the RMD-driven surcharges of the no-conversion arm, and shrinking those is the reason to convert (leans
against). The lean's sign on the COMPARISON depends on which arm carries more post-edge surcharge dollars, which
the engine never computes. The sheet's sentence had always been narrow and true ("a conversion that trips it far in
the future could look a shade easier"); the row's new lead-in lifted that arm-level fact into a net verdict. Nobody
— the register's prescribed draft, the pilot, the reader in the chair — asked "which arm?", because a disclosure
sentence about a hold READS like a statement about one thing, not a comparison of two.

## Fix

The lead-in became conditional and the consequence stayed scoped to the case it names: "One other choice the tool
makes can lean the other way: … so a conversion that trips it far in the future could look a shade easier here
than in real life." The direction phrases are pinned in order (`conversionTaxDisclosure.test.ts`) and an overall
lead-in ("leans the (opposite|other) way") is pinned ABSENT. The same review corrected "projections stop at 2035"
(the Trustees project 75 years and the engine uses that tail for Part B — the printed table is what ends) and named
the surcharge in-row. The hold's own sign beyond 2035 is filed as a research entry: every "optimistic" in the tree
cites no long-range Part D source, and the printed tail the engine deflates falls in real terms.

## Key Insight

**Before any copy claims a modeling choice "leans" a decision, ask which ARM of the comparison the choice touches.
A lean that reaches both arms has no proven net direction; the honest disclosure is the arm-level consequence with
a conditional verb ("can lean", "could look easier") scoped to the case it names.** The one-arm phrasing is the
sin's camouflage: it is true of the arm and reads as true of the answer. Corollary: a disclosure's OWN direction
word ("optimistic", "conservative") needs a source like any other figure — grep the tree for the word and ask what
it cites.

## Also Applies To

Every overlay the two-arm engine shares: the ACA regime hold, the medicare-extras anchor-scale hold, state-tax
re-verify drift — each is priced in both arms, so "makes the strategy look better/worse" is a claim about the
comparison, never about the overlay. Tooling twin (same session): a citation-re-anchor that FREEZES whole lines
(`-at-filing`, `(not \`:`) also freezes the LIVE anchor sharing that line — two TODO lines carried a number that had
rotted since the prior pass; sweep frozen lines for live anchors by hand after every run.
