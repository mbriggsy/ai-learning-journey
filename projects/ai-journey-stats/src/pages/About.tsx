import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useStats } from '@/hooks/useStats'
import { formatAsOf } from '@/lib/format'
import { gsap, useGSAP } from '@/motion/gsap-context'
import { duration } from '@/motion/tokens'
import { ease } from '@/motion/easings'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import styles from './About.module.css'

const REPO_URL = 'https://github.com/mbriggsy/ai-learning-journey'
const TOOL_README_URL =
  'https://github.com/mbriggsy/ai-learning-journey/blob/main/tools/project-metrics/README.md'

// The taxonomy scheme (static — describes the classifier, NOT any project's stats.json). Tier
// labels are VERBATIM from the hero hint so the page delivers exactly what `what each tier means →`
// promised. Re-verified against tools/project-metrics/src/taxonomy.ts (3 tiers, 10 categories).
// `counted` is the measurement-scope fact (does this feed the headline totals?), NOT a credit
// verdict — ideation §1 forbids an authored-vs-generated comparison.
const TAXONOMY = [
  {
    tier: 'AUTHORED',
    counted: 'counted',
    excluded: false,
    categories: [
      { name: 'code', examples: 'source, tests, config, build scripts, styles, markup' },
      { name: 'docs', examples: 'plans, specs, ADRs, insights, READMEs' },
      { name: 'data', examples: 'game content, generation prompts, lookup tables' },
      { name: 'process', examples: 'commit messages' },
    ],
  },
  {
    tier: 'PIPELINE-GENERATED',
    counted: 'counted',
    excluded: false,
    categories: [
      { name: 'assets', examples: 'images, audio, video, fonts' },
      { name: 'iteration-receipts', examples: 'eval-run samples, regen scripts' },
    ],
  },
  {
    tier: 'TOOL-GENERATED',
    counted: 'tracked, not counted',
    excluded: true,
    categories: [
      { name: 'compiled', examples: 'dist/ build output' },
      { name: 'lockfiles', examples: 'pnpm-lock.yaml, Cargo.lock' },
      { name: 'snapshots', examples: 'test snapshot files' },
      { name: 'caches', examples: '.cache/, .turbo/, .vite/' },
    ],
  },
] as const

