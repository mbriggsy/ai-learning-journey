import { SIMULATION, TIMERS } from '../constants.js';

export function createCountdownTicks(): number {
  return Math.round(TIMERS.COUNTDOWN_DURATION_S / SIMULATION.FIXED_STEP_S);
}

export function createHuntTicks(): number {
  return Math.round(TIMERS.HUNT_TIME_LIMIT_S / SIMULATION.FIXED_STEP_S);
}

export function createSonarPingTicks(): number {
  return Math.round(TIMERS.SONAR_PING_INTERVAL_S / SIMULATION.FIXED_STEP_S);
}

export function ticksToDisplaySeconds(ticks: number): number {
  return Math.ceil(ticks * SIMULATION.FIXED_STEP_S);
}
