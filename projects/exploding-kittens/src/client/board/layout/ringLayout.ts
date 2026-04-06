export interface RingPosition {
  readonly x: number   // center X in px
  readonly y: number   // center Y in px
  readonly angle: number // radians
}

/**
 * Calculate positions around an ellipse for the player ring.
 * 2-player special case: side by side (9 and 3 o'clock).
 */
export function calculateRingPositions(
  playerCount: number,
  radiusX: number,
  radiusY: number,
  startAngle = -Math.PI / 2, // 12 o'clock
): readonly RingPosition[] {
  if (playerCount === 0) return []

  // 2-player: side by side at 9 and 3 o'clock
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

/**
 * Avatar size scales down as more players join.
 * 64px absolute floor — readable from 3m on TV.
 */
export function getAvatarSize(playerCount: number): number {
  if (playerCount <= 2) return 120
  if (playerCount <= 4) return 100
  if (playerCount <= 6) return 80
  return 64
}

/**
 * Ring radii scale to container dimensions.
 * Elliptical for 16:9 TVs — wider than tall.
 */
export function getRingRadii(
  playerCount: number,
  containerWidth: number,
  containerHeight: number,
): { rx: number; ry: number } {
  const avatarSize = getAvatarSize(playerCount)
  const padding = avatarSize / 2 + 16 // half avatar + gap
  return {
    rx: containerWidth / 2 - padding,
    ry: containerHeight / 2 - padding,
  }
}
