# Engine Account Readiness

Probed: 2026-05-18T14:58:30.969Z
Env loaded from: `C:\Users\brigg\ai-learning-journey\projects\burned\.env`

## Per-engine results

- **elevenlabs**: FAIL — auth probe 401 — {"detail":{"status":"missing_permissions","message":"The API key you used is missing the permission user_read to execute this operation."}}
- **openai**: OK — model scope ok, tts ok (14592 bytes)
- **gemini**: OK — model gemini-3.1-flash-tts-preview ok, tts endpoint ok

## Char-budget tracker

- Month: 2026-05
- ElevenLabs chars used: 0 / 100,000
- 50% tripwire (yellow): clear
- 80% tripwire (red, halt): clear
- Tracker file preserved: `C:\Users\brigg\ai-learning-journey\projects\burned\videos\trailer\sample-eval\r4-dash\char-budget.json`

## Disposition: HALT

One or more engines failed readiness. Route to Pre-Execution Prerequisites in `docs/plans/origin-trailer/phase-0-gate-resolution.md` (Unit 0.2). Common causes:

- **elevenlabs**: auth probe 401 — {"detail":{"status":"missing_permissions","message":"The API key you used is missing the permission user_read to execute this operation."}}