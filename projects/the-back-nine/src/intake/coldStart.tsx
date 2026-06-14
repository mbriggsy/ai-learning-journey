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
export function ColdStart({ onBegin }: { onBegin: () => void }) {
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
    </div>
  )
}
