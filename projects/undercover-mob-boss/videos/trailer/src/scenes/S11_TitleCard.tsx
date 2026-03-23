import React from 'react';
import {
  AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame,
} from 'remotion';
import { KenBurns } from '../components/KenBurns';
import { TextReveal } from '../components/TextReveal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_BODY } from '../lib/fonts';

/**
 * S11: Title Card (9s / 270 frames)
 * Game title, tagline, URL. Fade to black.
 * Audio: handled at Trailer level.
 */
export const S11_TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const urlPulse = 0.85 + 0.15 * Math.sin(frame * 0.1);

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <KenBurns src={staticFile('assets/background.jpg')} startScale={1.1} endScale={1.05} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(10,10,12,0.5) 0%, rgba(10,10,12,0.85) 100%)' }} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <Img
          src={staticFile('assets/icon-512.png')}
          style={{
            width: 80, height: 80,
            opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        />
        <TextReveal text="UNDERCOVER MOB BOSS" startFrame={20} durationFrames={30}
          style={{ fontFamily: FONT_DISPLAY, fontSize: 72, color: NOIR.gold, letterSpacing: '0.1em', textShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 60px ${NOIR.gold}30` }} />
        <TextReveal text="A social deduction game for 5–10 players" startFrame={55} durationFrames={25}
          style={{ fontFamily: FONT_BODY, fontStyle: 'italic', fontSize: 28, color: NOIR.cream }} />
        <TextReveal text="No app. No install. Just a browser." startFrame={90} durationFrames={25}
          style={{ fontFamily: FONT_BODY, fontSize: 22, color: NOIR.muted }} />
        <TextReveal text="undercover-mob-boss.vercel.app" startFrame={120} durationFrames={25}
          style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: NOIR.gold, letterSpacing: '0.05em', opacity: urlPulse, textShadow: `0 0 20px ${NOIR.gold}40`, marginTop: 16 }} />
      </AbsoluteFill>

      <FadeTransition type="out" durationFrames={45} />
    </AbsoluteFill>
  );
};
