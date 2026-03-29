import { describe, it, expect } from 'vitest'
import { ParticlePool } from '../../../src/renderer/ParticlePool.js'
import { PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX, PARTICLE_LIFETIME_S, MAX_PARTICLES } from '../../../src/constants.js'

describe('ParticlePool', () => {
  it('starts with zero particles', () => {
    const pool = new ParticlePool()
    expect(pool.count).toBe(0)
  })

  it('spawn creates 8-12 particles', () => {
    const pool = new ParticlePool()
    pool.spawn(5, 5, 1, 0, 0)
    expect(pool.count).toBeGreaterThanOrEqual(PARTICLE_COUNT_MIN)
    expect(pool.count).toBeLessThanOrEqual(PARTICLE_COUNT_MAX)
  })

  it('particles have initial lifetime', () => {
    const pool = new ParticlePool()
    pool.spawn(5, 5, 1, 0, 0)
    // Life is at offset 4 in the stride
    expect(pool.data[4]).toBeCloseTo(PARTICLE_LIFETIME_S)
  })

  it('update advances positions by velocity * dt', () => {
    const pool = new ParticlePool()
    pool.spawn(0, 0, 1, 1, 1)

    const x0 = pool.data[0]!
    const y0 = pool.data[1]!
    const vx = pool.data[2]!
    const vy = pool.data[3]!

    pool.update(0.1) // 100ms

    expect(pool.data[0]).toBeCloseTo(x0 + vx * 0.1)
    expect(pool.data[1]).toBeCloseTo(y0 + vy * 0.1)
  })

  it('expired particles are removed', () => {
    const pool = new ParticlePool()
    pool.spawn(5, 5, 1, 0, 0)
    const initial = pool.count

    // Advance past lifetime
    pool.update(PARTICLE_LIFETIME_S + 0.1)

    expect(pool.count).toBe(0)
    expect(pool.count).toBeLessThan(initial)
  })

  it('pool cap is respected', () => {
    const pool = new ParticlePool()
    // Spawn way more than MAX_PARTICLES
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pool.spawn(i, 0, 1, 1, 1)
    }
    expect(pool.count).toBeLessThanOrEqual(MAX_PARTICLES)
  })

  it('buffer subarray contains only active particles', () => {
    const pool = new ParticlePool()
    pool.spawn(5, 5, 1, 0, 0)
    const buf = pool.buffer
    expect(buf.length).toBe(pool.count * 8) // PARTICLE_STRIDE = 8
  })

  it('clear resets count to zero', () => {
    const pool = new ParticlePool()
    pool.spawn(5, 5, 1, 0, 0)
    expect(pool.count).toBeGreaterThan(0)
    pool.clear()
    expect(pool.count).toBe(0)
  })
})
