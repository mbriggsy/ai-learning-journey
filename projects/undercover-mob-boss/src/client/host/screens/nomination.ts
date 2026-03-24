import type { HostState } from '../../../shared/protocol';

let root: HTMLElement | null = null;
let mayorNameEl: HTMLElement | null = null;
let commissionerNameEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;

export function mount(container: HTMLElement, state: HostState): void {
  root = document.createElement('div');
  root.className = 'nomination-bar';

  // Mayor → Commissioner in one line
  const row = document.createElement('div');
  row.className = 'nomination-bar__row';

  const mayorLabel = document.createElement('span');
  mayorLabel.className = 'nomination-bar__label';
  mayorLabel.textContent = 'Mayor';

  mayorNameEl = document.createElement('span');
  mayorNameEl.className = 'nomination-bar__name nomination-bar__name--mayor';

  const arrow = document.createElement('span');
  arrow.className = 'nomination-bar__arrow';
  arrow.textContent = '\u{25B6}'; // Right arrow

  const commissionerLabel = document.createElement('span');
  commissionerLabel.className = 'nomination-bar__label';
  commissionerLabel.textContent = 'Commissioner';

  commissionerNameEl = document.createElement('span');
  commissionerNameEl.className = 'nomination-bar__name';

  row.appendChild(mayorLabel);
  row.appendChild(mayorNameEl);
  row.appendChild(arrow);
  row.appendChild(commissionerLabel);
  row.appendChild(commissionerNameEl);
  root.appendChild(row);

  // Status line
  statusEl = document.createElement('div');
  statusEl.className = 'nomination-bar__status';
  root.appendChild(statusEl);

  container.appendChild(root);
  update(state);
}

export function update(state: HostState): void {
  if (!root) return;

  const mayor = state.players.find((p) => p.isMayor);
  if (mayorNameEl) {
    mayorNameEl.textContent = mayor?.name ?? '?';
  }

  if (commissionerNameEl) {
    if (state.nominatedCommissionerId) {
      const commissioner = state.players.find((p) => p.id === state.nominatedCommissionerId);
      commissionerNameEl.textContent = commissioner?.name ?? '?';
      commissionerNameEl.style.color = 'var(--noir-cream)';
    } else {
      commissionerNameEl.textContent = '...';
      commissionerNameEl.style.color = 'var(--noir-muted)';
    }
  }

  if (statusEl) {
    if (state.subPhase === 'nomination-pending') {
      statusEl.textContent = 'Selecting a Commissioner...';
    } else if (state.subPhase === 'election-voting') {
      statusEl.textContent = 'Voting in progress...';
    } else {
      statusEl.textContent = '';
    }
  }
}

export function unmount(): void {
  root?.remove();
  root = null;
  mayorNameEl = null;
  commissionerNameEl = null;
  statusEl = null;
}
