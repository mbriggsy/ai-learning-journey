/**
 * The solve-timing instrument's PLANT — bundled at spec time (vite JS API, IIFE) and injected into
 * the built `dist/` app on the harness's CONTROL origin (the `vault.spec.ts` precedent: injected
 * script is exactly what the enforced origin's `script-src 'self'` blocks, and the vault + engine
 * code paths are origin-agnostic).
 *
 * WHY A PLANT, NOT A SEED ROUTE: `?seed=` and `?vault=` are DCE'd out of the production bundle
 * (`main.tsx` / `App.tsx`), so a production build cannot be TOLD which household to load — but it
 * CAN unlock one it finds in its own IndexedDB. This writes the dev seed's household there with the
 * SAME `plantDevVault` the dev `?vault=` route runs, so the measured app is the shipped bundle byte
 * for byte, and only its storage was prepared. Nothing here touches `dist/`.
 */
import { DEV_VAULT_PASSPHRASE, plantDevVault } from '../../src/ui/devSeeds'

export interface PlantReport {
  readonly result: string
  readonly passphrase: string
}

export async function plant(key: string): Promise<PlantReport> {
  return { result: await plantDevVault(key), passphrase: DEV_VAULT_PASSPHRASE }
}
