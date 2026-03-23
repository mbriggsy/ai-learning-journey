import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { NOIR } from '../lib/colors';

interface Props {
  type: 'in' | 'out';
  durationFrames?: number;
}

/** Full-screen black overlay that fades in or out. */
export const FadeTransition: React.FC<Props> = ({
  type,
  durationFrames = 30,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let opacity: number;
  if (type === 'in') {
    // Fade from black at the start
    opacity = interpolate(frame, [0, durationFrames], [1, 0], {
      extrapolateRight: 'clamp',
    });
  } else {
    // Fade to black at the end
    const startFrame = durationInFrames - durationFrames;
    opacity = interpolate(frame, [startFrame, durationInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
    });
  }

  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        opacity,
      }}
    />
  );
};
