import type { AppState } from '../state/store';
import type { RevealedPlayer } from '../../shared/protocol';

let root: HTMLElement | null = null;
let winnerEl: HTMLElement | null = null;
let reasonEl: HTMLElement | null = null;
let rolesEl: HTMLElement | null = null;

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  const content = document.createElement('div');
  content.className = 'screen-content';

  const panel = document.createElement('div');
  panel.className = 'game-over__panel';

  winnerEl = document.createElement('h1');
  winnerEl.className = 'game-over__winner';
  winnerEl.dataset.testId = 'game-over-winner';

  reasonEl = document.createElement('p');
  reasonEl.className = 'game-over__reason';
  reasonEl.dataset.testId = 'game-over-reason';

  rolesEl = document.createElement('ul');
  rolesEl.className = 'game-over__roles';
  rolesEl.dataset.testId = 'game-over-roles';

  panel.appendChild(winnerEl);
  panel.appendChild(reasonEl);
  panel.appendChild(rolesEl);
  content.appendChild(panel);
  root.appendChild(content);
  container.appendChild(root);

  update(state);
}

export function update(state: AppState): void {
  if (!root || !state.serverState) return;

  const ss = state.serverState;

  if (winnerEl) {
    if (ss.winner === 'citizens') {
      winnerEl.textContent = 'Citizens Win!';
      winnerEl.className = 'game-over__winner text-gold';
    } else if (ss.winner === 'mob') {
      winnerEl.textContent = 'Mob Wins!';
      winnerEl.className = 'game-over__winner text-blood';
    } else {
      winnerEl.textContent = 'Game Over';
      winnerEl.className = 'game-over__winner text-muted';
    }
  }

  if (reasonEl) {
    reasonEl.textContent = ss.winReason ?? '';
  }

  if (rolesEl) {
    clearChildren(rolesEl);
    for (const p of ss.players) {
      const li = document.createElement('li');
      li.className = 'game-over__role-item';

      const name = document.createElement('span');
      name.textContent = p.name;

      const badge = document.createElement('span');
      badge.className = 'game-over__role-badge';

      // At game-over, players are RevealedPlayer with role field
      const revealed = p as RevealedPlayer;
      if (revealed.role) {
        badge.textContent = formatRole(revealed.role);
        badge.classList.add(
          revealed.role === 'citizen'
            ? 'game-over__role-badge--citizen'
            : 'game-over__role-badge--mob',
        );
      }

      li.appendChild(name);
      li.appendChild(badge);
      rolesEl.appendChild(li);
    }
  }
}

export function unmount(): void {
  root?.remove();
  root = null;
  winnerEl = null;
  reasonEl = null;
  rolesEl = null;
}

function formatRole(role: string): string {
  switch (role) {
    case 'citizen': return 'Citizen';
    case 'mob-soldier': return 'Mob Soldier';
    case 'mob-boss': return 'Mob Boss';
    default: return role;
  }
}
