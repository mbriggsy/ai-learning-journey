---
status: complete
priority: p3
issue_id: "008"
tags: [code-review, type-safety, phase-4]
dependencies: []
---

# SonarPing onPhaseChanged typed as string instead of GameFlowKind

## Problem Statement

Handler uses `(kind: string)` but event map defines `PHASE_CHANGED: [kind: GameFlowKind]`. Loses type narrowing.

**Flagged by:** TS reviewer

## Findings

- `SonarPing.ts:16` — `private readonly onPhaseChanged: (kind: string) => void;`
- Should be `(kind: GameFlowKind) => void`

## Proposed Solutions

**Option A: Fix the type** — import GameFlowKind, change signature

## Technical Details

- **Affected files:** `src/renderer/systems/SonarPing.ts`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | |
