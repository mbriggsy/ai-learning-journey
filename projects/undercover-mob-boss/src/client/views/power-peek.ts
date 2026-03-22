import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let tl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('\u{1F441} Peek at the top 3 policy cards');

  const content = document.createElement('div');
  content.className = 'screen-content';

  // Show the 3 peeked cards using art images
  const cards = state.privateData?.peekCards ?? [];
  const cardRow = document.createElement('div');
  cardRow.className = 'policy-hand glass-panel';
  cardRow.dataset.testId = 'peek-cards';
  cardRow.style.margin = '16px 0';

  const cardEls: HTMLElement[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = document.createElement('div');
    card.className = cards[i] === 'good' ? 'policy-card policy-card--good' : 'policy-card policy-card--bad';
    card.dataset.testId = 'peek-card';
    card.style.cursor = 'default';

    const img = document.createElement('img');
    img.src = cards[i] === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
    img.alt = cards[i] === 'good' ? 'Good Policy' : 'Bad Policy';
    img.draggable = false;
    img.className = 'policy-card__img';

    card.appendChild(img);
    cardRow.appendChild(card);
    cardEls.push(card);
  }

  content.appendChild(cardRow);

  const hint = document.createElement('p');
  hint.className = 'power-description peek-hint';
  hint.textContent = 'These cards remain on top of the deck in this order. You may share what you saw\n\u2014 or lie about it.';
  content.appendChild(hint);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.dataset.testId = 'peek-confirm';
  confirmBtn.textContent = "I've seen enough";
  confirmBtn.addEventListener('click', () => {
    confirmBtn.disabled = true;
    sendAction({ type: 'acknowledge-peek' });
  });

  content.appendChild(confirmBtn);
  root.appendChild(content);
  container.appendChild(root);

  // GSAP stagger entrance for cards
  tl = gsap.timeline();
  cardEls.forEach((card, i) => {
    gsap.set(card, { y: 40, opacity: 0 });
    tl!.to(card, {
      y: 0,
      opacity: 1,
      duration: 0.3,
      ease: 'back.out(1.2)',
    }, i * 0.12);
  });
  tl.from(hint, { opacity: 0, duration: 0.3 }, '-=0.1')
    .from(confirmBtn, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');
}

export function update(_state: AppState): void {
  // One-shot interaction — no dynamic updates.
}

export function unmount(): void {
  setTopBarInstruction('');
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
}
