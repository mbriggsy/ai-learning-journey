---
title: The typed-below line's form after walk 8 - Build spec
type: fix
date: 2026-11-16
execution: code
origin: docs/caddie/cold-read-log.md (U11 walk 8, card 451fa373) and council wf_98d8bc0e-e0a
---

# The typed-below line's form after walk 8 - Build spec

**What this is.** The walk-8 fix round's executable shape. Its design was ruled by council `wf_98d8bc0e-e0a`
(2026-11-16, full, 21 seats with the design, motion and a11y specialists, no abstentions, red team ran, 7/10, executed;
its row in `docs/council-log.md`). The council's chair wrote the exact words below; this file is their only durable
home (the journal lives on one machine). The design check was the council's own adversarial pass (red team plus
rebuttal); the mechanics below are the pilot's, checked by each commit's gates and by walk 9.

**What it changes.** The typed-below line (`src/intake/workingYearLeftOver.ts`: `workingYearCostTypedBelowStructure`,
`workingYearLeftOverAtQuoteStructure`, `typedBelowStructure`, `foldTypedBelow`), its words (`src/ui/copy.ts`: the
`workingCostTypedBelow*` slots, `COMPARISON_RIDER`, `withRider`, `belowLean`, the two `workingLedgerLeftOverSpansLead*`
leads, `workingCostTypedBelowSurvivorLabel`), its renderer (`src/ui/NotePartsBlock.tsx`, `src/ui/styles/noteParts.css`) and its
laws (`src/intake/__tests__/workingYearLeftOver.test.ts`: the density law, `spanRiderLaw`, `codaLaw`). Then the fix
round's other walk-8 items (U3, U4). No engine output moves; `src/engine` and `intakeMap` are not touched.

## Key decisions (the council's; cite, never re-derive)

- **KD1. No "plus".** With the gap stated from the spending side, "plus any difference…" would claim the spending side
  pays more tax: false in survivor RMD years (the typed answer pays $61 to $163 more; the rider plan's U1) and at
  taxable-first's 10th percentile (−$285.29). The rider names no direction and no size (the register's NEGATIVE).
- **KD2. One rider constant, "not including", a sharper noun.** `COMPARISON_RIDER` becomes
  `, not including any difference between the two answers in income tax and Medicare’s income surcharge.`
  ("between the two answers" changes one variable inside the refrain the ear keeps, ear §3.) No "the tool works out
  your tax" line (red team attack 2, conceded by every proposer: E20's shape, two scopes, and it restates an open gap's
  stopgap, `copy.ts:429-436`).
- **KD3. The gloss, once per composed line.** The first rider on each line carries, before its period,
  ` (the extra premium Medicare charges once you’re on it, when your income two years before was high)`. "two" is
  spelled from `magiLookbackYears` (`src/engine/constants/health.ts:151`), never typed.
