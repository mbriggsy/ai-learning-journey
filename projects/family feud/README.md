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

## Where things are

```
docs/            all prose — start here
  league.md              identity, scoring, roster, playoff format  (verified against the live API)
  data-access.md         endpoints, curl, the mule, credentials policy
  draft-day-runbook.md   THE operating manual. Read before any draft or mock.
  ranking-methodology.md why the board ranks what it ranks
  live-board-plan.md     the next feature: a self-updating wall board
  nightly-feud.md        the newsletter — what works, what has never run

draft-kit/       the draft-day arsenal (run the engine from in here)
  draft_engine.py                    players_data.json
  family-feud-draft-board.html       family-feud-cheat-sheet.pdf
  draft_rankings_data_2026-08-05.json

newsletter/      The Nightly Feud machinery + the mule
scripts/         install-mule.ps1 — registers and verifies the hourly task
logo/            team art. deez-nuts/ is Briggsy's; hunter-maker/ is Hunter's.
```

## Running the engine

```bash
cd draft-kit
python3 draft_engine.py <briggsy_slot> [teams=8] [rounds=16]
```

It reads `players_data.json` plus a `picks.json` you maintain during the draft (and an optional
`slot_names.json`), all by literal name **from the current directory** — so run it from inside
`draft-kit/`. The merge loop and cadence rules are in
[`docs/draft-day-runbook.md`](docs/draft-day-runbook.md); do not improvise them.

**The engine refuses to guess.** It derives board state from `max(pick_no)` and hard-exits on an
interior gap or a duplicate. If it screams, re-fetch and re-merge — never advise off a picks file
it rejected. That gate exists because a single dropped pick silently shifts the clock and leaves
already-drafted players on the available list.

## State of play

**Working, verified 2026-08-07:** the engine (all glyphs, exit 0), the board, the mule
(10 sources, 0 failed), curl to Sleeper, executor mode.

**Not working:** The Nightly Feud's build half has never run once — see
[`docs/nightly-feud.md`](docs/nightly-feud.md). The live auto-updating board isn't built yet,
though its blocking unknown is now resolved — see [`docs/live-board-plan.md`](docs/live-board-plan.md).

⚠️ **The board is an August 5 snapshot and it expires.** Ranks, injuries and ADP move daily in
August. It must be rebuilt before the real draft, and the reminder that used to exist did not
survive the migration. See `TODO.md`.

## History

This project was built in Claude Cowork on Aug 5–6, 2026 and migrated here Aug 7. Several rules
in older docs were Cowork sandbox constraints and are now actively wrong — chiefly "use WebFetch,
curl is proxy-blocked." Here it's the reverse: **curl works, WebFetch is banned.** Where an
obsolete rule was load-bearing, the doc that carried it now says so explicitly rather than
quietly dropping it.
