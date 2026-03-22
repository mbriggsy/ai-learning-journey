import type { PlayerState, LobbyState, PrivateData, ServerMessage } from '../../shared/protocol';
import { isLobbyState, isPlayerState } from '../../shared/protocol';
import { getActiveScreen, type ScreenId } from '../router';
import { startNudgeTimer, stopNudgeTimer, type NudgeLevel } from '../nudge';
import { updateTopBar } from '../components/top-bar';
import { mountRolePeek, unmountRolePeek, isRolePeekMounted } from '../components/role-peek';
import { showInvestigatedAlert } from '../components/investigated-alert';
import { safeSetSession } from '../safe-storage';
import { disconnect } from '../connection';

export interface AppState {
  serverState: PlayerState | null;
  lobbyState: LobbyState | null;
  privateData: PrivateData | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  playerId: string | null;
  sessionToken: string | null;
  nudgeLevel: NudgeLevel;
  isRolePeekOpen: boolean;
}

interface ViewModule {
  mount: (container: HTMLElement, state: AppState) => void;
  update: (state: AppState) => void;
  unmount: () => void;
}

let state: AppState = {
  serverState: null,
  lobbyState: null,
  privateData: null,
  connectionStatus: 'connecting',
  playerId: null,
  sessionToken: null,
  nudgeLevel: 0,
  isRolePeekOpen: false,
};

let currentScreenId: ScreenId | null = null;
let screenContainer: HTMLElement | null = null;
let connectionBanner: HTMLElement | null = null;
let hasEverConnected = false;
let crossfadeTimer: ReturnType<typeof setTimeout> | null = null;

const views = new Map<ScreenId, ViewModule>();

export function registerView(id: ScreenId, view: ViewModule): void {
  views.set(id, view);
}

export function setContainer(el: HTMLElement): void {
  screenContainer = el;
}

export function getState(): AppState {
  return state;
}

export function updateState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  updateConnectionBanner();
  render();
}

// ── Connection Banner ────────────────────────────────────────────

function getConnectionBanner(): HTMLElement {
  if (!connectionBanner) {
    connectionBanner = document.createElement('div');
    connectionBanner.className = 'connection-banner';
    connectionBanner.style.display = 'none';
    document.body.appendChild(connectionBanner);
  }
  return connectionBanner;
}

function updateConnectionBanner(): void {
  const banner = getConnectionBanner();
  const status = state.connectionStatus;

  if (status === 'connected') {
    hasEverConnected = true;
    banner.style.display = 'none';
    return;
  }

  // Only show the banner after the initial connection has been established.
  // Before that the player is on the name-entry screen or loading.
  if (!hasEverConnected) return;

  if (status === 'reconnecting') {
    banner.textContent = 'Reconnecting\u2026';
    banner.style.display = '';
  } else if (status === 'disconnected') {
    banner.textContent = 'Disconnected from server';
    banner.style.display = '';
  }
}

function render(): void {
  if (!screenContainer || (!state.serverState && !state.lobbyState)) return;

  // Set nudge-level data attribute for CSS targeting
  screenContainer.dataset.nudgeLevel = String(state.nudgeLevel);

  // Update persistent top bar
  updateTopBar(state);

  const targetScreen: ScreenId = state.lobbyState
    ? 'lobby'
    : getActiveScreen(state.serverState!, state.playerId!, state.privateData);

  if (targetScreen !== currentScreenId) {
    // Unmount current
    if (currentScreenId) {
      views.get(currentScreenId)?.unmount();
    }

    // Crossfade transition — fade out, brief hold, fade in
    screenContainer.style.opacity = '0';
    if (crossfadeTimer) {
      clearTimeout(crossfadeTimer);
      crossfadeTimer = null;
    }
    crossfadeTimer = setTimeout(() => {
      crossfadeTimer = null;
      while (screenContainer!.firstChild) {
        screenContainer!.removeChild(screenContainer!.firstChild);
      }

      currentScreenId = targetScreen;
      views.get(targetScreen)?.mount(screenContainer!, state);
      // Wait one frame so the browser paints at opacity 0, then transition in
      requestAnimationFrame(() => {
        screenContainer!.style.opacity = '1';
      });
    }, 550);
  } else {
    views.get(currentScreenId)?.update(state);
  }

  // Role peek overlay
  if (state.isRolePeekOpen && !isRolePeekMounted()) {
    mountRolePeek(state);
  } else if (!state.isRolePeekOpen && isRolePeekMounted()) {
    unmountRolePeek();
  }
}

