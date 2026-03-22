// ── Investigated Alert ──────────────────────────────────────────────
// Full-screen overlay shown to a player when they've been investigated.
// Tap to dismiss (no auto-dismiss — player may be AFK). Haptic buzz on mount.

import { gsap } from 'gsap';
import { hapticInvestigated } from '../haptics';

let overlayEl: HTMLElement | null = null;
let tl: gsap.core.Timeline | null = null;
let iconTween: gsap.core.Tween | null = null;

export function showInvestigatedAlert(byPlayerName: string): void {
  if (overlayEl) return; // Already showing

  // Haptic — long buzz pattern: "you've been made"
  hapticInvestigated();

  overlayEl = document.createElement('div');
  overlayEl.className = 'investigated-overlay';

  // Searchlight sweep effect
  const sweep = document.createElement('div');
  sweep.className = 'investigated-sweep';
  overlayEl.appendChild(sweep);

  // Content
  const content = document.createElement('div');
  content.className = 'investigated-content';

  // Magnifying glass icon
  const icon = document.createElement('div');
  icon.className = 'investigated-icon';
  icon.textContent = '\u{1F50D}';

  // "UNDER INVESTIGATION" title
  const title = document.createElement('div');
  title.className = 'investigated-title';
  title.textContent = 'Under Investigation';

  // Who investigated
  const subtitle = document.createElement('div');
  subtitle.className = 'investigated-subtitle';
  subtitle.textContent = `${byPlayerName} is looking into your allegiance`;

  // Flavor
  const flavor = document.createElement('div');
  flavor.className = 'investigated-flavor';
  flavor.textContent = 'The Mayor will know where you stand.\nThe question is — what will they do with it?';

  // Dismiss prompt — styled as a thematic button
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'investigated-confirm';
  dismissBtn.textContent = 'Keep your composure.';

  content.appendChild(icon);
  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(flavor);
  content.appendChild(dismissBtn);
  overlayEl.appendChild(content);

  document.body.appendChild(overlayEl);

  // Tap anywhere (including button) to dismiss
  overlayEl.addEventListener('click', () => {
    dismissInvestigatedAlert();
  });

  // GSAP entrance
  tl = gsap.timeline();

  tl.from(overlayEl, { opacity: 0, duration: 0.4, ease: 'power2.out' })
    .from(sweep, { x: '-100%', duration: 0.8, ease: 'power2.inOut' }, '-=0.2')
    .from(icon, { scale: 0, rotation: -180, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.4')
    .from(title, { y: 30, opacity: 0, letterSpacing: '0.6em', duration: 0.6, ease: 'power3.out' }, '-=0.2')
    .from(subtitle, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.1')
    .from(flavor, { opacity: 0, duration: 0.4, ease: 'power2.out' })
    // Button fades up after the drama settles
    .from(dismissBtn, { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out' }, '+=0.6');

  // Magnifying glass slow rotation — tracked for cleanup
  iconTween = gsap.to(icon, {
    rotation: 15,
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 1.5,
  });
}

function dismissInvestigatedAlert(): void {
  if (!overlayEl) return;

  const el = overlayEl;
  overlayEl = null;

  iconTween?.kill();
  iconTween = null;

  gsap.to(el, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: () => {
      tl?.kill();
      tl = null;
      el.remove();
    },
  });
}
