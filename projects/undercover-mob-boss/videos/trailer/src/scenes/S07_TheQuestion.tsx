import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S07: The Question (5s / 150 frames)
 * Black screen. Gold text: "WHICH SIDE ARE YOU ON?"
 * Pulses, then glitches into scanlines for Act 2 transition.
 */
export const S07_TheQuestion: React.FC = () => {
  const frame = useCurrentFrame();

  // Text fades in from 15-45
  const textOpacity = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gold shimmer: subtle opacity oscillation
  const shimmer = frame > 45
    ? 0.85 + 0.15 * Math.sin(frame * 0.15)
    : 1;

  // Glitch effect in last 30 frames (120-150)
  const glitchActive = frame > 120;
  const glitchIntensity = glitchActive
    ? interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  // Scanline offset
  const scanlineOffset = glitchActive
    ? Math.sin(frame * 20) * glitchIntensity * 30
    : 0;

  // Text fragmentation via clip-path
  const textScale = glitchActive
    ? 1 + glitchIntensity * 0.3
    : 1;

  // Text color shifts during glitch
  const textColor = glitchActive && frame % 4 < 2
    ? NOIR.cream
    : NOIR.gold;

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Main text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 64,
            color: textColor,
            letterSpacing: '0.15em',
            opacity: textOpacity * shimmer,
            transform: `scale(${textScale}) translateX(${scanlineOffset}px)`,
            textShadow: glitchActive
              ? `${-scanlineOffset * 0.5}px 0 ${NOIR.blood}, ${scanlineOffset * 0.5}px 0 ${NOIR.amber}`
              : `0 0 30px rgba(201,168,76,0.3)`,
          }}
        >
          WHICH SIDE ARE YOU ON?
        </div>
      </AbsoluteFill>

      {/* Scanline overlay during glitch */}
      {glitchActive && (
        <AbsoluteFill style={{ opacity: glitchIntensity * 0.4 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${(i / 40) * 100}%`,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: NOIR.cream,
                opacity: (Math.sin(i * 3 + frame * 5) + 1) * 0.3,
              }}
            />
          ))}
        </AbsoluteFill>
      )}

      {/* Static noise during final glitch frames */}
      {frame > 140 && (
        <AbsoluteFill
          style={{
            backgroundColor: NOIR.cream,
            opacity: interpolate(frame, [140, 150], [0, 0.3], {
              extrapolateRight: 'clamp',
            }),
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
