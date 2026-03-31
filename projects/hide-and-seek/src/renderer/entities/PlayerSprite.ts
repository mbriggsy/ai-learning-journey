import Phaser from 'phaser';
import type { PlayerState } from '../../types/state.js';
import { DEPTH, DISPLAY } from '../../constants.js';

export class PlayerSprite {
  private body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, DISPLAY.TILE_SIZE, DISPLAY.TILE_SIZE, 0x4488ff);
    this.body.setDepth(DEPTH.PLAYER);
  }

  syncFromGameState(player: Readonly<PlayerState>): void {
    this.body.setPosition(player.x, player.y);
  }

  getGameObject(): Phaser.GameObjects.GameObject {
    return this.body;
  }
}
