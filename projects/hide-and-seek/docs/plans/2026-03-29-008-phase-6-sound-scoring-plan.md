---
title: "Phase 6: Sound + Scoring"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 6: Sound + Scoring

## Goal

Complete Tier 3 — polished game with audio atmosphere and progression tracking.

## Context

With deep AI and spectator mode in place (Phase 5), this phase adds the audio layer (critical for tension) and the scoring/stats system (reason to replay). Sound is not just polish — the heartbeat proximity warning and footstep audio cues are gameplay-relevant information sources. (see master plan for architecture)

### Key Technical Decisions

- **Audio engine:** Phaser Sound Manager (wraps Web Audio API with fallback)
- **Heartbeat:** Gain node for on/off control (OscillatorNode.start() can only be called ONCE)
- **Audio context:** Must resume on first user interaction (browser security policy)
- **Stats persistence:** localStorage for cross-session data

## Tasks

- [ ] Phaser Sound Manager setup:
  - Web Audio API preferred (Phaser handles fallback)
  - Audio context resume on first user interaction (add to Boot scene or first click handler)
  - Global volume control
  - Mute toggle
- [ ] Sound effects — generate or source audio files:
  - Player footsteps (short, soft — triggered by movement, paced by speed)
  - Seeker footsteps (heavier, distinct — only audible within hearing range)
  - Door open creak
  - Door close thud
  - Countdown tick (final 3 seconds: louder, more urgent)
  - Hunt phase start (ominous tone/drone)
  - "Found" sting (dramatic orchestral hit)
  - "Survived" sting (triumphant chord/fanfare)
  - UI sounds (menu hover, button click, scene transition whoosh)
- [ ] Seeker footstep audibility:
  - Only play seeker footsteps when seeker is within hearing range
  - Hearing range = player FOV range + buffer (e.g., +3 tiles)
  - Volume scales with distance (closer = louder)
  - Can hear through walls (sound travels) but quieter than direct LOS
- [ ] Heartbeat proximity warning:
  - `src/renderer/systems/HeartbeatSystem.ts`
  - Starts when seeker distance < HEARTBEAT_START_RANGE (2x proximity threshold)
  - Tempo: slow at max range, fast at proximity threshold
  - Volume: quiet at max range, loud at proximity threshold
  - Implementation: pre-recorded heartbeat sample, playback rate controlled by distance
  - NOT OscillatorNode (can only start once) — use gain node for volume envelope on looping sample
  - Stretch goal: stereo panning based on seeker direction relative to player
- [ ] Ambient indoor sounds:
  - Subtle background loop (low hum, HVAC-like)
  - Random one-shot creaks (interval: every 10-30 seconds, random position)
  - These are atmospheric, not gameplay-relevant
- [ ] `src/game/state.ts` — ScoreState type:
  - `timeSurvived: number` (seconds)
  - `distanceTraveled: number` (pixels → display as tiles)
  - `closeCalls: number` (times seeker was within 2x PROXIMITY_THRESHOLD)
  - `closestApproach: number` (minimum distance to seeker during hunt, in tiles)
  - `doorsToggled: number`
  - `outcome: 'found' | 'survived'`
  - `difficulty: 'easy' | 'medium' | 'hard'`
- [ ] Score calculation:
  - Track close calls in real-time during hunt (check each fixedUpdate tick)
  - Track closest approach (update minimum distance each tick)
  - Track distance traveled (accumulate movement magnitude each tick)
  - Calculate final score: `baseSurvivalPoints + (closeCalls × closeCallBonus) + timeBonus`
  - Time bonus scales inversely with time limit (surviving with less time = higher bonus per second)
- [ ] Stats persistence (localStorage):
  - `hideAndSeek_stats` key
  - Schema: `{ totalGames, wins, losses, byDifficulty: { easy: {wins, losses, bestTime}, ... }, bestScore }`
  - Read on app start, write after each round
  - Handle missing/corrupt data gracefully (reset to defaults)
- [ ] Results screen enhancement:
  - Full stat breakdown (time, distance, close calls, closest approach, doors used)
  - Score with breakdown (base + bonuses)
  - Personal best indicator (highlight if new best time or score)
  - Win streak counter
  - Overall win/loss record by difficulty
- [ ] Settings menu additions:
  - Master volume slider
  - SFX volume slider
  - Mute all toggle
  - Settings persist to localStorage
- [ ] Unit tests:
  - Score calculation correctness
  - Close call detection logic
  - Stats persistence (read/write/corrupt data handling)
  - Heartbeat tempo/volume scaling formula

## Success Criteria

- Heartbeat creates genuine tension when seeker is nearby
- Seeker footsteps give audio information (can hear them approaching through walls)
- Door sounds add to atmosphere and serve as audio cues
- Countdown final ticks create urgency
- Found/survived stings punctuate the moment
- Scoring gives concrete reason to replay (beat personal best)
- Stats persist across browser sessions
- Volume controls work, mute works
- Audio doesn't break on tab switch or context loss

## Dependencies

- Phase 5 complete (AI depth, spectator mode)

## Risks

| Risk | Mitigation |
|------|------------|
| Audio context not resuming | Handle in Boot scene. Add click-to-start if autoplay blocked. |
| OscillatorNode single-start trap | Use looping audio sample + gain node, NOT OscillatorNode. |
| localStorage quota or disabled | Try/catch around localStorage operations. Degrade gracefully (no persistence, game still works). |
| Heartbeat tempo feels wrong | Expose tempo curve as configurable. Test with multiple players. |
| Sound spam (rapid door toggles, footsteps) | Debounce/throttle sound playback. Pool sound instances. |

## Sources

- [Phaser Sound Manager](https://docs.phaser.io/api-documentation/class/sound-webaudiossoundmanager)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- top-down-racer-02 PITFALLS.md (OscillatorNode.start() single-call limitation)
- conway_game_of_life TODO.md (audio context landmines)
