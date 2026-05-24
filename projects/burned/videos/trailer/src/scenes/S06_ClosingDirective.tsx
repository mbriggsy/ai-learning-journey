import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { DossierFolder } from '../components/DossierFolder'
import { R15Stamp } from '../components/R15Stamp'
import { IrisWipe } from '../transitions/IrisWipe'
import { EASE_OUT_EMIL, EASE_OUT_QUAD, LOGO_SPRING_CLOSING } from '../lib/animations'

/**
 * S06 — Closing Directive. 9-second closing frame.
 * S06 spans composition frames 2910-3180 (scene-relative 0-270).
 *
 *   0-45     iris-wipe-IN — pinhole opens, briefing room reestablishes
 *            underneath (Archer chapter-break grammar, SINGLE SOURCE
 *            per amendment SA-5: imports IrisWipe from transitions/).
 *   0-30     dossier folder holds fully-open (carried over from S02
 *            briefing). venetian-blind shadow restarts drift.
 *   30-60    dossier folder CLOSES (reverse of S02 opening — 30-frame
 *            EASE_DRAWER) — "we're wrapping this up" gesture.
 *   60-110   dossier opacity fades 1.0 → 0 — recedes entirely. R1
 *            shipped this at 0.15 (intended as faint texture) but the
 *            closed-folder PENDLETON text bled into the R15 #4 + R15 #5
 *            landing zone, creating a visually busy backdrop right where
 *            the closing-card chrome lands. Fix: dossier serves the
 *            closing GESTURE (close 30-60) then exits stage-left so the
 *            final tableau is the BURNED wordmark + stamps on a clean
 *            mahogany + venetian-blind base. The crest watermark
 *            top-left + depth-plane nameplate bottom-right still carry
 *            the S02 bookend without needing the folder.
 *   195-200  BURNED wordmark opacity ramp 0 → 1 (5-frame fade-in).
 *   200      BURNED wordmark LANDS (scene-rel 200 = absolute 3110 per
 *            audio-manifest s06-cue-2910 notes; this is mid-clause
 *            during Dash's "Hold it tight" close). LOGO_SPRING_CLOSING
 *            drives scale 0.95 → 1.04 → 1.0 — SETTLED, NOT snappy per
 *            amendment SA-9. Distinct vocabulary from S01's
 *            LOGO_SPRING_COLD (closing breathes, cold-open snaps).
 *   200-240  breathing-room hold (40 frames / 1.3s) — emil's "match
 *            motion to mood; closing should breathe." Nothing else
 *            moves except subtle venetian-blind drift + crest static.
 *   240      R15 #4 OPERATION STATUS: FIELD-READY slaps in (scene-rel
 *            240 = absolute 3150 per audio-manifest s06-cue-3144 notes
 *            — lands ON the Phrasing! audio mid-syllable, visual
 *            punctuation for the catchphrase). PAYOFF heavy slap
 *            envelope, axis-aligned (tilt 0) — reads as documented
 *            status, not slapped chrome.
 *   255      R15 #5 closing-card cold-decode slaps in (scene-rel 255
 *            = absolute 3165, post-Phrasing audio). STANDARD slap
 *            envelope — lighter than R15 #4 to maintain hierarchy.
 *            "DRAFTED, RENDERED, AND / SHIPPED BY AUTONOMOUS AGENTS."
 *            + italic "Honestly at this point we're just impressed."
 *            Bookends Janet's S01 "I'm just impressed." kicker via
 *            the I'm → we're pronoun pivot (Phase 1 Unit 1.9 lock).
 *   270      hard cut to black (composition boundary; final brass
 *            sting on MusicBed envelope completes at frame 3179).
 *
 * Composition-level VO (lives in TrailerComposition.tsx per ADR #16):
 *   - s06-cue-2910-dash.wav — "That's the briefing. Operation Pendleton
 *     is in your hands. Hold it tight." (157 actualFrames, plays
 *     scene-rel 0..157)
 *   - s06-cue-3144-dash.wav — "Phrasing." (19 actualFrames, plays
 *     scene-rel 234..253; PHRASING_INTERJECTIVE_SETTINGS)
 *
 * NO CASE BANNER / CommsTicker bottom strip — emil's quiet wins. The
 * depth-plane brass nameplate + R15 #4 + R15 #5 already carry the
 * bottom-third weight; adding a ticker would dilute the breathing-
 * room hold and crowd the final tableau. If Briggsy ear-checks the
 * closing and wants the BEAT-SHEET CASE BANNER line restored, add a
 * top-edge banner in R2 (not bottom strip — bottom is committed to
 * the nameplate + stamps stack).
 */

