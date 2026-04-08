import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import { CardIcon } from '@client/shared/card-icons'
import styles from './CardDetailSheet.module.css'

interface CardDetailSheetProps {
  readonly cardType: CardType
}

const PLAY_HINTS: Partial<Record<CardType, string>> = {
  'attack': 'Ends your turn immediately. The next player must take 2 turns. Stacks with other attacks.',
  'targeted-attack': 'Choose any player to take 2 turns. Stacks. Ends your turn.',
  'skip': 'Simply ends your turn — you don\'t draw a card.',
  'see-the-future': 'Privately peek at the top 3 cards of the draw pile.',
  'alter-the-future': 'Peek at top 3 cards, then rearrange them however you want.',
  'shuffle': 'Randomly shuffles the entire draw pile.',
  'draw-from-bottom': 'Draw from the bottom of the pile instead of the top. Triggers immediately.',
  'favor': 'Pick a player — they must give you one card of their choice.',
  'nope': 'Cancels any action card. Can be played on anyone\'s turn, any time.',
  'defuse': 'When you draw an Exploding Kitten, play this to survive. Reinsert the kitten secretly.',
  'feral-cat': 'Wild card. Counts as any cat type for pairs and triples.',
  'taco-cat': 'Powerless alone. Play 2 matching cats to steal a random card. Play 3 to name and steal.',
  'beard-cat': 'Powerless alone. Play 2 matching cats to steal a random card. Play 3 to name and steal.',
  'rainbow-ralphing-cat': 'Powerless alone. Play 2 matching cats to steal a random card. Play 3 to name and steal.',
  'hairy-potato-cat': 'Powerless alone. Play 2 matching cats to steal a random card. Play 3 to name and steal.',
  'cattermelon': 'Powerless alone. Play 2 matching cats to steal a random card. Play 3 to name and steal.',
  'exploding-kitten': 'If you draw this, you explode and are eliminated — unless you have a Defuse.',
}

export function CardDetailSheet({ cardType }: CardDetailSheetProps) {
  const def = CARD_DEF_BY_TYPE[cardType]
  const hint = PLAY_HINTS[cardType]

  return (
    <div className={styles.sheet}>
      <div className={styles.iconWrap}>
        <CardIcon type={cardType} />
      </div>
      <div className={styles.name}>{def.name}</div>
      <div className={styles.category}>{def.category}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
