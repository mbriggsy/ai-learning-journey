/**
 * CVD probe for R15 chrome ink/background pairs.
 * Phase 3 Unit 3.4 Step 5b. Per insight #051.
 *
 * Briggsy is color-blind. We never edit color based on prose direction;
 * we read a probe table. This script computes oklab Euclidean distance
 * between each ink and its background under normal vision + the three
 * deficiency simulations (deuter / prot / trit) and asserts every pair
 * clears the STRICT floor of 0.10.
 *
 * Run-and-delete pattern per insight #051: "one-shot tools, not
 * permanent infra." If R15 chrome ever changes color, re-author this
 * script from the pattern.
 *
 *   pnpm tsx videos/trailer/scripts/probe-r15-chrome-cvd.ts
 *
 * Hex values verified against `src/client/shared/tokens/palette.generated.ts`
 * + `src/client/shared/tokens/primitives.css` (2026-05-22). The Phase 3
 * plan's pair table had two token-name drifts (cream-3 stated as
 * #e6d5a9; charcoal-12 stated as #1a1812 — actual cream-3 is #252016,
 * actual charcoal-12 is #f1ebdc, and #1a1812 is charcoal-3). Probe
 * uses real palette tokens (insight #061: derive from source, never
 * transcribe).
 */
import {
  parse,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
} from 'culori'

const MIN_DISTANCE = 0.10 // STRICT floor per project convention (insight #051)

// Source of truth: primitives.css. DO NOT edit hex values in this file
// without updating primitives.css first.
const PAIRS: ReadonlyArray<readonly [name: string, fgHex: string, bgHex: string]> = [
  // R15 #1 OPERATION PENDLETON — ochre stamp on cream parchment (S01 frame 150)
  ['R15-#1 ochre-9 on cream-12 (fresh paper)', '#947226', '#f6ebce'],
  ['R15-#1 ochre-9 on cream-11 (aged paper)',  '#947226', '#d0c3a5'],
  // R15 #2 OPERATIVE [REDACTED] — ochre-11 ink on charcoal ticker (S04 frame 1680).
  // Bumped from ochre-9 → ochre-11 on 2026-05-22 (Briggsy: text unreadable
  // at trailer scale unless zoomed in). Ochre-11 reads as classic "amber CRT"
  // on dark, with much higher L* for small-text legibility. Per-channel pair
  // also tested below to keep the original on file if Phase 4 reverts.
  ['R15-#2 ochre-11 on charcoal-3 ticker',     '#edb182', '#1a1812'],
  // Historical (R15-#2 v1 — kept for reference; not shipped):
  ['R15-#2 ochre-9 on charcoal-3 ticker (v1)', '#947226', '#1a1812'],
  // R15 #3 ASSET DELIVERED — HERO burn-fire stamp on cream (S04 frame 1950)
  ['R15-#3 burn-fire on cream-12',             '#be2e27', '#f6ebce'],
  ['R15-#3 burn-fire on cream-11',             '#be2e27', '#d0c3a5'],
  // R15 #4 FIELD-READY — ochre subhead on cream closing card (S06 frame 2820)
  ['R15-#4 ochre-9 on cream-12 closing',       '#947226', '#f6ebce'],
]

const SIMS = [
  ['deuter', filterDeficiencyDeuter()],
  ['prot',   filterDeficiencyProt()],
  ['trit',   filterDeficiencyTrit()],
] as const

const distance = differenceEuclidean('oklab')

const header =
  'pair                                          | normal | deuter | prot   | trit   | min   | verdict'
const rule =
  '----------------------------------------------|--------|--------|--------|--------|-------|--------'

console.log(header)
console.log(rule)

let failures = 0
for (const [name, fgHex, bgHex] of PAIRS) {
  const fg = parse(fgHex)
  const bg = parse(bgHex)
  if (!fg || !bg) {
    throw new Error(`[CVD probe] failed to parse: fg=${fgHex} bg=${bgHex}`)
  }
  const dNorm = distance(fg, bg)
  const dSims = SIMS.map(([, sim]) => distance(sim(fg)!, sim(bg)!))
  const dMin = Math.min(dNorm, ...dSims)
  const verdict = dMin >= MIN_DISTANCE ? 'PASS' : 'FAIL'
  if (verdict === 'FAIL') failures++
  console.log(
    `${name.padEnd(46)}| ${dNorm.toFixed(3)} | ${dSims.map((d) => d.toFixed(3)).join(' | ')} | ${dMin.toFixed(3)} | ${verdict}`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} pair(s) failed STRICT floor ${MIN_DISTANCE}.`)
  console.error('Per insight #051: substitute higher-L* ink variant; read the table, do not guess.')
  console.error('Candidates to probe: ochre-7 (#805032), ochre-8 (#98603e), ochre-10 (#c98a5c).')
  process.exit(1)
}
console.log(`\nAll ${PAIRS.length} pairs clear STRICT floor ${MIN_DISTANCE}. R15 chrome CVD-safe.`)
