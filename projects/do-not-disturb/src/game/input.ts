import type { PlayerInput } from './player';

// Xbox controller button indices (standard mapping)
// https://w3c.github.io/gamepad/#remapping
const GP_A = 0;
const GP_B = 1;
const GP_X = 2;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;
const GP_DPAD_LEFT = 14;
const GP_DPAD_RIGHT = 15;
const GP_LT = 6; // left trigger (axis mapped as button)
const GP_RT = 7; // right trigger (axis mapped as button)
const GP_STICK_DEADZONE = 0.25;

export type InputReading = {
  readonly input: PlayerInput;
  readonly toolKey: number | null;
};

function readGamepad(): { input: Partial<PlayerInput>; toolKey: number | null } | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
  const gamepads = navigator.getGamepads();
  for (const gp of gamepads) {
    if (!gp || !gp.connected) continue;

    const lx = gp.axes[0] ?? 0;
    const direction: -1 | 0 | 1 =
      lx < -GP_STICK_DEADZONE ? -1 :
      lx > GP_STICK_DEADZONE ? 1 : 0;

    const pressed = (idx: number) => gp.buttons[idx]?.pressed ?? false;
    const value = (idx: number) => gp.buttons[idx]?.value ?? 0;

    const toolKey =
      pressed(GP_DPAD_UP) ? 1 :
      pressed(GP_DPAD_LEFT) ? 2 :
      pressed(GP_DPAD_RIGHT) ? 3 : null;

    return {
      input: {
        direction,
        shift: value(GP_RT) > 0.3,
        ctrl: value(GP_LT) > 0.3,
        jump: pressed(GP_A) || pressed(GP_DPAD_UP),
        slide: pressed(GP_B) || pressed(GP_DPAD_DOWN),
        interact: pressed(GP_X),
      },
      toolKey,
    };
  }
  return null;
}

export function createInputHandler() {
  const keys: Record<string, boolean> = {};

  const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

  return {
    attach(target: EventTarget) {
      target.addEventListener('keydown', onKeyDown as EventListener);
      target.addEventListener('keyup', onKeyUp as EventListener);
    },
    detach(target: EventTarget) {
      target.removeEventListener('keydown', onKeyDown as EventListener);
      target.removeEventListener('keyup', onKeyUp as EventListener);
    },
    read(): PlayerInput {
      const kb: PlayerInput = {
        direction: (keys['ArrowRight'] ?? false) || (keys['KeyD'] ?? false) ? 1 :
                   (keys['ArrowLeft'] ?? false) || (keys['KeyA'] ?? false) ? -1 : 0,
        shift: (keys['ShiftLeft'] ?? false) || (keys['ShiftRight'] ?? false),
        ctrl: (keys['ControlLeft'] ?? false) || (keys['ControlRight'] ?? false),
        jump: keys['Space'] ?? false,
        slide: (keys['ArrowDown'] ?? false) || (keys['KeyS'] ?? false),
        interact: keys['KeyE'] ?? false,
      };

      // Merge gamepad — either source can activate
      const gp = readGamepad();
      if (!gp) return kb;

      return {
        direction: kb.direction !== 0 ? kb.direction : (gp.input.direction ?? 0),
        shift: kb.shift || (gp.input.shift ?? false),
        ctrl: kb.ctrl || (gp.input.ctrl ?? false),
        jump: kb.jump || (gp.input.jump ?? false),
        slide: kb.slide || (gp.input.slide ?? false),
        interact: kb.interact || (gp.input.interact ?? false),
      };
    },
    readToolKey(): number | null {
      const gp = readGamepad();
      return gp?.toolKey ?? null;
    },
    setKey(code: string, pressed: boolean) { keys[code] = pressed; },
    reset() {
      for (const k of Object.keys(keys)) {
        delete keys[k];
      }
    },
  };
}
