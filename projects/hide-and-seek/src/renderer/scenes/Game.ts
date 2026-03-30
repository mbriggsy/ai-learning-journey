import Phaser from 'phaser';
import { GameEngine } from '../../game/engine.js';
import { createGameMap } from '../../game/map.js';
import { createGameState } from '../../game/state.js';
import { ticksToDisplaySeconds } from '../../game/timer.js';
import { InputManager } from '../systems/InputManager.js';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { SeekerSprite } from '../entities/SeekerSprite.js';
import type { PlayingState, GameFlowKind } from '../../types/state.js';
import { CAMERA, DEPTH, DISPLAY } from '../../constants.js';

const HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '18px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 3,
};

const COUNTDOWN_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '64px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

const FLASH_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '48px',
  color: '#ffff00',
  stroke: '#000000',
  strokeThickness: 5,
};

const END_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '56px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

const PAUSE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '48px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 5,
};

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private inputManager!: InputManager;
  private playerSprite!: PlayerSprite;
  private seekerSprite!: SeekerSprite;
  private onVisibilityChange!: () => void;

  // HUD text objects (camera-independent via setScrollFactor(0))
  private countdownText!: Phaser.GameObjects.Text;
  private huntTimerText!: Phaser.GameObjects.Text;
  private flashText!: Phaser.GameObjects.Text;
  private endText!: Phaser.GameObjects.Text;
  private endSubText!: Phaser.GameObjects.Text;

  // Pause overlay
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;

  // State tracking
  private isGameOver: boolean = false;
  private endScreenTimer: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('tiles', 'assets/tilesets/placeholder.png');
    this.load.tilemapTiledJSON('map', 'assets/maps/hideandseek.json');

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`Failed to load asset: ${file.key} (${file.url})`);
    });
  }

  create(): void {
    this.isGameOver = false;
    this.endScreenTimer = 0;

    // --- Tilemap rendering ---
    const tilemap = this.make.tilemap({ key: 'map' });
    const tileset = tilemap.addTilesetImage('placeholder', 'tiles', 32, 32, 0, 0);
    if (!tileset) throw new Error('Tileset "placeholder" not found — check name match in Tiled JSON');

    const groundLayer = tilemap.createLayer('Ground', tileset);
    const wallsLayer = tilemap.createLayer('Walls', tileset);
    if (!groundLayer || !wallsLayer) throw new Error('Required tile layers not found');

    groundLayer.setDepth(DEPTH.GROUND);
    wallsLayer.setDepth(DEPTH.WALLS);

    wallsLayer.setCollisionByProperty({ collides: true });

    // --- Parse map data for game layer ---
    const tiledData = this.cache.tilemap.get('map')?.data;
    if (!tiledData) throw new Error('Tilemap data not in cache');
    const { map: gameMap, spawns } = createGameMap(tiledData);

    // --- Create game state and engine ---
    const gameState = createGameState(gameMap, spawns);
    this.engine = new GameEngine(gameState);

    // --- Input ---
    this.inputManager = new InputManager(this);

    // --- Sprites ---
    const hiderSpawn = spawns.find(s => s.type === 'hider_spawn')!;
    const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn')!;
    this.playerSprite = new PlayerSprite(this, hiderSpawn.x, hiderSpawn.y);
    this.seekerSprite = new SeekerSprite(this, seekerSpawn.x, seekerSpawn.y);

    // --- Camera: snap then follow ---
    const cam = this.cameras.main;
    cam.setZoom(CAMERA.ZOOM);
    cam.centerOn(hiderSpawn.x, hiderSpawn.y);
    cam.startFollow(this.playerSprite.getGameObject(), false, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
    cam.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

    // --- HUD (fixed to camera) ---
    this.createHUD();

    // --- Event subscriptions ---
    this.subscribeToEvents();

    // --- Tab visibility handler ---
    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.engine.pause();
        this.scene.pause();
      } else {
        this.inputManager.resetAllKeys();
        this.engine.resume();
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // --- Cleanup on shutdown ---
    this.events.on('shutdown', () => {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.engine.getEmitter().offAll();
      this.inputManager.dispose();
    });
  }

  private createHUD(): void {
    // HUD elements are positioned each frame via positionHUD() relative to the
    // camera's worldView. This avoids setScrollFactor(0) which misbehaves with zoom.
    this.countdownText = this.add.text(0, 0, '', COUNTDOWN_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);

    this.huntTimerText = this.add.text(0, 0, '', HUD_STYLE)
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI)
      .setVisible(false);

    this.flashText = this.add.text(0, 0, '', FLASH_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 1)
      .setAlpha(0);

    this.endText = this.add.text(0, 0, '', END_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 2)
      .setVisible(false);

    this.endSubText = this.add.text(0, 0, 'Press any key to restart', HUD_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 2)
      .setVisible(false);

    this.pauseOverlay = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.5)
      .setDepth(DEPTH.UI + 3)
      .setVisible(false);

    this.pauseText = this.add.text(0, 0, 'PAUSED', PAUSE_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 4)
      .setVisible(false);
  }

  private positionHUD(): void {
    const wv = this.cameras.main.worldView;
    const cx = wv.centerX;
    const cy = wv.centerY;

    this.countdownText.setPosition(cx, cy);
    this.huntTimerText.setPosition(wv.right - 8, wv.top + 8);
    this.flashText.setPosition(cx, cy);
    this.endText.setPosition(cx, cy - 15);
    this.endSubText.setPosition(cx, cy + 30);
    this.pauseOverlay.setPosition(cx, cy).setSize(wv.width, wv.height);
    this.pauseText.setPosition(cx, cy);
  }

  private subscribeToEvents(): void {
    const listener = this.engine.getEmitter();

    listener.on('PHASE_CHANGED', (kind: GameFlowKind) => {
      if (kind === 'hunt') {
        this.showPhaseFlash('HUNT!');
        this.countdownText.setVisible(false);
        this.huntTimerText.setVisible(true);
      }
      if (kind === 'found') {
        this.showEndScreen('FOUND!', '#ff4444');
      }
      if (kind === 'survived') {
        this.showEndScreen('SURVIVED!', '#44ff44');
      }
    });
  }

  private showPhaseFlash(text: string): void {
    this.flashText.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this.flashText,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
    });
  }

  private showEndScreen(text: string, color: string): void {
    this.isGameOver = true;
    this.endScreenTimer = 0;
    this.endText.setText(text).setStyle({ ...END_STYLE, color }).setVisible(true);
    this.huntTimerText.setVisible(false);

    // Show restart prompt after a short delay
    this.time.delayedCall(1500, () => {
      this.endSubText.setVisible(true);
    });
  }

  override update(_time: number, delta: number): void {
    const input = this.inputManager.sample();

    // Keep HUD anchored to camera every frame
    this.positionHUD();

    // Handle end screen restart
    if (this.isGameOver) {
      this.endScreenTimer += delta;
      if (this.endScreenTimer > 1500 && (input.interact || input.pause || input.moveX !== 0 || input.moveY !== 0)) {
        this.scene.restart();
        return;
      }
      this.syncSprites();
      return;
    }

    // Handle pause toggle
    if (input.pause) {
      if (this.engine.isPaused()) {
        this.engine.resume();
        this.pauseOverlay.setVisible(false);
        this.pauseText.setVisible(false);
      } else {
        this.engine.pause();
        this.pauseOverlay.setVisible(true);
        this.pauseText.setVisible(true);
      }
      return;
    }

    if (this.engine.isPaused()) return;

    this.engine.tick(delta, input);
    this.syncSprites();
    this.updateHUD();
  }

  private syncSprites(): void {
    const state = this.engine.getState();
    if (state.phase === 'playing') {
      this.playerSprite.syncFromGameState(state.player);
      this.seekerSprite.syncFromGameState(state.seeker);
    }
  }

  private updateHUD(): void {
    const state = this.engine.getState();
    if (state.phase !== 'playing') return;

    const flow = state.gameFlow;
    if (flow.kind === 'countdown') {
      const secs = ticksToDisplaySeconds(flow.ticksRemaining);
      this.countdownText.setText(`${secs}`).setVisible(true);
    } else if (flow.kind === 'hunt') {
      const secs = ticksToDisplaySeconds(flow.ticksRemaining);
      this.huntTimerText.setText(`${secs}s`);
    }
  }
}
