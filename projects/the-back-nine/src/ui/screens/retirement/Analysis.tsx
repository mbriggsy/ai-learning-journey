/**
 * src/ui/screens/retirement/Analysis.tsx: Retirement → Analysis, the page (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC4; ref 2.7, 2.8). The title, the intro line (the page's answer in a plain sentence: the confidence statement on the
 * retired route, the two-dates sentence on the working route, with the re-figuring line or the provisional tag above
 * it), the folder tabs (Probability; Confidence arrives at RC7), "Today’s dollars" beside them, the panel with its R13
 * caveat last, named by the answer (`verdictDescribedBy`), and the ACTION ITEMS handle centred on the panel's bottom
 * edge, which opens the tray under the panel (RC4b, `ActionItemsTray.tsx`). The handle and the tray show only over a
 * reading: before one there is nothing to change.
 */
import type { ReactNode, Ref } from 'react'
import { Caveat, PageFrame, type PageFrameHandle } from '../../kit'
import { copy } from '../../copy'
import { ProbabilityPanel, ProbabilityWaiting, type ProbabilityPanelProps } from './Probability'
import type { ProbabilityView } from './probabilityView'

export interface AnalysisProps extends Omit<ProbabilityPanelProps, 'view'> {
  readonly view: ProbabilityView
  readonly headingRef: Ref<HTMLHeadingElement>
  /** The ACTION ITEMS handle and the tray it opens (over a reading only). */
  readonly handle?: PageFrameHandle
  readonly tray?: ReactNode
}

const TABS = [{ id: 'probability', label: copy.probabilityTab }] as const

export function Analysis({ view, headingRef, handle, tray, ...panel }: AnalysisProps) {
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
  const reading = view.kind === 'reading'
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="analysis">
      <PageFrame
        title={copy.analysisTitle}
        headingRef={headingRef}
        {...(intro !== undefined ? { intro } : {})}
        tabs={{ label: copy.analysisTabsLabel, items: TABS, value: 'probability', onValueChange: () => undefined }}
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
        {...(reading && handle !== undefined ? { handle } : {})}
        {...(reading && tray !== undefined ? { tray } : {})}
      >
        {view.kind === 'reading' ? <ProbabilityPanel view={view} {...panel} /> : <ProbabilityWaiting view={view} />}
      </PageFrame>
    </div>
  )
}
