// ── Narrator Bridge ────────────────────────────────────────────────
// Maps HostState phase/subPhase transitions to narrator audio cues.
// Imported by host-app.ts — only the host device plays narrator audio.

import type { HostState, LobbyState } from '../../shared/protocol';
import type { Phase, SubPhase, ExecutivePower } from '../../shared/types';
import { isLobbyState } from '../../shared/protocol';
import { audioEngine } from './audio-engine';
import { narrator } from './narrator';
import { ambientMusic } from './ambient';
import { preloadAllCardImages } from '../utils/card-assets';
import { selectNarratorPool, mulberry32 } from './narrator-pool';

// ── State Tracking ──────────────────────────────────────────────────

let prevPhase: Phase | null = null;
let prevSubPhase: SubPhase | null = null;
let prevRound = 0;
let prevGoodPolicies = 0;
let prevBadPolicies = 0;
let prevElectionTracker = 0;
let prevExecutivePower: ExecutivePower | null = null;
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
    // Clean up narrator on game-over → lobby (new game cycle)
    if (prevPhase === 'game-over') {
      narrator.dispose(); // Clears buffer cache + selection to prevent memory leak
    }
    prevPhase = 'lobby';
    return;
  }

  const { phase, subPhase, round, goodPoliciesEnacted, badPoliciesEnacted, electionTracker, winner } = state;

  // ── Phase transitions ──────────────────────────────────────────

  // Role reveal — select narrator pool and play intro when entering from lobby
  if (phase === 'role-reveal' && prevPhase === 'lobby') {
    // Select variant pool for this game session (seeded for reproducibility)
    const seed = Date.now();
    const selection = selectNarratorPool(mulberry32(seed));
    narrator.setGameSelection(selection);

    narrator.enqueue('intro');
    void narrator.preloadPhase('role-reveal');
    void ambientMusic.start().catch(() => {});
    preloadAllCardImages();
  }

  // ── Veto (cause narration BEFORE consequences) ────────────────

  let vetoHandled = false;

  if (subPhase === 'policy-veto-propose' && prevSubPhase !== 'policy-veto-propose') {
    narrator.enqueue('veto-proposed');
  }

  // Veto result: if we leave veto-response, check what happened
  if (prevSubPhase === 'policy-veto-response' && subPhase !== 'policy-veto-response') {
    if (electionTracker > prevElectionTracker || subPhase === 'nomination-pending') {
      narrator.enqueue('veto-approved');
      narrator.enqueue('tracker-advance');
      vetoHandled = true;
    } else if (subPhase === 'policy-commissioner-discard') {
      narrator.enqueue('veto-rejected');
    }
  }

  // ── Election result — narrate immediately on entry (plays during vote reveal overlay)

  if (!vetoHandled && subPhase === 'election-result' && prevSubPhase !== 'election-result' && state.votes) {
    const approveCount = Object.values(state.votes).filter((v) => v === 'approve').length;
    const blockCount = Object.values(state.votes).filter((v) => v === 'block').length;
    if (approveCount > blockCount) {
      narrator.enqueue('approved');
    } else {
      narrator.enqueue('blocked');
      narrator.enqueue('tracker-advance');
    }
  }

  // ── Round start ──────────────────────────────────────────────────

  // Round start — skipped; round number visible in board header, keeps pace snappy
  if (((round !== prevRound) || prevPhase === 'role-reveal') && round > 0 && phase !== 'lobby' && phase !== 'role-reveal') {
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
      case 'Mob Boss elected Commissioner after 3+ bad policies':
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
