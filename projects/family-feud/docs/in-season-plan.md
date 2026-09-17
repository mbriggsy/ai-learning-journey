# The In-Season Cadence

**Status: STUB, deliberately.** This records the *shape* of the three in-season deliverables and
the data they need. It does not design them, because the data they run on does not exist yet and a
design written against imagined payloads is a design that gets thrown away. Everything below marked
**measured** was pulled live on 2026-08-08; everything marked **open** is genuinely unsettled and
must not be guessed at under time pressure.

The draft is the event this repo was built for. This is what it does afterwards.

## The un-stub trigger

`https://api.sleeper.app/v1/state/nfl` flips `season_type` from `"pre"` to `"regular"`.

**Measured 2026-08-08:** `{"week": 1, "leg": 0, "season": "2026", "season_type": "pre",
"season_start_date": "2026-08-06", "display_week": 1}` — 207 bytes, HTTP 200.

Nothing here is worth building before that flip, and the first deliverable that becomes real is the
waiver report, which needs one completed week of transactions behind it.

**✅ FIRED. Measured 2026-09-17 15:19 ET:** `{"week": 2, "season_type": "regular", "season": "2026",
"leg": 2, "season_start_date": "2026-09-09", "display_week": 2, "season_has_scores": true}`. Week 1
is complete (24 transactions on `/transactions/1`, 6 on `/2`), so the waiver report has its data.
The two draft-era fetchers the mule still runs hourly (`consensus`, `market_adp`) now refuse on
every run because their sources moved to in-season pages — correctly, but insight 009 says a gate
that cries wolf gets switched off; hauling `/state/nfl` first and standing them down on
`season_type` is step one of the build, not a separate chore. The five suite tests that ran those
instruments against the real caches are draft-era and skip with a printed reason (`TODO.md`,
"SUITE GREEN AGAIN 2026-09-17").

## What the mule must haul first

✅ **ALL FOUR HAULED as of 2026-09-17.** `/rosters` joined on 2026-08-17 for a draft-day reason
(it is how `shape.our_roster_id()` derives our `roster_id`); the other three joined on 2026-09-17
when the trigger fired. `newsletter/feud_mule.ps1` carries **17** sources (15 into the inbox, 2 into
`draft-kit/cache/`). It was exactly the three `Fetch-Source` lines this paragraph predicted, plus
eleven lines of PowerShell to read the week out of the state cargo — `/state/nfl` is fetched FIRST
and `/matchups/$week` and `/transactions/$week` are addressed from whatever state file is on disk
(this hour's, or the kept copy if the fetch failed; no state at all is recorded as a failure per
endpoint, never guessed). Measured on the first run: state 211 bytes / 10 keys, matchups 8 entries,
transactions 6 entries, week 2. The two draft-era fetchers read the same cargo through
`consensus.season_stand_down` and answer `ok (stood down: season_type=regular, week 2; …)` without
touching the network or their caches.
*(Corrected 2026-08-17: the source count was bumped 12→14 without its two dependent clauses, which
left this paragraph saying rosters was unhauled while the same night's commit hauled it, and
"carries 14 … would make it 14".)*

| Endpoint | Measured 2026-08-08 | Why it is needed |
|---|---|---|
| ✅ `/state/nfl` | 200, 207 bytes, `season_type: "pre"`, `week: 1` — hauled hourly since 2026-09-17, FIRST | **The keystone.** Every other endpoint below is keyed by week, and nothing on disk knows what week it is. Haul this first or the rest cannot be addressed. |
| ✅ `/league/<id>/rosters` | 200, **8 rosters** — hauled hourly since 2026-08-17 | Who owns whom. Already meaningful pre-draft — see the shape note below. **Already live**: `shape.our_roster_id()` reads it to attribute a traded pick. |
| ✅ `/league/<id>/matchups/<week>` | 200, **`[]`** — hauled hourly since 2026-09-17 (`sleeper_matchups.json`, the current week) | Weekly opponent + what each roster actually started. |
| ✅ `/league/<id>/transactions/<week>` | 200, **`[]`** — hauled hourly since 2026-09-17 (`sleeper_transactions.json`, the current week) | Waiver claims, free-agent adds, trades. |

**The roster payload's shape, measured rather than assumed** (roster 1, today):
`players: []`, `reserve: []`, `taxi: []`, `keepers: []`, `starters: ["0","0","0","0","0","0","0","0","0","0"]`,
`settings: {waiver_position: 12, total_moves: 0, waiver_budget_used: 0, fpts: 0, ...}`.

- **`starters` is positional, ten slots, in roster order** — `QB/2RB/2WR/TE/2FLEX/K/DEF` is ten.
  A `"0"` is an empty slot, not a player id. That is what an undrafted roster looks like.
- **`owner_id` is `null` on 2 of the 8**, which is the same two empty seats the draft object shows.
  Rosters exist before owners do; do not treat a roster's existence as a filled seat.

## ⚠️ An empty payload is VALID here, and that cuts both ways

**Measured:** `validate_cargo.py <file> json` returns `ok (2 bytes, 0 entries)` and exit 0 on `[]`,
and `FAIL: JSON parsed but is null` with exit 1 on `null`.

That is the right behaviour. `[]` is the *truthful* answer from `matchups` and `transactions`
before the season and on a quiet week, and the RSS sources — which do gate on item count — are a
different case because a feed with zero `<item>` elements is broken by definition.

**So do not "harden" the JSON sources by requiring `entries > 0`.** It would turn the mule red every
day of the pre-season and every quiet Tuesday, which is insight 009's false red: a gate that cries
wolf is a gate that gets switched off. The consequence to hold in your head instead: **for these two
sources, empty and broken look identical**, so the only real health signal remains the one it has
always been — the cargo timestamp in `mule_status.json` ([insight 007](insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md)).

