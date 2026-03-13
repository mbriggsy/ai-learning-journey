/**
 * WorldRenderer — scene composition with sprite-based rendering.
 *
 * Adapted from v02. Key changes:
 *   - Uses sub-container hierarchy (trackLayer, effectsLayer, carLayer)
 *   - Car renderers use atlas sprites instead of Graphics objects
 *   - render() includes RaceState parameter (C7)
 *   - Guards both prev.aiCar and curr.aiCar (C5)
 *   - Null guard on trackGraphics (render-before-ready)
 *   - destroy() properly destroys all children (no GPU buffer leaks)
 */

import { Container } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from '../engine/RaceController';
import { CameraController } from './CameraController';
import { CarRenderer } from './CarRenderer';
import { AiCarRenderer } from './AiCarRenderer';
import { buildTrackGraphics } from './TrackRenderer';
import { ASSETS, type TrackId } from '../assets/manifest';
import type { GameMode } from '../types/game-mode';

const DEFAULT_PLAYER_FRAME = ASSETS.cars.frames.playerRed;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  let result = a + diff * t;
  result = result - Math.round(result / (2 * Math.PI)) * (2 * Math.PI);
  return result;
}

export class WorldRenderer {
  private camera: CameraController;
  private carRenderer: CarRenderer;
  private aiCarRenderer: AiCarRenderer | null = null;
  private trackBuilt = false;
  private trackLayer: Container;
  private carLayer: Container;
  private worldContainer: Container;
  private shoulderSide: 'inner' | 'both' = 'inner';
  private mode: GameMode = 'solo';
  private trackId: TrackId = 'track-01';
  private getAiState: (() => { prev: WorldState | null; curr: WorldState | null }) | null = null;

  constructor(
    worldContainer: Container,
    trackLayer: Container,
    effectsLayer: Container,
    carLayer: Container,
    playerCarFrame: string = DEFAULT_PLAYER_FRAME,
  ) {
    this.worldContainer = worldContainer;
    this.trackLayer = trackLayer;
    this.carLayer = carLayer;
    this.camera = new CameraController();
    this.carRenderer = new CarRenderer(playerCarFrame);

    // Car containers will be added to carLayer when track is initialized
    // (ensures correct z-order: AI behind player)
  }

  setMode(mode: GameMode): void {
    this.mode = mode;
  }

  setTrackId(trackId: TrackId): void {
    this.trackId = trackId;
  }

  setShoulderSide(side: 'inner' | 'both'): void {
    this.shoulderSide = side;
  }

  setAiStateSource(getter: () => { prev: WorldState | null; curr: WorldState | null }): void {
    this.getAiState = getter;
  }

  initTrack(track: WorldState['track']): void {
    if (this.trackBuilt) return;

    // Build textured track graphics
    const trackGraphics = buildTrackGraphics(track, this.trackId, this.shoulderSide);
    this.trackLayer.addChild(trackGraphics);

    // AI car renderer — created for AI modes (between track and human car in z-order)
    if (this.mode !== 'solo') {
      this.aiCarRenderer = new AiCarRenderer();
      this.carLayer.addChild(this.aiCarRenderer.container);
    }

    // Player car on top
    this.carLayer.addChild(this.carRenderer.container);

    // Spectator: hide player car (camera follows AI via GameLoop dispatch)
    if (this.mode === 'spectator') {
      this.carRenderer.container.visible = false;
    }

    this.trackBuilt = true;
  }

  render(
    prev: WorldState,
    curr: WorldState,
    alpha: number,
    race: RaceState,
    screenW: number,
    screenH: number,
  ): void {
    // Initialize track on first render
    if (!this.trackBuilt) {
      this.initTrack(curr.track);
    }

    // Interpolate primary car position
    const carX = lerp(prev.car.position.x, curr.car.position.x, alpha);
    const carY = lerp(prev.car.position.y, curr.car.position.y, alpha);
    const carHeading = lerpAngle(prev.car.heading, curr.car.heading, alpha);

    // In spectator mode, hide human car
    this.carRenderer.container.visible = this.mode !== 'spectator';
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

    // Camera follows the appropriate car
    const followX = this.mode === 'spectator' ? aiCarX : carX;
    const followY = this.mode === 'spectator' ? aiCarY : carY;
    const followHeading = this.mode === 'spectator' ? aiCarHeading : carHeading;
    const followCar = this.mode === 'spectator' && this.getAiState?.()?.curr
      ? this.getAiState()!.curr!.car
      : curr.car;

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

  /** Reset for a new track — clears track graphics and car containers. */
  reset(): void {
    this.camera.reset();
    if (this.trackBuilt) {
      // Destroy track layer children
      for (const child of this.trackLayer.removeChildren()) {
        child.destroy({ children: true });
      }
      // Remove car containers (but don't destroy carRenderer — we reuse it)
      this.carLayer.removeChildren();
      this.trackBuilt = false;
    }
    if (this.aiCarRenderer) {
      this.aiCarRenderer.destroy();
      this.aiCarRenderer = null;
    }
  }

  /** Get AI car container for FilterManager attachment. Null if solo mode. */
  getAiCarContainer(): Container | null {
    return this.aiCarRenderer?.container ?? null;
  }

  /** Current camera zoom for filter velocity scaling. */
  get cameraZoom(): number {
    return this.camera.zoom;
  }

  destroy(): void {
    this.reset();
    this.carRenderer.destroy();
  }
}
