/**
 * Phase 0 Unit 0.2 Step 1.5 — adapter contract tests.
 *
 * Validates the ElevenLabs JSON adapter (`cadence-spec-elevenlabs.json`)
 * and the OpenAI markdown adapter (`cadence-spec-openai.md`) against
 * their engine-specific shape requirements. Catches drift at
 * `pnpm test` time — Step 2 engine generation should never have to
 * spend API budget to discover an adapter has bad shape.
 *
 * (The Gemini adapter has its own dedicated tests in
 * `generate-preflight-clip.test.ts` — that adapter has a runtime
 * substitution slot that makes its contract richer.)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARAGRAPH_1_DEADPAN,
  PARAGRAPH_2_MONOLOGUE,
  PARAGRAPH_3_SCREAM,
  DASH_SAMPLE_SCRIPT,
} from './sample-script-dash.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ADAPTER_DIR = resolve(SCRIPT_DIR, '../sample-eval/r4-dash');

const ELEVENLABS_PATH = resolve(ADAPTER_DIR, 'cadence-spec-elevenlabs.json');
const OPENAI_PATH = resolve(ADAPTER_DIR, 'cadence-spec-openai.md');

describe('ElevenLabs adapter — cadence-spec-elevenlabs.json', () => {
  const raw = readFileSync(ELEVENLABS_PATH, 'utf8');
  const adapter = JSON.parse(raw) as Record<string, unknown>;

  it('parses as valid JSON', () => {
    expect(adapter).toBeTypeOf('object');
  });

  it('targets the v3 model', () => {
    expect(adapter['model_id']).toBe('eleven_v3');
  });

  describe('voice_settings — numeric ranges per ElevenLabs v3 API (verified via Context7 2026-05-18)', () => {
    const vs = adapter['voice_settings'] as Record<string, unknown>;

    it('voice_settings present', () => {
      expect(vs).toBeTypeOf('object');
    });

    it('stability in [0.0, 1.0]', () => {
      const v = vs['stability'] as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });

    it('similarity_boost in [0.0, 1.0]', () => {
      const v = vs['similarity_boost'] as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });

    it('style in [0.0, 1.0]', () => {
      const v = vs['style'] as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });

    it('use_speaker_boost is boolean', () => {
      expect(typeof vs['use_speaker_boost']).toBe('boolean');
    });

    it('speed in [0.7, 1.2] (ElevenLabs v3 supported range)', () => {
      const v = vs['speed'] as number;
      expect(v).toBeGreaterThanOrEqual(0.7);
      expect(v).toBeLessThanOrEqual(1.2);
    });

    it('stability biased ABOVE the 0.5 default (deadpan needs narrow F0 spread per cadence-spec §3.1)', () => {
      expect((vs['stability'] as number) > 0.5).toBe(true);
    });

    it('style biased BELOW 0.4 (compressed dynamic range per cadence-spec §3.6)', () => {
      expect((vs['style'] as number) < 0.4).toBe(true);
    });

    it('speed biased BELOW 1.0 (Sterling-coded slower-than-baseline per cadence-spec §3.2)', () => {
      expect((vs['speed'] as number) < 1.0).toBe(true);
    });
  });

  describe('bracket_tags_per_paragraph — one entry per sample-script paragraph', () => {
    const tags = adapter['bracket_tags_per_paragraph'] as Record<string, unknown>;

    for (const entry of DASH_SAMPLE_SCRIPT) {
      it(`has an entry for "${entry.id}"`, () => {
        expect(tags[entry.id]).toBeTypeOf('object');
      });

      it(`"${entry.id}" entry has a bracket-shaped leading_tag`, () => {
        const e = tags[entry.id] as Record<string, unknown>;
        const t = e['leading_tag'] as string;
        expect(t).toMatch(/^\[[a-z]+\]$/);
      });
    }
  });

  describe('VOICE_DIRECTION anti-pattern guard — sample-script content MUST NOT leak into voice-design or tag prose', () => {
    // ElevenLabs v3 fails the same way Gemini does if free prose lands
    // in the text payload — words get spoken aloud. The Voice Design
    // prompt is sent ONCE during voice minting (not on every TTS call)
    // but it MUST NOT contain the script. Bracket-tag note prose lives
    // INSIDE the JSON (not in the text payload) so it's safe — but
    // we still guard against the script accidentally landing there
    // because anyone reading the JSON might assume the prose IS what
    // gets sent.
    const voiceDesign = adapter['voice_design_prompt'] as string;
    const scriptSentinels = [
      'card game', // distinctive paragraph 1 phrase
      'expense report', // distinctive paragraph 2 phrase
      'VERAAA', // distinctive paragraph 3 phrase
    ];

    for (const sentinel of scriptSentinels) {
      it(`voice_design_prompt does not contain script sentinel "${sentinel}"`, () => {
        expect(voiceDesign).not.toContain(sentinel);
      });
    }
  });

  describe('Path B voice clone — retention policy + consent recorded', () => {
    const pathB = adapter['path_B_voice_clone'] as Record<string, unknown>;

    it('Path B section present', () => {
      expect(pathB).toBeTypeOf('object');
    });

    it('method explicitly references Instant Voice Cloning (NOT Professional)', () => {
      const m = pathB['method'] as string;
      expect(m).toMatch(/Instant Voice Cloning/);
      expect(m).toMatch(/NOT Professional/);
    });

    it('retention policy + post-Phase-0 cleanup acknowledged', () => {
      const c = pathB['consent_and_retention'] as Record<string, unknown>;
      expect(c['retention_window']).toBeTypeOf('string');
      expect(c['post_phase_0_cleanup']).toBeTypeOf('string');
    });
  });
});

describe('OpenAI adapter — cadence-spec-openai.md', () => {
  const md = readFileSync(OPENAI_PATH, 'utf8');

  // Mirror the Gemini extractor's newline-anchored marker strategy.
  // Prose backtick references like `---INSTRUCTIONS START---` inside §1
  // explanatory text should NOT false-match.
  const START = '\n---INSTRUCTIONS START---\n';
  const END = '\n---INSTRUCTIONS END---\n';

  function extractInstructions(): string {
    const s = md.indexOf(START);
    const e = md.indexOf(END);
    if (s < 0 || e < 0 || e <= s) {
      throw new Error(`Fence markers not found / out of order in ${OPENAI_PATH}`);
    }
    return md.slice(s + START.length, e).replace(/^\n+/, '').replace(/\n+$/, '');
  }

  it('contains the INSTRUCTIONS fence', () => {
    expect(() => extractInstructions()).not.toThrow();
  });

  describe('instructions string contract', () => {
    const instructions = extractInstructions();

    it('non-empty', () => {
      expect(instructions.length).toBeGreaterThan(100);
    });

    it('under 4096 chars (OpenAI hard limit for `instructions` field)', () => {
      expect(instructions.length).toBeLessThan(4096);
    });

    it('word count in [400, 800] (target ~500 with comfortable bounds)', () => {
      const words = instructions.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(400);
      expect(words).toBeLessThanOrEqual(800);
    });

    it('explicitly names Target Band exemplars (Serling / Chandler / film noir)', () => {
      expect(instructions).toMatch(/Serling/);
      expect(instructions).toMatch(/Chandler/);
      expect(instructions).toMatch(/noir/i);
    });

    it('explicitly names the anti-register list (audiobook / documentary / AI assistant)', () => {
      expect(instructions).toMatch(/audiobook/i);
      expect(instructions).toMatch(/documentary/i);
      expect(instructions).toMatch(/AI assistant|podcast|impression/i);
    });

    it('encodes the §3.6 scream signature (volume-discontinuous-not-pitch-discontinuous)', () => {
      expect(instructions).toMatch(/volume-discontinuous|raise amplitude/i);
      expect(instructions).toMatch(/not.{0,30}(pitch|falsetto)/i);
    });

    it('encodes the §3.4 downspeak punchline + flat-declarative direction', () => {
      expect(instructions).toMatch(/downspeak|flat/i);
      expect(instructions).toMatch(/punchline/i);
    });

    it('VOICE_DIRECTION anti-pattern guard — does NOT contain sample-script content (would mean instructions and input got concatenated)', () => {
      // Distinctive phrases from each sample paragraph — none should
      // appear in the instructions string. If any does, someone
      // accidentally crossed the API parameter boundary.
      expect(instructions).not.toContain('card game');
      expect(instructions).not.toContain('expense report');
      expect(instructions).not.toContain('VERAAA');
      // The whole paragraphs definitely should not appear:
      expect(instructions).not.toContain(PARAGRAPH_1_DEADPAN);
      expect(instructions).not.toContain(PARAGRAPH_2_MONOLOGUE);
      expect(instructions).not.toContain(PARAGRAPH_3_SCREAM);
    });
  });

  describe('Model + voice selection — committed to gpt-4o-mini-tts (steering-honoring model)', () => {
    it('document calls out gpt-4o-mini-tts as the model', () => {
      expect(md).toMatch(/`gpt-4o-mini-tts`/);
    });

    it('document calls out a specific primary voice', () => {
      expect(md).toMatch(/voice.{0,20}`(onyx|ash|echo|sage|verse|marin|cedar)`/i);
    });

    it('document explicitly warns away from tts-1 / tts-1-hd (which silently drop instructions)', () => {
      expect(md).toMatch(/tts-1/);
      expect(md).toMatch(/DO NOT honor|silently drop/i);
    });
  });
});
