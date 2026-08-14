# The Room — measured opponent profiles

What every Family Feud opponent has actually done in a draft, read from Sleeper's own record of
their past leagues. Identity lives in [`league.md`](league.md); this file owns **behaviour**.

> **Measured 2026-08-14** by `python scripts/scout_opponents.py --fetch`, over every league all
> eight members played in 2023-2025: **37 leagues, 18 comparable redrafts.** Re-run it rather
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

## The one trait that survived

**QB aggression, measured as *which* QB off the board — not which round.** `round` conflates the
trait with the room: round 3 in a 12-team league and round 3 in an 8-team league are different
picks, and this sample spans 8-, 10- and 12-team leagues. The league-size-invariant metric
separates the room cleanly:

| handle | nth QB off the board, per draft | median | comparable redrafts |
|---|---|---|---|
| **briggsy007** (Hunter) | `1 · 1 · 2 · 2 · 3 · 4 · 6` | **2** | 7 |
| Kaeperni | `1 · 3 · 12` | 3 | 3 |
| BuschLight420 | `5` | 5 | 1 |
| RMonk9 | `4 · 6 · 10` | 6 | 3 |
| MattiICE23 | `2 · 7 · 7 · 10` | 7 | 4 |
| kblizzy23 · Cltchiefs | **no history at all** | — | 0 |

Cross-validated on *"takes a top-3 QB off the board"*: **personal 76.5% (13/17) against the best
constant floor's 52.9% (9/17)**.

⚠️ **That is +4 of 17, roughly 2 standard deviations. Suggestive, not established.** It is **not**
wired into `precompute_ladder.py` and should not be until the sample grows — a 2σ trait does not
belong in the draft-day decision path.

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
QB1  129.6        RB1  268.4        WR1  242.7
```

**An elite QB is worth roughly half an elite RB or WR here.** Josh Allen's `vorp` of 129.7 puts his
value slot near **pick 15-18 overall** — late round 2 in an 8-team room.

⚠️ **The `Lamar Jackson +106.7` figure in `TODO.md` is a value-vs-ADP statement, not a draft-early
argument.** It says the market lets him fall ~21 spots past his price around pick 60. Reading it as
"take an elite QB early" inverts it; that misreading was made and corrected in session 2026-08-14.

## What we actually do with it

1. **Expect QBs to leave this room early — as a ROOM fact, not a per-seat one.** `takes a QB by
   round 3` is true in **9 of 18 drafts room-wide**; half the room does it. In an 8-team draft
   that pushes elite RB/WR down to us, and our board is already priced for 8-team replacement
   while the blended market ADP is not ([`market.py`](../scripts/market.py)). **This needs no
   opponent model and survives every floor control — it is just the room's base rate.**
2. **The elite TE is uncontested.** `waits on TE past R5` is true in **15 of 18** drafts room-wide;
   only Kaeperni takes one early. The board prices `TE1` at **134.7**, above QB1.
   ⚠️ **And `TE1` carries the largest measured spread on the board — sd 30.5, season draws
   `175.1 · 95.8 · 117.3 · 150.8`.** Best-priced uncontested asset *and* highest-variance bet.
   Those two facts must always travel together.
3. **Nobody takes a K before round 10. Ever, 18/18.** So neither do we, and there is no edge here
   — only a way to lose one.

## Landmines

- 🚨 **`picked_by` IS THE SEAT OWNER, NOT THE AGENT.** Sleeper stamps a user's id on an auto-pick
  in their seat exactly as on a deliberate one, and no field separates them — the same landmine
  `league.md` records for our own draft. Every profile describes *what happened in that seat*.
  It is **not** proof of judgment.
- 🚨 **`round` is not comparable across league sizes**, and using it is what made three of four
  claims fail. Prefer nth-off-the-board, or any metric normalised to the room.
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
