import Phaser from 'phaser';
import type { PlayerState } from '../../types/state.js';
import type { FacingDirection } from '../../types/input.js';
import { DEPTH } from '../../constants.js';
import { TEXTURE_KEYS } from '../asset-keys.js';

/** Map FacingDirection to animation direction suffix */
const FACING_TO_DIR: Record<FacingDirection, string> = {
  up: 'n',
  down: 's',
  left: 'e',   // West = flipped East
  right: 'e',
};

const SPEED_THRESHOLD = 0.5;

export class PlayerSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private lastFacing: FacingDirection = 'down';
  private wasMoving: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, TEXTURE_KEYS.CHARACTERS, 'char-hider-idle-s-01.png');
    this.sprite.setDepth(DEPTH.PLAYER);
    this.sprite.play('hider-idle-s');
  }

  syncFromGameState(player: Readonly<PlayerState>): void {
    this.sprite.setPosition(player.x, player.y);

    const facing = player.facing;
    const isMoving = Math.abs(player.velocityX) > SPEED_THRESHOLD || Math.abs(player.velocityY) > SPEED_THRESHOLD;
    const dir = FACING_TO_DIR[facing];

    // Flip for West (left) — East sprites mirrored horizontally
    this.sprite.setFlipX(facing === 'left');

    // Only change animation if state changed
    if (facing !== this.lastFacing || isMoving !== this.wasMoving) {
      const action = isMoving ? 'walk' : 'idle';
      const animKey = `hider-${action}-${dir}`;
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey);
      }
      this.lastFacing = facing;
      this.wasMoving = isMoving;
    }
  }

  getGameObject(): Phaser.GameObjects.GameObject {
    return this.sprite;
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite];
  }
}
