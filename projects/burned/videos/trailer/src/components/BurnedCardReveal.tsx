import React from 'react'
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { LOGO_SPRING_COLD } from '../lib/animations'

/**
 * S03 VO #2 beat 2 — "One ends your career instantly."
 *
 * The danger card: BURNED, the game-namesake action card. Lands big and
 * prominent with the same spring vocabulary as S01 cold-open's BURNED
 * logo reveal (LOGO_SPRING_COLD — mass 0.5, damping 11, stiffness 200,
 * overshoot uncapped). Tier='hero' per card-roster.ts; this beat earns
 * the hero tier.
 *
 * Position: dead-center canvas (960, 540), 320×320. Intentionally covers
 * Sable + Janet portrait area + edges of Vera/Neal — the card IS the
 * disruption, the team-photo getting interrupted by the danger card.
 * The 700-740 frame fade-out lets cascade re-emerge for the closing
 * "Or ensure your colleagues don't" dark-sting beat.
 *
 * Burned-fire (#be2e27) drop-shadow glow ring carries "danger" without
 * needing animated particles or a literal flame. Ochre-9 chrome border
 * matches OperativeCardFrame family vocabulary so the card reads as
 * SAME-WORLD even though it's an action-card not an operative-card.
 *
 * Fade-out at rel 700-740 (40-frame opacity ramp) lets the cascade
 * re-emerge for the closing VO beat "Or ensure your colleagues don't."
 * — BURNED card was the literal "ends your career"; cascade returning
 * carries the dark-joke kicker.
 */
const CARD_W = 440
const CARD_H = 440 // burned.webp is 1:1 (384×384 native action card aspect)
const CENTER_X = 960
const CENTER_Y = 540
const TILT_DEG = 6

export const BurnedCardReveal: React.FC<{
  landFrame: number
  fadeOutStart: number
  fadeOutEnd: number
}> = ({ landFrame, fadeOutStart, fadeOutEnd }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < landFrame) return null

  // Spring drives scale 0.4 → ~1.06 overshoot → 1.0, matching S01 BURNED
  // reveal vocabulary (LOGO_SPRING_COLD with the 0.95→1.04→1.0 mapping
  // S01 uses; here we widen the start to 0.4 for a more dramatic
  // entry since this BURNED is the danger-card payoff, not the brand
  // bookend).
  const burnedSpring = spring({
    frame: frame - landFrame,
    fps,
    config: LOGO_SPRING_COLD,
  })
  const scale = interpolate(burnedSpring, [0, 0.5, 1], [0.4, 1.06, 1.0], {
    extrapolateRight: 'extend',
  })

  // 3-frame opacity ramp on entry so the card reads as impact, not teleport.
  const entryOpacity = interpolate(frame, [landFrame, landFrame + 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // Fade-out at end: 40-frame ramp so cascade re-emerges for the closing beat.
  const fadeOutOpacity = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = entryOpacity * fadeOutOpacity

  if (opacity <= 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: CENTER_X - CARD_W / 2,
        top: CENTER_Y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        transform: `rotate(${TILT_DEG}deg) scale(${scale})`,
        transformOrigin: 'center center',
        opacity,
        // Burned-fire glow ring — three drop-shadow layers for warm-to-hot
        // falloff with deep undershadow for lift. Bigger, hotter at the
        // 440×440 hero size.
        filter:
          'drop-shadow(0 0 32px rgba(190, 46, 39, 0.7)) drop-shadow(0 0 64px rgba(190, 46, 39, 0.35)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.55))',
      }}
    >
      <Img
        src={staticFile('assets/cards/burned.webp')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // Hairline chrome border so the card reads as part of the
          // briefing-room family. Slight border-radius for the
          // dossier-card vocabulary.
          border: '3px solid #947226', // ochre-9
          borderRadius: 4,
          backgroundColor: '#0e0c08', // cream-1 fallback in case webp has transparent edges
        }}
      />
    </div>
  )
}
