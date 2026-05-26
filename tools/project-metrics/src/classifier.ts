import path from 'node:path';
import picomatch from 'picomatch';
import type { Tier } from './taxonomy.js';
import type { WalkedFile } from './walker.js';

export interface ClassifierRule {
  /** Human-readable name for the rule (helps debugging). */
  name: string;
  match: {
    extensions?: string[];
    /** Picomatch globs applied against forward-slash relative path. */
    pathGlobs?: string[];
    /** Basenames matched exactly (case-insensitive). */
    filenames?: string[];
  };
  tier: Tier;
  category: string;
  subcategory: string;
  /** If true, file is treated as binary (no line counting). */
  binary?: boolean;
}

export interface CompiledRule extends ClassifierRule {
  pathMatcher?: (relPath: string) => boolean;
  lowerFilenames?: Set<string>;
  lowerExts?: Set<string>;
}

export interface ClassificationResult {
  tier: Tier;
  category: string;
  subcategory: string;
  kind: 'text' | 'binary';
  /** Name of the rule that matched. Useful for debugging. */
  matchedRule: string;
}

const KNOWN_BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.tif',
  '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus',
  '.mp4', '.webm', '.mov', '.mkv', '.avi', '.wmv',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.bin', '.dat', '.wasm', '.exe', '.dll', '.so', '.dylib',
  '.psd', '.ai', '.sketch', '.fig',
]);

export function compileRule(rule: ClassifierRule): CompiledRule {
  const compiled: CompiledRule = { ...rule };
  if (rule.match.pathGlobs?.length) {
    const matcher = picomatch(rule.match.pathGlobs, { dot: true });
    compiled.pathMatcher = (relPath) => matcher(relPath);
  }
  if (rule.match.filenames?.length) {
    compiled.lowerFilenames = new Set(rule.match.filenames.map((s) => s.toLowerCase()));
  }
  if (rule.match.extensions?.length) {
    compiled.lowerExts = new Set(rule.match.extensions.map((s) => s.toLowerCase()));
  }
  return compiled;
}

export function compileRules(rules: ClassifierRule[]): CompiledRule[] {
  return rules.map(compileRule);
}

function matches(file: WalkedFile, rule: CompiledRule): boolean {
  const basename = path.basename(file.relPath).toLowerCase();
  const ext = path.extname(file.relPath).toLowerCase();

  if (rule.lowerExts && !rule.lowerExts.has(ext)) return false;
  if (rule.lowerFilenames && !rule.lowerFilenames.has(basename)) return false;
  if (rule.pathMatcher && !rule.pathMatcher(file.relPath)) return false;

  // At least one of the three must have been specified, otherwise the rule
  // matches everything (catch-all). That's allowed but the caller should
  // only put a catch-all as the last rule.
  return true;
}

export function classify(file: WalkedFile, rules: CompiledRule[]): ClassificationResult {
  for (const rule of rules) {
    if (matches(file, rule)) {
      const kindFromRule = rule.binary ? 'binary' : undefined;
      const kindFromExt = KNOWN_BINARY_EXTS.has(path.extname(file.relPath).toLowerCase())
        ? 'binary'
        : 'text';
      return {
        tier: rule.tier,
        category: rule.category,
        subcategory: rule.subcategory,
        kind: kindFromRule ?? kindFromExt,
        matchedRule: rule.name,
      };
    }
  }
  // Fallthrough — anything we don't recognize lands here.
  const kind = KNOWN_BINARY_EXTS.has(path.extname(file.relPath).toLowerCase()) ? 'binary' : 'text';
  return {
    tier: 'authored',
    category: 'code',
    subcategory: 'source',
    kind,
    matchedRule: '<default-fallback>',
  };
}

/**
 * The default ruleset. Ordered first-match-wins.
 *
 * Design principles:
 *   1. Tool-generated lockfiles + snapshot files matched FIRST so they
 *      never accidentally count as authored code.
 *   2. Iteration receipts (regen scripts, sample-eval runs) matched before
 *      generic script rules so they land in pipeline-generated tier.
 *   3. Asset extensions matched early — they're binary, never code.
 *   4. Authored.code path patterns from most specific (tests, fixtures,
 *      schemas, config) to most general (source).
 *   5. Authored.docs path patterns from most specific (plans, conventions,
 *      specifications) to most general (general markdown).
 *   6. Authored.data catches structured JSON/YAML/TOML that isn't config.
 *   7. Final fallthrough is treated as source code (conservative).
 */
