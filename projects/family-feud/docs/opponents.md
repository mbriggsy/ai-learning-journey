# The Room — measured opponent profiles

What every Family Feud opponent has actually done in a draft, read from Sleeper's own record of
their past leagues. Identity lives in [`league.md`](league.md); this file owns **behaviour**.

> **Measured 2026-08-14** by `python scripts/scout_opponents.py --fetch`, over every league all
> eight members played in 2023-2025: **37 leagues, 18 drafter-views of 7 DISTINCT comparable 1QB
> redrafts** (⚠️ those two counts are NOT interchangeable — see the landmine below). Re-run it rather
> than quoting these numbers — every count here is a timestamp, not a fact.

## 🚨 Read this before using anything below

**Almost none of these profiles predict.** They were cross-validated leave-one-draft-out and
**one** statement survived. Full write-up:
[`insight 022`](insights/022-the-opponent-prior-lost-to-always-guess-wr.md).

| | result |
|---|---|
| general `P(position \| round)` prior, personal | 42.2% |
| … against **a constant that always guesses WR** | **40.6%** |
| … for `briggsy007` specifically | **35.2% — worse than the constant** |
| "takes a QB by round 4", personal rule | 47% vs the **room base rate's 65%** |
| "no K before round 10" | **18/18 across every drafter** — a fact about fantasy football |

**Descriptive is not predictive.** Every statement in this file is a true description of what
happened. Treating one as a forecast without checking it against a floor is how a fabricated
number gets a measured label — which is exactly what harness leg (d) was killed for.

## Nothing here predicts an individual. Not one claim survived.

The last candidate was **QB aggression measured league-size-invariantly** — *which* QB off the
board, not which round. It looked like the one survivor at **76.5% against a 52.9% floor**.

🚨 **It did not survive the sample being cleaned.** One **SUPERFLEX** league (`2023 The Big 12`,
12 teams × 26 rounds) had passed every filter — under the dynasty round cap, snake, full length —
and in a superflex league a round-1 QB is *correct play*, not a tendency. With it excluded:

| | cleaned |
|---|---|
| personal rule | **62.5%** (10/16) |
| best constant floor | **50.0%** (8/16) |
| edge | **+2 of 16 — exactly one standard deviation** |

Removing a single contaminated draft halved the edge and took it from ~2σ to noise.

**And the sample is thinner than the headline count suggests: 7 DISTINCT DRAFTS.** The "18
comparable redrafts" are overlapping *drafter-views* — four league members played in the same
2023 Fantasy Fuccbois draft, several more share AM Lumber. Observations inside one draft are not
independent: if a room is QB-hungry, everyone in it looks QB-hungry.

The per-drafter medians below are **descriptive only**. They are real records of what happened.
They do not forecast, and they are deliberately **not** wired into `precompute_ladder.py`.

| handle | nth QB off the board (cleaned) | median | comparable | distinct-draft caveat |
|---|---|---|---|---|
| **briggsy007** (Hunter) | `1 · 1 · 2 · 2 · 3 · 4 · 6` | **2** | 7 | all 1QB, clean |
| Kaeperni | `1 · 3 · 12` | 3 | 3 | |
| BuschLight420 | `5` | 5 | 1 | |
| RMonk9 | `4 · 6 · 10` | 6 | 3 | |
| MattiICE23 | `2 · 7 · 10` | 7 | 3 | 1 superflex draft removed |
| kblizzy23 · Cltchiefs | **no history at all** | — | 0 | |

**`kblizzy23` and `Cltchiefs` are brand-new Sleeper accounts** with zero NFL leagues 2023-2025,
both of whom joined in the week before 2026-08-14; their user ids (`1392…`, `1393…`) are the same
generation as Briggsy's own `1390…`. **Do not model them, and do not let a blank profile read as
"passive."**

## Results — how they actually finish