export default function About() {
  const { scannedAt } = useStats()
  const pageRef = useRef<HTMLElement>(null)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    document.title = 'About · ai-journey-stats'
  }, [])

  // The page's single motion moment (Decision 6): ONE quiet fade-in on the wrapper, in the site's
  // `weighted` dialect — no section stagger. Fades `opacity`, NOT autoAlpha: this <main> holds the
  // back-link + two external links, and autoAlpha's `visibility: hidden` would drop them from the
  // tab order for the whole fade (insight 006). gsap.from (not a CSS opacity:0) still means a dead
  // motion layer leaves every word of this reading page visible. reducedMotion → no tween.
  useGSAP(
    () => {
      if (reducedMotion) return
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 8,
        duration: duration.reveal,
        ease: ease.arrive,
      })
    },
    { scope: pageRef, dependencies: [] },
  )

  // Staleness honesty (Phase 8 Decision 9): the data is refreshed by hand, so surface when it was
  // last measured. Shared, guarded, UTC-pinned formatter — a malformed scannedAt → null → the line
  // is omitted (never "Invalid Date"), and the date never drifts a day for viewers west of UTC.
  const asOf = formatAsOf(scannedAt)

  return (
    <main className={styles.page} ref={pageRef}>
      <Link to="/" className={styles.backLink}>
        ← home
      </Link>

      <article className={styles.shell}>
        {/* §1 — What is ai-journey-stats (the site). Lead explainer; no authorship claim (§11). */}
        <section className={styles.movement}>
          <h1 className={styles.heading}>
            What is <span className={styles.headingMark}>ai-journey-stats</span>
          </h1>
          <p className={styles.prose}>
            ai-journey-stats is the receipts on a body of work — the projects, and what each one took
            to build. The numbers aren&rsquo;t estimates or changelog claims: a purpose-built tool
            reads what&rsquo;s actually on disk and counts it, file by file. These pages are what those
            counts mean — and what they deliberately leave out.
          </p>
        </section>

        <hr className={styles.divider} />

        {/* §2 — What is project-metrics (the tool). Prose only — no install, no pitch (ideation §4). */}
        <section className={styles.movement}>
          <h2 className={styles.heading}>
            What is <span className={styles.headingMark}>project-metrics</span>
          </h2>
          <p className={styles.prose}>
            project-metrics is the tape measure — the tool that produced every figure on this site.
            Point it at a project and it sorts each file into one of three tiers, then counts: lines,
            bytes, asset iterations, and the token cost read from local Claude Code session logs.
            It&rsquo;s the internal instrument behind the receipts, nothing more.
          </p>
        </section>

        <hr className={styles.divider} />

        {/* §3 — Taxonomy explained. The deep version of the hero hint; the grouped scheme table. */}
        <section className={styles.movement}>
          <h2 className={styles.heading}>The three tiers</h2>
          <p className={styles.tableIntro}>
            Every file lands in one of three tiers, by how it came to exist. The tier decides what
            feeds the headline totals — and what&rsquo;s tracked but held out, so the magnitude is
            never padded with build output.
          </p>

          <div className={styles.tableScroll}>
            <div className={styles.tableWrap}>
              <table className={styles.taxonomy}>
                <thead>
                  <tr>
                    <th scope="col">Tier</th>
                    <th scope="col">Category</th>
                    <th scope="col">Examples</th>
                    <th scope="col">Counted in totals?</th>
                  </tr>
                </thead>
                <tbody>
                  {TAXONOMY.map((tier) =>
                    tier.categories.map((cat, i) => (
                      <tr key={cat.name}>
                        {i === 0 && (
                          <th
                            scope="rowgroup"
                            rowSpan={tier.categories.length}
                            className={styles.tierCell}
                          >
                            {tier.tier}
                          </th>
                        )}
                        <td className={styles.catCell}>{cat.name}</td>
                        <td className={styles.examplesCell}>{cat.examples}</td>
                        {i === 0 && (
                          <td
                            rowSpan={tier.categories.length}
                            className={`${styles.countedCell} ${tier.excluded ? styles.countedExcluded : ''}`}
                          >
                            {tier.counted}
                          </td>
                        )}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <hr className={styles.divider} />

        {/* §4 · §5 · §6 — ONE movement (air between, no internal dividers). */}
        <section className={styles.movement}>
          <div className={styles.methodology}>
            {/* §4 — How the numbers are counted. */}
            <div>
              <h2 className={styles.subHeading}>How the numbers are counted</h2>
              <p className={`${styles.prose} ${styles.proseQuiet}`}>
                Lines are counted two ways — every line, and every non-blank line — so whitespace
                never pads a total. Asset iteration comes from git history: how many times each
                image, audio, or video file was revised, and how many were discarded along the way.
                Tokens are measured from local Claude Code session logs where present, split into{' '}
                <span className={styles.code}>tokensProcessed</span> (input, output, and cache) and{' '}
                <span className={styles.code}>tokensFresh</span> (the same, minus cheap cache
                re-reads). Those logs rotate after about thirty days, so every token figure is a
                floor for that window — never a lifetime total.
              </p>
              <a
                className={`${styles.link} ${styles.linkRow}`}
                href={TOOL_README_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Full methodology in the project-metrics README →
              </a>
            </div>

            {/* §5 — Update cadence. Two decoupled facts + "as of". */}
            <div>
              <h2 className={styles.subHeading}>Update cadence</h2>
              <p className={`${styles.prose} ${styles.proseQuiet}`}>
                Two things happen on their own schedule. The numbers regenerate only when the
                project-metrics tool is run by hand — locally, on the machine where the session logs
                live, because a clean CI runner has no history to read. The site itself redeploys
                automatically from <span className={styles.code}>main</span>. A push ships the page;
                it doesn&rsquo;t recount the work.
              </p>
              {asOf && <p className={styles.asOf}>Numbers as of {asOf}.</p>}
            </div>

            {/* §6 — Open source. */}
            <div>
              <h2 className={styles.subHeading}>Open source</h2>
              <p className={`${styles.prose} ${styles.proseQuiet}`}>
                The projects and the tool that measured them are open source.
              </p>
              <a
                className={`${styles.link} ${styles.linkRow}`}
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/mbriggsy/ai-learning-journey →
              </a>
            </div>
          </div>
        </section>

        <hr className={styles.divider} />

        {/* Closing sign-off — the one sanctioned authorship nod (§11). Endnote, not a stat. */}
        <section className={styles.signOffWrap}>
          <p className={styles.signOff}>
            Claude wrote all of it. Briggsy directed — and answered a question or two.
          </p>
        </section>
      </article>
    </main>
  )
}
