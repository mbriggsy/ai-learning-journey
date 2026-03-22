import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let selectedId: string | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  selectedId = null;

  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('\u{1F46E} Nominate a Police Chief');

  const content = document.createElement('div');
  content.className = 'screen-content';

  const list = document.createElement('ul');
  list.className = 'player-picker';
  list.dataset.testId = 'nomination-picker';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.dataset.testId = 'nomination-confirm';
  confirmBtn.textContent = '\u{1F46E} Confirm Nomination';
  confirmBtn.disabled = true;

  // Build eligible player list — exclude self (mayor) and term-limited players
  const aliveCount = (state.serverState?.players ?? []).filter((p) => p.isAlive).length;
  const players = (state.serverState?.players ?? [])
    .filter((p) => p.id !== state.playerId);
  for (const p of players) {
    // Term limits: previous chief always ineligible; previous mayor ineligible at 6+
    const termLimited = p.wasLastChief || (p.wasLastMayor && aliveCount > 5);
    const isEligible = p.isAlive && !termLimited;

    const li = document.createElement('li');
    li.className = 'player-picker__item';
    li.dataset.testId = 'nomination-player';
    if (!p.isAlive) li.classList.add('player-picker__item--dead');
    if (!isEligible) li.style.pointerEvents = 'none';
    if (!p.isAlive) {
      // CSS handles opacity via player-picker__item--dead
    } else if (termLimited) {
      li.style.opacity = '0.8';
      li.style.textDecoration = 'line-through';
    }
    li.textContent = !p.isAlive ? `\u{2620} ${p.name}` : p.name;
    li.dataset.playerId = p.id;

    if (isEligible) {
      li.addEventListener('click', () => {
        // Deselect previous
        list.querySelectorAll('.player-picker__item--selected').forEach((el) =>
          el.classList.remove('player-picker__item--selected'),
        );
        li.classList.add('player-picker__item--selected');
        selectedId = p.id;
        confirmBtn.disabled = false;
      });
    }

    list.appendChild(li);
  }

  confirmBtn.addEventListener('click', () => {
    if (!selectedId) return;
    confirmBtn.disabled = true;
    sendAction({ type: 'nominate', targetId: selectedId });
  });

  const panel = document.createElement('div');
  panel.className = 'glass-panel picker-panel';
  panel.appendChild(list);
  panel.appendChild(confirmBtn);
  content.appendChild(panel);
  root.appendChild(content);
  container.appendChild(root);
}

export function update(_state: AppState): void {
  // Static once mounted — router will unmount on state change.
}

export function unmount(): void {
  setTopBarInstruction('');
  root?.remove();
  root = null;
  selectedId = null;
}
