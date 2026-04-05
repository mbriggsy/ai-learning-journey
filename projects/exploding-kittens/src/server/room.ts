import { Server } from 'partyserver'
import type { Connection, ConnectionContext } from 'partyserver'

export class GameRoom extends Server {
  override onConnect(connection: Connection, _ctx: ConnectionContext) {
    console.log('Connected:', connection.id)
  }

  override onMessage(_connection: Connection, _message: string) {
    // Phase 3: Zod validation + serial action queue + dispatch
  }

  override onClose(connection: Connection) {
    console.log('Disconnected:', connection.id)
  }
}
