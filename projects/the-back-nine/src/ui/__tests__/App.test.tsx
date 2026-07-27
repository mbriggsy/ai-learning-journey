// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { App } from '../App'
import { copy } from '../copy'

/**
 * The App entry-router GLUE that neither seam test can reach on its own: the unlock's read-only
 * verdict (Fork C ii) rides `onUnlocked(notice)` → `entry.notice` → the standing ViewOnlyBanner.
 * UnlockScreen.test proves the seam hands UP the right key; ViewOnlyBanner.test proves the banner
 * renders a given key; this proves App WIRES the two ends together (the mutate-check: drop the
 * `notice` from either the onUnlocked handler or the ViewOnlyBanner prop and the read-only case
 * below times out).
 *
 * The session/probe layer is mocked the way the surface tests mock it — the whole flow is driven
 * REAL (probe → unlock screen → type → open), with only `../vaultSession` (probe + the dynamic
 * unlock session) and the lazy children faked. The `virtual:pwa-register/react` SW hook (pulled by
 * UpdateToast at the App root) is stubbed idle so no service worker is touched. IntakeApp is stubbed
 * to a PROPS-ECHO (it renders its readOnly prop) so the router's OTHER read-only consumer — the
 * `readOnly={entry.notice !== null}` derivation — is pinned too, without the engine graph; the
 * forwarding INSIDE IntakeApp (readOnly → deriveResultSave) is IntakeApp.test.tsx's territory.
 */

const unlock = vi.fn()
// Widened past the default 'vault' so a test can drive the no-vault (ColdStart) and damaged branches.
const probeVault = vi.fn(async (): Promise<{ kind: 'vault' | 'damaged' | 'no-vault' }> => ({ kind: 'vault' }))
vi.mock('../vaultSession', () => ({
  probeVault,
  // The dynamic unlock session — currentModel is only read by the (stubbed) IntakeApp, kept null-safe.
  getVaultSession: () => Promise.resolve({ unlock, currentModel: () => null }),
}))

// The lazy children — stubbed so the App test stays hermetic (no engine/crypto graph, no real SW).
// PROPS-ECHO stubs (insight 066), never swallowing nulls: the router glue they echo is the
// mutable thing these tests exist to pin.
vi.mock('../IntakeApp', () => ({
  default: ({ readOnly = false, hydrateFromVault = false }: { readOnly?: boolean; hydrateFromVault?: boolean }) => (
    <div data-read-only={String(readOnly)} data-hydrate={String(hydrateFromVault)}>
      intake stub
    </div>
  ),
}))
// Echoes the recover→began link (ultramode 2026-07-09, the J1 seam): App.tsx maps
// onRecovered → {began, hydrate:true} — the ONE link that arms the U13 re-entry gate for
// the wiped-device survivor. A null-stub left it unpinned at every level: flipping it to
// hydrate:false dropped the survivor into a blank fresh intake and survived the suite.
vi.mock('../RecoveryFlow', () => ({
  RecoveryFlow: ({ onRecovered }: { onRecovered: () => void }) => (
    <div data-testid="recovery-flow">
      <button type="button" onClick={onRecovered}>
        recovery-recovered
      </button>
    </div>
  ),
}))
// A PROPS-ECHO stub (insight 066), not a swallowing null: it echoes whether App wired an `onBack`
// (the cold-vs-damaged signal) into a data-attribute, and renders a Back button ONLY when onBack was
// passed — so a test can drive the real App round trip (restore-cold → Back → cold) through it.
vi.mock('../RestoreFlow', () => ({
  RestoreFlow: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="restore-flow" data-has-onback={String(onBack !== undefined)}>
      {onBack && (
        <button type="button" onClick={onBack}>
          restore-back
        </button>
      )}
    </div>
  ),
}))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: () => {}, offlineReady: [false, () => {}] }),
}))

const PROBE_DEFAULT = async (): Promise<{ kind: 'vault' | 'damaged' | 'no-vault' }> => ({ kind: 'vault' })

afterEach(() => {
  cleanup()
  unlock.mockReset()
  // FULL RESET + RE-SEEDED DEFAULT, never `mockClear()` — this fixed a real CI-only failure
  // (run 30169928294, both restore-door arms red on Linux while Windows ran green twice).
  //
  // THE MECHANISM, proven not guessed. `mockClear()` resets recorded CALLS but does NOT drain the
  // `mockResolvedValueOnce` QUEUE (verified with a two-arm scratch test: queue a one-shot, clear,
  // and the NEXT test still receives it). Meanwhile `App.tsx:91` does `await import('./vaultSession')`
  // BEFORE it calls `probeVault()`, so under load that call can land after its own test has ended —
  // `cleanup()` sets the effect's `cancelled` flag so no state is set, but the CALL still happens and
  // still takes a value off the queue. The two defects compose in both directions: a late call steals
  // the NEXT test's one-shot (that test then sees the default 'vault' and renders the unlock screen —
  // exactly the CI DOM), and a one-shot that is never consumed survives into a later test.
  //
  // Timing-dependent, so it stayed dormant until an unrelated stage grew the suite enough to shift
  // scheduling. Resetting the queue at the boundary makes the leak UNREPRESENTABLE rather than
  // unlikely; the per-test arms below use `mockResolvedValue` (not `…Once`) so an extra probe or a
  // re-run effect can never fall through to a different branch mid-test.
  probeVault.mockReset()
  probeVault.mockImplementation(PROBE_DEFAULT)
})

