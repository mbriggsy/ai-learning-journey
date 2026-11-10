# The Nightly Feud, in-season edition

**Asked by Briggsy 2026-11-09.** The draft finished Sep 6 and the paper still prints a draft
countdown, a "rebuild the board" chore and September watcher alerts. Build each edition around his
actual Sleeper roster instead: news and injuries on his players, this week's matchup with start/sit
calls, waiver pickups that fill his weak spots, league standings. Keep The Wire and Market Watch,
filtered to his roster and to free agents worth adding. Keep the nightly Drive copy.

This plan records decisions and their reasons. It carries no code.

## What was measured before deciding (2026-11-09 20:48 ET, week 9, Monday night)

- `external_projections.load()` takes **11.5 s** for the current week and **14.1 s** for next week,
  and already returns everything joined: 3,230 rows (478 with a nonzero number), each with name,
  position, team, opponent, injury tag, Sleeper / CBS / ESPN points in our scoring, consensus, `n`,
  spread. It pulls rosters, users, matchups, league and the player dump in the same call.
- The player dump is **16 MB**. Each player carries `injury_status`, `injury_body_part`,
  `injury_notes`, `practice_participation`, `practice_description`.
- ESPN's scoreboard answers for this week (15 events: final / live / bye) and next week (14 events:
  ahead / bye). `gameday_check.games_from_espn` and `kickoffs_from_espn` read it.
- **An Out player keeps a consensus number.** Week 9: Michael Wilson, tagged Out, reads Sleeper 0,
  CBS 12.45, ESPN 13.09, consensus 8.51. Stevenson, Out, reads consensus 13.77. Week 10: Tate, Out
  and on IR, reads 12.71. A start/sit rule that ranks by consensus alone starts injured men.
