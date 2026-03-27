import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';
import { staticFile } from 'remotion';

interface CounterProps {
  label: string;
  value: string;
  startFrame: number;
}

const Counter: React.FC<CounterProps> = ({ label, value, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame) return null;

  const scale = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 80 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 96,
          fontWeight: 'bold',
          color: NOIR.gold,
          textShadow: `0 0 40px ${NOIR.gold}80`,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          color: NOIR.cream,
          letterSpacing: '0.12em',
          marginTop: 8,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * S04 — The Swarm (12s / 360f)
 * War room ops center image with red pulse overlay.
 * "THE CHALLENGERS" text, then counters pop as "what survived" payoff.
 *
 * Audio: v3-swarm narrates the challenger story, ending with the numbers.
 * Counters timed to land on "fourteen thousand... twenty-eight... seven."
 */
export const V3S04_TheSwarm: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulsing red glow on the image — challengers attacking
  const pulseIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0, 0.15],
  );

  // Fade the image back when counters hit (around frame 220)
  const imageDim = interpolate(
    frame,
    [200, 230],
    [1, 0.35],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: imageDim }}>
        <KenBurns
          src={staticFile('assets/v3-agent-swarm.jpg')}
          startScale={1.05}
          endScale={1.2}
          panX={10}
          panY={-15}
        />
      </AbsoluteFill>

      {/* Red pulse overlay — challengers attacking */}
      <AbsoluteFill
        style={{
          backgroundColor: NOIR.blood,
          opacity: pulseIntensity * imageDim,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Dark gradient for text */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 30%, ${NOIR.black}dd 70%)`,
        }}
      />

      {/* "THE CHALLENGERS" text — early in scene */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 160,
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
      </AbsoluteFill>

      {/* "What survived" counters — pop in as narrator says the numbers */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 80,
            padding: '0 60px',
          }}
        >
          <Counter label="LINES OF SPEC" value="14,638" startFrame={220} />
          <Counter label="PHASES" value="7" startFrame={265} />
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={15} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
