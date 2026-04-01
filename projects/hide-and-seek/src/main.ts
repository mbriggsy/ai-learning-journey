import Phaser from 'phaser';
import { BootScene } from './renderer/scenes/Boot.js';
import { MainMenuScene } from './renderer/scenes/MainMenu.js';
import { GameScene } from './renderer/scenes/Game.js';
import { HUDScene } from './renderer/scenes/HUD.js';
import { PauseMenuScene } from './renderer/scenes/PauseMenu.js';
import { ResultsScene } from './renderer/scenes/Results.js';
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
  scene: [BootScene, MainMenuScene, GameScene, HUDScene, PauseMenuScene, ResultsScene],
};

new Phaser.Game(config);
