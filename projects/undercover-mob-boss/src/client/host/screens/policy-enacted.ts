import { gsap } from 'gsap';
import type { HostState } from '../../../shared/protocol';
import { animatePolicyFlip } from '../animations/policy-flip';

let root: HTMLElement | null = null;
let cardEl: HTMLElement | null = null;
let flipDone = false;
let flipTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Determine which policy was just enacted by looking at events.
 */
function getEnactedPolicy(state: HostState): 'good' | 'bad' {
  const events = state.events;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'policy-enacted') {
      return (events[i] as { type: 'policy-enacted'; policy: 'good' | 'bad' }).policy;
    }
  }
  // Fallback: determine from counts
  return state.badPoliciesEnacted > 0 ? 'bad' : 'good';
}

export function mount(container: HTMLElement, state: HostState): void {
  flipDone = false;
  const policy = getEnactedPolicy(state);

  root = document.createElement('div');
  root.className = 'host-screen';

  const title = document.createElement('h1');
  title.className = 'host-screen__title';
  title.textContent = 'Policy Enacted';
  root.appendChild(title);

  // Policy card with flip animation
  cardEl = document.createElement('div');
  cardEl.className = 'policy-reveal';

  const inner = document.createElement('div');
  inner.className = 'policy-reveal__inner';

  // Front (face-down)
  const front = document.createElement('div');
  front.className = 'policy-reveal__face policy-reveal__front';
  const frontLabel = document.createElement('span');
  frontLabel.className = 'policy-reveal__label';
  frontLabel.textContent = '?';
  frontLabel.style.color = 'var(--noir-muted)';
  front.appendChild(frontLabel);

  // Back (revealed policy)
  const back = document.createElement('div');
  back.className = `policy-reveal__face policy-reveal__back policy-reveal__back--${policy}`;
  const artImg = document.createElement('img');
  artImg.className = 'policy-reveal__art';
  artImg.src = policy === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
  artImg.alt = policy === 'good' ? 'Citizen Policy' : 'Mob Policy';
  back.appendChild(artImg);
  const backLabel = document.createElement('span');
  backLabel.className = 'policy-reveal__label';
  backLabel.textContent = policy === 'good' ? 'Citizen' : 'Mob';
  back.appendChild(backLabel);

  inner.appendChild(front);
  inner.appendChild(back);
  cardEl.appendChild(inner);
  root.appendChild(cardEl);

  // Track update info
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

  // Trigger flip after a brief delay
  flipTimer = setTimeout(() => {
    flipTimer = null;
    if (cardEl) {
      void animatePolicyFlip(cardEl).then(() => {
        flipDone = true;
      }).catch(() => {
        flipDone = true;
      });
    }
  }, 300);
}

export function update(state: HostState): void {
  // Static screen — no dynamic updates needed after mount
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
  flipDone = false;
}
