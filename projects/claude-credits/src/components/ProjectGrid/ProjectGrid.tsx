import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '@/motion/gsap-context'
import { duration, stagger } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import { useStats } from '@/hooks/useStats'
import { buildGridModel } from '@/lib/grid-order'
import { ProjectTile } from '@/components/ProjectTile/ProjectTile'
import { ArchiveTile } from '@/components/ArchiveTile/ArchiveTile'
import styles from './ProjectGrid.module.css'

export function ProjectGrid() {
  const report = useStats()
  const { active, archive, showMissesDivider, isEmpty } = buildGridModel(report)
  const gridRef = useRef<HTMLElement>(null)

  // Reveal-on-scroll. Everything lives inside ONE useGSAP({scope}) so the dev StrictMode
  // double-invoke reverts the gsap.set + batch cleanly. The hidden state is applied in JS
  // (never CSS opacity:0) so a dead/absent motion layer degrades to "all tiles visible".
  useGSAP(
    () => {
      // The refresh self-heal must run UNCONDITIONALLY — Phase 7's close beat depends on a
      // global ScrollTrigger.refresh() to position its own reveal (it doesn't re-roll the race).
      // So it runs even on an empty grid, ahead of any tile-specific work.
      const onLoad = () => ScrollTrigger.refresh()
      window.addEventListener('load', onLoad, { once: true })
      // fonts.ready (always resolves — a 404 woff2 still settles it) vs a 1500ms guard so the
      // refresh fires even if the FontFaceSet stalls. rAF defers to after layout.
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() =>
        requestAnimationFrame(() => ScrollTrigger.refresh()),
      )

      // Reduced motion: tiles stay at their final visible state (CSS default) — return BEFORE
      // any gsap.set hidden state (mirrors the hero's branch).
      if (prefersReducedMotion()) {
        return () => window.removeEventListener('load', onLoad)
      }

      // Hidden state in JS (P0 guard, Decision 8a) — FIRST statement of the motion branch, so a
      // dead layer can't leave tiles stuck hidden (CSS default is visible; JS removes then restores).
      gsap.set('[data-tile]', { autoAlpha: 0, y: 40 })

      // The y:40 offset displaces each tile's measured top, so reset it to 0 during refresh
      // measurement (batch can't take invalidateOnRefresh). The listener is on GSAP's GLOBAL
      // bus — useGSAP's context revert does NOT remove it, so it MUST be removed in cleanup or
      // the StrictMode double-invoke leaks a second listener closing over torn-down refs.
      const resetTileY = () => gsap.set('[data-tile]', { y: 0 })
      ScrollTrigger.addEventListener('refreshInit', resetTileY)

      ScrollTrigger.batch('[data-tile]', {
        start: 'top 85%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, {
            autoAlpha: 1,
            y: 0,
            duration: duration.reveal,
            ease: 'weighted-arrive',
            stagger: stagger.tiles,
            overwrite: true,
          }),
      })

      return () => {
        window.removeEventListener('load', onLoad)
        ScrollTrigger.removeEventListener('refreshInit', resetTileY)
      }
    },
    { scope: gridRef },
  )

  // Empty → render nothing; the hero stands alone (never an empty <section>).
  if (isEmpty) return null

  return (
    <section ref={gridRef} className={styles.grid} aria-label="Projects">
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
