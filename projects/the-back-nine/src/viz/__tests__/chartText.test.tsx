// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { ChartText, ChartTextHost, ChartTextLayer, layoutCollisions } from '../chartText'

/**
 * The chart TEXT LAYER (council wf_ecbe0ab2-7bb, 2026-09-05 — "SVG draws, HTML writes").
 *
 * What this battery pins:
 *  - <ChartText> positions by viewBox FRACTIONS written as CSSOM custom properties (`--fx`/`--fy`),
 *    anchors like SVG text, and sizes on the three borrowed registers — never a px of its own.
 *  - layoutCollisions works on MEASURED boxes. jsdom lays nothing out, so every box here is a
 *    stubbed getBoundingClientRect — synthetic geometry the assertions are derived from by hand,
 *    never from the constant under test (the placer this replaces carried LABEL_CHAR_PX 6.6 and a
 *    suite that computed its expectations through it — DND 012's self-referential oracle).
 *  - 'stagger': named items stack into rows they clear; optional items HIDE on a collision (the
 *    interim age ticks) and never take a row; the host learns the row count.
 *  - 'hide': the later collider hides; a priority item never does.
 *  - 'separate-y': a lower box is pushed down by exactly its overlap plus the pad.
 */

afterEach(cleanup)

/** Stub a laid-out box on an element (jsdom's default is all zeros — "not laid out"). */
function box(el: Element, left: number, width: number, top = 0, height = 20): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left, right: left + width, top, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}) }),
  })
}

describe('ChartText — a positioned, register-sized HTML text node', () => {
  it('writes the position as --fx/--fy custom properties (CSSOM, never a style attribute string)', () => {
    const { getByText } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0.25} fy={0.5} anchor="end" valign="bottom" register="sm" strong>
            $0
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    const el = getByText('$0')
    expect(el.style.getPropertyValue('--fx')).toBe('0.25')
    expect(el.style.getPropertyValue('--fy')).toBe('0.5')
    expect(el.className).toContain('ct-text--end')
    expect(el.className).toContain('ct-text--vbottom')
    expect(el.className).toContain('ct-text--sm')
    expect(el.className).toContain('ct-text--strong')
    // no inline font-size anywhere: the size is the register's token (chartText.css)
    expect(el.style.fontSize).toBe('')
  })

  it('the layer is the SIGHTED channel: aria-hidden, so the a11y tree keeps the svg caption', () => {
    const { container } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0} fy={0}>
            x
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    expect(container.querySelector('.ct-layer')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('a wrapping label carries its column width as --fw and the wrap class', () => {
    const { getByText } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0.7} fy={0.5} wrapWidth={0.3}>
            The recommended strategy
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    const el = getByText('The recommended strategy')
    expect(el.style.getPropertyValue('--fw')).toBe('0.3')
    expect(el.className).toContain('ct-text--wrap')
  })
})

function host(html: string): HTMLElement {
  const h = document.createElement('div')
  h.innerHTML = html
  document.body.appendChild(h)
  return h
}

