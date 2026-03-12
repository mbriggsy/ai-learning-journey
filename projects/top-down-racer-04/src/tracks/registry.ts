import type { TrackControlPoint } from '../engine/types';
import { TRACK_01_CONTROL_POINTS } from './track01';
import { TRACK_02_CONTROL_POINTS } from './track02';
import { TRACK_03_CONTROL_POINTS } from './track03';

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
  {
    id: 'track-02',
    name: 'Speedway',
    description: 'Fast — sweeping curves, high speed',
    controlPoints: TRACK_02_CONTROL_POINTS,
    parTimes: { gold: 2100, silver: 2700, bronze: 3300 },
  },
  {
    id: 'track-03',
    name: 'Gauntlet',
    description: 'Technical — tight hairpins, precision',
    controlPoints: TRACK_03_CONTROL_POINTS,
    parTimes: { gold: 2700, silver: 3300, bronze: 4200 },
  },
];
