import sharp from 'sharp';
import * as fs from 'node:fs';

const buf = fs.readFileSync('assets/raw/characters/char-hider-idle-s-01.png');

async function main(): Promise<void> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // Sample corners
  const corners = [
    { name: '(0,0)', idx: 0 },
    { name: `(${info.width-1},0)`, idx: (info.width - 1) * 4 },
    { name: `(0,${info.height-1})`, idx: (info.height - 1) * info.width * 4 },
    { name: `(${info.width-1},${info.height-1})`, idx: ((info.height - 1) * info.width + info.width - 1) * 4 },
  ];

  for (const c of corners) {
    const r = data[c.idx]!; const g = data[c.idx + 1]!; const b = data[c.idx + 2]!;
    const dist = Math.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2);
    console.log(`${c.name}: R=${r} G=${g} B=${b} | dist from magenta: ${dist.toFixed(1)}`);
  }

  console.log('\nExpected magenta: R=255 G=0 B=255 (tolerance=30 means dist must be <=30)');
}

main();
