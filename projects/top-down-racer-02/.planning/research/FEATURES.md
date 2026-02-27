# Features Research

**Research Date:** 2026-02-27
**Scope:** Top-down racing games and AI-vs-human racing games — feature landscape, table stakes, differentiators, and anti-features.

---

## Reference Games & Projects

**Top-Down Racers (feature benchmarks):**
- Circuit Superstars (2021) — modern indie gold standard; simcade physics, visual polish, multiplayer
- Art of Rally (2020) — rally-focused; stunning art, weather, surface types; audio design is best-in-class
- Rush Rally Origins (2022) — mobile-to-PC rally; tight controls, co-driver calls
- Micro Machines series (1991-2006) — multiplayer-first, creative tracks, screen-sharing chaos
- Death Rally (1996, 2012 remake) — weapons + racing, upgrade loop
- Data Wing (2018) — minimalist mobile racer; proves how little visual complexity you need if the feel is right
- Super Sprint / RC Pro-Am (arcade classics) — established the genre's core loop
- Reckless Racing series (mobile) — touch-optimized drifting, career mode
- PAKO series — arcade evasion, not lap-based, but strong top-down car feel

**AI Racing Projects (feature benchmarks):**
- AWS DeepRacer — the dominant AI racing product; 1/18th scale cars + virtual simulator; reward function authoring, training visualization, leaderboards, community races
- Gran Turismo Sophy (Sony AI, 2022) — superhuman AI racing agent; the "AI beats humans" narrative done at the highest level; ghost comparison replay
- OpenAI Gym CarRacing-v2 — the canonical 2D RL racing environment; simple but widely used
- TrackMania AI community projects — multiple RL agents trained on TrackMania; popular YouTube content showing AI learning progression
- Various GitHub RL racing projects — most are training-only with no human play mode; the gap this project fills

---

## Feature Categories

### 1. Core Racing Mechanics

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Analog steering (-1.0 to +1.0) | Table Stakes | Low | Engine | Digital input feels awful in top-down racers. Non-negotiable. |
| Throttle/brake as analog (0-100%) | Table Stakes | Low | Engine | Binary throttle = no finesse. Keyboard smoothing bridges the gap. |
| Keyboard input smoothing | Table Stakes | Medium | Engine, Input | Interpolates digital keys toward analog values over ~100ms. Without this, keyboard play is unplayable in simcade. |
| Weight transfer physics | Table Stakes | High | Engine | Car pitches forward on braking, rear lightens. This is what makes turning feel connected to speed. |
| Tire grip model | Table Stakes | High | Engine, Weight Transfer | Grip as a function of load, slip angle, surface. Doesn't need to be Pacejka — simplified model is fine. Core of "game feel." |
| Natural oversteer from physics | Table Stakes | High | Tire Grip, Weight Transfer | Lift-off oversteer, trail braking into slides. Emergent from the physics, not scripted. |
| Speed-dependent steering | Table Stakes | Medium | Engine | Steering authority reduces at speed. Without this, the car feels like it's on rails. |
| Three surface types (road/runoff/wall) | Table Stakes | Medium | Track Geometry | Road = full grip, runoff = reduced grip + drag, wall = hard stop with slide. Minimum viable track boundary. |
| Wall collision with sliding | Table Stakes | Medium | Engine, Track Geometry | Hit wall -> speed penalty proportional to impact angle -> slide along wall. Punishing but not instant-death. |
| Lap timing (current + best) | Table Stakes | Low | Engine, Checkpoints | The fundamental measure of player skill in a time-trial racer. |
| Checkpoint system | Table Stakes | Medium | Track Geometry | 20-50 gates per track. Validates forward progress, prevents shortcuts, provides AI reward signal. |
| Respawn/reset on stuck | Differentiator | Low | Engine | Teleport car back to last checkpoint after timeout. Reduces frustration. Some top-down racers lack this. |
| Analog gamepad support | Differentiator | Medium | Input Layer | True analog input is vastly better than smoothed keyboard. But many browser games skip it. |
| Countdown start sequence | Table Stakes | Low | Engine, Renderer | 3-2-1-GO. Without it, the race start feels broken. |

