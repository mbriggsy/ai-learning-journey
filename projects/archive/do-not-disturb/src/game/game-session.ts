import type { PlayerInput } from './player';
import type { GameState, PlayingState, CaughtState, EndingState, MonsterState, Position, ZoneId, MovementMode, ToolType } from '../types/state';
import type { LevelConfig } from '../types/level';
import type { NightConfig } from './night-config';
import type { ManagedMonster } from './ai/monster-manager';
import type { BellhopContext } from './ai/bellhop-context';
import type { HousekeeperContext } from './ai/housekeeper-context';
import type { GuestContext } from './ai/guest-context';
import type { NoiseSystem, NoiseZone } from './noise';
import type { GameEventMap, DoorEvent, MonsterAlertEvent } from '../types/events';

import { createEmitter } from './events';
import { loadLevel } from './level-loader';
import { createNoiseSystem } from './noise';
import { createDoorSystem } from './doors';
import type { DoorSystem } from './doors';
import { createElevator } from './elevator';
import { createPhoneSystem } from './phone';
import { createPhoneDialogue } from './phone-dialogue';
import { createBreathSystem } from './breath';
import { createLighter } from './tools/lighter';
import { createNightManager } from './night-manager';
import { createClock } from './clock';
import { createCatchSequence, getCatchMessage } from './catch-sequence';
import { createNightTransition } from './night-transition';
import { createEndingSequence } from './ending';
import { createMonologueSystem, MONOLOGUE_TRIGGERS } from './monologue';
import { createCameraState, computeCameraTarget, updateCameraState, startHorrorHold } from './camera';
import { createSquashStretch, updateSquashStretch, triggerLandSquash } from './animation';
import { resolveMovementMode, computeVelocity } from './player';
import { computeNoise, computeLandingNoise } from './player-noise';
import { updateMonsters } from './ai/monster-manager';
import { checkCatch } from './catch';
import { selectTool, canUseTool } from './tools/tool-selection';
import { throwItem } from './tools/throwables';
import { placeDndSign } from './tools/dnd-signs';
import { createFSM } from './fsm';
import { createBellhopContext } from './ai/bellhop-context';
import { createBellhopHearing } from './ai/bellhop-hearing';
import { PatrolState as BellhopPatrol } from './ai/bellhop-states';
import { createHousekeeperContext } from './ai/housekeeper-context';
import { HousekeeperPatrolState } from './ai/housekeeper-states';
import { createGuestContext } from './ai/guest-context';
import { AmbushState as GuestAmbush } from './ai/guest-states';
import { getNightConfig } from './night-config';
import { shuffleLevel } from './level-shuffle';
import { updateHighestNight } from './save';
import { ESCAPE, MOVEMENT, MONSTER, NOISE, WORLD, INVENTORY } from '../constants';
import {
  PLAYER_SPAWN, PHONE_POSITION, PHONE_ZONE_ID, ESCAPE_DOOR_POSITION,
  FLOOR_GROUNDS, STAIR_POSITIONS, LAUNDRY_CHUTE_POSITION, ELEVATOR_POSITIONS,
  LEVEL_WIDTH, FLOOR_HEIGHT,
} from './greybox-level';

// --- Types ---

export type GameSession = {
  startNight(night: number): void;
  fixedUpdate(dt: number, input: PlayerInput, toolKey: number | null, interactPressed: boolean): void;
  getState(): GameState;
  readonly emitter: ReturnType<typeof createEmitter<GameEventMap>>;
  readonly levelWidth: number;
  readonly levelHeight: number;
};

// --- Player zone lookup ---

function getPlayerFloor(y: number): string {
  // Find which floor band the player is in based on Y position
  const entries = Object.entries(FLOOR_GROUNDS);
  let closest = 'lobby';
  let minDist = Infinity;
  for (const [floorId, groundY] of entries) {
    const dist = Math.abs(y - groundY);
    if (dist < minDist) {
      minDist = dist;
      closest = floorId;
    }
  }
  return closest;
}

function getPlayerZone(x: number, floorId: string): ZoneId {
  const roomIndex = Math.min(3, Math.max(0, Math.floor(x / 480)));
  const roomLetters = ['a', 'b', 'c', 'd'] as const;
  return `${floorId}-${roomLetters[roomIndex]}`;
}

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const INTERACTION_RANGE = 48;
const DOOR_HALF_WIDTH = 12;

/** Clamp an entity's X so it can't cross a closed door on the same floor. Mutates pos and vel. */
function enforceClosedDoors(
  prevX: number,
  pos: { x: number },
  vel: { x: number },
  floor: string,
  doors: readonly { id: string; position: Position }[],
  doorSystem: DoorSystem,
): void {
  for (const door of doors) {
    if (doorSystem.isOpen(door.id)) continue;
    if (getPlayerFloor(door.position.y) !== floor) continue;
    const dx = door.position.x;
    if (prevX <= dx - DOOR_HALF_WIDTH && pos.x > dx - DOOR_HALF_WIDTH) {
      pos.x = dx - DOOR_HALF_WIDTH;
      vel.x = 0;
    }
    if (prevX >= dx + DOOR_HALF_WIDTH && pos.x < dx + DOOR_HALF_WIDTH) {
      pos.x = dx + DOOR_HALF_WIDTH;
      vel.x = 0;
    }
  }
}

