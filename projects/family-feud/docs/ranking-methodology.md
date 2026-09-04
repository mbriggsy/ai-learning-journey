# The Board: Ranking Methodology — Family Feud 2026

*Why the board says what it says. Companion to [`../draft-kit/players_data.json`](../draft-kit/players_data.json) (the board itself), [`draft-day-runbook.md`](draft-day-runbook.md) (draft-day operations), [`league.md`](league.md) (the rules all of this is bent around), and [`../draft-kit/family-feud-draft-board.html`](../draft-kit/family-feud-draft-board.html).*

<!-- BEGIN GENERATED snapshot-date — rewritten by scripts/build_board.py. Do not hand-edit. -->
*Rankings snapshot: August 28, 2026.*
<!-- END GENERATED snapshot-date -->
*The ranks expire — the method doesn't. Read this as many times as you want, Briggsy; the numbers get refreshed before draft day.*

---

## The one-sentence version

The consensus tells us *the order players come off the board*, the league format tells us *what's scarce*, VORP tells us *what scarcity is worth here*, and the judgment layer tells us *what the numbers can't see*. **The rank is the consensus; the edge is everything stacked beside it.**

---

## ⚠️ What changed on 2026-08-08 — read this before the layers below

**The board's `r`/`pr`/`tier` are no longer hand-synthesized.** `scripts/rerank.py` re-derives them from FantasyPros Full PPR ECR (redraft), on Briggsy's call that the Cowork-era ranks "carry no weight." 164 of 174 rows moved. The layers below used to describe four passes that all pushed on the *rank*; three of them no longer do, and this section says where each one actually lives now.

**The edge was never going to be out-evaluating a hundred analysts.** It is that everything *beside* the rank — the replacement baselines, the tier cuts, the badges, the notes — is priced for an 8-team, 2-FLEX, full-PPR room, while the rest of the league drafts off a list built for 12-team leagues.

| Layer | Where it lives NOW |
|---|---|
| The consensus | **`r` and `pr`, outright.** FantasyPros ECR, ranked by `scripts/rerank.py` |
| The league bend | **`vorp`, not the rank** — replacement at QB12/RB41/WR47/TE12, from `meta.vbd.baselineWaiver` |
| Tiers | **`tier`** — equal-value bands off this league's own curve (`rerank.value_bands`), not equal counts |
| Judgment | **Badges and notes, which no longer move the rank.** They sit beside it and argue with it |

One consequence worth stating plainly: **`scripts/consensus.py`'s section [1] is circular** as a result — it compares the board to the list the board was built from, and it says so on every run. Do not read its zero as the experts ratifying the board. See [`insights/018`](insights/018-the-bias-was-the-only-thing-producing-findings.md).

---

## The Four Layers

Every rank on the board *was* built in four passes. Read them as the four forces still in play — but see the table above for which one owns the number today.

### Layer 1 — The consensus ordering

