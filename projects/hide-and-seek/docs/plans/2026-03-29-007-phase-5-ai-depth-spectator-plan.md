---
title: "Phase 5: AI Depth + Spectator"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 5: AI Depth + Spectator

## Goal

Complete Tier 3a — intelligent AI with personality across 3 difficulty tiers, AI hider, and AI-vs-AI spectator mode.

## Context

With tactical gameplay in place (Phase 4), this phase deepens the AI from a single random wanderer to three distinct personalities, adds an AI hider for spectator mode, and builds the god-view spectator camera. The design philosophy: personality > intelligence (Pac-Man lesson). (see master plan for architecture)

### AI Design Principles (from research)

- **The AI must never act on information it hasn't "perceived."** Fair play = limited perception model.
- **"Near miss" is the best moment.** Tune AI to walk past hiding spots, pause, then move on.
- **Pac-Man's lesson:** Multiple simple behaviors = emergent intelligence.
- **Invisible rubber-banding > visible difficulty.** Tune behind the scenes.
- **FSM for macro states, utility scoring within states for micro-decisions.**

### Seeker FSM States

```
PATROL → SUSPICIOUS → SEARCH → CHASE → (back to PATROL/SEARCH)
```

### AI Personality Parameters

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Vision range | 4 tiles | 6 tiles | 8 tiles |
| Reaction delay | 1.5s | 0.75s | 0.25s |
| Memory duration | 3s | 8s | 20s |
| Search radius | 3 tiles | 5 tiles | 8 tiles |
| Search thoroughness | 1-2 spots | full room | room + adjacent |
| Vision cone (render) | 60° | 90° | 120° |

## Tasks

- [ ] `src/game/ai/seeker.ts` — Full FSM expansion:
  - **PATROL:** wander/patrol behavior varies by tier
    - Easy: random walkable tile, wander aimlessly
    - Medium: systematic room clearing (track cleared/uncleared rooms)
    - Hard: strategic patrol (prioritize unchecked areas, good hiding spots)
  - **SUSPICIOUS:** investigate stimulus
    - Triggered by: hearing door change (within range), nearby movement sound
    - Behavior: path to stimulus location, look around briefly, return to previous behavior
    - Duration: 3-5 seconds
  - **SEARCH:** focused search around a location
    - Triggered by: lost LOS on hider (last-known-position), evidence discovered
    - Behavior: search in expanding radius from target point
    - Easy: check 1-2 spots, give up quickly
    - Medium: clear the room systematically
    - Hard: clear room + check adjacent rooms, check corners and behind furniture
  - **CHASE:** direct pursuit
    - Triggered by: LOS acquired on hider (any range, not just proximity)
    - Behavior: pathfind directly to hider, full speed
    - If LOS lost: transition to SEARCH at last-known-position
  - Configurable reaction delays between state transitions per tier
- [ ] Medium AI — Systematic searcher:
  - Room tracking system: divide map into rooms (from Tiled Object Layer zones or flood-fill)
  - Track: `{ roomId, lastVisited: tickCount, isCleared: boolean }`
  - Always path to nearest uncleared room
  - Clear room: walk to room center, pause, mark cleared
  - Rooms "un-clear" after N seconds (they become searchable again)
  - Predictable but thorough — player can learn the pattern
- [ ] Hard AI — Evidence-based hunter:
  - Door state tracking: snapshot initial door states at hunt start, compare on encounter
  - Changed door = evidence → path to investigate
  - Last-known-position: remember where hider was last seen
  - Expand search radius over time from LKP (3 tiles/second)
  - "Director" system (simplified Alien: Isolation):
    - Track `timeSinceLastDetection`
    - After 30+ seconds with no contact: suggest zone near hider (not exact position)
    - Suggestion = weight random room selection toward hider's actual zone
    - After recent contact: no hints, let AI work naturally
    - Never gives exact position
  - Prioritize likely hiding spots: corners, behind furniture (tiles adjacent to LOS-blocking furniture), dead ends
  - Fast reaction, wide vision, long memory (see parameter table)
- [ ] Path smoothing for all AI movement:
  - String-pulling: iterate waypoints, if clear LOS from A to C, remove B
  - Smooth position lerp between waypoints (not grid-snap)
  - Add slight randomized pause at doorways (1-2 frames) for "looking around" feel
  - Result: AI walks naturally, not in robotic zigzags
