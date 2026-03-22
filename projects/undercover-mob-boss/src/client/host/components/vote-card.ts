/**
 * Individual vote flip card component.
 * Blank front face, flips to reveal approve (gold) or block (red).
 * Player name label sits below the card, always visible.
 */

interface VoteCardConfig {
  playerName: string;
  vote: 'approve' | 'block' | null;
}

export function createVoteCard(config: VoteCardConfig): HTMLElement {
  const card = document.createElement('div');
  card.className = 'vote-card';

  const inner = document.createElement('div');
  inner.className = 'vote-card__inner';

  // Front face — blank
  const front = document.createElement('div');
  front.className = 'vote-card__face vote-card__front';

  // Back face — vote result with artwork
  const back = document.createElement('div');
  back.className = 'vote-card__face vote-card__back';

  if (config.vote) {
    back.classList.add(
      config.vote === 'approve' ? 'vote-card__back--approve' : 'vote-card__back--block',
    );
    const img = document.createElement('img');
    img.className = 'vote-card__art';
    img.src = config.vote === 'approve' ? '/assets/vote-approve.png' : '/assets/vote-block.png';
    img.alt = config.vote === 'approve' ? 'Approve' : 'Deny';
    back.appendChild(img);
    const resultEl = document.createElement('span');
    resultEl.className = 'vote-card__result';
    resultEl.textContent = config.vote === 'approve' ? 'Approve' : 'Deny';
    back.appendChild(resultEl);
  }

  inner.appendChild(front);
  inner.appendChild(back);
  card.appendChild(inner);

  // Player name label — always visible below the card
  const label = document.createElement('span');
  label.className = 'vote-card__label';
  label.textContent = config.playerName;
  card.appendChild(label);

  return card;
}

