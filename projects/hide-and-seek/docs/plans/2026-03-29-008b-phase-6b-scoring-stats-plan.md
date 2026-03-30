---
title: "Phase 6b: Scoring + Stats"
type: feat
status: ready
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-008-phase-6-sound-scoring-plan.md
agents_used: 15
contradictions_resolved: 8
executed:
reviewed:
---

# Phase 6b: Scoring + Stats

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 15 (shared with Phase 6a)

### Key Improvements Discovered

1. **CRITICAL: Single `difficulty` field can't model Phase 5b** — Phase 5b has independent seeker/hider difficulty. ScoreState needs `seekerDifficulty` + `hiderDifficulty: Difficulty | 'human'`.
2. **CRITICAL: Close call per-tick counting inflates 60x** — Master plan says debounced enter/exit zone. Need state machine: enter → increment → cooldown → exit.
3. **CRITICAL: `Infinity` breaks JSON.stringify** — `JSON.stringify({bestTime: Infinity})` → `{"bestTime":null}`. Use `-1` sentinel for "never played".
4. **CRITICAL: No schema version = silent data loss** — First schema change causes `isValidStats()` to reject old data → player's entire history wiped with no message.
5. **`totalGames` is a derived value** — Should NOT be stored. Compute as `wins + losses`. Storing it creates an invariant violation risk.
6. **Score accumulation fields belong on HuntPhase** — Not a separate ScoreState type. Consistent with discriminated union pattern.
7. **`RoundResult`** is the right name for the frozen snapshot (not `ScoreState`). `ScoreState` implies mutable state machine.
8. **`GameOutcome`** = `Extract<GameFlowKind, 'found' | 'survived'>` — single source of truth, not a re-declared inline union.
9. **`Record<Difficulty, DifficultyStats>`** guarantees exhaustiveness — adding a 4th difficulty tier flags every initializer.
10. **`Number.isFinite()`** required in type guard — NaN and Infinity both pass `typeof === 'number'` check.
11. **Re-read localStorage before write** — Narrows concurrent-tab race window from entire session to microseconds.
12. **Difficulty multiplier: Easy 1.0x, never below** — Research shows fractional multipliers below 1.0 make casual players feel punished.
13. **Score count-up animation** — 0 → final over 1.5s. Flash PB indicator mid-count when passing old best.
14. **`bestSurvivalTimeS` semantics** — Longest survival before found (losses). For wins, time always equals limit.

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema version missing → silent data wipe | Critical | Add `schemaVersion: 1` from day one with migration chain |
| `Infinity` in JSON | Critical | `-1` sentinel for "never played" |
| Close call inflated 60x | High | Enter/exit zone state machine with 500ms + 3s cooldown |
| `totalGames !== wins + losses` | High | Don't store `totalGames`. Derive on read. |
| Loss outscore win on lower difficulty | Medium | Difficulty multiplier normalizes (Hard 2.0x > Easy 1.0x) |
| `isValidStats` too permissive | Medium | Check every field: typeof + isFinite + non-negative + invariants |
| Prototype pollution in byDifficulty | Medium | Whitelist keys to exactly ['easy', 'medium', 'hard'] |

---

## Goal

Scoring gives concrete reason to replay (beat personal best). Stats persist across sessions. Results screen shows transparent breakdown.

## Context

With audio atmosphere in place (Phase 6a), this phase adds the scoring system that tracks player performance and persists it across sessions. The score formula rewards skill with a transparent breakdown. Stats persistence uses localStorage with runtime validation and schema versioning.

### Architecture

```
src/game/
├── scoring.ts               # NEW: score accumulation, close call detection, formula
├── audio-curves.ts          # (from 6a, already exists)
├── state.ts                 # MODIFIED: score fields on HuntPhase, RoundResult type

src/types/
├── persistence.ts           # NEW: PersistencePort interface, StatsSchema, AudioSettings
├── state.ts                 # MODIFIED: GameOutcome type
├── events.ts                # MODIFIED: CLOSE_CALL_ENTERED/EXITED, FOOTSTEP events

src/
├── persistence.ts           # NEW: localStorage implementation of PersistencePort
├── constants.ts             # MODIFIED: SCORING constants

src/renderer/scenes/
├── Results.ts               # MODIFIED: score breakdown, PB indicator, count-up animation
├── PauseMenu.ts             # (modified in 6a for Settings — no changes in 6b)
```

