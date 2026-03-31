import Phaser from 'phaser';
import type { SeekerRenderState } from '../../types/state.js';
import type { FacingDirection } from '../../types/input.js';
import { DEPTH, DISPLAY } from '../../constants.js';

const CHASE_COLOR = 0xff6666;
const PATROL_COLOR = 0xff4444;
const EYE_COLOR = 0xffffff;
const INDICATOR_SIZE = 8;
const INDICATOR_OFFSET = 12;

const FACING_OFFSETS: Record<FacingDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -INDICATOR_OFFSET },
  down: { dx: 0, dy: INDICATOR_OFFSET },
  left: { dx: -INDICATOR_OFFSET, dy: 0 },
  right: { dx: INDICATOR_OFFSET, dy: 0 },
};

export class SeekerSprite {
  private body: Phaser.GameObjects.Rectangle;
  private facingIndicator: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, DISPLAY.TILE_SIZE, DISPLAY.TILE_SIZE, PATROL_COLOR);
    this.body.setDepth(DEPTH.PLAYER);
    this.facingIndicator = scene.add.rectangle(x, y + INDICATOR_OFFSET, INDICATOR_SIZE, INDICATOR_SIZE, EYE_COLOR);
    this.facingIndicator.setDepth(DEPTH.PLAYER + 1);
  }

  syncFromGameState(seeker: Readonly<SeekerRenderState>): void {
    this.body.setPosition(seeker.x, seeker.y);
    this.body.setFillStyle(seeker.fsmState === 'chase' ? CHASE_COLOR : PATROL_COLOR);
    const offset = FACING_OFFSETS[seeker.facing];
    this.facingIndicator.setPosition(seeker.x + offset.dx, seeker.y + offset.dy);
  }

  getGameObject(): Phaser.GameObjects.GameObject {
    return this.body;
  }
}
