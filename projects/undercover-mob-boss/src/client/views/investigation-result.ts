import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { updateState } from '../state/store';
import { setTopBarInstruction } from '../components/top-bar';
import { markInvestigationBurned } from '../router';

let root: HTMLElement | null = null;
let tl: gsap.core.Timeline | null = null;
let revealTl: gsap.core.Timeline | null = null;
let burnTl: gsap.core.Timeline | null = null;
let autoBurnTimer: ReturnType<typeof setTimeout> | null = null;
let tapPulseTween: gsap.core.Tween | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  const result = state.privateData?.investigationResult;
  const target = state.serverState?.players.find((p) => p.id === result?.targetId);
  const name = target?.name ?? 'Unknown';
  const isCitizen = result?.result === 'citizen';

  setTopBarInstruction(`\u{1F50D} Investigation Result for ${name}`);

  const content = document.createElement('div');
  content.className = 'screen-content';

  // Dossier card container — the card flips to reveal affiliation
  const cardContainer = document.createElement('div');
  cardContainer.className = 'investigation-card';
  cardContainer.dataset.testId = 'investigation-card';

  const cardInner = document.createElement('div');
  cardInner.className = 'investigation-card__inner';

  // Back face — classified / sealed
  const back = document.createElement('div');
  back.className = 'investigation-card__face investigation-card__back';
  const seal = document.createElement('div');
  seal.className = 'investigation-card__seal';
  seal.textContent = '?';
  const classified = document.createElement('div');
  classified.className = 'investigation-card__classified';
  classified.textContent = 'Classified';
  back.appendChild(seal);
  back.appendChild(classified);

  // Front face — affiliation art
  const front = document.createElement('div');
  front.className = `investigation-card__face investigation-card__front investigation-card__front--${isCitizen ? 'citizen' : 'mob'}`;
  const artImg = document.createElement('img');
  artImg.className = 'investigation-card__art';
  artImg.src = isCitizen ? '/assets/role-citizen.png' : '/assets/role-mob-soldier.png';
  artImg.alt = isCitizen ? 'Citizen' : 'Mob';
  artImg.draggable = false;
  front.appendChild(artImg);

  cardInner.appendChild(back);
  cardInner.appendChild(front);
  cardContainer.appendChild(cardInner);

  // "Tap to reveal" prompt
  const tapPrompt = document.createElement('div');
  tapPrompt.className = 'investigation-tap-prompt';
  tapPrompt.dataset.testId = 'investigation-tap-prompt';
  tapPrompt.textContent = 'Tap to reveal';

  // "Burn the evidence." dismiss button (hidden until reveal)
  const burnBtn = document.createElement('button');
  burnBtn.className = 'burn-evidence-btn';
  burnBtn.dataset.testId = 'investigation-burn-btn';
  burnBtn.textContent = 'Burn the evidence.';

  content.appendChild(cardContainer);
  content.appendChild(tapPrompt);
  content.appendChild(burnBtn);
  root.appendChild(content);
  container.appendChild(root);

  // Initial state
  gsap.set(cardInner, { rotationY: 0, transformStyle: 'preserve3d' });
  gsap.set(burnBtn, { opacity: 0, visibility: 'hidden' });

  // Entry: card slides up, tap prompt fades in
  tl = gsap.timeline();
  tl.from(cardContainer, { y: 60, opacity: 0, duration: 0.6, ease: 'power2.out' })
    .from(tapPrompt, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2');

  // Pulse the tap prompt — tracked for cleanup
  tapPulseTween = gsap.to(tapPrompt, {
    opacity: 0.4,
    duration: 1.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  // Phase state machine
  let phase: 'sealed' | 'revealed' | 'burning' = 'sealed';

  content.addEventListener('click', () => {
    if (phase === 'sealed') {
      phase = 'revealed';

      // Kill tap prompt
      gsap.killTweensOf(tapPrompt);
      gsap.to(tapPrompt, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' });

      gsap.set(burnBtn, { visibility: 'visible' });

      // Flip + show burn button
      revealTl = gsap.timeline();
      revealTl
        .to(cardInner, { rotationY: 180, duration: 1, ease: 'power3.inOut' })
        .fromTo(burnBtn,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          '+=0.6',
        );

      // Auto-burn after 5 seconds if mayor doesn't dismiss manually
      autoBurnTimer = setTimeout(() => {
        if (phase === 'revealed') {
          phase = 'burning';
          startBurn(content, cardContainer, root!, () => {
            if (result?.targetId) markInvestigationBurned(result.targetId);
            updateState({ privateData: null });
          });
        }
      }, 5000);

    } else if (phase === 'revealed') {
      phase = 'burning';
      if (autoBurnTimer) { clearTimeout(autoBurnTimer); autoBurnTimer = null; }
      startBurn(content, cardContainer, root!, () => {
        if (result?.targetId) markInvestigationBurned(result.targetId);
        updateState({ privateData: null });
      });
    }
  });
}

// ── Burn the Evidence ──────────────────────────────────────────────
// Ignition flash, content darkens and collapses on itself, embers
// drift up independently from where the card was.

function startBurn(
  content: HTMLElement,
  card: HTMLElement,
  effectsHost: HTMLElement,
  onComplete: () => void,
): void {
  // Spawn embers from card area (on effectsHost so they survive the collapse)
  const cardRect = card.getBoundingClientRect();
  const hostRect = effectsHost.getBoundingClientRect();
  const cx = cardRect.left - hostRect.left;
  const cy = cardRect.top - hostRect.top;

  for (let i = 0; i < 30; i++) {
    const ember = document.createElement('div');
    ember.className = 'burn-ember';
    effectsHost.appendChild(ember);

    const size = 1.5 + Math.random() * 4;
    gsap.set(ember, {
      left: cx + Math.random() * cardRect.width,
      top: cy + Math.random() * cardRect.height,
      width: size,
      height: size,
    });

    gsap.to(ember, {
      y: -(60 + Math.random() * 180),
      x: `+=${(Math.random() - 0.5) * 100}`,
      opacity: 0,
      scale: 0,
      duration: 1.5 + Math.random() * 1.5,
      delay: 0.1 + Math.random() * 1.2,
      ease: 'power1.out',
      onComplete: () => ember.remove(),
    });
  }

  burnTl = gsap.timeline({ onComplete });

  // Ignition flash — content brightens for a split second
  burnTl.to(content, {
    filter: 'brightness(1.8) sepia(0.3)',
    duration: 0.25,
    ease: 'power2.in',
  })
  // Then chars dark
  .to(content, {
    filter: 'brightness(0.1) sepia(1)',
    duration: 0.8,
    ease: 'power2.out',
  });

  // Collapse — shrink, fade, drift up
  burnTl.to(content, {
    scale: 0.2,
    opacity: 0,
    y: -40,
    rotation: 2,
    duration: 2,
    ease: 'power2.in',
  }, 0.5);
}

export function update(_state: AppState): void {
  // Static display — no updates needed
}

export function unmount(): void {
  setTopBarInstruction('');
  if (autoBurnTimer) { clearTimeout(autoBurnTimer); autoBurnTimer = null; }
  tapPulseTween?.kill();
  tapPulseTween = null;
  revealTl?.kill();
  revealTl = null;
  tl?.kill();
  burnTl?.kill();
  tl = null;
  burnTl = null;
  root?.remove();
  root = null;
}
