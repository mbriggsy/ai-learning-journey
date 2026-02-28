import type { Container } from 'pixi.js';
import type { CarState } from '../engine/types';
import { CAR } from '../engine/constants';

// Zoom constants (pixels per world unit)
const ZOOM_BASE   = 3.0;
const ZOOM_MIN    = 2.5;  // Widest — high speed
const ZOOM_MAX    = 3.5;  // Tightest — low speed / corners
const ZOOM_SLIDE_BONUS = 0.4;  // Extra zoom-out when sliding
const SLIDE_THRESHOLD  = 1.5;  // |yawRate| above this = sliding

// Camera position lerp (smoothing)
const CAM_POS_LERP  = 0.12; // ~12% per frame — slight lag for feel
const CAM_ZOOM_LERP = 0.05; // ~5% per frame — smooth zoom transitions

export class CameraController {
  private currentZoom = ZOOM_BASE;
  private targetZoom  = ZOOM_BASE;

  /**
   * Apply camera transform to the world container.
   * Called every render frame with an interpolated car state.
   *
   * @param worldContainer - The container holding all world objects
   * @param carX - Interpolated car world X position
   * @param carY - Interpolated car world Y position
   * @param carHeading - Interpolated car heading (radians, engine convention)
   * @param screenW - Canvas width in pixels
   * @param screenH - Canvas height in pixels
   */
  update(
    worldContainer: Container,
    carX: number,
    carY: number,
    carHeading: number,
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

    // 2. Lerp current zoom toward target (smooth transitions)
    this.currentZoom += (this.targetZoom - this.currentZoom) * CAM_ZOOM_LERP;

    // 3. Set world container transforms
    //    pivot = car world position (point to rotate/zoom around)
    //    position = screen center (pivot maps to here)
    worldContainer.pivot.set(carX, carY);
    worldContainer.position.set(cx, cy);

    // 4. Car-facing-up rotation:
    //    Engine heading 0 = east (+X), we want car to face screen-up.
    //    PixiJS rotation is clockwise in screen space (Y-down).
    //    -(heading + PI/2) maps engine east → screen up.
    worldContainer.rotation = -(carHeading + Math.PI / 2);

    // 5. Apply zoom
    worldContainer.scale.set(this.currentZoom);
  }

  reset(): void {
    this.currentZoom = ZOOM_BASE;
    this.targetZoom  = ZOOM_BASE;
  }
}
