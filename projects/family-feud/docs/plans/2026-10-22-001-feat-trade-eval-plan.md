---
title: "feat: scripts/trade_eval.py — the on-demand trade evaluator"
type: feat
status: active
date: 2026-10-22
origin: the Kaeperni offer of 2026-10-22 (A.J. Brown + Tucker Kraft for Zay Flowers), evaluated by hand and declined
checked: 2026-10-22 whole-plan check (Workflow wf_68e18b45-54d — modelling, codebase-fit, tests+report lenses; 3 P0 + 19 P1/P2 folded in below)
---

# feat: `scripts/trade_eval.py` — the on-demand trade evaluator

## Why

Two trades have now been priced by hand from session scratch: the 09-26 win-win search (`TODO.md`,
"Trade offer") and the 10-22 Kaeperni offer. That hand-built work went wrong in three ways, and each
one moved the answer:

1. **The baseline was denied the remedy the trade was credited with.** Our roster has no backup QB,
   so the baseline scored **0 at QB in Maye's week-11 bye**. Any trade that freed a roster spot got
   to add a FA QB, and was credited about **+18** for it. Today's roster could make that same add by
   cutting a bench body. That artifact turned *Flowers + Chase Brown for Bijan* from about +11 into
   **+28.6**.
2. **One free agent was used twice.** After the trade, Kaeperni fills his open spot with Jared Goff,
   and the scratch code still let *us* stream Goff in weeks 11 and 14. Our honest Sleeper number on
   the offer is about **−47.5, not −45.6** (plan check, `rv_probe10.py`).
3. **Sleeper alone set the size of the answer.** On the actual offer, Sleeper said −45.6 for the
   rest of the season and three-site scaling said −33.0. On the counter, Sleeper said **+10.6**
   while three-site scaling said **−8.2** and picked a different free agent, Mayfield rather than
   Goff (`da_counter.py`). Across the 20 "win-win" counters, the sign of our gain flipped on
   **16** once the three-site set was used (`rv_probe8.py`).

The plan check also turned up a fourth defect, older than any of these: **every kicker projection
is scored wrong.** Sleeper's projection rows say `fgm_50p` and `fgmiss_30_39/40_49/50p`, while the
league scores `fgm_50_59`, `fgm_60p` and `fgmiss`. `gameday_check.score` drops keys it doesn't
know, so every projected 50+ yarder and every projected miss counts 0. Shrader is under-scored by
about 1.5 a week. The bug lives in the shared scorer, so the game-day check and the three-site
report have it too.

Briggsy's standing rule (2026-10-14) is that every in-season call reads the external projections.
`docs/in-season-plan.md` §3 names this tool. This plan builds it so that none of these can come
back.

## What it answers

*"If we make this trade, what do we gain or lose each week left in the season, and what does the
other side gain?"* The tool answers with both projection sets side by side, and it prints what the
simulation actually did.

It also answers the follow-up question: *"what could we ask this team for instead?"*

It never says ACCEPT or DECLINE (insight 017). The decision is Briggsy's.

## Decisions

### D1 — One fair procedure, run the same way in both worlds

