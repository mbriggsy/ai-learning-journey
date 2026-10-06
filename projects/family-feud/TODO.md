# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.
> **The whole draft-era record** (build order, mock campaigns, skill grade, drift scan, draft-night
> handoffs) was pruned 2026-09-27 and lives at commit **`af491a71`** — `git show af491a71:projects/family-feud/TODO.md`.
> Read it before the 2027 draft, not before.

## ▶ START HERE — as of Sun 2026-09-27 ~12:00 ET (week 3, games in progress)

**We are PoppaBriggsy, roster 3, *Saquon Deez Nuts*. `briggsy007` is HUNTER** (CLAUDE.md landmine).

- **Record 1-1** (W vs Hunter 165.92–140.56 · L vs kblizzy23 103.02–151.72). Week 3 vs **Kaeperni**,
  projected 145.3–127.6 at 11:31 with London's 28.4 banked Thursday.
- **Week-3 lineup, API-verified 11:40:** QB Maye · RB Taylor, C. Brown · WR London, **M. Wilson** ·
  TE Fannin · FLEX Stevenson, Swift · K Bates · DEF **SF**. Bench: Goff, Flowers (Q hamstring —
  benched on Yahoo's "trending towards missing… snap count" + a 17.1→14.1 projection cut), Vele,
  Odunze, Hockenson, Collins (**Out**, hamstring). IR: Dell (ACL/MCL). One IR slot open.
- **Moves this week (all `free_agent` complete on `/transactions/3`):** +Goff −Pittman, +Hockenson
  −Pollard (09-23) · +SF DEF −TB DEF, +Michael Wilson −Godwin (09-25).
- **Clocks running, all proven by output freshness:** mule hourly (last cargo 09-27 11:29) ·
  `gameday_check.py` **Sat 20:00 · Sun 08:00 · 11:30 · 15:00** (15:00 added 09-25 for the 4:05/4:25
  inactives) · draft watcher · nightly newsletter 21:45.
- **Suite: 1236 tests, OK (skipped=6)** — five draft-era stand-downs by design + the standing one.
  Ran 2026-09-27. 29 test files · 27 scripts · 33 insights.

## Ranked next

1. **Sun 09-27 15:00 — read the late check before 16:05.** If Flowers is announced a full go at the
   ~14:55 inactives, flipping him back over Wilson is Briggsy's call and must happen before Wilson's
   16:05 kickoff. Default is leave it. Push/email are dead — the check only writes `GAMEDAY.md`.
2. **Trade offer — Briggsy's call, send nothing without his go. Earliest: after MNF 09-28** (we play
   Kaeperni this week; a mid-week trade would reshuffle both lineups).
   Win-win search 2026-09-26 (Sleeper weekly projections wks 4-17 scored with our settings; optimal
   weekly lineup per team; every 1-for-1 and 2-for-1 with all 7 teams; kept only trades both sides
   gain AND the side giving receives ≥90% of raw ROS points; a freed roster spot is filled with the
   best FA). Top three:
   | Offer | us | playoffs | them |
   |---|---|---|---|
   | **Goff + Hockenson → Kaeperni for Kittle** (the recommendation) | +19.0 | +4.0 | +4.1 |
   | Fannin + Swift → RMonk9 for Bowers | +17.3 | +4.1 | +2.9 |
   | Maye + Goff → RMonk9 for Lamar | +17.5 | +6.0 | +3.1 |
   ~1.4 pts/week — real but inside projection noise. **If Goff goes, week 11 needs a FA QB**
   (Shough / Love / Mayfield all ~17 proj and unowned 09-26). No win-win involved Hunter.
   The search script was session scratch and is gone; if trade evaluation becomes a standing tool,
   build it as `scripts/trade_eval.py` from the method above (in-season plan §3 "Trade evaluation,
   on demand" is its home).
3. **Week 4 lineup (vs ? — re-pull `/matchups/4`).** Flowers' hamstring decides WR2 (he projects
   18.7 wk4); Collins projects 18.5 wk4 if activated. Wilson/Vele/Odunze are the WR depth.
4. **Build the Tuesday waiver report** (`docs/in-season-plan.md` §1 — still unbuilt; the gameday
   check is §2 and done). Inputs are all in the inbox (`sleeper_transactions.json`,
   `sleeper_rosters.json`, `sleeper_state.json`, trending add/drop). Waivers clear **Wed ~03:15 ET**,
   measured twice (09-16, 09-23). Read Hunter's transaction log first, every Wednesday.
5. **Fold the in-season browser mechanics into the `sleeper-draft-room` skill** (its self-test is
   draft-room-only, so every roster move re-derives these). Measured and working 2026-09-25:
   - Lineup: `/leagues/<id>/team`; each row's `a.link-button.cell-position` owns `onClick`. Click the
     starter's `<a>`, then the bench player's `<a>`. Scope a row to the smallest ancestor holding
     exactly ONE `.cell-position` — walking up a fixed 4 levels matches the whole list.
   - Add/drop: `/leagues/<id>/players`; the row's `a.player-action-button.add` owns `onClick`
     (`.waiver` instead = a claim, not an instant add); the modal's rows are
     `a.link-button.team-roster-item` (click → `.selected`); then the `<button>` reading `ADD PLAYER`.
     Row text carries newlines — normalise `\s+` before any regex.
   - 🚨 **An added DEF lands on the BENCH and leaves the DEF slot `"0"` (empty).** Always re-read
     `starters` on `/rosters` after an add and move the body in.
   - The league nav tabs are icon-only (no text); navigate by URL (`/team`, `/players`).
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
