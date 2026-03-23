import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface Props {
  text: string;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}

/** Fade-in text with subtle upward slide. */
export const TextReveal: React.FC<Props> = ({
  text,
  startFrame = 0,
  durationFrames = 30,
  style,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const opacity = progress;
  const translateY = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
