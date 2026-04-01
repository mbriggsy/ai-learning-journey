import type { SeekerFSMState, HiderFSMState } from './state.js';

export interface SeekerConfig {
  // Vision
  readonly visionRange: number;
  readonly visionConeAngle: number;   // degrees — RESTRICTS detection
  readonly hearingRange: number;      // tiles — DOOR_TOGGLED trigger range
  // Timing
  readonly reactionDelayTicks: number;
  readonly chaseTimeoutTicks: number;
  readonly memoryDurationTicks: number;
  readonly patrolPauseMinTicks: number;
  readonly patrolPauseMaxTicks: number;
  readonly suspiciousDurationTicks: number;
  readonly suspiciousCooldownTicks: number;
  readonly searchDurationTicks: number;
  readonly menaceLimitTicks: number;       // 0 = no menace gauge
  readonly menaceCooldownTicks: number;
  // Search
  readonly searchRadiusTiles: number;
  readonly searchThoroughness: SearchThoroughness;
  readonly searchSkipLKPChance: number;    // 0.0-1.0
  // Movement
  readonly patrolSpeed: number;
  readonly chaseSpeed: number;
  readonly doorwayPauseChance: number;     // 0.0-1.0
  readonly doorwayPauseTicks: number;
  // Patrol
  readonly patrolStrategy: PatrolStrategy;
  readonly cancelChaseOnBriefGlimpse: boolean;
  // Chase
  readonly chaseGraceTicks: number;        // hysteresis before LOS-lost triggers timeout
}

export type SearchThoroughness = 'spot-check' | 'full-room' | 'room-plus-adjacent';
export type PatrolStrategy = 'random' | 'systematic' | 'strategic';

/** Phase 5a: only 'door-sound'. Phase 6 extends with 'footstep', 'movement-sound'. */
export type StimulusKind = 'door-sound';

export interface PathPoint {
  readonly x: number;
  readonly y: number;
}

/** FSM state priority — higher wins when two transitions compete on the same tick */
export const STATE_PRIORITY: Record<SeekerFSMState, number> = {
  patrol: 0,
  suspicious: 1,
  search: 2,
  chase: 3,
} as const;

// --- Room types ---

declare const RoomIdBrand: unique symbol;
export type RoomId = string & { readonly [RoomIdBrand]: never };

export interface RoomDefinition {
  readonly id: RoomId;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly center: { readonly x: number; readonly y: number };
  readonly adjacentRooms: readonly RoomId[];
}

// --- Hider AI ---

export interface HiderSpotScoreWeights {
  readonly distance: number;
  readonly losBlockers: number;
  readonly escapeRoutes: number;
  readonly deadEndPenalty: number;
  readonly pathExposure: number;
}

export interface HiderConfig {
  readonly evaluatesSpots: boolean;
  readonly spotScoreWeights: HiderSpotScoreWeights;
  readonly usesFov: boolean;
  readonly repositionTriggerRange: number;     // tiles
  readonly maxRepositionsPerRound: number;
  readonly repositionDelayIncrementTicks: number;
  readonly usesDoors: boolean;
  readonly speed: number;                       // pixels/sec
}

// --- Hiding spots ---

export type HidingSpotType = 'corner' | 'dead-end' | 'cover';

export interface HidingSpot {
  readonly position: { readonly x: number; readonly y: number };
  readonly type: HidingSpotType;
  readonly score: number;
}
