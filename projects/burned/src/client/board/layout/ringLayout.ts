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
 * Ring radii — sized so dossier panels orbit the cream briefing blotter
 * without sitting *on top* of it. The blotter takes ~45% of viewport width,
 * so the ring must push past that boundary.
 */
export function getRingRadii(
  playerCount: number,
  containerWidth: number,
  containerHeight: number,
): { rx: number; ry: number } {
  // Bigger rx keeps dossiers outside the briefing blotter at every viewport.
  // Ry is smaller than rx so the top/bottom seats sit close to the horizontal
  // axis but still clear the blotter vertically.
  const scale = playerCount <= 4 ? 0.36 : playerCount <= 6 ? 0.38 : 0.40
  return {
    rx: containerWidth * scale,
    ry: containerHeight * (scale - 0.04),
  }
}
