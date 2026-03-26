import React from 'react';
import { Composition } from 'remotion';
import { TrailerV3 } from './TrailerV3';
import { V3_TOTAL_FRAMES, FPS } from './lib/timing-v3';
import { useFonts } from './hooks/useFonts';

export const Root: React.FC = () => {
  useFonts();

  return (
    <>
      <Composition
        id="Trailer"
        component={TrailerV3}
        durationInFrames={V3_TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
