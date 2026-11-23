/*
 * src/ui/workbench/WorkbenchRoom.tsx — the workbench room (Act 5, U6; workbench plan KTD31).
 *
 * The LAZY half: `RoomSlot.tsx` loads this module on demand behind its own error boundary, so the
 * front room's first paint never pays for it. The room is a phase of the intake app (IntakeApp owns the
 * phase, the history entry and the save machine); this component only draws what it is handed.
 *
 * What it holds today: the way back, the plan's save control from the one save machine (so a household
 * can save here and the two screens never disagree about disk), and the ask a Back press raises over an
 * entry still open. U7 adds the year-by-year table under the heading, and U8 the facts page.
 */
import { useEffect, useRef } from 'react'
import { SaveSlot, useSaveAnnouncer, type ResultSaveProp } from '../SaveSlot'
import { copy } from '../copy'
import './workbench.css'

export interface WorkbenchRoomProps {
  /** The plan's save control, derived by IntakeApp from the one save machine. A read-only tab gets
   *  `none` (the machine's own rule), so the room draws no write control there. */
  readonly save: ResultSaveProp
  /** The way back to the answer. IntakeApp makes it a real history Back, so the browser's Back and this
   *  button are one path. */
  readonly onBack: () => void
  /** Present while a Back press is held over an entry still open in the room (the press can't be
   *  cancelled, so IntakeApp put the room's history entry back and asks here first). */
  readonly leaveAsk?: { readonly onGo: () => void; readonly onStay: () => void }
}

export default function WorkbenchRoom({ save, onBack, leaveAsk }: WorkbenchRoomProps) {
  const announcer = useSaveAnnouncer(save.kind)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Focus to the room's heading on arrival (the project's step-change pattern): it announces the page
  // and brings its top into view, since the door sits below the answer's fold.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className="workbench">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="workbench__bar">
        <button type="button" className="btn-quiet workbench__back" onClick={onBack}>
          {copy.workbenchBack}
        </button>
      </div>
      {leaveAsk !== undefined && (
        <div className="workbench__ask" role="alert">
          <p className="workbench__ask-text">{copy.workbenchLeaveAsk}</p>
          <div className="workbench__ask-actions">
            <button type="button" className="btn-primary" onClick={leaveAsk.onStay}>
              {copy.workbenchLeaveStay}
            </button>
            <button type="button" className="btn-quiet" onClick={leaveAsk.onGo}>
              {copy.workbenchLeaveGo}
            </button>
          </div>
        </div>
      )}
      <h2 ref={headingRef} className="workbench__heading" tabIndex={-1}>
        {copy.workbenchHeading}
      </h2>
      <SaveSlot save={save} />
    </main>
  )
}
