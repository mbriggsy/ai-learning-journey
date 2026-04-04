import type { PlayerInput } from './player';

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
      return {
        direction: (keys['ArrowRight'] ?? false) || (keys['KeyD'] ?? false) ? 1 :
                   (keys['ArrowLeft'] ?? false) || (keys['KeyA'] ?? false) ? -1 : 0,
        shift: (keys['ShiftLeft'] ?? false) || (keys['ShiftRight'] ?? false),
        ctrl: (keys['ControlLeft'] ?? false) || (keys['ControlRight'] ?? false),
        jump: keys['Space'] ?? false,
        slide: (keys['ArrowDown'] ?? false) || (keys['KeyS'] ?? false),
        interact: keys['KeyE'] ?? false,
      };
    },
    setKey(code: string, pressed: boolean) { keys[code] = pressed; },
    reset() {
      for (const k of Object.keys(keys)) {
        delete keys[k];
      }
    },
  };
}
