import type { TrackControlPoint } from '../engine/types';
import { TRACK_01_CONTROL_POINTS } from './track01';
import { TRACK_02_CONTROL_POINTS } from './track02';
import { TRACK_03_CONTROL_POINTS } from './track03';

export interface TrackInfo {
  id: string;
  name: string;
  description: string;
  controlPoints: TrackControlPoint[];
  /** Number of checkpoint gates for this track. Passed to buildTrack(). */
  checkpointCount: number;
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
    checkpointCount: 30,
    parTimes: { gold: 2400, silver: 3000, bronze: 3600 },
  },
  {
    id: 'track-02',
    name: 'Speedway',
    description: 'Fast — high-speed sweepers, genuine braking zones',
    controlPoints: TRACK_02_CONTROL_POINTS,
    checkpointCount: 40,
    parTimes: { gold: 0, silver: 0, bronze: 0 },
  },
  {
    id: 'track-03',
    name: 'Gauntlet',
    description: 'Technical — mixed-radius corners, no mercy',
    controlPoints: TRACK_03_CONTROL_POINTS,
    checkpointCount: 45,
    parTimes: { gold: 0, silver: 0, bronze: 0 },
  },
];
