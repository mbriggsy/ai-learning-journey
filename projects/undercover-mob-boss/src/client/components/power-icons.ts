import type { ExecutivePower } from '../../shared/types';

/* ── Power slot mapping per player bracket ─────────────────────── */

type PlayerBracket = 'small' | 'medium' | 'large';

const POWER_TILES: Record<PlayerBracket, (ExecutivePower | null)[]> = {
  small:  [null, null, 'policy-peek', 'execution', 'execution', null],
  medium: [null, 'investigate', 'special-nomination', 'execution', 'execution', null],
  large:  ['investigate', 'investigate', 'special-nomination', 'execution', 'execution', null],
};

function getBracket(playerCount: number): PlayerBracket {
  if (playerCount <= 6) return 'small';
  if (playerCount <= 8) return 'medium';
  return 'large';
}

export function getPowerSlots(playerCount: number): (ExecutivePower | null)[] {
  return POWER_TILES[getBracket(playerCount)];
}

/* ── Art Deco SVG icons — gold stroke, no fill, geometric noir ── */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag: string, attrs: Record<string, string>): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/** Magnifying glass — detective's tool */
function buildInvestigate(): SVGElement[] {
  return [
    el('circle', { cx: '10.5', cy: '10.5', r: '6', 'stroke-width': '1.8' }),
    el('line', { x1: '15', y1: '15', x2: '21', y2: '21', 'stroke-width': '2.2', 'stroke-linecap': 'round' }),
  ];
}

/** All-seeing eye — surveillance */
function buildPeek(): SVGElement[] {
  return [
    el('path', { d: 'M2 12C4 7.5 8 5 12 5s8 2.5 10 7c-2 4.5-6 7-10 7s-8-2.5-10-7Z', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }),
    el('circle', { cx: '12', cy: '12', r: '3', 'stroke-width': '1.6' }),
    el('circle', { cx: '12', cy: '12', r: '1', fill: 'currentColor', stroke: 'none' }),
  ];
}

/** Classical temple — civic authority, special nomination */
function buildNominate(): SVGElement[] {
  return [
    // Pediment (triangle)
    el('polyline', { points: '3,11 12,3 21,11', 'stroke-width': '1.6', 'stroke-linejoin': 'miter', fill: 'none' }),
    // Architrave (beam)
    el('line', { x1: '3', y1: '11', x2: '21', y2: '11', 'stroke-width': '1.6' }),
    // Columns
    el('line', { x1: '6', y1: '11', x2: '6', y2: '20', 'stroke-width': '1.6' }),
    el('line', { x1: '10', y1: '11', x2: '10', y2: '20', 'stroke-width': '1.6' }),
    el('line', { x1: '14', y1: '11', x2: '14', y2: '20', 'stroke-width': '1.6' }),
    el('line', { x1: '18', y1: '11', x2: '18', y2: '20', 'stroke-width': '1.6' }),
    // Base
    el('line', { x1: '3', y1: '20', x2: '21', y2: '20', 'stroke-width': '1.6' }),
  ];
}

/** Crosshair — target acquired */
function buildExecute(): SVGElement[] {
  return [
    el('circle', { cx: '12', cy: '12', r: '8', 'stroke-width': '1.5' }),
    el('circle', { cx: '12', cy: '12', r: '2.5', 'stroke-width': '1.5' }),
    el('line', { x1: '12', y1: '2', x2: '12', y2: '9', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
    el('line', { x1: '12', y1: '15', x2: '12', y2: '22', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
    el('line', { x1: '2', y1: '12', x2: '9', y2: '12', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
    el('line', { x1: '15', y1: '12', x2: '22', y2: '12', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
  ];
}

const POWER_BUILDERS: Record<ExecutivePower, () => SVGElement[]> = {
  'investigate': buildInvestigate,
  'policy-peek': buildPeek,
  'special-nomination': buildNominate,
  'execution': buildExecute,
};

const POWER_ALT: Record<ExecutivePower, string> = {
  'investigate': 'Investigate',
  'policy-peek': 'Peek',
  'special-nomination': 'Nominate',
  'execution': 'Execute',
};

/**
 * Creates an SVG icon element for the given executive power.
 * Uses `currentColor` for stroke — set color via CSS on the parent or icon class.
 */
export function createPowerIcon(power: ExecutivePower, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('class', className);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', POWER_ALT[power]);
  for (const child of POWER_BUILDERS[power]()) {
    svg.appendChild(child);
  }
  return svg;
}