const PENDLETON_CREST_SIZE = 140
const LOGO_WIDTH_PX = 720
const LOGO_LAND_FRAME = 200
const LOGO_FADE_IN_START = 195
const R15_4_LAND_FRAME = 240
const R15_5_LAND_FRAME = 255

export const S06_ClosingDirective: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // BURNED wordmark spring + scale envelope. Spring is the TEMPORAL
  // driver; the manual interpolate shapes the actual 0.95 → 1.04 → 1.0
  // scale geometry on top of the spring's S-curve.
  const logoSpring = spring({
    frame: frame - LOGO_LAND_FRAME,
    fps,
    config: LOGO_SPRING_CLOSING,
  })
  const logoScale = interpolate(logoSpring, [0, 0.6, 1], [0.95, 1.04, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const logoOpacity = interpolate(
    frame,
    [LOGO_FADE_IN_START, LOGO_LAND_FRAME],
    [0, 1],
    {
      easing: EASE_OUT_QUAD,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  // Dossier exits entirely after closing — fades 1.0 → 0 over frames
  // 60-110 so the BURNED wordmark + R15 stamps land on a clean mahogany
  // base. (R1 used 0.15 residual texture, but the closed-folder PENDLETON
  // text bled into the closing-card chrome landing zone — see comment
  // block above.) The crest watermark + nameplate carry S02 bookend.
  const dossierOpacity = interpolate(frame, [60, 110], [1.0, 0.0], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Pendleton crest watermark — S02 bookend, top-left, static at 0.3 opacity. */}
      <Img
        src={staticFile('assets/howtoplay/pendleton-crest.png')}
        style={{
          position: 'absolute',
          top: 60,
          left: 60,
          width: PENDLETON_CREST_SIZE,
          height: PENDLETON_CREST_SIZE,
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      {/* Depth-plane brass nameplate — S02 bookend, bottom-right. Same
          render size as S02 so the parallax read transfers. */}
      <Img
        src={staticFile('trailer/briefing-room/depth-plane.svg')}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 80,
          width: 540,
          height: 144,
          pointerEvents: 'none',
        }}
      />

      {/* Dossier folder — enters fully-open (carried over from S02 briefing,
          openStart=-60 puts opening interpolation already at 1.0 at frame 0)
          → closes 30-60 with EASE_DRAWER → fades to background texture. */}
      <div style={{ opacity: dossierOpacity }}>
        <DossierFolder openStart={-60} closeStart={30} />
      </div>

      {/* BURNED wordmark — centered, scale-spring + opacity ramp at frame 200. */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          transformOrigin: 'center',
          pointerEvents: 'none',
        }}
      >
        <Img
          src={staticFile('trailer/title-sequence/burned-logo.svg')}
          style={{ width: LOGO_WIDTH_PX, height: 'auto' }}
        />
      </AbsoluteFill>

      {/* R15 #4 OPERATION STATUS: FIELD-READY — below logo, payoff heavy slap.
          anchor='top-left' with explicit pixel positioning so the stamp lands
          predictably below the wordmark (R15Stamp's center anchor ignores
          offsetPx — non-issue here since explicit placement is more legible). */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/subhead-4-field-ready-frame.svg"
        textSvg="trailer/r15-chrome/subhead-4-field-ready-text.svg"
        anchor="top-left"
        offsetPx={{ x: 560, y: 680 }} /* horiz-center 800-wide in 1920 = (1920-800)/2; vert ~50px below logo bottom */
        width={800}
        height={60}
        tiltDeg={0}
        landFrame={R15_4_LAND_FRAME}
        variant="payoff"
      />

      {/* R15 #5 closing-card cold-decode — below R15 #4, standard slap (lighter
          envelope than #4 per "lighter envelope to maintain hierarchy" lock).
          Two-row main + italic subhead text layer. */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/subhead-5-closing-card-frame.svg"
        textSvg="trailer/r15-chrome/subhead-5-closing-card-text.svg"
        anchor="top-left"
        offsetPx={{ x: 460, y: 770 }} /* horiz-center 1000-wide; ~30px below R15 #4 bottom edge */
        width={1000}
        height={130}
        tiltDeg={0}
        landFrame={R15_5_LAND_FRAME}
        variant="standard"
      />

      {/* Iris-wipe-IN — single source per amendment SA-5. Z-index 1000 in the
          transition component paints the black surround on top of everything,
          revealing the scene through a growing pinhole over frames 0-45. */}
      <IrisWipe fromFrame={0} toFrame={45} direction="opening" />
    </AbsoluteFill>
  )
}
