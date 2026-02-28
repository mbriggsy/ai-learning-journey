import { Graphics, Container } from 'pixi.js';
import { CAR } from '../engine/constants';

// Car visual dimensions (in world units — same scale as physics)
const CAR_LENGTH = CAR.length;  // 4.0 world units
const CAR_WIDTH  = CAR.width;   // 2.0 world units
const NOSE_LENGTH = 0.8;         // Extra forward protrusion for the "pointed nose"

// Car color — white body, distinct from AI car (Phase 6 will use different color)
const CAR_BODY_COLOR = 0xeeeeee;
const CAR_NOSE_COLOR = 0xff4444; // Red nose accent for forward direction readability

export class CarRenderer {
  readonly container: Container;
  private body: Graphics;
  private nose: Graphics;

  constructor() {
    this.container = new Container();

    // Body: rectangle centered at origin, heading is +X axis (engine convention).
    // PixiJS container transform handles world positioning and rotation.
    // Half-dimensions:
    const hw = CAR_WIDTH / 2;
    const hl = CAR_LENGTH / 2;

    this.body = new Graphics();
    // Rectangle from (-hl, -hw) to (+hl, +hw)
    this.body.rect(-hl, -hw, CAR_LENGTH, CAR_WIDTH).fill(CAR_BODY_COLOR);
    this.container.addChild(this.body);

    // Nose: small triangle at the front (+X direction) for heading clarity
    this.nose = new Graphics();
    this.nose.poly([
       hl + NOSE_LENGTH, 0,   // tip of nose (forward)
       hl, -hw * 0.6,          // left of nose base
       hl,  hw * 0.6,          // right of nose base
    ]).fill(CAR_NOSE_COLOR);
    this.container.addChild(this.nose);
  }

  /**
   * Update car sprite position and heading each render frame.
   * Called with interpolated values (not raw tick state).
   *
   * @param worldX - Interpolated world X position
   * @param worldY - Interpolated world Y position
   * @param heading - Interpolated heading in radians (engine: 0 = +X east)
   */
  update(worldX: number, worldY: number, heading: number): void {
    this.container.position.set(worldX, worldY);
    // Engine heading 0 = +X. PixiJS rotation 0 = +X (same x-axis convention).
    // But PixiJS Y is down (clockwise positive), engine Y is up (CCW positive).
    // Car shape is drawn with forward = +X, so PixiJS rotation = -heading
    // to flip from engine CCW convention to PixiJS CW convention.
    // The camera also applies worldContainer.rotation = -(heading + PI/2),
    // which already flips world Y. The car container's own rotation corrects for
    // the Y-flip: rotation = heading (not negated) within the already-flipped world.
    this.container.rotation = heading;
  }
}
