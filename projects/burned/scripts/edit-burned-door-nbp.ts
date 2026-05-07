/**
 * Use Nano Banana Pro (gemini-3-pro-image-preview) to surgically edit
 * the burned card so the OPEN door reads unambiguously as the BACK-SEAT
 * door, not the front passenger door. Imagen 4's prior for "open car
 * door = front passenger door" has been unbeatable across 20+ iterations
 * via prompt engineering. NBP has different priors AND supports image
 * editing with multi-turn refinement.
 *
 * Base image: iter 11 cropped (Briggsy approved as "awesome"). Even if
 * iter 11 had the door right, this pass also confirms door state +
 * ensures cartoony cel-shaded Archer style consistency.
 *
 * Run: set -a && source .env && set +a && npx tsx scripts/edit-burned-door-nbp.ts
 */
import { GoogleGenAI } from '@google/genai'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MODEL = 'gemini-3-pro-image-preview'
const INPUT_PATH = resolve('temp/cards/burned-iter11-cropped-LOCKED.png')
const OUTPUT_PATH = resolve('temp/cards/burned-nbp-edit.png')

const EDIT_PROMPT = `Edit this 1960s spy-noir illustration to surgically correct the open door of the unmarked sedan.

REQUIREMENT — the OPEN door of the sedan must be the BACK-SEAT door (rear passenger door, the one positioned BEHIND the B-pillar, between the rear quarter-panel and the front passenger door, the door closer to the rear taillights than to the front headlights).

If the FRONT passenger door is currently open in this image, CLOSE it flush against the body of the sedan with no gap. If the BACK-SEAT door is currently closed, OPEN it wide swung outward from the body of the sedan with the dark amber-lit back-bench-seat interior visible through the doorway.

The trunk lid stays closed. The roof of the sedan is smooth uninterrupted dark metal with no light or siren.

Preserve EVERYTHING ELSE about the image exactly as is:
- the two figures (operative in trench coat with cuffs visible at his back, agent in dark suit + fedora) in their current positions and poses
- the wet city street, distant streetlamp halo, rain streaks, dark city skyline
- the deep teal and charcoal palette with warm amber accents
- the flat illustration cel-shaded mid-century 1960s spy-noir Archer animation style
- the full-bleed square composition with no white border, no matte, no vignette

The only thing changing is the door state — front door closes if open, back-seat door opens. All else stays exactly as it is.`

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.')
    process.exit(1)
  }

  console.log(`Loading base image: ${INPUT_PATH}`)
  const inputBytes = readFileSync(INPUT_PATH)
  const inputBase64 = inputBytes.toString('base64')

  const ai = new GoogleGenAI({ apiKey })

  console.log(`Calling Nano Banana Pro (${MODEL}) with edit prompt...`)
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: EDIT_PROMPT },
          {
            inlineData: {
              mimeType: 'image/png',
              data: inputBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
    },
  })

  const candidates = response.candidates
  if (!candidates || candidates.length === 0) {
    console.error('No candidates in response.')
    console.error(JSON.stringify(response, null, 2))
    process.exit(1)
  }

  const parts = candidates[0]?.content?.parts ?? []
  let savedAny = false
  for (const part of parts) {
    if (part.text) {
      console.log(`Model text: ${part.text}`)
    }
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      writeFileSync(OUTPUT_PATH, buffer)
      console.log(`Saved: ${OUTPUT_PATH} (${buffer.length} bytes)`)
      savedAny = true
    }
  }

  if (!savedAny) {
    console.error('No image data in response.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
