import React from 'react'
import { Img, staticFile } from 'remotion'
import { DossierPage } from './DossierPage'

/**
 * S04 receipts cascade — 7 dossier pages tossed onto the desk in beat with
 * the VO. Replaces the original linear HTP scroll + GoofyStatCaption +
 * CardArtHalo composition (read as "conveyor belt" — a foreign motion
 * dialect inside an otherwise object-cascade-grammar trailer).
 *
 * Each page lands at its VO beat's start frame (scene-relative), holds at
 * full opacity until the NEXT page begins to land, then chrome-decays to
 * 55% so the new arrival is focal. By the payoff stamp at rel 924 the
 * desk is covered in dimmed receipts; the stamp slaps the whole pile.
 *
 * Audio-coupled timing (R2 audio re-pace 2026-05-23):
 *   P1 (Cover)        — rel 0,   decay 60   — "Operational planning."
 *   P2 (14,000 pages) — rel 60,  decay 171  — "Fourteen thousand pages of forensic dossiers."
 *   P3 (Redacted)     — rel 171, decay 308  — "Drafted at three AM, name redacted for compliance."
 *   P4 (1,407)        — rel 308, decay 450  — "Mission rehearsal: fourteen hundred and seven contingencies war-gamed."
 *   P5 (6 memorable)  — rel 450, decay 607  — "Six of them, deliberately unrehearsed — the 'memorable ones.'"
 *   P6 (17 / 5 hats)  — rel 607, decay 745  — "Seventeen asset illustrations. Five of them with hats."
 *   P7 (7 / 6 / 1)    — rel 745, decay 900  — "Seven on the roster. Six in the deck. One on the research budget. Don't ask."
 *   R15 PAYOFF STAMP  — rel 924              — "They WERE the operation." (lands on the whole pile)
 *
 * Vocabulary rhyme: same EASE_OUT_EMIL settle + entry-tilt-resolves-to-final
 * grammar as S03's operative cascade. Cards-tossed motion, dossier-paper
 * substrate. Pages cluster center-of-canvas to keep the eye on one focal
 * region; right-edge desk + venetian-blind background provides negative
 * space.
 *
 * Anti-pattern guard (Phase 1 design-lens F-001): no frame except the payoff
 * has >2 elements at full visual weight. After each new page lands, the
 * previous decay-window is already underway; the newest page is ~1.0
 * opacity, the previous is ~0.7 mid-decay, and earlier pages are ~0.55.
 */

const PAGES = [
  {
    key: 'P1-cover',
    anchor: { cx: 700, cy: 500, rot: -8 },
    landFrame: 0,
    decayFromFrame: 60,
    content: <P1Cover />,
  },
  {
    key: 'P2-14k',
    anchor: { cx: 1000, cy: 460, rot: 4 },
    landFrame: 60,
    decayFromFrame: 171,
    content: <P2BigNumber14k />,
  },
  {
    key: 'P3-redacted',
    anchor: { cx: 820, cy: 580, rot: -3 },
    landFrame: 171,
    decayFromFrame: 308,
    content: <P3Redacted />,
  },
  {
    key: 'P4-1407',
    anchor: { cx: 1100, cy: 540, rot: 7 },
    landFrame: 308,
    decayFromFrame: 450,
    content: <P4Contingencies />,
  },
  {
    key: 'P5-memorable',
    anchor: { cx: 880, cy: 440, rot: -6 },
    landFrame: 450,
    decayFromFrame: 607,
    content: <P5Memorable />,
  },
  {
    key: 'P6-hats',
    anchor: { cx: 1170, cy: 600, rot: -2 },
    landFrame: 607,
    decayFromFrame: 745,
    content: <P6Hats />,
  },
  {
    key: 'P7-budget',
    anchor: { cx: 960, cy: 480, rot: 5 },
    landFrame: 745,
    decayFromFrame: 900, // dims into the payoff stamp slap at 924
    content: <P7Budget />,
  },
] as const

export const DossierPageCascade: React.FC = () => {
  return (
    <>
      {PAGES.map((p) => (
        <DossierPage
          key={p.key}
          anchor={p.anchor}
          landFrame={p.landFrame}
          chromeDecayFromFrame={p.decayFromFrame}
        >
          {p.content}
        </DossierPage>
      ))}
    </>
  )
}

