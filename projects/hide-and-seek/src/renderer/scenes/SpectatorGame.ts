import Phaser from 'phaser';
import { GameEngine } from '../../game/engine.js';
import { createGameMap } from '../../game/map.js';
import { createSpectatingState } from '../../game/state.js';
import { createDoorSystem } from '../../game/doors.js';
import { SeekerSprite } from '../entities/SeekerSprite.js';
import { createDoorSprites, destroyDoorSprites } from '../entities/DoorSprite.js';
import type { DoorSpriteEntry } from '../entities/DoorSprite.js';
import { PauseAuthority, PAUSE_REASONS } from '../systems/PauseAuthority.js';
import { CinematicManager } from '../systems/CinematicManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SceneTransition } from '../utils/SceneTransition.js';
import { setPauseAuthority, setAudioManager } from './PauseMenu.js';
import { getGameSettings } from './Boot.js';
import type { SpectatorSceneData, SpectatorResultsSceneData } from '../../types/scenes.js';
import type { SpectatingState, GameFlowKind, DoorId, SeekerFSMState, HiderFSMState } from '../../types/state.js';
import type { FacingDirection } from '../../types/input.js';
import type { ReadonlyDeep } from '../../types/utility.js';
import { DEPTH, DISPLAY, CINEMATIC } from '../../constants.js';
import { TEXTURE_KEYS } from '../asset-keys.js';

const SEEKER_FSM_LABELS: Record<SeekerFSMState, string> = {
  patrol: 'PATROL',
  suspicious: 'SUSPICIOUS',
  search: 'SEARCH',
  chase: 'CHASE',
};

const HIDER_FSM_LABELS: Record<HiderFSMState, string> = {
  'countdown-moving': 'MOVING',
  hiding: 'HIDING',
  fleeing: 'FLEEING',
  repositioning: 'REPOSITIONING',
};

const HIDER_BODY_COLOR = 0x4488ff;
const HIDER_INDICATOR_SIZE = 8;
const HIDER_INDICATOR_OFFSET = 12;

const HIDER_FACING_OFFSETS: Record<FacingDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -HIDER_INDICATOR_OFFSET },
  down: { dx: 0, dy: HIDER_INDICATOR_OFFSET },
  left: { dx: -HIDER_INDICATOR_OFFSET, dy: 0 },
  right: { dx: HIDER_INDICATOR_OFFSET, dy: 0 },
};

const EMPTY_INPUT = { moveX: 0, moveY: 0, interact: false, pause: false } as const;

