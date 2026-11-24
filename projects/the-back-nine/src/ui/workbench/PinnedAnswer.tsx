/*
 * src/ui/workbench/PinnedAnswer.tsx — the many-futures answer, pinned beside the year-by-year table (workbench plan
 * R9, U7).
 *
 * The table shows ONE future; the answer comes from the many. So the store's own committed answer stays in view above
 * the table while it scrolls, and the table never stands alone as the answer. Nothing here is worked out again: the
 * date words are the hero's own composers (`heroLead`, `floorLineText`, `composeDateSplit`), anchored on the plan's
 * clock as the hero anchors them, and the spine's reading is the strip's (`verdictReadingText`).
 *
 * THE RESERVED BOX (insights 035, 065): the box stacks its real lines over a hidden copy of its tallest form (the
 * label, the lead, a second line and the status line) in one grid cell, so a status line arriving or leaving, or a
 * date splitting into two lines, never moves the table below it. Since the facts page (U8) an edit in the room can
 * re-figure the answer under the box, and the next answer's words can be longer than the current ones (a dated lead
 * becoming "No fuck-off date within the next 10 years…" wrapped to a second line at his laptop and moved the page
 * switch 16 px: U8's landing walk). So the hidden copy reserves the tallest of the forms the next answer can take on
 * this route (`reserveForms`): every lead candidate in one hidden cell, every second-line candidate in another.
 */
import { copy } from '../copy'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { pinnedLines, reserveForms } from './pinnedLines'

export function PinnedAnswer({ snapshot, wallCalendarYear }: { readonly snapshot: MemoryModelSnapshot; readonly wallCalendarYear: number }) {
  const lines = pinnedLines(snapshot, wallCalendarYear)
  const reserve = reserveForms(snapshot, wallCalendarYear)
  return (
    <section className="wb-pin" aria-labelledby="wb-pin-label">
      <div className="wb-pin__stack">
        <div className="wb-pin__real">
          <p className="wb-pin__label">
            <span id="wb-pin-label">{copy.workbenchPinnedLabel}</span>
            {/* Spoken through the room's one live region on the change (WorkbenchRoom): no role of its own. */}
            {lines.status !== undefined && (
              <span className="wb-pin__status">
                {' '}
                {lines.status}
              </span>
            )}
          </p>
          <p className="wb-pin__lead">{lines.lead}</p>
          {lines.second !== undefined && <p className="wb-pin__second">{lines.second}</p>}
        </div>
        {/* The box's tallest form, never seen or read: it holds the height so nothing below moves. Each cell stacks
            its candidates in one grid area, so the cell is as tall as the tallest of them. */}
        <div className="wb-pin__ghost" aria-hidden="true">
          {/* The label line with each status it can carry: worked out again, or provisional. */}
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
          {/* Only the date route ever draws a second line (a split date's floor line). */}
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
