import { gsap } from 'gsap';
import { emitTimingEvent } from './timing-hooks';

export function animateVoteReveal(cardElements: HTMLElement[]): Promise<void> {
  return new Promise((resolve) => {
    if (cardElements.length === 0) { resolve(); return; }
    emitTimingEvent('vote-reveal-start');
    const tl = gsap.timeline({
      onComplete: () => { emitTimingEvent('vote-reveal-complete'); resolve(); }
    });
    cardElements.forEach((card, i) => {
      const inner = card.querySelector('.vote-card__inner');
      if (!inner) return;
      tl.to(inner, { rotateY: 180, duration: 0.5, ease: 'power2.inOut' }, i * 0.2);
    });
  });
}
