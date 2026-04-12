// scripts/generate-palette.ts
// Regenerates src/client/shared/tokens/palette.generated.ts from primitives.css.
// Run by `pnpm generate:palette`, chained into `prebuild`, `predev`, `pretest`.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const PRIMITIVES_PATH = resolve(REPO_ROOT, 'src/client/shared/tokens/primitives.css')
const OUTPUT_PATH = resolve(REPO_ROOT, 'src/client/shared/tokens/palette.generated.ts')

const css = readFileSync(PRIMITIVES_PATH, 'utf-8')
const root = postcss.parse(css)
const entries: Array<[string, string]> = []

root.walkRules((rule) => {
  if (rule.selector !== ':root') return
  rule.walkDecls(/^--color-/, (decl) => {
    entries.push([decl.prop.slice(2), decl.value.trim()]) // strip leading --
  })
})

if (entries.length === 0) {
  throw new Error(`generate-palette: no --color-* declarations found in ${PRIMITIVES_PATH}`)
}

const header = `/* eslint-disable */
// ⚠ GENERATED FILE — DO NOT EDIT MANUALLY.
// Source: src/client/shared/tokens/primitives.css
// Regenerate: pnpm generate:palette
// Generator: scripts/generate-palette.ts

`

const body = [
  'export const PALETTE = {',
  ...entries.map(([key, value]) => `  '${key}': '${value}',`),
  '} as const;',
  '',
  'export type PaletteKey = keyof typeof PALETTE;',
  'export type PaletteValue = typeof PALETTE[PaletteKey];',
  '',
].join('\n')

writeFileSync(OUTPUT_PATH, header + body, 'utf-8')
console.log(`generate-palette: wrote ${entries.length} color tokens to ${OUTPUT_PATH}`)
