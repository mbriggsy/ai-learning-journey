# Undercover Mob Boss — Video Production Environment Setup
*Separate from main game env setup. Delete this file if video production is punted.*

---

## What This Is

AI-generated trailer production pipeline for UMB using:
- **Remotion** — programmatic video from React/code (game screens, text, transitions, narrator audio)
- **Runway Gen-3** (optional, future) — AI-generated people/scenes to mix in

---

## Prerequisites

Assumes main game environment (ENVIRONMENT-SETUP.md) is already configured.

---

## 1. FFmpeg (video rendering engine)

Remotion requires FFmpeg to render video.

```powershell
winget install ffmpeg
```

Restart your shell after install. Verify:
```powershell
ffmpeg -version
```

---

## 2. Remotion CLI

```powershell
npm install -g @remotion/cli
```

Verify:
```powershell
npx remotion --version
```

**Installed version:** 4.0.438

---

## 3. Project Setup (when ready to build)

Remotion project will live at:
```
projects/undercover-mob-boss-video/
```

Kept separate from the game project to avoid bloating the main repo.

```powershell
# Initialize a new Remotion project
cd C:\Users\brigg\ai-learning-journey\projects
npx create-video@latest undercover-mob-boss-video
```

Assets to reference from UMB:
- `projects/undercover-mob-boss/public/assets/` — images (roles, policies, power cards)
- `projects/undercover-mob-boss/public/audio/` — narrator WAV files
- `projects/undercover-mob-boss/public/fonts/` — Cinzel, Cormorant (noir typefaces)

---

## 4. Runway Gen-3 (optional — AI people scenes)

For "people around the table laughing/reacting" clips to mix into the trailer.

**API:** dev.runwayml.com
**Cost:** ~$0.05/second of video

When ready:
1. Create account at runwayml.com
2. Get API key from dashboard
3. Add to `.env`: `RUNWAY_API_KEY=...`
4. Claude Code handles the API calls

---

## Trailer Vision

- **Style:** Cinematic noir. Dark. Dramatic. Overkill.
- **Structure:**
  - Open on city at night (background.jpg + narrator intro)
  - "Your fate has been sealed" — role card reveal animation
  - Gameplay moments — voting, policy flip, execution
  - "Check your phone. Know your allegiance. Don't let it show."
  - Game logo hold + URL
- **Audio:** Narrator lines from `public/audio/` synced to visuals
- **Length:** ~60-90 seconds

---

## Cleanup

If this project is punted:
1. Delete this file
2. `npm uninstall -g @remotion/cli`
3. FFmpeg can stay (useful generally) or: `winget uninstall ffmpeg`

---

*Nothing here is final. Just enough to start.*
