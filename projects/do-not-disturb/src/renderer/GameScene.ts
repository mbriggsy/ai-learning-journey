import Phaser from 'phaser';
import type { PlayingState, Position } from '../types/state';
import type { GameSession } from '../game/game-session';
import type { GameEventMap } from '../types/events';
import { createGameSession } from '../game/game-session';
import { createEngine } from '../game/engine';
import { createInputHandler } from '../game/input';
import { getGreyboxLevel, FLOOR_GROUNDS, LEVEL_WIDTH, FLOOR_HEIGHT, PLAYER_SPAWN, PHONE_POSITION, ESCAPE_DOOR_POSITION, STAIR_POSITIONS, ELEVATOR_POSITIONS, LAUNDRY_CHUTE_POSITION } from '../game/greybox-level';
import { createHUD } from './hud';
import type { HUDData } from './hud';
import { createCameraController } from './camera-controller';
import { getCatchMessage } from '../game/catch-sequence';
import { INVENTORY } from '../constants';

// --- Greybox colors ---
const COLORS = {
  player: 0x44cc44,
  bellhop: 0xcc4444,
  housekeeper: 0xcc8844,
  guest: 0x8844cc,
  floor: 0x555555,
  wall: 0x333333,
  door: 0x886644,
  doorOpen: 0x443322,
  hidingSpot: 0x4488cc,
  phone: 0xcccc44,
  escapeDoor: 0x44ffaa,
  stairMarker: 0xaaaaaa,
  elevatorMarker: 0x999999,
  chuteMarker: 0x88aa88,
} as const;

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private engine!: ReturnType<typeof createEngine>;
  private inputHandler!: ReturnType<typeof createInputHandler>;
  private hud!: ReturnType<typeof createHUD>;
  private cameraCtrl!: ReturnType<typeof createCameraController>;

  // Sprites
  private playerSprite!: Phaser.GameObjects.Rectangle;
  private monsterSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private floorSprites: Phaser.GameObjects.Rectangle[] = [];
  private doorSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private hidingSpotSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private phoneSprite!: Phaser.GameObjects.Rectangle;
  private escapeDoorSprite!: Phaser.GameObjects.Rectangle;
  private stairSprites: Phaser.GameObjects.Rectangle[] = [];
  private elevatorSprites: Phaser.GameObjects.Rectangle[] = [];

  // Overlays
  private monologueText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private catchOverlay!: Phaser.GameObjects.Rectangle;
  private catchText!: Phaser.GameObjects.Text;
  private transitionOverlay!: Phaser.GameObjects.Rectangle;
  private transitionText!: Phaser.GameObjects.Text;
  private endingText!: Phaser.GameObjects.Text;
  private escapeWindowIndicator!: Phaser.GameObjects.Rectangle;
  private debugText!: Phaser.GameObjects.Text;

  // Input tracking
  private prevInteract = false;
  private toolKeyPressed: number | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const levelConfig = getGreyboxLevel();
    this.session = createGameSession(levelConfig, localStorage);
    this.engine = createEngine((dt) => {
      const input = this.inputHandler.read();
      const toolKey = this.toolKeyPressed;
      this.toolKeyPressed = null;
      const interactJustPressed = this.isInteractJustPressed();
      this.session.fixedUpdate(dt, input, toolKey, interactJustPressed);
    });
    this.inputHandler = createInputHandler();
    this.inputHandler.attach(window);

    // Tool selection via number keys
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Digit1') this.toolKeyPressed = 1;
      if (event.code === 'Digit2') this.toolKeyPressed = 2;
      if (event.code === 'Digit3') this.toolKeyPressed = 3;
    });

    // Create world sprites
    this.createFloors();
    this.createLevelMarkers(levelConfig);
    this.createInteractables();
    this.createPlayer();
    this.createMonsterPlaceholders();

    // HUD
    this.hud = createHUD(this);

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.session.levelWidth, this.session.levelHeight);
    this.cameraCtrl = createCameraController(cam, this.session.emitter, this);

    // Overlays
    this.createOverlays();

    // Debug text
    this.debugText = this.add.text(16, 44, '', { fontSize: '12px', color: '#888888' });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(200);

    // Start night 1
    this.session.startNight(1);
  }

  override update(time: number, delta: number): void {
    // Tick engine
    this.engine.tick(delta);

    // Get state
    const state = this.session.getState();

    // Render based on phase
    if (state.phase === 'playing') {
      this.renderPlaying(state);
    } else if (state.phase === 'caught') {
      this.renderCaught(state);
    } else if (state.phase === 'ending') {
      this.renderEnding();
    }
  }

  private renderPlaying(state: PlayingState): void {
    // Player
    this.playerSprite.setPosition(state.player.position.x, state.player.position.y);
    // Visual facing indicator: slight horizontal scale bias
    this.playerSprite.setScale(state.player.facing === 'left' ? -1 : 1, 1);
    this.playerSprite.setAlpha(state.player.hiding ? 0.4 : 1);

    // Player color based on mode
    const modeColors: Record<string, number> = {
      idle: 0x44cc44,
      walk: 0x44cc44,
      run: 0x88ff44,
      sneak: 0x228822,
      jump: 0x66ee66,
      slide: 0x22aa22,
    };
    this.playerSprite.setFillStyle(modeColors[state.player.movementMode] ?? COLORS.player);

    // Monsters
    for (const monster of state.monsters) {
      const sprite = this.monsterSprites.get(monster.id);
      if (sprite) {
        sprite.setPosition(monster.position.x, monster.position.y);
        sprite.setVisible(monster.active);
        // Flash when in alert state
        if (monster.fsmState.includes('Alert') || monster.fsmState.includes('Lunge')) {
          sprite.setAlpha(0.6 + Math.sin(this.time.now * 0.01) * 0.4);
        } else {
          sprite.setAlpha(1);
        }
      }
    }

    // Doors
    for (const door of state.world.doors) {
      const sprite = this.doorSprites.get(door.id);
      if (sprite) {
        sprite.setFillStyle(door.isOpen ? COLORS.doorOpen : COLORS.door);
        sprite.setAlpha(door.isOpen ? 0.3 : 1);
      }
    }

    // Escape door indicator
    this.escapeDoorSprite.setFillStyle(
      state.night.escapeWindow === 'open' ? 0x00ff88 :
      state.night.escapeWindow === 'warning' ? 0xffaa00 :
      COLORS.escapeDoor,
    );
    if (state.night.escapeWindow === 'open') {
      this.escapeDoorSprite.setAlpha(0.6 + Math.sin(this.time.now * 0.005) * 0.4);
    } else {
      this.escapeDoorSprite.setAlpha(0.6);
    }

    // Camera
    const cam = this.cameras.main;
    cam.scrollX = state.player.position.x - cam.width / 2;
    cam.scrollY = state.player.position.y - cam.height / 2;
    // Clamp
    cam.scrollX = Math.max(0, Math.min(cam.scrollX, this.session.levelWidth - cam.width));
    cam.scrollY = Math.max(0, Math.min(cam.scrollY, this.session.levelHeight - cam.height));

    // HUD
    const escapeTimerS = state.night.escapeWindow === 'open'
      ? Math.max(0, state.clock.escapeWindowDurationS - (state.clock.elapsedS - state.clock.escapeWindowAtS))
      : 0;

    const hudData: HUDData = {
      night: state.night.number,
      throwables: state.inventory.throwables,
      dndSigns: state.inventory.dndSigns,
      selectedTool: state.player.selectedTool,
      lighterActive: state.player.lighterActive,
      lighterFuel: state.inventory.lighterFuel,
      lighterMaxFuel: INVENTORY.LIGHTER_CHARGE_S,
      escapeWindow: state.night.escapeWindow,
      escapeTimerS,
      breathActive: state.player.hiding !== null,
      breathRemaining: state.player.hiding?.breathRemaining ?? 0,
      breathTotal: 8,
    };
    this.hud.update(hudData);

    // Overlays
    this.catchOverlay.setVisible(false);
    this.catchText.setVisible(false);
    this.transitionOverlay.setVisible(false);
    this.transitionText.setVisible(false);
    this.endingText.setVisible(false);

    // Debug info
    this.debugText.setText(
      `Floor: ${this.getFloorName(state.player.position.y)} | ` +
      `Mode: ${state.player.movementMode} | ` +
      `Noise: ${state.player.noiseLevel.toFixed(2)} | ` +
      `Escape: ${state.night.escapeWindow} | ` +
      `Time: ${state.clock.elapsedS.toFixed(0)}s`,
    );
  }

  private renderCaught(state: { phase: 'caught'; night: number; caughtBy: string }): void {
    // Dark overlay
    this.catchOverlay.setVisible(true);
    this.catchText.setVisible(true);
    this.catchText.setText(getCatchMessage(state.caughtBy));
  }

  private renderEnding(): void {
    this.endingText.setVisible(true);
    this.endingText.setText('You escaped.\n\nI remember now.\n\n...I\'ve always been here.');
  }

  private isInteractJustPressed(): boolean {
    const current = this.inputHandler.read().interact;
    const justPressed = current && !this.prevInteract;
    this.prevInteract = current;
    return justPressed;
  }

  // --- Sprite creation ---

  private createFloors(): void {
    for (const [floorId, groundY] of Object.entries(FLOOR_GROUNDS)) {
      // Floor platform
      const platform = this.add.rectangle(
        LEVEL_WIDTH / 2, groundY + 16,
        LEVEL_WIDTH, 32,
        COLORS.floor,
      );
      platform.setDepth(0);
      this.floorSprites.push(platform);

      // Floor label
      const label = this.add.text(8, groundY - FLOOR_HEIGHT + 8, floorId.toUpperCase(), {
        fontSize: '14px',
        color: '#666666',
      });
      label.setDepth(1);
    }
  }

  private createLevelMarkers(levelConfig: ReturnType<typeof getGreyboxLevel>): void {
    // Stairs
    for (const stair of STAIR_POSITIONS) {
      const markerFrom = this.add.rectangle(stair.fromPosition.x, stair.fromPosition.y - 16, 24, 32, COLORS.stairMarker);
      markerFrom.setDepth(1);
      markerFrom.setAlpha(0.6);
      this.stairSprites.push(markerFrom);

      const markerTo = this.add.rectangle(stair.toPosition.x, stair.toPosition.y - 16, 24, 32, COLORS.stairMarker);
      markerTo.setDepth(1);
      markerTo.setAlpha(0.6);
      this.stairSprites.push(markerTo);

      // Label
      this.add.text(stair.fromPosition.x - 12, stair.fromPosition.y - 40, 'STAIRS', {
        fontSize: '8px', color: '#aaaaaa',
      }).setDepth(1);
    }

    // Elevator
    for (const stop of ELEVATOR_POSITIONS) {
      const marker = this.add.rectangle(stop.position.x, stop.position.y - 16, 24, 32, COLORS.elevatorMarker);
      marker.setDepth(1);
      marker.setAlpha(0.5);
      this.elevatorSprites.push(marker);

      this.add.text(stop.position.x - 12, stop.position.y - 40, 'ELEV', {
        fontSize: '8px', color: '#999999',
      }).setDepth(1);
    }

    // Laundry chute
    const chuteFrom = this.add.rectangle(
      LAUNDRY_CHUTE_POSITION.fromPosition.x,
      LAUNDRY_CHUTE_POSITION.fromPosition.y - 16,
      20, 24, COLORS.chuteMarker,
    );
    chuteFrom.setDepth(1);
    chuteFrom.setAlpha(0.6);
    this.add.text(
      LAUNDRY_CHUTE_POSITION.fromPosition.x - 16,
      LAUNDRY_CHUTE_POSITION.fromPosition.y - 40,
      'CHUTE', { fontSize: '8px', color: '#88aa88' },
    ).setDepth(1);
  }

  private createInteractables(): void {
    const levelConfig = getGreyboxLevel();

    // Doors
    for (const floor of levelConfig.floors) {
      for (const room of floor.rooms) {
        for (const door of room.doors) {
          if (this.doorSprites.has(door.id)) continue;
          const sprite = this.add.rectangle(
            door.position.x, door.position.y - 24,
            12, 48, COLORS.door,
          );
          sprite.setDepth(3);
          this.doorSprites.set(door.id, sprite);
        }
      }
    }

    // Hiding spots
    for (const floor of levelConfig.floors) {
      for (const room of floor.rooms) {
        for (const spot of room.hidingSpots) {
          const spotColors: Record<string, number> = {
            bed: 0x4466aa,
            closet: 0x4488cc,
            furniture: 0x448899,
            vent: 0x44aacc,
            freezer: 0x66ccff,
          };
          const sprite = this.add.rectangle(
            spot.position.x, spot.position.y - 16,
            28, 32, spotColors[spot.type] ?? COLORS.hidingSpot,
          );
          sprite.setDepth(1);
          sprite.setAlpha(0.7);
          this.hidingSpotSprites.set(spot.id, sprite);

          // Label
          this.add.text(spot.position.x - 16, spot.position.y - 40, spot.type.toUpperCase(), {
            fontSize: '7px', color: '#4488cc',
          }).setDepth(1);
        }
      }
    }

    // Phone
    this.phoneSprite = this.add.rectangle(
      PHONE_POSITION.x, PHONE_POSITION.y - 12,
      16, 24, COLORS.phone,
    );
    this.phoneSprite.setDepth(3);
    this.add.text(PHONE_POSITION.x - 12, PHONE_POSITION.y - 40, 'PHONE', {
      fontSize: '8px', color: '#cccc44',
    }).setDepth(3);

    // Escape door
    this.escapeDoorSprite = this.add.rectangle(
      ESCAPE_DOOR_POSITION.x, ESCAPE_DOOR_POSITION.y - 24,
      20, 48, COLORS.escapeDoor,
    );
    this.escapeDoorSprite.setDepth(3);
    this.escapeDoorSprite.setAlpha(0.6);
    this.add.text(ESCAPE_DOOR_POSITION.x - 16, ESCAPE_DOOR_POSITION.y - 52, 'EXIT', {
      fontSize: '10px', color: '#44ffaa',
    }).setDepth(3);
  }

  private createPlayer(): void {
    this.playerSprite = this.add.rectangle(
      PLAYER_SPAWN.x, PLAYER_SPAWN.y,
      24, 40, COLORS.player,
    );
    this.playerSprite.setDepth(10);
    this.playerSprite.setOrigin(0.5, 1);
  }

  private createMonsterPlaceholders(): void {
    // Pre-create sprites for all 3 monsters (shown/hidden based on night)
    const monsterDefs = [
      { id: 'bellhop', color: COLORS.bellhop, w: 28, h: 56 },
      { id: 'housekeeper', color: COLORS.housekeeper, w: 36, h: 44 },
      { id: 'guest', color: COLORS.guest, w: 24, h: 48 },
    ];

    for (const def of monsterDefs) {
      const sprite = this.add.rectangle(-100, -100, def.w, def.h, def.color);
      sprite.setDepth(10);
      sprite.setOrigin(0.5, 1);
      sprite.setVisible(false);
      this.monsterSprites.set(def.id, sprite);

      // Name tag (follows monster)
      const tag = this.add.text(-100, -100, def.id.toUpperCase(), {
        fontSize: '8px',
        color: `#${def.color.toString(16).padStart(6, '0')}`,
      });
      tag.setDepth(11);
      tag.setOrigin(0.5, 1);
      tag.setName(`tag-${def.id}`);
    }
  }

  private createOverlays(): void {
    const cam = this.cameras.main;

    // Monologue
    this.monologueText = this.add.text(cam.width / 2, cam.height - 120, '', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
      backgroundColor: '#00000088',
      padding: { x: 12, y: 6 },
    });
    this.monologueText.setOrigin(0.5);
    this.monologueText.setScrollFactor(0);
    this.monologueText.setDepth(210);
    this.monologueText.setVisible(false);

    // Phone dialogue
    this.dialogueText = this.add.text(cam.width / 2, cam.height / 2 - 60, '', {
      fontSize: '18px', color: '#cccc44',
      backgroundColor: '#00000088',
      padding: { x: 16, y: 8 },
    });
    this.dialogueText.setOrigin(0.5);
    this.dialogueText.setScrollFactor(0);
    this.dialogueText.setDepth(210);
    this.dialogueText.setVisible(false);

    // Catch overlay
    this.catchOverlay = this.add.rectangle(
      cam.width / 2, cam.height / 2,
      cam.width, cam.height,
      0x000000, 0.7,
    );
    this.catchOverlay.setScrollFactor(0);
    this.catchOverlay.setDepth(300);
    this.catchOverlay.setVisible(false);

    this.catchText = this.add.text(cam.width / 2, cam.height / 2, '', {
      fontSize: '28px', color: '#cc4444',
      fontStyle: 'bold',
    });
    this.catchText.setOrigin(0.5);
    this.catchText.setScrollFactor(0);
    this.catchText.setDepth(310);
    this.catchText.setVisible(false);

    // Night transition overlay
    this.transitionOverlay = this.add.rectangle(
      cam.width / 2, cam.height / 2,
      cam.width, cam.height,
      0x000000, 1,
    );
    this.transitionOverlay.setScrollFactor(0);
    this.transitionOverlay.setDepth(300);
    this.transitionOverlay.setVisible(false);

    this.transitionText = this.add.text(cam.width / 2, cam.height / 2, '', {
      fontSize: '32px', color: '#e0e0e0',
    });
    this.transitionText.setOrigin(0.5);
    this.transitionText.setScrollFactor(0);
    this.transitionText.setDepth(310);
    this.transitionText.setVisible(false);

    // Ending text
    this.endingText = this.add.text(cam.width / 2, cam.height / 2, '', {
      fontSize: '24px', color: '#e0e0e0',
      align: 'center',
      lineSpacing: 16,
    });
    this.endingText.setOrigin(0.5);
    this.endingText.setScrollFactor(0);
    this.endingText.setDepth(310);
    this.endingText.setVisible(false);

    // Wire event-driven overlays
    this.session.emitter.on('MONOLOGUE_SHOW', (text: string) => {
      this.monologueText.setText(text);
      this.monologueText.setVisible(true);
    });
    this.session.emitter.on('MONOLOGUE_HIDE', () => {
      this.monologueText.setVisible(false);
    });
    this.session.emitter.on('PHONE_LINE_SHOWN', (line: string, _index: number) => {
      this.dialogueText.setText(line);
      this.dialogueText.setVisible(true);
    });
    this.session.emitter.on('PHONE_DIALOGUE_COMPLETE', () => {
      this.dialogueText.setVisible(false);
    });
    this.session.emitter.on('NIGHT_TRANSITION_START', (_from: number, to: number) => {
      this.transitionOverlay.setVisible(true);
      this.transitionText.setVisible(true);
      this.transitionText.setText(`Night ${to}`);
    });
    this.session.emitter.on('NIGHT_TRANSITION_END', () => {
      this.transitionOverlay.setVisible(false);
      this.transitionText.setVisible(false);
    });
    this.session.emitter.on('ESCAPE_WINDOW_WARNING', () => {
      // Monologue handles the "I heard the lock clicking..." via triggers
    });
  }

  private getFloorName(y: number): string {
    let closest = 'unknown';
    let minDist = Infinity;
    for (const [name, groundY] of Object.entries(FLOOR_GROUNDS)) {
      const dist = Math.abs(y - groundY);
      if (dist < minDist) {
        minDist = dist;
        closest = name;
      }
    }
    return closest;
  }

  shutdown(): void {
    this.inputHandler.detach(window);
    this.hud.destroy();
  }
}
