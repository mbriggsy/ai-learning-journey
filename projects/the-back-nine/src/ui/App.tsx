import { lazy, Suspense, useEffect, useState } from 'react'
import { ColdStart } from '@intake/coldStart'
import { copy } from './copy'
import { UpdateToast } from './UpdateToast'
import { Disclaimer } from './Disclaimer'
import { UnlockScreen, VaultDamagedNotice } from './UnlockScreen'

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
const IntakeApp = lazy(() => import('./IntakeApp'))

/** Where the entry router is. `began` mounts IntakeApp — `hydrate` distinguishes a decrypt-on-return
 *  (read the unlocked vault's model) from a cold/seed start (hydrate from ColdStart or the dev seed).
 *  `planting` is the DEV `?vault` step that writes a vault before showing the unlock screen. */
type Entry =
  | { readonly kind: 'probing' }
  | { readonly kind: 'planting' }
  | { readonly kind: 'cold' }
  | { readonly kind: 'unlock' }
  | { readonly kind: 'damaged' }
  | { readonly kind: 'began'; readonly hydrate: boolean }

/** `seed`/`vaultSeed` are the DEV-only `?seed`/`?vault` values (always null in prod — the gate lives
 *  in main.tsx). `seed` skips the probe and seeds a result; `vaultSeed` plants a vault then unlocks. */
export function App({ seed, vaultSeed }: { seed?: string | null; vaultSeed?: string | null }) {
  const planting = import.meta.env.DEV && vaultSeed != null
  const [entry, setEntry] = useState<Entry>(
    seed != null ? { kind: 'began', hydrate: false } : planting ? { kind: 'planting' } : { kind: 'probing' },
  )
  /** DEV-only: the passphrase a `?vault` plant minted, pre-filled into the unlock screen (never set in
   *  prod — the plant path is DCE'd). */
  const [devPrefill, setDevPrefill] = useState<string | undefined>(undefined)

  useEffect(() => {
    void import('./IntakeApp') // warm the chunk behind the cold-start / probe frame
  }, [])

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
  const showAppTitleH1 = entry.kind === 'unlock' || entry.kind === 'damaged' || entry.kind === 'began'

  return (
    <>
      {showAppTitleH1 && <h1 className="sr-only">{copy.appTitle}</h1>}
      {(entry.kind === 'probing' || entry.kind === 'planting') && null /* brief neutral hold */}
      {entry.kind === 'cold' && <ColdStart onBegin={() => setEntry({ kind: 'began', hydrate: false })} />}
      {entry.kind === 'unlock' && (
        <UnlockScreen initialPassphrase={devPrefill} onUnlocked={() => setEntry({ kind: 'began', hydrate: true })} />
      )}
      {entry.kind === 'damaged' && <VaultDamagedNotice />}
      {entry.kind === 'began' && (
        <Suspense fallback={null}>
          <IntakeApp seed={seed} hydrateFromVault={entry.hydrate} />
        </Suspense>
      )}
      <UpdateToast />
      <Disclaimer />
    </>
  )
}
