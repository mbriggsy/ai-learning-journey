import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

/**
 * S01 — Cold Open. Unit 4.1 SKELETAL SCAFFOLD; replaced by Unit 4.2.
 *
 * Doubles as the font-validation surface for the Unit 4.0 carry-forward
 * gate inherited when the font spike DROPPED (insight 066). Renders a
 * 3×3 (family × weight) panel exercising all three variable woff2 faces
 * at non-default weights — first-render visual verification closes the
 * residual coverage gap.
 *
 * Once Unit 4.2 ships actual cold-open visuals, the font panel migrates
 * to `sample-eval/composite-build/font-validation.png` as an evidence
 * artifact and this scene becomes content-only.
 */
const FONT_FAMILIES = ['Clash Display', 'General Sans', 'JetBrains Mono'] as const
const FONT_WEIGHTS = [300, 500, 700] as const

const ACCENT = '#be2e27' // burned-fire — S01 accent

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0e0c08', // cream-1
        fontFamily: 'General Sans, system-ui, sans-serif',
        color: '#f6ebce', // cream-12
      }}
    >
      {/* Accent stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: ACCENT,
        }}
      />

      {/* Scene identity — top-left */}
      <div style={{ position: 'absolute', top: 56, left: 64, lineHeight: 1 }}>
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 80,
            color: '#f6ebce',
            letterSpacing: '-0.02em',
          }}
        >
          S01_ColdOpen
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: 'General Sans, sans-serif',
            fontWeight: 400,
            fontSize: 22,
            color: '#a69984', // cream-9
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Cold Open · {durationInFrames}f · {(durationInFrames / fps).toFixed(1)}s
        </div>
      </div>

      {/* Big numeric — center-left, subtle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 64,
          transform: 'translateY(-50%)',
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 360,
          color: '#454138', // charcoal-7
          lineHeight: 0.85,
          letterSpacing: '-0.06em',
        }}
      >
        01
      </div>

      {/* Font-validation panel — right side; first-render carry-forward gate */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          right: 64,
          width: 720,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'auto repeat(3, auto)',
          rowGap: 18,
          columnGap: 28,
        }}
      >
        {/* Column headers */}
        {FONT_FAMILIES.map((family) => (
          <div
            key={family}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
              fontSize: 13,
              color: '#edb182', // ochre-11
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              paddingBottom: 8,
              borderBottom: '1px solid #38342b', // charcoal-6
            }}
          >
            {family}
          </div>
        ))}
        {/* Cells — one specimen per (family, weight) */}
        {FONT_WEIGHTS.map((weight) =>
          FONT_FAMILIES.map((family) => (
            <div
              key={`${family}-${weight}`}
              style={{
                fontFamily: `${family}, sans-serif`,
                fontWeight: weight,
                fontSize: 36,
                color: '#d0c3a5', // cream-11
                lineHeight: 1.1,
              }}
            >
              <div style={{ fontSize: 11, color: '#7b6f5d', letterSpacing: '0.08em', marginBottom: 2 }}>
                {weight}
              </div>
              Pendleton
            </div>
          )),
        )}
      </div>

      {/* Live frame counter — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 56,
          left: 64,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 18,
          color: '#edb182', // ochre-11
          letterSpacing: '0.04em',
        }}
      >
        frame {String(frame).padStart(4, '0')} / {String(durationInFrames - 1).padStart(4, '0')}
      </div>

      {/* Scene progress bar — bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: '#1a1812', // charcoal-3
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(frame / Math.max(durationInFrames - 1, 1)) * 100}%`,
            backgroundColor: ACCENT,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
