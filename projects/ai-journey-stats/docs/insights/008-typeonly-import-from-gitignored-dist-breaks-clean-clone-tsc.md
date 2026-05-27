---
title: A type-only import from a gitignored sibling dist passes locally + esbuild but TS2307-cascades on a clean clone
date: 2026-05-27
phase: 8 (deploy) / 9 (polish)
modules: [src/types.ts, scripts/refresh-stats.ts, vercel.json]
tags: [vercel, tsc, esbuild, monorepo, gitignore, clean-clone, type-only-import, build-command, ci]
---

## Problem

The first Vercel build failed with **14 TypeScript errors** — `TS2307 "Cannot find module
'../../../tools/project-metrics/dist/taxonomy.js'"` plus a storm of `TS7006` implicit-any and one
`TS2345`. Locally, `pnpm build`, `pnpm typecheck`, `pnpm test`, and the runtime were all green. The
errors only appeared on Vercel's clean clone.

## Root Cause

The site's data contract is re-exported **type-only** from the sibling tool's COMPILED output:
`src/types.ts` → `export type {…} from '../../../tools/project-metrics/dist/taxonomy.js'`. That
`dist/` is **gitignored**, so it does not exist on a fresh checkout. `tsc` needs the `.d.ts` to
resolve those type names; absent, the contract import throws TS2307 and every downstream consumer of
those now-unresolved types collapses to implicit-any (TS7006) — **one missing artifact, 14 errors.**
Locally it passed only because the tool had been built at some point, so `dist/` happened to exist.

Vercel ran `pnpm build` = `tsc --noEmit && vite build`. The `tsc` half is the sole failure point.

## Fix

Set `"buildCommand": "pnpm exec vite build"` in `vercel.json`. esbuild **erases** the `export type`
import entirely (it never becomes a runtime require), so `vite build` alone needs zero sibling-tool
build and produces an identical bundle. Keep `pnpm build` (with `tsc`) as the **local** gate, where
`dist/` exists. Proven by renaming `dist/` aside locally → reproduced the exact 14 errors → confirmed
`vite build` alone exits 0 → restored.

## Key Insight

A `export type` / `import type` from a **gitignored build artifact** is invisible to esbuild and the
runtime (erased), but **`tsc` still needs the declarations.** So local build, local `vite build`, and
production all pass — and *only* a clean-clone typecheck fails. The deploy/CI environment is the only
place that exposes it. Corollary: when N typecheck errors share one unresolved import, fix the import
(or remove `tsc` from the path that can't satisfy it), not the N call-sites — they're one bug wearing
N hats.

## Also Applies To

- Any monorepo sub-package importing types from a sibling's gitignored `dist/` that builds on CI/Vercel.
- The general trap: a "clean clone" build can fail where local passes purely because a gitignored
  artifact is present on the dev machine. Test the clean-clone path by hiding the artifact, not by
  trusting local green.
- Choosing the deploy build command: if the bundler (esbuild/swc) erases type-only edges, the deploy
  doesn't need `tsc` — gate types locally/in a CI step that has the dependency built, not on the
  artifact-free deploy clone.
