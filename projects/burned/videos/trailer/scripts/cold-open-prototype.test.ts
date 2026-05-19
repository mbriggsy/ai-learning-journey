/**
 * Phase 0 Unit 0.3 Step 1 — cold-open-prototype contract.
 *
 * Validates the R14 binary autonomy-hook gate's line constants:
 *   - Section B has exactly the two TESTED candidates locked in the plan
 *   - Each line carries the machine-wordplay decode mechanic
 *   - No VOICE_DIRECTION leak (anti-pattern that bit UMB v3 narrator
 *     work TWICE per project memory)
 *   - Speaker attribution carries the Voice Library ID matrix-confirmed
 *     in Unit 0.2 (drift = silent voice swap)
 *
 * If a future edit changes the locked text without re-opening Unit 0.3,
 * these tests fail loudly.
 */

import { describe, it, expect } from 'vitest';
import {
  CANDIDATE_4,
  CANDIDATE_5,
  COLD_OPEN_CANDIDATES,
  COLD_OPEN_SPEAKER,
  candidateById,
} from './cold-open-prototype.js';

describe('Section B candidates — locked text', () => {
  it('candidate #4 matches plan-locked text verbatim ("He\'s a machine, this kid. ...")', () => {
    expect(CANDIDATE_4).toBe(
      "He's a machine, this kid. Honestly at this point I'm just impressed.",
    );
  });

  it('candidate #5 matches plan-locked text verbatim ("Briggsy didn\'t write this one either. ...")', () => {
    expect(CANDIDATE_5).toBe(
      "Briggsy didn't write this one either. He's getting good at not writing them.",
    );
  });

  it('registry exposes exactly the two TESTED candidates (Section A is documentation-only)', () => {
    expect(COLD_OPEN_CANDIDATES).toHaveLength(2);
    expect(COLD_OPEN_CANDIDATES.map((c) => c.id).sort()).toEqual([4, 5]);
  });

  it('candidateById resolves ids 4 and 5 round-trip', () => {
    expect(candidateById(4).text).toBe(CANDIDATE_4);
    expect(candidateById(5).text).toBe(CANDIDATE_5);
  });
});

describe('R14 machine-wordplay decode mechanic — line surface contract', () => {
  // Each TESTED candidate must carry a wordplay surface that supports
  // the R14 decode (autonomy hook readable simultaneously as benign
  // colloquial and as literal autonomous-build statement). The
  // brainstorm rejection criteria for Section A was "machine wordplay
  // missing" — encode the inverse here so a future rewrite that drops
  // the wordplay surface FAILS this test rather than silently shipping
  // a Section-A-grade line under a Section-B id.

  it('candidate #4 carries the "machine" wordplay token (literal + colloquial dual reading)', () => {
    expect(CANDIDATE_4.toLowerCase()).toContain('machine');
  });

  it('candidate #5 carries the "didn\'t write" autonomy-authorship token (UMB v3 callback)', () => {
    expect(CANDIDATE_5.toLowerCase()).toContain("didn't write");
  });

  it('candidate #5 carries the "either" series-implication token (frames repeatability)', () => {
    // The R14 brainstorm requirement is "compressed-Archer cold-open +
    // repeatability declaration" — #5's "either" is the structural
    // load-bearer for the repeatability half.
    expect(CANDIDATE_5.toLowerCase()).toContain('either');
  });

  it('each candidate registry entry documents its machine-wordplay mechanic', () => {
    for (const c of COLD_OPEN_CANDIDATES) {
      expect(c.machineWordplayMechanic.length).toBeGreaterThan(20);
    }
  });
});

describe('Cold-open candidates — line-length / read-budget envelope', () => {
  // 5-second binary cold-open hook (R14): plan §Step 2 budgets the audio
  // line over frames 30-180+ (~5-7s at 30fps, with trailing 1-3s for
  // tag completion). Lines too short fail the gap-comedy beat; lines
  // too long over-run the 8-second composition envelope.
  for (const c of COLD_OPEN_CANDIDATES) {
    it(`candidate #${c.id} is between 50 and 100 characters (~3-7s deadpan read)`, () => {
      expect(c.text.length).toBeGreaterThanOrEqual(50);
      expect(c.text.length).toBeLessThanOrEqual(100);
    });
  }
});

