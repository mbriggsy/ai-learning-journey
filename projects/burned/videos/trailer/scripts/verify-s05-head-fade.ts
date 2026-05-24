/**
 * `pnpm verify:s05-head-fade` — anti-regression grep gate for the
 * S05HeadFadeFromBlack overlay (Phase 4 Unit 4.6 amendment TIER 1 #5).
 *
 * The overlay is MANDATORY — it closes the through-black chapter-break
 * grammar that S04TailFadeToBlack opens. Without S05's matching head
 * fade, the S04→S05 hard cut goes from full-opacity black at frame
 * 2369 → bright BURNED-board UI at frame 2370, which is EXACTLY the
 * perceptual jump the tail fade was designed to mask in the first
 * place. Removing the overlay (intentionally or accidentally) silently
 * undoes the design.
 *
 * Honor-system rules are weak. This gate makes the requirement
 * executable: greps the scene file for both the import line and the
 * JSX use. Exits 1 with diagnostic if either is missing.
 *
 * Wired into Unit 4.10's anti-regression CI gate set.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * per insight #057.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ -> videos/trailer/
const TRAILER_ROOT = resolve(__dirname, '..')
const SCENE_FILE = resolve(TRAILER_ROOT, 'src', 'scenes', 'S05_GameplayDissolve.tsx')

if (!existsSync(SCENE_FILE)) {
  console.error(`[verify-s05-head-fade] FAIL: scene file not found at ${SCENE_FILE}`)
  process.exit(1)
}

const src = readFileSync(SCENE_FILE, 'utf-8')

const failures: string[] = []

// 1. Import — at least one import line must reference S05HeadFadeFromBlack.
//    Matches both `import { S05HeadFadeFromBlack }` and `import { Foo, S05HeadFadeFromBlack, Bar }`.
const importRe = /import\s*\{[^}]*\bS05HeadFadeFromBlack\b[^}]*\}\s*from\s*['"][^'"]+S05HeadFadeFromBlack['"]/
if (!importRe.test(src)) {
  failures.push(
    `missing import — expected something like:\n` +
      `  import { S05HeadFadeFromBlack } from '../components/S05HeadFadeFromBlack'`,
  )
}

// 2. JSX use — `<S05HeadFadeFromBlack` (allows props, self-closing or with children).
const jsxRe = /<S05HeadFadeFromBlack\b/
if (!jsxRe.test(src)) {
  failures.push(`missing JSX usage — expected <S05HeadFadeFromBlack /> inside the scene's render`)
}

if (failures.length > 0) {
  console.error(`[verify-s05-head-fade] FAIL: ${SCENE_FILE}`)
  console.error(
    `  S05HeadFadeFromBlack is MANDATORY (Unit 4.6 amendment TIER 1 #5). Without it the S04→S05`,
  )
  console.error(`  chapter-break fade silently breaks — bright UI snaps onto screen at frame 2370.`)
  console.error(``)
  for (const f of failures) {
    console.error(`  - ${f}`)
  }
  process.exit(1)
}

console.log(`[verify-s05-head-fade] PASS — overlay wired in ${SCENE_FILE}`)
