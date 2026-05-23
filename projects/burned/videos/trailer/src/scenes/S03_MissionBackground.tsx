import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { CommsTicker } from '../components/CommsTicker'
import { OperativeCardFrame } from '../components/OperativeCardFrame'
import { DeckStack } from '../components/DeckStack'
import { BurnedCardReveal } from '../components/BurnedCardReveal'
import { DossierPageWipe } from '../transitions/DossierPageWipe'
import { EASE_OUT_EMIL } from '../lib/animations'
import { S03_ROSTER } from '../lib/card-roster'

/**
 * S03 — Mission Background. 27-second roster reveal scene (post-Tier-4
 * expansion 2026-05-22; S03 absolute 570-1380 = 810 frames).
 *
 * VO landings (from Phase 2 audio-manifest, played at composition
 * level per ADR #16 — silent in standalone-render):
 *   abs 570  = rel 0     S03-roster (407f) — "Our autonomous field assets
 *                        infiltrated the contract last quarter. [BEAT 0.3s]
 *                        Seven operatives in the active roster. [BEAT 0.3s]
 *                        One who insists on being called 'Agent X' and
 *                        refuses to file any paperwork whatsoever."
 *   abs 977  = rel 407   silence gap — 30 frames (Phase 2 trim spec)
 *   abs 1007 = rel 437   S03-deck (362f) — "Mission: a deck of one hundred
 *                        and twenty operations. [BEAT 0.4s] One ends your
 *                        career instantly. [BEAT 0.3s] The rest help you
 *                        survive. Or ensure your colleagues don't."
 *   abs 1369 = rel 799   VO #2 ends; scene tail holds 11 frames before
 *                        S03→S04 hard cut at abs 1380 (= rel 810)
 *
 * Visual choreography — beat-aligned to VO (estimates ±20f, ear-checked
 * during playback). Pure visual — no `<Audio>` per ADR #16.
 *
 * VO #1 (rel 0-407):
 *   rel 0-99    Cards cascade in 1-by-1, 15f stagger × 24f settle. Each
 *               card lands as Dash narrates "...autonomous field assets
 *               infiltrated the contract..."
 *   rel 110-134 Otto-aside fades in. Lands on "Seven operatives in the
 *               active roster" — the 6 visible cards + Otto's chrome line
 *               = seven, joke earned visually.
 *   rel 200-224 Agent X paperwork marginalia fades in — "// FILE:
 *               [REDACTED]  // PAPERWORK: 0". Lands during "...refuses
 *               to file any paperwork whatsoever". Upper-right register
 *               above Agent X card.
 *   rel 160-260 Agent X subtle scale-pulse (1.0 → 1.04 → 1.0 over 100f)
 *               during the "Agent X" line. Tells the eye where to look.
 *   rel 296-407 Hold. Long laugh-room tail before wipe.
 *
 * WIPE (rel 415-431): DossierPageWipe — 16-frame transition between
 *               operative reveal (VO #1) and deck reveal (VO #2).
 *
 * VO #2 (rel 437-799):
 *   rel 437-453 DeckStack lands ("Mission: a deck of one hundred and
 *               twenty operations") — archerStampSlap('payoff') envelope.
 *               Upper-left position fills the previously-empty desk corner.
 *   rel 540-558 BurnedCardReveal spring entry ("One ends your career
 *               instantly") — burned.webp game-namesake card, big and
 *               burned-fire-glowed. The hero-tier danger moment.
 *   rel 650-720 Cascade subtle "uh, awkward" lean — operatives scale
 *               1.0→1.02→1.0 + rotation +1°. Reads as the team's
 *               collective reaction to "Or ensure your colleagues don't."
 *               Carried by existing 6 cards; no new component.
 *   rel 700-740 BURNED card fades out — lets cascade re-emerge as the
 *               final visual layer for the dark-sting kicker.
 *   rel 740-810 Hold. Cascade + DeckStack + Otto-aside present.
 *
 * Plan body's "frames 0-480 relative" timing is stale per insight #061.
 * Re-derived against current 810-frame scene + Phase 2 audio-manifest
 * VO landings + corrected script text (was using S04 lines; corrected
 * 2026-05-23 mid-redo).
 *
 * **Unit 4.4 redo 2026-05-23.** Original vertical-stack thumbnail layout
 * (106×148 cards on the right edge) was hard-zero'd: cards too small to
 * read portrait detail at 40% native scale, Agent X bottom-edge bled into
 * the ticker band, ~60% of the desk surface sat empty. R2 brought cards
 * up to scale 0.45 (360×450) in a diagonal cascade across the full
 * canvas. R3 (this) wires the static scene to VO beats with restaggered
 * card entries, Agent X marginalia, DeckStack + BurnedCardReveal for VO
 * #2, and cascade settle motion for the dark-sting tail.
 */

const CARD_ENTRY_START = 0
const CARD_ENTRY_STAGGER = 15
const CARD_ENTRY_DURATION = 24

const OTTO_ASIDE_FRAME = 110

const AGENT_X_SPOTLIGHT_START = 160
const AGENT_X_SPOTLIGHT_PEAK = 210
const AGENT_X_SPOTLIGHT_END = 260
const AGENT_X_MARGINALIA_FRAME = 200

const WIPE_START = 415

const DECK_STACK_LAND = 437

