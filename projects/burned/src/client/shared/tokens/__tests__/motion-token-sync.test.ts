/// <reference types="node" />
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import {
  DURATION_NAMES, EASING_NAMES,
  MOTION_DURATIONS, MOTION_EASINGS,
} from '../motion'

const __dir = dirname(fileURLToPath(import.meta.url))

// Parse primitives.css once; build a map of custom properties on :root.
const primitivesCssPath = resolve(__dir, '../primitives.css')
const primitivesCss = readFileSync(primitivesCssPath, 'utf-8')
const root = postcss.parse(primitivesCss)
const customProps = new Map<string, string>()
root.walkRules(':root', (rule) => {
  // Skip :root rules inside @media blocks (e.g., prefers-reduced-motion)
  let parent: postcss.Container | postcss.Document | undefined = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && 'name' in parent && (parent as postcss.AtRule).name === 'media') return
    parent = parent.parent
  }
  rule.walkDecls(/^--/, (decl) => {
    customProps.set(decl.prop, decl.value.trim())
  })
})

function parseCssDurationMs(value: string): number {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.endsWith('ms')) return parseFloat(trimmed)
  if (trimmed.endsWith('s')) return parseFloat(trimmed) * 1000
  throw new Error(`Cannot parse CSS duration: ${value}`)
}

function parseCubicBezier(value: string): [number, number, number, number] {
  const m = value.trim().match(/^cubic-bezier\(\s*([^)]+)\s*\)$/)
  if (!m) throw new Error(`Not a cubic-bezier: ${value}`)
  const parts = m[1]!.split(',').map((s: string) => parseFloat(s.trim()))
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error(`Malformed cubic-bezier: ${value}`)
  }
  return parts as unknown as [number, number, number, number]
}

describe('motion token TS/CSS sync — durations', () => {
  for (const name of DURATION_NAMES) {
    const cssName = `--motion-duration-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    test(`${cssName} matches MOTION_DURATIONS.${name}`, () => {
      const cssValue = customProps.get(cssName)
      expect(cssValue, `CSS missing ${cssName}`).toBeDefined()
      const ms = parseCssDurationMs(cssValue!)
      expect(ms).toBeCloseTo(MOTION_DURATIONS[name] * 1000, 3)
    })
  }
})

describe('motion token TS/CSS sync — easings', () => {
  for (const name of EASING_NAMES) {
    const cssName = `--motion-ease-${name}`
    test(`${cssName} matches MOTION_EASINGS.${name}`, () => {
      const cssValue = customProps.get(cssName)
      expect(cssValue, `CSS missing ${cssName}`).toBeDefined()
      const bezier = parseCubicBezier(cssValue!)
      const ts = MOTION_EASINGS[name]
      expect(bezier).toEqual([ts[0], ts[1], ts[2], ts[3]])
    })
  }
})
