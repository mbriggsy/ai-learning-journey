---
title: "pnpm install silently no-ops nested packages outside the workspace `packages:` glob"
date: 2026-05-17
modules: [videos/trailer/.npmrc, pnpm-workspace.yaml]
tags: [pnpm, workspace, install, silent-failure, monorepo, isolation]
discovered_while: Phase 0 Unit 0.1 origin-trailer scaffold install verification
---

## Problem

`pnpm install --dir videos/trailer` from the BURNED project root exited
0 in **566 ms** with no errors, no warnings, just
`Done in 566ms using pnpm v10.30.3`. The package had ~11 declared deps
including Remotion 4.0.438. `ls videos/trailer/node_modules/` →
`No such file or directory`. The install had silently done nothing.

## Root Cause

BURNED's repo root carries `pnpm-workspace.yaml` containing only:

```yaml
onlyBuiltDependencies: sharp
```

The file is doing double duty: workspace marker AND postinstall
build-script allowlist (a security control limiting which deps may run
postinstall scripts). Most users only associate the file with the first
role.

When pnpm sees this file at an ancestor, it treats that dir as the
workspace boundary, then checks the install target against the
`packages:` glob. BURNED's file declares **no `packages:` field at all**
— so pnpm classifies `videos/trailer/` as "not in this workspace" and
silently skips. UMB v3's nested trailer has no parent
`pnpm-workspace.yaml`, which is why "mirror UMB exactly" missed it.

## Fix

In the nested standalone package, ship `.npmrc`:

```
ignore-workspace=true
```

Plain `pnpm install` then runs the real install. **Do NOT** "fix" this
by adding the nested package to the workspace `packages:` field — that
bakes the package into the parent workspace (shared lockfile, no
isolation), violating roadmap ADR #2. Deleting `pnpm-workspace.yaml`
also wrong: the `onlyBuiltDependencies` allowlist is load-bearing.

## Key Insight

**Sub-second pnpm install with no `Progress:` line printed is a silent
skip, not a fast cache hit.** Cache-hit installs still print a
`Progress: resolved N, reused M, downloaded K, added 0` line. Pure
no-ops print only `Done in <time>`. If a package has nontrivial deps
and you see no progress line, it didn't install — `ls node_modules/`
to confirm before running anything else against the package.

For any nested standalone package inside a project that uses
`pnpm-workspace.yaml` (for workspace declaration *or* for
`onlyBuiltDependencies`), ship `.npmrc ignore-workspace=true` upfront.
One line, prevents the entire class.

## Also Applies To

- Future BURNED nested standalone packages: candidates include
  `scripts/playtest-recorder/`, `scripts/release-tooling/`, any
  `tools/*` subpackage with its own isolated dep tree.
- Any project adopting `onlyBuiltDependencies` postinstall hardening
  without going full monorepo — the trap applies even when no workspace
  is intended.
- Future projects under `projects/<name>/` that inherit BURNED's pnpm
  configuration patterns.
