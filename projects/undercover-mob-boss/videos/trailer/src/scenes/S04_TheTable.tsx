import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S04: The Table (6s / 180 frames)
 * Overhead speakeasy table with phones. Text overlay. Narrator tagline.
 */
export const S04_TheTable: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Overhead table image */}
      <KenBurns
        src={staticFile('assets/trailer-table-overhead.jpg')}
        startScale={1.05}
        endScale={1.15}
        panY={-10}
      />

      {/* Dark overlay for text legibility */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(transparent 20%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 120,
        }}
      >
        <TextReveal
          text="5–10 PLAYERS. SAME ROOM."
          startFrame={15}
          durationFrames={25}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 42,
            color: NOIR.gold,
            letterSpacing: '0.12em',
            textAlign: 'center',
          }}
        />
        <TextReveal
          text="ONE SECRET."
          startFrame={50}
          durationFrames={25}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 52,
            color: NOIR.gold,
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginTop: 16,
          }}
        />
      </AbsoluteFill>

      {/* Audio: handled at Trailer level */}
    </AbsoluteFill>
  );
};
