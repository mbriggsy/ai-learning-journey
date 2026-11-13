# Landmines

The known traps in the tools and setup behind the playbook's work, by area. Each entry is the rule, then where it was measured or where the detail lives. A trap whose cause is fixed is deleted, never kept as history. The [TODO](../TODO.md) keeps only the ones that bite its next step.

## The CE plugin

- **A session keeps the CE version it started with,** and the `~/.claude/CLAUDE.md` and memory index it loaded, which its helper agents get too. The plugin updates itself, so start a plan or review step in a fresh session, and restart old sessions at a natural stop, never a busy one mid-work.
- **Never say "deepen the plan" about a finished plan.** It switches CE to asking Briggsy to accept or reject each helper's findings. To re-deepen, run ce-plan on the plan's path and say "judge and apply the findings yourself" (memory `reference-ce-plan-deepen-fast-path`). That recipe is untested: expect ce-plan to ask whether to update the plan in place, answer it yourself, and check the run really scored the sections.
- **A Workflow that adds extra helpers to a deepen or a check** finds CE's prompt files through `~/.claude/plugins/installed_plugins.json`, never a version-numbered path.

## Workflow and Agent tools

- **The Workflow tool takes `scriptPath` only from the working folder or the session's scratchpad,** and runs the script in a Bun-hosted vm: no Bun, fetch or require; `import()` refused when the script is parsed; string data holding `import('x')` or `Date.now()` read as data; `args` a plain global, undefined when none is passed (measured 2026-11-09 and 2026-11-12).
- **Every Workflow helper is shown the session's latest typed message** ahead of its task (a playbook-3 helper reported it arrives under a header saying it outranks the task text). Before a blind fan-out (judges, readers, writers), square that message with the task: a prompt line telling helpers to disregard it does not work. Only a message Briggsy typed is relayed (a peer session's message and a skill body never are), and a Workflow launched from a notification turn relays nothing. Never word a prompt as if a message is shown; to see what a helper received, read the first user row of its own transcript (108 helper transcripts, 2026-11-01; nine more, 2026-11-11).
- **A Workflow agent runs in the session's working folder; `agent()` has no folder option.** Give it absolute paths, and tell it not to search the live `projects/*/docs/insights/` when it works on a copy.
- **A saved Workflow result is one line of JSON, and the Read tool refuses it** (`~/.claude/projects/<slug>/<session-id>/workflows/<run-id>.json`). The script's whole text sits ahead of `args` and `result` (the hybrid plan's dry runs left files of 133,206 to 193,468 bytes, and Read refused a 115,795-byte one). Pull the part you need with a script, never Read. In the launching session the same result also sits pretty-printed, without the script, in the output file its completion notice names (measured 2026-11-11).

## Write, Bash and Grep tools

