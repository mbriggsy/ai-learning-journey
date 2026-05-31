import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion'
import { TrailerCard } from '../lib/TrailerCard'
import type { CardType } from '@shared/types'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'

/**
 * BUILD HERO (2026-05-31). The antidote to the "dead terminal."
 *
 * The brag, shown not said: a real Claude Code session WRITING the game on
 * screen — actual `src/shared/card-defs.ts` source streams in like an agent is
 * typing it. The money shot: the real `dash-barlowe` source line RESOLVES into
 * the finished rendered card (code → the beautiful thing). Then the metrics land
 * as BARS — CODE / TESTS / PLANNING, sized to the canonical ai-journey-stats
 * figures so PLANNING visibly towers over CODE ("more planning than code", shown
 * not said) — each filling as Janet names it.
 *
 * Real receipts only: every code line below is verbatim from card-defs.ts; the
 * card is the real TrailerCard borrow path (real art + real MinimalCard CSS).
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

// --- Palette (Archer / BURNED tokens, hand-mapped for the editor) ---
const C = {
  bg: '#06100f',
  panel: '#0a1c20',
  panelEdge: '#1b3a3e',
  chrome: '#5f8b8f',
  punct: '#5f8b8f',
  keyword: '#6fb3d6',
  string: '#ffb86b',
  key: '#7fd1d1',
  comment: '#3f6b6f',
  text: '#cfe3e3',
  amber: '#ffb000',
  green: '#54d6a0',
}

type Tok = { t: string; c: string }
const kw = (t: string): Tok => ({ t, c: C.keyword })
const st = (t: string): Tok => ({ t, c: C.string })
const ky = (t: string): Tok => ({ t, c: C.key })
const pu = (t: string): Tok => ({ t, c: C.punct })
const tx = (t: string): Tok => ({ t, c: C.text })
const cm = (t: string): Tok => ({ t, c: C.comment })

// Real card-defs.ts source. Lines 5+6 (dash-barlowe) are the hero entry.
const LINES: Tok[][] = [
  [cm('// src/shared/card-defs.ts — 120 cards, one source of truth')],
  [kw('export const '), tx('CARD_DEFS'), pu(' = ['), tx('')],
  [pu('  { '), ky('type'), pu(": "), st("'burned'"), pu(',     '), ky('name'), pu(": "), st("'Burned'"), pu(',     '), ky('category'), pu(": "), st("'burned'"), pu(' },')],
  [pu('  { '), ky('type'), pu(": "), st("'extraction'"), pu(', '), ky('name'), pu(": "), st("'Extraction'"), pu(', '), ky('category'), pu(": "), st("'extraction'"), pu(' },')],
  [pu('  { '), ky('type'), pu(": "), st("'agent-x'"), pu(',    '), ky('name'), pu(": "), st("'Agent X'"), pu(',    '), ky('category'), pu(": "), st("'wild'"), pu(' },')],
  [pu('  { '), ky('type'), pu(": "), st("'dash-barlowe'"), pu(', '), ky('name'), pu(": "), st("'Dash Barlowe'"), pu(', '), ky('category'), pu(": "), st("'operative'"), pu(',')],
  [pu('    '), ky('description'), pu(": "), st("'Powerless alone. Pairs steal random. Triples named steal.'"), pu(' },')],
  [cm('  // …114 more')],
  [pu('] '), kw('as const satisfies '), tx('readonly CardDef[]')],
]

const lineLen = (line: Tok[]) => line.reduce((n, tk) => n + tk.t.length, 0)
const LINE_LENS = LINES.map(lineLen)
const HERO_LINES = [5, 6] // the dash-barlowe entry

const T = {
  panelIn: 0.0,
  typeStart: 0.45,
  typeCps: 105, // chars/sec — agent speed
  lockIn: 5.0, // hero line locks + rest dims
  compile: 5.7, // compile scan begins
  cardSpring: 6.0, // dash blooms from the code line
  panelOut: 6.0, // panel dissolves as the card takes over
  deckStart: 7.05, // hero settles from full bloom to its dominant hold size
  // Stat bars reveal in sync with Janet naming each figure. BuildHero spans
  // beats 3+4; beat-4 brag starts ~local 5.6s. Clause landings (approx):
  //   "forty-three thousand lines of code" ~6.3 · "twenty-nine thousand…tests"
  //   ~10.6 · "sixty-two thousand in planning" ~13.1 (towers). The towering
  //   frame then holds under "more planning than code. measure twice."
  barsIn: 6.3,
  fadeStart: 20.3, // (standalone preview only; in ShortCut fadeOut=false → hard cut to beat 5)
  end: 21.0, // matches the ShortCut beat-3+4 span (at(5)-at(3) ≈ 21s)
}

export const BUILD_HERO_FRAMES = sec(T.end)

// The brag, as bars — sized to the canonical ai-journey-stats figures so
// PLANNING visibly dominates CODE (the "more planning than code" thesis, shown).
// `at` = BuildHero-local second the bar fills, synced to Janet naming it.
const STAT_BARS = [
  { label: 'CODE', value: 43357, at: 6.3 },
  { label: 'TESTS', value: 29033, at: 10.6 },
  { label: 'PLANNING', value: 62082, at: 13.1 },
] as const
const STAT_MAX = 62082
const BAR_TRACK = 660 // px at full (PLANNING)

// The deck — real card types from card-defs.ts (dash is the hero, separate).
// Fades in DIMMED behind the hero during the stats as ambient game texture
// (NOT a counted "120 cards" stat — that line is gone from the VO).
const DECK: CardType[] = [
  'burned', 'extraction', 'reassign', 'direct-order', 'go-dark', 'intel-briefing',
  'falsify-intel', 'burn-the-files', 'back-channel', 'call-in-a-favor', 'intercepted',
  'agent-x', 'vera-khan', 'sable-ashworth', 'janet-broadside', 'neal-proctor',
]
const DECK_OPACITY = 0.95 // the deck is SHOWN OFF here (real Imagen art) — bright, alive
// --- Deck grid layout: 17 slots, dash in the dead-center slot (left empty) ---
const ROWS = [6, 5, 6]
const DASH_SLOT = 8
const GRID = { cw: 168, ch: 234, gx: 20, gy: 18 }
function slotPos(slot: number): { x: number; y: number } {
  let idx = slot
  let row = 0
  while (idx >= ROWS[row]) {
    idx -= ROWS[row]
    row++
  }
  const n = ROWS[row]
  const rowW = n * GRID.cw + (n - 1) * GRID.gx
  const totalH = ROWS.length * GRID.ch + (ROWS.length - 1) * GRID.gy
  const x = -rowW / 2 + idx * (GRID.cw + GRID.gx) + GRID.cw / 2
  const y = -totalH / 2 + row * (GRID.ch + GRID.gy) + GRID.ch / 2
  return { x, y }
}
const DASH_POS = slotPos(DASH_SLOT)
const deckSlot = (j: number) => (j < DASH_SLOT ? j : j + 1)

/** Render a code line up to `maxChars` revealed; returns [spans, cursorShown]. */
function RenderLine({ line, maxChars }: { line: Tok[]; maxChars: number }) {
  let used = 0
  const out: React.ReactNode[] = []
  for (let i = 0; i < line.length; i++) {
    const tk = line[i]
    if (used >= maxChars) break
    const take = Math.min(tk.t.length, maxChars - used)
    out.push(
      <span key={i} style={{ color: tk.c }}>
        {tk.t.slice(0, take)}
      </span>,
    )
    used += take
  }
  return <>{out}</>
}

