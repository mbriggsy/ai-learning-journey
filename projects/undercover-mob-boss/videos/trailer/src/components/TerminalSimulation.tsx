import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { CODE, NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';
import { tokenize, type Token } from '../lib/syntax';

// --- Types ---

export type TerminalLine =
  | { type: 'code'; text: string; delay?: number }
  | { type: 'output'; text: string; color?: string; delay?: number }
  | { type: 'success'; text: string; delay?: number }
  | { type: 'thinking'; durationFrames: number; delay?: number }
  | { type: 'blank' };

interface ComputedEntry {
  line: TerminalLine;
  startFrame: number;
  endFrame: number;
}

interface Props {
  lines: TerminalLine[];
  typingSpeed?: number; // characters per frame
  startFrame?: number;
  showHeader?: boolean;
  fontSize?: number;
}

// --- Timeline computation ---

function computeTimeline(
  lines: TerminalLine[],
  typingSpeed: number,
): ComputedEntry[] {
  const entries: ComputedEntry[] = [];
  let cursor = 0;

  for (const line of lines) {
    const delay = ('delay' in line ? line.delay : 0) ?? 0;
    cursor += delay;
    const start = cursor;

    let duration: number;
    switch (line.type) {
      case 'code':
        duration = Math.ceil(line.text.length / typingSpeed) + 5;
        break;
      case 'output':
      case 'success':
        duration = 8;
        break;
      case 'thinking':
        duration = line.durationFrames;
        break;
      case 'blank':
        duration = 8;
        break;
    }

    entries.push({ line, startFrame: start, endFrame: start + duration });
    cursor = start + duration;
  }

  return entries;
}

// --- Sub-components ---

const TerminalHeader: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
      backgroundColor: CODE.bgPanel,
      borderRadius: '8px 8px 0 0',
      borderBottom: `1px solid ${CODE.bg}`,
    }}
  >
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
    <div
      style={{
        marginLeft: 12,
        fontFamily: FONT_MONO,
        fontSize: 13,
        color: CODE.muted,
      }}
    >
      Claude Code
    </div>
  </div>
);

const CodeLine: React.FC<{ text: string; visibleChars: number }> = ({ text, visibleChars }) => {
  const visible = text.slice(0, visibleChars);
  const tokens = tokenize(visible);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <span style={{ color: CODE.muted, marginRight: 8 }}>&gt;</span>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color, whiteSpace: 'pre' }}>
          {t.text}
        </span>
      ))}
    </div>
  );
};

const SuccessLine: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <span style={{ color: NOIR.green, fontSize: '1.1em' }}>{'\u2713'}</span>
    <span style={{ color: NOIR.green }}>{text}</span>
  </div>
);

const OutputLine: React.FC<{ text: string; color?: string }> = ({ text, color }) => (
  <div style={{ color: color ?? CODE.text }}>{text}</div>
);

const ThinkingDots: React.FC<{ frame: number }> = ({ frame }) => {
  const dots = '.'.repeat((Math.floor(frame / 8) % 3) + 1);
  return (
    <div style={{ color: CODE.muted }}>
      <span style={{ marginRight: 8 }}>&gt;</span>
      Thinking{dots}
    </div>
  );
};

// --- Main component ---

export const TerminalSimulation: React.FC<Props> = ({
  lines,
  typingSpeed = 2,
  startFrame = 0,
  showHeader = true,
  fontSize = 16,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  const timeline = useMemo(
    () => computeTimeline(lines, typingSpeed),
    [lines, typingSpeed],
  );

  if (adjustedFrame < 0) return null;

  const visibleEntries = timeline.filter((e) => adjustedFrame >= e.startFrame);

  // Is the last visible entry still being typed?
  const lastEntry = visibleEntries[visibleEntries.length - 1];
  const isTyping = lastEntry && adjustedFrame < lastEntry.endFrame;
  const cursorVisible = isTyping && Math.floor(adjustedFrame / 15) % 2 === 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_MONO,
        fontSize,
        lineHeight: 1.6,
      }}
    >
      {showHeader && <TerminalHeader />}
      <div
        style={{
          flex: 1,
          backgroundColor: CODE.bg,
          padding: '16px 20px',
          borderRadius: showHeader ? '0 0 8px 8px' : 8,
          overflow: 'hidden',
        }}
      >
        {visibleEntries.map((entry, i) => {
          const { line } = entry;
          const localFrame = adjustedFrame - entry.startFrame;

          switch (line.type) {
            case 'code': {
              const chars = Math.min(
                Math.floor(localFrame * typingSpeed),
                line.text.length,
              );
              return <CodeLine key={i} text={line.text} visibleChars={chars} />;
            }
            case 'success':
              return <SuccessLine key={i} text={line.text} />;
            case 'output':
              return <OutputLine key={i} text={line.text} color={line.color} />;
            case 'thinking':
              return <ThinkingDots key={i} frame={localFrame} />;
            case 'blank':
              return <div key={i} style={{ height: fontSize * 1.6 }} />;
          }
        })}

        {/* Blinking cursor */}
        {cursorVisible && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: fontSize,
              backgroundColor: NOIR.amber,
              marginLeft: 2,
            }}
          />
        )}
      </div>
    </div>
  );
};
