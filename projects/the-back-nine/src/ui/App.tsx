import { lazy, Suspense, useEffect, useState } from 'react'
import { ColdStart } from '@intake/coldStart'
import { copy } from './copy'
import { UpdateToast } from './UpdateToast'
import { Disclaimer } from './Disclaimer'
import { UnlockScreen } from './UnlockScreen'
import { ViewOnlyBanner } from './ViewOnlyBanner'
import { AppErrorBoundary } from './ErrorBoundary'
import type { UnlockCopyKey } from './unlockCopy'

/**
 * The P2 app body: a startup vault PROBE routes the returning user, then the D1 account-level guided
 * intake (with the provisional answer strip co-existing above the questions, cross-cutting #6).
 *
 * THE THREE-WAY ENTRY (U8 decrypt-on-return). On mount (when there is no dev `?seed`/`?vault`)
 * `probeVault()` reads IndexedDB: `vault` → the Unlock screen; `damaged` → the interim damaged notice
 * (restore-from-file is surface 4); `no-vault` (fresh or evicted) → ColdStart. A brief neutral hold
 * covers the probe so a returning user never flashes "brand new?" and a fresh user never flashes
 * "welcome back". The probe is a DYNAMIC import so `vaultSession`'s crypto/KDF/backup graph stays out
 * of the entry chunk (it warms off the first-paint path here, ready by the time Unlock's submit needs it).
 *
 * DEV SHORTCUTS (DCE'd from prod): `?seed=<key>` jumps straight to a seeded result; `?vault=<key>`
 * PLANTS an encrypted vault from that seed and drops onto the unlock screen with the passphrase
 * pre-filled — so decrypt-on-return is one click, no re-driving the intake + Save ceremony.
 *
 * THE SPLIT: the intake subtree (and its engine tables) is a lazy chunk so the entry JS stays inside
 * the 300 KiB budget; it warms during the cold-start / probe read so Begin/Unlock never visibly wait.
 * The Suspense fallback is deliberately EMPTY — the warm chunk makes it a sub-frame flash at worst.
 */
/**
 * ONE MEMOIZED LOADER PER CHUNK — a CORRECTNESS constraint, not a tidy-up. Do not inline these back
 * into the `lazy()` calls, and do not call `import()` for these three anywhere else.
 *
 * Every chunk below is imported from TWO places: the `lazy()` initializer, and the warm effect that
 * fires when its launching surface shows. Those two calls can OVERLAP — and under Vitest an
 * overlapping second import of a `vi.mock`'d module is silently served the REAL module. Vite hands a
 * module ONE mutable callstack array for its whole lifetime (`vite/dist/node/module-runner.js`
 * :1214-1218, bound as the ssr import keys at :1247-1248); Vitest push/splices the mocked id around
 * an await (`startVitestModuleRunner…js:393-403`, carrying its own warning on line 395 — *"this will
 * not work if user does Promise.all(import(), import())"*); and a second arrival inside that window
 * trips the `isSelfImport` bail-out straight to `_vitest_original` (:560-563). `React.lazy` then
 * caches that resolution permanently, so ONE lost race pins the real component for the whole file.
 *
 * That is how `App.test.tsx`'s survivor-door arm intermittently mounted the REAL `RecoveryFlow` — no
 * `data-testid`, so its `findBy` could never succeed and burned the entire budget instead. CI run
 * 30310885497 is the only one whose inner budget was smaller than the outer, so it is the only one
 * that printed the DOM: "Use your recovery word" / "Open with my recovery word"
 * (`RecoveryFlow.tsx:176`/`:231`). Three sibling runs read as bare timeouts and cost two wrong
 * prescriptions, both of which raised a clock. Memoizing makes the overlap UNREPRESENTABLE rather
 * than unlikely — there is only ever one `import()` in flight per chunk.
 *
 * THE `.catch` IS LOAD-BEARING, NOT DEFENSIVE. A bare `??=` would cache a REJECTED promise. Today the
 * two call sites are independent, so a warm that fails does NOT poison the click — it still gets a
 * fresh fetch. Clearing the slot on failure preserves exactly that retry. `ErrorBoundary.tsx:2-8`
 * names the case this protects ("offline + SW-cache eviction, version skew after an update … worst on
 * the offline survivor's restore door"), and silently deleting a retry there is the calm-but-wrong
 * direction. The clear runs only after the promise has settled, never concurrently, so the
 * single-flight guarantee above is untouched.
 */
let intakeAppChunk: Promise<typeof import('./IntakeApp')> | null = null
const loadIntakeApp = (): Promise<typeof import('./IntakeApp')> =>
  (intakeAppChunk ??= import('./IntakeApp').catch((err: unknown) => {
    intakeAppChunk = null
    throw err
  }))

