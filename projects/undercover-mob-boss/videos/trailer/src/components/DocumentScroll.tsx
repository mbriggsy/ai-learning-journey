import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CODE, NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

interface Props {
  /** Lines of document text to scroll */
  lines: string[];
  /** Pixels scrolled per frame */
  scrollSpeed?: number;
  fontSize?: number;
}

/**
 * Fast-scrolling document — renders dense text flying upward
 * like film credits, but for technical documentation.
 */
export const DocumentScroll: React.FC<Props> = ({
  lines,
  scrollSpeed = 4,
  fontSize = 13,
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const lineHeight = fontSize * 1.5;
  const totalHeight = lines.length * lineHeight;

  // Start from below the viewport, scroll upward
  const scrollY = height - frame * scrollSpeed;

  // Dim overlay at top and bottom for depth
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: scrollY,
          fontFamily: FONT_MONO,
          fontSize,
          lineHeight: `${lineHeight}px`,
          whiteSpace: 'pre',
          color: CODE.text,
        }}
      >
        {lines.map((line, i) => {
          // Syntax-style coloring for visual interest
          const isHeading = line.startsWith('#');
          const isCode = line.startsWith('  ') || line.startsWith('\t');
          const isTable = line.includes('|');
          const isComment = line.trimStart().startsWith('//');
          const isEmpty = line.trim() === '';

          let color: string = CODE.text;
          if (isHeading) color = NOIR.gold;
          else if (isComment) color = CODE.comment;
          else if (isCode) color = CODE.variable;
          else if (isTable) color = CODE.type;
          else if (isEmpty) color = 'transparent';

          return (
            <div key={i} style={{ color, opacity: isHeading ? 1 : 0.8 }}>
              {line || ' '}
            </div>
          );
        })}
      </div>

      {/* Top fade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(${NOIR.black}, transparent)`,
          pointerEvents: 'none',
        }}
      />
      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(transparent, ${NOIR.black})`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
