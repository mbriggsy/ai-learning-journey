import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { hapticReveal } from '../haptics';

let root: HTMLElement | null = null;
let flipped = false;
let acknowledged = false;
let flipTl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  flipped = false;
  acknowledged = false;

  root = document.createElement('div');
  root.className = 'screen';

  const content = document.createElement('div');
  content.className = 'screen-content';

  // Card container
  const card = document.createElement('div');
  card.className = 'role-reveal-card';
  card.dataset.testId = 'role-card';
  card.draggable = false;

  const inner = document.createElement('div');
  inner.className = 'role-reveal-card__inner';

  // Back face — sealed envelope with noir luxury treatment
  const back = document.createElement('div');
  back.className = 'role-reveal-card__face role-reveal-card__back';

  // Wax seal emblem
  const seal = document.createElement('div');
  seal.className = 'role-reveal-card__seal';
  seal.textContent = 'UMB';
  back.appendChild(seal);

  // "Classified" label
  const classified = document.createElement('div');
  classified.className = 'role-reveal-card__classified';
  classified.textContent = 'Classified';
  back.appendChild(classified);

  // Tap hint
  const backHint = document.createElement('div');
  backHint.className = 'role-reveal-card__hint';
  backHint.dataset.testId = 'role-card-hint';
  backHint.textContent = 'Tap to open';
  back.appendChild(backHint);

  // Front face (role) — now with art
  const front = document.createElement('div');
  front.className = 'role-reveal-card__face role-reveal-card__front';

  const roleName = state.privateData?.role ?? state.serverState?.myRole ?? 'Unknown';

  // Role art image
  const roleImg = document.createElement('img');
  roleImg.src = getRoleArt(roleName);
  roleImg.alt = formatRoleName(roleName);
  roleImg.draggable = false;
  roleImg.style.width = '100%';
  roleImg.style.height = '100%';
  roleImg.style.objectFit = 'cover';
  front.appendChild(roleImg);

  inner.appendChild(back);
  inner.appendChild(front);
  card.appendChild(inner);

  // Role name label (below card)
  const roleLabel = document.createElement('h1');
  roleLabel.textContent = formatRoleName(roleName);
  roleLabel.className = roleName === 'citizen' ? 'text-gold' : 'text-blood';
  roleLabel.dataset.testId = 'role-name';
  roleLabel.style.opacity = '0';
  roleLabel.style.transition = 'opacity 300ms ease-out';

  // Allies info
  const allies = document.createElement('div');
  allies.className = 'role-reveal__allies';
  allies.dataset.testId = 'role-allies';
  const allyIds = state.privateData?.knownAllies ?? state.serverState?.myKnownAllies ?? [];
  if (allyIds.length > 0 && state.serverState) {
    const mobBossId = state.privateData?.mobBossId ?? null;
    const allyLabels = allyIds.map((id) => {
      const name = state.serverState!.players.find((p) => p.id === id)?.name ?? id;
      if (mobBossId && id === mobBossId) return `${name} (Mob Boss)`;
      if (mobBossId) return `${name} (Soldier)`;
      return name;
    });
    const heading = document.createElement('div');
    heading.textContent = 'Your allies:';
    heading.style.marginBottom = '6px';
    heading.style.opacity = '0.7';
    allies.appendChild(heading);
    for (const label of allyLabels) {
      const line = document.createElement('div');
      line.textContent = label;
      allies.appendChild(line);
    }
  }

  // Wrap card + info in a fixed-height group so allies don't shift card position
  const cardGroup = document.createElement('div');
  cardGroup.style.position = 'relative';
  cardGroup.style.display = 'flex';
  cardGroup.style.flexDirection = 'column';
  cardGroup.style.alignItems = 'center';

  // Allies hidden until flip — fixed min-height so mob/citizen cards look identical
  allies.style.opacity = '0';
  allies.style.visibility = 'hidden';
  allies.style.minHeight = '60px';
  allies.style.transition = 'opacity 300ms ease-out';

  cardGroup.appendChild(card);
  cardGroup.appendChild(roleLabel);
  cardGroup.appendChild(allies);
  content.appendChild(cardGroup);
  root.appendChild(content);
  container.appendChild(root);

  // Set initial 3D state for GSAP flip
  gsap.set(inner, { rotationY: 0, transformStyle: 'preserve3d' });

  // Tap card to flip open / flip closed + acknowledge
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    if (flipTl?.isActive() && flipTl.time() < 0.2) return;

    if (!flipped) {
      // Flip open — reveal role
      flipped = true;
      hapticReveal();

      flipTl = gsap.timeline();
      flipTl.to(inner, {
        rotationY: 180,
        duration: 0.8,
        ease: 'power2.inOut',
      });
      // Reveal label + allies smoothly after flip
      flipTl.to(roleLabel, { opacity: 1, duration: 0.3 }, '-=0.1');
      flipTl.add(() => {
        allies.style.visibility = '';
      });
      flipTl.to(allies, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    } else {
      // Tap again — flip back to sealed
      flipped = false;

      flipTl = gsap.timeline();
      flipTl.to([roleLabel, allies], { opacity: 0, duration: 0.2 });
      flipTl.to(inner, { rotationY: 0, duration: 0.6, ease: 'power2.inOut' });

      // Acknowledge on first close only
      if (!acknowledged) {
        acknowledged = true;
        sendAction({ type: 'acknowledge-role' });
      }
    }
  });
}

export function update(state: AppState): void {
  // Re-render allies text when privateData arrives (mobBossId comes after initial mount)
  if (!root) return;
  const alliesEl = root.querySelector('.role-reveal__allies');
  if (!alliesEl) return;

  const allyIds = state.privateData?.knownAllies ?? state.serverState?.myKnownAllies ?? [];
  if (allyIds.length > 0 && state.serverState) {
    const mobBossId = state.privateData?.mobBossId ?? null;
    const allyLabels = allyIds.map((id) => {
      const name = state.serverState!.players.find((p) => p.id === id)?.name ?? id;
      if (mobBossId && id === mobBossId) return `${name} (Mob Boss)`;
      if (mobBossId) return `${name} (Soldier)`;
      return name;
    });
    while (alliesEl.firstChild) alliesEl.removeChild(alliesEl.firstChild);
    const heading = document.createElement('div');
    heading.textContent = 'Your allies:';
    heading.style.marginBottom = '6px';
    heading.style.opacity = '0.7';
    alliesEl.appendChild(heading);
    for (const label of allyLabels) {
      const line = document.createElement('div');
      line.textContent = label;
      alliesEl.appendChild(line);
    }
  }
}

export function unmount(): void {
  flipTl?.kill();
  flipTl = null;
  root?.remove();
  root = null;
  flipped = false;
  acknowledged = false;
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
