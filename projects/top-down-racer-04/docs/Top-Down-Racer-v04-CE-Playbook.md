# Top-Down Racer v04 — CE Workflow Playbook

**The Battle Plan: How CE's Loop Maps to Each Phase**
*Briggsy × Claude.ai — March 2026*

---

## How to Read This

Each phase gets the full CE loop treatment. But not every phase needs every command with the same intensity. Some phases are brainstorm-heavy (fuzzy creative decisions). Some are plan-heavy (complex technical choreography). Some are compound-heavy (tons of lessons to capture). This playbook calls out where to lean in and where to keep it light.

The v04 spec (14 ADRs, locked decisions) already answers most of the "what" questions. CE's job is the "how" — and more importantly, making each phase's lessons compound into the next.

**`/ce:deepen-plan` runs on EVERY plan.** No exceptions. This is the same move that secretly carried v02's planning quality when CE was running covertly behind GSD. Now it's native. In future projects we may be more selective based on what we learn here, but v04 is the test build — full blast, measure everything, then trim.

---

## The Flywheel Across All 5 Phases

```
Phase 0 ──compound──→ CLAUDE.md + docs/solutions/ (prompt engineering lessons)
                           ↓
Phase 1 ──reads────→ starts informed ──compound──→ asset pipeline lessons
                                                      ↓
Phase 2 ──reads────→ starts smarter ──compound──→ renderer lessons
                                                      ↓
Phase 3 ──reads────→ starts even smarter ──compound──→ shader lessons
                                                           ↓
Phase 4 ──reads────→ pattern library growing ──compound──→ deep knowledge
                                                               ↓
Phase 5 ──reads────→ full project context ──compound──→ v05 ready
```

By Phase 5, CLAUDE.md is a living encyclopedia of v04-specific knowledge. This is CE's whole bet — and why GSD's fresh-context approach can't do this.

---

## Phase 0: Asset Generation (Fully Autonomous)

**What ships:** All visual assets generated via Gemini Imagen 3 API and dropped into `assets\raw\`. No human art involvement.

**CE intensity profile:**
- Brainstorm: **MEDIUM** — prompt engineering for image generation is genuinely fuzzy territory
- Plan: **HIGH** — the asset generator script + prompt definitions are real code
- Deepen-plan: **HIGH** — bad prompts = bad assets = cascading quality problems
- Work: **MEDIUM** — build two scripts, run them, verify output
- Review: **MEDIUM** — code review on scripts, visual spot-check on outputs
- Compound: **HIGH** — prompt engineering lessons are gold for any future project

Code builds two files:
- `scripts/asset-prompts.ts` — typed prompt definitions for every asset (versioned in git)
- `scripts/generate-assets.ts` — calls Gemini Imagen 3 API, drops PNGs into `assets\raw\`

**Prerequisite:** `GEMINI_API_KEY` in `.env` (gitignored). Get one from Google AI Studio.

### Session 0: Plan Phase 0

```
/ce:plan Build the autonomous asset generation pipeline for v04.

Two scripts: asset-prompts.ts (typed prompt definitions for every asset)
and generate-assets.ts (calls Gemini Imagen 3 API, saves PNGs to assets/raw/).

Asset inventory per ADR-11: 4 car sprites (3 player colors + 1 AI), 
3 track backgrounds (2048×2048), 3 tileable textures (asphalt, grass, curb), 
1 menu background. All transparent PNGs where needed.

Script must be idempotent — re-running regenerates everything cleanly.
API key from .env (GEMINI_API_KEY). Prompts versioned in code, never hardcoded 
in the generator script.

Reference ADR-02 and ADR-11 for full spec.
```

**What to push `/ce:deepen-plan` on:**
- What if Gemini returns a non-transparent background on car sprites?
- What if tileable textures have visible seams? Prompt strategies to force seamless tiling.
- Rate limits — how many API calls before throttling? Batching strategy.
- What if generated quality is poor? Retry logic? Prompt iteration workflow?
- Error handling — partial failures (3 of 11 assets generated, script crashes)
- Image dimensions — does Gemini Imagen 3 respect exact pixel size requests?

### After Phase 0: Visual Spot-Check (Briggsy's One Hands-On Moment)

After the script runs, you look at the generated assets. This is the "drive the car, does it work?" exception. You're not creating art — you're QA'ing the AI's art. If something looks wrong, the fix is updating the prompt in `asset-prompts.ts` and re-running, not opening Photoshop.

### Phase 0 Compound

```
/ce:compound
```

Capture prompt engineering lessons: which prompt patterns produced good results, which needed iteration, what Gemini Imagen 3 handles well vs poorly. This is reusable knowledge for any future project that needs autonomous asset generation.

**Audio note:** No audio generation in Phase 0. Engine sounds are layered Web Audio API synthesis built in Phase 4 (ADR-08). Gemini can't generate audio.

---

## Phase 1: Asset Pipeline + Track Redesign

**What ships:** Asset processor tooling, typed manifest, texture atlas builder, new Track 2 + Track 3 geometry defined and engine-tested.

**CE intensity profile:**
- Brainstorm: **LOW** — ADRs 02, 03, 04, 12 already locked these decisions
- Plan: **HIGH** — complex tooling phase, multiple deliverables
- Deepen-plan: **HIGH** — stress-test the asset pipeline design before building
- Work: **MEDIUM** — tooling code, track data files
- Review: **HIGH** — asset pipeline is foundational, bugs here cascade everywhere
- Compound: **CRITICAL** — first phase sets the tone for the whole flywheel

### Session 1: Plan Phase 1

```
/ce:plan Build the v04 asset pipeline and track redesign. 

