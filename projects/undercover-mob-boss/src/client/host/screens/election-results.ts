import { gsap } from 'gsap';
import type { HostState } from '../../../shared/protocol';
import { createVoteCard } from '../components/vote-card';
import { animateVoteReveal } from '../animations/vote-reveal';

let root: HTMLElement | null = null;
let cardsContainer: HTMLElement | null = null;
let tallyEl: HTMLElement | null = null;
let outcomeEl: HTMLElement | null = null;
let revealDone = false;

/** Pick grid columns to keep rows balanced and symmetric. */
function gridColumns(count: number): number {
  if (count <= 5) return count;
  if (count <= 7) return count;  // single row up to 7
  if (count <= 8) return 4;      // 4+4
  return 5;                      // 5+4, 5+5
}

export function mount(container: HTMLElement, state: HostState): void {
  revealDone = false;

  root = document.createElement('div');
  root.className = 'host-screen';

  const title = document.createElement('h1');
  title.className = 'host-screen__title';
  title.textContent = 'Election Results';
  root.appendChild(title);

  // Vote cards grid — columns set in update() once we know player count
  cardsContainer = document.createElement('div');
  cardsContainer.className = 'election-results__grid';
  root.appendChild(cardsContainer);

  // Tally — hidden until reveal completes
  tallyEl = document.createElement('div');
  tallyEl.className = 'election-results__tally';
  tallyEl.style.opacity = '0';
  root.appendChild(tallyEl);

  // Outcome — hidden until reveal completes
  outcomeEl = document.createElement('div');
  outcomeEl.className = 'election-results__outcome';
  outcomeEl.style.opacity = '0';
  root.appendChild(outcomeEl);

  container.appendChild(root);
  update(state);
}

export function update(state: HostState): void {
  if (!root || !cardsContainer) return;

  const votes = state.votes;
  if (!votes) return;

  // Build vote cards (only on first render or if not yet revealed)
  if (!revealDone && cardsContainer.children.length === 0) {
    const alivePlayers = state.players.filter((p) => p.isAlive);
    const cols = gridColumns(alivePlayers.length);
    cardsContainer.style.gridTemplateColumns = `repeat(${cols}, clamp(100px, 12vw, 160px))`;
    const cardElements: HTMLElement[] = [];

    for (const player of alivePlayers) {
      const vote = votes[player.id] ?? null;
      const card = createVoteCard({
        playerName: player.name,
        vote,
      });
      cardsContainer.appendChild(card);
      cardElements.push(card);
    }

    // Trigger sequential reveal animation, then fade in tally
    animateVoteReveal(cardElements).then(() => {
      revealDone = true;
      updateTally(state);
      if (tallyEl) tallyEl.style.opacity = '1';
      if (outcomeEl) outcomeEl.style.opacity = '1';
    }).catch(() => {
      revealDone = true;
      updateTally(state);
    });
  }

  if (revealDone) {
    updateTally(state);
  }
}

function updateTally(state: HostState): void {
  const votes = state.votes;
  if (!votes) return;

  const approveCount = Object.values(votes).filter((v) => v === 'approve').length;
  const blockCount = Object.values(votes).filter((v) => v === 'block').length;
  const passed = approveCount > blockCount;

  if (tallyEl) {
    tallyEl.textContent = `Approve: ${approveCount} / Deny: ${blockCount}`;
  }

  if (outcomeEl) {
    outcomeEl.textContent = passed ? 'Passed' : 'Denied';
    outcomeEl.style.color = passed ? 'var(--noir-gold)' : 'var(--noir-blood)';
  }
}

export function unmount(): void {
  if (cardsContainer) {
    gsap.killTweensOf(cardsContainer.querySelectorAll('.vote-card__inner'));
  }
  root?.remove();
  root = null;
  cardsContainer = null;
  tallyEl = null;
  outcomeEl = null;
  revealDone = false;
}
