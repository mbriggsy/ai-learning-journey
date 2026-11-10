# The Nightly Feud

The intended product: a nightly league brief — waiver movement, trending adds/drops, injury news
cross-referenced against our board — written to a local HTML page Briggsy keeps bookmarked.

**Since 2026-11-09 it is the in-season paper**, built around our roster (see
[The in-season edition](#the-in-season-edition) below). The draft edition described in the rest of
this file is still in the code and comes back on its own when the draft cargo stops reading
`complete`.

## Status: both halves now exist

| Half | State |
|---|---|
| **The Mule** — hauls data in, hourly | ✅ **Green, and the green is now earned.** Re-verified 2026-09-17, in-season: **17 sources, 0 failed**, every payload parsed and counted rather than weighed. **5 working feeds.** *(Was 12 on 2026-08-08, 14 on 08-17; `sleeper_state` + `sleeper_matchups` + `sleeper_transactions` joined 09-17 for the in-season cadence, and the two draft-era fetchers stand down on `season_type` with an `ok` line rather than refusing hourly.)* Item counts move hourly — read `mule_status.json`, never this cell. |
| **The build** — turns data into a newsletter | ✅ **Edition #1 published 2026-08-08** (U11). `scripts/build_newsletter.py`. |
| **The schedule** — publishes it nightly, unattended | ✅ **Registered 2026-08-08** (U12). Task *Family Feud Newsletter*, **daily at 21:45**, sixteen minutes behind the mule's `:29` haul. Re-register after any folder move: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-newsletter.ps1` |

```bash
python scripts/build_newsletter.py            # build tonight's edition
python scripts/build_newsletter.py --dry-run  # report what it found, write nothing
```

**The history, because it explains the shape of the fix:** the build was a Claude Desktop
scheduled task (`trig_01TdmLFdaCHjvgmQGgWH5Vwe`, cron `0 23 * * *` UTC) created inside Cowork. It
did not survive the migration, and it could only ever have fired while the desktop app happened to
be open. **A job that no-ops when an app isn't running was never really scheduled.** The mule spent
days stockpiling cargo for a consumer that did not exist. It exists now.

### What the build guarantees

- **Deterministic code owns every fact and number.** No figure in the edition is written by a
  language model and none is typed into the template. If a number cannot be derived from cargo the
  paper says so in words: `Days to Draft` renders an asterisked dash tonight because `start_time`
  is null, and it starts printing a real countdown the night that changes, with no code edit.
- **The design is carried, not copied.** `newsletter-template.html` stays frozen as the reference;
  its `<style>` block and theme toggle are extracted at build time and injected, so the edition
  cannot drift from the design. A test asserts the rendered CSS hashes identically to the frozen
  one. (Consequence: the now-unused `.preview-banner` rule is still in the stylesheet. The banner
  itself is gone. Editing the carried CSS to remove the rule would cost the byte-identity, which is
  the more valuable of the two.)
- **One pull in season, none before the draft, and it can never cost the paper.** In season
  `main()` first runs `scripts/season_cargo.py` as a child process with a 300-second limit (46
  seconds measured). If that fails for any reason the edition prints from the kept
  `newsletter/data/inbox/season_cargo.json`, says how old it is, and past 36 hours makes no call.
  The functions that build the page read files only. The draft edition: trending ids join the board on the frozen `sleeperId`, which retired the plan's
  48 per-player lookups. A nightly job that touches the network is a nightly job that fails on a
  bad night.
- **It publishes whatever arrived.** A missing or corrupt feed degrades to absent and the gap is
  named in the colophon — a paper that quietly drops a section teaches you to trust a page that is
  lying.

- **Every edition is also copied to Google Drive.** The dated back issue lands in
  `G:\My Drive\Nightly Feud\` under the same file name (`YYYY-MM-DD-edition-N.html`). A same-day
  rebuild replaces that day's copy, as the local archive does. The copy runs last, after everything
  local is on disk: a Drive that is down never costs the edition, but the build then exits **3**
  and the task's `Last Result` reads 3 instead of 0. `--dry-run` copies nothing.
  - **A missed night repairs itself.** Every run also copies any back issue dated 2026-11-09 or
    later that Drive does not have, so the next good run fills the hole. The 87 editions before
    that date were not backfilled, and the repair leaves them alone (`DRIVE_SINCE`).
  - **Exit 0 means Drive for desktop took the file**, on its `G:` drive. The upload to Google is
    Drive's own background job and nothing here checks it; if the laptop sleeps or is offline right
    after 21:45, the copy reaches Google when it reconnects.
  - **It needs Google Drive for desktop running, signed in, and mounted as `G:`** (installed
    2026-11-09). If Drive ever mounts under another letter the build exits 3 with "`G:\My Drive`
    does not exist", and the repair is the one line `DRIVE_DIR` in `scripts/build_newsletter.py`.
    **Re-running the installer does not fix this one.**
  - **Google Drive's own viewer shows an `.html` file as code, not as a page.** To read an edition
    from Drive, download it and open it in a browser.

⚠️ **The Wire matches FULL names only, and that is deliberate.** Surname matching was tried and
measured against one night's real feeds: **10 false positives out of 11 items.** "Hall of Fame"
matched Breece Hall five times, "Kirk Cousins" matched Christian Kirk, "Herschel Walker" matched
Kenneth Walker III. Football surnames are ordinary English words. The cost is that a headline
reading only *"Nacua ruled out"* is missed; the alternative is a paper that tells you a player you
are about to draft is hurt when he is not.

## The in-season edition

**The switch is a fact in cargo:** `sleeper_draft.json` reads `status: "complete"`. Nothing to flip.
Decisions and their reasons: [`plans/2026-11-09-001-feat-in-season-edition-plan.md`](plans/2026-11-09-001-feat-in-season-edition-plan.md).

```bash
python scripts/build_newsletter.py             # pull a fresh snapshot, build, copy to Drive
python scripts/build_newsletter.py --no-haul   # build from the snapshot already on disk
python scripts/build_newsletter.py --dry-run   # report only: pulls nothing, writes nothing
python scripts/season_cargo.py --stdout        # just the pull, summarised, nothing written
```

| Section | What it prints |
|---|---|
| Tiles | Record, place, the lineup week, the projected margin as the two lineups are set |
| This Week | The live score once a game has kicked off (and where it should finish, and who is still playing); last week's final from Tuesday until the first kickoff; then the lineup you can still change, slot by slot for both sides, with the start/sit calls |
| Your Roster | Everyone tagged, on bye or on injured reserve, with the reason; then the rest of the bench |
| Waiver Wire | Weak spots, the free agents worth a claim, the best of the rest, next week's byes, roster count, waiver place |
| The Wire | Headlines naming our players or a free agent who would start for us |
| Market Watch | Sleeper's trending adds and drops, kept where they touch our roster or such a free agent |
| Standings | All eight, with the playoff cut |

**The rules, each one paid for** (the code's docstrings carry the receipts):

- **One projected number.** QB / RB / WR / TE: the average of the sites that price him above zero,
  and only when two or more do. K and DEF: Sleeper's number (`trade_eval.NEVER_ADJUSTED`).
- **The lineup week** is this Sleeper week while any of its games has yet to kick off, else the next.
- **Lock beats tag.** Sleeper tags men Out after games they played. Locks come from kickoff times
  against the build clock, never from stored game states.
- **The swap engine is `gameday_check.assess`**, fed through `season_edition.adapter`. Do not write
  a second one. Its shorthand is spelled out for the reader in `season_edition.plain`.
- **No call on one source.** A week that arrived Sleeper-only, a week with no kickoff times, or a
  snapshot past 36 hours prints its rows and withholds every start/sit and waiver call.
- **A pickup must clear the swap bar** (2.0 points on our best lineup), at most three per position.
- **Byes are every team without a defense that has an opponent**, counted from the full team list.
  The sources leave a bye team's defense out, so "a DEF row with no opponent" finds almost none.
- **The paper names no drop** and does not sort a waiver claim from an instant add.

⚠️ **`season_cargo.json` is not mule cargo.** It lives in the inbox so it is archived with the
edition, but the 21:45 build writes it, once a night. Read its `pulled` stamp before trusting it.

⚠️ **`tests/fixtures/season_cargo_20261109.json.gz` can never be re-made.** It is the real snapshot
from Monday 2026-11-09 21:07 ET; `test_season_edition.py` pins that night's numbers on it.

## The Mule

Runs `newsletter/feud_mule.ps1` hourly, dropping **12** sources into `newsletter/data/inbox/`
(v2.1 also runs two draft-kit fetchers that write to `draft-kit/cache/`, not here — **14 entries in
`mule_status.json` total**): **seven** Sleeper endpoints (league, users, draft, **traded_picks**,
**rosters**, trending add, trending drop) and five fantasy RSS feeds (Yahoo, Rotowire, ESPN, CBS,
**ProFootballTalk**). Each source fails independently — dead feeds report `FAIL` in
`mule_status.json` and the newsletter is meant to use whatever arrived.
⚠️ *(Corrected 2026-08-18: this said "10 sources" and named only five Sleeper endpoints, while
line 10 of this same file said 14 — the file contradicted itself with no way to tell which was
current. `sleeper_traded` and `sleeper_rosters` joined 08-17. A **by-name** list is what a reader
trusts to know a fetch exists before writing a consumer, and `sleeper_traded` having no reader is
a gap this repo already closed once.)*

⚠️ **NBC Edge was retired 2026-08-08 and must not be restored.** Its URL returns HTTP 200 with
`Content-Type: text/html` and a ~793 KB page carrying zero `<item>` elements — it was never a feed,
and the old `size > 50` check recorded it **ok** every hour. ProFootballTalk took its slot
(30 items). The wire is **5 working feeds, ~145 items**; counts move daily, so read
`mule_status.json` rather than quoting a number from here.

**Install, re-install, or verify — one command, from the project root:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-mule.ps1
```

It derives every path from its own location, registers the task, forces a run, waits for a real
exit code, reads `mule_status.json` back, and throws if anything isn't green. **Re-run it after
any move of the project folder** — that is the entire repair.

**Checking on it by hand:**

```powershell
Get-ScheduledTaskInfo -TaskName "Family Feud Mule"   # LastTaskResult 0 = success
Get-Content newsletter\data\mule_log.txt -Tail 3     # one line per run, last 500 kept
```

⚠️ **`Last Result: 0` alone does not mean the mule is working.** When the task pointed at a
deleted script it *also* read 0 — frozen at the last good pre-move run. **Always check the cargo
timestamp** in `mule_status.json` (or the log's last line) against the clock. That is the only
signal that distinguishes healthy from dead.

## Opening the paper

```
file:///C:/Users/brigg/ai-learning-journey/projects/family-feud/newsletter/family-feud-newsletter.html
```

**No bookmark required** — Briggsy's call, Aug 7. Chrome's URL autocomplete gets there after the
first visit, and double-clicking the file in Explorer works just as well. Recorded here so the
path is written down somewhere, not because anything depends on it.

Also in Google Drive, folder **Nightly Feud**, one dated file per night. Check the job by hand:

```powershell
Get-ScheduledTaskInfo -TaskName "Family Feud Newsletter"   # LastTaskResult 0 = edition + Drive copy; 3 = edition written, Drive copy missed
Get-ChildItem "G:\My Drive\Nightly Feud" | Sort-Object Name | Select-Object -Last 3   # tonight's date should be the newest
```

That page is a real edition now, rebuilt every time `build_newsletter.py` runs. The ☀/☾ theme
toggle is the frozen design's own script, carried through untouched.

## Folder map

```
newsletter/
  family-feud-newsletter.html   <- the live edition (this is the page you open)
  newsletter-template.html      <- FROZEN design reference. The build extracts its CSS and
                                   theme script; it never writes to this file.
  templates/edition.html.j2     <- the DRAFT edition. Presentation only; every fact arrives from the builder
  templates/season.html.j2      <- the IN-SEASON edition (same rule; its second <style> block is its own)
  feud_mule.ps1                 <- the data mule (Task Scheduler runs this hourly)
  archive/                      <- dated back issues, one per DAY (U12), named
                                   YYYY-MM-DD-edition-N.html. A second build the same day
                                   republishes the same N and OVERWRITES that file in place
                                   — the day's latest build wins. N is one past the number of
                                   DISTINCT DAYS already published, not this directory's
                                   .html count, so a stray duplicate cannot inflate every
                                   edition after it. Self-healing, no state file to lose.
  data/
    inbox/                      <- fresh cargo, mule writes / build reads   [gitignored]
      season_cargo.json         <- the exception: written nightly by the BUILD, not the mule
    archive/                    <- consumed cargo by date, debug trail      [gitignored]
    mule_log.txt                <- mule heartbeat, last 500 runs            [gitignored]
```

`data/inbox/` and `data/archive/` are a **cache**, not source — regenerated hourly, excluded from
git, never edited by hand. Each keeps a `.gitkeep` so a clean clone still has somewhere to land cargo.

## Delivery is a file, never a notification

Anthropic push and email notifications are broken account-wide. Everything this project produces
lands as a file in this folder. Do not build anything that depends on a notification arriving.
