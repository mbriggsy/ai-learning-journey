import { describe, it, expect } from 'vitest'
import { Camera } from '../../src/Camera.js'

describe('Camera', () => {
  describe('pan', () => {
    it('offsets coordinates', () => {
      const cam = new Camera()
      cam.pan(100, 50)
      expect(cam.panX).toBe(100)
      expect(cam.panY).toBe(50)
    })

    it('accumulates pan', () => {
      const cam = new Camera()
      cam.pan(10, 20)
      cam.pan(30, 40)
      expect(cam.panX).toBe(40)
      expect(cam.panY).toBe(60)
    })
  })

  describe('zoom', () => {
    it('zooms at point', () => {
      const cam = new Camera()
      cam.setZoom(1)
      cam.zoomAt(2, 100, 100) // zoom in 2x toward (100, 100)
      expect(cam.zoom).toBe(2)
    })

    it('clamps to minimum', () => {
      const cam = new Camera()
      cam.setZoom(0.1)
      cam.zoomAt(0.1, 0, 0) // try to zoom out way past min
      expect(cam.zoom).toBeGreaterThanOrEqual(0.05)
    })

    it('clamps to maximum', () => {
      const cam = new Camera()
      cam.setZoom(100)
      cam.zoomAt(10, 0, 0)
      expect(cam.zoom).toBeLessThanOrEqual(200)
    })
  })

  describe('screenToGrid / gridToScreen roundtrip', () => {
    it('roundtrips at default zoom', () => {
      const cam = new Camera()
      cam.setZoom(1)
      const [gx, gy] = cam.screenToGrid(50, 75)
      const [sx, sy] = cam.gridToScreen(gx, gy)
      expect(sx).toBeCloseTo(50)
      expect(sy).toBeCloseTo(75)
    })

    it('roundtrips at 2x zoom with pan', () => {
      const cam = new Camera()
      cam.setZoom(2)
      cam.pan(30, 40)
      const [gx, gy] = cam.screenToGrid(100, 200)
      const [sx, sy] = cam.gridToScreen(gx, gy)
      expect(sx).toBeCloseTo(100)
      expect(sy).toBeCloseTo(200)
    })
  })

  describe('getViewMatrix', () => {
    it('returns same Float32Array reference (zero allocation)', () => {
      const cam = new Camera()
      const m1 = cam.getViewMatrix(800, 600)
      const m2 = cam.getViewMatrix(800, 600)
      expect(m1).toBe(m2) // same object reference
    })

    it('returns 9-element matrix', () => {
      const cam = new Camera()
      const m = cam.getViewMatrix(800, 600)
      expect(m.length).toBe(9)
    })

    it('matrix transforms correctly at identity', () => {
      const cam = new Camera()
      cam.setZoom(1)
      const m = cam.getViewMatrix(100, 100)
      // At zoom=1, pan=0, canvas 100x100:
      // sx = 2*1/100 = 0.02, sy = 2*1/100 = 0.02
      // tx = -1, ty = 1
      expect(m[0]).toBeCloseTo(0.02) // sx
      expect(m[4]).toBeCloseTo(-0.02) // -sy (y-flip)
      expect(m[6]).toBeCloseTo(-1) // tx
      expect(m[7]).toBeCloseTo(1) // ty
    })
  })
})
