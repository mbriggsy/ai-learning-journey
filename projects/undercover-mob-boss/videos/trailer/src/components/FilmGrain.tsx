import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/** Animated film grain overlay using SVG feTurbulence. */
export const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  // Cycle through 100 noise seeds for natural-looking grain
  const seed = frame % 100;

  return (
    <AbsoluteFill style={{ opacity: 0.06, pointerEvents: 'none', mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            seed={seed}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