export const BuildHero: React.FC<{ fadeOut?: boolean }> = ({ fadeOut = true }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // --- Typing reveal: global char budget walked across lines ---
  const revealed = Math.max(0, (frame - sec(T.typeStart)) / fps) * T.typeCps
  let budget = revealed
  let activeLine = 0
  const lineChars: number[] = []
  for (let i = 0; i < LINES.length; i++) {
    const len = LINE_LENS[i]
    if (budget >= len + 2) {
      lineChars.push(len)
      budget -= len + 2 // +2 = newline "cost", paces the cascade
      activeLine = i + 1
    } else {
      lineChars.push(Math.max(0, Math.floor(budget)))
      activeLine = i
      budget = -1
    }
  }
  const typingDone = activeLine >= LINES.length

  // --- Panel entrance + exit ---
  const panelIn = spring({ frame: frame - sec(T.panelIn), fps, config: { damping: 18, stiffness: 120, mass: 0.8 } })
  const panelEnter = interpolate(panelIn, [0, 1], [0.94, 1])
  const panelDissolve = interpolate(frame, [sec(T.panelOut), sec(T.panelOut + 1.1)], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })

  // --- Hero-line lock: rest of code dims, focus ring on dash entry ---
  const lock = interpolate(frame, [sec(T.lockIn), sec(T.lockIn + 0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const dimOthers = 1 - lock * 0.78

  // --- Compile scan sweep over the panel ---
  const scan = interpolate(frame, [sec(T.compile), sec(T.compile + 0.7)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scanVisible = frame >= sec(T.compile) && frame < sec(T.compile + 0.9)

  // --- Dash blooms out of the code line, then settles as the deck's hero ---
  const cardS = spring({ frame: frame - sec(T.cardSpring), fps, config: { damping: 15, stiffness: 110, mass: 0.9 } })
  const cardVisible = frame >= sec(T.cardSpring)
  const bloomScale = interpolate(cardS, [0, 1], [0.16, 1]) // 0.16 → full hero bloom
  // settle: shrink from full-screen hero to its (still-dominant) grid-hero size
  const settle = interpolate(frame, [sec(T.deckStart), sec(T.deckStart + 0.9)], [1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })
  const cardScale = bloomScale * settle
  const breath = Math.sin((frame - sec(T.deckStart)) * 0.06) * 6 // gentle hero float
  const cardY = interpolate(cardS, [0, 1], [40, 0]) + (frame > sec(T.deckStart) ? breath : 0)
  const cardOpacity = interpolate(frame, [sec(T.cardSpring), sec(T.cardSpring + 0.35)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const cardGlow = interpolate(cardS, [0, 0.6, 1], [0, 1, 0.7])
  // materialize sliver → card: a bright horizontal flash at bloom origin
  const sliver = interpolate(frame, [sec(T.cardSpring - 0.15), sec(T.cardSpring + 0.25), sec(T.cardSpring + 0.7)], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Stat bars (code/tests/planning) ---
  const barsVisible = frame >= sec(T.barsIn)

  // --- Live status (always-on machine activity while typing) ---
  const dotPhase = Math.floor((frame / 8) % 4)
  const dots = '.'.repeat(dotPhase)

  const fade = fadeOut ? interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0

  const cursorOn = Math.floor(frame / 8) % 2 === 0

  return (
    <AbsoluteFill style={{ background: `radial-gradient(125% 95% at 50% 44%, #122a2e 0%, #0a1a1d 58%, ${C.bg} 100%)` }}>
      {/* ===== CODE EDITOR PANEL ===== */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: panelDissolve }}>
        <div
          style={{
            width: 1320,
            transform: `scale(${panelEnter})`,
            borderRadius: 12,
            background: `linear-gradient(160deg, ${C.panel}, #060f11)`,
            border: `1px solid ${C.panelEdge}`,
            boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* window chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${C.panelEdge}`, background: '#08171a' }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e0431f' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffb000' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#54d6a0' }} />
            <span style={{ marginLeft: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 17, color: C.chrome }}>card-defs.ts</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: C.chrome }}>
                claude is writing{typingDone ? ' ✓' : dots}
              </span>
            </span>
          </div>

          {/* code body */}
          <div style={{ padding: '26px 30px 30px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 25, lineHeight: '40px' }}>
            {LINES.map((line, i) => {
              const isHero = HERO_LINES.includes(i)
              const op = isHero ? 1 : dimOthers
              return (
                <div key={i} style={{ display: 'flex', whiteSpace: 'pre', opacity: op, position: 'relative' }}>
                  <span style={{ width: 38, color: '#2c5256', userSelect: 'none', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ position: 'relative' }}>
                    <RenderLine line={line} maxChars={lineChars[i]} />
                    {/* typing cursor on the active line */}
                    {i === activeLine && !typingDone && cursorOn && (
                      <span style={{ display: 'inline-block', width: 11, height: 26, marginLeft: 1, background: C.amber, verticalAlign: 'text-bottom', boxShadow: `0 0 10px ${C.amber}` }} />
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {/* focus ring on the hero entry */}
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              // lines are 40px tall; body padding-top 26 + chrome ~50 + 5 lines above hero
              top: 50 + 26 + 5 * 40 - 4,
              height: 2 * 40 + 8,
              borderRadius: 8,
              border: `1.5px solid ${C.amber}`,
              boxShadow: `0 0 26px ${C.amber}55, inset 0 0 26px ${C.amber}22`,
              opacity: lock * panelDissolve,
              background: `${C.amber}0d`,
            }}
          />

          {/* compile scan sweep */}
          {scanVisible && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${scan * 100}%`,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
                boxShadow: `0 0 24px ${C.amber}`,
              }}
            />
          )}

          {/* bottom status bar — live test ticker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 22px', borderTop: `1px solid ${C.panelEdge}`, background: '#08171a', fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>
            <span style={{ color: C.chrome }}>main</span>
            <span style={{ color: C.comment }}>•</span>
            <span style={{ color: typingDone ? C.green : C.chrome }}>
              {typingDone ? '✓ all tests green' : 'running tests…'}
            </span>
            <span style={{ marginLeft: 'auto', color: C.string }}>+611 commits</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* ===== THE TRANSFORM — card blooms from the code ===== */}
      {sliver > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 520, height: 4, background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`, opacity: sliver, boxShadow: `0 0 40px ${C.amber}`, transform: `translateY(${cardY}px)` }} />
        </AbsoluteFill>
      )}

      {/* ===== THE DECK — the real card art, SHOWN OFF: bright, staggered in, alive ===== */}
      {frame >= sec(T.deckStart) && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          {DECK.map((type, j) => {
            const { x, y } = slotPos(deckSlot(j))
            const s = spring({ frame: frame - sec(T.deckStart) - j * 2.0, fps, config: { damping: 15, stiffness: 110, mass: 0.85 } })
            const sc = interpolate(s, [0, 1], [0.78, 1])
            const op = interpolate(s, [0, 1], [0, DECK_OPACITY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const fl = Math.sin((frame - sec(T.deckStart)) * 0.045 + j * 0.6) * 6 // gentle living float
            return (
              <div
                key={type}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + fl}px)) scale(${sc})`,
                  opacity: op,
                  filter: 'brightness(0.94) saturate(1.02) drop-shadow(0 14px 30px rgba(0,0,0,0.5))',
                }}
              >
                <TrailerCard type={type} width={GRID.cw} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* ===== THE HERO — dash, front & center, bright ===== */}
      {cardVisible && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          {/* glow halo */}
          <div style={{ position: 'absolute', width: 720, height: 720, borderRadius: '50%', background: `radial-gradient(circle, ${C.amber}38 0%, transparent 60%)`, opacity: cardGlow }} />
          <div style={{ transform: `translateY(${cardY}px) scale(${cardScale})`, opacity: cardOpacity, filter: `drop-shadow(0 24px 60px rgba(0,0,0,0.6))` }}>
            <TrailerCard type="dash-barlowe" width={440} />
          </div>
        </AbsoluteFill>
      )}

      {/* bottom scrim — keeps the stat bars legible over the bright deck */}
      {barsVisible && (
        <AbsoluteFill style={{ background: 'linear-gradient(to top, #04080aee 0%, #04080aaa 12%, transparent 28%)', pointerEvents: 'none' }} />
      )}

      {/* ===== STAT BARS — the brag as bars; PLANNING towers over CODE ===== */}
      {barsVisible && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'JetBrains Mono', monospace" }}>
            {STAT_BARS.map((b) => {
              const grow = interpolate(frame, [sec(b.at), sec(b.at + 1.1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
              const rowOp = interpolate(frame, [sec(b.at - 0.15), sec(b.at + 0.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              const w = (b.value / STAT_MAX) * BAR_TRACK * grow
              const num = Math.round(b.value * grow)
              const hot = b.label === 'PLANNING'
              const col = hot ? C.amber : b.label === 'TESTS' ? C.key : C.chrome
              return (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: rowOp }}>
                  <span style={{ width: 150, textAlign: 'right', fontSize: 21, letterSpacing: '0.18em', color: hot ? C.amber : C.text }}>{b.label}</span>
                  <div style={{ width: BAR_TRACK, height: 22, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#0c2024', borderRadius: 4, opacity: 0.5 }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, background: `linear-gradient(90deg, ${col}aa, ${col})`, borderRadius: 4, boxShadow: hot ? `0 0 24px ${col}99` : `0 0 10px ${col}44` }} />
                  </div>
                  <span style={{ width: 130, fontSize: 24, fontWeight: 700, color: col }}>{num.toLocaleString('en-US')}</span>
                </div>
              )
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 54%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
