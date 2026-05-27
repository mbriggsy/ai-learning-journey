import type { ArchiveCollective } from '@/types'
import { formatInt } from '@/lib/format'
import styles from './ArchiveTile.module.css'

// The "misses" coda (Phase 4 Decision 6): ONE muted, NON-interactive tile rolled up from
// archiveCollective — never individual shelved tiles, never a link, never gold. Copy is
// DERIVED from projectCount (never hardcoded), so it can't silently lie if the archive changes.
// The "The misses" band label lives on the ProjectGrid divider above this tile, so the tile
// does NOT repeat it as a title — it leads with the copy.
//
// Stat = totalAuthoredLines (NOT totalCommits as the plan locked): the real data is 8 commits,
// which defeats the plan's own "real work, then shelved" rationale; authoredLines (~91.5K) is
// more than several active projects and tells the "we built a lot then walked away" story. The
// lesson line is the documented real reason these were shelved (presentation > systems).
export function ArchiveTile({ archive }: { archive: ArchiveCollective }) {
  return (
    <article data-tile className={styles.tile}>
      <p className={styles.copy}>
        {archive.projectCount} builds, tried and shelved. Presentation beat systems.
      </p>
      <p className={styles.stat}>
        <span className={`${styles.statValue} tabular`}>{formatInt(archive.totalAuthoredLines)}</span>
        <span className={styles.statLabel}>lines, shelved</span>
      </p>
    </article>
  )
}
