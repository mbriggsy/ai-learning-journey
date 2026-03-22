import type { HostOverlayId } from '../host-router';

/** Simple (stateless) overlay IDs handled by this module. */
export type SimpleOverlayId = 'veto-proposed' | 'veto-result' | 'deck-reshuffled' | 'policy-session-active' | 'role-reveal-waiting';

/**
 * Overlay rendering for simple (stateless) overlays.
 * Stateful overlays (nomination, game-over, etc.) are handled by host-app.ts directly.
 */
export function createOverlay(
  overlayId: SimpleOverlayId,
  context?: { vetoApproved?: boolean },
): HTMLElement {
  switch (overlayId) {
    case 'veto-proposed':
      return createVetoProposedOverlay();
    case 'veto-result':
      return createVetoResultOverlay(context?.vetoApproved ?? false);
    case 'deck-reshuffled':
      return createReshuffleOverlay();
    case 'policy-session-active':
      return createSessionStatusBar();
    case 'role-reveal-waiting':
      return createRoleRevealWaitingOverlay();
  }
}

function createVetoProposedOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'host-overlay veto-overlay';
  overlay.dataset.overlayId = 'veto-proposed';

  const content = document.createElement('div');
  content.className = 'host-overlay__content';

  const title = document.createElement('div');
  title.className = 'veto-overlay__title';
  title.textContent = 'Veto Proposed';

  const subtitle = document.createElement('div');
  subtitle.className = 'veto-overlay__subtitle';
  subtitle.textContent = 'The Chief has proposed to veto this agenda. Awaiting Mayor response...';

  content.appendChild(title);
  content.appendChild(subtitle);
  overlay.appendChild(content);
  return overlay;
}

function createVetoResultOverlay(approved: boolean): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'host-overlay veto-overlay';
  overlay.dataset.overlayId = 'veto-result';

  const content = document.createElement('div');
  content.className = 'host-overlay__content';

  const title = document.createElement('div');
  title.className = 'veto-overlay__title';
  title.textContent = 'Veto Decision';

  const result = document.createElement('div');
  result.className = `veto-overlay__result ${approved ? 'veto-overlay__result--approved' : 'veto-overlay__result--rejected'}`;
  result.textContent = approved ? 'Veto Approved' : 'Veto Rejected';

  content.appendChild(title);
  content.appendChild(result);
  overlay.appendChild(content);
  return overlay;
}

function createReshuffleOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'host-overlay reshuffle-overlay';
  overlay.dataset.overlayId = 'deck-reshuffled';

  const content = document.createElement('div');
  content.className = 'host-overlay__content';

  const title = document.createElement('div');
  title.className = 'reshuffle-overlay__title';
  title.textContent = 'Deck Reshuffled';

  const subtitle = document.createElement('div');
  subtitle.className = 'reshuffle-overlay__subtitle';
  subtitle.textContent = 'The policy deck has been reshuffled.';

  content.appendChild(title);
  content.appendChild(subtitle);
  overlay.appendChild(content);
  return overlay;
}

function createSessionStatusBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'session-status-bar';
  bar.dataset.overlayId = 'policy-session-active';

  const dot = document.createElement('div');
  dot.className = 'session-status-bar__dot';

  const text = document.createElement('span');
  text.textContent = 'Policy session in progress...';

  bar.appendChild(dot);
  bar.appendChild(text);
  return bar;
}

function createRoleRevealWaitingOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'host-overlay role-reveal-overlay';
  overlay.dataset.overlayId = 'role-reveal-waiting';

  const content = document.createElement('div');
  content.className = 'host-overlay__content';

  const title = document.createElement('div');
  title.className = 'role-reveal-overlay__title';
  title.style.fontSize = '1.8rem';
  title.style.fontFamily = 'var(--font-display)';
  title.style.color = 'var(--noir-gold)';
  title.style.letterSpacing = '0.1em';
  title.style.textTransform = 'uppercase';
  title.style.textAlign = 'center';
  title.textContent = 'Assigning Roles';

  const subtitle = document.createElement('div');
  subtitle.style.fontSize = '1.1rem';
  subtitle.style.color = 'var(--noir-cream)';
  subtitle.style.textAlign = 'center';
  subtitle.style.marginTop = 'var(--space-xs)';
  subtitle.textContent = 'Players are reviewing their secret identities\u2026';

  content.appendChild(title);
  content.appendChild(subtitle);
  overlay.appendChild(content);
  return overlay;
}

/**
 * Removes an overlay by its ID from a container.
 */
export function removeOverlay(container: HTMLElement, overlayId: string): void {
  const el = container.querySelector(`[data-overlay-id="${overlayId}"]`);
  el?.remove();
}
