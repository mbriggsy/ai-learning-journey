import { entryCopy } from '@ui/entryCopy'
import { Button } from '@ui/kit/Button'
import { OutLink } from '@ui/kit/OutLink'
import { TextLink, VaultCard, VaultPage } from '@ui/kit/VaultCard'
import { EXTERNAL_LINKS } from './links'

/**
 * The cold-start frame — the brand-new user's first screen and the single home
 * of the married-couple precondition line. ONE calm entry, not a marketing
 * page: R1's question as the product's face, one orientation line, the
 * pre-flight note (the PRIMARY affordance for the ACA sourcing stall — D1
 * decided affordance (a): the no-write-until-Save seam makes park-and-resume
 * in-session only, so arriving prepared beats recovering later), and one
 * action into question 1. The R13 honest-limits note is NOT re-owned here — it
 * lives app-wide (App's trailing caveat).
 *
 * Act 6 · RC19: drawn as the vault screens' login card (`src/ui/kit/VaultCard.tsx`): the wordmark, the question as the
 * page's h1, the orientation and the pre-flight note with its two quote links (the kit's `OutLink`, a new tab each),
 * "Start a new plan" as the blue primary, and the restore door as a quiet link beneath it.
 */
export function ColdStart({ onBegin, onRestore }: { onBegin: () => void; onRestore: () => void }) {
  return (
    <VaultPage>
      <VaultCard wordmark={{ mark: entryCopy.shellMark, title: entryCopy.appTitle }} className="wide:max-w-[36rem]">
        <section className="flex flex-col gap-6" data-cold-start="">
          <div className="flex flex-col gap-3">
            <h1 className="text-chart-title font-semibold text-stone-900 wide:text-page-title compact:text-chart-title">{entryCopy.coldStartQuestion}</h1>
            <p className="text-intro text-stone-600">{entryCopy.coldStartOrientation}</p>
          </div>
          <aside className="flex flex-col gap-2 rounded-card border border-stone-300 bg-stone-100 p-4 text-body text-stone-900" data-cold-start-preflight="">
            <p>{entryCopy.coldStartPreflight}</p>
            <p className="text-label text-stone-600">
              {entryCopy.linkGetQuote} <OutLink href={EXTERNAL_LINKS.healthcareGov}>{entryCopy.linkHealthcareGov}</OutLink>
              {' · '}
              <OutLink href={EXTERNAL_LINKS.kffCalculator}>{entryCopy.linkKffCalculator}</OutLink>
            </p>
          </aside>
          <div className="flex flex-col gap-2">
            <Button variant="primary" className="w-full" onClick={onBegin}>
              {entryCopy.coldStartBegin}
            </Button>
            {/* The rare returning-but-wiped user's door — a quiet link BENEATH the primary, never a peer to it (R11
                invited-not-nagged; back-nine-design: a subordinate affordance must not compete). A new/evicted device
                probes no-vault → here, and a saved backup is the way back. */}
            <p className="flex flex-wrap items-center gap-x-2 text-body text-stone-600" data-cold-start-restore="">
              {entryCopy.coldStartRestorePrompt}
              <TextLink onClick={onRestore}>{entryCopy.coldStartRestoreAction}</TextLink>
            </p>
          </div>
        </section>
      </VaultCard>
    </VaultPage>
  )
}
