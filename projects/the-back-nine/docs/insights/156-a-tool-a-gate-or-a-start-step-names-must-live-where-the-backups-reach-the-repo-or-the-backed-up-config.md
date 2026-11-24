---
title: A tool a gate or a start step names must live where the backups reach — the laptop's death took every tool the TODO still pointed at, because session folders are not backed up
date: 2026-11-19
phase: The laptop change (the Dell's death, 2026-11-19)
modules: [TODO.md, scripts/, docs/]
tags: [backups, session-folder, tools, gate-tools, records, laptop-death, durability, repo-is-the-archive, session-journal, council-words, git-archive, walk-record, card-shorthand]
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

## Extended (2026-11-23): a council's exact words in a session journal, and how a lost walk record comes back

**Words that live only in a session journal live on one disk.** The form council's worked examples (b9-2, 2026-11-16)
sat in the chair's deliberation text, the `agent-*.jsonl` journal outside the repo, on a drive that crashed four times
that day. The structured verdict never carried them, because the size law ([[084]]) keeps essays out of the returned
JSON. Land a council's exact words (worked examples, a flip condition's every conjunct) in a repo spec in the same
session.

**A lost walk record is rebuilt from the walked commit, never from the card's text.** Walk 9's panel notes died with
the Dell, leaving U3's low findings as one-line labels on the card. b9-3 (2026-11-20) ran the Caddie harness on a frozen
`git archive` of the walked commit (`8ba67574`) with `node_modules` junctioned in (fonts fall outside Vite's allow list
there, so text only; delete the junction ALONE before removing the copy) and saw what the seats had read. It
overturned the literal reading: the card's '"this answer" on … step 14' named a noun problem on two hosts, since step 14
had only ever said "Your answer". A card's quote can be shorthand, so before fixing a lost finding, re-capture the tree
that was walked ([[150]] has the same archive move for an old build's tests).
