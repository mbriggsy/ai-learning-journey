/*
 * src/viz/chartText.tsx — THE CHART TEXT LAYER primitives (council wf_ecbe0ab2-7bb, 2026-09-05:
 * "SVG draws, HTML writes"). The law + the why live in chartText.css's header; this file is the
 * mechanism the four charts share:
 *
 *   - <ChartTextHost>  — the positioned wrapper around a chart's <svg> (the box percentages resolve
 *                        against). Rendered as a <span> so it stays legal inside the band's enlarge
 *                        <button> (phrasing content); display:block via CSS.
 *   - <ChartTextLayer> — the absolute, aria-hidden, pointer-transparent overlay.
 *   - <ChartText>      — one positioned text node at a FRACTION of the host (svg x / viewBox width,
 *                        svg y / viewBox height), anchored like SVG text (start/middle/end ×
 *                        top/middle/bottom), on one of the three borrowed registers.
 *   - useCollisionLayout — the MEASURED replacement for every glyph-width estimate the charts used
 *                        to carry (LABEL_CHAR_PX 6.6, TF_AXIS_CHAR_W 6.4, TF_READOUT_CHAR_W 6.6 —
 *                        all deleted). Reads real boxes before paint, stacks or hides colliders,
 *                        re-runs on resize. No text metric ever reaches an svg coordinate again, so
 *                        the emitted path `d` strings are byte-stable in every width (bandGeometry's
 *                        screenshot-determinism contract, restored rather than argued).
 *   - useReadoutPlacement — places a scrub readout box beside its rule, inside the plot, from the
 *                        box's MEASURED width.
 *
 * CSP: `--fx`/`--fy` are React style-prop custom properties — CSSOM writes at runtime, which the
 * strict style-src 'self' policy permits (e2e/design-tokens.spec.ts proves it under the enforced
 * headers; src/intake/flow.tsx has shipped a style prop since U5). Never a style ATTRIBUTE string,
 * never an injected <style>.
 *
 * STRING-FREE: this file types no copy and no number; every child is caller-supplied.
 */
