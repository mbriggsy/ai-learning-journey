import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_BODY, FONT_MONO } from '../lib/fonts';
import { TextReveal } from '../components/TextReveal';

/**
 * S09: The Concept (8s / 240 frames)
 * The origin moment. The brainstorm. "This is the one."
 * Silent — let the text land.
 */
export const S09_TheConcept: React.FC = () => {
  const frame = useCurrentFrame();

  // Typewriter-style concept snippets
  const snippets = [
    { text: 'CONCEPT.md — March 15, 2026', frame: 10, style: 'meta' as const },
    { text: '1940s noir city. Smoke-filled rooms.', frame: 35, style: 'body' as const },
    { text: 'Fedoras. Corruption runs deep.', frame: 55, style: 'body' as const },
    { text: 'No app install. Browser-based PWA.', frame: 80, style: 'body' as const },
    { text: 'Join via QR code or room code.', frame: 100, style: 'body' as const },
  ];

  // "This is the one." — the hero text, appears late and big
  const heroOpacity = interpolate(frame, [140, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const heroScale = interpolate(frame, [140, 180], [0.9, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Concept snippets — top left, like a document */}
      <AbsoluteFill style={{ padding: '100px 200px' }}>
        {snippets.map((s, i) => {
          if (frame < s.frame) return null;
          const localOpacity = interpolate(frame - s.frame, [0, 15], [0, 1], {
            extrapolateRight: 'clamp',
          });
          // Fade snippets out before hero appears
          const fadeOut = interpolate(frame, [120, 145], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                fontFamily: s.style === 'meta' ? FONT_MONO : FONT_BODY,
                fontSize: s.style === 'meta' ? 16 : 24,
                color: s.style === 'meta' ? NOIR.muted : NOIR.cream,
                fontStyle: s.style === 'body' ? 'italic' : 'normal',
                opacity: localOpacity * fadeOut,
                marginBottom: 8,
              }}
            >
              {s.text}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* "This is the one." — center, gold, large */}
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
            color: NOIR.gold,
            letterSpacing: '0.08em',
            opacity: heroOpacity,
            transform: `scale(${heroScale})`,
            textShadow: `0 0 40px ${NOIR.gold}40`,
          }}
        >
          &ldquo;This is the one.&rdquo;
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
