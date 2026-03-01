import { Container, type Container as ContainerType } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from '../engine/RaceController';
import { CameraController } from './CameraController';
import { CarRenderer } from './CarRenderer';
import { buildTrackGraphics } from './TrackRenderer';

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Angle-aware lerp that avoids spinning the wrong way at the +/-PI boundary.
 * The difference is wrapped to [-PI, PI] before interpolating.
 */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff >  Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  // Normalize result to [-PI, PI] — engine heading accumulates unbounded
  let result = a + diff * t;
  result = result - Math.round(result / (2 * Math.PI)) * (2 * Math.PI);
  return result;
}

export class WorldRenderer {
  private camera: CameraController;
  private carRenderer: CarRenderer;
  private trackBuilt = false;
  /** Own sub-container so reset() doesn't nuke siblings (e.g. EffectsRenderer). */
  private sceneContainer: Container;
  private shoulderSide: 'inner' | 'both' = 'inner';

  constructor(private worldContainer: ContainerType) {
    this.camera = new CameraController();
    this.carRenderer = new CarRenderer();
    this.sceneContainer = new Container();
    this.worldContainer.addChild(this.sceneContainer);
  }

  /**
   * Initialize track rendering (called once after game start, track is immutable).
   * Builds track graphics and adds them to sceneContainer before the car.
   */
  initTrack(track: WorldState['track']): void {
    if (this.trackBuilt) return;
    const trackGraphics = buildTrackGraphics(track, this.shoulderSide);
    this.sceneContainer.addChild(trackGraphics);   // Track first (behind car)
    this.sceneContainer.addChild(this.carRenderer.container); // Car on top
    this.trackBuilt = true;
  }

  /**
   * Main render function -- called every animation frame by GameLoop.onRender().
   *
   * @param prev - WorldState at the previous physics tick
   * @param curr - WorldState at the current physics tick
   * @param alpha - Interpolation factor 0..1 (accumulator position)
   * @param race - Current game phase state
   * @param screenW - Canvas width in pixels
   * @param screenH - Canvas height in pixels
   */
  render(
    prev: WorldState,
    curr: WorldState,
    alpha: number,
    race: RaceState,
    screenW: number,
    screenH: number,
  ): void {
    // Initialize track on first render (after GameLoop has built the world)
    if (!this.trackBuilt) {
      this.initTrack(curr.track);
    }

    // Compute interpolated car position and heading
    const carX = lerp(prev.car.position.x, curr.car.position.x, alpha);
    const carY = lerp(prev.car.position.y, curr.car.position.y, alpha);
    const carHeading = lerpAngle(prev.car.heading, curr.car.heading, alpha);

    // Update car sprite (interpolated position+heading for smooth motion -- VIS-02)
    this.carRenderer.update(carX, carY, carHeading);

    // Update camera (car-facing-up, dynamic zoom -- VIS-01)
    this.camera.update(
      this.worldContainer,
      carX,
      carY,
      carHeading,
      screenW,
      screenH,
      curr.car,
    );
  }

  /** Set shoulder rendering config for the next track build. */
  setShoulderSide(side: 'inner' | 'both'): void {
    this.shoulderSide = side;
  }

  /** Reset for a new track — clears only our own scene children so initTrack rebuilds on next render. */
  reset(): void {
    this.camera.reset();
    if (this.trackBuilt) {
      this.sceneContainer.removeChildren();
      this.trackBuilt = false;
    }
  }
}
