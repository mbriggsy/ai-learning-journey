---
status: complete
priority: p3
issue_id: "007"
tags: [code-review, dead-code, phase-4]
dependencies: []
---

# MinimapManager: dead methods setSeekerBlipAlpha and getCamera

## Problem Statement

Two public methods with zero callers anywhere in the codebase.

**Flagged by:** Simplicity reviewer

## Findings

- `MinimapManager.ts:133-135` — `setSeekerBlipAlpha()` — zero callers
- `MinimapManager.ts:141-143` — `getCamera()` — zero callers

## Proposed Solutions

**Option A: Delete both** — trivial to re-add if needed

## Technical Details

- **Affected files:** `src/renderer/systems/MinimapManager.ts`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | |
