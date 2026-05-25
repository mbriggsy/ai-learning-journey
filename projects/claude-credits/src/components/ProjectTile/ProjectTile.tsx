import { useState } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'
import type { ProjectReport } from '@/types'
import { formatAge, formatInt } from '@/lib/format'
import styles from './ProjectTile.module.css'

// The whole-card single-link tile (Phase 4 Decision 16): the name is the only <Link>; its
// stretched ::after makes the entire card the hit-target. NO buttons on the tile (clean-tile,
// ideation §3). The lone gold moment is the hook stat value.
export function ProjectTile({ project }: { project: ProjectReport }) {
  const { projectName, editorial, grandTotals, git } = project
  const [imgError, setImgError] = useState(false)

  const age = formatAge(git.projectAgeDays)
  const hasImage = Boolean(editorial?.heroImage) && !imgError

  // editorial: null → fallback hook from grandTotals (still gold). Otherwise the editorial pick.
  const hook = editorial?.hookStat ?? {
    value: formatInt(grandTotals.authoredLines),
    label: 'lines authored',
  }

  return (
    <article data-tile className={clsx(styles.tile, hasImage ? styles.hasImage : styles.typeForward)}>
      {hasImage && (
        <div className={styles.imageFrame}>
          <img
            className={styles.image}
            src={editorial!.heroImage!}
            alt=""
            loading="lazy"
            // Runtime 404 (stale stats / deleted asset) → degrade to type-forward, never a
            // broken-image glyph. Phase 2 guards refresh-time; this guards runtime.
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {age && (
        <span className={styles.ribbon} aria-label={`${age} old`}>
          <span className="tabular">{age}</span>
        </span>
      )}

      <div className={styles.content}>
        <h3 className={styles.nameWrap}>
          <Link to={`/project/${projectName}`} className={styles.name}>
            {projectName}
          </Link>
        </h3>

        {editorial?.oneLiner && <p className={styles.oneLiner}>{editorial.oneLiner}</p>}

        <p className={styles.hook}>
          <span className={clsx(styles.hookValue, 'tabular')}>{hook.value}</span>
          <span className={styles.hookLabel}>{hook.label}</span>
        </p>
      </div>
    </article>
  )
}
