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

/**
 * Screen shake keyframes — decreasing amplitude, NOT springs.
 * Springs bounce; shakes RATTLE.
 * Math.round() all offsets to prevent sub-pixel jitter.
 */
export function generateShakeKeyframes(
  intensity: number = 8,
  cycles: number = 3,
): { transform: string }[] {
  const frames: { transform: string }[] = []
  const stepsPerCycle = 4

  for (let c = 0; c < cycles; c++) {
    const amp = Math.round(intensity * (1 - c / cycles))
    for (let s = 0; s < stepsPerCycle; s++) {
      const x = s % 2 === 0 ? amp : -amp
      const y = s % 2 === 0 ? -Math.round(amp * 0.5) : Math.round(amp * 0.3)
      frames.push({ transform: `translate(${x}px, ${y}px)` })
    }
  }

  frames.push({ transform: 'translate(0, 0)' })
  return frames
}
