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

- **Objective:** a household that typed a working-year figure below its spending, and said all of the left over goes into savings, reads a typed-below line whose every comparison in a working year never names less than the engine's gap between the two answers there, income tax and Medicare premiums included, on any path where both of them are alive and under any withdrawal order, and whose survivor coda names the same costs in the same words. The council words the rider on this plan's recommendation (KD2).
- **Means:** one rider ending every comparison the line makes (each span's second sentence, `same`'s one sentence and the coda's first), worded by a council and scoped to the whole difference in income tax and Medicare premiums between the two answers (KD1, KD2, KTD1); and a whole-engine test that proves the rest of the gap is the credit and shortfall difference the printed figure bounds (KTD2, KTD3), with one household near a Medicare surcharge line proving the Medicare half.
- **Authority:** the register's Tier 0 entries *The typed-below line's tax rider names only the tax on those shortfalls…* and *An all-alive working year's shortfall at today's quote enters the Medicare surcharge look-back…* (`docs/backlog.md`) own the problem. The council this plan frames (KD2, The council's brief) owns the words. The rebuild plan's R5 and R6 (`docs/plans/features/typed-below-whole-window-rebuild-spec.md`) and the survivor plan's scope and coda (`docs/plans/features/typed-below-survivor-path-build-spec.md`) bind everything here except the rider's scope, which KD1, R1, R3 and R4 replace and U5 amends in place in both plans; on a conflict about the words the council's ruling wins, on anything else those plans win.
- **Stop conditions:**
  - U1's proof finds an all-alive working year whose two draws net of income tax (`fundingNet`) differ by anything but the shortfall difference and the Medicare charge difference. Stop and report: something else separates the answers there (an HSA, a cash draw, an ACA premium), no rider covers it, and the words go back to council with that measurement.
  - The council rules a form the line's laws cannot hold (a third sentence in a span, a figure in the rider, a word one of the four ban lists refuses). Stop and re-plan U2 to U4 against the ruling.
  - The council rules words that leave the Medicare premiums out. Stop: U1's near-line household is a household the intake accepts whose gap that rider would understate, and Briggsy's 2026-10-31 ruling reads D7's "rosier" as rosier for some household the intake accepts; the ruling and U1's measurement go to him.
  - The fit gate's tightest frame overruns with the new words (U4). Stop before the commit: load the four design skills (the project CLAUDE.md's UI design skills), measure the frame, and plan the layout fix as its own step. Never cut a word (content outranks aesthetics).
  - On a commit that runs them (Verification Contract), the sweep or the per-key idcheck shows any engine output moved. Stop: this build changes words and adds a test, never the engine.
- **Execution profile:** two commits to `main` (the project ships on `main`; there is no PR). U1 lands first, alone: a test commit (the new test file, the near-line household beside the witnesses, and the test counts it stales in `README.md` and `docs/roadmap.md`) whose result goes into the council's brief. U2 to U5 land together after the council rules. Each commit runs the gates in the Verification Contract.
- **Who finishes:** the pilot builds it. Done before U1: this plan's check as a whole (`996065e9`) and the three blind readers (Workflow `wf_0b7520f9-7cd`, 26 faults: the real ones folded into this plan, the minor ones listed at its foot, Reader faults). Between U1 and U2: the council, a Workflow, on The council's brief below. Walk 8 reads the new rider after the build (TODO.md START HERE).

---

## Product Contract

### Summary

The line's rider changes to one phrase, worded by a council, that covers the whole difference in income tax and Medicare premiums between the two answers in a year, and it ends every comparison the line makes: the short spans' (where today's "plus any income tax on those shortfalls" and "plus any income tax on it" stand), the credit spans' and `same`'s (which carry none today), and the survivor coda's. A new engine test proves, on the witnesses' all-alive paths under four withdrawal orders, that everything else the two answers do to savings is the credit and shortfall difference the printed figure bounds, and, on one household near a Medicare surcharge line, that the Medicare half is real.

### Problem Frame

The typed-below line compares, span by span, what this answer does to savings in each working year with what the answer at today's quote would do. A short span's figure counts the shortfall the quote draws from savings, and its rider names the tax on that draw: "…at most $20,637 to $21,000 a year more, plus any income tax on those shortfalls." The rebuild plan's R6 gives the rider so the figure never sits below the engine's own gap.

The engine's gap is wider than that literal scope, through two costs the shortfall's own tax leaves out:

- **Income tax on the other draws.** The left-over credit lands in the taxable account at full basis (`src/engine/taxOverlay.ts`), so the answer at the typed figure holds more full-basis money than the answer at the quote, which was credited less and drew its earlier shortfalls. A later all-alive working year's other draws, chiefly the Medicare premium once the retired spouse enrolls (2031 on the witnesses), are grossed up for income tax from that mix, so the two answers pay different tax on the same premium. Review round 3 measured it: on TM at default sequencing a median $76 and at most $182 a year past the rider in the short years, $218 on the premium alone in the next year without a shortfall, and $1,638.88 under taxable-first. The difference is not one-signed: under taxable-first, TM's credit years run both ways (546 rows over 182 paths: the tenth percentile at −$285.29, the typed answer paying more; seed 3's 2035 at −$87.47; `review-r3\verify-2\t-dist.out.txt`, `verify-1\t-taxmix-tmTaxableFirst-3.out.txt`).
- **The Medicare surcharge.** A working year's draw is income Medicare reads two years on (`irmaaMagi` counts pre-tax draws; the look-back is two years, `irmaa.magiLookbackYears`). Where the quote's larger draw lifts a year's recorded income across a joint line, the retired spouse's Medicare two years later costs more at the quote: at the first line, $81.20 a month for Part B and $14.50 for Part D, about $1,148 a year for one enrollee in 2026's prices (`src/engine/constants/health.ts`, `irmaa` tier 1). Round 3 found no witness near a line (the surcharge entry), but the cause is mechanical, not a property of the witnesses: TM with more working-year investment income, a figure the intake asks for and Medicare reads, puts a short year's two answers on either side of a line (U1 builds it).

So the line's literal bound is exceeded on the dev seeds, and can be exceeded by more on a household near a surcharge line: the reader is told the typed figure's lean is smaller than the engine's. That is the rosy side of the cardinal rule.

### Requirements

**What the words claim**

- R1. Every figure that counts a draw from savings at the quote (the second sentence of `shortLeftOverAtTyped`, `shortStillShortAtTyped` and `shortEvenAtTyped`, in their several-year and one-year forms) carries a rider whose scope is the whole difference in income tax and Medicare premiums between the two answers in that year, so the figure and the rider together never name less than the engine's gap on any all-alive path, under any withdrawal order.
- R2. The rider names no direction and no size: it never says which answer pays more (the difference runs either way, Problem Frame) and never prints a figure (the register's NEGATIVE).
- R3. The survivor coda's first sentence carries the same rider as R1, so the line names the same costs one way. Its truth in a survivor year is the survivor plan's death-path proof: no living member is Medicare-enrolled there (its KTD9), and round 3 measured the typed answer paying $61 to $163 more tax in survivor RMD years, which a direction-free rider holds.
- R4. The credit spans (`bothCredit`, `quoteCreditsNothing`) and `same` keep saying what each answer adds, a credit comparison (the rebuild plan's R5), and carry the same rider (KD2's second call), since under R1's scope a span without it reads as "no difference in income tax here", which round 3 measured false.

**The laws the words keep**

- R5. The rider keeps the line's laws: one side per dollar sentence (the rider carries no dollar), at most two sentences a span, no "so", no "earlier", no "later" in a sentence that holds "comes up", curly apostrophes, the scope "you’re both alive" on every comparison's own head noun (insight 140), every word a draft flagged for walk 8.

**The proof**

- R6. A whole-engine test shows, on the witnesses' all-alive paths, in every working year of every pass, under the default order on every household U1 names and under taxable-first, pre-tax-first and bracket-fill on TM and B retyped: the engine's own credit and shortfall difference between the two answers sits at or under the span's printed figure (and is $0 in a `same` span); and the two answers' draws net of income tax differ by exactly the shortfall difference plus the Medicare charge difference (which round 3 measured at $0 on every witness). So what the two answers do to savings differs by what the printed figure bounds, plus the difference in income tax and Medicare premiums, and nothing else.
- R7. The proof is non-vacuous on both halves of the rider. Income tax: on TM, in its first all-alive working year after its short span with no shortfall at either answer (2033; the years before 2029 draw nothing from savings, so their tax difference is $0), the two answers' income tax differs by at least $1. Medicare: on the near-line household, a working year in 2031 to 2034 has the two answers' Medicare charges differing by at least $1, the surcharge alone (the base equal), and the draws net of income tax differing by exactly that plus the shortfall difference.

**The records**

- R8. Both register entries close with the commit, the surcharge entry recording U1's near-line household and the council's ruling on its words; the rider entry's "Never the other way" is scoped to the rows it measured; the rebuild plan's R6 and the survivor plan's coda are amended in place; and W's stale line's own rider ("plus any income tax on taking it out") is filed as its own register entry, measure first.

### Key Decisions

- KD1. **The rider's scope is the whole difference in income tax and Medicare premiums, never a share of it.** The engine pays one joint tax a year and never splits it between the shortfall and the premium; round 3's "past the rider" figures used an average-rate split as a measuring device only. A rider scoped to the difference needs no split and holds in both directions. Medicare belongs in the scope because the surcharge reaches the gap by mechanism on a household the intake accepts (Problem Frame), and D7 counts a gap rosy for some such household as a gap (Briggsy's 2026-10-31 ruling). Governs R1, R2, R3, R4.
- KD2. **The words are the council's; this plan recommends one form for each of its four calls** (the full framing, the inputs and the measurements are The council's brief, below):
  1. **The words.** Recommendation: "plus any difference in income tax and Medicare premiums". It states exactly the engine's remainder (U1), names no direction, reads true in every order, and carries no figure. The register's other candidate, "plus any income tax on what your savings pays out" (after the money picture's "what savings pays out"), sits in a sentence whose subject is this answer, so it reads as this answer's own payouts, and on that reading the bound fails: TM under taxable-first, 2032, a short year, the typed answer pays $0 of portfolio tax and the quote $2,668.93 (`review-r3\verify-1\t-taxmix-tmTaxableFirst-3.out.txt`). Any form naming income tax alone fails the near-line household.
  2. **The credit spans and `same` carry the rider.** Recommendation: yes. Under the whole-difference scope the rider no longer names a shortfall, so a rider on the short spans beside none on the credit spans and `same` reads as "no difference in income tax in these years", measured false (a median $80 to $133 a year beside the bare credit differences at the default order, $48.52 beside `whole`'s "adds the same", $1,677.20 beside TM's 2033 "$11,000 less" under taxable-first). The rider is a clause on an existing sentence with no dollar in it, so the density law (the rebuild's KD2: one side per dollar sentence, at most two sentences a span) holds; the cost is density, which walk 8 reads.
  3. **The coda moves in lockstep.** Recommendation: yes, so the line names the same costs one way. The direction fact the council weighs: in survivor RMD years the typed answer pays $61 to $163 more (round 3's death seat), so today's "plus any income tax on it" is true there too; the direction-free rider stays true and never says a direction the all-alive years do not hold (insight 133).
  4. **Medicare in the words.** Recommendation: yes, on every household, in the one rider. The alternative the council weighs: the Medicare half only where a member enrolls in Medicare inside a working year of the window (truer on a younger household, where it names a cost that cannot arise; it costs a branch in the composer and its own pins).

  Governs R1, R3, R4.

### Acceptance Examples

The recommended words; the council's words replace the rider's.

- AE1. Covers R1, R5. TM on the Result (`?seed=datesavedtypedmoved`), its 2029 through 2032 span: "Your figure of $84,000 a year leaves those shortfalls out of this answer, and it adds at most $16,985 a year to your savings, at most $20,637 to $21,000 a year more, plus any difference in income tax and Medicare premiums."
- AE2. Covers R3. TM's coda on the gate: "In such a working year, your answer takes at most $15,750 a year less from your savings than it would at your spending of $105,000 a year, plus any difference in income tax and Medicare premiums."
- AE3. Covers R4. TM's credit spans on the Result: "At your spending of $105,000 a year, it would add at most $5,985, $11,000 less, plus any difference in income tax and Medicare premiums." `whole`'s `same` on the Result: "This answer adds the same to your savings as it would at your spending of $90,000 a year, plus any difference in income tax and Medicare premiums."
- AE4. Covers R6, R7. On TM's first all-alive seed, 2033: no shortfall at either answer, the two `fundingNet`s equal to the cent, and the two answers' income tax differ by at least $1.
- AE5. Covers R6, R7. On the near-line household: a year in 2031 to 2034 whose two Medicare charges differ by the surcharge alone, and whose `fundingNet`s differ by exactly that, to the cent.

### Scope Boundaries

- No engine change: the build reads the existing working-year probe and health readout, and moves no engine output (the stop condition).
- No per-year tax or Medicare figure in the line, no split of one year's tax between the shortfall and the premium, and no move of the credit out of the taxable account (the register's NEGATIVE).
- The Medicare surcharge feed (`docs/backlog.md`, *An all-alive working year's shortfall at today's quote enters the Medicare surcharge look-back…*) is in this build: its words ride the rider (KD2's fourth call) and U1's near-line household proves the channel. No witness changes; the new household is U1's own.
- The money picture's own rider, `workingLedgerSavingsTax`, describes one answer's draws and is true as it stands: unchanged.
- No x_t, "at least" or "still working" condition on any credit, and the comparisons' scope stays "you’re both alive" (the rebuild plan's KD1 and KD3; the survivor plan).

#### Deferred to Follow-Up Work

- W's stale line's rider, "plus any income tax on taking it out" (`SHORTFALL_EACH` / `SHORTFALL_ONE` in `src/ui/copy.ts`): a check at the quote can shift the same premium's tax and surcharge, so the same scope gap may hold there. U5 files it as its own register entry, measure first (insight 143).

---

## Planning Contract

### Key Technical Decisions

- KTD1. **One home for the rider.** A single phrase in `src/ui/copy.ts` ends the second sentence of every span kind (`workingCostTypedBelowSpanShortOut`, `…SpanStillShort`, `…SpanEven`, `…SpanAtQuoteCredit`, `…SpanAtQuoteNothing`), `…SpanSame`'s one sentence and the shared coda helper `survivorTakesLess`. Today the words are typed three ways ("on those shortfalls", "on that shortfall" through `spanShortfalls`, "on it"); one constant keeps the same costs said one way across every host (R3). `spanShortfalls` keeps its other use, the "leaves those shortfalls out of this answer" clause.
- KTD2. **The proof reads income tax off the existing probe, and Medicare off the existing readout.** In a checked working year the probe's `checkDrawn` reports `grossWithdrawal` and `fundingNet`, and the year's portfolio-funded income tax is exactly their difference (`src/engine/taxOverlay.ts`, the `taxPaidThisYear` line; a clamped working year prices no ACA). The year's Medicare charge is `simulate`'s `healthReadout` (`medicareBase`, `irmaaSurcharge`, `medicareExtras` per year; one path, so each year's median is the path's own value; it observes the full track only). No probe field is added: the probe is pinned probe-only (`src/engine/__tests__/workingYearCheck.test.ts`, the test that only `simulate.ts` and `taxOverlay.ts` may name `_workingYearProbe`), and the build changes no engine file.
- KTD3. **The proof is the survivor proof's shape on the all-alive paths.** A new file, `src/engine/__tests__/typedBelowTaxRider.test.ts`, its own file so it runs in parallel with the survivor proof. It reuses that proof's route (`buildDateInput` into `buildCandidateParams` at `DATE_OFFSET_WINDOW_TOP`, one path), its pass split and its cent grain. Its seed scan keeps the seeds where both people live through the window (round 3's `verify-1\t-dist.mts` filter), the first three per household.
- KTD4. **The density law gains a span rider rule, keyed by kind.** Today it reads no span rider at all (`workingYearLeftOver.test.ts`, the density law's span loop); only the coda's rider is law (`codaLaw`) and copyGuard's coda count. The new rule is an exhaustive Record over the span kinds (insight 147) saying whether each kind's last sentence ends on the rider: every kind under the recommended ruling. The rider is typed by hand in the test, never read from the slot. `codaLaw`'s regex and copyGuard's literal are retyped by hand.

### High-Level Technical Design

What each answer does to savings in an all-alive working year, and which part the line prints:

| part of the gap between the two answers | where it comes from | what the line says |
|---|---|---|
| the credit difference | `creditComposed` on each run (none composed: $0) | each span's credit, "at most" (the rebuild's R5) |
| the shortfall difference | the quote's check shortfall less the typed figure's | the short span's difference, "at most", rounded up on the cent grain |
| the difference in income tax | `grossWithdrawal − fundingNet` on each run | the rider (R1), no figure |
| the difference in Medicare premiums | `healthReadout`'s base, surcharge and extras on each run | the rider (R1), no figure |
| anything else | must be $0: `fundingNet` differs by exactly the shortfall and Medicare differences | nothing; U1 proves it, its stop condition guards it |

### Assumptions

- The council rules a rider that fits the density law: one clause at the end of an existing sentence, no figure.
- "Difference in income tax and Medicare premiums" reads plainly beside a sentence that already compares two answers; walk 8 tests that reading, and the council may word it otherwise.
- Three all-alive seeds for each of about seventeen household-and-order runs (ten households at the default order, TM and B retyped under three more orders, the near-line household), two passes on the budget twin, run inside a minute or two pinned to the P-cores; U1 measures it, and the household list shrinks before any timeout grows.
- The default sequencing is `proportional` on every dev seed, and a `drawdownPolicy` set on the draft reaches both passes (round 3's `variants.mts` set it the same way). The proof sweeps four orders on TM and B retyped (`custom` needs an order the household names, and none does). Any order holds by structure: `fundingNet` is set before the order allocates the year's gross, so an order reaches the gap only through the year's income tax and, through the income it records for Medicare, a later year's Medicare charge, both inside the rider.
- The witnesses hold no HSA and sit far from a joint IRMAA line (round 3 measured no Medicare difference on any of them, the surcharge entry). The near-line household also holds no HSA, so its `fundingNet` residual is the Medicare difference alone. With an HSA, the HSA pays part of a premium outside `fundingNet`, and what each answer takes from savings (the gross plus the HSA's spend) still differs by the whole Medicare difference, since the HSA is savings too.

### Sequencing

U1 first, alone: its result (the gap beyond the printed figure is income tax and Medicare, and nothing else) and the near-line household's figures go into the council's brief. Then the council. Then U2 to U5 as one commit, since the words, the laws that read them and every pin must move together or the suite reds between them.

### The council's brief

The pilot writes it after U1 lands, for a council run as a Workflow, and puts in it:

- **The four calls and their recommendations** (KD2), each with its case and its cost: the words; the rider on the credit spans and `same`; the coda in lockstep, with the direction fact; Medicare in the words, with the keyed alternative.
- **One more reading for the words:** in the coda's `wholeGap` form, the rider sits right before "That is the whole gap to your figure of $T a year." The survivor plan already flagged that "That" can read as the tax (its Deferred list); a rider about a "difference" sits beside a sentence about a "gap", so the council words both sentences together.
- **The measurements:** U1's result and run time; the near-line household, each answer's recorded Medicare income in 2029 to 2032 beside the line it is compared with, and the Medicare difference it lands two years on; round 3's record (`C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-build2-surplus\u11-wholewindow\review-r3\`: `ROUND.md`, `alive\all300.out.txt`, `alive\taxfirst300.out.txt`, `verify-1\` and `verify-2\` with their t-dist outputs, `death\`).
- **The laws and the bans:** R5's laws, the rebuild plan's R5 to R8 and KD1 to KD3, the survivor plan's scope and coda, the register's NEGATIVE, and the four ban lists (`RETIRED_EVERYWHERE` and `RETIRED_BELOW_QUOTE` in `src/ui/__tests__/copyGuard.test.ts`; `HAWK_BAN` and `LEFT_OVER_LEAN_BAN` in `src/ui/__tests__/hawkBan.ts`), with every candidate phrase grepped against them first and the result written in. The recommended words pass all four (grepped 2026-11-15).
- **The lessons:** insights 089 (a bound never wears a second hedge: "at most … plus any …"), 133, 140, 142 and 143.

---

## Implementation Units

### U1. The whole-engine proof that the gap beyond the printed figure is income tax and Medicare

- **Goal:** prove R6 and R7 on the whole engine before any word moves.
- **Requirements:** R6, R7; KTD2, KTD3.
- **Dependencies:** none.
- **Files:** `src/engine/__tests__/typedBelowTaxRider.test.ts` (new); `src/intake/__tests__/typedBelowWitnesses.ts` (the near-line household, a named export, never a member of `TYPED_BELOW_WITNESSES`, whose sweeps assume its six readings); the test counts in `README.md` and `docs/roadmap.md`, which `verify:doc-stats` reads. Outside the repo, the near-line probe (step 4) and its output, beside round 3's under `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-build2-surplus\u11-wholewindow\`.
- **Approach:**
  1. Copy the survivor proof's route, recorder and pass split (`src/engine/__tests__/typedBelowSurvivor.test.ts`, `candidateOf` and `checkedYearsOn`), recording per checked year the composed credit (none composed reads as $0), the check's shortfall, and `checkDrawn`'s `fundingNet` and `grossWithdrawal`.
  2. Scan seeds for paths where both people live through the window and keep the first three per household, re-drawing each kept path on the household's own params as the survivor proof does.
  3. Households: TM, the pension household (its one-year short spans), the crowned household, B retyped, C typed at $101,000 (still short), C at $100,985 (exactly $0), C at $8,749.99 a month (cents), `whole` (`same`), A (`bothCredit`), and TM as an all-sticky budget (the floor pass); TM and B retyped again under `drawdownPolicy` `taxable-first`, `pre-tax-first` and `bracket-fill`; and the near-line household (step 4). Round 3's all-alive seat already measured every one of the default-order households and TM and B retyped under taxable-first, 300 seeds each, with the residual past the shortfall at $0.00 (`alive\all300.out.txt`, `alive\taxfirst300.out.txt`): U1 moves that measurement into the suite and adds the two new orders and the near-line household.
  4. **The near-line household.** Base: TM. Set `drawdownPolicy: 'pre-tax-first'`, so a short year's whole draw at the quote comes from the 401(k) and each answer's recorded Medicare income in a working year does not depend on the path while the 401(k) holds out. Raise Alex's working-year investment income (`health.workingYearInvestmentByPerson[0]`, which `buildDateInput` adds to Medicare's working-year income) until a probe outside the suite shows, in at least one of 2029 to 2032, the typed answer's recorded income (`irmaaMagiRecorded`) under the first joint line that `irmaaScheduleAsCompared(irmaa, year)` gives for that year and the quote's over it, so the bill lands in 2031 to 2034 with Sam enrolled. Aim at that compared line, never the raw $218,000: the lines are re-indexed for each year. The raise also raises the tax the pay check charges on outside income (`WorkingYearCheckTerms.investmentIncome`), so it lowers each working year's cash and can move the spans: the probe prints the read's spans too, and the household is kept only while a `shortLeftOverAtTyped` span still holds that year (if it does not, lower the typed figure and the spending by the same amount and probe again). Record the probe, its figures and the Medicare difference it lands for the council's brief.
  5. Assert per working year and pass, never a sign on the tax difference: it runs either way (round 3: TM taxable-first's credit years, a tenth of them at −$285.29 or less).
- **Patterns to follow:** `typedBelowSurvivor.test.ts` (its `{ timeout: 60_000 }` per household, its non-vacuity checks, its PLANTED arm); witnesses from `src/intake/__tests__/typedBelowWitnesses.ts`.
- **Test scenarios:**
  - The bound. On every household and kept seed, every pass, every working year inside a span: the engine's own credit and shortfall difference, (typed credit less quote credit) plus (quote shortfall less typed shortfall), each on the cent (`toCents`), is at or under the span's `difference.most` in cents, and is 0 in a `same` span. This is the link from the engine to what the line prints, on every U1 household, the budget twin's floor pass included. (The read's own tie to the overlay's credits is E3's, `src/engine/__tests__/workingYearCredit.test.ts`, on fewer households and twenty fixed paths.)
  - The identity. The same years, on every full pass: the quote's `fundingNet` less the typed figure's, less the shortfall difference, equals to the cent the two answers' Medicare charge difference read off `healthReadout` (base plus surcharge plus extras). On the budget twin's floor pass, which has no readout, it is 0 to the cent (TM at the default order sits far from every line, round 3). Expected: 0 everywhere but the near-line household; a non-zero Medicare difference elsewhere is a finding for the council's brief, not a failure, since the rider covers it. With the bound, the only part of the gap the printed figure does not hold is the difference in income tax, `grossWithdrawal − fundingNet` on each run, and in Medicare premiums.
  - A run that carries no answer composes no credit: B retyped's run at the quote, under every order, where year 0 comes up short (the read's R5 gate; the overlay composes a credit only for a carried answer, `src/engine/taxOverlay.ts`, the `creditComposed` call). Assert none was composed, and read its credit as $0 in the bound.
  - Covers AE4. TM at the default order, the first kept seed, 2033: no shortfall at either answer, and the income-tax difference is at least $1 (R7; the register's $218 was on another seed, so the test reads the figure, never types it).
  - Covers AE5. The near-line household, every kept seed: at least one year in 2031 to 2034 whose two Medicare charges differ by at least $1 with the base equal (R7's Medicare half).
  - Non-vacuity of the runs: the draw probe fires in every checked year of every run (a $0 draw counts: 2026 to 2028 draw nothing at either answer, and TM's typed answer draws nothing in 2029 and 2030); every run that carries the answer composes a credit in every checked year; and at least one all-alive year per household credits money.
  - The premise of the tax read: on every full pass, `healthReadout`'s `acaNetPremium` is 0 in every checked year. The budget twin's floor pass has no readout (it observes the full track only); it rests on the same clamp, which is set by who works and not by what is spent. Say so in the test's comment.
- **Verification:** the file passes alone, pinned, inside its timeouts; a plant that drops the shortfall term from the identity reds it, and so does one that drops the Medicare term on the near-line household.

### U2. The rider words

- **Goal:** one rider, in the council's words, on every comparison the line makes and on the coda.
- **Requirements:** R1, R2, R3, R4, R5; KD2; KTD1.
- **Dependencies:** U1, the council's ruling.
- **Files:** `src/ui/copy.ts`.
- **Approach:**
  1. Add the rider constant beside `spanShortfalls` and use it to end `workingCostTypedBelowSpanShortOut`, `…SpanStillShort`, `…SpanEven`, `…SpanAtQuoteCredit`, `…SpanAtQuoteNothing`, `…SpanSame` and `survivorTakesLess` (a credit span's second sentence and `same`'s one sentence, never a third sentence).
  2. If the council keeps the credit spans or `same` bare, leave those slots as they are.
  3. Rewrite the block comments that state the rule (the span block above `workingCostTypedBelowSpanLabel` and the survivor block) to the new scope, and record the council's id.
  4. Grep the four ban lists for every word of the ruling before writing it (`docs/landmines.md`, Copy and copyGuard).
- **Patterns to follow:** `spanShortfalls` and `SPAN_QUOTE` (one home for a repeated phrase).
- **Test scenarios:** carried by U3 and U4 (the slots have no test of their own).
- **Verification:** `pnpm typecheck` and `pnpm lint` pass; `pnpm build` passes (a first-load string reads `entryCopy`).

### U3. The laws that read the rider

- **Goal:** the density law and copyGuard check the new rider by hand.
- **Requirements:** R1, R3, R4, R5; KTD4.
- **Dependencies:** U2.
- **Files:** `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/ui/__tests__/copyGuard.test.ts`.
- **Approach:**
  1. In the density law's span loop, require every span kind's last sentence to end on the rider, typed by hand (under the recommended ruling; a kind the council keeps bare must not carry it).
  2. Retype `codaLaw`'s first-sentence regex and its failure text to the new rider, and copyGuard's coda count literal.
  3. Keep the law's existing plants and add three: a short span with the old rider, a credit span with no rider (under the recommended ruling), and a coda with the old rider.
- **Patterns to follow:** `codaLaw` and its plants in the density law.
- **Test scenarios:**
  - The density law passes over every witness, budget twin, one-year form and host.
  - A planted short span ending "plus any income tax on those shortfalls." reds the new rule.
  - A planted `bothCredit` second sentence with no rider reds it (under the recommended ruling).
  - A planted coda ending "plus any income tax on it." reds `codaLaw`.
  - copyGuard's coda count still equals the gate-on households times the hosts.
- **Verification:** both files pass, and each new plant reds before it is reverted.

### U4. Every host's hand pins

- **Goal:** every by-hand pin of a sentence the rider ends names the new words.
- **Requirements:** R1, R3, R4.
- **Dependencies:** U2.
- **Files:** `src/intake/__tests__/workingYearLeftOver.test.ts`, `src/intake/__tests__/assumptionPanel.test.tsx`, `src/intake/__tests__/workingCostStep.test.tsx`, `src/ui/__tests__/reentry.test.tsx`, `src/ui/__tests__/resultPayCheckLine.test.tsx`, `src/ui/__tests__/copyGuard.test.ts`.
- **Approach:**
  1. Retype the rider pins by hand: 40 rider strings today (19 on a short span's line, 21 on a coda's, the density law's coda regex among the coda's), 25 in `workingYearLeftOver.test.ts` (the density law's coda regex among them, which is U3's), 5 in `resultPayCheckLine.test.tsx`, 4 in `assumptionPanel.test.tsx`, 3 each in `workingCostStep.test.tsx` and `reentry.test.tsx`. Find them by grepping "income tax" in each file.
  2. Under the recommended ruling, retype the credit and `same` pins too: 20 credit second sentences ("it would add at most $" or "it would add nothing, $": 11 in `workingYearLeftOver.test.ts`, 3 in `assumptionPanel.test.tsx`, 2 each in `reentry.test.tsx`, `resultPayCheckLine.test.tsx` and `workingCostStep.test.tsx`) and 9 `same` sentences ("adds the same to your savings as it would": 6 in `workingYearLeftOver.test.ts`, 2 in `copyGuard.test.ts`, 1 in `resultPayCheckLine.test.tsx`). Never compose a pin from the slots.
  3. Leave W's stale line's four "taking it out" pins alone (Deferred).
  4. The e2e texts (`e2e/vertical-fit.spec.ts`'s `PAY_CHECK_UNLOCKS` entries `datesavedtyped`, `datesavedtypedmoved`, `datesavedtypedpension`, the five-span placement arm and the coordinate-tap arm; `e2e/caddie-walk.spec.ts`'s `intake:typedbelow`) compose from the slots and move with them: re-run the fit gate, edit none.
- **Patterns to follow:** the survivor build's hand retype (its U4).
- **Test scenarios:**
  - Covers AE1. TM's short span on the Result, the gate and both seat hosts, typed whole.
  - Covers AE2. TM's coda on the gate and A's one-span coda on the Result.
  - Covers AE3. TM's credit spans and `whole`'s `same`, with the rider.
  - The pension household's one-year short spans ("that working year…") carry the rider.
  - C typed at $101,000 (still short) and at $100,985 (exactly $0) carry it on their second sentence.
- **Verification:** the reached files pass in the foreground; `pnpm verify:fit` passes pinned. The tightest frame is the gate on `?vault=datesavedtypedpension` at 1536×791: five spans (three `bothCredit`), the coda and the moved line above the affirm button. Under the recommended ruling it grows by about 240 characters (57 on each credit span, 16 to 18 on each short span, 30 on the coda). Measure its slack before the first edit and after the last; an overrun is the stop condition's layout step, never a cut.

### U5. The records

- **Goal:** the docs stop asserting the narrow scope, and the next builds are warned.
- **Requirements:** R8.
- **Dependencies:** lands with U2 to U4.
- **Files:** `docs/backlog.md`, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`, `docs/plans/features/typed-below-survivor-path-build-spec.md`, `docs/landmines.md`, `docs/council-log.md`, `TODO.md`.
- **Approach:**
  1. Close the Tier 0 rider entry with the commit and the council's id. Scope its "Never the other way" to the rows it measured: every default-order year, short and credit (round 3's t-dist: no row with the typed answer paying $1 or more), and taxable-first's short years; taxable-first's credit years run both ways (the tenth percentile at −$285.29 over 546 rows, `review-r3\verify-2\t-dist.out.txt`).
  2. Close the surcharge entry with the commit: U1's near-line household, its figures, and the council's ruling on the words. If the council keeps Medicare out, the stop condition holds the build instead.
  3. File W's stale line's rider as its own entry (Deferred), measure first.
  4. Amend the rebuild plan's R6 and the survivor plan's coda wording in place, each pointing here.
  5. Add the landmines: the proof's income tax is `grossWithdrawal − fundingNet` only in a clamped working year, which prices no ACA; and `healthReadout` observes the full track only, so a budget run's floor pass has no Medicare readout.
- **Test expectation:** none — docs only; `pnpm verify:doc-stats` passes.
- **Verification:** `pnpm verify:doc-stats` passes after `doc:reanchor`.

---

## Verification Contract

Each commit runs the TODO close block's "The review's gates" as this table scopes them, each heavy run alone, in sequence, pinned to the P-cores:

| gate | when | passes when |
|---|---|---|
| `git rev-parse HEAD` | before the first edit | the re-anchor base is recorded |
| `pnpm typecheck`, `pnpm lint` | after the last edit | both exit 0 |
| `pnpm doc:reanchor <base>` | before staging | dry run classified, applied once, the frozen files restored |
| the reached files, foreground, `--maxWorkers=2` | after the edits | every file green; CI's `pnpm test` is the full run |
| `pnpm verify:doc-stats` | after the re-anchor | exit 0, counts retyped in `README.md` and `docs/roadmap.md` |
| `pnpm build`, `pnpm verify:fit` | U2–U5's commit | both exit 0, the tightest frame's slack recorded before and after |
| the sweep and the per-key idcheck against `ww3` | a commit that changes a `src` file outside `src/ui/copy.ts` and the `__tests__` folders | 0 keys moved. None is planned: U1 adds tests and a test helper, U2 changes `copy.ts` alone, and no other layer can reach an engine output (the engine imports only `@shared`); a ruling that adds a composer branch (KD2's fourth call, the keyed alternative) brings it in |
| the mutant pass | after U2–U5 | every plant red: the old rider on one short kind, a credit span with no rider, the old rider on the coda, U1's shortfall term dropped, U1's Medicare term dropped |
| CI on each commit | after push | both jobs green |

---

## Definition of Done

- U1 is committed and green, its result and the near-line household's figures written into the council's brief.
- The council has ruled, and its id is in `docs/council-log.md` and in the copy's block comment.
- U2 to U5 are committed together with every gate green, and CI is green on both commits.
- No engine output moved, and no abandoned attempt is left in the diff.
- Walk 8 is START HERE's next step, with the new rider among its reads: a credit span's density with the rider, the Medicare half on a household where nobody enrolls inside the window, and the coda's rider beside "That is the whole gap…".

---

## Reader faults listed, not folded

The three blind readers' minor faults (`wf_0b7520f9-7cd`), each checked against the code; a builder reads them before the unit named.

- **U2:** three per-slot comments in `src/ui/copy.ts` also state the old scope (`survivorTakesLess`'s "with the money picture's own tax rider", `…SpanShortOut`'s "the tax rider on the shortfalls the difference counts", `…SpanStillShort`'s "with the tax rider on that draw", and `…SpanEven`'s "with the tax rider"), and `src/intake/workingYearLeftOver.ts` has one more: grep "tax rider" in both files and rewrite every hit with step 3.
- **U3:** the density law's span loop is inline expects today, so a plant cannot red it: pull the span rider rule out into a pure verdict function, as `codaLaw` is, before adding its plants.
- **U5:** closing the two Tier 0 entries lowers the register header's open count, which `verify:doc-stats` checks: retype it. `docs/council-log.md` gets the council's row (its id, the four calls, the ruling). `TODO.md`'s START HERE moves to walk 8, and its (bg) item (W's "taking it out" read as maybe none) goes into the W stale-line rider entry step 3 files, so those words have one home.
- **The caddie arm** `intake:typedbelow` composes from the slots and is walk 8's to run; it is not a commit gate (`pnpm caddie:walk` is driven by the caddie skill).
