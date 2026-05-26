/**
 * logGeneration — tiny helper for generation scripts (Imagen, TTS, ffmpeg
 * renders, etc.) to write a structured history of every attempted output.
 *
 * v1 of project-metrics does NOT read these logs — it relies on git history
 * for the discarded-asset count. As projects adopt this helper, v2 will
 * be able to count generations with much higher fidelity (including ones
 * that were never committed in the first place).
 *
 * Append target: `<cwd>/.project-metrics/generations.jsonl`.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type GenerationKind = 'image' | 'audio' | 'video' | 'text' | (string & {});
export type GenerationStatus = 'kept' | 'discarded' | 'attempted' | 'failed';

export interface GenerationLogEntry {
  /** ISO 8601 timestamp; auto-filled if omitted. */
  timestamp?: string;
  kind: GenerationKind;
  /** Model identifier (e.g., "imagen-4", "gemini-2.5-tts", "ffmpeg-x264"). */
  model?: string;
  /** Source prompt or script. Truncate to ~2KB if you have huge prompts. */
  prompt?: string;
  /** Path to the output file, if one was produced. */
  outputPath?: string;
  /** Size of the output file on disk. */
  outputBytes?: number;
  /** Wall-clock duration of the generation. */
  durationMs?: number;
  /** Estimated cost in USD, if known. */
  costUsd?: number;
  status: GenerationStatus;
  /** Free-form notes — e.g., reason for discard. */
  notes?: string;
  /** Arbitrary additional metadata. */
  meta?: Record<string, unknown>;
}

export interface LogGenerationOptions {
  /** Directory to write the log under. Defaults to process.cwd(). */
  cwd?: string;
}

export async function logGeneration(
  entry: GenerationLogEntry,
  opts: LogGenerationOptions = {},
): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const dir = path.join(cwd, '.project-metrics');
  const file = path.join(dir, 'generations.jsonl');
  const record: GenerationLogEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    ...entry,
  };
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(record) + '\n', 'utf8');
}

/** Read all entries from a project's log (for tooling / v2 consumers). */
export async function readGenerationLog(cwd?: string): Promise<GenerationLogEntry[]> {
  const dir = path.join(cwd ?? process.cwd(), '.project-metrics');
  const file = path.join(dir, 'generations.jsonl');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as GenerationLogEntry);
  } catch {
    return [];
  }
}
