import React from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S02 — The Origin (20.7s / 620f)
 * Noir image: lone figure at a glowing monitor.
 * Origin story: game night → enterprise dev → the bet.
 *
 * Audio: v3-thesis (576f / 19.2s) starts at frame 15 within scene.
 * Text overlays timed to narration beats.
 */
export const V3S02_TheThesis: React.FC = () => {
  const frame = useCurrentFrame();

  // Text reveals timed to narration beats:
  // "It started at game night..." — ~0-3s into audio → frame 15
  // "A discipline he knew nothing about..." — ~9s → frame 285
  // "And he made a bet..." — ~15s → frame 465

  const subtitleOpacity = interpolate(
    frame,
    [285, 300],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const subtitleFade = interpolate(
    frame,
    [440, 460],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const betOpacity = interpolate(
    frame,
    [465, 480],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill>
      <KenBurns
        src={staticFile('assets/v3-lone-figure.jpg')}
        startScale={1.0}
        endScale={1.15}
        panX={-25}
        panY={-12}
      />

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(transparent 30%, rgba(10,10,12,0.85) 70%)',
        }}
      />

      {/* Text overlays at bottom */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 120,
        }}
      >
        {/* "GAME NIGHT." — appears with scene */}
        <TextReveal
          text="GAME NIGHT."
          startFrame={30}
          durationFrames={25}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 52,
            color: NOIR.gold,
            letterSpacing: '0.15em',
            textShadow: `0 0 40px ${NOIR.gold}60`,
          }}
        />

        {/* "Enterprise dev. Wrong world entirely." */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            color: NOIR.cream,
            letterSpacing: '0.08em',
            marginTop: 16,
            opacity: subtitleOpacity * subtitleFade,
          }}
        >
          Enterprise dev. Wrong world entirely.
        </div>

        {/* "THE BET." — the pivot */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 44,
            color: NOIR.gold,
            letterSpacing: '0.2em',
            textShadow: `0 0 40px ${NOIR.gold}60`,
            marginTop: 24,
            opacity: betOpacity,
          }}
        >
          THE BET.
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={20} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
