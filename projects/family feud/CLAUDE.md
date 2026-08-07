# Family Feud — Project Conventions

Fantasy football co-pilot for Briggsy's 8-team Sleeper league ("Family Feud", 2026). Draft ~Aug 29, 2026. Mission: beat Hunter.

## Where truth lives — read before acting

| File | Owns |
|---|---|
| `family-feud-league-SKILL.md` | League identity, IDs, scoring, strategy pillars, data-access rules |
| `Draft Kit/DRAFT_DAY_RUNBOOK.md` | Draft-day operating instructions + changelog (mock lessons folded in) |
| `Draft Kit/RANKING_METHODOLOGY.md` | Why the board ranks what it ranks |
| `Draft Kit/LIVE_BOARD_PLAN.md` | The live auto-updating board build (next feature) |

Precedence: the runbook's instruction sections are current doctrine; its changelog is history and never overrides them.

## MIGRATED FROM CLAUDE COWORK — Aug 7, 2026

This project ran in Cowork through Aug 6. Several rules in the older docs were **Cowork-sandbox constraints and are now WRONG here.** Do not follow them blindly.

- **`curl` to `api.sleeper.app` WORKS from this environment.** The runbook's "bash curl is proxy-blocked, use WebFetch" was a Cowork limitation. Locally: `curl -sL --max-time 15 "https://api.sleeper.app/v1/..."` returns fine. Verified Aug 5 + Aug 7.
- **NEVER use WebFetch** (global rule — no timeout, hangs agents). Use `curl` or `mcp__gemini-grounding__*`. The runbook's WebFetch prompt-engineering rules (`?cb=N` cache-busting, inclusive-range phrasing) exist only to work around WebFetch and are **obsolete here** — curl has no cache and returns raw JSON.
- **The "scheduled runs can't WebFetch" problem does not apply.** Scheduled work here = Windows Task Scheduler running a real script. No permission prompts, no device bridge.

### `claude/ops-log.md` is GONE — deliberately, nothing lost

`family-feud-league-SKILL.md` and `Draft Kit/LIVE_BOARD_PLAN.md` both cite a Cowork project doc `claude/ops-log.md`. It could not be exported (Aug 7) and **was not worth chasing** — it documented the limits of the environment we just left. Don't hunt for it; the citations are dangling by design. Everything actionable from it:

- Unattended/scheduled Cowork runs could not WebFetch — permission prompts are unanswerable and don't persist between runs (verified Aug 6). **This is why the Feud Mule exists**: a local PowerShell job fetches to `Newsletter/data/inbox/` so scheduled runs read from disk instead of the network.
- WebSearch (snippets) did work unattended; WebFetch did not.
- Anthropic push/email notifications are broken account-wide — deliver via files, never notifications. *(Still true here — see Landmines.)*

The Mule remains the right design in this environment too, for a different reason: a real script on Task Scheduler beats an agent run that depends on an app being open.

**Move-day cleanup:** strip the two `ops-log.md` citations so nobody chases a file that no longer exists.

## The folder move breaks three things

Moving out of `C:\Users\brigg\Family Feud` silently breaks all three. Fix in one pass:

1. **`Newsletter/feud_mule.ps1` line 10** — `$base = "C:\Users\brigg\Family Feud"` is hardcoded. Repoint it (or better: derive from `$PSScriptRoot\..`).
2. **The Windows scheduled task `Family Feud Mule`** — registered with an absolute `-File` path. Re-register: `schtasks /Create /TN "Family Feud Mule" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"<new>\Newsletter\feud_mule.ps1\"" /SC HOURLY /F`. Verify with `schtasks /Query /TN "Family Feud Mule" /FO LIST /V` — `Last Result: 0`.
3. **`Newsletter/INSTALL_NIGHTLY_FEUD.md`** — install commands + the bookmarked `file:///C:/Users/brigg/Family%20Feud/...` URL. Update the doc AND re-bookmark in Chrome.

`Draft Kit/draft_engine.py` is safe — it reads from cwd, no absolute paths.

## Verified facts — Aug 5–7, 2026

Independently checked against the live Sleeper API. **All expire; re-verify on draft day.**

- **Board name matching is clean.** All 174 entries in `players_data.json` resolve 1:1 through the engine's `norm()` against the live Sleeper player DB — 0 misses, 0 ambiguous. Includes DSTs (Sleeper stores those as `first_name:"Houston"` / `last_name:"Texans"`).
- **Snake math is correct.** `slot_of()` validated against all 120 real picks from Mock #1 — 0 mismatches.
- **Real draft config:** `status: pre_draft`, `start_time: null`, `draft_order: null`, 16 rounds, 120s, `reversal_round: 0`. Briggsy's slot is genuinely unknown until near start.
- **Third-round reversal is ruled out** (Briggsy, Aug 5) — plain snake is correct, don't build for it.
- **In-draft pick trading is ruled out** (Briggsy's ~100 drafts: the clock doesn't allow it). `/traded_picks` returned `[]`. Don't build for it. A *pre-draft* trade would show on that endpoint — one check on draft morning is enough.
- **League was 4/8** as of Aug 5 (MattiICE23 joined; skill file said 3/8). Re-pull `/users` before quoting membership.
- **Cosmetic:** the board says `JAC`, Sleeper says `JAX` (8 rows). Display-only — the engine never matches on team.

## Open threads — priority order

1. **Rankings refresh — REQUIRED before the real draft.** `players_data.json` is an **Aug 5 snapshot** and goes stale by mid-Aug. Re-research ranks/injuries/ADP, regenerate the board, and update every surface in one pass: `players_data.json`, the date-stamped copy, the `family-feud-draft-board` artifact, `Family_Feud_Draft_Board.html`, the cheat-sheet PDF.
2. **Live auto-updating board** — see `Draft Kit/LIVE_BOARD_PLAN.md`. Step zero is the CORS probe. In this environment the fetch story is different (no artifact CSP), so re-read the plan's assumptions before executing it.
3. **Nightly newsletter never fires.** The Mule half is green — hourly, `Last Result: 0`, 0 FAILs across 10 sources. The *build* half never ran: `Family_Feud_Newsletter.html` is still byte-identical to `newsletter_template.html`, and both `Newsletter/archive/` and `Newsletter/data/archive/` are empty. There is no Windows task for it and no build script exists — it was a Claude Desktop scheduled task. **Recommendation: rebuild it as a real script on Windows Task Scheduler.** A job that no-ops when an app isn't open isn't scheduled.

## Landmines

- **`draft_engine.py` has an integrity gate at lines ~68-79. Do not "simplify" it away.** It derives board state from `max(pick_no)`, not `len(picks)`, and hard-exits on gaps/duplicates. Without it, one dropped pick silently shifts the clock, invents an impossible pick order, and leaves drafted players on the available list — it will name an already-drafted player as THE CALL. Reproduced and fixed Aug 5.
- **Never advise off a `picks.json` the engine refused.** Re-fetch and merge on `pick_no`, then rerun.
- **Imagen 4: role-nouns are identity anchors, not accessories.** "dark leather apron" once produced a photorealistic stock photo of a woman modeling an apron; "referee whistle" turned the mad scientist into a referee and re-costumed the tiny man. Describe the *object* ("a small silver whistle on a cord"), never the role. 2 of 4 rolls corrupted by one word. Working call: `imagen-4.0-generate-001`, `sampleImageSize: "2K"` (the ceiling), `aspectRatio: "1:1"`, `personGeneration: "allow_adult"`.
- **Anthropic push/email notifications are broken account-wide** — deliver output as files in this folder, never via notification.
