const MAX_PARTICLES = 300

/**
 * Structure-of-Arrays particle pool — zero GC pressure, cache-friendly.
 * Total memory: ~30KB (300 particles * ~100 bytes each).
 */
export class ParticlePool {
  readonly x = new Float32Array(MAX_PARTICLES)
  readonly y = new Float32Array(MAX_PARTICLES)
  readonly vx = new Float32Array(MAX_PARTICLES)
  readonly vy = new Float32Array(MAX_PARTICLES)
  readonly life = new Float32Array(MAX_PARTICLES)    // 0.0-1.0
  readonly size = new Float32Array(MAX_PARTICLES)
  readonly hue = new Float32Array(MAX_PARTICLES)
  readonly active = new Uint8Array(MAX_PARTICLES)    // 0 or 1

  private nextFree = 0

  get maxParticles(): number {
    return MAX_PARTICLES
  }

  /** Acquire a particle slot. Returns index or -1 if pool exhausted. */
  acquire(): number {
    // Start from hint, linear scan
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this.nextFree + i) % MAX_PARTICLES
      if (this.active[idx] === 0) {
        this.active[idx] = 1
        this.nextFree = (idx + 1) % MAX_PARTICLES
        return idx
      }
    }
    return -1
  }

  /** Release a particle back to the pool. */
  release(idx: number): void {
    this.active[idx] = 0
  }

  /** Count active particles. */
  activeCount(): number {
    let count = 0
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.active[i] === 1) count++
    }
    return count
  }

  /** Clear all particles. */
  clear(): void {
    this.active.fill(0)
    this.nextFree = 0
  }
}
