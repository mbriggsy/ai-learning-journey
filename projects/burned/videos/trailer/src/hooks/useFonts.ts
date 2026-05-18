/**
 * Load BURNED's production face — Clash Display variable woff2 — through
 * `@remotion/fonts`. `loadFont` returns a promise Remotion auto-tracks
 * via `delayRender`; no manual machinery, no studio-vs-export fallback.
 *
 * Phase 0 Unit 0.5(c) spike question: does Remotion 4.0.438 honor the
 * variable-axis weight range syntax (`weight: '200 700'`) — i.e. will
 * a single woff2 yield visually distinct 200/400/700 in the exported
 * MP4? The spike-results.md verdict drives Phase 3's font strategy:
 * PASS = ship the one variable file; FAIL = `pyftsubset` per-weight
 * subsets at Phase 3 + 3 separate loadFont calls.
 */
import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

let loaded = false

export const useFonts = () => {
  if (loaded) return
  loaded = true

  loadFont({
    family: 'Clash Display',
    url: staticFile('fonts/ClashDisplay-Variable.woff2'),
    weight: '200 700', // variable axis — Phase 0 Unit 0.5(c) gate
    format: 'woff2',
  })
}
