import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { CommsTicker } from '../components/CommsTicker'
import { DossierPageWipe } from '../transitions/DossierPageWipe'
import { EASE_OUT_EMIL } from '../lib/animations'
import { S03_ROSTER } from '../lib/card-roster'
import { RedactBar } from '../components/burned-vocabulary/RedactBar'

/**
 * S03 — Mission Background. 27-second roster reveal scene (post-Tier-4
 * expansion 2026-05-22; S03 absolute 570-1380 = 810 frames).
 *
 * VO landings (from Phase 2 audio-manifest, played at composition
 * level per ADR #16 — silent in standalone-render):
 *   abs 570  = rel 0     S03-roster ("Seven on the roster, six in the
 *                                    deck, one in the basement…") 407f
 *   abs 977  = rel 407   silence gap — 30 frames (Phase 2 trim spec)
 *   abs 1007 = rel 437   S03-deck   ("Fourteen thousand pages. Six
 *                                    sticky notes…") 362f
 *   abs 1369 = rel 799   VO #2 ends; scene tail holds 11 frames before
 *                        S03→S04 hard cut at abs 1380 (= rel 810)
 *
 * Visual choreography:
 *   rel 0       BriefingRoomBackground continuous from S02 (no transition)
 *   rel 60-110  6 operatives slide in along the mobile safe-square right
 *               edge with 6-frame stagger, EASE_OUT_EMIL entries
 *               (Janet → Dash → Sable → Vera → Neal → Agent X per
 *                S03_ROSTER iteration; Agent X gets a RedactBar overlay
 *                across the name strip)
 *   rel 200     Otto-aside typographic chrome lands lower-right
 *               ("// OPERATIVE 07: BASEMENT — DO NOT ASK", JetBrains
 *                Mono 500 18px ochre-3 marginalia register)
 *   rel 415-431 DossierPageWipe — mid-scene transitional sweep at the
 *               silence gap between VO #1 and VO #2 (16-frame Phase 1
 *               lock duration, centered in the 30-frame gap)
 *   rel 0-810   CommsTicker bottom strip; holds during BOTH VO windows
 *               per design-lens
 *
 * Pure visual — no `<Audio>` per ADR #16.
 *
 * Plan body's "frames 0-480 relative" timing is stale per insight #061
 * — re-derived against current 810-frame scene + Phase 2 audio-manifest
 * VO landings. DeckOf120 CUT per amendment SA-5 (not in Phase 1
 * BEAT-SHEET; "120 cards" wasn't the Phase 1 narration).
 */

const ROSTER_ENTRY_START = 60
const ROSTER_ENTRY_STAGGER = 6
const ROSTER_ENTRY_DURATION = 20
const OTTO_ASIDE_FRAME = 200
const WIPE_START = 415

// Card stack sizing — 6 cards vertical, fit inside the mobile safe-
// square (x=420–1500 per amendment TIER 3 #11) AND clear of the 48-px
// comms-ticker at the canvas bottom. Available y-band: 0–1032.
// 6 * 148 + 5 * 12 = 948 px. Top inset 42 centers the column vertically.
// Width preserves the 5:7 BURNED card aspect (148 / 7 * 5 = 105.7 → 106).
const CARD_W = 106
const CARD_H = 148
const CARD_GAP = 12
const CARD_RIGHT = 500 // canvas-right − 500 = x=1420 (inside safe-square right boundary 1500)
const CARD_TOP_OFFSET = 42

export const S03_MissionBackground: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Operative roster — right-edge stack, slide in from off-canvas right */}
      {S03_ROSTER.map((op, i) => {
        const entryFrame = ROSTER_ENTRY_START + i * ROSTER_ENTRY_STAGGER
        const slideX = interpolate(
          frame,
          [entryFrame, entryFrame + ROSTER_ENTRY_DURATION],
          [240, 0],
          { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        const opacity = interpolate(
          frame,
          [entryFrame, entryFrame + ROSTER_ENTRY_DURATION],
          [0, 1],
          { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        const isAgentX = op.filename === 'agent-x.webp'

        return (
          <div
            key={op.filename}
            style={{
              position: 'absolute',
              right: CARD_RIGHT,
              top: CARD_TOP_OFFSET + i * (CARD_H + CARD_GAP),
              width: CARD_W,
              height: CARD_H,
              transform: `translateX(${slideX}px)`,
              opacity,
            }}
          >
            {/* Cream matte around portrait — classified-file vocabulary */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#f6ebce',
                border: '3px solid #947226', // ochre-9
                padding: 8,
              }}
            >
              <Img
                src={staticFile(`assets/cards/${op.filename}`)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                }}
              />
            </div>
            {/* Name strip — ochre band + Clash Display caps */}
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                left: -2,
                right: -2,
                height: 24,
                backgroundColor: '#947226',
                color: '#0e0c08',
                fontFamily: 'Clash Display, sans-serif',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isAgentX ? (
                <RedactBar width="80px" tilt={-2} label="Redacted: Agent X identity" />
              ) : (
                op.displayName
              )}
            </div>
          </div>
        )
      })}

      {/* Otto-aside typographic chrome — lands at rel 200 (after roster establishes) */}
      {frame >= OTTO_ASIDE_FRAME && (
        <div
          style={{
            position: 'absolute',
            bottom: 96,
            left: 80,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
            fontSize: 20,
            color: '#edb182', // ochre-11 — marginalia register
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: interpolate(
              frame,
              [OTTO_ASIDE_FRAME, OTTO_ASIDE_FRAME + 12],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            ),
            pointerEvents: 'none',
          }}
        >
          // OPERATIVE 07: BASEMENT &mdash; DO NOT ASK
        </div>
      )}

      {/* Mid-scene dossier-page wipe at rel 415 (silence gap between VO #1 and VO #2) */}
      <DossierPageWipe startFrame={WIPE_START} />

      {/* CommsTicker holds during BOTH VO windows per design-lens */}
      <CommsTicker
        fromFrame={0}
        holdDuringFrames={[
          [0, 407], // VO #1: S03-roster
          [437, 799], // VO #2: S03-deck
        ]}
      />
    </AbsoluteFill>
  )
}
