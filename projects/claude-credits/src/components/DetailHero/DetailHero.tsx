import { useState } from 'react'
import clsx from 'clsx'
import type { ProjectReport } from '@/types'
import { formatInt } from '@/lib/format'
import styles from './DetailHero.module.css'

/**
 * Movement 1 — the magazine opener (Phase 5 Decision 7). A ~58/42 text/image split on
 * desktop; stacks text→image on mobile. Name is the display headline, a mono ledger subtitle,
 * then the editorial one-liner.
 *
 * HONESTY: the plan's original "Born N days ago" subtitle clause is DROPPED. `projectAgeDays`
 * is path-scoped git span, polluted by the monorepo bulk-import — the age ribbon was already
 * cut for exactly this (insight 005). Commit + file COUNTS are honest (they're counts, not
 * date spans), so the subtitle is "N commits · N files".
 */
export function DetailHero({ project }: { project: ProjectReport }) {
  const { projectName, editorial, git, grandTotals } = project
  const [imgError, setImgError] = useState(false)

  // Narrow once: runtime 404 (stale stats / deleted asset) → null → type-forward, never a
  // broken-image glyph. Mirrors ProjectTile's single-source-of-truth pattern.
  const heroSrc = imgError ? null : (editorial?.heroImage ?? null)

  return (
    <header className={clsx(styles.hero, heroSrc ? styles.hasImage : styles.typeForward)}>
      <div className={styles.text}>
        <h1 className={styles.name}>{projectName}</h1>
        <p className={clsx(styles.subtitle, 'tabular')}>
          {formatInt(git.totalCommits)} commits · {formatInt(grandTotals.allFiles)} files
        </p>
        {editorial?.oneLiner && <p className={styles.oneLiner}>{editorial.oneLiner}</p>}
      </div>

      {heroSrc && (
        <div className={styles.imageFrame}>
          <img
            className={styles.image}
            src={heroSrc}
            alt=""
            onError={() => setImgError(true)}
          />
        </div>
      )}
    </header>
  )
}
