import { describe, it, expect } from 'vitest';
import {
  computeCameraTarget,
  createCameraState,
  updateCameraState,
  startHorrorHold,
  clampToLevelBounds,
} from '../../src/game/camera';
import { CAMERA } from '../../src/constants';

describe('computeCameraTarget', () => {
  it('leads ahead when facing right', () => {
    const target = computeCameraTarget({ x: 100, y: 50 }, 'right', false);
    expect(target.x).toBe(100 + CAMERA.LEAD_DISTANCE);
    expect(target.y).toBe(50);
  });

  it('leads behind when facing left', () => {
    const target = computeCameraTarget({ x: 100, y: 50 }, 'left', false);
    expect(target.x).toBe(100 - CAMERA.LEAD_DISTANCE);
    expect(target.y).toBe(50);
  });

  it('zooms in when hiding', () => {
    const target = computeCameraTarget({ x: 100, y: 50 }, 'right', true);
    expect(target.zoom).toBe(CAMERA.HIDE_ZOOM);
  });

  it('zoom is 1.0 when not hiding', () => {
    const target = computeCameraTarget({ x: 100, y: 50 }, 'right', false);
    expect(target.zoom).toBe(1);
  });
});

describe('updateCameraState', () => {
  it('lerps toward target position', () => {
    const state = createCameraState();
    const target = { x: 100, y: 50, zoom: 1 };

    updateCameraState(state, target, 1 / 60);
    // After one frame of lerp, should be closer to target but not there
    expect(state.x).toBeGreaterThan(0);
    expect(state.x).toBeLessThan(100);
  });

  it('multiple updates converge toward target', () => {
    const state = createCameraState();
    const target = { x: 100, y: 50, zoom: 1 };

    for (let i = 0; i < 100; i++) {
      updateCameraState(state, target, 1 / 60);
    }
    // After many frames, should be very close
    expect(state.x).toBeCloseTo(100, 0);
    expect(state.y).toBeCloseTo(50, 0);
  });

  it('lerps zoom toward target', () => {
    const state = createCameraState();
    const target = { x: 0, y: 0, zoom: 1.4 };

    for (let i = 0; i < 100; i++) {
      updateCameraState(state, target, 1 / 60);
    }
    expect(state.zoom).toBeCloseTo(1.4, 1);
  });
});

describe('horror beat hold', () => {
  it('hold locks camera toward monster position', () => {
    const state = createCameraState();
    state.x = 100;
    state.y = 50;
    startHorrorHold(state, { x: 300, y: 200 });

    expect(state.holdTimer).toBe(CAMERA.HORROR_HOLD_MS);

    // Update during hold — camera moves toward monster, not player
    const playerTarget = { x: 100, y: 50, zoom: 1 };
    updateCameraState(state, playerTarget, 0.1);

    expect(state.x).toBeGreaterThan(100); // moved toward monster (300)
  });

  it('hold expires and returns to normal follow', () => {
    const state = createCameraState();
    startHorrorHold(state, { x: 300, y: 200 });

    // Advance past hold duration
    const target = { x: 50, y: 25, zoom: 1 };
    updateCameraState(state, target, CAMERA.HORROR_HOLD_MS / 1000 + 0.1);

    expect(state.holdTimer).toBe(0);
    expect(state.holdTarget).toBeNull();

    // Next update should follow player target normally
    updateCameraState(state, target, 0.1);
    // Camera should be moving toward target (50, 25), not monster
  });
});

describe('clampToLevelBounds', () => {
  it('clamps camera to not scroll past left edge', () => {
    const result = clampToLevelBounds(-100, 200, 960, 540, 2000, 1000);
    expect(result.x).toBe(480); // half viewport width
  });

  it('clamps camera to not scroll past right edge', () => {
    const result = clampToLevelBounds(3000, 200, 960, 540, 2000, 1000);
    expect(result.x).toBe(2000 - 480);
  });

  it('allows camera within bounds', () => {
    const result = clampToLevelBounds(1000, 500, 960, 540, 2000, 1000);
    expect(result.x).toBe(1000);
    expect(result.y).toBe(500);
  });
});
