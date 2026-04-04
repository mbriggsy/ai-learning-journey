import type { Position } from '../types/state';
import { AUDIO } from '../constants';

export function computeVolume(source: Position, listener: Position): number {
  const dx = source.x - listener.x;
  const dy = source.y - listener.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - dist / AUDIO.MAX_DISTANCE);
}

export function computePan(source: Position, listener: Position): number {
  const dx = source.x - listener.x;
  return Math.max(-1, Math.min(1, dx / AUDIO.PAN_DISTANCE));
}

export type SpatialParams = {
  readonly volume: number;
  readonly pan: number;
};

export function computeSpatialParams(source: Position, listener: Position): SpatialParams {
  return {
    volume: computeVolume(source, listener),
    pan: computePan(source, listener),
  };
}
