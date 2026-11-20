---
title: The typed-below line's form after walk 9 - Build spec
type: fix
date: 2026-11-19
execution: code
origin: docs/caddie/cold-read-log.md (U11 walk 9, card e6f8baf0) and council wf_9f28e691-1dc
---

# The typed-below line's form after walk 9 - Build spec

**What this is.** The walk-9 fix round's form, ruled by council `wf_9f28e691-1dc` (2026-11-19, b9-1): full, 21 seats with the
design, motion and a11y specialists, no abstentions on the run that ruled, red team ran, the Honesty Hawk's veto fired
against naming the raw `irmaa.tiers` line in the gloss and is honoured, 7/10, executed. (A first run lost five opening seats to
a safeguard flag raised by the brief's own wording; the resume kept the clerk's dossier: `docs/landmines.md`, Council.) Its row
is in `docs/council-log.md`. The chair WROTE its words to a file; this spec carries them verbatim, from "Call (1)" on, and is
their only durable home.

**What it supersedes in `typed-below-walk8-form-build-spec.md`:** KD5 (the gate keeps its built order: walk 9 tested it and it
failed on the gate), KD3's gloss words, the run labels (W8-R6's "If you’re still working in …"), the survivor part's opening, and
KD4's three paragraphs on multi-run CREDIT runs (short runs keep them). Every other KD there stands, and so do its NEGATIVEs.

