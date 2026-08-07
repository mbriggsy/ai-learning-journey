# THE SLICK IDEA — Live Auto-Updating Big Board
*Idea captured the night of Aug 5→6, 2026 — Briggsy's words: "on the big board, as draft picks are being made it automagically updates. Mind blown, right?" Correct, Briggsy. Mind blown.*

**STATUS (updated Aug 6 evening): Mock #3 ✅ PASSED — the executor gate is cleared. Next session builds the board, starting with the CORS probe below.**

## The sequence
1. ~~Mock #3 first~~ — **✅ PASSED Aug 6, a day ahead of schedule** (executor mode per runbook, now v3.2): 15/15 manual picks, zero clock misses, zero AUTO-PICK flips, roster VORP 1225.8. Full recap in the runbook changelog + project ops-log. Pass criteria RETIRED. Note: the lab room `1390923383440424960` is **SPENT** (ran to completion) — any future mock needs a fresh 2-click room (Sleeper remembers settings). The spent room's `/picks` endpoint still serves all 120 picks, which makes it a perfect **static test feed** for the board build.
2. **NEXT SESSION: build the live board** — step zero is the CORS probe.
3. Real draft ~Aug 29 gets both: a lethal executor (proven) AND a self-updating wall display.

## Step zero — the CORS probe (10 min, BEFORE writing any board code)
Question: does the desktop-artifact webview allow `fetch()` to api.sleeper.app? Two gates: **CORS** (Sleeper's side — believed permissive for its public read API, unverified) and the **artifact container's CSP** (the real unknown — and a DIFFERENT permission surface than scheduled-run WebFetch, which is broken; see ops-log). The probe: a 5-line artifact that fetch()es `https://api.sleeper.app/v1/state/nfl` and prints SUCCESS + the JSON, or the error, in big letters. Briggsy opens it; verdict in ten seconds.
- **Probe passes → Option A** (client-side polling, zero backend, truly automagic).
- **Probe fails → fallbacks:** a `file://` page in Chrome (the newsletter-bookmark pattern — local pages can generally fetch permissive-CORS APIs), or **Option B**: Claude pushes update_artifact refreshes each round during drafts. Option A failing does NOT kill the idea.

## Option A — technical sketch
- Embed JS in the `family-feud-draft-board` artifact: poll `https://api.sleeper.app/v1/draft/<draft_id>/picks` every 10-15s.
- Name-match picks against board entries via a JS port of draft_engine.py's `norm()` (diminutive aliases, suffix stripping — prefer Sleeper's spelling, e.g. "Kenny Gainwell").
- Grey/strike drafted players, tag with pick# + drafting slot, live-update tier "left" counts, highlight when Briggsy (draft_slot from `draft_order`, user_id `1390750540631150592`) is on the clock or next.
- draft_id input: small text box in the board header (paste any draft URL/id) + hardcoded default = real league draft `1390509994847240192`; remember last-used in a JS variable.
- During development, point it at the spent lab room for a stable 120-pick feed.
- Nice-to-haves if A works: room-speed indicator (avg sec/pick, last 8), run-watch banner ("RB run: 4 of last 6"), audible ding when Briggsy is ≤2 picks out.

## Standing reminders for the build session
- **Update the existing `family-feud-draft-board` artifact via update_artifact — do NOT recreate.** Commit the same upgrade to `Draft Kit\Family_Feud_Draft_Board.html` via the bridge so disk and artifact stay twins.
- Rankings are the **Aug 5 snapshot** — fine for the build and testing; MUST refresh before the real draft (the Aug 26 one-shot drops `REFRESH_BRIEF_2026-08-26.md` into `Draft Kit\` as the starting gun; full re-rank in a live session before ~Aug 29).
- War-room scripts (merge_picks.py etc.) live only in session containers — recreate per runbook Step 3. Range-fetches start at last-merged+1; leapfrogging trips the engine's integrity gate (learned live in Mock #3, picks 78-82).
- League was 4/8 as of Aug 6: PoppaBriggsy, briggsy007 (Hunter, commish), RMonk9, MattiICE23. Team name: **Saquon Deez Nuts** (logo in `Logo\Deez Nuts\`).
- League watch rides inside The Nightly Feud (7pm ET nightly); the Aug 6 notification/permission platform lessons live in the project ops-log.
