# The Nightly Feud

The intended product: a nightly league brief — waiver movement, trending adds/drops, injury news
cross-referenced against our board — written to a local HTML page Briggsy keeps bookmarked.

## Honest status: half of it exists

| Half | State |
|---|---|
| **The Mule** — hauls data in, hourly | ✅ **Green, and the green is now earned.** Verified 2026-08-08: 10 sources, 0 failed, every payload parsed and counted rather than weighed. **5 working feeds, 145 items.** |
| **The build** — turns data into a newsletter | ❌ **Has never run. Not once.** |

**The evidence, not a guess:** `newsletter/family-feud-newsletter.html` is *byte-identical* to
`newsletter-template.html` (`cmp` confirms). `newsletter/archive/` is empty. `data/archive/` is
empty. There is no Windows task for it and no build script anywhere in the repo.

**Why:** the build was a Claude Desktop scheduled task (`trig_01TdmLFdaCHjvgmQGgWH5Vwe`, cron
`0 23 * * *` UTC) created inside Cowork. It did not survive the migration, and it could only ever
have fired while the desktop app happened to be open. **A job that no-ops when an app isn't
running was never really scheduled.** So the mule has been faithfully stockpiling cargo for a
consumer that does not exist.

**The fix is to rebuild it as a real script on Windows Task Scheduler**, the same shape as the
mule — see `TODO.md`. Everything it needs is already on disk: the cargo in `data/inbox/`, the
board in `../draft-kit/players_data.json`, and the design in `newsletter-template.html`.

## The Mule

Runs `newsletter/feud_mule.ps1` hourly, dropping 10 sources into `newsletter/data/inbox/`:
five Sleeper endpoints (league, users, draft, trending add, trending drop) and five fantasy RSS
feeds (Yahoo, Rotowire, ESPN, CBS, **ProFootballTalk**). Each source fails independently — dead
feeds report `FAIL` in `mule_status.json` and the newsletter is meant to use whatever arrived.

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

Right now that page is the Preview Edition — the unmodified template, with its ☀/☾ theme toggle.
It will stay that way until the build half exists.

## Folder map

```
newsletter/
  family-feud-newsletter.html   <- the live edition (this is the page you open)
  newsletter-template.html      <- the design the build clones
  feud_mule.ps1                 <- the data mule (Task Scheduler runs this hourly)
  archive/                      <- dated back issues        (empty; nothing built yet)
  data/
    inbox/                      <- fresh cargo, mule writes / build reads   [gitignored]
    archive/                    <- consumed cargo by date, debug trail      [gitignored]
    mule_log.txt                <- mule heartbeat, last 500 runs            [gitignored]
```

`data/inbox/` and `data/archive/` are a **cache**, not source — regenerated hourly, excluded from
git, never edited by hand. Each keeps a `.gitkeep` so a clean clone still has somewhere to land cargo.

## Delivery is a file, never a notification

Anthropic push and email notifications are broken account-wide. Everything this project produces
lands as a file in this folder. Do not build anything that depends on a notification arriving.
