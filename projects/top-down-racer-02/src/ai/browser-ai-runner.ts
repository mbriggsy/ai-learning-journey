/**
 * BrowserAIRunner — Browser-side ONNX inference for the AI ghost car.
 *
 * Loads a trained PPO model (exported from SB3 via torch.onnx.export) and
 * runs per-tick inference using onnxruntime-web's WASM backend.
 * This module is browser-only — not used by the Python training pipeline.
 */
import * as ort from 'onnxruntime-web';
import { normalizeObservation, type VecNormStats } from './vecnormalize';
import { OBSERVATION_SIZE } from './observations';

// ──────────────────────────────────────────────────────────
// WASM Configuration (must be set BEFORE any InferenceSession.create)
// ──────────────────────────────────────────────────────────

if (typeof ort.env !== 'undefined' && ort.env.wasm) {
  ort.env.wasm.wasmPaths = '/assets/ort/';
  ort.env.wasm.numThreads = 1; // Optimal for tiny MLP; avoids crossOriginIsolated requirement
}

// ──────────────────────────────────────────────────────────
// Runtime Validation
// ──────────────────────────────────────────────────────────

/** Type guard for validating VecNormStats JSON from network. */
function isValidStatsJson(value: unknown): value is {
  obs_mean: number[];
  obs_var: number[];
  clip_obs: number;
  epsilon: number;
} {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.obs_mean) &&
    Array.isArray(obj.obs_var) &&
    obj.obs_mean.length === OBSERVATION_SIZE &&
    obj.obs_var.length === OBSERVATION_SIZE &&
    typeof obj.clip_obs === 'number' &&
    typeof obj.epsilon === 'number'
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

// ──────────────────────────────────────────────────────────
// BrowserAIRunner
// ──────────────────────────────────────────────────────────

export class BrowserAIRunner {
  private session: ort.InferenceSession | null = null;
  private stats: VecNormStats | null = null;

  /**
   * Load the ONNX model and VecNormalize stats.
   * Must be called once before infer(). Call during loading screen.
   *
   * @param modelUrl - Path to the .onnx model file (e.g., '/assets/model.onnx')
   * @param statsUrl - Path to the VecNormalize stats JSON (e.g., '/assets/vecnorm_stats.json')
   */
  async load(modelUrl: string, statsUrl: string): Promise<void> {
    const [session, statsJson] = await Promise.all([
      ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      }),
      fetch(statsUrl).then((r) => {
        if (!r.ok)
          throw new Error(
            `Failed to load stats: ${r.status} ${r.statusText}`,
          );
        return r.json();
      }),
    ]);

    // Runtime validation — the JSON comes from a Python export and may have wrong shape
    if (!isValidStatsJson(statsJson)) {
      throw new Error(
        `Invalid VecNormStats from ${statsUrl}: expected obs_mean[${OBSERVATION_SIZE}], obs_var[${OBSERVATION_SIZE}], clip_obs, epsilon`,
      );
    }

    // Remap snake_case JSON keys to camelCase TypeScript interface
    this.stats = {
      obsMean: statsJson.obs_mean,
      obsVar: statsJson.obs_var,
      clipObs: statsJson.clip_obs,
      epsilon: statsJson.epsilon,
    };
    this.session = session;
  }

  /**
   * Run one inference step.
   *
   * @param rawObs - Raw 14-value observation vector from buildObservation()
   * @returns [steer, throttle, brake] — each clamped to its valid range
   */
  async infer(rawObs: number[]): Promise<[number, number, number]> {
    if (!this.session || !this.stats)
      throw new Error('BrowserAIRunner not loaded');

    const normalizedObs = normalizeObservation(rawObs, this.stats);
    const inputTensor = new ort.Tensor(
      'float32',
      new Float32Array(normalizedObs),
      [1, OBSERVATION_SIZE],
    );

    const results = await this.session.run({ obs: inputTensor });

    const actionsTensor = results['actions'];
    if (!actionsTensor) {
      throw new Error('ONNX model missing "actions" output');
    }
    const actions = actionsTensor.data as Float32Array;

    const output: [number, number, number] = [
      clamp(actions[0], -1, 1), // steer
      clamp(actions[1], 0, 1), // throttle
      clamp(actions[2], 0, 1), // brake
    ];

    // Free WASM-backed output tensors immediately to prevent memory leak
    for (const key of Object.keys(results)) {
      results[key].dispose?.();
    }

    return output;
  }

  /**
   * Release the ONNX session and free WASM memory.
   * Call when leaving the race or switching tracks.
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
      this.stats = null;
    }
  }
}