async function driveToUnlockScreen() {
  render(<App />)
  return screen.findByLabelText(copy.unlockLabel) // waits out the probe hold → unlock screen
}

describe('App — the entry router threads the unlock read-only verdict into the standing banner (Fork C ii)', () => {
  it('a READ-ONLY unlock (a 2nd tab holds the writer) surfaces the view-only banner copy', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: true })
    const field = await driveToUnlockScreen()
    fireEvent.change(field, { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(screen.getByRole('button', { name: copy.unlockButton }))

    // The banner (the ONLY surface that renders this copy) shows the read-only caveat with its lead word.
    const banner = await screen.findByText(copy.unlockReadOnly)
    expect(banner).toBeInTheDocument()
    expect(screen.getByText(copy.unlockReadOnlyLead)).toBeInTheDocument()
    // A read-only OPEN is a success with a caveat — a status, never an alarm.
    expect(screen.queryByRole('alert')).toBeNull()
    // The router's OTHER read-only consumer: the SAME verdict must reach IntakeApp's readOnly
    // prop (kills the `entry.notice !== null` inversion mutant — the banner alone cannot).
    expect(await screen.findByText('intake stub')).toHaveAttribute('data-read-only', 'true')
  })

  it('a WRITABLE unlock leaves the banner EMPTY — the copy is the verdict, not a constant (kills the always-on mutant)', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    const field = await driveToUnlockScreen()
    fireEvent.change(field, { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(screen.getByRole('button', { name: copy.unlockButton }))

    // We DID reach the mounted app (proving the flow ran) — so the absent banner below is meaningful.
    const stub = await screen.findByText('intake stub')
    expect(screen.queryByText(copy.unlockReadOnly)).toBeNull()
    expect(screen.queryByText(copy.unlockReadOnlyLead)).toBeNull()
    expect(stub).toHaveAttribute('data-read-only', 'false')
    // The unlock path HYDRATES (the U13 re-entry gate arms only off this flag).
    expect(stub).toHaveAttribute('data-hydrate', 'true')
  })
})

describe('App — the survivor door composes into the re-entry gate (J1, ultramode 2026-07-09)', () => {
  it('unlock → forgot → RecoveryFlow.onRecovered lands in IntakeApp WITH hydrate=true and writable — the one link (App.tsx onRecovered) that arms the U13 gate for the wiped-device survivor', async () => {
    await driveToUnlockScreen()

    // DETERMINISM FIRST, NOT A BIGGER NUMBER — and the history here is the argument.
    //
    // `RecoveryFlow` is reached through `React.lazy`, so clicking the forgot door STARTS a dynamic
    // import and the wait below races module resolution + a Suspense flush against a wall clock.
    // That budget was already raised once for exactly this reason (1s → 5s, 2026-07-18) and CI blew
    // through 5s anyway on 2026-07-27 (run 30310885497, `Unable to find an element by:
    // [data-testid="recovery-flow"]` at 5033ms). Raising it a second time is the move the
    // macrotask-budget landmine forbids: the wait is inherently racy and a bigger number only
    // relocates the failure to the next unlucky runner.
    //
    // The prior prescription missed because it bumped the WRONG CLOCK. `vite.config.ts` raised
    // vitest's per-test `testTimeout` 5s → 20s, but the failure is this INNER `findBy` budget
    // expiring first — an outer budget can never rescue an inner wait that has already given up.
    //
    // So take the variable out instead. The module is `vi.mock`'d already, so resolving it here
    // puts it in the registry before anything depends on timing; what remains is a render flush.
    // The surviving budget is a HANG GUARD, not a performance budget — the same philosophy the
    // `testTimeout` bump was reaching for, applied to the clock that actually governs.
    await import('../RecoveryFlow')

    // The forgot door replaces the unlock screen with the recovery flow.
    fireEvent.click(screen.getByRole('button', { name: copy.unlockForgot }))
    await screen.findByTestId('recovery-flow', undefined, { timeout: 20_000 })
    expect(screen.queryByLabelText(copy.unlockLabel)).toBeNull()
    // Recovery completes → the began entry must carry hydrate:true (the gate's arming flag —
    // the survivor with the longest gap and the stalest balances is WHO the gate exists for)
    // and writable (recovery re-mints through the writer path; a read-only verdict here
    // would withhold the update affordance from the one household most likely to need it).
    fireEvent.click(screen.getByRole('button', { name: 'recovery-recovered' }))
    const stub = await screen.findByText('intake stub')
    expect(stub).toHaveAttribute('data-hydrate', 'true')
    expect(stub).toHaveAttribute('data-read-only', 'false')
  })
})

