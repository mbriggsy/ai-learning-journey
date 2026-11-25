/**
 * src/ui/screens/profile/NetWorth.tsx: Profile → Net Worth, master-detail (Act 6 · RC13a; ref 2.5;
 * `rc-shell/planoverview-01.png`, `profile-02.png`, `form-card-01.png`, `bp-networth-22.png`). Draws `profileView.ts`'s
 * view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title, its sentence and the blue "Add account >" menu (its flyouts are B9's four
 * tax treatments). Left, about a third: the plum band "Invested accounts" and its total (never "Total Net Worth": B9 holds
 * no home, debts or bank accounts, critique 4), then the one kind of record B9 holds, Investment, marked as the one shown
 * by a 4 px blue left edge, a darker fill and `aria-current` (never colour alone). It is no button: with one kind there is
 * nothing to switch to (an affordance that cannot change anything does not exist, insight 054). Right: the kind's strip
 * ("Investment: $X") and a row per account (its name, its treatment and owner, its mix, its balance), each opening the
 * account's drawer on what it holds. Under them, the balances as entered and the two stopgap lines. The R13 caveat closes
 * the page: the band prints a figure, tied to the caveat by `aria-describedby` (plan 4.0's R13 rule).
 */
import type { Ref } from 'react'
import { AddMenu, Caveat, PageFrame, cn } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { addEntries } from './CardsPage'
import { ProfileIcon } from './profileIcons'
import type { DrawerTarget, NetWorthView } from './profileView'

export interface NetWorthProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: NetWorthView
  readonly selected: string | null
  readonly onOpen: (target: DrawerTarget) => void
  readonly caveat: readonly string[]
}

export function NetWorth({ headingRef, view, selected, onOpen, caveat }: NetWorthProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="profile-net-worth">
      <PageFrame
        bare
        title={copy.shellPageNetWorth}
        headingRef={headingRef}
        intro={view.intro}
        {...(view.add !== null ? { headAction: <AddMenu label={view.add.label} items={addEntries(view.add, onOpen)} /> } : {})}
        caveat={<Caveat lines={caveat} />}
      >
        <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] laptop:items-start" data-networth="">
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-plum px-6 py-5 text-intro font-semibold text-bg" data-networth-band="">
              <span>{view.bandLabel}</span>
              <span className="tabular-nums" aria-describedby={verdictDescribedBy()} data-networth-total="">
                {view.total}
              </span>
            </p>
            {/* The master list switches nothing while B9 holds one kind, so on the phone, where it would stack right above the
                detail strip saying the same words, it is left out (the band and the strip carry the total). */}
            <ul aria-label={copy.profileNetWorthCategoriesLabel} className="hidden laptop:block">
              <li
                aria-current="true"
                className="flex items-center justify-between gap-4 border-l-4 border-l-blue bg-stone-200 px-5 py-4 text-intro text-stone-900 [&_svg]:size-9"
                data-networth-category="investment"
              >
                <span className="flex items-center gap-4">
                  <ProfileIcon icon="investment" />
                  <span className="font-semibold">{view.category}</span>
                </span>
                <span className="tabular-nums">{view.categoryTotal}</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className="flex items-center justify-center gap-3 bg-stone-200 px-6 py-4 text-intro font-semibold text-stone-900 [&_svg]:size-8" data-networth-header="">
              <ProfileIcon icon="investment" />
              <span className="tabular-nums">{view.header}</span>
            </p>
            {view.empty !== null ? (
              <p className="px-6 py-4 text-body text-stone-600" data-networth-empty="">
                {view.empty}
              </p>
            ) : (
              <ul aria-label={copy.profileNetWorthAccountsLabel} className="flex flex-col gap-3">
                {view.rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-current={selected === r.id ? 'true' : undefined}
                      onClick={() => onOpen(r.target)}
                      data-profile-card={r.id}
                      className={cn(
                        'flex w-full cursor-pointer items-start justify-between gap-6 bg-stone-100 px-6 py-4 text-left hover:bg-stone-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink',
                        selected === r.id && 'outline-2 outline-plum-dark',
                        selected !== null && selected !== r.id && 'opacity-50',
                      )}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-intro break-words text-stone-900">{r.name}</span>
                        <span className="text-label break-words text-stone-600">{r.meta}</span>
                        <span className="text-label break-words text-stone-600" data-networth-mix="">
                          {r.mix}
                        </span>
                      </span>
                      <span className="shrink-0 text-intro text-stone-900 tabular-nums">{r.balance}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-1" data-networth-notes="">
          {view.notes.map((l) => (
            <p key={l} className="text-label text-stone-600" data-networth-note="">
              {l}
            </p>
          ))}
        </div>
      </PageFrame>
    </div>
  )
}
