# Phase 6: AI vs Human Mode - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** Briggsy's locked decisions (2026-03-01)

<domain>
## Phase Boundary

Wire the trained AI model into the browser for real-time inference. Add three game modes (Solo, vs AI, Spectator), ghost car rendering, checkpoint gap timer, win/loss celebration, and localStorage leaderboard. This is the complete product — the "moment of truth."

**In scope:** ONNX model loading, browser inference, AI ghost car, mode selection UI, leaderboard, ghost replay recording/playback.
**Out of scope:** Server infrastructure, online leaderboards, attract mode / AI demo lap (KILLED).

</domain>

<decisions>
## Implementation Decisions

### Model Delivery
- Export trained PyTorch model to ONNX format
- Load in browser via onnxruntime-web (add as production dependency)
- VecNormalize observation stats exported as static JSON (mean/variance arrays)
- Both .onnx model file and normalization JSON go in public/assets/
- Zero server infrastructure — fully static, Vercel-deployable
- Production model: Track 3 (Gauntlet) trained at 2M steps

### Game Modes (3 modes, no more)
- **Solo** — existing single-player, zero changes needed
- **vs AI** — simultaneous ghost-car racing (no collision between cars), real-time checkpoint gap timer, distinct AI car visual, win/loss celebration
- **Spectator** — AI drives solo, player watches. Literally vs AI mode minus the human car. No separate implementation — reuse vs AI code path with human car hidden

### UI Flow
- Mode selection (Solo / vs AI / Spectator) added as buttons on the existing TrackSelectScreen
- No new screen — reuse existing track select
- Flow: Main Menu → Track Select (pick track + pick mode) → Race
- Two clicks to racing (track card click + mode button, or mode then track)

### AI Car Visual
- AI car must be visually distinct from player car
- Different color / transparency / glow — Claude's discretion on exact visual treatment
- Must be clearly distinguishable at a glance during racing

### Gap Timer
- Real-time checkpoint gap timer during vs AI mode
- Shows time delta (ahead/behind) at each checkpoint crossing
- Positive = player ahead, negative = player behind

### Win/Loss Celebration
- "You beat the AI!" celebration feedback when human posts a faster lap
- Distinct feedback when AI wins (encouraging, not punishing)

### Leaderboard
- localStorage-based — best lap per track for human and AI separately
- Comparison display showing human best vs AI best per track
- Persists across sessions

### Ghost Replay
- Record lap data (position, rotation per tick or per sample interval)
- Replay as transparent car for studying AI lines
- Used in vs AI mode for the AI car's movement

### KILLED Features
- ~~AVH-04: Pre-race AI demo lap~~ — Spectator mode covers this use case. DO NOT BUILD.
- ~~Attract mode~~ — KILLED. Spectator mode is sufficient.

### Claude's Discretion
- ONNX export script implementation details (Python conversion script)
- Observation normalization approach (how to replicate VecNormalize in JS)
- AI car rendering technique (transparency level, color, glow shader vs tint)
- Ghost replay data format (full tick recording vs sampled keyframes with interpolation)
- Gap timer UI placement and styling
- Win/loss celebration visual design (overlay, animation, sound)
- Leaderboard UI layout on track select screen
- Mode button placement/styling on track select screen

</decisions>

<specifics>
## Specific Ideas

- AI car in vs AI mode runs ONNX inference every tick in the browser — same observation vector (14 values) and action space (steer, throttle, brake) as training
- Reuse existing raycaster.ts and observations.ts from src/ai/ for browser-side observation building
- HeadlessEnv pattern from src/ai/headless-env.ts is the template for browser AI runner — same step() logic but with ONNX inference instead of bridge
- TrackSelectScreen.ts currently fires `{ type: 'select', index }` — needs to add mode to the action payload
- ScreenManager.startGame() needs a mode parameter threaded through to GameLoop
- GameLoop needs to manage two World instances (or one World with two cars) for vs AI mode
- The AI's "ghost car" uses the same engine physics — it's a real simulation, not a replay (in vs AI mode the AI runs live inference; ghost replay is for recording/playback of completed laps)

</specifics>

<deferred>
## Deferred Ideas

- Online leaderboards (explicitly out of scope per PROJECT.md)
- Multiple AI difficulty levels (AI trains to one level per PROJECT.md constraints)
- Mobile support (out of scope)

</deferred>

---

*Phase: 06-ai-vs-human-mode*
*Context gathered: 2026-03-01 via locked decisions from Briggsy*
