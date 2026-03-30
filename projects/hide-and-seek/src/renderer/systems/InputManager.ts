import Phaser from 'phaser';
import type { InputState } from '../../types/input.js';
import { INPUT } from '../../constants.js';

interface KeyBindings {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  arrowUp: Phaser.Input.Keyboard.Key;
  arrowDown: Phaser.Input.Keyboard.Key;
  arrowLeft: Phaser.Input.Keyboard.Key;
  arrowRight: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  pause: Phaser.Input.Keyboard.Key;
}

// Pre-allocated to avoid 60 allocations/sec
const inputResult: { moveX: number; moveY: number; interact: boolean; pause: boolean } = {
  moveX: 0,
  moveY: 0,
  interact: false,
  pause: false,
};

const deadzoneResult = { x: 0, y: 0 };

export class InputManager {
  private keys: KeyBindings | null = null;
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private scene: Phaser.Scene;
  private prevInteract: boolean = false;
  private prevPause: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (scene.input.keyboard) {
      this.keys = scene.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
        arrowUp: 'UP',
        arrowDown: 'DOWN',
        arrowLeft: 'LEFT',
        arrowRight: 'RIGHT',
        interact: 'E',
        pause: 'ESC',
      }) as KeyBindings;
    }

    if (scene.input.gamepad) {
      // Check for already-connected pads
      if (scene.input.gamepad.total > 0) {
        this.pad = scene.input.gamepad.pad1;
      }
      // Listen for future connections (on, not once — handles reconnection)
      scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.pad = pad;
      });
      scene.input.gamepad.on('disconnected', () => {
        this.pad = null;
      });
    }
  }

  /** Returned object is a reused singleton — do not store references across frames. */
  sample(): InputState {
    // Keyboard direction
    let kbX = 0;
    let kbY = 0;
    let kbInteract = false;
    let kbPause = false;

    if (this.keys) {
      if (this.keys.left.isDown || this.keys.arrowLeft.isDown) kbX -= 1;
      if (this.keys.right.isDown || this.keys.arrowRight.isDown) kbX += 1;
      if (this.keys.up.isDown || this.keys.arrowUp.isDown) kbY -= 1;
      if (this.keys.down.isDown || this.keys.arrowDown.isDown) kbY += 1;
      kbInteract = this.keys.interact.isDown;
      kbPause = this.keys.pause.isDown;
    }

    // Normalize keyboard vector
    const kbMag = Math.sqrt(kbX * kbX + kbY * kbY);
    if (kbMag > 1) {
      kbX /= kbMag;
      kbY /= kbMag;
    }

    // Gamepad direction (scaled radial deadzone)
    let gpX = 0;
    let gpY = 0;
    let gpInteract = false;
    let gpPause = false;

    if (this.pad) {
      const rawX = Math.max(-1, Math.min(1, this.pad.leftStick.x));
      const rawY = Math.max(-1, Math.min(1, this.pad.leftStick.y));
      const gpResult = this.applyRadialDeadzone(rawX, rawY);
      gpX = gpResult.x;
      gpY = gpResult.y;

      // A button = interact, Start button = pause
      gpInteract = this.pad.A;
      gpPause = this.pad.buttons[9]?.pressed ?? false; // Start button
    }

    // Largest magnitude wins
    const kbMagFinal = Math.sqrt(kbX * kbX + kbY * kbY);
    const gpMagFinal = Math.sqrt(gpX * gpX + gpY * gpY);

    if (gpMagFinal > kbMagFinal) {
      inputResult.moveX = gpX;
      inputResult.moveY = gpY;
    } else {
      inputResult.moveX = kbX;
      inputResult.moveY = kbY;
    }

    // Edge-triggered buttons (true on press frame only)
    const interactDown = kbInteract || gpInteract;
    const pauseDown = kbPause || gpPause;
    inputResult.interact = interactDown && !this.prevInteract;
    inputResult.pause = pauseDown && !this.prevPause;
    this.prevInteract = interactDown;
    this.prevPause = pauseDown;

    return inputResult;
  }

  resetAllKeys(): void {
    if (this.keys && this.scene.input.keyboard) {
      this.scene.input.keyboard.resetKeys();
    }
    this.prevInteract = false;
    this.prevPause = false;
  }

  dispose(): void {
    if (this.scene.input.gamepad) {
      this.scene.input.gamepad.removeAllListeners();
    }
    this.keys = null;
    this.pad = null;
  }

  /** Returned object is a reused singleton — do not store references across frames. */
  private applyRadialDeadzone(x: number, y: number): { x: number; y: number } {
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude < INPUT.GAMEPAD_DEADZONE_INNER) {
      deadzoneResult.x = 0;
      deadzoneResult.y = 0;
    } else if (magnitude > INPUT.GAMEPAD_DEADZONE_OUTER) {
      deadzoneResult.x = x / magnitude;
      deadzoneResult.y = y / magnitude;
    } else {
      const scale = (magnitude - INPUT.GAMEPAD_DEADZONE_INNER)
        / (INPUT.GAMEPAD_DEADZONE_OUTER - INPUT.GAMEPAD_DEADZONE_INNER);
      deadzoneResult.x = (x / magnitude) * scale;
      deadzoneResult.y = (y / magnitude) * scale;
    }
    return deadzoneResult;
  }
}
