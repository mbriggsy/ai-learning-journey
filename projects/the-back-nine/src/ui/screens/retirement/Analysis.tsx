/**
 * src/ui/screens/retirement/Analysis.tsx: Retirement → Analysis, the page (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC4; ref 2.7). The title, the intro line (the page's answer in a plain sentence: the confidence statement on the
 * retired route, the two-dates sentence on the working route, with the re-figuring line or the provisional tag above
 * it), the folder tabs (Probability; Confidence arrives at RC7), "Today’s dollars" beside them, and the panel with its
 * R13 caveat last, named by the answer (`verdictDescribedBy`). No ACTION ITEMS handle yet: the tray is RC4b's, and a
 * handle that opens nothing is a dead control.
 */
import type { Ref } from 'react'
import { Caveat, PageFrame } from '../../kit'
import { copy } from '../../copy'
import { ProbabilityPanel, ProbabilityWaiting, type ProbabilityPanelProps } from './Probability'
import type { ProbabilityView } from './probabilityView'

export interface AnalysisProps extends Omit<ProbabilityPanelProps, 'view'> {
  readonly view: ProbabilityView
  readonly headingRef: Ref<HTMLHeadingElement>
  /** The interim What if page (its levers until RC4b's tray): a folder tab that opens it. */
  readonly whatIfTab: { readonly href: string; readonly onOpen: () => void }
}

type TabId = 'probability' | 'what-if'
// The What if tab is interim: it opens the old What if page (its levers) until RC4b's tray replaces it.
const TABS: readonly { readonly id: TabId; readonly label: string }[] = [
  { id: 'probability', label: copy.probabilityTab },
  { id: 'what-if', label: copy.workbenchPageWhatIf },
]

export function Analysis({ view, headingRef, whatIfTab, ...panel }: AnalysisProps) {
  const intro =
    view.kind === 'reading' ? (
      <div className="flex flex-col gap-1" data-analysis-intro="">
        {/* The re-figuring line, below the laptop's two-column head: in the flow above the answer it qualifies. */}
        {view.intro.eyebrow !== undefined ? (
          <p className="text-label font-semibold text-stone-900 wide:hidden" data-intro-eyebrow="">
            {view.intro.eyebrow}
          </p>
        ) : null}
        <p className="text-intro text-stone-900" data-intro-lead="">
          {view.intro.lead}
        </p>
        {view.intro.lines.map((line) => (
          <p key={line} className="text-label text-stone-600">
            {line}
          </p>
        ))}
      </div>
    ) : undefined
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="analysis">
      <PageFrame
        title={copy.analysisTitle}
        headingRef={headingRef}
        {...(intro !== undefined ? { intro } : {})}

        tabs={{ label: copy.analysisTabsLabel, items: TABS, value: 'probability', onValueChange: (id) => (id === 'what-if' ? whatIfTab.onOpen() : undefined) }}
        // Past the phone tier the re-figuring line rides the folder tabs' row, beside the values note, where the row's
        // height is the tabs' own: neither the answer above it nor the R13 caveat moves when it comes and goes (the old
        // answer page's reserved-slot law; beside the title it squeezed the intro into more lines).
        valuesNote={
          view.kind === 'reading' && view.intro.eyebrow !== undefined ? (
            <span className="flex flex-wrap items-baseline gap-x-4">
              <span>{copy.probabilityTodaysDollars}</span>
              <span className="hidden font-semibold text-stone-900 wide:inline" data-intro-eyebrow="">
                {view.intro.eyebrow}
              </span>
            </span>
          ) : (
            copy.probabilityTodaysDollars
          )
        }
        caveat={<Caveat lines={view.caveat} />}
      >
        {view.kind === 'reading' ? <ProbabilityPanel view={view} {...panel} /> : <ProbabilityWaiting view={view} />}
      </PageFrame>
    </div>
  )
}
