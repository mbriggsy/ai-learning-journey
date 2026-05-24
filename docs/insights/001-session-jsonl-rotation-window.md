---
title: Claude Code session JSONL transcripts rotate after ~30 days — disk tallies are window-bounded, not lifetime
date: 2026-05-22
phase: n/a (cross-cutting tooling insight)
modules: []
tags: [claude-code, session-history, jsonl, token-accounting, measurement, factual-claims]
---

## Problem

Asked "how many tokens have we consumed through this journey?" — first instinct was to tally `~/.claude/projects/<slug>/*.jsonl` across all 16 project slugs related to our work and present the sum as a lifetime total. Numbers came out to ~12.04B tokens across 149 sessions / 44,200 assistant turns. Would have shipped that as a lifetime figure.

Sanity check on date range before publishing caught it:
- Earliest timestamp across ALL transcripts: `2026-04-22T17:49:27Z`
- Latest timestamp across ALL transcripts: `2026-05-23T01:49:28Z`
- Window: **exactly ~31 days**

Yet many project slugs existed for work that predates the window by months: racer v01-v04 (built Feb-Mar 2026), UMB (Mar 2026), Hide-and-Seek (shelved Apr 3), Do Not Disturb (shelved Apr 5), maximum overdrive (private/), mission control (private/), undercover mob boss (private/). All had directories under `~/.claude/projects/` — all had ZERO session JSONL files.

So the 12B number is a one-month FLOOR. The lifetime total is meaningfully larger and unrecoverable from disk.

## Root Cause

Claude Code session transcripts persist on disk only for a bounded retention window (empirically ~30 days as of 2026-05-22). Older sessions are pruned but the project slug directory survives, creating a silent gap. There's no "this directory has been emptied" marker — `ls` shows the directory exists, `glob *.jsonl` returns nothing, and a naive tally just produces a smaller-than-expected (but plausible-looking) number that the reader assumes is complete.

The failure mode this enables: a confidently-stated lifetime figure that's actually a one-month figure, with no caveat. Falls squarely into [[feedback-claude-failure-modes.md]]: factual claim pulled from a partial source treated as complete.

## Fix

Before tallying anything from session JSONLs, **always extract min/max timestamps** and state the window explicitly in the response. Frame totals as "in the window [start → end]" or "floor since [start date]" — never as "lifetime" / "all-time" / "ever."

If the user asks for a lifetime figure and only a window is recoverable, say so directly: "Disk only holds ~30 days; here's the floor for that window, the true lifetime is meaningfully larger but unrecoverable."

## Key Insight

**Any tally from a rotating log is a window measurement, not a total.** The window is invisible unless you measure it. The trap: when the truncation removes whole files (rather than truncating individual files), there's no obvious "data is missing" signal — the math just adds up to a number that looks plausible.

Generalizes: same shape applies to any time-bounded telemetry — Cloudflare Workers logs (3-day retention), most cloud platform free-tier logs, git reflog (90 days), npm install caches, browser History, etc. Whenever the answer to "what's the total of X over the history of this project" comes from a log, the first move is `min(timestamp), max(timestamp)`.

## Also Applies To

- **Cloudflare Workers tail logs** (BURNED uses these): bounded retention, can't reconstruct lifetime request counts from disk
- **Any "show me everything we did" question** sourced from session history, git reflog, browser cache, or platform telemetry — verify the window before stating a total
- **Cost reconstruction** — billing dashboards have their own retention; don't infer lifetime spend from a recent-window slice
- **Schema reference** for future Claude Code transcript parsing: `message.usage` block carries `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. Cache reads typically dominate ~97% of input volume — separate them in any report so the reader can see "billed input" vs "cache reuse."
