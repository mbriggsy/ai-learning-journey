import type { Position } from '../types/state';
import { CAMERA } from '../constants';

export type CameraTarget = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
};

export type CameraState = {
  x: number;
  y: number;
  zoom: number;
  holdTimer: number; // > 0 means horror beat hold is active
  holdTarget: Position | null;
};

export function createCameraState(): CameraState {
  return { x: 0, y: 0, zoom: 1, holdTimer: 0, holdTarget: null };
}

export function computeCameraTarget(
  playerPos: Position,
  facing: 'left' | 'right',
  isHiding: boolean,
): CameraTarget {
  const leadX = facing === 'right' ? CAMERA.LEAD_DISTANCE : -CAMERA.LEAD_DISTANCE;
  return {
    x: playerPos.x + leadX,
    y: playerPos.y,
    zoom: isHiding ? CAMERA.HIDE_ZOOM : 1,
  };
}

export function updateCameraState(
  state: CameraState,
  target: CameraTarget,
  dt: number,
): void {
  // Horror beat hold — camera stays on hold target
  if (state.holdTimer > 0) {
    state.holdTimer -= dt * 1000; // dt is seconds, holdTimer is ms
    if (state.holdTarget) {
      state.x = lerp(state.x, state.holdTarget.x, CAMERA.FOLLOW_LERP);
      state.y = lerp(state.y, state.holdTarget.y, CAMERA.FOLLOW_LERP);
    }
    if (state.holdTimer <= 0) {
      state.holdTimer = 0;
      state.holdTarget = null;
    }
    return;
  }

  state.x = lerp(state.x, target.x, CAMERA.FOLLOW_LERP);
  state.y = lerp(state.y, target.y, CAMERA.FOLLOW_LERP);
  state.zoom = lerp(state.zoom, target.zoom, CAMERA.FOLLOW_LERP);
}

export function startHorrorHold(state: CameraState, monsterPos: Position): void {
  state.holdTimer = CAMERA.HORROR_HOLD_MS;
  state.holdTarget = monsterPos;
}

export function clampToLevelBounds(
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  levelWidth: number,
  levelHeight: number,
): { x: number; y: number } {
  const halfW = viewWidth / 2;
  const halfH = viewHeight / 2;
  return {
    x: Math.max(halfW, Math.min(cameraX, levelWidth - halfW)),
    y: Math.max(halfH, Math.min(cameraY, levelHeight - halfH)),
  };
}

function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}
