import React from 'react'
import { AbsoluteFill } from 'remotion'
import { PALETTE } from '../lib/colors'

/**
 * Phase 0 Unit 0.5(c) — Variable-axis multi-weight test.
 *
 * Renders the word "BURNED" three times at weights 200 / 400 / 700 from
 * the SAME loaded `ClashDisplay-Variable.woff2`. Inspection of the
 * exported MP4 answers the deferred Phase 4 Unit 4.0 spike question:
 *
 *   PASS — all three weights visually distinct (200 hairline, 400 mid,
 *          700 bold). Variable-axis weight-range syntax works in
 *          Remotion 4.0.438 + @remotion/fonts.
 *   FAIL — all three weights look identical. Escalate to Phase 3
 *          `pyftsubset` per-weight static woff2 + 3 separate `loadFont`
 *          calls. Document in spike-results.md.
 *
 * The diagnostic is silent-fallback catching: Chromium-in-Remotion will
 * render the loaded woff2 at SOME weight even when the range parse
 * fails — single-weight tests would pass even on failure.
 */
const WEIGHTS = [200, 400, 700] as const

export const SpikeFontWeightDemo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.cream12,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 120px',
      }}
    >
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 24,
          color: PALETTE.cream5,
          letterSpacing: '0.32em',
          marginBottom: 60,
          alignSelf: 'flex-start',
        }}
      >
        // VARIABLE-AXIS WEIGHT DIAGNOSTIC
      </div>

      {WEIGHTS.map((weight) => (
        <div
          key={weight}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 48,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: weight,
              fontSize: 200,
              color: PALETTE.teal2,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            BURNED
          </span>
          <span
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: 400,
              fontSize: 36,
              color: PALETTE.ochre7,
              letterSpacing: '0.16em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            wgt {weight}
          </span>
        </div>
      ))}
    </AbsoluteFill>
  )
}
