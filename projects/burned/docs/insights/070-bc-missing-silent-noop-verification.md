---
title: A verification scan reported false-clean because bc is absent on Windows git-bash
date: 2026-05-29
phase: origin-trailer v2 (VO QA)
modules: [videos/origin-trailer (shell scans)]
tags: [windows, git-bash, bc, awk, verification, silent-failure, false-green, shell]
---

## Problem

A bash scan meant to flag hot-tailed audio cues reported "all 24 clean." It
was wrong — 4 cues were hot-tailed. The all-clear was reported with
confidence and nearly acted on as truth.

## Root Cause

The float comparison used `echo "$peak > -12" | bc -l`, but `bc` is not
installed on this Windows git-bash. Every invocation failed; the error was
swallowed by `2>/dev/null`, so `$over` came back empty, `if [ "$over" = "1" ]`
never matched, and the loop printed nothing. An empty result read as "no
hits" instead of "the comparison never ran."

## Fix

Use `awk` (always present) for float comparison in git-bash on Windows:

```bash
awk -v p="$peak" 'BEGIN{ if (p+0 > -12) print "HOT" }'
```

Re-ran the scan; it correctly flagged all 4 cues.

## Key Insight

A verification that can **silently no-op is worse than no verification** — it
manufactures false confidence. When a gate/scan reports all-clear, confirm the
comparison primitive actually executed (test it against a known-positive
case first). Never pipe to a maybe-missing tool AND swallow its stderr: a
"command not found" must fail loud, not vanish into an empty string that
looks like success.

## Also Applies To

- Any Windows-git-bash gate using `bc`, `seq`, `gdate`, `realpath`, or other
  not-always-present coreutils — prefer `awk`/Node/PowerShell.
- Any `... 2>/dev/null` that hides a missing-tool error.
- CI / pre-commit scans: a green that could be a no-op needs a self-test that
  asserts it catches a planted failure.
