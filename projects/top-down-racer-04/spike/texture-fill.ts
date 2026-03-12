/**
 * Spike Test: PixiJS v8 Graphics.poly().fill({ texture, textureSpace: 'global', matrix })
 *
 * Validates texture tiling works correctly before building the full TrackRenderer.
 * Run with: pnpm dev, then navigate to /spike/texture-fill.html
 */
import { Application, Assets, Graphics, Matrix, Text } from 'pixi.js';

const statusEl = document.getElementById('status')!;
const lines: string[] = [];

function log(msg: string): void {
  lines.push(msg);
  statusEl.textContent = lines.join('\n');
}

async function run(): Promise<void> {
  const app = new Application();
  await app.init({ width: 1000, height: 700, background: '#222222' });
  document.body.appendChild(app.canvas);
  log('✓ PixiJS v8 Application initialized');

  // Load tile textures
  const asphaltTexture = await Assets.load('/assets/textures/asphalt-tile.png');
  const grassTexture = await Assets.load('/assets/textures/grass-tile.png');
  const curbTexture = await Assets.load('/assets/textures/curb-tile.png');
  log('✓ Textures loaded (asphalt, grass, curb)');

  // === Test 1: Rectangle with textureSpace: 'global' + matrix ===
  const g1 = new Graphics();
  const matrix1 = new Matrix().scale(50 / 512, 50 / 512);
  g1.poly([10, 10, 310, 10, 310, 210, 10, 210])
    .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: matrix1 });
  app.stage.addChild(g1);
  addLabel(app, 'Test 1: Rect + global + matrix', 10, 220);
  log('✓ Test 1: Rectangle with textureSpace: global + matrix');

  // === Test 2: Two adjacent shapes — verify seamless tiling ===
  const matrix2 = new Matrix().scale(50 / 256, 50 / 256);
  const g2a = new Graphics();
  g2a.poly([350, 10, 500, 10, 500, 210, 350, 210])
    .fill({ texture: grassTexture, textureSpace: 'global', matrix: matrix2 });
  const g2b = new Graphics();
  g2b.poly([500, 10, 650, 10, 650, 210, 500, 210])
    .fill({ texture: grassTexture, textureSpace: 'global', matrix: matrix2 });
  app.stage.addChild(g2a, g2b);
  addLabel(app, 'Test 2: Two shapes, seamless tiling', 350, 220);
  log('✓ Test 2: Adjacent shapes with same matrix');

  // === Test 3: Irregular polygon ===
  const g3 = new Graphics();
  const matrix3 = new Matrix().scale(50 / 512, 50 / 512);
  g3.poly([10, 280, 200, 260, 280, 320, 250, 400, 100, 420, 10, 380])
    .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: matrix3 });
  app.stage.addChild(g3);
  addLabel(app, 'Test 3: Irregular polygon', 10, 430);
  log('✓ Test 3: Irregular polygon');

  // === Test 4: Annular polygon (road between inner/outer edges) ===
  const g4 = new Graphics();
  const matrix4 = new Matrix().scale(50 / 128, 50 / 64);
  const outer = [350, 280, 650, 280, 680, 400, 620, 450, 380, 450, 320, 400];
  const inner = [430, 320, 570, 320, 600, 380, 580, 420, 420, 420, 400, 380];
  const annular = [...outer, ...[...inner].reverse()];
  g4.poly(annular)
    .fill({ texture: curbTexture, textureSpace: 'global', matrix: matrix4 });
  app.stage.addChild(g4);
  addLabel(app, 'Test 4: Annular polygon (road shape)', 350, 460);
  log('✓ Test 4: Annular polygon');

  // === Test 5: Matrix scale comparison ===
  const matrixSmall = new Matrix().scale(20 / 512, 20 / 512);
  const g5a = new Graphics();
  g5a.poly([700, 10, 900, 10, 900, 100, 700, 100])
    .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: matrixSmall });
  const matrixLarge = new Matrix().scale(100 / 512, 100 / 512);
  const g5b = new Graphics();
  g5b.poly([700, 120, 900, 120, 900, 210, 700, 210])
    .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: matrixLarge });
  app.stage.addChild(g5a, g5b);
  addLabel(app, 'Test 5: Scale (top=small, bot=large)', 700, 220);
  log('✓ Test 5: Matrix scale controls tile repeat');

  // === Test 6: local vs global comparison ===
  const g6a = new Graphics();
  g6a.poly([700, 280, 800, 280, 800, 380, 700, 380])
    .fill({ texture: grassTexture, textureSpace: 'local' });
  const matrix6 = new Matrix().scale(50 / 256, 50 / 256);
  const g6b = new Graphics();
  g6b.poly([820, 280, 920, 280, 920, 380, 820, 380])
    .fill({ texture: grassTexture, textureSpace: 'global', matrix: matrix6 });
  app.stage.addChild(g6a, g6b);
  addLabel(app, 'Test 6: local (L) vs global (R)', 700, 390);
  log('✓ Test 6: local vs global');

  log('\n=== ALL TESTS RENDERED ===');
  log('Verify visually:');
  log('  1. Textures tile (repeat), not stretch');
  log('  2. Adjacent shapes tile seamlessly');
  log('  3. Irregular polygon clips correctly');
  log('  4. Annular shape has hole');
  log('  5. Small scale=more tiles, large=fewer');
  log('  6. Local stretches, global tiles');
}

function addLabel(app: Application, text: string, x: number, y: number): void {
  const label = new Text({ text, style: { fill: '#ffffff', fontSize: 12 } });
  label.position.set(x, y);
  app.stage.addChild(label);
}

run().catch((err) => {
  log('✗ ERROR: ' + (err as Error).message);
  console.error(err);
});
