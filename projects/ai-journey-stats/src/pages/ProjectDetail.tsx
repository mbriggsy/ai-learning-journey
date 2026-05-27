import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useParams, Link } from 'react-router'
import { useStats } from '@/hooks/useStats'
import { gsap, useGSAP, ScrollTrigger } from '@/motion/gsap-context'
import { duration, stagger } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import { findProject, buildComposition } from '@/lib/composition'
import { totalMediaBytes } from '@/lib/donut'
import { isCadenceTrustworthy } from '@/lib/cadence'
import { formatInt } from '@/lib/format'
import { DetailHero } from '@/components/DetailHero/DetailHero'
import { TokensBlock } from '@/components/TokensBlock/TokensBlock'
import { AssetDonut } from '@/components/AssetDonut/AssetDonut'
import { CompositionInventory } from '@/components/CompositionInventory/CompositionInventory'
import { CadenceSparkline } from '@/components/CadenceSparkline/CadenceSparkline'
import { Gallery } from '@/components/Gallery/Gallery'
import { LiveLinkButton } from '@/components/LiveLinkButton/LiveLinkButton'
import styles from './ProjectDetail.module.css'

const BackLink = () => (
  <Link to="/" className={styles.backLink}>
    ← all projects
  </Link>
)

// Movement groups drive the hairline dividers (rendered only between GROUPS). A literal union
// (not bare `string`) makes a typo in any movement's group a compile error rather than a silent
// misplaced/missing divider.
type MovementGroup = 'opener' | 'magnitude' | 'work' | 'rhythm' | 'proof' | 'invitation'
type Movement = { key: string; group: MovementGroup; block: boolean; node: ReactNode | null }

