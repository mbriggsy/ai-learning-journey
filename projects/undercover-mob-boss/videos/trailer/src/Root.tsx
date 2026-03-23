import React from 'react';
import { Composition } from 'remotion';
import { Trailer } from './Trailer';
import { TrailerVertical } from './TrailerVertical';
import { TOTAL_DURATION_FRAMES, FPS } from './lib/timing';
import { useFonts } from './hooks/useFonts';

// Vertical trailer: 60 + 240 + 210 + 120 + 180 = 810 frames = 27s
const VERTICAL_DURATION = 810;

export const Root: React.FC = () => {
  useFonts();

  return (
    <>
      <Composition
        id="Trailer"
        component={Trailer}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TrailerVertical"
        component={TrailerVertical}
        durationInFrames={VERTICAL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
