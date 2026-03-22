import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { updateState } from '../state/store';
import { attachSwipe } from '../gestures/swipe';
import { hapticPeek } from '../haptics';

let overlayEl: HTMLElement | null = null;
let timeline: gsap.core.Timeline | null = null;
let swipeCleanup: (() => void) | null = null;

export function mountRolePeek(state: AppState): void {
  if (overlayEl) return;

  hapticPeek();

  const roleName = state.privateData?.role ?? state.serverState?.myRole ?? 'Unknown';
  const allyIds = state.privateData?.knownAllies ?? state.serverState?.myKnownAllies ?? [];
  const mobBossId = state.privateData?.mobBossId ?? null;

  // Build overlay
  overlayEl = document.createElement('div');
  overlayEl.className = 'role-peek-overlay';

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'role-peek-backdrop';
  backdrop.addEventListener('click', dismiss);

  // Card
  const card = document.createElement('div');
  card.className = 'role-peek-card';

  // Role art
  const artImg = document.createElement('img');
  artImg.className = 'role-peek-card__art';
  artImg.src = getRoleArt(roleName);
  artImg.alt = formatRoleName(roleName);
  artImg.draggable = false;

  // Info panel
  const info = document.createElement('div');
  info.className = 'role-peek-card__info glass-panel';

  const roleTitle = document.createElement('h2');
  roleTitle.className = roleName === 'citizen' ? 'text-gold' : 'text-blood';
  roleTitle.textContent = formatRoleName(roleName);
  info.appendChild(roleTitle);

  // Allies for mob soldiers
  if (allyIds.length > 0 && state.serverState) {
    const alliesEl = document.createElement('p');
    alliesEl.className = 'role-peek-card__allies text-muted';
    const allyLabels = allyIds.map((id) => {
      const name = state.serverState!.players.find((p) => p.id === id)?.name ?? id;
      if (mobBossId && id === mobBossId) return `${name} (Boss)`;
      if (mobBossId) return `${name} (Soldier)`;
      return name;
    });
    alliesEl.textContent = `Allies: ${allyLabels.join(', ')}`;
    info.appendChild(alliesEl);
  }

  // Dismiss button
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'action-btn role-peek-card__dismiss';
  dismissBtn.textContent = 'Got it';
  dismissBtn.addEventListener('click', dismiss);

  card.appendChild(artImg);
  card.appendChild(info);

  overlayEl.appendChild(backdrop);
  overlayEl.appendChild(card);
  overlayEl.appendChild(dismissBtn);
  document.body.appendChild(overlayEl);

  // Swipe down to dismiss
  swipeCleanup = attachSwipe({
    el: overlayEl,
    direction: 'down',
    threshold: 60,
    onSwipe: dismiss,
  });

  // GSAP entrance
  timeline = gsap.timeline();
  timeline.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
  timeline.fromTo(
    card,
    { y: '100%', opacity: 0 },
    { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.2)' },
    '-=0.1',
  );
  timeline.fromTo(
    dismissBtn,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
    '-=0.1',
  );
}

export function unmountRolePeek(): void {
  timeline?.kill();
  timeline = null;
  swipeCleanup?.();
  swipeCleanup = null;
  overlayEl?.remove();
  overlayEl = null;
}

export function isRolePeekMounted(): boolean {
  return overlayEl !== null;
}

function dismiss(): void {
  if (!overlayEl) return;

  const backdrop = overlayEl.querySelector('.role-peek-backdrop') as HTMLElement;
  const card = overlayEl.querySelector('.role-peek-card') as HTMLElement;
  const dismissBtn = overlayEl.querySelector('.role-peek-card__dismiss') as HTMLElement;

  timeline?.kill();
  timeline = gsap.timeline({
    onComplete: () => {
      unmountRolePeek();
      updateState({ isRolePeekOpen: false });
    },
  });
  if (dismissBtn) {
    timeline.to(dismissBtn, { opacity: 0, duration: 0.1 });
  }
  if (card) {
    timeline.to(card, { y: '100%', opacity: 0, duration: 0.25, ease: 'power2.in' }, '<');
  }
  if (backdrop) {
    timeline.to(backdrop, { opacity: 0, duration: 0.2 }, '-=0.1');
  }
}

function getRoleArt(role: string): string {
  switch (role) {
    case 'citizen': return '/assets/role-citizen.png';
    case 'mob-soldier': return '/assets/role-mob-soldier.png';
    case 'mob-boss': return '/assets/role-mob-boss.png';
    default: return '/assets/role-citizen.png';
  }
}

function formatRoleName(role: string): string {
  switch (role) {
    case 'citizen': return 'Citizen';
    case 'mob-soldier': return 'Mob Soldier';
    case 'mob-boss': return 'Mob Boss';
    default: return role;
  }
}
