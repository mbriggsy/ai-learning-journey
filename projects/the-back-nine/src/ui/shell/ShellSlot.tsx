/*
 * src/ui/shell/ShellSlot.tsx: the EAGER half of the shell (Act 6 · RC2; plan docs/plans/6-rightcapital-ui-plan.md,
 * section 3.1; the workbench room's `RoomSlot.tsx` pattern, kept exactly).
 *
 * IntakeApp imports this statically; it loads `Shell` on demand. A `React.lazy` caches a rejected import for as long as
 * that lazy object lives, and Suspense has no error arm (insight 053), so the slot owns its own error boundary, INSIDE
 * the intake app: a failed load never unmounts the intake app, its draft, its save state or its leave guard. Each
 * retry builds a FRESH lazy import (a new attempt number re-runs the memo), so "Try again" really fetches again where
 * the browser allows it.
 *
 * Some browsers also keep a failed module load for the whole visit (whatwg/html#10327), so after a retry has failed
 * too the remedy becomes a page reload, the one action that can succeed there (insight 054). The reload sits behind
 * IntakeApp's leave guard, which asks first when anything is unsaved. On every failure the answer stays readable: its
 * lead is printed on the failure page itself (U25's rule). Since RC4 the shell is the home, so there is no answer page
 * behind it to go back to: the failure page offers the retry (then the reload) alone.
 *
 * This file rides the intake chunk and imports no stylesheet (a sheet shared with the intake chunk would move its place
 * in the cascade: the UI landmines). Its failure page is drawn with the kit's utilities under `.rc-root`.
 */
import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react'
import { Button } from '../kit/Button'
import { copy } from '../copy'
import { pinnedLines } from '../workbench/pinnedLines'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import type { ShellProps } from './Shell'

type ShellModule = { readonly default: ComponentType<ShellProps> }

const loadShell = (): Promise<ShellModule> => import('./Shell')

/** The shell's lazy object, shared across mounts of the slot: the shell unmounts while a save ceremony it opened runs
 *  and mounts again after, and a lazy that has already resolved renders at once. A retry replaces it, so a rejected
 *  load never outlives the retry that fixed it. */
let sharedShell = lazy(loadShell)

interface BoundaryProps {
  readonly children: ReactNode
  /** True once a retry has been tried: the remedy becomes a reload. */
  readonly retried: boolean
  readonly onRetry: () => void
  /** Told once per failure, so the slot can stop sharing a lazy that rejected. */
  readonly onCaught: () => void
  readonly snapshot: MemoryModelSnapshot
  readonly wallCalendarYear: number
}

class ShellBoundary extends Component<BoundaryProps, { readonly failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(): void {
    this.props.onCaught()
  }

  override render() {
    if (!this.state.failed) return this.props.children
    const { retried, onRetry, snapshot, wallCalendarYear } = this.props
    const answer = pinnedLines(snapshot, wallCalendarYear)
    return (
      <main className="rc-root mx-auto flex w-full max-w-[48rem] flex-1 flex-col gap-6 px-4 py-10" data-shell-failed="">
        <p className="text-body text-stone-900" role="alert">
          {retried ? copy.workbenchLoadFailedAgain : copy.workbenchLoadFailed}
        </p>
        <section aria-labelledby="shell-failed-answer" className="flex flex-col gap-1 border-l-3 border-stone-300 pl-4">
          <p id="shell-failed-answer" className="text-label text-stone-600">
            {copy.workbenchPinnedLabel}
          </p>
          <p className="text-body font-semibold text-stone-900">{answer.lead}</p>
          {answer.second !== undefined && <p className="text-label text-stone-600">{answer.second}</p>}
        </section>
        <div className="flex flex-wrap items-center gap-4">
          {retried ? (
            <Button onClick={() => window.location.reload()}>{copy.restoreRetry}</Button>
          ) : (
            <Button onClick={onRetry}>{copy.exportRetry}</Button>
          )}
        </div>
      </main>
    )
  }
}

export function ShellSlot({
  shell,
  load = loadShell,
}: {
  readonly shell: ShellProps
  /** The module loader: the real dynamic import unless a test hands in a failing one. */
  readonly load?: () => Promise<ShellModule>
}) {
  // One lazy object per attempt. The boundary is keyed on the attempt too, so a retry starts from a clean boundary AND
  // a lazy that has never seen the rejection.
  const [{ attempt, Shell }, setLoad] = useState(() => ({
    attempt: 0,
    Shell: load === loadShell ? sharedShell : lazy(load),
  }))
  const retry = () => {
    const next = lazy(load)
    if (load === loadShell) sharedShell = next
    setLoad((s) => ({ attempt: s.attempt + 1, Shell: next }))
  }
  return (
    <ShellBoundary
      key={attempt}
      retried={attempt > 0}
      onRetry={retry}
      snapshot={shell.snapshot}
      wallCalendarYear={shell.wallCalendarYear ?? new Date().getFullYear()}
      // The next mount (after a ceremony, or a re-walk) gets a fresh load, never the rejection the shared lazy would
      // otherwise keep for the whole session.
      onCaught={() => {
        if (load === loadShell) sharedShell = lazy(loadShell)
      }}
    >
      <Suspense fallback={null}>
        <Shell {...shell} />
      </Suspense>
    </ShellBoundary>
  )
}
