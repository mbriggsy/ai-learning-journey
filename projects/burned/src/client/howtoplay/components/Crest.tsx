import styles from './Crest.module.css'

interface CrestProps {
  /** Crest size — affects diameter only; internal geometry scales via em. */
  size?: 'sm' | 'md' | 'lg'
  /** Render variant. `image` uses the Imagen-generated PNG; `svg` is the vector fallback. */
  variant?: 'image' | 'svg'
  className?: string
}

/**
 * Pendleton Agency crest seal.
 *
 * `variant="image"` (default) renders the Imagen-generated PNG seal — richer
 * laurel wreath, hand-stamped texture, integrated typography. Best at large
 * sizes (cover hero, signoff).
 *
 * `variant="svg"` renders a pure-vector fallback — Saul Bass / Bond
 * vocabulary, currentColor-driven so it tints with surrounding text. Best at
 * tiny sizes where the photo would muddy.
 */
export function Crest({ size = 'md', variant = 'image', className }: CrestProps) {
  if (variant === 'image') {
    return (
      <img
        src="/assets/howtoplay/pendleton-crest.png"
        alt="The Pendleton Agency crest"
        className={[styles.crest, styles[`size-${size}`], styles.image, className].filter(Boolean).join(' ')}
        loading="eager"
        draggable={false}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 200 200"
      className={[styles.crest, styles[`size-${size}`], className].filter(Boolean).join(' ')}
      role="img"
      aria-label="The Pendleton Agency crest"
    >
      <defs>
        <path
          id="crest-outer-path"
          d="M 100 100 m -82 0 a 82 82 0 1 1 164 0 a 82 82 0 1 1 -164 0"
        />
        <path
          id="crest-inner-path"
          d="M 100 100 m -55 0 a 55 55 0 1 1 110 0 a 55 55 0 1 1 -110 0"
        />
        <filter id="crest-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" />
        </filter>
      </defs>

      {/* Outer rings */}
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />

      {/* Text on outer ring */}
      <text className={styles.outerText}>
        <textPath href="#crest-outer-path" startOffset="0%">
          THE PENDLETON AGENCY · EST. 1962 ·
        </textPath>
      </text>

      {/* Inner ring */}
      <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />

      {/* Inner classification text */}
      <text className={styles.innerText}>
        <textPath href="#crest-inner-path" startOffset="25%">TS // SCI</textPath>
      </text>
      <text className={styles.innerText}>
        <textPath href="#crest-inner-path" startOffset="75%">EYES ONLY</textPath>
      </text>

      {/* Crossed implements — fountain pen + cocktail pick */}
      <g className={styles.crossed}>
        {/* Pen — angled \ */}
        <line x1="68" y1="68" x2="132" y2="132" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <polygon points="130,134 138,138 134,130" fill="currentColor" />
        {/* Cocktail pick — angled / */}
        <line x1="132" y1="68" x2="68" y2="132" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="66" cy="134" r="4" fill="currentColor" />
        <circle cx="62" cy="138" r="2.5" fill="currentColor" opacity="0.5" />
      </g>

      {/* Center medallion */}
      <circle cx="100" cy="100" r="14" fill="currentColor" opacity="0.92" />
      <text x="100" y="105" textAnchor="middle" className={styles.centerText}>P</text>

      {/* Laurel half-rings */}
      <path
        d="M 30 100 Q 40 65 65 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <path
        d="M 170 100 Q 160 65 135 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* Laurel leaves */}
      {[35, 50, 65, 80].map((y) => (
        <g key={`l-${y}`}>
          <ellipse cx={Math.round(36 + (y - 35) * 0.5)} cy={y + 50} rx="4" ry="2" fill="currentColor" opacity="0.55" transform={`rotate(-30 ${36 + (y - 35) * 0.5} ${y + 50})`} />
          <ellipse cx={Math.round(164 - (y - 35) * 0.5)} cy={y + 50} rx="4" ry="2" fill="currentColor" opacity="0.55" transform={`rotate(30 ${164 - (y - 35) * 0.5} ${y + 50})`} />
        </g>
      ))}

      {/* Subtle ink-bleed noise overlay */}
      <rect width="200" height="200" filter="url(#crest-noise)" opacity="0.5" />
    </svg>
  )
}
