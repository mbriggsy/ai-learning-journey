// ── Narrator Bridge ────────────────────────────────────────────────
// Maps HostState phase/subPhase transitions to narrator audio cues.
// Imported by host-app.ts — only the host device plays narrator audio.

import type { HostState, LobbyState } from '../../shared/protocol';
import { isLobbyState } from '../../shared/protocol';
import { audioEngine } from './audio-engine';
import { narrator } from './narrator';
import { ambientMusic } from './ambient';

// ── State Tracking ──────────────────────────────────────────────────

let prevPhase: string | null = null;
let prevSubPhase: string | null = null;
let prevRound = 0;
let prevGoodPolicies = 0;
let prevBadPolicies = 0;
let prevElectionTracker = 0;
let prevExecutivePower: string | null = null;
let prevEventsLength = 0;
let initialized = false;

// ── Initialization ──────────────────────────────────────────────────

/**
 * Initialize audio engine and set up narrator ↔ ambient ducking.
 * Call once from host-app init.
 */
export function initNarratorBridge(): void {
  if (initialized) return;
  initialized = true;

  audioEngine.initUnlock();
  audioEngine.initVisibilityResume();

  // Duck ambient music when narrator speaks
  narrator.onNarratorStart = () => ambientMusic.duck();
  narrator.onNarratorEnd = () => ambientMusic.unduck();
}

// ── State-Driven Narrator Cues ──────────────────────────────────────

/**
 * Called on every HostState update. Compares against previous state
 * to determine which narrator lines to enqueue.
 */
export function onHostStateUpdate(state: HostState | LobbyState): void {
  // No audio cues during lobby — but track phase so intro triggers on transition
  if (isLobbyState(state)) {
    prevPhase = 'lobby';
    return;
  }

  const { phase, subPhase, round, goodPoliciesEnacted, badPoliciesEnacted, electionTracker, winner } = state;

  // ── Phase transitions ──────────────────────────────────────────

  // Role reveal — play intro when entering from lobby
  if (phase === 'role-reveal' && prevPhase === 'lobby') {
    narrator.enqueue('intro');
    void narrator.preloadPhase('role-reveal');
    void ambientMusic.start().catch(() => {});
  }

  // New round — play round-start line (includes round 1 after role-reveal)
  if (((round !== prevRound) || prevPhase === 'role-reveal') && round > 0 && phase !== 'lobby' && phase !== 'role-reveal') {
    narrator.enqueue('round-start', round);
    void narrator.preloadPhase('nomination');
  }

  // ── Sub-phase transitions ──────────────────────────────────────

  // Nomination
  if (subPhase === 'nomination-pending' && prevSubPhase !== 'nomination-pending') {
    narrator.enqueue('nomination');
    void narrator.preloadPhase('election');
  }

  // Voting opens
  if (subPhase === 'election-voting' && prevSubPhase !== 'election-voting') {
    narrator.enqueue('vote-open');
  }

  // Election result
  if (subPhase === 'election-result' && prevSubPhase !== 'election-result') {
    narrator.enqueue('vote-reveal');
  }

  // ── Policy enactment ───────────────────────────────────────────

  if (subPhase === 'policy-enact' && prevSubPhase !== 'policy-enact') {
    if (goodPoliciesEnacted > prevGoodPolicies) {
      narrator.enqueue('good-policy');
    } else if (badPoliciesEnacted > prevBadPolicies) {
      narrator.enqueue('bad-policy');
    }
    void narrator.preloadPhase('policy-session');
  }

  // Auto-enact
  if (subPhase === 'auto-enact' && prevSubPhase !== 'auto-enact') {
    narrator.enqueue('auto-enact');
  }

  // ── Election tracker ───────────────────────────────────────────

  if (electionTracker > prevElectionTracker && electionTracker > 0) {
    // Blocked vote advanced the tracker
    if (prevSubPhase === 'election-result') {
      narrator.enqueue('blocked');
    }
    narrator.enqueue('tracker-advance');
  } else if (electionTracker === 0 && prevSubPhase === 'election-result') {
    // Election passed — tracker at 0 (either reset from >0 or first-attempt pass)
    narrator.enqueue('approved');
  }

  // ── Veto ───────────────────────────────────────────────────────

  if (subPhase === 'policy-veto-propose' && prevSubPhase !== 'policy-veto-propose') {
    narrator.enqueue('veto-proposed');
  }

  // Veto result: if we leave veto-response, check what happened
  if (prevSubPhase === 'policy-veto-response' && subPhase !== 'policy-veto-response') {
    // If tracker advanced, veto was approved (policies discarded)
    if (electionTracker > prevElectionTracker || subPhase === 'nomination-pending') {
      narrator.enqueue('veto-approved');
    } else if (subPhase === 'policy-chief-discard') {
      narrator.enqueue('veto-rejected');
    }
  }

  // ── Executive powers ───────────────────────────────────────────

  if ((subPhase === 'executive-power-pending' || subPhase === 'policy-peek-viewing') &&
      prevSubPhase !== 'executive-power-pending' && prevSubPhase !== 'policy-peek-viewing') {
    void narrator.preloadPhase('executive-power');
    switch (state.executivePower) {
      case 'investigate':
        narrator.enqueue('investigate');
        break;
      case 'special-nomination':
        narrator.enqueue('special-nomination');
        break;
      case 'execution':
        narrator.enqueue('execution');
        break;
      case 'policy-peek':
        narrator.enqueue('policy-peek');
        break;
    }
  }

  // Player executed — fires when leaving executive-power phase after execution
  // (but NOT when the game ends, since game-over has its own narrator lines)
  if (
    prevSubPhase === 'executive-power-pending' &&
    subPhase !== 'executive-power-pending' &&
    prevExecutivePower === 'execution' &&
    phase !== 'game-over'
  ) {
    narrator.enqueue('executed');
  }

  // ── Deck reshuffle (from events array) ────────────────────────

  if (state.events.length > prevEventsLength) {
    const newEvents = state.events.slice(prevEventsLength);
    for (const evt of newEvents) {
      if (evt.type === 'deck-reshuffled') {
        narrator.enqueue('deck-reshuffle');
      }
    }
  }

  // ── Game over ──────────────────────────────────────────────────

  if (phase === 'game-over' && prevPhase !== 'game-over' && winner) {
    void narrator.preloadPhase('game-over');
    switch (state.winReason) {
      case '5 good policies enacted':
        narrator.enqueue('citizens-win-policy');
        break;
      case 'Mob Boss executed':
        narrator.enqueue('mob-boss-executed');
        narrator.enqueue('citizens-win-execution');
        break;
      case '6 bad policies enacted':
        narrator.enqueue('mob-wins-policy');
        break;
      case 'Mob Boss elected Chief after 3+ bad policies':
        narrator.enqueue('mob-wins-election');
        break;
    }
  }

  // ── Ambient tension ────────────────────────────────────────────

  if (badPoliciesEnacted !== prevBadPolicies) {
    ambientMusic.setTension(badPoliciesEnacted);
  }

  // ── Save previous state ────────────────────────────────────────

  prevPhase = phase;
  prevSubPhase = subPhase;
  prevRound = round;
  prevGoodPolicies = goodPoliciesEnacted;
  prevBadPolicies = badPoliciesEnacted;
  prevElectionTracker = electionTracker;
  prevExecutivePower = state.executivePower;
  prevEventsLength = state.events.length;
}

