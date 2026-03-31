import type { DetectionResult } from '../types/state.js';
import { pixelToTile } from './map.js';
import { DISPLAY, VISION } from '../constants.js';

/**
 * Normalize angle to [-PI, PI] range.
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Check if the hider is detected by the seeker.
 * Phase 5a: filters by vision cone angle. Hider must be in seekerFov AND within cone.
 *
 * @param seekerFacingAngle - continuous radians, or undefined for 360° detection (backwards compat)
 * @param visionConeAngleDeg - cone angle in degrees, or undefined for 360°
 */
export function checkDetection(
  seekerX: number, seekerY: number,
  hiderX: number, hiderY: number,
  seekerFov: Uint8Array,
  mapWidth: number,
  seekerFacingAngle?: number,
  visionConeAngleDeg?: number,
): DetectionResult {
  const hiderTile = pixelToTile(hiderX, hiderY);
  const idx = hiderTile.y * mapWidth + hiderTile.x;
  if (idx < 0 || idx >= seekerFov.length) return 'none';
  if (seekerFov[idx] !== 1) return 'none';

  // Vision cone check (if angle params provided)
  if (seekerFacingAngle !== undefined && visionConeAngleDeg !== undefined) {
    const dx = hiderX - seekerX;
    const dy = hiderY - seekerY;
    // Skip cone check if seeker and hider are on same pixel (proximity catch)
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      const angleToHider = Math.atan2(dy, dx);
      const angleDiff = normalizeAngle(angleToHider - seekerFacingAngle);
      const halfCone = (visionConeAngleDeg * Math.PI / 180) / 2;
      if (Math.abs(angleDiff) > halfCone) return 'none';
    }
  }

  // Hider is in seeker's FOV and within cone — check proximity
  const dx = (seekerX - hiderX) / DISPLAY.TILE_SIZE;
  const dy = (seekerY - hiderY) / DISPLAY.TILE_SIZE;
  const distTiles = Math.sqrt(dx * dx + dy * dy);

  if (distTiles <= VISION.PROXIMITY_THRESHOLD) return 'found';
  return 'spotted';
}
