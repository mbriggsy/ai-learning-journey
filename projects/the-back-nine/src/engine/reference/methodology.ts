/**
 * Engine methodology defaults — return moments + the survivor-spending ratio.
 *
 * These are ENGINE methodology, NOT dated tax/health law, so they live HERE and not
 * in src/engine/constants/ (the spine is tax-free and reads nothing from the tax
 * constants module; this is the separate methodology-default layer the spine reads —
 * findings §Strand 4). Every figure is `Sourced` with the same provenance discipline
 * (citation + directionalUntilPinned) and is fully user-overridable at the params
 * boundary — the engine itself injects nothing.
 *
 * TWO distinct moment sets (do NOT conflate — findings §Strand 4):
 *  - validationMarket — historically-calibrated (Ibbotson SBBI), used ONLY by the
 *    Mode-B MC-band test so MC reproduces Trinity-comparable behavior and lands
 *    high-80s–~90% (below the 95% historical anchor). NEVER the production default.
 *  - productionMarket — deliberately conservative high-CAPE (Pfau/Kitces), the
 *    real-user default, yielding the ~3–3.5% safe-rate band.
 *
 * All moments are REAL (inflation-adjusted), SIMPLE-space arithmetic; the engine
 * converts simple→log internally (rng.toLogMoments) — the σ²/2 drag handled once,
 * the simple/log σ mix forbidden (findings §Strand 4 landmine).
 */
import { sourced, type Sourced } from '@engine/constants/types'
import type { MarketAssumptions } from '@shared/model'

/**
 * Historically-calibrated moments (Ibbotson SBBI 1926→, REAL arithmetic). Stocks
 * real ≈ 8.8% / σ ≈ 19.8%; intermediate-term government bonds real ≈ 2.2% / σ ≈
 * 5.6%; ρ ≈ 0. Cross-check: this blends to a 50/50 real ≈ 5.5% / σ ≈ 10.3%, which
 * matches Pfau's independently-cited 5.6% / 10.6% for a 50/50 portfolio — so a
 * 4%/30yr MC on these lands in the high-80s–~90% band, below Trinity's 95%.
 */
export const validationMarket: Sourced<MarketAssumptions> = sourced(
  {
    stock: { mean: 0.088, stdDev: 0.198 },
    bond: { mean: 0.022, stdDev: 0.056 },
    inflation: { mean: 0.03, stdDev: 0.041 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  },
  {
    citation:
      'findings §Strand 4; Ibbotson SBBI 1926–2020 nominal (S&P ~12.1%/σ19.8, intermediate-govt ~5.3%/σ5.6, CPI ~3.0%/σ4.1), converted to real (gemini-grounding 2026-06-05)',
    directionalUntilPinned: true,
    // No dated pin event exists (a deliberate re-calibration pass, undated) → methodology
    // substrate: never blocks the U14 oracle token; validation-only anyway (never consumed
    // by a graded production run).
    directionalKind: 'methodology-substrate',
    pinTo: 're-derive from the committed Damodaran series (reference/damodaranSeries.ts, landed 2026-06-11) at a deliberate re-calibration pass — exact SBBI RETIRED (commercial, edition-revised); these summary moments stay directional until that pass',
    note: 'VALIDATION ONLY — calibrates the Mode-B MC band to Trinity behavior. Not a user default. Real intermediate-government bonds (NOT corporate), to pair with Bengen.',
  },
)

/**
 * Conservative production defaults (Pfau/Kitces high-CAPE, REAL arithmetic). Stocks
 * real ≈ 5.0% / σ ≈ 18%; high-grade bonds real ≈ 1.0% / σ ≈ 6%; ρ ≈ 0. A 50/50
 * blends to real ≈ 3.0% / σ ≈ 9.7% — the deliberately conservative ~3–3.5%-safe-
 * rate regime Pfau/Kitces argue for in high valuations. All user-overridable.
 */
export const productionMarket: Sourced<MarketAssumptions> = sourced(
  {
    stock: { mean: 0.05, stdDev: 0.18 },
    bond: { mean: 0.01, stdDev: 0.06 },
    inflation: { mean: 0.03, stdDev: 0.041 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  },
  {
    citation:
      'Pfau/Kitces high-CAPE conservative real assumptions (gemini-grounding 2026-06-05): stocks real ~3.5–5.5%, bonds real ~0–1.5%, → ~3–3.5% safe rate',
    directionalUntilPinned: true,
    // No dated pin event exists → methodology substrate (U14 S0, supersession item 5): does
    // NOT block the oracle token; the grade ships difference-keyed with the directional level
    // DISCLOSED. Flipping this flag to false to clear a gate is a REJECT (laundering — the
    // NC sin in mirror; the hawk's standing law).
    directionalKind: 'methodology-substrate',
    pinTo: 'Pfau (Retirement Researcher) / Kitces capital-market-assumption articles',
    note: 'The real-user DEFAULT. Deliberately conservative (high valuations); user-overridable.',
  },
)

/**
 * Survivor spending as a fraction of the couple's spending after the first death.
 * Grounded ~0.75 (planning range 67–80%; Blanchett widowhood literature). It scales
 * the survivor's spending and so rides the Tier-1 survival floor — its DANGEROUS
 * direction is documented: too LOW understates the survivor's need (the unsafe
 * direction for a survivor product), so the default is never a silent un-sourced
 * number, and a low user edit warrants a calm note (the UI half, P3).
 */
export const survivorSpendingRatio: Sourced<number> = sourced(0.75, {
  citation:
    'findings §Strand 4; Blanchett "My Heart Will Go On" / widowhood-effect literature; planning range 67–80% (gemini-grounding 2026-06-05)',
  directionalUntilPinned: true,
  // No dated pin event → methodology substrate (never blocks the U14 token; ships-disclosed).
  // If ever pinned it needs a SOURCED equivalence-scale anchor (the U12 advisory's ≈⅔ note),
  // never a guessed one (U14 S0 worklist).
  directionalKind: 'methodology-substrate',
  pinTo: 'Blanchett widowhood-effect paper (the exact survivor-spending multiplier)',
  note: 'Unsafe direction = too LOW (understates survivor need). Editable; the low-edit note is the P3 UI half.',
})
