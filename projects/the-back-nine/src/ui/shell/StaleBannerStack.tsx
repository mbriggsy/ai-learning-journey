/**
 * src/ui/shell/StaleBannerStack.tsx: the StaleBanner above Snapshot and Probability (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4 "Interim homes"; section 4.0's disclosure map). Draws `staleLines.ts`'s
 * lines and decides nothing: the staleness note (with its moved-left-over clause where a rules line hosts it), the
 * aged-balances line (its door the guided re-walk, where the tab can write), and the ONE standing line, its door opening
 * the assumptions panel at that cause's seat (the gear's drawer until RC13). The standing line keeps the old hero's
 * element shapes (a paragraph with the door inline after its sentence; a block of labelled parts with the door last),
 * so its laws and its tests carried over unchanged; its door wears the kit's secondary button.
 */
import { buttonClasses, StaleBanner } from '../kit'
import { NotePartsBlock } from '../NotePartsBlock'
import { isPlainNote } from '../noteParts'
import type { AssumptionLandingSeat } from '../assumptionRegistry'
import type { StaleLine } from './staleLines'

export interface StaleBannerStackProps {
  readonly lines: readonly StaleLine[]
  /** Open the assumptions panel at a seat (the standing line's door). */
  readonly onOpenSeat: (seat: AssumptionLandingSeat) => void
  /** The guided re-walk (the aged line's door); absent: no door. */
  readonly onReconfirm?: () => void
}

/** The standing line's door: the kit's secondary button (exported so the ported tests pin the markup they read). */
export const STANDING_DOOR_CLASSES = buttonClasses('secondary', 'sm', 'band-premise__cta ml-1 align-baseline')
const DOOR = STANDING_DOOR_CLASSES

export function StaleBannerStack({ lines, onOpenSeat, onReconfirm }: StaleBannerStackProps) {
  if (lines.length === 0) return null
  return (
    <div className="rc-root mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-4 pt-4 wide:px-10" data-stale-banner="">
      {lines.map((line) => {
        if (line.kind === 'standing') {
          const door =
            line.door === undefined ? undefined : (
              <button type="button" className={`${DOOR} note-parts__cta`} onClick={() => onOpenSeat(line.door!.seat)}>
                {line.door.label}
              </button>
            )
          return (
            <StaleBanner
              key={line.kind}
              message={
                isPlainNote(line.parts) ? (
                  <p className="cs-paycheck-note">
                    <span>{line.parts.opening}</span>
                    {line.door !== undefined && (
                      <>
                        {' '}
                        <button type="button" className={DOOR} onClick={() => onOpenSeat(line.door!.seat)}>
                          {line.door.label}
                        </button>
                      </>
                    )}
                  </p>
                ) : (
                  <NotePartsBlock className="cs-paycheck-note" parts={line.parts} button={door} />
                )
              }
            />
          )
        }
        if (line.kind === 'staleness') return <StaleBanner key={line.kind} message={<p className="cs-staleness-note">{line.text}</p>} />
        return (
          <StaleBanner
            key={line.kind}
            message={<p className="cs-aged-note">{line.text}</p>}
            {...(line.door !== undefined && onReconfirm !== undefined ? { action: { label: line.door.label, onSelect: onReconfirm } } : {})}
          />
        )
      })}
    </div>
  )
}
