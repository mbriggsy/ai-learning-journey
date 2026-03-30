import type { DetectionResult } from '../types/state.js';
import { pixelToTile } from './map.js';
import { DISPLAY, VISION } from '../constants.js';

export function checkDetection(
  seekerX: number, seekerY: number,
  hiderX: number, hiderY: number,
  seekerFov: Uint8Array,
  mapWidth: number,
): DetectionResult {
  const hiderTile = pixelToTile(hiderX, hiderY);
  const idx = hiderTile.y * mapWidth + hiderTile.x;
  if (idx < 0 || idx >= seekerFov.length) return 'none';
  if (seekerFov[idx] !== 1) return 'none';

  // Hider is in seeker's FOV — at minimum, spotted
  const dx = (seekerX - hiderX) / DISPLAY.TILE_SIZE;
  const dy = (seekerY - hiderY) / DISPLAY.TILE_SIZE;
  const distTiles = Math.sqrt(dx * dx + dy * dy);

  if (distTiles <= VISION.PROXIMITY_THRESHOLD) return 'found';
  return 'spotted';
}
