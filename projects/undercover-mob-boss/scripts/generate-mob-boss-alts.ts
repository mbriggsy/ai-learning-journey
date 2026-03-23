import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";
import { join } from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const NOIR_SUFFIX = "noir ink illustration style, high contrast black and white with deep amber and gold accents, vintage 1940s aesthetic, professional card art, no text, pure black background";

const variants = [
  {
    name: "role-mob-boss-alt-1-kingpin",
    prompt: `massive imposing 1940s crime boss, barrel-chested enormous figure in an immaculate white pinstripe suit and blood-red tie, completely bald, one massive ring-adorned hand resting on a mahogany desk, face half-lit from a single desk lamp, radiates absolute authority and menace, half-body shot centered, ${NOIR_SUFFIX}`
  },
  {
    name: "role-mob-boss-alt-2-shadow",
    prompt: `full silhouette of a massive broad-shouldered man in a long overcoat and wide-brimmed fedora, completely shrouded in shadow, only a glowing cigar tip visible, looming figure backlit by a city window showing rain, deeply mysterious and threatening presence, ${NOIR_SUFFIX}`
  },
  {
    name: "role-mob-boss-alt-3-close",
    prompt: `extreme close-up of a powerful 1940s crime boss, just the lower half of the face, strong jaw, faint cruel smile, massive signet ring on thick fingers clasped together, expensive suit lapel visible, a single ace of spades playing card resting on dark wood table, implies absolute control and danger, ${NOIR_SUFFIX}`
  }
];

async function generate() {
  for (const v of variants) {
    console.log(`Generating ${v.name}...`);
    try {
      const response = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: v.prompt,
        config: { numberOfImages: 1, aspectRatio: "1:1" }
      });
      const imageData = response.generatedImages[0].image.imageBytes;
      const buffer = Buffer.from(imageData, "base64");
      const outPath = join("public/assets", `${v.name}.png`);
      writeFileSync(outPath, buffer);
      console.log(`  ✓ ${outPath}`);
      await new Promise(r => setTimeout(r, 7000));
    } catch (err: any) {
      console.error(`  ✗ ${err.message}`);
    }
  }
}

generate();
