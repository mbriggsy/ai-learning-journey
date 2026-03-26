import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S09 — The Reveal (7s / 210f)
 * Quick montage of game screenshots — fast cuts showing the finished product.
 * "So what came out the other side? A game where no one can be trusted."
 */

// Each shot holds for ~35-40 frames (just over 1 second each)
const SHOTS = [
  { src: 'assets/trailer-table-overhead.jpg', duration: 40 },
  { src: 'assets/trailer-city-closeup.jpg', duration: 35 },
  { src: 'assets/trailer-dossier-spread.jpg', duration: 35 },
  { src: 'assets/trailer-blueprint.jpg', duration: 35 },
];

export const V3S09_TheReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate which shot we're on
  let shotStart = 30; // 1-second lead-in
  let currentShot = -1;
  let localFrame = 0;

  for (let i = 0; i < SHOTS.length; i++) {
    if (frame >= shotStart && frame < shotStart + SHOTS[i].duration) {
      currentShot = i;
      localFrame = frame - shotStart;
      break;
    }
    shotStart += SHOTS[i].duration;
  }

  // Flash white on each cut
  const isInCut =
    currentShot >= 0 && localFrame < 3;
  const flashOpacity = isInCut
    ? interpolate(localFrame, [0, 3], [0.8, 0])
    : 0;

  // Text: "A game where no one can be trusted"
  const textFrame = 120;
  const textOpacity = interpolate(
    frame,
    [textFrame, textFrame + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Current shot */}
      {currentShot >= 0 && (
        <AbsoluteFill>
          <Img
            src={staticFile(SHOTS[currentShot].src)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${interpolate(localFrame, [0, SHOTS[currentShot].duration], [1.05, 1.0])})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Flash overlay on cuts */}
      {flashOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: flashOpacity,
          }}
        />
      )}

      {/* Dark overlay for text */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 50%, ${NOIR.black}cc 80%)`,
        }}
      />

      {/* "A game where no one can be trusted" */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 60,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 36,
            color: NOIR.cream,
            letterSpacing: '0.08em',
            textShadow: `0 2px 20px ${NOIR.black}`,
          }}
        >
          A game where no one can be trusted.
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={10} />
      <FadeTransition type="out" durationFrames={20} />
    </AbsoluteFill>
  );
};
