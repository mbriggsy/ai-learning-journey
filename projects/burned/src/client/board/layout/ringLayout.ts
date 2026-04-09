export interface RingPosition {
  readonly x: number
  readonly y: number
  readonly angle: number
}

/**
 * Calculate positions around an ellipse for the player ring.
 * 2-player special case: side by side (9 and 3 o'clock).
 */
export function calculateRingPositions(
  playerCount: number,
  radiusX: number,
  radiusY: number,
  startAngle = -Math.PI / 2,
): readonly RingPosition[] {
  if (playerCount === 0) return []

  if (playerCount === 2) {
    return [
      { x: -radiusX, y: 0, angle: Math.PI },
      { x: radiusX, y: 0, angle: 0 },
    ]
  }

  const positions: RingPosition[] = []
  const step = (2 * Math.PI) / playerCount

  for (let i = 0; i < playerCount; i++) {
    const angle = startAngle + i * step
    positions.push({
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      angle,
    })
  }

  return positions
}

/** No longer used by PlayerRing (panels are fixed width), but kept for API compat */
export function getAvatarSize(playerCount: number): number {
  if (playerCount <= 2) return 100
  if (playerCount <= 4) return 80
  if (playerCount <= 6) return 68
  return 56
}

/**
 * Ring radii — sized so panels orbit in the safe zone,
 * not clipping off screen edges.
 */
export function getRingRadii(
  playerCount: number,
  containerWidth: number,
  containerHeight: number,
): { rx: number; ry: number } {
  // Tighter for fewer players, wider for more
  const scale = playerCount <= 4 ? 0.30 : playerCount <= 6 ? 0.33 : 0.36
  return {
    rx: containerWidth * scale,
    ry: containerHeight * (scale - 0.02),
  }
}
