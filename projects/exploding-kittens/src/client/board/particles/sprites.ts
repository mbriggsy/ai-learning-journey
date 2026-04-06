/**
 * Pre-rendered particle sprites — drawImage() is much faster than arc()+fill() per particle.
 * Created once at init, reused every frame. 4 size variations with soft radial glow.
 */

const SPRITE_SIZES = [4, 8, 12, 16]

export interface ParticleSprites {
  readonly canvases: readonly OffscreenCanvas[]
}

export function createParticleSprites(): ParticleSprites {
  const canvases = SPRITE_SIZES.map(size => {
    const dpr = Math.min(devicePixelRatio, 2)
    const pixelSize = size * dpr
    const canvas = new OffscreenCanvas(pixelSize, pixelSize)
    const ctx = canvas.getContext('2d')!
    const center = pixelSize / 2

    // Soft radial gradient glow
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
    grad.addColorStop(0.7, 'rgba(255, 200, 150, 0.3)')
    grad.addColorStop(1, 'rgba(255, 100, 50, 0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, pixelSize, pixelSize)

    return canvas
  })

  return { canvases }
}
