import { gsap } from 'gsap';
import type { HostState, LobbyState, PublicPlayer } from '../../../shared/protocol';
import { isLobbyState } from '../../../shared/protocol';
import { createPolicyTrack, updatePolicyTrack } from '../components/policy-track';
import { createElectionTracker, updateElectionTracker } from '../components/election-tracker';
import { createPlayerStrip, updatePlayerStrip } from '../components/player-strip';
import { send } from '../../connection';

let root: HTMLElement | null = null;
let goodTrackEl: HTMLElement | null = null;
let badTrackEl: HTMLElement | null = null;
let trackerEl: HTMLElement | null = null;
let stripEl: HTMLElement | null = null;
let roundEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let waitingEl: HTMLElement | null = null;
let entranceTl: gsap.core.Timeline | null = null;

function getPhaseLabel(state: HostState): string {
  if (state.subPhase === 'nomination-pending') return 'Nomination';
  if (state.subPhase === 'election-voting') return 'Voting';
  if (state.subPhase === 'policy-mayor-discard') return 'Mayor reviewing policies';
  if (state.subPhase === 'policy-chief-discard') return 'Chief reviewing policies';
  if (state.subPhase === 'policy-veto-propose') return 'Veto proposed';
  if (state.subPhase === 'policy-veto-response') return 'Awaiting veto response';
  if (state.subPhase === 'executive-power-pending') return 'Executive Power';
  if (state.subPhase === 'policy-peek-viewing') return 'Policy Peek';
  if (state.phase === 'role-reveal') return 'Role Reveal';
  return '';
}

const MAX_VISIBLE_WAITING = 4;

function getWaitingLabel(state: HostState): string {
  if (!state.waitingOnPlayerIds?.length) return '';
  const names = state.waitingOnPlayerIds
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];
  if (!names.length) return '';
  if (names.length <= MAX_VISIBLE_WAITING) {
    return `Waiting on ${names.join(', ')}`;
  }
  const visible = names.slice(0, MAX_VISIBLE_WAITING);
  return `Waiting on ${visible.join(', ')} +${names.length - MAX_VISIBLE_WAITING} more`;
}

export function mount(container: HTMLElement, state: HostState | LobbyState): void {
  if (isLobbyState(state)) return; // Never called for lobby — guard for type safety only

  root = document.createElement('div');
  root.className = 'game-board';

  // Header
  const header = document.createElement('div');
  header.className = 'board-header';

  // DEV: Reset button (localhost only)
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const resetBtn = document.createElement('button');
    resetBtn.style.background = 'rgba(168, 32, 32, 0.2)';
    resetBtn.style.color = 'var(--noir-blood-light)';
    resetBtn.style.border = '1px solid rgba(168, 32, 32, 0.3)';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.padding = '4px 10px';
    resetBtn.style.fontSize = 'var(--text-xs)';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.minHeight = '28px';
    resetBtn.style.minWidth = '28px';
    resetBtn.style.fontFamily = 'var(--font-display)';
    resetBtn.style.letterSpacing = '0.05em';
    resetBtn.textContent = 'DEV RESET';
    resetBtn.addEventListener('click', () => {
      send({ type: 'reset-to-lobby', payload: {} });
    });
    header.appendChild(resetBtn);
  }

  const headerLeft = document.createElement('div');
  headerLeft.className = 'board-header__left';

  roundEl = document.createElement('span');
  roundEl.className = 'board-header__round';
  headerLeft.appendChild(roundEl);

  statusEl = document.createElement('span');
  statusEl.className = 'board-header__status';
  headerLeft.appendChild(statusEl);

  header.appendChild(headerLeft);

  waitingEl = document.createElement('div');
  waitingEl.className = 'board-header__waiting';
  header.appendChild(waitingEl);

  root.appendChild(header);

  // Tracks area
  const tracks = document.createElement('div');
  tracks.className = 'board-tracks';

  const playerCount = state.players.length;

  goodTrackEl = createPolicyTrack({
    type: 'good',
    enacted: state.goodPoliciesEnacted,
    total: 5,
  });

  badTrackEl = createPolicyTrack({
    type: 'bad',
    enacted: state.badPoliciesEnacted,
    total: 6,
    playerCount,
  });

  trackerEl = createElectionTracker(state.electionTracker);

  tracks.appendChild(goodTrackEl);
  tracks.appendChild(trackerEl);
  tracks.appendChild(badTrackEl);
  root.appendChild(tracks);

  // Player strip
  stripEl = createPlayerStrip(state.players as PublicPlayer[], {
    waitingOnPlayerIds: state.waitingOnPlayerIds ?? [],
    investigatedPlayerIds: getInvestigatedPlayerIds(state),
  });
  root.appendChild(stripEl);

  container.appendChild(root);
  update(state);

  // Board entrance animation
  const tl = gsap.timeline();
  tl.from(root, { opacity: 0, duration: 0.6, ease: 'power2.out' })
    .from(header, { y: -30, opacity: 0, duration: 0.4, ease: 'power3.out' }, '-=0.3')
    .from(tracks, { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.2)' }, '-=0.2')
    .from(stripEl!, { y: 40, opacity: 0, duration: 0.4, ease: 'power3.out' }, '-=0.2');
  entranceTl = tl;
}

export function update(state: HostState | LobbyState): void {
  if (!root || isLobbyState(state)) return;

  if (roundEl) {
    roundEl.textContent = `Round ${state.round}`;
  }

  if (statusEl) {
    statusEl.textContent = getPhaseLabel(state);
  }

  if (waitingEl) {
    const waitingText = getWaitingLabel(state);
    waitingEl.textContent = waitingText;
    waitingEl.style.display = waitingText ? '' : 'none';
  }

  if (goodTrackEl) {
    updatePolicyTrack(goodTrackEl, {
      type: 'good',
      enacted: state.goodPoliciesEnacted,
      total: 5,
    });
  }

  if (badTrackEl) {
    updatePolicyTrack(badTrackEl, {
      type: 'bad',
      enacted: state.badPoliciesEnacted,
      total: 6,
      playerCount: state.players.length,
    });
  }

  if (trackerEl) {
    updateElectionTracker(trackerEl, state.electionTracker);
  }

  if (stripEl) {
    updatePlayerStrip(stripEl, state.players as PublicPlayer[], {
      waitingOnPlayerIds: state.waitingOnPlayerIds ?? [],
      investigatedPlayerIds: getInvestigatedPlayerIds(state),
    });
  }
}

export function unmount(): void {
  entranceTl?.kill();
  entranceTl = null;
  root?.remove();
  root = null;
  goodTrackEl = null;
  badTrackEl = null;
  trackerEl = null;
  stripEl = null;
  roundEl = null;
  statusEl = null;
  waitingEl = null;
}

function getInvestigatedPlayerIds(state: HostState): string[] {
  return (state.events ?? [])
    .filter((e) => e.type === 'investigation-result')
    .map((e) => (e as { targetId: string }).targetId);
}
