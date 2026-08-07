# THE SLICK IDEA — Live Auto-Updating Big Board
*Idea captured the night of Aug 5→6, 2026 — Briggsy's words: "on the big board, as draft picks are being made it automagically updates. Mind blown, right?" Correct, Briggsy. Mind blown.*

**STATUS (updated Aug 7): Mock #3 PASSED — the executor gate is cleared. Step zero is now also cleared (below). The next session builds the board; there is nothing left to probe first.**

## The sequence
1. ~~Mock #3 first~~ — **✅ PASSED Aug 6, a day ahead of schedule** (executor mode per runbook, now v3.2): 15/15 manual picks, zero clock misses, zero AUTO-PICK flips, roster VORP 1225.8. Full recap in [`draft-day-runbook.md`](draft-day-runbook.md)'s changelog. Pass criteria RETIRED. Note: the lab room `1390923383440424960` is **SPENT** (ran to completion) — any future mock needs a fresh 2-click room (Sleeper remembers settings). The spent room's `/picks` endpoint still serves all 120 picks, which makes it a perfect **static test feed** for the board build.
2. **NEXT SESSION: build the live board** — step zero is the CORS probe.
3. Real draft ~Aug 29 gets both: a lethal executor (proven) AND a self-updating wall display.

## Step zero — CLEARED 2026-08-07, no probe required

The original plan opened with a CORS probe because two gates were unknown. **Both are now
settled, and the migration out of Cowork dissolved one of them outright.**

**Gate 1 — Sleeper's CORS: open.** Verified by reading the response headers directly:

```
$ curl -s -D - -H "Origin: null" "https://api.sleeper.app/v1/state/nfl"
HTTP/1.1 200 OK
access-control-allow-origin: *
access-control-allow-credentials: true
access-control-expose-headers: etag,date
```

`*` for every origin tried, including `null` — which is exactly the Origin a `file://` page
sends. Same header on `/draft/<id>/picks`. A browser can fetch this API from a local page.

*One trap:* `allow-origin: *` together with `allow-credentials: true` is a combination browsers
**reject** for credentialed requests. Plain `fetch(url)` is fine; never add `credentials: 'include'`.

**Gate 2 — the artifact container's CSP: no longer applies.** That gate existed because the board
was a Claude desktop *artifact*, sandboxed. Here the board is a local HTML file opened in Chrome —
the same `file://` pattern as the newsletter bookmark. There is no artifact CSP in the path.

**→ Option A is GO.** Client-side polling, zero backend, genuinely automagic.

## Option A — technical sketch
- Embed JS in `draft-kit/family-feud-draft-board.html`: poll `https://api.sleeper.app/v1/draft/<draft_id>/picks` every 10-15s.
- Name-match picks against board entries via a JS port of draft_engine.py's `norm()` (diminutive aliases, suffix stripping — prefer Sleeper's spelling, e.g. "Kenny Gainwell").
- Grey/strike drafted players, tag with pick# + drafting slot, live-update tier "left" counts, highlight when Briggsy (draft_slot from `draft_order`, user_id `1390750540631150592`) is on the clock or next.
- draft_id input: small text box in the board header (paste any draft URL/id) + hardcoded default = real league draft `1390509994847240192`; remember last-used in a JS variable.
- During development, point it at the spent lab room for a stable 120-pick feed.
- Nice-to-haves if A works: room-speed indicator (avg sec/pick, last 8), run-watch banner ("RB run: 4 of last 6"), audible ding when Briggsy is ≤2 picks out.

## Standing reminders for the build session
- **`draft-kit/family-feud-draft-board.html` on disk is now the ONE board.** The old rule ("update the desktop artifact via update_artifact, don't recreate, keep disk and artifact as twins") is retired — the twin-maintenance problem was a Cowork artifact, literally. A tracked file in git is the single source. If a shareable artifact is ever wanted again, generate it *from* the file.
- Rankings are the **Aug 5 snapshot** — fine for the build and testing; MUST be refreshed before the real draft. The Aug 26 one-shot trigger that was supposed to fire the starting gun **no longer exists** (it died with Cowork). See `TODO.md`.
- War-room scratch (`picks.json`, `new_picks.json`, `slot_names.json`, any merge script) is gitignored — recreate per runbook Step 3. curl returns the full cumulative array, so the Mock #3 leapfrog failure mode is gone; the integrity gate that caught it stays.
- League was **4 of 8** as of the Aug 7 pull: PoppaBriggsy, briggsy007 (Hunter, commish), RMonk9, MattiICE23. Four seats still open — see [`league.md`](league.md). Team name: **Saquon Deez Nuts** (logo in [`../logo/deez-nuts/`](../logo/deez-nuts/)).
- League watch was supposed to ride inside The Nightly Feud. **The Nightly Feud has never run** — see [`nightly-feud.md`](nightly-feud.md) before assuming any of it is live.
