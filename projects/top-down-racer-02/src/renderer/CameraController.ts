import type { Container } from 'pixi.js';
import type { CarState } from '../engine/types';
import { CAR } from '../engine/constants';

// Zoom constants (pixels per world unit)
const ZOOM_BASE   = 10.0;
const ZOOM_MIN    = 2.5;   // Widest — high speed
const ZOOM_MAX    = 4.0;   // Tightest — low speed / corners
const ZOOM_SLIDE_BONUS = 0.5;  // Extra zoom-out when sliding
const SLIDE_THRESHOLD  = 1.5;  // |yawRate| above this = sliding

// Camera smoothing
const CAM_ZOOM_LERP = 0.05; // ~5% per frame — smooth zoom transitions

export class CameraController {
  private currentZoom = ZOOM_BASE;
  private targetZoom  = ZOOM_BASE;

  /**
   * Apply chase-camera transform to the world container.
   * Top-down chase: camera follows car position, no rotation.
   * Engine Y-up is flipped to screen Y-down via negative Y scale.
   */
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

    // 1. Compute target zoom from speed and slide state
    const speedFactor = Math.min(car.speed / CAR.maxSpeed, 1.0);
    this.targetZoom = ZOOM_MAX - (ZOOM_MAX - ZOOM_MIN) * speedFactor;
    if (Math.abs(car.yawRate) > SLIDE_THRESHOLD) {
      this.targetZoom -= ZOOM_SLIDE_BONUS;
    }
    this.targetZoom = Math.max(ZOOM_MIN - ZOOM_SLIDE_BONUS, Math.min(ZOOM_MAX, this.targetZoom));

    // 2. Lerp current zoom toward target
    this.currentZoom += (this.targetZoom - this.currentZoom) * CAM_ZOOM_LERP;

    // 3. Center camera on car
    worldContainer.pivot.set(carX, carY);
    worldContainer.position.set(cx, cy);

    // 4. No rotation — track stays fixed on screen

    // 5. Apply zoom with Y-flip (engine Y-up → screen Y-down)
    worldContainer.scale.set(this.currentZoom, -this.currentZoom);
  }

  reset(): void {
    this.currentZoom = ZOOM_BASE;
    this.targetZoom  = ZOOM_BASE;
  }
}
