import { gsap } from 'gsap';
import type { PolicyCard } from '../../../shared/types';
import { getPowerSlots, createPowerIcon } from '../../components/power-icons';
import { setupCardImage } from '../../utils/card-assets';

export interface PolicyTrackConfig {
  type: 'good' | 'bad';
  enacted: number;
  total: number;
  playerCount?: number;
  /** Ordered list of enacted cards for this track (filtered by type). */
  cards?: PolicyCard[];
}

/**
 * Renders a policy track with N slots.
 * Bad track includes power icon watermarks based on player count.
 * Filled slots show named card art when available, generic fallback otherwise.
 */
export function createPolicyTrack(config: PolicyTrackConfig): HTMLElement {
  const { type, enacted, total, playerCount, cards } = config;

  const track = document.createElement('div');
  track.className = 'policy-track';

  const label = document.createElement('div');
  label.className = `policy-track__label policy-track__label--${type}`;
  label.textContent = type === 'good' ? 'Citizen Policies' : 'Mob Policies';
  track.appendChild(label);

  const slotsContainer = document.createElement('div');
  slotsContainer.className = 'policy-track__slots';

  const powers = type === 'bad' && playerCount ? getPowerSlots(playerCount) : [];

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = 'policy-slot';
    slot.dataset.slotIndex = String(i + 1);

    if (i < enacted) {
      slot.classList.add(type === 'good' ? 'policy-slot--filled-good' : 'policy-slot--filled-bad');
      const img = document.createElement('img');
      img.className = 'policy-slot__art';
      const card = cards?.[i];
      if (card) {
        setupCardImage(img, card.cardId, card.type);
        img.alt = card.name;
      } else {
        img.src = type === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
        img.alt = type === 'good' ? 'Citizen Policy' : 'Mob Policy';
      }
      slot.appendChild(img);
    }

    // Power icon watermark inside bad-track slots
    if (type === 'bad' && powers[i]) {
      slot.appendChild(createPowerIcon(powers[i]!, 'policy-slot__power-icon'));
    }

    slotsContainer.appendChild(slot);
  }

  track.appendChild(slotsContainer);

  // Warning banner: after 3+ bad policies, Mob Boss as COP ends the game
  if (type === 'bad' && enacted >= 3) {
    const warning = document.createElement('div');
    warning.className = 'policy-track__warning';
    warning.textContent = 'Mob Boss elected as Commissioner = Game Over';
    track.appendChild(warning);
  }

  return track;
}

/**
 * Updates an existing policy track's filled state.
 */
export function updatePolicyTrack(
  trackEl: HTMLElement,
  config: PolicyTrackConfig,
): void {
  const slots = trackEl.querySelectorAll('.policy-slot');
  const { type, enacted, cards } = config;

  slots.forEach((slot, i) => {
    slot.classList.remove('policy-slot--filled-good', 'policy-slot--filled-bad');
    const existingImg = slot.querySelector('.policy-slot__art') as HTMLImageElement | null;
    if (i < enacted) {
      slot.classList.add(type === 'good' ? 'policy-slot--filled-good' : 'policy-slot--filled-bad');
      const card = cards?.[i];
      if (!existingImg) {
        const img = document.createElement('img');
        img.className = 'policy-slot__art';
        if (card) {
          setupCardImage(img, card.cardId, card.type);
          img.alt = card.name;
        } else {
          img.src = type === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
          img.alt = type === 'good' ? 'Citizen Policy' : 'Mob Policy';
        }
        slot.appendChild(img);
        gsap.fromTo(img, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' });
      } else if (card) {
        // Update existing image if card data now available
        const expectedSrc = `/assets/cards/${card.cardId}.webp`;
        if (!existingImg.src.endsWith(expectedSrc)) {
          setupCardImage(existingImg, card.cardId, card.type);
          existingImg.alt = card.name;
        }
      }
    } else if (existingImg) {
      existingImg.remove();
    }
  });

  // Toggle warning banner for bad track
  if (type === 'bad') {
    let warning = trackEl.querySelector('.policy-track__warning') as HTMLElement | null;
    if (enacted >= 3 && !warning) {
      warning = document.createElement('div');
      warning.className = 'policy-track__warning';
      warning.textContent = 'Mob Boss elected as Commissioner = Game Over';
      trackEl.appendChild(warning);
    } else if (enacted < 3 && warning) {
      warning.remove();
    }
  }
}
