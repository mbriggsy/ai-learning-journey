---
title: A tool a gate or a start step names must live where the backups reach — the laptop's death took every tool the TODO still pointed at, because session folders are not backed up
date: 2026-11-19
phase: The laptop change (the Dell's death, 2026-11-19)
modules: [TODO.md, scripts/, docs/]
tags: [backups, session-folder, tools, gate-tools, records, laptop-death, durability, repo-is-the-archive]
---

## Problem

When the Dell died (2026-11-19), every tool and record kept in the session folder went with it: the date-route sweep,
the per-key idcheck and their baselines, the re-anchor classifier a gate's own step names, every walk panel's
`CHAIR-NOTES.md`, the line probe. The TODO went on pointing at them, and the next sessions found the paths empty. One
session later a new gate tool went into the same unbacked folder before this lesson was written down.

## Root Cause

The config backup (the private `claude-config` repo) covers `~/.claude`'s allowlist, never the per-session folders
under it, and the project repo held only what someone committed. A session folder feels durable because it outlives
the session, but it lives on one disk.

## Fix

Rebuild what was lost on demand (the sweep and idcheck before the next engine commit), and move every tool a gate or a
START HERE step names into the repo, or into the backed-up config. A record a later step reads goes into the repo the
day it is made.

## Key Insight

Durability is decided by the backup's scope, not by how long a file has sat somewhere. Before placing a tool or a
record a later session will need, ask "is this inside the repo or the backed-up config?"; if not, it is scratch, and
nothing may point at it.

## Also Applies To

- A walk's raw captures that a later card or review quotes.
- Measurement scripts whose numbers a doc records (keep the script beside the doc that cites it).
- Scratchpad files: they vanish on reboot or cleanup by design; never cite one.
