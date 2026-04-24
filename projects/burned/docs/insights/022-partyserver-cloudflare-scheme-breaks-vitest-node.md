---
title: "partyserver's `cloudflare:` module scheme makes `room.ts` unimportable in Vitest-Node tests"
date: 2026-04-24
phase: playtest-harness Phase 2
modules: [src/server/room.ts, src/server/health.ts]
tags: [testing, vitest, cloudflare-workers, partyserver, module-resolution, room-exports]
---

## Problem

Writing a Vitest test that imports `src/server/room.ts`'s default-export fetch handler fails at module-load time with:

```
Caused by: Error: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'cloudflare:'
{ code: 'ERR_UNSUPPORTED_ESM_URL_SCHEME' }
```

The error surfaces even when using `vi.mock('partyserver', ...)` with `importOriginal` — the mock's own `await importOriginal()` call runs the real module first, which transitively imports something like `cloudflare:workers`.

## Root Cause

`partyserver` internally imports from the `cloudflare:` URL scheme (the Workers runtime's native module protocol). Node's default ESM loader only recognizes `file:`, `data:`, and `node:`. `cloudflare:` is resolved by workerd at runtime but nowhere else — so any code path that forces Node to walk partyserver's import graph crashes before a single test runs.

`room.ts` imports `{ routePartykitRequest, Server } from 'partyserver'` at the top, so merely `import('./room')` (even via `await import()`) triggers the chain. There is no reasonable in-Node workaround: you can't partial-mock a module whose realization already failed, and fully stubbing partyserver means inventing a `Server` class compatible with `GameRoom extends Server`, which defeats the point of the test.

## Fix

Extract pure logic into its own module that does NOT import partyserver, then wire it into `room.ts`'s default export.

For Unit 1b (`GET /health`) this meant:
- `src/server/health.ts` exports `handleHealthRequest(request, env): Response | null` — no partyserver import, importable by Vitest-Node.
- `src/server/room.ts` imports `handleHealthRequest` and calls it before `routePartykitRequest`.
- `src/server/health.test.ts` tests the extracted function directly with plain `Request` / `Response` globals.

Runtime eyeball (`curl http://127.0.0.1:8787/health`) confirms the composed behaviour; the unit tests confirm the extracted contract.

## Key Insight

**Anything that must be testable in Vitest-Node cannot live inside `room.ts` or anything that imports from `'partyserver'`.** The Workers entry file is a quarantine zone — even type-only imports are fine, but any runtime import graph that reaches partyserver is poison to Node-pool tests.

This constraint compounds with the existing **room-exports landmine** (`room.ts` may only export the `GameRoom` class; any other named export crashes Wrangler at boot). Both push in the same direction but for different reasons:

- Room-exports landmine → helpers can't live inside `room.ts`
- Partyserver scheme → helpers can't even be imported alongside `room.ts` in tests

Net result: testable server logic MUST live in pure modules (`playtest.ts`, `health.ts`, `validation.ts`, `projection.ts`). `room.ts` is a thin wiring layer only.

The alternative (moving tests to `@cloudflare/vitest-pool-workers` / Miniflare) is heavier — new test pool, new config surface, slower runs — and not worth it for route handlers that can be expressed as pure `(Request, env) → Response | null`.

## Also Applies To

- Any future Worker-only integration (D1 bindings, KV, Queues) — route handlers that touch those bindings will face the same quarantine. Extract the pure logic, pass in the binding as a parameter.
- Adding any new `partyserver`-adjacent dependency (e.g. `partykit`, `hibernate`-style primitives) — assume the same `cloudflare:` transitive reach until proven otherwise.
- Any attempt to unit-test the composed default-export fetch handler. If you need composition-level coverage, do it via `curl` or a `scripts/smoke.ts` that spawns `wrangler dev` — not via Vitest-Node.
