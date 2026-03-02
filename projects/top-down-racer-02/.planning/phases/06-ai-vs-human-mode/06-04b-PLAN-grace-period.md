# Plan: Head-to-Head Race Flow with Grace Period

## Enhancement Summary

**Deepened on:** 2026-03-02
**Sections enhanced:** 7 tasks + architecture + edge cases
**Research agents used:** TypeScript reviewer, architecture strategist, code simplicity reviewer, race conditions reviewer, pattern recognition specialist, performance oracle, PixiJS v8 docs researcher, repo research analyst, best practices researcher, game design researcher

### Key Improvements
1. **Bug fix (High):** Grace countdown ticks during pause — must explicitly guard on `phase !== Paused`
2. **Bug fix (Medium):** AI gate ordering — same-tick finish is impossible; init grace BETWEEN human step and AI gate
3. **Type safety:** Replace flat 8-field interface with discriminated union (`'countdown' | 'resolved'`)
4. **Architecture:** Extract grace logic to `private updateGrace()` method (or `GraceCoordinator` class) for testability
5. **PixiJS perf:** Use BitmapText (not Text) for countdown timer; `scale.x` for progress bar (not `clear()/redraw()`)
6. **Simplification:** Slim interface, reuse existing data paths for race times

### Bugs Found in Original Plan
- Grace countdown DOES tick during pause (accumulator runs unconditionally) — needs explicit pause guard
- AI stepping gate closes before grace is initialized on same-tick finish — reorder init
- Q-to-quit is silently swallowed when human is in Racing phase during grace
- `forceFinish()` leaves `stuckTicks`/`respawnTicksLeft` inconsistent if called during Respawning

---

## Context

The current vs-ai mode is a time trial against a ghost — the race ends the instant the human finishes all laps, regardless of where the AI is. The user wants a proper head-to-head race where either racer can win, with a configurable grace period for the trailing racer to finish.

### Research Insights — Game Design

**Industry precedent (confirmed by Mario Kart, Forza, TrackMania, iRacing, Split/Second):**
- Fixed countdown after leader finishes is the dominant pattern
- Industry range: 15s (Forza) to 60s (Split/Second) for multiplayer
- TrackMania dynamically calculates timeout from track author-time + 5s buffer
- 5 seconds is short but appropriate for a 1v1 arcade game — creates real urgency

**UX best practices for grace banners:**
- Top-center placement is the proven position for urgent time-critical info
- Color progression: white/yellow → orange (50%) → red (below 2s)
- Initial large banner for 1-2s, then shrink to persistent countdown
- DNF shown as "DID NOT FINISH" — factual, not shameful. Best lap still shown regardless.

