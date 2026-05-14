import type { CSSProperties } from 'react'
import styles from './Card.module.css'

export type CardKey =
  | 'burned'
  | 'extraction'
  | 'reassign'
  | 'direct-order'
  | 'go-dark'
  | 'intel-briefing'
  | 'falsify-intel'
  | 'burn-the-files'
  | 'back-channel'
  | 'call-in-a-favor'
  | 'intercepted'
  | 'dash-barlowe'
  | 'vera-khan'
  | 'sable-ashworth'
  | 'janet-broadside'
  | 'neal-proctor'
  | 'agent-x'

interface CardProps {
  card: CardKey
  /** Card name overlaid below the art. */
  name?: string
  /** Display size — `sm` for hand fans, `md` for arsenal entries, `lg` for hero showcases. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional rotation in degrees, for fanning cards in a hand. */
  tilt?: number
  /** Optional translateY in px. */
  liftPx?: number
  /** Render as `face-down` deck back, ignoring `card`. */
  faceDown?: boolean
  /** Visual treatment overlay — `dim` for muted demo cards, `glow` for hero accent. */
  treatment?: 'normal' | 'dim' | 'glow' | 'burn'
  className?: string
}

const CARD_NAMES: Record<CardKey, string> = {
  burned: 'Burned',
  extraction: 'Extraction',
  reassign: 'Reassign',
  'direct-order': 'Direct Order',
  'go-dark': 'Go Dark',
  'intel-briefing': 'Intel Briefing',
  'falsify-intel': 'Falsify Intel',
  'burn-the-files': 'Burn the Files',
  'back-channel': 'Back Channel',
  'call-in-a-favor': 'Call in a Favor',
  intercepted: 'Intercepted',
  'dash-barlowe': 'Dash Barlowe',
  'vera-khan': 'Vera Khan',
  'sable-ashworth': 'Sable Ashworth',
  'janet-broadside': 'Janet Broadside',
  'neal-proctor': 'Neal Proctor',
  'agent-x': 'Agent X',
}

/**
 * BURNED card preview — uses real card art from /public/assets/cards/.
 *
 * Sized as a standard playing-card aspect (~2.5:3.5 in real life, but BURNED
 * cards are square art with a label band, so we render closer to 5:7).
 */
export function Card({
  card,
  name,
  size = 'md',
  tilt = 0,
  liftPx = 0,
  faceDown = false,
  treatment = 'normal',
  className,
}: CardProps) {
  const style: CSSProperties = {
    transform: `rotate(${tilt}deg) translateY(${liftPx}px)`,
  }

  const displayName = name ?? CARD_NAMES[card]

  const classes = [
    styles.card,
    styles[`size-${size}`],
    styles[`tx-${treatment}`],
    faceDown ? styles.faceDown : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} style={style} role="img" aria-label={faceDown ? 'Face-down card' : displayName}>
      {faceDown ? (
        <div className={styles.back}>
          <span aria-hidden="true" className={styles.backMark}>P</span>
        </div>
      ) : (
        <>
          <img
            src={`/assets/cards/${card}.webp`}
            alt=""
            className={styles.art}
            loading="lazy"
          />
          <div className={styles.label}>
            <span>{displayName}</span>
          </div>
        </>
      )}
    </div>
  )
}
