import styles from './LiveLinkButton.module.css'

/**
 * The shared external-link button for the detail page's invitation movement (Phase 5).
 * Built here as its only consumer — the project tiles are clean (no buttons, ideation §3),
 * so Phase 5 is the FIRST surface to pass real author-config URLs. Always emits
 * `target="_blank" rel="noopener noreferrer"` (security — opener isolation on external links).
 *
 * One style, label varies: `"Try it →"` (live) / `"Source →"` (repo). NOT gold — the page's
 * one gold moment is the tokens total; these are outline pills (the page's interactive accent).
 */
export function LiveLinkButton({ href, label = 'Try it →' }: { href: string; label?: string }) {
  return (
    <a className={styles.button} href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}
