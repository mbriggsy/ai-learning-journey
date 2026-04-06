/**
 * Z-index scale — single source of truth for layer ordering.
 */
export const Z = {
  card: 1,
  drawPile: 2,
  arena: 5,
  particleLayer: 10,
  screenFlash: 20,
  announcement: 30,
  nopeButton: 100,  // MUST remain on top, always
} as const
