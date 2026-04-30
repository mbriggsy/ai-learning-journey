/**
 * One-shot CLI to regenerate `runs/<id>/issues/INDEX.md` from the
 * issue files present on disk. Used after dispatching triage agents
 * post-hoc when the orchestrator's built-in INDEX.md was generated
 * before the agents wrote their issues.
 *
 * Usage:
 *   pnpm tsx scripts/playtest/regen-issue-index.ts <issuesDir>
 */
import { buildIssueIndex } from './lib/build-issue-index'

async function main() {
  const issuesDir = process.argv[2]
  if (issuesDir === undefined || issuesDir === '') {
    console.error('usage: regen-issue-index.ts <issuesDir>')
    process.exit(1)
  }
  const result = await buildIssueIndex({ issuesDir })
  console.log(`INDEX.md written: ${result.indexPath}`)
  console.log(`total: ${result.counts.total}`)
  console.log(`byStatus: ${JSON.stringify(result.counts.byStatus)}`)
  console.log(`bySeverity: ${JSON.stringify(result.counts.bySeverity)}`)
  console.log(`bySeedKind: ${JSON.stringify(result.counts.bySeedKind)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
