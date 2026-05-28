/**
 * Load BURNED's three variable woff2 faces — Clash Display + General Sans +
 * JetBrains Mono — through `@remotion/fonts`. `loadFont()` auto-tracks each
 * font via `delayRender`; render blocks until all three are ready.
 *
 * Carried forward verbatim from the v1 trailer (a proven plumbing tool, zero
 * creative content). Fonts live at BURNED's `public/fonts/` and resolve via
 * the pinned `setPublicDir('../../public')`. The variable axis resolves at
 * run-time via CSS `font-weight` — three loads, not nine.
 *
 * Race-safety: the Promise is cached so repeat consumers share one load.
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
      weight: '100 900',
      format: 'woff2',
    }),
  ])

  return loadPromise
}
