import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VIEWBOX } from '../bandGeometry'
import { TF_VIEW } from '../twoFuturesData'

/*
 * src/viz/__tests__/viewBoxMirrors.test.ts — the chart viewBox SOURCE-BIND (the 2026-09-13 council on
 * the phone's above-bar labels, wf_8c8ee877-cda, fix-now (b)).
 *
 * THE LAW: each chart draws into ONE fixed viewBox declared in its component (`TF_VIEW` 560×280 in
 * TwoFutures.tsx, `VIEWBOX` 560×380 in bandGeometry.ts; RecommendationViz's 560×210 left at Act 6's RC8).
 * A viewBox alone gives an <svg> no intrinsic ratio, so the same two numbers are RE-TYPED as a CSS
 * `aspect-ratio` on the chart (twoFutures.css) — plus the prose mirrors in the comments beside them.
 * Nothing tied the copies to the declaration: a viewBox change would leave the chart's box and its
 * drawing disagreeing in height, and the comment beside it lying. This file reads the REAL bytes of
 * every mirror and pins each against the component's own constant.
 *
 * Deliberately TOTAL per file, comments included (the breakpoint-mirrors precedent): a stale ratio in
 * prose beside a moved viewBox is exactly the quiet lie a source-bind exists to stop.
 */

const ROOT = process.cwd()
const read = (rel: string): string => readFileSync(join(ROOT, ...rel.split('/')), 'utf8')

/** Every `W×H`, `W / H` (an aspect-ratio value) or `W:H` pair in a file — the three spellings the
 *  mirrors use. Returns [w, h] pairs in file order. */
function ratioPairs(src: string): readonly (readonly [number, number])[] {
  const out: (readonly [number, number])[] = []
  for (const m of src.matchAll(/\b(\d{3,4})\s*(?:×|x|\/|:)\s*(\d{3,4})\b/g)) out.push([Number(m[1]), Number(m[2])])
  return out
}

describe('the chart viewBoxes and their CSS / prose mirrors are one declaration each', () => {
  // RecommendationViz's arm (RV_VIEW against its two CSS mirrors) retired with the chart at Act 6's RC8: Tax Strategies'
  // Summary bars are a Highcharts chart, which draws at real pixel size with no viewBox to mirror.

  it('TwoFutures: TF_VIEW and the aspect-ratio + prose mirror in twoFutures.css', () => {
    const css = read('src/viz/twoFutures.css')
    const tf = [TF_VIEW.w, TF_VIEW.h] as const
    const decls = [...css.matchAll(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)\s*;/g)].map((m) => [Number(m[1]), Number(m[2])] as const)
    expect(decls.length, 'twoFutures.css: the aspect-ratio mirror is gone').toBeGreaterThan(0)
    for (const d of decls) expect(d, `twoFutures.css: aspect-ratio ${d[0]} / ${d[1]} disagrees with TF_VIEW ${tf[0]}×${tf[1]}`).toEqual(tf)
    const prose = ratioPairs(css).filter((p) => p[0] === tf[0])
    expect(prose.length, 'twoFutures.css: no ratio pair found — the mirror comment moved; re-point this bind').toBeGreaterThan(0)
    for (const p of prose) expect(p, `twoFutures.css: a prose mirror reads ${p[0]}×${p[1]} beside TF_VIEW ${tf[0]}×${tf[1]}`).toEqual(tf)
  })

  // The band's arm (VIEWBOX against band.css's prose mirror) retired with band.css at Act 6's RC4: the old band and its
  // enlarge modal left with the answer page; VIEWBOX stays in bandGeometry.ts for the charts that still read it.

  it('the two families are distinct declarations, not one copied number (non-vacuity)', () => {
    // A bind that passed because every chart happened to share one ratio would prove nothing about
    // the mirrors; the heights differ by construction (280 / 380), so a mirror copied from the
    // wrong chart reds above.
    expect(new Set([TF_VIEW.h, VIEWBOX.height]).size).toBe(2)
  })
})