The asset pipeline ingests raw AI-generated PNGs from assets/raw/, processes 
them (resize, optimize, spritesheet pack), and outputs game-ready assets to 
public/assets/ with a typed TypeScript manifest at src/assets/manifest.ts. 
No magic strings anywhere in game code.

Simultaneously, define new geometry for Track 2 (speedway — longer, high-speed, 
genuine braking zones) and Track 3 (gauntlet — mixed-radius corners, no two 
the same). Track 1 geometry is FROZEN. Track geometry lives in src/tracks/ 
as TypeScript data files.

See the v04 spec for ADR-02 (asset pipeline), ADR-03 (car sprites), ADR-04 
(track art), ADR-12 (track redesign constraints).

The simulation engine in src/engine/ is FROZEN — do not modify it.
```

**What to watch for in the plan:**
- Does it scaffold the asset processor as a standalone Node.js script?
- Does it use Sharp for image processing?
- Does the manifest pattern match ADR-02's typed approach?
- Does Track 2 have genuine braking zones (not just curves)?
- Does Track 3 have the decreasing-radius corner (the bastard)?
- Does it propose copying the engine from v02 as a discrete first step?

### Session 1b: Deepen the Plan

```
/ce:deepen-plan
```

**Push it on:**
- What happens if a raw asset is the wrong dimensions?
- What happens if the texture atlas exceeds PixiJS's max texture size?
- How does the manifest handle missing assets gracefully?
- Are there circular dependencies between the asset processor and the game code?
- Track 2 and Track 3 geometries — do the checkpoint arrays make sense for the AI training pipeline?

### Session 2: Execute Phase 1

```
/ce:work
```

Code executes the plan. Atomic commits per task. Briggsy reviews at the end.

### Session 2b: Review

```
/ce:review
```

14 parallel review agents hit the code. Pay special attention to:
- Asset manifest type safety
- Track geometry validity (closed polygons, checkpoint ordering)
- Engine boundary violations (any imports from src/engine/ into new code)

### Session 2c: Compound (DO NOT SKIP)

```
/ce:compound
```

**Capture everything:**
- What did the asset pipeline get right on the first try?
- What did `/ce:deepen-plan` catch that the original plan missed?
- Any Sharp gotchas (image format quirks, memory usage)?
- Track geometry lessons (coordinate system, boundary polygon winding order)
- How long did the phase take? Token usage?

**Update CLAUDE.md** with Phase 1 patterns. This is the seed of the flywheel.

---

## Phase 2: Core Visual Upgrade

**What ships:** High-res car sprites integrated, track art for all 3 circuits, tiled surface textures, camera polish.

**CE intensity profile:**
- Brainstorm: **LOW** — ADRs cover this, assets already generated
- Plan: **MEDIUM** — straightforward integration, less novel than Phase 1
- Deepen-plan: **HIGH** — runs on every plan, no exceptions
- Work: **HIGH** — lots of asset integration, renderer changes
- Review: **HIGH** — visual layer is hard to unit test, review matters more
- Compound: **HIGH** — renderer patterns will directly feed Phase 3

### Session 3: Plan Phase 2

```
/ce:plan Integrate all Phase 0 assets into the game via the Phase 1 asset 
pipeline. Replace geometric placeholders with high-res car sprites. Apply 
track background art to all 3 circuits. Implement tiled surface textures 
as overlays using RenderTexture masks. Polish the camera viewport.

