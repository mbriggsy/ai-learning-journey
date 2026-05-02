/**
 * Dev-only god-mode actions for scenario setup. Lets a god connection
 * mutate the live draw pile so eye-in-loop tests can trigger specific
 * cards (Burned, Burn-the-Files, Future-Peek targets, etc.) without
 * waiting for random play.
 *
 * Gated transitively: god connections require `PLAYTEST_MODE=1` +
 * `PLAYTEST_TOKEN` + god-origin allowlist (see `god-connection.ts`).
 * Production deploys leave PLAYTEST_MODE unset — these messages can't
 * land. `scripts/verify-prod-bundle.ts` greps `dist/**` for sentinel
 * strings to enforce.
 *
 * Same shape as `playtest-config.ts`:
 *   - `parseDevActionMessage(raw)` — Zod-validated parse
 *   - `applyDevStackDeck(state, cards, uuidGen)` — pure state transition
 */

import { z } from 'zod'
import { CARD_DEFS, type CardType } from '@shared/card-defs'
import type { CardInstance } from '@shared/types'
import type { GameState, PlayingState } from './game/types'

// --- Schema ---

const CARD_TYPE_TUPLE = CARD_DEFS.map(d => d.type) as [string, ...string[]]
const CardTypeSchema = z.enum(CARD_TYPE_TUPLE)

const DevStackDeckSchema = z.object({
  type: z.literal('dev-stack-deck'),
  cards: z.array(CardTypeSchema).min(1).max(10),
}).strict()

const DevGiveCardSchema = z.object({
  type: z.literal('dev-give-card'),
  // Name match is case-insensitive on the resolver side. Ids are not
  // accepted directly because the operator only sees names in the UI.
  playerName: z.string().min(1).max(40),
  cards: z.array(CardTypeSchema).min(1).max(10),
}).strict()

export type DevActionPayload =
  | { type: 'dev-stack-deck'; cards: readonly CardType[] }
  | { type: 'dev-give-card'; playerName: string; cards: readonly CardType[] }

export type DevActionParseResult =
  | { ok: true; payload: DevActionPayload }
  | { ok: false; error: string }

export function parseDevActionMessage(raw: string): DevActionParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
  const stack = DevStackDeckSchema.safeParse(json)
  if (stack.success) {
    return {
      ok: true,
      payload: {
        type: 'dev-stack-deck',
        cards: stack.data.cards as readonly CardType[],
      },
    }
  }
  const give = DevGiveCardSchema.safeParse(json)
  if (give.success) {
    return {
      ok: true,
      payload: {
        type: 'dev-give-card',
        playerName: give.data.playerName,
        cards: give.data.cards as readonly CardType[],
      },
    }
  }
  return { ok: false, error: 'Invalid dev action' }
}

// --- State transition ---

export type DevActionApplyResult =
  | { ok: true; nextState: PlayingState }
  | { ok: false; code: 'NOT_PLAYING' | 'PLAYER_NOT_FOUND' }

/**
 * Prepend the supplied cards to the top of the draw pile. Top of deck
 * is index 0 by engine convention (see `engine.ts` — `drawPile.shift()`
 * for top-draw). Cards are minted with fresh UUIDs so engine invariants
 * (unique card ids) hold. Pure — does not mutate `state`.
 *
 * Rejects unless the game is in the `playing` phase. Lobby state has
 * no draw pile yet; game-over state should not be retroactively edited.
 */
export function applyDevStackDeck(
  state: GameState,
  cards: readonly CardType[],
  uuidGen: () => string,
): DevActionApplyResult {
  if (state.phase !== 'playing') {
    return { ok: false, code: 'NOT_PLAYING' }
  }
  const newCards: CardInstance[] = cards.map(t => ({ id: uuidGen(), type: t }))
  return {
    ok: true,
    nextState: {
      ...state,
      drawPile: [...newCards, ...state.drawPile],
    },
  }
}

/**
 * Append the supplied cards to a named player's hand. Resolves the
 * player by case-insensitive name match. Cards are minted with fresh
 * UUIDs. Pure — does not mutate `state`.
 *
 * Used to set up scenarios where a player needs a specific card (e.g.
 * give Michael a fresh Extraction so a re-stacked Burned re-tests the
 * BURNED-DRAW drama beat).
 */
export function applyDevGiveCard(
  state: GameState,
  playerName: string,
  cards: readonly CardType[],
  uuidGen: () => string,
): DevActionApplyResult {
  if (state.phase !== 'playing') {
    return { ok: false, code: 'NOT_PLAYING' }
  }
  const targetName = playerName.toLowerCase()
  const targetIndex = state.players.findIndex(p => p.name.toLowerCase() === targetName)
  if (targetIndex === -1) {
    return { ok: false, code: 'PLAYER_NOT_FOUND' }
  }
  const newCards: CardInstance[] = cards.map(t => ({ id: uuidGen(), type: t }))
  const target = state.players[targetIndex]!
  const updatedPlayer = { ...target, hand: [...target.hand, ...newCards] }
  const updatedPlayers = state.players.map((p, i) => i === targetIndex ? updatedPlayer : p)
  return {
    ok: true,
    nextState: {
      ...state,
      players: updatedPlayers,
    },
  }
}
