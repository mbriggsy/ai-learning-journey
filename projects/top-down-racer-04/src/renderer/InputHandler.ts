import type { Input } from '../engine/types';

/** Tracks which keys are currently held down. */
const keys = new Set<string>();

/** Initialization flag — attach listeners only once. */
let initialized = false;

/** Dead zone for analog stick — ignore tiny drift near center. */
const STICK_DEADZONE = 0.1;

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

/** Apply dead zone and remap remaining range to 0-1. */
function applyDeadzone(value: number, deadzone: number): number {
  const abs = Math.abs(value);
  if (abs < deadzone) return 0;
  return Math.sign(value) * (abs - deadzone) / (1 - deadzone);
}

/** Poll the first connected gamepad and return its input, or null. */
function getGamepadInput(): Input | null {
  const gamepads = navigator.getGamepads();
  for (const gp of gamepads) {
    if (!gp || !gp.connected) continue;

    // Standard mapping: axes[0] = left stick X, buttons[6/7] = triggers
    const steer = applyDeadzone(gp.axes[0], STICK_DEADZONE);
    const rawThrottle = gp.buttons[7]?.value ?? 0; // Right trigger
    const rawBrake = gp.buttons[6]?.value ?? 0;    // Left trigger

    // Power 2.75 response curve: between squared and cubic.
    // 25% → 2%, 50% → 15%, 75% → 45%, 100% → 100%.
    const throttle = Math.pow(rawThrottle, 2.75);
    const brake = Math.pow(rawBrake, 2.75);

    // Only use gamepad if any input is active
    if (Math.abs(steer) > 0 || rawThrottle > 0.01 || rawBrake > 0.01) {
      return {
        steer: Math.max(-1, Math.min(1, steer)),
        throttle: Math.max(0, Math.min(1, throttle)),
        brake: Math.max(0, Math.min(1, brake)),
      };
    }
    // Gamepad connected but idle — fall through to keyboard
    return null;
  }
  return null;
}

/**
 * Returns the current input state from gamepad (preferred) or keyboard.
 * Gamepad wins if any stick/trigger input is active.
 */
export function getInput(): Input {
  const gpInput = getGamepadInput();
  if (gpInput) return gpInput;

  // Keyboard fallback — binary values
  const throttle = (keys.has('ArrowUp')    || keys.has('KeyW')) ? 1.0 : 0.0;
  const brake    = (keys.has('ArrowDown')  || keys.has('KeyS')) ? 1.0 : 0.0;
  const steerL   = (keys.has('ArrowLeft')  || keys.has('KeyA')) ? 1.0 : 0.0;
  const steerR   = (keys.has('ArrowRight') || keys.has('KeyD')) ? 1.0 : 0.0;
  return {
    throttle,
    brake,
    steer: steerR - steerL,
  };
}

/** Zero input — used during non-racing phases. */
export const ZERO_INPUT: Input = { steer: 0, throttle: 0, brake: 0 };

/** Returns true if the given key code is currently held. */
export function isKeyDown(code: string): boolean {
  return keys.has(code);
}