describe('Cold-open candidates — VOICE_DIRECTION anti-pattern guard', () => {
  // ElevenLabs v3 reads anything in the text payload aloud verbatim
  // that is not a recognized bracket tag. Prepending "Read this in a
  // deadpan voice..." results in the engine speaking that direction
  // aloud. Made TWICE in UMB v3 work per project memory — codified
  // here so a third occurrence is a TEST FAILURE not a quiet ship.
  //
  // Bracket tags themselves (e.g. [deadpan], [sarcastic]) are
  // assembled in generate-cold-open-clip.ts, NOT in this constant.
  const FORBIDDEN_DIRECTIVES = [
    /read this/i,
    /\bvoice direction\b/i,
    /\bvoice_direction\b/i,
    /^(deliver|speak|narrate|read)\b/im,
    /\bin a (deep|gravelly|noir|deadpan|sardonic|dramatic) voice\b/i,
    /\b1940s noir detective\b/i,
    /^\[/m,
  ];

  for (const c of COLD_OPEN_CANDIDATES) {
    for (const pattern of FORBIDDEN_DIRECTIVES) {
      it(`candidate #${c.id} does not contain directive matching ${pattern}`, () => {
        expect(c.text).not.toMatch(pattern);
      });
    }
  }
});

describe('COLD_OPEN_SPEAKER — Janet voice attribution lock', () => {
  it('voice ID matches the locked Shared Library entry (Eleanor)', () => {
    // 2qQJWjw5XdG80GreshqG is the Eleanor "Gracious and Authoritative"
    // ID. Re-locked 2026-05-19 — Phase 2 Unit 2.3 cunty canary rejected
    // Sloane (m8AHWg36LJTQWKmfeGVv) as too polished for the Jessica-
    // Walter-Mallory-Archer brief; Eleanor's British "refined, seasoned,
    // commanding" preset landed the Q-from-Bond cadence reference.
    // Any drift here means a silent voice swap.
    expect(COLD_OPEN_SPEAKER.voiceId).toBe('2qQJWjw5XdG80GreshqG');
  });

  it('voice library entry name documents the Eleanor Shared Library label', () => {
    expect(COLD_OPEN_SPEAKER.voiceLibraryName).toContain('Eleanor');
    expect(COLD_OPEN_SPEAKER.voiceLibraryName).toContain('Authoritative');
    expect(COLD_OPEN_SPEAKER.voiceLibraryName).toContain('Shared Library');
  });

  it('speaker card asset exists in the public/assets/cards/ inventory', () => {
    // Soft contract — string-shape check only (existsSync against the
    // BURNED public dir runs in the renderer + composition, not here).
    // Asset must end in .webp per BURNED card-art convention.
    expect(COLD_OPEN_SPEAKER.cardAsset).toMatch(/^[a-z-]+\.webp$/);
  });

  it('archer archetype attribution is documented for Phase 1 carry-forward', () => {
    expect(COLD_OPEN_SPEAKER.archerArchetype).toMatch(/Malory|Lana|Cheryl/);
  });

  it('voice_settings override carries the cunty-Mallory profile (Phase 2 Unit 2.3 retune)', () => {
    // Janet's settings deliberately diverge from Unit 0.2 Roger
    // defaults. 2026-05-19 retune dropped stability + lifted style +
    // slowed speed to land the dismissive venom MichaelAnne flagged as
    // missing from the original "professional matriarch" profile.
    // Any drift here means a silent character-voice regression.
    expect(COLD_OPEN_SPEAKER.voiceSettings.stability).toBe(0.40);
    expect(COLD_OPEN_SPEAKER.voiceSettings.style).toBe(0.45);
    expect(COLD_OPEN_SPEAKER.voiceSettings.speed).toBe(0.85);
    expect(COLD_OPEN_SPEAKER.voiceSettings.similarity_boost).toBe(0.75);
    expect(COLD_OPEN_SPEAKER.voiceSettings.use_speaker_boost).toBe(true);
  });
});
