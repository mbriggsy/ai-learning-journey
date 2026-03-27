import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

interface Props {
  startFrame: number;
  endFrame: number;
  targetValue: number;
  freezeFrame: number;
}

export const GamesCounter: React.FC<Props> = ({
  startFrame,
  endFrame,
  targetValue,
  freezeFrame,
}) => {
  const frame = useCurrentFrame();
  const effectiveFrame = Math.min(frame, freezeFrame);

  if (effectiveFrame < startFrame) return null;

  const fadeIn = interpolate(
    effectiveFrame,
    [startFrame, startFrame + 15],
    [0, 1],
    { extrapolateRight: 'clamp' },
  );

  // Eased count-up: slow start, fast middle, slow at end
  const progress = interpolate(
    effectiveFrame,
    [startFrame, endFrame],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const eased = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const displayValue = Math.round(eased * targetValue);

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        backgroundColor: `${NOIR.black}cc`,
        padding: '12px 20px',
        borderRadius: 8,
        border: `1px solid ${NOIR.gold}30`,
        opacity: fadeIn,
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 11,
          color: NOIR.gold,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Games Simulated
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 36,
          fontWeight: 'bold',
          color: NOIR.cream,
          textShadow: `0 0 15px ${NOIR.gold}40`,
          marginTop: 2,
        }}
      >
        {displayValue.toLocaleString()}
      </span>
    </div>
  );
};
