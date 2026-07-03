import { copy } from '@ui/copy'
import { ExternalLink } from './ExternalLink'
import { EXTERNAL_LINKS } from './links'
import './intake.css'

/**
 * The cold-start frame — the brand-new user's first screen and the single home
 * of the married-couple precondition line. ONE calm entry, not a marketing
 * page: R1's question as the product's face, one orientation line, the
 * pre-flight note (the PRIMARY affordance for the ACA sourcing stall — D1
 * decided affordance (a): the no-write-until-Save seam makes park-and-resume
 * in-session only, so arriving prepared beats recovering later), and one
 * action into question 1. The R13 honest-limits note is NOT re-owned here — it
 * lives app-wide via the U0 shell.
 */
export function ColdStart({ onBegin, onRestore }: { onBegin: () => void; onRestore: () => void }) {
  return (
    <div className="cold-start">
      <span className="intake-wordmark">{copy.appTitle}</span>
      <h1 className="cold-start-question">{copy.coldStartQuestion}</h1>
      <p className="cold-start-orientation">{copy.coldStartOrientation}</p>
      <aside className="cold-start-preflight">
        <p>{copy.coldStartPreflight}</p>
        <p className="resource-links">
          {copy.linkGetQuote}{' '}
          <ExternalLink href={EXTERNAL_LINKS.healthcareGov}>{copy.linkHealthcareGov}</ExternalLink>
          {' · '}
          <ExternalLink href={EXTERNAL_LINKS.kffCalculator}>{copy.linkKffCalculator}</ExternalLink>
        </p>
      </aside>
      <button type="button" className="btn-primary" onClick={onBegin}>
        {copy.coldStartBegin}
      </button>
      {/* The rare returning-but-wiped user's door — a quiet whisper BENEATH the primary Begin, never
          a peer to it (R11 invited-not-nagged; back-nine-design: a subordinate affordance must not
          compete). A new/evicted device probes no-vault → here, and a saved backup is the way back. */}
      <p className="cold-start-restore">
        {copy.coldStartRestorePrompt}{' '}
        <button type="button" className="btn-quiet" onClick={onRestore}>
          {copy.coldStartRestoreAction}
        </button>
      </p>
    </div>
  )
}
