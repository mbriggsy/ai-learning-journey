/**
 * Card asset URL helper + fallback for missing art.
 */
export function getCardImageUrl(cardId: string): string {
  return `/assets/cards/${cardId}.webp`;
}

/**
 * Set up a card image with art fallback. If the per-card art is missing,
 * falls back to the generic policy image with a loud console.error.
 */
export function setupCardImage(img: HTMLImageElement, cardId: string, type: 'good' | 'bad'): void {
  img.src = getCardImageUrl(cardId);
  img.onerror = () => {
    console.error(`Missing card art: ${cardId}`);
    img.src = type === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
    img.onerror = null; // prevent infinite loop if fallback also missing
  };
}