// ───────────────────────────────────────────────────────────────────
// Shared chrome bits

const HeaderLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 500,
      fontSize: 14,
      color: '#947226', // ochre-9
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      borderBottom: '1px solid rgba(148, 114, 38, 0.45)',
      paddingBottom: 8,
      marginBottom: 12,
    }}
  >
    {children}
  </div>
)

const FooterChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 500,
      fontSize: 11,
      color: 'rgba(10, 9, 6, 0.65)', // charcoal-1 65%
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      borderTop: '1px solid rgba(148, 114, 38, 0.35)',
      paddingTop: 8,
      display: 'flex',
      justifyContent: 'space-between',
    }}
  >
    {children}
  </div>
)

/**
 * 132px is the default — sized for short numerals like "6" / "17" that occupy
 * the BigNumeral focal slot at full visual weight. Long numerals ("14,000",
 * "1,407") MUST pass a smaller `fontSize` to stay inside the 352px content
 * area of the default 400×520 DossierPage. Bumping page width instead would
 * cascade-conflict with the neighboring anchors (P2's anchor at cx=1000 +
 * P5's right edge at cx=880+200=1080 already share desk space). Smaller
 * fontSize keeps the page geometry locked.
 */
const BigNumeral: React.FC<{
  children: React.ReactNode
  italic?: boolean
  color?: string
  fontSize?: number
}> = ({ children, italic = false, color = '#947226', fontSize = 132 }) => (
  <div
    style={{
      fontFamily: 'Clash Display, sans-serif',
      fontWeight: 700,
      fontStyle: italic ? 'italic' : 'normal',
      fontSize,
      color,
      letterSpacing: '0.01em',
      lineHeight: 0.95,
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.18)',
    }}
  >
    {children}
  </div>
)

const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 500,
      fontSize: 13,
      color: 'rgba(10, 9, 6, 0.75)', // charcoal-1 75%
      letterSpacing: '0.20em',
      textTransform: 'uppercase',
      marginTop: 12,
    }}
  >
    {children}
  </div>
)

const Marginalia: React.FC<{ children: React.ReactNode; absolute?: boolean }> = ({
  children,
  absolute = false,
}) => (
  <div
    style={{
      ...(absolute
        ? { position: 'absolute', bottom: 64, right: 24 }
        : { marginTop: 18 }),
      fontFamily: 'Clash Display, sans-serif',
      fontWeight: 500,
      fontStyle: 'italic',
      fontSize: 18,
      color: '#947226', // ochre-9
      opacity: 0.78,
      letterSpacing: '0.02em',
      lineHeight: 1.2,
    }}
  >
    {children}
  </div>
)

// ───────────────────────────────────────────────────────────────────
// Page contents