let recoveryFlowChunk: Promise<typeof import('./RecoveryFlow')> | null = null
const loadRecoveryFlow = (): Promise<typeof import('./RecoveryFlow')> =>
  (recoveryFlowChunk ??= import('./RecoveryFlow').catch((err: unknown) => {
    recoveryFlowChunk = null
    throw err
  }))

let restoreFlowChunk: Promise<typeof import('./RestoreFlow')> | null = null
const loadRestoreFlow = (): Promise<typeof import('./RestoreFlow')> =>
  (restoreFlowChunk ??= import('./RestoreFlow').catch((err: unknown) => {
    restoreFlowChunk = null
    throw err
  }))

const IntakeApp = lazy(loadIntakeApp)

/** Lazy for the ENTRY BUDGET, not rarity: both flows statically pull PassphraseStep → the
 *  zxcvbn floor seam, which must not ride the entry chunk. Each is warmed when its launching
 *  surface shows, so the click into it never visibly waits. */
const RecoveryFlow = lazy(() => loadRecoveryFlow().then((m) => ({ default: m.RecoveryFlow })))
const RestoreFlow = lazy(() => loadRestoreFlow().then((m) => ({ default: m.RestoreFlow })))

/** Where the entry router is. `began` mounts IntakeApp — `hydrate` distinguishes a decrypt-on-return
 *  (read the unlocked vault's model) from a cold/seed start (hydrate from ColdStart or the dev seed);
 *  `notice` carries the unlock's read-only caveat key (Fork C ii — a second tab holds the writer) for
 *  the standing ViewOnlyBanner, null on a writable open (cold/seed/recovery are writable by
 *  construction). `planting` is the DEV `?vault` step that writes a vault before the unlock screen.
 *  `restore-cold` is ColdStart's quiet restore door: a WIPED/evicted device probes no-vault → cold,
 *  and its whisper routes here to the SAME RestoreFlow the `damaged` branch mounts (backup file +
 *  recovery word → a fresh passphrase → auto-unlock), only with a Back that returns to `cold`. */
type Entry =
  | { readonly kind: 'probing' }
  | { readonly kind: 'planting' }
  | { readonly kind: 'cold' }
  | { readonly kind: 'restore-cold' }
  | { readonly kind: 'unlock' }
  | { readonly kind: 'recover' }
  | { readonly kind: 'damaged' }
  | { readonly kind: 'began'; readonly hydrate: boolean; readonly notice: UnlockCopyKey | null }

/** `seed`/`vaultSeed` are the DEV-only `?seed`/`?vault` values (always null in prod — the gate lives
 *  in main.tsx). `seed` skips the probe and seeds a result; `vaultSeed` plants a vault then unlocks. */
