import React from 'react';
import { AbsoluteFill, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { CardReveal } from '../components/CardReveal';

/**
 * S03: The Roles (12s / 360 frames)
 * Three role cards reveal in sequence: citizen, mob soldier, mob boss.
 * Narrator continues from S02 intro, then trailer-stakes plays.
 */
export const S03_TheRoles: React.FC = () => {
  const frame = useCurrentFrame();

  // Citizen: appears at frame 0, fades out at 100
  const citizenOpacity = interpolate(frame, [90, 110], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mob Soldier: appears at frame 110, fades out at 200
  const soldierOpacity = interpolate(frame, [100, 110, 200, 220], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mob Boss: appears at frame 220, holds to end
  const bossOpacity = interpolate(frame, [210, 230], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Citizen reveal */}
      <AbsoluteFill style={{ opacity: citizenOpacity }}>
        <CardReveal
          src={staticFile('assets/role-citizen.png')}
          startFrame={0}
          cardWidth={350}
        />
      </AbsoluteFill>

      {/* Mob Soldier reveal */}
      <AbsoluteFill style={{ opacity: soldierOpacity }}>
        <CardReveal
          src={staticFile('assets/role-mob-soldier.png')}
          startFrame={110}
          cardWidth={350}
        />
      </AbsoluteFill>

      {/* Mob Boss reveal — holds longest */}
      <AbsoluteFill style={{ opacity: bossOpacity }}>
        <CardReveal
          src={staticFile('assets/role-mob-boss.png')}
          startFrame={220}
          cardWidth={380}
        />
      </AbsoluteFill>

      {/* Audio: handled at Trailer level */}
    </AbsoluteFill>
  );
};
