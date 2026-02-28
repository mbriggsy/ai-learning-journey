import type { Input } from '../engine/types';

/** Tracks which keys are currently held down. */
const keys = new Set<string>();

/** Initialization flag — attach listeners only once. */
let initialized = false;

export function initInputHandler(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys.add(e.code);
    // Prevent arrow keys from scrolling the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys.delete(e.code);
  });
}

/**
 * Returns the current raw digital input state.
 * Keyboard smoothing is handled by the engine's smoothInput() — raw binary values here.
 */
export function getInput(): Input {
  const throttle = (keys.has('ArrowUp')    || keys.has('KeyW')) ? 1.0 : 0.0;
  const brake    = (keys.has('ArrowDown')  || keys.has('KeyS')) ? 1.0 : 0.0;
  const steerL   = (keys.has('ArrowLeft')  || keys.has('KeyA')) ? 1.0 : 0.0;
  const steerR   = (keys.has('ArrowRight') || keys.has('KeyD')) ? 1.0 : 0.0;
  return {
    throttle,
    brake,
    steer: steerR - steerL, // -1.0 (full left) to +1.0 (full right)
  };
}

/** Zero input — used during non-racing phases. */
export const ZERO_INPUT: Input = { steer: 0, throttle: 0, brake: 0 };

/** Returns true if the given key code is currently held. */
export function isKeyDown(code: string): boolean {
  return keys.has(code);
}
