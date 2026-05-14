import { Crest } from '../components/Crest'
import { Stamp } from '../components/Stamp'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { RedactBar } from '../components/RedactBar'
import { DossierPage } from '../components/DossierPage'
import { ClassificationBanner } from '../components/ClassificationBanner'
import { FileTab } from '../components/FileTab'
import { Marginalia } from '../components/Marginalia'
import styles from './ActCover.module.css'

/**
 * Act 0 — Cover Page.
 *
 * Composition (real-document vocabulary):
 *   - Top classification banner (red)
 *   - File tab on the right edge ("47-B")
 *   - Marginalia in the corners (date stamps, page number)
 *   - Hero: crest + title + subtitle, big CLASSIFIED stamp slammed across
 *     the upper-right corner of the page
 *   - Smaller "EYES ONLY" secondary stamp lower-left
 *   - Footer metadata grid + disclaimer
 *   - Bottom classification banner (red)
 *   - Scroll cue below the page
 */
export function ActCover() {
  return (
    <section className={`act ${styles.cover}`} aria-labelledby="cover-title">
      <DossierPage tilt={-0.6} clip="none" className={styles.folder}>
        <FileTab tone="red" top="9%">47-B</FileTab>

        <Marginalia position="top-left" style="date-stamp" tilt={-4}>
          Rec'd 13·V·26
        </Marginalia>

        <Marginalia position="top-right" style="page-num" tilt={0}>
          PG 01 / 09
        </Marginalia>

        <ClassificationBanner position="top" tone="red">
          Top Secret // SCI // Operative Eyes Only // No Foreign Nationals
        </ClassificationBanner>

        <header className={styles.header}>
          <EyebrowLabel rule>Case File · 47-B · Series A</EyebrowLabel>
        </header>

        <div className={styles.hero}>
          {/* Watermark stamp slammed across upper-right corner */}
          <div className={styles.heroStamp}>
            <Stamp ink="red" size="lg" tilt={-9} animate="slam" caption="Do Not Reproduce">
              Classified
            </Stamp>
          </div>

          <Crest size="lg" />

          <h1 id="cover-title" className={styles.title}>
            <span className="sr-only">Operation BURNED — Field Operations Manual</span>
            <img
              src="/assets/howtoplay/operations-manual-plate.png"
              alt=""
              className={styles.titlePlate}
              loading="eager"
              draggable={false}
            />
          </h1>

          {/* Secondary stamp lower-left, smaller and rotated the other way */}
          <div className={styles.heroStampSecondary}>
            <Stamp ink="blue" size="sm" tilt={6}>
              Eyes Only
            </Stamp>
          </div>
        </div>

        <footer className={styles.footer}>
          <dl className={styles.meta}>
            <div>
              <dt>Originator</dt>
              <dd>
                M. <RedactBar reveal={false} width="4.5em" label="Originator redacted" />
              </dd>
            </div>
            <div>
              <dt>Clearance</dt>
              <dd>Operative — Eyes Only</dd>
            </div>
            <div>
              <dt>Distribution</dt>
              <dd>
                Recipient personally.{' '}
                <RedactBar reveal={false} width="3em" label="Distribution redacted" />
              </dd>
            </div>
            <div>
              <dt>Reading Time</dt>
              <dd>~6 minutes. Less if you skim. Don't skim.</dd>
            </div>
          </dl>

          <div className={styles.signoff}>
            <span aria-hidden="true" className={styles.signLine} />
            <span className={styles.signText}>
              Initial here{' '}
              <RedactBar reveal={false} width="3em" label="Initials" />{' '}
              upon receipt.
            </span>
            <span aria-hidden="true" className={styles.signLine} />
          </div>

          <p className={styles.disclaimer}>
            If recovered by a non-operative, swallow this page.{' '}
            <span className={styles.parenthetical}>
              (Yes, literally. The paper is sugar.)
            </span>
          </p>
        </footer>

        <Marginalia position="bottom-right" style="handwritten" tilt={-2}>
          — Janet
        </Marginalia>

        <ClassificationBanner position="bottom" tone="red">
          Top Secret // SCI // Operative Eyes Only // No Foreign Nationals
        </ClassificationBanner>

        <span aria-hidden="true" className={styles.scrollCue}>
          <span className={styles.scrollText}>Proceed to brief</span>
          <span className={styles.scrollArrow} />
        </span>
      </DossierPage>
    </section>
  )
}