### 2. HUD Elements

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Speedometer | Table Stakes | Low | Renderer, Engine State | Numeric or bar display. Players need speed feedback for braking points. |
| Current lap time | Table Stakes | Low | Renderer, Engine State | Running timer for the current lap. |
| Best lap time | Table Stakes | Low | Renderer, Engine State | Displayed persistently. The target to beat. |
| Lap counter (X / Total) | Table Stakes | Low | Renderer, Engine State | "Lap 2/3" — basic orientation. |
| Minimap | Table Stakes | Medium | Renderer, Track Geometry | Top-down racers with tracks larger than one screen need a minimap. Shows car position and optionally AI position. |
| Position delta vs AI | Differentiator | Medium | Renderer, AI Ghost | "+0.45s" or "-0.12s" vs the AI ghost. Real-time gap timer. Extremely motivating. |
| Input visualization | Differentiator | Low | Renderer, Input State | Small overlay showing current steering/throttle/brake. Helps players understand their own inputs. Educational. |
| Sector times | Differentiator | Medium | Engine, Checkpoints | Split the track into 3 sectors, show time per sector. Helps identify where you're losing time. |
| Speed trail/history | Anti-Feature | Medium | — | Clutters the HUD. Sector times serve the same analytical purpose more cleanly. |

### 3. Visual Polish

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Smooth camera following car | Table Stakes | Low | Renderer | Slight lag/lerp on camera movement. Without it, the viewport feels rigidly attached. |
| Camera rotation with car heading | Differentiator | Medium | Renderer | Camera rotates so the car always points "up." Controversial — some players prefer fixed camera. Should be toggleable. |
| Skid marks on road | Table Stakes | Medium | Renderer, Tire State | Dark trails where tires slip. Universally expected in any racing game with drifting. Fade over time. |
| Dust/dirt particles on runoff | Differentiator | Medium | Renderer, Particle System | Small particle burst when car touches soft surface. Reinforces surface feedback visually. |
| Spark particles on wall contact | Differentiator | Low | Renderer, Collision Events | Brief spark spray on wall hits. Communicates "you hit something" instantly. |
| Speed lines / motion blur | Differentiator | Medium | Renderer | Subtle radial lines or blur at high speed. Reinforces sense of velocity. |
| Track-side objects (barriers, cones, trees) | Differentiator | Medium | Renderer, Track Data | Decorative objects that give the track visual character. Not physics-interactive. |
| Car sprite rotation smoothing | Table Stakes | Low | Renderer | Interpolate car rotation between ticks for smooth visual at any framerate. |
| Distinct AI car visual | Table Stakes | Low | Renderer | AI car must be visually distinct from player car — different color, transparency, or glow. Otherwise confusing. |
| Checkpoint flash on crossing | Table Stakes | Low | Renderer | Brief visual feedback when crossing a checkpoint gate. Confirms progress. |
| Finish line visual | Table Stakes | Low | Renderer, Track Data | Checkered pattern or distinct marking at start/finish. |
| Day/night or weather variants | Anti-Feature | High | — | Massive scope increase for minimal gameplay value in a time-trial/AI-vs-human game. |
| Car customization/skins | Anti-Feature | Medium | — | Scope trap. Irrelevant to core value proposition. |

### 4. Sound Design

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Engine sound with RPM pitch-shift | Table Stakes | Medium | Audio System, Engine State | Single engine sample, pitch-shifted by speed. Huge impact on game feel for minimal effort. Web Audio API. |
| Tire screech on slide | Table Stakes | Medium | Audio System, Tire State | Triggered when tire slip exceeds threshold. Volume/pitch scales with slip severity. |
| Wall impact sound | Table Stakes | Low | Audio System, Collision Events | Brief thud/crunch on wall contact. |
| Countdown beeps | Table Stakes | Low | Audio System | Beep on 3, 2, 1, higher-pitch beep on GO. |
| Lap completion chime | Table Stakes | Low | Audio System | Brief positive sound on completing a lap. Different tone for new best lap. |
| Surface transition sound | Differentiator | Low | Audio System, Surface State | Subtle crunch/gravel sound when transitioning from road to runoff. Reinforces the surface feedback loop. |
| Background music / ambient track | Differentiator | Low | Audio System | Low-key ambient or electronic track. Optional — some players mute it. Should not be priority. |
| Doppler effect on AI car pass | Anti-Feature | High | — | Cool but wildly disproportionate effort for a 2D top-down game. |
| Commentary/announcer | Anti-Feature | High | — | Massive asset/integration cost. Wrong genre. |

