import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CODE, NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

interface TerminalPane {
  title: string;
  lines: Array<{ text: string; color?: string; frame: number }>;
}

interface Props {
  panes: TerminalPane[];
}

const PaneHeader: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      backgroundColor: CODE.bgPanel,
      borderRadius: '6px 6px 0 0',
      borderBottom: `1px solid ${CODE.bg}`,
    }}
  >
    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#febc2e' }} />
    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#28c840' }} />
    <span style={{ marginLeft: 8, fontFamily: FONT_MONO, fontSize: 11, color: CODE.muted }}>
      {title}
    </span>
  </div>
);

/**
 * Multiple Claude Code terminal windows side-by-side.
 * Each pane has its own timeline of appearing lines.
 */
export const MultiTerminal: React.FC<Props> = ({ panes }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ flexDirection: 'row', gap: 8, padding: '40px 24px' }}>
      {panes.map((pane, pi) => (
        <div
          key={pi}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            opacity: interpolate(frame, [pi * 10, pi * 10 + 15], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <PaneHeader title={pane.title} />
          <div
            style={{
              flex: 1,
              backgroundColor: CODE.bg,
              padding: '10px 14px',
              borderRadius: '0 0 6px 6px',
              fontFamily: FONT_MONO,
              fontSize: 13,
              lineHeight: 1.6,
              overflow: 'hidden',
            }}
          >
            {pane.lines
              .filter((l) => frame >= l.frame)
              .map((l, li) => {
                const isSuccess = l.text.startsWith('\u2713');
                return (
                  <div
                    key={li}
                    style={{
                      color: l.color ?? (isSuccess ? NOIR.green : CODE.text),
                      opacity: interpolate(
                        frame - l.frame,
                        [0, 5],
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
    </AbsoluteFill>
  );
};
