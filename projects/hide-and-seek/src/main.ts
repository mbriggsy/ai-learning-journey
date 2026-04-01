import Phaser from 'phaser';
import { BootScene } from './renderer/scenes/Boot.js';
import { MainMenuScene } from './renderer/scenes/MainMenu.js';
import { GameScene } from './renderer/scenes/Game.js';
import { HUDScene } from './renderer/scenes/HUD.js';
import { PauseMenuScene } from './renderer/scenes/PauseMenu.js';
import { ResultsScene } from './renderer/scenes/Results.js';
import { SpectatorGameScene } from './renderer/scenes/SpectatorGame.js';
import { SpectatorResultsScene } from './renderer/scenes/SpectatorResults.js';
import { DISPLAY } from './constants.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: DISPLAY.CANVAS_WIDTH,
  height: DISPLAY.CANVAS_HEIGHT,
  pixelArt: true,
  roundPixels: true,
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
  audio: {
    disableWebAudio: false,
  },
  scene: [BootScene, MainMenuScene, GameScene, HUDScene, PauseMenuScene, ResultsScene, SpectatorGameScene, SpectatorResultsScene],
};

new Phaser.Game(config);