**Sources:**
- [Timer Conveyance in Games](https://www.gamersexperience.com/timerconveyance/)
- [TrackMania Game Modes Settings](https://wiki.trackmania.io/en/dedicated-server/Usage/OfficialGameModesSettings)
- [Forza End-of-Race Timer](https://forums.forza.net/t/gameplay-end-of-race-timer-end-of-race-triggered-before-race-timer-completed-1693311/672240)

---

## Design Approach: GameLoop Grace Coordinator (Option A)

All grace logic lives in **GameLoop** (renderer layer), which already coordinates both worlds. The engine layer gets one tiny addition (`forceFinish()`). No changes to physics, timing, or checkpoint systems.

**Why not engine-layer?** The engine's RaceController only knows about one car. Grace is inherently a multi-world concern.

### Research Insights — Architecture

**Validated:** Placing grace coordination in GameLoop is the correct pragmatic choice. `RaceController` is a mutable state machine (it was never immutable — it mutates `_state.phase` in 7+ places). Adding `forceFinish()` is consistent with the existing pattern, not a violation.

**Recommendation — Extract grace logic to a private method:**
The current `tick()` is ~68 lines. Adding inline grace logic would push it to 90-110 lines with two interleaved state machines. Extract to `private updateGrace(phaseBeforeStep: GamePhase): void` to keep `tick()` as a high-level orchestrator.

Alternative (higher investment, higher payoff): Extract to a `GraceCoordinator` class in a separate file — zero PixiJS imports, testable in isolation. GameLoop delegates:
```typescript
if (humanJustFinished) this.graceCoordinator.onRacerFinished('human', ticks);
if (aiJustFinished) this.graceCoordinator.onRacerFinished('ai', ticks);
const resolution = this.graceCoordinator.tick();
```

**Minimum viable approach:** `private updateGrace()` method. Same benefits with less file churn.

---

## Tasks

### Task 1: `RaceController.forceFinish()`
**File:** `src/engine/RaceController.ts`

Add one public method:
```typescript
/** Force-transition to Finished (called by GameLoop when grace period expires). */
forceFinish(): void {
  const rs = this._state;
  rs.phase = GamePhase.Finished;
  rs.stuckTicks = 0;
  rs.respawnTicksLeft = 0;
}
```
Called by GameLoop when AI wins and grace expires without the human finishing.

#### Research Insights

**Bug fix — reset related fields:** The original plan only set `phase`. But if `forceFinish()` is called while the human is Respawning (possible — human could be respawning when grace expires), `respawnTicksLeft` would be nonzero with a Finished phase, creating an inconsistent state. Reset `stuckTicks` and `respawnTicksLeft` to zero.

**JSDoc required:** Every existing public method on RaceController has JSDoc. Add one here for pattern consistency.

**Pattern-consistent:** This follows the same mutation pattern as `reset()`, `startGame()`, and the seven existing `rs.phase = ...` assignments in RaceController. No architectural violation.

---

### Task 2: Grace period state machine in GameLoop
**File:** `src/renderer/GameLoop.ts`

**New constant (module-private, NOT exported):**
```typescript
// -- Grace period (vs-ai) ────────────────────────────────────────────────
const GRACE_PERIOD_MS = 5000;
const GRACE_PERIOD_TICKS = Math.round(GRACE_PERIOD_MS / FIXED_DT_MS);
```

#### Research Insights — Constant Placement

**Pattern deviation fixed:** The original plan exported `GRACE_PERIOD_TICKS` from GameLoop.ts. But GameLoop's existing constants (`FIXED_DT_MS`, `DEFAULT_CHECKPOINT_COUNT`) are module-private. Race-flow tick constants live in RaceController.ts (`COUNTDOWN_BEAT_TICKS`, `STUCK_TIMEOUT_TICKS`). Since the grace constant is only consumed by GameLoop, make it **non-exported and module-local**. The `totalTicks` field on the state already carries the value to overlay consumers.

**Derive from FIXED_DT_MS:** `300` is a magic number. `Math.round(5000 / FIXED_DT_MS)` makes the 5-second intent structural, not just a comment.

---

**New type — Discriminated union (replaces flat interface):**
```typescript
type Racer = 'human' | 'ai';

interface GraceCountdown {
  readonly status: 'countdown';
  readonly leader: Racer;
  ticksLeft: number;
  readonly totalTicks: number;
}

interface GraceResolved {
  readonly status: 'resolved';
  readonly leader: Racer;
  readonly humanTotalTicks: number | null;  // null = DNF
  readonly aiTotalTicks: number | null;     // null = DNF
}

export type VsAiGraceState = GraceCountdown | GraceResolved;
```

#### Research Insights — Type Design

**Critical improvement from TypeScript review:** The original flat interface with `active: boolean` allows nonsensical states (e.g., `active: false` with `ticksLeft: 150`). A discriminated union on `status` lets TypeScript narrow types at compile time — `status === 'countdown'` guarantees `ticksLeft` exists.

**Both time fields nullable:** The original typed `humanTotalTicks: number` (non-nullable) but `aiTotalTicks: number | null`. This is asymmetric — the human can also DNF when AI finishes first and grace expires. The plan even acknowledges "Human DNF" in Task 5. Both must be `number | null`.

**Naming convention:** `VsAiGraceState` (not `VsAiGraceInfo`). The codebase uses `-State` for mutable, transitioning data (`RaceState`, `WorldState`, `TimingState`). `-Info` implies static metadata.

**Three-value status:** `inactive` state is represented by `null` (no grace object exists). `countdown` and `resolved` are the two active states. This avoids a third discriminant and matches the `| null` return pattern used by existing getters (`currentAiWorldState`).

**Simplification considered:** The simplicity reviewer proposed slimming to 4 fields by removing `totalTicks` and reusing existing data paths for race times. **Decision: keep `totalTicks` on GraceCountdown** (needed for progress bar ratio) but **move race times to GraceResolved only** (they're only needed at resolution time, not during countdown). This gives each variant exactly the fields it needs.

---

**Private state in GameLoop:**
```typescript
private vsAiGrace: VsAiGraceState | null = null;
```

**Core logic — extracted to `private updateGrace()`:**

```typescript
/**
 * Check for racer-finish transitions and manage the grace period countdown.
 * Called once per sub-step during vs-ai races, inside the accumulator loop.
 */
private updateGrace(phaseBeforeStep: GamePhase, phaseAfterStep: GamePhase): void
```

**Critical execution order inside the accumulator loop:**

```
1. Save phaseBeforeStep
2. stepGame (human physics + RaceController)
3. Save phaseAfterStep
4. >>> updateGrace(phaseBeforeStep, phaseAfterStep) <<<
   - Detect humanJustFinished (Racing→Finished edge)
   - Detect aiJustFinished (lapTimes.length >= targetLaps, guarded by grace state)
   - Handle simultaneous finish (check BOTH before starting grace)
   - Start grace / tick countdown / resolve grace
5. AI stepping gate (reads grace state that was JUST initialized)
6. Step AI world (if gate open)
```

#### Research Insights — Ordering Fix (Bug)

**DEFECT FOUND: Same-tick finish is impossible under the original ordering.** The original plan placed the AI gate BEFORE grace initialization. When the human finishes, `phase` becomes `Finished` immediately inside `stepGame()`. The AI gate reads the live phase, sees `Finished`, and shuts — even though grace hasn't been initialized yet (`vsAiGrace` is still null). The AI loses one tick of driving.

**Fix:** Initialize grace BETWEEN the human step and the AI gate. This ensures `vsAiGrace.active` is true before the gate evaluates. The AI gate then sees `status === 'countdown'` and stays open.

**AI finish detection — no separate boolean flag:** The original plan proposed a one-shot `aiFinishDetected` flag, manually reset in `resetWorld()`. This is fragile. Instead, derive from grace state: if `vsAiGrace === null && aiLapCount >= targetLaps`, create the grace state. The act of creating the grace object prevents re-triggering — no separate flag needed.

---

**AI stepping gate — extracted to private method:**
```typescript
private shouldStepAi(): boolean {
  if (!this.aiWorld) return false;
  const phase = this.raceController.state.phase;
  if (phase === GamePhase.Racing) return true;
  if (this.vsAiGrace?.status === 'countdown') {
    // During grace, step AI only if AI hasn't finished yet
    // (leader === 'ai' means AI already finished)
    return this.vsAiGrace.leader !== 'ai';
  }
  return false;
}
```

#### Research Insights — Readability

The original inline conditional (`this.aiWorld && !vsAiGrace?.aiFinished && (phase === Racing || ...)`) mixes three concerns: AI world existence, grace state, and human phase. Extracting to a named method with early returns makes the 5-second rule trivially clear.

---

**Grace countdown tick — with PAUSE GUARD:**

```typescript
// Inside updateGrace(), during countdown status:
const isPaused = phaseAfterStep === GamePhase.Paused;
if (!isPaused) {
  this.vsAiGrace.ticksLeft--;
}
```

#### Research Insights — Critical Bug Fix

**DEFECT FOUND: Grace ticks during pause.** The original plan claims "works naturally (accumulator doesn't advance while paused)." This is **wrong**. The accumulator IS unconditionally fed `deltaMS` every frame (line 105 of GameLoop.ts). The `while` loop runs. When paused, `stepGame()` returns unchanged state, but the loop body still executes. Without an explicit pause guard, the grace timer eats into the human's 5 seconds while paused.

**Decrement-first pattern:** Always decrement ticksLeft before checking `<= 0`. This ensures 300 ticks = exactly 5.000 seconds. Checking first would give 301 ticks.

**Check trailing finish BEFORE timeout:** On the exact tick the timer expires, the trailing racer might also finish. Check finish first, then check timeout — prevents a false DNF on the boundary tick.

---

**Edge cases handled:**
- Restart (R) during grace → `resetWorld()` clears `vsAiGrace = null`
- Quit (Q) during grace when human in Racing → **explicit override in updateGrace**: if `signals.quitToMenu && vsAiGrace?.status === 'countdown'`, set `abortTick = true` and call `onQuitToMenu?.()`
- Pause during grace → **explicit guard** — do NOT count down while paused
- `targetLaps === 0` (freeplay) → grace never starts (guard at top of `updateGrace`)
- Solo/Spectator → grace never starts (mode check)
- Both finish same tick → check BOTH before starting grace, skip to `resolved` directly
- Grace expires same tick trailing finishes → check finish BEFORE timeout
- `forceFinish()` during Respawning → safe (Task 1 resets related fields)

#### Research Insights — Q-to-Quit Bug

**DEFECT FOUND:** Currently, `tickRacing()` in RaceController does NOT handle `quitToMenu`. Only `tickPaused` and `tickFinished` do. If AI finishes first (grace starts, human stays in Racing) and the human presses Q, the signal is silently swallowed. The human is trapped. Handle this in `updateGrace` before the signal reaches RaceController.

---

**Grace state persistence:** `vsAiGrace` must NOT be nulled when status becomes `resolved`. The Finished overlay reads from it in the one-shot block. It persists until `resetWorld()`.

**Public getter:**
```typescript
/** Grace period state for overlay rendering (vs-ai mode only). */
get vsAiGraceState(): VsAiGraceState | null {
  return this.vsAiGrace;
}
```

**resetWorld() cleanup:**
```typescript
// In resetWorld(), under the existing AI state reset block:
// -- Grace period reset --
this.vsAiGrace = null;
```

---

### Task 3: HUD — Per-racer current lap + best lap
**File:** `src/renderer/HudRenderer.ts`

Replace the AI panel content from "AI total time + AI best" to "AI current lap + AI best":

- `aiTotalTimeText` → `aiCurrentLapText`: shows `AI Lap: X:XX.XXX` (from `aiState.timing.currentLapTicks`)
- `aiBestLapText` stays: shows `AI Best: X:XX.XXX`

The shared race clock is already the human's `totalTimeText` at the top (since both worlds share `totalRaceTicks`).

Layout (top-right, vs-ai mode):
```
1:23.456          ← shared race clock (existing)
Lap: 0:45.123     ← human current lap (existing)
Best: 0:42.890    ← human best lap (existing)
─────────────────
AI Lap: 0:47.321  ← AI current lap (cyan, new)
AI Best: 0:44.567 ← AI best lap (cyan, existing)
```

#### Research Insights

**Performance:** HudRenderer already uses string-diff guards (`lastAiTotalTimeDisplay`) to avoid unnecessary PixiJS text recalculation. Maintain this pattern for the new `aiCurrentLapText`:
```typescript
const aiLapDisplay = `AI Lap: ${formatRaceTime(aiState.timing.currentLapTicks)}`;
if (this.lastAiLapDisplay !== aiLapDisplay) {
  this.lastAiLapDisplay = aiLapDisplay;
  this.aiCurrentLapText.text = aiLapDisplay;
}
```

---

### Task 4: Grace countdown banner in OverlayRenderer
**File:** `src/renderer/OverlayRenderer.ts`

New `graceInfoSource` getter (wired by ScreenManager). New `graceContainer` with:
- Top-center banner (below countdown area)
- Leader status text: "AI FINISHED — COMPLETE YOUR RACE!" or "YOU FINISHED — AI IS STILL RACING..."
- Countdown timer: "4.8s" (orange, shifts red below 2s)
- Depleting progress bar

`updateGraceCountdown()` called from `render()`. Container hidden when grace inactive.

#### Research Insights — PixiJS v8 Performance (Critical)

**Use BitmapText, NOT Text, for the countdown timer.**
PixiJS `Text` re-rasterizes to a hidden canvas and re-uploads as a GPU texture on every `.text` change. At 60fps, that's 60 canvas draws + 60 texture uploads per second. `BitmapText` uses a pre-rendered font atlas — changing text only repositions quad vertices. The cost is negligible.

```typescript
// Setup (once):
BitmapFont.install({
  name: 'GraceTimerFont',
  style: { fontFamily: 'Arial', fontSize: 48, fill: '#ffffff' },  // white base
});

const timerText = new BitmapText({
  text: '5.0',
  style: { fontFamily: 'GraceTimerFont', fontSize: 48 },
});

// Per-frame: cheap vertex repositioning, zero rasterization
timerText.text = secondsLeft.toFixed(1);
timerText.tint = lerpColor(orangeColor, redColor, 1 - fraction);  // tint is free
```

**Key insight:** Install BitmapFont with **white fill**, then use `.tint` to apply color. Tint is a multiplicative GPU operation — zero cost to change per frame. This avoids font atlas regeneration that would happen if you changed `style.fill`.

**Progress bar — use `scale.x`, NOT `clear()/redraw()`:**
PixiJS docs explicitly warn: "Do not clear and rebuild graphics every frame." There's a known memory leak with frequent Graphics redrawing ([pixijs/pixijs#10549](https://github.com/pixijs/pixijs/issues/10549)).

```typescript
// Build once:
const barFill = new Graphics().rect(0, 0, 200, 12).fill({ color: 0xffffff });

// Per-frame: just a transform change (one matrix entry)
barFill.scale.x = Math.max(0, ticksLeft / totalTicks);
barFill.tint = lerpColor(orangeColor, redColor, 1 - fraction);
```

**Color interpolation helper:**
```typescript
const colorOrange = new Color(0xff8800);
const colorRed = new Color(0xff0000);
const scratch = new Color();

function lerpColor(a: Color, b: Color, t: number): number {
  scratch.setValue([
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
  ]);
  return scratch.toNumber();
}
```

**Container visibility:** `container.visible = false` is the recommended approach — skips rendering AND transform updates. Cheaper than `removeChild`/`addChild`.

**Guard text updates:** Match HudRenderer's pattern — only set `.text` when the displayed string changes:
```typescript
const display = secondsLeft.toFixed(1);
if (this.lastGraceTimerDisplay !== display) {
  this.lastGraceTimerDisplay = display;
  this.graceTimerText.text = display;
}
```
At 0.1s resolution, this means only ~50 actual text updates across the entire 5-second grace window.

#### Research Insights — UX Design (Industry-Validated)

- **Top-center placement confirmed** as the proven position for urgent time-critical information (The Gamer's Experience, The Division, Alienation)
- **Color progression:** Start yellow/orange, shift to red below 2 seconds. The `.tint` approach makes this free.
- **Consider:** A brief visual flash or scale pulse when the grace period first starts — the initial notification is the most critical moment. Even a 0.3s scale animation (like the existing Finished entrance) would help.
- **Progress bar keeps value:** The simplicity reviewer suggested dropping it as YAGNI. However, game UX research confirms it's more scannable than digits during active racing — the player is driving, not reading numbers. Keep it, but implement cheaply with `scale.x`.

---

### Task 5: Finished screen — DNF handling + grace-aware results
**File:** `src/renderer/OverlayRenderer.ts`

**Guard during active grace:** If `graceState?.status === 'countdown'`, suppress the Finished overlay and keep `finishedWasVisible = false` so the one-shot transition fires correctly when grace ends.

```typescript
// In updateFinished():
const graceState = this.graceInfoSource?.();
if (isFinished && graceState?.status === 'countdown') {
  // Grace guard: human's RaceController entered Finished but the grace period
  // is still active (trailing racer still racing). Suppress the overlay.
  // The one-shot entrance will fire when grace resolves to 'resolved'.
  return;
}
```

**Save title text reference** as `finishedTitleText` (currently created locally and lost).

**Rework AI comparison in `updateFinished()` one-shot block:**
- Read winner/loser from `graceState` when `status === 'resolved'`
- Both finished → "VICTORY!" / "DEFEAT" title + delta
- AI DNF → "VICTORY!" + "AI: DID NOT FINISH"
- Human DNF → "DEFEAT" + "AI wins! (AI: X:XX.XXX)"
- Best lap comparison still shown regardless of DNF

**Solo mode:** No change — `finishedAiCompareText` stays hidden.

#### Research Insights

**Leaky abstraction documented:** The overlay must understand that `GamePhase.Finished` doesn't mean "show results" if grace is active. This is inherent to the architecture (RaceController knows nothing about grace). The explicit comment above makes the reason clear for future maintainers.

**Read times from graceState, not curr.timing:** When the human DNFs, `curr.timing.totalRaceTicks` is the wall-clock elapsed time, not the sum of completed laps. The `GraceResolved` variant carries the correct values (`humanTotalTicks` / `aiTotalTicks`), with `null` for DNF. Always read from `graceState` in vs-ai mode.

**DNF presentation (industry standard):**
- Replace the trailing racer's time with "DID NOT FINISH" in a muted/grey color
- "VICTORY!" / "DEFEAT" title regardless of how the race ended
- Best lap comparison still shown (the racer did complete some laps)
- DNF is factual, not shameful — match the Forza/Gran Turismo neutral treatment

---

### Task 6: ScreenManager wiring
**File:** `src/renderer/ScreenManager.ts`

In constructor:
```typescript
this.overlayRenderer.setGraceInfoSource(() => this.gameLoop.vsAiGraceState);
```

`checkBestTime()` continues unchanged — AI best lap persistence is independent of grace.

#### Research Insights

**Pattern consistency:** This matches the existing getter-closure pattern used by `worldRenderer.setAiStateSource()` and `hudRenderer.setAiStateSource()`. The OverlayRenderer already has push-style setters for AI times — this new getter is for grace-specific data only. The existing push setters continue to deliver `aiBestLapTicks` and `aiTotalRaceTicks` as before.

---

### Task 7: Test suite — explicit test cases
Run `pnpm test`, fix any breakage from the changes.

#### Research Insights — Testing Plan (Was Underspecified)

The original plan said "run tests, fix breakage." For a state machine with this many transitions, that is insufficient. The grace period has at least **8 distinct paths** that should each be a named test case:

**Unit tests for grace state machine (headless, no PixiJS):**
1. Human finishes first → AI finishes during grace → both times recorded, correct winner
2. Human finishes first → grace expires → AI gets DNF
3. AI finishes first → human finishes during grace → both times recorded, correct winner
4. AI finishes first → grace expires → human gets DNF, `forceFinish()` called
5. Both finish on exact same tick → skip to resolved, no countdown
6. Restart (R) during active grace → grace state cleared, full reset
7. Freeplay mode (`targetLaps === 0`) → grace never activates
8. Grace does NOT tick during pause
9. Q-to-quit during grace when human is Racing → quits cleanly

**Integration checks:**
10. `forceFinish()` from Respawning phase → no stale `respawnTicksLeft`
11. Finished overlay suppressed during countdown, fires one-shot on resolved
12. Solo mode → zero grace behavior, unchanged flow

If extracting to a `GraceCoordinator` class, items 1-9 become trivial pure-logic unit tests. If keeping as `private updateGrace()`, test via GameLoop's public getter.

---

## Execution Order

1 → 2 → 6 → 3 → 4+5 → 7

(RaceController → GameLoop core → ScreenManager wiring → HUD → Overlay grace+finished → Tests)

## Files Modified

| File | Change |
|------|--------|
| `src/engine/RaceController.ts` | Add `forceFinish()` method (resets phase + stuckTicks + respawnTicksLeft) |
| `src/renderer/GameLoop.ts` | Grace state machine (in `updateGrace()` private method), AI stepping gate (in `shouldStepAi()`), `VsAiGraceState` type, grace getter, `resetWorld()` cleanup |
| `src/renderer/HudRenderer.ts` | AI panel: current lap replaces total time |
| `src/renderer/OverlayRenderer.ts` | Grace countdown banner (BitmapText + scale.x bar), Finished screen DNF handling |
| `src/renderer/ScreenManager.ts` | Wire grace info getter |

## Verification

1. `npx tsc --noEmit` — zero errors
2. `pnpm test` — all tests pass (including new grace test cases)
3. Manual: vs-ai mode, human finishes first → grace countdown appears, AI finishes → comparison shown
4. Manual: vs-ai mode, AI finishes first → grace countdown for human, human finishes → comparison shown
5. Manual: grace expires → DNF shown for trailing racer
6. Manual: R during grace → full restart
7. Manual: Solo mode → unchanged behavior (no grace)
8. **NEW:** Manual: Pause during grace → countdown freezes, resumes on unpause
9. **NEW:** Manual: Q during grace when human still racing → quits cleanly to menu
10. **NEW:** Manual: Both finish very close together → correct winner determined by lap times

## Appendix: Research Sources

**Game Design:**
- [Timer Conveyance in Games](https://www.gamersexperience.com/timerconveyance/)
- [TrackMania Official Game Modes Settings](https://wiki.trackmania.io/en/dedicated-server/Usage/OfficialGameModesSettings)
- [Forza End-of-Race Timer](https://forums.forza.net/t/gameplay-end-of-race-timer-end-of-race-triggered-before-race-timer-completed-1693311/672240)
- [Split/Second Multiplayer Wiki](https://splitsecond-velocity.fandom.com/wiki/Multiplayer)
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)

**PixiJS v8:**
- [PixiJS Text Performance Overview](https://github.com/pixijs/pixijs/blob/v8.16.0/src/scene/__docs__/scene-text-overview.md)
- [PixiJS Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [Graphics Memory Leak Issue #10549](https://github.com/pixijs/pixijs/issues/10549)
- [Color Class API (v8)](https://pixijs.download/v8.10.0/docs/color.Color.html)

**State Machine Patterns:**
- [XState Delayed Transitions](https://stately.ai/docs/delayed-transitions) — timeout-preempted-by-event pattern
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html) — fixed timestep, accumulator
