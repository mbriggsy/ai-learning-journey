---
title: "RightCapital against The Back Nine: the feature map"
doc-type: plan
status: ruled 2026-11-22 (the flow and the order); building in that order
created: 2026-11-22
---

# RightCapital against The Back Nine: the feature map

**The mandate (Briggsy, 2026-11-22):** "I want to replicate RightCapital. Period. For me. Just me. All of their features,
their flow. I'm not selling it. I'm not sharing it. I just want to get confidence on my financial plan."

This map lists what RightCapital does, what B9 does today, and the gap between them. The yardstick for every row: does
RightCapital do it, and does his plan need it. He orders the gaps; each one is then built in his order. Same jobs, our own
code, screens and words: nothing is copied from RightCapital's screens, names or text. ⚑ *Superseded for the screens on
2026-11-24 (Briggsy's turnaround ruling): the UI is now a RightCapital clone, its screens, layout, navigation, flow and
chart types copied on purpose; their logo, name, artwork and text are still never lifted, and the code and words stay
ours. The build is Act 6, [6-rightcapital-ui-plan.md](6-rightcapital-ui-plan.md); this map's gaps still land in its
order, each as its RightCapital screen.*

**Sources.** RightCapital: its help center and product pages, read through search on 2026-11-22 (help.rightcapital.com's
data-entry, retirement analysis, cash flow, tax strategies, Social Security, health care and stress test articles). Those
are second-hand summaries of public docs. If his RightCapital access comes back, a ten-minute click-through confirms the flow.
B9: read in the code the same day, never from the requirements ledger. **This repo is public:** the household's own
facts stay out of this file.

This map widens [5-workbench.md](5-workbench.md) and [5-workbench-plan.md](5-workbench-plan.md). Those two scoped a
workbench room beside B9. The mandate makes RightCapital's whole feature set and flow the target. Their units remain the
build pieces for the rows they cover (named below). Gap 1's units (U2–U8) are built; the rest are not.

## How each one flows

**RightCapital.**
1. **Profile, in six steps:** family, income, savings, net worth (accounts, property, debts, insurance), expenses, goals.
2. **A workspace of tabs** over that profile: retirement analysis, cash flows, stress test, Social Security, health care,
   tax strategies, tax estimate, investments, insurance, estate.
3. **The what-if mechanic.** The current plan is the profile as entered. A proposed plan copies it and changes "action
   items" (retirement age, claim age, spending, savings, Roth conversions, withdrawal order, allocation). The two sit side
   by side, and the odds recompute when an item changes.
4. **Blueprint:** one visual page of the whole household, editable in place.

**B9 today.** A one-question-at-a-time setup, then one calm answer (the work-optional date for a working household, the
odds for a retired one), then one recommendation (withdrawal order plus Roth conversions). Two futures side by side exist
for those two levers only. An assumptions panel shows what the answer used. There is no workspace and no year-by-year
view.

## The flow (ruled 2026-11-22)

RightCapital's flow is a workspace. B9's is a calm answer with a recommendation under it. `docs/product.md` ruled the
second ("one answer, then one recommendation — not a dashboard") and the mandate asks for the first.

**Briggsy picked the workspace home (2026-11-22), as recommended:** keep B9's setup as the profile entry. It asks the same things RightCapital's six steps ask, one
question at a time. After setup, the home becomes a RightCapital-style workspace: a facts page, the analysis (current vs
proposed with action items), the year-by-year table, then tax, Social Security, health and stress tabs. B9's calm answer
and its recommendation become the analysis tab's headline. Nothing B9 computes today is lost.

## The map

**Have** = B9 does it. **Ahead** = B9 does more than RightCapital. **Gap** = to build. **Out** = his 2026-11-09 ruling.
Sizes are rough: S is about a session, M a few, L a week of sessions.

### 1. Setting up the household (RightCapital's profile)

| RightCapital | B9 today | Status |
|---|---|---|
| Family: names, birthdays, a planning age at death, home state | Two people, birth years, sex. Each lifespan is drawn per future from mortality tables, so the survivor years are priced, not assumed | Ahead |
| State income tax for every state | Priced for NC, PA and FL. Any other state runs with zero state tax (register *Unpriced states — a confident winner computed with zero state income tax*) | Gap only for an unpriced state: M per state |
| Salary with start and end dates and a yearly raise | One flat pay figure per person until the stop date (register *Pay is one steady figure all the way to the stop date…*) | Gap: raises, pay cuts, part-time years. M |
| Social Security: estimate, statement value or earnings history; claim age | Statement figure and claim age per person. Spousal, survivor and earnings-test amounts are computed (`socialSecurityBenefit.ts`, `earningsTest.ts`) | Have |
| Pension, annuity, rental, other income | Start and end age, raise rule, taxable share, survivor share (R40) | Have |
| Self-employment income | None | Out unless the household has it |
| Savings: yearly deposits per account, employer match | Per-account deposits, match, HSA, the legal limits by age, all stopping at the work-stop date (R30, R31) | Have |
| Accounts: bank, brokerage, IRA/401k, Roth, HSA, inherited IRA | Taxable, pre-tax, Roth and HSA per person, one stock/bond/cash mix per account. No bank-account kind. No inherited IRA (register Tier 0 *An inherited IRA has no account kind…*) | Gap: bank accounts S (workbench U10); inherited IRA L (U11–U13) |
| Holdings: ticker or CUSIP, quantity, cost basis per position | One mix per account. Position entry is shape-ratified and not built ([decisions/portfolio-holdings.md](../decisions/portfolio-holdings.md)) | Gap: M (U20) |
| Home and other property: value, growth, property tax | None. Property tax or upkeep can be a budget line | Gap only if a sale is planned (see one-time money) |
| Debts: mortgage balance, rate, term | No loan record. Since gap 4's line half (2026-11-27) a payment can be a budget line that "Stays the same dollar amount", priced in today's dollars through the one price index, but it is charged in retired years only and its last year counts from the stop | Gap: the loan on Net Worth, L (the loan half of [gap 4's plan](features/spending-line-repeat-and-rate-build-spec.md); deferred until a plan needs a loan, register Tier 3 *A mortgage or other fixed-payment loan has no record of its own…*) |
| Insurance policies (life, disability, LTC) | None | Out (no insurance-needs work); the LTC cost row below stays |
| Living expenses, one figure or by category, extra expenses with start and end | One figure, or an itemized budget: categories, essentials vs discretionary, start and end years (`BudgetLineItem`) | Have |
| A goal that repeats (a new car every five years) | A budget line repeats every N years (gap 4's U3, 2026-11-27); a household with one spending figure has no repeat (register Tier 3 *A household with one spending figure can't mark a repeat or a rate…*) | Have |
| A different inflation rate per expense | A budget line goes up with prices, stays the same dollar amount, or goes up by its own percent (gap 4's U4, 2026-11-27) | Have |
| Retirement age per person | Yes. For a working household B9 also searches the stop date itself (the work-optional date, R26–R28) | Ahead |
| Retirement health costs: pre-Medicare, Original Medicare, Medigap, Advantage, IRMAA | Marketplace premium with the subsidy and its cliff, Part B with IRMAA on the two-year lookback, the extras premium (Part D, Medigap or Advantage), out-of-pocket costs, HSA (R24) | Have |
| Long-term care cost for a stretch at the end of life | None (register *Long-term care is neither modeled nor listed as left out*) | Gap: M |
| Charitable giving, QCDs from an IRA | None | Gap only if the household gives: M |
| One-time money in: an inheritance, a home sale | None (register *A known one-time inflow — an inheritance, a home sale, downsizing — has no place to go*) | Gap: S–M |
| Spending styles: steady, the "smile", go-go/slow-go stages, guardrails, floor and ceiling | Stages can be built from budget windows. Nothing reacts to the markets: every future spends the plan as entered | Gap: guardrails and floor-and-ceiling, spending that reacts in each future. L (engine) |

### 2. The answer (RightCapital's retirement analysis)

| RightCapital | B9 today | Status |
|---|---|---|
| Probability of success over 1,000 trials | "X of 10 futures" over 2,000 futures while entering and 16,000 for the final answer; the survivor case read separately; essentials and the full plan read separately (R2, R27) | Ahead |
| A chart of the range of balances over time | The fan chart (`ConfidenceBand.tsx`) | Have |
| Current vs proposed side by side; action items for any input | Two futures side by side for withdrawal order and Roth only (`controlPreview`). The recommendation compares the solver's pick with today's plan. No what-if on spending, stop date, claim age or mix. Nothing kept by name | Gap: what-ifs on every input, kept by name. L (U14–U16) |
| Savings over the working years | The working-year money picture: year 0 plus the years an event changes it (`workingYearLedger.ts`) | Have, partly; the rest lands in the table |
| Income sources, withdrawal rate and spending, year by year | None | Gap: lands in the table |
| A recommended strategy | The solver searches withdrawal order and Roth conversions, grades its own confidence and shows the runner-up (R9–R23) | Ahead |
| How much the plan could spend | The spend solve (`spendSolve.ts`) | Have |

### 3. Year by year (RightCapital's cash flows)

| RightCapital | B9 today | Status |
|---|---|---|
| A table per year: income, expenses, taxes, savings, net flow; balances and withdrawals by account; RMDs; net worth | None. The engine computes every figure inside each future but hands out only totals, a yearly balance range and a yearly health readout | **Gap: the biggest one.** Most later rows display on it. L (U2–U7) |
| A picture of one year's money in and out (waterfall) | None | Gap: S–M, after the table |

### 4. Taxes

| RightCapital | B9 today | Status |
|---|---|---|
| Withdrawal order: six fixed orders | Five policies: pro-rata, taxable first, pre-tax first, bracket-fill and any custom order; the solver picks | Have |
| Roth conversions: a fixed amount, or "fill up to" a tax bracket, a capital-gains bracket or an IRMAA tier, with start and end years | A fixed amount, a start year and a number of years; the solver searches amounts | Gap: fill-to-a-line. M (U19) |
| Income (MAGI) against the IRMAA and other lines, year by year | Computed inside the engine (`magiLandscape.ts`), never shown | Gap: M (U22) |
| RMDs | SECURE 2.0 ages, per person, the younger-spouse table | Have |
| ACA premium credit | With the 400% cliff | Ahead (not found in RightCapital's docs) |
| Per-year tax: effective rate (federal, state, payroll), top bracket, capital-gains bracket | Lifetime totals only | Gap: S once the table exists |
| A projected 1040 with schedules for any year | None | Gap: M |
| Read an uploaded past return | None | Out (every figure is typed; the app makes no network calls) |
| NIIT, AMT, itemized deductions | NIIT is left out; standard deduction only; no AMT | Gap only where it moves his numbers: measure first. S–M each |

### 5. Social Security

| RightCapital | B9 today | Status |
|---|---|---|
| Compare claim ages (62, full retirement age, 70, the best one), lifetime totals, a break-even chart | Claim age is an input. No comparison, no search (product.md lists the search as chapter two) | Gap: the comparison M (rides the what-if runner); the search for the best age L |

### 6. Stress tests

| RightCapital | B9 today | Status |
|---|---|---|
| A market drop now or at retirement, lower returns, higher inflation, higher taxes, a Social Security cut, a longer life; one at a time and combined, odds re-run | None in the app. A historical replay exists in the engine for validation only (`historical.ts`) | Gap: M (U4 starts it). For gap 8's `/brief` (2026-11-23): a fixed shock in year k applied to every path, such as a drop at retirement, uses no draw, since [architecture.md](../architecture.md) §3 allows a fixed tilt on the one shared draw; the workbench plan's KTD30 ("a fall in a later year would need a draw of its own") holds only for a fall in a random year. Higher inflation must also move the deflator of every line priced through the index (gap 4's rated lines, `src/intake/priceFrame.ts`, and its loans once built), or a fixed payment reads unchanged under the test (gap 4's plan, Deferred to Follow-Up Work) |

### 7. Investments

| RightCapital | B9 today | Status |
|---|---|---|
| Current vs target mix, the mix over time | One mix per account, blended into one household mix, fixed for life | Gap: a mix what-if S (on the runner); a mix that changes over time M |
| Risk questionnaire | None | Out |
| Different mixes in different accounts | Barred by the one-shared-market-draw rule ([architecture.md](../architecture.md) §3) | Out unless that rule is reopened |

### 8. Out of scope (his rulings, 2026-11-09)

The advisor back office (client portal, document vault, tasks, workflows, reports, branding, integrations, the AI
assistant); account linking and price feeds (R36); budgeting and transaction tracking; college savings and student loans;
business planning; stock plans; insurance-needs analysis; estate flowcharts and trusts; the debt-payoff tool. B9's
"leave more" goal already reads what heirs keep after tax.

## The order (ruled 2026-11-22: this one, as recommended)

1. **The year-by-year table** (U2–U7). It is "the amount you need to pull from each source", and every later row shows on it.
2. **The workspace, with what-ifs on every input, kept by name** (U14–U16), and the flow question answered. Since the plan's 2026-11-23 amendment: U9 (a slim schema version 6), then U14–U16, then U25 (the workspace home).
3. **The inherited-IRA account kind** (U11–U13). Tier 0: one entered as a traditional IRA reads rosy three ways today.
4. **Repeating expenses, a per-line inflation rate, a fixed payment that ends** (U18 plus the register's mortgage entry). *Built 2026-11-27 as its own plan, [spending-line-repeat-and-rate-build-spec.md](features/spending-line-repeat-and-rate-build-spec.md): the line half (the repeat and the rate) whole; the loan half waits on whether his plan needs a loan.*
5. **One-time money in** (inheritance, home sale).
6. **Fill-to-a-line conversions and the yearly income-against-the-lines view** (U19, U22).
7. **Social Security claim comparison**, on the what-if runner.
8. **Stress tests.**
9. **Spending that reacts to the markets** (guardrails, floor and ceiling).
10. **Per-year tax detail**, then a 1040-style year.
11. **Positions and bank accounts** (U20, U10).
12. **Pay that changes** (raises, part-time years), **long-term care cost**, then QCD, NIIT, AMT and itemized deductions, each
    only where it moves his numbers.

## After the ruling

- Done 2026-11-22: the flow ruling sits in `docs/product.md` (the flag under its opening, the calm test, §5, the scope
  boundaries), the design skill's tone law and the project `CLAUDE.md`. A grep for the old premise's words ("not a
  dashboard", "one answer, then one recommendation", "second room") found the rest in dated records (built act plans,
  closed register entries, the cold-read log), which stay as written.
- `docs/roadmap.md` gains the mandate's act, and its You-Are-Here table gains rows as units land.
- Each gap is built in his order, opened with `/brief <that gap>`. Where a workbench unit covers it, that unit's plan is the
  starting point. Re-check the unit against this map first (insight 041: a plan step written before a decision is a guess).
- The yearly yield build (workbench U23) has no gap of its own in the order above. It must land before gap 6, because U22
  depends on it and the workbench plan's KTD32 holds U19's ACA and IRMAA lines until it lands (the pilot's call, b9-3,
  2026-11-23).
