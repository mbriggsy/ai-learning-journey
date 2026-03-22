import './styles/host-base.css';
import './styles/board.css';
import './styles/animations.css';
import './styles/overlays.css';

import { gsap } from 'gsap';
import type { HostState, LobbyState, ServerMessage } from '../../shared/protocol';
import { isLobbyState } from '../../shared/protocol';
import type { HostViewState, HostScreenId, HostOverlayId } from './host-router';
import { getHostView } from './host-router';
import { connect, send } from '../connection';
import { initNarratorBridge, onHostStateUpdate } from '../audio/narrator-bridge';
import { audioEngine } from '../audio/audio-engine';
import { generateRoomCode } from '../../shared/room-code';
import { safeGetSession, safeSetSession } from '../safe-storage';

import * as lobbyScreen from './screens/lobby';
import * as gameBoardScreen from './screens/game-board';

// Overlay modules (formerly full screens — now render on top of the board)
import * as nominationOverlay from './screens/nomination';
import * as electionResultsOverlay from './screens/election-results';
import * as policyEnactedOverlay from './screens/policy-enacted';
import * as autoEnactOverlay from './screens/auto-enact';
import * as executivePowerOverlay from './screens/executive-power';
import * as gameOverOverlay from './screens/game-over';
import { createOverlay, removeOverlay, type SimpleOverlayId } from './components/overlays';

// ── Module Interfaces ───────────────────────────────────────────

/** Base screens (lobby + game-board) may receive LobbyState during lobby phase */
interface ScreenModule {
  mount(container: HTMLElement, state: HostState | LobbyState): void;
  update(state: HostState | LobbyState): void;
  unmount(): void;
}

/** Overlay modules are only shown during gameplay — always receive HostState */
interface OverlayModule {
  mount(container: HTMLElement, state: HostState): void;
  update(state: HostState): void;
  unmount(): void;
}

// ── Screen Registry (only base screens) ─────────────────────────

const screens: Record<HostScreenId, ScreenModule> = {
  'lobby': lobbyScreen,
  'game-board': gameBoardScreen,
};

// ── Stateful Overlay Registry ───────────────────────────────────

const overlayModules: Partial<Record<HostOverlayId, OverlayModule>> = {
  'nomination': nominationOverlay,
  'election-results': electionResultsOverlay,
  'policy-enacted': policyEnactedOverlay,
  'auto-enact': autoEnactOverlay,
  'executive-power': executivePowerOverlay,
  'game-over': gameOverOverlay,
};

// Simple overlays (no state management) — handled by createOverlay/removeOverlay
const SIMPLE_OVERLAYS: Set<HostOverlayId> = new Set([
  'veto-proposed', 'veto-result', 'deck-reshuffled', 'policy-session-active', 'role-reveal-waiting',
]);

// ── State ───────────────────────────────────────────────────────

let hostState: HostState | LobbyState | null = null;
let currentView: HostViewState | null = null;
let currentScreenId: HostScreenId | null = null;
let screenContainer: HTMLElement | null = null;
let overlayContainer: HTMLElement | null = null;
let statusBanner: HTMLElement | null = null;
let activeOverlays: Set<HostOverlayId> = new Set();
let activeOverlayWrappers: Map<HostOverlayId, HTMLElement> = new Map();

// ── Overlay Management ──────────────────────────────────────────

function clearAllOverlays(): void {
  if (!overlayContainer) return;
  for (const id of activeOverlays) {
    if (SIMPLE_OVERLAYS.has(id)) {
      removeOverlay(overlayContainer, id as SimpleOverlayId);
    } else {
      const wrapper = activeOverlayWrappers.get(id);
      activeOverlayWrappers.delete(id);
      overlayModules[id]?.unmount();
      wrapper?.remove();
    }
  }
  activeOverlays.clear();
}

function syncOverlays(nextOverlays: HostOverlayId[]): void {
  if (!overlayContainer || !hostState) return;
  if (isLobbyState(hostState)) {
    clearAllOverlays();
    return;
  }

  const nextSet = new Set(nextOverlays);

  // Remove overlays no longer active
  for (const id of activeOverlays) {
    if (!nextSet.has(id)) {
      if (SIMPLE_OVERLAYS.has(id)) {
        removeOverlay(overlayContainer, id as SimpleOverlayId);
      } else {
        // Stateful overlay — fade out wrapper, then clean up
        const wrapper = activeOverlayWrappers.get(id);
        activeOverlayWrappers.delete(id);
        if (wrapper) {
          gsap.to(wrapper, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
              overlayModules[id]?.unmount();
              wrapper.remove();
            },
          });
        } else {
          overlayModules[id]?.unmount();
        }
      }
      activeOverlays.delete(id);
    }
  }

  // Add or update overlays
  for (const id of nextOverlays) {
    if (!activeOverlays.has(id)) {
      // New overlay
      if (SIMPLE_OVERLAYS.has(id)) {
        const el = createOverlay(id as SimpleOverlayId);
        overlayContainer.appendChild(el);
      } else {
        // Stateful overlay — create wrapper and mount module inside
        const wrapper = document.createElement('div');
        wrapper.className = 'host-overlay';
        wrapper.dataset.overlayId = id;
        wrapper.style.animation = 'none';
        if (id === 'game-over') {
          wrapper.classList.add('game-over-overlay');
        }
        const content = document.createElement('div');
        content.className = 'host-overlay__content';
        wrapper.appendChild(content);
        overlayContainer.appendChild(wrapper);
        gsap.from(wrapper, { y: -40, opacity: 0, duration: 0.35, ease: 'power3.out' });
        activeOverlayWrappers.set(id, wrapper);
        overlayModules[id]?.mount(content, hostState);
      }
      activeOverlays.add(id);
    } else if (!SIMPLE_OVERLAYS.has(id)) {
      // Existing stateful overlay — update it
      overlayModules[id]?.update(hostState);
    }
  }
}

