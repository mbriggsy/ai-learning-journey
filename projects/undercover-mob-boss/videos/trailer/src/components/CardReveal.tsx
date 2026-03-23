import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  src: string;
  startFrame: number;
  /** Width of the card in pixels */
  cardWidth?: number;
}

/**
 * A card that fades in from darkness with a spring scale.
 * Simulates a dramatic reveal.
 */
export const CardReveal: React.FC<Props> = ({
  src,
  startFrame,
  cardWidth = 400,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;
  if (adjustedFrame < 0) return null;

  const scale = spring({
    fps,
    frame: adjustedFrame,
    config: { damping: 80, stiffness: 100, mass: 0.8 },
  });

  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Img
        src={src}
        style={{
          width: cardWidth,
          height: 'auto',
          transform: `scale(${scale})`,
          opacity,
          filter: `drop-shadow(0 0 40px rgba(0,0,0,0.8))`,
        }}
      />
    </AbsoluteFill>
  );
};
