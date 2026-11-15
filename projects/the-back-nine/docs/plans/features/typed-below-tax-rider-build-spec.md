---
title: The typed-below line's tax rider - Plan
type: fix
date: 2026-11-15
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
origin: docs/backlog.md
---

# The typed-below line's tax rider - Plan

---

## Goal Capsule

- **Objective:** a household that typed a working-year figure below its spending, and said all of the left over goes into savings, reads a typed-below line whose short-year comparisons and survivor coda never name less than the engine takes from savings in a working year, on any path where both of them are alive and under any withdrawal order.
- **Means:** one rider for every figure that counts a draw, worded by a council and scoped to the whole difference in income tax between the two answers (KD1, KD2, KTD1), and a whole-engine test that proves the rest of the gap is the printed figure (KTD2, KTD3).
- **Authority:** the register's Tier 0 entry *The typed-below line's tax rider names only the tax on those shortfalls…* (`docs/backlog.md`) owns the problem. The council this plan frames (KD2) owns the words. The rebuild plan's R5 and R6 (`docs/plans/features/typed-below-whole-window-rebuild-spec.md`) and the survivor plan's scope and coda (`docs/plans/features/typed-below-survivor-path-build-spec.md`) bind everything here; on a conflict about the words the council's ruling wins, on anything else those plans win.
- **Stop conditions:**
  - U1's proof finds an all-alive working year whose two draws net of income tax (`fundingNet`) differ by anything but the shortfall difference. Stop and report: something other than income tax separates the answers there (the Medicare surcharge feed, an HSA, a cash draw), no tax rider covers it, and the words go back to council with that measurement.
  - The council rules a form the line's laws cannot hold (a third sentence in a span, a figure in the rider). Stop and re-plan U2 to U4 against the ruling.
  - The sweep or the per-key idcheck shows any engine output moved. Stop: this build changes words and adds a test, never the engine.
- **Execution profile:** two commits to `main` (the project ships on `main`; there is no PR). U1 lands first, alone: a test-only commit whose result is an input to the council. U2 to U5 land together after the council rules. Each commit runs the review's gates (Verification Contract).
- **Who finishes:** the pilot builds it. Before U1: this plan's check as a whole and the three blind readers. Between U1 and U2: the council. The council and the readers are Workflows, which need Briggsy's "use a workflow". Walk 8 reads the new rider after the build (TODO.md START HERE).

---

## Product Contract

### Summary

The short spans' rider and the survivor coda's rider change to one phrase, worded by a council, that covers the whole difference in income tax between the two answers in that year: the tax on the shortfall and the tax on every other draw, chiefly the retired spouse's Medicare premium. A new engine test proves, on the witnesses' all-alive paths and under both the default and the taxable-first withdrawal order, that everything else the two answers take from savings is exactly the printed figure. The credit spans and `same` keep their bare credit comparisons unless the council rules otherwise.

### Problem Frame

The typed-below line compares, span by span, what this answer does to savings in each working year with what the answer at today's quote would do. A short span's figure counts the shortfall the quote draws from savings, and its rider names the tax on that draw: "…at most $20,637 to $21,000 a year more, plus any income tax on those shortfalls." The rebuild plan's R6 gives the rider so the figure never sits below the engine's own gap.

The engine's gap is wider than that literal scope. The left-over credit lands in the taxable account at full basis (`src/engine/taxOverlay.ts`), so the answer at the typed figure holds more full-basis money than the answer at the quote, which was credited less and drew its earlier shortfalls. A later all-alive working year's other draws, chiefly the Medicare premium once the retired spouse enrolls (2031 on the witnesses), are grossed up for income tax from that mix, so the two answers pay different tax on the same premium. Review round 3 measured it: on TM at default sequencing a median $76 and at most $182 a year past the rider in the short years, $218 on the premium alone in the next year without a shortfall, and $1,638.88 under taxable-first. The difference is not one-signed: under taxable-first, TM's 2035 (a credit year) has the typed answer paying $87.47 more (`review-r3\verify-1\t-taxmix-tmTaxableFirst-3.out.txt`).

