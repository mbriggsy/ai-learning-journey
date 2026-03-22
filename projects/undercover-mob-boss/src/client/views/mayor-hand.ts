import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { hapticTap } from '../haptics';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let selectedIndex: number | null = null;
let tl: gsap.core.Timeline | null = null;
let discardTl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  selectedIndex = null;

  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('Discard one policy');

  const content = document.createElement('div');
  content.className = 'screen-content';

  const hand = document.createElement('div');
  hand.className = 'policy-hand glass-panel';
  hand.dataset.testId = 'mayor-hand';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.dataset.testId = 'mayor-discard-btn';
  confirmBtn.textContent = 'Discard Selected';
  confirmBtn.disabled = true;

  const cards = state.privateData?.mayorCards ?? [];
  const cardEls: HTMLElement[] = [];

  cards.forEach((cardType, idx) => {
    const card = document.createElement('div');
    card.className = `policy-card policy-card--${cardType === 'good' ? 'good' : 'bad'}`;
    card.dataset.testId = 'policy-card';

    const img = document.createElement('img');
    img.src = cardType === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
    img.alt = cardType === 'good' ? 'Good Policy' : 'Bad Policy';
    img.draggable = false;
    img.className = 'policy-card__img';

    card.appendChild(img);
    cardEls.push(card);

    card.addEventListener('click', () => {
      hapticTap();
      // Update selection
      cardEls.forEach((el, i) => {
        el.classList.remove('policy-card--selected', 'policy-card--unselected', 'policy-card--dimmed');
        if (i === idx) {
          el.classList.add('policy-card--selected');
        } else {
          el.classList.add('policy-card--unselected');
        }
      });
      selectedIndex = idx;
      confirmBtn.disabled = false;
    });

    hand.appendChild(card);
  });

  confirmBtn.addEventListener('click', () => {
    if (selectedIndex === null) return;
    confirmBtn.disabled = true;

    // Lock cards
    cardEls.forEach((el) => {
      el.style.pointerEvents = 'none';
    });

    const idx = selectedIndex;

    // Fade out button
    gsap.to(confirmBtn, { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in' });

    const tl2 = gsap.timeline({
      onComplete: () => {
        sendAction({ type: 'mayor-discard', cardIndex: idx });
      },
    });
    discardTl = tl2;

    // Discarded card tumbles down off-screen
    const tumbleDir = Math.random() > 0.5 ? 1 : -1;
    tl2.to(cardEls[idx], {
      y: 400,
      x: tumbleDir * (40 + Math.random() * 30),
      rotation: `+=${tumbleDir * (90 + Math.random() * 80)}`,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
    });

    // Survivors straighten, pulse, then rise off-screen to the chief
    cardEls.forEach((el, i) => {
      if (i !== idx) {
        el.classList.remove('policy-card--unselected');
        tl2.to(el, {
          rotation: 0,
          scale: 1.05,
          duration: 0.4,
          ease: 'power2.out',
        }, '-=0.2');
      }
    });

    // Brief hold — let the player see the survivors
    tl2.to({}, { duration: 0.6 });

    // Survivors ascend off-screen (heading to the chief)
    cardEls.forEach((el, i) => {
      if (i !== idx) {
        tl2.to(el, {
          y: -350,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        }, '<');
      }
    });
  });

  content.appendChild(hand);
  content.appendChild(confirmBtn);
  root.appendChild(content);
  container.appendChild(root);

  // GSAP fan-spread entrance
  tl = gsap.timeline();
  const angles = [-8, 0, 8];
  cardEls.forEach((card, i) => {
    gsap.set(card, { rotation: 0, y: 60, opacity: 0 });
    tl!.to(card, {
      rotation: angles[i],
      y: 0,
      opacity: 1,
      duration: 0.35,
      ease: 'back.out(1.4)',
    }, i * 0.1);
  });
}

export function update(_state: AppState): void {
  // One-shot interaction — no dynamic updates.
}

export function unmount(): void {
  setTopBarInstruction('');
  discardTl?.kill();
  discardTl = null;
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
  selectedIndex = null;
}
