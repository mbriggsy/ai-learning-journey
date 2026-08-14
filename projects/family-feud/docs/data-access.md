# Data Access

How this project gets Sleeper and news data. **All reads are public and need no auth.**

> **Re-verified 2026-08-07 13:5x from this machine.** `curl` to `api.sleeper.app` returns
> raw JSON, exit 0. This contradicts the Cowork-era instructions that used to live in the
> runbook — see [Cowork rules that are now wrong](#cowork-rules-that-are-now-wrong).

## Use curl. Never WebFetch.

```bash
curl -sL --max-time 15 "https://api.sleeper.app/v1/state/nfl"
```

`--max-time` is not optional. **WebFetch has no timeout and hangs agents indefinitely** — it is
banned globally, a PreToolUse hook blocks it, and it must not appear in agent prompts either.
When curl won't do (a bot-walled site), use the `gemini-grounding` MCP tools.

## Endpoints

**League** `https://api.sleeper.app/v1/league/1390509993844809728`
&nbsp;&nbsp;+ `/users` · `/rosters` · `/matchups/<week>` · `/transactions/<round>`

**Draft** `https://api.sleeper.app/v1/draft/1390509994847240192`
&nbsp;&nbsp;+ `/picks` (cumulative; carries player name metadata) · `/traded_picks`

**Trending** `https://api.sleeper.app/v1/players/nfl/trending/add` (and `/drop`)
&nbsp;&nbsp;Accepts `?lookback_hours=24&limit=25`.

**Current week** `https://api.sleeper.app/v1/state/nfl`

**Mock drafts Briggsy created** `https://api.sleeper.app/v1/user/1390750540631150592/drafts/nfl/2026`
&nbsp;&nbsp;Public mock lobbies may never appear here. If nothing shows, the draft room URL
&nbsp;&nbsp;(`sleeper.com/draft/nfl/<draft_id>`) carries the id.

**Player id → name map** (not Sleeper)
`https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv` — `sleeper_id` column.
nflverse GitHub releases carry stats, injuries and depth charts; both hosts are reachable.

## The mule: data on disk, no network required

`newsletter/feud_mule.ps1` runs hourly under the Windows task **"Family Feud Mule"** and drops
10 sources into `newsletter/data/inbox/` — five Sleeper endpoints plus five fantasy RSS feeds —
and since v2.1 also runs two draft-kit fetchers (`consensus.py`, `market.py`) that write to
`draft-kit/cache/` instead. **12 entries in `mule_status.json`; only 10 of them land in the inbox.**

**Every payload is validated before it is allowed to land** *(changed 2026-08-08, U10)* — HTTP
status, content-type, that it parses, and that a feed actually carries `<item>`/`<entry>` elements.
`scripts/validate_cargo.py` owns that judgment. The old check was `size > 50 bytes`, which an
793 KB HTML error page passes comfortably, and did, hourly, for days.

**A failed source keeps the previous cargo.** Fetches land on `<name>.incoming` and are promoted
only on a pass, so a bad response can no longer destroy good data — and the failure line records
**how old what remains now is**, because "this source failed" and "you are reading day-old data"
are different facts. `mule_status.json` carries a `validation` field; a status file without one
predates this and its `ok`s mean only that bytes arrived.

**Read the inbox instead of the network** for anything scheduled or unattended. It is at most
an hour stale, it costs nothing, and it cannot fail mid-run. `mule_status.json` records exactly
which sources succeeded on the last haul; dead feeds report `FAIL` and are expected — the
newsletter is built to use whatever arrived.

The inbox is a **cache, not source** — gitignored, overwritten every hour. Never edit it by hand.

**After any move of the project folder, re-register the task:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-mule.ps1
```

That script derives every path from its own location and verifies the run. It exists because
the task stores an absolute path, and the Aug 7 move left it pointing at a deleted file while
still reporting `Last Result: 0` — a dead job is indistinguishable from a healthy one until
you check the cargo timestamp.

## Writes: there is no write API

Sleeper publishes **no official write API.** Lineup, waiver and trade moves happen one of two ways:

1. Give Briggsy the exact taps to make, or
2. Drive his already-logged-in Chrome with the `claude-in-chrome` tools **while he is present**
   (this is executor mode — see [`draft-day-runbook.md`](draft-day-runbook.md)).

**Credentials policy — no exceptions.** Briggsy signs into Sleeper with a passkey on his own
devices. Never ask for, accept, or store his password. Reads need no auth and writes go through
his taps or his own browser session, so there is no scenario where a credential helps. He has
offered before, because he's friendly like that — decline warmly and say why.

## Cowork rules that are now wrong

This project ran in Claude Cowork through Aug 6. Three rules from that era are still quoted in
older docs and are **false in this environment**:

| Cowork-era rule | Reality here |
|---|---|
| "bash curl to api.sleeper.app is proxy-blocked — use WebFetch" | curl works. WebFetch is **banned**. |
| "WebFetch caches 15 min — append `?cb=1`, `?cb=2`" | ⚠️ **HALF-WRONG, AND THE WRONG HALF WAS LOAD-BEARING — corrected 2026-08-14.** The *reason* was wrong (it was never WebFetch's cache) and the *remedy* is mandatory. See below. |
| "Never filter picks with 'greater than N' — use inclusive ranges" | That was prompt-engineering around WebFetch's summarizer model. curl returns raw JSON; filter it in code. |

🚨 **THE CACHE-BUSTER: THE OLD ROW SAID "NO CACHE. `?cb=` IS POINTLESS NOISE." IT IS NOT.**
The cache is **Cloudflare's edge, not curl's and not WebFetch's** — so "curl has no cache" is a true
sentence about the wrong thing, and deleting the nonce on the strength of it removed a real guard.

Measured on this machine 2026-08-14, three consecutive bare fetches of
`/v1/draft/1390509994847240192`:

```
cache-control: public, s-maxage=30, stale-while-revalidate=300, stale-if-error=600
cf-cache-status: EXPIRED  →  HIT  →  HIT
```
The same URL with a **unique** nonce returned `MISS` all three times. `stale-while-revalidate=300`
means the edge may hand you a **five-minute-old** answer, and `/picks` carries the identical policy.

**Append `?cb=<unique nonce>` to every Sleeper read.** The nonce must be unique **per call** — one
fixed at startup is just a second cache key. A `Cache-Control: no-cache` **request** header does
NOT work; Cloudflare ignores it. `merge_picks.picks_url()` and the mule's `Fetch-Source` already
do this; hand-typed curls are the gap.

Why it matters more than it sounds: a stale response is a **contiguous prefix**, so it passes the
gap gate, the duplicate gate, the contamination gate and the engine's integrity gate — every guard
here checks *shape* or *provenance*, and none checks *freshness*. Insight 020 measured the
un-busted URL behind on **76 of 77 observations** of a live draft, by up to 16 picks. And seconds
after START DRAFT the bare URL said `status: pre_draft, draft_order: null` while the busted one
said `drafting, draft_order: {"1390750540631150592": 5}` — same second, opposite answers, **and the
stale one reads exactly like a completed check.**

The **substance** behind the third row still matters too, and survives the environment
change: `/picks` is cumulative, so every fetch must be merged on `pick_no` and never leapfrogged.
The engine hard-fails on gaps. See the runbook's Step 3.
