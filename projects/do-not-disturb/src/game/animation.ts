import { ANIMATION, AUDIO } from '../constants';

export type SquashStretchState = {
  scaleX: number;
  scaleY: number;
  timer: number;
};

export function createSquashStretch(): SquashStretchState {
  return { scaleX: 1, scaleY: 1, timer: 0 };
}

export function triggerLandSquash(state: SquashStretchState): void {
  state.scaleX = ANIMATION.SQUASH_LAND_SCALE_X;
  state.scaleY = ANIMATION.SQUASH_LAND_SCALE_Y;
  state.timer = ANIMATION.SQUASH_DURATION_S;
}

export function triggerRunStretch(state: SquashStretchState): void {
  state.scaleX = ANIMATION.STRETCH_RUN_SCALE_X;
  state.scaleY = 1 / ANIMATION.STRETCH_RUN_SCALE_X; // preserve area
  state.timer = ANIMATION.SQUASH_DURATION_S;
}

export function updateSquashStretch(state: SquashStretchState, dt: number): void {
  if (state.timer <= 0) return;
  state.timer -= dt;
  if (state.timer <= 0) {
    state.scaleX = 1;
    state.scaleY = 1;
    state.timer = 0;
  } else {
    // Lerp back toward 1.0
    const t = 1 - state.timer / ANIMATION.SQUASH_DURATION_S;
    state.scaleX = state.scaleX + (1 - state.scaleX) * t;
    state.scaleY = state.scaleY + (1 - state.scaleY) * t;
  }
}

// --- Sketch wobble ---

export function computeWobbleOffset(timeS: number, seed: number): { dx: number; dy: number } {
  const intensity = ANIMATION.WOBBLE_INTENSITY as number; // cast: tuneable constant
  if (intensity === 0) return { dx: 0, dy: 0 };
  const maxPx = ANIMATION.WOBBLE_MAX_OFFSET_PX * intensity;
  // Two independent sine waves with prime-ratio frequencies for non-repeating feel
  const dx = Math.sin(timeS * 7.3 + seed * 1.7) * maxPx;
  const dy = Math.sin(timeS * 11.1 + seed * 2.3) * maxPx;
  return { dx, dy };
}

// --- Guest stop-motion ---

export function shouldShowGuestFrame(frameCount: number): boolean {
  return frameCount % ANIMATION.GUEST_FRAME_SKIP !== 0;
}

// --- Music box danger volume ---

export function computeMusicBoxVolume(dangerDistance: number): number {
  if (dangerDistance >= AUDIO.MUSIC_BOX_DANGER_RANGE) return AUDIO.MUSIC_BOX_MIN_VOLUME;
  if (dangerDistance <= 0) return AUDIO.MUSIC_BOX_MAX_VOLUME;
  const t = 1 - dangerDistance / AUDIO.MUSIC_BOX_DANGER_RANGE;
  return AUDIO.MUSIC_BOX_MIN_VOLUME + t * (AUDIO.MUSIC_BOX_MAX_VOLUME - AUDIO.MUSIC_BOX_MIN_VOLUME);
}
