import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let selectedId: string | null = null;
let entranceTl: gsap.core.Timeline | null = null;
let emberTl: gsap.core.Timeline | null = null;
let emberBtn: HTMLElement | null = null;

/**
 * Smoldering ember animation — layered GSAP tweens at different
 * durations and eases so nothing ever looks mechanical.
 */
function igniteEmber(btn: HTMLElement): void {
  if (emberTl) return; // already burning

  emberBtn = btn;
  emberTl = gsap.timeline();

  // 1. Initial glow-up — the button "wakes up"
  emberTl.to(btn, {
    boxShadow: '0 6px 30px rgba(200, 50, 50, 0.5), 0 0 60px rgba(168, 32, 32, 0.15)',
    borderColor: 'rgba(230, 80, 50, 0.4)',
    background: 'linear-gradient(135deg, #c43030, #9a2020)',
    duration: 1.2,
    ease: 'power2.out',
  });

  // 2. Continuous slow breathe — outer glow radiates and recedes
  gsap.to(btn, {
    boxShadow: '0 8px 40px rgba(220, 60, 40, 0.6), 0 0 90px rgba(168, 32, 32, 0.2), 0 0 140px rgba(139, 26, 26, 0.06)',
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 1.2,
  });

  // 3. Surface heat — background color shifts warmer/cooler at a different rate
  gsap.to(btn, {
    keyframes: [
      { background: 'linear-gradient(135deg, #d03535, #a52525)', duration: 2.5, ease: 'sine.inOut' },
      { background: 'linear-gradient(135deg, #c02a2a, #921e1e)', duration: 3.5, ease: 'sine.inOut' },
      { background: 'linear-gradient(135deg, #cc3030, #9a2222)', duration: 2, ease: 'sine.inOut' },
    ],
    repeat: -1,
    delay: 0.8,
  });

  // 4. Border smolder — independently drifts between dim and bright
  gsap.to(btn, {
    keyframes: [
      { borderColor: 'rgba(255, 100, 60, 0.5)', duration: 2, ease: 'sine.inOut' },
      { borderColor: 'rgba(200, 60, 60, 0.2)', duration: 3, ease: 'sine.inOut' },
      { borderColor: 'rgba(240, 90, 50, 0.45)', duration: 2.5, ease: 'sine.inOut' },
    ],
    repeat: -1,
    delay: 0.4,
  });

  // 5. Inner shimmer hotspot drifts across — pseudo-element via CSS custom prop
  gsap.fromTo(btn,
    { '--ember-x': '20%' },
    { '--ember-x': '80%', duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 },
  );

  // 6. Shimmer opacity breathes
  gsap.to(btn, {
    '--ember-opacity': 1,
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  // 7. Subtle scale breathe — barely perceptible but adds life
  gsap.to(btn, {
    scale: 1.02,
    duration: 4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 0.6,
  });
}

function extinguishEmber(): void {
  if (!emberTl) return;
  if (emberBtn) gsap.killTweensOf(emberBtn);
  emberTl.kill();
  emberTl = null;
  emberBtn = null;
}

export function mount(container: HTMLElement, state: AppState): void {
  selectedId = null;

  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('\u26B0 Choose a player to eliminate');

  const content = document.createElement('div');
  content.className = 'screen-content';

  const list = document.createElement('ul');
  list.className = 'player-picker player-picker--danger';
  list.dataset.testId = 'execute-picker';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn action-btn--danger';
  confirmBtn.dataset.testId = 'execute-confirm';
  confirmBtn.textContent = '\u26B0 Execute';
  confirmBtn.disabled = true;

  const players = (state.serverState?.players ?? [])
    .filter((p) => p.id !== state.playerId); // Mayor can't execute themselves
  const itemEls: HTMLElement[] = [];
  for (const p of players) {
    const isEligible = p.isAlive;

    const li = document.createElement('li');
    li.className = 'player-picker__item';
    li.dataset.testId = 'execute-player';
    if (!p.isAlive) {
      li.classList.add('player-picker__item--dead');
    }
    li.textContent = !p.isAlive ? `\u{2620} ${p.name}` : p.name;
    li.dataset.playerId = p.id;

    if (isEligible) {
      li.addEventListener('click', () => {
        list.querySelectorAll('.player-picker__item--selected').forEach((el) =>
          el.classList.remove('player-picker__item--selected'),
        );
        li.classList.add('player-picker__item--selected');
        selectedId = p.id;
        confirmBtn.disabled = false;
        gsap.set(confirmBtn, { clearProps: 'opacity' });
        igniteEmber(confirmBtn);
      });
    }

    list.appendChild(li);
    itemEls.push(li);
  }

  confirmBtn.addEventListener('click', () => {
    if (!selectedId) return;
    confirmBtn.disabled = true;
    extinguishEmber();
    sendAction({ type: 'execute', targetId: selectedId });
  });

  const panel = document.createElement('div');
  panel.className = 'glass-panel picker-panel';
  panel.appendChild(list);
  panel.appendChild(confirmBtn);
  content.appendChild(panel);
  root.appendChild(content);
  container.appendChild(root);

  // GSAP stagger entrance
  entranceTl = gsap.timeline();
  itemEls.forEach((el, i) => {
    entranceTl!.from(el, { x: -30, opacity: 0, duration: 0.25, ease: 'power2.out' }, i * 0.08);
  });
  entranceTl.from(confirmBtn, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');
}

export function update(_state: AppState): void {
  // One-shot interaction — no dynamic updates.
}

export function unmount(): void {
  setTopBarInstruction('');
  extinguishEmber();
  entranceTl?.kill();
  entranceTl = null;
  root?.remove();
  root = null;
  selectedId = null;
}
