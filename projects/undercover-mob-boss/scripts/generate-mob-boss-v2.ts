import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";
import { join } from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const NOIR_SUFFIX = "noir ink illustration style, high contrast black and white with deep amber and gold accents, vintage 1940s aesthetic, professional card art, no text, pure black background";

const prompt = `extreme close-up of a powerful 1940s crime boss, just the lower half of the face, strong jaw, lips closed in a faint cruel smile with no teeth showing, massive gold signet ring on thick fingers clasped together, expensive suit lapel visible, a heavy crystal glass with a generous pour of bourbon and two ice rocks on dark wood table, amber liquid catching the light, implies absolute control and calculated power, ${NOIR_SUFFIX}`;

async function generate() {
  console.log("Generating role-mob-boss-alt-3-revised...");
  try {
    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt,
      config: { numberOfImages: 1, aspectRatio: "1:1" }
    });
    const imageData = response.generatedImages[0].image.imageBytes;
    const buffer = Buffer.from(imageData, "base64");
    const outPath = join("public/assets", "role-mob-boss-alt-3-revised.png");
    writeFileSync(outPath, buffer);
    console.log(`  ✓ ${outPath}`);
  } catch (err: any) {
    console.error(`  ✗ ${err.message}`);
  }
}

generate();
