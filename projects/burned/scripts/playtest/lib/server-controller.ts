/**
 * Server controller — wrangler + vite subprocess lifecycle.
 *
 * Implementation: Unit 3. Unit 1 ships the signatures only.
 */
import type { Config } from './types'

export interface ServerHandles {
  readonly wranglerPid: number
  readonly vitePid: number
  readonly healthUrl: string
}

export function startServers(_config: Config, _token: string): Promise<ServerHandles> {
  throw new Error('not implemented')
}

export function stopServers(_handles: ServerHandles): Promise<void> {
  throw new Error('not implemented')
}
