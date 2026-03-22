import './styles/base.css';
import './styles/animations.css';
import './styles/screens.css';
import './styles/components.css';

import { connect } from './connection';
import { setContainer, handleServerMessage, updateState, getState, registerView } from './state/store';
import { send } from './connection';
import { audioEngine } from './audio/audio-engine';
import { createTopBar, getEnvelopeButton } from './components/top-bar';
import { safeGetSession } from './safe-storage';

// ── Register all views ─────────────────────────────────────────────
import * as lobby from './views/lobby';
import * as roleReveal from './views/role-reveal';
import * as waiting from './views/waiting';
import * as vote from './views/vote';
import * as mayorNomination from './views/mayor-nomination';
import * as mayorHand from './views/mayor-hand';
import * as chiefHand from './views/chief-hand';
import * as vetoResponse from './views/veto-response';
import * as powerInvestigate from './views/power-investigate';
import * as powerNominate from './views/power-nominate';
import * as powerPeek from './views/power-peek';
import * as powerExecute from './views/power-execute';
import * as investigationResult from './views/investigation-result';
import * as spectator from './views/spectator';
import * as gameOver from './views/game-over';

registerView('lobby', lobby);
registerView('role-reveal', roleReveal);
registerView('waiting', waiting);
registerView('vote', vote);
registerView('mayor-nomination', mayorNomination);
registerView('mayor-hand', mayorHand);
registerView('chief-hand', chiefHand);
registerView('veto-response', vetoResponse);
registerView('power-investigate', powerInvestigate);
registerView('power-nominate', powerNominate);
registerView('power-peek', powerPeek);
registerView('power-execute', powerExecute);
registerView('investigation-result', investigationResult);
registerView('spectator', spectator);
registerView('game-over', gameOver);

// ── Initialize ─────────────────────────────────────────────────────

function init(): void {
  // Unlock audio on first user gesture (needed for nudge tones on player phones)
  audioEngine.initUnlock();

  const container = document.getElementById('app');
  if (!container) throw new Error('Missing #app container');

  // Create persistent top bar before the screen container
  const topBar = createTopBar();
  container.parentElement!.insertBefore(topBar, container);

  // Add padding to screen container so content doesn't overlap with fixed top bar
  container.style.paddingTop = '48px';

  setContainer(container);

  // Wire envelope button to toggle role peek
  const envBtn = getEnvelopeButton();
  if (envBtn) {
    envBtn.addEventListener('click', () => {
      const s = getState();
      updateState({ isRolePeekOpen: !s.isRolePeekOpen });
    });
  }

  // Trap Android back button
  window.history.pushState({ game: true }, '');
  window.addEventListener('popstate', (e) => {
    if (!(e.state as Record<string, unknown>)?.game) {
      window.history.pushState({ game: true }, '');
    }
  });

  // Get room code from URL or prompt
  const roomCode = getRoomCode();
  if (!roomCode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'screen-content';
    const h1 = document.createElement('h1');
    h1.textContent = 'No room code';
    const p = document.createElement('p');
    p.className = 'text-muted';
    p.textContent = 'Scan the QR code on the host screen or add ?room=XXXX to the URL.';
    wrapper.appendChild(h1);
    wrapper.appendChild(p);
    container.appendChild(wrapper);
    return;
  }

  // Auto-join with name or reconnect with session token
  const savedSession = safeGetSession('umb-session');
  const name = getPlayerName();

  // If no name and no saved session, show name entry screen
  if (!name && !savedSession) {
    showNameEntry(container, roomCode);
    return;
  }

  // Connect to PartyKit room — join fires on 'connected' status
  // (not a blind setTimeout, which races with the crossfade transition)
  connectAndJoin(roomCode, name, savedSession);
}

function connectAndJoin(roomCode: string, name: string | null, _savedSession: string | null): void {
  connect(roomCode, {
    onMessage: handleServerMessage,
    onStatusChange: (status) => {
      updateState({ connectionStatus: status });
      if (status === 'connected') {
        // Re-read session token on every reconnect — the initial savedSession
        // parameter is stale after PartySocket auto-reconnects (wifi blip).
        const currentSession = safeGetSession('umb-session');
        if (currentSession) {
          send({ type: 'join', payload: { name: name || 'Player', sessionToken: currentSession } });
        } else if (name) {
          send({ type: 'join', payload: { name } });
        }
      }
    },
  });
}