This is renderer work — stays entirely in the renderer layer. 
Do not touch src/engine/. Reference ADR-03 (car sprites), ADR-04 (track art).
The asset manifest from Phase 1 provides typed references to all assets.
```

**Deepen-plan focus areas:**
- PixiJS v8 texture loading — async patterns, error handling for missing assets
- Camera viewport math — does it correctly crop the large track backgrounds?
- RenderTexture mask performance — will tiling tank framerate?
- Sprite rotation — confirm PixiJS native rotation vs spritesheet approach

### After Phase 2 Work + Review: Compound Hard

```
/ce:compound
```

Phase 2 compound output is GOLD for Phase 3. Renderer patterns, PixiJS filter quirks, texture loading lessons — all of this directly feeds post-processing work.

---

## Phase 3: Post-Processing & Effects

**What ships:** Bloom, motion blur, shadows, heat shimmer, upgraded particles.

**CE intensity profile:**
- Brainstorm: **MEDIUM** — effect priority is set (ADR-05) but implementation details benefit from exploration
- Plan: **HIGH** — shader work is precision engineering, filter chain ordering matters
- Deepen-plan: **CRITICAL** — GLSL bugs are hell to debug, stress-test everything
- Work: **MEDIUM** — effects are relatively independent, implement in priority order
- Review: **HIGH** — performance implications of every effect
- Compound: **HIGH** — shader patterns are reusable knowledge

### Session 5: Plan Phase 3

```
/ce:plan Implement the post-processing pipeline per ADR-05. All effects run 
on a PostProcessContainer wrapping the game world. HUD stays OUTSIDE the 
filter chain (HUD always sharp, world gets effects).

Priority order: P0 (bloom/glow + car shadow), P1 (motion blur + skid marks), 
P2 (heat shimmer + speed lines), P3 (full scene bloom).

Use @pixi/filter-* packages where available, custom GLSL where needed.
Context7 should pull current PixiJS v8 filter API docs.
```

**This is where Context7 earns its keep.** PixiJS v8 filter APIs are finicky and change between minor versions. Context7 pulls live docs so Code isn't guessing at function signatures.

**This is where Serena earns its keep.** Tracing how the renderer container hierarchy works (WorldContainer → TrackLayer → CarLayer → EffectsLayer) requires symbol-level code navigation. Serena finds references across the codebase instantly.

**This is where Sequential Thinking earns its keep.** Filter chain ordering has genuine complexity — bloom before or after motion blur? Displacement map UV animation timing? These are multi-step reasoning problems.

**Deepen-plan focus areas:**
- Filter chain ordering — does bloom before motion blur look different than after?
- Performance budget — each filter adds a render pass. At what point does 60fps drop?
- HUD isolation — confirm the PostProcessContainer/HUDContainer split actually works
- Heat shimmer — displacement maps in PixiJS v8, what's the API?

---

## Phase 4: Commercial UI & Audio

**What ships:** Stitch-based menus, commercial HUD (speedometer, mini-map, lap counter), layered engine audio.

**CE intensity profile:**
- Brainstorm: **MEDIUM** — HUD layout and menu flow benefit from exploration
- Plan: **HIGH** — mixed DOM/Canvas architecture (menus are DOM, HUD is PixiJS)
- Deepen-plan: **HIGH** — runs on every plan, no exceptions
- Work: **HIGH** — most diverse deliverables (UI + audio + mini-map)
- Review: **MEDIUM** — less systemic risk than engine/renderer phases
- Compound: **HIGH** — UI patterns, audio architecture, DOM/Canvas bridge lessons

### Session 7: Plan Phase 4

```
/ce:plan Build the commercial UI layer and audio system per ADR-06, 07, 08.

Main menu and track selection are DOM overlays (HTML/CSS over canvas). 
Stitch designs are reference only — Code implements from the screenshots.

HUD stays in PixiJS: analog speedometer (Graphics arc), lap counter, lap timer, 
best lap, mini-map (track polygon at 1/20 scale + car dots), position indicator.
HUD container is OUTSIDE the PostProcessContainer (no filters on HUD).

Audio: 3 WAV engine loops (idle/mid/high RPM) with GainNode crossfade 
based on carState.speed. Keep v02's synthesized SFX. Optional menu music.
```

**Deepen-plan focus areas:**
- DOM overlay z-index management — does the menu reliably sit above the canvas?
- Mini-map performance — redrawing the track polygon every frame at 1/20 scale
- Audio crossfade smoothness — GainNode ramp timing to avoid pops
- Speedometer arc math — mapping carState.speed to visual arc rotation

---

## Phase 5: AI Retraining & Validation

**What ships:** Sanity run on Track 1, full training on Track 3, cross-track validation on Track 2, ONNX export ≤50KB.

**CE intensity profile:**
- Brainstorm: **LOW** — ADR-13 is locked tight
- Plan: **MEDIUM** — training pipeline is proven from v02, just new data
- Deepen-plan: **HIGH** — training failures are expensive to debug
- Work: **LOW** — mostly running training scripts and waiting
- Review: **MEDIUM** — validate convergence curves, model size
- Compound: **CRITICAL** — training lessons are the crown jewel for v05

### Session 9: Plan Phase 5

```
/ce:plan Execute the AI retraining strategy per ADR-13.

Step 1: Sanity run on Track 1 (oval) — 100K steps. Validates reward function 
and pipeline. Expected: clean laps within 100K. If fails: reward function 
is broken, stop and diagnose.

