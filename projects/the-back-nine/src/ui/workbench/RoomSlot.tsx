/*
 * src/ui/workbench/RoomSlot.tsx — the EAGER half of the workbench room (Act 5, U6; workbench plan KTD31).
 *
 * IntakeApp imports this statically; it loads `WorkbenchRoom` on demand. A `React.lazy` caches a
 * rejected import for as long as that lazy object lives, and Suspense has no error arm (insight 053), so
 * the slot owns its own error boundary, INSIDE the front room: a failed load never unmounts the intake
 * app, its draft, its save state or its leave guard. Each retry builds a FRESH lazy import (a new
 * attempt number re-runs the memo), so "Try again" really fetches again where the browser allows it.
 *
 * Some browsers also keep a failed module load for the whole visit (whatwg/html#10327; Chrome re-fetches
 * since version 156), so after a retry has failed too the remedy becomes a page reload — the one action
 * that can succeed there (insight 054: the button must be able to change the outcome). The reload sits
 * behind IntakeApp's leave guard, which asks first when anything is unsaved. "Back to your answer" is
 * offered on every failure.
 */
import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react'
import { copy } from '../copy'
import type { WorkbenchRoomProps } from './WorkbenchRoom'
import './workbench.css'

type RoomModule = { readonly default: ComponentType<WorkbenchRoomProps> }

const loadRoom = (): Promise<RoomModule> => import('./WorkbenchRoom')

/** The room's lazy object, shared across mounts of the slot: the room unmounts while a save ceremony it
 *  opened runs and mounts again after, and a lazy that has already resolved renders at once, where a fresh
 *  one would suspend and hold the blank fallback for React's reveal throttle. A retry replaces it, so a
 *  rejected load never outlives the retry that fixed it. */
let sharedRoom = lazy(loadRoom)

interface BoundaryProps {
  readonly children: ReactNode
  /** True once a retry has been tried: the remedy becomes a reload. */
  readonly retried: boolean
  readonly onRetry: () => void
  readonly onBack: () => void
}

class RoomBoundary extends Component<BoundaryProps, { readonly failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    const { retried, onRetry, onBack } = this.props
    return (
      <main className="workbench">
        <section className="workbench__failed">
          <h2 className="workbench__heading">{copy.workbenchHeading}</h2>
          <p className="workbench__failed-note" role="alert">
            {retried ? copy.workbenchLoadFailedAgain : copy.workbenchLoadFailed}
          </p>
          <div className="workbench__failed-actions">
            {retried ? (
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                {copy.restoreRetry}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onRetry}>
                {copy.exportRetry}
              </button>
            )}
            <button type="button" className="btn-quiet" onClick={onBack}>
              {copy.workbenchBack}
            </button>
          </div>
        </section>
      </main>
    )
  }
}

export function RoomSlot({
  room,
  load = loadRoom,
}: {
  readonly room: WorkbenchRoomProps
  /** The module loader — the real dynamic import unless a test hands in a failing one. */
  readonly load?: () => Promise<RoomModule>
}) {
  // One lazy object per attempt. The boundary is keyed on the attempt too, so a retry starts from a clean
  // boundary AND a lazy that has never seen the rejection.
  const [{ attempt, Room }, setLoad] = useState(() => ({
    attempt: 0,
    Room: load === loadRoom ? sharedRoom : lazy(load),
  }))
  const retry = () => {
    const next = lazy(load)
    if (load === loadRoom) sharedRoom = next
    setLoad((s) => ({ attempt: s.attempt + 1, Room: next }))
  }
  return (
    <RoomBoundary key={attempt} retried={attempt > 0} onRetry={retry} onBack={room.onBack}>
      <Suspense fallback={null}>
        <Room {...room} />
      </Suspense>
    </RoomBoundary>
  )
}