describe("App — ColdStart's restore door routes to the shared RestoreFlow and back (the wiped-device door)", () => {
  it('cold → restore-cold mounts RestoreFlow WITH an onBack, and Back returns to the real ColdStart', async () => {
    probeVault.mockResolvedValue({ kind: 'no-vault' }) // whole-test, not a one-shot: see the afterEach note
    render(<App />)
    // The probe resolves no-vault → the REAL ColdStart (unmocked): its Begin + the quiet restore door.
    const begin = await screen.findByRole('button', { name: copy.coldStartBegin })
    expect(begin).toBeInTheDocument()
    expect(screen.queryByTestId('restore-flow')).toBeNull()

    // Tap the whisper → restore-cold mounts the SAME RestoreFlow the damaged branch uses, WITH onBack.
    fireEvent.click(screen.getByRole('button', { name: copy.coldStartRestoreAction }))
    const flow = await screen.findByTestId('restore-flow')
    expect(flow).toHaveAttribute('data-has-onback', 'true')
    // ColdStart is gone while the flow is up (kills a mutant that renders both).
    expect(screen.queryByRole('button', { name: copy.coldStartBegin })).toBeNull()

    // Back is never a trap: it returns to ColdStart, the flow unmounts.
    fireEvent.click(screen.getByRole('button', { name: 'restore-back' }))
    expect(await screen.findByRole('button', { name: copy.coldStartBegin })).toBeInTheDocument()
    expect(screen.queryByTestId('restore-flow')).toBeNull()
  })

  it('the damaged branch mounts the SAME RestoreFlow but WITHOUT an onBack (its file step is the flow’s first — nowhere back)', async () => {
    probeVault.mockResolvedValue({ kind: 'damaged' }) // whole-test, not a one-shot: see the afterEach note
    render(<App />)
    const flow = await screen.findByTestId('restore-flow')
    expect(flow).toHaveAttribute('data-has-onback', 'false')
    // No Back button, and no ColdStart to return to — the damaged mount stays byte-identical.
    expect(screen.queryByRole('button', { name: 'restore-back' })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.coldStartBegin })).toBeNull()
  })

  /**
   * REGRESSION — CI run 30169928294 (both arms above, red on Linux, green twice on Windows).
   *
   * The two arms above are BRANCH tests: each asserts where a probe verdict routes. Neither can
   * catch the defect that broke them, because the defect is in how the verdict is SUPPLIED — a
   * one-shot mock, drained by a call arriving from outside its own test (App.tsx:91 awaits a
   * dynamic import before probing, so its call can land after `cleanup()`), leaving the queuing
   * test to fall through to the default 'vault' and render the unlock screen.
   *
   * This arm pins the SUPPLY property instead: however many times the probe is called, an active
   * test's branch is what that test asked for. Revert either half of the fix — `mockResolvedValue`
   * back to `…Once`, or the afterEach's `mockReset` back to `mockClear` — and it goes red here, in
   * a second, deterministically, instead of intermittently on a machine none of us is sitting at.
   */
  it('REGRESSION: an extra or late probe call cannot change the branch the active test asked for', async () => {
    probeVault.mockResolvedValue({ kind: 'no-vault' })
    // Stand in for the stray calls the real defect produced: a dynamic-import-delayed probe from a
    // torn-down test, and a re-run of App's own `[seed, planting]` effect. A one-shot queue is
    // drained by these; a whole-test implementation is not.
    await probeVault()
    await probeVault()
    render(<App />)
    // Still ColdStart. Under the old supply this fell through to the default 'vault' → the unlock
    // screen, which is exactly the DOM CI reported.
    expect(await screen.findByRole('button', { name: copy.coldStartBegin })).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.unlockLabel)).toBeNull()
  })

  /**
   * The OTHER half of the same fix, made load-bearing. The arm above pins the per-test supply
   * (`mockResolvedValue` over `…Once`); this one pins the BOUNDARY (`mockReset` + re-seeded default
   * over `mockClear`, which leaves a previous test's implementation installed).
   *
   * It must run AFTER a test that set its own probe implementation, and it must rely on the DEFAULT
   * — otherwise it proves nothing. Every arm before it sets 'no-vault' or 'damaged', so under
   * `mockClear()` this inherits one of those and never reaches the unlock screen. ORDER IS THE
   * ASSERTION here: do not reorder this above its neighbours, and do not give it its own mock.
   */
  it('REGRESSION: the probe default is restored at the test boundary — a prior test’s verdict never leaks forward', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    // Deliberately NO probeVault mock: the re-seeded default ('vault') must route to Unlock.
    render(<App />)
    expect(await screen.findByLabelText(copy.unlockLabel)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.coldStartBegin })).toBeNull()
    expect(screen.queryByTestId('restore-flow')).toBeNull()
  })
})
