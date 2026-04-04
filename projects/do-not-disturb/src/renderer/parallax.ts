import Phaser from 'phaser';

export type ParallaxLayer = {
  readonly sprite: Phaser.GameObjects.TileSprite;
  readonly scrollFactor: number;
  readonly depth: number;
};

export function createParallaxLayers(
  scene: Phaser.Scene,
  width: number,
  height: number,
): { bg: ParallaxLayer; fg: ParallaxLayer } {
  const bg = scene.add.tileSprite(0, 0, width, height, 'bg-layer');
  bg.setOrigin(0, 0);
  bg.setScrollFactor(0);
  bg.setDepth(-2);

  const fg = scene.add.tileSprite(0, 0, width, height, 'fg-layer');
  fg.setOrigin(0, 0);
  fg.setScrollFactor(0);
  fg.setDepth(2);

  return {
    bg: { sprite: bg, scrollFactor: 0.3, depth: -2 },
    fg: { sprite: fg, scrollFactor: 1.3, depth: 2 },
  };
}

export function updateParallax(
  layers: { bg: ParallaxLayer; fg: ParallaxLayer },
  cameraScrollX: number,
  cameraScrollY: number,
): void {
  layers.bg.sprite.tilePositionX = cameraScrollX * layers.bg.scrollFactor;
  layers.bg.sprite.tilePositionY = cameraScrollY * layers.bg.scrollFactor;
  layers.fg.sprite.tilePositionX = cameraScrollX * layers.fg.scrollFactor;
  layers.fg.sprite.tilePositionY = cameraScrollY * layers.fg.scrollFactor;
}
