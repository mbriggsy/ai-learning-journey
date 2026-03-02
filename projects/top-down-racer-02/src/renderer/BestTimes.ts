/**
 * BestTimes — thin delegation shim to Leaderboard.ts.
 *
 * Preserves the existing getBestTime/setBestTime API surface so that
 * ScreenManager.ts and TrackSelectScreen.ts continue to work unchanged.
 * Delegates to the new Leaderboard module for actual storage.
 *
 * NOTE: Old best times stored under 'tdr-best-times' are abandoned.
 * The new storage key is 'tdr-leaderboard-v1' (managed by Leaderboard.ts).
 */

import { getLeaderboard, setHumanBest } from './Leaderboard';

export function getBestTime(trackId: string): number | null {
  return getLeaderboard(trackId).human;
}

export function setBestTime(trackId: string, ticks: number): boolean {
  return setHumanBest(trackId, ticks);
}