| handle | best seasons |
|---|---|
| **RMonk9** | **1st of 8 PF** (2023) · **1st of 10 PF** (2024) · **12-2, 2nd of 12 PF** (2025) |
| MattiICE23 | 2nd of 8 PF (2023) · 5th of 10 · 5th of 12 |
| briggsy007 | 6th of 8 (2023) → **1st of 12 PF** (2025). Improving steeply |
| Kaeperni | 5th of 8 · 8th of 10 · **11th of 12** |
| BuschLight420 | 6th of 12 (2025), one season on file |

**RMonk9 is the strongest player in this league.** The mission is to beat Hunter; the *league* is
won against RMonk9.

## The 2023 8-team head-to-head

Four members played the **same 8-team redraft** (`Fantasy Fuccbois`, league `959230650609876992`)
— the only sample with Family Feud's room shape, a shared pool and a shared season. Standings
independently re-pulled and confirmed 2026-08-14:

| | opened | nth QB | finish |
|---|---|---|---|
| RMonk9 | WR-WR-WR-RB-RB | 4th | 9-4, **1st of 8** (2483.3 PF) |
| MattiICE23 | RB-RB-RB-WR-WR | 2nd | 9-4, **2nd of 8** (2126.0) |
| Kaeperni | **QB**-RB-WR-RB-RB | **1st** | 6-8, 5th of 8 (2016.9) |
| briggsy007 | **QB**-WR-WR-WR-RB | **1st** | 6-8, **6th of 8** (1861.9) |

⚠️ **n=4 in a single season, and the confound is obvious** — the two winners may simply have picked
better players, and one season cannot separate those. It is quoted because it points the same
direction as the board's own arithmetic below. **Do not promote it to a law.**

## What the board says about the same question

```
QB1  129.7        RB1  268.4        WR1  242.7
```

**An elite QB is worth roughly half an elite RB or WR here.** Josh Allen's `vorp` of 129.7 puts his
value slot near **pick 15-18 overall** — late round 2 in an 8-team room.

⚠️ **The `Lamar Jackson +106.7` figure in `TODO.md` is a value-vs-ADP statement, not a draft-early
argument.** It says the market lets him fall ~21 spots past his price around pick 60. Reading it as
"take an elite QB early" inverts it; that misreading was made and corrected in session 2026-08-14.

## What we actually do with it

**One directional expectation, and it is not a number.** Across the **7 distinct** comparable
drafts, the first QB came off the board at pick:

```
3 · 6 · 15 · 18 · 20 · 21 · 32          median 18
ADP board, current: the first QB is Josh Allen at overall #29, and the top 24 contain NO QB
```

**Six of seven drafts took a QB before the ADP board's first QB.** The one 8-team draft — the only
sample with Family Feud's shape — was the most extreme: **first QB at pick 3, five QBs gone by
pick 24.**

✅ **THE PRICE-LIST CONFOUND IS REMOVED (2026-08-14).** An earlier version of this section said
*"we do not hold historical ADP, so this cannot be checked."* We do now — `realized_value.py`
caches it back to 2015. Compared against the ADP **in force that season**, not 2026's:

| draft | first QB | ADP that year | |
|---|---|---|---|
| 2023 Fantasy Fuccbois (8tm) | pick **3** | #19 | **16 early** |
| 2023 Washington Foreskins (12tm) | 15 | #19 | 4 early |
| 2024 holmes league (10tm) | 6 | #27 | **21 early** |
| 2024 AM Lumber (10tm) | 20 | #27 | 7 early |
| 2025 12-Man League (12tm) | 18 | #23 | 5 early |
| 2025 AM Lumber (12tm) | 21 | #23 | 2 early |
| 2024 "2024-2025" (10tm) | 32 | #27 | 5 **late** |

**Six of seven, averaging ~7 picks earlier than the market of the day.** The finding survives the
control that could have killed it.

⚠️ **One confound remains and it cuts AGAINST the finding: six of the seven drafts are 10- or
12-team rooms**, which need more starting QBs and so consume them faster per pick than an 8-team
room will. The single 8-team draft is the most extreme of the seven, which cuts the other way —
but it is one draft.

