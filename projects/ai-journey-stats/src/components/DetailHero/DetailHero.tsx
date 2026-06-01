import clsx from 'clsx'
import type { ProjectReport } from '@/types'
import { formatInt } from '@/lib/format'
import { Sentences } from '@/components/Sentences/Sentences'
import styles from './DetailHero.module.css'

/**
 * Movement 1 — the type-led opener (Phase 5 Decision 7). The site carries no project imagery
 * (Phase 9), so the opener is the display name headline, a mono ledger subtitle, then the
 * editorial one-liner.
 *
 * HONESTY: the plan's original "Born N days ago" subtitle clause is DROPPED. `projectAgeDays`
 * is path-scoped git span, polluted by the monorepo bulk-import — the age ribbon was already
 * cut for exactly this (insight 005). Commit + file COUNTS are honest (they're counts, not
 * date spans), so the subtitle is "N commits · N files".
 */
export function DetailHero({ project }: { project: ProjectReport }) {
  const { projectName, editorial, git, grandTotals } = project

  return (
    <header className={styles.hero}>
      <h1 className={styles.name}>{projectName}</h1>
      <p className={clsx(styles.subtitle, 'tabular')}>
        {formatInt(git.totalCommits)} commits · {formatInt(grandTotals.allFiles)} files
      </p>
      {editorial?.oneLiner && (
        <p className={styles.oneLiner}>
          <Sentences text={editorial.oneLiner} />
        </p>
      )}
    </header>
  )
}