export const DEFAULT_RULES: ClassifierRule[] = [
  // ---- Tool-generated (matched first so we never count these as credit) ----
  {
    name: 'lockfile',
    match: { filenames: ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb', 'Cargo.lock', 'Gemfile.lock', 'poetry.lock', 'uv.lock'] },
    tier: 'tool-generated',
    category: 'lockfiles',
    subcategory: 'lockfiles',
  },
  {
    name: 'snapshot',
    match: { extensions: ['.snap'] },
    tier: 'tool-generated',
    category: 'snapshots',
    subcategory: 'snapshots',
  },
  {
    name: 'cache-or-state',
    match: { pathGlobs: ['**/.cache/**', '**/.turbo/**', '**/.next/**', '**/.vite/**', '**/.wrangler/**', '**/.parcel-cache/**'] },
    tier: 'tool-generated',
    category: 'caches',
    subcategory: 'caches',
  },

  // ---- Pipeline-generated.iteration-receipts (matched before generic scripts) ----
  {
    name: 'regen-script',
    match: { pathGlobs: ['scripts/regen-*.{ts,js,mjs,cjs}', 'scripts/regen-*/**', '**/scripts/regen-*.{ts,js,mjs,cjs}'] },
    tier: 'pipeline-generated',
    category: 'iteration-receipts',
    subcategory: 'regen-scripts',
  },

  // ---- Pipeline-generated.assets (by extension) ----
  {
    name: 'image-asset',
    match: { extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ico', '.tiff', '.tif'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'images',
    binary: true,
  },
  {
    name: 'svg-asset',
    // SVGs in `src/` / `app/` / `components/` are usually authored UI code;
    // SVGs anywhere else are usually exported assets. We bias to authored
    // when path includes src/ patterns, otherwise treat as image asset.
    match: { extensions: ['.svg'], pathGlobs: ['!src/**', '!app/**', '!components/**', '!client/**', '!packages/*/src/**'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'images',
    binary: true,
  },
  {
    name: 'audio-asset',
    match: { extensions: ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'audio',
    binary: true,
  },
  {
    name: 'video-asset',
    match: { extensions: ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.wmv'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'video',
    binary: true,
  },
  {
    name: 'font-asset',
    match: { extensions: ['.woff', '.woff2', '.ttf', '.otf', '.eot'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'fonts',
    binary: true,
  },
  {
    name: 'misc-media',
    match: { extensions: ['.pdf', '.psd', '.ai', '.sketch', '.fig'] },
    tier: 'pipeline-generated',
    category: 'assets',
    subcategory: 'misc-media',
    binary: true,
  },

  // ---- Authored.code.tests (matched before code.source) ----
  {
    name: 'test-fixtures',
    match: { pathGlobs: ['**/fixtures/**', '**/__fixtures__/**', '**/test-fixtures/**'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'test-fixtures',
  },
  {
    name: 'test-file',
    match: { pathGlobs: ['**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}', '**/__tests__/**', '**/tests/**', '**/test/**', '**/e2e/**'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'tests',
  },

  // ---- Authored.code.config ----
  {
    name: 'config-named',
    match: {
      filenames: [
        'package.json',
        'tsconfig.json', 'tsconfig.base.json', 'tsconfig.build.json', 'tsconfig.app.json', 'tsconfig.node.json',
        '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml',
        '.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.yaml', '.prettierrc.yml',
        '.editorconfig', '.gitattributes', '.gitignore', '.nvmrc', '.tool-versions', '.npmrc', '.pnpmrc', '.yarnrc',
        '.env.example', '.env.sample', '.env.template',
        'wrangler.toml', 'wrangler.jsonc', 'wrangler.json',
        'pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt', 'Pipfile', 'Gemfile',
        'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
        'Makefile', 'justfile',
      ],
    },
    tier: 'authored',
    category: 'code',
    subcategory: 'config',
  },
  {
    name: 'config-by-suffix',
    match: { pathGlobs: ['**/*.config.{ts,js,mjs,cjs,json}', '**/*rc.{js,cjs,mjs,json,yaml,yml}'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'config',
  },
  {
    name: 'github-workflows',
    match: { pathGlobs: ['.github/workflows/**', '.github/actions/**', '.gitlab-ci.yml', '.circleci/**'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'config',
  },

  // ---- Authored.code.schemas ----
  {
    name: 'type-defs',
    match: { extensions: ['.d.ts'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'schemas',
  },
  {
    name: 'schemas-path',
    match: { pathGlobs: ['**/schemas/**/*.{ts,js,json}', '**/zod/**/*.{ts,js}'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'schemas',
  },

  // ---- Authored.code.build-scripts ----
  {
    name: 'build-scripts',
    match: { pathGlobs: ['scripts/**/*.{ts,tsx,js,jsx,mjs,cjs,sh,ps1,py,bash}', 'tasks/**/*.{ts,js,sh,ps1,py}', 'tools/**/*.{ts,js,sh,ps1,py}'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'build-scripts',
  },

  // ---- Authored.code.styles / markup ----
  {
    name: 'styles',
    match: { extensions: ['.css', '.scss', '.sass', '.less', '.pcss', '.styl'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'styles',
  },
  {
    name: 'markup',
    match: { extensions: ['.html', '.htm', '.xml'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'markup',
  },
  {
    name: 'svg-source',
    // Matches SVGs that landed here because the earlier svg-asset rule
    // excluded them (i.e., SVGs under src/, app/, components/, client/).
    match: { extensions: ['.svg'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'markup',
  },

  // ---- Authored.code.source (catch-all for code) ----
  {
    name: 'source',
    match: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.lua', '.r', '.jl', '.ex', '.exs'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'source',
  },
  {
    name: 'shell-source',
    match: { extensions: ['.sh', '.bash', '.zsh', '.ps1', '.psm1'] },
    tier: 'authored',
    category: 'code',
    subcategory: 'source',
  },

  // ---- Authored.docs (path-based, specific → general) ----
  {
    name: 'docs-plans',
    match: { pathGlobs: ['docs/plans/**/*.md', 'docs/phases/**/*.md', '**/docs/plans/**/*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'plans',
  },
  {
    name: 'docs-specifications',
    match: { pathGlobs: ['docs/specifications/**/*.md', '**/PRODUCT-SPECIFICATION*.md', '**/SPECIFICATION*.md', '**/SPEC*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'specifications',
  },
  {
    name: 'docs-conventions',
    match: { pathGlobs: ['docs/conventions/**/*.md', '**/CONVENTIONS.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'conventions',
  },
  {
    name: 'docs-adrs',
    match: { pathGlobs: ['docs/adrs/**/*.md', 'docs/adr/**/*.md', '**/adr-*.md', '**/ADR-*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'adrs',
  },
  {
    name: 'docs-insights',
    match: { pathGlobs: ['docs/insights/**/*.md', 'docs/post-mortems/**/*.md', 'docs/autopsies/**/*.md', 'docs/postmortems/**/*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'insights',
  },
  {
    name: 'docs-triage',
    match: { pathGlobs: ['docs/testing/**/issues/**/*.md', '**/triage/**/*.md', '**/runs/*/issues/**/*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'triage',
  },
  {
    name: 'docs-narrative',
    match: { pathGlobs: ['videos/**/*.md', '**/voiceover/**/*.md', '**/storyboard/**/*.md', '**/narration/**/*.md', '**/trailer/**/*.md', '**/scripts/**/*.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'narrative',
  },
  {
    name: 'docs-readmes',
    match: { filenames: ['readme.md', 'claude.md', 'agents.md', 'todo.md', 'onboarding.md', 'contributing.md', 'license', 'license.md', 'changelog.md', 'authors.md', 'maintainers.md', 'security.md', 'code_of_conduct.md', 'next-step.md'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'readmes',
  },
  {
    name: 'docs-general',
    match: { extensions: ['.md', '.mdx', '.rst', '.txt', '.adoc'] },
    tier: 'authored',
    category: 'docs',
    subcategory: 'general',
  },

  // ---- Authored.data ----
  {
    name: 'data-game-content',
    match: { pathGlobs: ['**/cards/*.{json,yaml,yml}', '**/characters/*.{json,yaml,yml}', '**/lore/*.{json,yaml,yml}', '**/dialogue/*.{json,yaml,yml}', '**/quests/*.{json,yaml,yml}'] },
    tier: 'authored',
    category: 'data',
    subcategory: 'game-content',
  },
  {
    name: 'data-generation-prompts',
    match: { pathGlobs: ['**/prompts/**/*.{json,yaml,yml,md,txt}', '**/imagen-prompts/**', '**/voice-scripts/**', '**/tts-scripts/**'] },
    tier: 'authored',
    category: 'data',
    subcategory: 'generation-prompts',
  },
  {
    name: 'data-lookup',
    match: { extensions: ['.json', '.yaml', '.yml', '.toml', '.csv', '.tsv'] },
    tier: 'authored',
    category: 'data',
    subcategory: 'lookup-tables',
  },
];
