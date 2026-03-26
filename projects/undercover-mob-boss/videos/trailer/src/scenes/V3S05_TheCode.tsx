import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SplitScreen } from '../components/SplitScreen';
import { TerminalSimulation, type TerminalLine } from '../components/TerminalSimulation';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

// Left terminal: Claude Code generating game engine
const LEFT_LINES: TerminalLine[] = [
  { type: 'code', text: 'claude "Implement Phase 1: Game Engine"' },
  { type: 'thinking', durationFrames: 20 },
  { type: 'output', text: '  Creating src/server/game-engine.ts...' },
  { type: 'code', text: 'export class GameEngine {', delay: 5 },
  { type: 'code', text: '  private state: GameState;', delay: 3 },
  { type: 'code', text: '  private deck: PolicyDeck;', delay: 3 },
  { type: 'code', text: '  transition(action: GameAction): void {', delay: 5 },
  { type: 'code', text: '    const next = this.resolve(action);', delay: 3 },
  { type: 'code', text: '    this.state = next;', delay: 2 },
  { type: 'code', text: '    this.broadcast(next);', delay: 2 },
  { type: 'code', text: '  }', delay: 2 },
  { type: 'blank' },
  { type: 'success', text: 'src/server/game-engine.ts (487 lines)', delay: 5 },
  { type: 'success', text: 'src/server/phases.ts (312 lines)', delay: 3 },
  { type: 'success', text: 'src/server/powers.ts (198 lines)', delay: 3 },
  { type: 'success', text: 'src/shared/protocol.ts (156 lines)', delay: 3 },
  { type: 'blank' },
  { type: 'output', text: '  Phase 1 complete. 1,153 lines generated.', delay: 5 },
];

// Right terminal: Client views + deployment
const RIGHT_LINES: TerminalLine[] = [
  { type: 'code', text: 'claude "Implement Phase 3: Player View"', delay: 15 },
  { type: 'thinking', durationFrames: 15 },
  { type: 'output', text: '  Creating src/client/views/...' },
  { type: 'code', text: 'function RoleReveal({ role, peek }: Props) {', delay: 5 },
  { type: 'code', text: '  const [revealed, setRevealed] = useState(false);', delay: 3 },
  { type: 'code', text: '  return revealed ? <RoleCard /> : <Envelope />;', delay: 3 },
  { type: 'code', text: '}', delay: 2 },
  { type: 'blank' },
  { type: 'success', text: 'src/client/views/role-reveal.ts', delay: 8 },
  { type: 'success', text: 'src/client/views/vote.ts', delay: 3 },
  { type: 'success', text: 'src/client/views/legislative.ts', delay: 3 },
  { type: 'success', text: 'src/client/views/lobby.ts', delay: 3 },
  { type: 'blank' },
  { type: 'code', text: 'claude "Deploy to Vercel + PartyKit"', delay: 10 },
  { type: 'thinking', durationFrames: 12 },
  { type: 'success', text: '✓ Vercel: undercover-mob-boss.vercel.app', delay: 5 },
  { type: 'success', text: '✓ PartyKit: deployed to Cloudflare edge', delay: 3 },
];

/**
 * S05 — The Code (17s / 510f)
 * Split-screen: two Claude Code terminals generating code simultaneously.
 * "ATC" label fades in mid-scene.
 */
export const V3S05_TheCode: React.FC = () => {
  const frame = useCurrentFrame();

  // "AIR TRAFFIC CONTROL" label fades in at frame 200
  const atcOpacity = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out ATC label
  const atcFadeOut = interpolate(frame, [350, 380], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <SplitScreen
        left={
          <TerminalSimulation
            lines={LEFT_LINES}
            typingSpeed={2.5}
            startFrame={10}
            fontSize={14}
          />
        }
        right={
          <TerminalSimulation
            lines={RIGHT_LINES}
            typingSpeed={2.5}
            startFrame={10}
            fontSize={14}
          />
        }
      />

      {/* ATC overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: atcOpacity * atcFadeOut,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 32,
            color: NOIR.gold,
            letterSpacing: '0.3em',
            textShadow: `0 0 40px ${NOIR.gold}80`,
            backgroundColor: `${NOIR.black}cc`,
            padding: '16px 40px',
            borderRadius: 4,
            border: `1px solid ${NOIR.gold}40`,
          }}
        >
          AIR TRAFFIC CONTROL
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={15} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