- [ ] `src/game/ai/hider.ts` — AI hider:
  - **Easy:** pick random walkable tile at countdown start, path there, sit
  - **Medium:** evaluate hiding spots during countdown:
    - Score = (distance from seeker spawn × 2) + (adjacent LOS blockers × 3) + (escape routes × 1)
    - Pick highest-scoring spot, path there, sit
  - **Hard:** strategic repositioning:
    - Use own FOV (shadowcasting) to detect seeker proximity
    - When seeker enters FOV: evaluate escape routes, pick best, move
    - Close doors behind self when fleeing
    - Re-evaluate hiding spot after repositioning
    - "Don't hide where you hid last time" — track previous hiding spots
- [ ] AI-vs-AI spectator mode:
  - `src/renderer/scenes/SpectatorGame.ts` — variant of Game scene:
    - God-view camera: show entire map, no follow, no fog of war
    - Zoom to fit map in viewport
    - Both agents run their AI (seeker + hider)
  - Render vision cones: semi-transparent colored arcs for both agents
    - Seeker: red/orange cone
    - Hider: blue/green cone
  - Show FSM state labels above sprites ("PATROL", "CHASE", "HIDING", etc.)
  - Optional: show pathfinding paths as debug lines (toggle with key)
  - Seeker difficulty + hider difficulty independently configurable in menu
- [ ] MainMenu updates:
  - Enable "AI vs AI" button
  - Difficulty selection: seeker tier (Easy/Medium/Hard) + hider tier (Easy/Medium/Hard)
  - For Player vs AI: only seeker difficulty selectable
- [ ] Unit tests:
  - FSM: all state transitions (PATROL→SUSPICIOUS, SUSPICIOUS→SEARCH, etc.)
  - Medium: room tracking, clearing logic, re-clear timing
  - Hard: door evidence detection, LKP tracking, director zone hints
  - AI hider: spot evaluation scoring, repositioning trigger, door usage
  - Path smoothing: waypoint reduction correctness
- [ ] "Near miss" tuning:
  - Hard seeker occasionally pauses at doorways (behavior, not bug)
  - Search pattern visits hiding spot area but doesn't always check exact tile
  - Reaction delay creates brief window where player can see seeker noticing them

## Success Criteria

- Easy seeker feels dumb but functional (wanders, eventually finds you)
- Medium seeker feels methodical (clears rooms one by one, predictable pattern)
- Hard seeker feels intelligent (uses evidence, tracks LKP, director hints guide it)
- Each difficulty tier feels distinctly different to play against
- Near misses happen regularly (seeker walks close, pauses, moves on)
- AI hider picks smart spots (Medium) and actively evades (Hard)
- AI-vs-AI spectator shows both agents' thinking via vision cones and state labels
- Path movement looks natural (smooth, not zigzag)

## Dependencies

- Phase 4 complete (doors, minimap, sonar ping)

## Risks

| Risk | Mitigation |
|------|------------|
| Hard AI feels unfair/omniscient | Director never gives exact position. All decisions flow from perceived info. Test extensively. |
| Room detection from tilemap | Use Tiled Object Layer zones (manual room rects) rather than algorithmic flood-fill. More reliable. |
| AI hider Hard tier too evasive (never found) | Tune: Hard hider only repositions when seeker is within 5 tiles. Limit repositions per round. |
| Near misses feel scripted | Emerge from natural behavior (search patterns, reaction delays), not hardcoded sequences. |

## Sources

- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
- [Hotline Miami AI Analysis](https://medium.com/@RodFernandez91/an-analysis-of-hotline-miami-ai-23c37dbcb156)
- [The Anatomy of a Stealth Encounter — Gamedeveloper](https://www.gamedeveloper.com/design/the-anatomy-of-a-stealth-encounter)
- [Alien: Isolation AI Director model — Game AI Pro](http://www.gameaipro.com/)
- [FSM vs Behavior Tree — Coffee Brain Games](https://coffeebraingames.wordpress.com/2014/02/23/finite-state-machine-vs-behaviour-tree-a-true-story/)
