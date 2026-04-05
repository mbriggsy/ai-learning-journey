export interface PatternDefinition {
  readonly id: string
  readonly cinematicName: string
  readonly conwayName: string
  readonly description: string
  readonly width: number
  readonly height: number
  readonly cells: ReadonlyArray<readonly [number, number]>
}
