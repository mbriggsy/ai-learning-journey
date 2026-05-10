---
title: "`wrangler dev` does not propagate Node process env to workerd — must use `--var` CLI flags"
date: 2026-04-24
modules: [scripts/playtest/lib/server-controller.ts, scripts/playtest/phase2-smoke.ts]
tags: [wrangler, cloudflare-workers, workerd, subprocess, env-vars, integration-testing]
---

## Problem

Unit 3 shipped with 31/31 green unit tests — every test verified the env map passed to `child_process.spawn('pnpm', ['dev:server'], { env })` contained `PLAYTEST_MODE=1` and `PLAYTEST_TOKEN=<t>`. Unit 7's first live self-test then hit `/health` and got `{ ok: true, playtest: false, version: 3 }`. Env map was right at spawn time; `playtest:false` on the wire means workerd never saw it.

## Root Cause

Wrangler's `dev` command does NOT forward the Node parent's env to the workerd runtime it spawns. Environment variables that must reach Worker code (via `env.KEY` in `fetch(req, env)`) must be declared either:
- **CLI:** `wrangler dev --var KEY:VALUE` (repeatable per key), OR
- **Config:** `wrangler.toml` / `wrangler.jsonc` `[vars]` section.

Node-level env is fine for wrangler ITSELF (wrangler CLI reads it), but the workerd child that runs the Worker bindings only sees what `--var` or `wrangler.toml` declared. This is documented in wrangler's docs but is easy to miss — Node's normal subprocess env-inheritance model makes the wrong behavior look right.

## Fix

Switched the spawn invocation from `pnpm dev:server` (env-based) to `pnpm exec wrangler dev --ip 0.0.0.0 --port 8787 --var PLAYTEST_MODE:1 --var PLAYTEST_TOKEN:<token>` (plus `--var PLAYTEST_GOD_ORIGINS:...` when configured). Mirrors the Phase 2 `scripts/playtest/phase2-smoke.ts` pattern (which had already learned this lesson and inlined the correct spawn — we just hadn't lifted it into `server-controller`).

Unit 3's tests now assert the `--var` flags are present in the spawn args. `buildServerEnv` retained for Node-side propagation (`DEBUG`, `NODE_ENV`, etc.), but a comment now warns that wrangler ignores it for binding purposes.

## Key Insight

**Unit tests on subprocess invocation construction prove nothing about whether the receiving process honors the construction.** The test "spawn was called with env={X: Y}" is green regardless of whether the receiving binary actually reads env. For subprocess integration, you MUST run the real subprocess at least once and verify end-to-end observable behavior (a `/health` probe, a binding readback, a side-effect you can measure). Otherwise you're testing the language of your invocation, not the semantics of the receiver.

Specifically for Cloudflare Workers development: if a Worker binding needs to reach workerd, it must be declared via `--var` or `wrangler.toml`. Node env is a quiet dead-end.

## Also Applies To

- Any child process whose env-to-runtime forwarding is non-default: Docker (`--env` vs `--env-file` vs the Dockerfile `ENV`), certain WASM runtimes, Deno's isolate model.
- Any framework that runs a "process-in-a-process" model where the outer tool consumes env but the inner runtime has its own declaration surface (`cargo run` vs the binary it builds; `deno run` with `--allow-env`; Electron main vs renderer).
- Future harness integrations against D1/KV/Queue bindings in playtest — `--var` pattern extends to `--kv`, `--d1`, etc.
