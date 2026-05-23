import React from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { OperativeCardFrame } from '../components/OperativeCardFrame'
import { R15Stamp } from '../components/R15Stamp'
import { LOGO_SPRING_COLD, EASE_OUT_EMIL } from '../lib/animations'
import { COLD_OPEN_CARDS_DISPLAY_ORDER } from '../lib/card-roster'

/**
 * S01 — Cold Open. 7-second compressed-Archer title sequence.
 *
 *   0–30    chevron-motif background settles in
 *   30–90   Janet card flash (cold-open speaker; fade in 25-30, hold, out 80-90)
 *   90–150  Dash card flash (briefer; fade in 85-90, hold, out 140-150)
 *   150–180 Neal card flash (third operative; fade in 145-150, hold, out 170-180)
 *   150–    R15 #1 OPERATION PENDLETON stamp slap, bottom-left, mobile safe-square
 *   175–210 BURNED card-art reveal (burned.webp) with LOGO_SPRING_COLD scale-spring entry;
 *           R15 stamp persists through the hold
 *
 * PURE VISUAL — no `<Audio>` per ADR #16. The Janet cold-open VO mounts
 * at composition level (`TrailerComposition.tsx`) from frame 60 to ~199
 * via the AUDIO_ASSETS manifest, overlapping all 3 card flashes plus the
 * BURNED reveal.
 *
 * Phase 1 Unit 1.10 card-display order is Janet → Dash → Neal (Janet is
 * the cold-open speaker so her face leads); `COLD_OPEN_CARDS_DISPLAY_ORDER`
 * pins the order independent of CARD_ROSTER iteration.
 *
 * R15 #1 stamp uses split-layer SVGs (`stamp-1-operation-pendleton-
 * frame.svg` + `-text.svg`) at the Phase 3 Unit 3.4 natural dimensions
 * (800×240). offsetPx.x=500 places the stamp inside the mobile
 * safe-square (x ∈ 420..1500 at the 1080-tall band) per amendment
 * TIER 3 #11 — pre-deepening offsetPx.x=80 was outside the left crop.
 *
 * BURNED reveal uses `burned.webp` (the game's BURNED card art), NOT
 * the S06 wordmark SVG — Phase 3 Unit 3.6 deepening lock (the SVG's own
 * comment: "S01 cold-open uses burned.webp (card art); S06 closing uses
 * this SVG wordmark (out-of-world bookend)").
 */

const BURNED_LAND_FRAME = 180
const BURNED_SIZE = 900 // square; ~83% of 1080 canvas height
const R15_LAND_FRAME = 150

const [JANET, DASH, NEAL] = COLD_OPEN_CARDS_DISPLAY_ORDER

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Background chevron — fades up over the first 20 frames so the scene
  // doesn't start with an abrupt full-pattern slap. 0.6 opacity ceiling
  // keeps the pattern a TEXTURE, not a hero element.
  const bgOpacity = interpolate(frame, [0, 20], [0.0, 0.6], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Card opacity envelopes — EASE_OUT entries (emil snap-into-place),
  // linear exits (no easing needed for fade-to-zero).
  const janetOpacity = interpolate(frame, [25, 30, 80, 90], [0, 1, 1, 0], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const dashOpacity = interpolate(frame, [85, 90, 140, 150], [0, 1, 1, 0], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const nealOpacity = interpolate(frame, [145, 150, 170, 180], [0, 1, 1, 0], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // BURNED card-art reveal — opacity 0→1 over 175-180, then held.
  // Spring drives scale: 0 → overshoot → 1 (~0.4s perceived).
  const burnedOpacity = interpolate(frame, [175, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const burnedSpring = spring({
    frame: frame - BURNED_LAND_FRAME,
    fps,
    config: LOGO_SPRING_COLD,
  })
  // Map spring (0 → ~1.05 overshoot → 1) to scale (0.95 → 1.04 → 1.0).
  const burnedScale = interpolate(burnedSpring, [0, 0.5, 1], [0.95, 1.04, 1.0], {
    extrapolateRight: 'extend', // let spring overshoot push past 1.0 if it wants
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#0e0c08' /* cream-1 */ }}>
      {/* Chevron-motif background — full-bleed Phase 3 asset */}
      <Img
        src={staticFile('trailer/title-sequence/chevron-motif-bg.svg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: bgOpacity,
        }}
      />

      {/* Card 1 — Janet (cold-open speaker, frames 30-90) */}
      <AbsoluteFill style={{ opacity: janetOpacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={JANET.filename} operativeName={JANET.displayName} />
      </AbsoluteFill>

      {/* Card 2 — Dash (briefer, frames 90-150) */}
      <AbsoluteFill style={{ opacity: dashOpacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={DASH.filename} operativeName={DASH.displayName} />
      </AbsoluteFill>

      {/* Card 3 — Neal (third operative, frames 150-180) */}
      <AbsoluteFill style={{ opacity: nealOpacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={NEAL.filename} operativeName={NEAL.displayName} />
      </AbsoluteFill>

      {/* BURNED card-art reveal — lands frame 180, persists through scene end. */}
      <AbsoluteFill
        style={{
          opacity: burnedOpacity,
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${burnedScale})`,
          transformOrigin: 'center',
        }}
      >
        <Img
          src={staticFile('assets/cards/burned.webp')}
          style={{
            width: BURNED_SIZE,
            height: BURNED_SIZE,
            // The card art is 1:1; no objectFit override needed at native ratio.
          }}
        />
      </AbsoluteFill>

      {/* R15 #1 OPERATION PENDLETON stamp — split-layer, bottom-left safe-square.
          Cream-12 paper backing per BEAT-SHEET line 144 ("ochre-9 ink on
          cream-12 stamp paper"). The Phase 3 split-layer SVGs are transparent;
          this component-level plate provides contrast against the operative
          card's ochre-9 name plate during frames 150-180. */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg"
        textSvg="trailer/r15-chrome/stamp-1-operation-pendleton-text.svg"
        anchor="bottom-left"
        offsetPx={{ x: 500, y: 80 }}
        width={800}
        height={240}
        tiltDeg={-12}
        landFrame={R15_LAND_FRAME}
        paperBg="#f6ebce"
      />
    </AbsoluteFill>
  )
}
