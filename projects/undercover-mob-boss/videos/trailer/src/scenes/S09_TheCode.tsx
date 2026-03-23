import React from 'react';
import {
  AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame,
} from 'remotion';
import { SplitScreen } from '../components/SplitScreen';
import { TerminalSimulation, type TerminalLine } from '../components/TerminalSimulation';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

const CODE_LINES: TerminalLine[] = [
  { type: 'thinking', durationFrames: 25 },
  { type: 'code', text: "function assignRoles(players: Player[]): void {" },
  { type: 'code', text: "  const dist = ROLE_COUNTS[players.length];", delay: 3 },
  { type: 'code', text: "  const shuffled = seededShuffle(players, state.seed);", delay: 3 },
  { type: 'code', text: "  shuffled[0].role = 'mob-boss';", delay: 3 },
  { type: 'code', text: "  // distribute remaining roles...", delay: 3 },
  { type: 'code', text: "}", delay: 3 },
  { type: 'blank' },
  { type: 'success', text: 'PASS  game-engine.test.ts (760 tests)', delay: 10 },
  { type: 'success', text: 'PASS  e2e-chromium.spec.ts (125 tests)', delay: 8 },
  { type: 'success', text: 'PASS  e2e-webkit.spec.ts (125 tests)', delay: 8 },
  { type: 'success', text: 'PASS  e2e-mobile.spec.ts (250 tests)', delay: 8 },
];

const RIGHT_ASSETS = [
  { src: 'assets/role-citizen.png', startFrame: 25, endFrame: 90 },
  { src: 'assets/role-mob-soldier.png', startFrame: 90, endFrame: 155 },
  { src: 'assets/policy-bad.png', startFrame: 155, endFrame: 220 },
  { src: 'assets/background.jpg', startFrame: 220, endFrame: 300 },
];

/**
 * S09: The Code (10s / 300 frames)
 * Split-screen: LEFT = Claude Code terminal, RIGHT = game assets materializing.
 * Audio: handled at Trailer level.
 */
export const S09_TheCode: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <SplitScreen
        left={
          <AbsoluteFill style={{ padding: '40px 24px' }}>
            <TerminalSimulation lines={CODE_LINES} typingSpeed={2} startFrame={0} fontSize={15} />
          </AbsoluteFill>
        }
        right={
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: NOIR.charcoal }}>
            {RIGHT_ASSETS.map((asset, i) => {
              if (frame < asset.startFrame || frame >= asset.endFrame) return null;
              const opacity = interpolate(frame - asset.startFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
              return (
                <Img
                  key={i}
                  src={staticFile(asset.src)}
                  style={{
                    maxWidth: '80%',
                    maxHeight: '80%',
                    objectFit: 'contain',
                    opacity,
                    filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.6))',
                  }}
                />
              );
            })}
          </AbsoluteFill>
        }
      />
      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 40px 30px' }}>
        <TextReveal text="14,000 lines of code" startFrame={60} durationFrames={20}
          style={{ fontFamily: FONT_MONO, fontSize: 18, color: NOIR.gold, opacity: 0.8 }} />
        <TextReveal text="17,000 lines of tests" startFrame={130} durationFrames={20}
          style={{ fontFamily: FONT_MONO, fontSize: 18, color: NOIR.gold, opacity: 0.8, marginTop: 4 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
