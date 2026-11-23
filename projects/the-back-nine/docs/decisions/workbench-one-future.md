---
title: The year-by-year table's one future — the steady and rough markets, the rough pick in two frames, and the two measurements its words rest on
doc-type: decision
status: decided
created: 2026-11-22
derives-from: [docs/plans/5-workbench-plan.md, docs/decisions/market-model.md]
sources: [src/engine/simulate.ts, src/engine/reference/roughSequence.ts, src/engine/reference/__tests__/roughSequence.test.ts, src/engine/validation/blockBootstrap.ts, src/engine/dateSearch.ts, src/intake/intakeMap.ts, scripts/measure-one-future.ts]
---

# The table's one future

## What this record decides

The year-by-year table (gap 1 of [the RightCapital map](../plans/rightcapital-map.md); the workbench plan's U2–U7) shows
ONE future of the plan, a row per year. It is never the answer: the many-futures answer stays pinned beside it (R9). Two
futures are named, and this record is their home:

- **Steady** (the plan's KTD2): every market score 0, the couple's middle lifespans.
- **Rough** (KTD3): the Shiller series' 1966–1995 window, standardized, then steady; the same lifespans.

It also holds the two measurements the plan's U4 ordered before any of the table's words lean on either view (§3, §4),
and what they let those words say (§5). Every number below is printed by `pnpm tsx scripts/measure-one-future.ts`
(about 20 minutes; `--quick` prints §2's and §3's market tables in seconds), measured 2026-11-22 on the engine at
`bb4b1f0a`.

## §1 — The two futures

**Steady.** `steadyFuture` (`src/engine/simulate.ts`): every stock and bond score is 0, so each asset earns its MIDDLE
(median) return every year through the engine's own transform. On the production market that is 3.49% for stocks and
0.82% for bonds, real, against means of 5% and 1%: `toLogMoments` takes the swing's drag out. The lifespans are
`middleLifespanScores`: the first death in its middle year, the last in the couple's middle year. No return is typed
anywhere.

**Rough.** `roughFuture` (`src/engine/reference/roughSequence.ts`): the 30 years of the 1966–1995 window, each asset's
log real return standardized against the series' own average and swing (`shillerJointZSeries`), fed through the same
transform at the plan's market, then every score 0 after year 30. The lifespans are the steady future's, so the two
views differ only in the market. It takes no household input, so every plan and every what-if reads the same market
(R8). A market whose stock-bond correlation is not 0 is refused by name, because the injected scores skip the
correlation step; every shipped market has 0.

- **Why standardized.** History's raw returns run richer than the plan's market: the series' stocks average 6.6% a
  year in log terms, the plan's 3.4%. Fed unscaled, the rough view would be richer than the steady one. Standardizing
  keeps history's ORDER of good and bad years at the plan's own level.
- **The pick rule.** The start whose highest sustainable flat real withdrawal (a share of the opening balance, held
  for 30 years) is lowest, at a fixed 50% stocks, in history's own returns, ties to the earlier year.
  `backtestWindow` only says survive or fail, and every window survives 4%, so each window's rate is found by
  bisection and pinned to an independent closed form (`roughSequence.test.ts`). It is computed from the committed
  series on every call; nothing is baked.
- **1966 is the series' last 30-year start** (the series ends in 1995), so the rough view always reads steady from
  year 30 on.

## §2 — The pick in two frames

Both frames rank the 41 windows that start 1926 to 1966. History's frame is the pick's own (`rankRoughWindows`).
"The plan's market" puts each window's standardized scores through the plan's transform (the production market) and
ranks by the closed form: a second ranking, never a reuse of the first.

| Stocks | History’s frame: worst start (rate) | 1966’s place | The plan’s market: worst start (rate) | 1966’s place | Agree? |
|---|---|---|---|---|---|
| 40% | 1937 (4.08%) | 2 of 41 (4.20%) | 1937 (2.94%) | 5 of 41 (3.30%) | yes |
| 50% | 1966 (4.17%) | 1 of 41 (4.17%) | 1937 (3.10%) | 2 of 41 (3.21%) | no |
| 60% | 1966 (4.13%) | 1 of 41 (4.13%) | 1966 (3.12%) | 1 of 41 (3.12%) | yes |
| 100% | 1966 (3.85%) | 1 of 41 (3.85%) | 1966 (2.70%) | 1 of 41 (2.70%) | yes |

**Where they disagree: 40% and 50% stocks, on 1937.** At the pick's own 50%, the plan's market ranks 1937 worst
(3.10%) and 1966 second of 41 (3.21%). The bonds cause it. History's real bond returns swing 4.2% a year (log), the
plan's 5.9%, so re-scaling makes every bond year 1.4 times as loud in the plan's market (stocks go the other way:
18.5% in history, 17.0% in the plan). 1937's window hurts mostly through its bonds: their scores average −0.56 over
its first ten years and −0.42 over thirty, the 1940s, when inflation ate bond returns. 1966's hurts mostly through its
stocks (−0.44 over ten years; its bonds average +0.14 over thirty). So the more bonds in the mix, the further 1937
pulls ahead. At 60% and 100% stocks both frames pick 1966.

**The pick stays 1966 (KTD3).** A pick re-ranked in the plan's market would move with the market's figures and the
stock share, so two what-ifs could show two different markets, which is what R8 forbids. The disagreement binds the
words instead (§5).

## §3 — Measurement (a): the steady future against the band's middle line

**The run** is the one the table shows (KTD9): an all-retired seed's spine (2,000 paths, its own seed); a dated working
seed's candidate at its band's offset, on its band's track, from the final-tier date search the result screen commits
(16,000 paths); a working seed with no date on either track, the window-top candidate's full pass. The product draws no
band on that last one, so (a) reads n/a there. The steady total is the steady run's own yearly total: its ledger rows'
year-end balances sum to it exactly on every seed. The middle line is the band fan's 50th percentile among the futures
where someone is still alive.

| Seed | The table’s run | (a) steady against the band’s middle line | (b) the rough future among the many |
|---|---|---|---|
| `retired` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.94×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $571,025 |
| `date` | dated, offset 9, 98% stocks | above the middle line in 23 of 34 years; steady ÷ middle 0.99–1.08×; y10 1.00×, y20 1.01×, y30 1.03×, y34 1.08× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,958,504 |
| `borderline` | spine, 56% stocks | above the middle line in 1 of 24 years; steady ÷ middle 0.51–1.00×; y10 0.93×, y20 0.73×, y24 0.51× | below the middle line in 24 of 24 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y24 p10–p25; rough ends $0 against steady $80,340 |
| `dateborder` | dated, offset 10, 67% stocks | above the middle line in 0 of 34 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.93×, y30 0.86×, y34 0.84× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 under p10, y34 p10–p25; rough ends $0 against steady $807,274 |
| `offtracktypical` | spine, 60% stocks | above the middle line in 0 of 19 years; steady ÷ middle 0.00–1.00×; y10 0.95×, y20 0 = 0, y27 0 = 0 | below the middle line in 19 of 19 years (8 more at $0 with it); highest slot p25–p50 (year 2); y10 under p10, y20 $0 with the middle, y27 $0 with the middle; rough ends $0 against steady $0 |
| `failing` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `failingtypical` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `pafailingtypical` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `failingentered` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `budget` | spine, 56% stocks | above the middle line in 1 of 24 years; steady ÷ middle 0.76–1.00×; y10 0.96×, y20 0.88×, y24 0.76× | below the middle line in 24 of 24 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y24 p10–p25; rough ends $0 against steady $162,267 |
| `datesplit` | dated, offset 9, 67% stocks | above the middle line in 0 of 34 years; steady ÷ middle 0.87–1.00×; y10 0.97×, y20 0.94×, y30 0.90×, y34 0.87× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $969,952 |
| `datemixed` | dated, offset 7, floor, 67% stocks | above the middle line in 0 of 34 years; steady ÷ middle 0.90–1.00×; y10 0.97×, y20 0.96×, y30 0.93×, y34 0.90× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $144,298 against steady $911,847 |
| `dip` | dated, offset 5, 97% stocks | above the middle line in 27 of 36 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.03×, y30 1.08×, y36 1.09× | below the middle line in 36 of 36 years; highest slot p25–p50 (year 2); y10 p10–p25, y20 p10–p25, y30 p10–p25, y36 p10–p25; rough ends $111,017 against steady $1,515,324 |
| `order` | spine, 62% stocks | above the middle line in 0 of 26 years; steady ÷ middle 0.66–1.00×; y10 0.96×, y20 0.83×, y26 0.66× | below the middle line in 26 of 26 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y26 p10–p25; rough ends $0 against steady $144,654 |
| `health` | spine, 61% stocks | above the middle line in 0 of 33 years; steady ÷ middle 0.83–1.00×; y10 0.95×, y20 0.90×, y30 0.86×, y33 0.84× | below the middle line in 33 of 33 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y33 p10–p25; rough ends $398,845 against steady $1,481,170 |
| `date65` | dated, offset 0, 98% stocks | above the middle line in 17 of 27 years; steady ÷ middle 0.99–1.04×; y10 0.99×, y20 1.01×, y27 1.04× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $154,246 against steady $1,783,478 |
| `surplus` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.90–1.00×; y10 0.97×, y20 0.94×, y27 0.90× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y27 p10–p25; rough ends $3,015,610 against steady $4,278,342 |
| `surplustypical` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.89–1.00×; y10 0.97×, y20 0.94×, y27 0.89× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $2,885,796 against steady $4,162,750 |
| `pasurplustypical` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.89–1.00×; y10 0.97×, y20 0.94×, y27 0.89× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $2,884,233 against steady $4,161,418 |
| `failingwidest` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `surpluswidest` | spine, 60% stocks | above the middle line in 14 of 27 years; steady ÷ middle 0.94–1.03×; y10 1.00×, y20 1.03×, y27 0.94× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y27 p25–p50; rough ends $2,721,398 against steady $4,060,482 |
| `paofftrackone` | spine, 60% stocks | above the middle line in 0 of 20 years; steady ÷ middle 0.00–1.00×; y10 0.96×, y20 0.00×, y27 0 = 0 | below the middle line in 20 of 20 years (7 more at $0 with it); highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y27 $0 with the middle; rough ends $0 against steady $0 |
| `pabudgetone` | spine, 56% stocks | above the middle line in 1 of 24 years; steady ÷ middle 0.80–1.00×; y10 0.97×, y20 0.90×, y24 0.80× | below the middle line in 24 of 24 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y24 p10–p25; rough ends $0 against steady $247,102 |
| `paone` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.94×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $561,933 |
| `pafailingone` | spine, 40% stocks | the middle line is $0 from year 1: nothing to compare | out of money with the middle line from year 1; rough ends $0 against steady $0 |
| `surpluswidestrelief` | spine, 60% stocks | above the middle line in 21 of 27 years; steady ÷ middle 0.97–1.07×; y10 1.01×, y20 1.07×, y27 0.97× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 p10–p25, y27 p25–p50; rough ends $2,460,494 against steady $3,826,181 |
| `buckets` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.87–1.00×; y10 0.97×, y20 0.93×, y27 0.87× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $380,541 against steady $1,100,006 |
| `steer` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.96×, y20 0.93×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 under p10; rough ends $0 against steady $608,224 |
| `nc` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.85–1.00×; y10 0.97×, y20 0.94×, y27 0.85× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $539,149 |
| `pa` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.94×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $570,901 |
| `patypical` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.83–1.00×; y10 0.97×, y20 0.93×, y27 0.83× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $442,362 |
| `fl` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.94×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $571,025 |
| `elsewhere` | spine, 60% stocks | above the middle line in 0 of 27 years; steady ÷ middle 0.84–1.00×; y10 0.97×, y20 0.94×, y27 0.84× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $0 against steady $571,025 |
| `datenc` | dated, offset 0, 98% stocks | above the middle line in 17 of 27 years; steady ÷ middle 0.99–1.03×; y10 1.00×, y20 1.01×, y27 1.03× | below the middle line in 27 of 27 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y27 p10–p25; rough ends $124,800 against steady $1,731,485 |
| `healthnc` | spine, 61% stocks | above the middle line in 0 of 33 years; steady ÷ middle 0.83–1.00×; y10 0.95×, y20 0.90×, y30 0.87×, y33 0.84× | below the middle line in 33 of 33 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y33 p10–p25; rough ends $375,329 against steady $1,440,774 |
| `healthgap` | spine, 61% stocks | above the middle line in 2 of 49 years; steady ÷ middle 0.46–1.00×; y10 0.95×, y20 0.88×, y30 0.77×, y49 0.46× | below the middle line in 49 of 49 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y49 p10–p25; rough ends $0 against steady $326,187 |
| `healthss` | spine, 61% stocks | above the middle line in 1 of 31 years; steady ÷ middle 0.86–1.00×; y10 0.95×, y20 0.90×, y30 0.86×, y31 0.88× | below the middle line in 31 of 31 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y31 p10–p25; rough ends $1,267,593 against steady $2,329,651 |
| `datesolo` | no date input (the draft builds no run) | n/a | n/a |
| `atceiling` | dated, offset 0, 98% stocks | above the middle line in 32 of 34 years; steady ÷ middle 1.00–1.07×; y10 1.01×, y20 1.02×, y30 1.04×, y34 1.07× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $1,570,458 against steady $5,435,948 |
| `dateshort` | no date, window top, 97% stocks | n/a (no band drawn) | below the middle line in 28 of 28 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y28 p10–p25; rough ends $0 against steady $656,918 |
| `datecoststale` | dated, offset 7, 98% stocks | above the middle line in 27 of 34 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.02×, y30 1.04×, y34 1.09× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,795,164 |
| `datelateleftover` | dated, offset 0, 97% stocks | above the middle line in 5 of 28 years; steady ÷ middle 0.99–1.05×; y10 1.00×, y20 1.00×, y28 1.05× | below the middle line in 28 of 28 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y28 p10–p25; rough ends $80,033 against steady $1,102,806 |
| `datesaved` | dated, offset 7, 98% stocks | above the middle line in 22 of 34 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.01×, y30 1.04×, y34 1.09× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,859,392 |
| `datesavedmoved` | dated, offset 7, 98% stocks | above the middle line in 22 of 34 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.01×, y30 1.04×, y34 1.09× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,859,392 |
| `datesavedstale` | dated, offset 7, 98% stocks | above the middle line in 27 of 34 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.02×, y30 1.04×, y34 1.09× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,795,164 |
| `datesavedrisen` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,867,909 |
| `datesavedrisenshort` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,336,070 |
| `datesavedrisenlater` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,336,070 |
| `datesavedtyped` | dated, offset 9, 98% stocks | above the middle line in 20 of 34 years; steady ÷ middle 0.99–1.06×; y10 1.00×, y20 1.00×, y30 1.02×, y34 1.06× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $2,129,110 |
| `datesavedfourbuckets` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,594,708 |
| `datesavedtypedmoved` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,784,864 |
| `datesavedtypedpension` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,784,864 |
| `datesavedtypedcrowned` | dated, offset 7, 99% stocks | above the middle line in 27 of 34 years; steady ÷ middle 0.99–1.09×; y10 1.00×, y20 1.01×, y30 1.05×, y34 1.09× | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $2,872,674 |
| `datesavedtypednearline` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,659,663 |
| `datesavedtypedsticky` | no date, window top, 98% stocks | n/a (no band drawn) | below the middle line in 34 of 34 years; highest slot p25–p50 (year 2); y10 under p10, y20 under p10, y30 p10–p25, y34 p10–p25; rough ends $0 against steady $1,254,567 |

The same table carries (b), §4. "Above the middle line in N of M years" counts the years where both have money.

**What it shows:**

- **It parts by stock share.** At 56–67% stocks (every spine seed with money, and the three dated seeds at 67%:
  `dateborder`, `datesplit`, `datemixed`), steady sits at or below the middle line in all but at most two years, and
  the gap grows: steady ÷ middle falls from 1.00 in year 1 to between 0.46 (`healthgap`'s 49 years) and 0.90 by the
  last year, 0.83–0.90 on most. On the two off-track seeds steady runs out of money while the middle line still has
  some. The two heaviest spenders are the exception (below). At 97–99% stocks (every other dated seed), steady sits at
  or a little above the middle line: from 1% below to 9% above.
- **Why.** A mix rebalanced every year grows faster, typically, than its parts at their middle returns:

  | Stocks | Typical growth a year | Steady growth a year | Gap (points a year) |
  |---|---|---|---|
  | 40% | 2.288% | 1.889% | 0.390 |
  | 56% | 2.724% | 2.316% | 0.397 |
  | 60% | 2.820% | 2.423% | 0.386 |
  | 67% | 2.975% | 2.610% | 0.355 |
  | 97% | 3.458% | 3.410% | 0.046 |
  | 98% | 3.469% | 3.437% | 0.031 |
  | 100% | 3.490% | 3.490% | 0.000 |

  At 56–67% stocks the gain is 0.36–0.40 points a year, about 11% over 27 years, so the middle line climbs above
  steady. At 97–98% it is 0.03–0.05 points, and the spending drawn out of the bad futures pulls the middle line a
  little below steady instead. Heavy spending does the same at 60%: `surpluswidest` and `surpluswidestrelief` draw
  $480,000 a year from $3,000,000 and run up to 3% and 7% above in their middle years.
- **The direction belongs to the household, not to the view.** Steady is not the middle future. It reads up to 9%
  richer than the band's middle line on one household and up to 54% poorer on another.
- Six seeds (`failing`, `failingtypical`, `pafailingtypical`, `failingentered`, `failingwidest`, `pafailingone`) hold
  less than one year's spending ($60,000 against $96,000; `failingwidest` $1,000,000 against $1,199,880): every future
  is out of money in year 1, and both measurements are empty. `datesolo` builds no run (its coverage refusal).

## §4 — Measurement (b): where the rough future sits among the many

Same run, same track. Each year the rough future's total is placed in the band: under the 10th percentile, the 10th
to the 25th, the 25th to the 50th, and so on. A total equal to a percentile sits at it, never above it, and a year
where the rough run and the middle line are both $0 is counted apart, as level. A late "p10–p25" on a rough run that
ends at $0 means it is out of money along with at least a tenth of the futures.

**What it shows:**

- **Below the middle line in every year with money, on every seed.** Its best place anywhere is the 25th to 50th
  percentile, in year 2, while the band is still narrow. By year 10 (the 1973–74 fall behind it) it sits under the
  10th percentile on every seed with money but `dip` (10th to 25th), and it never climbs back above the 50th.
- **It never ends above the steady future.** On most retired seeds it runs out of money where steady ends with money
  ($0 against $571,025 on `retired`); the richest seeds end with money in both ($3,015,610 against $4,278,342 on
  `surplus`).
- **Verdict: KTD3 holds on every shipped seed.** The rough future never ends above the steady one and never ranks
  above the plan's middle future: U4's stop lines print none. Through its worst stretch it is a bottom-tenth future
  among the plan's own, and a real one, history's order of years, not a built worst case.

## §5 — What the table's words may say (binding on U7)

1. **Steady is never called typical, average, expected or median** (R7, U7's copy-guard rule), and never placed "in
   the middle of the range": §3 shows it is not. Neither "richer" nor "poorer than the middle of the range" may be
   said without that household's own measurement (R20), because the direction is the household's.
2. **The rough view may be named as history's worst 30-year start for a retiree with half in stocks, 1966 to 1995,
   at the plan's market level.** Never "the worst" in the plan's market (§2: at 40% and 50% stocks it is second, behind
   1937), and never a floor on how bad a market can be: it is one US history, the luckiest major market's
   ([market-model.md §4](market-model.md)).
3. **"Most of the plan's futures do better than this" is measured true on every shipped seed** (§4), not on every
   household. A sentence saying it about a household needs that household's measurement (R20).
4. **The rough view reads steady after year 30**, because the window ends in 1995. The table must not let the years after
   30 pass as history's.

## When to measure again

Re-run the script when the committed series, the production market, the pick rule, KTD9's run or a seed changes. A
STOP line means KTD3 fails for that household's shape (the rough future ending above the steady one, or sitting above
the middle line): stop and report, as U4's Verification says.
