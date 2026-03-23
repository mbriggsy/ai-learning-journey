import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { MultiTerminal } from '../components/MultiTerminal';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

const QA_PANES = [
  {
    title: 'QA Agent — Round 1',
    lines: [
      { text: '> Deploying QA audit...', frame: 10 },
      { text: '> 29 agents scanning codebase', frame: 25 },
      { text: '', frame: 35 },
      { text: '\u2713 C1: Phantom SubPhases', frame: 45, color: NOIR.green },
      { text: '\u2713 H1: PWA icons missing', frame: 55, color: NOIR.green },
      { text: '\u2713 H3: Player errors invisible', frame: 65, color: NOIR.green },
      { text: '\u2713 H5: Host dead end', frame: 75, color: NOIR.green },
      { text: '\u2713 M1: Focus styles', frame: 85, color: NOIR.green },
      { text: '\u2713 M7: Role-reveal z-index', frame: 95, color: NOIR.green },
      { text: '> 46 issues found. Fixing...', frame: 115 },
    ],
  },
  {
    title: 'QA Agent — Round 2',
    lines: [
      { text: '> Re-scanning after fixes...', frame: 50 },
      { text: '', frame: 60 },
      { text: '\u2713 Investigation data leak', frame: 75, color: NOIR.green },
      { text: '\u2713 Spam-click guard', frame: 85, color: NOIR.green },
      { text: '\u2713 Name-collision takeover', frame: 95, color: NOIR.green },
      { text: '\u2713 Session token grace', frame: 105, color: NOIR.green },
      { text: '\u2713 Dead code cleanup', frame: 115, color: NOIR.green },
      { text: '> 9 new issues. All fixed.', frame: 135 },
    ],
  },
  {
    title: 'QA Agent — Round 3',
    lines: [
      { text: '> Final verification pass...', frame: 90 },
      { text: '', frame: 100 },
      { text: '\u2713 CSS responsive audit', frame: 115, color: NOIR.green },
      { text: '\u2713 Connection banner', frame: 125, color: NOIR.green },
      { text: '\u2713 Error toast resilience', frame: 135, color: NOIR.green },
      { text: '\u2713 Lobby overflow fix', frame: 145, color: NOIR.green },
      { text: '', frame: 155 },
      { text: '> All code-fixable items resolved.', frame: 165 },
    ],
  },
];

/**
 * S12: The Audit (8s / 240 frames)
 * Three Claude Code terminals running QA simultaneously.
 * Issues appear and flip to green checkmarks.
 */
export const S12_TheAudit: React.FC = () => {
  const frame = useCurrentFrame();

  // "0 FUNCTIONAL DEFECTS" appears big at the end
  const resultOpacity = interpolate(frame, [185, 210], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Three terminal panes */}
      <MultiTerminal panes={QA_PANES} />

      {/* Big result overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 40,
          opacity: resultOpacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 28,
            color: NOIR.green,
            letterSpacing: '0.1em',
            textShadow: `0 0 20px ${NOIR.green}60`,
          }}
        >
          FUNCTIONAL DEFECTS: 0
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
