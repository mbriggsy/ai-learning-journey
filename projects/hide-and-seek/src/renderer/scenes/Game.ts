import Phaser from 'phaser';
import { GameEngine } from '../../game/engine.js';
import { createGameMap } from '../../game/map.js';
import { createGameState } from '../../game/state.js';
import { InputManager } from '../systems/InputManager.js';
import { PlayerSprite } from '../entities/PlayerSprite.js';
import { CAMERA, DEPTH } from '../../constants.js';

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private inputManager!: InputManager;
  private playerSprite!: PlayerSprite;
  private onVisibilityChange!: () => void;

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
    // --- Tilemap rendering ---
    const tilemap = this.make.tilemap({ key: 'map' });
    const tileset = tilemap.addTilesetImage('placeholder', 'tiles', 32, 32, 0, 0);
    if (!tileset) throw new Error('Tileset "placeholder" not found — check name match in Tiled JSON');

    const groundLayer = tilemap.createLayer('Ground', tileset);
    const wallsLayer = tilemap.createLayer('Walls', tileset);
    if (!groundLayer || !wallsLayer) throw new Error('Required tile layers not found');

    groundLayer.setDepth(DEPTH.GROUND);
    wallsLayer.setDepth(DEPTH.WALLS);

    // Debug collision visualization (not used for gameplay)
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

    // --- Player sprite ---
    const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
    if (!hiderSpawn) throw new Error('No hider_spawn');
    this.playerSprite = new PlayerSprite(this, hiderSpawn.x, hiderSpawn.y);

    // --- Camera: snap then follow ---
    const cam = this.cameras.main;
    cam.setZoom(CAMERA.ZOOM);
    cam.centerOn(hiderSpawn.x, hiderSpawn.y);
    cam.startFollow(this.playerSprite.getGameObject(), false, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
    cam.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

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
      this.inputManager.dispose();
    });
  }

  override update(_time: number, delta: number): void {
    const input = this.inputManager.sample();
    this.engine.tick(delta, input);
    const state = this.engine.getState();
    if (state.phase === 'playing') {
      this.playerSprite.syncFromGameState(state.player);
    }
  }
}
