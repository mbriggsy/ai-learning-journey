---
title: ESLint "engine purity" rules leak — global objects, dynamic import, eval, and .mts files bypass the obvious bans
date: 2026-06-05
phase: P1·U0
modules: [eslint.config.js]
tags: [eslint, engine-purity, determinism, no-restricted-globals, no-restricted-imports, layer-boundaries]
---

## Problem
An ESLint config meant to guarantee `src/engine/**` is pure (no entropy/clock/env, no cross-layer imports) passed obvious cases, but an adversarial `.mts` probe slipped multiple real violations through.

## Root Cause
- `no-restricted-globals: [Date, crypto, …]` + `no-restricted-properties: Math.random` miss **member access via the global object**: `self.crypto.getRandomValues()` / `globalThis.Math.random()`. In a Web Worker `self` IS the global, so the engine worker can read entropy unflagged.
- `no-restricted-imports` only checks **static** imports — `await import('@crypto/x')` bypasses the layer boundary.
- The glob `src/engine/**/*.ts` doesn't match `.mts`/`.cts` — an engine module in those extensions escapes ALL rules.
- `eval` / `new Function` were unbanned.
- Layer-ban globs `@layer/*` + a depth-capped `../../../../layer/*` miss `@layer/sub/deep` and deeper relative ladders.

## Fix
- Add `globalThis`, `self`, `window` to `no-restricted-globals` (ban the global OBJECTS, not just named globals).
- `no-restricted-syntax: [{ selector: 'ImportExpression' }]` to ban dynamic import in the pure layer.
- Broaden globs to `**/*.{ts,mts,cts,tsx}`.
- Add `no-eval` + `no-new-func`.
- Replace layer-ban globs with a `no-restricted-imports` **regex** (supported in core ESLint): `^(@(layers)/|(\.\./)+(layers)/)` — depth- AND segment-agnostic, and (unlike `**/layer/**`) never false-matches a node_module.

## Key Insight
A "purity" lint is only as strong as its weakest reach-around. Prove it with a **planted-positive probe** that tries every bypass (global-object member access, dynamic import, alternate file extensions, deep subpaths) — a green lint on naive cases is not evidence the boundary holds.

## Also Applies To
Any "this layer must not touch X" lint; worker/isolate code where `self`/`globalThis` is the global; monorepo layer-boundary enforcement.
