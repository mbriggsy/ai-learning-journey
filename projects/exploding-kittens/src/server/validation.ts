import { z } from 'zod'
import { CARD_DEFS } from '@shared/card-defs'
import type { ClientMessage } from '@shared/protocol'
import type { ClientAction } from '@shared/actions'

// --- Card Type Literal ---

const CARD_TYPE_TUPLE = CARD_DEFS.map(d => d.type) as [string, ...string[]]
const CardTypeSchema = z.enum(CARD_TYPE_TUPLE)

// --- Base Action Fields ---

const BaseAction = z.object({
  stateVersion: z.int().min(0),
})

// --- Client Game Action Schemas ---

const PlayCardAction = BaseAction.extend({
  type: z.literal('play-card'),
  cardIds: z.array(z.string().uuid()).min(1).max(3),
  targetPlayerId: z.string().uuid().optional(),
  namedCardType: CardTypeSchema.optional(),
})

const DrawCardAction = BaseAction.extend({
  type: z.literal('draw-card'),
})

const NopeAction = BaseAction.extend({
  type: z.literal('nope'),
})

const DefusePlaceAction = BaseAction.extend({
  type: z.literal('defuse-place'),
  position: z.int().min(0).max(120),
})

const FavorGiveAction = BaseAction.extend({
  type: z.literal('favor-give'),
  cardId: z.string().uuid(),
})

const FutureRearrangeAction = BaseAction.extend({
  type: z.literal('future-rearrange'),
  order: z.array(z.string().uuid()).min(1).max(3),
})

const SelectTargetAction = BaseAction.extend({
  type: z.literal('select-target'),
  targetPlayerId: z.string().uuid(),
})

const NameCardAction = BaseAction.extend({
  type: z.literal('name-card'),
  cardType: CardTypeSchema,
})

const ClientGameActionSchema = z.discriminatedUnion('type', [
  PlayCardAction,
  DrawCardAction,
  NopeAction,
  DefusePlaceAction,
  FavorGiveAction,
  FutureRearrangeAction,
  SelectTargetAction,
  NameCardAction,
])

// --- Client Message Schemas ---

const HostConnectMessage = z.object({
  type: z.literal('host-connect'),
  payload: z.object({}),
})

const JoinMessage = z.object({
  type: z.literal('join'),
  payload: z.object({
    name: z.string().max(12),
    sessionToken: z.string().uuid().optional(),
  }).refine(
    d => d.sessionToken !== undefined || d.name.length >= 1,
    'Name is required for new joins',
  ),
})

const StartGameMessage = z.object({
  type: z.literal('start-game'),
  payload: z.object({}),
})

const ReturnToLobbyMessage = z.object({
  type: z.literal('return-to-lobby'),
  payload: z.object({}),
})

const ActionMessage = z.object({
  type: z.literal('action'),
  payload: ClientGameActionSchema,
})

const PingMessage = z.object({
  type: z.literal('ping'),
  payload: z.object({}),
})

const PongMessage = z.object({
  type: z.literal('pong'),
  payload: z.object({}),
})

export const ClientMessageSchema = z.discriminatedUnion('type', [
  HostConnectMessage,
  JoinMessage,
  StartGameMessage,
  ReturnToLobbyMessage,
  ActionMessage,
  PingMessage,
  PongMessage,
])

// --- Bidirectional Type Assertion ---

type ZodClientMessage = z.infer<typeof ClientMessageSchema>
type ZodClientAction = z.infer<typeof ClientGameActionSchema>

type _AssertClientMessageToZod = ClientMessage extends ZodClientMessage ? true : never
type _AssertClientActionToZod = ClientAction extends ZodClientAction ? true : never
type _AssertZodToClientMessage = ZodClientMessage extends ClientMessage ? true : never
type _AssertZodToClientAction = ZodClientAction extends ClientAction ? true : never

void 0 as unknown as _AssertClientMessageToZod
void 0 as unknown as _AssertClientActionToZod
void 0 as unknown as _AssertZodToClientMessage
void 0 as unknown as _AssertZodToClientAction

// --- Parse Function ---

export type ParseResult =
  | { ok: true; message: ClientMessage }
  | { ok: false; error: string }

export function parseClientMessage(raw: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }

  const result = ClientMessageSchema.safeParse(json)
  if (!result.success) {
    return { ok: false, error: 'Invalid message' }
  }

  return { ok: true, message: result.data as ClientMessage }
}
