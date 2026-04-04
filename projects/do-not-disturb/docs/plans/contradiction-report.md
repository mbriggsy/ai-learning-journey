# Contradiction Report — Phase Plans 1-10

**Generated:** 2026-04-04
**Status:** Found 5 critical, 12 medium, 7 low issues. Must fix critical before executing.

## CRITICAL (Must Fix)

### 1. Bellhop visibility contradiction
- **Phase 6:** "Pure sound — NO visual detection. Standing motionless in plain sight = safe."
- **Phase 8:** "Using lighter makes player visible to Bellhop and Housekeeper."
- **These cannot both be true.** The Bellhop's core identity is sound-only.
- **Fix:** The lighter doesn't make you "visible" to the Bellhop — it makes NOISE (flick sound, fuel hiss). Reword Phase 8 to clarify: Bellhop hears the lighter ignition, Housekeeper SEES the light. Different detection, same consequence.

### 2. Lighter fuel model conflict
- **Phase 2 InventoryState:** `lighterFuel: number` (seconds remaining)
- **Phase 9 NightConfig:** `lighterCharges: 2` (discrete count)
- **Where is charge count stored?** InventoryState has no `lighterCharges` field.
- **Fix:** Add `lighterCharges: number` to InventoryState. `lighterFuel` is seconds remaining on CURRENT charge. Picking up a charge increments `lighterCharges`. When fuel hits 0, if charges > 0, auto-refuel from next charge.

### 3. Missing Bellhop constants in Phase 2
- Phase 6 references: `BELLHOP_HEARING_THRESHOLD`, `BELLHOP_ALERT_THRESHOLD`, `BELLHOP_INVESTIGATE_S`, `BELLHOP_CONFUSED_S`
- Phase 2's MONSTER constants don't include these.
- **Fix:** Add to Phase 2 MONSTER constants:
  ```
  BELLHOP_HEARING_THRESHOLD: 0.15,
  BELLHOP_ALERT_THRESHOLD: 0.3,
  BELLHOP_INVESTIGATE_S: 5,
  BELLHOP_CONFUSED_S: 3,
  HOUSEKEEPER_CHECK_DURATION_S: 4,
  HOUSEKEEPER_SKIP_PAUSE_S: 1,
  ```

### 4. WorldState type undefined
- Phase 2 state.ts uses `readonly world: WorldState` in PlayingState
- WorldState is never defined in Phase 2.
- **Fix:** Phase 2 should define minimal WorldState interface. Phase 4 fleshes it out.

### 5. Emitter type not exported
- Every phase references `Emitter` type but Phase 2's events.ts doesn't export it.
- **Fix:** Add `export type Emitter = ReturnType<typeof createEmitter<GameEventMap>>;` to Phase 2.

## MEDIUM (Should Fix)

### 6. MONSTER_SPOTTED event missing from GameEventMap
- Phase 5 camera uses `emitter.on('MONSTER_SPOTTED', ...)` — not in Phase 2's event map.
- **Fix:** Add to GameEventMap: `readonly MONSTER_SPOTTED: readonly [position: Position, monsterId: string];`

### 7. Night-specific constants duplicated
- Phase 2 defines `ESCAPE.WINDOW_DURATION_NIGHT_1_S` etc. as individual constants.
- Phase 9 redefines them in NightConfig objects.
- **Fix:** Phase 9's NightConfig is the source of truth. Phase 2 constants become defaults/reference. Document this.

### 8. GameState missing EndingState
- Phase 2 union: `MenuState | PlayingState | CaughtState`
- Phase 9 describes a game completion sequence that needs its own state.
- **Fix:** Add `EndingState` to the union: `{ readonly phase: 'ending'; readonly night: 5; }`

### 9. Monologue pseudo-events not in GameEventMap
- Phase 9 uses `PROXIMITY`, `ZONE_ENTER`, `FIRST_SEEN` as MonologueTrigger events.
- None are in Phase 2's GameEventMap.
- **Fix:** These are computed conditions, not emitted events. Change MonologueTrigger type to use a separate `type: 'event' | 'condition'` discriminator, or add them to GameEventMap.

### 10. Furniture hiding protection unclear
- Phase 4 matrix: `furniture: { bellhop: false, housekeeper: false, guest: true }` (false = can be found)
- Phase 7: "Behind furniture — Risky"
- **Fix:** Clarify: furniture = probabilistic detection (50% chance per check), not guaranteed find. Update Phase 4 matrix comment.

### 11. SLIDE_DURATION_S constant missing
- Phase 3 references `MOVEMENT.SLIDE_DURATION_S` — not in Phase 2's MOVEMENT constants.
- **Fix:** Add `SLIDE_DURATION_S: 0.8,` to Phase 2 MOVEMENT constants.

### 12. Zone graph injection unspecified
- Phase 2 noise.ts assumes zone graph exists but no `createNoiseSystem(zoneGraph)` constructor shown.
- **Fix:** Phase 2 should define: `createNoiseSystem(zoneGraph: NoiseZone[]): NoiseSystem`

### 13. Position-to-Zone mapping undefined
- Noise events have both `sourceZoneId` and `position`. How does a position map to a zone?
- **Fix:** Add `getZoneAtPosition(position: Position): ZoneId` utility. Phase 4 provides implementation (checks room bounds).

### 14. Elevator player interaction undefined
- Phase 4 says "press button, walk away" but no phase specifies the input mechanic.
- **Fix:** Elevator buttons are Interact (E) objects at each floor's elevator stop. Add to Phase 4.

### 15. Tool usage during Jump undefined
- Phase 8 says no tools during Run/Slide, but doesn't mention Jump.
- **Fix:** Tools blocked during Run, Slide, AND Jump. Only usable when grounded (Walk/Sneak/Idle).

### 16. Dynamic light vs. static light zones
- Phase 4 defines static ambient light. Phase 8 introduces lighter (dynamic). How do they combine?
- **Fix:** Additive. Dynamic light ADDS to ambient. Capped at 1.0. Document in Phase 5.

### 17. Guest visibility threshold across light levels
- Phase 8 says Guest is "nearly invisible in darkness" but doesn't specify threshold.
- **Fix:** Guest eye glow visible when: lighter active within 4 tiles, OR ambient light > 0.4 within 3 tiles. Invisible below these thresholds.

## LOW (Noted, Not Blocking)

### 18. DND signs "2-3" vs. exactly 3
Phase 7 says "2-3 per night", Phase 9 hard-codes 3 for all nights. Consistent with upper bound. No fix needed.

### 19. Throwables "8-10" vs. 10
Phase 6 says "~8-10 available per night", Phase 9 says 10 for Night 1, 8 for Night 2+. Consistent. No fix needed.

### 20. Night 4/5 monster lists implicit
Phases 6-8 only describe their introduction night. Phase 9 handles Nights 4-5 explicitly. No conflict.

### 21. Night 5 seed source undefined
Phase 9 uses `nightSeed` but doesn't specify origin. Fix during execution: derive from playthrough ID + night number.

### 22. Catch animation durations as ranges
"2-3s" range not pinned to constants. Fix during execution: define per-monster constants.

### 23. Cross-floor sound via stairs
Phase 2 defines CROSS_FLOOR (0.05) and ELEVATOR_SHAFT (0.3) but stairs are just "cross-floor." Fix: stairs use CROSS_FLOOR attenuation (0.05). Elevator shaft is its own path (0.3).

### 24. Escape window timing — global vs. per-night
Phase 2 defines FIRST_WINDOW_AT_S and REPEAT_INTERVAL_S as global. Phase 9 NightConfig doesn't override them. Fix: document as global constants, not per-night.
