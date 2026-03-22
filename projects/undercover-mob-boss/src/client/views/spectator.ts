import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { createMiniBoard, updateMiniBoard, destroyMiniBoard } from '../components/mini-board';

let root: HTMLElement | null = null;
let miniBoardEl: HTMLElement | null = null;
let entranceTl: gsap.core.Timeline | null = null;
let ambientTweens: gsap.core.Tween[] = [];

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  // Death vignette overlay — ghostly atmosphere
  const vignette = document.createElement('div');
  vignette.className = 'spectator-death-vignette';
  root.appendChild(vignette);

  // Dead badge
  const badge = document.createElement('div');
  badge.className = 'spectator-badge spectator-badge--dead';
  badge.dataset.testId = 'spectator-badge';
  badge.textContent = 'ELIMINATED';

  const content = document.createElement('div');
  content.className = 'screen-content';

  // Tombstone panel — arched top contains R.I.P. + full mini board
  const panel = document.createElement('div');
  panel.className = 'spectator-panel glass-panel';

  // Tombstone header inside the arch
  const tombstone = document.createElement('div');
  tombstone.className = 'spectator-tombstone';

  const coffinIcon = document.createElement('div');
  coffinIcon.className = 'spectator-tombstone__icon';
  coffinIcon.textContent = '\u26B0';

  const rip = document.createElement('div');
  rip.className = 'spectator-tombstone__rip';
  rip.textContent = 'R.I.P.';

  const playerName = state.serverState?.players.find(p => p.id === state.playerId)?.name ?? 'You';
  const tombName = document.createElement('div');
  tombName.className = 'spectator-tombstone__name';
  tombName.textContent = playerName;

  tombstone.appendChild(coffinIcon);
  tombstone.appendChild(rip);
  tombstone.appendChild(tombName);
  panel.appendChild(tombstone);

  // Full mini board inside the tombstone panel
  if (state.serverState && state.serverState.phase !== 'lobby') {
    miniBoardEl = createMiniBoard(state.serverState);
    panel.appendChild(miniBoardEl);
  }

  content.appendChild(panel);

  root.appendChild(badge);
  root.appendChild(content);
  container.appendChild(root);

  update(state);

  // Entrance animation
  entranceTl = gsap.timeline();
  entranceTl
    .from(vignette, { opacity: 0, duration: 1.2, ease: 'power2.in' })
    .from(badge, { y: -20, opacity: 0, duration: 0.4, ease: 'power2.out' }, '-=0.6')
    .from(coffinIcon, { scale: 0, opacity: 0, rotation: -20, duration: 0.7, ease: 'back.out(1.5)' }, '-=0.3')
    .from(rip, { opacity: 0, y: 10, duration: 0.5, ease: 'power2.out' }, '-=0.2')
    .from(tombName, { opacity: 0, letterSpacing: '0.5em', duration: 0.6, ease: 'power2.out' }, '-=0.2');

  if (miniBoardEl) {
    entranceTl.from(miniBoardEl, { y: 40, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.2');
  }

  // Ambient animations — tracked for cleanup
  ambientTweens = [
    gsap.to(vignette, {
      opacity: 0.85,
      duration: 4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    }),
    gsap.to(coffinIcon, {
      y: -4,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    }),
    gsap.to(coffinIcon, {
      textShadow: '0 0 30px rgba(168, 32, 32, 0.6), 0 0 60px rgba(139, 26, 26, 0.3)',
      duration: 3.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 0.5,
    }),
  ];
}

export function update(state: AppState): void {
  if (!root || !state.serverState) return;
  if (miniBoardEl) {
    updateMiniBoard(state.serverState);
  }
}

export function unmount(): void {
  for (const t of ambientTweens) t.kill();
  ambientTweens = [];
  entranceTl?.kill();
  entranceTl = null;
  root?.remove();
  root = null;
  miniBoardEl = null;
  destroyMiniBoard();
}
