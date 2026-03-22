import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { hapticTap } from '../haptics';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let selectedIndex: number | null = null;
let tl: gsap.core.Timeline | null = null;
let enactTl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  selectedIndex = null;

  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('Enact a policy');

  const content = document.createElement('div');
  content.className = 'screen-content';

  const hand = document.createElement('div');
  hand.className = 'policy-hand glass-panel';
  hand.dataset.testId = 'chief-hand';

  const cards = state.privateData?.chiefCards ?? [];
  const cardEls: HTMLElement[] = [];

  const badPolicies = state.serverState?.badPoliciesEnacted ?? 0;
  // Veto available only if 5+ bad policies AND not already proposed this session
  const vetoAlreadyProposed = state.serverState?.events?.some(
    (e: { type: string }) => e.type === 'veto-enacted' || e.type === 'veto-rejected',
  ) ?? false;
  const canVeto = badPolicies >= 5 && !vetoAlreadyProposed;

  // Confirm enact button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.dataset.testId = 'chief-enact-btn';
  confirmBtn.textContent = 'Enact Selected';
  confirmBtn.disabled = true;

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
      cardEls.forEach((el, i) => {
        el.classList.remove('policy-card--selected', 'policy-card--unselected', 'policy-card--dimmed');
        if (i !== idx) {
          el.classList.add('policy-card--unselected');
        }
      });
      card.classList.add('policy-card--selected');
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

    const enactIdx = selectedIndex;
    const discardIdx = enactIdx === 0 ? 1 : 0;

    // Fade out buttons
    gsap.to(confirmBtn, { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in' });
    const vetoEl = content.querySelector('.action-btn--danger') as HTMLElement | null;
    if (vetoEl) {
      gsap.to(vetoEl, { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in' });
    }

    enactTl = gsap.timeline({
      onComplete: () => {
        sendAction({ type: 'chief-discard', cardIndex: discardIdx });
      },
    });

    // Enacted card rises with authority
    enactTl.to(cardEls[enactIdx], {
      y: -350,
      scale: 1.15,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.in',
    });

    // Discarded card tumbles away
    const tumbleDir = Math.random() > 0.5 ? 1 : -1;
    enactTl.to(cardEls[discardIdx], {
      y: 400,
      x: tumbleDir * (40 + Math.random() * 30),
      rotation: tumbleDir * (90 + Math.random() * 80),
      opacity: 0,
      duration: 0.7,
      ease: 'power2.in',
    }, '-=0.3');

    // Brief hold before transitioning
    enactTl.to({}, { duration: 0.5 });
  });

  content.appendChild(hand);
  content.appendChild(confirmBtn);

  // Veto button (only when 5+ bad policies enacted and not already proposed)
  if (canVeto) {
    const vetoBtn = document.createElement('button');
    vetoBtn.className = 'action-btn action-btn--danger';
    vetoBtn.dataset.testId = 'chief-veto-btn';
    vetoBtn.textContent = 'Propose Veto';
    vetoBtn.style.marginTop = '16px';
    vetoBtn.addEventListener('click', () => {
      vetoBtn.disabled = true;
      confirmBtn.disabled = true;
      cardEls.forEach((el) => {
        el.classList.add('policy-card--dimmed');
        el.style.pointerEvents = 'none';
      });
      sendAction({ type: 'propose-veto' });
    });
    content.appendChild(vetoBtn);
  }

  root.appendChild(content);
  container.appendChild(root);

  // GSAP fan-spread entrance
  tl = gsap.timeline();
  const angles = [-6, 6];
  cardEls.forEach((card, i) => {
    gsap.set(card, { rotation: 0, y: 60, opacity: 0 });
    tl!.to(card, {
      rotation: angles[i] ?? 0,
      y: 0,
      opacity: 1,
      duration: 0.35,
      ease: 'back.out(1.4)',
    }, i * 0.12);
  });
}

export function update(_state: AppState): void {
  // One-shot interaction — no dynamic updates.
}

export function unmount(): void {
  setTopBarInstruction('');
  enactTl?.kill();
  enactTl = null;
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
  selectedIndex = null;
}
