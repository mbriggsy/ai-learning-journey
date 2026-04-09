import type { CardType } from '@shared/types'

/**
 * Large, expressive card illustrations that fill the card body.
 * Each is a 100x100 viewBox SVG designed to be recognizable at a glance.
 * Uses currentColor so the card accent tints the illustration.
 */

// --- Burned: dramatic skull with explosion lines ---
const BurnedArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Explosion rays */}
    <path d="M50 8l3 14-3-2-3 2 3-14zM26 18l8 12-3-1-4 2 8-13zM74 18l-8 13-4-2-3 1 8-12zM14 38l13 7-2 3-1 4 12-8-1-1zM86 38l-13 7 2 3 1 4-12-8 1-1z" fill="currentColor" opacity="0.35"/>
    {/* Cat skull */}
    <path d="M30 35l-4-15 14 8h20l14-8-4 15c4 4 6 10 6 16 0 12-10 22-26 22S24 63 24 51c0-6 2-12 6-16z" fill="currentColor" opacity="0.18"/>
    <path d="M30 35l-4-15 14 8h20l14-8-4 15c4 4 6 10 6 16 0 12-10 22-26 22S24 63 24 51c0-6 2-12 6-16z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Eyes — X marks */}
    <path d="M36 47l5 5m0-5l-5 5M59 47l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Mouth — jagged */}
    <path d="M37 62l4-4 3 3 3-3 3 3 3-3 3 3 3-3 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// --- Defuse: bomb with snipped wire ---
const DefuseArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Bomb body */}
    <circle cx="50" cy="56" r="24" fill="currentColor" opacity="0.18"/>
    <circle cx="50" cy="56" r="24" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    {/* Fuse stem */}
    <path d="M50 32v-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {/* Fuse wire curling */}
    <path d="M50 26c0-4 6-8 10-8s6 5 2 8-10 4-8 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Scissors snip */}
    <path d="M56 18l6-4m0 0l-2 6m-4-2l6 4m0 0l-6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    {/* Highlight */}
    <circle cx="40" cy="48" r="4" fill="currentColor" opacity="0.12"/>
    {/* Cross-band */}
    <path d="M35 56h30M50 41v30" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
  </svg>
)

// --- Attack: double lightning bolt ---
const AttackArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Main bolt */}
    <path d="M54 12L38 48h16L42 88l24-44H50l14-32z" fill="currentColor" opacity="0.18"/>
    <path d="M54 12L38 48h16L42 88l24-44H50l14-32z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Second bolt (offset, lighter) */}
    <path d="M68 22L56 48h10l-8 28 16-30h-10l10-24z" fill="currentColor" opacity="0.1"/>
    <path d="M68 22L56 48h10l-8 28 16-30h-10l10-24z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
  </svg>
)

// --- Targeted Attack: crosshair + lightning ---
const TargetedAttackArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Crosshair circle */}
    <circle cx="50" cy="52" r="26" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
    <circle cx="50" cy="52" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
    {/* Crosshair lines */}
    <path d="M50 20v14M50 66v14M18 52h14M66 52h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
    {/* Center bolt */}
    <path d="M53 34l-8 18h8l-6 20 14-22h-8l8-16z" fill="currentColor" opacity="0.2"/>
    <path d="M53 34l-8 18h8l-6 20 14-22h-8l8-16z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
)

// --- Skip: fast-forward arrows ---
const SkipArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M24 28l26 22-26 22V28z" fill="currentColor" opacity="0.18"/>
    <path d="M24 28l26 22-26 22V28z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M50 28l26 22-26 22V28z" fill="currentColor" opacity="0.12"/>
    <path d="M50 28l26 22-26 22V28z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Stop bar */}
    <path d="M80 28v44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
  </svg>
)

