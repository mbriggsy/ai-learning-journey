/**
 * Pure functions for audio parameter computation.
 * ZERO Phaser imports — testable in Node.js.
 */

/**
 * Map seeker distance (in tiles) to heartbeat tempo (BPM).
 * Linear interpolation: maxRange → minBpm, threshold → maxBpm.
 * Returns 0 when outside the active range (heartbeat should be off).
 */
export function distanceToTempo(
  distTiles: number,
  maxRange: number,
  threshold: number,
  minBpm: number,
  maxBpm: number,
): number {
  if (distTiles >= maxRange) return 0;
  if (distTiles <= threshold) return maxBpm;

  // Linear interpolation: threshold → maxBpm, maxRange → minBpm
  const t = (distTiles - threshold) / (maxRange - threshold);
  return maxBpm + t * (minBpm - maxBpm);
}

/**
 * Map seeker distance (in tiles) to heartbeat volume (0-1).
 * Linear interpolation: maxRange → 0, threshold → 1.
 * Returns 0 when outside the active range.
 */
export function distanceToVolume(
  distTiles: number,
  maxRange: number,
  threshold: number,
): number {
  if (distTiles >= maxRange) return 0;
  if (distTiles <= threshold) return 1;

  const t = (distTiles - threshold) / (maxRange - threshold);
  return 1 - t;
}

/**
 * Convert BPM to playbackRate given the sample's original BPM.
 * playbackRate = desiredBPM / originalSampleBPM
 */
export function bpmToRate(desiredBpm: number, baseSampleBpm: number): number {
  if (baseSampleBpm <= 0) return 1;
  return desiredBpm / baseSampleBpm;
}

/**
 * Compute spatial volume for a sound source given distance in tiles.
 * Uses power rolloff for natural 2D attenuation.
 * Returns 0 when beyond hearing range.
 */
export function spatialVolume(
  distTiles: number,
  hearingRangeTiles: number,
  rolloffExponent: number,
): number {
  if (distTiles >= hearingRangeTiles || hearingRangeTiles <= 0) return 0;
  if (distTiles <= 0) return 1;

  const normalized = 1 - distTiles / hearingRangeTiles;
  return Math.pow(normalized, rolloffExponent);
}

/**
 * Compute stereo pan from horizontal offset.
 * Returns -1 (left) to +1 (right), clamped.
 */
export function spatialPan(dx: number, maxDistance: number): number {
  if (maxDistance <= 0) return 0;
  const raw = dx / maxDistance;
  return Math.max(-1, Math.min(1, raw));
}