The board's rank **is** FantasyPros' Full PPR redraft ECR, restricted to the 174 players this board carries. That anchoring is deliberate: **a board is a draft order, not a wish list.** If the room takes Brock Bowers where the consensus puts him and your board says he is worth two rounds later, congratulations — you have a very principled board and you will never roster Brock Bowers. *(This sentence used to quote "17th" against "43rd". Board 17 is Trey McBride; Bowers has never been 17. The live figures are in the generated table under [Reading vbdDelta](#reading-vbddelta-when-board-and-math-disagree) and are not duplicated here.)* Rank has to reflect where a player can actually be acquired, then the deltas (below) tell you whether that price is a bargain or a tax.

*Historical note, because it explains the shape of everything below:* the ranks used to be a hand-made mash of eight expert sources plus training-camp reporting. That process produced the badges and notes this board still carries, and it is why the judgment layer reads as an argument *with* the rank rather than an input *to* it.

### Layer 2 — The league bend

Consensus rankings are built for generic 12-team leagues. Family Feud is not generic. **This no longer bends the rank — it sets the replacement baselines that `vorp` is measured against**, which is where the entire edge now lives:

**Full PPR + two FLEX spots.** You start four or five pass-catchers every week, and every catch is a point. Target hogs rise; touchdown-dependent guys fall.

**Eight teams.** This is the big one. The waiver wire in an 8-team league is a Whole Foods — fully stocked, all season. That *crushes* the value of positions where the free replacement is decent (QB and TE especially: the 12th-best QB is on the wire and he's *fine*) and concentrates value in true difference-makers, because the only thing free agency can't hand you is an elite player.

**Six of eight make the playoffs.** The regular season is a formality; the title is decided head-to-head in weeks 15–17. This flips the risk math toward ceiling — covered in its own section below, because it's the philosophical spine of the whole board.

**Two IR slots.** Injured stars falling in the draft are free real estate — you can park them at zero roster cost. Falling injured players hold more value on our board than on consensus boards (the 🧊 stash badge).

**Situational overrides.** Rules like the Miami Rule (no Dolphins pass-catchers in 2026 — Tua and Hill gone, Malik Willis starting). The math loves De'Von Achane's projected touch count; the math cannot see who is throwing him the ball. Judgment caps him.

### Layer 3 — The judgment pass

Badges and notes: the qualitative layer covering what projections structurally can't know. Camp risers (Waddle to Denver for a 1st), injury discounts with rehab timelines (Nabers' ACL trending toward Week 1), bust-price warnings (CMC at age 30 off a 450-touch season), breakout profiles (Egbuka, Burden, Tuten).

**This layer no longer moves the rank — and that makes it more useful, not less.** It used to be folded into the number, where it was invisible: a player 8 spots off consensus told you *nothing* about why. Now the rank is the consensus outright and the badges sit beside it as the explicit argument against it. Seven badge codes are live on the board today — **B 17 · U 14 · X 13 · I 12 · R 10 · D 10 · S 3**.

> **The eighth badge is gone on purpose.** `T` ("Briggsy's Guy") was dropped by the re-rank because it asserted a curation that had not actually happened. Do not reintroduce it as decoration.

### Layer 4 — Tiers

Finally, players get grouped at the **cliffs** — the points where the projected drop-off to the next guy gets steep relative to the small gaps within the group. Tiers, not ranks, are the draft-day decision unit: if four players are left in a tier when your pick comes up, you can wait a round and take whoever survives. If ONE player is left in a tier, you sprint — **provided he is someone you would actually take.** *(Qualifier added 2026-08-17. The engine's `⚠ CLIFF` badge requires both halves: ≤3 left **and** at least one of them sitting in BEST AVAILABLE. A tier can be down to its last man and still be irrelevant — `RB T5: 1 left — Cam Skattebo · thin, none in the top 12 yet`, reproduced on the lab feed at pick 40. Sprinting at a thin tier nobody in it belongs in your top 12 is how the badge used to cry wolf on kickers in round 2.)* The exact rank number within a tier is a preference; the tier boundary is the strategy.

**Tiers are equal-VALUE bands, not equal counts and not the biggest drops** (`rerank.value_bands`). Both alternatives were tried and both are degenerate: equal counts are arbitrary, and on a convex decreasing curve the biggest drops all cluster at the top — that produced WR tiers of `[1,1,1,1,2,1,1,51]`. Equal value bands give a tier list the shape it is supposed to have: a couple of names at the top where points fall away fast, widening as the curve flattens.

⚠️ **DEF tiers are the one ordering the re-rank cannot derive** — and K no longer belongs in that sentence. `build_curves.py` ships an exact **K curve** (39 ranks, from distance-bucketed field goals), so `rerank.value_bands` **derives K tiers** like any other position; what K lacks is a *baseline*, which is a closed decision, not a gap. That leaves the **14 DEF rows**, whose tiers were re-sorted onto the new order rather than invented, labelled `carried:kdef-tier-flat`. DEF has no exact source at all: `player_stats_def_*.csv` is player-level and publishes no points allowed. The board's remaining known gap on the four skill positions is the 40+/50+ long-TD bonus, which needs play-by-play.

---

## The Math: VORP

One idea drives all the numbers: **a player's value isn't his points — it's his points minus what FREE gets you.**

### How it's computed

For each player, we project a season point total in our *exact* scoring (full PPR, 4-point passing TDs, 0.04/passing yard, 0.1/rushing and receiving yard, −2 fumbles lost, −1 INT). The projections come from four years of empirical positional scoring curves — what the RB5, the WR20, the TE8 have actually scored in this scoring environment — mapped onto the current rank order.

<!-- BEGIN GENERATED curve-provenance — rewritten by scripts/build_board.py. Do not hand-edit. -->
**Curve provenance:** seasons 2022–2025, built from nflverse weekly player stats, excluding `long_td_bonus`.
<!-- END GENERATED curve-provenance -->

> **Two corrections, found by reproducing this pipeline (Aug 2026).** This section previously
> claimed the scoring included 40+/50+ yard TD bonuses and that the curves came from
> play-by-play data. Neither was true: the reproduction matched to 0.1 points *without* the
> bonuses, so they were never applied, and the curves are built from weekly stats — play-by-play
> was never used. The generated line above now states the real provenance and is rewritten on
> every refresh, so it cannot drift again.

Then we subtract the **replacement level**: the best player at that position sitting on the waiver wire, free, all season.

### Where the baselines come from

Eight teams each start QB / 2 RB / 2 WR / TE / 2 FLEX. History says the league's 16 flex slots fill roughly 11 WR / 5 RB in this format. That pins the last actual starters league-wide, and adding typical bench-hoarding pins the first guy who's genuinely *free*:

<!-- BEGIN GENERATED baselines — rewritten by scripts/build_board.py. Do not hand-edit. -->
| Pos | Last starter league-wide | Last ROSTERED (the VORP baseline) |
|-----|--------------------------|-------------------------------------|
| QB  | QB8 | **QB12** |
| RB  | RB21 | **RB41** |
| WR  | WR27 | **WR47** |
| TE  | TE8 | **TE12** |

*Those four sum to 112; with 8 kickers and 8 defenses that is 128 — exactly the number of players an 8-team, 16-round draft removes. Each baseline is therefore the LAST ROSTERED player at its position, and the first genuinely free one sits one rank below it.*
<!-- END GENERATED baselines -->

**VORP = projected season points above that baseline player.**

### The worked example that explains the whole draft

Three numbers from the board:

<!-- BEGIN GENERATED worked-example — rewritten by scripts/build_board.py. Do not hand-edit. -->
| Player | VORP | Read as |
|--------|------|---------|
| Jahmyr Gibbs | **268.4** | 268 points/season better than the last rostered RB (RB41 is the bar) |
| Ja'Marr Chase | **242.7** | 243 points better than the last rostered WR (WR47 is the bar) |
| Josh Allen | **129.7** | 130 points better than the last rostered QB (QB12 is the bar) |
<!-- END GENERATED worked-example -->

*The two tables above are generated from `draft-kit/players_data.json` on every board refresh. If
a number here disagrees with the board, the board is right and this file was hand-edited — run
`python scripts/build_board.py`.*

Josh Allen will outscore Jahmyr Gibbs this season. Doesn't matter. Gibbs clears his replacement bar by twice as much, and the bar is the only thing your lineup actually feels — you don't play "Allen's points," you play "Allen's points minus the points of the QB you could have had for free." That is the entire QB-in-rounds-6-9 doctrine in one table.

The same logic produces the RB-vs-WR lean: the free WR47 in this league scores ~10 a week all season; the free RB41 does not. A mid-tier RB beats a mid-tier WR *over replacement* even when their raw points tie — which is exactly the rounds 3-5 same-tier tie-breaker rule ("the wire always has a 10-ppg WR on it, never a 13-ppg RB").

---

## The queue is not the board (2026-08-19)

The board answers "how good is he" -- ECR ordering, empirical VORP, one truth per player, and
nothing in this section changed. **The QUEUE answers a different question: "what do I take NOW,
given my roster"** -- and since 2026-08-19 it is computed, not read off the board:

- **Marginal lineup value**: a candidate is worth what he adds to the best legal starting lineup,
  with unfilled slots pre-filled at *replacement* (insight 024's defect-4 fix -- an empty-slot
  counterfactual degenerates to raw points and takes a QB first overall). Over an empty roster
  this reproduces vorp order exactly; once WR2 and both FLEX fill, the next receiver's delta
  collapses to zero and the backs rise.
- **Zero-delta candidates fall back to board order** -- bench value is insurance, and ordering
  insurance by the board beats a weighting constant nobody measured.
- **K/DEF are deferred to the endgame**: flat within a tier, their delta cannot decay while every
  bench body's upside does. Measured cost on the gate fixture: 13.0 VORP of DEF tier, accepted,
  because a DEF at pick #69 is an instant human override.
- **The endgame is forced**: when open mandated slots equal picks remaining, the queue is
  filtered to the positions that must be filled and says so.

**The receipt**: `scripts/replay_mock.py` replays the recorded 2026-08-19 executor mock (seat 5,
120 picks) with our seat's strategy swapped. Board-order queue-top, unattended: nine receivers,
five quarterbacks, zero RB/K/DEF, 695.4 startable VORP. Lineup-delta: every slot filled, K/DEF
last, **1087.2** -- +391.8. One room, fixed opponents: a structural reading, never a win-rate
claim (insight 024: twelve held-out seasons could not resolve win rates; one mock cannot).
Implementation shared with the backtest in `draft-kit/lineup_value.py`.

## Reading vbdDelta (when board and math disagree)

Every player carries three math fields: `vorp` (the number above), `vbdRank` (the whole board re-sorted by pure VORP), and `vbdDelta` = **board rank − vbdRank**.

**Positive delta** → the math likes him *more* than his board slot. Taking him at board price is getting paid.
**Negative delta** → we're knowingly drafting him *ahead* of the raw math. There'd better be a reason — and there is; that's the point of the layers.

Case studies from the current board — **the extremes among players who are actually drafted and
who clear replacement**, so the table below moves when the board moves:

<!-- BEGIN GENERATED vbd-cases — rewritten by scripts/build_board.py. Do not hand-edit. -->
| delta | player | board | math | reading |
|-------|--------|-------|------|---------|
| **-31** | QB Dak Prescott | 76 | 107 | we draft him AHEAD of the raw math |
| **-23** | TE Trey McBride | 20 | 43 | we draft him AHEAD of the raw math |
| **-23** | QB Brock Purdy | 89 | 112 | we draft him AHEAD of the raw math |
| **+19** | RB Bucky Irving | 60 | 41 | the math likes him MORE than his board slot |
| **+18** | RB Jeremiyah Love | 41 | 23 | the math likes him MORE than his board slot |
| **+18** | RB Cam Skattebo | 57 | 39 | the math likes him MORE than his board slot |

**2 of the 3 largest taxes are quarterbacks, and that is structure rather than judgment.** This league starts ONE quarterback across eight teams, so replacement is QB12 and the curve is nearly flat beneath it — `vbdRank` sinks mechanically. Read the non-QB rows for what the layers actually do.

**Defenses: deltas span +40 to +68 across 14 rows, with 4 at the maximum** — not one shared number. Ignore them either way.
<!-- END GENERATED vbd-cases -->

> ⚠️ **Every number in that table used to be hand-typed here, and on 2026-08-14 all five were
> wrong** — Bowers was quoted at −26 (board 17) when he was board 19 at −24, and **board 17 was
> Trey McBride**, so one player's rank had been attributed to another. "All defenses, +68" was true
> of 4 of 14 rows. They are derived now, for the same reason every other figure in this file is.

**What the signs mean, which does not change when the ranks do:**

- **A negative delta on an elite TE is the premium we pay on purpose.** Season totals miss the
  *weekly* edge — an elite tight end wins you a position every single week while seven other teams
  start a guy named Brenton. Layer 1 applies too: he goes in round 2-3 whether we like it or not.
- **A positive delta on a high-volume back is a "value if he's there" flag**, not an instruction.
  The market hears regression whispers; the math sees locked-in touches. A ⚠️ badge tempers it —
  the math does not override the badge.
- **A small positive delta on a quarterback is retail with a coupon, not a steal.** If the math's
  own fair price is roughly where he is going, a few spots of slide is nothing. Steal means a real
  fall — see the QB-in-rounds-6-9 doctrine above.
- **A negative delta can be judgment the math cannot see at all.** Situational overrides (the Miami
  Rule) cap a rank the touch counts love. That is the layer system working, not a disagreement.
- **Defenses: ignore the deltas in both directions.** VBD genuinely believes a top DST is worth a
  round-8 pick — season totals say so — but week-to-week DST scoring is a coin flip and streaming
  off the wire replaces most of it. Doctrine keeps K/DEF in rounds 15-16, and the engine treats
  these deltas as decoration.

**Rule of thumb: VBD is the tie-breaker, never the boss.** It never reaches across tiers.

> ⚠️ **But the same-tier half of that rule is inert, and you should know why before you lean on it.**
> This section used to say that when two players sit in the same tier and the badges don't decide
> it, *the VORP chip decides it*. **It cannot.** Tiers are drawn within a position, so two players
> in the same tier are the same position — and within a position `vorp` is a pure function of the
> board rank itself: the curve is a rank→points lookup with `pr` as its only input. The better-
> ranked player therefore *always* has the better VORP. The chip agrees with the board by
> construction and can never overturn it.
>
> **Measured on this board, not assumed:** across all **150 skill rows** and the **146 adjacent
> same-position pairs** they form, there are **zero** pairs where a worse `pr` carries a higher
> `vorp`, and **zero** where a worse `pr` carries a better `vbdRank`. Within a position, VBD rank
> order is *identical* to board order.
>
> **What survives is the part that was always the real value: the CROSS-POSITIONAL comparison.**
> `RB41 = 117.5` against `WR47` is a genuine statement about replacement level that no board rank
> encodes, and it is why the rounds 3-5 RB-over-WR lean is real. So: use VBD to decide *which
> position* to take, never *which player within one*. For that, the badges and the tiers are the
> only instruments that carry independent information.
>
> Breaking the circularity needs real per-player projections rather than a rank→points curve. That
> is a genuine future unit, not a bug to patch.
>
> Worked through in
> [`insights/005`](insights/005-the-tie-breaker-agreed-with-the-board-by-construction.md) — **which
> was written 2026-08-07 and did not reach this page until 2026-08-08.** The lesson was recorded
> and the surface that states the rule kept stating it anyway. An insight nobody propagates is a
> note, not a fix.

---

## Ceiling Over Floor (the philosophical spine)

A player's season isn't one number — it's a *range of outcomes*. His **floor** is roughly the 20th-percentile outcome (things go wrong-ish); his **ceiling** is roughly the 85th-90th (things break right). Two archetypes make it concrete:

**Jakobi Meyers** — the metronome. Nine to thirteen points basically every week, almost never 25. Narrow range, high floor, low ceiling.

**Christian Watson** — the lottery ticket. Three catches for 31, or two TDs and 140. Wide range, fat right tail.

In a standard league (say, 6 of 12 make the playoffs), floor has real value: missing the playoffs is a live risk, and every week's median outcome matters. **Family Feud pays almost nothing for floor**, for two reasons:

**1. The playoff format.** Six of eight get in — you have to actively faceplant to miss. The thing floor protects against barely exists. The title is decided in three head-to-head weeks (15-17), where you must *outscore* somebody, not avoid losing. A lineup of metronomes maxes out around 110 points; in the week 16 semifinal against Hunter, you need somebody capable of hanging 30. You cannot win a championship with floor. You can only lose it slowly.

**2. Busting is cheap here.** The 8-team wire always has a startable replacement, so a swing-and-miss costs you a Wednesday waiver claim — while a hit hands you a league-winner. Variance costs little and pays a lot, so we buy variance. This is also the bench doctrine: six lottery tickets, zero "safe veterans." A safe bench vet never cracks a good starting lineup, so his floor is worth nothing to you; a ticket that hits becomes a new starter. And it's the IR arbitrage: parking injured upside (Kittle, Charbonnet, Dell types) in the two IR slots costs zero and occasionally prints a December starter — exactly when we want to peak.

**The nuance, so nobody gets carried away:** ceiling-over-floor is not "draft maniacs." Rounds 1-2 studs have both floor *and* ceiling — that's what makes them studs, take them. Tier discipline still rules everything. Ceiling is the *tie-breaker lens* — when two guys are close, take the one with the monster best-case — and it bites hardest from round 6 on, where the choice is "guaranteed WR4" versus "could be a WR1," and the correct answer in this league is always the second one.

---

## The Thunderdome War Game (why we trust all this)

On August 5 we stress-tested the doctrine instead of just admiring it. Setup: empirical VORP built from 2022-25 data in our exact scoring; **300 simulated draft rooms**, each drafted by six CPU personas (including a deliberate QB-reacher, as a cautionary tale); then **16 outcome-sampled seasons played per room** with head-to-head records.

Results:

The **pure-VBD bot edged the doctrine bot 53.8%** head-to-head, worth about +33 points per season — roughly one good waiver pickup. Both bots **independently took a QB in round 6**. The QB-reacher persona finished a dead-average 4.69 of 8 — reaching for a quarterback donates about half a standings rank to the family.

**Validated** (doctrine the sim confirmed): QB in rounds 6-9, K/DEF in the last two rounds, elite-heavy ceiling builds, elite TE at fair price.

**Adopted** (the one lesson math taught us): the rounds 3-5 same-tier RB-over-WR tie-breaker.

**Rejected**: wholesale VBD draft ordering — pure math has no Miami Rule, no badges, no eyes on camp, and no concept of a player's range of outcomes.

**The honest caveat, written down on purpose:** the sim's scorekeeper shares VBD's worldview (both run on the same projections), so the 53.8% edge is an *upper bound* on math's advantage, not a floor. That asymmetry is exactly why VBD is the tie-breaker and not the boss.

---

## Badge Glossary

| Badge | Name | Meaning |
|-------|------|---------|
| 🎯 T | Briggsy's Guy | Curated target — market price is below our board |
| 🚀 B | Breakout | Community breakout/sleeper pick |
| ⚠️ X | Bust risk | Experts warning the price is too rich |
| 🩹 I | Injury watch | Current injury/rehab/suspension situation |
| 🆕 R | Rookie | 2026 rookie class |
| 📈 U | Riser | ADP climbing on camp buzz |
| 📉 D | Faller | ADP sliding |
| 🧊 S | IR stash | Candidate for the two IR slots |

---

## Shelf Life & Honest Caveats

**Everything above the badges is a projection with error bars.** VORP is a season-total lens — it can't see byes, weekly matchups, or spike-week timing, which is part of why the judgment layer exists.

**The baselines are estimates.** QB12/RB41/WR47/TE12 come from typical roster construction; real leaguemates hoard weirdly.

**The August 5 snapshot expires.** Camp battles resolve, players get hurt, ADP moves daily in August. Before the real draft the full board gets rebuilt: re-research rankings/injuries/ADP, regenerate `players_data.json`, then update **every** surface in one pass — the date-stamped copy, `family-feud-draft-board.html`, and the cheat-sheet PDF. Never draft off stale data — the method survives the refresh; the ranks don't.

**The mission survives everything:** beat Hunter.
