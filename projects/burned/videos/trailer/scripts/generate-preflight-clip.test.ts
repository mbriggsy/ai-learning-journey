/**
 * Phase 0 Unit 0.2 Step 0.5 — preflight pipeline contract tests.
 *
 * Pure-function coverage of the Gemini Director's Chair adapter
 * extraction + substitution + VOICE_DIRECTION runtime guard. Catches
 * regressions in `cadence-spec-gemini.md` (marker / slot / fence
 * structure) at `pnpm test` time so the next preflight run doesn't
 * have to spend a Gemini API call to discover them.
 *
 * Does NOT call Gemini — keep tests fast and offline-clean.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractPromptTemplate,
  substituteTranscript,
  assertVoiceDirectionGuard,
} from './generate-preflight-clip.js';
import { PARAGRAPH_1_PREFLIGHT } from './sample-script-dash.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ADAPTER_PATH = resolve(SCRIPT_DIR, '../sample-eval/r4-dash/cadence-spec-gemini.md');
const ADAPTER = readFileSync(ADAPTER_PATH, 'utf8');

describe('extractPromptTemplate — finds the right fence', () => {
  it('extracts the four-section block (not the prose backtick references)', () => {
    const template = extractPromptTemplate(ADAPTER);
    // The real fence contains all four section markers; the prose
    // backtick references contain none of them.
    expect(template).toContain('## AUDIO PROFILE');
    expect(template).toContain('## SCENE');
    expect(template).toContain('## DIRECTOR\'S NOTES');
    expect(template).toContain('### TRANSCRIPT');
  });

  it('preserves the {TRANSCRIPT_SLOT} substitution token verbatim', () => {
    const template = extractPromptTemplate(ADAPTER);
    expect(template).toContain('{TRANSCRIPT_SLOT}');
  });

  it('throws if the start fence is missing', () => {
    const broken = ADAPTER.replace(/\n---PROMPT START---\n/g, '\n---FOO BAR---\n');
    expect(() => extractPromptTemplate(broken)).toThrow(/Could not locate prompt fence/);
  });

  it('throws if the end fence is missing', () => {
    const broken = ADAPTER.replace(/\n---PROMPT END---\n/g, '\n---BAZ QUX---\n');
    expect(() => extractPromptTemplate(broken)).toThrow(/Could not locate prompt fence/);
  });
});

describe('substituteTranscript — slot contract', () => {
  it('substitutes exactly one slot occurrence with the transcript', () => {
    const template = '## SCENE\n\n### TRANSCRIPT\n\n{TRANSCRIPT_SLOT}';
    const out = substituteTranscript(template, 'Hello world.');
    expect(out).toContain('Hello world.');
    expect(out).not.toContain('{TRANSCRIPT_SLOT}');
  });

  it('throws if the template has zero slots', () => {
    expect(() => substituteTranscript('no slot here', 'x')).toThrow(/exactly one/);
  });

  it('throws if the template has multiple slots', () => {
    expect(() => substituteTranscript('{TRANSCRIPT_SLOT} and {TRANSCRIPT_SLOT}', 'x')).toThrow(/exactly one/);
  });
});

describe('assertVoiceDirectionGuard — runtime defense-in-depth', () => {
  const buildPrompt = (transcript: string): string =>
    substituteTranscript(extractPromptTemplate(ADAPTER), transcript);

  it('passes the canonical Step 0.5 transcript', () => {
    const prompt = buildPrompt(PARAGRAPH_1_PREFLIGHT);
    expect(() => assertVoiceDirectionGuard(prompt, PARAGRAPH_1_PREFLIGHT)).not.toThrow();
  });

  it('throws if the prompt is missing the ### TRANSCRIPT marker', () => {
    const prompt = 'AUDIO PROFILE: ...\nDIRECTOR NOTES: ...\nHello world.';
    expect(() => assertVoiceDirectionGuard(prompt, 'Hello world.')).toThrow(/exactly one .* marker/);
  });

  it('throws if the transcript content carries directive language', () => {
    const prompt = buildPrompt('Read this line in a deep noir voice.');
    expect(() => assertVoiceDirectionGuard(prompt, 'Read this line in a deep noir voice.')).toThrow(
      /forbidden directive pattern/,
    );
  });

  it('throws on the documented UMB v3 mistake shape ("in a deadpan voice")', () => {
    const prompt = buildPrompt('Speak the following in a deadpan voice: VERAAA.');
    expect(() => assertVoiceDirectionGuard(prompt, 'Speak the following in a deadpan voice: VERAAA.')).toThrow();
  });
});

describe('Full pipeline integration — extract → substitute → guard', () => {
  it('produces a Gemini-ready prompt for the Step 0.5 trim without throwing', () => {
    const template = extractPromptTemplate(ADAPTER);
    const prompt = substituteTranscript(template, PARAGRAPH_1_PREFLIGHT);
    assertVoiceDirectionGuard(prompt, PARAGRAPH_1_PREFLIGHT);
    expect(prompt).toContain(PARAGRAPH_1_PREFLIGHT);
    expect(prompt).not.toContain('{TRANSCRIPT_SLOT}');
    expect(prompt.length).toBeLessThan(8000); // Gemini Flash TTS 8K context window
  });
});
