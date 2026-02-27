# Top-Down Racer v02 — GSD Interview Prep

> **Purpose:** Pre-baked answers for the `/gsd:new-project` interview. Every decision here has been war-gamed by Briggsy and Claude before Harry sits down at the terminal. This is the source of truth for design intent.
>
> **Status:** 🔨 In Progress

---

## 1. Car Physics Model

| Question | Decision |
|----------|----------|
| Realism level | **Simcade** |
| Player inputs | **Throttle (0–100%), Brake (0–100%), Steering (-1.0 to +1.0)** |
| Analog vs digital input | **Analog with keyboard smoothing** |
| Drift mechanics | **No dedicated drift system — natural oversteer from physics only** |
| Simulation tick rate | **Fixed 60Hz, decoupled from rendering** |

### Notes & Rationale

- **Simcade** hits the sweet spot: enough physics depth that the AI has to genuinely learn to drive (momentum, grip limits, braking points) without being a rabbit hole that eats Phase 1. Full sim is overkill for a 2D top-down perspective. Arcade is too simple — AI solves it in minutes.
- **Analog inputs** are essential for simcade physics to feel right. Binary steering with momentum-based physics feels terrible. Neural networks naturally output continuous values, so this aligns with the AI training pipeline. Keyboard smoothing (ramp-up/ramp-down over a few frames) makes it feel great without a controller.
- **Gamepad support** comes nearly free with analog inputs — Xbox controller Just Works™.
- **No dedicated drift** — keeps the AI's optimization target clean (fast laps, not style points). Natural oversteer from the simcade model still gives the "oh shit I'm sliding" moments.
- **60Hz fixed tick** — plenty for 2D top-down speeds, simple to reason about. Decoupled from rendering so headless mode just skips the draw step. Can bump to 120Hz later if tunneling becomes an issue (just change the timestep constant).

---

## 2. Track Design

| Question | Decision |
|----------|----------|
| Track definition method | **Spline-based centerline with width** |
| Track types (closed loop, point-to-point) | **Closed loops only** |
| Number of tracks for v02 | **1 for Phases 1–2, target 3–5 for Phase 3** |
| Checkpoint system | **Evenly-spaced gates along spline (20–50 per track), must be crossed in order** |

### Notes & Rationale

- **Spline-based centerline** is the gold standard for 2D racing and RL research. Track creation is just dropping control points. "Distance from centerline" is a natural continuous value that makes the AI reward function trivial. Checkpoint placement is just sampling along the spline.
- **Closed loops only** — simplifies lap counting, checkpoint logic, and AI training. Point-to-point is a v03 feature.
- **1 track for Phases 1–2, 3–5 for Phase 3** — don't over-commit early. Once the spline system works, cranking out tracks is fast. Multiple tracks prevent AI overfitting to one layout.
- **Checkpoint gates** perpendicular to the spline at regular intervals. Must cross in order = catches shortcuts and backward driving. Normalized progress (checkpoint N of total = X%) gives AI a continuous "am I making progress?" signal. Backbone of the reward function.

---

## 3. Collision & Boundaries

| Question | Decision |
|----------|----------|
| Wall collision behavior | **Slide along wall, speed penalty proportional to impact angle** |
| Off-track surfaces | **Uniform layering: Road → Soft runoff (reduced grip/speed) → Hard wall** |
| Car-to-car collision | **Ghost cars (no collision) — pure time trial comparison** |

### Notes & Rationale

- **Slide along walls** with proportional speed penalty gives the AI a gradient to learn from — grazing is bad, head-on is worse. Full stop is rage-inducing for humans and brutal for AI training. Bounce feels terrible in top-down.
- **Three-layer surface model** (road → soft runoff → hard wall) creates a richer learning signal for the AI (three tiers of consequence). Trivial to implement with spline system — just "distance from centerline" mapped to a friction coefficient. Uniform layering across all track sections for v02; mixed layouts (barriers at track edge in some sections) is a Phase 3 or v03 enhancement.
- **Ghost cars** keep the AI-vs-human comparison clean — pure lap time battle, no "the AI bumped me" excuses. Avoids doubling sim engine complexity for one mode. Avoids the much harder multi-agent RL training problem. Car-to-car collision is a killer v03 feature.

---

## 4. AI Observation Space

| Question | Decision |
|----------|----------|
| Ray-cast count and spread | **9 rays across 180° forward arc (22.5° intervals)** |
| Additional state info | **Speed, angular velocity, steering angle, normalized lap progress, distance from centerline (14 total values)** |
| Privileged info vs human-equivalent | **Mildly privileged — AI gets centerline distance and lap progress** |

