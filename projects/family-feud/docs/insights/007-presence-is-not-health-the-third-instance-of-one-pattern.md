---
title: Three different green lights, none of which checked the thing that mattered
date: 2026-08-07
phase: machinery-rebuild
modules: [newsletter/feud_mule.ps1, scripts/install-mule.ps1]
tags: [health-check, liveness, monitoring, silent-failure, scheduled-tasks, rss]
---

## Problem

[`002`](002-a-frozen-success-code-is-indistinguishable-from-a-healthy-one.md) recorded a scheduled
task reporting `Last Result: 0` for hours after it stopped doing anything. That read as a one-off.

It is not. Two more instances of the identical shape surfaced this session, in two different
subsystems. Three makes it a project law rather than a war story.

## Root Cause

Each is a health signal that reports success for **something it never actually checked**.

**1. `Last Result: 0`** (002) — the exit code of the most recent run that *produced* one. A task
firing into a deleted path never produces a newer result, so the stale `0` stays on display.

**2. `NumberOfMissedRuns`** — read `0` on the mule despite two demonstrably missing runs in
`mule_log.txt` the same day. `install-mule.ps1` re-registers with `-Force`, and that resets the
counter. The field is honest about what it measures; it just isn't measuring what it looks like.

**3. `mule_status.json` reporting 10/10 ok** — `Fetch-Source` validates `size > 50` and nothing
else. `rss_nbc_edge.xml` is an **813,039-byte HTML `SectionPage`** that fails XML parse at line 11
with zero `<item>` elements. It is enormous, so it passes. The status file has been reporting green
for the feed *specifically chosen for player news*, while the other four parse fine:

```
rss_nbc_edge   FAILS  ParseError: not well-formed   (813,039 bytes)
rss_cbs_nfl    36 items · rss_yahoo_nfl 50 · rss_espn_nfl 23 · rss_rotowire 5
```

## Fix

002's fix was to distrust the exit code and read the **cargo timestamp** instead. That generalizes:
validate the property the *consumer* depends on, not a proxy for it. The mule must parse each feed
and count items (U10 in the rebuild plan); a byte count is not a feed.

The one signal that has survived every instance so far is **output freshness** — `mule_status.json`'s
`run_at`. It was also the only signal that correctly diagnosed a power cut mid-session: task
`Ready`, `Last Result: 0`, and cargo 131 minutes stale.

## Key Insight

**Presence is not health. Bytes are not parseability. An exit code is not a heartbeat.**

A health check inherits its credibility from what it *measures*, not from where it *sits*. The
failure is always the same: something cheap stands in for something meaningful, and the cheap thing
keeps succeeding after the meaningful thing stops.

The diagnostic question, before trusting any green light in this project: **what exactly would have
to break for this to go red — and is that the same as the thing I care about breaking?** For all
three above, the answer was no.

Corollary worth its own line: **a signal that cannot go stale cannot prove liveness.** Anything
monotonic, cached, or reset-on-reconfigure (exit codes, counters, "Ready" states) is a status, not
a heartbeat. Prefer a timestamp you can subtract from `now`.

## Also Applies To

- The newsletter installer (U12) — mirror the mule's verify step, but assert on **output freshness**,
  never `Last Result` or `NumberOfMissedRuns`.
- The draft-state watcher (U9): "the mule ran" must not be taken to mean "the draft cargo is
  current."
- The board schema gate (U4) — the same trap in a different costume. A gate that only samples the
  top of the board is a `size > 50` check: it passes, and it means nothing.
