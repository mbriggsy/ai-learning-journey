import type { PublicPlayer } from '../../../shared/protocol';

/**
 * Horizontal player strip showing all players with role icons and status.
 * Hat = Mayor, Badge = Chief, Magnifying glass = Under Investigation.
 */

interface StripOptions {
  waitingOnPlayerIds?: string[];
  investigatedPlayerIds?: string[];
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function createPlayerStrip(players: PublicPlayer[], opts: StripOptions = {}): HTMLElement {
  const strip = document.createElement('div');
  strip.className = 'player-strip';
  renderPlayers(strip, players, opts);
  return strip;
}

export function updatePlayerStrip(
  stripEl: HTMLElement,
  players: PublicPlayer[],
  opts: StripOptions = {},
): void {
  renderPlayers(stripEl, players, opts);
}

function renderPlayers(container: HTMLElement, players: PublicPlayer[], opts: StripOptions): void {
  clearChildren(container);

  const waitingSet = new Set(opts.waitingOnPlayerIds ?? []);
  const investigatedSet = new Set(opts.investigatedPlayerIds ?? []);

  for (const player of players) {
    const item = document.createElement('div');
    item.className = 'player-strip__item';
    item.dataset.playerId = player.id;

    if (!player.isAlive) {
      item.classList.add('player-strip__item--dead');
    } else if (!player.isConnected) {
      item.classList.add('player-strip__item--disconnected');
    }

    if (player.isMayor) {
      item.classList.add('player-strip__item--mayor');
    }
    if (player.isChief) {
      item.classList.add('player-strip__item--chief');
    }

    if (waitingSet.has(player.id) && player.isAlive) {
      item.classList.add('player-strip__item--waiting');
    }

    // Status dot
    const statusDot = document.createElement('div');
    statusDot.className = 'player-strip__status';
    if (!player.isAlive) {
      statusDot.classList.add('player-strip__status--dead');
    } else if (player.isConnected) {
      statusDot.classList.add('player-strip__status--connected');
    } else {
      statusDot.classList.add('player-strip__status--disconnected');
    }
    item.appendChild(statusDot);

    // Role badge
    if (player.isMayor) {
      const badge = document.createElement('div');
      badge.className = 'player-strip__badge player-strip__badge--mayor';
      badge.textContent = 'MAYOR';
      item.appendChild(badge);
    } else if (player.isChief) {
      const badge = document.createElement('div');
      badge.className = 'player-strip__badge player-strip__badge--chief';
      badge.textContent = 'CHIEF';
      item.appendChild(badge);
    } else if (!player.isAlive) {
      // Coffin icon instead of tiny "DEAD" badge
      const coffin = document.createElement('div');
      coffin.className = 'player-strip__coffin';
      coffin.textContent = '\u26B0';
      item.appendChild(coffin);
    }

    // Investigation indicator
    if (investigatedSet.has(player.id)) {
      const mag = document.createElement('div');
      mag.className = 'player-strip__investigated';
      mag.textContent = '\u{1F50D}';
      item.appendChild(mag);
    }

    // Player name
    const name = document.createElement('span');
    name.className = 'player-strip__name';
    if (!player.isAlive) {
      name.classList.add('player-strip__name--dead');
    }
    name.textContent = player.name;
    item.appendChild(name);

    container.appendChild(item);
  }
}