So: **expect QBs to leave earlier here than the ADP sheet implies, and expect elite skill players
to slide further to us than generic ADP predicts. A direction to stay alert to, not a count to
plan around.** It is deliberately not encoded anywhere.

🚨 **AND THIS IS WHY IT MATTERS MORE THAN IT LOOKS.** Over 11 seasons, drafting the preseason QB1
has returned **10.2 vorp — indistinguishable from a waiver-wire quarterback**
([`insight 023`](insights/023-the-curve-answers-a-question-nobody-can-draft.md)). Every QB this
room takes early is a premium pick spent on approximately nothing, and the player who slides is
ours.

The two other room-level regularities are much better supported, because they are near-unanimous
rather than directional:

1. **The room waits on TE — `past R5` in 15 of 18 drafter-views**, only Kaeperni excepted. The
   board prices `TE1` at **134.7**, above QB1, and essentially uncontested.
   ⚠️ ~~**And `TE1` carries the largest measured spread on the board — sd 30.5.**~~ **CORRECTED
   2026-08-14: that ranked risk by the SMALLER of the two error terms and got the answer exactly
   backwards.** With the dominant term included (`insight 023`), **`TE1` has the LOWEST total
   spread of the four positional #1s — 60.6, against RB1's 145.1.** The elite TE is uncontested
   in this room *and* the least volatile premium pick on the board. ⚠️ But the realised value of
   drafting the preseason TE1 is **76.0, not the 134.8 the board shows** — the board overstates
   every top slot by roughly 2x.
2. **Nobody takes a K before round 10. 18 of 18, every drafter, every draft.** So neither do we —
   no edge here, only a way to lose one.

## Landmines

- 🚨 **`picked_by` IS THE SEAT OWNER, NOT THE AGENT.** Sleeper stamps a user's id on an auto-pick
  in their seat exactly as on a deliberate one, and no field separates them — the same landmine
  `league.md` records for our own draft. Every profile describes *what happened in that seat*.
  It is **not** proof of judgment.
- 🚨 **`round` is not comparable across league sizes**, and using it is what made three of four
  claims fail. Prefer nth-off-the-board, or any metric normalised to the room.
- 🚨 **SUPERFLEX AND 2QB LEAGUES CORRUPT THE ONE AXIS THESE PROFILES ARE READ FOR**, and one
  passed every other filter. Where a second QB can start, a round-1 QB is *correct play*, not a
  tendency. `scout_opponents.is_superflex()` now excludes them by `roster_positions`; do not
  weaken it. This is the **third** time this project has shipped a denominator quietly containing
  a different population — `market.py`'s position mix, insight 022's round-vs-league-size, this.
  **Check the population before the statistic, every time.**
- 🚨 **"N comparable redrafts" summed across drafters is NOT N independent drafts.** Four members
  share the 2023 Fantasy Fuccbois draft; several share AM Lumber. 18 drafter-views are **7
  distinct drafts**, and drafters inside one draft are correlated by construction. Any room-level
  rate quoted out of this file must say which unit it is counting.
- **Dynasty startups and keeper-league rookie drafts are excluded from every rate**, and the tool
  reports how many it dropped. A rookie pool has no veterans, so "took no QB" there is the pool,
  not a preference — `market.py`'s position-mix defect, not repeated.
- **The tool refuses to state a tendency below 3 comparable drafts** and prints the raw drafts
  instead. A confident median over n=1 reads identically to one over n=7.
- **A blank profile is not a passive opponent.** Two seats have no history at all.

## Refreshing

```
python scripts/scout_opponents.py --fetch          # re-pull everything, then print profiles
python scripts/scout_opponents.py                  # analyse the cache, no network
python scripts/scout_opponents.py --user RMonk9    # one seat, every pick of every draft
```

Cache lands in `draft-kit/cache/opponents/` (gitignored). The fetch is sequential with a delay and
takes a few minutes; the analysis is instant.
