import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

interface StatItem {
  label: string;
  value: number;
  suffix?: string; // e.g. "/ 209"
}

interface Props {
  stats: StatItem[];
  startFrame?: number;
  staggerFrames?: number; // delay between each stat appearing
}

/** Rolling counter display for stats. */
export const StatsCounter: React.FC<Props> = ({
  stats,
  startFrame = 0,
  staggerFrames = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '40px 80px',
      }}
    >
      {stats.map((stat, i) => {
        const itemStart = startFrame + i * staggerFrames;
        const adjustedFrame = frame - itemStart;
        if (adjustedFrame < 0) return null;

        const entryScale = spring({
          fps,
          frame: adjustedFrame,
          config: { damping: 80 },
        });

        const countProgress = interpolate(
          adjustedFrame,
          [0, 30],
          [0, 1],
          { extrapolateRight: 'clamp' },
        );

        const displayValue = Math.round(stat.value * countProgress);

        // Zero values get gold glow
        const isZero = stat.value === 0 && countProgress > 0;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              transform: `scale(${entryScale})`,
              opacity: entryScale,
            }}
          >
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 28,
                color: NOIR.cream,
                letterSpacing: '0.08em',
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 40,
                fontWeight: 'bold',
                color: isZero ? NOIR.gold : NOIR.gold,
                textShadow: isZero
                  ? `0 0 20px ${NOIR.gold}80`
                  : 'none',
              }}
            >
              {displayValue.toLocaleString()}
              {stat.suffix ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};