// --- Session factory ---

export function createGameSession(levelConfig: LevelConfig, storage: Storage): GameSession {
  const emitter = createEmitter<GameEventMap>();

  // Mutable player state
  let playerPos = { ...PLAYER_SPAWN };
  let playerVel = { x: 0, y: 0 };
  let playerFacing: 'left' | 'right' = 'right';
  let playerMode: MovementMode = 'idle';
  let playerHiding: { spotId: string; spotType: string; breathRemaining: number; breathRhythmWindow: boolean } | null = null;
  let playerNoise = 0;
  let selectedTool: ToolType | null = null;
  let lighterActive = false;
  let slideTimer = 0;
  let onGround = true;
  let wasInAir = false;
  let playerFloor = 'lobby';
  let playerZone: ZoneId = 'lobby-a';

  // Mutable inventory
  let throwables = 0;
  let dndSigns = 0;
  let lighterFuel = 0;
  let lighterCharges = 0;

  // First sightings tracking (for monologue)
  const firstSightings = new Set<string>();

  // Systems
  let loaded = loadLevel(levelConfig);
  let noiseSystem: NoiseSystem = createNoiseSystem(loaded.noiseZones);
  const doorSystem = createDoorSystem(emitter);
  const elevator = createElevator(emitter, levelConfig.elevator);
  const phone = createPhoneSystem(emitter, { position: PHONE_POSITION, zoneId: PHONE_ZONE_ID });
  const phoneDialogue = createPhoneDialogue(emitter);
  const breath = createBreathSystem(emitter);
  const lighter = createLighter(emitter);
  const nightManager = createNightManager(emitter);
  let clock = createClock(emitter, {
    firstWindowAtS: ESCAPE.FIRST_WINDOW_AT_S,
    repeatIntervalS: ESCAPE.REPEAT_INTERVAL_S,
    warningBeforeS: ESCAPE.WARNING_BEFORE_S,
    windowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_1_S,
  });
  const catchSequence = createCatchSequence();
  const nightTransition = createNightTransition();
  const endingSequence = createEndingSequence();
  const monologue = createMonologueSystem(MONOLOGUE_TRIGGERS, emitter);
  const cameraState = createCameraState();
  const squashStretch = createSquashStretch();

  // Monsters
  let managedMonsters: ManagedMonster[] = [];
  let bellhopCtx: BellhopContext | null = null;
  let housekeeperCtx: HousekeeperContext | null = null;
  let guestCtx: GuestContext | null = null;
  let bellhopHearing: { detach(): void } | null = null;

  // Bellhop multi-floor patrol state
  const PATROL_FLOORS = ['attic', 'floor3', 'floor2', 'lobby', 'basement'] as const;
  let bellhopPatrolFloorIdx = 1; // starts on floor3
  let bellhopPatrolPhase: 'sweep-right' | 'sweep-left' | 'changing-floor' = 'sweep-right';
  let bellhopPatrolDescending = true; // going down first
  let bellhopFloorChangeTimer = 0;
  let bellhopArrivesFromElevator = false; // true = arrived on right side via elevator

  // Night state
  let currentNightConfig: NightConfig = getNightConfig(1);
  let gamePhase: 'menu' | 'playing' | 'caught' | 'ending' = 'menu';
  let startingTimer = 0;

  // --- Door zone mapping (for door system init) ---
  function buildDoorZoneMapping(): ReadonlyMap<string, readonly [ZoneId, ZoneId]> {
    const mapping = new Map<string, readonly [ZoneId, ZoneId]>();
    for (const floor of levelConfig.floors) {
      for (const room of floor.rooms) {
        for (const door of room.doors) {
          if (!mapping.has(door.id)) {
            mapping.set(door.id, [room.id, door.connectsTo]);
          }
        }
      }
    }
    return mapping;
  }

  // Init doors from level
  function initDoors(config: LevelConfig): void {
    const zoneMapping = buildDoorZoneMapping();
    for (const floor of config.floors) {
      for (const room of floor.rooms) {
        doorSystem.init(room.doors, room.id, zoneMapping);
      }
    }
  }

  // --- Monster creation ---

  function createMonsters(config: NightConfig): void {
    // Clean up previous
    bellhopHearing?.detach();
    bellhopHearing = null;
    bellhopCtx = null;
    housekeeperCtx = null;
    guestCtx = null;
    managedMonsters = [];

    for (const monsterId of config.monsters) {
      if (monsterId === 'bellhop') {
        const startPos = { x: LEVEL_WIDTH - 200, y: FLOOR_GROUNDS['floor3']! };
        bellhopCtx = createBellhopContext(startPos, 'floor3-d', emitter);
        const fsm = createFSM(BellhopPatrol, bellhopCtx);
        bellhopCtx.fsm = fsm;
        bellhopHearing = createBellhopHearing(bellhopCtx, noiseSystem);

        // Init multi-floor patrol — start on floor3, sweep right first
        bellhopPatrolFloorIdx = 1;
        bellhopPatrolPhase = 'sweep-right';
        bellhopPatrolDescending = true;
        bellhopFloorChangeTimer = 0;

        managedMonsters.push({ id: 'bellhop', active: true, fsm });
      }

      if (monsterId === 'housekeeper') {
        const startPos = { x: 200, y: FLOOR_GROUNDS['attic']! };
        const floorOrder = ['attic', 'floor3', 'floor2', 'lobby', 'basement'];
        const atticRooms = levelConfig.floors.find(f => f.id === 'attic')?.rooms ?? [];
        housekeeperCtx = createHousekeeperContext(
          startPos, 'attic', atticRooms, floorOrder, emitter, doorSystem,
        );
        const fsm = createFSM(HousekeeperPatrolState, housekeeperCtx);
        housekeeperCtx.fsm = fsm;
        managedMonsters.push({ id: 'housekeeper', active: true, fsm });
      }

      if (monsterId === 'guest') {
        const spots = config.guestAmbushSpots;
        const startPos = spots[0] ?? { x: 640, y: FLOOR_GROUNDS['floor3']! };
        guestCtx = createGuestContext(startPos, spots, emitter);
        const fsm = createFSM(GuestAmbush, guestCtx);
        guestCtx.fsm = fsm;
        managedMonsters.push({ id: 'guest', active: true, fsm });
      }
    }
  }

  // --- Reset for a night ---

  function resetForNight(nightNum: number): void {
    currentNightConfig = getNightConfig(nightNum);

    // Reload level (shuffled for night 5)
    const effectiveConfig = currentNightConfig.levelVariant === 'shuffled'
      ? shuffleLevel(levelConfig, nightNum * 12345)
      : levelConfig;
    loaded = loadLevel(effectiveConfig);
    noiseSystem = createNoiseSystem(loaded.noiseZones);
    initDoors(effectiveConfig);

    // Reset player
    playerPos = { ...PLAYER_SPAWN };
    playerVel = { x: 0, y: 0 };
    playerFacing = 'right';
    playerMode = 'idle';
    playerHiding = null;
    playerNoise = 0;
    selectedTool = null;
    lighterActive = false;
    slideTimer = 0;
    onGround = true;
    wasInAir = false;
    playerFloor = 'lobby';
    playerZone = 'lobby-a';

    // Reset inventory from night config
    throwables = currentNightConfig.itemSpawns.throwables;
    dndSigns = currentNightConfig.itemSpawns.dndSigns;
    lighterCharges = currentNightConfig.itemSpawns.lighterCharges;
    lighterFuel = lighterCharges > 0 ? INVENTORY.LIGHTER_CHARGE_S : 0;
    if (lighterCharges > 0) lighterCharges--; // first charge loaded

    // Reset systems
    clock = createClock(emitter, {
      firstWindowAtS: ESCAPE.FIRST_WINDOW_AT_S,
      repeatIntervalS: ESCAPE.REPEAT_INTERVAL_S,
      warningBeforeS: ESCAPE.WARNING_BEFORE_S,
      windowDurationS: currentNightConfig.escapeWindowDurationS,
    });
    doorSystem.clearSigns();
    lighter.extinguish();
    breath.stopHolding();
    firstSightings.clear();

    // Create monsters
    createMonsters(currentNightConfig);

    // Start phone ringing
    phone.startRinging();
    startingTimer = 0.5; // brief pause before gameplay
    gamePhase = 'playing';
  }

  // --- Event wiring ---

  emitter.on('DOOR_TOGGLED', (event: DoorEvent) => {
    const attenuation = event.isOpen ? NOISE.ADJACENT_ROOM_OPEN_DOOR : NOISE.ADJACENT_ROOM_CLOSED_DOOR;
    const door = loaded.world.doors.find(d => d.id === event.doorId);
    if (door) {
      noiseSystem.updateConnection(door.connectsZones[0], door.connectsZones[1], attenuation);
    }
  });

  emitter.on('MONSTER_ALERT', (event: MonsterAlertEvent) => {
    startHorrorHold(cameraState, event.position);
  });

  emitter.on('MONSTER_SPOTTED', (pos: Position, _monsterId: string) => {
    startHorrorHold(cameraState, pos);
  });

  emitter.on('MONSTER_CATCH', (monsterId: string) => {
    nightManager.onCatch(monsterId);
    catchSequence.start(monsterId);
    gamePhase = 'caught';
    lighter.extinguish();
    breath.stopHolding();
    playerHiding = null;
  });

  emitter.on('NIGHT_END', (night: number, survived: boolean) => {
    if (survived) {
      updateHighestNight(storage, night);
    }
  });

  emitter.on('GAME_COMPLETE', () => {
    endingSequence.start();
    gamePhase = 'ending';
  });

  emitter.on('NIGHT_TRANSITION_END', (night: number) => {
    resetForNight(night);
  });

  emitter.on('CATCH_SEQUENCE_END', () => {
    // Night manager handles restart — resetForNight called via NIGHT_START
  });

  emitter.on('NIGHT_START', (night: number) => {
    if (gamePhase === 'caught') {
      resetForNight(night);
    }
  });

  // --- Interaction helpers ---

  function findNearbyDoor(): string | null {
    for (const door of loaded.world.doors) {
      if (distance(playerPos, door.position) < INTERACTION_RANGE) {
        return door.id;
      }
    }
    return null;
  }

  function findNearbyHidingSpot(): { id: string; type: string } | null {
    for (const spot of loaded.world.hidingSpots) {
      if (distance(playerPos, spot.position) < INTERACTION_RANGE) {
        return { id: spot.id, type: spot.type };
      }
    }
    return null;
  }

  function isNearPhone(): boolean {
    return distance(playerPos, PHONE_POSITION) < INTERACTION_RANGE;
  }

  function isNearEscapeDoor(): boolean {
    return distance(playerPos, ESCAPE_DOOR_POSITION) < INTERACTION_RANGE;
  }

  function findNearbyStairs(direction: 'up' | 'down'): { targetFloor: string; targetPos: Position } | null {
    for (const stair of STAIR_POSITIONS) {
      const checkPos = direction === 'down' ? stair.fromPosition : stair.toPosition;
      const targetPos = direction === 'down' ? stair.toPosition : stair.fromPosition;
      const targetFloor = direction === 'down' ? stair.toFloor : stair.fromFloor;

      if (distance(playerPos, checkPos) < INTERACTION_RANGE && getPlayerFloor(playerPos.y) === (direction === 'down' ? stair.fromFloor : stair.toFloor)) {
        return { targetFloor, targetPos };
      }
    }
    return null;
  }

  function findNearbyLaundryChute(): { targetFloor: string; targetPos: Position } | null {
    if (distance(playerPos, LAUNDRY_CHUTE_POSITION.fromPosition) < INTERACTION_RANGE
        && getPlayerFloor(playerPos.y) === LAUNDRY_CHUTE_POSITION.fromFloor) {
      return {
        targetFloor: LAUNDRY_CHUTE_POSITION.toFloor,
        targetPos: LAUNDRY_CHUTE_POSITION.toPosition,
      };
    }
    return null;
  }

  function findNearbyElevator(): string | null {
    for (const stop of ELEVATOR_POSITIONS) {
      if (distance(playerPos, stop.position) < INTERACTION_RANGE
          && getPlayerFloor(playerPos.y) === stop.floor) {
        return stop.floor;
      }
    }
    return null;
  }

  function zoneAtPosition(pos: Position): ZoneId {
    const floor = getPlayerFloor(pos.y);
    return getPlayerZone(pos.x, floor);
  }

  // --- Main fixed update ---

  function fixedUpdate(
    dt: number,
    input: PlayerInput,
    toolKey: number | null,
    interactPressed: boolean,
  ): void {
    // Night manager always updates (handles caught timer, transition timer)
    nightManager.update(dt);

    // Caught phase
    if (gamePhase === 'caught') {
      catchSequence.update(dt);
      if (catchSequence.isDone) {
        // Night manager already handles restart via CATCH_SEQUENCE_END → NIGHT_START
      }
      return;
    }

    // Ending phase
    if (gamePhase === 'ending') {
      endingSequence.update(dt);
      return;
    }

    // Transition phase
    if (nightManager.state.phase === 'transitioning') {
      nightTransition.update(dt);
      return;
    }

    // Starting phase — brief pause
    if (startingTimer > 0) {
      startingTimer -= dt;
      return;
    }

    // --- GAMEPLAY ---

    // Update floor/zone
    playerFloor = getPlayerFloor(playerPos.y);
    playerZone = getPlayerZone(playerPos.x, playerFloor);

    // Tool selection
    if (toolKey !== null) {
      selectedTool = selectTool(toolKey, selectedTool);
    }

    // Interactions (E key)
    if (interactPressed && !playerHiding) {
      // Priority: phone > escape door > stairs > elevator > laundry chute > hiding spot > door > tool use
      if (isNearPhone() && phone.isRinging) {
        phone.answer();
        phoneDialogue.start(currentNightConfig.phoneContent, nightManager.state.retryCount > 0);
      } else if (isNearEscapeDoor() && clock.windowState === 'open') {
        nightManager.onEscape();
        if (nightManager.state.phase !== 'ending') {
          nightTransition.start(nightManager.state.currentNight - 1, nightManager.state.currentNight);
        }
        return;
      } else {
        // Check stairs (up/down based on input direction or default up)
        const stairsUp = findNearbyStairs('up');
        const stairsDown = findNearbyStairs('down');
        const chute = findNearbyLaundryChute();
        const elevatorFloor = findNearbyElevator();

        if (input.jump && stairsUp) {
          // Jump near stairs = go up
          playerPos = { ...stairsUp.targetPos };
          playerFloor = stairsUp.targetFloor;
          playerVel = { x: 0, y: 0 };
          playerMode = 'idle';
        } else if (input.slide && stairsDown) {
          // Down near stairs = go down
          playerPos = { ...stairsDown.targetPos };
          playerFloor = stairsDown.targetFloor;
          playerVel = { x: 0, y: 0 };
          playerMode = 'idle';
        } else if (chute) {
          playerPos = { ...chute.targetPos };
          playerFloor = chute.targetFloor;
          playerVel = { x: 0, y: 0 };
          emitter.emit('NOISE_EMITTED', { sourceZoneId: playerZone, level: NOISE.SLIDE_LEVEL, position: playerPos });
        } else if (elevatorFloor) {
          if (elevator.currentFloor === elevatorFloor && !elevator.isMoving) {
            // Elevator is here — ride it
            const direction = input.jump ? 'up' : input.slide ? 'down' : null;
            if (direction) {
              const destFloor = elevator.ride(direction);
              if (destFloor) {
                const destStop = ELEVATOR_POSITIONS.find(s => s.floor === destFloor);
                if (destStop) {
                  playerPos = { ...destStop.position };
                  playerFloor = destFloor;
                  playerVel = { x: 0, y: 0 };
                  playerMode = 'idle';
                }
              }
            }
          } else {
            // Elevator not here — call it
            elevator.call(elevatorFloor);
          }
        } else {
          // Hiding spot
          const spot = findNearbyHidingSpot();
          if (spot) {
            playerHiding = { spotId: spot.id, spotType: spot.type, breathRemaining: 8, breathRhythmWindow: false };
            emitter.emit('HIDING_ENTERED', spot.id);
            breath.startHolding(playerZone, playerPos);
          } else {
            // Door
            const doorId = findNearbyDoor();
            if (doorId) {
              doorSystem.toggle(doorId);
            } else if (selectedTool && canUseTool(playerMode)) {
              // Use selected tool
              if (selectedTool === 'throwable') {
                const dir = playerFacing === 'right' ? 1 : -1;
                const result = throwItem(playerPos, dir, emitter, throwables, zoneAtPosition);
                if (result.used) throwables--;
              } else if (selectedTool === 'dndSign') {
                const nearDoor = findNearbyDoor();
                if (nearDoor) {
                  const result = placeDndSign(nearDoor, dndSigns, doorSystem, emitter);
                  if (result.used) dndSigns--;
                }
              } else if (selectedTool === 'lighter') {
                const inv = { lighterFuel, lighterCharges };
                lighter.ignite(inv, playerPos, playerZone);
                lighterFuel = inv.lighterFuel;
                lighterCharges = inv.lighterCharges;
                lighterActive = lighter.isActive;
              }
            }
          }
        }
      }
    }

    // Exit hiding (E while hiding)
    else if (interactPressed && playerHiding) {
      emitter.emit('HIDING_EXITED', playerHiding.spotId);
      playerHiding = null;
      breath.stopHolding();
    }

    // Rhythm tap (Space while hiding)
    if (playerHiding && input.jump) {
      breath.rhythmTap();
    }

    // --- Movement ---
    if (!playerHiding) {
      const prevPlayerX = playerPos.x;
      const prevMode = playerMode;
      playerMode = resolveMovementMode(input, onGround, playerMode, slideTimer);

      // Track slide timer
      if (playerMode === 'slide') {
        slideTimer += dt;
      } else {
        slideTimer = 0;
      }

      // Facing direction
      if (input.direction !== 0) {
        playerFacing = input.direction > 0 ? 'right' : 'left';
      }

      // Velocity
      const vel = computeVelocity(playerMode, input.direction);
      playerVel.x = vel.x;

      // Gravity and jump
      if (playerMode === 'jump' && onGround && prevMode !== 'jump') {
        playerVel.y = MOVEMENT.JUMP_VELOCITY;
        onGround = false;
      }

      if (!onGround) {
        playerVel.y += MOVEMENT.GRAVITY * dt;
      }

      // Apply velocity
      playerPos.x += playerVel.x * dt;
      playerPos.y += playerVel.y * dt;

      // Floor collision
      const floorGroundY = FLOOR_GROUNDS[playerFloor];
      if (floorGroundY !== undefined && playerPos.y >= floorGroundY) {
        wasInAir = !onGround;
        playerPos.y = floorGroundY;
        playerVel.y = 0;
        onGround = true;

        // Landing squash
        if (wasInAir) {
          triggerLandSquash(squashStretch);
          const landingNoise = computeLandingNoise(
            loaded.world.zones.get(playerZone)?.surfaceType ?? 'wood',
          );
          emitter.emit('NOISE_EMITTED', { sourceZoneId: playerZone, level: landingNoise, position: playerPos });
        }
      }

      // Door collision — closed doors block movement
      enforceClosedDoors(prevPlayerX, playerPos, playerVel, playerFloor, loaded.world.doors, doorSystem);

      // Level bounds
      playerPos.x = Math.max(16, Math.min(LEVEL_WIDTH - 16, playerPos.x));

      // Player noise
      const surface = loaded.world.zones.get(playerZone)?.surfaceType ?? 'wood';
      playerNoise = computeNoise(playerMode, surface);
      if (playerNoise > 0) {
        emitter.emit('NOISE_EMITTED', { sourceZoneId: playerZone, level: playerNoise, position: playerPos });
      }
    } else {
      playerVel = { x: 0, y: 0 };
      playerNoise = 0;
    }

    // --- System updates ---

    // Lighter fuel drain
    if (lighterActive) {
      const inv = { lighterFuel, lighterCharges };
      lighter.update(dt, inv);
      lighterFuel = inv.lighterFuel;
      lighterCharges = inv.lighterCharges;
      lighterActive = lighter.isActive;
    }

    // Breath
    breath.update(dt);
    if (playerHiding) {
      playerHiding = { ...playerHiding, breathRemaining: breath.remaining, breathRhythmWindow: breath.isRhythmWindow };
    }

    // Phone
    phone.update(dt);
    phoneDialogue.update(dt);

    // Elevator
    elevator.update(dt);

    // Clock / escape windows
    clock.update(dt);

    // Squash/stretch animation
    updateSquashStretch(squashStretch, dt);

    // --- Monster updates ---

    // Update guest player position
    if (guestCtx) {
      guestCtx.playerPosition = { ...playerPos };
    }

    // Housekeeper lighter detection
    if (housekeeperCtx) {
      if (lighterActive) {
        // Check if player is on same floor or adjacent floor
        const hkFloor = housekeeperCtx.currentFloor;
        if (playerFloor === hkFloor) {
          housekeeperCtx.spottedPlayerPos = { ...playerPos };
        } else {
          housekeeperCtx.spottedPlayerPos = null;
        }
      } else {
        housekeeperCtx.spottedPlayerPos = null;
      }
    }

    // Bellhop movement — multi-floor patrol
    if (bellhopCtx) {
      const speed = nightManager.getMonsterSpeed(MONSTER.BELLHOP_SPEED);
      const patrolSpeed = speed * 0.5; // patrol is slower than chase
      const currentState = bellhopCtx.fsm.currentState;
      const prevBellhopX = bellhopCtx.position.x;
      const bellhopVel = { x: 0 };
      const STAIR_X = 96;

      if (currentState === BellhopPatrol) {
        // Multi-floor patrol pattern:
        // Sweep right across floor → take ELEVATOR down → arrive on next floor from right side
        // Sweep left across floor → take STAIRS down → arrive on next floor from left side
        // Alternates approach direction every floor. Unpredictable.
        const ELEV_X = ELEVATOR_POSITIONS[0]?.position.x ?? 1800;

        if (bellhopPatrolPhase === 'sweep-right') {
          bellhopCtx.position = {
            x: bellhopCtx.position.x + patrolSpeed * dt,
            y: bellhopCtx.position.y,
          };
          bellhopVel.x = patrolSpeed;
          if (bellhopCtx.position.x >= ELEV_X - 16) {
            // Reached elevator — ride it to next floor
            bellhopCtx.position = { x: ELEV_X, y: bellhopCtx.position.y };
            bellhopPatrolPhase = 'changing-floor';
            bellhopFloorChangeTimer = 1.0; // elevator travel time
            bellhopArrivesFromElevator = true;
            // Fire the DING — player hears him coming
            elevator.call(PATROL_FLOORS[bellhopPatrolFloorIdx]!);
          }
        } else if (bellhopPatrolPhase === 'sweep-left') {
          bellhopCtx.position = {
            x: bellhopCtx.position.x - patrolSpeed * dt,
            y: bellhopCtx.position.y,
          };
          bellhopVel.x = -patrolSpeed;
          if (bellhopCtx.position.x <= STAIR_X + 16) {
            // Reached stairs — take them to next floor
            bellhopCtx.position = { x: STAIR_X, y: bellhopCtx.position.y };
            bellhopPatrolPhase = 'changing-floor';
            bellhopFloorChangeTimer = 0.5; // stairs are faster
            bellhopArrivesFromElevator = false;
          }
        } else if (bellhopPatrolPhase === 'changing-floor') {
          bellhopFloorChangeTimer -= dt;
          if (bellhopFloorChangeTimer <= 0) {
            // Advance to next floor
            if (bellhopPatrolDescending) {
              bellhopPatrolFloorIdx++;
              if (bellhopPatrolFloorIdx >= PATROL_FLOORS.length) {
                bellhopPatrolFloorIdx = PATROL_FLOORS.length - 2;
                bellhopPatrolDescending = false;
              }
            } else {
              bellhopPatrolFloorIdx--;
              if (bellhopPatrolFloorIdx < 0) {
                bellhopPatrolFloorIdx = 1;
                bellhopPatrolDescending = true;
              }
            }
            const nextFloor = PATROL_FLOORS[bellhopPatrolFloorIdx]!;
            const nextGroundY = FLOOR_GROUNDS[nextFloor];
            if (nextGroundY !== undefined) {
              if (bellhopArrivesFromElevator) {
                // Arrive from elevator (right side), sweep left
                bellhopCtx.position = { x: ELEV_X, y: nextGroundY };
                bellhopPatrolPhase = 'sweep-left';
              } else {
                // Arrive from stairs (left side), sweep right
                bellhopCtx.position = { x: STAIR_X, y: nextGroundY };
                bellhopPatrolPhase = 'sweep-right';
              }
            }
          }
        }
      } else if (bellhopCtx.heardNoise) {
        // Chase: move toward noise source at full speed
        const target = bellhopCtx.heardNoise.position;
        const dx = target.x - bellhopCtx.position.x;
        const dir = dx > 0 ? 1 : -1;
        bellhopCtx.position = {
          x: bellhopCtx.position.x + dir * speed * dt,
          y: bellhopCtx.position.y,
        };
        bellhopVel.x = dir * speed;
        if (Math.abs(dx) < 32) {
          bellhopCtx.reachedTarget = true;
        }
      }

      // Bellhop opens closed doors he walks into (brief pause, makes noise)
      const bellhopFloor = getPlayerFloor(bellhopCtx.position.y);
      for (const door of loaded.world.doors) {
        if (doorSystem.isOpen(door.id)) continue;
        if (getPlayerFloor(door.position.y) !== bellhopFloor) continue;
        const crossed = (prevBellhopX <= door.position.x && bellhopCtx.position.x > door.position.x)
          || (prevBellhopX >= door.position.x && bellhopCtx.position.x < door.position.x);
        if (crossed) {
          doorSystem.toggle(door.id); // opens door + emits noise
        }
      }

      // Update bellhop zone
      bellhopCtx.currentZone = getPlayerZone(bellhopCtx.position.x, bellhopFloor);
    }

    // Housekeeper movement (simplified for greybox)
    // Housekeeper OPENS doors she encounters (she checks every room)
    if (housekeeperCtx) {
      const speed = nightManager.getMonsterSpeed(MONSTER.HOUSEKEEPER_SPEED);
      const prevHkX = housekeeperCtx.position.x;

      if (housekeeperCtx.targetRoom && !housekeeperCtx.reachedTarget) {
        const targetX = housekeeperCtx.targetRoom.bounds.x + housekeeperCtx.targetRoom.bounds.width / 2;
        const dx = targetX - housekeeperCtx.position.x;
        const dir = dx > 0 ? 1 : -1;
        housekeeperCtx.position = {
          x: housekeeperCtx.position.x + dir * speed * dt,
          y: housekeeperCtx.position.y,
        };
        if (Math.abs(dx) < 32) {
          housekeeperCtx.reachedTarget = true;
        }
      }

      // Floor change: move to stairs
      if (housekeeperCtx.targetFloor !== housekeeperCtx.currentFloor && !housekeeperCtx.reachedStairs) {
        const stairX = 96; // STAIR_X
        const dx = stairX - housekeeperCtx.position.x;
        const dir = dx > 0 ? 1 : -1;
        housekeeperCtx.position = {
          x: housekeeperCtx.position.x + dir * speed * dt,
          y: housekeeperCtx.position.y,
        };
        if (Math.abs(dx) < 32) {
          housekeeperCtx.reachedStairs = true;
          // Teleport to new floor
          const newGroundY = FLOOR_GROUNDS[housekeeperCtx.targetFloor];
          if (newGroundY !== undefined) {
            housekeeperCtx.position = { x: stairX, y: newGroundY };
          }
          // Update room list for new floor
          const floorConfig = levelConfig.floors.find(f => f.id === housekeeperCtx!.targetFloor);
          if (floorConfig) {
            housekeeperCtx.floorRooms = floorConfig.rooms;
          }
        }
      }

      // Housekeeper opens closed doors she walks into (unless DND sign)
      const hkFloor = getPlayerFloor(housekeeperCtx.position.y);
      for (const door of loaded.world.doors) {
        if (doorSystem.isOpen(door.id)) continue;
        if (getPlayerFloor(door.position.y) !== hkFloor) continue;
        const crossed = (prevHkX <= door.position.x && housekeeperCtx.position.x > door.position.x)
          || (prevHkX >= door.position.x && housekeeperCtx.position.x < door.position.x);
        if (crossed && !doorSystem.hasSign(door.id)) {
          doorSystem.toggle(door.id);
        }
      }
    }

    // Capture pre-FSM positions for guest door collision
    const prevGuestX = guestCtx?.position.x ?? 0;

    // Update all monster FSMs
    updateMonsters(managedMonsters, dt);

    // Guest door collision (lunge blocked by closed doors)
    if (guestCtx) {
      const guestVel = { x: guestCtx.velocity.x };
      const guestFloor = getPlayerFloor(guestCtx.position.y);
      enforceClosedDoors(prevGuestX, guestCtx.position, guestVel, guestFloor, loaded.world.doors, doorSystem);
    }

    // --- Catch check ---
    const monsterStates = buildMonsterStates();
    const caughtBy = checkCatch(
      {
        position: playerPos,
        velocity: playerVel,
        movementMode: playerMode,
        facing: playerFacing,
        hiding: playerHiding,
        noiseLevel: playerNoise,
        selectedTool,
        lighterActive,
      },
      monsterStates,
      Math.random,
    );
    if (caughtBy) {
      emitter.emit('MONSTER_CATCH', caughtBy);
    }

    // --- Escape check ---
    if (clock.windowState === 'open' && isNearEscapeDoor()) {
      // Player needs to press interact to escape (handled above)
    }

    // --- Monologue ---
    const nearbyMonsters: string[] = [];
    for (const m of managedMonsters) {
      if (!m.active) continue;
      const ctx = m.id === 'bellhop' ? bellhopCtx :
                  m.id === 'housekeeper' ? housekeeperCtx :
                  m.id === 'guest' ? guestCtx : null;
      if (ctx && distance(playerPos, ctx.position) < 200) {
        nearbyMonsters.push(m.id);
        if (!firstSightings.has(m.id)) {
          firstSightings.add(m.id);
        }
      }
    }
    monologue.update(dt, {
      currentNight: nightManager.state.currentNight,
      currentZone: playerZone,
      monstersNearby: nearbyMonsters,
      firstSightings,
    });

    // --- Camera ---
    const camTarget = computeCameraTarget(playerPos, playerFacing, playerHiding !== null);
    updateCameraState(cameraState, camTarget, dt);
  }

  // --- State builder ---

  function buildMonsterStates(): readonly MonsterState[] {
    return managedMonsters.map(m => {
      const ctx = m.id === 'bellhop' ? bellhopCtx :
                  m.id === 'housekeeper' ? housekeeperCtx :
                  m.id === 'guest' ? guestCtx : null;
      return {
        id: m.id,
        position: ctx ? { ...ctx.position } : { x: 0, y: 0 },
        fsmState: ctx ? ctx.fsm.currentState.toString() : 'unknown',
        active: m.active,
      };
    });
  }

  function getState(): GameState {
    if (gamePhase === 'ending') {
      return { phase: 'ending', night: 5 } satisfies EndingState;
    }

    if (gamePhase === 'caught') {
      return {
        phase: 'caught',
        night: nightManager.state.currentNight,
        caughtBy: nightManager.state.caughtBy ?? 'bellhop',
      } satisfies CaughtState;
    }

    if (gamePhase === 'menu') {
      return { phase: 'menu', highestNight: 0 };
    }

    return {
      phase: 'playing',
      night: {
        number: nightManager.state.currentNight,
        escapeWindow: clock.windowState,
      },
      player: {
        position: { ...playerPos },
        velocity: { ...playerVel },
        movementMode: playerMode,
        facing: playerFacing,
        hiding: playerHiding ? { ...playerHiding } : null,
        noiseLevel: playerNoise,
        selectedTool,
        lighterActive,
      },
      monsters: buildMonsterStates(),
      world: {
        ...loaded.world,
        doors: loaded.world.doors.map(d => {
          const live = doorSystem.getDoors().get(d.id);
          return live ? { ...d, isOpen: live.isOpen } : d;
        }),
      },
      inventory: {
        throwables,
        dndSigns,
        lighterFuel,
        lighterCharges,
      },
      clock: {
        elapsedS: clock.elapsedS,
        escapeWindowAtS: ESCAPE.FIRST_WINDOW_AT_S,
        escapeWindowDurationS: currentNightConfig.escapeWindowDurationS,
      },
    } satisfies PlayingState;
  }

  return {
    startNight(night: number) {
      nightManager.start(night);
      resetForNight(night);
    },
    fixedUpdate,
    getState,
    emitter,
    levelWidth: LEVEL_WIDTH,
    levelHeight: 5 * FLOOR_HEIGHT,
  };
}
