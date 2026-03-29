import {
  MAX_PARTICLES,
  PARTICLE_STRIDE,
  PARTICLE_COUNT_MIN,
  PARTICLE_COUNT_MAX,
  PARTICLE_LIFETIME_S,
} from '../constants.js'

/** Pure-math particle pool — zero GL dependencies, fully testable in Node */
export class ParticlePool {
  /** Flat buffer: [x, y, vx, vy, life, r, g, b] per particle */
  readonly data: Float32Array
  private _count = 0

  constructor() {
    this.data = new Float32Array(MAX_PARTICLES * PARTICLE_STRIDE)
  }

  get count(): number {
    return this._count
  }

  /** Active region of the buffer for GL upload */
  get buffer(): Float32Array {
    return this.data.subarray(0, this._count * PARTICLE_STRIDE)
  }

  /** Spawn 8-12 particles at a grid cell position */
  spawn(gridX: number, gridY: number, r: number, g: number, b: number): void {
    const numParticles = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1))

    for (let i = 0; i < numParticles; i++) {
      if (this._count >= MAX_PARTICLES) return

      const offset = this._count * PARTICLE_STRIDE
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 1.5

      this.data[offset]     = gridX + 0.5  // x (center of cell)
      this.data[offset + 1] = gridY + 0.5  // y
      this.data[offset + 2] = Math.cos(angle) * speed  // vx
      this.data[offset + 3] = Math.sin(angle) * speed  // vy
      this.data[offset + 4] = PARTICLE_LIFETIME_S       // life
      this.data[offset + 5] = r
      this.data[offset + 6] = g
      this.data[offset + 7] = b

      this._count++
    }
  }

  /** Advance positions, decrement life, compact expired particles */
  update(dt: number): void {
    let writeIdx = 0
    for (let readIdx = 0; readIdx < this._count; readIdx++) {
      const offset = readIdx * PARTICLE_STRIDE
      const life = this.data[offset + 4]! - dt

      if (life <= 0) continue // expired, skip

      // Advance position
      this.data[offset]     = this.data[offset]! + this.data[offset + 2]! * dt
      this.data[offset + 1] = this.data[offset + 1]! + this.data[offset + 3]! * dt
      this.data[offset + 4] = life

      // Compact: copy to write position if needed
      if (writeIdx !== readIdx) {
        const wOffset = writeIdx * PARTICLE_STRIDE
        for (let j = 0; j < PARTICLE_STRIDE; j++) {
          this.data[wOffset + j] = this.data[offset + j]!
        }
      }
      writeIdx++
    }
    this._count = writeIdx
  }

  clear(): void {
    this._count = 0
  }
}
