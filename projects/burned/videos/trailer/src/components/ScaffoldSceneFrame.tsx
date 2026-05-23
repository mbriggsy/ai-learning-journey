import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

/**
 * ScaffoldSceneFrame — Unit 4.1 skeletal-scaffold visual chrome shared by
 * S02–S06. Renders scene identity, a live frame counter, and a progress
 * bar against the dark cream-1 backdrop.
 *
 * S01 uses its own bespoke layout (font-validation panel for the Unit 4.0
 * carry-forward gate) and does NOT consume this helper.
 *
 * This helper exists for the lifetime of Phase 4 Units 4.1 → 4.7 only.
 * Once each scene gets its real implementation, scaffolds disappear and
 * this file follows. No public API; trailer-internal.
 */
export const ScaffoldSceneFrame: React.FC<{
  sceneId: string
  label: string
  numericalLabel: string
  accentColor: string
}> = ({ sceneId, label, numericalLabel, accentColor }) => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0e0c08', // cream-1
        fontFamily: 'General Sans, system-ui, sans-serif',
        color: '#f6ebce',
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
          backgroundColor: accentColor,
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
          {sceneId}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: 'General Sans, sans-serif',
            fontWeight: 400,
            fontSize: 22,
            color: '#a69984',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {label} · {durationInFrames}f · {(durationInFrames / fps).toFixed(1)}s
        </div>
      </div>

      {/* Big numeric — center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 480,
          color: '#454138',
          lineHeight: 0.85,
          letterSpacing: '-0.06em',
        }}
      >
        {numericalLabel}
      </div>

      {/* Skeletal-status badge — top-right */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          right: 64,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 13,
          color: accentColor,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          padding: '8px 16px',
          border: `1px solid ${accentColor}`,
        }}
      >
        // SCAFFOLD · UNIT 4.1
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
          color: '#edb182',
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
          backgroundColor: '#1a1812',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(frame / Math.max(durationInFrames - 1, 1)) * 100}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
