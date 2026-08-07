---
title: A rename failed with "Permission denied" and every app we closed was innocent
date: 2026-08-07
phase: cowork-migration
modules: [project-root]
tags: [windows, filesystem, rename, cwd, claude-code, diagnosis, control-test]
---

## Problem

`git mv "projects/family feud" projects/family-feud` failed with `Permission denied`. Retried after
closing File Explorer (navigated away via the Shell COM API). Failed. Retried after the user closed
Claude Desktop — a plausible suspect, since the project had been a *connected folder* there hours
earlier. Failed. Retried after he closed every application on the machine. Failed identically.

Meanwhile `Rename-Item` on a **subdirectory** of the same folder succeeded instantly.

## Root Cause

On Windows a process's current working directory is held as an open directory handle, and that
handle blocks rename and rmdir **on that directory itself** — but not on anything inside it. The
Claude Code session doing the work declared `...\projects\family feud` as its primary working
directory. It was standing on the thing it was trying to move.

No amount of closing *other* programs could help, because no other program was involved.

## Fix

Two parts, and the diagnosis mattered more than either.

**Diagnosis — a control test, not elimination.** Closing apps one at a time is elimination, and
elimination never terminates: there is always one more thing to close. Instead, create a brand-new
folder in the *same parent* and rename it. It succeeded in the same instant the target returned
"in use." Same parent, same permissions, same disk, opposite result — so the difference is a
property of the folder, not of the environment. That single test replaced an unbounded search.

**Workaround — move the contents, not the container.** Since only the top directory is pinned,
`Move-Item` every child into a newly created sibling. Git reports the whole thing as pure renames.
The emptied husk survives (rmdir is blocked by the same handle) and is deleted by any later session
not rooted inside it.

## Key Insight

**When a resource resists an operation, first prove the resource is special — don't start
eliminating suspects.** A control test on a known-good instance of the same kind of resource,
under the same conditions, converts an open-ended hunt into one bit of information.

The corollary is worth saying out loud: **a tool cannot always fix the environment it runs inside.**
Some operations are structurally unavailable from within, and no amount of cleverness substitutes
for doing them from outside. Recognizing that early is faster than being ingenious.

## Also Applies To

- Deleting or renaming a git worktree, venv, or `node_modules` while a shell or watcher sits in it
- "File in use" on Windows generally — the holder is often your own tooling, not a visible app
- Docker bind mounts and any daemon whose cwd is inside a volume being replaced
- Log rotation, database file swaps, and deploy scripts that `cd` into the directory they replace
- Any `EBUSY` / `EACCES` where the instinct is to close applications rather than ask what is special