// --- See the Future: crystal ball with eye ---
const SeeTheFutureArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Ball */}
    <circle cx="50" cy="46" r="26" fill="currentColor" opacity="0.15"/>
    <circle cx="50" cy="46" r="26" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    {/* Eye inside */}
    <path d="M34 46c0 0 7-10 16-10s16 10 16 10-7 10-16 10-16-10-16-10z" fill="currentColor" opacity="0.12"/>
    <path d="M34 46c0 0 7-10 16-10s16 10 16 10-7 10-16 10-16-10-16-10z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="50" cy="46" r="5" fill="currentColor" opacity="0.3"/>
    {/* Base */}
    <path d="M34 74h32l-4-6H38l-4 6z" fill="currentColor" opacity="0.18"/>
    <path d="M38 68c2 2 6 4 12 4s10-2 12-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
  </svg>
)

// --- Alter the Future: crystal ball with swirling arrows ---
const AlterTheFutureArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Ball */}
    <circle cx="50" cy="46" r="26" fill="currentColor" opacity="0.15"/>
    <circle cx="50" cy="46" r="26" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    {/* Rotating arrows inside */}
    <path d="M40 36a14 14 0 0120 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M60 36l-3-4 4-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M60 56a14 14 0 01-20 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M40 56l3 4-4 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Base */}
    <path d="M34 74h32l-4-6H38l-4 6z" fill="currentColor" opacity="0.18"/>
  </svg>
)

// --- Shuffle: swirling cards ---
const ShuffleArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Fanned cards */}
    <rect x="28" y="28" width="28" height="40" rx="3" transform="rotate(-15 42 48)" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="36" y="26" width="28" height="40" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
    <rect x="44" y="28" width="28" height="40" rx="3" transform="rotate(15 58 48)" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
    {/* Circular arrows around */}
    <path d="M50 16a34 34 0 0130 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    <path d="M80 34l-2-6 6-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    <path d="M50 84a34 34 0 01-30-18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    <path d="M20 66l2 6-6 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
  </svg>
)

// --- Draw from Bottom: downward hand reaching under pile ---
const DrawFromBottomArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Card pile */}
    <rect x="30" y="20" width="40" height="36" rx="4" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2"/>
    <rect x="33" y="17" width="34" height="4" rx="2" fill="currentColor" opacity="0.08"/>
    {/* Arrow curving down and under */}
    <path d="M50 60v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M50 78l-8-6h16l-8 6z" fill="currentColor" opacity="0.3"/>
    <path d="M42 78c-8 0-12-4-12-10v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
    <path d="M30 62l4-2-2 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
)

// --- Favor: gift/plea gesture (two hands) ---
const FavorArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Receiving hand (palm up) */}
    <path d="M26 60c2-6 8-10 14-10h6c4 0 8 2 10 6l2 6c0 4-2 8-6 10H34c-6 0-10-4-8-12z" fill="currentColor" opacity="0.18"/>
    <path d="M26 60c2-6 8-10 14-10h6c4 0 8 2 10 6l2 6c0 4-2 8-6 10H34c-6 0-10-4-8-12z" fill="none" stroke="currentColor" strokeWidth="2"/>
    {/* Card being given */}
    <rect x="40" y="24" width="20" height="30" rx="3" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2"/>
    {/* Arrow: card moving down to hand */}
    <path d="M50 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
    <path d="M46 20l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
  </svg>
)

// --- Nope: bold X / cancel stamp ---
const NopeArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Circle stamp border */}
    <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.1"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" strokeDasharray="6 4"/>
    {/* Bold X */}
    <path d="M34 34l32 32M66 34l-32 32" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
)

