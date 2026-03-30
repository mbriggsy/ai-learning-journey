import Phaser from 'phaser';
import { BootScene } from './renderer/scenes/BootScene.js';
import { DISPLAY } from './constants.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: DISPLAY.CANVAS_WIDTH,
  height: DISPLAY.CANVAS_HEIGHT,
  pixelArt: true,
  backgroundColor: '#000000',
  transparent: false,
  banner: false,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    limit: 60,
  },
  render: {
    powerPreference: 'high-performance',
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene],
};

new Phaser.Game(config);
