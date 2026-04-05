export type CardCategory = 'kitten' | 'defuse' | 'action' | 'cat' | 'wild'

interface CardDef {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly category: CardCategory
  readonly pawCount: number
  readonly nonPawCount: number
}

export const CARD_DEFS = [
  { type: 'exploding-kitten', name: 'Exploding Kitten', description: 'You must show this card immediately.', category: 'kitten', pawCount: 0, nonPawCount: 9 },
  { type: 'defuse', name: 'Defuse', description: 'Save yourself. Reinsert the Kitten secretly.', category: 'defuse', pawCount: 3, nonPawCount: 7 },
  { type: 'attack', name: 'Attack', description: 'End your turn. Next player takes 2 turns. Stacks.', category: 'action', pawCount: 2, nonPawCount: 3 },
  { type: 'targeted-attack', name: 'Targeted Attack', description: 'End your turn. Choose ANY player to take 2 turns. Stacks.', category: 'action', pawCount: 2, nonPawCount: 3 },
  { type: 'skip', name: 'Skip', description: 'End your turn without drawing.', category: 'action', pawCount: 4, nonPawCount: 6 },
  { type: 'see-the-future', name: 'See the Future', description: 'Peek at the top 3 cards (private).', category: 'action', pawCount: 3, nonPawCount: 3 },
  { type: 'alter-the-future', name: 'Alter the Future', description: 'View top 3 cards, rearrange in any order (private).', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'shuffle', name: 'Shuffle', description: 'Randomize the draw pile.', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'draw-from-bottom', name: 'Draw from the Bottom', description: 'Draw from bottom instead of top.', category: 'action', pawCount: 3, nonPawCount: 4 },
  { type: 'favor', name: 'Favor', description: 'Force a player to give you 1 card (their choice).', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'nope', name: 'Nope', description: 'Cancel any action. Playable any time, by anyone.', category: 'action', pawCount: 4, nonPawCount: 5 },
  { type: 'feral-cat', name: 'Feral Cat', description: 'Wild — counts as any Cat Card type.', category: 'wild', pawCount: 2, nonPawCount: 4 },
  { type: 'taco-cat', name: 'Taco Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', category: 'cat', pawCount: 3, nonPawCount: 4 },
  { type: 'beard-cat', name: 'Beard Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', category: 'cat', pawCount: 3, nonPawCount: 4 },
  { type: 'rainbow-ralphing-cat', name: 'Rainbow-Ralphing Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', category: 'cat', pawCount: 3, nonPawCount: 4 },
  { type: 'hairy-potato-cat', name: 'Hairy Potato Cat', description: 'Powerless alone. Pairs steal random. Triples name + steal.', category: 'cat', pawCount: 3, nonPawCount: 4 },
  { type: 'cattermelon', name: 'Cattermelon', description: 'Powerless alone. Pairs steal random. Triples name + steal.', category: 'cat', pawCount: 3, nonPawCount: 4 },
] as const satisfies readonly CardDef[]

export type CardType = typeof CARD_DEFS[number]['type']

export const CARD_DEF_BY_TYPE = Object.fromEntries(
  CARD_DEFS.map(d => [d.type, d])
) as Record<CardType, typeof CARD_DEFS[number]>
