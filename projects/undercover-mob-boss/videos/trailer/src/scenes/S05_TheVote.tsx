import React from 'react';
import {
  AbsoluteFill, Img, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S05: The Vote (9s / 270 frames)
 * Vote cards compete, rapid vote reveal, frame shake.
 * Audio: handled at Trailer level.
 */
export const S05_TheVote: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const approveX = interpolate(frame, [0, 30], [-600, -200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blockX = interpolate(frame, [15, 45], [600, 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardsOpacity = interpolate(frame, [80, 100], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const resultScale = frame >= 140
    ? spring({ fps, frame: frame - 140, config: { damping: 60 } })
    : 0;

  const shakeX = frame >= 140 && frame < 155
    ? Math.sin(frame * 12) * interpolate(frame, [140, 155], [6, 0], { extrapolateRight: 'clamp' })
    : 0;
  const shakeY = frame >= 140 && frame < 155
    ? Math.cos(frame * 15) * interpolate(frame, [140, 155], [4, 0], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: cardsOpacity,
        }}
      >
        <Img
          src={staticFile('assets/vote-approve.png')}
          style={{
            position: 'absolute',
            width: 280,
            height: 'auto',
            transform: `translateX(${approveX}px)`,
            filter: 'drop-shadow(0 0 30px rgba(74,186,106,0.3))',
          }}
        />
        <Img
          src={staticFile('assets/vote-block.png')}
          style={{
            position: 'absolute',
            width: 280,
            height: 'auto',
            transform: `translateX(${blockX}px)`,
            filter: 'drop-shadow(0 0 30px rgba(168,32,32,0.3))',
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 120,
            color: NOIR.gold,
            letterSpacing: '0.1em',
            transform: `scale(${resultScale})`,
            textShadow: `0 0 40px rgba(201,168,76,0.4)`,
          }}
        >
          4 – 3
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