import { useLayoutEffect, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react'
import './chartText.css'

export type CtAnchor = 'start' | 'middle' | 'end'
export type CtVAlign = 'top' | 'middle' | 'bottom'
export type CtRegister = 'xs' | 'sm' | 'lg'

/** The custom properties the layer's CSS reads, typed so a caller cannot misspell one. */
export type CtStyle = CSSProperties & {
  '--fx'?: number
  '--fy'?: number
  '--fw'?: number
  '--fh'?: number
  '--ct-row'?: number
  '--ct-rows'?: number
  '--rx'?: string
  '--ry'?: string
}

export function ChartTextHost({
  className,
  children,
  ref,
}: {
  readonly className?: string
  readonly children: ReactNode
  /** The host box the readout placement measures — pass the same ref to {@link useReadoutPlacement}. */
  readonly ref?: Ref<HTMLSpanElement>
}) {
  return (
    <span className={className ? `ct-host ${className}` : 'ct-host'} ref={ref}>
      {children}
    </span>
  )
}

export function ChartTextLayer({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return (
    <span className={className ? `ct-layer ${className}` : 'ct-layer'} aria-hidden="true">
      {children}
    </span>
  )
}

export interface ChartTextProps {
  /** Position as FRACTIONS of the host box: svg x / viewBox width, svg y / viewBox height. */
  readonly fx: number
  readonly fy: number
  readonly anchor?: CtAnchor
  readonly valign?: CtVAlign
  readonly register?: CtRegister
  /** ink + semibold — one rank above the axis numbers. */
  readonly strong?: boolean
  /** the display face (the RecommendationViz hero only). */
  readonly display?: boolean
  readonly italic?: boolean
  /** Allow wrapping inside a column this wide (a FRACTION of the host) — series end labels. */
  readonly wrapWidth?: number
  readonly className?: string
  /** Marks the node for {@link useCollisionLayout} (any value); `priority` items are never hidden. */
  readonly collide?: boolean
  readonly priority?: boolean
  /** Pairs the node with a `[data-ct-tail]` sibling (a leader / tail) that receives the same row or
   *  push the layout writes to the node. */
  readonly itemKey?: string
  readonly children: ReactNode
}

export function ChartText({
  fx,
  fy,
  anchor = 'start',
  valign = 'middle',
  register = 'xs',
  strong = false,
  display = false,
  italic = false,
  wrapWidth,
  className,
  collide = false,
  priority = false,
  itemKey,
  children,
}: ChartTextProps) {
  const style: CtStyle = { '--fx': fx, '--fy': fy }
  if (wrapWidth !== undefined) style['--fw'] = wrapWidth
  const cls = [
    'ct-text',
    `ct-text--${anchor}`,
    `ct-text--v${valign}`,
    `ct-text--${register}`,
    strong ? 'ct-text--strong' : '',
    display ? 'ct-text--display' : '',
    italic ? 'ct-text--italic' : '',
    wrapWidth !== undefined ? 'ct-text--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} style={style} data-ct-item={collide ? (itemKey ?? '') : undefined} data-ct-priority={priority ? '' : undefined}>
      {children}
    </span>
  )
}

/* ── the measured collision layout ──────────────────────────────────────────────────────────── */

export type CtCollisionMode =
  /** stack colliders onto lower ROWS (the band's annotation block): sets `--ct-row` on each item and
   *  its matching `[data-ct-tail]`, and `--ct-rows` on the host. */
  | 'stagger'
  /** hide the later collider (axis ticks): sets `data-ct-hidden`; priority items are never hidden. */
  | 'hide'
  /** push a lower item DOWN until it clears the one above (series end labels): sets `--ct-dy` (px). */
  | 'separate-y'

const CT_PAD_PX = 6

interface Box {
  readonly el: HTMLElement
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

const DEFAULT_ITEMS = '[data-ct-item]'

function boxesOf(host: HTMLElement, selector: string): Box[] {
  const out: Box[] = []
  const items = [...host.querySelectorAll<HTMLElement>(selector)]
  for (const el of items) {
    // measure the UN-shifted box: a prior pass's row/dy offset must not feed the next pass.
    el.style.removeProperty('--ct-row')
    el.style.removeProperty('--ct-dy')
    el.removeAttribute('data-ct-hidden')
    const key = el.dataset['ctItem']
    if (key) {
      const tail = host.querySelector<HTMLElement>(`[data-ct-tail="${key}"]`)
      tail?.style.removeProperty('--ct-row')
      tail?.style.removeProperty('--ct-dy')
      tail?.removeAttribute('data-ct-hidden')
    }
  }
  for (const el of items) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue // not laid out (jsdom) — nothing to place
    out.push({ el, left: r.left, right: r.right, top: r.top, bottom: r.bottom })
  }
  return out
}

/** Run the layout once over the host's current DOM. `selector` scopes the pass to one family of
 *  items when a host carries several (TwoFutures hides colliding x ticks AND separates its end
 *  labels vertically, in the same host). Exported for tests; the hook wires it to useLayoutEffect
 *  + ResizeObserver. */
export function layoutCollisions(host: HTMLElement, mode: CtCollisionMode, selector = DEFAULT_ITEMS, pad = CT_PAD_PX): void {
  const boxes = boxesOf(host, selector)
  if (mode === 'stagger') {
    // Greedy left→right in two passes. NAMED items (the household's moments) take the first row whose
    // running right edge they clear — rows are UNBOUNDED, content is never cut to fit. OPTIONAL items
    // (`data-ct-optional`: the unnamed interim age ticks) are axis wayfinding, not moments: one that
    // would collide with anything already placed is HIDDEN rather than given a row — the same rule
    // TwoFutures applies to its intermediate x ticks, and the cure for the cold-read flag that a
    // staggered "70 / 69" tick "reads as a rendering defect" (docs/caddie/cold-read-log.md).
    const sorted = [...boxes].sort((a, b) => a.left - b.left)
    const named = sorted.filter((b) => !b.el.hasAttribute('data-ct-optional'))
    const optional = sorted.filter((b) => b.el.hasAttribute('data-ct-optional'))
    const rowRight: number[] = []
    const placed: { readonly left: number; readonly right: number; readonly level: number }[] = []
    let rows = 0
    const setRow = (b: Box, level: number) => {
      b.el.style.setProperty('--ct-row', String(level))
      const key = b.el.dataset['ctItem']
      if (key) host.querySelector<HTMLElement>(`[data-ct-tail="${key}"]`)?.style.setProperty('--ct-row', String(level))
    }
    for (const b of named) {
      let level = rowRight.findIndex((edge) => b.left >= edge + pad)
      if (level === -1) {
        level = rowRight.length
        rowRight.push(Number.NEGATIVE_INFINITY)
      }
      rowRight[level] = b.right
      rows = Math.max(rows, level + 1)
      placed.push({ left: b.left, right: b.right, level })
      setRow(b, level)
    }
    for (const b of optional) {
      // row 0 only, and only if clear of every placed box on that row (and of other kept ticks).
      const clash = placed.some((p) => p.level === 0 && b.left < p.right + pad && b.right > p.left - pad)
      if (clash) {
        b.el.setAttribute('data-ct-hidden', '')
        const key = b.el.dataset['ctItem']
        if (key) host.querySelector<HTMLElement>(`[data-ct-tail="${key}"]`)?.setAttribute('data-ct-hidden', '')
        continue
      }
      placed.push({ left: b.left, right: b.right, level: 0 })
      setRow(b, 0)
    }
    host.style.setProperty('--ct-rows', String(Math.max(1, rows)))
    return
  }
  if (mode === 'hide') {
    // priority items (axis endpoints) are placed first and never hidden; the rest keep only if they
    // clear every kept box horizontally.
    const prio = boxes.filter((b) => b.el.hasAttribute('data-ct-priority'))
    const rest = boxes.filter((b) => !b.el.hasAttribute('data-ct-priority')).sort((a, b) => a.left - b.left)
    const kept: Box[] = [...prio]
    for (const b of rest) {
      const clash = kept.some((k) => b.left < k.right + pad && b.right > k.left - pad && b.top < k.bottom && b.bottom > k.top)
      if (clash) b.el.setAttribute('data-ct-hidden', '')
      else kept.push(b)
    }
    return
  }
  // separate-y: walk top→bottom; a box overlapping the one above is pushed down by the overlap + pad.
  // The push is ALSO written to the item's tail (`[data-ct-tail]` — TwoFutures' elbow leader), so
  // the tie moves with the label it ties.
  const sorted = [...boxes].sort((a, b) => a.top - b.top)
  let floor = Number.NEGATIVE_INFINITY
  for (const b of sorted) {
    const dy = floor > b.top ? floor - b.top : 0
    if (dy > 0) {
      const px = `${dy.toFixed(2)}px`
      b.el.style.setProperty('--ct-dy', px)
      const key = b.el.dataset['ctItem']
      if (key) host.querySelector<HTMLElement>(`[data-ct-tail="${key}"]`)?.style.setProperty('--ct-dy', px)
    }
    floor = b.bottom + dy + pad
  }
}

/**
 * Measured collision layout over a host's `[data-ct-item]` children. Runs BEFORE paint on mount and
 * on every dependency change (no flash of overlapping labels), and again whenever the host's box
 * resizes (the 1088 two-pane cliff, a rotated phone, a raised browser font). Writes only CSS custom
 * properties / data attributes React does not manage, so it never fights the render.
 */
export function useCollisionLayout(
  hostRef: RefObject<HTMLElement | null>,
  mode: CtCollisionMode,
  deps: readonly unknown[],
  selector: string = DEFAULT_ITEMS,
): void {
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    layoutCollisions(host, mode, selector)
    // The webfonts load through JS imports (main.tsx) under font-display: swap, so the first layout
    // can measure FALLBACK glyphs; a swap changes the items' widths but not the HOST's box, so the
    // ResizeObserver below never fires for it. Re-run once when the fonts settle (council
    // wf_1b45326f-9e8, 2026-09-05). Cancel-guarded: a host unmounted before the fonts land is skipped.
    let live = true
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (fonts) void fonts.ready.then(() => live && layoutCollisions(host, mode, selector))
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false
      }
    }
    const ro = new ResizeObserver(() => layoutCollisions(host, mode, selector))
    ro.observe(host)
    return () => {
      live = false
      ro.disconnect()
    }
    // the caller names what moves the labels (their ids, positions and strings) in `deps`
  }, [hostRef, mode, selector, ...deps])
}

