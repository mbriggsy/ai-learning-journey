---
title: A rejected React.lazy chunk import is CACHED for the session and Suspense has no error arm — offline chunk-miss blank-screens the app stickily
date: 2026-07-02
phase: P2 (U8 — decrypt-on-return SLICE 2; found by the slice-2 ultramode review)
modules: [src/ui/App.tsx, src/ui/ErrorBoundary.tsx]
tags: [react-lazy, suspense, error-boundary, offline, pwa, chunk-load, service-worker, blank-screen]
---

## Problem

The entry tree mounts three `React.lazy` chunks (IntakeApp / RecoveryFlow / RestoreFlow) under
`<Suspense fallback={null}>` with no ErrorBoundary anywhere. On an offline device whose SW cache
evicted a chunk (storage pressure, or version skew after an update), the lazy `import()` rejects
→ Suspense re-throws → React unmounts the ENTIRE app to a blank white screen. Worst case is the
exact surface the slice exists for: the survivor's restore-from-backup door. And `React.lazy`
CACHES the rejected promise, so every re-render re-throws — the blank screen is sticky for the
session, not a transient flicker.

## Root Cause

Two asymmetries hid it. (1) Suspense handles only the PENDING state of a lazy import; rejection
is an ordinary render throw that needs an ErrorBoundary — a `fallback` prop reads like it covers
"the chunk isn't here" but covers only "not YET here". (2) The offline chunk-miss failure mode
WAS audited — for the handler-level dynamic `import('./vaultSession')` calls, which all have
calm catches — but the component-level lazy imports of the same split graph are a different
import site with no catch, and the audit didn't transfer (the [[010]]/[[020]] shape: a lesson
encoded against one site of a mechanism doesn't protect the next site).

## Fix

`AppErrorBoundary` (a ~30-line class component) wrapping App's entry tree: on any render throw it
renders the calm ceremony chrome — app title, `unlockGeneric` (never "damaged"), and a "Reload
the page" button (`window.location.reload()` re-runs the probe AND retries the chunk fetch; the
vault on disk is untouched by any render crash). jsdom-tested with a throwing child: calm panel,
never a blank unmount.

## Key Insight

**Every `React.lazy` in the tree is an uncaught `await import()` unless an ErrorBoundary sits
above it — `Suspense fallback` is not an error arm, and the rejection is sticky.** In an
offline-first PWA the rejecting import is not an edge case, it is a designed-for environment
(SW cache + storage pressure + update skew). When auditing "what happens if this dynamic import
fails?", enumerate BOTH import sites of a split graph: the handler-level `import()` you can
try/catch, and the component-level `lazy()` only a boundary can catch.

## Also Applies To

- Any code-split route/dialog in a PWA (the pattern is app-wide here — IntakeApp was equally
  unprotected; one top-level boundary covers all three).
- Version-skew deploys generally: an old HTML referencing hashed chunk names that no longer
  exist on the server — same rejection, same sticky blank screen without a boundary.
- The boundary's fallback copy is itself an honesty surface: a chunk-load failure must read as
  "couldn't load — reload", never as data damage (the calm-but-wrong direction).
