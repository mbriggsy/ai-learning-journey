import { gsap } from 'gsap';
import type { AppState } from '../state/store';
import { sendAction } from '../connection';
import { setTopBarInstruction } from '../components/top-bar';

let root: HTMLElement | null = null;
let responded = false;
let tl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;

export function mount(container: HTMLElement, _state: AppState): void {
  responded = false;

  root = document.createElement('div');
  root.className = 'screen';

  const content = document.createElement('div');
  content.className = 'screen-content';

  setTopBarInstruction('Veto proposed \u2014 Accept or Reject?');

  // Hero art — big, beautiful, the star
  const artImg = document.createElement('img');
  artImg.className = 'veto-art';
  artImg.src = '/assets/veto-deliberation.png';
  artImg.alt = 'Mayor deliberating';
  artImg.draggable = false;

  // Decision panel — glass card pinned to bottom of content
  const panel = document.createElement('div');
  panel.className = 'glass-panel veto-panel';

  const flavor = document.createElement('p');
  flavor.className = 'veto-flavor';
  flavor.textContent = 'The Chief wants to burn both policies.\nYour call, Mayor.';

  const btnRow = document.createElement('div');
  btnRow.className = 'veto-btn-row';

  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'action-btn veto-btn';
  acceptBtn.dataset.testId = 'veto-accept';
  acceptBtn.textContent = 'Accept';

  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'action-btn action-btn--danger veto-btn';
  rejectBtn.dataset.testId = 'veto-reject';
  rejectBtn.textContent = 'Reject';

  function respond(approved: boolean): void {
    if (responded) return;
    responded = true;
    acceptBtn.disabled = true;
    rejectBtn.disabled = true;

    const chosen = approved ? acceptBtn : rejectBtn;
    const other = approved ? rejectBtn : acceptBtn;

    exitTl = gsap.timeline({
      onComplete: () => sendAction({ type: 'veto-response', approved }),
    });

    exitTl
      .to(other, { opacity: 0, scale: 0.85, duration: 0.25, ease: 'power2.in' })
      .to(chosen, { scale: 1.08, duration: 0.12, ease: 'power2.out' }, '-=0.1')
      .to(chosen, { scale: 1, duration: 0.12, ease: 'power2.in' });
  }

  acceptBtn.addEventListener('click', () => respond(true));
  rejectBtn.addEventListener('click', () => respond(false));

  btnRow.appendChild(acceptBtn);
  btnRow.appendChild(rejectBtn);
  panel.appendChild(flavor);
  panel.appendChild(btnRow);

  content.appendChild(artImg);
  content.appendChild(panel);
  root.appendChild(content);
  container.appendChild(root);

  // Entrance: art fades up, panel slides in, buttons snap from sides
  tl = gsap.timeline();
  tl.from(artImg, { y: 30, opacity: 0, scale: 0.9, duration: 0.6, ease: 'power3.out' })
    .from(panel, { y: 40, opacity: 0, duration: 0.45, ease: 'power3.out' }, '-=0.25')
    .from(acceptBtn, { x: -25, opacity: 0, duration: 0.35, ease: 'back.out(1.4)' }, '-=0.15')
    .from(rejectBtn, { x: 25, opacity: 0, duration: 0.35, ease: 'back.out(1.4)' }, '<');
}

export function update(_state: AppState): void {
  // One-shot interaction — no dynamic updates.
}

export function unmount(): void {
  setTopBarInstruction('');
  exitTl?.kill();
  exitTl = null;
  tl?.kill();
  tl = null;
  root?.remove();
  root = null;
  responded = false;
}
