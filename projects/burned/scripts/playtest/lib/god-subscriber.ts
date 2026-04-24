/**
 * God-event WS subscription + split-envelope reassembly + events.jsonl writer.
 *
 * Implementation: Unit 4. Unit 1 ships the signatures only.
 */
import type { Config, GodEvent } from './types'

export interface GodSubscriberHandle {
  readonly close: () => Promise<void>
}

export function startGodSubscriber(
  _config: Config,
  _token: string,
  _eventsJsonlPath: string,
  _onEvent: (event: GodEvent) => void,
): Promise<GodSubscriberHandle> {
  throw new Error('not implemented')
}