## The three deliverables

### 1. The Tuesday waiver report

**Answers:** who got dropped that we want, who on our roster is now droppable, and where our
rolling-priority position sits.

**Inputs:** `transactions/<week>` (new), `rosters` (new), `state/nfl` (new), plus
`sleeper_trending_add`/`_drop` and the wire — both already hauled — and the board's `vorp`.

**⚠️ The day is OPEN, and the closed plan asserts otherwise.** The plan's U13 entry says to record
"the confirmed waiver timing." It is not confirmed. Measured today: `waiver_type: 0` (rolling
priority, **not** FAAB), `waiver_day_of_week: 2`, `waiver_clear_days: 1`. The Wednesday ~03:10 ET
reading comes from a 2025-history check recorded in [`league.md`](league.md) **as a citation, not as
something reproducible** — the league object carries no `previous_league_id` (re-confirmed
2026-08-08), so there is no route to re-derive it from current cargo. And a clearing time observed
in history still does not tell you how Sleeper *labels* the integer `2`.

**Do not hardcode a day.** Watch the first live cycle, write down what you saw, and cite the
observation. A closed plan's decisions bind; its facts expire ([insight 012](insights/012-the-closed-plans-remedy-would-have-reintroduced-the-plans-own-disease.md)).

✅ **OBSERVED — the first live cycle, read off `/transactions/1` on 2026-09-17:** all sixteen
week-1 waiver claims, created between Mon 2026-09-14 06:43 and Tue 2026-09-15 21:10 ET, carry the
same `status_updated` of **Wed 2026-09-16 03:15:40 ET** — one clearing instant, not a rolling
window. That matches the 2025-history citation in `league.md` (~03:10) to within five minutes and
is now a measurement. Six claims completed, ten failed; ours: Vele completed (`seq` 1), the Coker
claim failed to MattiICE23. `daily_waivers: 0`. So the report's deadline is **Tuesday night**, and
the read that matters is **Wednesday morning** after 03:15 — still cite this paragraph, not a
hardcoded hour, and re-check the instant on the next cycle before scheduling anything against it.

**Do not build FAAB tooling.** `waiver_budget: 100` is inert while `waiver_type` is `0`.

### 2. The Thursday / Sunday lineup check — ✅ BUILT 2026-09-12 (`scripts/gameday_check.py`)

**Built the first Saturday of the season, after week 1 proved the need:** Stevenson banked 14.5 on
the bench while Swift started at 13.5 projected, and nobody was in the room. The check runs on a
clock (`install-gameday.ps1`: Sat 20:00, Sun 08:00, Sun 11:30) and appends to
`newsletter/data/state/GAMEDAY.md`. **The projection trap below is resolved:** Sleeper's own
`/projections/nfl/<season>/<week>` is hauled live and scored with the league's `scoring_settings`;
`vorp_curve.json` is not touched. The check names the move and never sets a slot. What is still
open from the original shape is below, unchanged.

**Answers:** is anyone in my starting ten out, doubtful or on bye, and is a bench player the better
start this week.

**Inputs:** `rosters` (`starters` vs `players`), `matchups/<week>`, the wire (already hauled).

**⚠️ The projection source does not exist, and the nearest thing to hand is a trap.**
`draft-kit/vorp_curve.json` is a **pre-season rank→points lookup over full seasons 2022-2025**. It
answers "what is a WR27 worth over a season," which is the wrong question for "should I start him
Sunday." Reusing it for a weekly start/sit would produce a confident number with no weekly
information in it at all. Either haul a real weekly projection source or have the check report
availability only and say plainly that it is not ranking anyone.

### 3. Trade evaluation, on demand

**Answers:** does this offer help us, given both rosters and what the board thinks of the players.

**Inputs:** `rosters` (new), the board's `vorp`/`tier`.

**On demand means not scheduled** — a command, like the engine. Do not register a task for it.

**Measured:** `disable_trades: 0`, `trade_review_days: 1`, **`trade_deadline: 11`**,
`playoff_week_start: 15`, `playoff_teams: 6` — so there are three weeks between the deadline and the
playoffs in which a trade tool is worth nothing.

**⚠️ Same VORP caveat as above, for a different reason.** VORP is a full-season value computed
before a snap was played. By week 8 it describes a season that is half spent. A trade tool that
quotes it without saying so is quoting a pre-season opinion as a mid-season fact.

## What NOT to build

- **No in-draft pick trading.** [`league.md`](league.md) settles this: `pick_trading: 1` is a
  league setting about *pre-draft* trades, and `/traded_picks` returned `[]`. One draft-morning
  check covers it.
- **No FAAB anything.** See above.
- **No second scheduled task per deliverable.** The *Family Feud Newsletter* task already runs
  nightly at 21:45 and the mule hourly at :29. A weekly report is a branch inside an existing job,
  not a fourth entry in Task Scheduler — every breakage this project has had was a scheduled task
  with a path in it.
- **No new normalizer, no new id map, no fourth glyph table.** They share U11's and U6's
  machinery. Building the newsletter first is what makes these cheap.

## Cost when it un-stubs

*(The mule half was paid 2026-09-17 — three `Fetch-Source` lines and a week read, exactly as
estimated. What remains is the build half below.)* Four `Fetch-Source` lines in the mule, a validator
that already handles them, and a build half that
inherits `build_newsletter.py`'s template extraction, wire matching and `sleeperId` join. The
expensive part is not the code — it is deciding what the report should say, which is why this
document stops here.
