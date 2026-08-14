# The Room — measured opponent profiles

What every Family Feud opponent has actually done in a draft, read from Sleeper's own record of
their past leagues. Identity lives in [`league.md`](league.md); this file owns **behaviour**.

> **Measured 2026-08-14** by `python scripts/scout_opponents.py --fetch`, over every league all
> eight members played in 2023-2025: **37 leagues, 18 comparable redrafts.** Re-run it rather
> than quoting these numbers — new seasons and new leagues land continuously, and every count
> here is a timestamp, not a fact.

## Why this file exists instead of a doctrine model

`TODO.md`'s harness leg (d) proposed an opponent model assembled from invented "doctrine
terminals" — one imagined opposing philosophy per terminal. That is a fabricated number one level
deeper than the enumeration [insight 021](insights/021-the-simulation-had-a-closed-form-and-was-measuring-its-own-sampler.md)
already deleted, and it would have been the fifth tautology this project caught.

**The opponents are not hypothetical.** Sleeper serves every pick every one of them has ever made.
This is the validated opponent model the precomputer refuses to fake, and it cost one afternoon.

## The room

Ordered by how much of a threat the results say they are, which is **not** the same order as how
much of a threat the mission says they are.

| handle | comparable redrafts | best finish | first QB (median) | first TE (median) |
|---|---|---|---|---|
| **RMonk9** | 3 | **1st of 8 PF · 1st of 10 PF · 12-2** | **R6** (6th QB off the board) | R7 |
| **MattiICE23** | 4 | 2nd of 8 PF | R6 (7th off) | **R9** |
| **briggsy007** (Hunter) | 7 | 1st of 12 PF (2025) | **R3** (**2nd off**) | R8 |
| **Kaeperni** | 3 | 5th of 8 PF | **R2** (3rd off) | **R3** |
| BuschLight420 | 1 | 6th of 12 PF | — too few drafts — | — |
| kblizzy23 | **0** | no history | unknown | unknown |
| Cltchiefs | **0** | no history | unknown | unknown |

**`kblizzy23` and `Cltchiefs` are brand-new Sleeper accounts** with zero NFL leagues 2023-2025,
and both joined Family Feud in the week before 2026-08-14. Their user ids (`1392…`, `1393…`) are
the same generation as Briggsy's own `1390…`. They are genuine unknowns; **do not model them**,
and do not let a blank profile read as "passive."

## The finding that outranks the rest

Four members played the **same 8-team redraft in 2023** (`Fantasy Fuccbois`, league
`959230650609876992`) — the only sample in existence with Family Feud's room shape, a shared
player pool and a shared season:

| | opened | first QB | finish |
|---|---|---|---|
| RMonk9 | WR-WR-WR-RB-RB | **R7** | 9-4, **1st of 8** |
| MattiICE23 | RB-RB-RB-WR-WR | **R6** | 9-4, **2nd of 8** |
| Kaeperni | **QB**-RB-WR-RB-RB | **R1** | 6-8, 5th of 8 |
| briggsy007 | **QB**-WR-WR-WR-RB | **R1** (Hurts, #3 overall) | 6-8, **6th of 8** |

**The two who waited on QB finished 1st and 2nd. The two who spent a first-rounder on one
finished 5th and 6th.**

⚠️ **It is n=4 in a single season and the confound is obvious** — the two winners may simply have
picked better players, and one season cannot separate those. It is quoted because it points the
same direction as the board's own arithmetic (below), not as proof on its own. **Do not promote
this to a law.**

## What the board says about the same question

The board prices the top of each position like this (2022-2025 basis):

```
QB1  129.6        RB1  268.4        WR1  242.7
```

**An elite QB is worth roughly half an elite RB or WR here.** Josh Allen's `vorp` of 129.7 places
his value slot near **pick 15-18 overall** — late round 2 in an 8-team room.

⚠️ **The `Lamar Jackson +106.7` figure in `TODO.md` is a value-vs-ADP statement, not a draft-early
argument.** It says the market lets him fall ~21 spots past his price around pick 60. Reading it
as "take an elite QB early" inverts it, and that misreading was made and corrected in session on
2026-08-14.

So the board and the one head-to-head sample agree: **a round-1 QB is a mistake in this format,
and two of seven opponents make it.**

## What we do with it

1. **Expect elite RB/WR to fall further than generic ADP predicts.** Two of seven seats
   (Hunter, Kaeperni) reliably spend a top-3-round pick on a QB, and a third (BuschLight420's
   single draft) opened `RB WR WR QB`. Our board is already priced for 8-team replacement, which
   the blended-market ADP is not — [`market.py`](../scripts/market.py). Two independent edges,
   same direction.
2. **The elite TE is uncontested.** Median first TE across the room is R7-R9; only Kaeperni takes
   one early. The board prices `TE1` at **134.7**, above QB1.
   ⚠️ **And `TE1` carries the largest measured spread on the board — sd 30.5, season draws
   `175.1 · 95.8 · 117.3 · 150.8`.** It is simultaneously the best-priced uncontested asset and
   the highest-variance bet available. Those two facts must always travel together.
3. **RMonk9 is the actual competition.** The mission is to beat Hunter, but the league is won
   against RMonk9, whose approach already matches what our board recommends.

## Landmines

- 🚨 **`picked_by` IS THE SEAT OWNER, NOT THE AGENT.** Sleeper stamps a user's id on an auto-pick
  in their seat exactly as on a deliberate one, and no field separates them — the same landmine
  `league.md` records for our own draft. Every profile here describes *what happened in that
  seat*, which is also what we draft against. It is **not** proof of judgment.
- **Dynasty startups and keeper-league rookie drafts are excluded from every rate**, and the tool
  reports how many it dropped. A rookie draft has no veterans in the pool, so "took no QB" there
  is an artifact of the pool. Blending them is the same defect `market.py` shipped and had to be
  fixed for — a denominator quietly containing a different population.
- **The tool refuses to state a tendency below 3 comparable drafts** and prints the raw drafts
  instead. A confident median over n=1 reads identically to one over n=7, which is how a small
  sample becomes folklore.
- **Sample sizes are small and formats are mixed** (8-, 10- and 12-team; 2023-2025). A 12-team R2
  and an 8-team R2 are different picks; that is why the tool reports *which* QB off the board was
  taken alongside the round.
- **A blank profile is not a passive opponent.** Two seats have no history at all.

## Refreshing

```
python scripts/scout_opponents.py --fetch          # re-pull everything, then print profiles
python scripts/scout_opponents.py                  # analyse the cache, no network
python scripts/scout_opponents.py --user RMonk9    # one seat, every pick of every draft
```

Cache lands in `draft-kit/cache/opponents/` (gitignored). The fetch is sequential with a delay
and takes a few minutes; the analysis is instant.
