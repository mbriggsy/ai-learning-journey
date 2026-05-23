import React from 'react'
import { interpolate, staticFile } from 'remotion'
import { Audio } from '@remotion/media' // per ADR #17 — NOT from 'remotion' core

/**
 * Music bed spanning the full trailer runtime. 15-anchor volume
 * envelope authored Phase 1 Unit 1.7, re-anchored 2026-05-22 against
 * the Unit 2.7 Tier-4 TOTAL_FRAMES expansion (2850 → 3180), and again
 * 2026-05-23 against the Unit 4.5 R2 audio re-pace (S04 cues shifted
 * to absorb Phase 2 actualFrames overrun). Anchors after S04_START
 * shift per cascade-build-peak-payoff envelope shape.
 *
 * S04→S05 boundary at frame 2370 is a HARD VISUAL CUT (per amendment
 * MA-1 + roadmap ADR #11 revised). The music envelope is CONTINUOUS
 * across the cut — `interpolate()` produces a sample-granular curve
 * (no zipper noise). The 15-frame ramp 0.30→0.08 over frames 2352→2367
 * lands a true breath at the payoff before recovering smoothly through
 * the visual cut. DO NOT add an audio crossfade at the cut.
 *
 * Frame anchors + target volumes (R2 audio re-pace):
 *     0        1.00  intro hook (full)
 *    60        1.00  intro hook end
 *   210        0.40  S01→S02 — cold-open underbed
 *   570        0.50  S02→S03 — underscore build start
 *  1380        0.55  S03→S04 — continue build into cascade
 *  2125        0.75  mid-cascade swell — lands with new stat-04 ("Seven on the roster...")
 *  2214        0.90  peak intensify — 90f / 3s before payoff
 *  2304        0.90  STACKED_PAYOFF_FRAME — peak hold (R2 +24 from 2280)
 *  2352        0.30  sharp drop pre-silence — 15f before VO end
 *  2367        0.08  PAYOFF_VO_END — silence beat (true breath) (R2 +27 from 2340)
 *  2370        0.25  S04_END — recovery through hard cut
 *  2865        0.25  S05 iris-wipe start
 *  2910        0.50  S05→S06 — closing under-build
 *  3120        0.60  final-sting ramp
 *  3179        1.00  final sting
 */
const ENVELOPE_FRAMES = [0, 60, 210, 570, 1380, 2125, 2214, 2304, 2352, 2367, 2370, 2865, 2910, 3120, 3179] as const
const ENVELOPE_VOLUMES = [1.0, 1.0, 0.4, 0.5, 0.55, 0.75, 0.9, 0.9, 0.3, 0.08, 0.25, 0.25, 0.5, 0.6, 1.0] as const

export const MusicBed: React.FC = () => (
  <Audio
    src={staticFile('trailer/audio/music-bed.mp3')}
    volume={(f) =>
      interpolate(f, [...ENVELOPE_FRAMES], [...ENVELOPE_VOLUMES], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    }
  />
)
