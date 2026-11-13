---
title: "The typed-below line over the whole working window - Plan"
type: fix
date: 2026-11-13
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# The typed-below line over the whole working window - Plan

## Goal Capsule

- **Objective:** a still-working couple who typed a working-year figure below their own spending, and said all their left-over pay goes into savings, can read on the Result, the re-entry gate and the details sheet how much more their answer adds to their savings than the answer at their own spending would, in every working year, in the engine's own dollars. No year goes unnamed and no figure is undersized.
- **Means:** one every-year field on the money picture and one shared engine credit rule (KTD1, KTD2); the typed-below composer reads both pictures year by year and groups the years into spans (KTD3, KTD4); the words take the shape council `wf_f74697d1-f2e` ruled (KD1, KD2).
- **Authority, in order:** council `wf_f74697d1-f2e` (2026-11-13; the metric and the shape, with its dissent); the parent plan `docs/plans/features/working-year-surplus-build-spec.md` (R1–R16, KTD1–KTD17, its NEGATIVE list); the earlier rulings this line already carries (council `wf_7fa86902-35c` on the clause words, council `wf_22858e04-f7a` on the parts form, Briggsy's 2026-11-09 verb ruling, "update"); `docs/architecture.md` on every invariant; then this plan. Where this plan and a ruling disagree, the ruling wins and the plan is the defect.
- **Stop conditions:** stop the line and fix before going on if:
  - any engine run moves: a sweep key's `provisional`, `final` or `preview`, or the credit stream (`stream.mts`), on any key;
  - a spine key moves at all, or a date key moves anywhere but the picture's new field;
  - W's stale line, or B's waiting seat outside V8's one planned sentence, changes words on any seed;
  - a composed credit disagrees with the overlay's `creditComposed` on a pinned witness;
  - the line prints a dollar figure that no engine function produced (a figure carried forward from a listed row, or re-derived from the gap).
- **Execution profile:** ordered commits on `main` (the project ships no PRs). Commit 1 is U1 + U2, dark engine work. Commit 2 is U3, a dark intake read with its engine pins. Commit 3 is U4 + U5 + U6: the words, the hosts, every pin and gate, the e2e specs and the docs, together, so no commit leaves a spec reading old words. Every `src` commit runs the Verification Contract.
- **Who finishes:** the pilot, across sessions. Each build unit's session opens with `/brief <that unit's topic>`. The words ship flagged for Briggsy under the batched-oracle law. After the build, the flow owes the whole-file review (an adversary, every finding verified), a mutant pass, the sweep and idcheck, `verify:fit`, `doc:reanchor` last; then walk 8 (the same 14 targets as walk 7) and its card, which clears walk 7's held R1.

---

## Product Contract

### Summary

The typed-below line stops sizing year 0 alone. For each working year it puts this answer's credit beside the credit the answer at today's spending would give, both "at most", and names every run of years where that pair holds, in time order. A run of years that comes up short at the spending names its shortfall and the whole yearly difference. One run reads as plain sentences; two or more draw as labelled parts, on all three hosts.

### Problem Frame

U11 walk 6 found that a household can type its old working-year figure back in below today's spending and have the stored "All of it" credited whole, with no screen saying so. Walk 6's fix round added the typed-below line, and walk 7's added what it does in short years and in year 0. The round review of walk 7's fix round (`docs/backlog.md`, the Tier 0 entry *A figure typed below today's spending clears W's stale line for good…*, its round-review bullet) then found the line year-0-centric. It sizes the lean once ("That year, this answer adds $6,000…"), names only the first later run of short years, drops runs entirely when year 0 at the spending is exactly $0, hides a credit when a run straddles the gap, rounds the spending and the typed figure apart, and states a floor as exact.

Council `wf_f74697d1-f2e` then found the review's own fix measured the wrong thing. The review sized the lean as x_t = (credit at the typed figure) − (print at the spending). The lean that moves the answer is the gap between the two answers' credits. The answer at the spending is capped at its own year-0 print, so its credit stays at that cap while pay rises. On A (`datesavedtyped`), x_t says 2033 and 2034 add nothing, while the engine credits $16,985 against the honest answer's $10,985, the same $6,000 as every other year. On TM (`datesavedtypedmoved`), x_t says $762 in 2033–2034, where the gap is $11,000. Walk 6's measurement (`docs/backlog.md`, the entry's ⚑ MEASURED bullet) and R1's founding docblock in `src/ui/copy.ts` already used the pair; the review switched without saying so.

### Requirements

**Every figure from the engine**

- R1. Every dollar figure the line prints is an engine output or arithmetic on printed engine figures: each working year's printed bottom line at the typed figure and at today's quote (the money picture's every-year field, KTD1), and each year's credit for both answers from the engine's one credit rule (KTD2). No figure is re-derived from the gap, and no unlisted year borrows a listed row.
- R2. Every engine run stays byte-identical. The new field is output only, and the credit rule's extraction changes no credit.

**What the line says**

- R3. For each working year the line compares this answer's credit with the credit of the answer at today's quote, never a credit against a print (KD1).
- R4. Every year of the picture's window lies in exactly one span. A span ends where either answer's credit changes value without drifting under one binding term, or where the year's kind changes (KTD3). Every span is named, in time order, on all three hosts; a span that recurs later is its own span.
- R5. Each credit is said with "at most". No span carries a "still working" condition, and no span is cut at a crowned stop: an "at most" figure stays true past the crown, on a path where someone has died, and where the quote leaves a cost out (KD3). The "comes up … short" sentences stay facts of the picture at the quote.
- R6. A span that comes up short at the quote names its shortfall there and what this answer does at the typed figure (left over, still short, or exactly $0), each in its own words (KTD7), and gives the span's whole yearly difference as one figure.
- R7. One span reads as plain sentences. Two or more draw as note parts, one segment per span, the span's years as its label (KD2, KTD6).
- R8. One fact per dollar sentence, no "so"-chains, and at most two sentences per span; a test checks every witness (KD2).
- R9. The line names the typed figure yearly, "your figure of $84,000 a year" (V12), and the quote by its source, "your spending of $90,000 a year" or its budget twin (V7), on every host.
- R10. B's waiting seat ends on year 0 as the reason nothing is added (V8): "Because your first working year, 2026, comes up short at that cost, updating to $105,000 or more won't add any, but it puts those shortfalls into your answer."

**What does not move**

- R11. W's stale line, B's waiting seat's run and every word either says outside R10 stay byte-identical (KTD5).
- R12. The line is a pure function of the draft: it reads no crown and no outcome, so the Result draws the same line on the provisional and the final tier (KTD4).

### Key Decisions

- KD1. **The pair, never x_t.** Council `wf_f74697d1-f2e`, 7/10, nine seats and the red team, no abstentions; the Honesty Hawk vetoed x_t and the verdict ships its honest alternative. Governs R3, R5.
- KD2. **One sentence per span on all three hosts, strict time order, parts at two or more spans, density per sentence.** The window total (S2), S1 plus a total (S3) and a short form on the Result with the detail on the sheet (S4) were rejected unanimously: a total sums years the crowned plan may never work and hides a span that comes back (insights 141, 103); couples leave from the Result, so S4 is a cut under D7. ⚑ Council-flagged as yours-to-close, executed, read by walk 8: the parts form at two or more spans, strict time order with repeated spans, the span words and labels, the short span's whole yearly difference as one figure. Governs R4, R6, R7, R8.
- KD3. **"At most" on both credits retires "at least" and the working-years condition.** Walk 3's (aw)(a) condition law covers claims that need someone working to be true; an upper bound does not. Governs R5.
- **Dissent (the minimalist, with the fiduciary seat).** Keep one string: one flat pair true across the window ("It adds at most $16,985 a year. At $90,000 a year it would add at most $10,985 a year, $6,000 less."), then only the spans where the honest credit dips or a year runs short; file the parts form for walk 8. **It flips** if walk 8 reads TM's multi-span line as clear rather than a wall, the drift household shows few spans, and readers do not carry TM-at-$95,000's "$1,000 less" across its $11,000 years.

### Scope Boundaries

- W's stale line keeps today's read and words. Its own copy of V3 (only the first later short run is named) and its `resumesFrom` read are filed to the register (U6), not built here.
- The stamp question stays the Tier 0 entry's prescription (2), its council's call. U6 appends there that the crowned date leans on the window's later years: later candidates credit them, so the over-credit can only move a crown earlier.
- The money picture's drawn rows (`src/intake/WorkingYearLedger.tsx`) do not change; nothing draws the new field.
- **Considered, not built:** reading the crowned stop (the gate composes before any run, and the outcome is two-track; it would fork one composer three ways, insight 081); a death-frame sentence (the "at most" pair is true on a death path); a window total (KD2). Evidence that would change the call: walk 8 readers who take a span past their date as money they will get.

#### Deferred to Follow-Up Work

- Walk 8 and its card, the step after this build.
- The register items U6 files: the stale line's V3 hole and `resumesFrom`, and the crown note on prescription (2).

---

## Planning Contract

### Key Technical Decisions

- KTD1. **The every-year field.** `WorkingYearLedger` gains `workingYears`: a readonly array index-aligned with sim year t, one entry per working year of the window (0..span − 1), each `{ yearsIn, calendarYear, bottomLine, cash }` in year 0's own field words and grain. The producer already composes every year (`years[t].lines.cash` in `src/engine/workingYearLedger.ts`); the field is a map over them through `workingYearBottomLine`. Entry 0 equals `year0.bottomLine` and `year0.cash` (pinned). The ledger is never persisted and never on the worker wire (`src/shared/model.ts`, the type's header), so no schema moves.
- KTD2. **One credit rule.** R8's rule moves out of the overlay's year loop (`src/engine/taxOverlay.ts`, the build-2 credit block after the check composes its lines) into one exported pure function in `src/engine/moneyGrain.ts`, the grain leaf both the overlay and intake can import. It takes a year's cash, year 0's print, the stored figure and whether everyone is alive, and returns the credit the overlay credits today (0 at or below $0). The overlay calls it; the extraction must leave every credit `Object.is` today's (the credit stream and the sweep prove it). Intake calls the same function per picture year. The picture is composed before the answer (`buildDateInputBeforeLeftOver`), so it cannot carry the stored figure; intake supplies it, and the rule still has one home (the council's E2).
- KTD3. **The span model.** Each window year gets one kind from a closed set, keyed by an exhaustive `Record` (insight 147):
  - `bothCredit`: this answer credits at least $1, and so does the answer at the quote;
  - `quoteCreditsNothing`: this answer credits at least $1; the answer at the quote credits nothing in a year that is not short there (its question goes unasked: year 0 at the quote below $1, R5's gate);
  - `shortLeftOverAtTyped`: short at the quote, at least $1 left over at the typed figure;
  - `shortStillShortAtTyped`: short at both;
  - `shortEvenAtTyped`: short at the quote, exactly $0 at the typed figure (credits nothing, draws nothing);
  - `same`: both answers credit the same and draw the same (a typed figure cents below the quote). It is read first, ahead of every other kind.
  Adjacent years join one span when their kind matches and, for each answer, the credit is the same dollar figure or both years' credits are bound by the year's own left over (a drift). The binding term is the smallest term of the rule; a tie counts as bound by both terms; cash and print count as one term, "the year's own left over". There is no tuned ratio. A range ("$X to $Y") appears only inside a drifting span (KD2's split rule, the council's (2)).
- KTD4. **Two pictures, read from the draft alone.** The typed-figure picture is `workingYearLedgerForRun(d)`; the quote's is `workingYearLedgerForRun(writeConfirmedWorkingYearCost(d))`, memoized on the source draft as `checkAtQuoteMemo` already is (the re-confirmed draft is a fresh object every call). This answer's cap is year 0's print at the typed figure; the quote answer's is year 0's print at the quote, and it credits nothing where that is below $1. The composer reads no outcome, so one composer serves the gate (which composes before any run), the Result and the seat.
- KTD5. **Fork, not rebuild.** The typed-below line gets its own whole-window read beside `checkAtQuote`. `checkAtQuote`, `laterShortOf`, `shortRunFrom`, `quoteLeavesNothing` and every word of W's stale line stay as they are. Rebuilding that core would change words on `datesavedrisen`, `datesavedrisenshort`, `datesavedrisenlater` and `datesavedfourbuckets` that this plan does not scope, and computing `resumesFrom` from every year would add a gain-years sentence off the seeds. Their existing pins (`e2e/vertical-fit.spec.ts` RISEN_LINE family, `e2e/caddie-walk.spec.ts`, `src/ui/__tests__/devSeeds.test.ts`, `src/intake/__tests__/workingYearLeftOver.test.ts`'s `shortRunFrom` / `laterShortOf` arms) prove they did not move.
- KTD6. **The line returns parts.** `workingYearCostTypedBelowLine` returns `NoteParts` (`src/ui/noteParts.ts`): the opening (the counts sentence and its lean; on the Result where it holds the slot, the moved clause), then one segment per span. One span folds into the opening as plain text, so `isPlainNote` holds and every host draws today's single paragraph. The opening's own credit sentence (`workingCostTypedBelowAdds`) retires wherever spans speak: each span states this answer's credit, and one cap said twice read as a math error (walk 7's R3 (c)). The seat's line (`workingYearLeftOverAtQuoteLine`) returns the spans alone, behind a short lead when there are two or more. The hosts:
  1. The Result's standing slot draws the parts through its existing `NotePartsBlock` branch, and that branch passes the button whenever `onOpen` is set (`src/ui/FuckOffDate.tsx`: today it drops the button when the parts carry no door, and the typed-below line never carries one).
  2. The gate pushes `{ text, parts }` for the typed-below line (`src/ui/reentryChrome.ts`), as it already does for W's stale line.
  3. The seat (`src/intake/WorkingYearLeftOverQuestion.tsx`) draws `NotePartsBlock` below the radios, a plain paragraph for one span. Nothing above the radios reads the answer (R6).
- KTD7. **The span words (drafts; council-flagged, walk 8 reads them).** "This" on the Result, "Your" on the gate and seat, lower-cased mid-sentence. A one-span line opens its first sentence with "Each working year,"; a segment's label is its years ("2026 through 2028", "2029"). "Your spending of $Q a year" becomes `workingCostQuoteBudget`'s words where the quote is the budget's first year after work stops.

  | Kind | First sentence | Second sentence |
  |---|---|---|
  | `bothCredit` | This answer adds at most $16,985 a year to your savings. | At your spending of $105,000 a year, it would add at most $5,985, $11,000 less. |
  | `quoteCreditsNothing` | This answer adds at most $16,985 a year to your savings. | At your spending of $110,985 a year, it would add nothing, $16,985 a year less. |
  | `shortLeftOverAtTyped` | At your spending of $105,000 a year, each comes up $3,652 to $4,015 short, and this answer would add nothing. | Your figure of $84,000 a year leaves those shortfalls out of this answer, and it adds at most $16,985 a year to your savings, at most $20,637 to $21,000 a year more. |
  | `shortStillShortAtTyped` | At your spending of $105,000 a year, each comes up $4,015 short. | At your figure of $101,000 a year, each still comes up $15 short, and this answer takes $4,000 a year less from your savings. |
  | `shortEvenAtTyped` | At your spending of $Q a year, each comes up $S short. | At your figure of $T a year, each leaves nothing over and nothing short, and this answer takes $S a year less from your savings. |
  | `same` | This answer adds the same to your savings as it would at your spending of $Q a year. | (none) |

  One-year spans say "it comes up", "that shortfall". The seat's lead at two or more spans: "What this answer adds to your savings in each working year:". The clause "leaves those shortfalls out of this answer" is council `wf_7fa86902-35c`'s ruled wording; "takes none of those shortfalls" stays struck.
- KTD8. **The sweep's new baseline.** U1 moves exactly the 20 pictured date keys of `sweep-walk5.json`, inside `picture.workingYears` only. The proof is per key: strip `picture.workingYears` from each candidate record and compare to `walk5` (the three newest seeds, `datesavedtyped`, `datesavedfourbuckets`, `datesavedtypedmoved`, to `sweep-walk7round2.json`), compare `provisional`, `final` and `preview` whole, and keep all 21 spine-and-`datesolo` keys identical. `idcheck.mjs` gains a strip option for this (the tools folder, outside the repo). The new baseline is named `wholewindow` and recorded in the build-2 README's table with each moved key's reason; walk7round2 goes into that table too. U2 adds the credit stream (`stream.mts`, regenerated from a frozen `head\` copy) as its byte-identity proof.
- KTD9. **The copy gates.** Each new slot gets a `SLOT_RENDER` sample and a numeral-sentinel entry by hand. R16's `LEFT_OVER_STRINGS` gains the span slots by name, never the bare `workingCostTypedBelow` prefix: the counts slots end on "can look better than it really is", which its ban reds. `RETIRED_EVERYWHERE` and `HAWK_BAN` gain a sweep over the composed lines (Result, Result with the moved clause, gate, seat) of every witness; no composed typed-below line is swept today.

### High-Level Technical Design

```mermaid
flowchart TB
  D[draft] --> PW[picture at the typed figure: workingYears]
  D --> RQ[draft re-confirmed at the quote] --> PQ[picture at the quote: workingYears]
  PW --> CW[this answer's credit per year: the one credit rule, cap = year 0 at the typed figure]
  PQ --> CQ[the quote answer's credit per year: the one credit rule, cap = year 0 at the quote, none below $1]
  CW --> K[each year's kind: closed Record]
  CQ --> K
  PW --> K
  PQ --> K
  K --> S[spans: join on same kind and same or drifting credits]
  S --> P[NoteParts: opening + one segment per span; one span folds into the opening]
  P --> R[Result slot] & G[gate line] & T[seat, below the radios]
```

The witnesses' spans, every figure the engine's own (sourced cell by cell in the research record, Sources):

| Witness | Spans (years: kind, this answer vs the quote answer) |
|---|---|
| A, `datesavedtyped` | 2026–2035: bothCredit, $16,985 vs $10,985 (one span, plain) |
| PA (A in Pennsylvania) | 2026–2035: bothCredit, $16,064 vs $10,064 (one span) |
| TM, `datesavedtypedmoved` | 2026–2028 bothCredit $16,985 vs $5,985 · 2029–2032 shortLeftOverAtTyped, $3,652–$4,015 short, $16,985 credited · 2033–2035 bothCredit $16,985 vs $5,985 |
| TM at $95,000 spending | 2026–2028 $16,985 vs $15,985 · 2029–2032 $16,985 vs $5,985 to $6,348 (a drift) · 2033–2035 $16,985 vs $15,985 |
| C plus Sam's pension at 64–65 | 2026–2028 · 2029 short · 2030–2031 $16,985 vs $3,005 to $3,368 · 2032 short · 2033–2035 (five spans) |
| C at $110,985 spending | 2026–2028 quoteCreditsNothing · 2029–2032 shortLeftOverAtTyped · 2033–2035 quoteCreditsNothing |
| C typed at $101,000 | 2026–2028 $9,985 vs $5,985 · 2029–2030 shortStillShortAtTyped · 2031–2032 shortLeftOverAtTyped, $348 · 2033–2035 $9,985 vs $5,985 |
| C at $7,916.67 a month | every span $9,999 a year apart, 2035 included (credits, not prints: the print artifact of $10,000 in 2035 disappears) |
| C at $8,749.99 a month | one `same` span |

### Assumptions

- The span label is its years alone ("2026 through 2028"); the condition-free "at most" grammar needs no head-noun scope beyond them (KD3).
- A tie between the cap and a year's own left over counts as both, so a drifting span keeps the year where the cap equals the print (the drift household reads as two spans, 2026–2032 and 2033–2035); U3's drift witness confirms it before U4 words it.
- The fit gate's new arm runs on a dev seed for the pension household, keyed `datesavedtypedpension` (built from `datesavedrisenlater` plus the pension and the $84,000 retype, as the research probe builds it).
- Under a moved left over on the Result, the moved clause keeps its cap sentence and each span still states its own credit, since a span's credit can drift below the cap. Walk 8 reads whether that repeats the cap (walk 7's R3 (c)).

### Sequencing

U1 → U2 → U3 → U4 → U5 → U6, in three commits (the Goal Capsule). U3 is dark: nothing draws its read until U4. U4, U5 and U6 land together because the e2e specs and the caddie arm pin the words U4 writes.

---

## Implementation Units

### U1. The money picture's every-year field

- **Goal:** the picture returns each working year's printed bottom line and cash (KTD1).
- **Requirements:** R1, R2.
- **Dependencies:** none.
- **Files:** `src/shared/model.ts`, `src/engine/workingYearLedger.ts`, `src/engine/__tests__/workingYearLedger.test.ts`, `src/ui/__tests__/devSeeds.test.ts`.
- **Approach:**
  1. Add the field and its docblock in the type's existing words ("Signed whole dollars, by year 0's rule").
  2. Emit it from the producer's `years` loop through `workingYearBottomLine`; no new import.
  3. Extend `expectMatchesTheRun` to check every year's `cash` `Object.is` the run's own composed cash, and its print as `workingYearBottomLine` of it.
- **Patterns to follow:** `year0.bottomLine` / `year0.cash`; `expectFiniteAndSigned` already walks any `bottomLine` path.
- **Test scenarios:**
  - On `datesavedtyped`, `workingYears` has 10 entries, 2026–2035, entry 0 equal to `year0`'s print and cash.
  - On the drift household (`datesavedrisen` plus Sam's $10,000 nominal-flat alimony), the unlisted years 2027–2030, 2032 and 2034 print what the run composes ($26,693 … $25,722 at the typed figure), never the listed year before them.
  - On every W seed, each entry's cash `Object.is` the run's `checkComposed` cash for that year.
  - The import allowlist test passes unchanged.
- **Verification:** the sweep moves only the 20 pictured date keys, only in `picture.workingYears` (KTD8).

### U2. One credit rule

- **Goal:** R8's credit rule lives in one exported engine function that the overlay calls, with every credit unchanged (KTD2).
- **Requirements:** R1, R2.
- **Dependencies:** U1 (same commit).
- **Files:** `src/engine/moneyGrain.ts`, `src/engine/taxOverlay.ts`, `src/engine/__tests__/moneyGrain.test.ts` (new, or the grain's existing test file), `src/engine/__tests__/workingYearCredit.test.ts`.
- **Approach:** an extract-function refactor: the overlay still records year 0's print at t = 0 and calls the function for each checked year. The leaf keeps importing nothing (its source test).
- **Execution note:** prove byte identity on a frozen `git archive` HEAD copy before trusting the tree (insight 148): the credit stream's SHAs per key equal HEAD's.
- **Test scenarios:**
  - A cash of $1,644.996 credits $1,644.996, not the $1,645 print (the raw cash joins the min).
  - A short year credits 0; a year with someone dead credits 0.
  - The cap binds at the stored figure, at year 0's print, and at the year's own print, each on a hand-built case.
  - `workingYearCredit.test.ts`'s R8-by-hand arms stay green unedited.
- **Verification:** the credit stream equals HEAD's on all 13 W keys and both tracks; the sweep's `provisional`, `final` and `preview` are identical on every key.

### U3. The whole-window read

- **Goal:** intake reads both pictures and both answers' credits for every window year and groups them into spans (KTD3, KTD4), dark.
- **Requirements:** R1, R3, R4, R12.
- **Dependencies:** U1, U2.
- **Files:** `src/intake/workingYearLeftOver.ts`, `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/engine/__tests__/workingYearCredit.test.ts`.
- **Approach:**
  1. A new read beside `checkAtQuote`, memoized on the source draft, returning the window's spans (or `null` where the line reads none, under the same predicates `typedBelowCarried` uses today).
  2. Each year's credits come from U2's function; nothing re-types a `min`.
  3. The kinds are an exhaustive `Record`; a new kind fails to compile until every reader handles it.
- **Execution note:** test-first. Probe each constructed witness through the shipped producer before pinning a figure; print the read on each witness before typing a by-hand expectation.
- **Patterns to follow:** `checkAtQuoteMemo`; the `CheckWords` and `TypedBelowAtQuote` Records.
- **Test scenarios:**
  - A: one `bothCredit` span, 2026–2035, $16,985 against $10,985.
  - TM: three spans, the 2033–2035 span `bothCredit` at $16,985 against $5,985 (the year x_t called $762).
  - TM at $95,000: three spans, the middle one a drift of $5,985 to $6,348 at the quote.
  - The pension household: five spans, 2029 and 2032 each its own short span.
  - C at $110,985: `quoteCreditsNothing`, short, `quoteCreditsNothing`.
  - C typed at $101,000: the straddle splits 2029–2030 (`shortStillShortAtTyped`) from 2031–2032 (`shortLeftOverAtTyped`, $348).
  - A `shortEvenAtTyped` year: C typed where a short year prints exactly $0 at the typed figure (about $100,985; probe for the figure).
  - A `whole` household whose lean starts after year 0, constructed and probed.
  - The drift household: the spans the tie rule gives (the Assumptions' two), probed.
  - C at $8,749.99 a month: one `same` span. C at $7,916.67 a month: every span $9,999 apart, 2035 included.
  - Every span list covers every window year exactly once, on every witness.
  - The engine pin (the council's E3): the read's per-year credit for each answer `Object.is` the overlay's `creditComposed` on the typed-figure run and on the run with W confirmed at the quote, for A 2033–2035, TM 2029–2035, the drift household and $7,916.67 a month (`src/ui/__tests__/devSeeds.test.ts`'s `creditComposed` arm is the template).
  - The line's read is the same object on a draft whatever outcome the Result holds (no crown read).
- **Verification:** every test above green; the sweep unchanged from U1's baseline (U3 composes nothing the sweep records).

### U4. The words

- **Goal:** the typed-below line, its gate twin and the seat's line speak the spans (KTD6, KTD7), and B's waiting seat names year 0 as its reason (R10).
- **Requirements:** R3–R10.
- **Dependencies:** U3.
- **Files:** `src/ui/copy.ts`, `src/intake/workingYearLeftOver.ts`, `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/intake/__tests__/assumptionPanel.test.tsx`, `src/intake/__tests__/workingCostStep.test.tsx`, `src/ui/__tests__/devSeeds.test.ts` (seed witnesses).
- **Approach:**
  1. New span slots in KTD7's words; retire `workingCostTypedBelowYearExtra`, `workingCostTypedBelowShortCredit`, `workingCostTypedBelowShortLess`, `workingCostTypedBelowAtQuoteLeftOver`, `workingCostTypedBelowAtQuoteNone`, `workingCostTypedBelowAtQuoteShort` and `workingCostTypedBelowAtQuoteLaterShort` with their last reader.
  2. `workingYearCostTypedBelowLine` and `workingYearLeftOverAtQuoteLine` return parts (KTD6); the opening's credit sentence retires where spans speak.
  3. The typed figure reads "your figure of $84,000 a year" wherever the typed-below family names it: the spans, `workingLedgerLeftOverFigureAt`, its rose and fell twins, `stalenessLeftOverMovedAt`, `stalenessLeftOverClauseAt` (R9).
  4. `workingLedgerLeftOverWaitingShort` ends on R10's sentence; its run comes from `quoteLeavesNothing` unchanged.
- **Test scenarios:**
  - By hand, the whole composed line (Result, Result with the moved clause, gate, seat) on A, TM, TM at $95,000, the pension household, C at $110,985, C typed at $101,000, and the budget twin. A copy plant inside a slot is killed only by words typed out.
  - A one-span line is a plain note (`isPlainNote`); a two-span line has one segment per span with its years as the label.
  - The density test: across every witness, no sentence holds two "so"s, no span holds more than two sentences, and every sentence with a dollar figure states one fact (a pair with its difference counts as one).
  - The seat's line and the Result's spans agree word for word apart from "This" / "Your" (the one-composer identity test, re-pinned to the parts).
  - B (`datesavedrisenshort`): the waiting seat ends on R10's sentence; every other waiting arm's words are unchanged.
  - W's stale line on `datesavedrisen`, `datesavedrisenshort`, `datesavedrisenlater` and `datesavedfourbuckets` is byte-identical (KTD5).
  - A monthly-typed W names "your figure of $84,000 a year", never "your $84,000 figure".
- **Verification:** the typecheck reds on any retired slot still read; every test above green.

### U5. The hosts and the browser gates

- **Goal:** the three hosts draw the parts, and the browser gates read them (KTD6).
- **Requirements:** R7, R9.
- **Dependencies:** U4 (same commit).
- **Files:** `src/ui/Result.tsx`, `src/ui/FuckOffDate.tsx`, `src/ui/IntakeApp.tsx`, `src/ui/reentryChrome.ts`, `src/intake/WorkingYearLeftOverQuestion.tsx`, `src/ui/devSeeds.ts`, `src/ui/__tests__/reentry.test.tsx`, `src/ui/__tests__/resultPayCheckLine.test.tsx`, `src/ui/__tests__/devSeeds.test.ts`, `e2e/vertical-fit.spec.ts`, `e2e/caddie-walk.spec.ts`.
- **Approach:**
  1. The Result builds its `w-typed-below` standing note from the parts; `FuckOffDate`'s parts branch passes the button whenever `onOpen` is set.
  2. The gate's `ReentryTypedBelow` carries parts; `composeReentry` pushes `{ text, parts }`.
  3. The seat draws `NotePartsBlock` below the radios for two or more spans, its paragraph for one.
  4. Add the dev seed `datesavedtypedpension` (Assumptions) and register it.
  5. The fit spec reads parts: `PAY_CHECK_UNLOCKS`' `typedBelowLine` / `typedMovedLine` re-composed, the pension seed added to the unlock arms, the coordinate-tap arm's at-quote and slot assertions re-pinned (`?seed=date` carries no lean in any year, so its seat shows the one-span pair). The caddie arm `intake:typedbelow` and B's waiting-seat pin follow the new words.
- **Test scenarios:**
  - The Result draws TM's line as a block with three segments and its "Update your figure for a working year" button present.
  - The gate draws TM's line as parts, then the moved line as its own line.
  - The seat draws the parts below the radios; a tap on "Spent" changes nothing above them (R6, pinned over TM's five states).
  - `verify:fit` passes the one-frame law with the pension household's five-segment line at both viewports.
- **Verification:** `verify:fit` green pinned to the P-cores; every edited spec typechecks through a scratch tsconfig; `pnpm build` passes the entry-chunk guard.

### U6. The copy gates, the docs and the register

- **Goal:** the composed lines are swept by the copy laws (KTD9), and the docs and register say what shipped.
- **Requirements:** R8, R11.
- **Dependencies:** U4, U5 (same commit).
- **Files:** `src/ui/__tests__/copyGuard.test.ts`, `src/ui/__tests__/hawkBan.ts` (only if a lexicon needs an entry), `docs/backlog.md`, `docs/architecture.md`, `docs/plans/features/working-year-surplus-build-spec.md`.
- **Approach:**
  1. KTD9's gates.
  2. In `docs/backlog.md`'s Tier 0 typed-below entry: mark the round-review prescription built, correct its x_t metric to the pair with the council's citation, and append the crown note to prescription (2). File the stale line's V3 hole and `resumesFrom` as their own Tier 0 entry (rosy: a short run the check would draw stays unsaid), traced to this plan's KTD5.
  3. `docs/architecture.md`'s credit sites and picture rows name the one credit function and the every-year field; the parent plan's R8 cites its new home.
- **Test scenarios:**
  - `RETIRED_EVERYWHERE` and `HAWK_BAN` run over every witness's composed lines and stay non-vacuous (each pattern still planted once).
  - R16's list counts the span slots and still reds "better" planted in one of them.
- **Verification:** `verify:doc-stats` exit 0 (the register's open count and every cited line).

---

## Verification Contract

| Gate | When | What passes |
|---|---|---|
| `pnpm typecheck` | every commit | exit 0 |
| `pnpm lint` | every commit | exit 0 (engine purity, layer boundaries) |
| `pnpm test` | every commit, pinned to the P-cores | every test green; read the summary lines, never the launcher's exit code |
| edited e2e specs through a scratch tsconfig | commit 3 | typecheck clean (`TODO.md`'s landmine: the specs are outside `pnpm typecheck`) |
| `pnpm verify:fit` | commit 3, pinned | every arm green, the pension arm included |
| `pnpm verify:doc-stats` | every commit | exit 0 |
| `pnpm build` | commit 3 | passes, the entry-chunk guard included |
| R10 sweep + per-key idcheck (`b9-build2-surplus\tools`) | every `src` commit | commit 1: only `picture.workingYears` moves, on the 20 pictured date keys (KTD8); commits 2–3: identical to `wholewindow` on every key it holds (commit 3's new pension seed is a tree-only key) |
| the credit stream (`stream.mts`) | commit 1 | every key's SHAs equal HEAD's |
| mutant pass | after the build | every planted mutant killed (copy `u11-walk7-round\mutants.cjs`; predictions written first) |
| `pnpm doc:reanchor <commit before the first edit>` | last | then `verify:doc-stats` exit 0 |

---

## Definition of Done

- R1–R12 hold, each with its pin.
- Every engine run is byte-identical; the sweep's only move is the new field, recorded as the `wholewindow` baseline with a reason per key.
- W's stale line and B's waiting seat (outside R10) are byte-identical on every seed.
- The three hosts draw the parts, the Result keeps its button, and `verify:fit` passes with the pension household.
- No retired slot, no dead branch of the old year-0 read, and no probe or scratch file is left in the tree.
- The register, the architecture doc and the parent plan say what shipped; the build-2 README's table carries the new baseline.
- The whole-file review, the mutant pass and `doc:reanchor` have run; walk 8 is START HERE's next step.

---

## Risks

| Risk | Mitigation |
|---|---|
| The pension household's five segments break the one-frame fit law | The cure is form, never a cut (D7). If the arm fails, stop and take the form to a council before changing words. |
| The moved clause and the first span both state $16,985 on TM's Result (walk 7's R3 (c) recurs) | Assumptions record it; walk 8 reads it; the dissent's base-pair form is the fallback if readers call it a math error. |
| The tie rule splits a drift household into more spans than it reads well in | U3 probes the drift witness before U4 words it; a split that reads as a wall goes to walk 8 with the dissent's flip condition. |
| A retired slot's last reader hides in `e2e/` | Grep `e2e/` for every retired and renamed slot before commit 3 (commit 2 of walk 7's round went red in CI exactly this way). |
| `doc:reanchor` moves a citation written fresh in the tree | Run it against the commit before the first edit (`docs/landmines.md`). |

---

## Sources

- The origin and its NEGATIVE block: `docs/backlog.md`, the Tier 0 entry *A figure typed below today's spending clears W's stale line for good…*.
- Council `wf_f74697d1-f2e` (this plan's KD1–KD3, the dissent); its digest row goes into `docs/council-log.md` with this plan's commit.
- The round review's record, machine-local: `~/.claude/projects/C--Users-brigg-ai-learning-journey-projects-the-back-nine/b9-build2-surplus/u11-walk7-round/review/FINDINGS.md`.
- The research behind this plan, machine-local and best effort (the plan governs any disagreement), in `~/.claude/projects/C--Users-brigg-ai-learning-journey-projects-the-back-nine/b9-build2-surplus/u11-wholewindow/`: `research/witnesses.md` (the witness tables, every cell sourced, beside the probe and its outputs in `research/wit/`), `research/window-trace.md` (the window and the crown), `research/repo-research.md` (the repository patterns), `research/spec-flow.md` (the edge cases), and `council/` (the drafts the council read and its full result).
- Insights 081, 101, 132, 139, 140, 141, 145, 146, 147, 148 (`docs/insights/`).