**Built with it, in the same commit:** walk 9's two ruled flips, (i) the rider's "except for" and (iii) each year inside the run
(the amount rule in call (1) is (iii)'s general form).

**⚑ Yours-to-close (Briggsy reads walk 10's card; it ships meanwhile):** the credit run's pair as one paragraph; the label tail
", while you’re still working"; `--space-5` for the survivor part's gap. **⚑ The override:** call (5) defers the gloss's dollar
figure to a register build over four seats (the Hawk, the architect, the advocate, the fiduciary) who wanted it named now; the
chair's reasons close the Build notes. **The wall is reduced, not cured** (PN's page about 607 words against walk 8's tolerated
400–530): no record calls flip (ii)'s wall answered.

## The chair’s words (verbatim)

Five form calls on the typed-below line (build 2's U11; walk 9's card, `docs/caddie/cold-read-log.md`, the 2026-11-16 (b9-5) card). Flips (i) and (iii) are ruled inputs and are applied in every example below:

- **[R]**, the rider (flip (i), ruled): `, except for any difference between the two answers in income tax and Medicare’s income surcharge.`
- **[RG]**, the rider on a line's FIRST rider only, with this council's gloss (call 5): `, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.`

Counts use the KD10 counter: words are split on white space, dollar figures match `\$\d[\d,]*(?:\.\d\d)?`, and run labels are counted. The chair’s counter script lived in that session’s scratchpad; the KD10 test in `src/intake/__tests__/workingYearLeftOver.test.ts` is the counter of record. It reproduces today's 531/34 (PN gate), 218/14 (T) and 386/25 (TM).

---

### Call (1): one order on both hosts, the moved clause's host, and credit runs

#### 1a. Order (both hosts)

**Order on the gate and the answer page alike:**
1. the counts sentence
2. the moved clause (three sentences), where this line carries it
3. the lean (call 2)
4. the cap sentence, where year 0 at the spending binds
5. the lead, on two or more runs
6. the runs
7. the survivor part

On the answer page the clause now comes before the lean; today it comes after. Wide-CR's cure (the clause before the cap sentence) holds on both hosts. Walk 9 tested KD5's "the gate keeps its built order" and it failed on the gate, so this supersedes KD5.

**The host of the moved clause is decided once, in `composeReentry`, as an exhaustive Record `{ rulesLine | typedBelowLine | ownNote }`:**
- **rulesLine:** a tax, state-tax or working-years line fired (today's `clauseHost`).
- **typedBelowLine:** no rules line fired and a fresh typed-below line exists.
- **ownNote:** neither of the above (today's separate moved note: its lead, its text and its door, unchanged; register (r) stays U12's here).

**The seam rules (insight 081):**
- IntakeApp never computes `carriesMoved`. It passes `typedBelow.compose: (carriesMoved: boolean) => NoteParts`, a closure over the one hydrated draft, and `composeReentry` calls it with `host === 'typedBelowLine'`.
- The Result keeps reading the session decision (`leftOverClauseHost`), so both hosts read one decision.
- `TypedBelowHost` becomes `{ kind: 'result' | 'gate', carriesMoved: boolean }`.
- **Landmine (an insight-081 fork that exists today):** `workingYearCostTypedBelowStructure` returns early (`read === null`) BEFORE it computes `movedClause`. So with the clause assigned to this line, the moved fact could print nowhere and nothing would throw. Two fixes are required:
  - Compute the clause before every early return, so it rides every arm: the null read, `unknown`, and the read itself.
  - The structure reports whether it carried the clause. Where the fact is set and the line did not carry it, `composeReentry` falls back to `ownNote`, never silence.
- A test pins the moved fact on all three arms of the host Record.

**Where the typed-below line carries the clause on the gate:**
- No separate moved note is drawn.
- Its lead ("The money left over in your first working year has changed since you answered.") goes, because the clause restates it with figures.
- Its door fact moves into the typed-below gate door's SCOPE sentence, under the buttons. It applies only where the tab can save, the same `!readOnly` condition both doors already share:
  - today: "Neither button on this page updates your $84,000 figure; both lead to where you can."
  - ruled (typedBelowLine host only): **"Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can."**
  - This keeps the fact, names its noun, and says no "below" (which is false at 1536px).
  - It never sits between the clause and the cap sentence (the red team's hit, conceded by every seat).
  - `composeReentry` picks this door variant from the same Record.

#### 1b. Inside the list: restatements go, every pair stays

These are form, never a cut. Each one drops a figure or phrase the line has already said, decided by a computed predicate in the core (a figure was already printed on this host's line), never by kind:

| Slot | Today | Ruled (inside a multi-run list) |
|---|---|---|
| credit kinds, spending side | `The answer at your spending of $105,000 a year would add at most $5,985 a year.` | `The answer at your spending would add at most $5,985 a year.` (budget: `The answer at your budget would add …`) |
| short kinds, spending side | `At your spending of $105,000 a year, each working year you’re both alive comes up …` | `At your spending, each working year you’re both alive comes up …` |
| credit kinds, typed side | `Your answer adds at most $16,985 a year to your savings.` | `Your answer adds at most $16,985 a year.` (the lead carries "to your savings") |
| short-out, typed side | `Your figure of $84,000 a year leaves those shortfalls out of your answer, which adds at most $16,985 a year to your savings.` | `Your figure leaves those shortfalls out of your answer, which adds at most $16,985 a year.` |
| still-short / even | `At your figure of $84,000 a year, …` | `At your figure, …` |

**The predicates:**
- The quote's dollars are printed once, in the lean (call 2), which every host now draws. So no run reprints them.
- The typed figure's dollars ride its FIRST mention on the line. On the gate, the answer page and the step, that is the counts sentence. On the sheet seat, which has no counts sentence, the first run sentence that names the figure keeps "of $84,000 a year".
- A one-run line has no lead, so it keeps "to your savings".

**Credit runs (`bothCredit`, `quoteCreditsNothing`), multi-run only.** The pair becomes ONE paragraph of two sentences, then the close as its own paragraph. One fact per sentence and R8 hold. Short runs keep three paragraphs, so the years that draw on savings look heavier, which is honest. *Taste: flagged for Briggsy.*

**`same`, multi-run only.** Beats 1 and 2 merge into one sentence that keeps the shared figure (W8-R5 (a)): **"Both answers add at most $5,985 a year."** (credit 0: "Both answers add nothing.") The close follows. On a one-run `same` line both beats stay, because it has no lead to name "each answer".

**R4 (b) and flip (iii), one amount rule.** It covers every sentence that prints a run's figure: on the typed-below line, on W's stale line (B, C, F) and on the waiting seats (insight 101):
- One value: `$X a year` (a one-year run: `$X`).
- Two groups of consecutive equal values: each with its years, in year order, with no "a year". Examples: `$3,005 in 2030 and $3,368 in 2031`; `$4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032`; `$21,000 less in your savings in 2029 through 2030 and $20,637 less in 2031 through 2032`.
- Three or more groups (the drift witness only; no walked household): `between $19,722 and $20,985 a year`. This band names no order.
- The `range` and `named` kinds retire, along with `typedBelowPairingOf`'s least-first fallback. The docblock at `:1418` and `:1183` is rewritten to this rule.
- A property test: no printed figure pair runs against its years.

**NL's third limit.** Where a run's typed credit is below R8's cap in EVERY year of the run (computed in the core from the read's own figures), the typed side names its reason:
- `…, which adds at most $8,185 a year, all that’s left over at your figure in those years.`
- one-year run: `…, all that’s left over at your figure that year.`
- This never appears on a year it does not hold for. Pinned on NL and the drift witness.

---

### Call (2): the floor and T's twin

**Retire** `FLOOR_NAMED`, `frame.floor` and `atQuote`'s floor flag. The aside leaves the cap sentence and run 1.

**The lean is split out of the counts slot into its own slot** (`workingCostTypedBelowLean`). It is placed immediately before the cap sentence, after the clause (call 1's order). Its words are built from `SPAN_QUOTE`, so there is one home. It has two forms, keyed by an exhaustive host Record:

| Host | Form |
|---|---|
| gate, step | `A working year almost always costs at least your spending of $105,000 a year, so your answer can look better than it really is.` |
| answer page | `… so this answer can look better than it really is.` |
| budget source | `A working year almost always costs at least your budget’s $105,000 a year, so your answer can look better than it really is.` |
| sheet seat (it has no counts sentence; the W row's note above already says the "can look better" half) | `A working year almost always costs at least your spending of $105,000 a year.` |

- **Counts sentence (gate, answer page, step):** `Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year.` This is today's sentence minus its lean. The budget twin likewise.
- **`belowLean`** keeps serving the W step's and the panel W row's notes unchanged. They carry no comparison.
- **Counts-only arms** (no read, `unknown`): [counts, …clause, lean, …fail-safe credit].

**The cap sentence drops the quote's dollars**, because the lean said them one sentence earlier on every host:
- `At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year.`
- short: `At your spending, your first working year would come up $2,815 short, so the answer at that spending would add nothing in any working year.`
- none: `At your spending, your first working year would have nothing left over, so the answer at that spending would add nothing in any working year.`
- budget source: `At your budget, …`.

**T's twin (W9-R5 (d)), merged.** The condition is a ONE-RUN line where the cap sentence is drawn AND the run's at-spending figure equals the cap sentence's figure in every year. That is `bothCredit` with a single `creditAtQuote` equal to `cap.leftOver`, or `quoteCreditsNothing` under a short or none cap. Computed in the core; it reaches T, a, pa, sam56, sam57 and youngerNonWorker.
- **Beat 1 is not drawn.** The cap sentence keeps its wider "in any working year" claim (true in survivor years too).
- The typed sentence stays unconditioned: `Your answer adds at most $16,985 a year to your savings.`
- **The both-alive scope moves onto the close's own claim:** `At your spending, that’s $6,000 less in your savings in each working year you’re both alive[RG]`. Where the survivor gate is off: `At your spending, that’s $6,000 a year less in your savings[RG]`.

---

### Call (3): the run labels

**One label form on every run, run 1 included. The `i === 0` branch is retired:**
- `workingCostTypedBelowSpanLabel`: **`{years}, while you’re still working`**, e.g. `2026 through 2028, while you’re still working` / `2029, while you’re still working`.
- `workingCostTypedBelowSpanLabelLater` retires.

**Why:**
- The red team showed that years-first alone keeps the false 2028 stop. The condition was keyed by position, not by any stop.
- "while" keeps W8-R6's condition without the "if" that seven seats read as hypothetical, and it reads true on the current year.
- PN's five labels stay at 31 words.
- No crown is read (R12). W9-R8's honest date keeps its own element.

**The money picture's ledger keeps "If you’re still working in …".** The difference is deliberate: the ledger's year 0 is its own row, so every later row it conditions is truly a later year, and it marks no false stop. The line's run 1 groups year 0 with later years, so every run carries the condition. Log this in the spec so no one "fixes" one to match the other blind.

---

### Call (4): the survivor part

**Opening (the typed-below line):**
- charges: `In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year.`
- whole gap: `In a working year with only one of you alive, that year’s costs still count in full: your figure of $90,000 a year and your budget’s $105,000 a year.`

**On the out-of-date family A, B, C, F and their waiting seats, the answers are named.** This is keyed by a field on `TypedBelowSurvivorFrame` (`names: 'none' | 'answers'`, set by the line family), never per host:
- charges: `In a working year with only one of you alive, that year’s costs count as $63,000 in this answer at your figure of $84,000 a year, and $78,750 in the answer at your spending of $105,000 a year.` (budget: `… in the answer at your budget’s $105,000 a year.`)
- whole gap: `In a working year with only one of you alive, that year’s costs still count in full: your figure of $90,000 a year in this answer, and your budget’s $105,000 a year in the answer at that budget.`

**Space:** `.note-parts__closing` goes from `--space-4` to **`--space-5`**, a token change only. That sits between the run gap and the block's 24px outer edge on the gate. `--space-6` or more ties or overshoots that edge (the motion seat's math, conceded by all). Re-run `verify:fit`.

**One-run lines keep the fold.** There are no runs to be mistaken for, and T showed no W9-R6 symptom.

The close keeps X, "at most" and [R] (glossed [RG] where it is the line's first rider: A, B, C, F and the waiting seats).

Out of scope here: B's, C's and F's "plus any income tax on taking it out" segment sentences remain the Tier 0 register entry's.

---

### Call (5): the gloss

**Ruled now:** a comma instead of brackets (brackets are not voiced), "once you’re on it" folded in, and no figure. The gloss rides each composed line's first rider only; "two" is spelled from `irmaa.value.magiLookbackYears` ("a year" when 1):
- `riderGloss`: **`, the extra Medicare premium you pay when your income two years before was high`** (14 words against 17)
- full: `…in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.`

**The figure is DEFERRED to a build item, never refused (D7: the gap is a build item and "high" is its stopgap).** The pilot files a register entry: *The rider's gloss names the Medicare surcharge line in dollars*. Its prescription:
- Read both lines through `irmaaScheduleAsCompared` over the line's own MAGI years. Take the LOWEST single line, rounded down to $1,000, and print the couple's line as twice it.
- Candidate words: `…when your income two years before was more than about $230,000 while you were both alive, or about $115,000 with only one of you alive`.
- Add a cross-surface law against `healthSheetChrome`'s step card (which reads its own year, the next step, at $100 grain).
- KD10 is repinned for about +17 words and +2 figures per glossed line.

Its NEGATIVEs:
- Never the raw `irmaa.tiers` ($218,000 / $109,000). This is the Hawk's and the architect's veto: two CPI years low, and it disagrees with the Healthcare sheet.
- Never the couple's line alone. The survivor close is under this gloss.
- **Never "for one of you alone":** every figure seat's words read as one spouse's own income while married.

---

### Worked examples (as they would render)

#### PN, the gate: 535 words / 31 figures (today 531/34 in the line, plus 67/4 in the separate moved note)

> Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year. You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two. A working year almost always costs at least your spending of $105,000 a year, so your answer can look better than it really is. At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. What each answer adds to your savings in each working year you’re both alive:
>
> 1. **2026 through 2028, while you’re still working**
>    The answer at your spending would add at most $5,985 a year. Your answer adds at most $16,985 a year.
>    At your spending, that’s $11,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.
> 2. **2029, while you’re still working**
>    At your spending, that working year, if you’re both alive, comes up $4,015 short, which would be taken from your savings, and the answer at that spending would add nothing.
>    Your figure leaves that shortfall out of your answer, which adds at most $16,985.
>    At your spending, that’s at most $21,000 less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.
> 3. **2030 through 2031, while you’re still working**
>    The answer at your spending would add at most $3,005 in 2030 and $3,368 in 2031. Your answer adds at most $16,985 a year.
>    At your spending, that’s $13,980 less in your savings in 2030 and $13,617 less in 2031, except for any difference between the two answers in income tax and Medicare’s income surcharge.
> 4. **2032, while you’re still working**
>    At your spending, that working year, if you’re both alive, comes up $3,652 short, which would be taken from your savings, and the answer at that spending would add nothing.
>    Your figure leaves that shortfall out of your answer, which adds at most $16,985.
>    At your spending, that’s at most $20,637 less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.
> 5. **2033 through 2035, while you’re still working**
>    The answer at your spending would add at most $5,985 a year. Your answer adds at most $16,985 a year.
>    At your spending, that’s $11,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.
>
> In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year. At your spending, that’s at most $15,750 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.

**Layout:**
- The moved clause sits as sentences 2–4 of the opening, after the counts sentence and before the lean and the cap sentence.
- No separate moved note is drawn.
- The gate door under the buttons: heading "To update your $84,000 figure" (unchanged); scope "Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can."; the route is unchanged.

**Per piece** (words / figures): counts 21/2; clause 24/1, 13/2, 20/1; lean 24/1; cap 27/2; lead 14/0; labels 7, 5, 7, 5, 7; run 1: 20/2 + 40/1; run 2: 30/1, 14/1, 26/1; run 3: 24/3 + 31/2; run 4: 30/1, 14/1, 26/1; run 5: 20/2 + 26/1; survivor 32/4 + 28/1.

#### PN, the answer page: 535 words / 31 figures (today 588/38)

The opening, in full:

> This answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year. You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two. A working year almost always costs at least your spending of $105,000 a year, so this answer can look better than it really is. At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. What each answer adds to your savings in each working year you’re both alive:

The runs and the survivor part are the gate's, with "This answer adds …" and "out of this answer".

#### T, the gate (one run, folded into one paragraph): 188 words / 12 figures (today 218/14)

> Your answer counts a working year at your own figure of $84,000 a year, below your spending of $90,000 a year. A working year almost always costs at least your spending of $90,000 a year, so your answer can look better than it really is. At your spending, your first working year would have $10,985 left over, so the answer at that spending would add at most $10,985 in any working year. Your answer adds at most $16,985 a year to your savings. At your spending, that’s $6,000 less in your savings in each working year you’re both alive, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high. In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. At your spending, that’s at most $4,500 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.

#### ST, the gate (the `same` kind, a budget source, the clause carried): 371 words / 17 figures (today 352/18 in the line, plus 67/4 in the note)

> Your answer counts a working year at your own figure of $90,000 a year, below your budget’s first year after work stops, which comes to $105,000 a year. You said all the money left over in a working year goes into your savings, when your first working year had $5,985 left over. At your figure of $90,000 a year, it has $20,985 left over now. So each working year adds at most $5,985 of its left over to your savings, the smaller of the two. A working year almost always costs at least your budget’s $105,000 a year, so your answer can look better than it really is. What each answer adds to your savings in each working year you’re both alive:
>
> 1. **2026 through 2028, while you’re still working**
>    Both answers add at most $5,985 a year.
>    At your budget, that’s the same in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.
> 2. **2029 through 2032, while you’re still working**
>    At your budget, each working year you’re both alive comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings, and the answer at that budget would add nothing.
>    Your figure leaves those shortfalls out of your answer, which adds at most $5,985 a year.
>    At your budget, that’s at most $10,000 less in your savings in 2029 through 2030 and $9,637 less in 2031 through 2032, except for any difference between the two answers in income tax and Medicare’s income surcharge.
> 3. **2033 through 2035, while you’re still working**
>    Both answers add at most $5,985 a year.
>    At your budget, that’s the same in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.
>
> In a working year with only one of you alive, that year’s costs still count in full: your figure of $90,000 a year and your budget’s $105,000 a year. At your budget, that’s at most $15,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.

The ST door scope: "Neither button on this page updates your $90,000 figure or what you said about the money left over; both lead to where you can." Flip (i) cures "the same … not including" here.

#### NL, the first run (and runs 2–3's third limit); NL gate line 524 / 24 (today 499/27 + 67/4)

The opening ends with the cap sentence: "At your spending, your first working year would come up $2,815 short, so the answer at that spending would add nothing in any working year." Then the lead.

> 1. **2026 through 2028, while you’re still working**
>    At your spending, each working year you’re both alive comes up $2,815 short, which would be taken from your savings, and the answer at that spending would add nothing.
>    Your figure leaves those shortfalls out of your answer, which adds at most $16,985 a year.
>    At your spending, that’s at most $19,800 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.

The typed side of runs 2 and 3: "Your figure leaves those shortfalls out of your answer, which adds at most $8,185 a year, all that’s left over at your figure in those years." (run 3: $8,548). Run 1 still restates the cap's $2,815: it is a list item stating its own pair, so it stays.

#### A, the stale survivor part (named answers): 80 / 5 (today 78/5)

> In a working year with only one of you alive, that year’s costs count as $63,000 in this answer at your figure of $84,000 a year, and $67,500 in the answer at your spending of $90,000 a year. At your spending, that’s at most $4,500 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.

#### B, the stale survivor part (and the end of B's waiting seat): 80 / 5 (today 78/5)

> In a working year with only one of you alive, that year’s costs count as $63,000 in this answer at your figure of $84,000 a year, and $78,750 in the answer at your spending of $105,000 a year. At your spending, that’s at most $15,750 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.

C and F take B's words. B's, C's and F's run sentences ("$3,652 to $4,015 short") take call (1)'s amount rule from their own per-year figures.

---

### Predicted KD10 counts (repinned by hand; each one a reviewed number)

| Host | Today | Ruled |
|---|---|---|
| PN gate, the line | 531 / 34 (+ the moved note's 67 / 4) | **535 / 31** (clause inside, no note) |
| PN answer page, the line | 588 / 38 | **535 / 31** |
| T gate, the line | 218 / 14 | **188 / 12** |
| TM / CR gate, the line | 386 / 25 (+ 67 / 4) | 423 / 25 |
| ST gate, the line | 352 / 18 (+ 67 / 4) | 371 / 17 |
| NL gate, the line | 499 / 27 (+ 67 / 4) | 524 / 24 |

The page before the first button (the door scope sits under the buttons, so it leaves this count):
- PN about **607 / 35** (670 / 42)
- NL about 596 / 28 (638 / 35)
- TM and CR about 495 / 29 (525 / 33)
- ST about 443 / 21 (491 / 26)
- T about 260 / 16 (290 / 18)
- A 405 / 30
- B 382 / 23
- C 475 / 27
- F 479 / 29

**The wall is REDUCED, NOT CURED.** PN still sits about 80 words over walk 8's tolerated 400–530. The record must not call flip (ii)'s wall answered. The biggest remaining repeat is the settled rider (15 words × 7 on PN). It is the next lever, and a council's.

---

### Flip conditions (the chair's own words, every conjunct)

**F1, credit-run paragraphs.**
- **Trigger:** any one walk-10 seat ties $5,985 to "your answer", OR ties $16,985 to "the answer at your spending", inside a credit run's first paragraph.
- **Action:** credit runs go back to one sentence per paragraph (KD4's three).

**F2, the wall.**
- **Trigger, BOTH conjuncts:** (a) at least two of walk 10's three PN seats (the phone seat, wide-PN, the listener) still call PN's list a wall; AND (b) all three of those seats still restate both draws from savings ($4,015 in 2029 and $3,652 in 2032).
- **Action:** a council reconvenes on the rebuild spec's base-pair fallback, and on the rider's repetition. This is a framing fork, never auto-shipped.
- If (b) fails (a draw is missed), the three beats on short runs stand and the cure is sought elsewhere.

**F3, the floor (W8-R8 regression).** Walk 10 must seat T, CR and PN.
- **Trigger, EITHER:** (a) any one seat on T, CR or PN reads a close's "$X a year less" as the whole size of the lean; OR (b) any one seat stops on the lean sentence the way eight stopped on the aside.
- **Action:** the floor becomes its own short sentence placed immediately after the cap sentence (with no cap sentence, after run 1's first sentence): `A working year almost always costs at least that $105,000.` The lean sentence then drops its floor half, and its "so your answer can look better than it really is" rejoins the counts sentence. The floor is said once.
- W9-R8's honest-date build (after walk 10) is the structural cure for the magnitude reading either way.

**F4, the labels.**
- **Trigger, EITHER:** (a) any one seat still names a run's last year as the household's planned stop ("do we stop in 2028?"); OR (b) at least two seats call the repeated ", while you’re still working" noise.
- **Action:** labels go to bare years, and the condition moves into the lead once: `What each answer adds to your savings in each year you’re still working and both alive:`.
- **Separate trigger:** if a crowned household's seat reads runs past its date as the app doubting the plan (W8-R6 again), reconvene; the condition alone did not hold it.

**F5, the survivor part's separation.**
- **Trigger:** any one eye or CVD seat on a multi-run line still reads the survivor part as one more run.
- **Action:** the closing's gap goes to `--space-6`, AND `div.note-parts`' outer margin rises to `--space-6` in the same edit, AND `verify:fit` re-runs. Never the first change without the other two.
- **Separate trigger:** any one T seat folds the survivor part's $4,500 into the both-alive $6,000 story.
- **Action:** one-run lines draw the survivor part as its own closing paragraph.

**F6, the gloss figure.**
- **Trigger:** any one seat asks how high "high" is, OR guesses a threshold.
- **Action:** the register build ships before the next walk.
- It is owed regardless (D7). The triggers only move its rank.

**F7, the named answers.**
- **Trigger:** any one A, B, C or F seat still cannot say which two answers "the two answers" are.
- **Action:** the rider's clause on that line family names them ("between this answer and the answer at your spending"), as a reviewed exception to the one constant.

---

### Build notes (the pilot's)

**Grep every caller of the composer** (landmine b9-9/10):
- the e2e PAY_CHECK_UNLOCKS
- the coordinate-tap arm
- caddie intake:typedbelow
- `typedBelowTaxRider.test.ts`
- `reentry.test.tsx`
- `IntakeApp.test.tsx`
- `resultPayCheckLine.test.tsx`

**Repin:**
- KD10 (`:2255-2318`)
- floorLaw (retire it; it becomes a law that the lean names the quote in dollars immediately before the first spending-side figure on every host)
- labelLaw
- survivorLaw
- densityLaw (two-paragraph credit runs)
- copyGuard's survivor sweep (`:1626-1634`, which matches the old opener)

**Add to RETIRED_EVERYWHERE:**
- `If only one of you is alive in a working year`
- `, the least a working year almost always costs,`
- `not including any difference between the two answers`
- `(the extra premium Medicare charges once you’re on it`
- on the typed-below line only: `If you’re still working in` (the ledger keeps it)

**Before building:**
- Grep the retired list first: no word here revives "plus", "In such a working year" or the old rider.
- Credit sentences stay unconditioned. "while you’re still working" lives on the LABEL only.

**Every fence holds:**
- the close is said from the spending side
- `stillShortDifferenceDollars`
- the survivor part's X is the death path's only bound
- R14's method rows
- one host-noun Record
- `<ol role=list>`, with no motion

**R12 holds:** nothing reads a crown, and W9-R8's honest date lands as its own element in the reveal's frame, never inserted above the line after paint.

**Dissent and the override, for Briggsy's sanity check:**
- **(2)** The red team says the lean in dollars is walk 8's failed form plus a figure; F3 is the hold.
- **(5)** Four firm seats (the Hawk, the architect, the advocate, the fiduciary) wanted the figure named now. The chair deferred it to a build. Their seats disagree on year and grain, and all four wrote "for one of you alone", which misreads as one spouse's own income.

---

## Units

- **U1 (docs, this spec's commit).** This file; the council-log row; the register entry *The rider's gloss names the Medicare
  surcharge line in dollars* (call (5)'s build, with its NEGATIVEs).
- **U2 (one commit: one composer feeds every host, so every pin moves together).** Calls (1)–(5) with flips (i) and (iii): the one
  order and `composeReentry`'s host Record (the clause computed before every early return, the `ownNote` fallback, the test on all
  three arms), the gate door's scope variant, the restatement predicates, the two-paragraph credit runs and `same`'s merged
  sentence, the amount rule and its property test, NL's third limit, the lean's own slot and its host forms, the cap sentence
  without the quote's dollars, T's twin, the one label form, the survivor opening and its named-answers frame field,
  `--space-5`, the comma gloss. Every law in the Build notes repinned with a plant that reds first; KD10 repinned by hand from
  the line probe and its new numbers said in the commit message.
- **U3.** The walk-9 card's remaining lows: R9 (1)–(2) B's and C's method lines in place (R14 holds), (3a) B's two pronouns,
  (5) "this answer" on TM's sheet and step 14. (The `:1418` / `:1183` docblock rides U2's amount rule.)
- **Then** W9-R7, its own plan (`docs/plans/features/answered-draft-build-spec.md`), and then **walk 10** on the changed strings:
  walk 9's targets; seats on T, CR and PN (F3) and the phone seat, wide-PN and the listener on PN (F2); every flip above tested; at
  Briggsy's NEW viewport, 1440×731 at DPR 2 (measured in his Chrome 2026-11-19), so the fit gate and the capture harness are
  re-pointed to it first.

## Verification contract (every unit)

TODO's close block "The review's gates", with two changes since the Dell died (2026-11-19): heavy runs go UNPINNED and one at a
time on the Lenovo (`docs/landmines.md`, Windows and the shell, "THE LENOVO"), and the re-anchor classifier its step 3 names did
not survive, so classify each `pnpm doc:reanchor` dry-run move by hand (every move must be a line shift the diff explains) until it
is rebuilt. Before U2: read `docs/landmines.md`'s The fit gate and e2e, The mutation harness, Copy and copyGuard, Windows and the
shell, and Probes and measurement sections; grep `e2e/` for every slot U2 renames or retires; load the four UI design skills
(U2 changes `noteParts.css`). The sweep and the per-key idcheck are not called: no unit touches `src/engine` or `intakeMap`.
