# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.
> **The whole draft-era record** (build order, mock campaigns, skill grade, drift scan, draft-night
> handoffs) was pruned 2026-09-27 and lives at commit **`af491a71`** — `git show af491a71:projects/family-feud/TODO.md`.
> Read it before the 2027 draft, not before.

## ▶ START HERE — as of Fri 2026-10-30 (week 8)

**We are PoppaBriggsy, roster 3, *Saquon Deez Nuts*. `briggsy007` is HUNTER** (CLAUDE.md landmine).

- **Record 4-3 (4th)**, after beating Cltchiefs 147.24–98.22 in week 7. **Week 8 is vs HUNTER, Sun 11-01 / Mon 11-02.**
  His McCaffrey, Montgomery and Vele are all on bye. The lineup was set and verified on `/rosters` on 10-27.
- **Added Seth McGowan (RB IND, Taylor's backup) as a free agent and dropped the HOU DEF, 10-28 11:04 ET**, on
  Briggsy's word. Verified: `/rosters` shows him added, HOU gone, starters unchanged; `/transactions/8` shows a
  `free_agent` move, `complete`. SEA is now our only DEF.
  The morning brief (lineup re-checks, the McGowan option, the Kittle trade recommendation) is
  `temp/week8-moves-log.md` (gitignored, local). Weeks 6-7: `temp/week7-moves-log.md`.
- **Kaeperni's offer (A.J. Brown + Tucker Kraft for Zay Flowers) was DECLINED 10-22 ~22:20 ET** on
  Briggsy's word. Verified: the panel read REJECTED, Active Trades was empty, `/rosters` unchanged.
- **`scripts/trade_eval.py` is BUILT, COMMITTED (10-23) and REVIEWED (10-23):** 9 opus lenses, 18
  verifiers, all fixes in (insight 036; the plan's decisions carry each change). Since 10-29 a man cut
  when a trade processes can start for the other side that week (`waiver_clear_days: 1`, measured 10-28),
  and the frozen night reads us −32.83 / −45.76, Kaeperni +38.93 / +50.18. **The fixture
  `tests/fixtures/trade_eval_kaeperni_20261022.json.gz` can never be re-made** — it holds the 10-22
  projections `TestThePublishedNumber` pins. Don't delete or regenerate it.
- **The live Expected header is proven on a real game (10-30):** `TestRealThursdayNight` runs CAR @ GB (TNF wk 8)
  through `projected_total` at pre-game, Q1, halftime (`left` 0.5 from ESPN's own clock) and the final (Sleeper's
  `points` to the cent). **`tests/fixtures/gameday_tnf_wk8.json` and `gameday_espn_status.json`'s `tnf_wk8` are
  one-time captures that can never be re-made.** Don't regenerate them.
- **Suite: 1394 tests, OK (skipped=6)**, run 2026-10-30 with `python -m unittest discover -s tests`.
  31 test files · 29 scripts · 38 insights.
- **Clocks:** mule hourly · `gameday_check.py` Sat 20:00 · Sun 08:00 · 11:30 · 15:00 · draft
  watcher · newsletter 21:45. Push/email are dead, so the files are the delivery.

## Ranked next

1. **Week 8 vs Hunter: the lineup is SET (10-27) and still right as of Fri 10-30 ~4:55 PM ET. No move needed now;
   two calls are left.** Friday's re-check ran six lanes, each re-sourced by an independent verifier (workflow
   `wf_274c3f63-2d9`). Detail is in `temp/week8-moves-log.md`. Three-site consensus (Fri 14:31): us **147.3**, Hunter
   113.9. His DeVonta Smith is OUT (PHI, Fri 3:51 PM) and was still in his lineup at 16:52; Godwin is his only healthy
   bench WR. No free agent beats our bench.
   - **Settled:** London has no designation (absent from all three Falcons reports). Michael Wilson was LP Wed/Thu,
     and LaFleur said Fri he "will play" (Arizona Sports, 2:32 PM); Arizona posts its Friday designation in the
     evening, expect Q. Tate is OUT (bench). Taylor plays with a full workload (Steichen, Fri), and Maye is FP.
   - **Sun ~11:30 AM ET, if Wilson is INACTIVE:** move Flowers FLEX → WR and put **Stevenson** (consensus 12.6) in at
     FLEX. If Stevenson has already replaced Swift, use White (11.1). Make the move before 1:00 PM. The 11:30 gameday
     run names this slide, but it reads Sleeper alone and names White (10.9). Go with the consensus.
   - **Swift vs Stevenson: Chicago's SATURDAY 10-31 report decides.** Monangai was DNP Thu (estimated) and Fri
     (Fishbain, 3:41 PM). The verifier rates him "likely sits": 26 days since the injury with no on-field work.
     Out/Doubtful → keep Swift. Questionable after a Saturday practice → swap Stevenson in before NE's Sun 4:25 PM
     kickoff. NE's TreVeyon Henderson is Q (ankle/illness), which means more work for Stevenson if he sits. Miami has
     an 85% storm chance at 4:25.
   - **Keep the laptop on the charger.** It slept on a dead battery Fri 12:58–14:21 (Kernel-Power: "Sleep Reason:
     Battery"), the same failure that killed week 7's Sunday runs.
   - **Kittle trade: ON HOLD (Briggsy, 10-28: "Let's hold on Kaeperni trade").** Don't re-pitch it unprompted.
     Kaeperni rejected Tate + Goff for Kittle on 10-20. The priced package (Swift + Strange for Kittle) is in
     `temp/week8-moves-log.md` if he reopens it. Trade deadline is week 11.
   - Maye's week-11 bye: we have no backup QB. Stream a free agent, using a bench spot.
2. **Optional: make `--search` fast again without moving a number.** It takes 355-373 s for 2,736
   packages on the frozen night (72 s before swaps repeated) and peaks at **2.7 GB** even with the
   memos emptied per give (measured 10-23; a reviewer measured ~1 GB on the one-swap code). Fine on
   this 32 GB laptop; check it before trusting a smaller one. Profile `Sim.fix`'s swap loop first;
   the suite pins every number, and `TestSearch.test_the_memos_are_emptied...` pins the memo contract.
3. **Build the Tuesday waiver report** (`docs/in-season-plan.md` §1 — still unbuilt; the gameday
   check is §2 and done). Inputs are all in the inbox (`sleeper_transactions.json`,
   `sleeper_rosters.json`, `sleeper_state.json`, trending add/drop). Waivers clear **Wed ~03:15 ET**,
   measured twice (09-16, 09-23). Read Hunter's transaction log first, every Wednesday.
4. **Byes — plan the week before** (re-derived 2026-10-23 from live `/rosters` and Sleeper's weekly
   projections: a team whose DEF row has no opponent is on bye, `trade_eval.bye_teams`' rule.
   Re-derive after any roster move):
   - **Never trade Hunter a RB or any flex body.** The 10-27 trade search left him out on purpose.
   - **Week 9:** Tate. · **Week 10:** Swift. · **Week 12:** nobody.
   - **Week 11 is the big one:** Maye, London, Fannin, Stevenson AND the SEA DEF. There's no backup QB
     on the roster, so stream a QB that week, and a DEF too if SEA is still the starter. Hunter loses
     Stafford and Myers.
   - **Week 13:** Taylor, McGowan, Flowers, Shrader (stream a K). · **Week 14:** M. Wilson.
   - Hunter later: wk 10 D. Smith · wk 13 G. Wilson, B. Allen, BAL DEF · wk 14 McBride, Allgeier.
   - Trade deadline **week 11**. Playoffs 6 of 8, weeks 15-17.
5. **Next August, before the 2027 draft:** the draft-era payloads still owed at the board refresh
   (long-TD curve fold; the Wan'Dale / Michael Wilson board-membership look) and the five draft-era
   tests re-arm on their own (`draft_era_cache_or_skip`, `draft_era_pool_or_skip`). Start from
   `af491a71`'s TODO.
6. **Fix `external_projections.py`: CBS silently serves the CURRENT week for any week 2+ ahead.**
   Found 2026-10-18. `temp/proj_wk8.json` (pulled 10-16, i.e. wk 6 asking for wk 8) has **55**
   players on wk-8 bye teams (HOU/NO/NYG/SF) with a nonzero CBS number — Collins reads CBS 17.98,
   his wk-6 line — so the consensus averages a bye week as ~6 pts. One week ahead is clean (today's
   `proj_wk7.json`: 0 JAX bye rows nonzero). The map-proof gate can't see it: the stat map is right,
   the WEEK is wrong. **Fix in `pull_cbs()` (~line 212):** after the join, take the bye set from
   Sleeper's own projections for that week (team's players all 0 / absent) and REFUSE the CBS column
   if any bye-team player carries CBS points ("CBS served week N, not week W" on the header, CBS
   column blank, `n` drops to 2). Test with the frozen `proj_wk8.json` rows.

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the worked cases.

**trade_eval (review 2026-10-23: deferred on purpose, each measured)**
- **When a dropped player clears waivers is unmeasured.** `waiver_clear_days: 1` says one day, but not whether it
  ends 24 hours after the drop or at the next morning's processing. The two disagree only for a Saturday-night
  drop. trade_eval assumes the drop clears in time to play that week, and prints "⚠ This one processes late" when
  the gap could matter. **To measure:** the next time anyone in the league drops a player on a Saturday evening,
  read his `W` label in the in-app Players tab (league home → Players).
- **Their number is soft, ours is not.** A choice that is a coin flip for one side moves the OTHER
  side's total: Kaeperni's three-site +35.4 to +39.3 across tie rules on the frozen night, ours
  −32.3 to −32.7. `--search` keeps packages where theirs is ≥ 0, so a package near 0 for them can sit
  either side of the line.
- **D1's order:** we fix first, so we can only stream, never roster, a man they drop. A reviewer
  measured reversing the order at ≤ 1.0 on the frozen night (on the PRE-review code, one swap); the
  report now names any free agent both sides wanted.
- **A side may stream back a man it let go** (symmetric; ≤ 0.1 on the frozen night, measured by a
  reviewer on the pre-review code). A locked free
  agent can still be ADDED by the roster fix (number-neutral: he sits out the locked week). Incoming
  bodies are never the ones cut (plan D1).
- **Kicker keys:** if Sleeper ever adds `fgm_60p` beside an inclusive `fgm_50p`, 60+ makes would count
  twice and KICK_BUCKET would not catch it (both keys are scored). Check a kicker row when 60+ appears.

**Tooling on this machine**
- 🚨 **`New-ScheduledTaskTrigger -At` writes StartBoundary in UTC (`…T15:30:00Z`), and Task Scheduler pins a zoned
  boundary to that instant,** so every DST change shifts the run an hour on the clock. Found 10-30: Sunday's game-day
  runs were set for 07:00 / 10:30 / 14:00 after the fall-back. `install-gameday.ps1` and `install-newsletter.ps1` now
  write the clock time with no zone and match it on read-back. **Never strip the cmdlet's `Z`:** that turned 20:00 EDT
  into a midnight trigger, and a "no zone" check passed it. The mule and watcher are still pinned, which is harmless
  hourly. `Get-ScheduledTaskInfo` shows only the NEXT run. To see a run past a DST change, register a one-trigger
  probe task (start date moved past the change) and read its `NextRunTime`.
- **`grep -c $'\r$'` lies in Git Bash:** it printed the full line count for an LF file and 0 for a
  CRLF one (10-23). Count line endings with Python (`b.count(b'\r\n')`) or `file`. Every file in
  this project is LF in git.
- **A mutant harness needs four things or its kills mean nothing:** run the baseline FIRST and refuse
  unless it is clean; give every mutant its own file and `sys.dont_write_bytecode = True` (same-size
  mutants written in one second share a `.pyc` stamp); reload `trade_eval_net` with the modules it
  patches; block the network. The review's harness broke the first two (insight 036).

**In-season**
- 🚨 **Waiver claims on the website work ONLY when `/players` is reached in-app** (league home →
  Players tab): the row then reads `.waiver` / `W Wed`. A typed `/players` URL hides waivers, shows
  ADD, and the server refuses (`docs/insights/034`; the `sleeper-draft-room` skill has the path).
- 🚨 **The late window is the dangerous one.** A 4:05/4:25 inactive posts ~2:35/2:55 ET, after every
  morning check. The 15:00 run covers it only if someone reads `GAMEDAY.md` — nothing pushes.
- 🚨 **A Sleeper projection drop on game morning is news, not noise.** Flowers 17.1→14.1 between
  08:00 and 11:30 on 09-27 was the only signal before the analysts' "snap count" line surfaced.
  Read the RSS items (`newsletter/data/inbox/rss_*.xml`) with their pubDates before trusting a tag.
- **Two sources that seem to disagree may not.** "Isn't practicing" (Thu) and "individual drills"
  (Fri) are the same limited player — individual drills are not team practice.
- **The day Houston activates Dell, Sleeper pulls his IR tag and FREEZES the roster** until a spot is
  cleared. Clear one first.
- **A minimized Chrome window reports a 0×0 viewport** and Sleeper's virtualized grid renders no rows —
  every search reads "no match". Close the tab so the extension opens a fresh window.
- **The mule misses runs while the laptop sleeps** (6.7 h stale 09-26 09:09, self-recovered). A stale
  alert in `DRAFT_ALERTS.md` means "no new data", not "nothing happened".
- 🚨 **A dead battery skips game day silently.** 10-24: unplugged 22:49, critical battery 00:19, asleep until Mon 07:39.
  All three Sunday `gameday_check` runs never fired, and `GAMEDAY.md` simply has no Sunday entry. Each scheduled task
  still showed `Last Result: 0`. The diagnosis is the Kernel-Power events in the System log. Keep the laptop on the
  charger Sat–Mon.

**Draft-night (carried for 2027)**
- `ffQueueSync {rebuild:true}` and any bridge call over ~3 DOM ops **timed out the CDP evaluate at
  45s** four times in a live 8-human room; once it left the queue EMPTY. **2 ops per call, read the
  queue back in the same call.**
- Sleeper's room strips name suffixes (`Kenneth Walker`, `Luther Burden`, `Harold Fannin`,
  `Marvin Harrison`, `Michael Pittman`, `Kenny Gainwell`) — every `III`/`Jr.` board name misses.

**Engineering**
- 🚨 **A TEST CAN ASSERT THE HOLE, AND ITS DOCSTRING CAN ARGUE FOR IT.**
  `test_no_cargo_at_all_still_writes_the_live_ladder` pinned a MOCK ladder with no cargo going to
  the LIVE `ladder.json` under a docstring about *preventing* overwrites. When a test blocks a safety
  fix, read what it was DEFENDING before deleting or obeying it (the answer was `ladder.unarmed.json`).
- 🚨 **A function's tests say nothing about its CALL SITE** (insight 013, four times in one night).
  Mutate the call site. A default argument that captures a path binds at import time and makes
  `main()` untestable — resolve paths at call time.
- 🚨 **A rewrite that "just cleans up the wording" can smuggle in a judgment change.** Never re-grade
  a player while editing prose; `rank changed: 0 · vorp changed: 0` is the copy-edit receipt.
- ⚠️ **Two scripts sharing a flag name can mean opposite things** (`--cargo` was a FILE in
  `run_engine.py`, a DIR in `precompute_ladder.py`; both accept either now).
- 🚨 **A scripted edit rewrites the whole file's line endings, and the suite cannot see it.**
  `core.autocrlf=false`; Python text mode writes `\r\n`, `sed -i` writes `\n`. Use `newline=""` or
  binary writes and ALWAYS `git diff --stat` before staging. `tests/test_engine_matching.py` is
  already CRLF — leave it.
- ⚠️ **A stat updated mid-session is stale by the commit.** Update counts as the LAST edit.
- ⚠️ **Review/mutation fleets leave war-room scratch** (29 dead-lab picks in `draft-kit/picks.json`
  once). Sweep `draft-kit/picks.json` and `newsletter/data/state/` after any fan-out; the tell is an
  extra skip in the suite.
- ⚠️ **Never rename `newsletter/data/inbox/` or `draft-kit/cache/` to simulate a clean clone** — the
  hourly mule recreates them mid-rename. Copy the repo to a temp dir instead.
- ⚠️ **`meta.updated` is input freshness, not a build clock** — never put `today` back in its floors;
  `meta.build` owns when. `test_an_unchanged_rebuild_is_byte_stable` goes red at 00:00 if it drifts.
- **A screaming engine means STOP** — re-fetch, re-merge, rerun; never advise off a refused
  `picks.json`. **A silent engine can also be wrong** — a spent mock's gitignored picks are invisible.
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns` and `N/N ok` all lie; only the
  cargo timestamp in `mule_status.json` proves life ([007](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md)).
- **A foreign source's parameter can be decorative** (FFC echoes `teams=8` and returns byte-identical
  ADP to `teams=12`). Diff two settings before building on one.
- **`normalize.norm` strips digits** — `P1..P40` fixtures collapse to one key. Use alphabetic names.
- **JAC/JAX recurs at every new foreign boundary** — a foreign source needs an adapter
  (`rerank.FOREIGN_TEAM_ALIASES`).
- **`rss_nbc_edge` was never a feed** (retired 2026-08-08; ProFootballTalk replaced it). Do not restore it.