// --- Feral Cat: mysterious wild cat silhouette ---
const FeralCatArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Cat body silhouette */}
    <path d="M28 38l-4-16 12 8c4-3 9-5 14-5s10 2 14 5l12-8-4 16c3 4 5 9 5 14 0 8-4 15-10 19l2 8H32l2-8c-6-4-10-11-10-19 0-5 2-10 4-14z" fill="currentColor" opacity="0.18"/>
    <path d="M28 38l-4-16 12 8c4-3 9-5 14-5s10 2 14 5l12-8-4 16c3 4 5 9 5 14 0 8-4 15-10 19l2 8H32l2-8c-6-4-10-11-10-19 0-5 2-10 4-14z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Eyes — glowing dots */}
    <circle cx="40" cy="48" r="3.5" fill="currentColor" opacity="0.5"/>
    <circle cx="60" cy="48" r="3.5" fill="currentColor" opacity="0.5"/>
    {/* Question mark on body */}
    <path d="M46 60c0-4 2-5 4-6s4-2 4-5-2-4-4-4-4 1-4 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
    <circle cx="50" cy="68" r="1.5" fill="currentColor" opacity="0.35"/>
  </svg>
)

// --- Taco Cat: cat in a taco ---
const TacoCatArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Taco shell */}
    <path d="M16 62c0 0 14-36 34-36s34 36 34 36" fill="currentColor" opacity="0.15"/>
    <path d="M16 62c0 0 14-36 34-36s34 36 34 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Taco bottom */}
    <path d="M16 62c4 8 18 14 34 14s30-6 34-14" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2"/>
    {/* Cat ears poking out */}
    <path d="M38 30l-4-10 8 6M62 30l4-10-8 6" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    {/* Cat face */}
    <circle cx="42" cy="44" r="2.5" fill="currentColor" opacity="0.4"/>
    <circle cx="58" cy="44" r="2.5" fill="currentColor" opacity="0.4"/>
    <path d="M47 50c0 0 1.5 2 3 2s3-2 3-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    {/* Whiskers */}
    <path d="M32 46h8M60 46h8M34 50h6M60 50h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
  </svg>
)

// --- Beard Cat: cat with magnificent beard ---
const BeardCatArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Cat head */}
    <path d="M30 40l-6-18 14 10c4-3 8-5 12-5s8 2 12 5l14-10-6 18c3 3 5 8 5 13 0 6-3 11-7 14H32c-4-3-7-8-7-14 0-5 2-10 5-13z" fill="currentColor" opacity="0.18"/>
    <path d="M30 40l-6-18 14 10c4-3 8-5 12-5s8 2 12 5l14-10-6 18c3 3 5 8 5 13 0 6-3 11-7 14H32c-4-3-7-8-7-14 0-5 2-10 5-13z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Eyes */}
    <circle cx="40" cy="46" r="3" fill="currentColor" opacity="0.4"/>
    <circle cx="60" cy="46" r="3" fill="currentColor" opacity="0.4"/>
    {/* Nose */}
    <path d="M48 52l2 2 2-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* BEARD — flowing below chin */}
    <path d="M32 67c2 6 6 10 10 14 2 2 4 4 8 4s6-2 8-4c4-4 8-8 10-14" fill="currentColor" opacity="0.12"/>
    <path d="M32 67c2 6 6 10 10 14 2 2 4 4 8 4s6-2 8-4c4-4 8-8 10-14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Beard waves */}
    <path d="M36 72c3 2 6 1 8-1s5-3 8 0M38 78c2 2 5 1 7-1s5-2 7 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
  </svg>
)

// --- Rainbow-Ralphing Cat: cat with rainbow coming from mouth ---
const RainbowCatArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Cat head */}
    <path d="M32 44l-6-18 14 10c3-3 7-5 10-5s7 2 10 5l14-10-6 18c2 3 4 7 4 12 0 8-6 14-16 14H44c-10 0-16-6-16-14 0-5 2-9 4-12z" fill="currentColor" opacity="0.18"/>
    <path d="M32 44l-6-18 14 10c3-3 7-5 10-5s7 2 10 5l14-10-6 18c2 3 4 7 4 12 0 8-6 14-16 14H44c-10 0-16-6-16-14 0-5 2-9 4-12z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Eyes — wide open shocked */}
    <circle cx="40" cy="48" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="40" cy="48" r="1.5" fill="currentColor" opacity="0.4"/>
    <circle cx="58" cy="48" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="58" cy="48" r="1.5" fill="currentColor" opacity="0.4"/>
    {/* Rainbow streaming down from mouth */}
    <path d="M42 62h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3"/>
    <path d="M44 65v16M47 65v18M50 65v20M53 65v18M56 65v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25"/>
  </svg>
)