/* ── the scrub readout placement ────────────────────────────────────────────────────────────── */

/** The gap between the scrub rule and the readout box, in host px. */
const CT_READOUT_GAP_PX = 10

/** The readout box's x in HOST px, from measured widths: right of the rule while that fits inside
 *  the plot, else left; then clamped fully inside the plot. Pure numbers, no DOM — "Exported for
 *  tests" exactly like {@link layoutCollisions}. PRECONDITION the caller owns: 2·boxWmax + gap ≤
 *  (plotRightF − plotLeftF)·hostW, or a clamped box can cover its own rule (chartText.css .ct-readout
 *  derives where the shipped 38% cap satisfies it: hosts wider than ~250 px). */
export function placeReadoutX(hostW: number, boxW: number, ruleFx: number, plotLeftF: number, plotRightF: number, gap = CT_READOUT_GAP_PX): number {
  const rule = ruleFx * hostW
  const left = plotLeftF * hostW
  const right = plotRightF * hostW
  let x = rule + gap + boxW <= right ? rule + gap : rule - gap - boxW
  if (x < left) x = left
  if (x + boxW > right) x = Math.max(left, right - boxW)
  return x
}

export interface ReadoutPlacementOpts {
  /** the host the box lives in (percentages + px resolve against it). */
  readonly hostRef: RefObject<HTMLElement | null>
  /** the scrub rule's x as a fraction of the host, or null when no readout is showing. */
  readonly ruleFx: number | null
  /** the plot's horizontal extent as fractions of the host — the box stays inside it. */
  readonly plotLeftF: number
  readonly plotRightF: number
  /** the box's top as a fraction of the host (pinned; never bobs with the cursor). */
  readonly topF: number
}

