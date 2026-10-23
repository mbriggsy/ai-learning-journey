# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.
> **The whole draft-era record** (build order, mock campaigns, skill grade, drift scan, draft-night
> handoffs) was pruned 2026-09-27 and lives at commit **`af491a71`** — `git show af491a71:projects/family-feud/TODO.md`.
> Read it before the 2027 draft, not before.

## ▶ START HERE — as of Thu 2026-10-22 ~23:30 ET (week 7, TNF NE @ CHI just played)

**We are PoppaBriggsy, roster 3, *Saquon Deez Nuts*. `briggsy007` is HUNTER** (CLAUDE.md landmine).

- **Record 3-3 (4th).** Week 7 vs Cltchiefs; **week 8 vs HUNTER** (his RBs McCaffrey + Montgomery are
  both on bye). Moves log for weeks 6-7: `temp/week7-moves-log.md` (gitignored, local).
- **Kaeperni's offer (A.J. Brown + Tucker Kraft for Zay Flowers) was DECLINED 10-22 ~22:20 ET** on
  Briggsy's word. Verified: the panel read REJECTED, Active Trades was empty, `/rosters` unchanged.
- **`scripts/trade_eval.py` is BUILT but UNCOMMITTED. It is waiting on Briggsy's yes** (squeaky could not prove
  these files are the session's own: they were edited through shell scripts, so they read as contested/foreign).
- **Suite: 1298 tests, OK (skipped=6)**, run 2026-10-22 with `python -m unittest discover -s tests`.
  31 test files · 29 scripts · 35 insights.
- **Clocks:** mule hourly · `gameday_check.py` Sat 20:00 · Sun 08:00 · 11:30 · 15:00 · draft
  watcher · newsletter 21:45. Push/email are dead, so the files are the delivery.

## Ranked next

1. **Commit the trade_eval bundle, on Briggsy's yes (one commit).**
   - **Contested** (`--include` them in squeaky step 6):
     - `scripts/trade_eval.py`
     - `tests/test_trade_eval.py`
     - `tests/test_gameday_check.py`
     - `README.md`
   - **Foreign**, because a script wrote it (it needs a plain `git add` on his yes):
     `tests/fixtures/trade_eval_kaeperni_20261022.json.gz`. **This file can never be re-made:**
     it holds tonight's projections. Don't delete it.
   - **Mine, held back so the feature lands whole:**
     - `scripts/gameday_check.py` (the kicker-key fix)
     - `CLAUDE.md`
     - `docs/in-season-plan.md`
     - `docs/insights/035-…md`
     - `docs/plans/2026-10-22-001-feat-trade-eval-plan.md`
     - `tests/trade_eval_net.py`
   - **Before committing:** rerun `python -m unittest tests.test_trade_eval tests.test_gameday_check`.
     It should report 45 + kicker tests OK.
2. **OWED: the whole-file ultramode review of `scripts/trade_eval.py`** (the `ultramode-code-review`
   skill). It was skipped: the context window was past 50%, so no fan-outs were allowed.
   - **Done already:**
     - a whole-plan check (Workflow wf_68e18b45-54d, 3 opus lenses, all fixes folded in);
     - 45 tests;
     - **38/38 mutants killed** (scratch `mutants.py`, one per axis);
     - a live run against today's data;
     - a check that the trimmed fixture gives output identical to the untrimmed payloads.
   - **Review focus:**
     - D1's sequential roster fix: we decide first, from a pool that doesn't yet see their adds;
     - the IR-return shed: it lets the shedding side stream its own shed player back;
     - `--search` runtime, about 2.5 min for 2,736 packages.
3. **Week 8 lineup vs Hunter (by Sun 10-25):**
   - Strange at TE (Fannin back on the bench);
   - Wilson for Collins (HOU bye);
   - SEA for HOU at DEF.

   Run `scripts/external_projections.py --week 8` first, then `trade_eval.py` if a trade comes up.
   Maye's week-11 bye: we have no backup QB. Stream a free agent, using a bench spot.
