import Phaser from 'phaser';
import { GameEngine } from '../../game/engine.js';
import { createGameMap } from '../../game/map.js';
import { createGameState } from '../../game/state.js';
import { pixelToTile } from '../../game/map.js';
import { InputManager } from '../systems/InputManager.js';
import { FogRenderer } from '../systems/FogRenderer.js';
import { CinematicManager } from '../systems/CinematicManager.js';
import { PauseAuthority, PAUSE_REASONS } from '../systems/PauseAuthority.js';
import { EndOfRoundSequence } from '../utils/EndOfRoundSequence.js';
import { SceneTransition } from '../utils/SceneTransition.js';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { SeekerSprite } from '../entities/SeekerSprite.js';
import { setPauseAuthority } from './PauseMenu.js';
import { getGameSettings } from './Boot.js';
import { installTestBridge, removeTestBridge } from '../utils/TestBridge.js';
import type { GameSceneData } from '../../types/scenes.js';
import type { PlayingState, GameFlowKind } from '../../types/state.js';
import type { ReadonlyDeep } from '../../types/utility.js';
import { CAMERA, DEPTH, DISPLAY, CINEMATIC } from '../../constants.js';
import { SIMULATION } from '../../constants.js';

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

  private escapeKey!: Phaser.Input.Keyboard.Key;
  private endSequenceTriggered: boolean = false;
  private lastFlowKind: GameFlowKind = 'countdown';

  constructor() {
    super({ key: 'Game' });
  }

  init(_data: GameSceneData): void {
    this.endSequenceTriggered = false;
    this.lastFlowKind = 'countdown';
  }

  preload(): void {
    // Assets already loaded by Boot scene
  }

  create(): void {
    // --- Tilemap rendering ---
    const tilemap = this.setupTilemap();

    // --- Game engine ---
    const tiledData = this.cache.tilemap.get('map')?.data;
    if (!tiledData) throw new Error('Tilemap data not in cache');
    const { map: gameMap, spawns } = createGameMap(tiledData);
    const gameState = createGameState(gameMap, spawns);
    this.engine = new GameEngine(gameState);

    // --- Systems ---
    this.inputManager = new InputManager(this);
    this.pauseAuthority = new PauseAuthority(this.engine);
    this.cinematic = new CinematicManager(this);
    this.fogRenderer = new FogRenderer(this, gameMap.width, gameMap.height);

    // Register fog layer with cinematic manager (UI camera ignores it)
    this.cinematic.ignoreOnUI(this.fogRenderer.getLayer());

    // --- Entities ---
    const hiderSpawn = spawns.find(s => s.type === 'hider_spawn')!;
    const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn')!;
    this.playerSprite = new PlayerSprite(this, hiderSpawn.x, hiderSpawn.y);
    this.seekerSprite = new SeekerSprite(this, seekerSpawn.x, seekerSpawn.y);

    // Ignore entities on UI camera
    this.cinematic.ignoreOnUI(this.playerSprite.getGameObject());
    this.cinematic.ignoreOnUI(this.seekerSprite.getGameObject());

    // Ignore tilemap layers on UI camera
    tilemap.layers.forEach(layerData => {
      if (layerData.tilemapLayer) {
        this.cinematic.ignoreOnUI(layerData.tilemapLayer);
      }
    });

    // --- End of round sequence ---
    const settings = getGameSettings();
    this.endSequence = new EndOfRoundSequence(
      this, this.cinematic, this.pauseAuthority, this.fogRenderer, settings.reducedMotion,
    );

    // --- Camera ---
    const cam = this.cameras.main;
    cam.setZoom(CAMERA.ZOOM);
    cam.centerOn(hiderSpawn.x, hiderSpawn.y);
    cam.startFollow(this.playerSprite.getGameObject(), false, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
    cam.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

    // --- HUD parallel scene ---
    const listener = this.engine.getEmitter();
    const getState = () => this.engine.getState() as ReadonlyDeep<PlayingState>;
    this.scene.launch('HUD', { listener, getState });

    // --- Pause authority shared with PauseMenu ---
    setPauseAuthority(this.pauseAuthority);

    // --- Input ---
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => this.handleEscape());

    // --- Event subscriptions ---
    this.setupEvents();

    // --- Tab visibility ---
    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.pauseAuthority.request(PAUSE_REASONS.TAB_HIDDEN);
        this.scene.pause();
      } else {
        this.inputManager.resetAllKeys();
        this.pauseAuthority.release(PAUSE_REASONS.TAB_HIDDEN);
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // --- Shutdown cleanup ---
    this.events.on('shutdown', () => {
      this.scene.stop('HUD');
      this.fogRenderer.destroy();
      this.cinematic.destroy();
      this.engine.dispose();
      this.inputManager.dispose();
      removeTestBridge();
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    });

    // --- TestBridge (dev-only) ---
    installTestBridge(
      this,
      () => {
        const s = this.engine.getState();
        return s.phase === 'playing' ? s as ReadonlyDeep<PlayingState> : null;
      },
      () => this.fogRenderer?.getFogState() ?? null,
      () => this.cinematic?.getSplashText() ?? null,
    );

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
    const onPhaseChanged = (kind: GameFlowKind) => {
      if (kind === 'hunt') {
        this.handleCountdownToHunt();
      }
    };
    listener.on('PHASE_CHANGED', onPhaseChanged);
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

    // Seeker visibility based on fog
    const seekerObj = this.seekerSprite.getGameObject() as Phaser.GameObjects.Rectangle;
    if (state.gameFlow.kind === 'hunt') {
      const seekerTile = pixelToTile(state.seeker.x, state.seeker.y);
      seekerObj.setVisible(this.fogRenderer.isTileVisible(seekerTile.x, seekerTile.y));
    } else {
      // Countdown: seeker always visible
      seekerObj.setVisible(true);
    }
  }

  private updateFog(state: ReadonlyDeep<PlayingState>): void {
    if (state.gameFlow.kind === 'hunt') {
      this.fogRenderer.update(state);
    }
    // Countdown: fog all transparent (playerFov filled with 1s) — FogRenderer handles uniformly
    if (state.gameFlow.kind === 'countdown') {
      this.fogRenderer.update(state);
    }
  }

  private checkEndOfRound(state: ReadonlyDeep<PlayingState>): void {
    if (this.endSequenceTriggered) return;

    const flow = state.gameFlow;
    if (flow.kind === 'found') {
      this.endSequenceTriggered = true;
      const timeSurvivedMs = flow.ticksSurvived * SIMULATION.FIXED_STEP_S * 1000;
      this.endSequence.playFound(
        state.player.x, state.player.y,
        state.seeker.x, state.seeker.y,
        {
          outcome: 'found',
          timeSurvivedMs,
          distanceTraveled: state.stats.distanceTraveled,
        },
      );
    } else if (flow.kind === 'survived') {
      this.endSequenceTriggered = true;
      const timeSurvivedMs = flow.huntDurationTicks * SIMULATION.FIXED_STEP_S * 1000;
      this.endSequence.playSurvived(
        state.player.x, state.player.y,
        {
          outcome: 'survived',
          timeSurvivedMs,
          distanceTraveled: state.stats.distanceTraveled,
        },
      );
    }
  }
}
