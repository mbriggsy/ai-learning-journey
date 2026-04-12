import type { CardType } from '@shared/types'

const CARD_TYPE_ACCENTS = {
  'burned':           { fill: '#d44030', glow: '#ff3020' },
  'extraction':       { fill: '#3080c0', glow: '#2070b0' },
  'intercepted':      { fill: '#2aaa98', glow: '#20c0a8' },
  'reassign':         { fill: '#d48820', glow: '#f0a020' },
  'direct-order':     { fill: '#d48820', glow: '#f0a020' },

  'go-dark':          { fill: '#907860', glow: '#786850' },
  'intel-briefing':   { fill: '#907860', glow: '#786850' },
  'falsify-intel':    { fill: '#907860', glow: '#786850' },
  'burn-the-files':   { fill: '#907860', glow: '#786850' },
  'back-channel':     { fill: '#907860', glow: '#786850' },
  'call-in-a-favor':  { fill: '#907860', glow: '#786850' },

  'agent-x':          { fill: '#a0a0a0', glow: '#c0c0c0' },
  'dash-barlowe':     { fill: '#c87830', glow: '#e09040' },
  'vera-khan':        { fill: '#2a8878', glow: '#30a890' },
  'sable-ashworth':   { fill: '#8848a8', glow: '#a060c8' },
  'janet-broadside':  { fill: '#b89028', glow: '#d0a838' },
  'neal-proctor':     { fill: '#b84060', glow: '#d05070' },
} as const satisfies Record<CardType, { fill: string; glow: string }>

export function cardAccent(type: CardType): { fill: string; glow: string } {
  return CARD_TYPE_ACCENTS[type]
}
