/**
 * Phase 2 preflight entry point.
 *
 * Verifies trailer scaffold + Node + .gitignore + FFmpeg + .env keys +
 * PHASE-0-EXIT.md disposition + per-engine model availability BEFORE
 * any paid TTS call. Appends a TRUNCATED-credentials log line to
 * sample-eval/voice-pipeline/preflight-log.md on each invocation.
 *
 * Run standalone:   pnpm tsx videos/trailer/scripts/preflight.ts
 * Library use:      import { runPreflight } from './preflight.ts'
 *
 * Every Phase 2 generation / audit / post-process script MUST invoke
 * `runPreflight()` at the top of its `main()`. Anti-pattern guard:
 * scripts that shell out to ffmpeg or call a TTS API without preflight
 * fail at runtime when their assumptions don't hold.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ffmpegPreflight, type FFmpegBins } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { assertEngineEnv, verifyEngineAvailability } from './lib/env.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');

const REQUIRED_FILES = [
  'package.json',
  '.gitignore',
  'src/lib/script.ts',
  'src/lib/timing.ts',
  'BEAT-SHEET.md',
  'PHASE-0-EXIT.md',
  'sample-eval/r4-dash/cadence-spec.md',
] as const;

const REQUIRED_DEVDEPS = ['vitest', 'tsx', 'dotenv'] as const;

const REQUIRED_GITIGNORE_PATTERNS = [
  'public/audio/lines/',
  'public/audio/lines/raw/',
  'sample-eval/r5-scream/path-b-source-recording',
  'sample-eval/voice-actor-delivery/',
  'sample-eval/voice-pipeline/tts-spend.json',
  'sample-eval/voice-actor-delivery/path-d-manifest.json',
] as const;

const MIN_NODE_MAJOR = 20;

export interface PreflightResult {
  readonly cfg: Phase0ExitConfig;
  readonly ffmpeg: FFmpegBins;
  readonly nodeVersion: string;
  readonly timestamp: string;
}

export async function runPreflight(
  opts: { silent?: boolean; logToFile?: boolean } = {},
): Promise<PreflightResult> {
  const log = opts.silent ? () => {} : (m: string) => console.log(m);

  // Step 1 — required files
  for (const rel of REQUIRED_FILES) {
    const abs = join(TRAILER_ROOT, rel);
    if (!existsSync(abs)) {
      throw new Error(
        `Preflight: missing required file ${abs}.\n` +
          `Phase 2 requires Phase 0 + Phase 1 closure. Run those phases ` +
          `before invoking Phase 2 scripts.`,
      );
    }
  }
  log(`OK trailer scaffold (${REQUIRED_FILES.length} required files present)`);

  // Step 2 — Node version
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE_MAJOR) {
    throw new Error(
      `Preflight: Node ${process.versions.node} below required >=${MIN_NODE_MAJOR}.0.0.\n` +
        `Phase 2 uses node:util.parseArgs strict-mode + global FormData.`,
    );
  }
  log(`OK node ${process.versions.node}`);

  // Step 3 — .gitignore patterns
  const gitignore = readFileSync(join(TRAILER_ROOT, '.gitignore'), 'utf-8');
  const missingPatterns = REQUIRED_GITIGNORE_PATTERNS.filter((p) => !gitignore.includes(p));
  if (missingPatterns.length) {
    throw new Error(
      `Preflight: videos/trailer/.gitignore missing required patterns:\n` +
        missingPatterns.map((p) => `  ${p}`).join('\n') +
        `\nAdd these before generating any WAVs. Audio + spend log + actor PII + ` +
        `biometric recordings MUST stay out of git history.`,
    );
  }
  log(`OK .gitignore (${REQUIRED_GITIGNORE_PATTERNS.length} required patterns present)`);

  // Step 4 — devDeps
  const pkg = JSON.parse(readFileSync(join(TRAILER_ROOT, 'package.json'), 'utf-8')) as {
    devDependencies?: Record<string, string>;
  };
  const missingDevDeps = REQUIRED_DEVDEPS.filter((k) => !pkg.devDependencies?.[k]);
  if (missingDevDeps.length) {
    throw new Error(
      `Preflight: missing devDependencies in videos/trailer/package.json: ${missingDevDeps.join(', ')}.\n` +
        `Run: cd videos/trailer && pnpm add -D ${missingDevDeps.join(' ')}`,
    );
  }
  log(`OK devDependencies (${REQUIRED_DEVDEPS.join(', ')})`);

  // Step 5 — FFmpeg
  const ffmpeg = ffmpegPreflight();
  log(`OK ffmpeg ${ffmpeg.ffmpegVersion}, ffprobe ${ffmpeg.ffprobeVersion}`);

  // Step 6 — PHASE-0-EXIT.md
  const cfg = parsePhase0Exit(join(TRAILER_ROOT, 'PHASE-0-EXIT.md'));
  log(
    `OK PHASE-0-EXIT.md parsed: engine=${cfg.engine}, model=${cfg.modelId}, ` +
      `clearedPath=${cfg.clearedPath}, R5=${cfg.r5Outcome}, coldOpen=${cfg.coldOpenSpeaker}`,
  );

  // Step 7 — per-engine env keys
  assertEngineEnv(cfg.engine);
  log(`OK .env keys present for engine ${cfg.engine}`);

  // Step 8 — per-cell voice IDs (dash always; cold-open speaker cell)
  const activeCells = new Set<keyof Phase0ExitConfig['voiceIds']>(['dash', cfg.coldOpenSpeaker]);
  for (const cell of activeCells) {
    if (cfg.engine !== 'voice-actor' && !cfg.voiceIds[cell]) {
      throw new Error(
        `Preflight: PHASE-0-EXIT.md missing voice ID for active cell '${cell}'.\n` +
          `Update PHASE-0-EXIT.md (Section 1 'Voice ID / actor identifier' for dash; ` +
          `Section 2 'Speaker voice ID' for the cold-open speaker).`,
      );
    }
  }
  log(`OK voice IDs present for active cells: ${[...activeCells].join(', ')}`);

  // Step 9 — cadence adapter file
  const adapterAbs = resolve(TRAILER_ROOT, cfg.cadenceAdapterPath);
  if (cfg.engine !== 'voice-actor' && !existsSync(adapterAbs)) {
    throw new Error(
      `Preflight: per-engine cadence-spec adapter missing: ${adapterAbs}.\n` +
        `Phase 0 Unit 0.2 Step 1.5 should ship this file. Verify PHASE-0-EXIT.md ` +
        `Section 1 'Engine-adapter file path' is correct.`,
    );
  }
  log(`OK cadence adapter at ${cfg.cadenceAdapterPath}`);

  // Step 10 — live model-availability (free metadata endpoint)
  await verifyEngineAvailability(cfg);
  log(`OK live engine API verified: ${cfg.engine} / ${cfg.modelId}`);

  const result: PreflightResult = {
    cfg,
    ffmpeg,
    nodeVersion: process.versions.node,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };

  if (opts.logToFile !== false) writePreflightLog(result);
  return result;
}

function truncate(id: string | null): string {
  if (!id) return '(none)';
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}

function writePreflightLog(result: PreflightResult): void {
  const { cfg, ffmpeg, nodeVersion, timestamp } = result;
  const logDir = join(TRAILER_ROOT, 'sample-eval/voice-pipeline');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, 'preflight-log.md');

  const coldOpenVoice = cfg.voiceIds[cfg.coldOpenSpeaker];
  const line = [
    `## Preflight ${timestamp}`,
    `- node: ${nodeVersion}`,
    `- ffmpeg: ${ffmpeg.ffmpegVersion} / ffprobe: ${ffmpeg.ffprobeVersion}`,
    `- engine: ${cfg.engine} (raw: "${cfg.engineRaw}")`,
    `- model: ${cfg.modelId}`,
    `- cleared path: ${cfg.clearedPath} (raw: "${cfg.clearedPathRaw}")`,
    `- R5 outcome: ${cfg.r5Outcome}`,
    `- dash voice: ${truncate(cfg.voiceIds.dash)}`,
    `- cold-open speaker: ${cfg.coldOpenSpeaker} (voice: ${truncate(coldOpenVoice)})`,
    `- cadence adapter: ${cfg.cadenceAdapterPath}`,
    '',
  ].join('\n');

  if (!existsSync(logPath)) {
    const header = [
      '# Phase 2 preflight log',
      '',
      'Per-invocation preflight result. Voice IDs truncated to 8-char prefix',
      '(account-scoped credentials never land in tracked artifacts).',
      '',
      '',
    ].join('\n');
    appendFileSync(logPath, header);
  }
  appendFileSync(logPath, line);
}

// CLI entry — when invoked directly, run preflight and exit 0/1.
// Uses fileURLToPath round-trip so it works identically on Windows / POSIX.
//
// Drains the event loop naturally on success (no explicit process.exit(0))
// to avoid a known Node 24 + Windows libuv assertion on shutdown when
// fetch keep-alive sockets are still cleaning up. Failure still hard-exits.
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runPreflight()
    .then((r) => {
      console.log(`\nPreflight green @ ${r.timestamp}.`);
    })
    .catch((e: unknown) => {
      console.error(`\nPreflight FAILED:\n\n${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    });
}
