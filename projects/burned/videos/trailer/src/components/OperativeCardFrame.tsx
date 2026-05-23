import React from 'react'
import { Img, staticFile } from 'remotion'

/**
 * Operative-card-flash chrome composition — Phase 4 production component.
 * Consumes Phase 3 Unit 3.6 `operative-card-frame.svg` (HERO tier, hand-
 * authored, viewBox 800×1000) and overlays a BURNED game-asset portrait
 * + a Clash Display 700 name tile inside the SVG's name-plate strip.
 *
 * SVG region geometry (locked at Phase 3 Unit 3.6):
 *   - Portrait region: x=80 y=100 w=640 h=740 (light charcoal wash —
 *     Phase 4 covers).
 *   - Name-plate strip: x=40 y=860 w=720 h=100 (solid ochre-9 fill —
 *     Phase 4 overlays text in cream-1).
 *   - Upper kicker label `// OPERATIVE FILE` + file code `PEN · 62 · 02`
 *     + target reticle SIT ABOVE the portrait region (y < 100); the
 *     portrait at top:100 leaves them visible.
 *
 * Operative portraits are 269×384 (2:3-ish portrait); the 640×740 region
 * is closer to 0.86:1. `objectFit: cover` + `objectPosition: 'center top'`
 * fills the region while preserving the head/face (Archer freeze-frame
 * convention) — bottom crop is acceptable.
 *
 * The legacy `OperativePortraitFlash.tsx` (Phase 0 spike — cream-paper
 * matte, no SVG chrome) stays for regression compositions.
 */
const NATIVE_W = 800
const NATIVE_H = 1000

export const OperativeCardFrame: React.FC<{
  /** Filename inside `public/assets/cards/` (e.g., `janet-broadside.webp`). */
  portraitFile: string
  /** Display name overlayed on the name-plate strip. */
  operativeName: string
}> = ({ portraitFile, operativeName }) => (
  <div style={{ position: 'relative', width: NATIVE_W, height: NATIVE_H }}>
    {/* Chrome template — viewBox 800×1000 — defines the visual frame */}
    <Img
      src={staticFile('trailer/title-sequence/operative-card-frame.svg')}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
    {/* Portrait fills the SVG's designated center region */}
    <Img
      src={staticFile(`assets/cards/${portraitFile}`)}
      style={{
        position: 'absolute',
        top: 100,
        left: 80,
        width: 640,
        height: 740,
        objectFit: 'cover',
        objectPosition: 'center top',
      }}
    />
    {/* Operative name overlay — sits inside the name-plate strip (y=860 h=100). */}
    <div
      style={{
        position: 'absolute',
        top: 860,
        left: 40,
        width: 720,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 700,
        fontSize: 52,
        color: '#0e0c08', // cream-1 — per SVG comment "Phase 4's Clash Display 700 name overlay in cream-1"
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        // Slight optical compensation for wide letter-spacing trailing edge.
        paddingRight: '0.06em',
      }}
    >
      {operativeName}
    </div>
  </div>
)
