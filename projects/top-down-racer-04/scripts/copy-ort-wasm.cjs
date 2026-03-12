/**
 * Copy onnxruntime-web WASM + MJS glue files into public/assets/ort/.
 *
 * Vite serves public/ as-is (no module transformation), which is required
 * because ORT dynamically imports the .mjs glue code at runtime.
 * Runs automatically via postinstall.
 */
const fs = require('fs');
const path = require('path');

const src = path.join('node_modules', 'onnxruntime-web', 'dist');
const dest = path.join('public', 'assets', 'ort');

if (!fs.existsSync(src)) {
  // onnxruntime-web not installed yet (e.g., first install in progress)
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

const files = fs.readdirSync(src).filter(f => f.startsWith('ort-wasm-simd-threaded'));
for (const file of files) {
  fs.cpSync(path.join(src, file), path.join(dest, file));
}

console.log(`Copied ${files.length} ORT WASM files to ${dest}/`);
