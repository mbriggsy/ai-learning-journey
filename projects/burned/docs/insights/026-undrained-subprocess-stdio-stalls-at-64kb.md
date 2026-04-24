---
title: "Undrained Node subprocess stdio pipes stall the child at ~64 KB of output"
date: 2026-04-24
phase: playtest-harness Phase 3
modules: [scripts/playtest/lib/server-controller.ts]
tags: [node, child-process, subprocess, stdio, backpressure, pipe-buffer]
---

## Problem

Unit 3's `startServers` spawned wrangler with `stdio: ['ignore', 'pipe', 'pipe']` and never attached `'data'` listeners. Unit tests passed (they used a mocked spawn). Live runs: wrangler booted, served ~2-3 requests, then silently stopped responding. `/health` polling hung until timeout.

## Root Cause

When `spawn` is called with `stdio: 'pipe'` for a channel, Node creates an OS-level pipe between the parent and child. If the parent never reads from that pipe, it fills up. Once full (OS-dependent, typically **~64 KB on Linux, ~8 KB on Windows**), the child's `write()` calls to stdout/stderr **block** — the kernel refuses further writes until the parent drains the buffer.

Wrangler `dev` produces verbose stdout (per-request logs, compile messages, hot-reload notifications). Even at a few KB per request, the pipe buffer fills quickly. Once full, wrangler's next `console.log` call blocks — and because wrangler is single-threaded JS running inside the wrangler process, blocking on stdout blocks the entire event loop, including the `fetch` handler. The server appears to hang.

It's a classic Node footgun that's easy to miss because:
- Small-output subprocesses (most CLI tools) never hit the limit.
- Unit tests with mocked spawn bypass the OS pipe entirely.
- The failure mode — silent stall rather than an error — looks like "server is slow" or "server crashed," not "I forgot to drain stdio."

## Fix

Two safe patterns:
1. **Drain to the parent's output:** attach `.on('data', buf => process.stderr.write(prefix + buf))` to both `child.stdout` and `child.stderr`. Server-controller does this now with `[wrangler]` / `[vite]` prefixes.
2. **Or `stdio: 'ignore'`:** tell the OS to route the child's output to `/dev/null` directly, skipping the pipe entirely. Use when you don't need to surface subprocess logs.

`inherit` also works (child writes directly to parent's stdio FDs, no pipe between them), but loses prefix tagging.

## Key Insight

**`stdio: 'pipe'` without a drain is a timebomb scaled to child verbosity.** A silent 3-minute CI subprocess might never hit the limit; a long-running dev server will stall within minutes. The correct default for spawn calls you plan to keep alive is either `'ignore'` or `'pipe' + drain`. Never `'pipe'` alone.

Specifically for dev-server wrappers: if you see "the server boots and serves a handful of requests then hangs," check for undrained child stdio FIRST. It's the cheapest root-cause to rule out and the most commonly overlooked.

## Also Applies To

- Any long-running subprocess with logging: dev servers, file watchers, compilers in watch mode, database daemons started for tests.
- CI runners that spawn `node` / `tsx` / `pnpm` children and later diagnose "builds hang around step N."
- Playwright tests that spawn a server via `globalSetup` and forget to drain — same pattern.
- Explicitly NOT the issue for short-lived subprocesses (`execFile`-style one-shot children that complete in <1 second), where the pipe is drained on child exit via the parent's cleanup path.
