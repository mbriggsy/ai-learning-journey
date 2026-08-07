# Family Feud — TODO

> **Actionable next-actions only.** No session history, no shipped-work record — `git log` has both.
> Items are **re-ranked every session**, so never cite "item N" anywhere; cite the title.

**Where we are:** the arsenal works and is verified on this machine — engine, board, mule, curl,
executor mode. What's left splits three ways: one item the calendar forces, one thing that was
never actually built, and one feature whose blocking unknown just cleared.

**⏳ The draft is ~Aug 29. That is ~3 weeks out and it does not move.**

---

## 1. Rebuild the board — REQUIRED before the draft, and nothing will remind you

`draft-kit/players_data.json` is an **August 5 snapshot**. Ranks, injuries, depth charts and ADP
move daily through August; by draft day it will be three and a half weeks stale.

A Cowork one-shot trigger used to drop a `REFRESH_BRIEF` on Aug 26 as the starting gun. **It did
not survive the migration and no longer exists.** This TODO is now the only reminder.

**The work:** re-research ranks / injuries / ADP (the eight sources are named in
[`docs/ranking-methodology.md`](docs/ranking-methodology.md) Layer 1), rebuild the board, then
update **every surface in one pass** — it is currently spread across four files:

- `draft-kit/players_data.json` — the board the engine reads
- `draft-kit/draft_rankings_data_2026-08-05.json` — the date-stamped twin (rename to the new date)
- `draft-kit/family-feud-draft-board.html`
- `draft-kit/family-feud-cheat-sheet.pdf`

Keep the method, replace the numbers. VORP baselines (QB12/RB41/WR47/TE12) are league-structural
and only change if the league does. **Re-verify injuries by web search at rebuild time** — a
stale injury note is worse than no note.

*Do this by ~Aug 22 so there's slack for a mock on the new board.*

---

## 2. Build the live auto-updating board — the path is now clear

[`docs/live-board-plan.md`](docs/live-board-plan.md) — the wall display that greys out players as
picks land. **Step zero is cleared as of Aug 7:** Sleeper returns `access-control-allow-origin: *`
for every origin including `null`, and the artifact-CSP gate disappeared with Cowork because the
board is now a local `file://` page. Option A (client-side polling, no backend) is GO.

**Start here:** embed the poll loop in `draft-kit/family-feud-draft-board.html`, porting
`draft_engine.py`'s `norm()` to JS for name matching (diminutive aliases + suffix stripping).
Use plain `fetch(url)` — **never** `credentials: 'include'`, which browsers reject against a
wildcard origin.

**Test feed:** the spent Mock #3 lab room `1390923383440424960` still serves all 120 picks from
`/picks` — a stable, replayable draft that never changes.

---

## 3. The Nightly Feud has never run — build the half that's missing

The mule is green and has been hauling cargo hourly into a consumer **that does not exist.**
Evidence in [`docs/nightly-feud.md`](docs/nightly-feud.md): the newsletter HTML is byte-identical
to the template, both archive folders are empty, and there is no scheduled task for it.

**Build it the same shape as the mule** — a real script on Windows Task Scheduler, registered by a
self-locating installer, never a Claude Desktop trigger. A job that no-ops when an app isn't open
was never scheduled.

- write `scripts/build-newsletter.ps1` (or `.py`) — read `newsletter/data/inbox/`, cross-reference
  `draft-kit/players_data.json`, clone `newsletter/newsletter-template.html`, write
  `newsletter/family-feud-newsletter.html` + a dated copy into `newsletter/archive/`, then move
  consumed cargo to `newsletter/data/archive/<date>/`
- write `scripts/install-newsletter.ps1` mirroring `install-mule.ps1` — derive paths from
  `$PSScriptRoot`, register, force a run, verify, throw if not green
- it must **degrade, not fail**, when a feed is missing — `mule_status.json` says which arrived

*Lower priority than 1 and 2 before the draft; it earns its keep all season after.*

---

## 4. Re-pull the league on draft morning — do not trust anything written down

Only **4 of 8 seats are filled** (verified Aug 7). Four unknown managers will be in that room, and
every "who picks between us / what do they need" read depends on who they are.

On draft morning, before the first advisory, re-pull and confirm:

- `/league/1390509993844809728/users` — who actually joined
- `/draft/1390509994847240192` — **`draft_order` is `null` today.** Briggsy's slot is the engine's
  first argument and is genuinely unknown until near go time. Nothing else can start without it.
- `/draft/.../traded_picks` — returned `[]`; one check covers a *pre-draft* trade
- `metadata.slot_name_<N>` → write `draft-kit/slot_names.json` so the engine names every roster

---

## 5. Confirm the waiver day against a live cycle

`docs/league.md` records `waiver_day_of_week: 2` from the API. The older notes read that as
Wednesday processing with a Tuesday report — **plausible but unconfirmed**, and Sleeper's day
indexing isn't documented in what we pulled. One look during week 1 settles it. Until then the doc
says "unconfirmed" and should keep saying so.

---

## 6. Stand up the in-season cadence (post-draft)

Tuesday waiver report · Thursday and Sunday morning lineup checks · trade evaluation on demand.
The pre-written prompts for these lived in a Cowork project doc that could not be exported —
**they are gone and need writing from scratch.** Same rule as everything else here: real scheduled
scripts reading the mule's cargo, output delivered as files. Never notifications — Anthropic push
and email are broken account-wide.

---

## Landmines to re-read before draft day

They live in [`CLAUDE.md`](CLAUDE.md). The two that will bite hardest under time pressure:

- **A screaming engine means STOP.** Re-fetch, re-merge, rerun. Never advise off a picks file it
  refused — it will name an already-drafted player as THE CALL.
- **`Last Result: 0` on the mule task is not proof of life.** Check the cargo timestamp.
