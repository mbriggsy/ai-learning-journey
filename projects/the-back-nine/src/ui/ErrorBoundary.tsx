/**
 * The calm last-resort boundary (ultramode review 2026-07-02). The entry tree mounts three
 * React.lazy chunks (IntakeApp / RecoveryFlow / RestoreFlow); Suspense catches only the PENDING
 * promise — a REJECTED chunk import (offline + SW-cache eviction, version skew after an update)
 * re-throws, and React.lazy CACHES the rejection for the session. Without a boundary the whole
 * tree unmounts to a blank screen, worst on the offline survivor's restore door. The vault on
 * disk is untouched by any render crash, so a reload — which re-runs the probe AND retries the
 * chunk fetch — is the honest remedy, framed calmly (never "damaged", never a stack trace).
 *
 * Act 6 · RC19: drawn in the shell's frame (its white top bar with the wordmark) over the vault screens' stone page, the
 * words and the Reload button in one card. It reads only `entryCopy` and the kit (entry-safe): the boundary must render
 * when every lazy chunk is out of reach.
 */
import { Component, type ReactNode } from 'react'
import { entryCopy } from './entryCopy'
import { Button } from './kit/Button'
import { FieldNote, VaultCard, Wordmark } from './kit/VaultCard'

interface State {
  readonly failed: boolean
}

export class AppErrorBoundary extends Component<{ readonly children: ReactNode }, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <div data-vault-page="" className="rc-root flex min-h-svh w-full flex-col">
        <header className="w-full border-b border-stone-300 bg-bg">
          <div className="mx-auto flex min-h-12.5 max-w-[90rem] items-center px-4 wide:px-10">
            {/* h1: the boundary replaces the ENTIRE tree (including the sr-only app-title h1), so this fallback is the
                whole document — it owns the top-level heading, the wordmark itself. */}
            <h1>
              <Wordmark mark={entryCopy.shellMark} title={entryCopy.appTitle} />
            </h1>
          </div>
        </header>
        <main className="flex w-full flex-1 flex-col items-center px-4 pt-10 pb-6 wide:pt-16">
          <VaultCard>
            <FieldNote className="text-body">{entryCopy.unlockGeneric}</FieldNote>
            <Button variant="primary" className="w-full" onClick={() => window.location.reload()}>
              {entryCopy.restoreRetry}
            </Button>
          </VaultCard>
        </main>
      </div>
    )
  }
}
