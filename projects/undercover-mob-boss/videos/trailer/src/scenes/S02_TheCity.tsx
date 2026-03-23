import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { FadeTransition } from '../components/FadeTransition';

/**
 * S02: The City (9s / 270 frames)
 * background.jpg fades in with Ken Burns slow zoom.
 * Vignette overlay for atmosphere.
 * Audio: handled at Trailer level.
 */
export const S02_TheCity: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurns
        src={staticFile('assets/background.jpg')}
        startScale={1.0}
        endScale={1.12}
        panY={-15}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      <FadeTransition type="in" durationFrames={45} />
    </AbsoluteFill>
  );
};
