---
title: Monorepo CI — pnpm/action-setup reads the repo root (not the project), and a workflow's paths filter excludes itself
date: 2026-06-05
phase: P1·U0
modules: [.github/workflows/verify-the-back-nine.yml]
tags: [ci, github-actions, pnpm, monorepo, action-setup, paths-filter]
---

## Problem
A new monorepo-subdir CI workflow failed at setup ("No pnpm version is specified") in 11s, and the follow-up fix commit didn't trigger CI at all.

## Root Cause
- `pnpm/action-setup@v4` runs at the **repo root** — it ignores `defaults.run.working-directory` (which only affects `run:` steps). With no root `package.json`, it can't read the project's `packageManager` pin, so relying on packageManager fails. (Removing `version:` to "rely on packageManager" — a plausible-sounding cleanup folded from a review finding — is exactly what broke it.)
- The workflow's `paths: ['projects/X/**']` filter **excludes the workflow file itself** (it lives in `.github/`), so a commit that only edits the gate never runs the gate.

## Fix
- Keep `version: 10` explicit on `action-setup` (the proven pattern the sibling workflows use). The committed lockfile is the real dependency-reproducibility guarantee. (To pin the tool exactly instead, point `package_json_file:` at the subdir — but don't also pass `version:`.)
- Add the workflow's own path to its `paths` filter, and add `workflow_dispatch:` for manual runs.

## Key Insight
Action steps (`uses:`) run from the repo root regardless of `working-directory` — anything they read by default path is root-relative, not project-relative. And a `paths`-filtered workflow can't self-trigger unless it lists its own file. Verify a NEW CI workflow by actually pushing and watching the run; local green proves nothing about the runner.

## Also Applies To
Any monorepo where projects are subdirs: setup actions, dependency caching, and anything that reads `package.json`/lockfiles by default path.
