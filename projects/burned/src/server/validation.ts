import { z } from 'zod'
import { CARD_DEFS } from '@shared/card-defs'
import type { ClientMessage } from '@shared/protocol'
import type { ClientAction } from '@shared/actions'

// --- Wire size measurement ---

/**
 * The WS message byte cap. Keep in lockstep with the constant in room.ts —
 * room.ts cannot export it (Workers entry treats named exports as
 * handlers), so both files declare it and tests read from here.
 */
export const MAX_MESSAGE_BYTES = 4096

/**
 * Measure the UTF-8 byte length of a WebSocket text frame.
 *
 * `String.length` counts UTF-16 code units, which lets a client bypass a
 * byte-budget cap by ~4x using 4-byte UTF-8 glyphs (emoji, CJK planes).
 * E2E audit 2026-04-23 E-02 — 4096-char `.length` messages of 🔥 weigh
 * ~16KB on the wire and previously slipped past the cap.
 *
 * Lives in validation.ts (not room.ts) because Vitest-Node can't import
 * partyserver transitively — this must be testable in isolation, and
 * room.ts is the Workers entry where named exports are forbidden.
 */
export function messageByteLength(message: string): number {
  return new TextEncoder().encode(message).byteLength
}

// --- Card Type Literal ---

const CARD_TYPE_TUPLE = CARD_DEFS.map(d => d.type) as [string, ...string[]]
const CardTypeSchema = z.enum(CARD_TYPE_TUPLE)

// --- Base Action Fields ---
//
// stateVersion upper bound prevents a rogue client from submitting
// Number.MAX_SAFE_INTEGER and triggering arithmetic precision bugs in
// any future handler. Server's stateVersion starts at 0 and increments
// by 1 per accepted dispatch — a real game will not exceed 1M.
// E2E audit 2026-04-23 E-07.

const BaseAction = z.object({
  stateVersion: z.int().min(0).max(1_000_000),
})

// --- Client Game Action Schemas ---
//
// .strict() on every action so unknown keys in the action payload are
// rejected. E2E audit 2026-04-23 E-04. Zod's .extend() does NOT inherit
// strict mode from the parent — each must be marked explicitly.

const PlayCardAction = BaseAction.extend({
  type: z.literal('play-card'),
  cardIds: z.array(z.string().uuid()).min(1).max(3),
  targetPlayerId: z.string().uuid().optional(),
  namedCardType: CardTypeSchema.optional(),
}).strict()

const DrawCardAction = BaseAction.extend({
  type: z.literal('draw-card'),
}).strict()

const NopeAction = BaseAction.extend({
  type: z.literal('nope'),
  // Client echoes the Nope window's generation it was acting on. Server
  // rejects if the generation has already advanced — another player
  // already Noped, their tap was too late. Prevents the D-03 race where
  // a late-arriving Nope accidentally counter-Nopes instead.
  windowGeneration: z.int().min(1).max(1_000_000),
}).strict()

const DefusePlaceAction = BaseAction.extend({
  type: z.literal('defuse-place'),
  position: z.int().min(0).max(120),
}).strict()

const FavorGiveAction = BaseAction.extend({
  type: z.literal('favor-give'),
  cardId: z.string().uuid(),
}).strict()

const FutureRearrangeAction = BaseAction.extend({
  type: z.literal('future-rearrange'),
  order: z.array(z.string().uuid()).min(1).max(3),
}).strict()

const NameCardAction = BaseAction.extend({
  type: z.literal('name-card'),
  cardType: CardTypeSchema,
}).strict()

const CancelNameCardAction = BaseAction.extend({
  type: z.literal('cancel-name-card'),
}).strict()

const ClientGameActionSchema = z.discriminatedUnion('type', [
  PlayCardAction,
  DrawCardAction,
  NopeAction,
  DefusePlaceAction,
  FavorGiveAction,
  FutureRearrangeAction,
  NameCardAction,
  CancelNameCardAction,
])

// --- Client Message Schemas ---
//
// .strict() on every z.object() rejects unknown keys at the WS boundary
// instead of silently stripping them. Without this, a future handler
// accidentally reading action.someField before updating Zod would be
// exploitable. Defense-in-depth, zero runtime cost. E2E audit E-04.
//
// Name schema regex mirrors NAME_PATTERN in room.ts — single source of
// truth at the WS boundary. E2E audit E-06.

// Matches room.ts NAME_PATTERN — ASCII alphanumeric + punctuation, 1-12.
const NameRegex = /^[a-zA-Z0-9 .!?_-]{1,12}$/

const HostConnectMessage = z.object({
  type: z.literal('host-connect'),
  payload: z.strictObject({}),
}).strict()

const JoinMessage = z.object({
  type: z.literal('join'),
  payload: z.strictObject({
    // Allow empty name IF a sessionToken is present (reconnect path).
    // Otherwise require the name to match NAME_PATTERN exactly.
    name: z.string().max(12),
    sessionToken: z.string().uuid().optional(),
    // Optional at the schema level so old clients (which don't send it)
    // don't get a generic Zod validation error. The runtime check in
    // room.ts handleClientMessage rejects mismatches with the explicit
    // PROTOCOL_MISMATCH error code instead. B-12.
    protocolVersion: z.number().int().nonnegative().optional(),
  }).refine(
    d => d.sessionToken !== undefined || (d.name.length >= 1 && NameRegex.test(d.name)),
    'Name must match NAME_PATTERN when sessionToken is absent',
  ),
}).strict()

const StartGameMessage = z.object({
  type: z.literal('start-game'),
  payload: z.strictObject({}),
}).strict()

const ReturnToLobbyMessage = z.object({
  type: z.literal('return-to-lobby'),
  payload: z.strictObject({}),
}).strict()

const ActionMessage = z.object({
  type: z.literal('action'),
  payload: ClientGameActionSchema,
}).strict()

const PingMessage = z.object({
  type: z.literal('ping'),
  payload: z.strictObject({}),
}).strict()

const PongMessage = z.object({
  type: z.literal('pong'),
  payload: z.strictObject({}),
}).strict()

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
