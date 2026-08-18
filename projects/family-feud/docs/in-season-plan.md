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

## What the mule must haul first

**Three** of these four are not hauled today — ✅ **`/league/<id>/rosters` joined the mule on
2026-08-17**, for a draft-day reason rather than an in-season one: it is how `shape.our_roster_id()`
derives our `roster_id`, which is the currency `/traded_picks` is denominated in.
`newsletter/feud_mule.ps1` carries **14** sources (12 into the inbox, 2 into `draft-kit/cache/`);
the remaining three would make it **17**, and `scripts/validate_cargo.py` already handles the `json`
kind, so the extension is three `Fetch-Source` lines and nothing else.
*(Corrected 2026-08-17: the source count was bumped 12→14 without its two dependent clauses, which
left this paragraph saying rosters was unhauled while the same night's commit hauled it, and
"carries 14 … would make it 14".)*

| Endpoint | Measured 2026-08-08 | Why it is needed |
|---|---|---|
| `/state/nfl` | 200, 207 bytes, `season_type: "pre"`, `week: 1` | **The keystone.** Every other endpoint below is keyed by week, and nothing on disk knows what week it is. Haul this first or the rest cannot be addressed. |
| ✅ `/league/<id>/rosters` | 200, **8 rosters** — hauled hourly since 2026-08-17 | Who owns whom. Already meaningful pre-draft — see the shape note below. **Already live**: `shape.our_roster_id()` reads it to attribute a traded pick. |
| `/league/<id>/matchups/<week>` | 200, **`[]`** | Weekly opponent + what each roster actually started. |
| `/league/<id>/transactions/<week>` | 200, **`[]`** | Waiver claims, free-agent adds, trades. |

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

**Do not build FAAB tooling.** `waiver_budget: 100` is inert while `waiver_type` is `0`.

### 2. The Thursday / Sunday lineup check

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

Four `Fetch-Source` lines in the mule, a validator that already handles them, and a build half that
inherits `build_newsletter.py`'s template extraction, wire matching and `sleeperId` join. The
expensive part is not the code — it is deciding what the report should say, which is why this
document stops here.
