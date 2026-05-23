import React from 'react'
import { AbsoluteFill, Sequence, staticFile } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { CardArtHalo } from '../components/CardArtHalo'
import { CommsTicker } from '../components/CommsTicker'
import { GoofyStatCaption } from '../components/GoofyStatCaption'
import { HtpDossierHero } from '../components/HtpDossierHero'
import { R15Stamp } from '../components/R15Stamp'
import { S04TailFadeToBlack } from '../components/S04TailFadeToBlack'

/**
 * S04 — Receipts Cascade. 33-second / 990-frame load-bearing scene.
 *
 * VO landings (Phase 2 audio-manifest, played at composition level per
 * ADR #16 — silent in standalone-render):
 *   abs 1380 → rel 0    "Operational planning." (55f)
 *   abs 1440 → rel 60   "Fourteen thousand pages of forensic dossiers." (106f)
 *   abs 1530 → rel 150  "Drafted at three AM, name redacted for compliance." (132f)
 *   abs 1620 → rel 240  "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." (137f)
 *   abs 1740 → rel 360  "Six of them, deliberately unrehearsed — the 'memorable ones.'" (152f)
 *   abs 1890 → rel 510  "Seventeen asset illustrations. Five of them with hats." (133f)
 *   abs 2010 → rel 630  "Seven on the roster. Six in the deck. One on the research budget. Don't ask." (174f)
 *   abs 2280 → rel 900  "They WERE the operation." (63f) — STACKED PAYOFF
 *
 * Visual choreography:
 *   rel 0-60     HTP dossier slides up from below (EASE_DRAWER_FN)
 *   rel 60-630   HTP scrolls upward (linear, 19848px → -18768px viewport offset)
 *   rel 240-360  Stat 1 (lower-left): "Planning: 14,000 pages // + 6 sticky notes (recovered)"
 *   rel 360-510  Stat 2 (lower-center): "Rehearsals: 1,407 contingencies // 6 deliberately unrehearsed (the memorable ones)"
 *   rel 510-522  Card halo enters — 6 operatives at right edge column, 40% opacity ceiling, 2-frame stagger
 *   rel 510-630  Stat 3 (lower-right): "Asset illustrations: 17 // (two with hats)"
 *   rel 630-810  Stat 4 (lower-left, stacked above Stat 1 chrome): "Operatives: 7 // (plus Agent X. Don't ask.)"
 *   rel 630-870  CommsTicker text override: "OPERATIVE [REDACTED] — METHOD REPEATABLE" (R15 #2 pulse)
 *   rel 870-900  HTP opacity drops 1.0 → 0.5 (focal hierarchy hand-off)
 *   rel 900-915  R15 #3 PAYOFF STAMP slaps center with stamp-3-asset-delivered SVGs (variant='payoff')
 *   rel 900-975  Payoff hold — visual freeze
 *   rel 975-990  S04TailFadeToBlack overlay (15f opacity 0 → 1)
 *   rel 990      Hard cut to S05 follows
 *
 * Anti-pattern guard (Phase 1 deepening, design-lens F-001): NO frame
 * except the payoff at rel 900 has >2 elements at full visual weight.
 * Captions decay to 30% chrome at exit (NOT to 0); halo caps at 40%;
 * HTP drops to 50% at payoff hand-off. Verified by walking the rel
 * timeline above — at any given frame, at most HTP (1.0) + one active
 * stat (1.0) = 2 elements at full weight; everything else is ≤0.4.
 *
 * `scenePreviewStartFrame` enables `Preview_S04Peak` fast-iteration —
 * the prop is SCENE-RELATIVE (e.g., 600 to skip the first 20s of
 * cascade buildup and start at the payoff window). Wrapping the
 * scene in <Sequence from={-scenePreviewStartFrame}> shifts every
 * child's useCurrentFrame() reading forward by that amount.
 */
export const S04_ReceiptsCascade: React.FC<{
  scenePreviewStartFrame?: number
}> = ({ scenePreviewStartFrame = 0 }) => {
  return (
    <Sequence from={-scenePreviewStartFrame}>
      <AbsoluteFill>
        {/* Briefing-room continuous from S02/S03 — mahogany + venetian-blind drift */}
        <BriefingRoomBackground />

        {/* HTP dossier hero — load-bearing scroll; opacity drops at payoff */}
        <HtpDossierHero
          slideInFrom={0}
          scrollFrom={60}
          scrollTo={630}
          opacityDropFromFrame={660}
          opacityDropToFrame={900}
          opacityDropToValue={0.5}
        />

        {/* 6-card right-edge halo column at 40% opacity ceiling — enters at rel 510 (corrected from JSON's stale pre-Tier-4 haloStartFrame) */}
        <CardArtHalo startFrame={510} />

        {/* Stat captions — 4 typographic punchlines across the lower band */}
        <GoofyStatCaption
          dryStat="Planning: 14,000 pages"
          absurdCompanion="+ 6 sticky notes (recovered)"
          landFrame={240}
          exitFrame={360}
          anchor="lower-left"
        />
        <GoofyStatCaption
          dryStat="Rehearsals: 1,407 contingencies"
          absurdCompanion="6 deliberately unrehearsed (the memorable ones)"
          landFrame={360}
          exitFrame={510}
          anchor="lower-center"
        />
        <GoofyStatCaption
          dryStat="Asset illustrations: 17"
          absurdCompanion="(two with hats)"
          landFrame={510}
          exitFrame={630}
          anchor="lower-right"
        />
        <GoofyStatCaption
          dryStat="Operatives: 7"
          absurdCompanion="(plus Agent X. Don't ask.)"
          landFrame={630}
          exitFrame={810}
          anchor="lower-left"
          verticalOffsetPx={120}
        />

        {/* CommsTicker — R15 #2 text override at rel 630 ("OPERATIVE [REDACTED]
            — METHOD REPEATABLE"). Idle copy resumes after rel 870 when the
            text prop falls away via the Sequence trick below. */}
        <Sequence from={630} durationInFrames={240}>
          <CommsTicker
            fromFrame={0}
            text="OPERATIVE [REDACTED] — METHOD REPEATABLE"
          />
        </Sequence>
        {/* Idle ticker outside the override window — bookends the scene at top/bottom */}
        <Sequence from={0} durationInFrames={630}>
          <CommsTicker fromFrame={0} />
        </Sequence>
        <Sequence from={870} durationInFrames={120}>
          <CommsTicker fromFrame={0} />
        </Sequence>

        {/* R3 stacked-payoff stamp — lands rel 900 (= abs 2280) with stamp-3-asset-delivered SVGs. variant='payoff' uses STAMP_SLAP_PAYOFF envelope (overshoot 1.06). */}
        <R15Stamp
          frameSvg="trailer/r15-chrome/stamp-3-asset-delivered-frame.svg"
          textSvg="trailer/r15-chrome/stamp-3-asset-delivered-text.svg"
          anchor="center"
          width={1200}
          height={280}
          tiltDeg={-3}
          landFrame={900}
          variant="payoff"
          paperBg="#f6ebce"
        />

        {/* Tail fade-to-black — masks the S04 → S05 palette jump at the hard cut */}
        <S04TailFadeToBlack startFrame={975} />
      </AbsoluteFill>
    </Sequence>
  )
}
