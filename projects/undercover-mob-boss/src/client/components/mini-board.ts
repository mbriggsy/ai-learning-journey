import type { PlayerState } from '../../shared/protocol';
import { getPowerSlots, createPowerIcon } from './power-icons';

/**
 * Miniature game board for player phones — styled as a noir intelligence dossier.
 * Two engraved track plaques (Citizen / Mob), election tracker, player roster.
 */

let boardEl: HTMLElement | null = null;

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function createTrackPlaque(
  type: 'citizen' | 'mob',
  enacted: number,
  total: number,
  playerCount?: number,
): HTMLElement {
  const plaque = document.createElement('div');
  plaque.className = `mini-track mini-track--${type}`;

  const label = document.createElement('div');
  label.className = 'mini-track__label';
  label.textContent = type === 'citizen' ? 'Citizen' : 'Mob';
  plaque.appendChild(label);

  const slots = document.createElement('div');
  slots.className = 'mini-track__slots';

  const powers = type === 'mob' && playerCount ? getPowerSlots(playerCount) : [];

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = 'mini-track__slot';
    if (i < enacted) {
      slot.classList.add(`mini-track__slot--filled`);
    }

    // Power icon watermark for mob slots
    if (type === 'mob' && powers[i]) {
      slot.appendChild(createPowerIcon(powers[i]!, 'mini-track__power-icon'));
    }

    slots.appendChild(slot);
  }
  plaque.appendChild(slots);

  return plaque;
}

function createElectionDiamonds(failed: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'mini-election';

  const label = document.createElement('span');
  label.className = 'mini-election__label';
  label.textContent = 'Elections';
  row.appendChild(label);

  const diamonds = document.createElement('div');
  diamonds.className = 'mini-election__diamonds';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'mini-election__diamond';
    if (i < failed) d.classList.add('mini-election__diamond--filled');
    diamonds.appendChild(d);
  }
  row.appendChild(diamonds);

  return row;
}

function createPlayerRoster(players: PlayerState['players']): HTMLElement {
  const roster = document.createElement('div');
  roster.className = 'mini-roster';

  for (const p of players) {
    const pill = document.createElement('span');
    pill.className = 'mini-roster__player';
    if (!p.isAlive) pill.classList.add('mini-roster__player--dead');
    if (p.isMayor) pill.classList.add('mini-roster__player--mayor');
    if (p.isChief) pill.classList.add('mini-roster__player--chief');

    if (!p.isAlive) {
      // Dead: coffin icon + struck name as separate elements
      const coffin = document.createElement('span');
      coffin.className = 'mini-roster__coffin';
      coffin.textContent = '\u26B0';
      const deadName = document.createElement('span');
      deadName.className = 'mini-roster__dead-name';
      deadName.textContent = p.name;
      pill.appendChild(coffin);
      pill.appendChild(deadName);
    } else if (p.isMayor) {
      pill.textContent = `M \u2022 ${p.name}`;
    } else if (p.isChief) {
      pill.textContent = `C \u2022 ${p.name}`;
    } else {
      pill.textContent = p.name;
    }
    roster.appendChild(pill);
  }

  return roster;
}

export function createMiniBoard(state: PlayerState): HTMLElement {
  boardEl = document.createElement('div');
  boardEl.className = 'mini-board';

  renderBoard(boardEl, state);
  return boardEl;
}

function renderBoard(board: HTMLElement, state: PlayerState): void {
  clearChildren(board);

  // Art deco top accent
  const topAccent = document.createElement('div');
  topAccent.className = 'mini-board__accent';
  board.appendChild(topAccent);

  // Two track plaques side by side
  const tracks = document.createElement('div');
  tracks.className = 'mini-board__tracks';

  tracks.appendChild(createTrackPlaque('citizen', state.goodPoliciesEnacted, 5));
  tracks.appendChild(createTrackPlaque('mob', state.badPoliciesEnacted, 6, state.players.length));
  board.appendChild(tracks);

  // Art deco divider
  const divider = document.createElement('div');
  divider.className = 'mini-board__divider';
  board.appendChild(divider);

  // Election tracker
  board.appendChild(createElectionDiamonds(state.electionTracker));

  // Mob boss warning
  if (state.badPoliciesEnacted >= 3) {
    const warning = document.createElement('div');
    warning.className = 'mini-board__warning';
    warning.textContent = 'Mob Boss as Chief = Game Over';
    board.appendChild(warning);
  }

  // Player roster
  board.appendChild(createPlayerRoster(state.players));
}

export function updateMiniBoard(state: PlayerState): void {
  if (!boardEl) return;
  renderBoard(boardEl, state);
}

export function destroyMiniBoard(): void {
  boardEl = null;
}