**Sacred boundary preserved:** All scoring logic in `src/game/scoring.ts` — pure TypeScript, zero Phaser imports. Persistence adapter in `src/persistence.ts` (browser API, not game logic). PersistencePort interface in `src/types/` for dependency injection.

---

## Tasks

### Task 1: Score Accumulation Fields on HuntPhase

- [ ] Add to `HuntPhase` in the discriminated union (`src/game/state.ts` / `src/types/state.ts`):
  ```typescript
  // Score accumulation — updated each fixedUpdate during HUNT
  timeSurvivedS: number              // seconds elapsed in HUNT phase
  distanceTraveledPx: number         // accumulated movement magnitude
  closeCalls: number                 // debounced zone entry count
  closestApproachTiles: number       // minimum seeker distance (-1 = never in range)
  doorsToggled: number               // door toggle count (BOTH phases)
  seekerDistanceTiles: number        // computed once at step 7, read by renderer

  // Close call state machine
  isInCloseCallZone: boolean
  closeCallZoneEnteredAtMs: number   // timestamp of zone entry
  closeCallCooldownRemainingMs: number
  ```

- [ ] **Initialize** in `createGameState()` factory:
  - `timeSurvivedS: 0`, `distanceTraveledPx: 0`, `closeCalls: 0`
  - `closestApproachTiles: -1` (sentinel: seeker never entered range. NOT `Infinity` — breaks JSON.)
  - `doorsToggled: 0`, `seekerDistanceTiles: -1`
  - `isInCloseCallZone: false`, `closeCallZoneEnteredAtMs: 0`, `closeCallCooldownRemainingMs: 0`

- [ ] **`seekerDistanceTiles`** computed ONCE per tick at fixedUpdate step 7 (after positions updated, alongside detection). All systems read from state.

- [ ] **Canonical fixedUpdate step 10 (NEW):** Score accumulation — runs after rules evaluation (step 9), before terminal state check. Only during `gameFlow.kind === 'hunt'` (except `doorsToggled`: both phases via DOOR_TOGGLED event handler).

### Research Insights — Score Tracking

**Why fields on HuntPhase, not a separate ScoreState type:** The discriminated union pattern makes illegal states unrepresentable. During COUNTDOWN, score accumulation fields don't exist (no HuntPhase). During FOUND/SURVIVED (terminal), fixedUpdate halts — no further mutation. A separate ScoreState floating outside the union breaks this pattern.

**`seekerDistanceTiles` computed once:** 4 systems need this value (heartbeat, close calls, footstep volume, closest approach). Computing once at step 7 eliminates redundant sqrt calls AND prevents cross-system disagreement if positions update between calculations.

---

### Task 2: `src/game/scoring.ts` — Pure Functions

- [ ] **`updateScoreAccumulation(state: HuntPhase, dt: number): void`** — called at fixedUpdate step 10:
  - `timeSurvivedS += dt`
  - `distanceTraveledPx += movementMagnitudeThisTick`
  - `closestApproachTiles = seekerDistanceTiles < closestApproachTiles || closestApproachTiles === -1 ? Math.min(seekerDistanceTiles, closestApproachTiles === -1 ? seekerDistanceTiles : closestApproachTiles) : closestApproachTiles`
  - Close call state machine update (see below)

