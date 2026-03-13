---
title: "Phase 5: AI Retraining & Validation"
type: feat
status: active
date: 2026-03-12
deepened: 2026-03-12
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

# Phase 5: AI Retraining & Validation

## Enhancement Summary

**Deepened on:** 2026-03-12
**Research agents used:** Architecture Strategist, Performance Oracle, Security Sentinel, Python Reviewer, TypeScript Reviewer, Code Simplicity Reviewer, Pattern Recognition Specialist, Best Practices Researcher, Framework Docs Researcher, Spec Flow Analyzer, Repo Research Analyst

### Critical Corrections (6 execution-blocking errors found)

1. **ONNX output path contradiction** — Phase 1 deletes ALL of `public/assets/`, not just subdirectories. Changed to `public/ai/` (outside blast radius).
2. **Export command missing `--vecnorm` flag** — v02 script requires it. All commands corrected.
3. **Model path convention mismatch** — v02 uses flat `models/` directory, not per-run subdirectories. All paths corrected.
4. **`--resume` syntax wrong** — v02 requires `--resume <checkpoint_path>`, not bare flag. Corrected.
5. **Par times in wrong units** — Evaluate script outputs seconds; registry expects ticks. Added `× 60` conversion.
6. **Phase 5.5 scientifically invalid** — Generalization audit was acknowledged as trivially true. Eliminated; generalization captured in Phase 5.4.

### Key Improvements

1. Collapsed 8 sub-phases to 7 (eliminated invalid Phase 5.5)
2. Added warm-up inference in BrowserAIRunner to prevent first-frame lag
3. Added inputTensor disposal to fix memory leak in browser inference
4. Changed par time formula from absolute best to P10 percentile (avoids lucky outlier)
5. Added lap time quality gate (prevents model that passes by crawling)
6. Added TensorBoard diagnostic reference for every monitoring checkpoint
7. Strengthened VecNormalize stats validation in browser
8. Added training artifact cleanup step
9. Flagged `n_epochs=10` intervention threshold (`approx_kl > 0.02`)

---

## Overview

Retrain the PPO AI from scratch on v04's redesigned track geometry, validate generalization across circuits, export a production ONNX model, and tune par times from AI lap data. The v02 training pipeline is proven and copied verbatim — this phase is about new data (track geometry), not new code.

The entire pipeline worked flawlessly in v02: 60K steps to competent driving with zero reward tuning. v04 budgets 2M steps for harder geometry. The only code change is a one-line fix in `HeadlessEnv` to read per-track checkpoint counts from the registry instead of a hardcoded constant.

## Problem Statement / Motivation

v04 redesigns Track 2 (Speedway) and Track 3 (Gauntlet) — the v02 AI model memorized v02 Track 3's specific polygon geometry and is useless on different circuits. A full retrain from scratch on the new geometry is mandatory. Transfer learning from a memorized model would produce worse convergence than starting fresh — the old "knowledge" is actively wrong.

The retraining also answers the generalization question: does the AI learn to *drive* or just *remember*? Cross-track validation provides hard evidence.

## Proposed Solution

Copy v02's battle-tested training pipeline (already done in Phase -1), make one code change (dynamic checkpoint count), then execute a three-step training sequence:

1. **Sanity run** — Track 1 (oval), 100K steps. Proves the pipeline works before investing in long runs.
2. **Production training** — Track 3 (gauntlet), 2M steps. The real training run.
3. **Cross-track validation** — Track 2 (speedway), inference only. Documents generalization behavior.

Then export ONNX, tune par times, and verify browser integration.

## Technical Approach

### Architecture

The training architecture is two-process, connected by WebSocket:

```
Terminal 1: Bridge Server (TypeScript)
  npx tsx src/ai/run-bridge.ts
  └─ HeadlessEnv ← Engine (FROZEN) ← Track Registry

Terminal 2: Python Training
  python -m training.train_ppo --track-id track-03
  └─ Gym Env → BridgeClient → WebSocket → Bridge Server
  └─ PPO (SB3) → VecNormalize → TensorBoard
```

**Observation vector:** 14 floats — 9 ray distances + speed + yawRate + steering + lapProgress + centerlineDist
**Action space:** 3 floats — [steer, throttle, brake]
**Reward:** Dense, continuous arc-length progress (NOT checkpoint-based). Penalties for walls, off-track, stillness.

#### Research Insights: Bridge Architecture

