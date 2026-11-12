---
title: A file, a commit or a session is known by what only it has; a name, HEAD, a birth time or a session id each stands in for something else
date: 2026-11-12
phase: the plan step's own skill (U3's run record and its reviews)
modules: [projects/archive/skills/ultramode-plan/lib/run-record.mjs]
tags: [attribution, identity, authorship, inode, birth-time, ntfs, tunneling, edit-tool, head, git-log, empty-commit, session-id, resume, process, shared-checkout]
---

## Problem

In the one checkout every session shares, U3's run record had to say which files and commits a run made. Each shortcut credited the wrong thing:
- **A name.** The sweep counted any whole-path mention in a helper's shell command as authorship, so a `wc -l` on another session's new file moved that file out of the tree (3 of 3 verifiers).
- **A birth time.** Claude Code's Edit writes a new file (measured 2026-11-08: a new inode, born at the Edit's moment), so attribution by birth time credited an Edit with any file it touched, another session's included (round 2, 3 of 3 verifiers).
- **A path, days later.** A stuck stray's path can be emptied and filled again by another session, and NTFS gives a file made again within 15 seconds the old one's birth time (measured), though never its inode (round 2, 8 findings across 5 lenses).
- **HEAD.** A test's post-commit hook that commits again showed `rev-parse HEAD` reading another session's commit (F11). A path-limited log misses an empty commit (F1).
- **The time a step opened.** The record credited a stage to the CE version in force when the step opened, so a restart onto a new CE credited one stage to two commits and named a missing file the landed work never lacked (5 lenses).
- **A session id (unmeasured).** Per `claude --help`, `claude --resume` keeps the session id and only `--fork-session` makes a new one, while a background Workflow dies with its process. So "this session launched it, so it may still run" would wedge a resumed session forever. The two runs that would have measured it were cut on 2026-11-11.

## Root Cause

Each shortcut used a property that something else can share: many calls name a path, an Edit makes any file it touches new, NTFS reuses a birth time, HEAD is whoever committed last, a step's opening is not its work, and a session id outlives its process.

## Fix

- A writer is a call in whose time window the file was born, and an Edit counts as a writer only for a path a helper call also created.
- A retry re-identifies a file by its inode as well as its birth, never by path alone.
- A run finds its own commit by a record line only that commit carries, grepped over `<base>..HEAD`.
- Work is credited to the CE version in force when it ran.
- Liveness keys on the process (`CLAUDE_PID`), not the session (stated from `claude --help`, not measured).

The lean plan (2026-11-11) then cut the sweeps and restart handling that needed most of these; the lessons stand for any tool that attributes work.

## Key Insight

Identify a thing by a property only it has: its own content line, its inode together with its birth time, the process, the time the work happened. A name is a mention, HEAD is a position, a birth time can be reused, and a session id can outlive its process.

## Also Applies To

- "Who changed this file" from timestamps or mentions in logs.
- Deploy scripts that tag `HEAD` in a repo other jobs also commit to.
- Lock files and PID files that identify an owner by name or id alone.