### 5. AI Training Features

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Gymnasium-compatible environment | Table Stakes | High | AI Bridge, Engine | The standard interface for RL. Without it, no standard RL library works. |
| Ray-cast observation vector | Table Stakes | High | Engine, Track Geometry | 9 rays at 22.5deg intervals across 180deg forward arc. The AI's "eyes." |
| Dense per-tick reward function | Table Stakes | High | AI Bridge, Checkpoints | Checkpoint progress as primary signal. Sparse rewards (lap-only) make training 100x slower. |
| Configurable reward weights | Differentiator | Medium | AI Bridge | Expose reward component weights as config. Enables rapid reward-shaping experiments without code changes. |
| Training metrics to TensorBoard | Table Stakes | Medium | Python Pipeline | Episode reward, lap time, completion rate, loss curves. Standard practice; training without metrics is flying blind. |
| Headless training at high tick rate | Table Stakes | Medium | Engine (headless) | 3000-10000+ ticks/sec. The entire reason for engine/renderer separation. |
| Parallel environment instances | Differentiator | High | AI Bridge, Engine | Run N simultaneous envs (vectorized). Multiplies training throughput. SB3 supports SubprocVecEnv natively. |
| Training visualization (browser) | Differentiator | High | Renderer, AI Bridge | Watch the AI train in real-time in the browser at reduced speed. Mesmerizing to watch; strong portfolio/demo value. |
| Model checkpoint saving/loading | Table Stakes | Medium | Python Pipeline | Save model every N steps, resume training. Basic but essential. |
| Curriculum learning support | Differentiator | High | AI Bridge, Track System | Start on simpler track/fewer checkpoints, graduate to harder tracks. Accelerates training significantly. |
| Reward component logging | Differentiator | Medium | AI Bridge | Log each reward component (progress, speed bonus, wall penalty, etc.) separately. Critical for debugging reward shaping. |
| Episode recording/replay | Differentiator | High | Engine, AI Bridge | Record full episode as action sequence, replay deterministically. Debug tool and content generator. |
| Observation space visualization | Differentiator | Medium | Renderer, AI Bridge | Draw the 9 ray-cast lines in the renderer. Shows what the AI "sees." Extremely compelling for demos. |
| Action space normalization | Table Stakes | Low | AI Bridge | Normalize actions to [-1, 1] range for RL stability. Standard practice. |

### 6. AI vs Human Mode Features

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Ghost car (AI replay) | Table Stakes | Medium | Engine, Renderer | AI car rendered as semi-transparent ghost. Core to the product: "race the AI." |
| Real-time gap timer | Differentiator | Medium | Engine, Renderer | Shows time delta between human and AI at each checkpoint. "+0.3s" in red, "-0.1s" in green. Emotional driver. |
| AI difficulty via model selection | Differentiator | Low | AI Bridge | Ship 2-3 models trained to different levels. "Rookie AI" vs "Expert AI." Easy if you save checkpoints during training. |
| Pre-race AI demo lap | Differentiator | Medium | Renderer, Ghost System | Before the human races, show the AI doing one lap. Sets the benchmark. Builds tension. |
| Post-race comparison | Differentiator | Medium | Renderer, Replay System | Side-by-side or overlaid replay after the race ends. Shows where the human gained/lost time. |
| "You beat the AI!" celebration | Table Stakes | Low | Renderer | Clear, satisfying feedback when the human wins. The payoff moment of the entire product. |
| Spectator/demo mode | Table Stakes | Low | Renderer, Ghost System | Watch the AI race alone. Landing page / attract mode. Auto-plays when no input detected. |
| AI racing line visualization | Differentiator | Medium | Renderer, Replay Data | Draw the optimal line the AI takes. Educational — shows players the "right" way to drive. |
| Speed comparison graph | Differentiator | High | Renderer, Engine State | Post-race speed-vs-distance graph comparing human and AI. Deep analytical feature. |
| AI learning progression replay | Differentiator | High | Replay System, Model Checkpoints | Show the AI's improvement from random to expert as a time-lapse. Extremely compelling content. Very cool for portfolio. |
| Live AI inference in browser | Differentiator | High | AI Bridge, ONNX/TFLite | Run the trained model directly in the browser (ONNX.js or TensorFlow.js). Eliminates need for a Python server in production. |

