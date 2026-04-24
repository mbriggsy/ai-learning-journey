#!/usr/bin/env tsx
export {}
/**
 * `pnpm playtest:purge` entrypoint.
 *
 * Manual purge for session dirs under docs/testing/playtest/runs/. Unit 1
 * ships the --help wiring; full implementation lands in Unit 6.
 */

const USAGE = `
Usage: pnpm playtest:purge [options]

Manually purges session dirs under docs/testing/playtest/runs/. Rolling
retention (sessionDirRetention = 10) runs automatically on every session
finalize — this command is for explicit, operator-initiated deletion
(e.g. after a --no-scrub investigation).

Options:
  --before <YYYY-MM-DD>   Delete all sessions finalized before this date.
  --session-id <id>       Delete a specific session by id.
  --full-dir <id>         Alias for --session-id; emphasized for sharing
                          workflows (see README §3).
  --help                  Print this message.

See scripts/playtest/README.md §3 + §4 for when to purge.
`.trim()

function main(argv: readonly string[]): void {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    return
  }
  throw new Error('not implemented')
}

main(process.argv.slice(2))
