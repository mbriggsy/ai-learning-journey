import { gsap } from 'gsap';
import { emitTimingEvent } from './timing-hooks';

export function animatePolicyFlip(cardElement: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const inner = cardElement.querySelector('.policy-reveal__inner');
    if (!inner) { resolve(); return; }
    emitTimingEvent('policy-flip-start');
    const tl = gsap.timeline({
      onComplete: () => { emitTimingEvent('policy-flip-complete'); resolve(); }
    });
    tl.to(inner, { rotateY: 90, scale: 1.1, duration: 0.4, ease: 'power2.in' })
      .to(inner, { rotateY: 180, scale: 1, duration: 0.4, ease: 'power2.out' });
  });
}