export function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'joined':
      state.playerId = msg.payload.playerId;
      state.sessionToken = msg.payload.sessionToken;
      safeSetSession('umb-session', msg.payload.sessionToken);
      // Signal name-entry UI (if still mounted) to remove itself
      document.querySelector<HTMLElement>('[data-name-entry]')?.remove();
      break;
    case 'state-update': {
      const payload = msg.payload;

      if (isLobbyState(payload)) {
        // Lobby state — store separately, clear game state
        updateState({ lobbyState: payload, serverState: null, privateData: null });
      } else if (isPlayerState(payload)) {
        // Game state — nudge timer + store
        const wasMyTurn = state.serverState?.isMyTurn ?? false;
        const isMyTurn = payload.isMyTurn;

        if (!wasMyTurn && isMyTurn) {
          startNudgeTimer((level) => updateState({ nudgeLevel: level }));
        } else if (wasMyTurn && !isMyTurn) {
          stopNudgeTimer();
          updateState({ nudgeLevel: 0 });
        }

        updateState({ serverState: payload, lobbyState: null });
      } else {
        // HostState from host connection (shouldn't happen for player client)
        updateState({ serverState: null, lobbyState: null });
      }
      break;
    }
    case 'private-update':
      // Detect investigation notification for target player
      if (msg.payload.wasInvestigated && !state.privateData?.wasInvestigated) {
        showInvestigatedAlert(msg.payload.wasInvestigated.byPlayerName);
      }
      updateState({ privateData: msg.payload });
      break;
    case 'error': {
      console.warn(`[server error] ${msg.payload.code}: ${msg.payload.message}`);
      // Terminal errors — stop reconnecting
      if (msg.payload.code === 'KICKED' || msg.payload.code === 'SESSION_REPLACED') {
        disconnect();
      }
      // Show visible error toast to player
      showErrorToast(msg.payload.message);
      // If name-entry form is still mounted, re-enable it so the player can retry
      const nameEntry = document.querySelector<HTMLElement>('[data-name-entry]');
      if (nameEntry) {
        const input = nameEntry.querySelector<HTMLInputElement>('input');
        const btn = nameEntry.querySelector<HTMLButtonElement>('button');
        const statusEl = nameEntry.querySelector<HTMLElement>('[data-join-status]');
        if (input) input.disabled = false;
        if (btn) btn.disabled = false;
        if (statusEl) statusEl.textContent = msg.payload.message;
      }
      break;
    }
    case 'room-closed':
      updateState({ connectionStatus: 'disconnected' });
      break;
    case 'pong':
      break;
  }
}

// ── Error Toast ──────────────────────────────────────────────────

let errorToastTimer: ReturnType<typeof setTimeout> | null = null;

function showErrorToast(message: string): void {
  let toast = document.getElementById('umb-error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'umb-error-toast';
    toast.style.position = 'fixed';
    toast.style.top = '56px'; // below top-bar (48px + 8px gap)
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '9999';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '8px';
    toast.style.background = 'rgba(26, 26, 30, 0.95)';
    toast.style.border = '1px solid rgba(196, 32, 32, 0.6)';
    toast.style.color = 'var(--noir-cream, #E8E0D0)';
    toast.style.fontFamily = 'var(--font-display, sans-serif)';
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = '600';
    toast.style.textAlign = 'center';
    toast.style.maxWidth = '90vw';
    toast.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.5)';
    toast.style.transition = 'opacity 300ms ease';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.display = 'block';

  if (errorToastTimer) clearTimeout(errorToastTimer);
  errorToastTimer = setTimeout(() => {
    if (toast) toast.style.opacity = '0';
    // Remove from DOM after fade
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 300);
  }, 5000);
}
