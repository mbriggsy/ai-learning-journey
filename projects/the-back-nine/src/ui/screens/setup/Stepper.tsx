/**
 * src/ui/screens/setup/Stepper.tsx: the first-run stepper (Act 6 · RC14; plan docs/plans/6-rightcapital-ui-plan.md, RC14;
 * ref 2.3 and 1.3; `rc-shell/dataentry-03.png` to `-09.png`, `vimeo-family_choose-a-resident-state.jpg`). Draws
 * `stepperView.ts` and decides nothing it can leave there.
 *
 * LAYOUT, as RightCapital draws it: no module nav, only the B9 mark and the two names; a full-width chevron bar of six
 * steps (passed and current filled plum, the rest white; the current carries `aria-current="step"` and medium weight; a
 * passed step that owes no fact the household can enter a check in place of its number, never colour alone, so a check
 * never stands over the box's "Still needed"; on the phone the bar scrolls sideways in its own strip, the current step
 * brought into it, each edge with more steps beyond it fading out, so a cut label reads as more that way); the step's title and its sentence; Profile's cards for the step (RC13's, each opening its
 * drawer); Previous and Next at the bottom right, Complete on the last. The settings gear is left out: Settings is a page
 * of the plan's workspace, and during setup there is no plan for it to read (an affordance that changes nothing does not
 * exist, insight 054).
 *
 * THE LAWS IT KEEPS (the walk's, ported; `e2e/intake-fold.spec.ts`'s, now `e2e/rc-screens.spec.ts`'s RC14 arms):
 *  - a step change opens the new step at its own top and moves focus to its title (it names the step; never a field,
 *    which would pop the phone's keyboard), an opacity-only entrance (focus-safe; reduced motion keeps a short fade);
 *  - a drawer names itself and takes focus on its title (`ProfileDrawer`), and while one is open the step nav yields:
 *    it is `inert` (out of the tab order and the accessibility tree), and the kit's drawer is modal, so a press where
 *    Previous or Next sits lands on the drawer's scrim, which is the drawer's own dismiss: over unsaved work it asks
 *    first. A step change can never drop a drawer's typing (insight 112's every-way-out law);
 *  - Next runs the walk's Continue over the step's cards (`checkStep`); a refusal opens that card's drawer with the
 *    refusal under its field. A chevron forward runs each passed step's check; Complete runs them all, then hands the
 *    draft to the store (the reveal's provisional-then-final pair, `IntakeApp`) and lands on Snapshot;
 *  - no live region above the cards (insight 035): what the answer still waits for shows on the last step, below its
 *    cards, as plain text (the provisional answer strip left setup; RightCapital shows no answer during setup).
 *
 * SETUP READS NO ANSWER, so a drawer's Save here sends no recompute (the drawers get the store with `recompute` a no-op):
 * Complete's reveal is the first run, as the walk's terminal advance superseded every provisional run before it.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'
import type { MemoryModel } from '@store/memoryModel'
import { Button, cn } from '../../kit'
import { copy } from '../../copy'
import { CardsPage } from '../profile/CardsPage'
import { NetWorth } from '../profile/NetWorth'
import { useDrawerHost } from '../profile/drawerHost'
import { SetupPeriodContext, type SetupPeriod } from '../profile/drawers/setupPeriod'
import { NewPlanDrawer } from './NewPlanDrawer'
import { checkSteps, missingBlock, SETUP_STEPS, setupNames, setupNavLabel, setupPage, setupTitle, stepOwesFacts, type StepBlock } from './stepperView'

export interface StepperProps {
  readonly model: MemoryModel
  /** The spending period's provenance: a vault or an applied dev seed answered it (`IntakeApp`'s, as the walk had it). */
  readonly periodConfirmed: boolean
  /** A fresh plan: "Start a new plan" asks the two names first. */
  readonly askNames: boolean
  /** The names drawer dismissed: back where the new plan began (the cold start). */
  readonly onCancelNewPlan?: () => void
  /** Complete, with every step's check passed. */
  readonly onComplete: () => void
  /** No plan is saved on this device yet (the walk's "nothing's saved" line stands beside the nav while true). */
  readonly notSaved: boolean
}

/** The chevron's shape, drawn on a layer under the step's words (never on the button: each button's own box is its cell,
 *  so no two controls overlap): an arrow tip on the right, a notch on the left (the first has no notch, the last no tip),
 *  1rem deep. A later step's layer reaches 14 px back under the step before it, so the tip sits in its notch with a 2 px
 *  stone line between. Hit-testing follows the shape: a press on a tip is that step's. */
function chevron(i: number, last: number): string {
  if (i === 0) return 'left-0 [clip-path:polygon(0_0,calc(100%_-_1rem)_0,100%_50%,calc(100%_-_1rem)_100%,0_100%)]'
  if (i === last) return '-left-3.5 [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,1rem_50%)]'
  return '-left-3.5 [clip-path:polygon(0_0,calc(100%_-_1rem)_0,100%_50%,calc(100%_-_1rem)_100%,0_100%,1rem_50%)]'
}

