import { gsap } from 'gsap';
import type { HostState, LobbyState } from '../../../shared/protocol';
import { isLobbyState } from '../../../shared/protocol';
import { send } from '../../connection';
import QRCode from 'qrcode';

// Test scenario IDs — must match server's SCENARIO_IDS
const DEV_SCENARIOS = [
  'execution',
  'investigation',
  'special-nomination',
  'policy-peek',
  'policy-session',
  'election',
  'veto',
  'game-over-citizens',
  'game-over-mob',
] as const;

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

// ── DOM references ───────────────────────────────────────────────

let root: HTMLElement | null = null;
let codeEl: HTMLElement | null = null;
let qrOverlay: HTMLElement | null = null;
let playerListEl: HTMLElement | null = null;
let playerCountEl: HTMLElement | null = null;
let startBtn: HTMLElement | null = null;
let sealTween: gsap.core.Tween | null = null;
let readyPulse: gsap.core.Tween | null = null;

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent.appendChild(e);
  return e;
}

// ── Mount ────────────────────────────────────────────────────────

export function mount(container: HTMLElement, state: HostState | LobbyState): void {
  root = document.createElement('div');
  root.className = 'lobby';

  // ── Cinematic background layers ──────────────────────────────
  const bgLayers = el('div', 'lobby__bg', root);
  el('div', 'lobby__bg-city', bgLayers);        // noir cityscape
  el('div', 'lobby__bg-fade-v', bgLayers);       // vertical fade
  el('div', 'lobby__bg-fade-h', bgLayers);       // horizontal fade
  el('div', 'lobby__bg-glow', bgLayers);         // central golden glow
  el('div', 'lobby__bg-vignette', bgLayers);     // vignette
  el('div', 'lobby__bg-grain', bgLayers);        // film grain

  // ── Art deco corners ─────────────────────────────────────────
  el('div', 'lobby__deco-corner lobby__deco-corner--tl', root);
  el('div', 'lobby__deco-corner lobby__deco-corner--tr', root);
  el('div', 'lobby__deco-corner lobby__deco-corner--bl', root);
  el('div', 'lobby__deco-corner lobby__deco-corner--br', root);

  // ── Main content ─────────────────────────────────────────────
  const main = el('div', 'lobby__main', root);

  // Title treatment
  const titleBlock = el('div', 'lobby__title-block', main);
  const tagline = el('p', 'lobby__tagline', titleBlock);
  tagline.textContent = 'A game of loyalty and betrayal';
  const title = el('h1', 'lobby__title', titleBlock);
  title.textContent = 'Undercover Mob Boss';

  // Art deco divider
  const divider = el('div', 'lobby__divider', titleBlock);
  el('div', 'lobby__divider-line', divider);
  const est = el('span', 'lobby__divider-text', divider);
  est.textContent = 'EST. 1947';
  el('div', 'lobby__divider-line', divider);

  // Room code pill — tap to show QR overlay
  const codePill = el('div', 'lobby__code-pill', main);
  const codeGroup = el('div', 'lobby__code-group', codePill);
  const codeLabel = el('span', 'lobby__code-label', codeGroup);
  codeLabel.textContent = 'Room Code';
  codeEl = el('span', 'lobby__room-code', codeGroup);

  // QR icon inside pill — visual hint that it's tappable
  const qrIcon = el('div', 'lobby__code-qr-icon', codePill);
  qrIcon.title = 'Tap for QR code';
  // 2x2 grid of small squares to suggest a QR code
  for (let i = 0; i < 4; i++) {
    el('span', 'lobby__code-qr-dot', qrIcon);
  }

  codePill.style.cursor = 'pointer';
  codePill.addEventListener('click', () => showQrOverlay());

  // How to Play link
  const htpLink = document.createElement('a');
  htpLink.className = 'lobby__htp-link';
  htpLink.href = '/how-to-play.html';
  htpLink.target = '_blank';
  htpLink.rel = 'noopener';
  htpLink.textContent = 'How to Play';
  main.appendChild(htpLink);

  // QR overlay (hidden until tapped)
  qrOverlay = el('div', 'lobby__qr-overlay', root);
  qrOverlay.style.display = 'none';

  const qrBackdrop = el('div', 'lobby__qr-backdrop', qrOverlay);
  qrBackdrop.addEventListener('click', () => hideQrOverlay());

  const qrCard = el('div', 'lobby__qr-card', qrOverlay);
  const qrTitle = el('div', 'lobby__qr-title', qrCard);
  qrTitle.textContent = 'Scan to Join';
  const qrCanvas = el('div', 'lobby__qr-canvas', qrCard);
  qrCanvas.dataset.testId = 'lobby-qr';
  const qrDismiss = document.createElement('button');
  qrDismiss.className = 'lobby__qr-dismiss';
  qrDismiss.textContent = 'Close';
  qrDismiss.addEventListener('click', () => hideQrOverlay());
  qrCard.appendChild(qrDismiss);

  // Player roster
  const roster = el('div', 'lobby__roster', main);
  playerCountEl = el('div', 'lobby__roster-label', roster);
  playerCountEl.dataset.testId = 'host-player-count';
  playerListEl = el('div', 'lobby__player-grid', roster);

  // ── Start button (footer) ────────────────────────────────────
  const footer = el('div', 'lobby__footer', root);
  startBtn = document.createElement('button');
  startBtn.className = 'lobby__start-btn';
  startBtn.dataset.testId = 'host-start-btn';
  startBtn.textContent = 'Start Game';
  startBtn.addEventListener('click', () => {
    send({ type: 'start-game', payload: {} });
  });
  footer.appendChild(startBtn);

  // ── Bottom deco line ─────────────────────────────────────────
  el('div', 'lobby__bottom-line', root);

  // ── DEV tools (localhost only) ───────────────────────────────
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    root.appendChild(createDevTools());
  }

  container.appendChild(root);
  update(state);
  animateEntrance();
}

