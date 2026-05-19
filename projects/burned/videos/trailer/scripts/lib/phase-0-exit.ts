/**
 * PHASE-0-EXIT.md parser.
 *
 * Phase 0 emits a human-readable disposition document with bolded
 * field names, backtick-wrapped values, and prose continuations. This
 * parser normalizes that shape into a typed config for Phase 2 — no
 * Phase 0 reopen required.
 *
 * Tolerated shape variations (observed in the shipped file):
 *   - bold field names: `**Key:**` or plain `Key:`
 *   - backtick-wrapped IDs/paths: `**Voice ID / actor identifier:** ` + backticked-value
 *   - italic-quoted verbatim lines: `*"text"*`
 *   - trailing parenthetical qualifiers: `Path A (Voice Library preset)`
 *   - multi-line prose continuations after the value
 *
 * Extraction precedence per field read:
 *   1. first backtick-wrapped token on the value line
 *   2. first italic-quoted token on the value line
 *   3. raw post-colon span with bold/italic/trailing-parens/trailing-period stripped
 */
import { readFileSync } from 'node:fs';

export type EngineFamily = 'elevenlabs-v3' | 'gemini-tts' | 'openai-tts' | 'voice-actor';
export type ClearedPath = 'A' | 'B' | 'C' | 'D' | 'Brainstorm-Restructure';

export interface Phase0ExitConfig {
  readonly clearedPath: ClearedPath;
  readonly clearedPathRaw: string;
  readonly engine: EngineFamily;
  readonly engineRaw: string;
  readonly modelId: string;
  readonly voiceIds: Readonly<Record<'dash' | 'sable' | 'janet' | 'vera', string | null>>;
  readonly cadenceAdapterPath: string;
  readonly r5Outcome: 'kept-via-A' | 'kept-via-B' | 'cut';
  readonly coldOpenSpeaker: 'sable' | 'janet' | 'vera';
  readonly coldOpenLine: string;
  readonly voiceChangerSource: string | null;
}

export function parsePhase0Exit(path: string): Phase0ExitConfig {
  const md = readFileSync(path, 'utf-8');

  const voiceCast = findSection(md, 'Voice Cast');
  const r14 = findSection(md, 'R14 Cold-Open Line');
  const scream = findSection(md, 'R5 Scream');

  const engineRaw = readField(voiceCast, 'Engine');
  const engine: EngineFamily = /^ElevenLabs/i.test(engineRaw)
    ? 'elevenlabs-v3'
    : /^Gemini/i.test(engineRaw)
      ? 'gemini-tts'
      : /^OpenAI/i.test(engineRaw)
        ? 'openai-tts'
        : /voice[- ]actor/i.test(engineRaw)
          ? 'voice-actor'
          : (() => {
              throw new Error(
                `PHASE-0-EXIT.md Section 1 "Engine" field has unrecognized value: "${engineRaw}". ` +
                  `Expected one of: ElevenLabs.../Gemini.../OpenAI.../voice-actor...`,
              );
            })();

  // Phase 0 emits `Path A (Voice Library preset)`; strip the `Path ` prefix
  // before enum normalization.
  const clearedPathRaw = readField(voiceCast, 'Cleared path').replace(/^Path\s+/i, '');
  const clearedPath: ClearedPath = /^A\b/.test(clearedPathRaw)
    ? 'A'
    : /^B\b/.test(clearedPathRaw)
      ? 'B'
      : /^C[-\s]/.test(clearedPathRaw) || /^C\b/.test(clearedPathRaw)
        ? 'C'
        : /Sub-phase\s*0a|Path\s*D|^D\b/i.test(clearedPathRaw)
          ? 'D'
          : /Brainstorm-Restructure/i.test(clearedPathRaw)
            ? 'Brainstorm-Restructure'
            : (() => {
                throw new Error(
                  `PHASE-0-EXIT.md Section 1 unrecognized cleared path: "${clearedPathRaw}"`,
                );
              })();

  // R5 outcome — Phase 0 emits `**cleared (kept-A — TTS via ElevenLabs v3 Roger)**`.
  // Look for kept-A/kept-B/cut anywhere in the value.
  const r5Raw = readField(scream, 'Disposition');
  const r5Outcome: Phase0ExitConfig['r5Outcome'] = /\bkept-?A\b/i.test(r5Raw)
    ? 'kept-via-A'
    : /\bkept-?B\b/i.test(r5Raw)
      ? 'kept-via-B'
      : /^cut\b|\(cut\)/i.test(r5Raw)
        ? 'cut'
        : (() => {
            throw new Error(`PHASE-0-EXIT.md Section 5 unrecognized R5 outcome: "${r5Raw}"`);
          })();

  const coldOpenSpeakerRaw = readField(r14, 'Speaker character');
  const coldOpenSpeakerMatch = coldOpenSpeakerRaw.toLowerCase().match(/^(sable|janet|vera)\b/);
  const coldOpenSpeaker = coldOpenSpeakerMatch?.[1] as Phase0ExitConfig['coldOpenSpeaker'] | undefined;
  if (!coldOpenSpeaker) {
    throw new Error(
      `PHASE-0-EXIT.md Section 2 "Speaker character" field has unrecognized value: "${coldOpenSpeakerRaw}". ` +
        `Expected: Sable | Janet | Vera`,
    );
  }

  const dashVoiceId = readField(voiceCast, 'Voice ID / actor identifier');
  const coldOpenVoiceId = readField(r14, 'Speaker voice ID');
  const coldOpenLine = readField(r14, 'Line (verbatim)');

  const voiceIds: Phase0ExitConfig['voiceIds'] = {
    dash: dashVoiceId || null,
    sable: coldOpenSpeaker === 'sable' ? coldOpenVoiceId || null : null,
    janet: coldOpenSpeaker === 'janet' ? coldOpenVoiceId || null : null,
    vera: coldOpenSpeaker === 'vera' ? coldOpenVoiceId || null : null,
  };

  const voiceChangerSource =
    r5Outcome === 'kept-via-B' ? readFieldOptional(scream, 'Voice Changer source recording path') : null;

  return {
    clearedPath,
    clearedPathRaw,
    engine,
    engineRaw,
    modelId: readField(voiceCast, 'Engine model version pin'),
    voiceIds,
    cadenceAdapterPath: readField(voiceCast, 'Engine-adapter file path'),
    r5Outcome,
    coldOpenSpeaker,
    coldOpenLine,
    voiceChangerSource,
  };
}

