import type { CardType } from '@shared/types'

// 7 shape categories, filled shapes for small-size visibility (20x20 viewBox)
// Inline SVG, aria-hidden (parent card's aria-label covers semantics)

const Skull = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 2C6 2 3 5 3 9c0 2.5 1.2 4.5 3 5.5V17h8v-2.5c1.8-1 3-3 3-5.5 0-4-3-7-7-7zM7 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 17v1h4v-1H8z" fill="currentColor"/>
  </svg>
)

const Shield = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 1L3 4v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V4l-7-3zm0 3l4 2v3.5c0 3.2-1.8 5.5-4 6.5-2.2-1-4-3.3-4-6.5V6l4-2z" fill="currentColor"/>
  </svg>
)

const Lightning = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M11 1L4 11h5l-1 8 7-10h-5l1-8z" fill="currentColor"/>
  </svg>
)

const Eye = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 4C5 4 1.5 10 1.5 10s3.5 6 8.5 6 8.5-6 8.5-6S15 4 10 4zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>
  </svg>
)

const Hand = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M14 2a1 1 0 00-1 1v5h-1V3a1 1 0 10-2 0v5H9V4a1 1 0 10-2 0v6l-1.5-2a1.2 1.2 0 00-1.7 0 1.2 1.2 0 000 1.7L8 15c1 1.5 2 3 5 3 3 0 4-2 4-5V3a1 1 0 00-1-1h-2z" fill="currentColor"/>
  </svg>
)

const CancelX = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4.3 2.9L2.9 4.3 8.6 10l-5.7 5.7 1.4 1.4L10 11.4l5.7 5.7 1.4-1.4L11.4 10l5.7-5.7-1.4-1.4L10 8.6 4.3 2.9z" fill="currentColor"/>
  </svg>
)

const Silhouette = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM4 16c0-3 2.5-5 6-5s6 2 6 5v2H4v-2z" fill="currentColor"/>
  </svg>
)

const ICON_MAP: Record<CardType, () => React.JSX.Element> = {
  'burned': Skull,
  'extraction': Shield,
  'reassign': Lightning,
  'direct-order': Lightning,
  'go-dark': Lightning,
  'intel-briefing': Eye,
  'falsify-intel': Eye,
  'burn-the-files': Eye,
  'back-channel': Hand,
  'call-in-a-favor': Hand,
  'agent-x': Hand,
  'intercepted': CancelX,
  'dash-barlowe': Silhouette,
  'vera-khan': Silhouette,
  'sable-ashworth': Silhouette,
  'janet-broadside': Silhouette,
  'neal-proctor': Silhouette,
}

export function CardIcon({ type }: { type: CardType }) {
  const Icon = ICON_MAP[type]
  return (
    <span data-testid="card-type-badge" className="cardBadge">
      <Icon />
    </span>
  )
}
