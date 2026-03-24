import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DocumentScroll } from '../components/DocumentScroll';
import { TextReveal } from '../components/TextReveal';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

// Excerpted from Phase 1 Game Engine plan — the most impressive sections
const PLAN_LINES = `# Phase 1: Game Engine

## Overview

Build the pure game rules engine with zero UI or networking
dependencies. The engine is a state machine that takes a
GameState + GameAction and returns the next GameState.

## Architecture: Pure Reducer Pattern

  function dispatch(state: GameState, action: GameAction): GameState

Every state change flows through dispatch().
This is maximally testable.

  export function dispatch(state: GameState, action: GameAction): GameState {
    const base = { ...state, events: [] as GameEvent[] };
    const error = validateAction(base, action);
    if (error) {
      throw new InvalidActionError(error, base.phase, base.subPhase, action.type);
    }
    switch (action.type) {
      case 'start-game':       return handleStartGame(base);
      case 'acknowledge-role': return handleAcknowledgeRole(base, action);
      case 'nominate':         return handleNominate(base, action);
      case 'vote':             return handleVote(base, action);
      case 'mayor-discard':    return handleMayorDiscard(base, action);
      case 'commissioner-discard':    return handleCommissionerDiscard(base, action);
      case 'propose-veto':     return handleProposeVeto(base);
      case 'veto-response':    return handleVetoResponse(base, action);
      case 'investigate':      return handleInvestigate(base, action);
      case 'special-nominate': return handleSpecialNominate(base, action);
      case 'execute':          return handleExecute(base, action);
      default:                 return assertNever(action);
    }
  }

## GameAction Union

  type GameAction =
    | { type: 'start-game' }
    | { type: 'acknowledge-role'; playerId: string }
    | { type: 'nominate'; targetId: string }
    | { type: 'vote'; playerId: string; vote: 'approve' | 'block' }
    | { type: 'mayor-discard'; cardIndex: number }
    | { type: 'commissioner-discard'; cardIndex: number }
    | { type: 'propose-veto' }
    | { type: 'veto-response'; approved: boolean }
    | { type: 'investigate'; targetId: string }
    | { type: 'special-nominate'; targetId: string }
    | { type: 'execute'; targetId: string }

## Phase Transitions

| From Phase      | Trigger              | To Phase         |
|-----------------|----------------------|------------------|
| lobby           | start-game           | role-reveal      |
| role-reveal     | last acknowledge     | nomination       |
| nomination      | nominate             | election         |
| election        | approved             | policy-session   |
| election        | blocked, tracker < 3 | nomination       |
| election        | blocked, tracker = 3 | auto-enact       |
| policy-session  | commissioner-discard        | check win/power  |
| executive-power | power action         | nomination       |
| any             | win condition        | game-over        |

## Role Distribution

| Players | Citizens | Mob Soldiers | Mob Boss |
|---------|----------|--------------|----------|
| 5       | 3        | 1            | 1        |
| 6       | 4        | 1            | 1        |
| 7       | 4        | 2            | 1        |
| 8       | 5        | 2            | 1        |
| 9       | 5        | 3            | 1        |
| 10      | 6        | 3            | 1        |

## Win Conditions

  Citizens win:
    - 5 good policies enacted
    - Mob Boss executed

  Mob wins:
    - 6 bad policies enacted
    - Mob Boss elected Commissioner after 3+ bad policies

## Executive Powers Board

| Bad Policies | 5-6 Players   | 7-8 Players       | 9-10 Players      |
|--------------|---------------|--------------------|--------------------|
| 1            | —             | —                  | Investigate        |
| 2            | —             | Investigate        | Investigate        |
| 3            | Policy Peek   | Special Nomination | Special Nomination |
| 4            | Execution     | Execution          | Execution          |
| 5            | Execution     | Execution          | Execution          |

## Policy Deck

  6 good + 11 bad = 17 cards
  Shuffle at game start
  Reshuffle when deck < threshold (random 3-7)

  function createDeck(): PolicyType[] {
    return shuffle([
      ...Array(6).fill('good'),
      ...Array(11).fill('bad'),
    ]);
  }

## State Projection (Security)

  NEVER sent to clients:
    - policyDeck
    - player.role (other players)
    - player.knownAllies (other players)
    - investigationResults (other players)

  function projectForPlayer(state, playerId): ProjectedState {
    return {
      phase: state.phase,
      subPhase: state.subPhase,
      round: state.round,
      players: state.players.map(p => projectPlayer(p)),
      goodPolicies: state.goodPoliciesEnacted,
      badPolicies: state.badPoliciesEnacted,
      electionTracker: state.electionTracker,
      // YOUR role only
      myRole: state.players.find(p => p.id === playerId)?.role,
    };
  }

## Acceptance Criteria

  - All 11 action types dispatch correctly
  - Win conditions fire at exactly the right moment
  - Role distribution matches table for 5-10 players
  - Deck reshuffles at random threshold
  - Executive powers activate at correct bad policy counts
  - Term limits prevent consecutive Mayor/Commissioner
  - Election tracker auto-enacts at 3 failed votes
  - Veto power unlocks after 5 bad policies
  - 80%+ code coverage in Vitest
`.split('\n');

/**
 * S10: The Blueprint (12s / 360 frames)
 * Phase 1 plan scrolling fast. Dense. Overwhelming. Beautiful.
 * Text overlay: "7 PHASE PLANS. 10,000 LINES."
 */
export const S10_TheBlueprint: React.FC = () => {
  const frame = useCurrentFrame();

  // Overlay text fades in at frame 240
  const overlayOpacity = interpolate(frame, [240, 270], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Scrolling plan document */}
      <DocumentScroll lines={PLAN_LINES} scrollSpeed={5} fontSize={14} />

      {/* Overlay: "7 PHASE PLANS. 10,000 LINES." */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: overlayOpacity,
        }}
      >
        <div
          style={{
            padding: '30px 60px',
            backgroundColor: 'rgba(10,10,12,0.85)',
            borderRadius: 12,
            border: `1px solid ${NOIR.gold}40`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 48,
              color: NOIR.gold,
              letterSpacing: '0.12em',
              textAlign: 'center',
              textShadow: `0 0 30px ${NOIR.gold}40`,
            }}
          >
            7 PHASE PLANS
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 56,
              color: NOIR.gold,
              letterSpacing: '0.15em',
              textAlign: 'center',
              marginTop: 8,
              textShadow: `0 0 30px ${NOIR.gold}40`,
            }}
          >
            10,000 LINES
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
