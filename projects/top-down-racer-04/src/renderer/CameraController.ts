/**
 * CameraController — chase camera with speed-driven zoom.
 *
 * Copied from v02 unchanged. Top-down chase: camera follows car,
 * no rotation. Y-flip via negative Y scale (engine Y-up → screen Y-down).
 */

import type { Container } from 'pixi.js';
import type { CarState } from '../engine/types';
import { CAR } from '../engine/constants';

const ZOOM_MIN = 2.5;
const ZOOM_MAX = 4.0;
const ZOOM_BASE = 10.0;
const ZOOM_SLIDE_BONUS = 0.5;
const SLIDE_THRESHOLD = 1.5;
const CAM_ZOOM_LERP = 0.05;

export class CameraController {
  private currentZoom = ZOOM_BASE;
  private targetZoom = ZOOM_BASE;

  update(
    worldContainer: Container,
    carX: number,
    carY: number,
    _carHeading: number,
    screenW: number,
    screenH: number,
    car: CarState,
  ): void {
    const cx = screenW / 2;
    const cy = screenH / 2;

    const speedFactor = Math.min(car.speed / CAR.maxSpeed, 1.0);
    this.targetZoom = ZOOM_MAX - (ZOOM_MAX - ZOOM_MIN) * speedFactor;
    if (Math.abs(car.yawRate) > SLIDE_THRESHOLD) {
      this.targetZoom -= ZOOM_SLIDE_BONUS;
    }
    this.targetZoom = Math.max(ZOOM_MIN - ZOOM_SLIDE_BONUS, Math.min(ZOOM_MAX, this.targetZoom));

    this.currentZoom += (this.targetZoom - this.currentZoom) * CAM_ZOOM_LERP;

    worldContainer.pivot.set(carX, carY);
    worldContainer.position.set(cx, cy);
    worldContainer.scale.set(this.currentZoom, -this.currentZoom);
  }

  get zoom(): number {
    return this.currentZoom;
  }

  reset(): void {
    this.currentZoom = ZOOM_BASE;
    this.targetZoom = ZOOM_BASE;
  }
}