// --- Hairy Potato Cat: lumpy potato shape with cat features ---
const HairyPotatoCatArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Potato body */}
    <ellipse cx="50" cy="52" rx="28" ry="24" fill="currentColor" opacity="0.18"/>
    <ellipse cx="50" cy="52" rx="28" ry="24" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    {/* Hair sprouts */}
    <path d="M36 30c-2-6 0-10 2-12M44 28c0-6 2-10 4-12M56 28c0-6-2-10-4-12M64 30c2-6 0-10-2-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
    {/* Tiny cat ears */}
    <path d="M38 32l-3-6 6 3M62 32l3-6-6 3" fill="currentColor" opacity="0.3"/>
    {/* Eyes — dots */}
    <circle cx="42" cy="48" r="2.5" fill="currentColor" opacity="0.4"/>
    <circle cx="58" cy="48" r="2.5" fill="currentColor" opacity="0.4"/>
    {/* Tiny mouth */}
    <path d="M47 56c0 0 1.5 2 3 2s3-2 3-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    {/* Potato bumps */}
    <circle cx="30" cy="56" r="4" fill="currentColor" opacity="0.08"/>
    <circle cx="68" cy="48" r="5" fill="currentColor" opacity="0.08"/>
    <circle cx="50" cy="72" r="4" fill="currentColor" opacity="0.06"/>
  </svg>
)

// --- Cattermelon: watermelon with cat face ---
const CattermelonArt = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    {/* Watermelon slice */}
    <path d="M18 60a38 38 0 0164 0z" fill="currentColor" opacity="0.15"/>
    <path d="M18 60a38 38 0 0164 0z" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    {/* Rind */}
    <path d="M18 60c0 4 14 10 32 10s32-6 32-10" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="2"/>
    {/* Seeds */}
    <ellipse cx="36" cy="52" rx="2" ry="3" fill="currentColor" opacity="0.3" transform="rotate(-15 36 52)"/>
    <ellipse cx="50" cy="48" rx="2" ry="3" fill="currentColor" opacity="0.3"/>
    <ellipse cx="64" cy="52" rx="2" ry="3" fill="currentColor" opacity="0.3" transform="rotate(15 64 52)"/>
    {/* Cat ears at top */}
    <path d="M42 26l-6-10 10 6M58 26l6-10-10 6" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    {/* Cat face on watermelon */}
    <circle cx="42" cy="40" r="2.5" fill="currentColor" opacity="0.4"/>
    <circle cx="58" cy="40" r="2.5" fill="currentColor" opacity="0.4"/>
    <path d="M47 46c0 0 1.5 2 3 2s3-2 3-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
)

// --- Type to illustration map ---
const ILLUSTRATION_MAP: Record<CardType, () => React.JSX.Element> = {
  'burned': BurnedArt,
  'extraction': DefuseArt,
  'reassign': AttackArt,
  'direct-order': TargetedAttackArt,
  'go-dark': SkipArt,
  'intel-briefing': SeeTheFutureArt,
  'falsify-intel': AlterTheFutureArt,
  'burn-the-files': ShuffleArt,
  'back-channel': DrawFromBottomArt,
  'call-in-a-favor': FavorArt,
  'intercepted': NopeArt,
  'agent-x': FeralCatArt,
  'dash-barlowe': TacoCatArt,
  'vera-khan': BeardCatArt,
  'sable-ashworth': RainbowCatArt,
  'janet-broadside': HairyPotatoCatArt,
  'neal-proctor': CattermelonArt,
}

export function CardIllustration({ type }: { type: CardType }) {
  const Art = ILLUSTRATION_MAP[type]
  return (
    <span className="cardIllustration" aria-hidden="true">
      <Art />
    </span>
  )
}