// ─── helpers ──────────────────────────────────────────────────────

function findSection(md: string, nameSubstring: string): string {
  // Phase 0 section header: `## Section N — <Name> Disposition (Unit 0.X) [optional suffix]`
  const headerPattern = new RegExp(
    `^## Section \\d+ — [^\\n]*${escapeRe(nameSubstring)}[^\\n]*$`,
    'm',
  );
  const headerMatch = headerPattern.exec(md);
  if (!headerMatch) {
    throw new Error(
      `PHASE-0-EXIT.md missing section matching "## Section N — ...${nameSubstring}... Disposition".`,
    );
  }
  const bodyStart = headerMatch.index + headerMatch[0].length;
  const remainder = md.slice(bodyStart);
  const nextSection = /^## Section \d+ /m.exec(remainder);
  const bodyEnd = nextSection ? nextSection.index : remainder.length;
  return remainder.slice(0, bodyEnd);
}

function readField(section: string, key: string): string {
  const raw = readFieldRaw(section, key);
  if (raw === null) {
    throw new Error(
      `PHASE-0-EXIT.md section missing field "${key}".\n` +
        `Section preview (first 240 chars):\n${section.slice(0, 240).replace(/\n/g, ' / ')}...`,
    );
  }
  return extractValue(raw);
}

function readFieldOptional(section: string, key: string): string | null {
  const raw = readFieldRaw(section, key);
  if (raw === null) return null;
  const v = extractValue(raw);
  if (!v || v === 'N/A' || v.startsWith('[') || v.startsWith('TBD')) return null;
  return v;
}

function readFieldRaw(section: string, key: string): string | null {
  // Match `- **Key:** value` or `- Key: value`. Parenthetical qualifiers in the
  // key (e.g., `Line (verbatim):`) are part of the canonical key name.
  const pattern = new RegExp(`^- (?:\\*\\*)?${escapeRe(key)}(?:\\*\\*)?:\\s*(.+)$`, 'm');
  const match = section.match(pattern);
  return match ? match[1] : null;
}

function extractValue(raw: string): string {
  // 1. backtick-wrapped — preferred for IDs / paths / model pins
  const backtickMatch = raw.match(/`([^`]+)`/);
  if (backtickMatch) return backtickMatch[1].trim();

  // 2. italic-quoted — preferred for verbatim lines
  const italicQuoteMatch = raw.match(/\*"([^"]+)"\*/);
  if (italicQuoteMatch) return italicQuoteMatch[1].trim();

  // 3. strip bold emphasis + trailing whitespace.
  //
  // NOTE: do NOT strip trailing parens here. Some fields (Disposition,
  // Engine, Cleared path, Speaker character) carry semantic info inside
  // parens that the per-field enum regex needs to inspect. Each field's
  // own normalizer in parsePhase0Exit handles its own trimming.
  return raw.replace(/\*\*/g, '').trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
