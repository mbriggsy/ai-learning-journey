import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  src: string;
  startScale?: number;
  endScale?: number;
  panX?: number; // px to pan horizontally (negative = left)
  panY?: number; // px to pan vertically (negative = up)
}

/** Slow zoom/pan on a static image — the Ken Burns effect. */
export const KenBurns: React.FC<Props> = ({
  src,
  startScale = 1.0,
  endScale = 1.15,
  panX = 0,
  panY = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [startScale, endScale],
  );

  const translateX = interpolate(frame, [0, durationInFrames], [0, panX]);
  const translateY = interpolate(frame, [0, durationInFrames], [0, panY]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
