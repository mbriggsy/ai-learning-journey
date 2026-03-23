import React from 'react';
import { AbsoluteFill } from 'remotion';
import { NOIR } from '../lib/colors';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  dividerColor?: string;
}

/** Side-by-side split screen with a thin divider. */
export const SplitScreen: React.FC<Props> = ({
  left,
  right,
  dividerColor = NOIR.gold,
}) => {
  return (
    <AbsoluteFill style={{ flexDirection: 'row' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {left}
      </div>
      <div
        style={{
          width: 2,
          backgroundColor: dividerColor,
          alignSelf: 'stretch',
          boxShadow: `0 0 12px ${dividerColor}40`,
        }}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {right}
      </div>
    </AbsoluteFill>
  );
};