There are two worlds: **BEFORE** (today's rosters) and **AFTER** (the trade applied). Each side's
roster is fixed by the same procedure in both. Every choice is made **separately inside each
projection set**, from that set's own numbers. When the two sets choose differently, the report
prints both choices.

**The free agents, two different things:**
- **The universe:** every unowned player, per world. In the AFTER world it leaves out every free
  agent either side adds, and takes in every player either side drops. The weekly stream draws
  from the whole universe: the best at each position *that week*, so a one-week streamer with a soft
  matchup is visible.
- **The add shortlist:** the top 4 in the universe at each position by rest-of-season points in
  that set. Roster-fix adds and swaps choose from it. A top-12 overall would be 12 quarterbacks
  (insight 024, defect 1).
- **Conflicts:** we resolve first, then the counterparty from the pool minus our adds. When both
  sides want the same free agent, the counterparty re-chooses. The report says so.

**Fixing each side's roster**, in this order, identically in both worlds:
1. **Incoming IR players.** A player arriving from the other side's IR goes into an open IR slot if
   the receiver has one (`reserve_slots` − len(reserve)). Otherwise he counts against the active cap.
2. **Over the cap.** Drop the excess from the non-incoming bodies, choosing the drop that costs the
   least rest-of-season points. Every combination is tried.
3. **Under the cap.** Add the best free agent(s) from the shortlist.
4. **Swaps, until none gains.** Drop one non-incoming body and add one shortlist free agent, if that
   raises rest-of-season points by more than the tie margin; repeat until no swap does. Each is
   found by best-add-then-best-drop. Both worlds get this, so today's roster is never denied an
   upgrade the trade is credited with. *Amended by the 2026-10-23 review:* the first build allowed
   ONE swap, and that was not parity — a trade that freed a spot got a fill AND a swap (two free
   agents) while today's full roster got one. On the frozen night Kaeperni added Goff and McConkey
   after the trade, McConkey only before. The swap loop refuses if it has not settled in 2 × cap
   swaps (every swap gains, so it must settle).

**Every drop is judged in the pool it is committed to** (review 2026-10-23). A man let go is a free
agent from the week he goes, streamable by either side, because that is how the season is then
scored. The over-cap drop and the IR shed were first judged with him gone for good, so the world
that was over the cap chose by a different rule from the one it was scored by.

**Waivers** (review 2026-10-23, unverified, printed). A man let go when the trade processes is free
to others from NEXT week if this week is under way: this league's waivers run once a week, on
Wednesday (`daily_waivers: 0`), so a Friday drop cannot start for anyone on Sunday. Worth 3.4 on the
frozen night's headline once swaps repeat. To verify: watch one real Friday drop — does the player
read `W Wed` on the Players tab, or is he addable at once?

**Ties among adds** go to the free agent the market values MOST (raw Sleeper rest-of-season), ties
among drops to the body it values least. A tied add first went to the top of the shortlist — a
quarterback, whatever his worth — and a choice that is a coin flip for one side moves the OTHER
side's number: on the frozen night the add rule alone moved Kaeperni's three-site total by up to 4.

**An IR player who comes back into an open roster spot** sheds nobody (review 2026-10-23).

**The weekly stream:** each week, try the universe's best free agent at each position, keep the one
that raises that week's best lineup the most, or none. In the current week, a free agent whose game is
locked at the processing instant is not a candidate (D3). A single top free agent overall would be a
quarterback every week and could never cover a kicker or TE bye; the plan check measured that
misreading moving Kaeperni's side 17 points.

**IR returns:** a reserve player counts from his first week projecting above 0. From that week on,
his side sheds its cheapest non-incoming body, chosen over the weeks that remain.

**Ties:** drops within **0.05** of the best are a tie. The report prints the whole tied set ("drop
any of: Fannin, Stevenson, White — the model is indifferent"). The simulation breaks the tie by the
lowest raw Sleeper rest-of-season points.

**What the model leaves out:** a body that never starts is worth 0 here. Injury cover is outside the
model, and the report says so in one line.

### D2 — Two projection sets; THREE SITES is the headline

**SLEEPER.** Sleeper's weekly projections for every week left, scored with the league's
`scoring_settings` through `gameday_check.score`. That function gains a **kicker-key translation**
for every caller:
- `fgm_50p` → `fgm_50_59`. Projections don't split out 60+.
- `fgmiss` = Σ `fgmiss_*`.

The translation applies only when the league doesn't score the source key and the line doesn't
already carry the target key. Then nothing is ever counted twice.

**THREE SITES** (Sleeper + CBS + ESPN):
- **Clean weeks** are the current week and the next one. CBS serves the current week's numbers for
  any week 2+ ahead (`TODO.md`, the CBS item).
- **In the clean weeks,** a row with **n = 3** that isn't flagged approx uses the three-site
  consensus directly. Every other row uses Sleeper.
- **Later weeks** use Sleeper × a multiplier, computed per player:
  - `ratio = Σ consensus / Σ Sleeper`, over the clean weeks where Sleeper ≥ **5.0** and n = 3.
  - `multiplier = 1 + r₂·(ratio − 1)`.
  - `r` is measured on every run, per position: the correlation between players' clean-week-1
    ratio and their clean-week-2 ratio. It takes at least 10 pairs, otherwise `r = 0`.
  - `r₂ = 2r/(1+r)`, clipped to [0, 1] (the persistence of a two-week mean). *Review 2026-10-23:* a
    player usable in only ONE clean week carries `r`, not `r₂` — a mean of k weeks persists
    `k·r / (1 + (k−1)·r)`. 28 rostered players had a one-week ratio on the frozen night.
  - **IR returns in THREE SITES need two of the three sites** (review 2026-10-23). Sleeper's blank
    row for an IR player scores 0 and counts as a vote, so one stale site made a consensus above 0:
    Alec Pierce came back in week 8 on CBS's 10.8 against blanks from Sleeper and ESPN (Sleeper:
    week 11). The consensus itself still counts the blank as a 0 — the lineup report relies on it.
  - Measured tonight: WR 0.82, K 0.60, RB 0.57, QB 0.47, DEF 0.18, TE 0.10. So a TE's two-week
    disagreement is mostly noise and barely moves him.
- **The clamp.** The ratio is clamped to [0.75, 1.25]. This is a modelling choice: tonight it bit
  on 7 of 127 rostered players, ranging 0.715 to 1.327, four of them kickers. Any clamped player in
  the trade or in either lineup prints his raw and clamped ratio.
- **K and DEF are never adjusted** (`approx` rows: ESPN's own kicker scoring, CBS's points-allowed
  bucket). They read Sleeper in both sets, and the header says so.
- **Traded players with no usable ratio are named in the header:** "no three-site projection this
  week or next; his three-site number is Sleeper's."
- **One header line, in plain words:** "The three-site number counts Sleeper as one of its three
  votes, so it can never fully disagree with Sleeper." (Insight 018.)
- **When x.load fails** — with a refusal or ANY other error (an empty crosswalk raised IndexError and
  ended the run in a traceback; review 2026-10-23). `x.load` has no per-source fallback. The run
  then continues **SLEEPER ONLY**. It also runs SLEEPER ONLY when this week is all played and next
  week's pull fails: no priced week has three sites, and the column would be Sleeper's to the decimal.
  - The first header line says so and names what refused.
  - The three-site column and the disagreement line are left out, never filled with Sleeper's
    numbers.
  - `x.load` itself is not changed.

**One snapshot per run.** State, league, rosters, users and players come from `x.load(current)`'s
third return value. `g.pull` runs only when `x.load` refuses. Every other week's Sleeper projections
come through `g.fetch` (per-call nonce, insight 020).

### D3 — Week locks, from kickoff times

**Processing time:** `now + trade_review_days` (a league setting; 1 day today). `--process-at
"YYYY-MM-DD HH:MM"` (Eastern) overrides it.

**In the current week**, a player is locked when his kickoff (ESPN map, `g.pull_kickoffs`) is at or
before the processing instant:
- **A locked starter** stays in his slot and scores for his current owner, traded or not.
- **A locked bench player** is unavailable to everyone.
- **A locked free agent** can't be streamed or added.
- **An unlocked player** moves with the trade. Every unlocked slot is re-optimised, before and after
  alike.

**ESPN down:** the lock falls back to the projection's game date, and the header says the run is
blind on kickoffs. A game on an earlier day is locked and a later one is not; a game ON the
processing day cannot be known, so the run **refuses** unless it processes before 9:30 AM ET (review
2026-10-23: the fallback called that day unlocked, so a Saturday-night run moved players whose games
were over). A team missing from ESPN's scoreboard gets the same date rule, and the header names it.

**The window** (review 2026-10-23): `--process-at` must be from now to before next week's first game
day. A later instant was priced as if it fell next week — deadline unchecked, nothing locked — and a
past one unlocked games already played. Both refuse.

**The current week is dropped** when every kickoff is at or before the processing instant. This is
measured against the processing instant, never the wall clock.

**Unverified assumption:** Sleeper credits a locked starter's points to his owner at kickoff even
when a trade processes mid-week. The header prints this. It is worth about 6 points on tonight's
offer.

### D4 — The roster model

- **Active cap** = `len(roster_positions)`, which is 16 (10 starters + 6 BN). Sleeper doesn't list
  IR in `roster_positions`: IR is `settings.reserve_slots` (2) and is never subtracted.
  Active bodies = players − reserve − taxi.
- **Positions:** Sleeper's `position`, unless the league never starts it (DB, FB); then the one
  fantasy position he is listed at (review 2026-10-23: Travis Hunter is a DB who plays WR, and was
  priced at 0).
- **Accepted slots:** QB, RB, WR, TE, FLEX (RB/WR/TE), K, DEF, BN. Any other slot refuses: greedy is
  exact only for nested flex sets, and the plan check found a non-nested counterexample (11.0 vs an
  optimum of 19.0). A pool player whose `fantasy_positions` lists more than one starting position
  also refuses.
- **The lineup is greedy:** QB, K, DEF and TE take their best player; RB and WR their best two;
  FLEX the best two RB/WR/TE left over. `lineup_value.best_lineup` (fill=None) and a brute-force
  search are the test oracles. Greedy must equal both on 200 random rosters.

### D5 — Identity: ids, team codes, or an exact name

- **Accepted input:**
  - a Sleeper id;
  - a team code for a DEF, in any case;
  - a full name, normalised with `normalize.norm` and matched exactly against **rostered players
    only**, the universe a trade draws from. Across the whole player list, "Kenneth Walker"
    matches two ids; among rostered players it matches one.
- **A DEF has no `full_name`** (it is None for all 11 rostered DEFs). Its name is first + last
  ("Houston Texans"), it is printed as "HOU (Houston Texans)", and `norm` is never called on None.
- **Zero or two-plus matches refuse.** The refusal lists rostered players sharing a
  `normalize.tokens` token, with their ids, and never accepts any of them (insights 004, 010).

### D6 — The counterparty is derived, never typed

- Every `--get` must be on one roster that isn't ours. Every `--give` must be ours, found by
  `BRIGGSY_USER_ID`, never by email (CLAUDE.md landmine). Anything else refuses, naming each
  player's actual owner.
- `--search` takes `--team`, given as a roster id or display name. **`--team` naming our own roster
  refuses.**

### D7 — The window and the deadline

- **Weeks:** from the current week (unless D3 drops it) to the final playoff week. The playoffs run
  from `playoff_week_start` for ⌈log₂ `playoff_teams`⌉ one-week rounds: 15, 16, 17.
  `playoff_round_type` ≠ 0 refuses until it is modelled.
- **Totals:**
  - the regular season;
  - the playoffs (15-17);
  - **16-17 alone, labelled "if a top-2 seed (week-15 bye)"**;
  - the rest of the season.
- **In any week we face the counterparty,** the row also prints the net swing (our change minus
  theirs), from `/matchups/<week>`. Tonight that is week 10 against Kaeperni.
- **The deadline:**
  - **The processing week.** It is the current week, unless the processing instant comes after
    this week's last kickoff; then it is the next week.
  - **Past the deadline:** a processing week greater than `trade_deadline` (11) refuses ("the trade
    deadline has passed").
  - **The deadline week itself** runs, and its first header line reads: "This is the trade deadline
    week. Whether Sleeper still accepts trades this week is unverified; the season outlook treats
    the start of week 11 as the deadline." (`docs/season-outlook-2026.md`.)

### D8 — The instrument checks itself before it prints (insight 008)

- **Refuses:**
  - **Empty weeks:** a week whose Sleeper projections are empty, or one where more than half the
    league's rostered, non-bye players project 0.
  - **Unscored kicker keys:** a fg/xp key in a projection row that the league doesn't score and the
    kicker translation doesn't map. That catches a new key before it scores 0 silently.
- **Byes** come from the team's DEF opponent, the same rule `external_projections` uses. A missing
  row is never treated as a bye.
- **🚨 line above the numbers:** a traded player who projects 0 in every week left gets "projects
  zero all season — injured or a bad join; these numbers are not meaningful for him".

### D9 — The report: caveats, then numbers, then what the simulation did

Plain words throughout. The report never prints "ROS", "legalisation" or "consensus-adjusted", only
"rest of season", "roster fix" and "three sites".

1. **Header,** in this order. Every assumption prints before any number (insight 016).
   - the SLEEPER ONLY line, if any;
   - the deadline-week line, if any;
   - the trade, in full names;
   - the counterparty;
   - the processing instant and who it locks;
   - the sources;
   - the D2/D3 assumption lines;
   - the 🚨 zero lines;
   - the traded players with no ratio;
   - the clamp lines;
   - **"THE TWO PROJECTION SETS DISAGREE ON WHETHER WE GAIN OR LOSE"**, when the signs of our
     rest-of-season totals differ.
2. **Weekly table:** two rows per side (Sleeper, three sites) with:
   - the week-by-week change, byes marked;
   - totals for the regular season, playoffs 15-17, 16-17 and the rest of the season;
   - the net-swing row in head-to-head weeks.
3. **"How much the two projection sets disagree".**
   - It prints only when a second set exists. On SLEEPER ONLY it reads "No second projection set
     tonight; disagreement not measured."
   - It gives the per-week gap between the sets, and says so when they chose different pickups.
   - It adds one measured line: "Neither number includes game-day luck: our weekly score has swung
     by about ±N points this season." N is the standard deviation of our played weeks' points from
     `/matchups`, never a constant.
4. **What the simulation did,** for each set:
   - each side's drops, adds and swaps, with tied sets in full;
   - for every player whose weekly starts change, the starts before → after;
   - the current week's lineup before and after, slot by slot;
   - "a body that never starts is worth 0 here; injury cover is outside the model".
5. **`--json PATH`** dumps every number.
6. **Exit codes:** 0 = ran, 2 = refused (`gameday_check`'s convention).

### D10 — `--search`: counters ranked for us, with the other side shown

- **The search space:**
  - `--give` anchors one or more of our players;
  - the search may add one more of ours;
  - it takes one or two from `--team`, IR players included.
- **The ranking:** by our THREE-SITE rest-of-season total, among packages where theirs is ≥ 0 in the
  same set. On a SLEEPER ONLY night it ranks on Sleeper, and the header says so.
- **Each row shows:**
  - **both projection sets,** with the sign-disagreement mark where it applies;
  - **each side's moves** (insight 024: the +28.6 artifact was entirely a pickup).
- **Also printed:**
  - the top 15 kept packages (`--json` holds all of them);
  - the top 5 for us regardless of them;
  - the counts evaluated and kept;
  - **how many evaluated packages flip sign between the sets.**
- **The old ranking is gone.** `min(us, 2×them)` buried *Flowers + Swift for Bijan*.
- **Cost** (measured 2026-10-23 on the frozen night, 2,736 packages): 355-365 s. One swap took about
  72 s; repeated swaps are the price of parity (Kaeperni makes up to 13 in one package). The lineup
  and stream memos are emptied for each give: kept forever they reached a 9.6 GB peak, and emptying
  them per give changes no number (pinned by a test).
- **"Disagree"** means one set gains and the other loses, each by more than the tie margin; a plain
  sign test called 0.0 against +0.1 a disagreement and 0.0 against −9 an agreement.

### D11 — Reuse, and the files touched

- **New:**
  - `scripts/trade_eval.py`;
  - `tests/test_trade_eval.py`;
  - `tests/fixtures/trade_eval_kaeperni_20261022.json.gz`.
- **Changed:**
  - `scripts/gameday_check.py` (`score` gains the kicker-key translation);
  - `tests/test_gameday_check.py` (a test pinning a real Sleeper kicker row: Shrader's week-7 line).
  The change is made on a Thursday night, outside the Sat 20:00 – Sun 15:00 game-day window (TODO
  landmine).
- **Reused:**
  - `g.fetch` / `score` / `pull_kickoffs` / `now`;
  - `x.load`;
  - `normalize.norm` / `tokens`;
  - `lineup_value.best_lineup` (as a test oracle).
- **Not added:** no new id map and no scheduled task. The tool writes nothing except `--json`.
- **Encoding:** stdout is reconfigured to UTF-8, and every `open()` passes `encoding="utf-8"`.

### D12 — The published number is the default invocation (insight 024, defect 5)

- **The fixture:** `tests/fixtures/trade_eval_kaeperni_20261022.json.gz`. It is cut from this
  session's scratchpad **before the session ends**, because tonight's projections can't be fetched
  again. It holds:
  - `/state/nfl` {week 7, season 2026, regular};
  - the league (`scoring_settings`, `roster_positions`, `settings`);
  - rosters and users;
  - matchups for weeks 1-14;
  - Sleeper projections for weeks 7-17, trimmed to stats/date/opponent, for every player with any
    nonzero week plus every DEF and rostered row;
  - a players subset (names, position, `fantasy_positions`, team, injury fields);
  - the ESPN week-7 kickoff map;
  - x.load's week-7 and week-8 rows.

  At capture time, a one-off check confirms the trimmed fixture gives the same result as the
  untrimmed one.
- **The test:** it runs `main()` with exactly the documented argv:
  `python scripts/trade_eval.py --give "Zay Flowers" --get "A.J. Brown" --get "Tucker Kraft"`.
  Network calls and the clock are patched (Thu 2026-10-22 21:30 ET). It pins the **whole result**,
  as RECORDED from the shipped method, never tuned to match a scratch number:
  - our Sleeper and three-site totals for the rest of the season, the regular season, playoffs and
    week 7;
  - their rest-of-season totals;
  - our tied drop set;
  - their pickup.

  Insight 035 explains every gap to the scratch −45.6 / −33.0.

  **Re-recorded 2026-10-23 after the whole-file review**, from −36.9 / −47.8 (Kaeperni +43.7 / +53.9)
  to **−36.25 / −45.53 (Kaeperni +43.19 / +50.43)**. The steps, on this night: swaps repeat (−32.74 /
  −45.76); a tied add goes to the most valued player (Kaeperni three sites +39.34 → +38.47); IR
  returns need two of three sites and one-week ratios carry r (−32.83); a man let go at processing
  waits for waivers (−36.25 / −45.53). The headline landing near the old one is a coincidence of two
  moves in opposite directions, not a confirmation. The printed table is now pinned too, not only
  the `--json`.

## Test plan (`tests/test_trade_eval.py`, no network)

Each axis gets its own mutant (insight 019). The **Wiring** rows run through `main(argv)`, with
`g.fetch`, `g.pull_kickoffs`, `x.load` and `g.now` patched, and assert the exit code and stdout. Each
has a mutant that deletes the call site and keeps the guard (insight 013).

| Axis | Test | Mutant it must kill |
|---|---|---|
| Fair stream | no backup QB, QB bye in window: the baseline streams a QB, and a spot-freeing 2-for-1 gains **0** that week | baseline without the stream |
| Stream rule | per-position best, best lineup kept; a kicker-bye case is covered | single top FA overall |
| Pool per world | the counterparty's pickup can't be streamed by us after the trade | after-world stream from the before-world pool |
| Fair 16th body | worst body below the best FA: the baseline gets the swap too, and the trade gains nothing from it | baseline denied the swap |
| Per-set choices | sets that pick different adds print both | Sleeper's choice reused for three sites |
| Over cap | drops the cheapest non-incoming body; prints the tie set | drop by this week's points |
| IR return | an IR player projecting from week 12 counts weeks 12+ and forces a shed | IR excluded all season |
| IR landing | an incoming IR player with an open IR slot forces no drop | counted inside the cap |
| Lineup optimum | greedy = `lineup_value.best_lineup` = brute force on 200 random rosters | FLEX filled before RB/WR |
| Unknown slot | `SUPER_FLEX` refuses | silently unfilled |
| Locks | locked starter scores for his old owner; locked bench body unavailable; incoming locked player 0 for the new owner; locked FA not streamable; unlocked player moves | each lock rule removed in turn |
| Lock source | no kickoff map → date fallback and "blind" in the header | silent fallback |
| Current week dropped | all kickoffs ≤ processing → the week is dropped, measured against the processing instant | wall clock used |
| Kicker keys | Shrader's real week-7 row scores 50+ makes and misses | translation removed |
| Kicker refuse | an unknown fg key refuses | check removed |
| Ratio floor | Sleeper < 5 ignored | floor removed |
| Ratio n | n < 3 ignored | n filter removed |
| Ratio of sums | Σc/Σs, not the mean of weekly ratios | mean of ratios |
| Ratio persistence | a TE-like r ≈ 0 gives a multiplier ≈ 1 | no shrink |
| Clean weeks | a clean-week row uses the consensus directly | ratio applied in clean weeks |
| Clamp | clamped and printed | clamp removed or not printed |
| Approx rows | a K/DEF row is never adjusted | approx adjusted |
| No ratio named | a traded player under the floor is named | count only |
| Identity | exact full name; "brown" refuses with candidates; "AJ Brown" = "A.J. Brown"; `hou` → HOU; "Houston Texans" → HOU; "Kenneth Walker" unique among rostered | token accepted; whole-list match; case-sensitive DEF code |
| Counterparty | `--get` across two rosters refuses; a `--give` not ours refuses; `--team 3` refuses | owner checks skipped |
| Deadline | processing week 12 refuses; week 11 runs and prints the deadline line; week 10 whose processing falls in week 12 refuses | `>=`; line removed; `state.week` used |
| Positive control | an empty projection week refuses; half the league at 0 refuses | control removed |
| SLEEPER ONLY | x.load raising → header line, no three-site column, disagreement line suppressed | three sites silently = Sleeper |
| Report order | assumption lines, 🚨 lines and the sign line print before the table | printed after |
| Search ranking | big-us/small-them ranks first; negative-for-them filtered; moves printed; flip count printed | `min(us, 2*them)`; moves omitted |
| Published number | the frozen Kaeperni fixture through `main()` reproduces the recorded whole result | any change to the method |

## Docs touched in the same pass

- **`docs/in-season-plan.md` §3:** marked BUILT, with the command. Its VORP caveat no longer
  applies, because the tool reads weekly projections, not VORP.
- **`CLAUDE.md`** "Where truth lives": add a row for `scripts/trade_eval.py`. Add a landmine for the
  kicker keys.
- **`README.md`** "What's here": one row.
- **`TODO.md`:**
  - retire the stale "Trade offer" item, now built;
  - the CBS week-ahead item stays (this tool works around it, and doesn't fix it).
- **Test-count surfaces:** re-measured from the suite, never copied.
- **The `sleeper-draft-room` skill:** the *Decline an INCOMING trade* section, measured tonight.
- **`docs/insights/035`:** the denied remedy, the double-used free agent, and the kicker keys.

## Out of scope

- **Title odds / Monte Carlo.** The weekly means are the closed form of the expected-points
  question (insight 021). Revisit only if a trade's case rests on variance.
- **Multi-team trades and pick trades.**
- **Proposing, accepting or declining from the tool.** That stays in the `sleeper-draft-room` skill,
  and every transaction needs Briggsy to name it.
- **Fixing `external_projections`' CBS week-ahead bug.** That is its own TODO item.
