import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TerminalSimulation, type TerminalLine } from '../components/TerminalSimulation';
import { NOIR } from '../lib/colors';

const TERMINAL_LINES: TerminalLine[] = [
  { type: 'thinking', durationFrames: 25 },
  { type: 'code', text: 'This game was built in 8 nights.', delay: 5 },
  { type: 'blank' },
  { type: 'code', text: 'The human has a day job.', delay: 15 },
  { type: 'code', text: "The AI doesn't sleep.", delay: 12 },
];

/**
 * S08: The Reveal (8s / 240 frames)
 * Terminal types: "Built in 8 nights. The human has a day job. The AI doesn't sleep."
 * Audio: handled at Trailer level.
 */
export const S08_TheReveal: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      <AbsoluteFill style={{ padding: '120px 300px', justifyContent: 'center' }}>
        <TerminalSimulation
          lines={TERMINAL_LINES}
          typingSpeed={1.5}
          startFrame={15}
          fontSize={22}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
