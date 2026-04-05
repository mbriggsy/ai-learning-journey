import type { TrackControlPoint } from '../engine/types';
import { TRACK_01_CONTROL_POINTS } from './track01';

export interface TrackInfo {
  id: string;
  name: string;
  description: string;
  controlPoints: TrackControlPoint[];
  /** Par times in ticks (gold/silver/bronze). Tuned after playtesting. */
  parTimes: { gold: number; silver: number; bronze: number };
  /** Which side gets a visible shoulder (sand strip between road edge and wall). Always inner only. */
  shoulderSide?: 'inner';
}

export const TRACKS: TrackInfo[] = [
  {
    id: 'track-01',
    name: 'Circuit',
    description: 'Beginner — smooth oval, wide racing',
    controlPoints: TRACK_01_CONTROL_POINTS,
    parTimes: { gold: 2400, silver: 3000, bronze: 3600 },
  },
  // Track 2 (Speedway) — will be added in Plan 03
  // Track 3 (Gauntlet) — will be added in Plan 03
];
