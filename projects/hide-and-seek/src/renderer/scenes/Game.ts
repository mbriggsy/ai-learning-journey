import Phaser from 'phaser';
import { GameEngine } from '../../game/engine.js';
import { createGameMap } from '../../game/map.js';
import { createGameState } from '../../game/state.js';
import { createDoorSystem } from '../../game/doors.js';
import { pixelToTile } from '../../game/map.js';
import { InputManager } from '../systems/InputManager.js';
import { FogRenderer } from '../systems/FogRenderer.js';
import { CinematicManager } from '../systems/CinematicManager.js';
import { MinimapManager } from '../systems/MinimapManager.js';
import { SonarPing } from '../systems/SonarPing.js';
import { PauseAuthority, PAUSE_REASONS } from '../systems/PauseAuthority.js';
import { AudioManager } from '../systems/AudioManager.js';
import { EndOfRoundSequence } from '../utils/EndOfRoundSequence.js';
import { SceneTransition } from '../utils/SceneTransition.js';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { SeekerSprite } from '../entities/SeekerSprite.js';
import { createDoorSprites, destroyDoorSprites } from '../entities/DoorSprite.js';
import type { DoorSpriteEntry } from '../entities/DoorSprite.js';
import { setPauseAuthority, setAudioManager } from './PauseMenu.js';
import { getGameSettings } from './Boot.js';
import { installTestBridge, removeTestBridge } from '../utils/TestBridge.js';
import type { GameSceneData } from '../../types/scenes.js';
import type { PlayingState, GameFlowKind, DoorId } from '../../types/state.js';
import type { ReadonlyDeep } from '../../types/utility.js';
import { CAMERA, DEPTH, DISPLAY, CINEMATIC, SIMULATION } from '../../constants.js';
import { SEEKER_CONFIGS } from '../../game/ai/seeker-configs.js';
import { createRoundResult } from '../../game/scoring.js';
import { loadStats, saveStats, recordGameResult } from '../../persistence.js';

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private inputManager!: InputManager;
  private playerSprite!: PlayerSprite;
  private seekerSprite!: SeekerSprite;
  private fogRenderer!: FogRenderer;
  private cinematic!: CinematicManager;
  private pauseAuthority!: PauseAuthority;
  private endSequence!: EndOfRoundSequence;
  private onVisibilityChange!: () => void;

  private minimapManager!: MinimapManager;
  private sonarPing!: SonarPing;
  private doorSprites!: Map<DoorId, DoorSpriteEntry>;

  private audioManager!: AudioManager;
  private visionConeGfx!: Phaser.GameObjects.Graphics;
  private seekerConeHalfAngle: number = 0;
  private seekerVisionRange: number = 0;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private endSequenceTriggered: boolean = false;
  private onPhaseChanged!: (kind: GameFlowKind) => void;

  constructor() {
    super({ key: 'Game' });
  }

  init(_data: GameSceneData): void {
    this.endSequenceTriggered = false;
  }

  create(): void {
    // --- Tilemap rendering ---
    const tilemap = this.setupTilemap();

    // --- Game engine + doors ---
    const tiledData = this.cache.tilemap.get('map')?.data;
    if (!tiledData) throw new Error('Tilemap data not in cache');
    const { map: gameMap, spawns, collisionGrid, losGrid, doorObjects } = createGameMap(tiledData);

    // Create engine first (creates its own emitter), then set up door system with that emitter
    const settings = getGameSettings();
    const gameState = createGameState(gameMap, spawns);
    this.engine = new GameEngine(gameState, settings.seekerDifficulty);

    // Create door system using engine's emitter for DOOR_TOGGLED events
    const doorSystem = createDoorSystem(
      doorObjects, gameMap.width, gameMap.height,
      losGrid, collisionGrid,
      this.engine.getEmitterInternal(),
    );
    this.engine.setDoorSystem(doorSystem);

    // --- Systems ---
    this.inputManager = new InputManager(this);
    this.pauseAuthority = new PauseAuthority(this.engine);
    this.cinematic = new CinematicManager(this);
    this.fogRenderer = new FogRenderer(this, gameMap.width, gameMap.height);
    // Easy mode: no fog — see docs/design/vision-model-spec.md
    this.fogRenderer.getLayer().setVisible(false);

    // Register fog layer with cinematic manager (UI camera ignores it)
    this.cinematic.ignoreOnUI(this.fogRenderer.getLayer());

    // --- Entities ---
    const hiderSpawn = spawns.find(s => s.type === 'hider_spawn')!;
    const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn')!;
    this.playerSprite = new PlayerSprite(this, hiderSpawn.x, hiderSpawn.y);
    this.seekerSprite = new SeekerSprite(this, seekerSpawn.x, seekerSpawn.y);

    // Ignore ALL entity game objects on UI camera (body + facing indicators)
    for (const obj of this.playerSprite.getGameObjects()) this.cinematic.ignoreOnUI(obj);
    for (const obj of this.seekerSprite.getGameObjects()) this.cinematic.ignoreOnUI(obj);

    // --- Seeker vision cone ---
    const seekerConfig = SEEKER_CONFIGS[settings.seekerDifficulty];
    this.seekerConeHalfAngle = (seekerConfig.visionConeAngle * Math.PI / 180) / 2;
    this.seekerVisionRange = seekerConfig.visionRange * DISPLAY.TILE_SIZE;
    this.visionConeGfx = this.add.graphics();
    this.visionConeGfx.setDepth(DEPTH.PLAYER - 1);
    this.cinematic.ignoreOnUI(this.visionConeGfx);

    // --- Door sprites ---
    const listener = this.engine.getEmitter();
    this.doorSprites = createDoorSprites(this, doorSystem.getDoors(), listener);
    for (const entry of this.doorSprites.values()) {
      this.cinematic.ignoreOnUI(entry.sprite);
    }

    // Ignore tilemap layers on UI camera
    tilemap.layers.forEach(layerData => {
      if (layerData.tilemapLayer) {
        this.cinematic.ignoreOnUI(layerData.tilemapLayer);
      }
    });

    // --- End of round sequence ---
    this.endSequence = new EndOfRoundSequence(
      this, this.cinematic, this.pauseAuthority, this.fogRenderer, settings.reducedMotion,
    );

    // --- Camera ---
    const cam = this.cameras.main;
    cam.setZoom(CAMERA.ZOOM);
    cam.centerOn(hiderSpawn.x, hiderSpawn.y);
    cam.startFollow(this.playerSprite.getGameObject(), false, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
    cam.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

    // --- Minimap ---
    this.minimapManager = new MinimapManager(
      this,
      this.playerSprite.getGameObject(),
      tilemap.widthInPixels,
      tilemap.heightInPixels,
      doorSystem.getDoors(),
      listener,
    );

    // Fog renders automatically on all cameras — minimap shows fog state correctly

    // --- Sonar ping ---
    const getState = () => this.engine.getState() as ReadonlyDeep<PlayingState>;
    this.sonarPing = new SonarPing(
      this,
      this.minimapManager,
      listener,
      () => {
        const s = this.engine.getState();
        return s.phase === 'playing' ? { x: s.player.x, y: s.player.y } : { x: 0, y: 0 };
      },
    );

    // --- Audio ---
    this.audioManager = new AudioManager(this, listener, getState, false);

    // --- HUD parallel scene ---
    this.scene.launch('HUD', { listener, getState });

    // --- Pause authority + audio shared with PauseMenu ---
    setPauseAuthority(this.pauseAuthority);
    setAudioManager(this.audioManager);

    // --- Input ---
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => this.handleEscape());

    // --- Event subscriptions ---
    this.setupEvents();

    // --- Tab visibility ---
    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.pauseAuthority.request(PAUSE_REASONS.TAB_HIDDEN);
        this.audioManager.onPause();
        this.scene.pause();
      } else {
        this.inputManager.resetAllKeys();
        this.audioManager.onResume();
        this.pauseAuthority.release(PAUSE_REASONS.TAB_HIDDEN);
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // --- Shutdown cleanup ---
    this.events.on('shutdown', () => {
      this.scene.stop('HUD');
      this.engine.getEmitter().off('PHASE_CHANGED', this.onPhaseChanged);
      this.audioManager.dispose();
      this.visionConeGfx.destroy();
      this.sonarPing.destroy();
      this.minimapManager.destroy();
      destroyDoorSprites(this.doorSprites);
      this.fogRenderer.destroy();
      this.cinematic.destroy();
      this.engine.dispose();
      this.inputManager.dispose();
      removeTestBridge();
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    });

    // --- TestBridge (dev-only, compile-time eliminated in production) ---
    if (import.meta.env.DEV) {
      installTestBridge(
        this,
        () => {
          const s = this.engine.getState();
          return s.phase === 'playing' ? s as ReadonlyDeep<PlayingState> : null;
        },
        () => this.fogRenderer?.getFogState() ?? null,
        () => this.cinematic?.getSplashText() ?? null,
      );
    }

    // Fade in
    this.cameras.main.fadeIn(CINEMATIC.SCENE_FADE_MS, 0, 0, 0);
  }

  private setupTilemap(): Phaser.Tilemaps.Tilemap {
    const tilemap = this.make.tilemap({ key: 'map' });
    const tileset = tilemap.addTilesetImage('placeholder', 'tiles', 32, 32, 0, 0);
    if (!tileset) throw new Error('Tileset "placeholder" not found — check name match in Tiled JSON');

    const groundLayer = tilemap.createLayer('Ground', tileset);
    const wallsLayer = tilemap.createLayer('Walls', tileset);
    if (!groundLayer || !wallsLayer) throw new Error('Required tile layers not found');

    groundLayer.setDepth(DEPTH.GROUND);
    wallsLayer.setDepth(DEPTH.WALLS);
    wallsLayer.setCollisionByProperty({ collides: true });

    return tilemap;
  }

  private setupEvents(): void {
    const listener = this.engine.getEmitter();
    this.onPhaseChanged = (kind: GameFlowKind) => {
      if (kind === 'hunt') {
        this.handleCountdownToHunt();
      }
      if (kind === 'found') {
        this.audioManager.onFound();
        this.minimapManager.setVisible(false);
      }
      if (kind === 'survived') {
        this.audioManager.onSurvived();
        this.minimapManager.setVisible(false);
      }
    };
    listener.on('PHASE_CHANGED', this.onPhaseChanged);

    // Sonar ping audio (cross-phase fix: was visual-only)
    listener.on('SONAR_PING_DUE', () => {
      this.audioManager.playSonarPing();
    });
  }

  private handleCountdownToHunt(): void {
    // Camera fade transition: fadeOut → reset fog → fadeIn
    const cam = this.cameras.main;
    cam.fadeOut(CINEMATIC.COUNTDOWN_TO_HUNT_FADE_OUT_MS, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.fogRenderer.transitionToHunt();
      cam.fadeIn(CINEMATIC.COUNTDOWN_TO_HUNT_FADE_IN_MS, 0, 0, 0);
    });
  }

  override update(_time: number, delta: number): void {
    // End of round sequence polling
    if (this.endSequence.isRunning) {
      this.endSequence.update(delta);
      this.syncSprites();
      return;
    }

    if (this.pauseAuthority.isPaused) return;

    const input = this.inputManager.sample();
    this.engine.tick(delta, input);

    const state = this.engine.getState();
    if (state.phase !== 'playing') return;

    this.syncSprites();
    this.updateFog(state as ReadonlyDeep<PlayingState>);
    this.updateMinimap(state as ReadonlyDeep<PlayingState>);
    this.audioManager.update();
    this.checkEndOfRound(state as ReadonlyDeep<PlayingState>);
  }

  private handleEscape(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.pauseAuthority.hasReason(PAUSE_REASONS.CINEMATIC)) return;
    if (this.endSequenceTriggered) return;

    if (this.scene.isActive('PauseMenu')) return;

    this.pauseAuthority.request(PAUSE_REASONS.MENU);
    this.scene.sleep('Game');
    this.scene.sleep('HUD');
    this.scene.launch('PauseMenu');
    this.scene.bringToTop('PauseMenu');
  }

  private syncSprites(): void {
    const state = this.engine.getState();
    if (state.phase !== 'playing') return;

    this.playerSprite.syncFromGameState(state.player);
    this.seekerSprite.syncFromGameState(state.seeker);

    // Easy mode: seeker always visible — see docs/design/vision-model-spec.md
    this.seekerSprite.setVisible(true);

    // Vision cone — rendered from actual FOV data so it respects walls/doors
    this.visionConeGfx.clear();
    if (state.gameFlow.kind === 'hunt') {
      this.drawVisionCone(state as ReadonlyDeep<PlayingState>);
    }
  }

  private drawVisionCone(state: ReadonlyDeep<PlayingState>): void {
    const gfx = this.visionConeGfx;
    const ts = DISPLAY.TILE_SIZE;
    const sx = state.seeker.x;
    const sy = state.seeker.y;
    const facing = state.seeker.facingAngle;
    const halfCone = this.seekerConeHalfAngle;
    const fov = state.seekerFov;
    const mapW = state.map.width;
    const mapH = state.map.height;

    gfx.fillStyle(0xff4400, 0.12);

    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        if (fov[ty * mapW + tx] === 0) continue;

        // Tile center relative to seeker
        const cx = tx * ts + ts / 2 - sx;
        const cy = ty * ts + ts / 2 - sy;

        // Skip the seeker's own tile
        if (cx * cx + cy * cy < ts * ts * 0.25) continue;

        // Check if tile is within cone angle
        const angle = Math.atan2(cy, cx);
        let diff = angle - facing;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;

        if (Math.abs(diff) <= halfCone) {
          gfx.fillRect(tx * ts, ty * ts, ts, ts);
        }
      }
    }
  }

  private updateFog(state: ReadonlyDeep<PlayingState>): void {
    if (state.gameFlow.kind === 'hunt' || state.gameFlow.kind === 'countdown') {
      this.fogRenderer.update(state);
    }
  }

  private updateMinimap(state: ReadonlyDeep<PlayingState>): void {
    const visible = state.gameFlow.kind === 'countdown' || state.gameFlow.kind === 'hunt';
    this.minimapManager.setVisible(visible);
    if (visible) {
      this.minimapManager.update(state);
    }
  }

  private checkEndOfRound(state: ReadonlyDeep<PlayingState>): void {
    if (this.endSequenceTriggered) return;

    const flow = state.gameFlow;
    if (flow.kind !== 'found' && flow.kind !== 'survived') return;

    this.endSequenceTriggered = true;
    const outcome = flow.kind;
    const settings = getGameSettings();
    const timeSurvivedMs = outcome === 'found'
      ? flow.ticksSurvived * SIMULATION.FIXED_STEP_S * 1000
      : flow.huntDurationTicks * SIMULATION.FIXED_STEP_S * 1000;

    // Build RoundResult + persist stats
    const currentStats = loadStats();
    const diffStats = currentStats.byDifficulty[settings.seekerDifficulty];
    const roundResult = createRoundResult(
      state.stats as import('../../types/state.js').GameStats,
      outcome,
      settings.seekerDifficulty,
      'human',
      diffStats.bestScore,
      diffStats.bestSurvivalTimeS,
    );

    // Persist updated stats
    const updatedStats = recordGameResult(
      currentStats,
      settings.seekerDifficulty,
      outcome,
      roundResult.breakdown.totalScore,
      roundResult.timeSurvivedS,
    );
    saveStats(updatedStats);

    const resultsData = { roundResult, outcome, timeSurvivedMs };

    if (outcome === 'found') {
      this.endSequence.playFound(
        state.player.x, state.player.y,
        state.seeker.x, state.seeker.y,
        resultsData,
      );
    } else {
      this.endSequence.playSurvived(
        state.player.x, state.player.y,
        resultsData,
      );
    }
  }
}
