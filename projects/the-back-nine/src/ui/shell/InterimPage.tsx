/**
 * src/ui/shell/InterimPage.tsx: the plain container an interim tab rides in (plan docs/plans/6-rightcapital-ui-plan.md,
 * section 3.1, "How the shell arrives"). The workbench room's three pages keep their old look inside the shell until
 * their units rebuild them, so this container is deliberately OUTSIDE any `.rc-root` subtree: the scoped preflight in
 * `theme.css` never reaches it, and the legacy layer's margins, borders and padding hold (the fit harness's
 * `e2e/rc-screens.spec.ts` reads one). It imports `workbench.css`, which only the room imported before.
 *
 * Above each page: the one-line banner (so the mix of looks is never mistaken for the finished design, an `.rc-root`
 * of its own beside the container), the page's heading, and the intro line: the many-futures answer, the store's own,
 * as the room pinned it (`pinnedLines.ts`; R9: a one-future table never stands alone as the answer). The intro holds
 * the tallest of the forms the next answer can take on its route in a hidden copy (insights 035, 065), so an edit on
 * the facts page that re-figures the answer moves no tap target below it.
 */
import type { ReactNode, Ref } from 'react'
import { Info } from 'lucide-react'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { copy } from '../copy'
import { pinnedLines, reserveForms } from '../workbench/pinnedLines'
import '../workbench/workbench.css'

export function InterimIntro({ snapshot, wallCalendarYear }: { readonly snapshot: MemoryModelSnapshot; readonly wallCalendarYear: number }) {
  const lines = pinnedLines(snapshot, wallCalendarYear)
  const reserve = reserveForms(snapshot, wallCalendarYear)
  return (
    <section className="wb-pin" aria-labelledby="wb-pin-label">
      <div className="wb-pin__stack">
        <div className="wb-pin__real">
          <p className="wb-pin__label">
            <span id="wb-pin-label">{copy.workbenchPinnedLabel}</span>
            {/* Spoken through the shell's one live region on the change: no role of its own. */}
            {lines.status !== undefined && <span className="wb-pin__status"> {lines.status}</span>}
          </p>
          <p className="wb-pin__lead">{lines.lead}</p>
          {lines.second !== undefined && <p className="wb-pin__second">{lines.second}</p>}
        </div>
        {/* The box's tallest form, never seen or read: it holds the height so nothing below moves. */}
        <div className="wb-pin__ghost" aria-hidden="true">
          <div className="wb-pin__cell">
            {[copy.workbenchPinnedRefiguring, copy.answerProvisionalTag].map((status) => (
              <p key={status} className="wb-pin__label">
                {copy.workbenchPinnedLabel} {status}
              </p>
            ))}
          </div>
          <div className="wb-pin__cell">
            {[lines.lead, ...reserve.leads].map((lead, i) => (
              <p key={i} className="wb-pin__lead">
                {lead}
              </p>
            ))}
          </div>
          {snapshot.answer.kind === 'date' && (
            <div className="wb-pin__cell">
              {[...(lines.second !== undefined ? [lines.second] : []), ...reserve.seconds].map((second, i) => (
                <p key={i} className="wb-pin__second">
                  {second}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export interface InterimPageProps {
  readonly title: string
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly snapshot: MemoryModelSnapshot
  readonly wallCalendarYear: number
  /** Drawn between the intro and the page (the leave ask, the market switch). */
  readonly above?: ReactNode
  readonly children: ReactNode
}

export function InterimPage({ title, headingRef, snapshot, wallCalendarYear, above, children }: InterimPageProps) {
  return (
    <>
      <div className="rc-root mx-auto w-full max-w-[90rem] px-4 pt-4 wide:px-10">
        <p data-interim-banner="" className="flex min-h-8 items-center gap-2 border-l-3 border-stone-300 py-1 pl-3 text-label text-stone-600">
          <Info size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          {copy.shellInterimBanner}
        </p>
      </div>
      <div className="shell-interim">
        <h2 ref={headingRef} className="shell-interim__title" tabIndex={-1}>
          {title}
        </h2>
        <InterimIntro snapshot={snapshot} wallCalendarYear={wallCalendarYear} />
        {above}
        {children}
      </div>
    </>
  )
}
