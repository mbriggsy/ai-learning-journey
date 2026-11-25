/**
 * src/ui/screens/profile/CardsPage.tsx: a Profile section's page of cards (Act 6 · RC13a; ref 2.4;
 * `rc-shell/profile-05.png`, `profile-07.png`): the section's name as the page title with its plain sentence under it, the
 * blue "Add … >" menu at the head's right, then the cards in rows of four at his window (one column on the phone), each
 * opening its drawer. Draws `profileView.ts`'s view and decides nothing. Family, Income, Savings, Expenses and Goals
 * are this page. No panel (ref 2.4: the grid sits straight under the head), so `PageFrame` is `bare`.
 */
import type { Ref } from 'react'
import { AddMenu, PageFrame, ProfileCard, type AddMenuEntry } from '../../kit'
import { ProfileIcon } from './profileIcons'
import type { AddMenuView, CardsPageView, DrawerTarget } from './profileView'

export function addEntries(add: AddMenuView, onOpen: (t: DrawerTarget) => void): readonly AddMenuEntry[] {
  return add.items.map((item) =>
    'items' in item
      ? { id: item.id, label: item.label, items: item.items.map((leaf) => ({ id: leaf.id, label: leaf.label, onSelect: () => onOpen(leaf.target) })) }
      : { id: item.id, label: item.label, onSelect: () => onOpen(item.target) },
  )
}

export interface CardsPageProps {
  readonly screen: string
  readonly title: string
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: CardsPageView
  /** The card whose drawer is open (null: none). */
  readonly selected: string | null
  /** Open a card's drawer; the card's own id goes with it (focus returns there on close). */
  readonly onOpen: (target: DrawerTarget, card?: string) => void
}

export function CardsPage({ screen, title, headingRef, view, selected, onOpen }: CardsPageProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen={screen}>
      <PageFrame
        bare
        title={title}
        headingRef={headingRef}
        intro={view.intro}
        {...(view.add !== null ? { headAction: <AddMenu label={view.add.label} items={addEntries(view.add, onOpen)} /> } : {})}
      >
        <div className="flex flex-col gap-6">
          {view.cards.length > 0 ? (
            <ul className="flex flex-col gap-6 wide:flex-row wide:flex-wrap" data-profile-cards="">
              {view.cards.map((c) => (
                <li key={c.id} className="flex wide:w-72">
                  <ProfileCard
                    cardId={c.id}
                    kind={c.kind}
                    {...(c.icon !== null ? { icon: <ProfileIcon icon={c.icon} /> } : {})}
                    name={c.name}
                    rows={c.rows}
                    {...(c.note !== undefined ? { note: c.note } : {})}
                    selected={selected === c.id}
                    dimmed={selected !== null}
                    onOpen={() => onOpen(c.target, c.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {view.lines.map((l) => (
            <p key={l} className="max-w-[56rem] text-body text-stone-600" data-profile-line="">
              {l}
            </p>
          ))}
        </div>
      </PageFrame>
    </div>
  )
}
