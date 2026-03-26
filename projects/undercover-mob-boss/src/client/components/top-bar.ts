import type { AppState } from '../state/store';

let topBarEl: HTMLElement | null = null;
let nameEl: HTMLElement | null = null;
let instructionEl: HTMLElement | null = null;
let envelopeBtn: HTMLElement | null = null;
let helpBtn: HTMLElement | null = null;

export function createTopBar(): HTMLElement {
  topBarEl = document.createElement('div');
  topBarEl.className = 'top-bar';

  helpBtn = document.createElement('a');
  helpBtn.className = 'top-bar__help';
  (helpBtn as HTMLAnchorElement).href = '/how-to-play.html';
  (helpBtn as HTMLAnchorElement).target = '_blank';
  (helpBtn as HTMLAnchorElement).rel = 'noopener';
  helpBtn.setAttribute('aria-label', 'How to Play');
  helpBtn.textContent = '?';
  helpBtn.style.display = 'none';

  nameEl = document.createElement('span');
  nameEl.className = 'top-bar__name';
  nameEl.textContent = '';

  instructionEl = document.createElement('span');
  instructionEl.className = 'top-bar__instruction';
  instructionEl.textContent = '';

  envelopeBtn = document.createElement('button');
  envelopeBtn.className = 'top-bar__envelope';
  envelopeBtn.setAttribute('aria-label', 'Peek at role');
  envelopeBtn.textContent = '\u{1F4E8}';
  envelopeBtn.style.display = 'none';

  topBarEl.appendChild(helpBtn);
  topBarEl.appendChild(nameEl);
  topBarEl.appendChild(instructionEl);
  topBarEl.appendChild(envelopeBtn);

  return topBarEl;
}

export function updateTopBar(state: AppState): void {
  if (!topBarEl || !nameEl || !envelopeBtn || !instructionEl || !helpBtn) return;

  // Update player name
  if (state.serverState && state.playerId) {
    const me = state.serverState.players.find((p) => p.id === state.playerId);
    if (me) {
      const badge = me.isMayor ? ' \u2014 Mayor' : me.isCommissioner ? ' \u2014 Commissioner' : '';
      nameEl.textContent = me.name + badge;
    }
  }

  // Show/hide envelope + help buttons — hidden in lobby, role-reveal, game-over
  const phase = state.serverState?.phase ?? state.lobbyState?.phase;
  const hasRole = !!state.privateData?.role || !!state.serverState?.myRole;
  const inGame = phase && phase !== 'lobby' && phase !== 'role-reveal' && phase !== 'game-over' && hasRole;
  envelopeBtn.style.display = inGame ? '' : 'none';
  helpBtn.style.display = inGame ? '' : 'none';
}

/** Set contextual instruction text in the top bar center. Pass '' to clear. */
export function setTopBarInstruction(text: string): void {
  if (instructionEl) {
    instructionEl.textContent = text;
  }
}

export function getEnvelopeButton(): HTMLElement | null {
  return envelopeBtn;
}

