import React from 'react';
import { AbsoluteFill, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { StatsCounter } from '../components/StatsCounter';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

const STATS = [
  { label: 'RULES VERIFIED', value: 209, suffix: ' / 209' },
  { label: 'FUNCTIONAL DEFECTS', value: 0 },
  { label: 'GAME LOGIC DEFECTS', value: 0 },
  { label: 'BROWSERS TESTED', value: 4 },
  { label: 'TOTAL TESTS', value: 1260 },
];

/**
 * S10: The Stats (8s / 240 frames)
 * Stats roll up over blueprint background.
 * Audio: handled at Trailer level.
 */
export const S10_TheStats: React.FC = () => {
  const frame = useCurrentFrame();
  const bgOpacity = interpolate(frame, [0, 30], [0, 0.3], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <AbsoluteFill style={{ opacity: bgOpacity }}>
        <KenBurns src={staticFile('assets/trailer-blueprint.jpg')} startScale={1.0} endScale={1.05} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,12,0.75)' }} />
      <AbsoluteFill style={{ justifyContent: 'center' }}>
        <StatsCounter stats={STATS} startFrame={10} staggerFrames={25} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60 }}>
        <TextReveal text="8 NIGHTS FROM CONCEPT TO DEPLOYMENT" startFrame={160} durationFrames={30}
          style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: NOIR.gold, letterSpacing: '0.2em', textShadow: `0 0 20px ${NOIR.gold}40` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
