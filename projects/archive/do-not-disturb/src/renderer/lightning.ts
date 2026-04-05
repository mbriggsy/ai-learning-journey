import Phaser from 'phaser';
import { LIGHTING } from '../constants';

export type LightningState = {
  flashTimer: number; // ms remaining in current flash, 0 = no flash
  nextFlashAt: number; // ms until next flash
};

export function createLightningState(): LightningState {
  return {
    flashTimer: 0,
    nextFlashAt: randomInterval(),
  };
}

export function updateLightning(state: LightningState, dtMs: number): void {
  if (state.flashTimer > 0) {
    state.flashTimer -= dtMs;
    if (state.flashTimer < 0) state.flashTimer = 0;
  }

  state.nextFlashAt -= dtMs;
  if (state.nextFlashAt <= 0) {
    state.flashTimer = LIGHTING.LIGHTNING_FLASH_MS + LIGHTING.LIGHTNING_FADE_MS;
    state.nextFlashAt = randomInterval();
  }
}

function randomInterval(): number {
  return LIGHTING.LIGHTNING_MIN_INTERVAL_MS +
    Math.random() * (LIGHTING.LIGHTNING_MAX_INTERVAL_MS - LIGHTING.LIGHTNING_MIN_INTERVAL_MS);
}
