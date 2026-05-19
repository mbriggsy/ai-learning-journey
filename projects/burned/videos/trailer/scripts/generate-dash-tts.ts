/**
 * Phase 2 production TTS generator.
 *
 * Reads Phase 1's `BURNED_TRAILER_LINES`, renders each cue via the
 * engine PHASE-0-EXIT.md locks, atomically writes WAVs to
 * `public/audio/lines/`. Hash-based skip-or-regen (sidecar
 * `.meta/<filename>.sha256`) — text / engine / voice / adapter /
 * priming changes auto-invalidate cached WAVs.
 *
 * CLI:
 *   pnpm tts                                 — render all missing/stale
 *   pnpm tts:force                           — re-render everything
 *   pnpm tts:dry-run                         — list targets, no API calls
 *   pnpm tts -- --scene 4                    — only S04 cues
 *   pnpm tts -- --only S01-cold-open         — single cue (canary mode)
 *   pnpm tts -- --engine X --only Y          — engine override (canary debug)
 *
 * Anti-pattern guard: NEVER prepend free prose into the text payload.
 * ElevenLabs reads it aloud. Cadence-spec lives in voice_settings +
 * sparse inline `[bracket]` tags ONLY.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';

import { atomicWriteSync } from './lib/atomic-write.js';
import { assertWithinBudget, trackSpend, totalSpend, HARD_CEILING_USD } from './lib/cost-tracker.js';
import { cueFilename } from './lib/cue-filename.js';
import { assertEngineEnv, verifyEngineAvailability } from './lib/env.js';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { generateForCue } from './tts-clients/index.js';
import { isValidWav } from './tts-clients/wav-utils.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const OUT_DIR = resolve(TRAILER_ROOT, 'public/audio/lines');
const META_DIR = resolve(OUT_DIR, '.meta');
const PRIMING_OVERRIDES = resolve(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/context-priming-overrides.json',
);
const PHASE_0_EXIT = resolve(TRAILER_ROOT, 'PHASE-0-EXIT.md');

type ContextPrimingMap = Readonly<Record<string, { previous?: string; next?: string }>>;

interface CliArgs {
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly onlyIds: readonly string[];
  readonly scene: string | null;
  readonly engineOverride: string | null;
}

function parseCli(): CliArgs {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      only: { type: 'string', multiple: true },
      scene: { type: 'string' },
      engine: { type: 'string' },
    },
    allowPositionals: false,
    strict: true,
  });
  return {
    force: values.force ?? false,
    dryRun: values['dry-run'] ?? false,
    onlyIds: (values.only as readonly string[] | undefined) ?? [],
    scene: values.scene ?? null,
    engineOverride: values.engine ?? null,
  };
}

function hashCueInputs(
  cue: Line,
  engine: string,
  voiceId: string,
  cadenceAdapter: string,
  priming: { previous?: string; next?: string } | undefined,
): string {
  const tag = cue.cadenceAdapter?.prefixTag ?? '';
  const adapterSha = createHash('sha256').update(cadenceAdapter).digest('hex').slice(0, 16);
  const primingKey = priming ? `${priming.previous ?? ''}|${priming.next ?? ''}` : '';
  return createHash('sha256')
    .update(`${cue.text}|${engine}|${voiceId}|${tag}|${adapterSha}|${primingKey}`)
    .digest('hex');
}

function truncateVoiceId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}

function resolveVoiceId(cue: Line, cfg: Phase0ExitConfig): string {
  const id = cfg.voiceIds[cue.voice];
  if (!id) {
    throw new Error(
      `No voice ID locked for cell '${cue.voice}' in PHASE-0-EXIT.md.\n` +
        `Dash voice ID lives in Section 1; cold-open speaker in Section 2 (P2.34 amendment).`,
    );
  }
  return id;
}

function normalizeSceneFilter(raw: string): string {
  // accepts '4', 'S4', 'S04' → 'S04'
  const digit = raw.replace(/^S0?/i, '');
  return `S${digit.padStart(2, '0')}`;
}

async function main(): Promise<void> {
  // Preflight (Unit 2.0) — every Phase 2 script runs this
  ffmpegPreflight();
  const cfg = parsePhase0Exit(PHASE_0_EXIT);
  assertEngineEnv(cfg.engine);
  await verifyEngineAvailability(cfg);

  const args = parseCli();

  // --engine override must be paired with --only (SSoT guard)
  if (args.engineOverride && args.engineOverride !== cfg.engine) {
    if (args.onlyIds.length === 0) {
      console.error(
        `FATAL: --engine ${args.engineOverride} disagrees with PHASE-0-EXIT.md locked ${cfg.engine}.\n` +
          `--engine override requires --only <cueId> scope (canary-debug only).\n` +
          `Re-run: pnpm tts -- --engine ${args.engineOverride} --only <cueId>`,
      );
      process.exit(2);
    }
    console.warn(
      `WARN: --engine ${args.engineOverride} disagrees with PHASE-0-EXIT.md ${cfg.engine} ` +
        `(canary-debug, scope=${args.onlyIds.join(',')}).`,
    );
  }
  const engine = args.engineOverride ?? cfg.engine;

  if (engine === 'voice-actor') {
    console.log('Path D (voice-actor) locked — TTS generation skipped.');
    console.log('Run Unit 2.X: pnpm tsx videos/trailer/scripts/ingest-path-d.ts');
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  if (!existsSync(META_DIR)) mkdirSync(META_DIR, { recursive: true });

  const cadenceAdapter = readFileSync(resolve(TRAILER_ROOT, cfg.cadenceAdapterPath), 'utf-8');

  const primingMap: ContextPrimingMap = existsSync(PRIMING_OVERRIDES)
    ? (JSON.parse(readFileSync(PRIMING_OVERRIDES, 'utf-8')) as ContextPrimingMap)
    : {};

  const sceneFilter = args.scene ? normalizeSceneFilter(args.scene) : null;

  let counters = { generated: 0, skipped: 0, dryRun: 0 };

  for (const cue of BURNED_TRAILER_LINES) {
    // R5 outcome gating for scream cue
    if (cue.id === 'S05-scream') {
      if (cfg.r5Outcome === 'cut') {
        console.log(`SKIP ${cueFilename(cue)} (R5 outcome: cut)`);
        continue;
      }
      if (cfg.r5Outcome === 'kept-via-B') {
        console.log(
          `SKIP ${cueFilename(cue)} (R5 outcome: kept-via-B — run Unit 2.Y hybrid-scream)`,
        );
        continue;
      }
    }

    if (sceneFilter && cue.scene !== sceneFilter) continue;
    if (args.onlyIds.length && !args.onlyIds.includes(cue.id)) continue;

    const outPath = resolve(OUT_DIR, cueFilename(cue));
    const metaPath = resolve(META_DIR, `${cueFilename(cue)}.sha256`);

    const voiceId = resolveVoiceId(cue, cfg);
    const priming = primingMap[cue.id];
    const expectedHash = hashCueInputs(cue, engine, voiceId, cadenceAdapter, priming);

    if (!args.force && existsSync(outPath) && existsSync(metaPath)) {
      const storedHash = readFileSync(metaPath, 'utf-8').trim();
      if (storedHash === expectedHash) {
        console.log(`SKIP ${cueFilename(cue)} (sha match)`);
        counters.skipped++;
        continue;
      }
      console.log(`STALE ${cueFilename(cue)} (inputs changed — regen)`);
    }

    if (args.dryRun) {
      console.log(`DRY-RUN ${cueFilename(cue)}: "${cue.text.slice(0, 60)}..."`);
      counters.dryRun++;
      continue;
    }

    // Per-cue budget assertion (NOT once-at-startup)
    await assertWithinBudget();

    console.log(`GEN  ${cueFilename(cue)}...`);

    const wavBuf = await generateForCue({
      engine,
      text: cue.text,
      voice: cue.voice,
      voiceId,
      cadenceAdapter,
      cadencePrefixTag: cue.cadenceAdapter?.prefixTag,
      modelId: cfg.modelId,
      contextPrimingPrevious: priming?.previous,
      contextPrimingNext: priming?.next,
    });

    if (!isValidWav(wavBuf)) {
      throw new Error(
        `Invalid WAV returned for ${cueFilename(cue)} — RIFF/WAVE header missing. ` +
          `Likely pcmToWav wrap missing in engine client.`,
      );
    }

    atomicWriteSync(outPath, wavBuf);
    atomicWriteSync(metaPath, expectedHash);
    await trackSpend(cue, engine, truncateVoiceId(voiceId));

    console.log(`OK   ${cueFilename(cue)} (${wavBuf.byteLength} bytes)`);
    counters.generated++;

    // Inter-call delay — gentle on rate limits, matches UMB precedent
    await new Promise((r) => setTimeout(r, 2000));
  }

  const cumulative = totalSpend();
  console.log(
    `\nDone — generated=${counters.generated} skipped=${counters.skipped} ` +
      `dryRun=${counters.dryRun}. Cumulative spend: $${cumulative.toFixed(2)} / $${HARD_CEILING_USD}.`,
  );
}

// CLI entry — drains naturally on success (avoids Node 24 + Windows libuv
// shutdown assertion on fetch keep-alive sockets).
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
