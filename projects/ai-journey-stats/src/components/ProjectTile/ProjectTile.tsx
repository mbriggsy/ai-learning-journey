import { Link } from 'react-router'
import clsx from 'clsx'
import type { ProjectReport } from '@/types'
import { formatInt } from '@/lib/format'
import { Sentences } from '@/components/Sentences/Sentences'
import styles from './ProjectTile.module.css'

// The whole-card single-link tile (Phase 4 Decision 16): the name is the only <Link>; its
// stretched ::after makes the entire card the hit-target. NO buttons on the tile (clean-tile,
// ideation §3). Type-forward by design — the site carries no project imagery (Phase 9). The
// lone gold moment is the hook stat value.
export function ProjectTile({ project }: { project: ProjectReport }) {
  const { projectName, editorial, grandTotals } = project

  // editorial: null → fallback hook from grandTotals (still gold). Otherwise the editorial pick.
  const hook = editorial?.hookStat ?? {
    value: formatInt(grandTotals.authoredLines),
    label: 'lines authored',
  }

  return (
    // Reveal wrapper ([data-tile]) is the GSAP transform target; the inner .tile owns the CSS
    // hover transform. Separating them avoids the inline-transform-vs-CSS-hover fight (GSAP
    // leaves an inline transform after the reveal tween, which would beat a stylesheet :hover).
    <div data-tile className={styles.tileReveal}>
      <article className={styles.tile}>
        <div className={styles.content}>
          <h3 className={styles.nameWrap}>
            <Link to={`/project/${encodeURIComponent(projectName)}`} className={styles.name}>
              {projectName}
            </Link>
          </h3>

          {editorial?.oneLiner && (
            <p className={styles.oneLiner}>
              <Sentences text={editorial.oneLiner} />
            </p>
          )}

          <p className={styles.hook}>
            <span className={clsx(styles.hookValue, 'tabular')}>{hook.value}</span>
            <span className={styles.hookLabel}>{hook.label}</span>
          </p>
        </div>
      </article>
    </div>
  )
}
