import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { FileTab } from '../components/FileTab'
import { Marginalia } from '../components/Marginalia'
import { Card, type CardKey } from '../components/Card'
import { Stamp } from '../components/Stamp'
import styles from './ActArsenal.module.css'

interface CardEntry {
  card: CardKey
  classification: string
  /** Plain rules — what the card does. */
  rules: string
  /** Optional tactic / quip in italics. */
  tactic?: string
}

interface ArsenalGroup {
  /** Group label, e.g. "Coercion" */
  name: string
  /** Group lede — one-sentence summary of the group's role. */
  lede: string
  cards: CardEntry[]
}

const GROUPS: ArsenalGroup[] = [
  {
    name: 'Coercion',
    lede: "Make somebody else have your problem. There are three flavors of it; pick the one that suits the table you're sitting at.",
    cards: [
      {
        card: 'reassign',
        classification: 'Coercion',
        rules:
          'End your turn without drawing. The next operative in line takes two turns instead.',
        tactic: 'Cheap, clean, and they probably had it coming.',
      },
      {
        card: 'direct-order',
        classification: 'Coercion · Targeted',
        rules:
          'End your turn without drawing. Pick anyone — even across the table — and saddle them with two turns.',
        tactic: 'For when a specific operative is asking for it. (Vera.)',
      },
      {
        card: 'call-in-a-favor',
        classification: 'Coercion · Exchange',
        rules:
          "Pick another operative. They hand over a card of THEIR choosing. You don't get to pick what.",
        tactic: 'Surprisingly often they pick the worst card in the building. …Phrasing.',
      },
    ],
  },
  {
    name: 'Intelligence',
    lede: "Information is leverage. These three cards let you see, shuffle, or rearrange the deck — the agency's most volatile asset.",
    cards: [
      {
        card: 'intel-briefing',
        classification: 'Intel · Reconnaissance',
        rules:
          'Peek privately at the top three cards of the deck. Put them back in the same order. Does not end your turn.',
        tactic: "You may, of course, lie about what you saw. Janet would.",
      },
      {
        card: 'falsify-intel',
        classification: 'Intel · Action',
        rules:
          'Peek privately at the top three, then put them back IN ANY ORDER. Does not end your turn.',
        tactic: 'Strictly an upgrade over the briefing. Use accordingly.',
      },
      {
        card: 'burn-the-files',
        classification: 'Intel · Sabotage',
        rules:
          "Reshuffle the deck. Anything anyone knew about the next three cards — gone. Does not end your turn.",
        tactic: 'Especially funny if you just watched Dash peek and look pleased.',
      },
    ],
  },
  {
    name: 'Cover Operations',
    lede: "Tactical evasion. Get out of harm's way without engaging.",
    cards: [
      {
        card: 'go-dark',
        classification: 'Cover · Evasion',
        rules: 'End your turn immediately. Do not draw.',
        tactic: "When the deck is hot and you don't want to be the one to find out.",
      },
      {
        card: 'back-channel',
        classification: 'Cover · Misdirection',
        rules:
          'End your turn by drawing the BOTTOM card of the deck instead of the top.',
        tactic:
          'A specific countermeasure: somebody just peeked the top three, and you would prefer not to receive them.',
      },
    ],
  },
  {
    name: 'Defense',
    lede: "The only card you can play when it isn't your turn. Treat accordingly.",
    cards: [
      {
        card: 'intercepted',
        classification: 'Defense · Interrupt',
        rules:
          "Cancel any other operative's card or combo. Can be played out of turn. CAN be intercepted in turn — see the next page.",
        tactic:
          "Two of them cancel each other. Three reinstates the cancel. The room briefly becomes a circular firing squad.",
      },
    ],
  },
  {
    name: 'Survival',
    lede: 'One card ends you. One card saves you. Memorize both faces.',
    cards: [
      {
        card: 'extraction',
        classification: 'Survival · Reactive',
        rules:
          "Play instantly when you draw the Burned card. You secretly slide the Burned card back into the deck — top, bottom, or anywhere in between. Your turn ends.",
        tactic:
          "You start with one. Hold it like your career depends on it. Because it does.",
      },
      {
        card: 'burned',
        classification: 'Threat · Terminal',
        rules:
          "Cannot be played from hand — only drawn. When drawn, reveal immediately. If you can't Extract, you're out of the Agency. Your hand is removed from play.",
        tactic:
          "There are (players − 1) of these in the deck. One operative — exactly one — will avoid every single one.",
      },
    ],
  },
  {
    name: 'The Operatives',
    lede: 'On their own, they do nothing. Played in pairs or trios, they pickpocket your colleagues. Agent X is the wild card — substitute for any named operative.',
    cards: [
      { card: 'dash-barlowe',    classification: 'Operative', rules: 'No solo effect. Combine for pair or triple steals.' },
      { card: 'vera-khan',       classification: 'Operative', rules: 'No solo effect. Combine for pair or triple steals.' },
      { card: 'sable-ashworth',  classification: 'Operative', rules: 'No solo effect. Combine for pair or triple steals.' },
      { card: 'janet-broadside', classification: 'Operative', rules: 'No solo effect. Combine for pair or triple steals.' },
      { card: 'neal-proctor',    classification: 'Operative', rules: 'No solo effect. Combine for pair or triple steals.' },
      { card: 'agent-x',         classification: 'Operative · Wild',  rules: "Substitutes for any single named operative in a combo." },
    ],
  },
]

export function ActArsenal() {
  return (
    <section className="act" aria-labelledby="arsenal-title">
      <DossierPage tilt={-0.4} clip="paperclip">
        <FileTab tone="amber" top="5%">Arsenal</FileTab>

        <Marginalia position="top-right" style="page-num">PG 05 / 09</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act IV · The Arsenal — 17 Operations</EyebrowLabel>
          <h2 id="arsenal-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Field-issued equipment</span>
            <span className={styles.titleMain}>The Arsenal.</span>
          </h2>
          <p className={styles.lede}>
            Every card in your hand is one of seventeen sanctioned operations.
            Six families. Most do exactly what their codename says they do —
            we did not get clever with the naming.{' '}
            <span className={styles.aside}>(Dash named one of them. Try to guess which.)</span>
          </p>
        </header>

        {GROUPS.map((group) => (
          <section key={group.name} className={styles.group}>
            <header className={styles.groupHead}>
              <h3 className={styles.groupTitle}>
                <Stamp ink="amber" size="sm" tilt={-3}>{group.name}</Stamp>
              </h3>
              <p className={styles.groupLede}>{group.lede}</p>
            </header>

            <ul className={styles.cardGrid} role="list">
              {group.cards.map((entry) => (
                <li key={entry.card} className={styles.cardEntry}>
                  <div className={styles.cardArt}>
                    <Card card={entry.card} size="md" treatment={entry.card === 'burned' ? 'burn' : 'normal'} />
                  </div>
                  <div className={styles.cardCopy}>
                    <p className={styles.cardClass}>{`// ${entry.classification}`}</p>
                    <p className={styles.cardRules}>{entry.rules}</p>
                    {entry.tactic ? <p className={styles.cardTactic}>{entry.tactic}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Marginalia position="bottom-left" style="handwritten" tilt={-1.5}>
          (the answer is Go Dark, obviously)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
