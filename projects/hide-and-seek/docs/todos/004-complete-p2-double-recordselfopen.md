---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, correctness, phase-4]
dependencies: []
---

# Double recordSelfOpen call (seeker-fsm.ts + engine.ts)

## Problem Statement

`checkDoorOnPath()` in seeker-fsm.ts:323 calls `recordSelfOpen(door.id)` when it detects a closed door and queues OPEN_DOOR. Then `processActionQueue()` in engine.ts:440 calls `recordSelfOpen` again when the action executes. The Set deduplicates so no functional bug, but the first call is premature — it records before the door is actually opened.

If `checkDoorOnPath` queues the action but the queue is cleared before execution (e.g., state transition), evidence would record a self-open that never happened.

**Flagged by:** Architecture strategist

## Findings

- `seeker-fsm.ts:323` — `ctx.ai.evidenceTracker.recordSelfOpen(door.id)` (premature)
- `engine.ts:440` — `ctx.ai.evidenceTracker.recordSelfOpen(action.doorId)` (correct — at execution)

## Proposed Solutions

**Option A: Remove premature call from checkDoorOnPath**
- Keep only the call in processActionQueue (at actual execution)
- Effort: Small
- Risk: Low

## Technical Details

- **Affected files:** `src/game/ai/seeker-fsm.ts`

## Acceptance Criteria

- [ ] Only one recordSelfOpen call per door-open event
- [ ] Call happens at execution time, not at queue time
- [ ] Evidence tracking tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | |
