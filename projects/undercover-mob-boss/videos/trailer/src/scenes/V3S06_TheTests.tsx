import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MultiTerminal } from '../components/MultiTerminal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR, CODE } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

/**
 * S06 — The Tests (11s / 330f)
 * Multi-terminal: test results streaming in three panes.
 * After tests complete, big "NOTHING BROKE" drops.
 */
export const V3S06_TheTests: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "NOTHING BROKE" drops at frame 268 (after v3-nothing-broke audio starts)
  const nothingBrokeFrame = 268;
  const showPunchline = frame >= nothingBrokeFrame;

  const punchlineScale = showPunchline
    ? spring({
        fps,
        frame: frame - nothingBrokeFrame,
        config: { damping: 60, stiffness: 200 },
      })
    : 0;

  const panes = [
    {
      title: 'Unit Tests (526)',
      lines: [
        { text: '✓ game-engine: 47 transitions', color: NOIR.green, frame: 10 },
        { text: '✓ card-pool: shuffle + reshuffle', color: NOIR.green, frame: 18 },
        { text: '✓ roles: assignment + peek', color: NOIR.green, frame: 26 },
        { text: '✓ powers: investigate, peek, execute', color: NOIR.green, frame: 34 },
        { text: '✓ adversarial-rules-lawyer: 38 edge cases', color: NOIR.green, frame: 42 },
        { text: '✓ regression-fixes: 12 prior bugs', color: NOIR.green, frame: 50 },
        { text: '✓ sh-rules-gaps: 23 spec gaps', color: NOIR.green, frame: 58 },
        { text: '', frame: 66 },
        { text: '526 passed | 0 failed', color: NOIR.gold, frame: 70 },
      ],
    },
    {
      title: 'Integration (52)',
      lines: [
        { text: '✓ full-game: 10-player completion', color: NOIR.green, frame: 20 },
        { text: '✓ sh-invariants: deck integrity', color: NOIR.green, frame: 30 },
        { text: '✓ sh-scenarios: all win conditions', color: NOIR.green, frame: 40 },
        { text: '✓ sh-stress: rapid state transitions', color: NOIR.green, frame: 50 },
        { text: '', frame: 60 },
        { text: '52 passed | 0 failed', color: NOIR.gold, frame: 70 },
      ],
    },
    {
      title: 'E2E — Chaos (112)',
      lines: [
        { text: '✓ user-chaos: rage-tapping, back-button', color: NOIR.green, frame: 15 },
        { text: '✓ server-abuse: malformed payloads', color: NOIR.green, frame: 25 },
        { text: '✓ simultaneous-actions: race conditions', color: NOIR.green, frame: 35 },
        { text: '✓ session-recovery: disconnect/rejoin', color: NOIR.green, frame: 45 },
        { text: '✓ mobile: iOS scroll lock, viewport', color: NOIR.green, frame: 55 },
        { text: '✓ full-game-to-completion: 4 browsers', color: NOIR.green, frame: 65 },
        { text: '', frame: 75 },
        { text: '112 passed | 0 failed', color: NOIR.gold, frame: 80 },
      ],
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Terminal panes */}
      <AbsoluteFill
        style={{
          opacity: showPunchline ? 0.3 : 1,
          transition: 'opacity 0.3s',
        }}
      >
        <MultiTerminal panes={panes} />
      </AbsoluteFill>

      {/* "NOTHING BROKE" punchline */}
      {showPunchline && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 72,
              color: NOIR.green,
              letterSpacing: '0.15em',
              textShadow: `0 0 60px ${NOIR.green}80`,
              transform: `scale(${punchlineScale})`,
              opacity: punchlineScale,
            }}
          >
            NOTHING BROKE.
          </div>
        </AbsoluteFill>
      )}

      <FadeTransition type="in" durationFrames={10} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
