import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { useFonts } from './hooks/useFonts';

const Placeholder: React.FC = () => {
  return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
};

export const Root: React.FC = () => {
  useFonts();

  return (
    <>
      <Composition
        id="BurnedTrailer"
        component={Placeholder}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
