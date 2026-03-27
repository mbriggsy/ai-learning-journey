import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SimulationChaos } from '../components/SimulationChaos';
import { GamesCounter } from '../components/GamesCounter';
import { CompactTerminalStrip } from '../components/CompactTerminalStrip';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

const NOTHING_BROKE_FRAME = 514;
const CHAOS_HEIGHT = 700;

const terminalPanes = [
  {
    title: 'Unit + Integration (843)',
    lines: [
      { text: '✓ game-engine: 47 transitions', color: NOIR.green, frame: 8 },
      { text: '✓ card-pool: shuffle + reshuffle', color: NOIR.green, frame: 14 },
      { text: '✓ adversarial: 38 edge cases', color: NOIR.green, frame: 20 },
      { text: '✓ sh-scenarios: all win conditions', color: NOIR.green, frame: 26 },
      { text: '✓ sh-stress: 300 random games', color: NOIR.green, frame: 32 },
      { text: '✓ sh-invariants: deck integrity', color: NOIR.green, frame: 38 },
      { text: '✓ regression-fixes: 12 bugs', color: NOIR.green, frame: 44 },
      { text: '', frame: 50 },
      { text: '843 passed | 0 failed', color: NOIR.gold, frame: 54 },
    ],
  },
  {
    title: 'E2E — Game Simulation (488)',
    lines: [
      { text: '✓ full-game: 4 browsers', color: NOIR.green, frame: 12 },
      { text: '✓ user-chaos: rage-tapping', color: NOIR.green, frame: 20 },
      { text: '✓ server-abuse: bad payloads', color: NOIR.green, frame: 28 },
      { text: '✓ race-conditions: simultaneous', color: NOIR.green, frame: 36 },
      { text: '✓ session-recovery: disconnect', color: NOIR.green, frame: 44 },
      { text: '✓ mobile: iOS scroll lock', color: NOIR.green, frame: 52 },
      { text: '', frame: 58 },
      { text: '488 passed | 0 failed', color: NOIR.gold, frame: 62 },
    ],
  },
  {
    title: 'Total: 1,331 tests',
    lines: [
      { text: '✓ 17,494 lines of test code', color: NOIR.green, frame: 16 },
      { text: '✓ 300+ randomized simulations', color: NOIR.green, frame: 28 },
      { text: '✓ 38 scripted scenarios', color: NOIR.green, frame: 40 },
      { text: '✓ 10 chaos suites', color: NOIR.green, frame: 52 },
      { text: '', frame: 60 },
      { text: '1,331 passed | 0 failed', color: NOIR.gold, frame: 66 },
    ],
  },
];

/**
 * S06 — The Tests (19.7s / 590f)
 *
 * Top 65%: Game simulation chaos — cards spawning, flying, overlapping.
 * Bottom 35%: Compact terminal strip grinding through results.
 * Frame 514: THE FREEZE. "NOTHING BROKE." drops center screen.
 */
export const V3S06_TheTests: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isFrozen = frame >= NOTHING_BROKE_FRAME;

  // Dim overlay when frozen
  const dimOpacity = interpolate(
    frame,
    [NOTHING_BROKE_FRAME, NOTHING_BROKE_FRAME + 10],
    [0, 0.65],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // "NOTHING BROKE." spring
  const punchScale = isFrozen
    ? spring({
        fps,
        frame: frame - NOTHING_BROKE_FRAME,
        config: { damping: 50, stiffness: 250, mass: 0.6 },
      })
    : 0;

  // Gold underline rule width
  const ruleWidth = isFrozen
    ? spring({
        fps,
        frame: frame - NOTHING_BROKE_FRAME - 5,
        config: { damping: 80, stiffness: 120 },
      }) * 500
    : 0;

  // Subtle glow pulse after landing
  const glowPulse =
    frame > NOTHING_BROKE_FRAME + 30
      ? 0.85 + 0.15 * Math.sin((frame - NOTHING_BROKE_FRAME - 30) * 0.15)
      : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Top 65%: Simulation Chaos */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: CHAOS_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <SimulationChaos
          freezeFrame={NOTHING_BROKE_FRAME}
          spawnStartFrame={10}
          spawnEndFrame={500}
          bounds={{ width: 1920, height: CHAOS_HEIGHT }}
        />
        <GamesCounter
          startFrame={30}
          endFrame={510}
          targetValue={1331}
          freezeFrame={NOTHING_BROKE_FRAME}
        />
      </div>

      {/* Gold divider */}
      <div
        style={{
          position: 'absolute',
          top: CHAOS_HEIGHT,
          left: 40,
          right: 40,
          height: 1,
          backgroundColor: `${NOIR.gold}40`,
        }}
      />

      {/* Bottom 35%: Terminal Strip */}
      <div
        style={{
          position: 'absolute',
          top: CHAOS_HEIGHT + 10,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <CompactTerminalStrip
          panes={terminalPanes}
          freezeFrame={NOTHING_BROKE_FRAME}
        />
      </div>

      {/* Freeze dim overlay */}
      {isFrozen && (
        <AbsoluteFill
          style={{
            backgroundColor: NOIR.black,
            opacity: dimOpacity,
          }}
        />
      )}

      {/* "NOTHING BROKE." punchline */}
      {isFrozen && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              transform: `scale(${punchScale})`,
              opacity: punchScale * glowPulse,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 90,
                color: NOIR.green,
                letterSpacing: '0.2em',
                textShadow: `0 0 40px ${NOIR.green}60, 0 0 80px ${NOIR.green}40, 0 0 160px ${NOIR.green}20`,
              }}
            >
              NOTHING BROKE.
            </div>
            <div
              style={{
                width: ruleWidth,
                height: 2,
                marginTop: 16,
                backgroundColor: NOIR.gold,
                boxShadow: `0 0 20px ${NOIR.gold}60`,
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      <FadeTransition type="in" durationFrames={10} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