The line's literal bound is therefore exceeded on the dev seeds: the reader is told the typed figure's lean is smaller than the engine's. That is the rosy side of the cardinal rule.

### Requirements

**What the words claim**

- R1. Every figure that counts a draw from savings at the quote (the second sentence of `shortLeftOverAtTyped`, `shortStillShortAtTyped` and `shortEvenAtTyped`, in their several-year and one-year forms) carries a rider whose scope is the whole difference in income tax between the two answers in that year, so the figure and the rider together never name less than the engine's gap on any all-alive path, under any withdrawal order.
- R2. The rider names no direction and no size: it never says which answer pays more tax (the difference runs either way, Problem Frame) and never prints a tax figure (the register's NEGATIVE).
- R3. The survivor coda's first sentence carries the same rider as R1, so the line names one tax one way. Its truth in a survivor year is the survivor plan's death-path proof; round 3 measured the typed answer paying $61 to $163 more tax there, which the rider's direction-free scope already holds.
- R4. The credit spans (`bothCredit`, `quoteCreditsNothing`) and `same` keep saying what each answer adds, a credit comparison (the rebuild plan's R5), and never claim to be the whole change in savings. Whether they carry the rider is KD2's.

**The laws the words keep**

- R5. The rider keeps the line's laws: one side per dollar sentence, at most two sentences a span, no "so", no "earlier", no "later" in a sentence that holds "comes up", curly apostrophes, the scope "you’re both alive" on every comparison's own head noun (insight 140), every word a draft flagged for walk 8.

**The proof**

- R6. A whole-engine test shows, on the witnesses' all-alive paths, in every working year of every pass, under the default and the taxable-first withdrawal order: each answer's composed credit is the whole-window read's; the two answers' draws net of income tax differ by exactly the shortfall difference, to the cent; so what the two answers take from savings differs by the printed figure plus the difference in income tax and nothing else.
- R7. The proof is non-vacuous: on TM, in its first all-alive working year with no shortfall at either answer, the two answers' income tax differs by at least $1, the channel the old rider leaves out.

**The records**

- R8. The register's Tier 0 entry closes with the commit; the surcharge entry above it records that the rider covers income tax only and that its feed stays open, measured by no witness; the entry's "Never the other way" is scoped to the rows it measured; the rebuild plan's R6 and the survivor plan's coda are amended in place; and W's stale line's own rider ("plus any income tax on taking it out") is filed as its own register entry, measure first.

### Key Decisions

- KD1. **The rider's scope is the whole difference in income tax, never a share of it.** The engine pays one joint tax a year and never splits it between the shortfall and the premium; round 3's "past the rider" figures used an average-rate split as a measuring device only. A rider scoped to the difference needs no split and holds in both directions. Governs R1, R2, R3.
- KD2. **The words are the council's; this plan recommends one form.** Recommendation: "plus any difference in income tax" ending every draw-counting figure (R1) and the coda's first sentence (R3), and no rider on the credit spans or `same` (R4). Why that form: it states exactly the engine's remainder (U1), names no direction, reads true in both orders, and adds four words. The register's other candidate, "plus any income tax on what your savings pays out" (after the money picture's "what savings pays out"), sits in a sentence whose subject is this answer, so it reads as this answer's own payouts, and on that reading the bound fails: TM under taxable-first, 2033, the typed answer pays $0 of portfolio tax and the quote $1,677.20. No density rule can catch that, since the rider carries no figure. The council also rules whether the credit spans and `same` carry the rider (their density, the rebuild's KD2) and confirms the surcharge stays out of the words (Scope Boundaries). Governs R1, R3, R4.

### Acceptance Examples

- AE1. Covers R1, R5. TM on the Result (`?seed=datesavedtypedmoved`), its 2029 through 2032 span: "Your figure of $84,000 a year leaves those shortfalls out of this answer, and it adds at most $16,985 a year to your savings, at most $20,637 to $21,000 a year more, plus any difference in income tax." (the recommended words; the council's words replace the rider's).
- AE2. Covers R3. TM's coda on the gate: "In such a working year, your answer takes at most $15,750 a year less from your savings than it would at your spending of $105,000 a year, plus any difference in income tax."
- AE3. Covers R4. TM's credit spans and `whole`'s `same` read word for word as today under the recommended ruling.
- AE4. Covers R6, R7. On TM's first all-alive seed, 2033: no shortfall at either answer, the two `fundingNet`s equal to the cent, and the two answers' income tax differ by at least $1.

### Scope Boundaries

- No engine change: the build reads the existing working-year probe and moves no engine output (the stop condition).
- No per-year tax figure in the line, no split of one year's tax between the shortfall and the premium, and no move of the credit out of the taxable account (the register's NEGATIVE).
- No words for the Medicare surcharge feed (`docs/backlog.md`, *An all-alive working year's shortfall at today's quote enters the Medicare surcharge look-back…*): a surcharge is not income tax, no witness reaches that feed, and U1's stop condition is its tripwire on the witnesses. It stays open.
- The money picture's own rider, `workingLedgerSavingsTax`, describes one answer's draws and is true as it stands: unchanged.
- No x_t, "at least" or "still working" condition on any credit, and the comparisons' scope stays "you’re both alive" (the rebuild plan's KD1 and KD3; the survivor plan).

#### Deferred to Follow-Up Work

- W's stale line's rider, "plus any income tax on taking it out" (`SHORTFALL_EACH` / `SHORTFALL_ONE` in `src/ui/copy.ts`): a check at the quote can shift the same premium's tax, so the same scope gap may hold there. U5 files it as its own register entry, measure first (insight 143).

---

## Planning Contract

### Key Technical Decisions

- KTD1. **One home for the rider.** A single phrase in `src/ui/copy.ts` ends the second sentence of `workingCostTypedBelowSpanShortOut`, `…SpanStillShort` and `…SpanEven`, and the shared coda helper `survivorTakesLess`. Today the words are typed three ways ("on those shortfalls", "on that shortfall" through `spanShortfalls`, "on it"); one constant keeps one tax said one way across every host (R3). `spanShortfalls` keeps its other use, the "leaves those shortfalls out of this answer" clause.
- KTD2. **The proof reads income tax off the existing probe.** In a checked working year the probe's `checkDrawn` reports `grossWithdrawal` and `fundingNet`, and the year's portfolio-funded income tax is exactly their difference (`src/engine/taxOverlay.ts`, the `taxPaidThisYear` line; a clamped working year prices no ACA). No probe field is added: the probe is pinned probe-only (`src/engine/__tests__/workingYearCheck.test.ts`, the test that only `simulate.ts` and `taxOverlay.ts` may name `_workingYearProbe`), and the build changes no engine file.
- KTD3. **The proof is the survivor proof's shape on the all-alive paths.** A new file, `src/engine/__tests__/typedBelowTaxRider.test.ts`, its own file so it runs in parallel with the survivor proof. It reuses that proof's route (`buildDateInput` into `buildCandidateParams` at `DATE_OFFSET_WINDOW_TOP`, one path), its pass split and its cent-grain residual. Its seed scan keeps the seeds where both people live through the window (round 3's `verify-1\t-dist.mts` filter), the first three per household.
- KTD4. **The density law gains a span rider rule, keyed by kind.** Today it reads no span rider at all (`workingYearLeftOver.test.ts`, the density law's span loop); only the coda's rider is law (`codaLaw`) and copyGuard's coda count. The new rule is an exhaustive Record over the span kinds (insight 147) saying whether each kind's last sentence ends on the rider: the three short kinds yes, the credit kinds and `same` per the ruling. The rider is typed by hand in the test, never read from the slot. `codaLaw`'s regex and copyGuard's literal are retyped by hand.

### High-Level Technical Design

What each answer takes from savings in an all-alive working year, and which part the line prints:

| part of the gap between the two answers | where it comes from | what the line says |
|---|---|---|
| the credit difference | `workingYearCredit` on each run | each span's credit, "at most" (the rebuild's R5) |
| the shortfall difference | the quote's draw less the typed figure's | the short span's difference, "at most", rounded up on the cent grain |
| the difference in income tax | `grossWithdrawal − fundingNet` on each run | the rider (R1), no figure |
| anything else | must be $0: `fundingNet` differs by exactly the shortfall difference | nothing; U1 proves it, its stop condition guards it |

### Assumptions

- The council rules a rider that fits the density law: one clause at the end of an existing sentence, no figure.
- "Difference in income tax" reads plainly beside a sentence that already compares two answers; walk 8 tests that reading, and the council may word it otherwise.
- Three all-alive seeds per household over about ten households and two withdrawal orders run inside a minute or two pinned to the P-cores; U1 measures it, and the household list shrinks before any timeout grows.
- The default sequencing is `proportional` on every dev seed, and `drawdownPolicy: 'taxable-first'` on the draft reaches both passes (round 3's `variants.mts` set it the same way). The proof sweeps those two orders, the measured extremes; `pre-tax-first`, `bracket-fill` and `custom` are not swept, since the rider is direction-free and U1's identity does not depend on the order.
- The witnesses hold no HSA and sit far from a joint IRMAA line, so U1's identity is a fact of the witnesses, not a guarantee of the engine: a household near the line can break it (the surcharge entry), and the stop condition covers it.

### Sequencing

U1 first, alone: its result (the gap beyond the printed figure is income tax and nothing else) goes into the council's brief. Then the council. Then U2 to U5 as one commit, since the words, the laws that read them and every pin must move together or the suite reds between them.

---

## Implementation Units

### U1. The whole-engine proof that the gap beyond the printed figure is income tax

- **Goal:** prove R6 and R7 on the whole engine before any word moves.
- **Requirements:** R6, R7; KTD2, KTD3.
- **Dependencies:** none.
- **Files:** `src/engine/__tests__/typedBelowTaxRider.test.ts` (new).
- **Approach:**
  1. Copy the survivor proof's route, recorder and pass split (`src/engine/__tests__/typedBelowSurvivor.test.ts`, `candidateOf` and `checkedYearsOn`), keeping `grossWithdrawal` from `checkDrawn` beside `shortfall` and `fundingNet`.
  2. Scan seeds for paths where both people live through the window and keep the first three per household.
  3. Households: TM, the pension household (its one-year short spans), the crowned household, B retyped, C typed at $101,000 (still short), C at $100,985 (exactly $0), C at $8,749.99 a month (cents), `whole` (`same`), A (`bothCredit`), and TM as an all-sticky budget (the floor pass); TM and B retyped again under `drawdownPolicy: 'taxable-first'`. Round 3 ran no tax probe on the still-short, even, cents or one-year households, so these are their first measurement.
  4. Assert per working year and pass, never a sign on the tax difference: it runs either way (round 3: TM taxable-first, seed 3, 2035, the typed answer $87.47 more).
- **Patterns to follow:** `typedBelowSurvivor.test.ts` (its `{ timeout: 60_000 }` per household, its non-vacuity checks, its PLANTED arm); witnesses from `src/intake/__tests__/typedBelowWitnesses.ts`.
- **Test scenarios:**
  - On every household and kept seed, every working year of every pass: each answer's composed credit `Object.is` the whole-window read's credit for that year and answer, and each answer's recorded shortfall equals the read's draw for that year on the cent grain. This ties the engine's path to the picture the printed figures come from, whose own test already holds each printed figure at or above the credit and shortfall differences (the rebuild's R5 grain test).
  - The same years: `fundingNet` at the quote less at the typed figure equals the shortfall at the quote less at the typed figure, each to the cent (`toCents`). With the line above, the only part of the gap the printed figure does not hold is the income-tax difference, `grossWithdrawal − fundingNet` on each run.
  - Covers AE4. TM, the first kept seed, 2033: no shortfall at either answer and the income-tax difference is at least $1 (R7; the register's $218 was on another seed, so the test reads the figure, never types it).
  - Non-vacuity: every household's runs compose a credit and a draw in every checked year, and at least one all-alive year per household credits money.
  - The premise of the tax read: no checked working year prices a marketplace premium (KTD2's identity holds only there); assert it from the run rather than trusting the comment.
- **Verification:** the file passes alone, pinned, inside its timeouts; a planted plant that drops the shortfall term from the residual reds it.

### U2. The rider words

- **Goal:** one rider, in the council's words, on every draw-counting figure and the coda.
- **Requirements:** R1, R2, R3, R4, R5; KD2; KTD1.
- **Dependencies:** U1, the council's ruling.
- **Files:** `src/ui/copy.ts`.
- **Approach:**
  1. Add the rider constant beside `spanShortfalls` and use it to end `workingCostTypedBelowSpanShortOut`, `…SpanStillShort`, `…SpanEven` and `survivorTakesLess`.
  2. If the council gives the credit spans or `same` a rider, add it to their second sentence (`…SpanAtQuoteCredit`, `…SpanAtQuoteNothing`) or their one sentence (`…SpanSame`), never a third sentence.
  3. Rewrite the block comments that state the rule (the span block above `workingCostTypedBelowSpanLabel` and the survivor block) to the new scope, and record the council's id.
  4. Grep `RETIRED_EVERYWHERE`, `RETIRED_BELOW_QUOTE`, `HAWK_BAN` and `LEFT_OVER_LEAN_BAN` for every word of the ruling before writing it (`docs/landmines.md`, Copy and copyGuard).
- **Patterns to follow:** `spanShortfalls` and `SPAN_QUOTE` (one home for a repeated phrase).
- **Test scenarios:** carried by U3 and U4 (the slots have no test of their own).
- **Verification:** `pnpm typecheck` and `pnpm lint` pass; `pnpm build` passes (a first-load string reads `entryCopy`).

### U3. The laws that read the rider

- **Goal:** the density law and copyGuard check the new rider by hand.
- **Requirements:** R1, R3, R5; KTD4.
- **Dependencies:** U2.
- **Files:** `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/ui/__tests__/copyGuard.test.ts`.
- **Approach:**
  1. In the density law's span loop, require every short span's second sentence to end on the rider, typed by hand, and forbid it on credit and `same` sentences (under the recommended ruling).
  2. Retype `codaLaw`'s first-sentence regex and its failure text to the new rider, and copyGuard's coda count literal.
  3. Keep the law's existing plants and add two: a short span with the old rider, and a credit span with the rider.
- **Patterns to follow:** `codaLaw` and its plants in the density law.
- **Test scenarios:**
  - The density law passes over every witness, budget twin, one-year form and host.
  - A planted short span ending "plus any income tax on those shortfalls." reds the new rule.
  - A planted rider on a `bothCredit` second sentence reds it (under the recommended ruling).
  - copyGuard's coda count still equals the gate-on households times the hosts.
- **Verification:** both files pass, and each new plant reds before it is reverted.

### U4. Every host's hand pins

- **Goal:** every by-hand pin of the rider names the new words.
- **Requirements:** R1, R3, R4.
- **Dependencies:** U2.
- **Files:** `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/intake/__tests__/assumptionPanel.test.tsx`, `src/intake/__tests__/workingCostStep.test.tsx`, `src/ui/__tests__/reentry.test.tsx`, `src/ui/__tests__/resultPayCheckLine.test.tsx`.
- **Approach:**
  1. Retype the hand pins by hand: 40 rider strings today (21 short-span, 19 coda), 25 in `workingYearLeftOver.test.ts` (the density law's coda regex among them, which is U3's), 5 in `resultPayCheckLine.test.tsx`, 4 in `assumptionPanel.test.tsx`, 3 each in `workingCostStep.test.tsx` and `reentry.test.tsx`. Find them by grepping "income tax" in each file; never compose them from the slots.
  2. Leave W's stale line's four "taking it out" pins alone (Deferred).
  3. The e2e texts (`e2e/vertical-fit.spec.ts`'s `PAY_CHECK_UNLOCKS` entries `datesavedtyped`, `datesavedtypedmoved`, `datesavedtypedpension`, the five-span placement arm and the coordinate-tap arm; `e2e/caddie-walk.spec.ts`'s `intake:typedbelow`) compose from the slots and move with them: re-run them, edit none.
- **Patterns to follow:** the survivor build's hand retype (its U4).
- **Test scenarios:**
  - Covers AE1. TM's short span on the Result, the gate and both seat hosts, typed whole.
  - Covers AE2. TM's coda on the gate and A's one-span coda on the Result.
  - Covers AE3. TM's credit spans and `whole`'s `same` unchanged.
  - The pension household's one-year short spans ("that working year…") carry the rider.
  - C typed at $101,000 (still short) and at $100,985 (exactly $0) carry it on their second sentence.
- **Verification:** the reached files pass in the foreground; `pnpm verify:fit` passes pinned. The tightest frame is the gate on `?vault=datesavedtypedpension` at 1536×791 (five spans, the coda and the moved line above the affirm button), whose slack is unmeasured: read it before and after. Content outranks aesthetics, so an overrun is a layout fix, never a cut.

### U5. The records

- **Goal:** the docs stop asserting the narrow scope, and the next builds are warned.
- **Requirements:** R8.
- **Dependencies:** lands with U2 to U4.
- **Files:** `docs/backlog.md`, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`, `docs/plans/features/typed-below-survivor-path-build-spec.md`, `docs/landmines.md`, `docs/council-log.md`, `TODO.md`.
- **Approach:**
  1. Close the Tier 0 rider entry with the commit and the council's id; scope its "Never the other way" to the default-order short years it measured, naming TM taxable-first 2035.
  2. Append to the surcharge entry: the rider covers income tax only, and U1's residual check is its tripwire on the witnesses.
  3. File W's stale line's rider as its own entry (Deferred), measure first.
  4. Amend the rebuild plan's R6 and the survivor plan's coda wording in place, each pointing here.
  5. Add the landmine: the proof's tax is `grossWithdrawal − fundingNet` only in a clamped working year, which prices no ACA.
- **Test expectation:** none — docs only; `pnpm verify:doc-stats` passes.
- **Verification:** `pnpm verify:doc-stats` passes after `doc:reanchor`.

---

## Verification Contract

Each commit runs the TODO close block's "The review's gates", each heavy run alone, in sequence, pinned to the P-cores:

| gate | when | passes when |
|---|---|---|
| `git rev-parse HEAD` | before the first edit | the re-anchor base is recorded |
| `pnpm typecheck`, `pnpm lint` | after the last edit | both exit 0 |
| `pnpm doc:reanchor <base>` | before staging | dry run classified, applied once, the frozen files restored |
| the reached files, foreground, `--maxWorkers=2` | after the edits | every file green; CI's `pnpm test` is the full run |
| `pnpm verify:doc-stats` | after the re-anchor | exit 0, counts retyped in `README.md` and `docs/roadmap.md` |
| `pnpm build`, `pnpm verify:fit` | U2–U5's commit | both exit 0 |
| the sweep and the per-key idcheck against `ww3` | each commit | 0 keys moved |
| the mutant pass | after U2–U5 | every plant red: the rider reverted on one kind, the rider on a credit span, U1's residual dropped |
| CI on each commit | after push | both jobs green |

---

## Definition of Done

- U1 is committed and green, its result written into the council's brief.
- The council has ruled, and its id is in `docs/council-log.md` and in the copy's block comment.
- U2 to U5 are committed together with every gate green, and CI is green on both commits.
- No engine output moved (the sweep and idcheck), and no abandoned attempt is left in the diff.
- Walk 8 is START HERE's next step, with the new rider among its reads.
