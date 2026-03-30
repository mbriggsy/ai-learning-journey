import Phaser from 'phaser';
import type { PlayerState } from '../../types/state.js';
import type { FacingDirection } from '../../types/input.js';
import { DEPTH, DISPLAY } from '../../constants.js';

const INDICATOR_SIZE = 8;
const INDICATOR_OFFSET = 12;

const FACING_OFFSETS: Record<FacingDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -INDICATOR_OFFSET },
  down: { dx: 0, dy: INDICATOR_OFFSET },
  left: { dx: -INDICATOR_OFFSET, dy: 0 },
  right: { dx: INDICATOR_OFFSET, dy: 0 },
};

export class PlayerSprite {
  private body: Phaser.GameObjects.Rectangle;
  private facingIndicator: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, DISPLAY.TILE_SIZE, DISPLAY.TILE_SIZE, 0x4488ff);
    this.body.setDepth(DEPTH.PLAYER);
    this.facingIndicator = scene.add.rectangle(x, y - INDICATOR_OFFSET, INDICATOR_SIZE, INDICATOR_SIZE, 0xffffff);
    this.facingIndicator.setDepth(DEPTH.PLAYER + 1);
  }

  syncFromGameState(player: Readonly<PlayerState>): void {
    this.body.setPosition(player.x, player.y);
    const offset = FACING_OFFSETS[player.facing];
    this.facingIndicator.setPosition(player.x + offset.dx, player.y + offset.dy);
  }

  getGameObject(): Phaser.GameObjects.GameObject {
    return this.body;
  }
}
