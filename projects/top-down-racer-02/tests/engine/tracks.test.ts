/**
 * Track Data Build Tests
 *
 * Verifies that all track control-point arrays produce valid TrackState
 * objects through the buildTrack pipeline. Catches geometry errors,
 * degenerate splines, and missing data early.
 */

import { describe, it, expect } from 'vitest';
import { buildTrack } from '../../src/engine/track';
import { TRACK_01_CONTROL_POINTS } from '../../src/tracks/track01';
import { TRACK_02_CONTROL_POINTS } from '../../src/tracks/track02';
import { TRACK_03_CONTROL_POINTS } from '../../src/tracks/track03';

describe('Track data', () => {
  it.each([
    ['Track 01', TRACK_01_CONTROL_POINTS],
    ['Track 02', TRACK_02_CONTROL_POINTS],
    ['Track 03', TRACK_03_CONTROL_POINTS],
  ])('%s builds without errors', (_name, points) => {
    const track = buildTrack(points, 30);
    expect(track.checkpoints.length).toBe(30);
    expect(track.innerBoundary.length).toBeGreaterThan(0);
    expect(track.outerBoundary.length).toBeGreaterThan(0);
    expect(track.totalLength).toBeGreaterThan(300);
  });
});
