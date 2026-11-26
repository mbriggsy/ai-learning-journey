/*
 * src/viz/charts/patterns.ts: the colour-blind second cue for filled marks (plan 6-rightcapital-ui-plan.md, 2.1
 * decision 6). In styled mode Highcharts' pattern-fill module sets no fill (it works through colour options, which
 * styled mode ignores), so the patterns are defined ONCE here as a `defs` option, built into each chart's SVG `<defs>`,
 * and referenced from `chartTheme.css` (`fill: url(#b9-hatch)`) on the series and on its legend symbol.
 *
 * Each pattern is a ground tile plus its ink; both are classed, never coloured here, so `chartTheme.css` paints them:
 * each KIND's ink from its own variable (`--b9-ink-hatch`, `--b9-ink-dots`, `--b9-ink-lines`, `--b9-ink-cross`, `--b9-ink-vlines`, falling
 * back to `--b9-pattern-ink`), which a chart sets on its container to the patterned series' own colour, so two patterned
 * series in one chart keep their colour difference (RC3); the ground from the chart surface. Highcharts' AST allows no `patternTransform`, so the diagonals are drawn as diagonal paths in the tile.
 * Kinds and uses (ref 3.2): `b9-hatch` (diagonal) the compared plan's bars and pre-tax; `b9-dots` Roth; `b9-lines`
 * (horizontal) HSA; `b9-cross` a shortfall, the money-ran-out band and the stress test's Combined bar; `b9-vlines`
 * (vertical) other income beside Social Security (RC17).
 */
import type { ASTNode } from 'highcharts/highcharts.src'

/** The ids `chartTheme.css` references as `url(#…)`. */
export const PATTERN_IDS = {
  hatch: 'b9-hatch',
  dots: 'b9-dots',
  lines: 'b9-lines',
  cross: 'b9-cross',
  vlines: 'b9-vlines',
} as const

export type PatternKind = keyof typeof PATTERN_IDS

/** The tile's side in SVG user units. */
const TILE = 8

const ground: ASTNode = {
  tagName: 'rect',
  attributes: { class: 'b9-pattern-ground', x: 0, y: 0, width: TILE, height: TILE },
}

const ink = (tagName: 'path' | 'circle', attributes: ASTNode['attributes']): ASTNode => ({
  tagName,
  attributes: { ...attributes, class: 'b9-pattern-ink' },
})

/** Rising diagonals that tile seamlessly (the main stroke plus the two corner stubs). */
const RISING = `M 0 ${TILE} L ${TILE} 0 M -2 2 L 2 -2 M ${TILE - 2} ${TILE + 2} L ${TILE + 2} ${TILE - 2}`
/** Falling diagonals, for the cross-hatch. */
const FALLING = `M 0 0 L ${TILE} ${TILE} M -2 ${TILE - 2} L 2 ${TILE + 2} M ${TILE - 2} -2 L ${TILE + 2} 2`

function pattern(kind: PatternKind, inks: readonly ASTNode[]): ASTNode {
  return {
    tagName: 'pattern',
    attributes: {
      id: PATTERN_IDS[kind],
      class: `b9-pattern b9-pattern--${kind}`,
      patternUnits: 'userSpaceOnUse',
      width: TILE,
      height: TILE,
    },
    children: [ground, ...inks],
  }
}

/** The shared `defs` option: one entry per kind, keyed by its id. */
export const PATTERN_DEFS: Record<string, ASTNode> = {
  [PATTERN_IDS.hatch]: pattern('hatch', [ink('path', { d: RISING })]),
  [PATTERN_IDS.dots]: pattern('dots', [ink('circle', { cx: TILE / 2, cy: TILE / 2, r: 1.5 })]),
  [PATTERN_IDS.lines]: pattern('lines', [ink('path', { d: `M 0 ${TILE / 2} L ${TILE} ${TILE / 2}` })]),
  [PATTERN_IDS.cross]: pattern('cross', [ink('path', { d: `${RISING} ${FALLING}` })]),
  [PATTERN_IDS.vlines]: pattern('vlines', [ink('path', { d: `M ${TILE / 2} 0 L ${TILE / 2} ${TILE}` })]),
}
