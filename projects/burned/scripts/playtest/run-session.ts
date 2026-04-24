#!/usr/bin/env tsx
/**
 * `pnpm playtest:run` entrypoint.
 *
 * Full implementation arrives incrementally across Units 2–10. Unit 1 ships
 * argv parsing + --help wiring so the script resolves and `--help` prints
 * usage without throwing. Any other invocation throws `'not implemented'`.
 */
import { runSession } from './lib/orchestrator'
import type { Config } from './lib/types'

const USAGE = `
Usage: pnpm playtest:run [options]

Drives a deterministic, Playwright-automated BURNED playtest session against
a local wrangler dev + vite dev pair. Writes a self-contained run directory
under docs/testing/playtest/runs/<session-id>/.

Options:
  --config <path>         Path to a JSON config (extends default-config.json).
  --seats <N>             Number of seats (2..10).
  --seed <S>              RNG seed (integer; omit for CSPRNG).
  --viewport <WxH>        Override viewport (e.g. 390x844).
  --no-scrub              Disable the card-ID scrubber. DANGEROUS — see README.
  --help                  Print this message.

See scripts/playtest/README.md for the full operator-facing contract,
trust model, retention policy, and --no-scrub warning.
`.trim()

function main(argv: readonly string[]): void {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    return
  }

  // Unit 1: full argv parsing + config merge arrive in later units. For now,
  // invocations without --help hit the orchestrator stub, which throws.
  const config = {} as Config
  void runSession(config)
}

main(process.argv.slice(2))
