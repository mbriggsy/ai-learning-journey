---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, architecture, phase-4]
dependencies: []
---

# DEPTH.MINIMAP_PLAYER and DEPTH.UI both equal 200

## Problem Statement

Two distinct depth constants share the same value (200). Currently safe because minimap camera and UI camera ignore each other's objects, but a latent collision if someone adds a game object at DEPTH.UI without excluding it from the minimap camera.

**Flagged by:** TS reviewer

## Findings

- `constants.ts:65` — `MINIMAP_PLAYER: 200`
- `constants.ts:66` — `UI: 200`

## Proposed Solutions

**Option A: Bump MINIMAP_PLAYER to 195**
- Keeps minimap indicators below UI
- Effort: Small
- Risk: None

## Technical Details

- **Affected files:** `src/constants.ts`

## Acceptance Criteria

- [ ] MINIMAP_PLAYER and UI have distinct values
- [ ] Visual rendering unchanged (verify in browser)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | |
