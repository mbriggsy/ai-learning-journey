/**
 * Three-tier scenario-fire detector — reads events.jsonl + connections.jsonl
 * + seat-N.log.md, emits per-scenario fire records.
 *
 * Implementation: Unit 9. Unit 1 ships the signature only.
 */

export interface ScenarioFire {
  readonly scenarioId: string
  readonly seatId: string
  readonly firstFireAt: number
  readonly matchConfidence: 'strict' | 'contains' | 'inferred'
  readonly tiers: {
    readonly events: 'matched' | 'partial' | 'not-matched'
    readonly projectionAsserts: 'matched' | 'missing-projection' | 'n/a'
    readonly connectionEvents: 'matched' | 'n/a'
    readonly ui: 'seat-reported' | 'not-reported' | 'n/a'
  }
}

export function detectFires(
  _catalogPath: string,
  _eventsJsonlPath: string,
  _connectionsJsonlPath: string,
  _seatLogPaths: readonly string[],
): Promise<readonly ScenarioFire[]> {
  throw new Error('not implemented')
}
