# Family Feud

A fantasy football co-pilot for Briggsy's 8-team Sleeper league, **Family Feud** (2026).
Snake draft, 16 rounds, ~Aug 29. Full PPR, 6 of 8 make the playoffs.

**The mission is beating Hunter** — his son, and the league commissioner.

## What's here

| | |
|---|---|
| **A 174-player draft board** | 48 RB · 59 WR · 20 TE · 23 QB · 14 DEF · 10 K — every entry tiered, badged, and carrying empirical VORP |
| **A live draft engine** | reads the cumulative Sleeper picks feed and prints board state, every roster's open needs, run watch, tier cliffs, best-available and VBD leans |
| **A proven executor mode** | Claude drives Briggsy's logged-in Chrome and clicks the picks. Mock #3: 15/15 manual picks, zero clock misses, roster VORP 1225.8 |
| **An hourly data mule** | a Windows scheduled task hauling 5 Sleeper endpoints + 5 fantasy RSS feeds to disk, so nothing depends on a network call at draft time |
| **A draft-state watcher** | the mule's first consumer. Hourly, it notices the moment `start_time` stops being null — or moves — and writes it down, because the date is a handshake that can shift **earlier** |

## Where things are

```
docs/            all prose — start here
  league.md              identity, scoring, roster, playoff format  (verified against the live API)
  data-access.md         endpoints, curl, the mule, credentials policy
  draft-day-runbook.md   THE operating manual. Read before any draft or mock.
  ranking-methodology.md why the board ranks what it ranks
  live-board-plan.md     the next feature: a self-updating wall board
  nightly-feud.md        the newsletter — what works, what has never run
  insights/              hard-won lessons, one per file. Read before debugging
                         something that smells familiar.
  plans/                 implementation plans. The machinery rebuild lives here.

draft-kit/       the draft-day arsenal (run the engine from in here)
  draft_engine.py                    players_data.json
  family-feud-draft-board.html       family-feud-cheat-sheet.pdf
  draft_rankings_data_2026-08-05.json   ⛔ drifted — see TODO, do not carry forward
  normalize.py     the ONE name normalizer. Rules live here as data; norm_spec.json
                   and the board's JS are both generated from it. Never fork it.
  sleeper_ids.json every board row's frozen Sleeper id. Append-only ledger.
  cache/           the pinned /players/nfl dump the ids were resolved against.

newsletter/      The Nightly Feud machinery + the mule
                 data/inbox/   mule cargo (gitignored — a cache, not source)
                 data/state/   watcher baseline + DRAFT_ALERTS.md (gitignored)
scripts/         install-mule.ps1     — registers and verifies the hourly mule
                 install-watcher.ps1  — same, for the draft-state watcher
                 merge_picks.py       — fetches /picks and merges into picks.json;
                                        refuses picks from a different draft
                 watch_draft_state.py — reads mule cargo; writes an alert when the
                                        draft becomes real. Never a notification.
                 resolve_sleeper_ids.py — resolves board rows to Sleeper ids against
                                        the pinned dump. Hard-stops rather than guess.
tests/           168 tests: python -m unittest discover -s tests  (run from the root)
                 fixtures/lab_feed_120.json — the spent lab room's 120 picks
logo/            team art. deez-nuts/ is Briggsy's; hunter-maker/ is Hunter's.
```

## Running the engine

```bash
python3 scripts/merge_picks.py <draft_id>            # from the repo ROOT — refreshes picks.json
cd draft-kit
python3 draft_engine.py <briggsy_slot> [teams=8] [rounds=16] [draft_id]
```

Two directories, deliberately: the merge script runs from the repo root, the engine from
`draft-kit/` (it opens `players_data.json`, `picks.json` and an optional `slot_names.json` by
literal name from the current directory). The merge loop and cadence rules are in
[`docs/draft-day-runbook.md`](docs/draft-day-runbook.md); do not improvise them.

**Pass the `draft_id` as argument 4.** It is optional only so the engine still runs without it —
supply it and the engine refuses a `picks.json` belonging to a different draft, which is otherwise
invisible (`picks.json` is gitignored, so `git status` never shows a spent mock sitting there).

**The engine refuses to guess.** It derives board state from `max(pick_no)` and hard-exits on an
interior gap or a duplicate. If it screams, re-fetch and re-merge — never advise off a picks file
it rejected. That gate exists because a single dropped pick silently shifts the clock and leaves
already-drafted players on the available list.

## State of play

**Verified on this machine 2026-08-07:** the engine (all glyphs, exit 0), the board, the mule
(10 sources, 0 failed), curl to Sleeper.

**Proven, but not since the migration:** executor mode. Its evidence is Mock #3 on Aug 6, run
under Cowork — 15/15 manual picks, zero clock misses. The browser-driving half has **not** been
exercised in this environment. Treat it as unproven here until a mock says otherwise.

**Not working:** The Nightly Feud's build half has never run once — see
[`docs/nightly-feud.md`](docs/nightly-feud.md). The live auto-updating board isn't built yet,
though its blocking unknown is now resolved — see [`docs/live-board-plan.md`](docs/live-board-plan.md).

⚠️ **The board is an August 5 snapshot and it expires.** Ranks, injuries and ADP move daily in
August. It must be rebuilt before the real draft. The reminder that used to exist did not survive
the migration — **`scripts/watch_draft_state.py` replaces it**, and on better terms: the old one
fired on a hardcoded Aug 26, which is the wrong shape for a date that is still null and can move
earlier. The watcher fires on the actual transition. See `TODO.md`.

## History

This project was built in Claude Cowork on Aug 5–6, 2026 and migrated here Aug 7. Several rules
in older docs were Cowork sandbox constraints and are now actively wrong — chiefly "use WebFetch,
curl is proxy-blocked." Here it's the reverse: **curl works, WebFetch is banned.** Where an
obsolete rule was load-bearing, the doc that carried it now says so explicitly rather than
quietly dropping it.
