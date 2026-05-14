import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { FileTab } from '../components/FileTab'
import { Marginalia } from '../components/Marginalia'
import { Card } from '../components/Card'
import { Stamp } from '../components/Stamp'
import styles from './ActCombos.module.css'

/**
 * Act V — Special Operations (Combos).
 *
 * Two scenes: pair-steal (random card) and triple-name-steal (specific card).
 * Each scene is staged with real card art, an arrow, and the outcome.
 */
export function ActCombos() {
  return (
    <section className="act" aria-labelledby="combos-title">
      <DossierPage tilt={0.3} clip="paperclip">
        <FileTab tone="red" top="6%">Special Ops</FileTab>

        <Marginalia position="top-right" style="page-num">PG 06 / 09</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act V · Special Operations</EyebrowLabel>
          <h2 id="combos-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Combos · Off-the-books</span>
            <span className={styles.titleMain}>Pickpocket Maneuvers.</span>
          </h2>
          <p className={styles.lede}>
            On your turn, you may discard matched cards to lift cards directly
            from another operative. Two flavors. The longer the match, the
            more precise the heist.
          </p>
        </header>

        {/* ─── SCENE 1: PAIR ─────────────────────────────────────────── */}
        <section className={styles.scene}>
          <header className={styles.sceneHead}>
            <h3 className={styles.sceneTitle}>
              <Stamp ink="amber" size="sm" tilt={-3}>The Pair</Stamp>
            </h3>
            <p className={styles.sceneRules}>
              <strong>Play 2 cards of the same title.</strong> Pick a target.
              The agency shuffles their hand and hands you{' '}
              <em>one card, at random.</em> Their printed effects are{' '}
              <strong>ignored</strong> — only the steal matters.
            </p>
          </header>

          <div className={styles.stage}>
            <div className={styles.stageSide}>
              <span className={styles.stageLabel}>You play —</span>
              <div className={styles.pair}>
                <Card card="dash-barlowe" size="sm" tilt={-6} />
                <Card card="dash-barlowe" size="sm" tilt={6} />
              </div>
              <span className={styles.stageMeta}>2× Dash</span>
            </div>

            <span aria-hidden="true" className={styles.stageArrow}>→</span>

            <div className={styles.stageSide}>
              <span className={styles.stageLabel}>Target gives —</span>
              <Card card="extraction" faceDown size="sm" />
              <span className={styles.stageMeta}>1 card · random</span>
            </div>
          </div>

        </section>

        {/* ─── SCENE 2: TRIPLE ───────────────────────────────────────── */}
        <section className={styles.scene}>
          <header className={styles.sceneHead}>
            <h3 className={styles.sceneTitle}>
              <Stamp ink="red" size="sm" tilt={-3}>The Triple</Stamp>
            </h3>
            <p className={styles.sceneRules}>
              <strong>Play 3 cards of the same title.</strong> Pick a target,
              <strong> name a card type</strong>. If they have one, they hand
              it over. If they don't, you get nothing and they get the
              satisfaction of a public bluff.
            </p>
          </header>

          <div className={styles.stage}>
            <div className={styles.stageSide}>
              <span className={styles.stageLabel}>You play —</span>
              <div className={styles.triple}>
                <Card card="vera-khan" size="sm" tilt={-10} />
                <Card card="vera-khan" size="sm" tilt={0} />
                <Card card="vera-khan" size="sm" tilt={10} />
              </div>
              <span className={styles.stageMeta}>3× Vera · name &quot;Extraction&quot;</span>
            </div>

            <span aria-hidden="true" className={styles.stageArrow}>→</span>

            <div className={styles.stageSide}>
              <span className={styles.stageLabel}>If they have it —</span>
              <Card card="extraction" size="sm" treatment="glow" />
              <span className={styles.stageMeta}>You take it</span>
            </div>
          </div>

          <p className={styles.sceneTactic}>
            High-risk, high-information play. Names are spoken privately
            between you and the target — the rest of the table sees only{' '}
            <em>that</em> something was tried, not <em>what</em>. Bluff
            accordingly. And the economy doesn't usually justify the math —
            worse here, three cards for a maybe-steal — but if a particular
            target has been hoarding, do the heist anyway. They'll learn.{' '}
            <span className={styles.phrasing}>…Phrasing.</span>
          </p>
        </section>

        <aside className={styles.aside}>
          <EyebrowLabel tone="cream">Footnote · Eligible cards</EyebrowLabel>
          <p>
            <strong>Any matching cards qualify — pairs or triples, operatives or actions.</strong>{' '}
            Two Intel Briefings or three of them; two Reassigns or three;
            two Go Darks or three. All legal. Their printed effects are{' '}
            <em>ignored</em> — only the steal counts. Burning action cards
            as combo fodder is steep economy, but the heist still hits.
          </p>
        </aside>

        <aside className={styles.aside}>
          <EyebrowLabel tone="cream">Wildcard rule · Agent X</EyebrowLabel>
          <p>
            <strong>Agent X is the wild operative.</strong> One Agent X
            substitutes for any single named operative in a pair or triple.
            Two Agent X cards plus one named operative reads as a triple of
            that operative. Three Agent X cards reads as a triple of
            themselves.{' '}
            <span className={styles.parenthetical}>(Agent X cannot stand in for an action card. Don't try.)</span>
          </p>
        </aside>

        <Marginalia position="bottom-right" style="handwritten" tilt={-2}>
          (Neal once played 3× Neal. He was extremely proud.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