- **KD4. Every run is three sentences, one `<p>` each:** the spending side, then the typed side, then the close
  "At your spending, that’s [at most] $D[ a year] less in your savings[R]". The close is framed from the spending side:
  a typed-side "gain" close ("your savings get … more under your answer", "takes less") was heard as good news (red
  team attack 1, ear.md:9; the Hawk's veto). "[at most]" rides exactly where today's slot for that kind carries it.
- **KD5. The cap sentence** goes in the opening after the lean and before the lead, on every host, keyed on KTD4's
  binding of the answer at the spending (an exhaustive Record). The gate keeps its built order (the typed-below line,
  then the moved line); the answer page reads counts and lean, the moved clause, the cap sentence, the lead.
- **KD6. Ranges carry each end's year.** Later ranges in a run print their ends in the first range's year order; the
  first range names its end years where a later range descends. A pure law plus a property test splits any run whose
  pairing fails (`creditsJoin` can join a drift that does not complement, `workingYearLeftOver.ts:1113-1114`).
- **KD7. The survivor part leaves the list** (the survivor build's KTD6 moves: as a fourth term under "both alive" it
  fails WCAG 1.3.1). A `<p>` after the list, costs first, then the same close. No survivor ratio, no "three-quarters"
  (false on c90 and c80), no "nothing left over is added" (the credit-0 rule stays unsaid, council `wf_dfb7949b-4a7`),
  no reason ("all housing" is false at a ratio of 1).
- **KD8. Form:** an `<ol role="list">`, one `<li>` per run (its label, then its sentences as `<p>`s); no table (a rider in
  a header is heard once), no `h3`, no motion, the same DOM at every width. Delete the coda `<dl>`
  (lines 60 to 70 of `NotePartsBlock.tsx` before U2), `.note-parts__coda` and the tabular-nums restatement (line 30 of
  `src/ui/styles/noteParts.css` before U2; `src/ui/styles/base.css line 35 at e992e9d69` is the figure law (the sheet was deleted at Act 6 · RC21); the restatement dropped
  lining-nums). Done in U2.
- **KD9. One host-noun Record:** [N]/[n] is "Your"/"your" on the gate and the step, "This"/"this" on the answer page.
  `belowLean` reads it (today it hard-codes "this answer" under the gate's "Your answer"). The sheet's cell is "This"
  (W8-R5 (d): the sheet's title and warning already say "this answer").
- **KD10. A count, pinned.** A test counts each witness's and host's words and dollar figures in the line and pins them,
  so growth is a reviewed number. Walk 9 reports the on-page words and figures before the first button against walk 8's
  400-530 words and 23-38 figures.
- **⚑ Yours-to-close (Briggsy reads walk 9's card; it ships meanwhile):** the three-beat order with one sentence per
  line, the gloss and the lead's words, "between the two answers", and the length (the pension household's line grows
  from about 374 to about 480 words).
- **Flips (dissent preserved).** The Hawk and the Advocate hold ", except for any difference between the two answers
  in…" on every kind: if walk 9's ear or eye seats still read "ignores" or "the tax is left out", swap the one constant
  to that, never "plus". If a pension-household seat misses the 2029 and 2032 draws from savings, or calls the line a
  wall, reopen the three beats on credit runs. If year-paired ranges read as a typo, print each year inside the run.

## The words

**[R]** `, not including any difference between the two answers in income tax and Medicare’s income surcharge.`
**[G]** on a line's first rider only, before its period:
` (the extra premium Medicare charges once you’re on it, when your income two years before was high)`.
**[Q]** the quote: "your spending of $Q a year" (source `spending`) or "your budget’s $Q a year" (source `budget`); in the
close, "At your spending" or "At your budget". **[T]** the typed figure.

**Span kinds** (each three `<p>`s, in this order):
- **bothCredit:** "The answer at [Q] would add at most $q a year." / "[N] answer adds at most $C a year to your savings." /
  "At your spending, that’s $D a year less in your savings[R]"
- **quoteCreditsNothing:** "The answer at [Q] would add nothing." / the typed sentence as bothCredit / the same close.
- **shortLeftOverAtTyped:** "At [Q], each working year you’re both alive comes up $S short, which would be taken from
  your savings, and the answer at that spending would add nothing." / "Your figure of $T a year leaves those shortfalls
  out of [n] answer, which adds at most $C a year to your savings." / "At your spending, that’s at most $D a year less in
  your savings[R]"
- **shortStillShortAtTyped:** "At [Q], each working year you’re both alive comes up $S short, which would be taken from
  your savings." / "At your figure of $T a year, each working year you’re both alive still comes up $s short, which would
  be taken from your savings, and [n] answer adds nothing." / "At your spending, that’s at most $D a year less in your
  savings[R]" — D is `stillShortDifferenceDollars`, never the printed subtraction (V9).
- **shortEvenAtTyped:** the still-short kind's first sentence / "At your figure of $T a year, each working year you’re
  both alive leaves nothing over and nothing short." / the same close.
- **same** (with W8-R5 (a)'s figure): "The answer at [Q] would add at most $C a year." / "[N] answer adds at most $C a
  year to your savings." / "At your budget, that’s the same in your savings[R]" ("At your spending" on the spending
  source).
- **A one-year run:** "that working year, if you’re both alive," for "each working year you’re both alive", "that
  shortfall" for "those shortfalls", and no "a year" on its credit or difference (W8-R5 (c)).
- **The first spending-side base on a line names the floor** (W8-R8, the pilot's placement): "…at your spending of
  $90,000 a year, the least a working year almost always costs, …", on the cap sentence where one is drawn, else on the
  first run's first sentence; never twice on a line.

**Opening and lead.**
- The cap sentence (KD5), by the at-spending answer's binding: year 0 binds → "At [Q], your first working year would have
  $K left over, so the answer at that spending would add at most $K in any working year."; year 0 is short → "At [Q], your
  first working year would come up $S short, so the answer at that spending would add nothing in any working year.";
  the stored figure binds → no sentence.
- The lead, where a lead is drawn today (two or more runs): "What each answer adds to your savings in each working year
  you’re both alive:" with the survivor gate on, "What each answer adds to your savings in each working year:" with it
  off.
- Run labels after the first read "If you’re still working in 2029 through 2032" (W8-R6, every multi-run line).
- The answer page's moved clause names its noun (W8-R5 (b)): "You said all the money left over in a working year goes
  into your savings, when your first working year had $16,985 left over."; the sheet's caveat: "You said all the money
  left over in a working year is saved, but …".

**The survivor part** (a `<p>` after the list; on a one-run line, the same sentences close its one paragraph):
- survivorCharges: "If only one of you is alive in a working year, that year’s costs count as $63,000 at your figure of
  $84,000 a year and $78,750 at your spending of $105,000 a year." / "At your spending, that’s at most $15,750 a year
  less in your savings[R]"
- wholeGap: "If only one of you is alive in a working year, that year’s costs still count in full: your figure of $90,000
  a year and your budget’s $105,000 a year." / "At your budget, that’s at most $15,000 a year less in your savings[R]".
  The "That $15,000 a year is the whole gap…" echo retires; `codaLaw`'s strict check (the quote less the typed figure
  equals X within $1) moves onto the costs sentence.

**Worked example: TM's gate** (the pension household's opening, survivor part and moved line are TM's):
- Opening: "Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a
  year. A working year almost always costs at least what you spend, so your answer can look better than it really is. At
  your spending of $105,000 a year, the least a working year almost always costs, your first working year would have
  $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. What each answer adds
  to your savings in each working year you’re both alive:"
- 2026 through 2028: "The answer at your spending of $105,000 a year would add at most $5,985 a year." / "Your answer adds
  at most $16,985 a year to your savings." / "At your spending, that’s
  $11,000 a year less in your savings, not including any difference between the two answers in income tax and Medicare’s
  income surcharge (the extra premium Medicare charges once you’re on it, when your income two years before was high)."
- If you’re still working in 2029 through 2032: "At your spending of $105,000 a year, each working year you’re both alive
  comes up $3,652 to $4,015 short, which would be taken from your savings, and the answer at that spending would add
  nothing." / "Your figure of $84,000 a year leaves those shortfalls out of your answer, which adds at most $16,985 a
  year to your savings." / "At your spending, that’s at most $20,637 to $21,000 a year less in your savings[R]"
- If you’re still working in 2033 through 2035: as the first run, without [G].
- After the list: "If only one of you is alive in a working year, that year’s costs count as $63,000 at your figure of
  $84,000 a year and $78,750 at your spending of $105,000 a year. At your spending, that’s at most $15,750 a year less in
  your savings[R]"
- Then the moved line, its own line, as built.

**Worked example: the pension household's runs 2 to 4:**
- 2029: "At your spending of $105,000 a year, that working year, if you’re both alive, comes up $4,015 short, which would
  be taken from your savings, and the answer at that spending would add nothing." / "Your figure of $84,000 a year leaves
  that shortfall out of your answer, which adds at most $16,985 to your savings." / "At your spending, that’s at most
  $21,000 less in your savings[R]"
- 2030 through 2031: "The answer at your spending of $105,000 a year would add at most $3,005 in 2030 to $3,368 in 2031."
  / "Your answer adds at most $16,985 a year to your savings." / "At your spending, that’s $13,980 to $13,617 a year less
  in your savings[R]"
- 2032: as 2029, with $3,652 and $20,637.

**As built in U2: the pilot's calls where these words are silent** (each flagged for walk 9, each in the code's docblocks):
- **KD6's split.** A later range "descends" when, printed in the first range's least-to-most year order, it falls; the first
  range then names its end years and every range prints in their time order ("$3,005 in 2030 to $3,368 in 2031", "$13,980
  to $13,617"). Naming needs each end of the first range in ONE year: where an end spans several years and a later range
  runs the other way, the pairing fails and the run splits, year by year (`typedBelowPairingOf`, `spansOf`). So `whole`,
  TM at $95,000, C at $7,916.67 a month and the near-line household now read 2029–2030 and 2031–2032 apart, each with one
  figure, never "$12,452 in 2031 and 2032 to $12,815 in 2029 and 2030".
- **KD5's fourth member.** Year 0 at the quote exactly $0 (C at $110,985): "…your first working year would have nothing
  left over, so the answer at that spending would add nothing in any working year." A tie with the stored figure is
  `stored`: no sentence.
- **The one-run line** has no label and no lead, so its first beat opens "Each working year[ you’re both alive], the
  answer at [Q] would add…" (the old one-span opener, moved to the new first beat).
- **[AQ] and the close follow the source**: "the answer at that budget", "At your budget".
- **`same`** prints its credit (W8-R5 (a)), so it now joins as every kind does (its credits must join); where both answers
  add $0 it says "would add nothing" (no witness reaches it).
- **KD9's sheet cell.** The chair's recommendation line names "Your" on the sheet; its positions left the sheet's noun to
  the fix round ("unless the fix round adopts W8-R5 (d)"), and this spec adopts it: "This", where an answer is on screen.
- **The sheet's two rows**: W8-R5 (b)'s noun lands on `assumptionWorkingYearCheckLeftOverSaved` too, the moved row's twin
  with the same unreferenced "all of it".

**As built in U4: the pilot's calls** (each flagged for walk 9, each in the code's docblocks; the stale family's figures
measured through the engine at `3f2d6e4f` and reproduced by the composer: A $4,500 on $63,000 against $67,500, B, C and F
$15,750 on $63,000 against $78,750, S −$4,500):
- **Where the survivor part rides.** W's stale line (`workingYearCostStaleLine`) for a "saved" answer waiting on W whose
  spending rose past the held figure, wherever the survivor gate is on (`staleSurvivor`: the typed-below read, the held
  figure in the typed figure's place, against the same draft re-confirmed at the quote): A, B, C and F. Never S (its
  survivor year errs cautious) and never a non-"saved" answer, whose line is the note alone and whose note already leans
  the whole answer rosy (the walk-8 card's W8-R12 (d) kill). KD7's sentences through one helper (`survivorPartOf`), its
  close glossed: it is the stale line's first rider.
- **Its home.** `NoteParts` gained `closing` on the segments arm (the survivor build's KTD6 rule changes with it): drawn
  as `p.note-parts__closing` after the segments' `<dl>` and before the door; a `<p>` cannot sit in a `<dl>`, so where both
  are drawn the door takes a `<dl>` of its own, still the block's last dt/dd. A read-only tab keeps the part.
- **The scope.** A run of two or more years, and a later year alone, carry "you’re both alive" on the head noun ("From 2029
  through 2032, each working year you’re both alive comes up…"; the years lead, or "both alive from 2029 through 2032"
  reads as alive the whole run). Year 0 alone carries none: no one can have died by then. A's gap comparison is scoped
  on the LINE only; the W step and the panel's W row keep the unscoped note, where no survivor part sits (a scope never
  shows without its figure: the survivor build's R10). Credit sentences stay unconditioned.
- **The waiting seat too** (beyond the card's letter, by the same R10): the sheet hides the answer page, and B's and C's
  seats now speak their runs, so each seat that speaks a run carries the scope and closes on the survivor part.
- **W8-R10, the method lines held to build 2's R14.** The refuter put the seat's dollars and lean on B's and C's method
  lines; R14 holds that row static, with no dollars and no direction word, because it reads the live draft far above the
  seat (`ArmedMethodologyLines`; insight 035). So the method lines name their referents in words ("at your spending
  figures", "each working year that comes up short at your spending figures") and the seats carry the dollars and the
  lean. C and F read a new waiting form, `updateLaterShort`, under any answer (as B's form does).
- **W8-R12 (c), the placement kept.** The none choice now comes first on the W row's Keep condition and on the Result
  door's confirm arm; the refuter's move of the condition and Keep below the cost list was not taken (council
  `wf_22858e04-f7a` (3) placed it above Keep, its described-by, inside the stale note), so "listed below" still points
  past the button.

## Units

- **U1 (docs, this spec's commit).** This file; the council-log row; the flip record corrected where it dropped the
  rider chair's conjunct ("…while reading "plus" after "less" as widening the lean rather than the quote's side", the
  `wf_33aa98fe-a26` chair's `whatWouldFlipIt`): the rider plan's KD2 dissent line, the 2026-11-15 council-log row, and the
  register's CLOSED rider entry; each now says "plus" is retired by this council.
- **U2 (one commit: one composer feeds every host, so every pin moves together).** KD2-KD9 in the composer, the slots and
  the renderer; W8-R5 (a), (b), (c), (d), W8-R6 and W8-R8 with them (they are this line's words). The laws, each with a
  plant that reds first: `spanRiderLaw` (the rider's left neighbour ends "less in your savings" or "the same in your
  savings"; exactly one [G] per composed line), `codaLaw` (the survivor part: costs sentence first, the strict whole-gap
  check on it, X on the close), the density law (three sentences a run, one side per dollar sentence), the year-order
  pairing law with a `fast-check` property, the host-noun Record, and KD10's pinned counts. Retype every pin by hand
  (no test imports the slots it pins): the TODO close block's landmine list names the hosts and specs.
- **U3.** W8-R7, the band's caption on a page whose note names a working-year figure different from the spending (the
  register's entry has the words and hosts; check `bandPricesFullBudgetWithLevels` for the split-budget collision).
- **U4.** The out-of-date family: W8-R12 (a) (the survivor part in KD7's words, "this answer", on A, B, C and F; measured
  in the register: A $4,500, B/C/F $15,750, S none), W8-R10, the walk-8 lows (W8-R11's B, C, F order and A's colon;
  W8-R12 (c)).
- **Then walk 9** on the changed strings: walk 8's targets, the same panel shape, the ear seat and a phone seat on the
  pension household, KD10's counts reported, the flips above tested.

## Verification contract (every unit)

TODO's close block "The review's gates" steps 1-4 (re-anchor base, typecheck, lint, every edited e2e spec through a
scratch tsconfig, `doc:reanchor` classified then applied, the reached test files pinned, `verify:doc-stats`, `pnpm
build`, `pnpm verify:fit`). The sweep and the per-key idcheck are not called: no unit touches `src/engine` or
`intakeMap`; a unit that does calls them. Before U2, read `docs/landmines.md`'s The fit gate and e2e, The mutation
harness, Copy and copyGuard, Windows and the shell, and Probes and measurement sections, and grep `e2e/` for every slot
U2 renames (the fit gate's `PAY_CHECK_UNLOCKS`, the coordinate-tap arm and the caddie `intake:typedbelow` arm assert
these strings; the unit suite never runs Playwright). Load the four UI design skills before U2's renderer change.
