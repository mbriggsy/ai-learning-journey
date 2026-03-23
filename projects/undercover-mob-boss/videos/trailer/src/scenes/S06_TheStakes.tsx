import React from 'react';
import {
  AbsoluteFill, Img, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { NOIR } from '../lib/colors';
import { FadeTransition } from '../components/FadeTransition';
import { KenBurns } from '../components/KenBurns';

/**
 * S06: The Stakes (13s / 390 frames)
 * Policy-bad stamps in. Quick montage: investigate, dossier, execute.
 * Mob wins climax. Fade to black.
 * Audio: handled at Trailer level.
 */
export const S06_TheStakes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stampScale = spring({
    fps, frame,
    config: { damping: 40, stiffness: 200 },
  });

  const shakeX = frame < 15
    ? Math.sin(frame * 14) * interpolate(frame, [0, 15], [8, 0], { extrapolateRight: 'clamp' })
    : 0;

  // Phase visibility — spaced out for audio
  const showStamp = frame < 70;
  const showInvestigate = frame >= 70 && frame < 115;
  const showDossier = frame >= 115 && frame < 160;
  const showExecute = frame >= 160 && frame < 210;
  const showMobWins = frame >= 210 && frame < 350;
  const showBlack = frame >= 350;

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {showStamp && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            transform: `translateX(${shakeX}px)`,
          }}
        >
          <Img
            src={staticFile('assets/policy-bad.png')}
            style={{
              width: 400,
              height: 'auto',
              transform: `scale(${stampScale})`,
              filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.8))',
            }}
          />
        </AbsoluteFill>
      )}

      {showInvestigate && (
        <KenBurns src={staticFile('assets/power-investigate.png')} startScale={1.1} endScale={1.2} />
      )}

      {showDossier && (
        <KenBurns src={staticFile('assets/trailer-dossier-spread.jpg')} startScale={1.0} endScale={1.1} panX={-20} />
      )}

      {showExecute && (
        <KenBurns src={staticFile('assets/power-execute.png')} startScale={1.0} endScale={1.15} panY={-10} />
      )}

      {showMobWins && (
        <KenBurns src={staticFile('assets/trailer-city-closeup.jpg')} startScale={1.0} endScale={1.05} />
      )}

      <FadeTransition type="out" durationFrames={30} />
    </AbsoluteFill>
  );
};