3. **Week 4 lineup (vs ? — re-pull `/matchups/4`).** Flowers' hamstring decides WR2 (he projects
   18.7 wk4); Collins projects 18.5 wk4 if activated. Wilson/Vele/Odunze are the WR depth.
4. **Build the Tuesday waiver report** (`docs/in-season-plan.md` §1 — still unbuilt; the gameday
   check is §2 and done). Inputs are all in the inbox (`sleeper_transactions.json`,
   `sleeper_rosters.json`, `sleeper_state.json`, trending add/drop). Waivers clear **Wed ~03:15 ET**,
   measured twice (09-16, 09-23). Read Hunter's transaction log first, every Wednesday.
5. ~~**Fold the in-season browser mechanics into the `sleeper-draft-room` skill**~~ — **DONE 2026-10-06.**
   The skill now has an *In season* section (lineup swap, FA add/drop, the DEF-lands-on-bench landmine)
   and its own read-only `/team` self-test (PASSED live, 18 rows). 🚨 **Waiver claims work on the
   website ONLY when `/players` is reached in-app** (league home → Players tab): the row then reads
   `.waiver` / `W Wed` and the card `W (Wed)`. A typed `/players` URL hides waivers, shows ADD, and the
   server refuses (`docs/insights/034`). The 09-25 `.waiver` note was right.
6. **Byes — plan the week before** (derived 2026-09-27 from zero-point weeks in Sleeper's wk4-14
   projections; a bye shows as a 0.0 entry, not a missing one):
   - **Week 6:** C. Brown, Bates, Goff, Hockenson — stream a K; RB depth is zero on the bench.
   - **Week 5 — Hunter's QB hole:** Mahomes AND Kelce bye, and his QB2 Daniels is Out (dislocated
     elbow). He must add a QB that week; watch his Wednesday log (week 5 waivers clear Wed 10-07).
   - **Week 8 vs HUNTER:** his worst week (McCaffrey + Montgomery — now HOU — both bye). **Never trade
     him a RB or any week-8 flex body.** Ours that week: Collins, Vele, SF DEF — stream a DEF.
   - **Week 10:** Swift, Odunze. · **Week 11:** Maye, London, Fannin, Stevenson (Goff + Hockenson
     are the cover — a Kittle trade moves that cover). · **Week 13:** Taylor, Flowers. ·
     **Week 14:** Wilson.
   - Trade deadline **week 11**. Playoffs 6 of 8, weeks 15-17.
7. **Next August, before the 2027 draft:** the draft-era payloads still owed at the board refresh
   (long-TD curve fold; the Wan'Dale / Michael Wilson board-membership look) and the five draft-era
   tests re-arm on their own (`draft_era_cache_or_skip`, `draft_era_pool_or_skip`). Start from
   `af491a71`'s TODO.
8. **Fix `gameday_check.py`'s "Expected" header — it ignores live points for any game played TODAY**
   (found 2026-10-18 wk 6). `projected_total()` (~line 364) banks a starter's live points only when
   his game date is `< today`; a game that kicked off today is still scored at its PRE-GAME
   projection. Wk 6 11:00: the header read us 146.5 / them 121.6 while their Tuten (London 9:30)
   already had 19.0 against a 13.2 projection — live-adjusted it was ~141 / ~133. The 15:00 run is
   worst: every 1:00 game is near-final and still projected. **Fix:** pass the kickoff map
   `pull_kickoffs()` already returns (+ ESPN's per-event `status`) into `projected_total`; kickoff
   passed + game final → live `players_points`; in progress → live + projection × fraction of game
   remaining (ESPN `status.period`/`clock`); not started → projection. No kickoff map (ESPN down) →
   keep today's rule and say so on the header line, as the ↑ line already does. Unit-test with a
   frozen wk-6 payload (Tuten 19.0 at half). Do it OFF game day — never edit a script a scheduled
   game-day run imports between Sat 20:00 and the Sun 15:00 run.
9. **Fix `external_projections.py`: CBS silently serves the CURRENT week for any week 2+ ahead.**
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

**In-season**
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