**Bridge pattern validation:** This is the standard **Environment Server** pattern used by Unity ML-Agents (C# server + Python client via gRPC), NVIDIA Isaac Gym, and DeepMind Lab. WebSocket is the correct IPC choice at this scale — v02 achieved ~2000 steps/sec, and the bottleneck is physics simulation, not IPC throughput. ZeroMQ (10x throughput) or shared memory would be overkill.

**Performance projection for v04 Track 3:** The dominant per-step cost is `castRays()` (O(R × S) where R=18, S=~550 boundary segments = ~9,900 intersection tests) and `distanceToTrackCenter()` (~1,200 spline evaluations for 2400-unit track). Projected throughput: 1,500–2,200 steps/sec, giving 15–22 minutes for 2M steps (within the 30-minute budget).

**Bridge server creates fresh HeadlessEnv per reset** — no session state leak between episodes. The Python config is re-applied every episode via the `reset` message. This is correct for RL training.

### The One Code Change: HeadlessEnv Checkpoint Count

**File:** `src/ai/headless-env.ts`

Phase 1 adds `checkpointCount` to `TrackInfo` (30/40/45 per track). HeadlessEnv currently hardcodes `CHECKPOINT_COUNT = 30`. The fix:

```typescript
// BEFORE (v02):
const CHECKPOINT_COUNT = 30;
this.track = buildTrack(trackInfo.controlPoints, CHECKPOINT_COUNT);

// AFTER (v04):
this.track = buildTrack(trackInfo.controlPoints, trackInfo.checkpointCount);
```

This is `src/ai/`, NOT `src/engine/` — no engine freeze violation.

#### Research Insight: Make checkpointCount Required

**`checkpointCount` should be a REQUIRED field on `TrackInfo`, not optional.** Every v04 track has a defined count (30/40/45). Making it optional with a `?? 30` fallback creates a "silent wrong answer" failure mode — if someone adds a track and forgets `checkpointCount`, the code silently uses 30 instead of erroring at compile time.

**Action for Phase 1:** Make `checkpointCount` required on `TrackInfo`. Add `checkpointCount: 30` to Track 1's entry. Then HeadlessEnv uses `trackInfo.checkpointCount` directly — no fallback, no `??`. The compiler enforces completeness.

### Episode Length Scaling for Longer Tracks

**Critical finding from SpecFlow analysis:** v02's `maxSteps=3000` at 60Hz gives 50 seconds per episode. v04 Track 3 is ~60% longer (~2400 units vs ~1500 units). At the same car speed, the AI needs ~80 seconds to complete a lap — episodes would truncate before a lap is possible, preventing the AI from ever learning lap completion.

**Solution:** Set global `maxSteps=5000` in `ai-config.json` (both Python and TypeScript sides). This gives ample margin for the longest track without per-track config complexity. The ~67% increase in episode length adds zero per-step compute overhead (PPO rollout buffer is fixed at `n_steps=2048`).

| Track | Approx Length | Required Time | maxSteps |
|-------|--------------|---------------|----------|
| Track 1 (oval) | ~1500 units | ~50s | 3000 (original) |
| Track 2 (speedway) | ~1950 units | ~65s | ~3900 |
| Track 3 (gauntlet) | ~2400 units | ~80s | ~4800 |

**Truncation diagnostic:** If `rollout/ep_len_mean` in TensorBoard equals `maxSteps` (5000), episodes are systematically truncating. Increase to 6000–7000 before changing anything else. Update BOTH `python/ai-config.json` AND `src/ai/ai-config.ts` (dual-config sync — see Known Gotchas).

Update both:
- `python/ai-config.json` → `"maxSteps": 5000`
- `src/ai/ai-config.ts` → `maxSteps: 5000` in `DEFAULT_AI_CONFIG`

### ONNX Output Path

**CRITICAL CORRECTION:** Phase 1's asset processor deletes the ENTIRE `public/assets/` directory (clean-before-write), confirmed in Phase 1 plan line 85: "DELETE public/assets/ entirely." The original plan incorrectly stated the clean target was only `sprites/` and `textures/`.

**Solution:** Export to `public/ai/` — OUTSIDE the `public/assets/` blast radius. ML artifacts are not art assets and do not belong in the art asset directory.

Update:
- `python/training/export_onnx.py` → default output dir to `../../public/ai/`
- `src/ai/browser-ai-runner.ts` → model path to `/ai/model.onnx`, stats path to `/ai/vecnorm_stats.json`
- Create `public/ai/` directory (gitkeep)

#### Research Insight: Centralize Asset Path Constants

Define paths in a single location to avoid magic strings:

```typescript
// In ai-config.ts or a new ai-paths.ts:
export const AI_ASSET_PATHS = {
  model: '/ai/model.onnx',
  vecNormStats: '/ai/vecnorm_stats.json',
} as const;
```

### PPO Hyperparameters (Unchanged from v02)

```python
learning_rate = 3e-4
n_steps = 2048        # rollout buffer
batch_size = 128
n_epochs = 10
gamma = 0.995         # high discount for long-term lap completion
gae_lambda = 0.95
clip_range = 0.2
ent_coef = 0.01
vf_coef = 0.5
max_grad_norm = 0.5
```

VecNormalize: `norm_obs=True, norm_reward=True, clip_obs=10.0`

#### Research Insight: n_epochs=10 Intervention Threshold

Community consensus recommends 3–5 epochs for continuous control. `n_epochs=10` worked in v02's simple oval but Track 3's harder geometry may cause policy gradient instability.

**Keep 10 as-is (proven), but monitor:** If `train/approx_kl` consistently exceeds 0.02 during Track 3 training, reduce to 5 as the first intervention. This is the single most impactful hyperparameter to adjust if training stalls.

**TensorBoard metrics to watch (ranked by diagnostic value):**

| Metric | Healthy Range | Red Flag |
|--------|--------------|----------|
| `rollout/ep_rew_mean` | Increasing trend | Flat or decreasing after 500K |
| `rollout/ep_len_mean` | Below `maxSteps` (5000) | Equal to 5000 (truncation) |
| `train/approx_kl` | < 0.02 | Consistently > 0.03 |
| `train/explained_variance` | Approaching 1.0 | Negative or stuck near 0 |
| `train/entropy_loss` | Slowly decreasing | Crashes to very negative quickly |
| `train/clip_fraction` | 0.05–0.15 | Near 0 or >0.3 |

### Reward Function (Unchanged from v02)

```json
{
  "weights": {
    "progress": 1.0,
    "speedBonus": 0.0,
    "wallPenalty": -0.002,
    "offTrackPenalty": -0.001,
    "backwardPenalty": 0.0,
    "stillnessPenalty": -0.001,
    "stillnessSpeedThreshold": 2.0
  },
  "episode": {
    "maxSteps": 5000,
    "stillnessTimeoutTicks": 180
  }
}
```

The ONLY change from v02 is `maxSteps: 3000 → 5000`. Reward weights are identical.

### Implementation Phases

#### Phase 5.1: Pre-Training Setup

Config changes, code fixes, and quality improvements. All tests must pass before any training begins.

**Tasks:**
- [x] Update `src/ai/headless-env.ts` — replace hardcoded `CHECKPOINT_COUNT = 30` with `trackInfo.checkpointCount` (no fallback — field is required per Phase 1)
- [x] Update `python/ai-config.json` — set `maxSteps: 5000`
- [x] Update `src/ai/ai-config.ts` — set `maxSteps: 5000` in `DEFAULT_AI_CONFIG`
- [x] Update `python/training/export_onnx.py` — change default output dir to `../../public/ai/`
- [x] Update `python/training/export_onnx.py` — make `--vecnorm` optional with auto-derive from model path via `vecnorm_path_for()` (matching evaluate.py pattern)
- [x] Update `src/ai/browser-ai-runner.ts` — model path to `/ai/model.onnx`, stats path to `/ai/vecnorm_stats.json`
- [x] Fix `src/ai/browser-ai-runner.ts` — add `inputTensor.dispose()` in `try/finally` block (memory leak fix)
- [x] Add warm-up inference in `BrowserAIRunner.load()` — 3 dummy inference calls after session creation to JIT-compile WASM kernels (prevents 50–200ms first-frame lag)
- [x] Strengthen `isValidStatsJson()` in `browser-ai-runner.ts` — add `epsilon > 0`, `clip_obs > 0`, `obs_var` values `>= 0`, all values `Number.isFinite()`
- [x] Create `public/ai/` directory (gitkeep)
- [x] Add config sync test in `tests/ai/config-sync.test.ts` — assert `python/ai-config.json` maxSteps AND stillnessTimeoutTicks match `src/ai/ai-config.ts`
- [x] Run full test suite: `pnpm test` — all 377+ tests must pass (366 engine + 11 AI)

**Success criteria:** All tests green.

#### Phase 5.2: Track 1 Sanity Run (100K steps)

Validates the reward function and training pipeline work on the unchanged oval.

**Commands:**
```bash
# Terminal 1 — Bridge Server
npx tsx src/ai/run-bridge.ts

# Terminal 2 — Sanity Training
cd python
python -m training.train_ppo \
  --run-name v04_sanity_track1 \
  --track-id track-01 \
  --timesteps 100000 \
  --checkpoint-freq 50000

# Terminal 3 (optional) — TensorBoard
tensorboard --logdir python/logs --host localhost
```

**Go/no-go criteria:**
- **PASS:** Lap completion rate >90% over 10 evaluation episodes AND mean lap time decreasing over training
- **FAIL:** No forward progress (reward flat), circular driving (reward hacking), or crashes
- **If FAIL:** Reward function is broken. Do NOT proceed to Track 3. Diagnose the reward signal first.

**Evaluation command:**
```bash
python -m training.evaluate \
  --model models/v04_sanity_track1_final.zip \
  --track-id track-01 \
  --episodes 10
```

**Expected duration:** <5 minutes (100K steps at ~2000 steps/sec = ~50 seconds of training + eval overhead).

#### Phase 5.3: Track 3 Production Training (2M steps)

The headline training run. PPO from scratch on the redesigned Gauntlet circuit.

**Commands:**
```bash
# Terminal 1 — Bridge Server (if not already running — no restart needed between tracks)
npx tsx src/ai/run-bridge.ts

# Terminal 2 — Production Training
cd python
python -m training.train_ppo \
  --run-name v04_track3_production \
  --track-id track-03 \
  --timesteps 2000000 \
  --checkpoint-freq 50000
```

**Monitoring (TensorBoard):**
- **1M steps (mid-point gate):** Formal go/no-go. Check `rollout/ep_rew_mean` (increasing?), `rollout/ep_len_mean` (below 5000? if equal, episodes are truncating), `train/approx_kl` (below 0.02?).
- **2M steps (final):** Lap completion rate >80%. This is the export candidate.

**Go/no-go at 1M steps:**
- **PASS:** `racer/completion_rate` trending upward in TensorBoard, reward curve still improving
- **PLATEAU:** Reward flat for 200K+ steps → check (1) `ep_len_mean` = 5000 (truncation → increase maxSteps), (2) `approx_kl` > 0.03 (instability → reduce n_epochs to 5), (3) reward components (is `wallPenalty` dominating?)
- **FAIL:** Zero forward progress → check track geometry boundaries, ray observation quality

**Evaluation command (at 2M):**
```bash
python -m training.evaluate \
  --model models/v04_track3_production_final.zip \
  --track-id track-03 \
  --episodes 10
```

**If training crashes mid-run (resume from latest checkpoint):**
```bash
python -m training.train_ppo \
  --run-name v04_track3_production \
  --track-id track-03 \
  --timesteps 2000000 \
  --resume models/v04_track3_production_<LATEST_STEP>_steps.zip
```
The `--resume` flag requires the path to a specific checkpoint `.zip` file. VecNormalize stats are loaded from the co-located `.pkl` file. Training resumes with `vec_env.training=True` and `vec_env.norm_reward=True` (the default — do NOT manually set `training=False`).

#### Research Insight: VecNormalize Attribute Shadowing Bug

SB3 issue #2101 (March 2025): VecNormalize has top-level `training` and `norm_reward` attributes that can disagree with nested `venv.training`. After loading stats for evaluation, defensively set both:

```python
vec_env = VecNormalize.load(stats_path, vec_env)
vec_env.training = False
vec_env.norm_reward = False
if hasattr(vec_env, 'venv') and hasattr(vec_env.venv, 'training'):
    vec_env.venv.training = False
```

The evaluate script should already handle this, but verify during Phase 5.1.

**Expected duration:** ~17 minutes at 2000 steps/sec. Budget 30 minutes for safety margin (longer track = more geometry computation per step).

#### Phase 5.4: Cross-Track Validation & Generalization Audit (Track 2 Inference)

Load the Track 3-trained model and run inference on Track 2 (Speedway). No training. This is the generalization audit — it answers whether the model learned to *drive* or just *remember Track 3*.

**Commands:**
```bash
# Terminal 1 — Bridge Server
npx tsx src/ai/run-bridge.ts

# Terminal 2 — Cross-Track Evaluation
cd python
python -m training.evaluate \
  --model models/v04_track3_production_final.zip \
  --track-id track-02 \
  --episodes 10
```

**Expected outcomes (document ALL):**
| Metric | Expected Range | Interpretation |
|--------|---------------|----------------|
| Lap completion rate | 0-40% | Model struggles = different geometry = redesign worked |
| Lap completion rate | 40-80% | Partial generalization — document as interesting |
| Lap completion rate | >80% | Either Track 2 is too similar to Track 3 OR genuine generalization |
| Mean reward | Lower than Track 3 | Expected — unfamiliar circuit |
| Wall contacts | Higher than Track 3 | Expected — model can't anticipate turns |

**Regardless of outcome:** Document the raw metrics (mean ± stdev for reward, lap time, completion rate) in the commit message. This is observational, not a pass/fail gate.

**Note on VecNormalize cross-track validity:** The exported VecNormalize stats are from Track 3 training. The observation distribution differs across tracks (ray distances, centerline distances). Track 2 observations normalized with Track 3 stats will be on a different scale, which is an additional source of erratic behavior beyond geometry unfamiliarity. Document this caveat alongside the metrics.

#### Phase 5.5: ONNX Export

Export the converged Track 3 model for browser delivery.

**Commands:**
```bash
cd python
python -m training.export_onnx \
  --model models/v04_track3_production_final.zip \
  --vecnorm models/v04_track3_production_final_vecnormalize.pkl \
  --output-dir ../public/ai/
```

**Verification checklist:**
- [ ] `public/ai/model.onnx` exists
- [ ] File size <=50KB (v02 was 23.7KB — expect similar or slightly larger)
- [ ] `public/ai/vecnorm_stats.json` exists and contains `obs_mean`, `obs_var`, `clip_obs`, `epsilon`
- [ ] Dummy inference passes (export script runs automatic verification)
- [ ] Run 100 random-observation verifications (not just zeros) — compare ONNX output against PyTorch output, assert `atol=1e-5`
- [ ] Verify output is NOT constant across varied inputs (semantic check — catches a model that always returns [0, 0.5, 0])
- [ ] `dynamo=False` used in export (v02 code already has this — still works as legacy TorchScript path in PyTorch 2.9+ where `dynamo=True` became the default)

**If model exceeds 50KB:** Investigate whether the network architecture grew. The v02 MLP was small (2 hidden layers, 64 units each). If the same architecture exceeds 50KB at 2M steps, consider exporting from an earlier checkpoint where performance was equivalent.

#### Research Insight: PyTorch 2.9+ ONNX Export Change

As of PyTorch 2.9, `dynamo=True` is the default for `torch.onnx.export()`. The `dynamo=False` flag in v02's export script now explicitly opts into the legacy TorchScript path. This still works and is the safer choice for the proven MLP architecture, but it is technically deprecated. For simple MLPs (Linear + Tanh), the dynamo exporter works identically — consider removing `dynamo=False` if you upgrade to PyTorch 3.x where TorchScript may be removed entirely.

#### Phase 5.6: Par Time Tuning

Derive gold/silver/bronze par times from AI training data for all three tracks.

**Method:**
1. Run 20 evaluation episodes on each track with the final v04 model
2. For tracks where the model completes laps consistently (Track 1, Track 3): use AI lap time percentiles
3. For Track 2 (if model cannot complete laps): derive from Track 1 data scaled by track length ratio

**Par time formula (using P10 percentile, not absolute best — avoids lucky outlier):**
| Medal | Formula | Rationale |
|-------|---------|-----------|
| Gold | AI P10 lap time × 1.1 | Near the AI's consistent peak — rewards mastery |
| Silver | AI P10 lap time × 1.3 | Comfortable but requires decent driving |
| Bronze | AI P10 lap time × 1.6 | Achievable for first-time players |

**P10 = 10th percentile** (the lap time faster than 90% of laps). More robust than absolute best, which can be a lucky outlier. With 20 evaluation episodes, P10 is the 2nd-fastest lap — stable enough for game tuning.

**Track 2 fallback (if model can't lap Track 2):**
```
Track 2 par = Track 1 par * (Track 2 length / Track 1 length) * 1.15
```
The 1.15 difficulty multiplier accounts for Track 2's more technical layout.

**CRITICAL: Par times must be in TICKS, not seconds.** The evaluate script outputs lap times in seconds. The registry `parTimes` field expects ticks (at 60 ticks/sec). Multiply AI lap times by 60 before writing to `registry.ts`:

```
parTimes.gold = Math.round(aiP10LapTimeSeconds * 60 * 1.1)
parTimes.silver = Math.round(aiP10LapTimeSeconds * 60 * 1.3)
parTimes.bronze = Math.round(aiP10LapTimeSeconds * 60 * 1.6)
```

**Sanity check:** v02 Track 1 par times were gold=2400/silver=3000/bronze=3600 ticks (40/50/60 seconds). v04 Track 1 should be in the same ballpark. If v04 AI best lap is <15 seconds or >90 seconds on any track, flag as anomalous and investigate before applying the formula.

**Update locations:**
- `src/tracks/registry.ts` — replace sentinel `0` values in `parTimes` for all three tracks

#### Phase 5.7: Browser Integration Verification

Verify the exported model loads and runs correctly in the browser context.

**Tasks:**
- [ ] `BrowserAIRunner.load()` successfully loads `/ai/model.onnx`
- [ ] `BrowserAIRunner.load()` successfully loads `/ai/vecnorm_stats.json`
- [ ] Single inference call completes in <16ms (one 60fps frame)
- [ ] Output is clamped [steer, throttle, brake] tuple
- [ ] WASM tensors are properly disposed (input AND output — verify `inputTensor.dispose()` in try/finally)
- [ ] `pnpm run dev` → AI car drives Track 3 competently: completes 3 consecutive laps without wall-sticking, circular driving, or visual glitches. ATC confirms visual quality.
- [ ] Smoke test on Track 1 and Track 2: AI drives (may be erratic due to VecNormalize cross-track mismatch — document behavior, no hard gate)

**Test approach:** Existing `tests/ai/browser-ai-runner.test.ts` covers the load/inference/dispose cycle. After updating the asset paths, these tests validate the integration.

#### Research Insight: WASM Configuration

For the ~24KB MLP model, WASM is the correct execution provider (not WebGPU). GPU kernel launch overhead exceeds the compute savings for models this small.

```typescript
ort.env.wasm.numThreads = 1;  // Single thread optimal — threading overhead > computation
ort.env.wasm.proxy = false;    // No proxy worker — adds IPC overhead for <5ms inference
```

First-inference warm-up (added in Phase 5.1 tasks) prevents a 50–200ms lag on the first frame.

### Post-Training Cleanup

After Phase 5.5 (ONNX export), delete intermediate training checkpoints:
- Keep: `models/v04_track3_production_final.zip`, `models/v04_track3_production_final_vecnormalize.pkl`
- Delete: All `models/v04_*_<step>_steps.zip` and corresponding `.pkl` files (~80 files, ~20-40MB)
- Verify `python/models/` is in `.gitignore` (should already be — v02 excludes `*.zip` and `*.pkl`)

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| Transfer learning from v02 | v02 model memorized one polygon — old knowledge is actively wrong (see brainstorm: docs/brainstorms/2026-03-11-full-build-brainstorm.md) |
| Train on all 3 tracks (multi-track curriculum) | Adds complexity. Track 3 is the production circuit. Cross-track validation is more scientifically interesting as a generalization probe than as a training technique. |
| SAC instead of PPO | PPO worked first run in v02 with zero tuning. SAC is the fallback if PPO fails. Don't fix what isn't broken. |
| Per-track maxSteps config | Adds config complexity for minimal benefit. Global maxSteps=5000 works for all tracks with modest overhead. |
| GPU training | CPU throughput (~2000 steps/sec) completes 2M steps in ~17 minutes. GPU adds setup complexity for negligible real-time savings at this scale. |
| WebGPU execution provider | WASM is faster for this model size. GPU dispatch overhead exceeds compute savings for a 2-layer 64-unit MLP. |

## System-Wide Impact

### Interaction Graph

1. HeadlessEnv code change → reads `checkpointCount` from track registry → feeds into `buildTrack()` → affects checkpoint positions on longer tracks
2. `maxSteps` change in ai-config → affects both Python Gym env (episode truncation) and TS HeadlessEnv (episode timeout) → requires sync between `python/ai-config.json` and `src/ai/ai-config.ts`
3. ONNX export path change → affects `BrowserAIRunner` asset loading → `public/ai/` directory is OUTSIDE `public/assets/` → safe from Phase 1 asset processor
4. Par time update → affects `src/tracks/registry.ts` → affects HUD medal display (Phase 4) → visible to players

### Error Propagation

- Bridge server crash during training → Python `ConnectionError` → SB3 training stops → resume from last checkpoint (50K step granularity) using `--resume <checkpoint_path>`
- ONNX export with wrong PyTorch version → `dynamo=False` flag uses legacy TorchScript exporter → verified by automatic post-export inference check
- VecNormalize stats mismatch → browser inference produces erratic actions → caught by browser-ai-runner test, warm-up inference, and visual smoke test

### State Lifecycle Risks

- Training checkpoints accumulate in `python/models/` (~40 files per run). Cleaned up after ONNX export (see Post-Training Cleanup).
- VecNormalize stats are NEW per training run. v02 stats are incompatible with v04 model. The export script always exports fresh stats alongside the model.
- `public/ai/` is a new directory OUTSIDE `public/assets/`. The asset processor cannot touch it.

### Integration Test Scenarios

1. **ONNX round-trip test:** Export model → load in onnxruntime → run 100 random-observation inferences → verify output shape (1, 3) and outputs are not constant — catches export config errors and semantic failures
2. **Par time non-zero test:** After registry update, assert all par times > 0 for all tracks and all medals — catches forgotten sentinel values
3. **Config sync test:** Assert `python/ai-config.json` maxSteps AND stillnessTimeoutTicks equal corresponding values in `src/ai/ai-config.ts` DEFAULT_AI_CONFIG — catches dual-source drift

## Acceptance Criteria

### Functional Requirements

- [ ] HeadlessEnv reads `checkpointCount` from track registry (required field, no fallback)
- [ ] `maxSteps` increased to 5000 in both `python/ai-config.json` and `src/ai/ai-config.ts`
- [ ] Track 1 sanity: >90% lap completion rate over 10 evaluation episodes
- [ ] Track 3 production: >80% lap completion rate over 10 evaluation episodes at 2M steps
- [ ] Track 3 production: mean lap time < 2× gold par time (quality gate — prevents model that passes by crawling)
- [ ] Track 2 cross-validation: generalization behavior documented with raw metrics (mean ± stdev)
- [ ] ONNX model exported to `public/ai/model.onnx`, size <=50KB
- [ ] VecNormalize stats exported to `public/ai/vecnorm_stats.json`
- [ ] Par times set for all 3 tracks in TICKS (no sentinel 0 values remaining)
- [ ] `BrowserAIRunner` loads from updated `/ai/` paths
- [ ] AI car drives Track 3 competently in browser: 3 consecutive laps, no wall-sticking, ATC confirms

### Non-Functional Requirements

- [ ] Browser inference latency <16ms per call (60fps budget)
- [ ] ONNX model <=50KB
- [ ] Training completes within 30 minutes wall-clock (2M steps)
- [ ] All 377+ existing tests pass after code changes
- [ ] inputTensor disposed in try/finally (no WASM memory leak)
- [ ] Warm-up inference eliminates first-frame lag

### Quality Gates

- [ ] Full test suite passes BEFORE any training begins (Phase 5.1)
- [ ] Track 1 sanity passes BEFORE Track 3 production training (Phase 5.2 → 5.3 gate)
- [ ] ONNX verification (size, dummy inference, semantic check) passes BEFORE browser integration (Phase 5.5 → 5.7 gate)
- [ ] Par times are non-zero ticks for all tracks and medals
- [ ] Par times sanity-checked against v02 baseline (Track 1 should be ~40-60 seconds)

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Track 1 lap completion | >90% | `python -m training.evaluate --track-id track-01 --episodes 10` |
| Track 3 lap completion | >80% | `python -m training.evaluate --track-id track-03 --episodes 10` |
| Track 3 mean lap time | < 2× gold par | evaluate script output |
| ONNX file size | <=50KB | `ls -la public/ai/model.onnx` |
| Browser inference latency | <16ms | Performance.now() around `session.run()` in dev console |
| Training wall time | <30 min | TensorBoard `wall_time` metric |
| All tests green | 377+ pass | `pnpm test` |

## Dependencies & Prerequisites

| Dependency | Phase | Status | What Phase 5 Needs |
|-----------|-------|--------|-------------------|
| Engine code (FROZEN) | v02 | Complete | Headless simulation for training |
| Track 1 geometry (FROZEN) | v02 | Complete | Sanity run target |
| Track 2 geometry (redesigned) | Phase 1 | Must complete first | Cross-validation target |
| Track 3 geometry (redesigned) | Phase 1 | Must complete first | Production training target |
| `TrackInfo.checkpointCount` field (REQUIRED) | Phase 1 | Must complete first | Per-track checkpoint counts |
| Python environment + deps | Phase -1 | Must complete first | SB3, PyTorch, ONNX runtime |
| AI source files copied | Phase -1 | Must complete first | HeadlessEnv, reward, observations, bridge |
| Asset processor (clean scope) | Phase 1 | Must complete first | Nukes `public/assets/` — ONNX lives in `public/ai/` (safe) |
| BrowserAIRunner (updated paths) | Phase 5.1 | This phase | Loads from `/ai/` |

**Critical path:** Phase -1 (foundation copy) → Phase 1 (track geometry) → Phase 5 (training).
Phases 2, 3, 4 (visual upgrade, effects, UI) are NOT dependencies — training is headless.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Track 3 geometry too complex for 2M steps | Low | High | Monitor TensorBoard at 1M midpoint. Budget was 60K in v02 for simpler track — 2M is 33x margin. |
| maxSteps=5000 still too short for Track 3 | Low | High | Diagnose: `ep_len_mean` = 5000 in TensorBoard = truncation. Increase to 6000–7000 in BOTH config files. |
| Reward hacking (circular driving) | Low | Medium | v02's stillness timeout (180 ticks) + wall/off-track penalties prevent this. Monitor for flat reward + zero laps. |
| ai-config.json / ai-config.ts desync | Medium | High | Config sync integration test (Phase 5.1) covers maxSteps AND stillnessTimeoutTicks. Comment in each file references the other. |
| n_epochs=10 causes instability on harder geometry | Medium | Medium | Monitor `approx_kl`. If consistently > 0.02, reduce to 5. |
| VecNormalize shadowing bug (SB3 #2101) | Low | Medium | Defensively set both outer and inner wrapper attributes in evaluate script. |

## Known Gotchas (from v02 + deepening research)

1. **VecNormalize stats drift:** During evaluation, MUST set `vec_env.training=False` and `vec_env.norm_reward=False`. Also defensively set inner wrapper attributes (SB3 issue #2101). The evaluate script already handles the outer attributes.

2. **Monitor() wrapper required:** Without `Monitor(env, log_dir)`, SB3 doesn't log episode rewards to TensorBoard. Only `train/` metrics appear. The training script already includes this.

3. **Dual config source:** `python/ai-config.json` and `src/ai/ai-config.ts` must stay in sync. Covered by config sync integration test. A mismatch causes subtle bugs (e.g., Python thinks maxSteps=5000 but browser TS uses 3000 for the AI car's episode behavior).

4. **`dynamo=False` in torch.onnx.export:** PyTorch 2.9+ made `dynamo=True` the default. The `dynamo=False` flag is now the legacy TorchScript path — still functional but deprecated. Safe for our simple MLP.

5. **`--resume` requires explicit checkpoint path:** `--resume models/<run_name>_<step>_steps.zip`, NOT bare `--resume`. The VecNormalize `.pkl` is auto-derived from the model path.

6. **Model files are FLAT in `python/models/`:** SB3's CheckpointCallback saves as `models/<run_name>_<step>_steps.zip` directly in the models directory — no per-run subdirectories. Final model: `models/<run_name>_final.zip`.

7. **Par times are in TICKS, not seconds:** `registry.ts` parTimes field expects ticks at 60/sec. Multiply AI lap times (in seconds from evaluate script) by 60.

8. **Reward scale for SAC fallback:** If PPO fails and you switch to SAC, entropy auto-tuning diverges without `VecNormalize(norm_reward=True)`. Already configured correctly.

9. **First-frame WASM lag:** onnxruntime-web takes 50–200ms on first inference (JIT compilation). Warm-up inference (3 dummy calls in `load()`) eliminates this.

## Execution Sequence Summary

```
Phase 5.1: Pre-Training Setup
  ├── HeadlessEnv code change (checkpointCount — required, no fallback)
  ├── maxSteps → 5000 (both files)
  ├── ONNX output path → public/ai/ (outside asset processor blast radius)
  ├── BrowserAIRunner: path update + inputTensor disposal fix + warm-up inference
  ├── VecNormalize stats validation strengthened
  ├── Config sync integration test
  └── TEST GATE: pnpm test (377+ pass)

Phase 5.2: Track 1 Sanity (100K steps)
  └── GATE: >90% lap completion → proceed
       FAIL: reward function broken → diagnose before continuing

Phase 5.3: Track 3 Production (2M steps)
  ├── Midpoint gate at 1M (TensorBoard: ep_rew_mean, ep_len_mean, approx_kl)
  └── GATE: >80% lap completion + mean lap time < 2× gold par at 2M → proceed
       PLATEAU at 1M: check truncation, approx_kl, reward components

Phase 5.4: Track 2 Cross-Validation & Generalization Audit (inference only)
  └── Document metrics with stdev + VecNormalize caveat (no pass/fail gate)

Phase 5.5: ONNX Export
  └── GATE: file exists, <=50KB, 100-obs verification, semantic check

Phase 5.6: Par Time Tuning
  ├── 20-episode evals per track, P10 percentile × multiplier
  ├── Convert seconds → ticks (× 60)
  ├── Sanity-check against v02 baseline
  └── Update registry.ts, verify no sentinel values

Phase 5.7: Browser Integration
  ├── GATE: model loads, inference <16ms, AI drives 3 laps competently
  ├── Smoke test Track 1 + Track 2 (document, no hard gate)
  └── Cleanup: delete intermediate checkpoints
```

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions carried forward: PPO retrain from scratch (no transfer learning), v02 scripts copied verbatim, fully autonomous SDLC.
- **Spec ADR-13:** [docs/Top-Down-Racer-v04-CE-Spec.md](docs/Top-Down-Racer-v04-CE-Spec.md) lines 406-449 — training sequence, success criteria, ONNX target.

### Internal References

- v02 training scripts: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\python\training\`
- v02 Gym environment: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\python\racer_env\`
- v02 AI config: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\python\ai-config.json`
- v02 HeadlessEnv: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\ai\headless-env.ts`
- v02 reward function: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\ai\reward.ts`
- v02 ONNX model: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\public\assets\model.onnx` (24,294 bytes)
- Phase -1 plan: `docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md` — copies all AI infrastructure
- Phase 1 plan: `docs/plans/2026-03-11-feat-phase-1-asset-pipeline-track-redesign-plan.md` — track geometry, checkpointCount, par time sentinels

### Research References (from deepening)

- SB3 PPO Documentation: https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html
- SB3 VecNormalize Bug #2101: https://github.com/DLR-RM/stable-baselines3/issues/2101
- PyTorch ONNX Export (dynamo default flip): https://docs.pytorch.org/docs/stable/onnx_export.html
- ONNX Runtime Web WASM Guide: https://onnxruntime.ai/docs/tutorials/web/
- Rliable (Better RL Evaluation): https://araffin.github.io/post/rliable/
- 37 Implementation Details of PPO: https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/

### v02 Training Results (Baseline)

- Convergence: ~60K steps to competent driving on oval
- ONNX size: 23.7KB (24,294 bytes)
- Bridge throughput: ~2000 steps/sec actual
- Reward tuning iterations: 0 (worked first run)
- 41 checkpoints saved (50K intervals over 2M steps)

### Python Dependency Recommendations (from deepening)

During Phase -1 copy, tighten `requirements.txt` ranges:
- `torch>=2.3,<2.10` (not `<3` — bracket the known-good range)
- `numpy>=1.26,<2` (numpy 2.x has breaking API changes)
- `stable-baselines3[extra]>=2.4.0,<2.8` (pin to tested minor version range)
- Consider generating a lockfile: `pip freeze > requirements.lock`
