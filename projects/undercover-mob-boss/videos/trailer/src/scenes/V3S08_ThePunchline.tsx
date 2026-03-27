import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

/**
 * S08 — The Punchline (12.3s / 370f)
 * Two-column stats cascade → zeros pile up → "He's fine. Probably."
 *
 * Audio timeline within scene:
 *   0+15: v3-human (261f) — "The human's contribution?..."
 *   0+296: v3-fine (57f) — "He's fine. Probably."
 */

interface StatRow {
  label: string;
  value: number;
}

// Left column: the impressive numbers
const LEFT_STATS: StatRow[] = [
  { label: 'LINES OF SPEC', value: 14638 },
  { label: 'DOCUMENTS', value: 28 },
  { label: 'LINES OF CODE', value: 15440 },
  { label: 'LINES OF TEST CODE', value: 17494 },
  { label: 'TESTS PASSING', value: 1331 },
  { label: 'AI-GENERATED ASSETS', value: 157 },
  { label: 'CUPS OF COFFEE', value: 347 },
];

// Right column: the comedy escalation → zeros
const RIGHT_STATS: StatRow[] = [
  { label: 'HOURS OF SLEEP LOST', value: 163 },
  { label: 'JIRA TICKETS', value: 0 },
  { label: 'PROJECT MANAGERS', value: 0 },
  { label: 'STACK OVERFLOW VISITS', value: 0 },
  { label: 'GAME DEV EXPERIENCE (YRS)', value: 0 },
  { label: 'MEETINGS SCHEDULED', value: 0 },
  { label: 'CODE WRITTEN BY BRIGGSY', value: 0 },
];

const STAGGER = 22; // frames between each stat — slower for readability
const START_FRAME = 10;

const StatColumn: React.FC<{
  stats: StatRow[];
  globalIndexOffset: number;
}> = ({ stats, globalIndexOffset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
      }}
    >
      {stats.map((stat, i) => {
        const globalIndex = globalIndexOffset + i;
        const itemStart = START_FRAME + globalIndex * STAGGER;
        const adjustedFrame = frame - itemStart;
        if (adjustedFrame < 0) return null;

        const entryScale = spring({
          fps,
          frame: adjustedFrame,
          config: { damping: 80 },
        });

        const countProgress = interpolate(
          adjustedFrame,
          [0, 25],
          [0, 1],
          { extrapolateRight: 'clamp' },
        );

        const displayValue = Math.round(stat.value * countProgress);
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
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 24,
                color: isZero ? NOIR.muted : NOIR.cream,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 36,
                fontWeight: 'bold',
                color: NOIR.gold,
                textShadow: isZero
                  ? `0 0 25px ${NOIR.gold}90`
                  : 'none',
                minWidth: 60,
                textAlign: 'right',
              }}
            >
              {displayValue.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const V3S08_ThePunchline: React.FC = () => {
  const frame = useCurrentFrame();

  // "He's fine." at frame 296, then "Probably." at frame 376 (45f comedic beat)
  const hesFineFrame = 296;
  const hesFineOpacity = interpolate(
    frame,
    [hesFineFrame, hesFineFrame + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const probablyFrame = 371;
  const probablyOpacity = interpolate(
    frame,
    [probablyFrame, probablyFrame + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Two-column stats cascade */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: interpolate(frame, [START_FRAME, START_FRAME + 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 40,
            padding: '0 40px',
            width: '100%',
            maxWidth: 1200,
          }}
        >
          <StatColumn stats={LEFT_STATS} globalIndexOffset={0} />
          <StatColumn stats={RIGHT_STATS} globalIndexOffset={7} />
        </div>
      </AbsoluteFill>

      {/* "He's fine." — then long beat — "Probably." */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 40,
        }}
      >
        {frame >= hesFineFrame && (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              color: NOIR.muted,
              fontStyle: 'italic',
              letterSpacing: '0.06em',
              opacity: hesFineOpacity,
            }}
          >
            He&apos;s fine.{frame >= probablyFrame && (
              <span style={{ opacity: probablyOpacity }}> Probably.</span>
            )}
          </div>
        )}
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={10} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
