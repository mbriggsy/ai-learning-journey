import { useRef } from 'react'
import { Link } from 'react-router'
import { useStats } from '@/hooks/useStats'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import {
  formatInt,
  formatBytes,
  formatTokens,
  formatModelList,
  formatAsOf,
  formatWindowClause,
} from '@/lib/format'
import { gsap, useGSAP } from '@/motion/gsap-context'
import { duration, stagger } from '@/motion/tokens'
import { ease } from '@/motion/easings'
import { HeroCounter } from './HeroCounter'
import styles from './Hero.module.css'

export function Hero() {
  const heroRef = useRef<HTMLElement>(null) // GSAP scope root (used by the C3 reveal timeline)
  const { combined, projects, archiveCollective, scannedAt } = useStats()
  const projectCount = projects.length + (archiveCollective?.projectCount ?? 0)

  // Null discipline (Phase 0): tokenWindowDays is null ⇔ NO project had a measured token
  // window ⇔ no session data (clean clone / CI). This is the "unmeasured" signal — NOT
  // `totalTokensProcessed > 0`, which would conflate "unmeasured" with a measured-zero.
  const hasTokens = combined.tokenWindowDays !== null
  // Secondary guard: if there's also no git history, lead with the project count rather than
  // a "0 LINES AUTHORED" hero (the bar forbids a zero hero).
  const hasAuthored = combined.totalAuthoredLines > 0

  const modelClause = formatModelList(combined.modelBreakdown)
  // Shared honest window clause (one source — code review F5) so Hero/TokensBlock/Close never drift.
  const windowClause = formatWindowClause(combined.tokenWindowDays)
  // Staleness-honesty signal (Phase 8 Decision 9): the data is refreshed manually, so surface
  // when it was last measured. Quiet — it rides the honest sub-line beside the window. Shared,
  // guarded, UTC-pinned formatter: malformed scannedAt → null → the "as of" clause is omitted
  // (never "Invalid Date"), and the date never drifts a day for viewers west of UTC.
  const asOf = formatAsOf(scannedAt)

  // One matchMedia read per render, shared by the reveal branch and the data attribute below.
  const reducedMotion = prefersReducedMotion()

  // Reveal choreography (Decision 10): the number group (counter + unit label + honest
  // sub-line) lands EARLY so the `fresh` credibility anchor is in the first glance — only
  // the supporting line + taxonomy hint stagger in after the counter settles. autoAlpha + y,
  // never scale(0). Scoped to heroRef so useGSAP auto-reverts on StrictMode's double-invoke.
  useGSAP(
    () => {
      if (reducedMotion) return // CSS net + HeroCounter already render the final state
      // Scope the selectors to heroRef — useGSAP's {scope} governs context REVERT, not selector
      // resolution; a bare string would resolve document-wide (insight 004). Matches ProjectGrid.
      gsap.from(gsap.utils.toArray('[data-reveal="number"]', heroRef.current), {
        autoAlpha: 0,
        y: 12,
        duration: 0.6,
        ease: ease.arrive,
      })
      gsap.from(gsap.utils.toArray('[data-reveal="after"]', heroRef.current), {
        autoAlpha: 0,
        y: 16,
        duration: 0.6,
        ease: ease.arrive,
        stagger: stagger.supportingLines, // 0.08
        delay: duration.counter, // 2.4 — secondary context follows the magnitude
      })
    },
    // [] = mount-only. useStats() is read-once (stable promise), but pin it explicitly so a
    // future re-render can't restart the reveal mid-play (default is run-on-every-render).
    { scope: heroRef, dependencies: [] },
  )

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      data-reduced-motion={reducedMotion} // CSS branches the sheen base off this (C3)
    >
      <div className={styles.breath} aria-hidden /> {/* gradient-breath layer (CSS @keyframes, C3) */}
      {/* reveal group: number + label + honest sub-line land together early (Decision 10) */}
      <div data-reveal="number">
        {hasTokens ? (
          <>
            <HeroCounter value={combined.totalTokensProcessed} srUnit="tokens processed" />
            <p className={styles.unitLabel}>
              TOKENS PROCESSED
              {modelClause && <span className={styles.modelClause}> · {modelClause}</span>}
            </p>
            <p className={styles.honest}>
              <span className="tabular">{formatTokens(combined.totalTokensFresh)}</span> fresh
              {windowClause && <> · {windowClause}</>}
              {asOf && <> · as of {asOf}</>}
            </p>
          </>
        ) : hasAuthored ? (
          // Null-degrade: no token data. Lead with authored lines, suppress the token sub-line.
          <>
            <HeroCounter value={combined.totalAuthoredLines} srUnit="lines authored" />
            <p className={styles.unitLabel}>LINES AUTHORED</p>
            {asOf && <p className={styles.honest}>as of {asOf}</p>}
          </>
        ) : (
          // Floor: no tokens AND no git history. Lead with project count — never a zero hero.
          <>
            <HeroCounter value={projectCount} srUnit="projects" />
            <p className={styles.unitLabel}>PROJECTS</p>
          </>
        )}
      </div>

      {/* Only render (and reveal-stagger) the supporting block when there's authored substance —
          otherwise an empty div would take a stagger slot and push the taxonomy hint in late. */}
      {hasAuthored && (
        <div className={styles.supporting} data-reveal="after">
          {hasTokens && (
            <p className={styles.supportingLine}>
              <span className="tabular">{formatInt(combined.totalAuthoredLines)}</span> lines authored
              across <span className="tabular">{projectCount}</span> projects
            </p>
          )}
          <p className={styles.supportingLine}>
            <span className="tabular">{formatInt(combined.totalAuthoredFiles)}</span> files ·{' '}
            <span className="tabular">{formatBytes(combined.totalAllBytes)}</span> ·{' '}
            <span className="tabular">{formatInt(combined.totalCommits)}</span> commits
          </p>
        </div>
      )}

      <Link to="/about" className={styles.taxonomyHint} data-reveal="after">
        AUTHORED · PIPELINE-GENERATED · TOOL-GENERATED — what each tier means →
      </Link>
    </section>
  )
}