// ── Dev tools ────────────────────────────────────────────────────

function createDevTools(): HTMLElement {
  const devSection = document.createElement('div');
  devSection.className = 'lobby__dev-tools';

  const devLabel = el('span', 'lobby__dev-label', devSection);
  devLabel.textContent = 'DEV';

  const botRow = el('div', 'lobby__dev-row', devSection);

  const botSelect = document.createElement('select');
  botSelect.dataset.testId = 'host-bot-count';
  botSelect.className = 'lobby__dev-select';
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i}`;
    if (i === 5) opt.selected = true;
    botSelect.appendChild(opt);
  }

  const spawnBtn = document.createElement('button');
  spawnBtn.className = 'lobby__dev-btn';
  spawnBtn.dataset.testId = 'host-spawn-bots';
  spawnBtn.textContent = '+ Bots';
  spawnBtn.addEventListener('click', () => {
    send({ type: 'spawn-test-players', payload: { count: Number(botSelect.value) } });
  });

  botRow.appendChild(botSelect);
  botRow.appendChild(spawnBtn);

  const select = document.createElement('select');
  select.className = 'lobby__dev-select';
  select.dataset.testId = 'host-scenario-select';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Load scenario...';
  select.appendChild(defaultOpt);

  for (const id of DEV_SCENARIOS) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    if (select.value) {
      send({ type: 'load-scenario', payload: { scenario: select.value } });
      select.value = '';
    }
  });

  devSection.appendChild(select);
  return devSection;
}

// ── QR overlay ───────────────────────────────────────────────────

function showQrOverlay(): void {
  if (!qrOverlay) return;
  qrOverlay.style.display = 'flex';
  gsap.fromTo(qrOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  const card = qrOverlay.querySelector('.lobby__qr-card');
  if (card) gsap.fromTo(card, { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' });
}

function hideQrOverlay(): void {
  if (!qrOverlay) return;
  gsap.to(qrOverlay, {
    opacity: 0, duration: 0.2, ease: 'power2.in',
    onComplete: () => { if (qrOverlay) qrOverlay.style.display = 'none'; },
  });
}

// ── GSAP entrance ────────────────────────────────────────────────

function animateEntrance(): void {
  if (!root) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Background layers fade in
  const bg = root.querySelector('.lobby__bg');
  if (bg) tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 1.5 }, 0);

  // Deco corners
  const corners = root.querySelectorAll('.lobby__deco-corner');
  if (corners.length) tl.fromTo(corners, { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1 }, 0.3);

  // Tagline fades in first
  const tagline = root.querySelector('.lobby__tagline');
  if (tagline) tl.fromTo(tagline, { opacity: 0, y: -15 }, { opacity: 0.6, y: 0, duration: 0.8 }, 0.5);

  // Title reveals
  const title = root.querySelector('.lobby__title');
  if (title) tl.fromTo(title, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 0.7);

  // Divider
  const divider = root.querySelector('.lobby__divider');
  if (divider) tl.fromTo(divider, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.2);

  // Code pill
  const pill = root.querySelector('.lobby__code-pill');
  if (pill) tl.fromTo(pill, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6 }, 1.4);

  // Roster
  const roster = root.querySelector('.lobby__roster');
  if (roster) tl.fromTo(roster, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 1.6);

  // Start button
  const footer = root.querySelector('.lobby__footer');
  if (footer) tl.fromTo(footer, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5 }, 1.8);

  // Ambient golden glow pulse — the room breathes
  const glow = root.querySelector('.lobby__bg-glow');
  if (glow) {
    gsap.set(glow, { opacity: 0.7 });
    sealTween = gsap.to(glow, {
      opacity: 1,
      scale: 1.15,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }
}

// ── Update ───────────────────────────────────────────────────────

export function update(state: HostState | LobbyState): void {
  if (!root) return;

  const roomCode = isLobbyState(state) ? state.roomCode : '----';

  if (codeEl) codeEl.textContent = roomCode;

  // QR code — rendered into overlay card
  if (qrOverlay && roomCode !== '----') {
    const qrCanvas = qrOverlay.querySelector('.lobby__qr-canvas');
    if (qrCanvas && !qrCanvas.hasChildNodes()) {
      const joinUrl = `${window.location.origin}/?room=${roomCode}`;
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, joinUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#0a0a0c', light: '#ffffff' },
      }).catch(() => { /* QR failed */ });
      qrCanvas.appendChild(canvas);
    }
  }

  const players = state.players ?? [];
  const count = players.length;

  if (playerCountEl) {
    playerCountEl.textContent = count > 0
      ? `Assembling the Crew \u2014 ${count} / ${MAX_PLAYERS}`
      : `Awaiting the Crew \u2014 0 / ${MAX_PLAYERS}`;
  }

  if (playerListEl) {
    const prevCount = playerListEl.children.length;
    clearChildren(playerListEl);

    for (const p of players) {
      const chip = document.createElement('div');
      chip.className = 'lobby__player-chip';

      const dot = el('span', 'lobby__player-dot', chip);
      if (!p.isConnected) dot.classList.add('lobby__player-dot--disconnected');

      const name = el('span', 'lobby__player-name', chip);
      name.textContent = p.name;

      const kickBtn = document.createElement('button');
      kickBtn.className = 'lobby__kick-btn';
      kickBtn.textContent = '\u00d7';
      kickBtn.title = `Kick ${p.name}`;
      kickBtn.dataset.testId = 'host-kick-btn';
      kickBtn.addEventListener('click', () => {
        send({ type: 'kick', payload: { targetPlayerId: p.id } });
      });
      chip.appendChild(kickBtn);

      playerListEl.appendChild(chip);
    }

    if (count > prevCount && prevCount > 0) {
      const newChips = Array.from(playerListEl.children).slice(prevCount);
      gsap.fromTo(newChips,
        { opacity: 0, scale: 0.8, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.08, ease: 'back.out(1.4)' }
      );
    }
  }

  if (startBtn) {
    const ready = count >= MIN_PLAYERS;
    (startBtn as HTMLButtonElement).disabled = !ready;
    startBtn.classList.toggle('lobby__start-btn--ready', ready);

    if (ready && !readyPulse) {
      readyPulse = gsap.to(startBtn, {
        boxShadow: '0 0 40px rgba(201, 168, 76, 0.5), 0 0 80px rgba(201, 168, 76, 0.15)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    } else if (!ready && readyPulse) {
      readyPulse.kill();
      readyPulse = null;
      gsap.set(startBtn, { clearProps: 'boxShadow' });
    }
  }
}

// ── Unmount ──────────────────────────────────────────────────────

export function unmount(): void {
  sealTween?.kill();
  sealTween = null;
  readyPulse?.kill();
  readyPulse = null;
  root?.remove();
  root = null;
  codeEl = null;
  qrOverlay = null;
  playerListEl = null;
  playerCountEl = null;
  startBtn = null;
}
