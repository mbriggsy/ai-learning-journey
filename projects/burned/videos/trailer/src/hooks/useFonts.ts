/**
 * Load BURNED's three variable woff2 faces — Clash Display + General
 * Sans + JetBrains Mono — through `@remotion/fonts`. `loadFont()`
 * auto-tracks each font via `delayRender`; render blocks until all
 * three are ready.
 *
 * Phase 0 Unit 0.5 spike cleared variable-axis weight resolution in
 * MP4 export (per `sample-eval/spike/spike-results.md`). Three
 * `loadFont` calls instead of nine (3 families × 3 weights) — the
 * variable axis resolves at run-time via CSS `font-weight`.
 *
 * Fonts live at BURNED's `public/fonts/` (NOT
 * `videos/trailer/public/fonts/`) per ADR #15 + Phase 0 ADR #8
 * `setPublicDir('../../public')`. `staticFile('fonts/...')` resolves
 * through that pinned root.
 *
 * **Race-safety:** the Promise is cached. Second consumers that call
 * `useFonts()` get the SAME shared Promise (not a re-fire), and any
 * `await useFonts()` blocks on the original loads completing. This
 * fixes the prior sync-flag stub where `loaded = true` flipped before
 * the async loads finished.
 */
import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

let loadPromise: Promise<unknown> | null = null

export function useFonts(): Promise<unknown> {
  if (loadPromise) return loadPromise

  loadPromise = Promise.all([
    loadFont({
      family: 'Clash Display',
      url: staticFile('fonts/ClashDisplay-Variable.woff2'),
      weight: '200 700', // variable axis range
      format: 'woff2',
    }),
    loadFont({
      family: 'General Sans',
      url: staticFile('fonts/GeneralSans-Variable.woff2'),
      weight: '200 700',
      format: 'woff2',
    }),
    loadFont({
      family: 'JetBrains Mono',
      url: staticFile('fonts/JetBrainsMono-Variable.woff2'),
      weight: '100 900', // matches src/client/howtoplay/fonts-mono-htp.css:9 source
      format: 'woff2',
    }),
  ])

  return loadPromise
}
