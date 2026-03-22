import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { hapticTap } from '../haptics';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let voteCast = false;
let tl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  voteCast = false;

  root = document.createElement('div');
  root.className = 'screen';

  const content = document.createElement('div');
  content.className = 'screen-content';

  const nomineeId = state.serverState?.nominatedChiefId;
  const nominee = state.serverState?.players.find((p) => p.id === nomineeId);
  setTopBarInstruction(nominee ? `${nominee.name} for Police Chief?` : 'Cast your vote');

  // Card row in glass panel
  const btnRow = document.createElement('div');
  btnRow.className = 'glass-panel vote-panel';

  // Approve card
  const approveCard = document.createElement('div');
  approveCard.className = 'vote-card vote-card--approve';
  const approveImg = document.createElement('img');
  approveImg.src = '/assets/vote-approve.png';
  approveImg.alt = 'Approve';
  approveImg.draggable = false;
  approveImg.className = 'vote-card__img';
  const approveBtn = document.createElement('button');
  approveBtn.className = 'action-btn vote-card__btn';
  approveBtn.dataset.testId = 'vote-approve';
  approveBtn.textContent = 'Approve';
  approveCard.appendChild(approveImg);
  approveCard.appendChild(approveBtn);

  // Block card
  const blockCard = document.createElement('div');
  blockCard.className = 'vote-card vote-card--block';
  const blockImg = document.createElement('img');
  blockImg.src = '/assets/vote-block.png';
  blockImg.alt = 'Deny';
  blockImg.draggable = false;
  blockImg.className = 'vote-card__img';
  const blockBtn = document.createElement('button');
  blockBtn.className = 'action-btn action-btn--danger vote-card__btn';
  blockBtn.dataset.testId = 'vote-deny';
  blockBtn.textContent = 'Deny';
  blockCard.appendChild(blockImg);
  blockCard.appendChild(blockBtn);

  // Confirmation element (hidden initially)
  const confirmation = document.createElement('div');
  confirmation.className = 'vote-confirmation';
  confirmation.dataset.testId = 'vote-confirmation';
  confirmation.style.display = 'none';

  function castVote(vote: 'approve' | 'block'): void {
    if (voteCast) return;
    voteCast = true;
    hapticTap();

    approveBtn.disabled = true;
    blockBtn.disabled = true;

    sendAction({ type: 'vote', vote });

    // Show confirmation
    confirmation.textContent = vote === 'approve' ? 'Approved' : 'Denied';
    confirmation.classList.add(
      vote === 'approve' ? 'vote-confirmation--approve' : 'vote-confirmation--block',
    );
    confirmation.style.display = '';
    btnRow.style.display = 'none';
  }

  approveBtn.addEventListener('click', () => castVote('approve'));
  blockBtn.addEventListener('click', () => castVote('block'));

  btnRow.appendChild(approveCard);
  btnRow.appendChild(blockCard);

  content.appendChild(btnRow);
  content.appendChild(confirmation);
  root.appendChild(content);
  container.appendChild(root);

  // GSAP entrance: cards slide in from sides
  tl = gsap.timeline();
  tl.fromTo(approveCard, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' });
  tl.fromTo(blockCard, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }, '<');
}

export function update(state: AppState): void {
  // Vote screen is one-shot per mount; nothing to update dynamically.
}

export function unmount(): void {
  setTopBarInstruction('');
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
  voteCast = false;
}
