import { gsap } from 'gsap';
import type { HostState } from '../../../shared/protocol';
import type { ExecutivePower } from '../../../shared/types';
import { emitTimingEvent } from '../animations/timing-hooks';

let root: HTMLElement | null = null;
let actorEl: HTMLElement | null = null;
let entranceTl: gsap.core.Timeline | null = null;

interface PowerDisplay {
  title: string;
  description: string;
  imageSrc: string;
  icon: string;
}

function getPowerDisplay(power: ExecutivePower): PowerDisplay {
  switch (power) {
    case 'investigate':
      return {
        icon: '',
        title: 'Investigation',
        description: 'The Mayor may investigate one player\u2019s allegiance.',
        imageSrc: '/assets/power-investigate.png',
      };
    case 'special-nomination':
      return {
        icon: '',
        title: 'Special Nomination',
        description: 'The Mayor may choose the next Mayor.',
        imageSrc: '/assets/power-nominate.png',
      };
    case 'policy-peek':
      return {
        icon: '',
        title: 'Policy Peek',
        description: 'The Mayor secretly views the top 3 cards of the policy deck.',
        imageSrc: '/assets/power-peek.png',
      };
    case 'execution':
      return {
        icon: '',
        title: 'Execution',
        description: 'The Mayor must execute one player.',
        imageSrc: '/assets/power-execute.png',
      };
  }
}

export function mount(container: HTMLElement, state: HostState): void {
  root = document.createElement('div');
  root.className = 'host-screen power-overlay';

  const power = state.executivePower;
  if (!power) {
    root.textContent = 'Executive Power';
    container.appendChild(root);
    return;
  }

  const display = getPowerDisplay(power);

  // Overlay wrapper
  const overlay = document.createElement('div');
  overlay.className = 'power-entrance';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.gap = 'var(--space-md)';

  // Icon or art image
  let visualEl: HTMLElement;
  if (display.imageSrc) {
    const artImg = document.createElement('img');
    artImg.className = 'power-overlay__art';
    artImg.src = display.imageSrc;
    artImg.alt = display.title;
    overlay.appendChild(artImg);
    visualEl = artImg;
  } else {
    const iconEl = document.createElement('div');
    iconEl.className = 'power-overlay__icon';
    iconEl.textContent = display.icon;
    overlay.appendChild(iconEl);
    visualEl = iconEl;
  }

  // Title — use overlay-specific class
  const titleEl = document.createElement('div');
  titleEl.className = 'power-overlay__title';
  titleEl.textContent = display.title;
  overlay.appendChild(titleEl);

  // Actor (Mayor name)
  actorEl = document.createElement('div');
  actorEl.className = 'power-overlay__actor';
  overlay.appendChild(actorEl);

  // Description
  const descriptionEl = document.createElement('div');
  descriptionEl.className = 'power-overlay__description';
  descriptionEl.textContent = display.description;
  overlay.appendChild(descriptionEl);

  root.appendChild(overlay);
  container.appendChild(root);

  // Cascading entrance
  const tl = gsap.timeline();
  tl.from(visualEl, { scale: 0.5, opacity: 0, duration: 0.5, ease: 'back.out(1.5)' })
    .from(titleEl, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.2')
    .from(actorEl, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1')
    .from(descriptionEl, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');
  entranceTl = tl;

  emitTimingEvent('power-overlay-enter');
  update(state);
}

export function update(state: HostState): void {
  if (!root) return;

  const mayor = state.players.find((p) => p.isMayor);
  if (actorEl) {
    actorEl.textContent = mayor ? `Mayor ${mayor.name}` : 'Mayor';
  }
}

export function unmount(): void {
  entranceTl?.kill();
  entranceTl = null;
  emitTimingEvent('power-overlay-exit');
  root?.remove();
  root = null;
  actorEl = null;
}
