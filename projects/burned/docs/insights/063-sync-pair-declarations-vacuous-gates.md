---
title: Producer/verifier sharing a hand-listed allowlist creates a vacuous gate the moment one drifts from the other
date: 2026-05-22
phase: trailer-phase-3
modules: [videos/trailer/scripts/vendor-burned-vocab.ts, videos/trailer/scripts/verify-vocab-sync.ts, videos/trailer/scripts/lib/vocab-files.ts]
tags: [single-source-of-truth, drift, gates, code-duplication, sync-pair-landmine, vendoring]
---

## Problem

Phase 3 Unit 3.0 shipped a vendor pipeline + CI drift gate for the
BURNED HTP vocabulary components:

- `vendor-burned-vocab.ts` (the **producer**) copies 10 files from
  BURNED's source to the trailer's `burned-vocabulary/`.
- `verify-vocab-sync.ts` (the **verifier**) sha256-compares the
  vendored copies to the source and exits 1 on drift.

Both scripts declared an identical `VENDORED_FILES` const — the
hand-listed allowlist of file names. Two parallel declarations of the
same logical value, in the same feature.

The gate APPEARED to be a real contract: vendor produces, verify
checks. But the gate is **only as good as the two lists agreeing**.
Three drift scenarios silently defeat it:

1. **Add to producer, forget verifier.** Vendor copies a new file →
   verify doesn't know to check it → gate gives green even when the
   vendored copy could drift from source.
2. **Add to verifier, forget producer.** Verify expects a file that
   doesn't get copied → first run reports `MISSING vendored` (loud,
   recoverable). Better than (1) but still indicates the two-place
   coupling is fragile.
3. **Both authors miss a new BURNED component.** Neither vendor nor
   verify knows about it → the new component is invisible to the
   gate entirely. The gate doesn't fail; it just doesn't apply.

(3) is the silent vacuous case. (1) is the louder vacuous case. Both
flow from the same root: **two independent declarations of one
logical value**.

## Root Cause

The pattern is **"copy-paste the const into the consumer script"** —
a natural pattern when two scripts live next to each other and look
self-contained. Each script reads cleanly in isolation. The coupling
is invisible until drift happens.

Three things made it easy to miss:

1. **Both files looked complete on their own.** No `// keep in sync
   with X` comment, no shared import. A reader of either file would
   not know the other existed.
2. **The drift gate verifies content equality, not list equality.**
   sha256 catches "Stamp.tsx bytes changed" but cannot catch "we both
   stopped tracking Insignia.tsx."
3. **The Path B architecture decision called for an "explicit
   allowlist"** for cross-platform portability + no symlink
   traversal. That's correct. But "explicit" doesn't mean "duplicated"
   — explicit-in-ONE-place is still explicit.

## Fix

Extracted `VENDORED_FILES` to `scripts/lib/vocab-files.ts` — a single
module both scripts import. The allowlist is now declared ONCE; both
scripts pick up additions, renames, removals automatically.

```ts
// scripts/lib/vocab-files.ts
export const VENDORED_FILES = [
  'Stamp.tsx', 'Stamp.module.css',
  // ...
] as const;

// scripts/vendor-burned-vocab.ts
import { VENDORED_FILES } from './lib/vocab-files.js';

// scripts/verify-vocab-sync.ts
import { VENDORED_FILES } from './lib/vocab-files.js';
```

README updated to point at the single source of truth: "edit
`scripts/lib/vocab-files.ts` only; both scripts auto-pick-up." The
maintenance ritual is now one-step instead of two-step-keep-in-sync.

## Key Insight

**Producer + verifier sharing an allowlist is a sync-pair landmine
the instant the allowlist is duplicated.** The gate's correctness
depends on the two lists agreeing — and if they're hand-typed in two
places, drift is inevitable.

The corrective is dead simple: **extract to a single module both
sides import**. The cost is one extra file; the benefit is the
two-place coupling becomes impossible.

The catch shape: when you write two scripts that operate on the same
collection of items (one producing, one verifying / one configuring,
one consuming / one writing, one reading), and you find yourself
typing the same list twice — STOP. Extract. The duplication is the
bug, even if both copies are currently identical.

The broader rule: **two declarations of the same logical value
within the same codebase = single-source-of-truth violation**. This
is distinct from insights #057 (plan-vs-spike drift) and #061 (plan
enumerations decay), which are about plan-body values that decay
against external sources. This insight is about code-vs-code drift
within a single feature.

## Also Applies To

- Producer / consumer scripts that both reference the same set of
  files, columns, fields, IDs, env vars, route paths.
- Migration / rollback script pairs that hand-list the same tables.
- TypeScript types declared on both server and client without
  shared-types extraction.
- Test fixtures + production seed data that both list the same
  records (drift means test passes against fixtures while prod
  references vanished IDs).
- Allowlists for security checks where one place authorizes and
  another verifies — auth bypass class of bug.
- Any "we need this list in two places" instinct. The right next
  thought is "where does this list live as the single source?"
