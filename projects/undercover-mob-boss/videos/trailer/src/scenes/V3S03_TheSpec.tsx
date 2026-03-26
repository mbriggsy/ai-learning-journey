import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DocumentScroll } from '../components/DocumentScroll';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

// Real spec excerpts from the project
const SPEC_LINES = [
  '# UNDERCOVER MOB BOSS — V1 SPECIFICATION',
  '',
  '## 1. Overview',
  '  Digital-physical social deduction party game.',
  '  1940s noir city infiltration theme.',
  '  Host device authoritative, phone-based player input.',
  '',
  '## 2. Architecture',
  '  | Component  | Technology       | Role             |',
  '  |------------|------------------|------------------|',
  '  | Client     | Vite + TS        | Browser PWA      |',
  '  | Server     | PartyKit         | Room authority   |',
  '  | Shared     | TypeScript       | Types + protocol |',
  '',
  '## 3. Game Engine',
  '  // State machine: 12 phases, 47 transitions',
  '  type GamePhase =',
  '    | "lobby"',
  '    | "role-reveal"',
  '    | "nomination"',
  '    | "election"',
  '    | "legislative"',
  '    | "policy-peek"',
  '    | "investigation"',
  '    | "special-nomination"',
  '    | "execution"',
  '    | "veto"',
  '    | "game-over"',
  '',
  '## 4. Role Assignment',
  '  // Cryptographic RNG for fair dealing',
  '  function assignRoles(playerCount: number): Role[] {',
  '    const deck = buildRoleDeck(playerCount);',
  '    return cryptoShuffle(deck);',
  '  }',
  '',
  '## 5. Policy Deck',
  '  // 6 virtuous + 11 corrupt = 17 policies',
  '  // Deck reshuffles when < 3 remain',
  '',
  '## 6. Executive Powers Matrix',
  '  | Players | Policy 1    | Policy 2      | Policy 3    |',
  '  |---------|-------------|---------------|-------------|',
  '  | 5-6     | —           | —             | Peek        |',
  '  | 7-8     | —           | Investigate   | Nominate    |',
  '  | 9-10    | Investigate | Investigate   | Nominate    |',
  '',
  '## 7. Win Conditions',
  '  // Citizens: 5 virtuous OR execute Mob Boss',
  '  // Mob: 6 corrupt OR elect Mob Boss as Commissioner',
  '',
  '## Phase Plans',
  '  Phase 0: Asset Generation .......... 1,288 lines',
  '  Phase 1: Game Engine ............... 1,205 lines',
  '  Phase 2: Multiplayer ............... 992 lines',
  '  Phase 3: Player View ............... 862 lines',
  '  Phase 4: Host Table View ........... 2,028 lines',
  '  Phase 5: Audio Polish .............. 1,262 lines',
  '  Phase 6: Deployment ................ 1,228 lines',
];

interface CounterProps {
  label: string;
  value: string;
  startFrame: number;
}

const Counter: React.FC<CounterProps> = ({ label, value, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame) return null;

  const scale = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 80 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 48,
          fontWeight: 'bold',
          color: NOIR.gold,
          textShadow: `0 0 20px ${NOIR.gold}60`,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          color: NOIR.cream,
          letterSpacing: '0.1em',
          marginTop: 4,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * S03 — The Spec (15s / 450f)
 * Spec text scrolls in background, counters pop in foreground.
 */
export const V3S03_TheSpec: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Scrolling spec text behind */}
      <AbsoluteFill style={{ opacity: 0.4 }}>
        <DocumentScroll lines={SPEC_LINES} scrollSpeed={3} fontSize={14} />
      </AbsoluteFill>

      {/* Counters overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 80,
            padding: '0 60px',
          }}
        >
          <Counter label="LINES OF SPEC" value="14,638" startFrame={60} />
          <Counter label="DOCUMENTS" value="28" startFrame={100} />
          <Counter label="PHASES" value="7" startFrame={140} />
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={15} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