### 7. Track Features

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Spline-based track geometry | Table Stakes | High | Engine | Centerline spline + width defines the entire track. Natural for checkpoint placement and AI distance-from-center observation. |
| 1 well-designed track | Table Stakes | Medium | Track System | Minimum viable product. Must have varied corners (hairpins, sweepers, chicanes). |
| 3-5 tracks with variety | Differentiator | Medium (each) | Track System | Different lengths, speeds, difficulty levels. Extends replayability. |
| Track preview/selection screen | Differentiator | Low | Renderer | Thumbnail + name + best times. Simple but necessary once you have multiple tracks. |
| Elevation changes (visual only) | Anti-Feature | High | — | Top-down perspective makes elevation changes confusing. Art of Rally manages it but at enormous art cost. |
| Dynamic track elements | Anti-Feature | High | — | Moving obstacles, opening barriers, etc. Breaks determinism, complicates AI training massively. |
| Track editor | Anti-Feature | Very High | — | Massive scope. Cool but wrong priority. Hardcode tracks, ship the game. |
| Procedural track generation | Differentiator | High | Track System | Generate random valid tracks from parameters. Excellent for AI training variety and replayability. But high effort. |
| Track surface variation zones | Differentiator | Medium | Track System, Engine | Different grip zones on the same track (e.g., a gravel section). Adds tactical variety. |

### 8. Leaderboard & Stats

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Local best lap per track | Table Stakes | Low | Engine, Storage | localStorage. Minimum viable persistence. |
| Human vs AI best comparison | Table Stakes | Low | Engine, Storage | Show both human best and AI best on the same screen. The core competitive hook. |
| Last 5 laps history | Differentiator | Low | Engine, Storage | Shows recent performance trend. Low effort, nice to have. |
| Session stats (total laps, time played) | Differentiator | Low | Engine, Storage | Adds weight to a play session. |
| Online leaderboards | Anti-Feature | High | — | Requires backend, auth, anti-cheat. Massive scope. Out of scope per PROJECT.md. |
| Achievements/badges | Anti-Feature | Medium | — | Scope creep. Not relevant to the core "race the AI" loop. |
| Detailed telemetry export | Anti-Feature | Medium | — | Developer tool, not a user feature. Training metrics cover this for the AI side. |

### 9. UX & Meta Features

| Feature | Category | Complexity | Dependencies | Notes |
|---------|----------|------------|--------------|-------|
| Instant restart (R key) | Table Stakes | Low | Engine | Restart the current lap/race immediately. Zero friction. Critical for time-trial feel. |
| Pause menu | Table Stakes | Low | Engine, Renderer | Pause, resume, quit to menu. Basic expectation. |
| Main menu / title screen | Table Stakes | Low | Renderer | Track selection, mode selection (race AI, spectate, practice). |
| Settings (volume, controls) | Table Stakes | Low | Renderer, Storage | Audio volume, key rebinding (optional). Minimum: volume slider. |
| Loading screen / progress | Table Stakes | Low | Renderer | Brief loading indicator while assets load. Prevents "is it broken?" anxiety. |
| Tutorial / first-race onboarding | Differentiator | Medium | Renderer, Engine | Brief overlay: "Use arrow keys. Beat the ghost car." 5 seconds of instruction. Huge for first-time users. |
| Performance/FPS counter (debug) | Differentiator | Low | Renderer | Toggle-able FPS display. Useful for dev, some players want it. |
| Fullscreen toggle | Table Stakes | Low | Renderer | F11 or button. Browser games that can't fullscreen feel trapped. |
| Mobile/touch support | Anti-Feature | High | — | Out of scope per PROJECT.md. Desktop browser only. Virtual joystick never feels good for racing. |

---

## Cross-Cutting Dependencies

```
Track Geometry ─────┬──── Checkpoint System ─── Lap Timing ─── Leaderboard
                    │
                    ├──── Surface Types ─── Tire Grip Model ─── Weight Transfer
                    │                                            │
                    ├──── AI Ray-Casting ─── Observation Vector  │
                    │                                            │
                    └──── Wall Collision ─────────────────────────┘
                                                                 │
Engine (deterministic) ──── AI Bridge ──── Python Training Pipeline
       │                       │
       │                       ├──── Reward Function
       │                       ├──── Gymnasium Wrapper
       │                       └──── TensorBoard Metrics
       │
       └──── Renderer (read-only) ──── HUD ──── Ghost Car ──── AI vs Human Mode
                    │
                    ├──── Visual Effects (skid marks, particles)
                    ├──── Audio System
                    └──── Camera System
```

