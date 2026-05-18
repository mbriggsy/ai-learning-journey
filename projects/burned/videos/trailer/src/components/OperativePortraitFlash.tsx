import React from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'
import { PALETTE } from '../lib/colors'

/**
 * Single-frame operative-card portrait (Phase 0 Unit 0.3 cold-open).
 *
 * Renders one operative card art image centered with a cream-paper
 * matte frame. Hard-cut scene; no motion within the frame — the
 * impact comes from the CUT (CutBrightnessPop overlay) + the held
 * stillness of the portrait card.
 *
 * Cream matte around the portrait matches the in-game card chrome
 * vocabulary (MinimalCard's outer card frame). Reads as "this is a
 * roster card surfacing in the briefing," not "this is a stock photo."
 *
 * Source art lives in BURNED's public/assets/cards/ — resolved via
 * staticFile() under ADR #15 (`setPublicDir('../../public')` →
 * BURNED's `public/`).
 *
 * Card aspect: source art is mixed (1:1 for action cards, 2:3 for
 * operatives). Operative portraits (janet-broadside, dash-barlowe,
 * vera-khan, sable-ashworth) are 2:3 — frame is sized to 2:3 with
 * object-fit: contain to preserve the source crop.
 */
type Props = {
  cardAsset: string
  caption?: string
}

const FRAME_HEIGHT = 880 // 880px tall × 2/3 = ~587px wide (2:3 portrait)
const FRAME_WIDTH = (FRAME_HEIGHT * 2) / 3

export const OperativePortraitFlash: React.FC<Props> = ({ cardAsset, caption }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.teal2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          padding: 16,
          backgroundColor: PALETTE.cream12,
          border: `4px solid ${PALETTE.cream11}`,
          boxShadow: `inset 0 0 0 1px ${PALETTE.ochre9}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Img
          src={staticFile(`assets/cards/${cardAsset}`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
      {caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 200,
            fontSize: 22,
            letterSpacing: '0.30em',
            color: PALETTE.cream11,
            paddingLeft: '0.30em',
          }}
        >
          {caption}
        </div>
      )}
    </AbsoluteFill>
  )
}
