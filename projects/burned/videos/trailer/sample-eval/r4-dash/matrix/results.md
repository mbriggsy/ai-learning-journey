# Engine Matrix Results

Generated: 2026-05-18T16:13:23.422Z
Orchestrator: `scripts/generate-tts-eval.ts`

**Summary:** 8 / 9 cells produced audio. 1 documented engine limitation(s). 0 unexplained failure(s).

## Path A — ElevenLabs voice pick

- **Picked:** Roger - Laid-Back, Casual, Resonant (`CwhRBWXzGAHq8TQ4Fs17`) — score 6
- **Top 5 ranking:**
  1. Roger - Laid-Back, Casual, Resonant (`CwhRBWXzGAHq8TQ4Fs17`) — score 6
  2. Sarah - Mature, Reassuring, Confident (`EXAVITQu4vr4xnSDxMaL`) — score 6
  3. Laura - Enthusiast, Quirky Attitude (`FGY2WhTYpPnrIDTdsKH5`) — score 6
  4. Callum - Husky Trickster (`N2lVS1w4EtoT3dr4eOWO`) — score 6
  5. Harry - Fierce Warrior (`SOYHLrjzK2X1ezoPC6cr`) — score 6

## Per-call results

| Paragraph | Path | OK | Detail | Latency | Bytes | Duration | Chars |
|---|---|---|---|---|---|---|---|
| deadpan-exposition | path-a-elevenlabs | OK | mp3_44100_128 (367,012 bytes) | 11309ms | 367,012 | — | 332 |
| deadpan-exposition | path-c-gemini | OK | wav 24kHz/16-bit/mono (1,240,364 bytes) | 50421ms | 1,240,364 | 25.84s | — |
| deadpan-exposition | path-c-openai | OK | wav (952,244 bytes) | 966ms | 952,244 | — | — |
| monologue-exasperation | path-a-elevenlabs | OK | mp3_44100_128 (291,779 bytes) | 9546ms | 291,779 | — | 266 |
| monologue-exasperation | path-c-gemini | OK | wav 24kHz/16-bit/mono (1,015,724 bytes) | 88321ms | 1,015,724 | 21.16s | — |
| monologue-exasperation | path-c-openai | OK | wav (805,448 bytes) | 859ms | 805,448 | — | — |
| scream | path-a-elevenlabs | OK | mp3_44100_128 (28,047 bytes) | 1089ms | 28,047 | — | 18 |
| scream | path-c-gemini | FAIL | response missing inlineData.data — shape: {"promptFeedback":{"blockReason":"PROH | 1186ms | — | — | — |
| scream | path-c-openai | OK | wav (128,556 bytes) | 331ms | 128,556 | — | — |

## Documented engine limitations

Per-cell failures that reflect known engine constraints rather than orchestrator bugs. These are VALID Step 5 winner-selection data — an engine that fails a row simply cannot serve that row.

### path-c-gemini / scream

Gemini prompt-level safety filter (`promptFeedback.blockReason: PROHIBITED_CONTENT`) blocks this prompt combination. Confirmed not overridable via `safetySettings` BLOCK_ONLY_HIGH (those gate output-side filtering, not prompt-input filtering). Known Gemini engine constraint, not a script bug. Per cadence-spec §3.6 acceptance criterion: this is valid Step 5 winner-selection data — engines that cannot deliver the scream row fail that row.

Raw response shape (truncated):
```
response missing inlineData.data — shape: {"promptFeedback":{"blockReason":"PROHIBITED_CONTENT"},"usageMetadata":{"promptTokenCount":791,"totalTokenCount":791,"promptTokensDetails":[{"modality":"TEXT","tokenCount":791}],"serviceTier":"standard"},"modelVersion":"gemini-3.1-flash-tts-preview","responseId":"oToLapbGN7zSz7IPloaY2Ak"}
```

## Char-budget delta

- ElevenLabs chars used: **2,814 / 100,000** (2.81%)
- 50% tripwire: clear
- 80% tripwire (halt): clear

## File map

```
matrix/
├── path-a-elevenlabs/     ← mp3 files (44.1kHz / 128kbps)
├── path-c-gemini/         ← wav files (24kHz / 16-bit / mono)
├── path-c-openai/         ← wav files (OpenAI native)
└── results.md             ← this file
```

## Next step

Briggsy auditions the produced clips against cadence-spec §5
three-band rubric (Floor / Target Band / Ceiling). Step 4 MUSHRA
listener panel rates each engine path; Step 5 selects the winning
engine, accounting for any documented limitations above (an
engine that fails a row cannot serve that row in the final mix).
