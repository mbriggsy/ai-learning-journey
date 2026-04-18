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
 * Ring radii — chosen so dossier panels orbit the briefing blotter with
 * exactly `ringGap` of breathing room at the hostile slot angle.
 *
 * For a given player count, compute the maximum horizontal cosine across
 * all slots (worst case for horizontal clearance). Apply two constraints:
 *
 *   1. HORIZONTAL CLEARANCE — `rx · maxCosX ≥ bw/2 + pw/2 + gap`
 *   2. VERTICAL CLEARANCE  — `ry · maxSinY ≥ bh/2 + ph/2 + gap`
 *
 * Final radii also respect a viewport edge margin so panels never clip off
 * the table. The CSS blotter cap guarantees these constraints are always
 * simultaneously satisfiable.
 */
export function getRingRadii(
  playerCount: number,
  containerWidth: number,
  containerHeight: number,
  blotterWidth: number,
  blotterHeight: number,
  panelWidth: number,
  panelHeight: number,
  ringGap: number,
): { rx: number; ry: number } {
  // Edge margin — panels must clear the mahogany wood frame + a little air.
  const edgeMargin = Math.max(24, containerWidth * 0.015)

  // 2-player special case — calculateRingPositions puts panels at east/west
  // seats (angles {0, π}), not the standard -π/2-start arithmetic. Compute
  // rx directly from horizontal clearance and leave ry unused (panel y = 0).
  if (playerCount === 2) {
    const rxMin = blotterWidth / 2 + panelWidth / 2 + ringGap
    const rxCap = containerWidth / 2 - panelWidth / 2 - edgeMargin
    return { rx: Math.min(rxCap, Math.max(rxMin, containerWidth * 0.32)), ry: 0 }
  }

  // Max |cos| and |sin| across this player count's standard slot angles.
  // For N=3, {-90°,30°,150°} → max|cos|=0.866, max|sin|=1.
  // For N=4, {-90°,0°,90°,180°} → max|cos|=1, max|sin|=1.
  const startAngle = -Math.PI / 2
  const step = (2 * Math.PI) / playerCount
  let maxCos = 0
  let maxSin = 0
  for (let i = 0; i < playerCount; i++) {
    const angle = startAngle + i * step
    maxCos = Math.max(maxCos, Math.abs(Math.cos(angle)))
    maxSin = Math.max(maxSin, Math.abs(Math.sin(angle)))
  }
  // Math hygiene — no slot projects onto an axis only at degenerate counts.
  maxCos = Math.max(maxCos, 0.001)
  maxSin = Math.max(maxSin, 0.001)

  const rxMinForClearance =
    (blotterWidth / 2 + panelWidth / 2 + ringGap) / maxCos
  const ryMinForClearance =
    (blotterHeight / 2 + panelHeight / 2 + ringGap) / maxSin

  // Baseline scale grows modestly with player count so the ring has enough
  // circumference for more dossiers along the arc.
  const scaleBoost = playerCount <= 4 ? 0 : playerCount <= 6 ? 0.03 : 0.06
  const rxBaseline = containerWidth * (0.36 + scaleBoost)
  const ryBaseline = containerHeight * (0.32 + scaleBoost)

  const rxMax = (containerWidth / 2 - panelWidth / 2 - edgeMargin) / maxCos
  const ryMax = (containerHeight / 2 - panelHeight / 2 - edgeMargin) / maxSin

  return {
    rx: Math.min(rxMax, Math.max(rxBaseline, rxMinForClearance)),
    ry: Math.min(ryMax, Math.max(ryBaseline, ryMinForClearance)),
  }
}
