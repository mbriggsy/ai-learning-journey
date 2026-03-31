import Phaser from 'phaser';
import type { SeekerRenderState } from '../../types/state.js';
import { DEPTH, DISPLAY } from '../../constants.js';

const CHASE_COLOR = 0xff6666;
const PATROL_COLOR = 0xff4444;

export class SeekerSprite {
  private body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, DISPLAY.TILE_SIZE, DISPLAY.TILE_SIZE, PATROL_COLOR);
    this.body.setDepth(DEPTH.PLAYER);
  }

  syncFromGameState(seeker: Readonly<SeekerRenderState>): void {
    this.body.setPosition(seeker.x, seeker.y);
    this.body.setFillStyle(seeker.fsmState === 'chase' ? CHASE_COLOR : PATROL_COLOR);
  }

  setVisible(visible: boolean): void {
    this.body.setVisible(visible);
  }

  getGameObject(): Phaser.GameObjects.GameObject {
    return this.body;
  }
}
