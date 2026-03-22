import type { AppState } from '../state/store';
import { createMiniBoard, updateMiniBoard, destroyMiniBoard } from '../components/mini-board';

let root: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let miniBoardEl: HTMLElement | null = null;

const MESSAGES: Record<string, string> = {
  'nomination-pending': 'The Mayor weighs the options. A Police Chief must be chosen. The city watches.',
  'election-voting': 'Ballots are being cast in silence.\nTrust no one.',
  'policy-mayor-discard': 'The Mayor studies the policies behind closed doors...',
  'policy-chief-discard': 'The Police Chief holds the city\'s fate in their hands...',
  'policy-veto-response': 'A veto has been proposed. The Mayor must decide whether to accept.',
  'policy-veto-propose': 'A veto is on the table. The tension builds.',
  'auto-enact': 'The deadlock forces action. A policy is enacted without debate.',
  'role-reveal-waiting': 'Check your phone. Know your allegiance. And whatever you do... don\'t let it show.',
  'election-result': 'The votes are being counted...',
  'policy-enact': 'A policy slides across the table...',
};

/** Messages that need dynamic player names */
function getDynamicMessage(subPhase: string, players: { isMayor?: boolean; name: string }[]): string | null {
  if (subPhase === 'executive-power-pending') {
    const mayor = players.find((p) => p.isMayor);
    const name = mayor?.name ?? 'The Mayor';
    return `${name} has a decision to make.\nThe room holds its breath.`;
  }
  return null;
}

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  const content = document.createElement('div');
  content.className = 'screen-content';

  messageEl = document.createElement('p');
  messageEl.className = 'waiting__message';
  messageEl.dataset.testId = 'waiting-message';
  content.appendChild(messageEl);

  // Mini board — always visible game state
  if (state.serverState && state.serverState.phase !== 'lobby') {
    miniBoardEl = createMiniBoard(state.serverState);
    content.appendChild(miniBoardEl);
  }

  root.appendChild(content);
  container.appendChild(root);

  update(state);
}

export function update(state: AppState): void {
  if (!messageEl || !state.serverState) return;

  const subPhase = state.serverState.subPhase;
  const dynamic = subPhase ? getDynamicMessage(subPhase, state.serverState.players) : null;
  messageEl.textContent = dynamic ?? (subPhase && MESSAGES[subPhase]) ?? 'The city never sleeps...';

  // Update mini board
  if (miniBoardEl) {
    updateMiniBoard(state.serverState);
  }
}

export function unmount(): void {
  root?.remove();
  root = null;
  messageEl = null;
  miniBoardEl = null;
  destroyMiniBoard();
}
