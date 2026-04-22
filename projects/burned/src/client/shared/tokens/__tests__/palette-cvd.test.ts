import { describe, test, expect } from 'vitest'
import {
  parse,
  rgb,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
  converter,
} from 'culori'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { PALETTE } from '../palette.generated'

// ---------- CVD simulation gate ----------

// Semantic pairs that must stay distinguishable under CVD simulation.
// Step 3 bg pairs and step 11 fg pairs excluded — they never appear as sole
// indicators; always accompanied by card shape, name text, and accent colors.
// The step 9 accent pairs below are the primary visual discriminators.
const CRITICAL_PAIRS = [
  ['color-accent-burned', 'color-accent-intercept', 'Burned card vs Intercept card'],
  ['color-accent-burned', 'color-accent-operative', 'Burned card vs operative'],
  ['color-border-focus', 'color-border-strong', 'focus ring vs static border'],
] as const

// Raw oklab Euclidean distance. Starting threshold is 5× CSS CM4 JND (0.02).
const MIN_OKLAB_DISTANCE = 0.10

const deuter = filterDeficiencyDeuter(1)
const protan = filterDeficiencyProt(1)
const tritan = filterDeficiencyTrit(1)
const oklabDistance = differenceEuclidean('oklab')

const SIMULATORS = [
  ['deuteranopia', deuter],
  ['protanopia', protan],
  ['tritanopia', tritan],
] as const

// Resolve semantic token names to their primitive hex values.
// Semantic tokens like 'color-bg-danger' map to primitives (e.g., cordovan-3).
const SEMANTIC_MAP: Record<string, string> = {
  'color-bg-danger': PALETTE['color-cordovan-3'],
  'color-bg-success': PALETTE['color-emerald-3'],
  'color-fg-danger': PALETTE['color-cordovan-11'],
  'color-fg-success': PALETTE['color-emerald-11'],
  'color-accent-burned': PALETTE['color-burned-fire'],
  'color-accent-intercept': PALETTE['color-emerald-9'],  // #5a9880 (lightened for CVD separation)
  'color-accent-operative': PALETTE['color-teal-9'],
  'color-border-focus': PALETTE['color-ochre-8'],
  'color-border-strong': PALETTE['color-charcoal-7'],
}

function resolveColor(key: string): string {
  return SEMANTIC_MAP[key] ?? PALETTE[key as keyof typeof PALETTE]
}

describe('palette CVD legibility', () => {
  for (const [simName, sim] of SIMULATORS) {
    for (const [a, b, label] of CRITICAL_PAIRS) {
      test(`${label} — distinguishable under ${simName}`, () => {
        const hexA = resolveColor(a)
        const hexB = resolveColor(b)
        const colorA = parse(hexA)
        const colorB = parse(hexB)
        if (!colorA || !colorB) {
          throw new Error(`Unparseable: ${a}=${hexA} / ${b}=${hexB}`)
        }
        const simA = sim(colorA)
        const simB = sim(colorB)
        const d = oklabDistance(simA, simB)
        expect(
          d,
          `${a} (${hexA}) vs ${b} (${hexB}) under ${simName}: distance ${d.toFixed(4)} < ${MIN_OKLAB_DISTANCE}`,
        ).toBeGreaterThanOrEqual(MIN_OKLAB_DISTANCE)
      })
    }
  }
})

// ---------- Radix APCA guarantees per scale ----------

function toApcaRgb(cssColor: string): [number, number, number, number] {
  const c = rgb(cssColor)
  if (!c) throw new Error(`Unparseable color for APCA: ${cssColor}`)
  return [
    Math.round((c.r ?? 0) * 255),
    Math.round((c.g ?? 0) * 255),
    Math.round((c.b ?? 0) * 255),
    c.alpha ?? 1,
  ]
}

const SCALES = ['teal', 'ochre', 'cream', 'charcoal', 'cordovan', 'emerald'] as const

describe('Radix APCA guarantees per scale', () => {
  for (const scale of SCALES) {
    const step2Key = `color-${scale}-2` as keyof typeof PALETTE
    const step11Key = `color-${scale}-11` as keyof typeof PALETTE
    const step12Key = `color-${scale}-12` as keyof typeof PALETTE

    test(`${scale}-11 on ${scale}-2 meets APCA Lc 60`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step11Key]))
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]))
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${scale}-11 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(60)
    })

    test(`${scale}-12 on ${scale}-2 meets APCA Lc 90`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step12Key]))
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]))
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${scale}-12 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(90)
    })
  }
})

// ---------- Luminance separation for the red/green CVD trap ----------

const toOklab = converter('oklab')

describe('cordovan vs emerald luminance separation', () => {
  test('|L_oklab(cordovan-9) - L_oklab(emerald-9)| >= 0.10', () => {
    const cord = parse(PALETTE['color-cordovan-9'])
    const emer = parse(PALETTE['color-emerald-9'])
    if (!cord || !emer) throw new Error('Unparseable cordovan-9 or emerald-9')
    const lCord = toOklab(cord).l ?? 0
    const lEmer = toOklab(emer).l ?? 0
    const delta = Math.abs(lCord - lEmer)
    expect(
      delta,
      `cordovan-9 L ${lCord.toFixed(3)} vs emerald-9 L ${lEmer.toFixed(3)}: ΔL ${delta.toFixed(3)}`,
    ).toBeGreaterThanOrEqual(0.10)
  })
})
