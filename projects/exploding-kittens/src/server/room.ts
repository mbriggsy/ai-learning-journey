import { Server } from 'partyserver'
import type { Connection, ConnectionContext } from 'partyserver'

const MAX_MESSAGE_BYTES = 4096

export class GameRoom extends Server {
  override onConnect(connection: Connection, _ctx: ConnectionContext) {
    console.log('Connected:', connection.id)
  }

  override onMessage(connection: Connection, message: string) {
    if (typeof message === 'string' && message.length > MAX_MESSAGE_BYTES) {
      connection.close(1009, 'Message too large')
      return
    }
    // Phase 3: Zod validation + serial action queue + dispatch
  }

  override onClose(connection: Connection) {
    console.log('Disconnected:', connection.id)
  }
}
