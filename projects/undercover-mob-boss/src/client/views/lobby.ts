import { gsap } from 'gsap';
import type { AppState } from '../state/store';

let root: HTMLElement | null = null;
let codeEl: HTMLElement | null = null;
let listEl: HTMLElement | null = null;
let flavorEl: HTMLElement | null = null;
let rosterLabel: HTMLElement | null = null;
let tl: gsap.core.Timeline | null = null;

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function mount(container: HTMLElement, state: AppState): void {
  root = document.createElement('div');
  root.className = 'screen';

  // ── Golden glow orb (behind content) ──
  const glow = el('div', 'ploby__glow');
  root.appendChild(glow);

  // ── Art deco corners ──
  for (const pos of ['tl', 'tr', 'bl', 'br']) {
    root.appendChild(el('div', `ploby__deco ploby__deco--${pos}`));
  }

  const content = document.createElement('div');
  content.className = 'screen-content';

  // ── Title treatment ──
  flavorEl = el('div', 'ploby__tagline');
  content.appendChild(flavorEl);

  const title = document.createElement('h1');
  title.className = 'ploby__title';
  title.appendChild(document.createTextNode('Undercover'));
  title.appendChild(document.createElement('br'));
  title.appendChild(document.createTextNode('Mob Boss'));
  content.appendChild(title);

  // ── Art deco divider ──
  const divider = el('div', 'ploby__divider');
  divider.appendChild(el('span', 'ploby__divider-line'));
  divider.appendChild(el('span', 'ploby__divider-text', 'Est. 1947'));
  divider.appendChild(el('span', 'ploby__divider-line'));
  content.appendChild(divider);

  // ── Room code pill ──
  const codePill = el('div', 'ploby__code-pill');
  codePill.appendChild(el('span', 'ploby__code-label', 'Room'));
  codeEl = el('span', 'ploby__code');
  codeEl.dataset.testId = 'lobby-room-code';
  codePill.appendChild(codeEl);
  content.appendChild(codePill);

  // ── Player roster ──
  rosterLabel = el('div', 'ploby__roster-label');
  content.appendChild(rosterLabel);

  listEl = document.createElement('ul');
  listEl.className = 'ploby__roster';
  listEl.dataset.testId = 'lobby-player-list';
  content.appendChild(listEl);

  // ── How to Play ──
  const htpLink = document.createElement('a');
  htpLink.className = 'ploby__htp';
  htpLink.href = '/how-to-play.html';
  htpLink.target = '_blank';
  htpLink.rel = 'noopener';
  htpLink.textContent = 'How to Play';
  content.appendChild(htpLink);

  root.appendChild(content);
  container.appendChild(root);

  update(state);

  // ── Cinematic GSAP entrance ──
  tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(glow, { opacity: 0, scale: 0.6, duration: 1.2, ease: 'power2.out' })
    .from(flavorEl, { opacity: 0, y: -12, duration: 0.5 }, 0.2)
    .from(title, { opacity: 0, scale: 0.85, duration: 0.6, ease: 'back.out(1.3)' }, 0.35)
    .from(divider, { opacity: 0, scaleX: 0, duration: 0.4 }, 0.6)
    .from(codePill, { opacity: 0, y: 15, duration: 0.4 }, 0.75)
    .from(rosterLabel!, { opacity: 0, duration: 0.3 }, 0.9);

  const chips = listEl.querySelectorAll('.ploby__chip');
  if (chips.length > 0) {
    tl.from(chips, { opacity: 0, y: 10, stagger: 0.05, duration: 0.25 }, 0.95);
  }
  tl.from(htpLink, { opacity: 0, duration: 0.4 }, '-=0.1');

  // Deco corners fade in
  const corners = root.querySelectorAll('.ploby__deco');
  tl.from(corners, { opacity: 0, duration: 0.6 }, 0.3);
}

export function update(state: AppState): void {
  if (!codeEl || !listEl || !state.lobbyState) return;

  const ss = state.lobbyState;
  codeEl.textContent = ss.roomCode;

  const players = ss.players;

  // Update tagline based on player count
  if (flavorEl) {
    if (players.length < 5) {
      flavorEl.textContent = 'The streets grow restless\u2026';
    } else {
      flavorEl.textContent = 'The syndicate assembles.';
    }
  }

  // Update roster label
  if (rosterLabel) {
    rosterLabel.textContent = `Assembling the Crew \u00B7 ${players.length}/10`;
  }

  // Rebuild player chips
  const prevCount = listEl.children.length;
  clearChildren(listEl);
  for (const p of players) {
    const li = document.createElement('li');
    li.className = 'ploby__chip';
    li.dataset.testId = 'lobby-player-item';

    const dot = document.createElement('span');
    dot.className = p.isConnected ? 'ploby__dot' : 'ploby__dot ploby__dot--off';

    const name = document.createElement('span');
    name.className = 'ploby__name';
    name.textContent = p.name ?? p.id;

    li.appendChild(dot);
    li.appendChild(name);
    listEl.appendChild(li);
  }

  // Animate newly added players
  if (players.length > prevCount && prevCount > 0) {
    const newItems = Array.from(listEl.children).slice(prevCount);
    gsap.from(newItems, { opacity: 0, y: 10, stagger: 0.05, duration: 0.25, ease: 'power2.out' });
  }
}

export function unmount(): void {
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
  codeEl = null;
  listEl = null;
  flavorEl = null;
  rosterLabel = null;
}
