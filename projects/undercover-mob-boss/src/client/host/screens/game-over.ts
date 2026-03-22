import { gsap } from 'gsap';
import type { HostState, RevealedPlayer } from '../../../shared/protocol';
import { send } from '../../connection';
import { emitTimingEvent } from '../animations/timing-hooks';

let root: HTMLElement | null = null;
let winnerEl: HTMLElement | null = null;
let reasonEl: HTMLElement | null = null;
let rolesListEl: HTMLElement | null = null;
let statsEl: HTMLElement | null = null;
let entranceTl: gsap.core.Timeline | null = null;

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function formatRole(role: string): string {
  switch (role) {
    case 'citizen': return 'Citizen';
    case 'mob-soldier': return 'Mob Soldier';
    case 'mob-boss': return 'Mob Boss';
    default: return role;
  }
}

function getRoleBadgeClass(role: string): string {
  if (role === 'citizen') return 'host-text-gold';
  return 'host-text-blood';
}

export function mount(container: HTMLElement, state: HostState): void {
  root = document.createElement('div');
  root.className = 'host-screen';

  emitTimingEvent('game-over-reveal');

  // Winner announcement
  winnerEl = document.createElement('h1');
  winnerEl.className = 'host-screen__title';
  winnerEl.dataset.testId = 'host-game-over-winner';
  winnerEl.style.fontSize = '2.5rem';
  root.appendChild(winnerEl);

  // Win reason
  reasonEl = document.createElement('div');
  reasonEl.className = 'host-screen__subtitle';
  reasonEl.dataset.testId = 'host-game-over-reason';
  reasonEl.style.fontSize = '1.2rem';
  root.appendChild(reasonEl);

  // Role reveal list
  const rolesSection = document.createElement('div');
  rolesSection.style.width = '90%';
  rolesSection.style.maxWidth = '900px';
  rolesSection.style.marginTop = 'var(--space-sm)';

  const rolesHeader = document.createElement('div');
  rolesHeader.style.fontSize = '1rem';
  rolesHeader.style.color = 'var(--noir-muted)';
  rolesHeader.style.textTransform = 'uppercase';
  rolesHeader.style.letterSpacing = '0.15em';
  rolesHeader.style.marginBottom = 'var(--space-sm)';
  rolesHeader.style.textAlign = 'center';
  rolesHeader.textContent = 'All Roles Revealed';
  rolesSection.appendChild(rolesHeader);

  rolesListEl = document.createElement('div');
  rolesListEl.style.display = 'grid';
  rolesListEl.style.gridTemplateColumns = '1fr 1fr';
  rolesListEl.style.gap = '4px 48px';
  rolesSection.appendChild(rolesListEl);

  root.appendChild(rolesSection);

  // Stats
  statsEl = document.createElement('div');
  statsEl.style.fontSize = '1rem';
  statsEl.style.color = 'var(--noir-cream)';
  statsEl.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.6)';
  statsEl.style.marginTop = 'var(--space-sm)';
  statsEl.style.textAlign = 'center';
  root.appendChild(statsEl);

  // Play Again button
  const playAgainBtn = document.createElement('button');
  playAgainBtn.className = 'host-btn';
  playAgainBtn.textContent = 'Play Again';
  playAgainBtn.style.marginTop = 'var(--space-sm)';
  playAgainBtn.addEventListener('click', () => {
    send({ type: 'reset-to-lobby', payload: {} });
  });
  root.appendChild(playAgainBtn);

  container.appendChild(root);
  update(state);

  // Entrance animation timeline
  const tl = gsap.timeline();
  tl.from(winnerEl, { scale: 0.5, opacity: 0, duration: 0.6, ease: 'back.out(1.5)' })
    .from(reasonEl, { y: 20, opacity: 0, duration: 0.3 }, '-=0.3');
  if (rolesListEl && rolesListEl.children.length > 0) {
    tl.from(Array.from(rolesListEl.children), { x: -30, opacity: 0, stagger: 0.08, duration: 0.3 }, '-=0.1');
  }
  tl.from(playAgainBtn, { y: 20, opacity: 0, duration: 0.3 }, '-=0.1');
  entranceTl = tl;
}

export function update(state: HostState): void {
  if (!root) return;

  // Winner
  if (winnerEl) {
    if (state.winner === 'citizens') {
      winnerEl.textContent = 'Citizens Win!';
      winnerEl.className = 'host-screen__title host-text-gold';
    } else if (state.winner === 'mob') {
      winnerEl.textContent = 'Mob Wins!';
      winnerEl.className = 'host-screen__title host-text-blood';
    } else {
      winnerEl.textContent = 'Game Over';
      winnerEl.className = 'host-screen__title host-text-muted';
    }
  }

  // Reason
  if (reasonEl) {
    reasonEl.textContent = state.winReason ?? '';
  }

  // Roles
  if (rolesListEl) {
    clearChildren(rolesListEl);
    for (const player of state.players) {
      const revealed = player as RevealedPlayer;
      const cell = document.createElement('div');
      cell.style.padding = '6px 12px';
      cell.style.borderBottom = '1px solid var(--noir-smoke)';

      const nameEl = document.createElement('div');
      nameEl.style.fontSize = '1.25rem';
      nameEl.style.fontWeight = '600';
      nameEl.style.fontFamily = 'var(--font-display)';
      nameEl.style.letterSpacing = '0.04em';
      nameEl.textContent = player.name;
      if (!player.isAlive) {
        nameEl.style.textDecoration = 'line-through';
        nameEl.style.opacity = '0.6';
      }

      const roleEl = document.createElement('div');
      roleEl.style.fontSize = '1rem';
      roleEl.style.fontWeight = '700';
      if (revealed.role) {
        roleEl.textContent = formatRole(revealed.role);
        roleEl.className = getRoleBadgeClass(revealed.role);
      }

      cell.appendChild(nameEl);
      cell.appendChild(roleEl);
      rolesListEl.appendChild(cell);
    }
  }

  // Stats
  if (statsEl) {
    statsEl.textContent = `Rounds played: ${state.round} | Citizen policies: ${state.goodPoliciesEnacted} | Mob policies: ${state.badPoliciesEnacted}`;
  }
}

export function unmount(): void {
  entranceTl?.kill();
  entranceTl = null;
  root?.remove();
  root = null;
  winnerEl = null;
  reasonEl = null;
  rolesListEl = null;
  statsEl = null;
}
