/*
 * src/viz/charts/sankeyOptions.ts: one year's money as a Sankey (plan docs/plans/6-rightcapital-ui-plan.md, RC20;
 * `rc-cashflow-tax/help-retirement-cash-flows-maps-cash-flows-51.png`, `-52.png`). PURE: every node, flow, amount and
 * word arrives from the composer (`mapsView.ts`); nothing here adds or rounds a figure.
 *
 * THE PICTURE, as RightCapital draws it: the money in on the left (column 0), the total in the middle (1), the money out
 * by group (2) and each group's parts (3), each node a thin bar and each flow a pale tint of the node it runs to. Every
 * node prints "**Name**: ~$amount" beside its bar (left of it, but to the right in column 0, where the page's edge is),
 * so a node is never named by its colour alone (back-nine-design's colour law); its colour and tint come from
 * `chartTheme.css` through the class the composer's group names (`b9-map-<group>`), never a hex here.
 *
 * SMALL NODES. A bar is as tall as its share of the year's money, but never shorter than `minNodePx` (Highcharts'
 * `minLinkWidth`): a part worth a few hundred dollars would otherwise be a hairline whose name, centred on it, prints
 * over its neighbours'. That floor stretches the smallest bars past their share (the picture's one distortion); the
 * printed amounts carry the truth, and every bar at its share is at least that tall on a year's map at his window.
 *
 * Printed values are never deferred (`defer: false` at the series level, insight 169) and nothing fades on hover (the
 * shared default's inactive state is off, and this series' own is off too). The component builds a fresh chart for each
 * new year or run (keyed), never a live update (insight 169).
 */
import type { Options, SeriesSankeyNodesOptionsObject, SeriesSankeyOptions, SeriesSankeyPointOptionsObject } from 'highcharts/highcharts.src'
import { chartWordsOptions, hcPlain, type ChartWords } from './chartA11y'

export interface SankeyNodeInput {
  readonly id: string
  readonly name: string
  /** The printed amount with its mark ("~$12,000"). */
  readonly amount: string
  readonly column: 0 | 1 | 2 | 3
  /** The node's colour class (`b9-map-<group>`). */
  readonly className: string
  /** What a screen reader and the hover say for it. */
  readonly spoken: string
}

export interface SankeyLinkInput {
  readonly from: string
  readonly to: string
  readonly weight: number
  readonly className: string
  readonly spoken: string
}

export interface SankeyInput {
  readonly nodes: readonly SankeyNodeInput[]
  readonly links: readonly SankeyLinkInput[]
  readonly words: ChartWords
  readonly height: number
  /** The shortest a bar is drawn, in CSS px (a label's line, so two neighbours' names never print over each other). */
  readonly minNodePx: number
}

/** A node's bar width in CSS px (RightCapital's thin bars) and the gap between a bar and its name. */
export const SANKEY_NODE_WIDTH = 6
export const SANKEY_LABEL_GAP = 6
/** The space between two bars in one column. */
export const SANKEY_NODE_PADDING = 10
export const SANKEY_CLASS = 'b9-sankey'

/** A node's label beside its bar: right of it in the first two columns (the page's edge is on the left, and the total's
 *  name sits in the open flow after it, as RightCapital prints "Total Inflows"), left of it after. */
function labelSide(column: number): NonNullable<SeriesSankeyNodesOptionsObject['dataLabels']> {
  return column <= 1
    ? { align: 'left', x: SANKEY_NODE_WIDTH + SANKEY_LABEL_GAP, verticalAlign: 'middle' }
    : { align: 'right', x: -(SANKEY_NODE_WIDTH + SANKEY_LABEL_GAP), verticalAlign: 'middle' }
}

interface Spoken {
  readonly spoken: string
  readonly amount?: string
  readonly label?: string
}

const spokenOf = (o: unknown): Spoken | undefined => (o as { custom?: Spoken } | undefined)?.custom

/** A formatter's point: Highcharts 12 on hands the point itself as `this` (and keeps `this.point` for older code). */
const pointOptionsOf = (ctx: unknown): unknown => {
  const c = ctx as { point?: { options?: unknown }; options?: unknown }
  return c.point?.options ?? c.options
}

export function sankeyOptions(input: SankeyInput): Options {
  const spoken = chartWordsOptions(input.words)
  const series: SeriesSankeyOptions = {
    type: 'sankey',
    name: input.words.title,
    className: SANKEY_CLASS,
    nodeWidth: SANKEY_NODE_WIDTH,
    nodePadding: SANKEY_NODE_PADDING,
    minLinkWidth: input.minNodePx,
    linkColorMode: 'to',
    curveFactor: 0.45,
    borderRadius: 2,
    // No entrance sweep (a new year is a new chart); the morph would replay on every year moved.
    animation: false,
    states: { inactive: { enabled: false }, hover: { enabled: false } },
    // A node is a point: its `className` reaches its bar's class list (`Point.getClassName`), though the nodes' option type
    // leaves the key out.
    nodes: input.nodes.map(
      (n): SeriesSankeyNodesOptionsObject & { readonly className: string; readonly custom: Spoken } => ({
        id: n.id,
        name: n.name,
        column: n.column,
        className: n.className,
        dataLabels: labelSide(n.column),
        // The total prints on two lines (its name over its amount), so it stays narrow in the open flow beside it.
        custom: { spoken: n.spoken, amount: n.amount, label: `<b>${hcPlain(n.name)}</b>${n.column === 1 ? '<br/>' : ': '}${hcPlain(n.amount)}` } satisfies Spoken,
      }),
    ),
    data: input.links.map(
      (l): SeriesSankeyPointOptionsObject => ({ from: l.from, to: l.to, weight: l.weight, className: l.className, custom: { spoken: l.spoken } satisfies Spoken }),
    ),
    dataLabels: {
      enabled: true,
      // Printed values are never deferred (insight 169) and never hidden by collision handling.
      defer: false,
      allowOverlap: true,
      crop: false,
      overflow: 'allow',
      inside: true,
      useHTML: false,
      nodeFormatter: function () {
        return spokenOf(pointOptionsOf(this))?.label ?? ''
      },
      // A flow prints nothing: its two ends are named.
      formatter: function () {
        return ''
      },
    },
  }
  return {
    chart: { type: 'sankey', height: input.height, spacing: [8, 4, 20, 4] },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: {
      ...spoken.accessibility,
      point: { descriptionFormatter: (p) => spokenOf(p.options)?.spoken ?? '' },
    },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -4 } },
    tooltip: {
      formatter: function () {
        return hcPlain(spokenOf(pointOptionsOf(this))?.spoken ?? '')
      },
    },
    series: [series],
  }
}
