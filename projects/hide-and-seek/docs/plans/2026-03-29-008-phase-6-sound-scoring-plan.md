---
title: "Phase 6: Sound + Scoring (SPLIT)"
type: feat
status: split
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 6: Sound + Scoring — SPLIT INTO 6a / 6b

## Split Decision

**Deepened on:** 2026-03-30
**Research agents used:** 15 (3 research + 10 review + 1 GSD plan checker + 1 spec flow)
**Contradictions resolved:** 8

Phase 6 was split into two sub-phases following the Phase 5a/5b precedent. The original 11 tasks spanned two distinct domains (audio + scoring) and exceeded the context budget threshold. The split ensures each sub-phase has a coherent single domain and manageable scope.

### Sub-Phase Plans

- **[Phase 6a: Audio Atmosphere](2026-03-29-008a-phase-6a-audio-atmosphere-plan.md)** — AudioManager, sound effects, heartbeat, ambient, spectator audio, tab visibility, settings
- **[Phase 6b: Scoring + Stats](2026-03-29-008b-phase-6b-scoring-stats-plan.md)** — Score tracking, formula, persistence, results screen, stats schema

### Execution Order

Phase 6a must complete before Phase 6b. Scoring emits FOOTSTEP and CLOSE_CALL events that the audio layer consumes, but the audio layer must exist first to subscribe. Additionally, the Settings UI infrastructure (volume sliders, persistence) is built in 6a and extended in 6b.

### Contradictions Resolved During Deepening

| # | Contradiction | Resolution |
|---|--------------|------------|
| 1 | Heartbeat: OscillatorNode (master) vs pre-recorded sample (Phase 6) | **Sample wins.** OscillatorNode can only start() once, produces synthetic sound, frequency ≠ tempo. Master plan superseded. |
| 2 | Close calls: per-tick (Phase 6) vs debounced (master) | **Debounced wins.** Enter/exit zone with 500ms min duration, 3s cooldown. Per-tick counting inflates 60x. |
| 3 | Audio channels: 2 sliders (Phase 6) vs 3 (master) | **3 channels:** master, SFX, ambient. Phase 6 plan was incomplete. |
| 4 | Creak interval: 10-30s (Phase 6) vs 3-8s (master) | **8-20 seconds.** 3-8s competes with gameplay audio. 10-30s too sparse. |
| 5 | localStorage key: hideAndSeek_stats (mixed case) vs camelCase convention | **camelCase:** hideAndSeekStats, hideAndSeekSettings. |
| 6 | CSP: master plan specifies vs Phase 0 deferred | **Deferred.** No CSP in Phase 6. Post-Phase-7 hardening pass. |
| 7 | bestTime semantics: ambiguous | **bestSurvivalTimeS** = longest survival before found. -1 sentinel for never played. |
| 8 | Phaser pauseOnBlur vs PauseAuthority | **Disable Phaser's pauseOnBlur.** Own entirely through PauseAuthority + AudioGate. |
