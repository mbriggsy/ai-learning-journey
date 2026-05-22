/**
 * Phase 3 Unit 3.2 — card-roster drift gates.
 *
 * Three invariants enforced as a CI gate:
 *   1. Roster→disk: every CARD_ROSTER filename exists at
 *      `public/assets/cards/<filename>`.
 *   2. Disk→roster: every webp file at `public/assets/cards/`
 *      appears in CARD_ROSTER. Catches BURNED adding new card-art
 *      the trailer didn't notice (insight #027 presence-companion).
 *   3. Roster ↔ cascade-halo-column.json bidirectional: the JSON's
 *      `entries[].filename` + `offscreenVarietyPool.cards` together
 *      equal the exact CARD_ROSTER set. Catches drift between the
 *      two declarations of the same logical set (insight #063
 *      sync-pair-declarations corrective).
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * (cwd-independent — matches Unit 2.8 codegen + Unit 3.0 vendor
 * scripts + Unit 3.1 capture script per insight #057 convention).
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { CARD_ROSTER } from './card-roster.js'
import haloLayout from './cascade-halo-column.json' with { type: 'json' }

const HERE = dirname(fileURLToPath(import.meta.url))
const BURNED_ROOT = resolve(HERE, '..', '..', '..', '..')
const CARDS_DIR = resolve(BURNED_ROOT, 'public', 'assets', 'cards')

describe('card-roster invariants', () => {
  it('declares exactly 17 entries (catches accidental add/remove drift)', () => {
    expect(CARD_ROSTER.length).toBe(17)
  })

  it('every roster filename exists on disk (catches removal/rename)', () => {
    const missing = CARD_ROSTER.filter(
      (entry) => !existsSync(resolve(CARDS_DIR, entry.filename)),
    ).map((entry) => entry.filename)
    expect(missing, `missing from ${CARDS_DIR}: ${missing.join(', ')}`).toEqual([])
  })

  it('every webp on disk appears in roster (catches BURNED adding card-art that trailer missed)', () => {
    const onDisk = readdirSync(CARDS_DIR)
      .filter((f) => f.endsWith('.webp'))
      .sort()
    const inRoster = new Set(CARD_ROSTER.map((c) => c.filename))
    const unaccounted = onDisk.filter((f) => !inRoster.has(f))
    expect(
      unaccounted,
      `new card-art on disk not in CARD_ROSTER: ${unaccounted.join(', ')} ` +
        `— add to card-roster.ts + cascade-halo-column.json offscreenVarietyPool ` +
        `(or entries if it replaces an operative slot).`,
    ).toEqual([])
  })
})

describe('cascade-halo-column.json ↔ card-roster.ts bidirectional sync', () => {
  it('JSON column entries + offscreen pool together equal the full roster (catches sync-pair drift, insight #063)', () => {
    const inColumn = haloLayout.entries.map((e) => e.filename)
    const inPool = haloLayout.offscreenVarietyPool.cards
    const inJson = new Set([...inColumn, ...inPool])
    const inRoster = new Set(CARD_ROSTER.map((c) => c.filename))

    // Same size means same set (sets of strings).
    expect(inJson.size, 'cascade-halo-column.json count').toBe(inRoster.size)

    // Every card in roster appears in the JSON (column OR pool).
    const missingFromJson = [...inRoster].filter((f) => !inJson.has(f))
    expect(
      missingFromJson,
      `in roster but missing from cascade-halo-column.json: ${missingFromJson.join(', ')}`,
    ).toEqual([])

    // Every card in the JSON appears in the roster.
    const missingFromRoster = [...inJson].filter((f) => !inRoster.has(f))
    expect(
      missingFromRoster,
      `in cascade-halo-column.json but missing from CARD_ROSTER: ${missingFromRoster.join(', ')}`,
    ).toEqual([])
  })

  it('column entries are exactly the 6 cascade-halo operatives from card-roster', () => {
    const columnFilenames = new Set(haloLayout.entries.map((e) => e.filename))
    const cascadeHalo = new Set(
      CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo')).map((c) => c.filename),
    )

    expect(columnFilenames.size, 'column entry count').toBe(6)
    expect(cascadeHalo.size, 'cascade-halo role count').toBe(6)

    const inColumnNotRoster = [...columnFilenames].filter((f) => !cascadeHalo.has(f))
    expect(
      inColumnNotRoster,
      `in column but not cascade-halo role: ${inColumnNotRoster.join(', ')}`,
    ).toEqual([])

    const inRosterNotColumn = [...cascadeHalo].filter((f) => !columnFilenames.has(f))
    expect(
      inRosterNotColumn,
      `cascade-halo role but not in column: ${inRosterNotColumn.join(', ')}`,
    ).toEqual([])
  })

  it('Phase 1 lock — column geometry stays at the specified band', () => {
    // These are the Phase 1 Unit 1.5 lock values. If any of these
    // drift, re-read Phase 1 before re-locking — most likely the
    // change is intentional and the lock prose needs an update too.
    expect(haloLayout.geometry).toBe('right-edge-column')
    expect(haloLayout.column.xLeft).toBe(1560)
    expect(haloLayout.column.xRight).toBe(1880)
    expect(haloLayout.column.opacityCeiling).toBe(0.4)
    expect(haloLayout.entryStaggerFrames).toBe(2)
    expect(haloLayout.haloStartFrame).toBe(1560)
    expect(haloLayout.haloCompleteFrame).toBe(1572)
    expect(haloLayout.cardCount).toBe(6)
  })
})

describe('card-roster derived exports', () => {
  it('COLD_OPEN_CARDS contains Janet (Phase 0 EXIT lock) + Dash + Neal — and ONLY those three', async () => {
    const { COLD_OPEN_CARDS } = await import('./card-roster.js')
    const filenames = COLD_OPEN_CARDS.map((c) => c.filename).sort()
    expect(filenames).toEqual(
      ['dash-barlowe.webp', 'janet-broadside.webp', 'neal-proctor.webp'].sort(),
    )
  })

  it('S03_ROSTER contains all 6 operatives', async () => {
    const { S03_ROSTER } = await import('./card-roster.js')
    expect(S03_ROSTER.length).toBe(6)
    expect(S03_ROSTER.every((c) => c.type === 'operative')).toBe(true)
  })

  it('CASCADE_HALO contains all 6 operatives (matches column entry count)', async () => {
    const { CASCADE_HALO } = await import('./card-roster.js')
    expect(CASCADE_HALO.length).toBe(6)
    expect(CASCADE_HALO.every((c) => c.type === 'operative')).toBe(true)
  })
})
