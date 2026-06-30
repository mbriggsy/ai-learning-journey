/**
 * The ONE vault session for the app (U8) — mirrors `appModel.ts`'s single module-level
 * instance so StrictMode's double-invoke and any number of importers share exactly one
 * `VaultSession` over exactly one open `VaultDb`. The DB is opened LAZILY on first use, so
 * the dev `?seed` / `?preview` paths (which never persist) pay nothing, and a fresh-visit
 * user with no vault opens the DB once for the startup probe.
 *
 * Everything here is dark backend plumbing the UI drives:
 *   - `probeVault()` — the startup has-vault check (App entry: vault → Unlock, else ColdStart).
 *   - `getVaultSession()` — `firstSave` (the ceremony) / `unlock` / `recoveryUnlock` /
 *     `setNewPassphrase` (decrypt-on-return).
 *   - `exportVaultFile()` — the mandatory backup, reading the COMMITTED vault (so it runs
 *     AFTER `firstSave`, per the as-built ordering reconciled in the U8 plan).
 */
import { openVaultDb, loadVault, type VaultDb, type VaultLoad } from '@store/db'
import { createSession, type VaultSession } from '@store/session'
import { exportVault, type ExportResult } from '@store/backup'

let dbPromise: Promise<VaultDb> | undefined
let sessionPromise: Promise<VaultSession> | undefined

/** The one open vault DB (memoized — opened at most once per realm). */
function getDb(): Promise<VaultDb> {
  return (dbPromise ??= openVaultDb())
}

/** The one vault session (memoized over the one DB). */
export function getVaultSession(): Promise<VaultSession> {
  return (sessionPromise ??= getDb().then(createSession))
}

/** The startup has-vault check: `no-vault` (fresh or evicted) → ColdStart; `vault` →
 *  the Unlock screen; `damaged` → the restore-from-backup path. */
export async function probeVault(): Promise<VaultLoad> {
  return loadVault(await getDb())
}

/** Produce the encrypted backup file (a string) from the committed vault. */
export async function exportVaultFile(): Promise<ExportResult> {
  return exportVault(await getDb())
}
