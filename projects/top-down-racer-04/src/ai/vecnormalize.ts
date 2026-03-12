/**
 * VecNormalize — TypeScript port of the SB3 VecNormalize observation normalization.
 *
 * Applies the frozen (inference-only) formula:
 *   clip((obs[i] - mean[i]) / sqrt(var[i] + epsilon), -clipObs, clipObs)
 *
 * Stats are exported from the trained Python model (see export_onnx.py) and
 * loaded once at startup. This module is pure math with no browser dependencies.
 */

export interface VecNormStats {
  readonly obsMean: number[];
  readonly obsVar: number[];
  readonly clipObs: number;
  readonly epsilon: number;
}

export function normalizeObservation(obs: readonly number[], stats: VecNormStats): number[] {
  const { obsMean, obsVar, clipObs, epsilon } = stats;

  if (obs.length !== obsMean.length || obs.length !== obsVar.length) {
    throw new Error(
      `VecNormalize dimension mismatch: obs=${obs.length}, mean=${obsMean.length}, var=${obsVar.length}`
    );
  }

  return obs.map((v, i) => {
    const normalized = (v - obsMean[i]) / Math.sqrt(obsVar[i] + epsilon);
    return Math.max(-clipObs, Math.min(clipObs, normalized));
  });
}
