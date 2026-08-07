---
title: The scheduled job reported success for hours after it stopped doing anything
date: 2026-08-07
phase: cowork-migration
modules: [newsletter/feud_mule.ps1, scripts/install-mule.ps1]
tags: [scheduled-tasks, windows, health-check, liveness, monitoring, silent-failure]
---

## Problem

The "Family Feud Mule" hourly task reported `Last Result: 0` — success. It had been fetching
nothing for hours. The project folder had moved that morning, and the task's stored absolute
`-File` path pointed at a script that no longer existed.

`schtasks /Query` showed a healthy job. Every field looked right.

## Root Cause

`Last Result` is not a heartbeat. It is the exit code of **the most recent run that produced one**,
and it persists indefinitely. The final pre-move run at 10:29 succeeded and wrote 0. After the move
the task still fired hourly, but pointing at a deleted file it never produced a *newer* result — so
the stale 0 stayed on display.

A dead job and a healthy job render identically. The signal that would have distinguished them —
the freshness of the output — was in a different file entirely (`mule_status.json`'s `run_at`), and
nothing pointed from one to the other.

The deeper cause was two hardcoded copies of the same absolute path: one in the script's `$base`,
one in the task registration. A folder move invalidated both, and neither could report that.

## Fix

- Delete the hardcoding rather than update it. The script derives its paths from `$PSScriptRoot`;
  `install-mule.ps1` derives the task's `-File` argument from *its own* location. Re-running the
  installer is now the entire repair after any move — no path is ever retyped.
- Make the installer **prove** the job rather than register it: force a run, wait for a real exit
  code, read the output file back, and throw if the result isn't 0 or the cargo is missing.
- Write the trap into the landmines doc: *`Last Result: 0` is not proof of life — check the cargo
  timestamp.*

## Key Insight

**A status field that only updates on success cannot report failure.** Any health check whose
"green" state is *the absence of a new bad value* will show green forever once the job stops
running at all.

Liveness must be proven by **freshness of output**, not by a status code: compare a timestamp the
work itself wrote against the clock. "It last succeeded" and "it is succeeding" are different
claims, and most monitoring surfaces only answer the first while appearing to answer the second.

## Also Applies To

- cron jobs whose failures go to an unread mailbox, or that silently no-op on a missing input
- CI badges pinned to the last completed run after the trigger itself broke
- Any absolute path stored outside version control: scheduled tasks, systemd units, launchd plists,
  IDE run configs, deploy hooks — a move breaks them and nothing announces it
- Cache/ETL pipelines that "succeed" over an empty input set
- Heartbeats derived from process liveness rather than from work completed

---

**This was the first of three.** Two more instances of the identical shape turned up on 2026-08-07
— `NumberOfMissedRuns` reset by the installer's own `-Force`, and the mule reporting a feed `ok`
because it only checks `size > 50`. See
[`007`](007-presence-is-not-health-the-third-instance-of-one-pattern.md), which generalizes this
from a war story into a rule for writing any health check in this project.
