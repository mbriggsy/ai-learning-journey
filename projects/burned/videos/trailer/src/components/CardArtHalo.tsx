import React from 'react'
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'
import HALO_LAYOUT from '../lib/cascade-halo-column.json'

/**
 * S04 cascade halo — 6-card right-edge column at 40% opacity ceiling
 * per Phase 1 Unit 1.5 lock (NOT 17-card halo as legacy plan body
 * suggested; the JSON was renamed from cascade-ring-layout.json to
 * cascade-halo-column.json to reflect the 6-card-column intent —
 * insight #061 enumeration decay, locked in PHASE-1-EXIT).
 *
 * Geometry from `cascade-halo-column.json`:
 *   - 6 operatives (same as S03_ROSTER: Dash, Vera, Sable, Janet, Neal, Agent X)
 *   - x band: 1560-1880 (320 px right-edge column)
 *   - y centers: 192/367/542/717/892/928 (column down the canvas)
 *   - card size: 240×145
 *   - entry stagger: 2 frames per card (12-frame total entry ramp)
 *   - opacity ceiling: 0.4 (chrome layer, NOT focal)
 *
 * **Stale-frame override:** the JSON's `haloStartFrame: 1560` is a
 * PRE-Tier-4 absolute frame. Post-Tier-4 (TODO #61), scene-relative
 * entry is at rel 510 (aligned with Stat 3 VO "Seventeen asset
 * illustrations" — natural beat for card-art to enter). The
 * `startFrame` prop overrides the JSON's stale absolute value.
 *
 * Agent X gets an inline redact bar overlay across the card body
 * (charcoal-1 #0a0906, tilt -2°). Same inline approach as
 * OperativeCardFrame (vendored RedactBar.module.css CSS vars don't
 * resolve in Remotion render context).
 */
type HaloEntry = typeof HALO_LAYOUT.entries[number]

export const CardArtHalo: React.FC<{
  /** Scene-relative frame at which halo entries begin. Cards stagger by `entryFrameOffset` (from JSON) plus 24f settle each. */
  startFrame: number
}> = ({ startFrame }) => {
  const frame = useCurrentFrame()
  const { column, entries } = HALO_LAYOUT

  return (
    <>
      {entries.map((card) => {
        const entry: HaloEntry = card
        const entryFrame = startFrame + entry.entryFrameOffset
        const settle = interpolate(frame, [entryFrame, entryFrame + 24], [0, 1], {
          easing: EASE_OUT_EMIL,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        // Opacity ceiling 0.4 per Phase 1 lock.
        const opacity = settle * column.opacityCeiling
        const scale = interpolate(frame, [entryFrame, entryFrame + 24], [0.95, 1.0], {
          easing: EASE_OUT_EMIL,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const isAgentX = entry.filename === 'agent-x.webp'

        return (
          <div
            key={entry.filename}
            style={{
              position: 'absolute',
              left: column.xCenter - column.cardWidth / 2,
              top: entry.yCenter - column.cardHeight / 2,
              width: column.cardWidth,
              height: column.cardHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              opacity,
              // Hairline ochre border for chrome consistency with operative card frame family.
              border: '2px solid #947226', // ochre-9
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#0e0c08', // cream-1 fallback
            }}
          >
            <Img
              src={staticFile(`assets/cards/${entry.filename}`)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />
            {isAgentX && (
              <div
                aria-label="Redacted: Agent X identity"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10%',
                  width: '80%',
                  height: 28,
                  backgroundColor: '#0a0906', // charcoal-1
                  transform: 'translateY(-50%) rotate(-2deg)',
                  boxShadow:
                    'inset 0 1px 0 rgba(208, 195, 165, 0.08), 0 1px 2px rgba(0, 0, 0, 0.4)',
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
