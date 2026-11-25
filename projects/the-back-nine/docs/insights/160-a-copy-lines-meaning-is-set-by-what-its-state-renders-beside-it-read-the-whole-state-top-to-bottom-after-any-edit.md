---
title: A copy line's meaning is set by what its state renders beside it — a fix to one line can contradict its neighbor, a true figure reads as a bug beside one it should resemble, a joiner attaches to whichever figure it follows, and a label keeps the contrast it was written for after the page drops it
date: 2026-11-23
phase: Build 2 (the surplus question) — U11's Caddie walks 4 to 9, and b9-10's 2026-09-27 price re-pin
modules: [src/ui/copy.ts, src/ui/FuckOffDate.tsx, src/intake/workingYearLeftOver.ts, src/intake/WorkingYearLeftOverQuestion.tsx]
tags: [copy-contract, co-rendered, same-state, sibling-line, label, contrast, joiner, rider, read-top-to-bottom, caddie, cold-read, calm-but-wrong, part-d, working-years, full-budget, fix-sentence, least-true-state, runner-up-note, tie-break, break-even, lifetime-total, refuter-wording, survival-claims, copyguard, lint-gap, whole-file-review, act-6]
---

## Problem

Four copy defects, each in a sentence that was true and had passed its own tests, each misread because of a line
rendered beside it:

- **Two instructions to one household (b9-1, walk 4, 2026-11-08).** Walk 3's fix round reworded the check sentence's
  partial-saver line ("choose Some of it"). The moved line on the other side of the radios still offered its way out
  ("leave this as it is"). Each line was right alone; together they told one household two different things, and walk
  4 filed it as a blocker.
- **A true price read as a bug (b9-10, 2026-09-27).** After the 2030 reset the Part D surcharge prints at about 3×
  the figure beside it. Two seats called it "too big". The number was right.
