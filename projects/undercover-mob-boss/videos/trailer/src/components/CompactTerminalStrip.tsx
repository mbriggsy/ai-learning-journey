import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { CODE, NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

interface TerminalLine {
  text: string;
  color?: string;
  frame: number;
}

interface TerminalPane {
  title: string;
  lines: TerminalLine[];
}

interface Props {
  panes: TerminalPane[];
  freezeFrame: number;
}

const CompactPaneHeader: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      backgroundColor: CODE.bgPanel,
      borderRadius: '4px 4px 0 0',
      borderBottom: `1px solid ${CODE.bg}`,
    }}
  >
    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#febc2e' }} />
    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#28c840' }} />
    <span style={{ marginLeft: 6, fontFamily: FONT_MONO, fontSize: 9, color: CODE.muted }}>
      {title}
    </span>
  </div>
);

export const CompactTerminalStrip: React.FC<Props> = ({ panes, freezeFrame }) => {
  const frame = useCurrentFrame();
  const effectiveFrame = Math.min(frame, freezeFrame);

  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 20px', height: '100%' }}>
      {panes.map((pane, pi) => (
        <div
          key={pi}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            opacity: interpolate(
              effectiveFrame,
              [pi * 8, pi * 8 + 12],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            ),
          }}
        >
          <CompactPaneHeader title={pane.title} />
          <div
            style={{
              flex: 1,
              backgroundColor: CODE.bg,
              padding: '6px 10px',
              borderRadius: '0 0 4px 4px',
              fontFamily: FONT_MONO,
              fontSize: 10,
              lineHeight: 1.4,
              overflow: 'hidden',
            }}
          >
            {pane.lines
              .filter((l) => effectiveFrame >= l.frame)
              .map((l, li) => {
                const isSuccess = l.text.startsWith('\u2713');
                return (
                  <div
                    key={li}
                    style={{
                      color: l.color ?? (isSuccess ? NOIR.green : CODE.text),
                      opacity: interpolate(
                        effectiveFrame - l.frame,
                        [0, 4],
                        [0, 1],
                        { extrapolateRight: 'clamp' },
                      ),
                    }}
                  >
                    {l.text}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};
