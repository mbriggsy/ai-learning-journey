# The Board: Ranking Methodology — Family Feud 2026

*Why the board says what it says. Companion to [`../draft-kit/players_data.json`](../draft-kit/players_data.json) (the board itself), [`draft-day-runbook.md`](draft-day-runbook.md) (draft-day operations), [`league.md`](league.md) (the rules all of this is bent around), and [`../draft-kit/family-feud-draft-board.html`](../draft-kit/family-feud-draft-board.html).*

<!-- BEGIN GENERATED snapshot-date — rewritten by scripts/build_board.py. Do not hand-edit. -->
*Rankings snapshot: August 8, 2026.*
<!-- END GENERATED snapshot-date -->
*The ranks expire — the method doesn't. Read this as many times as you want, Briggsy; the numbers get refreshed before draft day.*

---

## The one-sentence version

The market tells us *when* players get drafted, the league format tells us *what's scarce*, VORP tells us *what scarcity is worth*, and the judgment layer keeps us from doing anything stupid. A player's rank is where those four stop arguing.

---

## The Four Layers

Every rank on the board is built in four passes, in this order.

### Layer 1 — The market blend

The starting point is a consensus mash of eight expert sources — FantasyPros, FTN, ESPN, Yahoo, CBS, NFL.com, SI, and PFF — plus August training-camp reporting. This anchors the board near real-world ADP (average draft position), and that anchoring is deliberate: **a board is a draft order, not a wish list.** If the room takes Brock Bowers 17th and your board says he's worth 43rd, congratulations — you have a very principled board and you will never roster Brock Bowers. Rank has to reflect where a player can actually be acquired, then the deltas (below) tell you whether that price is a bargain or a tax.

### Layer 2 — The league bend

Consensus rankings are built for generic 12-team leagues. Family Feud is not generic, so every rank gets pushed around by our actual rules:

**Full PPR + two FLEX spots.** You start four or five pass-catchers every week, and every catch is a point. Target hogs rise; touchdown-dependent guys fall.

**Eight teams.** This is the big one. The waiver wire in an 8-team league is a Whole Foods — fully stocked, all season. That *crushes* the value of positions where the free replacement is decent (QB and TE especially: the 12th-best QB is on the wire and he's *fine*) and concentrates value in true difference-makers, because the only thing free agency can't hand you is an elite player.

**Six of eight make the playoffs.** The regular season is a formality; the title is decided head-to-head in weeks 15–17. This flips the risk math toward ceiling — covered in its own section below, because it's the philosophical spine of the whole board.

**Two IR slots.** Injured stars falling in the draft are free real estate — you can park them at zero roster cost. Falling injured players hold more value on our board than on consensus boards (the 🧊 stash badge).

**Situational overrides.** Rules like the Miami Rule (no Dolphins pass-catchers in 2026 — Tua and Hill gone, Malik Willis starting). The math loves De'Von Achane's projected touch count; the math cannot see who is throwing him the ball. Judgment caps him.

### Layer 3 — The judgment pass

Badges and notes: the qualitative layer covering what projections structurally can't know. Camp risers (Waddle to Denver for a 1st), injury discounts with rehab timelines (Nabers' ACL trending toward Week 1), bust-price warnings (CMC at age 30 off a 450-touch season), breakout profiles (Egbuka, Burden, Tuten). This layer moves players in both directions and is the reason the board never matches pure math — on purpose.

### Layer 4 — Tiers

Finally, players get grouped at the **cliffs** — the points where the projected drop-off to the next guy gets steep relative to the small gaps within the group. Tiers, not ranks, are the draft-day decision unit: if four players are left in a tier when your pick comes up, you can wait a round and take whoever survives. If ONE player is left in a tier, you sprint. The exact rank number within a tier is a preference; the tier boundary is the strategy.

---

## The Math: VORP

One idea drives all the numbers: **a player's value isn't his points — it's his points minus what FREE gets you.**

### How it's computed

