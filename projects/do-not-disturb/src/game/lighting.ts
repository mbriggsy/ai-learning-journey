import type { Position } from '../types/state';
import { LIGHTING } from '../constants';

export type LightSource = {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly intensity: number; // 0-1
};

export function computeSconceFlicker(timeS: number, baseIntensity: number): number {
  // Sine-based wobble between min and max
  const range = LIGHTING.SCONCE_FLICKER_MAX - LIGHTING.SCONCE_FLICKER_MIN;
  const wobble = (Math.sin(timeS * LIGHTING.SCONCE_FLICKER_SPEED * Math.PI * 2) + 1) / 2;
  return baseIntensity * (LIGHTING.SCONCE_FLICKER_MIN + wobble * range);
}

export function computeEffectiveLight(
  ambientLight: number,
  dynamicSources: readonly LightSource[],
  pointX: number,
  pointY: number,
): number {
  let total = ambientLight;
  for (const src of dynamicSources) {
    const dx = pointX - src.x;
    const dy = pointY - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < src.radius) {
      const falloff = 1 - dist / src.radius;
      total += src.intensity * falloff;
    }
  }
  return Math.min(total, 1.0); // cap at 1.0
}

export function isLightVisibleUnderDoor(
  monsterPos: Position,
  doorPos: Position,
  doorOpen: boolean,
  lightRadius: number,
): boolean {
  if (doorOpen) return false; // no effect when door is open — monster is visible directly
  const dx = monsterPos.x - doorPos.x;
  const dy = monsterPos.y - doorPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < lightRadius;
}

export function computeLightningFlash(
  flashTimer: number,
): number {
  if (flashTimer <= 0) return 0;
  if (flashTimer > LIGHTING.LIGHTNING_FADE_MS) return 1.0; // full flash
  return flashTimer / LIGHTING.LIGHTNING_FADE_MS; // fade out
}
