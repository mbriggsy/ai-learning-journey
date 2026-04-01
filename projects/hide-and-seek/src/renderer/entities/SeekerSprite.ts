import Phaser from 'phaser';
import type { SeekerRenderState, SeekerFSMState } from '../../types/state.js';
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

/** FSM state → animation action mapping */
const FSM_TO_ACTION: Record<SeekerFSMState, 'idle' | 'walk' | 'chase'> = {
  patrol: 'walk',
  suspicious: 'walk',
  search: 'walk',
  chase: 'chase',
};

const MOVE_THRESHOLD = 0.1;

export class SeekerSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private lastFacing: FacingDirection = 'down';
  private lastFsmState: SeekerFSMState = 'patrol';
  private wasMoving: boolean = false;
  private prevX: number = 0;
  private prevY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, TEXTURE_KEYS.CHARACTERS, 'char-seeker-idle-s-01.png');
    this.sprite.setDepth(DEPTH.PLAYER);
    this.sprite.play('seeker-idle-s');
    this.prevX = x;
    this.prevY = y;
  }

  syncFromGameState(seeker: Readonly<SeekerRenderState>): void {
    this.sprite.setPosition(seeker.x, seeker.y);

    const facing = seeker.facing;
    const fsmState = seeker.fsmState;
    // No velocity on SeekerRenderState — detect movement from position delta
    const dx = seeker.x - this.prevX;
    const dy = seeker.y - this.prevY;
    const isMoving = Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD;
    this.prevX = seeker.x;
    this.prevY = seeker.y;

    const dir = FACING_TO_DIR[facing];

    // Flip for West (left)
    this.sprite.setFlipX(facing === 'left');

    // Only change animation if state changed
    if (facing !== this.lastFacing || fsmState !== this.lastFsmState || isMoving !== this.wasMoving) {
      let action: string;
      if (!isMoving) {
        action = 'idle';
      } else {
        action = FSM_TO_ACTION[fsmState];
      }
      const animKey = `seeker-${action}-${dir}`;
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey);
      }
      this.lastFacing = facing;
      this.lastFsmState = fsmState;
      this.wasMoving = isMoving;
    }
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite];
  }
}
