---
title: "Act 5 — The Workbench (scoping brief)"
doc-type: plan
status: scoping
created: 2026-11-09
---

# Act 5 — The Workbench (scoping brief)

**Status: SCOPING. Nothing here is planned or built.** Briggsy ruled the direction in conversation on 2026-11-09. This brief records what he ruled, what is in and out, and the design calls the plan must settle. Build status lives in the roadmap's [You-Are-Here table](../roadmap.md#the-you-are-here-table), which does not carry this act yet; the amendments this act owes the canonical docs are listed at the end and are NOT made.

**This repo is public.** The household's real holdings, balances and family facts are never written here. Answers of that kind stay in the conversation; this brief records only the product calls they settle.

## What he asked for

His words, 2026-11-09:

- "what I think I really need is a RightCapital clone. Not for sale, not for sharing. Just for casa da Briggsy." And: "we need the full blown FA version, not the stripped down one they let end users play around with."
- "no backoffice client bullshit. no student loan, 529, etc."
- "I can enter bank balances, IRA/brokerage securities (cusip, qty, cost basis) and no direct linkage (I wouldn't use it on RC either)."
- What he likes most: "the quick what-if scenarios"; "the yearly spends (with the ability to add shit like a new car every 5 years)"; "the amount you need to pull from each source"; that it knows MAGI for ACA and IRMAA, RMDs and bracket-filling Roth conversions; and "the flow".
- The how is delegated: "if we can replicate the simplicity of their flow, you dictate how we get there, I'm ATC baby."

He agreed ("totally agree") to the pilot's framing: this is B9's next act, in this repo, on this engine and this saved plan. It is not a second project (that would need its own copy of the engine, and every fix would have to land twice), and it does not wait for B9 to be "over".

**Original work only.** Same jobs, our own code, screens and words. Nothing is copied from RightCapital: not its screens, its feature names or its text. His notes or screenshots of it are for understanding what a screen lets him do.

## The idea

B9 today is the client's chair: one calm answer, then one recommendation. The workbench is the advisor's chair behind it. Same household, same engine, same saved plan, laid out so he can change anything, try it without risk, and see every year.

The simplicity he likes comes from three mechanics, and the workbench is those three:

1. **One facts page.** Everything the household told the tool, in one place, entered once, any line editable.
2. **A lever rail.** Every what-if is a lever pulled on a copy of the plan. The real plan is never at risk, and a what-if can be named, kept and compared.
3. **One year-by-year table.** Every year: what comes in, what goes out, tax, what is pulled from each account, and what is left.

## In (version 1)

