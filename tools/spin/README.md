# spin

Opens a run of numbered Claude Code sessions as tabs in one Windows Terminal window. It's built for session chains (b9-1, b9-2, b9-3 ...), so you don't have to open every tab by hand, `cd` and type `claude --name`.

```
PS C:\Users\brigg\ai-learning-journey\projects\the-back-nine> spin b9
Highest open b9 session: b9-14
Opening 1 Claude session(s), b9-15 to b9-15, in the 'b9' Terminal window
Folder: C:\Users\brigg\ai-learning-journey\projects\the-back-nine
  b9-15
```

## Use it

`cd` into the project first. The tabs open in the folder you run `spin` from.

| You type | You get |
|---|---|
| `spin b9` | the next one: one past the highest b9 session open right now |
| `spin b9 -Count 3` | the next three |
| `spin b9 20` | just b9-20 |
| `spin b9 10 9` | nine tabs, b9-10 through b9-18 |

The third number is how many tabs, not the last number. `spin b9 10 10` gives b9-10 through b9-19.

## Ask Claude to run it

You don't have to be at the laptop. Tell any open Claude session something like "add 3 more b9s," either in its terminal or from your phone through Remote Control. Claude checks which sessions are open, runs `spin` from the project's folder and tells you the names it opened.

- **Ask a session that isn't in the chain.** Don't ask the one doing the work. A session waiting for its handoff could do it, but that would use up some of the context it's saving for its turn.
- **The new sessions show up on your phone** within seconds, because Remote Control starts with every session (`remoteControlAtStartup` in `~\.claude\settings.json`). Tested 2026-11-24 on a session `spin` opened.
- **The laptop has to be awake.** Plugged in, it stays up. On battery it goes to sleep and everything freezes.

## What you get

- Each tab runs Windows PowerShell with `claude --name b9-N` in the folder you ran `spin` from. When you `/exit` Claude, the tab stays open at a PowerShell prompt.
- All the tabs for a prefix go into one Terminal window named after it. Run `spin b9` again later and the new tabs join that window.
- Tabs open 2 seconds apart, so they stay in order and the sessions don't all start at once.
- `B9` becomes `b9`. Chains match session names exactly, and ours are lowercase.

## How "next" works

Every open Claude session keeps a status file at `~\.claude\sessions\<pid>.json`, and its `name` field holds the session name. `spin` reads those files and picks one past the highest open `b9-N`. Closed sessions don't count, so with none open it starts at b9-1. That fits how chains work here: each new run starts its numbering over.

## When it refuses

- **You're in your home folder.** A session started there gets the wrong project memory, so `cd` into the project.
- **The prefix doesn't start with a letter**, or has something besides letters, digits and dashes.
- **You ask for more than 20 tabs at once.** That catches typing 90 when you meant 9.

## Why each tab gets a fresh environment

`spin` asks Terminal for a fresh environment in every tab (`new-tab --reloadEnvironment`), so each tab starts the way one you open by hand does. Without it, a `spin` run from inside a Claude session (when Claude runs it for you) handed that session's markers to every new session. Measured 2026-11-24: the new sessions warned "Transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION marker", wrote no status file, and shared the parent's messaging connection. Don't remove that flag.

## Install

`spin.ps1` does the work. `spin.cmd` is the command you type, and it just runs `spin.ps1`. Put a copy of the launcher on PATH:

```powershell
Copy-Item ~\ai-learning-journey\tools\spin\spin.cmd ~\.local\bin\
```

- Installing Claude Code puts `~\.local\bin` on PATH.
- The launcher runs `spin.ps1` by its full path with `-ExecutionPolicy Bypass`. That way the machine's PowerShell script policy, which stays at Windows' default (Restricted), doesn't need changing.
- Edits to `spin.ps1` take effect right away. Copy the launcher again only if `spin.cmd` itself changes.
- On a machine whose username isn't `brigg`, fix the path inside the copy.
- Restoring a dead machine: `~\.claude\RESTORE.md`, step 10c.

It needs Windows Terminal (1.25 on this laptop) and Windows PowerShell.
