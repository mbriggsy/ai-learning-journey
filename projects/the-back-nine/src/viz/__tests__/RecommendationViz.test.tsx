// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { RecommendationViz, type RecommendationVizLabels } from '../RecommendationViz'

/*
 * RecommendationViz — the recommend-second two-arm comparison (U16 §S3b). The battery pins the
 * NON-COLOR two-arm encoding (the reader is color-blind — color is the least-trusted channel): the two
 * arms differ by MARKER SHAPE (circle vs triangle), by FILL TEXTURE (solid vs hatch), and by a direct
 * end-of-bar TEXT label each. Mutant (a) — "the viz encodes the two arms by HUE ALONE" — dies on the
 * shape+texture assertions below.
 */

afterEach(cleanup)

const LABELS: RecommendationVizLabels = {
  withLabel: 'The recommended strategy',
  withoutLabel: 'Your plan today',
  deltaLabel: '$48,000',
  floorLabel: '$0',
  axisMaxLabel: '~$820k',
  ariaSummary: 'Your plan today lands near about $740,000; the recommended strategy about $788,000 — a difference of about $48,000.',
}

const renderViz = (over: Partial<{ withoutMagnitude: number; withMagnitude: number; labels: RecommendationVizLabels }> = {}) =>
  render(
    <RecommendationViz
      withoutMagnitude={over.withoutMagnitude ?? 740_000}
      withMagnitude={over.withMagnitude ?? 788_000}
      labels={over.labels ?? LABELS}
    />,
  )

describe('RecommendationViz — the accessible figure', () => {
  it('is a role="img" with the whole comparison as its accessible name (A2 AT-parity)', () => {
    renderViz()
    const svg = document.querySelector('svg.rv')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg?.getAttribute('aria-label')).toBe(LABELS.ariaSummary)
  })

  it('carries the direct end-of-bar labels for BOTH arms (no color legend)', () => {
    const { container } = renderViz()
    const text = container.textContent ?? ''
    expect(text).toContain(LABELS.withLabel)
    expect(text).toContain(LABELS.withoutLabel)
    // the delta magnitude is the HERO channel (its own mark).
    expect(container.querySelector('[data-role="delta-hero"]')?.textContent).toBe(LABELS.deltaLabel)
    // $0-anchored: the floor label is present (the ruin anchor is always drawable).
    expect(text).toContain(LABELS.floorLabel)
  })
})

describe('RecommendationViz — the NON-COLOR two-arm encoding (mutant a: hue alone)', () => {
  it('the two arms carry DISTINCT marker SHAPES — circle (without) vs triangle/polygon (with)', () => {
    renderViz()
    const withoutMarker = document.querySelector('.rv__marker[data-arm="without"]')
    const withMarker = document.querySelector('.rv__marker[data-arm="with"]')
    expect(withoutMarker, 'the baseline arm has a marker').not.toBeNull()
    expect(withMarker, 'the recommended arm has a marker').not.toBeNull()
    // The two markers are DIFFERENT element types — the shape channel. A hue-only encoding (both the
    // same shape, differing by fill color) makes these tag names EQUAL and this assertion RED.
    expect(withoutMarker!.tagName.toLowerCase()).toBe('circle')
    expect(withMarker!.tagName.toLowerCase()).toBe('polygon')
    expect(withoutMarker!.tagName.toLowerCase()).not.toBe(withMarker!.tagName.toLowerCase())
  })

  it('the two arms carry DISTINCT fill TEXTURES — solid (without) vs hatch (with)', () => {
    renderViz()
    const withoutBar = document.querySelector('.rv__bar[data-arm="without"]')
    const withBar = document.querySelector('.rv__bar[data-arm="with"]')
    expect(withoutBar?.getAttribute('data-fill')).toBe('solid')
    expect(withBar?.getAttribute('data-fill')).toBe('hatch')
    // The texture is redundant to hue: the fill descriptors DIFFER (a hue-only encoding leaves both
    // 'solid' and this assertion RED), and the hatch pattern def actually exists.
    expect(withoutBar!.getAttribute('data-fill')).not.toBe(withBar!.getAttribute('data-fill'))
    expect(document.querySelector('pattern#rv-hatch'), 'the hatch texture is a real SVG pattern def').not.toBeNull()
    expect(withBar?.getAttribute('fill')).toBe('url(#rv-hatch)')
  })
})

describe('RecommendationViz — $0-anchored geometry', () => {
  it('both bars grow from the shared left gutter ($0) — a longer magnitude draws a longer bar', () => {
    renderViz({ withoutMagnitude: 400_000, withMagnitude: 800_000 })
    const withoutBar = document.querySelector('.rv__bar[data-arm="without"]')
    const withBar = document.querySelector('.rv__bar[data-arm="with"]')
    // same x-origin (the $0 anchor), the larger magnitude the wider bar.
    expect(withoutBar?.getAttribute('x')).toBe(withBar?.getAttribute('x'))
    const wo = Number(withoutBar?.getAttribute('width'))
    const w = Number(withBar?.getAttribute('width'))
    expect(w).toBeGreaterThan(wo)
    // both are non-negative (a magnitude can never draw a bar left of $0).
    expect(wo).toBeGreaterThanOrEqual(0)
  })
})
