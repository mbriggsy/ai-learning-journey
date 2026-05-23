import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { CommsTicker } from '../components/CommsTicker'
import { DossierPageCascade } from '../components/DossierPageCascade'
import { R15Stamp } from '../components/R15Stamp'
import { S04TailFadeToBlack } from '../components/S04TailFadeToBlack'

/**
 * S04 — Receipts Cascade. 33-second / 990-frame load-bearing scene.
 *
 * **Unit 4.5 R2 rewrite 2026-05-23.** R1 shipped a linear HTP scroll +
 * 4 GoofyStatCaption overlays + 6-card CardArtHalo column. Briggsy
 * called the scroll "conveyor belt — looks weird." Root cause: linear-
 * velocity scroll is a foreign motion dialect inside an otherwise
 * object-cascade-grammar trailer (S01 card flashes, S02 folder open,
 * S03 operative cascade — all discrete paper objects landing with
 * EASE_OUT_EMIL + progressive tilt). R2 rewrites the cascade to speak
 * the same grammar as S03: 7 dossier pages tossed onto the desk, one
 * per VO beat, chrome-decay landed pages to 55% so the new arrival is
 * focal. By the payoff stamp the desk is covered in dimmed receipts;
 * R15 #3 PAYOFF STAMP slaps the whole pile.
 *
 * R2 also re-paces audio: Phase 2 actualFrames overran expectedFrames
 * for cues 2-7; new startFrames spaced against actualFrames + 5f
 * inter-cue gap absorb the cumulative ~90-frame overlap.
 *
 * VO landings (Phase 2 audio-manifest, played at composition level per
 * ADR #16 — silent in standalone-render). R2 absolute → relative frames:
 *   abs 1380 → rel 0    "Operational planning." (55f)
 *   abs 1440 → rel 60   "Fourteen thousand pages of forensic dossiers." (106f)
 *   abs 1551 → rel 171  "Drafted at three AM, name redacted for compliance." (132f)
 *   abs 1688 → rel 308  "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." (137f)
 *   abs 1830 → rel 450  "Six of them, deliberately unrehearsed — the 'memorable ones.'" (152f)
 *   abs 1987 → rel 607  "Seventeen asset illustrations. Five of them with hats." (133f)
 *   abs 2125 → rel 745  "Seven on the roster. Six in the deck. One on the research budget. Don't ask." (174f)
 *   abs 2304 → rel 924  "They WERE the operation." (63f) — STACKED PAYOFF
 *
 * Visual choreography:
 *   rel 0   — P1 Cover (Operation Pendleton + crest + classification)
 *   rel 60  — P2 14,000 pages lands; P1 begins chrome-decay
 *   rel 171 — P3 Redacted (3:17 AM, author blacked out)
 *   rel 308 — P4 1,407 contingency tick-grid
 *   rel 450 — P5 6 unrehearsed with red strike-through
 *   rel 607 — P6 17 / 5 hats glyph row
 *   rel 745 — P7 7/6/1 budget breakdown
 *   rel 900 — P7 begins chrome-decay into payoff
 *   rel 924 — R15 #3 PAYOFF STAMP slaps the pile (variant='payoff', overshoot 1.06)
 *   rel 975-990 — S04TailFadeToBlack overlay (audio carries through fade)
 *
 * Shelved (R1 components retained in tree for potential reuse): HtpDossierHero,
 * CardArtHalo, GoofyStatCaption — `htp-fullpage.png` asset untouched.
 *
 * `scenePreviewStartFrame` enables `PreviewS04Peak` fast-iteration — the
 * prop is SCENE-RELATIVE. Wrapping the scene in
 * <Sequence from={-scenePreviewStartFrame}> shifts every child's
 * useCurrentFrame() reading forward by that amount.
 */
export const S04_ReceiptsCascade: React.FC<{
  scenePreviewStartFrame?: number
}> = ({ scenePreviewStartFrame = 0 }) => {
  return (
    <Sequence from={-scenePreviewStartFrame}>
      <AbsoluteFill>
        {/* Briefing-room continuous from S02/S03 — mahogany + venetian-blind drift */}
        <BriefingRoomBackground />

        {/* 7 dossier pages cascade onto the desk, beat-aligned to VO. */}
        <DossierPageCascade />

        {/* CommsTicker — R15 #2 text override during the "research budget"
            beat (rel 745-919 covers Dash's stat-04 174f duration + small
            tail buffer). Idle copy bookends the scene at top/bottom. */}
        <Sequence from={0} durationInFrames={745}>
          <CommsTicker fromFrame={0} />
        </Sequence>
        <Sequence from={745} durationInFrames={175}>
          <CommsTicker
            fromFrame={0}
            text="OPERATIVE [REDACTED] — METHOD REPEATABLE"
          />
        </Sequence>
        <Sequence from={920} durationInFrames={70}>
          <CommsTicker fromFrame={0} />
        </Sequence>

        {/* R3 stacked-payoff stamp — lands rel 924 (= abs 2304) with
            stamp-3-asset-delivered SVGs. variant='payoff' uses
            STAMP_SLAP_PAYOFF envelope (overshoot 1.06). Slaps across
            the dimmed pile. */}
        <R15Stamp
          frameSvg="trailer/r15-chrome/stamp-3-asset-delivered-frame.svg"
          textSvg="trailer/r15-chrome/stamp-3-asset-delivered-text.svg"
          anchor="center"
          width={1200}
          height={280}
          tiltDeg={-3}
          landFrame={924}
          variant="payoff"
          paperBg="#f6ebce"
        />

        {/* Tail fade-to-black — overlay window 975-990. Last 12f of payoff VO
            play through the fade — audio carries cinematically through the
            S04 → S05 hard cut at abs 2370. */}
        <S04TailFadeToBlack startFrame={975} />
      </AbsoluteFill>
    </Sequence>
  )
}
