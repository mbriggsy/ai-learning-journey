#!/usr/bin/env tsx
export {}
/**
 * `pnpm playtest:selftest` entrypoint.
 *
 * Runs the 7-check isolation self-test (phase-3 D12 / Unit 7). Unit 1 ships
 * the --help wiring; full implementation lands in Unit 7.
 */

const USAGE = `
Usage: pnpm playtest:selftest [options]

Runs the isolation self-test — 7 checks that validate the harness is a safe
observer (no cross-seat leakage, no god-mode reachable by seat agents, token
gate rejecting unauthenticated connections). Must pass within 24h of every
\`pnpm playtest:run\` invocation.

Options:
  --help                  Print this message.

See scripts/playtest/README.md §2 Trust Model.
`.trim()

function main(argv: readonly string[]): void {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    return
  }
  throw new Error('not implemented')
}

main(process.argv.slice(2))
