/*
 * src/ui/workbench/FactsPage.tsx — the facts page (Act 5, U8; R14, R15): everything the household told the tool,
 * by the walk's own steps, each group behind one door. It renders what `composeFacts` returns and nothing else.
 *
 * A group's door is a quiet "Edit" named for the group it opens ("Edit social Security" never reads as a bare
 * "Edit" to a screen reader). A read-only tab gets the page with no door at all: no control that writes is present
 * (U6's rule). Each line is a label and the value as given (R11: exact, never "~"), stamped with the draft fields
 * it reads (`data-fact`, the field walk's half) inside the door it sits behind (`data-fact-door`).
 */
import { useId } from 'react'
import { copy, slots } from '../copy'
import type { FactDoorId } from './factRegistry'
import type { FactGroup, FactLine, FactSection } from './factsChrome'

export interface FactsPageProps {
  readonly sections: readonly FactSection[]
  /** Open a door. Absent ⇒ a read-only tab: no door is drawn. */
  readonly onOpen?: (door: FactDoorId) => void
}

/** A door, named for what it opens. `'none'` draws nothing (a value with no editor here). */
function Door({ door, name, onOpen }: { readonly door: FactDoorId; readonly name: string; readonly onOpen: FactsPageProps['onOpen'] }) {
  if (door === 'none' || onOpen === undefined) return null
  return (
    <button
      type="button"
      className="btn-quiet wb-facts__edit"
      aria-label={slots.workbenchFactsEditName(name)}
      data-fact-open={door}
      onClick={() => onOpen(door)}
    >
      {copy.workbenchFactsEdit}
    </button>
  )
}

function Line({ line, onOpen }: { readonly line: FactLine; readonly onOpen: FactsPageProps['onOpen'] }) {
  return (
    <div
      className="wb-facts__line"
      data-fact={line.facts.length > 0 ? line.facts.join(' ') : undefined}
      data-fact-door={line.door}
    >
      <dt className="wb-facts__label">{line.label}</dt>
      <dd className="wb-facts__value">
        <span className="wb-facts__figure">{line.value}</span>
        {line.note !== undefined && (
          // The note's cell holds its other notes hidden (`noteReserve`), so a change of note never moves the page.
          <span className="wb-facts__note-cell">
            <span className="wb-facts__note">{line.note}</span>
            {(line.noteReserve ?? []).map((n) => (
              <span key={n} className="wb-facts__note wb-facts__note--reserve" aria-hidden="true">
                {n}
              </span>
            ))}
          </span>
        )}
        {line.door !== undefined && <Door door={line.door} name={line.label} onOpen={onOpen} />}
      </dd>
    </div>
  )
}

function Group({ group, onOpen }: { readonly group: FactGroup; readonly onOpen: FactsPageProps['onOpen'] }) {
  return (
    <div className="wb-facts__group" data-fact-door={group.door}>
      {group.heading !== undefined && (
        <div className="wb-facts__group-head">
          <h4 className="wb-facts__group-heading" data-fact={group.headingFacts?.join(' ')}>
            {group.heading}
          </h4>
          {group.door !== undefined && <Door door={group.door} name={group.heading} onOpen={onOpen} />}
        </div>
      )}
      <dl className="wb-facts__lines">
        {group.lines.map((line, i) => (
          <Line key={i} line={line} onOpen={onOpen} />
        ))}
      </dl>
      {group.note !== undefined && <p className="wb-facts__foot">{group.note}</p>}
    </div>
  )
}

function Section({ section, onOpen }: { readonly section: FactSection; readonly onOpen: FactsPageProps['onOpen'] }) {
  const titleId = useId()
  return (
    <section
      className="wb-facts__section"
      aria-labelledby={titleId}
      data-fact-section={section.id}
      data-fact-door={section.door ?? undefined}
    >
      <div className="wb-facts__head">
        <h3 id={titleId} className="wb-facts__title">
          {section.title}
        </h3>
        {section.door !== null && <Door door={section.door} name={section.title} onOpen={onOpen} />}
      </div>
      {section.empty !== undefined && <p className="wb-facts__empty">{section.empty}</p>}
      {section.groups.map((group, i) => (
        <Group key={i} group={group} onOpen={onOpen} />
      ))}
      {section.foot !== undefined && <p className="wb-facts__foot">{section.foot.text}</p>}
    </section>
  )
}

export function FactsPage({ sections, onOpen }: FactsPageProps) {
  return (
    <div className="wb-facts">
      <p className="wb-facts__intro">{onOpen === undefined ? copy.workbenchFactsReadOnly : copy.workbenchFactsIntro}</p>
      <div className="wb-facts__sections">
        {sections.map((section) => (
          <Section key={section.id} section={section} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}