- [ ] **Close call state machine** (debounced enter/exit zone):
  ```typescript
  function updateCloseCallTracker(state: HuntPhase, nowMs: number): void {
    const dist = state.seekerDistanceTiles;
    const threshold = SCORING_CLOSE_CALL_RANGE_TILES; // 2x PROXIMITY_THRESHOLD

    // Cooldown countdown
    if (state.closeCallCooldownRemainingMs > 0) {
      state.closeCallCooldownRemainingMs -= dt * 1000;
    }

    const wasInZone = state.isInCloseCallZone;
    const isInZone = dist <= threshold && dist > 0;

    if (!wasInZone && isInZone && state.closeCallCooldownRemainingMs <= 0) {
      // Entered zone — record entry time
      state.isInCloseCallZone = true;
      state.closeCallZoneEnteredAtMs = nowMs;
    } else if (wasInZone && !isInZone) {
      // Exited zone — count if duration >= minimum
      state.isInCloseCallZone = false;
      const duration = nowMs - state.closeCallZoneEnteredAtMs;
      if (duration >= SCORING_CLOSE_CALL_MIN_DURATION_MS) { // 500ms
        state.closeCalls++;
        state.closeCallCooldownRemainingMs = SCORING_CLOSE_CALL_COOLDOWN_MS; // 3000ms
        emit(CLOSE_CALL_EXITED, { durationMs: duration, counted: true });
      }
    }
  }
  ```

- [ ] **Footstep distance accumulator** (emits FOOTSTEP event for audio layer):
  ```typescript
  // In scoring.ts or movement.ts — per entity
  stepAccumulator += movementMagnitudeThisTick;
  if (stepAccumulator >= AUDIO_FOOTSTEP_STEP_DISTANCE_PX) { // ~24px
    stepAccumulator -= AUDIO_FOOTSTEP_STEP_DISTANCE_PX;
    emit(FOOTSTEP, { entity: 'player' }); // or 'seeker'
  }
  ```

- [ ] **`doorsToggled`:** increment via DOOR_TOGGLED event handler (both COUNTDOWN and HUNT phases)

---

### Task 3: Score Formula

- [ ] **`calculateScore(huntPhase: HuntPhase, outcome: GameOutcome, difficulty: Difficulty): ScoreBreakdown`** — pure function:
  ```typescript
  interface ScoreBreakdown {
    readonly baseSurvival: number
    readonly closeCallBonus: number
    readonly proximityBonus: number
    readonly efficiencyBonus: number
    readonly doorBonus: number
    readonly subtotal: number
    readonly difficultyMultiplier: number
    readonly totalScore: number
  }
  ```

- [ ] **Formula:**
  - `baseSurvival = outcome === 'survived' ? 1000 : 0`
  - `closeCallBonus = closeCalls × 150`
  - `proximityBonus` = tiered by `closestApproachTiles`:
    - ≤ 1 tile: 200 ("Nerve of Steel")
    - ≤ 2 tiles: 150
    - ≤ 3 tiles: 100
    - ≤ 5 tiles: 50
    - -1 or > 5: 0
  - `efficiencyBonus = outcome === 'survived' && distanceTraveledPx / TILE_SIZE < 15 ? 100 : 0`
  - `doorBonus = doorsToggled × 10`
  - `subtotal = baseSurvival + closeCallBonus + proximityBonus + efficiencyBonus + doorBonus`
  - `difficultyMultiplier = { easy: 1.0, medium: 1.5, hard: 2.0 }[difficulty]`
  - `totalScore = Math.round(subtotal × difficultyMultiplier)`

- [ ] **All formula values** in `src/constants.ts` as `SCORING` config object with `as const satisfies`

### Research Insights — Scoring

**Why additive-then-multiplicative:** Pure multiplicative creates unpredictable score explosions. Additive bonuses are transparent — the player sees "3 close calls = 450 points" on the results screen. The difficulty multiplier is applied LAST so Easy players still see meaningful base scores.

**Why Easy = 1.0x, not 0.5x:** Research shows fractional multipliers below 1.0 make casual players feel punished and disengaged. Easy is the baseline, not a penalty.

**Loss scoring:** Found = base 0 (significant penalty). But close call bonus + proximity bonus + door bonus still apply — a skilled player found at 119s with 5 close calls gets meaningful points. This rewards effort even in defeat.

---

### Task 4: GameEventMap Additions

- [ ] Add to `src/types/events.ts`:
  ```typescript
  CLOSE_CALL_ENTERED: { distanceTiles: number }
  CLOSE_CALL_EXITED: { durationMs: number; counted: boolean }
  FOOTSTEP: { entity: 'player' | 'seeker' }
  ```
