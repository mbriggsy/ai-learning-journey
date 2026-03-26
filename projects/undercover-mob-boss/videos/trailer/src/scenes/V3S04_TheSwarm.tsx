import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';
import { staticFile } from 'remotion';

/**
 * S04 — The Swarm (12s / 360f)
 * Noir image: fedora-wearing agent shadows converging on a glowing blueprint.
 * Text reveals the challenger concept.
 */
export const V3S04_TheSwarm: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulsing red glow on the image — challengers attacking
  const pulseIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0, 0.15],
  );

  return (
    <AbsoluteFill>
      <KenBurns
        src={staticFile('assets/v3-agent-swarm.jpg')}
        startScale={1.05}
        endScale={1.2}
        panX={10}
        panY={-15}
      />

      {/* Red pulse overlay — challengers attacking */}
      <AbsoluteFill
        style={{
          backgroundColor: NOIR.blood,
          opacity: pulseIntensity,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Dark gradient for text */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 40%, ${NOIR.black}dd 75%)`,
        }}
      />

      {/* Text */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
        }}
      >
        <TextReveal
          text="THE CHALLENGERS"
          startFrame={20}
          durationFrames={20}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            color: NOIR.blood,
            letterSpacing: '0.2em',
            textShadow: `0 0 30px ${NOIR.blood}80`,
          }}
        />
        <TextReveal
          text="What survived the swarm was ready to build."
          startFrame={100}
          durationFrames={25}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 24,
            color: NOIR.cream,
            letterSpacing: '0.06em',
            marginTop: 12,
          }}
        />
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={15} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
