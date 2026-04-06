import { useRef, useLayoutEffect, useCallback } from 'react'
import { ParticlePool } from './ParticlePool'
import { createParticleSprites, type ParticleSprites } from './sprites'

export interface ParticleControls {
  explode(origin: { x: number; y: number }, count: number, hue: number): void
  reverse(target: { x: number; y: number }): void
  intensify(): void
  clear(): void
}

/**
 * useParticles — Canvas particle system for dramatic moments.
 * rAF loop runs ONLY when particles are active. Zero CPU between drama.
 * DPR capped at 2. useLayoutEffect cleanup catches rAF before detached paint.
 */
export function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>): ParticleControls {
  const poolRef = useRef<ParticlePool>(new ParticlePool())
  const spritesRef = useRef<ParticleSprites | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const reverseTargetRef = useRef<{ x: number; y: number } | null>(null)
  const intensifyRef = useRef(false)
  const cancelledRef = useRef(false)

  const startLoop = useCallback(() => {
    if (rafRef.current !== 0) return // already running

    lastTimeRef.current = performance.now()

    const tick = (now: number) => {
      if (cancelledRef.current) return

      const pool = poolRef.current
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Deltatime capping — prevent teleport after tab switch
      const rawDt = (now - lastTimeRef.current) / 1000
      const dt = Math.min(rawDt, 1 / 30)
      lastTimeRef.current = now

      const dpr = Math.min(devicePixelRatio, 2)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      const sprites = spritesRef.current
      let anyActive = false

      for (let i = 0; i < pool.maxParticles; i++) {
        if (pool.active[i] === 0) continue
        anyActive = true

        // Update velocity — gravity + optional spring attraction
        // TypedArray access requires ! with noUncheckedIndexedAccess (always defined at runtime)
        pool.vy[i]! += 60 * dt // gravity

        if (reverseTargetRef.current) {
          const dx = reverseTargetRef.current.x - pool.x[i]!
          const dy = reverseTargetRef.current.y - pool.y[i]!
          pool.vx[i]! += dx * 2 * dt
          pool.vy[i]! += dy * 2 * dt
        }

        // Update position
        pool.x[i]! += pool.vx[i]! * dt
        pool.y[i]! += pool.vy[i]! * dt

        // Update life
        pool.life[i]! -= dt * (intensifyRef.current ? 0.3 : 0.6)
        if (pool.life[i]! <= 0) {
          pool.release(i)
          continue
        }

        // Draw using sprite
        const alpha = Math.max(0, pool.life[i]!)
        const sizeIdx = Math.min(3, Math.floor(pool.size[i]! / 5))
        const sprite = sprites?.canvases[sizeIdx]

        ctx.globalAlpha = alpha
        if (sprite) {
          const s = pool.size[i]!
          ctx.drawImage(sprite, pool.x[i]! - s / 2, pool.y[i]! - s / 2, s, s)
        }
      }

      ctx.restore()

      // If no particles active, stop loop
      if (!anyActive) {
        rafRef.current = 0
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [canvasRef])

  // Initialize sprites once
  useLayoutEffect(() => {
    spritesRef.current = createParticleSprites()
    cancelledRef.current = false

    return () => {
      cancelledRef.current = true
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [])

  // Resize canvas to match container
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const dpr = Math.min(devicePixelRatio, 2)
      canvas.width = entry.contentRect.width * dpr
      canvas.height = entry.contentRect.height * dpr
    })
    ro.observe(canvas.parentElement ?? canvas)
    return () => ro.disconnect()
  }, [canvasRef])

  const explode = useCallback((origin: { x: number; y: number }, count: number, hue: number) => {
    const pool = poolRef.current
    reverseTargetRef.current = null
    intensifyRef.current = false

    for (let n = 0; n < count; n++) {
      const idx = pool.acquire()
      if (idx === -1) break

      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 200

      pool.x[idx] = origin.x
      pool.y[idx] = origin.y
      pool.vx[idx] = Math.cos(angle) * speed
      pool.vy[idx] = Math.sin(angle) * speed - 60 // upward bias
      pool.life[idx] = 0.8 + Math.random() * 0.4
      pool.size[idx] = 4 + Math.random() * 12
      pool.hue[idx] = hue + (Math.random() - 0.5) * 30
    }

    startLoop()
  }, [startLoop])

  const reverse = useCallback((target: { x: number; y: number }) => {
    reverseTargetRef.current = target
  }, [])

  const intensify = useCallback(() => {
    intensifyRef.current = true
    const pool = poolRef.current
    let active = pool.activeCount()
    for (let i = 0; i < pool.maxParticles && active < 280; i++) {
      if (pool.active[i] === 0) continue
      const idx = pool.acquire()
      if (idx === -1) break
      active++
      pool.x[idx] = pool.x[i]! + (Math.random() - 0.5) * 20
      pool.y[idx] = pool.y[i]! + (Math.random() - 0.5) * 20
      pool.vx[idx] = (Math.random() - 0.5) * 300
      pool.vy[idx] = -Math.random() * 200
      pool.life[idx] = 0.6 + Math.random() * 0.3
      pool.size[idx] = 3 + Math.random() * 8
      pool.hue[idx] = pool.hue[i]!
    }
    startLoop()
  }, [startLoop])

  const clear = useCallback(() => {
    poolRef.current.clear()
    reverseTargetRef.current = null
    intensifyRef.current = false
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  return { explode, reverse, intensify, clear }
}
