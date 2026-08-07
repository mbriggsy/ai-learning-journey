# Family Feud — TODO

> **Actionable next-actions only.** No session history, no shipped-work record — `git log` has both.
> Items are **re-ranked every session**, so never cite "item N" anywhere; cite the title.

**Where we are:** the arsenal works and is verified on this machine — engine, board, mule, curl,
merge script. **Executor mode is the exception**: its only evidence is Mock #3 on Aug 6 under
Cowork, and the browser-driving half has not run in this environment. What's left splits three
ways: one item the calendar forces, one thing that was never actually built, and one feature whose
blocking unknown just cleared.

**⏳ The draft date does not exist yet.** `start_time` is `null` on the draft object and Sleeper's
own UI reads "Draft time has not yet set" (both verified Aug 7). `~Aug 29` is a handshake, not an
API fact — **it can move earlier.** Nothing here should assume three weeks of slack. The
draft-state watcher in the rebuild plan exists precisely because this date has no source.

---

## 1. Rebuild the board — REQUIRED before the draft, and nothing will remind you

`draft-kit/players_data.json` is an **August 5 snapshot**. Ranks, injuries, depth charts and ADP
move daily through August; by draft day it will be three and a half weeks stale.

A Cowork one-shot trigger used to drop a `REFRESH_BRIEF` on Aug 26 as the starting gun. **It did
not survive the migration and no longer exists.** This TODO is now the only reminder.

**The work:** re-research ranks / injuries / ADP (the eight sources are named in
[`docs/ranking-methodology.md`](docs/ranking-methodology.md) Layer 1), rebuild the board, then
update **every surface in one pass** — it is currently spread across four files:

- `draft-kit/players_data.json` — the board the engine reads. **The only correct surface.**
- `draft-kit/draft_rankings_data_2026-08-05.json` — ⛔ **DO NOT RENAME THIS FORWARD.** It is not a
  twin. It forked on Aug 7 and still carries all three bugs that audit fixed: `dst[6]` Jaguars
  (board says Vikings), `dst[8]` Vikings (board says Steelers), and `strategy.kickers` still reads
  "No kicker board needed in August". It has **zero readers**. Renaming it resurrects three fixed
  draft-day bugs.
- `draft-kit/family-feud-draft-board.html` — carries a full duplicate of the board at line 200
- `draft-kit/family-feud-cheat-sheet.pdf` — ⛔ **WRONG TODAY, not merely stale.** Generated Aug 5
  before the audit; prints "6 Jaguars" and the retired "I'll call the kicker live", and is missing
  all 24 K/DEF rows (150 of 174). Do not print this and draft off it.

**Superseded by** [`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md) — hand-updating four surfaces is the
mechanism that caused the drift above. The plan replaces it with one generated source behind a
schema gate.

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
- `metadata.slot_name_<N>` → write `draft-kit/slot_names.json` so the engine names every roster.
  **Expect these to be absent.** Checked Aug 7: the real draft's `metadata` has exactly four keys
  (`description`, `league_type`, `name`, `scoring_type`) and zero `slot_name_*`. Those populate for
  unregistered/CPU seats; registered humans come through `draft_order` instead. In a full league of
  eight real accounts, `draft_order` is the source and `slot_names.json` may simply not apply.

---

## 5. Delete the empty husk — 10 seconds, first thing next session

`C:\Users\brigg\ai-learning-journey\projects\family feud` (with the space) is an **empty
directory** left over from the Aug 7 rename. Everything moved out; nothing is in it.

It could not be removed during that session because Windows pins a process's working directory
and the session was running inside it — not Explorer, not the desktop app, both were ruled out by
control test. Any session **not** rooted there can delete it:

```powershell
Remove-Item -LiteralPath "C:\Users\brigg\ai-learning-journey\projects\family feud" -Force
```

Git never saw it — git doesn't track empty directories — so this is filesystem tidiness only.

---

## 6. ~~Confirm the waiver day against a live cycle~~ — ✅ RESOLVED Aug 7, no waiting required

The premise was wrong: this never needed a live week-1 cycle. `copy_from_league_id` chains the
league to Briggsy's completed **2025** seasons, whose transaction history is public and already
answers it.

**Waivers process Wednesday ~03:10 AM ET.** Evidence: 111 completed waiver transactions across two
2025 leagues; 101 cluster on Wednesday at 03:09–03:10 ET, week after week. Corroborated on a second
league with the same `waiver_day_of_week: 2` but a *different* `waiver_type` and `waiver_clear_days`.
The non-Wednesday stragglers are all off-cycle rolling clears ~1 day after a mid-week drop — that is
`waiver_clear_days` working, not a competing pattern.

**So the Tuesday-report / Wednesday-processing doctrine is correct.** Two caveats worth keeping:
the *integer's label* stays ambiguous (both Sunday=0 and Monday=0 indexings fit the observed
behavior, and no clean control league exists to break the tie) — but the **behavior** is what a
Tuesday report depends on, and that is nailed. Also `waiver_budget: 100` is **inert**: FAAB only
applies when `waiver_type` is FAAB, and this league is `0` (rolling priority).

*Remaining work is a `docs/league.md` edit — it still says "unconfirmed." Covered by U8 in the plan.*

---

## 7. Stand up the in-season cadence (post-draft)

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
