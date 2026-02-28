import { Graphics, Container } from 'pixi.js';

// Visual car dimensions (world units) — intentionally larger than physics hitbox for visibility
const CAR_LENGTH = 8.0;
const CAR_WIDTH  = 4.0;
const NOSE_LENGTH = 2.5;

// Colors
const CAR_BODY_COLOR = 0x2288ff; // Blue body — easy to spot on grey track
const CAR_ROOF_COLOR = 0x1166dd; // Darker center stripe
const CAR_NOSE_COLOR = 0xff3333; // Red front — unmistakable heading indicator

export class CarRenderer {
  readonly container: Container;

  constructor() {
    this.container = new Container();

    const hw = CAR_WIDTH / 2;
    const hl = CAR_LENGTH / 2;

    // Body rectangle
    const body = new Graphics();
    body.rect(-hl, -hw, CAR_LENGTH, CAR_WIDTH).fill(CAR_BODY_COLOR);
    this.container.addChild(body);

    // Center stripe (roof line) — reinforces forward direction
    const stripe = new Graphics();
    stripe.rect(-hl + 1, -hw * 0.25, CAR_LENGTH - 1, CAR_WIDTH * 0.5).fill(CAR_ROOF_COLOR);
    this.container.addChild(stripe);

    // Big red nose triangle — unmistakable "this is the front"
    const nose = new Graphics();
    nose.poly([
       hl + NOSE_LENGTH, 0,
       hl, -hw * 0.8,
       hl,  hw * 0.8,
    ]).fill(CAR_NOSE_COLOR);
    this.container.addChild(nose);

    // Rear accent (small dark bar at the back)
    const rear = new Graphics();
    rear.rect(-hl - 0.5, -hw * 0.7, 1.0, CAR_WIDTH * 1.4).fill(0x333333);
    this.container.addChild(rear);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.container.position.set(worldX, worldY);
    // WorldContainer has scale.y = -zoom (Y-flip), which mirrors rotation direction.
    // Use heading directly — the Y-flip already converts engine CCW to screen CW.
    this.container.rotation = heading;
  }
}
