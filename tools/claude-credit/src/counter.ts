import { promises as fs } from 'node:fs';
import type {
  CategorizedFile,
  CategoryReport,
  ProjectReport,
  SubcategoryStats,
  Tier,
  TierReport,
} from './taxonomy.js';
import { emptyStats, TIERS } from './taxonomy.js';
import type { ClassificationResult } from './classifier.js';
import type { WalkedFile } from './walker.js';

/** Files larger than this skip line-counting (just bytes). Prevents thrashing on huge data files. */
const MAX_LINE_COUNT_BYTES = 20 * 1024 * 1024; // 20MB

export interface LineCount {
  totalLines: number;
  nonBlankLines: number;
}

export async function countLines(absPath: string, sizeHint: number): Promise<LineCount | null> {
  if (sizeHint > MAX_LINE_COUNT_BYTES) return null;
  let content: string;
  try {
    content = await fs.readFile(absPath, 'utf8');
  } catch {
    return null;
  }
  if (content.length === 0) return { totalLines: 0, nonBlankLines: 0 };

  let totalLines = 0;
  let nonBlankLines = 0;
  let blankRun = true;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    if (ch === 0x0a) {
      // \n — line terminator
      totalLines++;
      if (!blankRun) nonBlankLines++;
      blankRun = true;
    } else if (ch !== 0x0d && ch !== 0x20 && ch !== 0x09) {
      // not \r, space, tab → content
      blankRun = false;
    }
  }
  // Trailing line without final newline
  if (content.charCodeAt(content.length - 1) !== 0x0a) {
    totalLines++;
    if (!blankRun) nonBlankLines++;
  }

  return { totalLines, nonBlankLines };
}

export async function categorize(
  file: WalkedFile,
  classification: ClassificationResult,
): Promise<CategorizedFile> {
  const base: CategorizedFile = {
    relPath: file.relPath,
    absPath: file.absPath,
    tier: classification.tier,
    category: classification.category,
    subcategory: classification.subcategory,
    kind: classification.kind,
    bytes: file.size,
  };

  if (classification.kind === 'text') {
    const lc = await countLines(file.absPath, file.size);
    if (lc) {
      base.totalLines = lc.totalLines;
      base.nonBlankLines = lc.nonBlankLines;
    } else {
      base.totalLines = 0;
      base.nonBlankLines = 0;
    }
  }

  return base;
}

function addStats(target: SubcategoryStats, file: CategorizedFile): void {
  target.files += 1;
  target.bytes += file.bytes;
  target.totalLines += file.totalLines ?? 0;
  target.nonBlankLines += file.nonBlankLines ?? 0;
}

function emptyTotals(): SubcategoryStats {
  return emptyStats('<totals>');
}

export function aggregateTiers(files: CategorizedFile[]): TierReport[] {
  // tier → category → subcategory → stats
  const byTier = new Map<Tier, Map<string, Map<string, SubcategoryStats>>>();
  for (const tier of TIERS) byTier.set(tier, new Map());

  for (const file of files) {
    const tierMap = byTier.get(file.tier);
    if (!tierMap) continue;
    let catMap = tierMap.get(file.category);
    if (!catMap) {
      catMap = new Map();
      tierMap.set(file.category, catMap);
    }
    let subStats = catMap.get(file.subcategory);
    if (!subStats) {
      subStats = emptyStats(file.subcategory);
      catMap.set(file.subcategory, subStats);
    }
    addStats(subStats, file);
  }

  const result: TierReport[] = [];
  for (const tier of TIERS) {
    const tierMap = byTier.get(tier)!;
    const categories: CategoryReport[] = [];
    const tierTotals = emptyTotals();
    for (const [category, catMap] of tierMap.entries()) {
      const subs = Array.from(catMap.values()).sort((a, b) => b.bytes - a.bytes);
      const catTotals = emptyTotals();
      for (const sub of subs) {
        catTotals.files += sub.files;
        catTotals.bytes += sub.bytes;
        catTotals.totalLines += sub.totalLines;
        catTotals.nonBlankLines += sub.nonBlankLines;
      }
      tierTotals.files += catTotals.files;
      tierTotals.bytes += catTotals.bytes;
      tierTotals.totalLines += catTotals.totalLines;
      tierTotals.nonBlankLines += catTotals.nonBlankLines;
      categories.push({ category, subcategories: subs, totals: catTotals });
    }
    categories.sort((a, b) => b.totals.bytes - a.totals.bytes);
    result.push({ tier, categories, totals: tierTotals });
  }
  return result;
}

/**
 * 0.2 — bytes-on-disk per asset family. ZERO discipline: every key is present
 * and 0 when no bytes were found (we measured and there were none), never null.
 * Only pipeline-generated/assets files contribute.
 */
export function aggregateAssetBytes(files: CategorizedFile[]): ProjectReport['assetBytesByKind'] {
  const result: ProjectReport['assetBytesByKind'] = {
    images: 0,
    audio: 0,
    video: 0,
    fonts: 0,
    'misc-media': 0,
  };
  for (const file of files) {
    if (file.tier !== 'pipeline-generated' || file.category !== 'assets') continue;
    if (file.subcategory in result) {
      result[file.subcategory as keyof typeof result] += file.bytes;
    }
  }
  return result;
}
