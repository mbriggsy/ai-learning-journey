/**
 * Card asset URL helper + fallback for missing art.
 */
export function getCardImageUrl(cardId: string): string {
  return `/assets/cards/${cardId}.webp`;
}

/** All known card IDs — used for preloading at game start. */
const ALL_CARD_IDS = [
  // Virtuous
  'school-lunch-program', 'public-library-expansion', 'harbor-cleanup-initiative',
  'veterans-memorial-park', 'free-clinic-act', 'streetcar-modernization',
  'fire-brigade-funding', 'orphanage-renovation', 'waterfront-promenade',
  'public-radio-license', 'bridge-safety-inspection', 'community-garden-act',
  'school-music-program', 'sidewalk-lamp-project', 'emergency-relief-fund',
  // Corrupt
  'dockside-kickback-scheme', 'casino-license-fast-track', 'evidence-locker-purge',
  'prohibition-expansion', 'union-bust-authorization', 'slum-clearance-racket',
  'midnight-rezoning-act', 'witness-relocation-program', 'police-pension-siphon',
  'contraband-tariff-exemption', 'backroom-bail-reform', 'shadow-budget-directive',
  'waterfront-tax-holiday', 'ghost-payroll-authorization', 'jury-selection-override',
];

/**
 * Preload all card images. Called at lobby → role-reveal transition
 * so art is cached before any cards are shown during gameplay.
 */
export function preloadAllCardImages(): void {
  for (const cardId of ALL_CARD_IDS) {
    const img = new Image();
    img.src = getCardImageUrl(cardId);
  }
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
