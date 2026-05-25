import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MultiProjectReport, ProjectReport } from '../src/types.js'

const PUBLIC_ASSETS = path.resolve('public/assets')

// Mutates report.projects[*] editorial paths in place, copies the referenced files into
// public/assets/<projectName>/, and cleans stale project dirs. Skips archiveCollective (no
// projectPath, no editorial). NEVER touches public/assets/fonts/. (report.meta exists for
// totals, but meta entries have editorial:null → nothing to copy; we walk projects only.)
export async function copyEditorialAssets(report: MultiProjectReport): Promise<void> {
  const all = report.projects

  // 0. Collision guard: projectName is path.basename(rootDir) — NOT unique. Two configured
  //    paths with the same leaf dir name would map to the same public/assets/<name>/ dir and
  //    silently overwrite each other's hero image + cross-wire editorial URLs. Fail LOUD.
  const seen = new Set<string>()
  for (const p of all) {
    if (seen.has(p.projectName)) {
      throw new Error(
        `copy-editorial-assets: duplicate projectName "${p.projectName}" across projects[]. ` +
          `Asset dirs are keyed on basename — rename one project or slug the asset dir before publishing.`,
      )
    }
    seen.add(p.projectName)
  }

  // 1. Idempotent cleanup: remove every public/assets/* dir EXCEPT fonts/ (hand-placed in
  //    Phase 1). Guarantees the asset tree mirrors the current report — zero orphan buildup.
  const existing = await fs.readdir(PUBLIC_ASSETS, { withFileTypes: true }).catch(() => [])
  for (const entry of existing) {
    if (entry.isDirectory() && entry.name !== 'fonts') {
      await fs.rm(path.join(PUBLIC_ASSETS, entry.name), { recursive: true, force: true })
    }
  }

  // 2. Walk active projects (archive + meta have no editorial → nothing to copy).
  for (const project of all) {
    await rewriteOne(project)
  }
}

async function rewriteOne(project: ProjectReport): Promise<void> {
  const ed = project.editorial
  if (!ed) return
  const destDir = path.join(PUBLIC_ASSETS, project.projectName)
  let made = false

  const ensureDir = async () => {
    if (!made) {
      await fs.mkdir(destDir, { recursive: true })
      made = true
    }
  }

  // heroImage: project-relative → /assets/<name>/<basename>
  if (ed.heroImage) {
    ed.heroImage = await copyAndUrl(project, ed.heroImage, destDir, ensureDir)
  }
  // gallery[]: same treatment, preserve order. On a missing source, SKIP the entry — never
  // fall back to the project-relative path (that would leak a relative path into the public
  // JSON + ship a broken <img src>; the HARD guard patterns don't catch a bare `docs/x.png`).
  if (ed.gallery?.length) {
    const next: string[] = []
    for (const rel of ed.gallery) {
      const url = await copyAndUrl(project, rel, destDir, ensureDir)
      if (url) next.push(url)
    }
    ed.gallery = next
  }
}

// Resolves source via project.projectPath (still present pre-strip), copies, returns the
// public URL. On missing source: warn to stderr, return null (so heroImage degrades to null).
async function copyAndUrl(
  project: ProjectReport,
  rel: string,
  destDir: string,
  ensureDir: () => Promise<void>,
): Promise<string | null> {
  // Traversal guard: editorial paths are author-controlled, but a stray `../` (Phase 0's
  // validateEditorial rejects absolute/`~`/drive-letter paths, NOT `..`) would resolve OUTSIDE
  // the project and copy an arbitrary file into public/. Reject anything escaping the root.
  const root = path.resolve(project.projectPath)
  const src = path.resolve(root, rel)
  if (src !== root && !src.startsWith(root + path.sep)) {
    process.stderr.write(`refresh: rejected out-of-project asset for ${project.projectName}: ${rel}\n`)
    return null
  }
  const base = path.basename(rel)
  try {
    await fs.access(src)
  } catch {
    process.stderr.write(`refresh: missing asset for ${project.projectName}: ${rel}\n`)
    return null
  }
  await ensureDir()
  await fs.copyFile(src, path.join(destDir, base))
  return `/assets/${project.projectName}/${base}`
}
