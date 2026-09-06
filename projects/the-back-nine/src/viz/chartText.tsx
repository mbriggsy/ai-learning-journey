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
 *   - useReadoutSeat / <ChartReadoutRow> — the SEAT decision (his eye, 2026-09-06): the readout's
 *                        words sit in the plot only while their ink is containable there; otherwise
 *                        they LEAVE for a flow row reserved at its tallest. Measured before paint.
 *
 * CSP: `--fx`/`--fy` are React style-prop custom properties — CSSOM writes at runtime, which the
 * strict style-src 'self' policy permits (e2e/design-tokens.spec.ts proves it under the enforced
 * headers; src/intake/flow.tsx has shipped a style prop since U5). Never a style ATTRIBUTE string,
 * never an injected <style>.
 *
 * STRING-FREE: this file types no copy and no number; every child is caller-supplied.
 */
import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react'
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

/* ── the readout SEAT: in the plot, or in a flow row ─────────────────────────────────────────────
 *
 * THE LAW (council 2026-09-05, docs/council-log.md → docs/architecture.md §12 "the room is not the
 * ink"; his eye on the 320 cold read, 2026-09-06): a fraction-authored room bounds a BOX and is
 * silent about the INK, which is rem-fixed. Contain the ink; never widen the room. Where
 * containment and in-plot seating are jointly unsatisfiable, the words LEAVE the plot for flow
 * reserved at their TALLEST — they never grow in place (the `min-width: min-content` dissent was
 * put to his eye on temp/cold-read-320 and rejected: pictures 01–03 read as CROWDED, the dollar
 * line painting past the box and the box covering most of the plot).
 *
 * The decision is per WIDTH, never per column: it is taken from the WIDEST column, so it cannot
 * flip while the reader scrubs. It is taken in a layout effect (before paint), and re-taken when
 * the host resizes or the webfonts settle — the discipline the two hooks above already carry.
 */

/** Which seat the scrub readout takes at the current width. */
export type CtReadoutSeat = 'plot' | 'flow'

/** One composed readout line, as the row renders it: the caller owns every word (string-free viz). */
export interface CtReadoutLine {
  readonly text: string
  /** the kind class the chart maps its line kind to (`ct-readout__ages` … `ct-readout__note`). */
  readonly className: string
}

/** What the seat predicate must know about the readout's ink at the current width — every number
 *  MEASURED off the flow row (which is always in the DOM, so the box need not be on screen). */
export interface CtReadoutInk {
  /** The widest UNBREAKABLE line across every column. A line that WRAPS can never paint past the
   *  box (it re-wraps into it); a `white-space: nowrap` line — every figure, and the ages — is the
   *  one that can, so its ink is the box's real minimum. */
  readonly widestInkPx: number
  /** The widest column's own max-content — what `width: max-content` gives the box before the cap. */
  readonly widestColumnPx: number
  /** The box's own padding + border (measured off the row's chrome probe, never re-typed). */
  readonly chromePx: number
}

/**
 * The in-plot seat is legal iff BOTH hold at this width:
 *  1. the widest unbreakable ink + the box's chrome fits INSIDE the box's own max-width cap — so no
 *     line can paint past its border (the defect his eye ruled on: the widest column needs a 147.1 px
 *     box on the 320 arm's 238 px host, where the cap allows 90.4 — measured 2026-09-06);
 *  2. the box as it would actually render (`max-content`, capped) plus the rule gap fits beside a
 *     MID-plot rule: `box + gap ≤ plot / 2`. This is `placeReadoutX`'s stated precondition made
 *     live — it implies `2·box + gap ≤ plot`, so neither clamp in that placer can ever fire and the
 *     box can never cover its own rule, at any column.
 *
 * Pure numbers, no DOM — "Exported for tests" exactly like {@link placeReadoutX}. Nothing laid out
 * (jsdom, a host with no box yet, or a chart with no columns to read out) keeps the PLOT seat: the
 * decision is only ever made from real geometry. That "was anything measured" test is the widest
 * COLUMN and the plot's width, never the widest INK — zero unbreakable ink is a real measurement of
 * a real household, not an absent one: {@link CtReadoutInk.widestInkPx} is 0 whenever every line
 * WRAPS, which `composeReadoutLines` (src/viz/bandData.ts) produces when the ages line is dropped
 * (no household-clock closure) and the thinned cohort has withdrawn the dollars, leaving only the
 * `white-space: normal` note. Keying the guard on the ink would skip clause 2 entirely there and
 * seat a box on a host with no room to clear its own rule — clause 1 is vacuously true for ink that
 * cannot overflow, so clause 2 is exactly the one that still has to bind.
 */
export function readoutSeat(ink: CtReadoutInk, capPx: number, plotWidthPx: number, gap = CT_READOUT_GAP_PX): CtReadoutSeat {
  if (!(ink.widestColumnPx > 0) || !(plotWidthPx > 0)) return 'plot'
  const boxPx = Math.min(ink.widestColumnPx + ink.chromePx, capPx)
  return ink.widestInkPx + ink.chromePx <= capPx && boxPx + gap <= plotWidthPx / 2 ? 'plot' : 'flow'
}

/** Measure the ink the readout needs at this width, off the flow row's own items — they are always
 *  in the DOM (stacked in one grid cell, visibility-hidden except the active one), so their boxes
 *  are real at the current width and font whichever seat is in force. Exported for tests. */