/**
 * Place the readout box beside its rule from the box's MEASURED width: right of the rule while
 * that fits inside the plot, else left; then clamp fully inside the plot. Never covers the rule while
 * the host is wider than ~250 CSS px (chartText.css .ct-readout carries the derivation) — and the
 * width it measures is the BORDER BOX: a nowrap line can paint past it on a host too narrow for the cap.
 * (The svg era did this in user units against a fixed READOUT_W — a catalog string wider than the
 * box clipped silently; an HTML box hugs its content, so the only question left is WHERE.)
 */
export function useReadoutPlacement(boxRef: RefObject<HTMLElement | null>, opts: ReadoutPlacementOpts): void {
  const { hostRef, ruleFx, plotLeftF, plotRightF, topF } = opts
  useLayoutEffect(() => {
    const box = boxRef.current
    const host = hostRef.current
    if (!box || !host || ruleFx === null) return
    const place = () => {
      const hostRect = host.getBoundingClientRect()
      const hostW = hostRect.width
      const hostH = hostRect.height
      if (hostW === 0) return
      const boxW = box.getBoundingClientRect().width
      const x = placeReadoutX(hostW, boxW, ruleFx, plotLeftF, plotRightF)
      box.style.setProperty('--rx', `${x.toFixed(2)}px`)
      box.style.setProperty('--ry', `${(topF * hostH).toFixed(2)}px`)
    }
    place()
    // A webfont swap after the first paint re-sizes the box's lines; the box observer below sees a
    // box that GROWS, but a swap to a narrower face shrinks it and is still seen — the one-shot on
    // fonts.ready is belt-and-braces for the same reason useCollisionLayout carries it (its host
    // never resizes on a swap). Cancel-guarded for an unmount before the fonts land.
    let live = true
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (fonts) void fonts.ready.then(() => live && place())
    // --rx/--ry are absolute px: a PINNED touch readout (the finger has lifted) must follow a rotation
    // or a resize, so re-place on either box moving — the same observer discipline as useCollisionLayout.
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false
      }
    }
    const ro = new ResizeObserver(() => place())
    ro.observe(host)
    ro.observe(box)
    return () => {
      live = false
      ro.disconnect()
    }
  }, [boxRef, hostRef, ruleFx, plotLeftF, plotRightF, topF])
}
