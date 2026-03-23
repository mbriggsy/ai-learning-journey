import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_BODY } from '../lib/fonts';
import { TextReveal } from '../components/TextReveal';

/**
 * V06: Credits (4s / 120 frames)
 * "1 HUMAN DIRECTOR + 1 AI ENGINEER = UNDERCOVER MOB BOSS"
 */
export const V06_Credits: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <TextReveal
        text="1 HUMAN DIRECTOR"
        startFrame={5}
        durationFrames={20}
        style={{
          fontFamily: FONT_BODY,
          fontSize: 32,
          color: NOIR.cream,
          letterSpacing: '0.1em',
        }}
      />
      <TextReveal
        text="+"
        startFrame={30}
        durationFrames={15}
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          color: NOIR.muted,
        }}
      />
      <TextReveal
        text="1 AI ENGINEER"
        startFrame={45}
        durationFrames={20}
        style={{
          fontFamily: FONT_BODY,
          fontSize: 32,
          color: NOIR.cream,
          letterSpacing: '0.1em',
        }}
      />
      <TextReveal
        text="="
        startFrame={70}
        durationFrames={15}
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          color: NOIR.muted,
        }}
      />
      <TextReveal
        text="UNDERCOVER MOB BOSS"
        startFrame={85}
        durationFrames={25}
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 40,
          color: NOIR.gold,
          letterSpacing: '0.1em',
          textShadow: `0 0 20px ${NOIR.gold}40`,
        }}
      />
    </AbsoluteFill>
  );
};