| Piece | B9 today (read in code 2026-11-09) | What the workbench adds |
|---|---|---|
| Quick what-ifs | Two levers have them: the withdrawal-order sheet and the Roth sheet each compare two futures on the same market draws, and nothing is saved unless he says so (`src/store/controlPreview.ts`, `src/intake/controlPreview.tsx`, `SequencingControl.tsx`, `RothLever.tsx`). | The same seam for every lever (stop-work year, spending lines, Roth, withdrawal order, Social Security claim age, the pace of an inherited IRA's withdrawals), all on one rail; named what-ifs kept side by side. |
| Yearly spending | Named budget lines with an amount per year, a start year and an end year (`BudgetLineItem` in `src/shared/model.ts`; `src/budget/budgetToSpending.ts` turns them into dollars per year). A one-time buy works as a one-year line. | A repeat ("every 5 years") on a line. The engine already takes a list of dollars per year, so this is an entry and compile change, not an engine change. |
| What to pull from each account, each year | The engine decides it inside every future and does not hand it out. `Distribution` carries totals per future, a year-by-year portfolio range (`bandFan`), a year-by-year healthcare readout and, for the working years only, the money picture (`src/engine/workingYearLedger.ts`). | A new opt-in engine output: one future, year by year, account by account. The main new piece. |
| MAGI, ACA, IRMAA, RMDs | Built. One map holds the ACA cliff, the IRMAA steps and the bracket edges (`src/engine/magiLandscape.ts`), and the bracket-fill withdrawal policy steers by it. RMDs have their own module (`src/engine/rmd.ts`). | Each year's row shows the income the cliffs read, and how much room is left under the nearest line. |
| Roth conversions | One lever: an amount per year, a start year, a number of years (`RothConversionPlan`). | A second mode: convert up to a chosen line (a bracket top, an IRMAA step, the ACA cliff) each year in a window. The map that knows the lines is built. |
| Accounts and holdings | One balance, one cost basis and a stock/bond/cash split per account (`EnteredAccount`). No bank-account kind. A ticker field is reserved and not collected; a table knows the mix of 161 fund families by ticker (`src/engine/reference/tickerBlend.ts`). | Bank accounts, an inherited-IRA account kind (design call 9), and position-level entry, following the shape already ratified in [decisions/portfolio-holdings.md](../decisions/portfolio-holdings.md) (design call 6). |

## Out

- The advisor back office: many clients, a client portal, compliance, billing.
- Student loans, 529s, business planning, insurance needs, estate flowcharts.
- Bank linkage and price feeds. R36 stands: every number is typed, or read from a file he drops in.
- Searching Social Security claim ages for him. Claim age is a lever on the rail; the search stays on [product.md](../product.md)'s chapter-two list.
- Different investments in different accounts (asset location) and more asset classes. Chapter two, under [architecture.md](../architecture.md) §3's one-shared-draw rule.
- A library of stress tests. One rough-market view of the table is in (design call 1); a library is not.
- Tracking past spending.

## Design calls the plan must settle (the pilot's, each with its lean)

1. **Which future the table shows.** A Monte Carlo engine has no single plan to print. Lean: the table shows one steady-market future by default (it reads cleanly and reacts at once, because it is one future and not thousands), the "X of 10" stays pinned beside it and catches up a beat later, and one tap shows the same table in a rough-market future. The tidy table never stands alone as the answer. The working-year money picture already made a call of this kind (nobody dies, the household's own numbers). The engine can already replay one fixed market sequence through its own yearly step (`src/engine/historical.ts`); whether such a run carries the tax and healthcare layers is NOT verified and is the plan's first check.
2. **Rhythm: commit, then redraw once.** A lever commits on blur or Enter and the table redraws once. No figure ticks while a slider drags, and nothing counts up. That is the design law's static-figure rule and its ban on the bargaining tick. Today's Roth sheet already works this way (its fields commit on blur).
3. **One producer.** Every number in the table comes out of the engine's own year loop through the new opt-in output. Nothing is re-derived in the UI or in a second function: insight 081 (re-deriving a producer's inputs forks at its first early return; only its output cannot drift), insight 080 (a second producer of one fact turns the first one's wording into a lie), and the money picture's "one route to every figure" rule. The output names each account, never an aggregate that cannot be checked (insight 024), and money reads one grain (insight 146). Like `bandFan`, asking for it leaves the answer byte-identical.
4. **Where it lives.** A second room, reached on purpose. The calm answer stays the front door and the first thing a reader sees. The room loads lazily, behind an error boundary with a retry (insight 053).
5. **What a what-if is.** A named copy of the plan's levers, run on the same futures as the plan, so a difference is real and not luck. Today's what-if law carries: nothing reaches the saved plan without an explicit Save. The vault holds one plan record today (`src/store/db.ts`); kept what-ifs ride inside it as an additive, optional shape. No real plan had been saved as of 2026-10-21; confirm that before treating any saved shape as free to change.
6. **Holdings.** Build the ratified shape: a position is a label, a mix and a dollar value read off the statement; the account's balance stays the authority; any gap between the balance and the positions is shown in plain words, never absorbed. Three things in his ask go past that record, and each needs a dated addition to it at plan time: a quantity per position (display only, since there is no price to multiply it by), a cost basis per position (summed, and reconciled against the account's basis the same visible way), and CUSIP as a label (the fund table is keyed by ticker, so an unknown position is classified once by hand). Positions are typed. A broker's positions file dropped into the page was the first lean and is CUT (2026-11-09): this household holds a handful of positions, typed in a minute, so an import would be a feature it never uses.
7. **Single companies and narrow funds. SETTLED 2026-11-09 on his answer** (mostly broad funds, a few single-company positions). The engine has two assets, stocks and bonds, and "stocks" means the whole market. A single company, or a narrow index fund, swings harder than that, and by how much is something nobody can know. So: (a) such a position counts as stocks in the mix and never gets a made-up risk number of its own, which [architecture.md](../architecture.md) §3's one-shared-draw rule forbids anyway; (b) the facts page says, in dollars and as a share of the household's money, how much rides on single companies, and that the plan treats it like the whole market; (c) the lever rail carries a what-if for it: those positions fall by half, or to zero. The bundled fund table already covers broad index funds and money funds; a single company is classified once by hand.
8. **How exact the table looks.** A fact reads exactly (a typed balance, this year's RMD). A projected, market-dependent figure reads rounded with "~", under the design law's no-spurious-precision rule. Columns use tabular numerals.
9. **An inherited IRA is its own account kind.** Found 2026-11-09: intake has no such kind, and one entered as a traditional IRA reads rosy three ways (the register's Tier 0 *An inherited IRA has no account kind — entered as a traditional IRA it is held too long, offered for conversion, and missing from the income the cliffs read*). The facts page and the year-by-year table both need it, because the withdrawals the law forces are income the cliffs read. It is built under that register entry, its rules sourced from the IRS primary first. How early it is built follows how much of the household's money it holds; the plan ranks it. A small one mis-times only a little income, but a little income can be enough to cross a cliff, so the table is not trusted near a cliff until it is built. For a traditional one under the ten-year rule, the pace of withdrawals inside the window is a third tax lever, coupled to withdrawal order and Roth conversion through the same income lines, with a floor in any year the law sets a yearly minimum and a hard end at the tenth year. The lever rail carries it in version 1; whether the solver searches it is the plan's call.

## What carries and must not break

- Every engine invariant in [architecture.md](../architecture.md): one shared market draw, the reduce-to-spine rule, opt-in outputs that leave the answer untouched.
- The cardinal rule. A table of exact-looking dollars is the easiest place in the product to be calm and wrong. Design calls 1, 3 and 8 are its guard.
- The design law (`.claude/skills/back-nine-design/SKILL.md`): never color alone, chart text in HTML, tabular numerals, every string through the copy catalog and copyGuard, plain words he reads on the first pass.
- The CSP. A dropped file is local; nothing in this act adds a network call.

## How the numbers get checked

- The table is the engine's own output (design call 3), and a pinned test reconciles the table's yearly figures to the run's own totals.
- New arithmetic gets an independently derived fixture before it ships: the fill-to-a-line conversion and the repeating-line compile.
- If he brings RightCapital's year-by-year figures for his own household, they are lined up against ours as a source of leads. A difference is a question to chase in both tools, never a verdict.

## Open questions for Briggsy

1. ANSWERED 2026-11-09 in conversation: the holdings question (it settled design call 7) and an inherited IRA's facts (design call 9). The lesson for intake is on the register entry: ask the owner's birth year, never whether the owner was taking required withdrawals.
2. If RightCapital access comes back: the year-by-year figures for one plain scenario of his own household, and the order of what he clicks in the first ten minutes of a what-if session.

## Owed to the canonical docs (NOT made here; another session was live in the tree on 2026-11-09)

- [product.md](../product.md): a dated flag on the scope boundaries and the lever set this act re-opens (the "not a dashboard" line, which stays true of the primary surface; holdings entry; the chapter-two items it leaves alone).
- [roadmap.md](../roadmap.md): the four acts become five, with an Act 5 section in the You-Are-Here table once units exist.
- The design law's tone paragraph: "never a dashboard" is scoped to the front room.
- [docs/README.md](../README.md)'s map row for the act plans; `TODO.md`'s ranking; and a read of [backlog.md](../backlog.md) for entries this act absorbs, before anything is filed as new.

## Next steps

1. His answers to the two questions above.
2. `/brief`, then the plan: units, deepened and checked as a whole, with design calls 1 to 9 settled (a council for any the pilot would otherwise park).
3. Build in slices, each usable by itself. First the year-by-year table on his real numbers (the engine output, then the table). The inherited-IRA account kind is ranked by the plan (design call 9). Then the lever rail, kept what-ifs, repeating spending, fill-to-a-line conversions and holdings entry.