- **A bye reads as a consensus of 0.0 with `n` 2**, not as "no row" (Swift, week 10, `opp` None).
- Our roster record lives in the mule's cargo already: `settings.wins/losses/fpts/fpts_decimal/
  fpts_against`, `metadata.streak`. Roster 3 is 4-4, 1076.20 for, waiver position 1.
- On Monday night Sleeper still says week 9 while every week-9 game has kicked off. The lineup
  Briggsy can still change is week 10's.

## Decisions

**D1. Two modes, chosen by the draft's own status.** `sleeper_draft.json` reads `status:
"complete"` → the in-season edition. Anything else → the draft edition, untouched (its template,
its functions and its tests stay as they are; next August's board refresh owns it). The switch is a
fact in cargo, not a flag someone has to remember to flip. If the draft cargo is unreadable the
paper stays in the mode of the last edition it can prove: in-season when a season snapshot (D2)
exists on disk, draft otherwise.

**D2. One snapshot file, hauled by the nightly job itself.** A new script, `scripts/season_cargo.py`,
makes the network calls and writes `newsletter/data/inbox/season_cargo.json`. The builder reads that
file and nothing else for every in-season section. The builder's functions still make no network
call; `main()` asks the hauler to refresh the snapshot first.
- *Why not the hourly mule:* the pull is a 16 MB player dump plus twelve CBS pages plus ESPN, for a
  paper printed once a night. Twenty-four of those a day buys nothing.
- *Why a file and not an in-memory hand-off:* a failed pull falls back to the kept copy; the
  edition's inputs are archived with it (`archive_cargo` already copies the inbox); tests feed a
  fixture.
- *Why one snapshot instead of mixing with the mule's rosters:* the roster, the matchup and the
  projections must describe the same minute. The mule's copy can be 76 minutes older.
- The mule still supplies the five RSS feeds, the two trending lists and `mule_status.json`.
- Written whole to a `.partial` file and swapped in, like the Drive copy, so a pull that dies
  halfway never leaves a half file under the real name.
- `--dry-run` writes nothing, so it does not haul; it reads the kept snapshot. `--no-haul` does the
  same for a real build (tests, and a rebuild without touching the network).

**D3. What the snapshot holds.** `pulled` time; `state`, `league`, `rosters`, `users`; `matchups`
for the Sleeper week and for the week after; and per week (the Sleeper week `W` and `W+1`): the
joined rows (only players who are rostered in the league or carry a nonzero number from some
source, with body part, notes and practice status added from the dump), `meta` from
`external_projections` (row counts, unmatched, map misses), ESPN game states and kickoff times.
Plus the bye teams for `W+2`, from one small Sleeper call (DEF rows only): a team whose DEF has no
opponent is on bye, `trade_eval.bye_teams`' rule. `W+1` and `W+2` are skipped past week 18.
- CBS serves the current week for any week two or more ahead (TODO, found 10-18). `W+1` is one
  ahead and clean. `W+2` is read for byes only, from Sleeper, never for a projection.

**D4. Layered failure, each layer named in the paper.**
1. The three-site pull refuses (a CBS column moved, ESPN is down): the hauler pulls Sleeper alone
   and marks the snapshot `sources: sleeper only`. The paper then prints rosters, tags, score and
   standings, and **makes no start/sit or waiver call** — Briggsy's rule is that a call is never
   made on Sleeper alone. It says so where the calls would be.
2. Sleeper itself fails: the kept snapshot is used and a line at the top of the affected sections
   gives its age. Past 36 hours old the calls are withheld the same way.
3. No snapshot at all: each section prints that its data did not arrive, as the League Desk does
   today.
4. ESPN's scoreboard fails: no locks and no expected totals; the paper says the lineup week could
   not be confirmed and uses the Sleeper week.
The edition is always written. Every degradation adds a line to the colophon's "thinner than usual"
list, and the mule's cargo being over 150 minutes old adds one too (that replaces the only useful
thing the watcher alerts were still doing in the paper).

**D5. The lineup week.** The scoreboard always shows the Sleeper week `W`. The start/sit calls and
the waiver section are about the **lineup week**: `W` while any week-`W` game has yet to kick off,
otherwise `W+1`. When the two differ the paper shows the week-`W` score first, then "Next up" with
the week-`W+1` opponent.

**D6. One tag rule, the game-day check's.** `gameday_check.NOT_PLAYING` (Out, Doubtful, IR,
Suspended, PUP, NA, COV) removes a body from every comparison; Questionable removes nobody and is
printed on the name. A player on our `reserve` list is out of every comparison whatever his number
says. A team on bye (its DEF has no opponent) removes its players. The constants are imported, not
copied.

**D7. Start/sit.** For the lineup week:
- A body is *startable* when it is on our roster, not on reserve, not tagged NOT_PLAYING, not on
  bye, and priced by at least two of the three sites.
- The *best lineup* is the highest consensus total that fits the league's slots (`roster_positions`
  without BN): dedicated slots first, then FLEX from the best remaining RB / WR / TE. A starter
  whose game has kicked off stays where he is; a benched player whose game has kicked off cannot
  come in.
- The paper prints the current lineup slot by slot with all three numbers, the consensus, the
  spread, the opponent and any tag, then the calls:
  - **Must fix:** a starter who is not startable, or an empty slot, with the best startable
    replacement. Printed whatever the margin.
  - **Start X over Y:** the best lineup differs from the current one and the gain is at least
    `gameday_check.SWAP_MARGIN` (2.0). It says how many of the three sites agree on the direction.
  - **Close:** a difference under 2.0 is printed as a coin flip with no call.
  - Nothing to change is said plainly.
- It names the move. Nothing in the job touches Sleeper.

**D8. Expected score.** `gameday_check.projected_total` is reused, fed consensus points instead of
Sleeper's (insight 037's defense rule lives there; a second copy would drift). Printed for both
sides when ESPN's game states arrived; otherwise only the live score is printed.

**D9. Roster report ("news and injuries on my players").** Every rostered player, in three groups:
needs attention (NOT_PLAYING, Questionable, bye in the lineup week, on IR), then starters, then
bench. Each line: name, position, team, opponent or BYE, tag with body part / notes / practice
status when Sleeper carries them, consensus. Headlines naming him tonight are counted here and
printed in The Wire.

**D10. Weak spots and waiver pickups.** Free agent = in no roster's `players`, `reserve` or `taxi`.
- A *weak spot* is (a) a slot with no startable body in the lineup week or the week after, or
  (b) a position where our best lineup's starter ranks in the bottom three of the eight teams' best
  lineups at that position, by consensus. Bye holes two weeks out are named from the `W+2` bye set.
- A free agent is *worth adding* when he is startable by D7's test and putting him on our roster
  raises our best-lineup total for the lineup week or the week after. The gain is printed, with the
  man he would replace and all three numbers. Top three per position at most; a position with none
  says so.
- The paper never names who to drop. It prints the roster count (active against the league's
  limit, plus IR) and that an add needs a drop when full.
- It prints our waiver position from the roster payload and that waivers have cleared Wednesday
  around 3:15 AM ET both times it was measured (`in-season-plan.md`). No FAAB anything.
- The Tuesday waiver report in `in-season-plan.md` §1 is this section, nightly. No second job.

**D11. The Wire, in-season.** Same feeds, same full-name-only matching, same grouping by who a
headline is about. The names it listens for are our rostered players and the free agents D10 calls
worth adding. Each item says which: MY ROSTER (starter / bench / IR, with his tag) or FREE AGENT.
The draft edition's wire is unchanged; the shared matching code gains a caller, not a fork.

**D12. Market Watch, in-season.** Sleeper's trending adds and drops, kept only where the player is
(a) on our roster — the crowd is adding or dropping someone we own — or (b) a free agent in our
league who is worth adding by D10. The lede counts what was filtered out (rostered by a rival, not
worth adding).

**D13. Standings.** All eight teams from the snapshot's rosters: place, manager, record, points
for, points against, streak. Ordered by wins, then points for. The playoff line sits under
`playoff_teams` (6). Our row and Hunter's are labelled in words (never colour alone: Briggsy is
colour blind). Hunter is user `959308419154886656`, named "Hunter (briggsy007)" — the handle alone
reads as Briggsy.

**D14. What leaves the in-season paper.** The Days to Draft, Your Slot, Seats Filled and Board
Version tiles; the "draft has a time" card; the "rebuild the board" action item; the watcher's
alerts. The watcher task itself is not touched here. Tiles become Record, Place, Week, and the
projected margin against this week's opponent.

**D15. The design is still carried, not copied.** The frozen `<style>` block is injected
byte-identical as today. The new pieces (a lineup table, a standings table) get one small second
`<style>` block in the season template, built from the frozen design's own colour variables, so the
byte-identity test still holds. The page must read well at phone width and at 1536 px.

**D16. Deterministic code owns every fact and number** (unchanged rule). Template prose is fixed
text with the same deadpan voice and no exclamation marks.

## Files

- `scripts/season_cargo.py` — new. The only new network code; reuses `external_projections.load`,
  `gameday_check.fetch / pull / pull_board / games_from_espn / kickoffs_from_espn`.
- `scripts/season_edition.py` — new. Pure: snapshot + feeds in, template context out.
- `newsletter/templates/season.html.j2` — new.
- `scripts/build_newsletter.py` — the mode switch, the haul call, `--no-haul`. The Drive copy and
  the catch-up are untouched.
- `tests/test_season_edition.py`, `tests/test_season_cargo.py`, a trimmed real snapshot from
  2026-11-09 under `tests/fixtures/`.
- Docs: `docs/nightly-feud.md`, `docs/in-season-plan.md` §1, `README.md`, `CLAUDE.md`'s table,
  `TODO.md` (the waiver-report item, the counts).

`build_newsletter.py` stays runnable at every commit and through the build: the 21:45 job fires
while this is being written.

## Tests that must exist

- The Out-with-a-number trap (Wilson 8.51, Stevenson 13.77, Tate 12.71) never starts, never fills.
- A bye (Swift, week 10) never starts and is named.
- A locked starter stays; a locked bench body never comes in.
- Sleeper-only snapshot → no call anywhere, and the paper says why.
- A stale snapshot is aged in the paper; past 36 hours the calls are withheld.
- The lineup week flips to `W+1` when every week-`W` game has kicked off.
- A rival's player is never offered as a free agent.
- The Hunter label is on user `959308419154886656` and never on ours.
- `main()`: mode switch both ways, a haul failure still writes the edition and copies it to Drive,
  `--dry-run` neither hauls nor writes.
- The season page still carries the frozen style block byte for byte.
- Each guard above is mutation-checked at its call site (insight 013).

## Proof before it is called done

One real run through the scheduled task: the edition is written, its numbers are checked by hand
against a fresh `external_projections.py` run and Sleeper, the page is looked at in a browser at
phone and laptop widths, and the dated copy lands in `G:\My Drive\Nightly Feud\`.

## Changed by the plan check (2026-11-09, three readers against the real week-9 and week-10 rows)

Where a line below disagrees with a decision above, the line below wins.

- **Lock beats tag (D6).** A player whose game has kicked off is outside the tag rule: a locked
  starter keeps his slot and his live points and is never a "must fix"; a locked bench body or free
  agent never comes in. Sleeper tags men Out after games they played: in week 9 Stevenson scored
  14.8 and Wilson 12.0, and both read Out by Monday. The measured bullet above misread them.
- **Locks and the lineup week come from stored kickoff TIMES against the build clock**, never from
  stored game states, so a kept snapshot cannot offer a man who has kicked off since. With no
  kickoff times (ESPN down) the start/sit and waiver calls are withheld; the rows still print.
  The hauler refuses an ESPN board that serves a different week (gameday_check.main's rule).
- **Start/sit reuses `gameday_check.assess` (D7)**, fed through one adapter: each player's stat line
  is his one projected number, his date is his team's kickoff date. That keeps the FLEX slide
  (week 10: Flowers at FLEX with Chase Brown moved to RB, never McGowan at 5.9), each starter offered
  once, the Questionable fallback and the hold rule. No second swap engine, no "close" line, no
  site-agreement count.
- **The one projected number.** QB / RB / WR / TE: the average of the sites that price him above
  zero, and only when at least two do (a zero from Sleeper's emptied row is not a price). K and DEF:
  Sleeper's number, because CBS's and ESPN's are approximations in our scoring
  (`trade_eval.NEVER_ADJUSTED`; week 10 the average called BAL's defense an upgrade on ours while
  Sleeper ranked ours first).
- **Expected score (D8)** goes through the same adapter into `projected_total`, with a starter whose
  game is still ahead and who fails the tag / IR / bye test scored 0 (the function never reads
  tags; fed three-site numbers it counted Stevenson's 13.3). Week 10 as set: 108.84.
- **Worth adding needs the swap bar (D10).** A free agent is worth a claim only when adding him
  raises our best lineup by at least `SWAP_MARGIN` (2.0) in the lineup week or, when it is priced,
  the week after. The best of the rest print as "short of the bar" with their gain. On 2026-11-09
  nothing clears it (best: BAL DEF +1.14 on the old average, White +0.48). The Wire and Market Watch
  listen for every free agent who would start for us at all, and print his gain.
- **Weak spot (D10b)** is a position where our best starters trail the median of the eight teams'
  best at that position by 2.0 or more per slot. FLEX is not ranked. Locks are ignored for the
  ranking. Byes in the week after the lineup week are named.
- **The paper names no drop and does not sort claims from instant adds.** It prints the roster
  count and one line: a man dropped this week can sit on waivers until Wednesday's run. TODO's
  Tuesday waiver report stays open for the two things this does not do (the droppable man, the
  transaction read).
- **The matchup shows both sides (D8).** Their ten starters print under ours with projected or live
  points and tags, plus done / playing / to-go for both, and who is still to play.
- **Last week's final.** `matchups` for `W-1` is hauled. From Tuesday until the first kickoff the
  paper prints last week's final score and result above this week's card (Sleeper flips the week by
  Tuesday night in 7 of 7 archived weeks, and Monday's paper prints during the Monday game).
- **Words on the page.** One number per player, called "projected", explained once. The three
  sites sit in their own columns at laptop width and fold away on a phone; when they disagree by
  2.0 or more the row says "sites split: low to high". The words consensus, spread, approx,
  snapshot, startable and W+1 never reach the page, and a test searches for them. The roster report
  prints "needs attention" and the bench; the starters already live in the lineup table.
- **Failure handling (D4).** Every layer catches any exception, not only a refusal
  (`external_projections.load` raises IndexError and JSONDecodeError on bad pages). Three-site
  status is recorded per week. The haul runs as a child process with a 300-second limit, reached
  through one seam (`build_newsletter.haul`) that tests replace. The installer's proof run waits for
  the task to finish instead of 45 seconds.
- **CBS wrong-week guard (D3).** In any hauled week, a CBS number on a player whose team is on bye
  means CBS served another week: that week's CBS column is dropped and the paper says so.
- **The end of the season (D1, D3).** The last week is `trade_eval.playoff_weeks(league)[-1]` (17),
  not 18. With no opponent that week the paper says so. After the last week, or when Sleeper's
  season type is not "regular", it prints standings and nothing that needs a projection.
- **`external_projections.py` is not modified.** The second week costs a second player dump
  (26 seconds in all, measured), the same price `trade_eval.load` already pays.
