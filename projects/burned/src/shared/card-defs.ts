export type CardCategory = 'burned' | 'extraction' | 'action' | 'operative' | 'wild'

interface CardDef {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly category: CardCategory
  readonly pawCount: number
  readonly nonPawCount: number
}

export const CARD_DEFS = [
  { type: 'burned', name: 'Burned', description: 'Your cover\'s blown. Show this card immediately.', category: 'burned', pawCount: 0, nonPawCount: 9 },
  { type: 'extraction', name: 'Extraction', description: 'Contingency plan activated. Reinsert the Burned card secretly.', category: 'extraction', pawCount: 3, nonPawCount: 7 },
  { type: 'reassign', name: 'Reassign', description: 'End your turn. Next operative takes 2 turns. Stacks.', category: 'action', pawCount: 2, nonPawCount: 3 },
  { type: 'direct-order', name: 'Direct Order', description: 'End your turn. Choose ANY operative for 2 turns. Stacks.', category: 'action', pawCount: 2, nonPawCount: 3 },
  { type: 'go-dark', name: 'Go Dark', description: 'Ghost your handler. End your turn without drawing.', category: 'action', pawCount: 4, nonPawCount: 6 },
  { type: 'intel-briefing', name: 'Intel Briefing', description: 'Peek at the top 3 cards (private).', category: 'action', pawCount: 3, nonPawCount: 3 },
  { type: 'falsify-intel', name: 'Falsify Intel', description: 'View top 3 cards, rearrange in any order (private).', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'burn-the-files', name: 'Burn the Files', description: 'Scramble the mission stack.', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'back-channel', name: 'Back Channel', description: 'End your turn — draw from the bottom instead of the top.', category: 'action', pawCount: 3, nonPawCount: 4 },
  { type: 'call-in-a-favor', name: 'Call in a Favor', description: 'Force an operative to give you 1 card (their choice).', category: 'action', pawCount: 2, nonPawCount: 4 },
  { type: 'intercepted', name: 'Intercepted', description: 'Counter-intel. Cancel any action. Playable any time.', category: 'action', pawCount: 4, nonPawCount: 5 },
  { type: 'agent-x', name: 'Agent X', description: 'Wild — counts as any operative type.', category: 'wild', pawCount: 2, nonPawCount: 4 },
  { type: 'dash-barlowe', name: 'Dash Barlowe', description: 'Powerless alone. Pairs steal random. Triples named steal.', category: 'operative', pawCount: 3, nonPawCount: 4 },
  { type: 'vera-khan', name: 'Vera Khan', description: 'Powerless alone. Pairs steal random. Triples named steal.', category: 'operative', pawCount: 3, nonPawCount: 4 },
  { type: 'sable-ashworth', name: 'Sable Ashworth', description: 'Powerless alone. Pairs steal random. Triples named steal.', category: 'operative', pawCount: 3, nonPawCount: 4 },
  { type: 'janet-broadside', name: 'Janet Broadside', description: 'Powerless alone. Pairs steal random. Triples named steal.', category: 'operative', pawCount: 3, nonPawCount: 4 },
  { type: 'neal-proctor', name: 'Neal Proctor', description: 'Powerless alone. Pairs steal random. Triples named steal.', category: 'operative', pawCount: 3, nonPawCount: 4 },
] as const satisfies readonly CardDef[]

export type CardType = typeof CARD_DEFS[number]['type']

export const CARD_DEF_BY_TYPE = Object.fromEntries(
  CARD_DEFS.map(d => [d.type, d])
) as Record<CardType, typeof CARD_DEFS[number]>
