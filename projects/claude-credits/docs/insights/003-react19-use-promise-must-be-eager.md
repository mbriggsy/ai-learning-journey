---
title: React 19 use(promise) warns "uncached promise" when the module promise is created lazily in render
date: 2026-05-25
phase: Phase 2 — runtime data layer
modules: [src/data/stats-resource.ts, src/data/StatsProvider.tsx]
tags: [react-19, use-hook, suspense, promise-cache, strictmode, runtime-only-bug]
---

## Problem

The data layer fetched `stats.json` through React 19's `use(promise)` + Suspense.
It rendered correctly and typechecked clean, but dev console threw:
`A component was suspended by an uncached promise. Creating promises inside a
Client Component or hook is not yet supported, except via a Suspense-compatible
library or framework.`

## Root Cause

The plan's caching pattern was a module-level **lazy** promise:

```ts
let p: Promise<T> | undefined
function getStatsPromise() { if (!p) p = fetch(...).then(...); return p }
```

`use(getStatsPromise())` is called inside `StatsProvider`'s render. On the FIRST
render `p` is undefined, so the `fetch()` promise is **created during render**.
React 19 can't treat a promise born in render as cached (a re-render could mint a
different one), so it warns — even though the module-level `let` means every
*subsequent* render reuses it. Lazy-in-render ≠ cached, as far as `use()` is concerned.

## Fix

Create the promise **eagerly at module load**, before any component renders:

```ts
let statsPromise = load()                 // runs once, at import — never in render
export function getStatsPromise() { return statsPromise }
export function resetStatsPromise() { statsPromise = load() }  // retry recreates eagerly
```

The eager `reset()` (recreate, not set-to-undefined) keeps the error-boundary
"Try again" path warning-free too. Bonus: the fetch now starts at app boot, earlier.

## Key Insight

`use(promise)` wants a promise that exists **before** the render that consumes it.
A module-level `let` is necessary but **not sufficient** — if its first assignment
happens *inside* render (lazy init), `use()` still sees a render-created promise and
warns. Initialize at module top-level. **And this class of bug is runtime-only:**
typecheck is green and the lazy pattern looks correct on paper — only an eye on the
dev console catches it.

## Also Applies To

- Any `use(promise)` / `use(context)` Suspense data source (route loaders, resource caches).
- StrictMode double-invoke in general: a module-level singleton survives it, but only
  if created at module-eval time, not first-call time.
- The broader rule: "module-level cache" claims need a runtime check, not just a read.