export default function ProjectDetail() {
  const { name } = useParams<{ name: string }>()
  const report = useStats()
  const project = findProject(report, name)
  const pageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = project ? `${project.projectName} · ai-journey-stats` : 'Not found · ai-journey-stats'
  }, [project])

  // Block-level scroll reveals (Decision 6): each MOVEMENT fades+rises once, block-level (not
  // per-child — a long reading page). The donut is NOT a [data-block] — it owns its DrawSVG draw.
  // Mirrors ProjectGrid: JS-only hidden state (P0 — dead layer leaves all movements visible),
  // scoped node lists (insight 004), refreshInit y-reset + restore, and the global refresh
  // self-heal (which also fires the donut's trigger when it's above the fold on a deep-link).
  useGSAP(
    () => {
      const root = pageRef.current
      const blocks = () => (root ? gsap.utils.toArray<HTMLElement>('[data-block]', root) : [])

      // Unconditional global refresh self-heal — fonts/hero-image/gallery load late and shift
      // positions; also fires already-in-view triggers (this page's blocks + the donut) on mount.
      const onLoad = () => ScrollTrigger.refresh()
      window.addEventListener('load', onLoad, { once: true })
      let cancelled = false
      let rafId = 0
      let timerId = 0
      const settled = new Promise<void>((resolve) => {
        timerId = window.setTimeout(resolve, 1500)
        void document.fonts.ready.then(() => resolve())
      })
      void settled.then(() => {
        if (cancelled) return
        rafId = requestAnimationFrame(() => ScrollTrigger.refresh())
      })
      const cleanupRefresh = () => {
        cancelled = true
        clearTimeout(timerId)
        cancelAnimationFrame(rafId)
        window.removeEventListener('load', onLoad)
      }

      if (!root || prefersReducedMotion()) return cleanupRefresh // movements stay visible (CSS default)

      // The not-found page mounts this same hook with NO [data-block] elements — skip the
      // hidden-state set + batch so gsap isn't handed an empty target (warns), but keep the
      // global refresh self-heal above.
      const initial = blocks()
      if (initial.length === 0) return cleanupRefresh

      gsap.set(initial, { autoAlpha: 0, y: 24 }) // smaller rise than the grid — a reading page

      const resetY = () => {
        if (pageRef.current) gsap.set(blocks(), { y: 0 })
      }
      const restoreY = () => {
        if (!pageRef.current) return
        const hidden = blocks().filter((el) => Number(gsap.getProperty(el, 'autoAlpha')) < 1)
        if (hidden.length) gsap.set(hidden, { y: 24 })
      }
      ScrollTrigger.addEventListener('refreshInit', resetY)
      ScrollTrigger.addEventListener('refresh', restoreY)

      ScrollTrigger.batch(blocks(), {
        start: 'top 88%',
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
        cleanupRefresh()
        ScrollTrigger.removeEventListener('refreshInit', resetY)
        ScrollTrigger.removeEventListener('refresh', restoreY)
      }
    },
    { scope: pageRef, dependencies: [] },
  )

  if (!project) {
    return (
      <main className={styles.page} ref={pageRef}>
        <BackLink />
        <section className={styles.notFound}>
          <h1 className={styles.notFoundHeading}>No project by that name.</h1>
          <p className={styles.notFoundBody}>
            It may have been a typo, or a build that lives only in the misses. Head back to the grid.
          </p>
          <Link to="/" className={styles.notFoundLink}>
            ← all projects
          </Link>
        </section>
      </main>
    )
  }

  const { editorial, tokens, git, proxies, assetBytesByKind } = project

  // Field-level null-degrade gates (each movement omits cleanly when its data is absent).
  const hasDescription = Boolean(editorial?.description)
  const hasMedia = totalMediaBytes(assetBytesByKind) > 0
  const inventory = buildComposition(project)
  const showCadence = isCadenceTrustworthy(git.timeline)
  // Iteration caption is INDEPENDENT of the cadence gate (ATC 2026-05-26): it is not git-date
  // derived, so it stays honest even where the cadence is omitted, and auto-omits at 0/0/0.
  const hasIteration =
    git.assetModificationEvents > 0 || git.discardedAssetFiles > 0 || proxies.iterationProxyTotal > 0
  const showRhythm = showCadence || hasIteration
  const liveUrl = editorial?.liveUrl ?? null
  const repoUrl = editorial?.repoUrl ?? null
  const hasInvitation = Boolean(liveUrl || repoUrl)

  const iterationSentence = hasIteration
    ? [
        git.assetModificationEvents > 0 ? `${formatInt(git.assetModificationEvents)} asset revisions` : null,
        git.discardedAssetFiles > 0 ? `${formatInt(git.discardedAssetFiles)} discarded along the way` : null,
        proxies.iterationProxyTotal > 0 ? `${formatInt(proxies.iterationProxyTotal)} eval & regen runs` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  // Ordered movements. `group` drives the hairline dividers (between GROUPS only — the plan's
  // rhythm). `block` = true → a [data-block] scroll-reveal target in C3; the donut is false
  // (it owns its own DrawSVG draw, Decision 6).
  const movements: Movement[] = [
    { key: 'hero', group: 'opener', block: true, node: <DetailHero project={project} /> },
    { key: 'tokens', group: 'magnitude', block: true, node: tokens ? <TokensBlock tokens={tokens} /> : null },
    {
      key: 'description',
      group: 'magnitude',
      block: true,
      node: hasDescription ? <p className={styles.description}>{editorial!.description}</p> : null,
    },
    {
      key: 'donut',
      group: 'work',
      block: false,
      node: hasMedia ? <AssetDonut assetBytesByKind={assetBytesByKind} /> : null,
    },
    {
      key: 'inventory',
      group: 'work',
      block: true,
      node: inventory.length > 0 ? <CompositionInventory items={inventory} /> : null,
    },
    {
      key: 'rhythm',
      group: 'rhythm',
      block: true,
      node: showRhythm ? (
        <div className={styles.rhythm}>
          {showCadence && (
            <CadenceSparkline timeline={git.timeline} largestCommitCaption={editorial?.largestCommitCaption} />
          )}
          {iterationSentence && <p className={styles.iteration}>{iterationSentence}</p>}
        </div>
      ) : null,
    },
    {
      key: 'gallery',
      group: 'proof',
      block: true,
      node: editorial?.gallery?.length ? <Gallery images={editorial.gallery} /> : null,
    },
    {
      key: 'invitation',
      group: 'invitation',
      block: true,
      node: hasInvitation ? (
        <div className={styles.invitation}>
          {liveUrl && <LiveLinkButton href={liveUrl} label="Try it →" />}
          {repoUrl && <LiveLinkButton href={repoUrl} label="Source →" />}
        </div>
      ) : null,
    },
  ]

  const rendered = movements.filter((m) => m.node)

  return (
    <main className={styles.page} ref={pageRef}>
      <BackLink />
      <article className={styles.shell}>
        {rendered.map((m, i) => {
          const prev = i > 0 ? rendered[i - 1] : undefined
          const showDivider = prev ? prev.group !== m.group : false
          return (
            <Fragment key={m.key}>
              {showDivider && <hr className={styles.divider} />}
              <section
                className={`${styles.movement} ${m.key === 'description' ? styles.descriptionMovement : ''}`}
                {...(m.block ? { 'data-block': true } : {})}
              >
                {m.node}
              </section>
            </Fragment>
          )
        })}
      </article>
    </main>
  )
}
