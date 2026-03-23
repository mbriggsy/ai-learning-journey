import React from 'react';
import { AbsoluteFill, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { StatsCounter } from '../components/StatsCounter';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

const STATS = [
  { label: 'COMMITS', value: 116 },
  { label: 'LINES OF CODE', value: 14000 },
  { label: 'LINES OF TESTS', value: 17000 },
  { label: 'LINES OF SPECIFICATIONS', value: 10000 },
  { label: 'RULES VERIFIED', value: 209, suffix: ' / 209' },
  { label: 'AI-GENERATED IMAGES', value: 15 },
  { label: 'NARRATOR AUDIO LINES', value: 39 },
  { label: 'QA AGENTS DEPLOYED', value: 29 },
  { label: 'EXTERNAL DEPENDENCIES', value: 2 },
  { label: 'FUNCTIONAL DEFECTS', value: 0 },
];

/**
 * S13: The Stats (21.7s / 650 frames)
 * Full stat roll-up. Narrator delivers the $2 + token bill + AI bar tab punchline.
 * Audio: handled at Trailer level.
 */
export const S13_TheStats: React.FC = () => {
  const frame = useCurrentFrame();
  const bgOpacity = interpolate(frame, [0, 30], [0, 0.25], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <AbsoluteFill style={{ opacity: bgOpacity }}>
        <KenBurns src={staticFile('assets/trailer-blueprint.jpg')} startScale={1.0} endScale={1.05} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,12,0.8)' }} />

      <AbsoluteFill style={{ justifyContent: 'center' }}>
        <StatsCounter stats={STATS} startFrame={5} staggerFrames={18} />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
        <TextReveal text="8 NIGHTS FROM CONCEPT TO DEPLOYMENT" startFrame={370} durationFrames={30}
          style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: NOIR.gold, letterSpacing: '0.18em', textShadow: `0 0 20px ${NOIR.gold}40` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
