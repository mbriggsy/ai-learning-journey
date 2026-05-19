/**
 * Phase 2 engine dispatch.
 *
 * Per DOC-REVIEW R4 (single-engine commitment): only the engine
 * PHASE-0-EXIT.md locks is built. The current lock is `elevenlabs-v3`.
 * Other engine cases throw with concrete rebuild instructions — they're
 * intentionally NOT pre-implemented.
 *
 * Phase 0 reopen procedure (Unit 2.7 Step 2a) is the canonical path to
 * a different engine — that reopen picks the engine + ships the per-
 * engine adapter; the client rebuild here is one short file.
 */
import type { Buffer } from 'node:buffer';

import { generateElevenLabs, type GenerateElevenLabsArgs } from './elevenlabs.js';

export type GenerateForCueArgs = GenerateElevenLabsArgs;

export async function generateForCue(
  args: GenerateForCueArgs & { engine: string },
): Promise<Buffer> {
  switch (args.engine) {
    case 'elevenlabs-v3':
      return generateElevenLabs(args);
    case 'gemini-tts':
    case 'openai-tts':
      throw new Error(
        `Engine '${args.engine}' not built (single-engine commitment — Phase 0 locked elevenlabs-v3).\n` +
          `If Phase 0 re-locks: build scripts/tts-clients/${args.engine.replace(
            /-/g,
            '-',
          )}.ts and wire here.`,
      );
    case 'voice-actor':
      throw new Error(
        'voice-actor path: manual recording — run Unit 2.X ingestion. Dispatch unreachable for Path D.',
      );
    default:
      throw new Error(
        `Unknown engine: ${args.engine}. Valid: elevenlabs-v3 | gemini-tts | openai-tts | voice-actor`,
      );
  }
}
