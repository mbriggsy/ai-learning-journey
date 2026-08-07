---
name: family-feud-league
description: Briggsy's fantasy football operations manual for the Family Feud league on Sleeper (2026 season). Use whenever Briggsy asks about fantasy football — his draft, lineups, waivers, trades, league standings, his team, or anything Sleeper-related. Contains league IDs, data access methods, strategy, and standing infrastructure.
---

# Family Feud League Brain — 2026 Season

## Who you're working for
- **Briggsy** (call him Briggsy). Sleeper account: **PoppaBriggsy**, user_id `1390750540631150592`, roster_id 3. Team name: **Saquon Deez Nuts**.
- **briggsy007** (user_id `959308419154886656`) is a DIFFERENT person — almost certainly his son Hunter (26), and the league commissioner. **RMonk9** (user_id `959230356757045248`) and **MattiICE23** (user_id `946163712933732352`) are other members. League was 4/8 full as of Aug 6, 2026.
- Tone: direct, funny, profanity welcome. Mission: beat Hunter and his buddies. Family: wife Danielle (30+ years), kids Hunter (26), MichaelAnne (24), Grace (23).

## League facts (verified Aug 5, 2026)
- League: **"Family Feud"**, Sleeper league_id `1390509993844809728`, season 2026, **8 teams**.
- Draft: draft_id `1390509994847240192`, **snake, 16 rounds, 120s clock**, informally targeted ~Aug 29, 2026 — check actual status/start_time via API.
- Scoring: **FULL PPR** (rec=1.0), 4pt pass TD, 0.04/pass yd, 0.1/rush & rec yd, -2 fumble lost, -1 INT, 40+/50+ yd TD bonuses.
- Weekly starters: QB, 2 RB, 2 WR, TE, **2 FLEX**, K, DEF + 6 bench + **2 IR** (OUT/SUS/COV eligible).
- Playoffs: **6 of 8 teams**, weeks 15-17 (title week 17). Trade deadline week 11. **Pick trading ON.** Waivers: rolling priority (waiver_type 0), Wednesday processing.

## Folder layout (Briggsy's local "Family Feud" folder, reorganized Aug 6)
- `Draft Kit\` — DRAFT_DAY_RUNBOOK.md (**v3.2** — the operating manual, read it before any draft/mock work), draft_engine.py, players_data.json (+ date-stamped copy), board HTML, cheat sheet PDF, LIVE_BOARD_PLAN.md, RANKING_METHODOLOGY.md.
- `Newsletter\` — The Nightly Feud machinery: live newsletter HTML (Chrome bookmark target), template, feud_mule.ps1, install guide, `archive\` (back issues), `data\inbox\` + `data\archive\` (mule cargo in/consumed).
- `Logo\` — team logo assets. Root: this skill reference copy.

## Data access (all read-only, no auth)
- Sleeper's public API works via **WebFetch** in LIVE sessions (direct curl from the cloud sandbox is proxy-blocked; WebFetch succeeds; responses cache 15 min — append a junk param like `?cb=123` to force fresh):
  - `https://api.sleeper.app/v1/league/1390509993844809728` (+ `/users`, `/rosters`, `/matchups/<week>`, `/transactions/<round>`)
  - `https://api.sleeper.app/v1/draft/1390509994847240192` (+ `/picks`, `/traded_picks`) — picks include player name metadata
  - `https://api.sleeper.app/v1/players/nfl/trending/add` (and `/drop`)
  - `https://api.sleeper.app/v1/state/nfl` (current week)