**Critical Path:** Track Geometry -> Physics Engine -> Checkpoint System -> AI Bridge -> Training Pipeline -> Ghost Replay -> AI vs Human Mode

**Parallel Workstreams (after engine):**
- Renderer + Visual Polish (independent of AI)
- Audio System (independent of AI)
- AI Training Pipeline (independent of renderer)

---

## Feature Prioritization Summary

### P0 — Ship Blockers (Table Stakes)
Without these, the product doesn't function or feels broken:
- Analog steering/throttle with keyboard smoothing
- Weight transfer + tire grip physics (the "feel")
- Spline-based track with checkpoints and surfaces
- Wall collision with sliding
- Lap timing, speedometer, minimap HUD
- Skid marks, car rotation smoothing
- Engine sound with pitch-shift, tire screech, impact sounds
- Ghost car with distinct visual
- Gymnasium environment, ray-cast observations, dense rewards
- Headless training + TensorBoard metrics
- Local leaderboard (human vs AI best)
- Instant restart, pause, main menu
- Spectator/demo mode
- 1 complete track

### P1 — High-Value Differentiators
These make the product compelling rather than just functional:
- Real-time gap timer (human vs AI)
- Observation space visualization (draw the rays)
- Training visualization (watch AI learn in browser)
- Pre-race AI demo lap
- "You beat the AI!" celebration moment
- Tutorial/onboarding overlay
- AI difficulty via model selection (2-3 models)
- Dust/spark particles
- Surface transition sounds
- Configurable reward weights
- Reward component logging
- Countdown start sequence (already table stakes but cheap)

### P2 — Nice-to-Have Differentiators
Stretch goals if time allows:
- 3-5 tracks with selection screen
- Post-race comparison replay
- AI racing line visualization
- AI learning progression replay (training time-lapse)
- Live AI inference in browser (ONNX.js)
- Camera rotation toggle
- Speed lines/motion blur
- Sector times
- Parallel training environments
- Session stats
- Input visualization overlay
- Gamepad support
- Episode recording/replay
- Procedural track generation

### Anti-Features (Deliberately NOT Building)
These would waste effort or hurt the product:
- **Online multiplayer/leaderboards** — backend/auth/anti-cheat scope explosion; local-only per PROJECT.md
- **Car-to-car collision** — ghosts only; simplifies physics and AI training enormously
- **Car customization/skins** — scope trap; zero gameplay value for this product
- **Track editor** — massive scope; hardcode tracks and ship
- **Mobile/touch support** — desktop browser only per PROJECT.md; virtual joysticks ruin racing feel
- **Damage/health system** — wrong game genre; would require a completely different reward model
- **Difficulty settings** — AI trains to one level; humans rise to meet it; multiple models serve this better
- **Dynamic track elements** — breaks determinism, complicates AI training
- **Elevation changes** — confusing in top-down view without enormous art investment
- **Weather system** — massive scope, minimal gameplay value for a time-trial game
- **Doppler effect** — disproportionate effort for 2D top-down
- **Commentary/announcer** — wrong genre entirely
- **Achievements/badges** — scope creep; not relevant to "race the AI" loop
- **Dedicated drift mechanic** — natural oversteer from physics only; scripted drift systems feel fake
- **External physics engine** — breaks determinism requirement

---

## Key Insight: What Makes This Project Different

Most open-source AI racing projects are training-only (no human play) or human-only (no AI). The competitive space for "train an AI, then race it yourself in the browser" is nearly empty. The differentiating value is not the racing game itself (competent top-down racers exist) or the AI training (CarRacing-v2 exists) but the **complete loop**: train -> watch AI improve -> challenge it yourself -> try to win.

The portfolio/demo value compounds: the training visualization shows technical depth, the AI-vs-human mode shows a polished product, and the ghost replay system ties them together into a narrative.

**The single most important differentiator is the "moment of truth" when a human tries to beat the AI and either wins or loses.** Every feature decision should be evaluated against whether it serves that moment.

---

*Research based on domain knowledge of: Circuit Superstars, Art of Rally, Rush Rally Origins, Micro Machines, Data Wing, AWS DeepRacer, Gran Turismo Sophy, OpenAI Gym CarRacing-v2, TrackMania AI community projects, and general RL racing literature.*
*Research date: 2026-02-27*
