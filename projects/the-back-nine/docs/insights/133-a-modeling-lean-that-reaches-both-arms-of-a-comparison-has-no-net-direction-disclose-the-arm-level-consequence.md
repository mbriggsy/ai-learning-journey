---
title: "A modeling lean that reaches BOTH arms of a comparison has no net direction on that comparison: the post-2035 Part D hold under-prices the surcharge a conversion trips AND the RMD-driven surcharges converting avoids, so a row saying the hold \"leans toward converting\" was unproven — disclose the arm-level consequence, hedged to the case it names"
date: 2026-09-23
phase: Act 4 hardening (the assumptions row's "never oversold" — Card 7 of the 2026-09-13 sibling-sheets walk)
modules: [src/ui/copy.ts, src/engine/healthOverlay.ts, src/engine/roth.ts, src/engine/taxOverlay.ts, src/ui/__tests__/conversionTaxDisclosure.test.ts]
tags: [calm-but-wrong, disclosure, direction-honesty, two-arm-comparison, roth-conversion, irmaa, part-d, hold, copy-law, review-fleet, re-anchor, conditional-verb, can-reads-as-is, measured-direction, lean-per-arm, either-way, tier-lift, difference-bound, death-path, sequencing, taxable-first, typed-below]
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
it cites. **And the conditional verb is not a hedge to a cold reader:** "can" scopes the mechanism, but a household
reads it as "is" about its own answer — say a direction only where it is measured for THIS household (Refinement).

## Also Applies To

Every overlay the two-arm engine shares: the ACA regime hold, the medicare-extras anchor-scale hold, state-tax
re-verify drift — each is priced in both arms, so "makes the strategy look better/worse" is a claim about the
comparison, never about the overlay. Tooling twin (same session): a citation-re-anchor that FREEZES whole lines
(`-at-filing`, `(not \`:`) also freezes the LIVE anchor sharing that line — two TODO lines carried a number that had
rotted since the prior pass; sweep frozen lines for live anchors by hand after every run.

## Refinement (2026-10-31) — a "can" sentence is read as "is"

The U10 Caddie card's re-panel (b9-7) tested this insight's own prescription and broke it. A first fix on the W
step's stale face said "this answer can look worse than it really is": true of the MECHANISM (pay left over is never
saved, so a higher W can never improve the answer) and false of the household — on `?vault=datecoststale` the run at
$84,000 and at $78,000 gives identical curves (W leaves $16,985 over in year 0 and moves nothing), and two seats, one a
blocker, read the sentence as "the real answer is better than 2033". It was withdrawn the same session; the register
entry *The gate's working-year lines can't say whether a change touches this household…* carries the prescription:
run the check at both figures over the engine's own paths and key the words to the result ("moves nothing" / "can
look better" / "can look worse"), each only where measured — and its NEGATIVE: never key a direction to which figure
is bigger alone.

**Rule:** a direction claim on a household's own surface is a claim about THAT household. Say it where it is
measured; where it cannot be measured, say it only on the side whose over-read errs safe. The conditional verb keeps
a sentence true of the mechanism, which is not the reader's question.

## Extended (2026-11-23): a lean or a direction holds only on the arm, the household, the order and the paths it was measured on

Four later cases push this insight's "which arm?" one level further each time:

- **A lean is per arm, never per sentence (b9-1, the typed-below note).** "This answer can look better" was true for
  every arm its prescription imagined and false on one it did not: a "saved" answer waiting on W. The cure is
  structural: route every new lean through the one predicate the other leans already ride (`savedWaitingOnW` in
  `src/intake/workingYearLeftOver.ts`), so a new sentence cannot pick its own arms.
- **An "either way" signs the answer only across households, never inside one (the 2026-10-31 tier sweep).** An
  "either way" lifts a register entry's tier when it signs the answer the household acts on across households (*The
  first answer assumes money comes out of every account in proportion…*). Two opposite effects inside one household,
  with the net unsigned, hold the entry (*The investment mix is frozen at today's blend for life…*). The rule is
  binding in the register's header (its tier-sweep paragraph); it is this insight's net-direction test applied to
  tiering.
- **A bound proved on each run is not a bound on the DIFFERENCE between two runs (the typed-below rebuild's review,
  round 2, finding #1; council `wf_dfb7949b-4a7`).** The plan rejected a death-frame sentence because "the at-most pair
  is true on a death path". That holds for each answer's credit (a death credits 0) and fails for their difference:
  nothing is credited, the survivor rule holds W, and the quote's draw runs deeper. On C at $90,000 under an
  all-sticky $105,000 budget, "at most $10,000 a year more" stood against the engine's $13,609 on 58 of 4,000 passes
  in 2032. Check a comparison's premise on the paths where each side's rule changes, not on each side alone.
- **A measured direction holds only for the withdrawal order and rows it was measured on (b9-6).** A register entry
  said the rider's gap runs one way ("Never the other way"). Round 3 had measured it at default sequencing, and its
  own taxable-first output already held a year running the other way (TM 2035: the typed answer $87.47 more), unread
  until a planner's spec-flow pass. Write a measured direction with its sequencing and its rows, and grep the
  measurement's own outputs for the sign before stating it.

The Refinement above said "say a direction where it is measured for THIS household". These cases add the rest of
the address: this arm, this household, this withdrawal order, and every path where one side's rule changes.
