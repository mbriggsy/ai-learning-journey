/**
 * Write-to-temp-then-rename for crash-safe outputs.
 *
 * Mid-process crashes (ctrl-C, OOM, killed wrangler) during a normal
 * `writeFileSync` leave behind a half-written file. Hash-based regen
 * then can't distinguish "stale because text changed" from "stale
 * because half-written" — and re-running with `--force` is the only
 * recovery path. Atomic rename closes that hole: the final filename
 * never exists until the bytes are complete.
 */
import { renameSync, writeFileSync } from 'node:fs';

export function atomicWriteSync(path: string, data: Buffer | string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}
