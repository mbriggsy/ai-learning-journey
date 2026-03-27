import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_BODY } from '../lib/fonts';

const PAGE_HEIGHT = 9040;
const VIEWPORT_HEIGHT = 1080;
const SCROLL_DISTANCE = PAGE_HEIGHT - VIEWPORT_HEIGHT;

/**
 * S09 — The Finale (26s / 780f)
 *
 * Full-page HTP screenshot scrolling as background — the actual product.
 * Narration layered on top with beats between:
 *   20f: "So what came out the other side? A game that the humans have fun playing."
 *   238f: "Spec-Driven Development. 100% autonomous SDLC... That is the product."
 *   502f: "Undercover Mob Boss. Play it for free."
 *   690f: [fade to black] "Trust no one."
 */
export const V3S09_Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scroll the HTP page — smooth linear scroll
  const scrollY = interpolate(
    frame,
    [0, 680],
    [0, SCROLL_DISTANCE],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Fade to black starts at frame 680 (100f fade)
  const fadeToBlackOpacity = interpolate(
    frame,
    [680, 780],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Title card elements — appear with SDD narration
  const titleFrame = 238;
  const titleScale = frame >= titleFrame
    ? spring({
        fps,
        frame: frame - titleFrame,
        config: { damping: 80, stiffness: 100 },
      })
    : 0;

  const urlFrame = 320;
  const urlOpacity = interpolate(
    frame,
    [urlFrame, urlFrame + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const tagFrame = 502;
  const tagOpacity = interpolate(
    frame,
    [tagFrame, tagFrame + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* HTP full-page screenshot scrolling — GPU-accelerated via transform */}
      <AbsoluteFill style={{ opacity: 0.8 }}>
        <Img
          src={staticFile('htp-fullpage.png')}
          style={{
            position: 'absolute',
            left: 0,
            width: 1920,
            height: PAGE_HEIGHT,
            objectFit: 'cover',
            transform: `translateY(${-scrollY}px)`,
            willChange: 'transform',
          }}
        />
      </AbsoluteFill>

      {/* Dark vignette for text readability */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 20%, ${NOIR.black}cc 80%)`,
        }}
      />

      {/* Title card overlay — fixed positions so nothing shifts */}
      {/* Title */}
      {frame >= titleFrame && (
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 72,
            color: NOIR.gold,
            letterSpacing: '0.12em',
            textShadow: `0 0 60px ${NOIR.gold}40, 0 4px 30px ${NOIR.black}`,
            transform: `scale(${titleScale})`,
            lineHeight: 1.2,
          }}
        >
          UNDERCOVER
          <br />
          MOB BOSS
        </div>
      )}

      {/* URL */}
      {frame >= urlFrame && (
        <div
          style={{
            position: 'absolute',
            top: '58%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_BODY,
            fontSize: 22,
            color: NOIR.cream,
            letterSpacing: '0.05em',
            opacity: urlOpacity,
            textShadow: `0 2px 20px ${NOIR.black}`,
          }}
        >
          undercover-mob-boss.vercel.app
        </div>
      )}

      {/* Tagline — synced with cta-tag narration */}
      {frame >= tagFrame && (
        <div
          style={{
            position: 'absolute',
            top: '63%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            color: NOIR.muted,
            letterSpacing: '0.2em',
            opacity: tagOpacity,
            textShadow: `0 2px 20px ${NOIR.black}`,
          }}
        >
          PLAY IT FOR FREE.
        </div>
      )}

      {/* Fade to black — "Trust no one." plays into darkness */}
      <AbsoluteFill
        style={{
          backgroundColor: NOIR.black,
          opacity: fadeToBlackOpacity,
        }}
      />

      <FadeTransition type="in" durationFrames={20} />
    </AbsoluteFill>
  );
};