function P1Cover() {
  return (
    <>
      <HeaderLabel>// OPERATION PENDLETON</HeaderLabel>
      {/* Crest sits center; below it a classification stripe in inverted register. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <Img
          src={staticFile('assets/howtoplay/pendleton-crest.png')}
          style={{
            width: 200,
            height: 200,
            objectFit: 'contain',
            opacity: 0.92,
            filter: 'sepia(0.35) hue-rotate(-15deg) saturate(1.15)',
          }}
        />
        <div
          style={{
            backgroundColor: '#0a0906', // charcoal-1
            color: '#f6ebce',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            padding: '8px 16px',
            transform: 'rotate(-1.5deg)',
          }}
        >
          TOP SECRET // EYES ONLY
        </div>
      </div>
      <FooterChrome>
        <span>// FILE: PNDLT-Δ-001</span>
        <span>// CLASSIFICATION: BLACK</span>
      </FooterChrome>
    </>
  )
}

function P2BigNumber14k() {
  return (
    <>
      <HeaderLabel>// FORENSIC DOSSIERS</HeaderLabel>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BigNumeral fontSize={96}>14,000</BigNumeral>
        <SubLabel>PAGES // VOL. I OF VOL. CCXLVII</SubLabel>
        <Marginalia>+ 6 sticky notes (recovered)</Marginalia>
      </div>
      <FooterChrome>
        <span>// VOL. I</span>
        <span>// PAGE COUNT VERIFIED</span>
      </FooterChrome>
    </>
  )
}

function P3Redacted() {
  return (
    <>
      <HeaderLabel>// AUTHOR ENDORSEMENT</HeaderLabel>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        {/* Date stamp box top-right of the body area */}
        <div
          style={{
            alignSelf: 'flex-end',
            border: '1.5px solid #947226',
            padding: '6px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            letterSpacing: '0.2em',
            color: '#947226',
            transform: 'rotate(-3deg)',
          }}
        >
          03:17 // SAT
        </div>
        {/* Drafted-by prompt + fat redact bar */}
        <div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 14,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(10, 9, 6, 0.75)',
              marginBottom: 10,
            }}
          >
            DRAFTED BY:
          </div>
          <div
            style={{
              position: 'relative',
              backgroundColor: '#0a0906',
              padding: '14px 18px',
              transform: 'rotate(-1deg)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.35)',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 18,
                color: '#f6ebce',
                letterSpacing: '0.18em',
              }}
            >
              ████████████ ████████
            </span>
          </div>
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'rgba(10, 9, 6, 0.7)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          // NAME REDACTED — COMPLIANCE §4.2(b)
        </div>
      </div>
      <FooterChrome>
        <span>// AUTH WAIVER ON FILE</span>
        <span>// COMPLIANCE REVIEWED</span>
      </FooterChrome>
    </>
  )
}

function P4Contingencies() {
  // 14 rows × 21 columns of tick marks = 294 cells; we'll mark some red to suggest highlights.
  const TICK_ROWS = 14
  const TICK_COLS = 21
  return (
    <>
      <HeaderLabel>// CONTINGENCY MATRIX</HeaderLabel>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BigNumeral>1,407</BigNumeral>
        <SubLabel>SCENARIOS A–Z</SubLabel>
        {/* Tick grid */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: `repeat(${TICK_COLS}, 1fr)`,
            gap: 2,
            width: 280,
          }}
        >
          {Array.from({ length: TICK_ROWS * TICK_COLS }).map((_, i) => {
            const isHighlighted = i % 29 === 0 || i % 41 === 0
            return (
              <div
                key={i}
                style={{
                  height: 6,
                  backgroundColor: isHighlighted ? '#be2e27' : 'rgba(148, 114, 38, 0.7)',
                  borderRadius: 1,
                }}
              />
            )
          })}
        </div>
      </div>
      <FooterChrome>
        <span>// WAR-GAMED Q1–Q4</span>
        <span>// 1407 / 1407</span>
      </FooterChrome>
    </>
  )
}

function P5Memorable() {
  return (
    <>
      <HeaderLabel>// UNREHEARSED — DELIBERATELY</HeaderLabel>
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Big 6 with a red strike-through diagonal slash */}
        <div style={{ position: 'relative' }}>
          <BigNumeral italic>6</BigNumeral>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '-20%',
              width: '140%',
              height: 6,
              backgroundColor: '#be2e27', // burned-fire
              transform: 'translateY(-50%) rotate(-22deg)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              borderRadius: 1,
            }}
          />
        </div>
        <SubLabel>// 'THE MEMORABLE ONES'</SubLabel>
        <Marginalia>do NOT discuss in writing</Marginalia>
      </div>
      <FooterChrome>
        <span>// OFF-RECORD</span>
        <span>// Q3 INCIDENT FOLDER</span>
      </FooterChrome>
    </>
  )
}

function P6Hats() {
  return (
    <>
      <HeaderLabel>// ASSET ILLUSTRATIONS</HeaderLabel>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BigNumeral>17</BigNumeral>
        <SubLabel>ILLUSTRATIONS ON FILE</SubLabel>
        {/* 5 hat icons in a row */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 14,
          }}
        >
          {/* Top hat */}
          <HatGlyph variant="top" />
          {/* Fedora */}
          <HatGlyph variant="fedora" />
          {/* Bowler */}
          <HatGlyph variant="bowler" />
          {/* Beret */}
          <HatGlyph variant="beret" />
          {/* Cowboy */}
          <HatGlyph variant="cowboy" />
        </div>
        <SubLabel>// 5 W/ HATS</SubLabel>
      </div>
      <FooterChrome>
        <span>// CATALOGUED 2024-Q3</span>
        <span>// COSTUME LIBRARY §B</span>
      </FooterChrome>
    </>
  )
}

