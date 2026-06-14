import type { ReactNode } from 'react'

/**
 * A link to an external resource the intake points to (the ACA quote, the SS statement).
 *
 * Opens in a NEW TAB so a same-tab navigation never discards the in-memory, not-yet-saved intake
 * (no-write-until-Save). `rel="noopener noreferrer"` closes the reverse-tabnabbing channel and
 * withholds the referrer. The label is passed as children (a copy expression — the no-inline-copy
 * lint covers the call sites). `href`/`target`/`rel` are not user-facing copy, so they stay here.
 *
 * A decorative ↗ (CSS ::after on .external-link) signals "opens elsewhere"; it is aria-hidden, so
 * the accessible name stays exactly the label.
 */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="external-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