/** Which edges of the strip have steps beyond them: the edge fades there (a mask, a stylesheet class: CSP-safe). */
function markFade(strip: HTMLElement): void {
  const start = strip.scrollLeft > 1
  const end = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1
  const fade = start && end ? 'both' : start ? 'start' : end ? 'end' : null
  if (fade === null) delete strip.dataset['fade']
  else strip.dataset['fade'] = fade
}

function StepBar({ index, owes, onGo }: { readonly index: number; readonly owes: readonly boolean[]; readonly onGo: (to: number) => void }) {
  const stripRef = useRef<HTMLElement>(null)
  // The phone's strip scrolls itself (never the page) to bring the current step in.
  useLayoutEffect(() => {
    const strip = stripRef.current
    const here = strip?.querySelector<HTMLElement>('[aria-current="step"]')
    if (strip === null || here === null || here === undefined) return
    strip.scrollLeft = Math.max(0, here.offsetLeft - (strip.clientWidth - here.offsetWidth) / 2)
    markFade(strip)
  }, [index])
  useLayoutEffect(() => {
    const strip = stripRef.current
    if (strip === null) return
    const mark = () => markFade(strip)
    strip.addEventListener('scroll', mark, { passive: true })
    window.addEventListener('resize', mark)
    return () => {
      strip.removeEventListener('scroll', mark)
      window.removeEventListener('resize', mark)
    }
  }, [])
  const last = SETUP_STEPS.length - 1
  return (
    <nav
      ref={stripRef}
      aria-label={copy.setupStepsLabel}
      className={cn(
        'overflow-x-auto',
        'data-[fade=start]:[mask-image:linear-gradient(to_right,transparent,#000_3rem)]',
        'data-[fade=end]:[mask-image:linear-gradient(to_left,transparent,#000_3rem)]',
        'data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,#000_3rem,#000_calc(100%_-_3rem),transparent)]',
      )}
      data-setup-steps=""
    >
      <ol className="flex min-w-max border border-stone-300 bg-stone-300 wide:min-w-0">
        {SETUP_STEPS.map((s, i) => {
          const passed = i < index
          const done = passed && owes[i] !== true
          const here = i === index
          return (
            <li key={s} className="flex flex-1">
              <button
                type="button"
                aria-current={here ? 'step' : undefined}
                data-setup-step-state={done ? 'done' : passed ? 'passed' : here ? 'current' : 'next'}
                onClick={() => onGo(i)}
                className={cn(
                  // `relative`: the step's sr-only "done" is positioned inside its own button, so the strip's sideways scroll
                  // clips it (positioned off the page's own box, it widened the phone's page past the window).
                  'relative flex min-h-12 w-full min-w-[9rem] cursor-pointer items-center gap-2 py-2 pr-6 text-body whitespace-nowrap compact:min-h-11',
                  i === 0 ? 'pl-4' : 'pl-8',
                  passed || here ? 'text-bg' : 'text-stone-600 hover:text-stone-900',
                  here ? 'font-semibold' : 'font-regular',
                  'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-bg',
                  !(passed || here) && 'focus-visible:outline-blue-ink',
                )}
              >
                <span aria-hidden="true" className={cn('absolute inset-y-0 right-0', passed || here ? 'bg-plum' : 'bg-bg', chevron(i, last))} />
                <span aria-hidden="true" className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-label tabular-nums">
                  {done ? <Check size={14} strokeWidth={2} /> : i + 1}
                </span>
                <span className="relative">{setupNavLabel(s)}</span>
                {done ? <span className="sr-only">{` ${copy.setupStepDone}`}</span> : null}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Stepper({ model, periodConfirmed, askNames, onCancelNewPlan, onComplete, notSaved }: StepperProps) {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const draft = snapshot.draft
  // Setup reads no answer (the header): the drawers' store sends no recompute.
  const setupModel = useMemo<MemoryModel>(() => ({ ...model, recompute: async () => true }), [model])
  const [index, setIndex] = useState(0)
  const step = SETUP_STEPS[index]!
  const [spendPeriodAnswered, setSpendPeriodAnswered] = useState(false)
  const period = useMemo<SetupPeriod>(
    () => ({ periodConfirmed, spendPeriodAnswered, markSpendPeriodAnswered: () => setSpendPeriodAnswered(true) }),
    [periodConfirmed, spendPeriodAnswered],
  )
  const headingRef = useRef<HTMLHeadingElement>(null)
  const host = useDrawerHost(useCallback(() => headingRef.current, []))
  // The names drawer: open on a fresh plan, then gone for good.
  const [names, setNames] = useState<'open' | 'closing' | 'gone'>(askNames ? 'open' : 'gone')
  const blocked = host.isOpen || names !== 'gone'

  // A step change: the new step at its own top, focus on its title (never while a drawer holds it: the drawer's own).
  const shown = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (names !== 'gone' || shown.current === index) return
    shown.current = index
    if (!host.isOpen) headingRef.current?.focus({ preventScroll: true })
    if (typeof window.scrollTo === 'function' && !navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [index, names, host.isOpen])

  /** A refusal: its step, and its card's drawer opened at it. */
  const land = (block: StepBlock) => {
    const at = SETUP_STEPS.indexOf(block.step)
    if (at !== index) setIndex(at)
    if (block.target !== null) {
      host.open(block.target, block.card, { checkAtOpen: true })
      // At its field: once the drawer is up, the refused field scrolls into the drawer's view (focus stays on the title,
      // which names the drawer; the refusal is the field's own description, read with it).
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const refused = document.querySelector('[role="dialog"] [aria-invalid="true"]')
          if (refused instanceof HTMLElement && typeof refused.scrollIntoView === 'function') refused.scrollIntoView({ block: 'center' })
        }),
      )
    }
  }
  const go = (to: number) => {
    if (blocked || to === index || to < 0 || to >= SETUP_STEPS.length) return
    if (to > index) {
      const block = checkSteps(model, index, to, period)
      if (block !== null) {
        land(block)
        return
      }
    }
    setIndex(to)
  }
  const complete = () => {
    if (blocked) return
    const block = checkSteps(model, 0, SETUP_STEPS.length, period)
    if (block !== null) {
      land(block)
      return
    }
    onComplete()
  }

  const page = setupPage(draft, step)
  const names2 = setupNames(draft)
  const last = index === SETUP_STEPS.length - 1
  const missing = last ? missingBlock(draft) : null
  return (
    <SetupPeriodContext.Provider value={period}>
      <div className="rc-root flex min-h-svh w-full flex-col bg-bg" data-setup="">
        <header className="w-full border-b border-stone-300 bg-bg">
          <div className="mx-auto flex min-h-12.5 max-w-[90rem] items-stretch gap-4 px-4 wide:px-10 compact:min-h-12">
            <span className="flex shrink-0 items-center gap-1 text-chart-title font-semibold whitespace-nowrap text-plum">
              <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-control bg-plum text-label font-semibold text-bg">
                {copy.shellMark}
              </span>
              <span className="sr-only laptop:not-sr-only">{copy.appTitle}</span>
            </span>
            {names2.length > 0 ? (
              <p className="flex min-w-0 flex-col justify-center text-label leading-tight text-stone-600" data-setup-names="">
                {names2.map((n, i) => (
                  <span key={i} className="wrap-anywhere">
                    {n}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </header>
        <main className="flex flex-1 flex-col" data-setup-step={step}>
          <div className="mx-auto w-full max-w-[90rem] px-4 pt-6 wide:px-10 wide:pt-10 compact:pt-5">
            <StepBar index={index} owes={SETUP_STEPS.map((s) => stepOwesFacts(draft, s))} onGo={go} />
          </div>
          <div key={step} className="flex flex-1 flex-col transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:duration-100">
            {page.kind === 'cards' ? (
              <CardsPage screen={`setup-${step}`} title={setupTitle(step)} headingRef={headingRef} view={page.view} selected={host.selected} onOpen={host.open} />
            ) : (
              <NetWorth screen={`setup-${step}`} title={setupTitle(step)} headingRef={headingRef} view={page.view} selected={host.selected} onOpen={(t) => host.open(t)} />
            )}
          </div>
          {missing !== null ? (
            <div className="mx-auto w-full max-w-[90rem] px-4 wide:px-10">
              <div className="flex max-w-[56rem] flex-col gap-2 rounded-card border border-stone-300 bg-stone-100 p-4" data-setup-missing="">
                <p className="text-body font-medium text-stone-900">{missing.lead}</p>
                {missing.lines.map((l) => (
                  <p key={l} className="text-label text-stone-600">
                    {l}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <div
            inert={blocked}
            className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-end gap-3 px-4 pt-6 pb-10 wide:px-10"
            data-setup-nav=""
          >
            {notSaved ? (
              <p className="mr-auto max-w-[36rem] text-label text-stone-600" data-setup-not-saved="">
                {copy.notSavedYet}
              </p>
            ) : null}
            {index > 0 ? (
              <Button variant="secondary" onClick={() => go(index - 1)}>
                {copy.setupPrevious}
              </Button>
            ) : null}
            {last ? (
              <Button variant="primary" onClick={complete}>
                {copy.setupComplete}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => go(index + 1)}>
                {copy.setupNext}
              </Button>
            )}
          </div>
        </main>
        {host.render({ model: setupModel, readOnly: false })}
        {names !== 'gone' ? (
          <NewPlanDrawer
            model={setupModel}
            open={names === 'open'}
            onStart={() => setNames('closing')}
            onCancel={() => {
              setNames('closing')
              onCancelNewPlan?.()
            }}
            onClosed={() => setNames('gone')}
            finalFocus={() => headingRef.current}
          />
        ) : null}
      </div>
    </SetupPeriodContext.Provider>
  )
}
