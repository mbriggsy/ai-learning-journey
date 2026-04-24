/**
 * Run-directory layout + session.md lifecycle.
 *
 * Implementation: Unit 2. Unit 1 ships the signatures only.
 */
import type { Config, SessionResult } from './types'

export interface RunDirPaths {
  readonly root: string
  readonly serverDir: string
  readonly seatsDir: string
  readonly eventsJsonl: string
  readonly connectionsJsonl: string
  readonly sessionMd: string
  readonly coverageMd: string
}

export function createRunDirectory(_root: string, _sessionId: string): Promise<RunDirPaths> {
  throw new Error('not implemented')
}

export function writeSessionStart(_paths: RunDirPaths, _config: Config): Promise<void> {
  throw new Error('not implemented')
}

export function appendSessionEnd(_paths: RunDirPaths, _result: SessionResult): Promise<void> {
  throw new Error('not implemented')
}
