import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/** Temporary placeholder for scenes not yet built. */
export const Placeholder: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.charcoal,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          color: NOIR.gold,
          opacity: 0.4,
        }}
      >
        {label} (frame {frame})
      </div>
    </AbsoluteFill>
  );
};
