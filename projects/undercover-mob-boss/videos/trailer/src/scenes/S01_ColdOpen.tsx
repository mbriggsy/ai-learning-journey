import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S01: Cold Open (4s / 120 frames)
 * Black screen → "MILLBROOK CITY, 1947" fades in gold → fades out
 */
export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // Text fades in from frame 20-50, holds, fades out from 90-115
  const opacity = interpolate(
    frame,
    [20, 50, 90, 115],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 36,
          color: NOIR.gold,
          letterSpacing: '0.25em',
          opacity,
          textTransform: 'uppercase',
        }}
      >
        Millbrook City, 1947
      </div>
    </AbsoluteFill>
  );
};