Step 2: Primary training on Track 3 (gauntlet) — 2M steps. Same PPO config 
as v02. Expected: competent laps by 1M steps. Export ONNX at convergence.

Step 3: Cross-track validation on Track 2 (speedway) — inference only. 
Load Track 3 model, run on Track 2. Expectation: should struggle somewhat. 
If it drives cleanly: either Track 2 is too similar or the model genuinely 
generalized (document which).

Reward function ships unchanged from v02. Do not modify unless a specific 
training failure demands it.
```

**Deepen-plan focus areas:**
- What if Track 1 sanity run fails? Diagnostic steps before touching the reward function.
- What if Track 3 training plateaus at 1M steps? When to extend vs when to investigate.
- ONNX export size — what if the model exceeds 50KB? Pruning options.
- Cross-track validation — how do you quantify "struggles somewhat" vs "fails completely"?

### The Generalization Audit

This is the headline result of v04. After training:
1. Load the v02 ONNX model → run it on v04 Track 3 → it should FAIL
2. Load the v04 ONNX model → run it on v04 Track 3 → it should SUCCEED
3. Load the v04 ONNX model → run it on Track 2 → document what happens

Result #1 proves the redesign worked. Result #2 proves the training worked. Result #3 reveals whether the AI generalized or just memorized a different track.

### Final Compound

```
/ce:compound
```

This is the big one. Capture:
- Training convergence data (steps to competent driving)
- Reward function behavior on different track geometries
- ONNX model size and inference performance
- Generalization audit results
- Everything that would make v05 training faster and smarter

---

## Session Management Cheat Sheet

| Phase | Recommended Sessions | Why |
|-------|---------------------|-----|
| Phase 0 | 1-2 | Plan + deepen is session 1, build scripts + run + compound is session 2 |
| Phase 1 | 2-3 | Plan + deepen is session 1, execution + review + compound is session 2-3 |
| Phase 2 | 2 | Less novel than Phase 1, compound lessons from Phase 1 speed things up |
| Phase 3 | 2-3 | Shader work is fiddly, may need iteration |
| Phase 4 | 2-3 | Most diverse deliverables, but lower systemic risk |
| Phase 5 | 2 | Training is mostly waiting, but validation needs careful documentation |

**Total: ~12-16 sessions across the full build.**

### Session Start Ritual (Every Session)

1. Claude Code reads CLAUDE.md (automatic)
2. Review recent entries in `docs/solutions/` from previous compound steps
3. Review any open items in `todos/`
4. Start the CE command for this session's work

### Session End Ritual (Every Session)

1. Run `/ce:review` if work was done
2. Run `/ce:compound` — ALWAYS
3. Update CLAUDE.md if new patterns or lessons emerged
4. Commit everything including docs/ changes

---

## CE vs GSD: What to Watch For

This is the comparison build. Here's what to actively track for the side-by-side:

| Dimension | GSD Expected Behavior | CE Expected Behavior | Track This |
|-----------|----------------------|---------------------|------------|
| Planning depth | GSD made its own plans. We secretly ran CE's `/deepen-plan` on them — GSD never knew. CE was the real planning muscle. | `/ce:plan` + `/ce:deepen-plan` native, running as designed | Does CE planning natively match what the covert CE+GSD combo produced? |
| Context rot | Fresh subagents per task, quality stays flat | Single context per session, compound carries knowledge | Does quality degrade within sessions? |
| Cross-phase learning | Each phase starts clean (amnesia) | Each phase reads previous compound output | Does Phase 3 visibly benefit from Phase 1+2 lessons? |
| Review quality | GSD verification phase | 14 parallel review agents | Which catches more issues? |
| Token efficiency | More tokens on subagent spawning | More tokens on review agents | Total token spend per phase? |
| Time to first working code | GSD interview → research → plan → execute | CE brainstorm → plan → deepen → work | Which gets to working code faster? |
| Human effort | GSD interviews you, then goes autonomous | CE expects you to define outcomes, then goes autonomous | How much hand-holding does each need? |
| End-of-project knowledge | .planning/ folder with specs | CLAUDE.md + docs/solutions/ library | Which leaves better artifacts for v05? |

**The honest prediction:** CE will win on cross-phase learning and end-of-project knowledge. GSD would win on context rot protection. Planning depth is the real question — in v02, CE's `/deepen-plan` was secretly doing the heavy lifting on GSD's plans. GSD didn't even know it was running. Now CE is planning AND refining its own work natively. It should be at least as good, possibly better since deepen-plan was designed to refine CE plans, not GSD's. The real question is whether CE's compound flywheel generates enough value to offset the lack of fresh-context safety.

---

*Plan → Work → Review → Compound. Every phase. Every time. Let it stack.*