### Notes & Rationale

- **9 rays at 180°** (22.5° intervals) is the proven sweet spot from RL racing research. Enough spatial resolution to distinguish tight corners from sweeping curves, small enough to train fast.
- **14-value observation vector:** 9 ray distances + speed + angular velocity + steering angle + normalized lap progress + distance from centerline. Tight and clean.
- **Mildly privileged info is fine** — centerline distance and lap progress are the most valuable training signals we have. Removing them for "fairness" just slows training for no benefit. The privileged data roughly compensates for human spatial intuition and peripheral vision that rays can't capture. Think of it as the AI's version of a racing driver's learned track knowledge.

---

## 5. Reward Shaping

| Question | Decision |
|----------|----------|
| What defines good driving | **Checkpoint progress (primary) + speed bonus. No centerline bonus.** |
| Penalty system | **Stillness timeout (hard kill), wall contact (proportional), off-track (lighter), backward driving. Penalties always smaller than progress rewards.** |
| Reward density (sparse vs dense) | **Dense — reward signal every tick, with milestone bonuses at checkpoints** |

### Notes & Rationale

- **Checkpoint progress + speed bonus** as the reward foundation. No centerline bonus — it fights optimal racing lines (outside-inside-outside). The AI should learn to use the full track width.
- **Four-tier penalty system:** stillness timeout (hard kill, the safety net), wall contact (proportional to impact), off-track (lighter), backward driving. Key principle: penalties always smaller than progress rewards. Overly harsh penalties create timid AIs that crawl around the track.
- **Dense rewards are non-negotiable** for continuous control RL. Every tick gets a small signal (progress toward next checkpoint, speed bonus, surface penalties). Checkpoint crossings land as bigger milestone bonuses on top. Sparse rewards would work for simple environments but not simcade physics with analog controls.
- Reward shaping is iterative — first version rarely needs to be the last. Adjust based on observed training behavior.

---

## 6. Game Features (Phase 3)

| Question | Decision |
|----------|----------|
| HUD elements | **Lap timer + best lap, lap counter, digital speedometer, minimap. No health/damage.** |
| Difficulty settings | **None for v02 — track selection + AI opponent IS the difficulty. Damage model is the natural v03 difficulty lever.** |
| Polish level (particles, audio, etc.) | **Medium — skid marks, dust/sparks particles, engine sound with pitch-shift** |

### Notes & Rationale

- **Clean HUD:** Lap timer + best lap is the core competitive metric. Minimap helps on complex tracks. Digital speedo in a corner. No damage/health — wall contact speed penalty is the immediate "you fucked up" feedback.
- **No difficulty settings** — the natural difficulty curve is track selection (easy oval → hard circuits) then beating the AI in Phase 6. Damage model + difficulty tiers is a natural v03 pairing (tanky car on easy, glass cannon on hard).
- **Medium polish** is the sweet spot: skid marks, dust particles on runoff, sparks on wall contact, pitch-shifting engine sound. Enough to feel like a real game, not so much that Phase 3 swallows the project. Can dial up or down later.

---

## 7. AI vs Human Mode (Phase 6)

| Question | Decision |
|----------|----------|
| Mode format | **Both — simultaneous racing (the star) + ghost replay for studying AI lines** |
| Solo AI observation mode | **Yes — spectator/demo mode. Watch the AI drive solo. Briggsy's default mode.** |
| Leaderboard / time tracking | **Local only — best lap per track (human + AI), session history, human vs AI comparison screen** |

### Notes & Rationale

- **Simultaneous racing is the star** — the real-time "oh shit it's pulling away" feeling is the entire emotional payoff. Ghost replay comes free if we're recording lap data (which we need for training analysis anyway).
- **Spectator/demo mode** is zero implementation cost (simultaneous mode without the human car) and serves triple duty: showoff demo, training debugging tool, and Briggsy's default mode.
- **Local leaderboard only** — best lap per track for human and AI, session history, comparison screen. No online leaderboards (server infrastructure is massive scope for no v02 payoff).

---

## Architectural Decisions (Already Locked)

These are non-negotiable and were decided before this document:

1. **Two-layer architecture** — Simulation engine (pure logic) completely decoupled from renderer (PixiJS)
2. **Deterministic custom physics** — No external physics engines. Determinism required for AI training.
3. **TypeScript + PixiJS** — Game tech stack
4. **GSD is the single orchestrator** — No competing workflow systems
5. **Opus 4.6** — Model choice for architecture and spec work
6. **Six-phase build** — Engine → Renderer → Features → Gym Wrapper → AI Training → AI vs Human