export function App({ seed, vaultSeed }: { seed?: string | null; vaultSeed?: string | null }) {
  const planting = import.meta.env.DEV && vaultSeed != null
  const [entry, setEntry] = useState<Entry>(
    seed != null
      ? { kind: 'began', hydrate: false, notice: null }
      : planting
        ? { kind: 'planting' }
        : { kind: 'probing' },
  )
  /** DEV-only: the passphrase a `?vault` plant minted, pre-filled into the unlock screen (never set in
   *  prod — the plant path is DCE'd). */
  const [devPrefill, setDevPrefill] = useState<string | undefined>(undefined)

  useEffect(() => {
    void loadIntakeApp() // warm the chunk behind the cold-start / probe frame
  }, [])

  // Warm each flow chunk once its launching surface is up — the forgot link's destination, and the
  // restore surface behind BOTH its doors: the damaged branch AND ColdStart's quiet restore whisper
  // (warm on `cold` so the wiped user's tap into restore-cold never visibly waits).
  useEffect(() => {
    if (entry.kind === 'unlock') void loadRecoveryFlow()
    if (entry.kind === 'damaged' || entry.kind === 'cold') void loadRestoreFlow()
  }, [entry.kind])

  // The startup vault probe (skipped when a dev seed/vault drives the mount). Dynamic import keeps the
  // crypto graph out of entry; a DB-open failure falls to ColdStart (in-session-only degraded mode —
  // the pre-probe behaviour — never a crash, never a false "damaged").
  useEffect(() => {
    if (seed != null || planting) return
    let cancelled = false
    void (async () => {
      try {
        const { probeVault } = await import('./vaultSession')
        const v = await probeVault()
        if (cancelled) return
        setEntry(v.kind === 'vault' ? { kind: 'unlock' } : v.kind === 'damaged' ? { kind: 'damaged' } : { kind: 'cold' })
      } catch {
        if (!cancelled) setEntry({ kind: 'cold' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [seed, planting])

  // DEV `?vault=<key>`: plant an encrypted vault from the seed, then show the unlock screen with the
  // passphrase pre-filled. DEV-gated + dynamically imported → the plant graph (crypto/store) is DCE'd
  // from prod. A bad key / failure falls to ColdStart with a dev console error.
  useEffect(() => {
    // Inline `import.meta.env.DEV` (not the `planting` const) so Rollup statically DCEs this whole
    // body — including the `import('./devSeeds')` and its crypto graph — from the prod bundle, exactly
    // like the `?seed` effect. (Proven by grepping dist/ for the dev passphrase.)
    if (!(import.meta.env.DEV && vaultSeed != null)) return
    let cancelled = false
    void import('./devSeeds').then(async ({ plantDevVault, DEV_VAULT_PASSPHRASE }) => {
      const result = await plantDevVault(vaultSeed)
      if (cancelled) return
      if (result === 'ok') {
        // Strip `?vault` the moment the plant lands: the plant CLEARS any existing vault first
        // (devSeeds clearVault → firstSave), so leaving the param armed makes a plain REFRESH
        // silently re-plant the pristine seed OVER whatever the drive just edited-and-saved —
        // caught live (Briggsy, 2026-07-02: a saved birthday reverted on refresh). With the param
        // stripped, a refresh probes the REAL vault exactly like prod; re-planting is an explicit
        // re-entry of the `?vault` URL, never a side effect of refresh.
        const url = new URL(window.location.href)
        url.searchParams.delete('vault')
        window.history.replaceState(null, '', url)
        setDevPrefill(DEV_VAULT_PASSPHRASE)
        setEntry({ kind: 'unlock' })
      } else {
        console.error(`[?vault] plantDevVault(${vaultSeed}) failed: ${result}`)
        setEntry({ kind: 'cold' })
      }
    })
    return () => {
      cancelled = true
    }
  }, [vaultSeed])

  // The visually-hidden app-title <h1> gives every IN-APP view a single top-level heading so the
  // unlock/result <h2> headings nest under it (ColdStart owns its own visible <h1>; the probe/plant
  // holds are pre-content). One stable app-title h1 across these SPA states (council 2026-06-29).
  const showAppTitleH1 =
    entry.kind === 'unlock' ||
    entry.kind === 'recover' ||
    entry.kind === 'damaged' ||
    entry.kind === 'restore-cold' ||
    entry.kind === 'began'

  return (
    <AppErrorBoundary>
      {showAppTitleH1 && <h1 className="sr-only">{copy.appTitle}</h1>}
      {/* The standing read-only notice (Fork C ii) — always mounted so the populate announces
          (burned/045); empty (zero footprint) on every writable path. */}
      <ViewOnlyBanner notice={entry.kind === 'began' ? entry.notice : null} />
      {(entry.kind === 'probing' || entry.kind === 'planting') && null /* brief neutral hold */}
      {entry.kind === 'cold' && (
        <ColdStart
          onBegin={() => setEntry({ kind: 'began', hydrate: false, notice: null })}
          onRestore={() => setEntry({ kind: 'restore-cold' })}
        />
      )}
      {entry.kind === 'restore-cold' && (
        <Suspense fallback={null}>
          {/* The SAME restore surface as the damaged branch, plus a Back to ColdStart (the wiped
              user who taps in, then remembers they're new here, is never trapped). */}
          <RestoreFlow
            onRestored={(notice) => setEntry({ kind: 'began', hydrate: true, notice })}
            onExitToUnlock={() => setEntry({ kind: 'unlock' })}
            onBack={() => setEntry({ kind: 'cold' })}
          />
        </Suspense>
      )}
      {entry.kind === 'unlock' && (
        <UnlockScreen
          initialPassphrase={devPrefill}
          onUnlocked={(notice) => setEntry({ kind: 'began', hydrate: true, notice })}
          onForgot={() => setEntry({ kind: 'recover' })}
        />
      )}
      {entry.kind === 'recover' && (
        <Suspense fallback={null}>
          <RecoveryFlow
            // Writable by construction: recovery re-mints through the writer path (a second tab
            // holding the writer makes recoveryUnlock REFUSE, never open read-only) — no notice.
            onRecovered={() => setEntry({ kind: 'began', hydrate: true, notice: null })}
            onExit={() => setEntry({ kind: 'unlock' })}
          />
        </Suspense>
      )}
      {entry.kind === 'damaged' && (
        <Suspense fallback={null}>
          <RestoreFlow
            onRestored={(notice) => setEntry({ kind: 'began', hydrate: true, notice })}
            onExitToUnlock={() => setEntry({ kind: 'unlock' })}
          />
        </Suspense>
      )}
      {entry.kind === 'began' && (
        <Suspense fallback={null}>
          {/* `notice !== null` is the read-only verdict (the notice IS the read-only-open caveat) —
              the SAME signal the standing ViewOnlyBanner keys off, so the banner discloses and the
              result surface withholds every save CTA in lockstep (a save can't land in this tab). */}
          <IntakeApp seed={seed} hydrateFromVault={entry.hydrate} readOnly={entry.notice !== null} />
        </Suspense>
      )}
      <UpdateToast />
      <Disclaimer />
    </AppErrorBoundary>
  )
}