const BURNED_CARD_LAND = 540
const BURNED_CARD_FADE_OUT_START = 700
const BURNED_CARD_FADE_OUT_END = 740

const AWKWARD_LEAN_START = 650
const AWKWARD_LEAN_PEAK = 685
const AWKWARD_LEAN_END = 720

// OperativeCardFrame is native 800×1000 (4:5). Cards render at 360×450 via
// CSS scale 0.45 — the cards are the asset; the desk is the stage.
const SCALE = 0.45
const CARD_W = 800 * SCALE
const CARD_H = 1000 * SCALE

// Six cascade anchors (Dash → Vera → Sable → Janet → Neal → Agent X per
// S03_ROSTER iteration). Upper-left → lower-right diagonal across the
// full 1920×1080 canvas with progressive tilt -8° → +12° for a
// "classified files dropped on desk" read. Center coordinates.
const CASCADE_ANCHORS = [
  { cx: 460, cy: 260, rot: -8 },
  { cx: 660, cy: 360, rot: -4 },
  { cx: 860, cy: 460, rot: 0 },
  { cx: 1060, cy: 560, rot: 4 },
  { cx: 1260, cy: 660, rot: 8 },
  { cx: 1460, cy: 760, rot: 12 },
] as const

export const S03_MissionBackground: React.FC = () => {
  const frame = useCurrentFrame()

  // Cascade "awkward lean" — collective subtle reaction to the dark-sting
  // VO kicker. Triangle envelope 0 → 1 → 0 across rel 650-720.
  const awkwardLeanT = interpolate(
    frame,
    [AWKWARD_LEAN_START, AWKWARD_LEAN_PEAK, AWKWARD_LEAN_END],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const awkwardScaleBoost = 0.02 * awkwardLeanT // +0..+0.02 added
  const awkwardRotateBoost = 1 * awkwardLeanT // +0..+1° added

  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Deck stack — VO #2 beat 1, "Mission: a deck of one hundred and twenty operations." */}
      <DeckStack landFrame={DECK_STACK_LAND} />

      {/* Cascade — 6 operatives drop onto the desk diagonally. Render
          order = z-stack order, so Agent X (sixth, redacted) lands on top. */}
      {S03_ROSTER.map((op, i) => {
        const anchor = CASCADE_ANCHORS[i]
        const entryFrame = CARD_ENTRY_START + i * CARD_ENTRY_STAGGER
        const settle = interpolate(
          frame,
          [entryFrame, entryFrame + CARD_ENTRY_DURATION],
          [0, 1],
          { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        const opacity = settle
        const settleScale = 0.92 + 0.08 * settle // 0.92 → 1.0
        const isAgentX = op.filename === 'agent-x.webp'

        // Agent X spotlight pulse — subtle scale boost while Dash says the line.
        const agentXPulse = isAgentX
          ? interpolate(
              frame,
              [AGENT_X_SPOTLIGHT_START, AGENT_X_SPOTLIGHT_PEAK, AGENT_X_SPOTLIGHT_END],
              [0, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            )
          : 0
        const agentXScaleBoost = 0.04 * agentXPulse

        const finalScale = settleScale + agentXScaleBoost + awkwardScaleBoost
        const finalRotate = anchor.rot + awkwardRotateBoost

        return (
          <div
            key={op.filename}
            style={{
              position: 'absolute',
              left: anchor.cx - CARD_W / 2,
              top: anchor.cy - CARD_H / 2,
              width: CARD_W,
              height: CARD_H,
              transform: `rotate(${finalRotate}deg) scale(${finalScale})`,
              transformOrigin: 'center center',
              opacity,
            }}
          >
            <div
              style={{
                width: 800,
                height: 1000,
                transform: `scale(${SCALE})`,
                transformOrigin: 'top left',
              }}
            >
              <OperativeCardFrame
                portraitFile={op.filename}
                operativeName={op.displayName}
                redactName={isAgentX}
              />
            </div>
          </div>
        )
      })}

      {/* BURNED card reveal — VO #2 beat 2, "One ends your career instantly." */}
      <BurnedCardReveal
        landFrame={BURNED_CARD_LAND}
        fadeOutStart={BURNED_CARD_FADE_OUT_START}
        fadeOutEnd={BURNED_CARD_FADE_OUT_END}
      />

      {/* Agent X paperwork marginalia — VO #1 beat 3 reinforcement. Lands
          on "refuses to file any paperwork whatsoever". Upper-right
          register so it sits above Agent X card without overlapping. */}
      {frame >= AGENT_X_MARGINALIA_FRAME && (
        <div
          style={{
            position: 'absolute',
            top: 200,
            right: 60,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
            fontSize: 16,
            color: '#edb182', // ochre-11 — marginalia register
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'right',
            lineHeight: 1.6,
            opacity: interpolate(
              frame,
              [AGENT_X_MARGINALIA_FRAME, AGENT_X_MARGINALIA_FRAME + 24],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            ),
            pointerEvents: 'none',
          }}
        >
          // FILE: [REDACTED]
          <br />
          // PAPERWORK: 0
        </div>
      )}

      {/* Otto-aside typographic chrome — lands on "Seven operatives in the
          active roster" (the joke: 6 visible + Otto = 7) */}
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
              [OTTO_ASIDE_FRAME, OTTO_ASIDE_FRAME + 24],
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