- **In a Write or Edit tool call, a `\uXXXX` in the content arrives as the character itself** (the call's text is JSON), and doubling the backslash leaves two in the file. To keep a file ASCII, write `String.fromCharCode(0x2014)` in code; to put the escape itself in a file, build it in a script from `String.fromCharCode(92)`; write a non-ASCII range as `[^\x00-\x7e]`, and build test text with `String.fromCodePoint`. Never retype a line that holds such an escape: move it with a script that copies its bytes (measured 2026-11-04).
- **The Bash tool halves a doubled backslash, even inside a quoted heredoc** (`<<'EOF'`): a script's `\\(` arrived as `\(`, and a test regex lost both escapes and passed by accident (playbook-4, 2026-11-05). Write any script that holds a backslash with the Write tool, and read back the lines it changed.
- **The Grep tool finds nothing in a folder under `~/.claude/projects/`, the memory folder aside.** `~/.claude` is the config repo and its ignore file excludes that tree; Grep honors the ignore for a folder but not for a file named alone. Job folders, run records, saved results and transcripts all sit there: Glob the folder, then Grep each file by its own path, and never read "No matches found" there as absence (measured 2026-11-11).

## Windows and git

- **This repo is public.** Write paths as `~/...`, a project folder as `<slug>` and ids as `<id>`; screenshots go in the ignored `playbook/temp/`.
- **A peer's unpushed commit under yours:** pushing `main` publishes it too. Commit path-scoped (`git commit -- <paths>`) and check `git log origin/main..HEAD` before a push.
- **Git Bash rewrites a leading-slash argument, even for git:** `git sparse-checkout set /projects/x/` stored `C:/Program Files/Git/projects/x/`. Set `MSYS_NO_PATHCONV=1` on any shell-launched command that takes such an argument.
- **Git on Windows can't open a path past 260 characters** ("Filename too long", exit 128) in a repository where `core.longpaths` is unset, while Node can. It is unset at the user and system level, so a repository made fresh (a test's temp repository) has none; the live repo's own `.git/config` sets it. A tool that hands git a path deep under `~/.claude/projects/<long slug>/` gives git the bytes on stdin instead (`hash-object --stdin --path=`, `commit -F -`), or sets `core.longpaths` in the copy (measured 2026-11-11).
- **A run pinned to the P-cores reports exit code 0 when its tests fail.** The launcher, PowerShell `cmd /c "start "" /b /wait /affinity FFF node --test ..."` (memory `reference-hybrid-cpu-ecore-confinement`), returns its own 0. Read the run's own summary lines (`ℹ fail 0`, `ℹ tests`, `ℹ pass`), and state a test count only from them (the Back Nine, b9-1, 2026-11-08).

## Config, hooks and junctions

- **Never freeze or pin a version** (memory `feedback-upgrades-always-approved`).
- **Never restore `~/.claude/settings.json` whole from an old commit.** The 10-19 snapshot (config repo `22015c5`) has 15 garbled dashes and no ultracode. Edit it key by key.
- **Auto mode (Claude Code's permission setting) blocks removing a safety check, an irreversible delete, and writes to Claude Code's own config, without Briggsy's own words.** Name every path in the sentence you draft for him: a delete command that bundles a path he didn't name gets refused.
- **Removing a hook that refuses calls when its script is missing** (`"onFailure": "block"`): take its `settings.json` entry out first, check a call in this session still runs, then delete the script. A session whose file watcher missed the edit refuses every matching call until it restarts.
- **`~/.claude/skills/brief`, `distill`, `squeaky-clean`, `ultramode-code-review` and `window` are junctions into `projects/skills/`.** A saved edit is live in every session at once, mid-job included. Build a candidate beside the live file under another name (`SKILL.next.md`) and swap it in only after it is proven.
- **The window watcher hook also reads `WINDOW_TEST_TOKENS`** (`projects/skills/window/context-watch.mjs`, registered in `~/.claude/settings.json` on every prompt and every tool batch). A session started with the variable set at 400,000 or more gets that test number's window line, labeled TEST, at its first prompt: from 600,000 up it is told to "wrap up and start a fresh terminal" before it has done anything. A watcher line is a notice, never a gate reading: only the line `window.mjs` prints goes to a gate.

## Meters and cost

- **The usage meters live in `~/.claude/statusline-meters.json`,** rewritten by `~/.claude/statusline.py` on each refresh (config repo `2c78758`). `seven_day` is the meter to read; `five_hour` read null all evening on this account.
- **Read the meter before and after every fan-out, and price the next one from the last one measured.** Estimates made from a helper count ran low by about half; [insight 026](insights/026-price-a-fan-out-from-the-last-one-measured-read-the-rules-own-file-before-picking-a-helpers-model-and-have-a-long-seat-write-as-it-goes.md) has the measurements.

## Sessions

- **A test session started from a Claude session's shell inherits that session's environment.** Strip a variable (`env -u NAME claude -p ...`) before claiming a fresh session lacks it.
- **A session can run with no transcript on disk.** playbook-2 (2026-10-31) had no `<session-id>.jsonl` under `~/.claude/projects/<project-folder>/` and no `~/.claude/sessions/` file all session, so `/window` printed "no transcript for this session" and squeaky's transcript grep had nothing to read; the cause is not traced. Run a sizable step in a session `/window` can read.
