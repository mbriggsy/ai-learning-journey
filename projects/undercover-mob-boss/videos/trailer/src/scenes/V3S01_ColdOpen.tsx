import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

/**
 * S01 — Cold Open (4s / 120f)
 * Black screen. Cursor blinks. Then the line types out.
 * "They didn't write a single line of code. Not one."
 * Minimal. Tension.
 */
export const V3S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // Cursor blinks for first 10 frames alone
  const cursorOnly = frame < 10;
  const cursorVisible = Math.floor(frame / 12) % 2 === 0;

  // Text types starting at frame 10
  const fullText = 'Briggsy didn\'t write a single line of code.';
  const secondLine = 'Not one.';
  const typingStart = 10;
  const typingSpeed = 1.8; // chars per frame

  const charsVisible = cursorOnly
    ? 0
    : Math.min(
        Math.floor((frame - typingStart) * typingSpeed),
        fullText.length,
      );

  const firstLineDone = charsVisible >= fullText.length;

  // Second line starts 20 frames after first completes
  const secondLineStart = typingStart + Math.ceil(fullText.length / typingSpeed) + 20;
  const secondChars = frame >= secondLineStart
    ? Math.min(
        Math.floor((frame - secondLineStart) * typingSpeed),
        secondLine.length,
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOIR.black,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 36,
          color: NOIR.cream,
          letterSpacing: '0.02em',
          lineHeight: 1.8,
          textAlign: 'center',
          maxWidth: 900,
        }}
      >
        <div>
          {fullText.slice(0, charsVisible)}
          {!firstLineDone && cursorVisible && (
            <span
              style={{
                display: 'inline-block',
                width: 3,
                height: 36,
                backgroundColor: NOIR.amber,
                marginLeft: 2,
                verticalAlign: 'text-bottom',
              }}
            />
          )}
        </div>
        {secondChars > 0 && (
          <div style={{ color: NOIR.gold, fontWeight: 'bold' }}>
            {secondLine.slice(0, secondChars)}
            {secondChars < secondLine.length && cursorVisible && (
              <span
                style={{
                  display: 'inline-block',
                  width: 3,
                  height: 36,
                  backgroundColor: NOIR.amber,
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                }}
              />
            )}
          </div>
        )}
        {/* Blinking cursor when nothing is typing */}
        {cursorOnly && cursorVisible && (
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 36,
              backgroundColor: NOIR.amber,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
