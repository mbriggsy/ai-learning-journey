---
title: "A plan written while one of Briggsy's questions gates half of it gets written for the yes, though the build starts on the unanswered path — gap 4's first unit carried loans in its files, steps and tests under one version-8 step for all three, no unit owned the loans' own schema step, and the line half's only date-route note sat in a loan unit"
date: 2026-11-27
phase: The RightCapital mandate, gap 4 (spending lines that repeat or grow at their own rate, and loans): the plan's three blind readers (b9-14, `579b5530`)
modules: [docs/plans/features/spending-line-repeat-and-rate-build-spec.md, src/shared/model.ts, src/shared/scenarioCodec.ts, src/ui/copy.ts]
tags: [plan-writing, open-question, gated-half, unanswered-path, owner-call, pending-ruling, blind-readers, misleads, would-fail-first, schema-version, version-ladder, loans, unit-split, safeguard-placement, stopgap-note, date-route, U14, KTD9]
---

## Problem

Gap 4's plan had two halves: spending lines that repeat or grow at their own rate, and loans. One question for Briggsy,
whether the household carries a mortgage or other fixed-payment loan, gated the loan half. The plan's own Open
Questions said the line half is built first either way, and that if he had not answered by the time U2 started, U2
ships the line fields alone. He had not. But the plan the three blind readers got (`f0f77605`) was written for the yes:

- U2, the first unit, carried loans in its goal, files, steps and tests (a `LoanRecord` type, `loans` in the saved
  field list, the loan shape checks, loan test cases). KTD9 said "Schema version 8, one step for all three". No unit
  owned the loans' own later schema step, yet U5 depended on U2's `LoanRecord`.
- The only date-route words for a fixed line with a Through year lived in U13's step 3, a loan unit, and the build
  order dropped them when the loan half was not built. Such a line's end moves with each stop year the date search
  tries, so on an early stop it ends too soon and the search can name too early a date (rosy).

Those were two of the readers' six misleads, and all three readers' first wrong turn sat on the unanswered path: the
builder and the owner readers at U2, the rules reader at U8's missing note.

## Root Cause

The planner wrote each unit for the whole job, then stated the condition once, in the Open Questions and a build-order
note. A condition stated in one place does not reach the units. Every unit's files, steps and tests still described
the yes, so a builder on the no path had to guess what to strip out of U2, and a safeguard the ungated half needed
could live inside a gated unit and drop out with it. The yes is the natural thing to write, because it is the whole
picture, but the build walks the other path.

## Fix

`579b5530` rewrote the plan for the path the build takes. U2 is the line fields alone at schema version 8. A new U14
(version 9: the loan record, its 8 → 9 step and its floor) heads the loan half, and KTD9 says why: the loan question
was still open when U2 started, so the line half ships its own version and the loan half takes the next one. The
date-route note moved into U8, the line half's own drawer unit, as a stopgap with its own Risks row; U7 adds the note's
loan sentence only once loans exist. U2 shipped as version 8 (`f3313636`), the note's words are in `src/ui/copy.ts`, and
the loan half waits whole as one Tier 3 register entry.

> **Out of date (corrected 2026-11-28):** version 9 went to gap 5's one-time money (`4b59f034`), so U14's loan record now takes the next free schema version when it is built. The current record is U14 and KTD9 in `docs/plans/features/spending-line-repeat-and-rate-build-spec.md` and the register's Tier 3 loan entry.

## Key Insight

When an unanswered question gates part of a plan, write the plan for the path the build will actually take first. Give
the gated part its own units, its own schema step included, so that "no" or "not yet" means skipping whole units,
never editing inside one. Then check that every safeguard the ungated half needs sits in an ungated unit.

## Also Applies To

- Any plan whose scope waits on a ruling, a measurement or a council: the waiting part is its own units, and the rest
  must build without it.
- The question itself should say what each answer costs. The owner reader's other mislead was that the question never
  said a yes bought about half the plan; the Open Question now says "seven units".
- [[170]]: a line only one file carries is lost when that file goes; here, a note only a gated unit carried.
- [[164]]: a checked plan fails on what its sentences imply. [[041]]: a plan's step is a hypothesis to re-check before
  building it.
