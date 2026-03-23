import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * V01: Hook (2s / 60 frames)
 * Text slams in: "THIS GAME WAS BUILT IN 8 NIGHTS"
 */
export const V01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
    config: { damping: 40, stiffness: 200 },
    from: 2,
    to: 1,
  });

  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 60px',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          textAlign: 'center',
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div style={{ fontSize: 52, color: NOIR.cream, letterSpacing: '0.1em' }}>
          THIS GAME
        </div>
        <div style={{ fontSize: 52, color: NOIR.cream, letterSpacing: '0.1em' }}>
          WAS BUILT IN
        </div>
        <div
          style={{
            fontSize: 80,
            color: NOIR.gold,
            letterSpacing: '0.12em',
            marginTop: 8,
            textShadow: `0 0 30px ${NOIR.gold}60`,
          }}
        >
          8 NIGHTS
        </div>
      </div>
    </AbsoluteFill>
  );
};
