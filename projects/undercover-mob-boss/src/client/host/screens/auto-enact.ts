import { gsap } from 'gsap';
import type { HostState } from '../../../shared/protocol';
import { animatePolicyFlip } from '../animations/policy-flip';
import { setupCardImage } from '../../utils/card-assets';

let root: HTMLElement | null = null;
let cardEl: HTMLElement | null = null;
let flipTimer: ReturnType<typeof setTimeout> | null = null;

export function mount(container: HTMLElement, state: HostState): void {
  const card = state.lastEnactedPolicy;
  const policy = card?.type ?? 'bad';

  root = document.createElement('div');
  root.className = 'host-screen';

  // AUTO-ENACTED label
  const badge = document.createElement('div');
  badge.style.fontSize = 'var(--text-sm)';
  badge.style.fontWeight = '700';
  badge.style.textTransform = 'uppercase';
  badge.style.letterSpacing = '0.15em';
  badge.style.color = 'var(--noir-blood)';
  badge.style.padding = 'var(--space-xs) var(--space-sm)';
  badge.style.border = '2px solid var(--noir-blood)';
  badge.style.borderRadius = '4px';
  badge.textContent = 'AUTO-ENACTED';
  root.appendChild(badge);

  const title = document.createElement('h1');
  title.className = 'host-screen__title';
  title.textContent = 'Policy Enacted';
  root.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('div');
  subtitle.className = 'host-screen__subtitle';
  subtitle.textContent = 'Election deadlock';
  root.appendChild(subtitle);

  // Policy card with flip
  cardEl = document.createElement('div');
  cardEl.className = 'policy-reveal';

  const inner = document.createElement('div');
  inner.className = 'policy-reveal__inner';

  const front = document.createElement('div');
  front.className = 'policy-reveal__face policy-reveal__front';
  const frontLabel = document.createElement('span');
  frontLabel.className = 'policy-reveal__label';
  frontLabel.textContent = '?';
  frontLabel.style.color = 'var(--noir-muted)';
  front.appendChild(frontLabel);

  const back = document.createElement('div');
  back.className = `policy-reveal__face policy-reveal__back policy-reveal__back--${policy}`;
  const artImg = document.createElement('img');
  artImg.className = 'policy-reveal__art';
  if (card) {
    setupCardImage(artImg, card.cardId, card.type);
    artImg.alt = card.name;
  } else {
    artImg.src = policy === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
    artImg.alt = policy === 'good' ? 'Citizen Policy' : 'Mob Policy';
  }
  back.appendChild(artImg);
  const backLabel = document.createElement('span');
  backLabel.className = 'policy-reveal__label';
  backLabel.textContent = card?.name ?? (policy === 'good' ? 'Citizen' : 'Mob');
  back.appendChild(backLabel);

  inner.appendChild(front);
  inner.appendChild(back);
  cardEl.appendChild(inner);
  root.appendChild(cardEl);

  // Track info
  const trackInfo = document.createElement('div');
  trackInfo.className = 'host-screen__subtitle';
  if (policy === 'good') {
    trackInfo.textContent = `Citizen Policies: ${state.goodPoliciesEnacted} / 5`;
    trackInfo.style.color = 'var(--noir-gold)';
  } else {
    trackInfo.textContent = `Mob Policies: ${state.badPoliciesEnacted} / 6`;
    trackInfo.style.color = 'var(--noir-blood)';
  }
  root.appendChild(trackInfo);

  container.appendChild(root);

  // Trigger flip
  flipTimer = setTimeout(() => {
    flipTimer = null;
    if (cardEl) {
      void animatePolicyFlip(cardEl).catch(() => {});
    }
  }, 300);
}

export function update(_state: HostState): void {
  // Static screen
}

export function unmount(): void {
  if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
  if (cardEl) {
    const inner = cardEl.querySelector('.policy-reveal__inner');
    if (inner) gsap.killTweensOf(inner);
  }
  root?.remove();
  root = null;
  cardEl = null;
}