- [ ] SoundEffects (Phase 6a) subscribes to FOOTSTEP for audio playback
- [ ] SoundEffects subscribes to CLOSE_CALL_ENTERED for optional tension audio cue

---

### Task 5: RoundResult Type + ResultsSceneData Extension

- [ ] **`GameOutcome` type** (`src/types/state.ts`):
  ```typescript
  type GameOutcome = Extract<GameFlowKind, 'found' | 'survived'>
  ```

- [ ] **`RoundResult` type** (frozen snapshot, replaces Phase 3's `ResultsSceneData`):
  ```typescript
  interface RoundResult {
    readonly timeSurvivedS: number
    readonly distanceTraveledPx: number
    readonly closeCalls: number
    readonly closestApproachTiles: number  // -1 = never in range
    readonly doorsToggled: number
    readonly outcome: GameOutcome
    readonly seekerDifficulty: Difficulty
    readonly hiderDifficulty: Difficulty | 'human'
    readonly breakdown: ScoreBreakdown
    readonly isNewBestScore: boolean
    readonly isNewBestSurvivalTime: boolean
  }
  ```

- [ ] **`createRoundResult(huntPhase, outcome, difficulty, persistence)`** — pure function in `src/game/scoring.ts`:
  - Reads accumulation fields from HuntPhase
  - Calls `calculateScore()`
  - Checks current stats via PersistencePort for PB comparison
  - Returns frozen `RoundResult`

- [ ] **Breaking change to Phase 3's `ResultsSceneData`:** Documented. The new `RoundResult` replaces it entirely. `scene.start('Results', { roundResult })`.

- [ ] **Spectator mode:** `RoundResult | undefined` — Results scene handles absence gracefully (shows outcome + duration only, no score).

---

### Task 6: Stats Persistence

- [ ] **`src/types/persistence.ts`** — PersistencePort interface:
  ```typescript
  interface PersistencePort {
    loadStats(): StatsSchema
    saveStats(stats: StatsSchema): boolean  // false = save failed
    loadSettings(): AudioSettings
    saveSettings(settings: AudioSettings): boolean
  }
  ```

- [ ] **`src/persistence.ts`** — localStorage implementation:
  - Key: `hideAndSeekStats` (camelCase, matches project convention)
  - `loadStats()`: try/catch → JSON.parse → migration chain → isValidStats → return (or defaults)
  - `saveStats()`: validate → JSON.stringify → setItem → catch QuotaExceededError
  - **Re-read before write**: `loadStats()` fresh before every `saveStats()` — narrows concurrent-tab race to microseconds
  - **In-memory fallback**: when localStorage unavailable (private browsing), maintain in-memory copy for current session
  - **QuotaExceededError**: catch by name, show non-blocking toast "Stats could not be saved (storage full)"
  - Inject via `main.ts` composition root

- [ ] **`recordGameResult()`** — pure function that enforces invariants:
  ```typescript
  function recordGameResult(
    stats: StatsSchema,
    difficulty: Difficulty,
    outcome: GameOutcome,
    score: number,
    timeSurvivedS: number,
  ): StatsSchema {
    const won = outcome === 'survived';
    const diff = stats.byDifficulty[difficulty];
    const streakBroken = stats.lastDifficulty !== difficulty;

    return {
      ...stats,
      wins: stats.wins + (won ? 1 : 0),
      losses: stats.losses + (won ? 0 : 1),
      bestScore: Math.max(stats.bestScore, score),
      currentWinStreak: streakBroken ? (won ? 1 : 0) : (won ? stats.currentWinStreak + 1 : 0),
      bestWinStreak: Math.max(stats.bestWinStreak, streakBroken ? (won ? 1 : 0) : (won ? stats.currentWinStreak + 1 : 0)),
      lastDifficulty: difficulty,
      byDifficulty: {
        ...stats.byDifficulty,
        [difficulty]: {
          wins: diff.wins + (won ? 1 : 0),
          losses: diff.losses + (won ? 0 : 1),
          bestScore: Math.max(diff.bestScore, score),
          bestSurvivalTimeS: won
            ? diff.bestSurvivalTimeS  // wins always = time limit, not interesting
            : (diff.bestSurvivalTimeS === -1
                ? timeSurvivedS
                : Math.max(diff.bestSurvivalTimeS, timeSurvivedS)),
        },
      },
    };
  }
  ```
  - This function is pure — no side effects. Tested in isolation.
  - The only code that calls `PersistencePort.saveStats()` receives the complete new object from this function.

---

### Task 7: StatsSchema Design

- [ ] **Schema** (`src/types/persistence.ts`):
  ```typescript
  interface DifficultyStats {
    readonly wins: number
    readonly losses: number
    readonly bestScore: number          // 0 = never played
    readonly bestSurvivalTimeS: number  // -1 = never played (NOT Infinity — breaks JSON)
  }

  interface StatsSchema {
    readonly schemaVersion: 1
    readonly wins: number               // NO totalGames — derive as wins + losses
    readonly losses: number
    readonly currentWinStreak: number
    readonly bestWinStreak: number
    readonly lastDifficulty: Difficulty
    readonly bestScore: number          // 0 = never played
    readonly byDifficulty: Readonly<Record<Difficulty, DifficultyStats>>
  }
  ```

- [ ] **Defaults:**
  ```typescript
  const DEFAULT_STATS: StatsSchema = {
    schemaVersion: 1,
    wins: 0, losses: 0,
    currentWinStreak: 0, bestWinStreak: 0,
    lastDifficulty: 'easy',
    bestScore: 0,
    byDifficulty: {
      easy: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
      medium: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
      hard: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
    },
  };
  ```

- [ ] **Migration chain:**
  ```typescript
  const MIGRATIONS: Record<number, (data: unknown) => unknown> = {
    // Future: 1: (data) => ({ ...data, schemaVersion: 2, newField: default })
  };
  function migrateStats(data: unknown): StatsSchema | null {
    let obj = data as Record<string, unknown>;
    let version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 0;
    while (version < CURRENT_STATS_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) return null; // unrecoverable — use defaults
      obj = migrate(obj) as Record<string, unknown>;
      version = (obj as any).schemaVersion;
    }
    return isValidStats(obj) ? obj as StatsSchema : null;
  }
  ```

- [ ] **`isValidStats()` type guard** — hand-rolled, no Valibot/Zod:
  - Check every field exists and correct type
  - `Number.isFinite()` on ALL numeric fields (catches NaN, Infinity)
  - Non-negative: `wins >= 0`, `losses >= 0`, etc.
  - **Relational invariants**: `diff.wins <= wins`, `diff.losses <= losses`
  - **Key whitelist**: `Object.keys(byDifficulty)` exactly `['easy', 'medium', 'hard']` — reject unknown keys (prototype pollution defense)
  - **Repair before reject**: if invariants broken but structure valid, derive `wins` from sum of `byDifficulty[*].wins`. Only reset to defaults if structurally broken.

---

### Task 8: AudioSettings Persistence

- [ ] Key: `hideAndSeekSettings`
- [ ] Defined in Phase 6a (AudioSettings type). Phase 6b implements the PersistencePort methods:
  - `loadSettings()`: try/catch → JSON.parse → merge-with-defaults → clamp volumes → return
  - `saveSettings()`: JSON.stringify → setItem → catch errors
- [ ] **Merge-with-defaults**: `{ ...DEFAULT_SETTINGS, ...saved, schemaVersion: DEFAULT_SETTINGS.schemaVersion }` — new fields get defaults automatically. No migration function needed for additive changes.
- [ ] **Clamp on load**: `Math.max(0, Math.min(1, value))` for each volume. `Number.isFinite()` check — if NaN, use default.

---

### Task 9: Results Screen Enhancement

- [ ] **Outcome display**: "SURVIVED!" or "FOUND!" — biggest text, centered
- [ ] **Score count-up animation**: 0 → final totalScore over 1.5s. Tick sound on each increment step.
  - If count passes old best mid-animation: flash "NEW BEST!" indicator at that moment
  - Show previous best for comparison: "(Previous: 1,800)"
- [ ] **Score breakdown** (itemized list):
  ```
  Survival (42.0s)         +420
  Close Calls (x3)         +450
  Closest Approach (1.2t)  +200
  Efficiency Bonus         +100
  Doors Used (x5)           +50
                           ------
  Subtotal                 1220
  Hard Difficulty (x2.0)
                           ======
  TOTAL                   2,440
  ```
- [ ] **Quick stats row**: Time survived | Closest approach | Win streak (if > 1)
- [ ] **Personal best indicators**:
  - New best score (per difficulty): highlight + "NEW BEST!"
  - Show only after 2+ games on that difficulty (first game is always "best")
- [ ] **Buttons**:
  - "Play Again" = primary (larger, Enter/Space). Same difficulty. Skip menu.
  - "Back to Menu" = secondary (smaller, Escape). Returns to MainMenu.
  - Controller: A = Play Again, B = Back to Menu
- [ ] **Spectator mode**: no score breakdown. Show outcome + hunt duration + difficulty levels only.
- [ ] **Loss screen**: still show breakdown (close calls, proximity, doors earned points). Base survival = 0 is the penalty, but effort is rewarded.

### Research Insights — Results UX

**Score count-up creates anticipation.** Starting from 0 and counting up makes the player watch. Flashing PB mid-count is the emotional peak. Showing previous best for comparison creates a "beat by X" moment.

**Win streak psychology:** Display streak if > 1. Show best streak in parentheses. On loss, reset to 0 but show "Previous Streak: 5" on that screen only — acknowledges without rubbing it in.

**Play Again as primary:** Reducing friction to replay is the highest-value UX improvement. Same difficulty, skip menu, Enter key. The player's flow state should not be interrupted.

---

### Task 10: Scoring Unit Tests

- [ ] **Score formula:**
  - Survived on Easy with 0 close calls = 1000 + 0 + 0 + 0 + 0 × 1.0 = 1000
  - Found on Hard with 3 close calls, closest 1.2 tiles, 5 doors = (0 + 450 + 100 + 0 + 50) × 2.0 = 1200
  - Efficiency bonus: survived with < 15 tiles movement = +100
  - Proximity tiers: verify each threshold boundary

- [ ] **Close call state machine:**
  - Enter zone → exit after 600ms → counted (1 close call)
  - Enter zone → exit after 200ms → NOT counted (below 500ms min)
  - Enter → exit → re-enter within 3s → NOT counted (cooldown)
  - Enter → exit → re-enter after 3s → counted (cooldown expired)
  - Boundary oscillation (in/out/in/out at 60fps) → only counts qualifying entries

- [ ] **Stats persistence:**
  - `isValidStats({})` → false
  - `isValidStats({ ...valid, totalGames: "banana" })` → false (wrong type... wait, totalGames removed. Test wins: "banana")
  - `isValidStats({ ...valid, wins: -5 })` → false (negative)
  - `isValidStats({ ...valid, wins: NaN })` → false (isFinite fails)
  - `isValidStats({ ...valid, wins: Infinity })` → false (isFinite fails)
  - `isValidStats({ ...valid, byDifficulty: { easy: {...}, medium: {...}, hard: {...}, __proto__: {...} } })` → false (extra key)
  - Migration: v0 data → v1 (adds missing fields with defaults)
  - QuotaExceededError: saveStats returns false, game continues

- [ ] **recordGameResult:**
  - Win on Easy: wins +1, losses unchanged, streak +1
  - Loss on Easy: wins unchanged, losses +1, streak reset to 0
  - Win then switch difficulty: streak resets to 1
  - Best score updated only when higher
  - All byDifficulty sums match top-level wins/losses

- [ ] **Footstep distance accumulator:**
  - Move 24px → 1 FOOTSTEP event
  - Move 48px → 2 events
  - Move 12px → 0 events (below threshold)
  - Reset between rounds

---

## Success Criteria

- Score formula rewards skill with transparent breakdown
- Close calls tracked via debounced enter/exit (not inflated)
- Stats persist across browser sessions (localStorage with schema versioning)
- Corrupt/missing localStorage data handled gracefully (reset to defaults with message)
- Results screen shows itemized score breakdown with PB highlighting
- Play Again preserves difficulty and skips menu (minimal friction)
- Spectator mode shows outcome without score breakdown
- All scoring constants in constants.ts (tunable)

## Dependencies

- Phase 6a complete (AudioManager, Settings infrastructure, FOOTSTEP event consumers)
- Phase 5 complete (AI depth, spectator mode, difficulty tiers)

## Risks

| Risk | Mitigation |
|------|------------|
| Schema version missing → data wipe | `schemaVersion: 1` from day one. Migration chain. |
| `Infinity` in JSON | `-1` sentinel. `Number.isFinite()` checks. |
| Close calls inflated 60x | Enter/exit zone state machine with 500ms min + 3s cooldown. |
| Loss outscore win on Easy | Difficulty multiplier normalizes. Base survival 0 for losses. |
| `isValidStats` too permissive | Explicit checks: typeof + isFinite + non-negative + key whitelist. |
| Concurrent tabs last-write-wins | Re-read before write. Document as known limitation. |
| QuotaExceededError | Catch by name. Toast notification. In-memory fallback. |

## Landmines

- **`bestSurvivalTimeS: -1` sentinel, NOT `Infinity`** — `JSON.stringify({x: Infinity})` → `{"x":null}`. Use `-1` and check explicitly in display logic.
- **`totalGames` is derived** — compute as `wins + losses`. Storing creates invariant violation if any code increments one without the other.
- **`recordGameResult` must be the ONLY code that modifies stats** — single pure function, tested in isolation. No scattered field mutations.
- **`isValidStats` must check `Number.isFinite()`** — `typeof NaN === 'number'` is true. NaN propagates through all arithmetic silently.
- **`byDifficulty` key whitelist** — `Object.keys()` must contain EXACTLY ['easy', 'medium', 'hard']. Reject unknown keys (prototype pollution).
- **`closestApproachTiles: -1` initialized** — `Math.min(-1, actual)` always returns -1. Must handle: `closestApproach === -1 ? dist : Math.min(closestApproach, dist)`.
- **ResultsSceneData is a BREAKING CHANGE** — Phase 3 defined `{ outcome, timeSurvivedMs, distanceTraveled }`. Phase 6b replaces with `{ roundResult: RoundResult }`. Update all references.
- **Win streak: changing difficulty RESETS streak** — per master plan. `lastDifficulty` field tracks this.
- **`Difficulty` type promotion** — currently in `src/game/ai/seeker-configs.ts` (Phase 5a). Promote to `src/types/state.ts` so both game and persistence layers access it.

## Constants to Add

```typescript
// Scoring formula
SCORING_BASE_SURVIVAL_POINTS: 1000,
SCORING_CLOSE_CALL_BONUS: 150,
SCORING_PROXIMITY_TIERS: [
  { maxTiles: 1, points: 200 },
  { maxTiles: 2, points: 150 },
  { maxTiles: 3, points: 100 },
  { maxTiles: 5, points: 50 },
],
SCORING_EFFICIENCY_THRESHOLD_TILES: 15,
SCORING_EFFICIENCY_BONUS: 100,
SCORING_DOOR_BONUS: 10,
SCORING_DIFFICULTY_MULTIPLIER: { easy: 1.0, medium: 1.5, hard: 2.0 },

// Close call detection
SCORING_CLOSE_CALL_RANGE_TILES: 3.0,     // 2x PROXIMITY_THRESHOLD
SCORING_CLOSE_CALL_MIN_DURATION_MS: 500,
SCORING_CLOSE_CALL_COOLDOWN_MS: 3000,
```

## Sources

- Game scoring research: Game Developer magazine, Machinations, r/gamedesign
- localStorage best practices: MDN Web Storage API
- TypeScript patterns: Project conventions (discriminated unions, as const satisfies, no enums)
- Phase 5a seeker-configs.ts: Difficulty type, SeekerConfig pattern