export function measureReadoutInk(row: HTMLElement): CtReadoutInk {
  let widestInkPx = 0
  let widestColumnPx = 0
  for (const item of row.querySelectorAll<HTMLElement>('[data-ct-readout-item]')) {
    widestColumnPx = Math.max(widestColumnPx, item.getBoundingClientRect().width)
    for (const line of item.querySelectorAll<HTMLElement>('[data-ct-readout-line]')) {
      // WHICH lines can overflow is CSS's call (chartText.css sets `white-space` per kind), read
      // back here rather than re-derived from the kind — one source, no drift.
      if (getComputedStyle(line).whiteSpace !== 'nowrap') continue
      widestInkPx = Math.max(widestInkPx, line.getBoundingClientRect().width)
    }
  }
  const probe = row.querySelector<HTMLElement>('[data-ct-readout-chrome]')
  return { widestInkPx, widestColumnPx, chromePx: probe ? probe.getBoundingClientRect().width : 0 }
}

/** The box's max-width cap in px, READ from the row's `--ct-readout-cap` (chartText.css authors it
 *  once for the box and the row together). A cap that cannot be read is no cap — the half-plot
 *  clause still binds, so an unreadable custom property degrades to a looser seat, never to a
 *  box that silently clips its ink. */
function readoutCapPx(row: HTMLElement, hostW: number): number {
  const raw = getComputedStyle(row).getPropertyValue('--ct-readout-cap').trim()
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY
  return raw.endsWith('%') ? (n / 100) * hostW : n
}

export interface ReadoutSeatOpts {
  /** the plot host (the box's percentages and the plot fractions resolve against it). */
  readonly hostRef: RefObject<HTMLElement | null>
  /** the flow row — the measurement surface AND the seat the words take when they leave. */
  readonly rowRef: RefObject<HTMLElement | null>
  /** the plot's horizontal extent as fractions of the host (the same pair the placer takes). */
  readonly plotLeftF: number
  readonly plotRightF: number
  /** what changes the INK (the composed line strings) — the caller names it, as useCollisionLayout does. */
  readonly deps: readonly unknown[]
}

/** Decide the seat before paint, and again on a host/row resize and once on `document.fonts.ready`
 *  (a swap re-sizes the ink without resizing the host — the same reason both hooks above carry it). */
export function useReadoutSeat({ hostRef, rowRef, plotLeftF, plotRightF, deps }: ReadoutSeatOpts): CtReadoutSeat {
  const [seat, setSeat] = useState<CtReadoutSeat>('plot')
  useLayoutEffect(() => {
    const host = hostRef.current
    const row = rowRef.current
    if (!host || !row) return
    const decide = () => {
      const hostW = host.getBoundingClientRect().width
      if (hostW === 0) return // not laid out (jsdom) — never decide from a phantom geometry
      setSeat(readoutSeat(measureReadoutInk(row), readoutCapPx(row, hostW), (plotRightF - plotLeftF) * hostW))
    }
    decide()
    let live = true
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (fonts) void fonts.ready.then(() => live && decide())
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false
      }
    }
    // The row is observed as well as the host: the row's width is what a wrapping line wraps at, and
    // it is the box the flow seat reserves. Re-deciding cannot oscillate — the row's content is the
    // SAME in both seats, so the measurement does not depend on the seat it produced.
    const ro = new ResizeObserver(() => decide())
    ro.observe(host)
    ro.observe(row)
    return () => {
      live = false
      ro.disconnect()
    }
    // the caller names what moves the ink (the composed strings) in `deps`
  }, [hostRef, rowRef, plotLeftF, plotRightF, ...deps])
  return seat
}

/**
 * The FLOW seat: every column's reading rendered stacked in ONE grid cell, visibility-hidden except
 * the scrubbed one, so the row is always exactly as tall as the LONGEST reading wraps at the current
 * width and NOTHING on the page moves while the reader scrubs (insight 035 — a live region above
 * content must reserve its box; the ladder's `.ladder-readout` in src/viz/oddsLadder.css is the
 * shipped precedent this copies). In the PLOT seat the row reserves nothing but still LAYS OUT —
 * `display: none` measures zero, and the seat could never be re-decided from it.
 *
 * aria-hidden like the rest of the text layer: the a11y tree keeps the svg's caption and the
 * per-annotation sentences; this is the sighted channel.
 *
 * STRING-FREE: every word arrives on `columns`.
 */
export function ChartReadoutRow({
  seat,
  columns,
  activeIndex,
  className,
  ref,
}: {
  readonly seat: CtReadoutSeat
  /** one entry per scrub column, in column order — each the lines that column reads. */
  readonly columns: readonly (readonly CtReadoutLine[])[]
  /** the scrubbed column, or null when nothing is scrubbed (the row stays blank AND reserved). */
  readonly activeIndex: number | null
  readonly className?: string
  /** the row the seat hook measures — pass the same ref to {@link useReadoutSeat}. */
  readonly ref?: Ref<HTMLSpanElement>
}) {
  return (
    <span
      className={className ? `ct-readout-row ${className}` : 'ct-readout-row'}
      data-seat={seat}
      aria-hidden="true"
      ref={ref}
    >
      {/* the chrome probe: an EMPTY box carrying the readout's own padding + border (chartText.css
          declares them for the box and this probe in one rule), so its width IS the chrome the seat
          predicate adds to the ink — measured, never re-typed, and readable with no box on screen. */}
      <span className="ct-readout-row__chrome" data-ct-readout-chrome="" />
      {columns.map((lines, i) => (
        <span key={i} className="ct-readout-row__item" data-ct-readout-item="" data-active={i === activeIndex ? '' : undefined}>
          {lines.map((l, j) => (
            <span key={j} className={`ct-readout-row__line ${l.className}`} data-ct-readout-line="">
              {l.text}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}