function P7Budget() {
  return (
    <>
      <HeaderLabel>// OPERATIVE ACCOUNTING</HeaderLabel>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <BudgetRow numeral="7" label="ON ROSTER" />
        <BudgetRow numeral="6" label="IN DECK" />
        <BudgetRow numeral="1" label="RESEARCH BUDGET" tail="DON'T ASK" highlight />
      </div>
      <FooterChrome>
        <span>// Q4 RECONCILIATION</span>
        <span>// OFF-BOOKS</span>
      </FooterChrome>
    </>
  )
}

// ───────────────────────────────────────────────────────────────────
// Sub-components

const BudgetRow: React.FC<{
  numeral: string
  label: string
  tail?: string
  highlight?: boolean
}> = ({ numeral, label, tail, highlight = false }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 18,
      paddingBottom: 8,
      borderBottom: '1px dashed rgba(148, 114, 38, 0.35)',
    }}
  >
    <div
      style={{
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 700,
        fontSize: 64,
        color: highlight ? '#be2e27' : '#947226', // burned-fire vs ochre-9
        lineHeight: 0.9,
        minWidth: 70,
      }}
    >
      {numeral}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 14,
          color: 'rgba(10, 9, 6, 0.85)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {tail && (
        <div
          style={{
            marginTop: 4,
            fontFamily: 'Clash Display, sans-serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 16,
            color: '#947226',
            letterSpacing: '0.02em',
          }}
        >
          {tail}
        </div>
      )}
    </div>
  </div>
)

/**
 * Inline SVG hat glyphs — distinctive silhouettes drawn from primitives so the
 * "5 with hats" gag reads in <1s. Each ~38px wide, ochre-9 stroke.
 */
const HatGlyph: React.FC<{ variant: 'top' | 'fedora' | 'bowler' | 'beret' | 'cowboy' }> = ({
  variant,
}) => {
  const stroke = '#947226' // ochre-9
  switch (variant) {
    case 'top':
      return (
        <svg width="38" height="42" viewBox="0 0 38 42">
          <rect x="11" y="2" width="16" height="28" fill={stroke} />
          <rect x="11" y="22" width="16" height="3" fill="#f6ebce" />
          <ellipse cx="19" cy="32" rx="17" ry="3.5" fill={stroke} />
        </svg>
      )
    case 'fedora':
      return (
        <svg width="38" height="42" viewBox="0 0 38 42">
          <path
            d="M 5 26 Q 19 12 33 26 L 32 28 L 6 28 Z"
            fill={stroke}
          />
          <ellipse cx="19" cy="30" rx="17" ry="3.5" fill={stroke} />
          <rect x="9" y="23" width="20" height="3" fill="rgba(0,0,0,0.4)" />
        </svg>
      )
    case 'bowler':
      return (
        <svg width="38" height="42" viewBox="0 0 38 42">
          <path d="M 8 27 Q 19 12 30 27 Z" fill={stroke} />
          <ellipse cx="19" cy="28" rx="15" ry="3" fill={stroke} />
        </svg>
      )
    case 'beret':
      return (
        <svg width="38" height="42" viewBox="0 0 38 42">
          <ellipse cx="19" cy="22" rx="14" ry="10" fill={stroke} />
          <circle cx="29" cy="14" r="2.4" fill={stroke} />
        </svg>
      )
    case 'cowboy':
      return (
        <svg width="38" height="42" viewBox="0 0 38 42">
          <path
            d="M 3 28 Q 6 22 12 22 Q 12 12 19 12 Q 26 12 26 22 Q 32 22 35 28 Q 31 24 26 26 Q 19 28 12 26 Q 7 24 3 28 Z"
            fill={stroke}
          />
        </svg>
      )
  }
}