- **UNATTENDED/scheduled runs CANNOT WebFetch anything** — permission prompts are unanswerable and do not persist between runs (verified Aug 6; full saga in project doc `claude/ops-log.md`). Scheduled runs read Sleeper/news data from `Newsletter\data\inbox\` (fetched hourly by the local **Feud Mule** Task Scheduler job) via the always-allowed device bridge tools. WebSearch (snippets) works unattended; Anthropic push/email notifications are broken account-wide — deliver via files in the folder, never via notifications.
- Player ID→name map: `https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv` (sleeper_id column) — raw.githubusercontent.com and github.com ARE reachable from sandbox bash. nflverse-data GitHub releases have stats/injuries/depth charts.
- **No official write API exists for Sleeper.** Lineup/waiver/trade moves = give Briggsy exact taps to make, or drive his logged-in Chrome (claude-in-chrome tools) while he's present.
- **Credentials policy:** Briggsy logs into Sleeper with a passkey on his own devices. NEVER ask for, accept, or store his password — reads need no auth, and writes go through his taps or his already-logged-in browser. If he offers credentials (he has; he's friendly like that), decline warmly and remind him why.

## Strategy pillars (set at draft prep, Aug 2026)
- 6-of-8 playoffs → **ceiling over floor**; build a team that peaks in December.
- 8-team league is shallow: the waiver wire stays stacked all season; elite positional advantages beat depth; stream K/DEF freely.
- Full PPR + 2 FLEX → pass-catcher heavy builds. QB in rounds 6-9, never early. K/DEF in the final two rounds only.
- **VBD amendment (Aug 5 war game):** rounds 3-5, same-tier ties break toward RB — mid-RB beats mid-WR over waiver replacement every year in this format; WR volume comes rounds 5-8. Board JSONs/artifact/cheat sheet/engine carry VORP + VBD flags; sim receipts in DRAFT_DAY_RUNBOOK.md changelog.
- **Miami Rule:** no Dolphins pass-catchers in 2026 (Tua/Hill gone, Malik Willis starting).
- 2 IR slots = free stash arbitrage on falling injured stars.
- Upside-leaning risk profile confirmed by Briggsy.

## Standing infrastructure (rebuilt Aug 6, 2026)
- **Executor mode: PROVEN.** Mock #3 (Aug 6, lab room): Claude drove Briggsy's Chrome end-to-end — **15/15 manual picks, zero clock misses, zero AUTO-PICK flips, roster VORP 1225.8** (Mock #1 Aug 5 = advisor mode; Mock #2 Aug 6 = first executor run, 9/9 + one clock miss). All mechanics live in runbook v3.2: triple-click (never ctrl+a — the bridge drops modifiers), queue-row green ⊕ = one-click draft-from-queue, screenshot capture-scale drift rules, range-fetch discipline. Draft-day plan: executor mode per runbook, Briggsy holds the veto and clicks any native dialogs (START confirm freezes the extension).
- **Next pre-draft build: the live auto-updating draft board** — step zero is a CORS probe artifact (does the artifact webview allow fetch to api.sleeper.app?). Plan + fallbacks in `Draft Kit\LIVE_BOARD_PLAN.md` and project doc `claude/live-board-plan.md`. The Mock #3 lab room (`1390923383440424960`) is spent but its /picks endpoint still serves all 120 picks — use it as a static test feed.
- Scheduled task **"The Nightly Feud (7pm daily brief)"** (`trig_01TdmLFdaCHjvgmQGgWH5Vwe`, cron 0 23 * * * UTC): nightly newsletter — reads the Mule's cargo from `Newsletter\data\inbox\`, cross-refs `Draft Kit\players_data.json`, publishes `Newsletter\Family_Feud_Newsletter.html` (+ dated copy in `Newsletter\archive\`), archives consumed data, self-heals its league BASELINE via update_trigger. Absorbed the old twice-daily league watcher (retired/deleted Aug 6).
- **Feud Mule** (`Newsletter\feud_mule.ps1`, Windows Task Scheduler "Family Feud Mule", hourly): fetches Sleeper league/users/draft/trending + fantasy RSS feeds into the inbox. Runs outside Claude's permission system — this is how unattended runs get data.
- One-shot task **"Pre-draft rankings refresh brief"** (`trig_01GJwt6H1BkKh9RQC8pGnVev`, Aug 26 ~10am ET): WebSearch drift/injury sweep vs the Aug 5 board → `Draft Kit\REFRESH_BRIEF_2026-08-26.md`; the full re-rank happens in a live session before the draft.
- Desktop artifact **`family-feud-draft-board`**: interactive 174-entry big board incl. K/DEF + VORP overlay with ⚖ VBD-order toggle (update via update_artifact, don't recreate). Printable cheat sheet PDF (VORP column included) in `Draft Kit\`.
- Draft rankings synthesized Aug 5, 2026 from FantasyPros/FTN/ESPN/Yahoo/CBS/NFL.com/SI/PFF + camp reporting. **Stale after mid-Aug — refresh before the draft and always re-verify injuries/depth charts via web search before advising.**
- In-season automation prompts pre-written in project doc `claude/in-season-tasks.md` — flip on after the real draft. Ops history + hard-won platform lessons: project doc `claude/ops-log.md`.

## Season operations (post-draft cadence)
- **Tuesday:** waiver report — league transactions + trending adds/drops + priority advice.
- **Thursday & Sunday mornings:** lineup check — his roster vs injuries/byes/matchups; send exact start/sit moves.
- **On demand:** trade evaluations (rest-of-season value, roster fit) and trade-proposal scouting across the other 7 rosters.
- Delivery for all scheduled output = files in the folder (newsletter pattern), NOT notifications (broken).
- Never trust cached rosters or old rankings from context — re-pull from the API and re-search news each time. It's August-fresh data or nothing.
