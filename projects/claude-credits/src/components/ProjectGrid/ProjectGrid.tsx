import { useStats } from '@/hooks/useStats'
import { buildGridModel } from '@/lib/grid-order'
import { ProjectTile } from '@/components/ProjectTile/ProjectTile'
import { ArchiveTile } from '@/components/ArchiveTile/ArchiveTile'
import styles from './ProjectGrid.module.css'
// C3 adds: useRef + { gsap, useGSAP, ScrollTrigger } + { duration, stagger } + prefersReducedMotion

export function ProjectGrid() {
  const report = useStats()
  const { active, archive, showMissesDivider, isEmpty } = buildGridModel(report)

  // Empty → render nothing; the hero stands alone (never an empty <section>).
  if (isEmpty) return null

  return (
    <section className={styles.grid} aria-label="Projects">
      <div className={styles.gridInner}>
        {active.map((project) => (
          <ProjectTile key={project.projectName} project={project} />
        ))}

        {showMissesDivider && (
          <div className={styles.divider}>
            <h2 className={styles.dividerLabel}>The misses</h2>
          </div>
        )}

        {archive && <ArchiveTile archive={archive} />}
      </div>
    </section>
  )
}
