import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DocumentScroll } from '../components/DocumentScroll';
import { TextReveal } from '../components/TextReveal';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

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

/**
 * S03 — The Spec
 * Spec text scrolls in background. Text overlays: "the machine wrote it all."
 * Counters moved to S04 (the "what survived" payoff).
 */
export const V3S03_TheSpec: React.FC = () => {
  const frame = useCurrentFrame();

  // Text beat: "EVERY PHASE. EVERY EDGE CASE." — appears mid-scene
  const subtitleOpacity = interpolate(
    frame,
    [180, 200],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const subtitleFade = interpolate(
    frame,
    [400, 420],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Scrolling spec text behind — prominent, filling the screen */}
      <AbsoluteFill style={{ opacity: 0.7 }}>
        <DocumentScroll lines={SPEC_LINES} scrollSpeed={5} fontSize={16} />
      </AbsoluteFill>

      {/* Subtle gradient just behind the overlay text */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 30%, ${NOIR.black}99 48%, ${NOIR.black}99 52%, transparent 70%)`,
        }}
      />

      {/* Text overlays */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextReveal
          text="THE MACHINE WROTE IT ALL."
          startFrame={40}
          durationFrames={25}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 52,
            color: NOIR.gold,
            letterSpacing: '0.12em',
            textShadow: `0 0 40px ${NOIR.gold}60`,
          }}
        />

        {frame >= 180 && (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              color: NOIR.cream,
              letterSpacing: '0.08em',
              marginTop: 20,
              opacity: subtitleOpacity * subtitleFade,
            }}
          >
            Every phase. Every transition. Every edge case.
          </div>
        )}
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={15} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
