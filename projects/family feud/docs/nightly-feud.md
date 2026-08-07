# The Nightly Feud — Install (2 commands, ~1 minute)

Everything below happens in **regular PowerShell** (no admin needed). All newsletter machinery lives in `Family Feud\Newsletter\`.

## 1. Test the Mule once, manually

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\brigg\Family Feud\Newsletter\feud_mule.ps1"
```

Then look at `Newsletter\data\inbox\` — you should see `sleeper_*.json` files and at least a couple of `rss_*.xml` files. `mule_status.json` shows exactly which sources worked and which failed (dead feeds just say FAIL — that's fine, the newsletter uses whatever arrives).

## 2. Put it on the clock (hourly)

```powershell
schtasks /Create /TN "Family Feud Mule" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\brigg\Family Feud\Newsletter\feud_mule.ps1\"" /SC HOURLY /F
```

That's it. The Mule now hauls fresh cargo every hour your laptop is awake.
*(Already registered it with the old pre-Newsletter path? Just re-run the command above — the `/F` overwrites the old task in place.)*

## 3. Bookmark the paper

In Chrome, open and bookmark:

```
file:///C:/Users/brigg/Family%20Feud/Newsletter/Family_Feud_Newsletter.html
```

The Preview Edition is there now (with the ☀/☾ theme toggle, top-right). Every night at **7:00 PM ET** (laptop on, Claude desktop app open) the scheduled task reads the day's cargo, writes the fresh edition to that same file, archives a dated copy to `Newsletter\archive\`, and moves consumed data to `Newsletter\data\archive\<date>\` for the debug trail.

## Folder map

```
Family Feud\
  Newsletter\
    Family_Feud_Newsletter.html   ← tonight's edition (bookmark this)
    newsletter_template.html      ← the design the nightly run clones
    feud_mule.ps1                 ← the data mule (Task Scheduler runs this)
    INSTALL_NIGHTLY_FEUD.md       ← this file
    archive\                      ← dated back issues
    data\
      inbox\                      ← fresh cargo (mule writes, nightly run reads)
      archive\                    ← consumed cargo by date (debug trail)
      mule_log.txt                ← mule heartbeat, last 500 runs
```

## Handy bits

- **Change the Mule's schedule:** `schtasks /Change /TN "Family Feud Mule" ...` or Task Scheduler GUI → "Family Feud Mule".
- **Uninstall the Mule:** `schtasks /Delete /TN "Family Feud Mule" /F`
- **Missed a night?** Nothing is lost — the Mule keeps stockpiling; the next edition catches up.
