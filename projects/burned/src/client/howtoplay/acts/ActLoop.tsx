import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Marginalia } from '../components/Marginalia'
import { Card } from '../components/Card'
import { Stamp } from '../components/Stamp'
import styles from './ActLoop.module.css'

/**
 * Act III — The Loop.
 *
 * The single most important rule in the whole document, staged as a
 * three-beat operations theatre.
 *
 *   Beat 1 — YOUR HAND: a fanned hand of real card art.
 *   Beat 2 — YOUR TURN: play any number of cards, then draw one.
 *   Beat 3 — YOUR BURN: sometimes the card you draw is the Burned card.
 *            Full-bleed dramatic, the BURNED art glows red.
 *
 * Designed to read at speed: each beat is one sentence + one image.
 */
export function ActLoop() {
  return (
    <section className="act" aria-labelledby="loop-title">
      <DossierPage tilt={0.4} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 04 / 10</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act III · The Loop</EyebrowLabel>
          <h2 id="loop-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>One turn</span>
            <span className={styles.titleMain}>Two Moves. One Threat.</span>
          </h2>
          <p className={styles.lede}>
            Every turn, every operative, every time. Three beats. Memorize them.
            Or don't; they're in this paragraph, and the paragraph isn't going
            anywhere.
          </p>
        </header>

        <ol className={styles.beats}>
          {/* ─── BEAT 1 — YOUR HAND ─────────────────────────────────── */}
          <li className={styles.beat}>
            <div className={styles.beatStage}>
              <div className={styles.handFan} aria-hidden="true">
                <Card card="vera-khan"        size="sm" tilt={-22} liftPx={36} />
                <Card card="intel-briefing"   size="sm" tilt={-12} liftPx={16} />
                <Card card="direct-order"     size="sm" tilt={-2}  liftPx={6} />
                <Card card="extraction"       size="sm" tilt={8}   liftPx={0} />
                <Card card="dash-barlowe"     size="sm" tilt={18}  liftPx={10} />
                <Card card="back-channel"     size="sm" tilt={28}  liftPx={26} />
              </div>
            </div>
            <div className={styles.beatBody}>
              <span className={styles.beatNum}>i.</span>
              <h3>Your Hand</h3>
              <p>
                You start with <strong>eight cards</strong>: seven random
                operations plus one <em>Extraction</em> — your single, fragile
                way out of trouble.
              </p>
              <p className={styles.beatAside}>
                Hand size has no ceiling. Hoard intelligently. Or, knowing
                most operatives: don't.
              </p>
            </div>
          </li>

          {/* ─── BEAT 2 — YOUR TURN ─────────────────────────────────── */}
          <li className={styles.beat}>
            <div className={styles.beatStage}>
              <div className={styles.turnStage} aria-hidden="true">
                <div className={styles.turnGroup}>
                  <Card card="direct-order" size="sm" treatment="glow" tilt={-4} />
                  <span className={styles.turnLabel}>Play 0+</span>
                </div>
                <span aria-hidden="true" className={styles.turnArrow}>→</span>
                <div className={styles.turnGroup}>
                  <Card card="extraction" faceDown size="sm" />
                  <span className={styles.turnLabel}>Draw 1</span>
                </div>
              </div>
            </div>
            <div className={styles.beatBody}>
              <span className={styles.beatNum}>ii.</span>
              <h3>Your Turn</h3>
              <p>
                Play <strong>any number of cards</strong> in any order — make
                someone take an extra turn, peek at the deck, force a favor,
                burn down the file room. Then draw <strong>exactly one card</strong>{' '}
                from the deck.
              </p>
              <p className={styles.beatAside}>
                The draw ends your turn. Some cards (<em>Go Dark</em>,{' '}
                <em>Reassign</em>, <em>Back Channel</em>) end it without one.
                Read your hand. We'll get to specifics.
              </p>
            </div>
          </li>

          {/* ─── BEAT 3 — YOUR BURN ─────────────────────────────────── */}
          <li className={`${styles.beat} ${styles.beatBurn}`}>
            <div className={`${styles.beatStage} ${styles.burnStage}`}>
              <div className={styles.burnGlow} aria-hidden="true" />
              <Card card="burned" size="lg" treatment="burn" tilt={-3} />
              <Stamp ink="red" size="md" tilt={6} className={styles.burnStamp} caption="Effective Immediately">
                Cover Blown
              </Stamp>
            </div>
            <div className={styles.beatBody}>
              <span className={styles.beatNum}>iii.</span>
              <h3 className={styles.beatBurnTitle}>You're Burned.</h3>
              <p className={styles.beatBurnLede}>
                One card in the deck is the <strong className={styles.burnWord}>Burned</strong>{' '}
                card. Draw it, reveal it, and you're <em>out of the agency.</em>
              </p>
              <p>
                Unless — and this is the entire reason you survive past round
                one — you can immediately play an <em>Extraction</em>. The
                Extraction saves your cover; you slip the Burned card{' '}
                <strong>back into the deck, anywhere you like</strong>, and walk
                away. Your turn ends. The Burned card is still in there.
                Probably right at the top.
              </p>
            </div>
          </li>
        </ol>

        <aside className={styles.aside}>
          <EyebrowLabel tone="cream">Footnote · Endgame</EyebrowLabel>
          <p>
            The deck contains <strong>(players − 1)</strong> Burned cards. By
            design, only one operative will avoid every one. That operative is
            the winner. Statistically, it will not be you. Aim for the medal
            anyway.
          </p>
        </aside>

        <Marginalia position="bottom-left" style="handwritten" tilt={-1}>
          (Vera says &quot;hoard intelligently&quot; is patronizing.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
