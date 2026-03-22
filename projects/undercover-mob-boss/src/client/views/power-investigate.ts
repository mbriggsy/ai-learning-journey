import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let selectedId: string | null = null;
let entranceTl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, state: AppState): void {
  selectedId = null;

  root = document.createElement('div');
  root.className = 'screen';

  setTopBarInstruction('\u{1F50D} Investigate a player\u2019s loyalty');

  const content = document.createElement('div');
  content.className = 'screen-content';

  const list = document.createElement('ul');
  list.className = 'player-picker';
  list.dataset.testId = 'investigate-picker';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.dataset.testId = 'investigate-confirm';
  confirmBtn.textContent = '\u{1F50D} Investigate';
  confirmBtn.disabled = true;

  // Collect already-investigated player IDs from events
  const investigatedIds = new Set<string>();
  const events = state.serverState?.events ?? [];
  for (const evt of events) {
    if (evt.type === 'investigation-result') {
      investigatedIds.add(evt.targetId);
    }
  }

  const players = (state.serverState?.players ?? [])
    .filter((p) => p.id !== state.playerId); // Exclude self
  const itemEls: HTMLElement[] = [];
  for (const p of players) {
    const alreadyInvestigated = investigatedIds.has(p.id);
    const isEligible = p.isAlive && !alreadyInvestigated;

    const li = document.createElement('li');
    li.className = 'player-picker__item';
    li.dataset.testId = 'investigate-player';
    if (!p.isAlive) {
      li.classList.add('player-picker__item--dead');
    } else if (alreadyInvestigated) {
      li.style.opacity = '0.4';
      li.style.textDecoration = 'line-through';
    }
    if (!isEligible) li.style.pointerEvents = 'none';
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
      });
    }

    list.appendChild(li);
    itemEls.push(li);
  }

  confirmBtn.addEventListener('click', () => {
    if (!selectedId) return;
    confirmBtn.disabled = true;
    sendAction({ type: 'investigate', targetId: selectedId });
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
  entranceTl?.kill();
  entranceTl = null;
  root?.remove();
  root = null;
  selectedId = null;
}