// ── Server Message Handler ──────────────────────────────────────

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'joined':
      safeSetSession('umb-host-session', msg.payload.sessionToken);
      break;
    case 'state-update': {
      hideStatus();
      hostState = msg.payload;
      onHostStateUpdate(hostState);
      const nextView = getHostView(hostState);

      // Screen transitions (only lobby ↔ game-board)
      if (!currentScreenId || nextView.screen !== currentScreenId) {
        if (currentScreenId) {
          screens[currentScreenId].unmount();
        }
        if (screenContainer) {
          while (screenContainer.firstChild) {
            screenContainer.removeChild(screenContainer.firstChild);
          }
          currentScreenId = nextView.screen;
          screens[currentScreenId].mount(screenContainer, hostState);
        }
      } else {
        screens[currentScreenId].update(hostState);
      }

      syncOverlays(nextView.overlays);
      currentView = nextView;
      break;
    }
    case 'error':
      console.warn(`[host error] ${msg.payload.code}: ${msg.payload.message}`);
      showStatus(`Error: ${msg.payload.message}`, 'error');
      break;
    case 'room-closed':
      console.warn('[host] Room closed');
      showStatus('Room closed by server', 'error');
      break;
    case 'pong':
      break;
  }
}

// ── Connection Status ───────────────────────────────────────────

function showStatus(text: string, level: 'info' | 'error' = 'info'): void {
  if (!statusBanner) return;
  statusBanner.textContent = text;
  statusBanner.style.display = 'flex';
  statusBanner.style.color = level === 'error' ? 'var(--noir-blood-bright)' : 'var(--noir-cream)';
  statusBanner.style.borderColor = level === 'error'
    ? 'rgba(196, 32, 32, 0.4)'
    : 'rgba(201, 168, 76, 0.2)';
}

function hideStatus(): void {
  if (statusBanner) statusBanner.style.display = 'none';
}

function handleStatusChange(status: string): void {
  switch (status) {
    case 'connecting':
      showStatus('Connecting to server\u2026');
      break;
    case 'connected': {
      showStatus('Connected. Joining room\u2026');
      const savedSession = safeGetSession('umb-host-session');
      send({
        type: 'join',
        payload: { name: '\u{1F3AC} Host', sessionToken: savedSession ?? undefined },
      });
      break;
    }
    case 'reconnecting':
      showStatus('Lost connection. Reconnecting\u2026', 'error');
      break;
    case 'disconnected':
      showStatus('Cannot connect to server. Is PartyKit running on port 1999?', 'error');
      break;
  }
}

// ── Initialize ──────────────────────────────────────────────────

function createMuteButton(): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'mute-btn';
  btn.setAttribute('aria-label', 'Toggle audio');

  let muted = false;

  const updateIcon = () => {
    btn.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
    btn.classList.toggle('mute-btn--muted', muted);
  };
  updateIcon();

  btn.addEventListener('click', () => {
    muted = !muted;
    audioEngine.setVolume('master', muted ? 0 : 0.8);
    updateIcon();
  });

  return btn;
}

function init(): void {
  const appEl = document.getElementById('host-app');
  if (!appEl) throw new Error('Missing #host-app container');

  appEl.className = 'host-root';

  // Initialize audio
  initNarratorBridge();

  // Connection status banner — visible until lobby loads
  statusBanner = document.createElement('div');
  statusBanner.style.display = 'flex';
  statusBanner.style.alignItems = 'center';
  statusBanner.style.justifyContent = 'center';
  statusBanner.style.padding = 'var(--space-sm) var(--space-md)';
  statusBanner.style.fontFamily = 'var(--font-display)';
  statusBanner.style.fontSize = 'var(--text-base)';
  statusBanner.style.letterSpacing = '0.1em';
  statusBanner.style.textTransform = 'uppercase';
  statusBanner.style.color = 'var(--noir-cream)';
  statusBanner.style.background = 'rgba(10, 10, 12, 0.9)';
  statusBanner.style.border = '1px solid rgba(201, 168, 76, 0.2)';
  statusBanner.style.borderRadius = '6px';
  statusBanner.style.position = 'fixed';
  statusBanner.style.top = '50%';
  statusBanner.style.left = '50%';
  statusBanner.style.transform = 'translate(-50%, -50%)';
  statusBanner.style.zIndex = '9999';
  statusBanner.textContent = 'Connecting to server\u2026';
  appEl.appendChild(statusBanner);

  screenContainer = document.createElement('div');
  screenContainer.className = 'host-screen-container host-screen-container__layer host-screen-container__layer--active';
  appEl.appendChild(screenContainer);

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'host-overlays';
  appEl.appendChild(overlayContainer);

  // Mute button (floating, always visible)
  appEl.appendChild(createMuteButton());

  const roomCode = getRoomCode();

  connect(roomCode, {
    onMessage: handleServerMessage,
    onStatusChange: handleStatusChange,
  });
}

function getRoomCode(): string {
  const url = new URL(window.location.href);
  const pathMatch = url.pathname.match(/\/host\/([A-Za-z]{4})/);
  if (pathMatch) return pathMatch[1].toUpperCase();
  const param = url.searchParams.get('room')?.toUpperCase();
  if (param) return param;

  // No room code in URL — generate one and update the URL
  const code = generateRoomCode();
  url.searchParams.set('room', code);
  window.history.replaceState({}, '', url.toString());
  return code;
}

// ── Start ───────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
