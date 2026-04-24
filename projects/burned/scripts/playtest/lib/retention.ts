/**
 * Retention policy — deletes session dirs beyond `sessionDirRetention`.
 *
 * Implementation: Unit 6. Unit 1 ships the signature only.
 */

export function applyRetention(_outputRoot: string, _keepMostRecent: number): Promise<{
  readonly kept: string[]
  readonly deleted: string[]
}> {
  throw new Error('not implemented')
}
