import { Container, type Container as ContainerType } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from '../engine/RaceController';
import { CameraController } from './CameraController';
import { CarRenderer } from './CarRenderer';
import { AiCarRenderer } from './AiCarRenderer';
import { buildTrackGraphics } from './TrackRenderer';
import type { GameMode } from '../types/game-mode';

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
  private aiCarRenderer: AiCarRenderer | null = null;
  private trackBuilt = false;
  /** Own sub-container so reset() doesn't nuke siblings (e.g. EffectsRenderer). */
  private sceneContainer: Container;
  private shoulderSide: 'inner' | 'both' = 'inner';
  private mode: GameMode = 'solo';
  private getAiState: (() => { prev: WorldState | null; curr: WorldState | null }) | null = null;

  constructor(private worldContainer: ContainerType) {
    this.camera = new CameraController();
    this.carRenderer = new CarRenderer();
    this.sceneContainer = new Container();
    this.worldContainer.addChild(this.sceneContainer);
  }

  /** Set the game mode. Must be called before initTrack/render. */
  setMode(mode: GameMode): void {
    this.mode = mode;
  }

  /** Set the AI state source (getter returning prev/curr AI worlds for interpolation). */
  setAiStateSource(getter: () => { prev: WorldState | null; curr: WorldState | null }): void {
    this.getAiState = getter;
  }

  /**
   * Initialize track rendering (called once after game start, track is immutable).
   * Builds track graphics and adds them to sceneContainer before the car.
   */
  initTrack(track: WorldState['track']): void {
    if (this.trackBuilt) return;
    const trackGraphics = buildTrackGraphics(track, this.shoulderSide);
    this.sceneContainer.addChild(trackGraphics); // Track first (behind car)

    // AI car renderer — created lazily for AI modes (between track and human car)
    if (this.mode !== 'solo') {
      this.aiCarRenderer = new AiCarRenderer();
      this.sceneContainer.addChild(this.aiCarRenderer.container);
    }

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

    // In spectator mode, hide the human car (CP-2/CP-5)
    this.carRenderer.container.visible = this.mode !== 'spectator';

    // Update car sprite (interpolated position+heading for smooth motion -- VIS-02)
    this.carRenderer.update(carX, carY, carHeading);

    // AI car rendering — interpolate from getter state
    let aiCarX = carX;
    let aiCarY = carY;
    let aiCarHeading = carHeading;

    if (this.getAiState && this.aiCarRenderer) {
      const ai = this.getAiState();
      if (ai.prev && ai.curr) {
        aiCarX = lerp(ai.prev.car.position.x, ai.curr.car.position.x, alpha);
        aiCarY = lerp(ai.prev.car.position.y, ai.curr.car.position.y, alpha);
        aiCarHeading = lerpAngle(ai.prev.car.heading, ai.curr.car.heading, alpha);
        this.aiCarRenderer.update(aiCarX, aiCarY, aiCarHeading);
      }
    }

    // CP-2: In spectator mode, camera follows AI car position, not hidden human car
    const followX = this.mode === 'spectator' ? aiCarX : carX;
    const followY = this.mode === 'spectator' ? aiCarY : carY;
    const followHeading = this.mode === 'spectator' ? aiCarHeading : carHeading;
    const followCar = this.mode === 'spectator' && this.getAiState?.()?.curr
      ? this.getAiState()!.curr!.car
      : curr.car;

    // Update camera (car-facing-up, dynamic zoom -- VIS-01)
    this.camera.update(
      this.worldContainer,
      followX,
      followY,
      followHeading,
      screenW,
      screenH,
      followCar,
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
    this.aiCarRenderer = null;
  }
}