- **A joiner that attaches to the wrong figure (the typed-below rider, walks 7 to 9).** The rider "plus any income tax
  on it" sat after "$11,000 less". After "less", a "plus" can fold the rider into the quote's side and read as
  shrinking the lean (the rider council's red team, conceded by six seats). Its replacement, "not including any
  difference…", is the price-tag idiom ("$X, not including tax"), and walk 8's readers still heard "ignores tax".
  Walk 9's ruled flip made it ", except for any difference between the two answers in income tax and Medicare's income
  surcharge" (`2f03a6caa`).
- **A label that kept a contrast the page dropped (walk 8's W8-R7, 2026-11-16).** `copy.bandPricesFullBudgetNote`
  ("This range prices your full budget — the same life the date above is measured against.") was written as the
  lifestyle side of a lifestyle-versus-essentials pair. No page that shows it shows the pair. On a date-route page
  whose note names a lower working-year figure, it was the page's only "budget", so it read as "every year at the full
  spending", which is false for the working years. The refuter confirmed it.

## Root Cause

Each line was written and checked against its own predicate and its own test. The reader meets the whole state at
once, and resolves each phrase against whatever sits beside it: an instruction against the other instruction, a
figure against the figure they expect it to resemble, a joiner against the figure it follows, a label against the
other figures on the page. No string test sees a neighbor, and a reword of one line never re-runs the reading of the
lines it shares a state with.

## Fix

- Walk 4's pair went to its fix round as a blocker, and b9-1 wrote the rule: after any copy edit to one line, read
  every line that state renders together, top to bottom.
- The Part D surcharge: the fix is the LABEL that explains why it differs (the reset), never the number.
- The rider: one rider on every comparison, read against every sentence form it ends ("less", "the same", "at
  most"). `RIDER` in `src/intake/__tests__/workingYearLeftOver.test.ts` pins its words by hand, and the same file reds
  if the old "not including any difference" comes back.
- The full-budget label: `FuckOffDate.tsx` now picks `slots.bandCountsWorkingYearsNote(...)` whenever the page carries
  a working-year figure, and keeps the old note only where the pair it was written for is the page's real contrast.

## Key Insight

**A line's meaning belongs to the state it renders in, not to the line alone.** Three checks follow:

- **After editing one line, read the whole state top to bottom**, every line that state shows, on every route that
  shows it. Two true lines can give one household two instructions.
- **When a page gains (or loses) a figure, re-read every label written for the old contrast.** A label means what its
  siblings make it mean; "full budget" means "as opposed to essentials" only where essentials are on the page.
- **Read a joiner against every sentence form it ends and every figure it can follow.** "Plus" after "less", "not
  including" read as "ignores": the joiner's meaning is set by the figure before it.

And when a figure is true but surprising beside its neighbor, explain the difference in the label. Changing the
number to look like the neighbor would be the calm-but-wrong fix.

## Also Applies To

- Insight 109's corollary (a refusal's wrapper is copy too, and only reading the assembled frame catches a mismatch)
  is this law for refusal frames; insight 140 is its scope-claim form (a later line cannot narrow a claim the reader
  finished).
- Insight 069's refuter point runs the other way: a referent supplied by the adjacent line is NOT a violation. The
  neighbor can rescue a line as well as break it, so judge either way off the rendered state, never the string.
- The workbench's facts page and year-by-year table: a label written for the walk ("your spending") reads differently
  beside the table's own columns.
- Any caption that reads the draft beside a headline that reads the answer (walk 9's W9-R7): the two lines describe
  different moments, and the pair is the defect.

## Extended (2026-11-25): a fix's own honesty sentence is a claim too, read it where it is least true

Act 6 milestone 2's whole-file review (b9-12, `a883c5e40`). Round 2 (workflow `wf_5786b0ac-c15`, over round 1's fix
code) found three sentences that round 1 wrote, or left standing beside its fixes, false in a state the fixer never
read:

- **The runner-up note.** Round 1 put a note under a runner-up whose printed figure beats Recommended
  (`slots.recRunnerUpAheadHere`), reusing `copy.recRunnerUpWhy`'s shipped reason: the recommended one "came out a
  little ahead more often across the futures we tested". The ranking (`selectCore` in `src/engine/solver/select.ts`)
  takes the odds first, then the goal's shrunk figure, and a tie in the top set goes to the conventional order. Nothing
  counts "more often", and on a tie-break crown the winner came out behind on both sets of futures. The note renders
  only when the runner-up looks better, so its false reason always sat beside the figure that argued against it.
  Two round-2 lenses found it, and all five refuter votes confirmed it.
- **Social Security's Summary hero.** Round 1's P0 fix (each bar totals its own years) leaves a strategy that runs
  out with "No lifetime total", and the hero still said "the most of these strategies". The refuters judged the
  wording older than the fix, which made the gap easier to see. `slots.claimsSummaryLine` now takes `partial` and says
  "the most of the strategies with a lifetime total here".
- **The no-break-even line.** Round 1's fix picked the leader from the last lead, and its own new test (running totals
  0, 0, 30,000 against 10,000, 20,000, 30,000) pinned `claimsNoBreakEvenLine`'s "stays ahead" through a final year
  where both print ~$30,000, while the same pair's yearly view said "About the same". `slots.claimsLevelByLine` is
  now the tied-year line.

The runner-up note's round-2 rewrite ("came out ahead or the two came out about even") then failed round 3
(`ff4e1c0d4`, P1, three of three refuters). On `?seed=borderline` with Leave more, the crown was won on the odds alone,
by 9 futures in 16,000 (0.6708125 against 0.67025 on the ranking set), while the runner-up left about $10,000 more on
both sets ($331,391 against $321,302 on the ranking set). Readers took "came out ahead" to mean the figure printed
beside it, so a steady $10,000 lead read as a quirk of one set of futures. One sentence was rewritten three times, and
each version was true somewhere and false in the state where it renders.

**What it adds:** a fix sentence gets the same check as the finding it answers. List every route and answer state it
renders in, and read it first where it is least true. For a note gated on a contradiction, that state is the gate
itself. And a test the fix writes can pin the false sentence, so read the test's expected words against its own
fixture.

## Extended (2026-11-25): a refuter's proposed wording is a draft, so run it through the copy laws before adopting it

Round 3 of the same review (b9-1, `ff4e1c0d4`). All three refuters at xhigh voted finding L1-2 (the runner-up note
above) real and P1. All three also said the hunter's fix, an odds clause gated on `gradeStatistic === 'survival'`, was
gated too narrowly, because every crown ranks the odds first. Their wordings split:

- Seat C proposed "there the recommended one had the better odds, or the same odds and a figure ahead or about even":
  a survival win or a survival tie for the crown, stated outright.
- Seat A proposed "strategies are ranked first on the odds the money lasts and only then on this figure … where the
  recommended one came out ahead or the two came out about even". That keeps the round-2 clause, and after "first on
  the odds" it reads as a win or a tie on them.
- Seat B said the hunter's wording broke a ruled law. `docs/decisions/survival-tie-tolerance.md`, "The known cost",
  point 2, says no copy may call or imply that the crown is safer, just as safe, or survival-equivalent, or that it won
  on survival. At tolerance 0 the crown's odds edge can be noise. `SURVIVAL_CLAIMS` in `src/ui/copyGuard.ts` (council
  `wf_6e72eca9-c20`) enforces that law. B linted three wordings against the guard, and all three passed, including
  "came out ahead on the odds the money lasts there", because the pattern `(ahead|better) on (survival|safety|odds)`
  missed "on THE odds". B went further: even "ranked first on the odds" can imply a survival win, so whether the odds
  key may be named at all is a council question. B proposed wording that names no winner on any key.

The guard catches seat C's sentence through "the same odds" (the `(same|identical|…) (odds|chances|safety)` pattern).
Its "had the better odds" passes on its own, and still passes in the current tree. The shipped fix states the ranking
rule in both sentences without saying which key decided this crown. `recRunnerUpAheadHere` now ends "the ranking reads
a separate set of futures and puts the odds the money lasts ahead of this figure, so a hair's difference in those odds,
or this figure as it reads there, can put it first." The pattern became `on (the\s+)?(survival|safety|odds)`, and
"There the recommended one came out ahead on the odds the money lasts." joined `SURVIVAL_MUST_CATCH` in
`src/ui/__tests__/copyGuard.test.ts`. The commit records the wording, which still names the odds as the rule's first
key, as the pilot's call, open to Briggsy's read.

**What it adds:** a refuter votes on the finding, and its wording is a draft prescription (insight 105, applied to
words). Agreement on "real, P1" says nothing about the sentence proposed with it. Here, two of three proposals would
have shipped a banned claim. Before adopting a fix sentence, check it against the project's ruled copy laws (the
decision records, not only the lint). The lint is a list of phrasings: it catches "the same odds" and passes "had the
better odds". When a paraphrase slips through, widen the pattern and pin that sample, as `ff4e1c0d4` did for "on the
odds".
