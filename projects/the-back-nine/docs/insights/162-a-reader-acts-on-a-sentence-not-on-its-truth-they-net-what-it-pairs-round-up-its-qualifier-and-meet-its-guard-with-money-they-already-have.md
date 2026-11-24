---
title: A reader acts on a sentence, not on its truth value — true sentences on the working-year step were netted, rounded up, satisfied by money the household already had, read as a bug, and used to turn a dial the other way
date: 2026-11-23
phase: Build 2 (the surplus question) — U11's Caddie walks 2 to 5, the go-live's review
modules: [src/intake/workingYearLeftOver.ts, src/intake/WorkingYearLeftOverQuestion.tsx, src/ui/copy.ts]
tags: [copy-contract, reader-action, calm-but-wrong, rosy-misread, netting, gain-beside-loss, qualifier, cliff-payoff, guard-sentence, consent, base-of-a-threshold, reason-in-sentence, stale-figure, caddie, working-years, left-over]
---

## Problem

Across U11's walks, seven sentences on the "what happens to the money left over" question were true and pinned by
tests, and cold readers still did the wrong thing with each:

- **A bare effect beside the reader's own choice (b9-7, walk 5).** "You chose to save all of it. This answer adds none
  of it" lost every reader. The reason sat one screen away, so the line read as a bug.
- **A range that invites the dial (walk 5).** "Or more … at most", beside the old figure's larger result, led two
  seats to a retype the tool would honor.
- **A zero that hides a draw (b9-4, walk 3).** "Adds none of the $16,985" was the short run's only stated effect, and
  it read as "we'd just tread water", while each short year draws from savings.
- **A gain and a loss side by side get netted (b9-3, walk 2; walk 3).** "Adds at most $5,985 a year" beside "that
  year comes up $4,015 short" read as a net gain, though the picture held a run of short years (2029–2032). Naming the
  run in walk 3 made the gain's single year starker, and two readers netted one gain against four losses.
- **A qualifier under a cliff payoff (b9-1; three walks found it).** "Choose “All of it” only if about $16,985…" let a
  household saving most of it round up, since "Some of it" counted $0.
- **A guard met by money the household already has (b9-6; b9-1).** "Your savings grow by about this much, on top of
  what you put in" was passed by market growth on any invested household: twelve seats, every refuter kept it, every
  unit and e2e arm green. "If at least $16,985 still goes in" was met by the $20,000 of deposits every household makes.
- **A live figure read on a stale input (b9-5, the go-live's review).** W's stale clause named the year-0 left over
  read on the stale W. After a raise it read $27,537, while R8 caps every credit at the stored $16,985, so it named
  money no checked path credits.

## Root Cause

Each sentence was judged as a proposition (is it true?) when the reader uses it as an instruction (what do I do
now?). Readers fill the gap with the nearest act: they net whatever a sentence pairs, round a qualifier to the
answer they want, satisfy a threshold with money already in view, read an effect with no reason as the tool
misbehaving, and push a dial the way a range points. Tests pin the words, and a true word can still lead to the rosy
act.

## Fix

Each fix put the missing fact in the same sentence, in the form the reader's act needs:

- The reason travels with the effect: "Because that $16,985 depends on your $84,000 figure, this answer adds none of
  it to your savings until you update your figure" (walk 5's (bh)).
- The floor is stated in the same sentence, and the retype path itself is closed in code (the register's Tier 0
  retype entry), since words alone cannot close a path the tool honors.
- Every line that names a short year says where the shortfall comes from, in the money picture's own words
  (`98b5ad17`).
- A gain and a loss share unit and reach, or the gain names the years it skips. Where a per-year figure would need a
  new measurement, reach is given by mechanism: "in each working year that doesn't come up short", true by R8's cap
  with no year's figure assumed (`f028f33f`, `98b5ad17`).
- Under an all-or-nothing payoff the condition says "all of this", and the partial answer's zero is stated before the
  pick.
- A guard names the money's source and base: pay, and "of the $27,537".
- A stale clause names the figure the household consented to (the stored $16,985), because that figure caps every
  later credit.

## Key Insight

**Read every sentence for the act it invites, not only for whether it is true.** Ask of each line: what will this
household do after reading it? Then check for the five shapes that turned true sentences rosy here:

1. An effect beside the reader's choice with its reason elsewhere: the reason goes in the same sentence.
2. Two quantities in one sentence: they will be netted, so give them one unit and one reach.
3. A zero or "none": it hides whatever happens instead (a draw from savings); say it.
4. A qualifier, a range or a threshold: it will be rounded or met the easy way, so name the base, the source and the
   floor, and close in code any path the words point at.
5. A figure read on a stale input: name the figure the household agreed to, never a live one no path credits.

Rosy outranks confusing. When in doubt, a longer true sentence beats a short one that invites the wrong act (and
insight 161 says where the length should go).

## Also Applies To

- Insight 103 (a rule that kills an over-alarm, checked in the silencing direction): a refuter's "harmless misread"
  must be traced to what the reader's literal act does in code.
- Insight 069 lists comprehension holes (the reader cannot parse). This is the next failure along: the reader parses
  the sentence correctly and acts wrongly.
- Every consent or check sentence the workbench will carry (keep this what-if, apply this change): each names a
  source, a base and what happens to the parts it does not cover.