For each player, we project a season point total in our *exact* scoring (full PPR, 4-point passing TDs, 0.04/passing yard, 0.1/rushing and receiving yard, −2 fumbles lost, −1 INT). The projections come from four years of empirical positional scoring curves — what the RB5, the WR20, the TE8 have actually scored in this scoring environment — mapped onto the current rank order.

<!-- BEGIN GENERATED curve-provenance — rewritten by scripts/build_board.py. Do not hand-edit. -->
**Curve provenance:** seasons 2021–2024, built from nflverse weekly player stats, excluding `long_td_bonus`.
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
| Pos | Last starter league-wide | Waiver replacement (VORP baseline) |
|-----|--------------------------|-------------------------------------|
| QB  | QB8 | **QB12** |
| RB  | RB21 | **RB41** |
| WR  | WR27 | **WR47** |
| TE  | TE8 | **TE12** |
<!-- END GENERATED baselines -->

**VORP = projected season points above that baseline player.**

### The worked example that explains the whole draft

Three numbers from the board:

<!-- BEGIN GENERATED worked-example — rewritten by scripts/build_board.py. Do not hand-edit. -->
| Player | VORP | Read as |
|--------|------|---------|
| Jahmyr Gibbs | **268.4** | 268 points/season better than the free RB (RB41 is the bar) |
| Ja'Marr Chase | **242.7** | 243 points better than the free WR (WR47 is the bar) |
| Josh Allen | **129.6** | 130 points better than the free QB (QB12 is the bar) |
<!-- END GENERATED worked-example -->

*The two tables above are generated from `draft-kit/players_data.json` on every board refresh. If
a number here disagrees with the board, the board is right and this file was hand-edited — run
`python scripts/build_board.py`.*

Josh Allen will outscore Jahmyr Gibbs this season. Doesn't matter. Gibbs clears his replacement bar by twice as much, and the bar is the only thing your lineup actually feels — you don't play "Allen's points," you play "Allen's points minus the points of the QB you could have had for free." That is the entire QB-in-rounds-6-9 doctrine in one table.

The same logic produces the RB-vs-WR lean: the free WR47 in this league scores ~10 a week all season; the free RB41 does not. A mid-tier RB beats a mid-tier WR *over replacement* even when their raw points tie — which is exactly the rounds 3-5 same-tier tie-breaker rule ("the wire always has a 10-ppg WR on it, never a 13-ppg RB").

---

## Reading vbdDelta (when board and math disagree)

Every player carries three math fields: `vorp` (the number above), `vbdRank` (the whole board re-sorted by pure VORP), and `vbdDelta` = **board rank − vbdRank**.

**Positive delta** → the math likes him *more* than his board slot. Taking him at board price is getting paid.
**Negative delta** → we're knowingly drafting him *ahead* of the raw math. There'd better be a reason — and there is; that's the point of the layers.

Case studies from the current board:

**Brock Bowers, −26** (board 17, math 43). We pay a real premium over raw season-total math, because season totals miss the *weekly* edge: an elite TE wins you a position every single week while seven other teams start a guy named Brenton. Also Layer 1: he goes in round 2-3 whether we like it or not.

**Josh Jacobs, +18** (board 45, math 27). The market hears regression whispers; the math sees locked-in volume. That's a "value if he's there" flag — tempered by his ⚠️ badge, not overridden by the math.

**Josh Allen, +6** (board 24, math 18). Even the math says his fair price is picks ~17-24 — which is why doctrine says only take a *fall*. A six-spot slide isn't a steal; it's retail with a coupon. Steal means past pick 24.

**De'Von Achane, +5** (board 16, math 11). Math loves the touches; the Miami Rule caps the rank. Judgment overrides math where math can't see Malik Willis.

**All defenses, +68.** Ignore these. VBD genuinely believes a top DST is worth a round-8 pick — season totals say so — but week-to-week DST scoring is a coin flip and streaming off the wire replaces most of it. Doctrine keeps K/DEF in rounds 15-16. The engine treats these deltas as decoration.

**Rule of thumb: VBD is the tie-breaker, never the boss.** When two players sit in the same tier and the badges don't decide it, the VORP chip decides it. It never reaches across tiers.

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