export class SpectatorGameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private seekerSprite!: SeekerSprite;
  private hiderBody!: Phaser.GameObjects.Rectangle;
  private hiderIndicator!: Phaser.GameObjects.Rectangle;
  private pauseAuthority!: PauseAuthority;
  private cinematic!: CinematicManager;
  private audioManager!: AudioManager;
  private doorSprites!: Map<DoorId, DoorSpriteEntry>;

  private visionConeGfx!: Phaser.GameObjects.Graphics;
  private debugPathGfx!: Phaser.GameObjects.Graphics;
  private seekerLabel!: Phaser.GameObjects.Text;
  private hiderLabel!: Phaser.GameObjects.Text;

  private debugPathsVisible: boolean = false;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private endSequenceTriggered: boolean = false;
  private onPhaseChanged!: (kind: GameFlowKind) => void;
  private onVisibilityChange!: () => void;
  private onSeekerStateChanged!: (payload: { oldState: SeekerFSMState; newState: SeekerFSMState }) => void;
  private onHiderStateChanged!: (payload: { oldState: HiderFSMState; newState: HiderFSMState }) => void;

  constructor() {
    super({ key: 'SpectatorGame' });
  }

  init(_data: SpectatorSceneData): void {
    this.endSequenceTriggered = false;
  }

  create(): void {
    const tilemap = this.setupTilemap();

    // --- Game engine (spectating mode) ---
    const tiledData = this.cache.tilemap.get('map')?.data;
    if (!tiledData) throw new Error('Tilemap data not in cache');
    const { map: gameMap, spawns, collisionGrid, losGrid, doorObjects } = createGameMap(tiledData);

    const settings = getGameSettings();
    const specState = createSpectatingState(gameMap, spawns);
    this.engine = new GameEngine(specState, settings.seekerDifficulty, {
      mode: 'spectator',
      hiderDifficulty: settings.hiderDifficulty,
    });

    // Door system
    const doorSystem = createDoorSystem(
      doorObjects, gameMap.width, gameMap.height,
      losGrid, collisionGrid,
      this.engine.getEmitterInternal(),
    );
    this.engine.setDoorSystem(doorSystem);

    // --- Systems ---
    this.pauseAuthority = new PauseAuthority(this.engine);
    this.cinematic = new CinematicManager(this);

    // --- Entities ---
    const hiderSpawn = spawns.find(s => s.type === 'hider_spawn')!;
    const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn')!;
    this.seekerSprite = new SeekerSprite(this, seekerSpawn.x, seekerSpawn.y);

    // Hider sprite (simple rectangle — same pattern as PlayerSprite)
    this.hiderBody = this.add.rectangle(hiderSpawn.x, hiderSpawn.y, DISPLAY.TILE_SIZE, DISPLAY.TILE_SIZE, HIDER_BODY_COLOR);
    this.hiderBody.setDepth(DEPTH.PLAYER);
    this.hiderIndicator = this.add.rectangle(hiderSpawn.x, hiderSpawn.y - HIDER_INDICATOR_OFFSET, HIDER_INDICATOR_SIZE, HIDER_INDICATOR_SIZE, 0xffffff);
    this.hiderIndicator.setDepth(DEPTH.PLAYER + 1);

    // --- Door sprites ---
    const listener = this.engine.getEmitter();
    this.doorSprites = createDoorSprites(this, doorSystem.getDoors(), listener);

    // --- Vision cones ---
    this.visionConeGfx = this.add.graphics();
    this.visionConeGfx.setDepth(DEPTH.PLAYER - 1);

    // --- Debug path overlay ---
    this.debugPathGfx = this.add.graphics();
    this.debugPathGfx.setDepth(DEPTH.PLAYER + 2);
    this.debugPathGfx.setVisible(false);

    // --- FSM labels (Text for now — BitmapFont requires asset loading) ---
    this.seekerLabel = this.add.text(seekerSpawn.x, seekerSpawn.y - 24, 'PATROL', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff4444',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(DEPTH.UI);

    this.hiderLabel = this.add.text(hiderSpawn.x, hiderSpawn.y - 24, 'MOVING', {
      fontFamily: 'monospace', fontSize: '12px', color: '#4488ff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(DEPTH.UI);

    // --- God-view camera ---
    const cam = this.cameras.main;
    const mapW = tilemap.widthInPixels;
    const mapH = tilemap.heightInPixels;
    const rawZoom = Math.min(cam.width / mapW, cam.height / mapH);
    const zoom = Math.max(0.25, Math.min(4.0, rawZoom));
    cam.setZoom(zoom);
    cam.centerOn(mapW / 2, mapH / 2);
    cam.setBounds(0, 0, mapW, mapH);
    cam.roundPixels = false; // non-integer zoom — jitter invisible at god-view scale

    // --- HUD (timer only, no minimap) ---
    const getState = () => this.engine.getState() as ReadonlyDeep<SpectatingState>;
    this.scene.launch('HUD', { listener, getState, spectator: true });

    // --- Audio (spectator mode — no heartbeat, both agents audible) ---
    this.audioManager = new AudioManager(this, listener, getState as () => ReadonlyDeep<import('../../types/state.js').GameState>, true);

    // --- Pause authority + audio ---
    setPauseAuthority(this.pauseAuthority, 'SpectatorGame');
    setAudioManager(this.audioManager);

    // --- Input ---
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => this.handleEscape());

    this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.debugKey.on('down', () => {
      this.debugPathsVisible = !this.debugPathsVisible;
      this.debugPathGfx.setVisible(this.debugPathsVisible);
    });

    // --- Events ---
    this.onPhaseChanged = (kind: GameFlowKind) => {
      if (kind === 'found') {
        this.audioManager.onFound();
        this.handleEndOfRound(kind);
      } else if (kind === 'survived') {
        this.audioManager.onSurvived();
        this.handleEndOfRound(kind);
      }
    };
    listener.on('PHASE_CHANGED', this.onPhaseChanged);

    this.onSeekerStateChanged = (payload) => {
      this.seekerLabel.setText(SEEKER_FSM_LABELS[payload.newState]);
    };
    listener.on('SEEKER_STATE_CHANGED', this.onSeekerStateChanged);

    this.onHiderStateChanged = (payload) => {
      this.hiderLabel.setText(HIDER_FSM_LABELS[payload.newState]);
    };
    listener.on('HIDER_STATE_CHANGED', this.onHiderStateChanged);

    // --- Tab visibility ---
    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.pauseAuthority.request(PAUSE_REASONS.TAB_HIDDEN);
        this.audioManager.onPause();
        this.scene.pause();
      } else {
        this.audioManager.onResume();
        this.pauseAuthority.release(PAUSE_REASONS.TAB_HIDDEN);
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // --- Shutdown cleanup ---
    this.events.on('shutdown', () => {
      this.scene.stop('HUD');
      listener.off('PHASE_CHANGED', this.onPhaseChanged);
      listener.off('SEEKER_STATE_CHANGED', this.onSeekerStateChanged);
      listener.off('HIDER_STATE_CHANGED', this.onHiderStateChanged);
      this.audioManager.dispose();
      destroyDoorSprites(this.doorSprites);
      this.visionConeGfx.destroy();
      this.debugPathGfx.destroy();
      this.cinematic.destroy();
      this.engine.dispose();
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    });

    // Fade in
    cam.fadeIn(CINEMATIC.SCENE_FADE_MS, 0, 0, 0);
  }

  private setupTilemap(): Phaser.Tilemaps.Tilemap {
    const tilemap = this.make.tilemap({ key: 'map' });
    const tileset = tilemap.addTilesetImage('interior', TEXTURE_KEYS.TILESET_INTERIOR, 32, 32, 1, 2);
    if (!tileset) throw new Error('Tileset "interior" not found');

    const groundLayer = tilemap.createLayer('Ground', tileset);
    const wallsLayer = tilemap.createLayer('Walls', tileset);
    if (!groundLayer || !wallsLayer) throw new Error('Required tile layers not found');

    groundLayer.setDepth(DEPTH.GROUND);
    wallsLayer.setDepth(DEPTH.WALLS);

    return tilemap;
  }

  override update(_time: number, delta: number): void {
    if (this.endSequenceTriggered) return;
    if (this.pauseAuthority.isPaused) return;

    // No player input — pass empty input
    this.engine.tick(delta, EMPTY_INPUT);

    const state = this.engine.getState();
    if (state.phase !== 'spectating') return;
    const s = state as ReadonlyDeep<SpectatingState>;

    this.syncSprites(s);
    this.updateVisionCones(s);
    this.updateLabels(s);
    this.audioManager.update();
  }

  private syncSprites(s: ReadonlyDeep<SpectatingState>): void {
    this.seekerSprite.syncFromGameState(s.seeker);
    this.seekerSprite.setVisible(true);

    // Hider sprite
    this.hiderBody.setPosition(s.hider.x, s.hider.y);
    const off = HIDER_FACING_OFFSETS[s.hider.facing];
    this.hiderIndicator.setPosition(s.hider.x + off.dx, s.hider.y + off.dy);
  }

  private updateVisionCones(s: ReadonlyDeep<SpectatingState>): void {
    const gfx = this.visionConeGfx;
    gfx.clear();

    if (s.gameFlow.kind === 'found' || s.gameFlow.kind === 'survived') return;

    // Seeker vision cone (red/orange, 15% alpha)
    const seekerRange = DISPLAY.TILE_SIZE * 8; // visual range in pixels
    const seekerHalfCone = (90 * Math.PI / 180) / 2; // default Medium cone
    gfx.fillStyle(0xff4400, 0.15);
    gfx.beginPath();
    gfx.moveTo(s.seeker.x, s.seeker.y);
    gfx.arc(s.seeker.x, s.seeker.y, seekerRange,
      s.seeker.facingAngle - seekerHalfCone, s.seeker.facingAngle + seekerHalfCone);
    gfx.closePath();
    gfx.fillPath();

    // Hider awareness circle (blue, 10% alpha — Hard hider only)
    if (s.hider.fsmState === 'fleeing' || s.hider.fsmState === 'repositioning') {
      const hiderRange = DISPLAY.TILE_SIZE * 6;
      gfx.fillStyle(0x4488ff, 0.1);
      gfx.fillCircle(s.hider.x, s.hider.y, hiderRange);
    }
  }

  private updateLabels(s: ReadonlyDeep<SpectatingState>): void {
    this.seekerLabel.setPosition(s.seeker.x, s.seeker.y - 24);
    this.hiderLabel.setPosition(s.hider.x, s.hider.y - 24);
  }

  private handleEscape(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.endSequenceTriggered) return;
    if (this.scene.isActive('PauseMenu')) return;

    this.pauseAuthority.request(PAUSE_REASONS.MENU);
    this.scene.sleep('SpectatorGame');
    this.scene.sleep('HUD');
    this.scene.launch('PauseMenu');
    this.scene.bringToTop('PauseMenu');
  }

  private handleEndOfRound(kind: GameFlowKind): void {
    if (this.endSequenceTriggered) return;
    this.endSequenceTriggered = true;

    const state = this.engine.getState();
    if (state.phase !== 'spectating') return;
    const s = state as ReadonlyDeep<SpectatingState>;

    // Stop vision cones
    this.visionConeGfx.clear();

    const settings = getGameSettings();
    const data: SpectatorResultsSceneData = {
      outcome: kind === 'found' ? 'found' : 'survived',
      huntDurationTicks: s.gameFlow.kind === 'found'
        ? (s.gameFlow as ReadonlyDeep<{ ticksSurvived: number }>).ticksSurvived
        : (s.gameFlow as ReadonlyDeep<{ huntDurationTicks: number }>).huntDurationTicks,
      seekerDifficulty: settings.seekerDifficulty,
      hiderDifficulty: settings.hiderDifficulty,
    };

    // Brief pause then transition to results
    this.time.delayedCall(1500, () => {
      SceneTransition.startScene(this, 'SpectatorResults', data);
    });
  }
}