function showNameEntry(container: HTMLElement, roomCode: string): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen-content';
  wrapper.dataset.nameEntry = 'true'; // Used by store.ts to find/remove on join or re-enable on error
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '16px';
  wrapper.style.paddingTop = '20vh';

  const heading = document.createElement('h1');
  heading.textContent = 'Undercover Mob Boss';
  heading.style.fontSize = '1.5rem';
  heading.style.color = 'var(--noir-gold)';
  heading.style.textShadow = '0 0 20px rgba(201, 168, 76, 0.4), 0 2px 8px rgba(0, 0, 0, 0.9)';

  const sub = document.createElement('p');
  sub.textContent = `Room: ${roomCode}`;
  sub.style.color = 'var(--noir-cream)';
  sub.style.fontSize = '1rem';
  sub.style.letterSpacing = '0.1em';
  sub.style.textShadow = '0 0 12px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.8)';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 7;
  input.placeholder = 'Your name';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.dataset.testId = 'name-input';
  input.style.fontFamily = 'var(--font-display)';
  input.style.fontSize = '1.25rem';
  input.style.textAlign = 'center';
  input.style.padding = '12px 20px';
  input.style.borderRadius = '8px';
  input.style.border = '1px solid rgba(201, 168, 76, 0.3)';
  input.style.background = 'rgba(26, 26, 30, 0.8)';
  input.style.color = 'var(--noir-cream)';
  input.style.outline = 'none';
  input.style.width = '200px';
  input.style.letterSpacing = '0.05em';

  const joinBtn = document.createElement('button');
  joinBtn.className = 'action-btn';
  joinBtn.textContent = 'Join Game';
  joinBtn.dataset.testId = 'name-join-btn';
  joinBtn.disabled = true;

  // Status text — shows "Joining..." or error messages
  const statusEl = document.createElement('p');
  statusEl.dataset.joinStatus = 'true';
  statusEl.style.fontSize = '0.85rem';
  statusEl.style.color = 'var(--noir-muted, #888)';
  statusEl.style.minHeight = '1.2em';
  statusEl.textContent = '';

  input.addEventListener('input', () => {
    joinBtn.disabled = input.value.trim().length === 0;
    // Clear error status when user edits
    if (statusEl.textContent) statusEl.textContent = '';
  });

  const doJoin = () => {
    const trimmed = input.value.trim().slice(0, 7);
    if (!trimmed) return;
    joinBtn.disabled = true;
    input.disabled = true;
    statusEl.textContent = 'Joining\u2026';
    // Keep wrapper visible — store.ts will remove it on 'joined'
    // or re-enable it on 'error'.
    // Timeout: if no response in 10s (offline, server down), re-enable form
    setTimeout(() => {
      if (joinBtn.disabled && wrapper.isConnected) {
        joinBtn.disabled = false;
        input.disabled = false;
        statusEl.textContent = 'Could not connect. Try again.';
      }
    }, 10_000);
    // Re-init with the name in the URL so reconnect works
    const url = new URL(window.location.href);
    url.searchParams.set('name', trimmed);
    window.history.replaceState({}, '', url.toString());
    connectAndJoin(roomCode, trimmed, null);
  };

  joinBtn.addEventListener('click', doJoin);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) doJoin();
  });

  wrapper.appendChild(heading);
  wrapper.appendChild(sub);
  wrapper.appendChild(input);
  wrapper.appendChild(joinBtn);
  wrapper.appendChild(statusEl);
  container.appendChild(wrapper);

  // Auto-focus the input
  requestAnimationFrame(() => input.focus());
}

function getRoomCode(): string | null {
  const url = new URL(window.location.href);
  const pathMatch = url.pathname.match(/\/join\/([A-Za-z]{4})/);
  if (pathMatch) return pathMatch[1].toUpperCase();
  return url.searchParams.get('room')?.toUpperCase() ?? null;
}

function getPlayerName(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get('name');
}

// ── Start ──────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
