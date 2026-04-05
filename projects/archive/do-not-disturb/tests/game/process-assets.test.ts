import { describe, it, expect } from 'vitest';
import { isChromaKey, removeChromaKey, stripEdgeBorder } from '../../scripts/process-assets';

describe('isChromaKey', () => {
  const magenta = { r: 255, g: 0, b: 255 };

  it('exact magenta is chroma key', () => {
    expect(isChromaKey(255, 0, 255, magenta, 60)).toBe(true);
  });

  it('near-magenta within threshold', () => {
    expect(isChromaKey(240, 10, 250, magenta, 60)).toBe(true);
  });

  it('non-magenta is not chroma key', () => {
    expect(isChromaKey(100, 200, 50, magenta, 60)).toBe(false);
  });

  it('black is not chroma key', () => {
    expect(isChromaKey(0, 0, 0, magenta, 60)).toBe(false);
  });
});

describe('removeChromaKey', () => {
  it('sets alpha to 0 for chroma-key pixels', () => {
    // 2x1 image: magenta pixel + red pixel
    const pixels = new Uint8Array([
      255, 0, 255, 255,  // magenta, opaque
      255, 0, 0, 255,    // red, opaque
    ]);
    const removed = removeChromaKey(pixels, 2, 1, { r: 255, g: 0, b: 255 }, 60);
    expect(removed).toBe(1);
    expect(pixels[3]).toBe(0);   // magenta → transparent
    expect(pixels[7]).toBe(255); // red → unchanged
  });

  it('returns 0 when no chroma-key pixels', () => {
    const pixels = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    const removed = removeChromaKey(pixels, 2, 1, { r: 255, g: 0, b: 255 }, 60);
    expect(removed).toBe(0);
  });
});

describe('stripEdgeBorder', () => {
  it('clears 1px border on 4x4 image', () => {
    // 4x4 all opaque
    const pixels = new Uint8Array(4 * 4 * 4);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

    stripEdgeBorder(pixels, 4, 4, 1);

    // Check corners are transparent
    expect(pixels[3]).toBe(0);   // (0,0)
    expect(pixels[15]).toBe(0);  // (3,0)

    // Check interior pixels (1,1) and (2,2) are still opaque
    const innerIdx1 = (1 * 4 + 1) * 4 + 3;
    const innerIdx2 = (2 * 4 + 2) * 4 + 3;
    expect(pixels[innerIdx1]).toBe(255);
    expect(pixels[innerIdx2]).toBe(255);
  });

  it('entire 2x2 image is border with borderPx=1', () => {
    const pixels = new Uint8Array(2 * 2 * 4);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

    stripEdgeBorder(pixels, 2, 2, 1);

    // All pixels should be transparent
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(0);
    }
  });
});
