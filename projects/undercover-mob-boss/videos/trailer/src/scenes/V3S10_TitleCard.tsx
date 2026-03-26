import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_BODY } from '../lib/fonts';

/**
 * S10 — Title Card + CTA (7s / 210f)
 * Title fades in, URL appears below.
 * "Undercover Mob Boss. Play free. Trust no one."
 */
export const V3S10_TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    fps,
    frame: Math.max(0, frame - 20),
    config: { damping: 80, stiffness: 100 },
  });

  const urlOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const taglineOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Subtle gold vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${NOIR.gold}08 0%, transparent 60%)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 72,
            color: NOIR.gold,
            letterSpacing: '0.12em',
            textShadow: `0 0 60px ${NOIR.gold}40`,
            transform: `scale(${titleScale})`,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          UNDERCOVER
          <br />
          MOB BOSS
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 22,
            color: NOIR.cream,
            letterSpacing: '0.05em',
            opacity: urlOpacity,
          }}
        >
          undercover-mob-boss.vercel.app
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            color: NOIR.muted,
            letterSpacing: '0.2em',
            opacity: taglineOpacity,
          }}
        >
          PLAY FREE. TRUST NO ONE.
        </div>
      </div>

      <FadeTransition type="in" durationFrames={20} />
    </AbsoluteFill>
  );
};