describe('layoutCollisions — stagger: named items take rows, optional items yield', () => {
  it('two named labels that overlap land on rows 0 and 1; a clear third stays on row 0; the host learns 2 rows', () => {
    const h = host(
      '<span data-ct-item="a"></span><span data-ct-item="b"></span><span data-ct-item="c"></span>' +
        '<span data-ct-tail="b"></span>',
    )
    const [a, b, c] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 50) // [0, 50]
    box(b!, 40, 60) // [40, 100] — overlaps a by 10 → row 1
    box(c!, 120, 40) // [120, 160] — clears a (50 + 6 pad) → row 0
    layoutCollisions(h, 'stagger')
    expect(a!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(b!.style.getPropertyValue('--ct-row')).toBe('1')
    expect(c!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('2')
    // the tail follows its label's row
    expect(h.querySelector<HTMLElement>('[data-ct-tail="b"]')!.style.getPropertyValue('--ct-row')).toBe('1')
  })

  it('a third overlapping named label takes a THIRD row — content is never cut to fit', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b"></span><span data-ct-item="c"></span>')
    const [a, b, c] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 60)
    box(b!, 10, 60)
    box(c!, 20, 60)
    layoutCollisions(h, 'stagger')
    expect([a, b, c].map((el) => el!.style.getPropertyValue('--ct-row'))).toEqual(['0', '1', '2'])
    expect(h.style.getPropertyValue('--ct-rows')).toBe('3')
  })

  it('an OPTIONAL item (an interim age tick) that collides HIDES instead of taking a row; a clear one stays visible on row 0', () => {
    const h = host(
      '<span data-ct-item="today"></span><span data-ct-item="t1" data-ct-optional></span><span data-ct-item="t2" data-ct-optional></span>' +
        '<span data-ct-tail="t1"></span>',
    )
    const [today, t1, t2] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(today!, 0, 45)
    box(t1!, 30, 40) // collides with Today → hidden, no row
    box(t2!, 120, 40) // clear → shown on row 0
    layoutCollisions(h, 'stagger')
    expect(t1!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(h.querySelector('[data-ct-tail="t1"]')!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(t2!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(t2!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('1') // no row was spent on the tick
  })

  it('a second pass re-measures from clean state: a prior row/hidden mark never leaks into the next layout', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b" data-ct-optional></span>')
    const [a, b] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 50)
    box(b!, 30, 40)
    layoutCollisions(h, 'stagger')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(true)
    // the tick moves clear (a wider figure): the second pass must UN-hide it
    box(b!, 200, 40)
    layoutCollisions(h, 'stagger')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(false)
  })

  it('un-laid-out items (all-zero boxes, jsdom) are ignored — no row, no hide, one reserved row', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b"></span>')
    layoutCollisions(h, 'stagger')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('1')
    for (const el of h.querySelectorAll<HTMLElement>('[data-ct-item]')) {
      expect(el.style.getPropertyValue('--ct-row')).toBe('')
      expect(el.hasAttribute('data-ct-hidden')).toBe(false)
    }
  })
})

describe('layoutCollisions — hide: the later collider yields, a priority item never does', () => {
  it('an intermediate tick over an endpoint hides; the endpoint stays; a clear tick stays', () => {
    const h = host(
      '<span class="x" data-ct-item="today" data-ct-priority></span><span class="x" data-ct-item="t5"></span>' +
        '<span class="x" data-ct-item="t9"></span><span class="x" data-ct-item="end" data-ct-priority></span>',
    )
    const [today, t5, t9, end] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(today!, 0, 60, 0, 16)
    box(t5!, 50, 30, 0, 16) // overlaps today's [0,60] → hidden
    box(t9!, 150, 30, 0, 16) // clear
    box(end!, 170, 50, 0, 16) // overlaps t9 — but end is priority, so t9 must yield instead
    layoutCollisions(h, 'hide', '.x[data-ct-item]')
    expect(today!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(end!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(t5!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(t9!.hasAttribute('data-ct-hidden')).toBe(true)
  })

  it('the selector scopes the pass: items outside it are neither measured nor touched', () => {
    const h = host('<span class="x" data-ct-item="a"></span><span class="y" data-ct-item="b"></span>')
    const [a, b] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 60, 0, 16)
    box(b!, 10, 60, 0, 16) // would collide with a — but it is not in the selector
    layoutCollisions(h, 'hide', '.x[data-ct-item]')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(false)
  })
})

describe('layoutCollisions — separate-y: a lower box is pushed down by its overlap plus the pad', () => {
  it('two end labels 10px apart with 20px boxes: the lower moves down 16px (10 overlap + 6 pad); a clear pair moves nothing', () => {
    const h = host('<span class="l" data-ct-item="w"></span><span class="l" data-ct-item="wo"></span>')
    const [w, wo] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(w!, 400, 100, 100, 20) // [100, 120]
    box(wo!, 400, 100, 110, 20) // [110, 130] — overlaps by 10
    layoutCollisions(h, 'separate-y', '.l[data-ct-item]')
    expect(w!.style.getPropertyValue('--ct-dy')).toBe('')
    expect(wo!.style.getPropertyValue('--ct-dy')).toBe('16.00px')
    // clear pair
    box(wo!, 400, 100, 150, 20)
    layoutCollisions(h, 'separate-y', '.l[data-ct-item]')
    expect(wo!.style.getPropertyValue('--ct-dy')).toBe('')
  })
})
