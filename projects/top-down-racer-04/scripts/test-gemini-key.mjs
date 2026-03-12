// Quick test: validates GEMINI_API_KEY with Imagen 4 (requires billing)
// Run: node scripts/test-gemini-key.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, '..', '.env');
let apiKey;
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const match = envContent.match(/GEMINI_API_KEY=(.+)/);
  apiKey = match?.[1]?.trim();
} catch {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') {
  console.error('❌ GEMINI_API_KEY not set in .env');
  process.exit(1);
}

console.log(`🔑 Key found: ${apiKey.substring(0, 8)}****`);
console.log('📡 Testing Imagen 4 API (paid tier)...\n');

// Imagen 4 uses the predict endpoint
const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

const body = {
  instances: [{ prompt: 'a red racing car, top-down view, simple sprite, transparent background' }],
  parameters: {
    sampleCount: 1,
    aspectRatio: '1:1',
  }
};

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ API error ${res.status}:`);
    console.error(JSON.stringify(data, null, 2));
    if (res.status === 400 && data.error?.message?.includes('paid')) {
      console.log('\n💡 Hint: Billing may not have propagated yet. Wait 1-2 minutes and retry.');
    }
    process.exit(1);
  }

  const prediction = data.predictions?.[0];
  if (prediction?.bytesBase64Encoded) {
    const sizeKB = Math.round(prediction.bytesBase64Encoded.length * 0.75 / 1024);
    console.log(`✅ Imagen 4 is working!`);
    console.log(`   Image received: ~${sizeKB}KB`);
    console.log(`   MIME type: ${prediction.mimeType ?? 'image/png'}`);
    console.log('\n🚀 Ready for Phase 0 asset generation.');
  } else {
    console.error('❌ Unexpected response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Network error:', err.message);
  process.exit(1);
}
