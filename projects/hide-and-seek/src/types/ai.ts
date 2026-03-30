export interface SeekerConfig {
  readonly visionRange: number;
  readonly reactionDelayTicks: number;
  readonly chaseTimeoutTicks: number;
  readonly speed: number;
  readonly patrolPauseMinTicks: number;
  readonly patrolPauseMaxTicks: number;
}

export interface PathPoint {
  readonly x: number;
  readonly y: number;
}
