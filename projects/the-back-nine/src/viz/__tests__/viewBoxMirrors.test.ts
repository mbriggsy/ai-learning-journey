import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VIEWBOX } from '../bandGeometry'
import { TF_VIEW } from '../TwoFutures'

/*
 * src/viz/__tests__/viewBoxMirrors.test.ts — the chart viewBox SOURCE-BIND (the 2026-09-13 council on
 * the phone's above-bar labels, wf_8c8ee877-cda, fix-now (b)).
 *
 * THE LAW: each chart draws into ONE fixed viewBox declared in its component (`RV_VIEW` 560×210 in
 * RecommendationViz.tsx, `TF_VIEW` 560×280 in TwoFutures.tsx, `VIEWBOX` 560×380 in bandGeometry.ts).
 * A viewBox alone gives an <svg> no intrinsic ratio, so the same two numbers are RE-TYPED as a CSS
 * `aspect-ratio` on the chart (recommendationViz.css, twoFutures.css) and, for the lazy-chunked
 * recommendation chart, a THIRD time on the CLS reservation box (src/ui/styles/recommendation.css
 * `.rec-viz-box`) — plus the prose mirrors in the comments beside them. Nothing tied the copies to the
 * declaration: a viewBox change would leave the placeholder and the chart disagreeing in height (the
 * lockup reflows on land — the CLS law), and the comment beside it lying. The council found the three
 * 560×210 mirrors unpinned while ruling on the label column; this file reads the REAL bytes of every
 * mirror and pins each against the component's own constant.
 *
 * Deliberately TOTAL per file, comments included (the breakpoint-mirrors precedent): a stale "560×210"
 * in prose beside a moved viewBox is exactly the quiet lie a source-bind exists to stop. `RV_VIEW` is
 * module-private, so it is read from the component's source with the same regex discipline the
 * breakpoint test applies to tokens.css — never re-typed here.
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
  it('RecommendationViz: RV_VIEW in the component, the aspect-ratio in recommendationViz.css and the CLS box in recommendation.css, and every prose mirror', () => {
    const tsx = read('src/viz/RecommendationViz.tsx')
    const decl = /const RV_VIEW = \{ w: (\d+), h: (\d+) \} as const/.exec(tsx)
    expect(decl, 'RecommendationViz.tsx no longer declares `const RV_VIEW = { w: N, h: N } as const` — re-point this bind').not.toBeNull()
    const rv = [Number(decl![1]), Number(decl![2])] as const
    expect(rv[0], 'the viewBox width is a positive number').toBeGreaterThan(0)
    expect(rv[1], 'the viewBox height is a positive number').toBeGreaterThan(0)
    for (const file of ['src/viz/recommendationViz.css', 'src/ui/styles/recommendation.css']) {
      const css = read(file)
      const decls = [...css.matchAll(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)\s*;/g)].map((m) => [Number(m[1]), Number(m[2])] as const)
      expect(decls.length, `${file}: the aspect-ratio mirror is gone — the box no longer reserves the chart's ratio (CLS)`).toBeGreaterThan(0)
      for (const d of decls) expect(d, `${file}: aspect-ratio ${d[0]} / ${d[1]} disagrees with RV_VIEW ${rv[0]}×${rv[1]}`).toEqual(rv)
      // the prose mirrors ("mirrors RV_VIEW 560×210") — comments are scanned on purpose
      const prose = ratioPairs(css).filter((p) => p[0] === 560 || p[0] === rv[0])
      expect(prose.length, `${file}: no ratio pair found at all — the mirror comment moved; re-point this bind`).toBeGreaterThan(0)
      for (const p of prose) expect(p, `${file}: a prose mirror reads ${p[0]}×${p[1]} beside RV_VIEW ${rv[0]}×${rv[1]}`).toEqual(rv)
    }
  })

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

  it('the band: VIEWBOX and the prose mirror in band.css (the enlarge cap derives from it)', () => {
    const css = read('src/viz/band.css')
    const band = [VIEWBOX.width, VIEWBOX.height] as const
    const prose = ratioPairs(css).filter((p) => p[0] === band[0])
    expect(prose.length, 'band.css: no ratio pair found — the "560:380" enlarge-cap comment moved; re-point this bind').toBeGreaterThan(0)
    for (const p of prose) expect(p, `band.css: a prose mirror reads ${p[0]}:${p[1]} beside VIEWBOX ${band[0]}×${band[1]}`).toEqual(band)
  })

  it('the three families are distinct declarations, not one copied number (non-vacuity)', () => {
    // A bind that passed because every chart happened to share one ratio would prove nothing about
    // the mirrors; the heights differ by construction (210 / 280 / 380), so a mirror copied from the
    // wrong chart reds above.
    expect(new Set([TF_VIEW.h, VIEWBOX.height, /const RV_VIEW = \{ w: \d+, h: (\d+) \}/.exec(read('src/viz/RecommendationViz.tsx'))![1]]).size).toBe(3)
  })
})
