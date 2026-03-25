# Skill Idea: Voice-Over Generation Skill

**Date:** 2026-03-24
**Origin:** Repeated VOICE_DIRECTION bug — narrator audio generated with style instructions spoken aloud (twice).

## Problem

Gemini TTS generation has hidden landmines that cost time every session:
- VOICE_DIRECTION must NOT be prepended to script text (TTS reads everything aloud)
- No duration sanity check — a 5-word script shouldn't produce a 25MB WAV
- No listening QA step — 91 files committed without anyone hearing them
- Opus conversion is manual (ffmpeg loop after generation)
- No tone consistency check across variants

These are process failures, not code failures. A skill would encode the correct process so future sessions don't re-learn it.

## Proposed Skill: `/generate-voice-over`

A Claude Code skill that wraps the full narrator generation workflow:

1. **Pre-flight checks:**
   - Verify GEMINI_API_KEY is set
   - Verify ffmpeg is available
   - Verify generation script sends ONLY script text (no VOICE_DIRECTION prefix)
   - Confirm which lines to generate (all, trigger, specific variant)

2. **Generation:**
   - Run `generate-narrator.ts` with appropriate flags
   - Monitor for failures/retries

3. **Post-generation QA:**
   - Duration sanity check: flag any file >2x or <0.5x the median duration for its trigger group
   - File size sanity check: flag any file >1MB WAV (likely contains spoken instructions)
   - Auto-convert WAV → Opus via ffmpeg
   - Delete WAV originals, back up to assets/raw/audio/

4. **Commit protocol:**
   - Show summary: files generated, sizes, durations
   - Prompt: "Listen to 3-5 random samples before committing? (recommended)"
   - Commit only after explicit approval

## Why a Skill vs. Just Fixing the Script

The script is fine now. The problem was the PROCESS around it — no QA, no sanity checks, no "listen before you ship." A skill encodes the process, not just the code.

## Status

Idea only. Not started. Capture for next tooling session.
