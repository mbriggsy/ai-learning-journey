---
status: complete
priority: p2
issue_id: "001"
tags: [code-review, quality, dead-code, phase-4]
dependencies: []
---

# Dead Action Types and Handlers in engine.ts

## Problem Statement

`MOVE_TO`, `REQUEST_PATH` action types are defined in `actions.ts` and have handlers in `engine.ts`, but nothing ever pushes them to the ActionQueue. The `MOVE_TO` handler contains a dummy `pixelToTile(0, 0)` call (dead code) and hardcoded `32 + 16` magic numbers instead of `TILE_SIZE`. The `REQUEST_PATH` handler duplicates logic from `requestPathTo()` in seeker-fsm.ts.

**Flagged by:** TS reviewer, Architecture strategist, Simplicity reviewer (3/4 agents)

## Findings

- `actions.ts:7` — `MOVE_TO` type defined, never pushed
- `actions.ts:10` — `REQUEST_PATH` type defined, never pushed
- `engine.ts:451-465` — `MOVE_TO` handler with dead `pixelToTile(0,0)` and magic numbers
- `engine.ts:468-482` — `REQUEST_PATH` handler duplicating seeker-fsm logic
- `engine.ts:452` — Comment says "dummy — use tileToPixelCenter" but never was fixed

## Proposed Solutions

**Option A: Delete dead action types and handlers**
- Remove MOVE_TO, REQUEST_PATH from Action union
- Remove their switch cases from processActionQueue
- ~30 LOC removed
- Pros: Clean, follows YAGNI
- Cons: If a future phase needs MOVE_TO, it'll need to be re-added (trivial)
- Effort: Small
- Risk: Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/game/ai/actions.ts`, `src/game/engine.ts`
- **Components:** ActionQueue, processActionQueue

## Acceptance Criteria

- [ ] MOVE_TO and REQUEST_PATH removed from Action union
- [ ] Their handlers removed from processActionQueue switch
- [ ] Typecheck passes
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | 3/4 agents flagged independently |
