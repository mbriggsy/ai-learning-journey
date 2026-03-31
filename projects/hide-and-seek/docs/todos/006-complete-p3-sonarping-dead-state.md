---
status: complete
priority: p3
issue_id: "006"
tags: [code-review, dead-code, phase-4]
dependencies: []
---

# SonarPing: isAnimating tracked but never read

## Problem Statement

`isAnimating` boolean is set to true/false during ping lifecycle but never checked by any code. If meant to prevent overlapping pings, it's not wired up.

**Flagged by:** TS reviewer

## Findings

- `SonarPing.ts:17` — declared
- `SonarPing.ts:56` — set true
- `SonarPing.ts:92,127` — set false
- Zero reads anywhere

## Proposed Solutions

**Option A: Remove it** — add back when needed with actual guard logic
**Option B: Wire it up** — guard `startPing()` with `if (this.isAnimating) return;`

## Technical Details

- **Affected files:** `src/renderer/systems/SonarPing.ts`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | |
