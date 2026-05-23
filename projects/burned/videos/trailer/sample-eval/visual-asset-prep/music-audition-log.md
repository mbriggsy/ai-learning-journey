# Music Bed Audition Log — Phase 3 Unit 3.5

**Outcome:** **"Spy Glass" by Kevin MacLeod (Incompetech)** locked
2026-05-22 — Briggsy first-listen pick. Path A (full-length composition
clipped to 106s).

**Spend:** $0. Free CC-BY 4.0 catalog. Tier 1/2/3 paid ladder bypassed
per `project-burned-music-bed-budget` memory (Briggsy directive
2026-05-22 "not paying for music").

---

## Source-pool decision

Phase 1 Unit 1.7 locked a three-tier paid-source ladder
(Artlist/Epidemic → Marmoset/Songtradr → Suno). 2026-05-22 directive
inverted the budget to **$0** before Step 0 ran — paid ladder
SUPERSEDED. Free-or-skip path entered.

Free catalogs evaluated (via Gemini search 2026-05-22):

| Catalog | License posture | Initial assessment |
|---|---|---|
| Kevin MacLeod / Incompetech | CC-BY 4.0 — commercial use OK with attribution | **Deep + spy-jazz-rich catalog.** Primary search target. |
| Pixabay Music | Pixabay Content License — commercial + no attribution required | Searchable; lower hit-rate for specific Archer-coded brass spec. Secondary if Incompetech missed. |
| Free Music Archive (FMA) | Mixed CC licenses; filter to "Allows for commercial use" + CC-BY | Tertiary — wider catalog but harder to spec-filter without listening. |
| YouTube Audio Library | YouTube proprietary free license | Requires Google account sign-in; not pre-flightable from CLI. |
| Bensound | Free-with-attribution tier | Not searched — Incompetech landed first. |

---

## R9 spec (recap)

- Genre: mid-century brass / bossa nova / spy jazz / lounge
- BPM: 100–130
- Mood: confident, slightly playful, deadpan — NOT goofy/wacky
- Instrumentation: brass (trumpet/sax) lead + upright bass +
  syncopated drums + optional vibraphone/organ
- Length: ≥95s OR loop-friendly
- Dynamic shape: intro → build → peak (2190–2280) → duck
  (2310–2340) → bed-only hold → close-swell

---

## Incompetech candidates surfaced

Pulled via search 2026-05-22. URL verification: HTTP HEAD to direct
MP3 URLs (3/3 returned 200).

| Track | BPM | Length | Instrumentation | Mood / description | Verdict |
|---|---|---|---|---|---|
| **Spy Glass** | **110** | **3:47** | Saxes + Trumpet + Piano + Bass + Drums + Vibes + Flute | "Super cool jazz for your hardcore detectives! Timeless… could be 1950s." Grooving, Mysterious. | **✅ LOCKED** |
| Covert Affair | 68 | 3:14 | Bass + EP + Kit + Trumpet | Suspenseful, bouncy. "Surreptitious heist or furtive affair." | Skipped — BPM well below R9 range. Backup if Spy Glass had missed. |
| Hard Boiled | 126 | 3:01 | Bass + Piano + Drums | Grooving, mysterious. Detective gumshoe atmosphere. | Skipped — no brass. |
| Airport Lounge | 129 | 5:08 | Bass + Kit + EP + Vibes | Bouncy, calming. | Skipped — no brass. |
| Bossa Antigua | 70 | 4:43 | Guitar + Bass + Drums | Bright, grooving. | Skipped — BPM too slow + no brass. |
| Spy Groove | 115 | 3:00 | Kit + Organ + Bass + Cellos + Conga + EP + Violin | Dark, grooving, mysterious, intense. | Skipped — no brass. |

---

## Audition + decision

1. **Curl-download Spy Glass** to `temp/spy-glass-audition.mp3` (7.27 MB).
2. **ffprobe-confirm metadata:** codec mp3, 44.1 kHz stereo, 256 kbps,
   duration 226.98s. Matches Incompetech listing.
3. **Briggsy listen:** "oh that's fucking money!" — locked first try.
4. **Move to canonical path:** `public/trailer/audio/music-bed.mp3`.
5. **License artifact created** at
   `videos/trailer/sample-eval/visual-asset-prep/music-license.md`
   (CC-BY 4.0 attribution text + posting checklist).
6. **BEAT-SHEET.md preamble updated** — Music bed section now
   carries the landed track + license + attribution requirements.

---

## Carry-forwards to Phase 4

- **Path A taken** — Spy Glass 227s clipped to 106s window during
  Phase 4 composite. Phase 4 picks the in/out frames matching the
  cascade-peak structure (peak 2190–2280 + duck 2310–2340 + bed-
  only hold).
- **Music-cue map** in BEAT-SHEET.md preamble defines per-frame
  volume targets; Phase 4 wires `<Audio volume={(f) =>
  interpolate(...)}>` accordingly.
- **Loudnorm/duck math:** Phase 4 may need to pre-normalize Spy
  Glass to a target LU before applying the duck envelope. Existing
  voice-line loudnorm targeting -16 LU per Phase 2 Unit 2.5.
  Music-bed-vs-VO mix is Phase 4's tuning job.
- **No AI-music disclosure obligation.** `music_disclosure_required`
  stays `false` — Spy Glass is human-composed (not Tier 3 Suno).

---

## Carry-forwards to Phase 7

- **Attribution text** (verbatim from `music-license.md`) MUST
  appear in the post body / video description on every distribution
  surface where the trailer ships (Twitter/X, portfolio site,
  engineering blog reposts, LinkedIn). On-screen credit is OPTIONAL
  per CC-BY 4.0 (the spec allows description-area attribution).
- **License URL** must be reachable from wherever the attribution
  text appears (the CC-BY 4.0 deed at
  https://creativecommons.org/licenses/by/4.0/).
