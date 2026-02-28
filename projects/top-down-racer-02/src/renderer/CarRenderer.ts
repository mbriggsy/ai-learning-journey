import { Graphics, Container } from 'pixi.js';

// ── Dimensions (world units) ──
const CAR_LENGTH  = 10.0;  // Overall length including nose
const BODY_WIDTH  = 2.4;   // Narrow monocoque
const WHEEL_SPAN  = 5.0;   // Outer edge to outer edge of rear tires
const FRONT_SPAN  = 4.6;   // Front wheel span (slightly narrower)

// ── Colors ──
const BODY_PRIMARY   = 0x1144cc; // Deep Indy blue
const BODY_ACCENT    = 0x2266ff; // Lighter accent stripe
const NOSE_COLOR     = 0x1144cc; // Matches body
const COCKPIT_COLOR  = 0x111111; // Open cockpit — dark
const HELMET_COLOR   = 0xeeeeee; // Driver helmet
const SIDEPOD_COLOR  = 0x1a55dd; // Slightly different from body
const FRONT_WING     = 0xcccccc; // Light grey carbon
const REAR_WING      = 0xcccccc; // Light grey carbon
const ENDPLATE_COLOR = 0x1144cc; // Wing endplates match body
const WHEEL_COLOR    = 0x1a1a1a; // Dark rubber
const WHEEL_RIM      = 0x444444; // Rim accent
const EXHAUST_COLOR  = 0x666666; // Exhaust/diffuser

export class CarRenderer {
  readonly container: Container;

  constructor() {
    this.container = new Container();

    const hl = CAR_LENGTH / 2;   // half-length
    const bw = BODY_WIDTH / 2;   // half body width
    const ws = WHEEL_SPAN / 2;   // half rear wheel span
    const fs = FRONT_SPAN / 2;   // half front wheel span

    // ── Rear wheels (big, exposed, drawn first) ──
    const rearWheelW = 2.0;
    const rearWheelH = 1.2;
    this.drawWheel(-hl + 0.8, -ws - rearWheelH / 2, rearWheelW, rearWheelH);
    this.drawWheel(-hl + 0.8,  ws - rearWheelH / 2, rearWheelW, rearWheelH);

    // ── Front wheels (smaller, exposed) ──
    const frontWheelW = 1.4;
    const frontWheelH = 0.9;
    this.drawWheel(hl - 3.2, -fs - frontWheelH / 2, frontWheelW, frontWheelH);
    this.drawWheel(hl - 3.2,  fs - frontWheelH / 2, frontWheelW, frontWheelH);

    // ── Front wing (wide, thin, at the very front) ──
    const fwing = new Graphics();
    const fwingW = FRONT_SPAN + frontWheelH + 0.4;
    fwing.roundRect(hl - 1.6, -fwingW / 2, 0.6, fwingW, 0.15).fill(FRONT_WING);
    this.container.addChild(fwing);

    // Front wing endplates
    const epW = 0.8;
    const epH = 0.4;
    const epLeft = new Graphics();
    epLeft.roundRect(hl - 1.8, -fwingW / 2 - 0.1, epW, epH, 0.1).fill(ENDPLATE_COLOR);
    this.container.addChild(epLeft);
    const epRight = new Graphics();
    epRight.roundRect(hl - 1.8, fwingW / 2 - epH + 0.1, epW, epH, 0.1).fill(ENDPLATE_COLOR);
    this.container.addChild(epRight);

    // ── Rear wing (wider than body, behind rear wheels) ──
    const rwingW = WHEEL_SPAN + rearWheelH + 0.2;
    const rwing = new Graphics();
    rwing.roundRect(-hl - 0.3, -rwingW / 2, 0.7, rwingW, 0.15).fill(REAR_WING);
    this.container.addChild(rwing);

    // Rear wing endplates
    const repH = 0.5;
    const repLeft = new Graphics();
    repLeft.roundRect(-hl - 0.5, -rwingW / 2 - 0.1, 1.0, repH, 0.1).fill(ENDPLATE_COLOR);
    this.container.addChild(repLeft);
    const repRight = new Graphics();
    repRight.roundRect(-hl - 0.5, rwingW / 2 - repH + 0.1, 1.0, repH, 0.1).fill(ENDPLATE_COLOR);
    this.container.addChild(repRight);

    // ── Side pods (between front and rear wheels) ──
    const podLen = 3.5;
    const podW = 1.0;
    const podLeft = new Graphics();
    podLeft.roundRect(-hl + 3.0, -bw - podW + 0.1, podLen, podW, 0.4).fill(SIDEPOD_COLOR);
    this.container.addChild(podLeft);
    const podRight = new Graphics();
    podRight.roundRect(-hl + 3.0, bw - 0.1, podLen, podW, 0.4).fill(SIDEPOD_COLOR);
    this.container.addChild(podRight);

    // ── Main monocoque body (narrow, long) ──
    const body = new Graphics();
    body.roundRect(-hl + 1.0, -bw, CAR_LENGTH - 2.5, BODY_WIDTH, 0.8).fill(BODY_PRIMARY);
    this.container.addChild(body);

    // ── Nose cone (tapers to a point) ──
    const nose = new Graphics();
    nose.poly([
      hl - 0.5,  0,          // tip
      hl - 2.0, -bw * 0.8,   // left shoulder
      hl - 2.0,  bw * 0.8,   // right shoulder
    ]).fill(NOSE_COLOR);
    this.container.addChild(nose);

    // ── Center accent stripe ──
    const stripe = new Graphics();
    stripe.roundRect(-hl + 2.5, -bw * 0.25, CAR_LENGTH - 5.5, BODY_WIDTH * 0.2, 0.3).fill(BODY_ACCENT);
    this.container.addChild(stripe);

    // ── Open cockpit ──
    const cockpit = new Graphics();
    cockpit.roundRect(-0.2, -bw * 0.4, 2.0, BODY_WIDTH * 0.35, 0.6).fill(COCKPIT_COLOR);
    this.container.addChild(cockpit);

    // ── Driver helmet ──
    const helmet = new Graphics();
    helmet.circle(0.6, 0, 0.4).fill(HELMET_COLOR);
    this.container.addChild(helmet);

    // ── Exhaust / diffuser at rear ──
    const exhaust = new Graphics();
    exhaust.roundRect(-hl + 0.6, -bw * 0.5, 0.5, BODY_WIDTH * 0.5, 0.15).fill(EXHAUST_COLOR);
    this.container.addChild(exhaust);

    // ── Front suspension arms (connecting body to front wheels) ──
    const susColor = 0x555555;
    const susLeft = new Graphics();
    susLeft.moveTo(hl - 2.8, -bw).lineTo(hl - 3.2, -fs);
    susLeft.moveTo(hl - 2.2, -bw).lineTo(hl - 2.6, -fs);
    susLeft.stroke({ width: 0.2, color: susColor });
    this.container.addChild(susLeft);
    const susRight = new Graphics();
    susRight.moveTo(hl - 2.8, bw).lineTo(hl - 3.2, fs);
    susRight.moveTo(hl - 2.2, bw).lineTo(hl - 2.6, fs);
    susRight.stroke({ width: 0.2, color: susColor });
    this.container.addChild(susRight);
  }

  private drawWheel(x: number, y: number, w: number, h: number): void {
    const tire = new Graphics();
    tire.roundRect(x, y, w, h, 0.3).fill(WHEEL_COLOR);
    this.container.addChild(tire);
    const rim = new Graphics();
    rim.roundRect(x + 0.25, y + 0.2, w - 0.5, h - 0.4, 0.2).fill(WHEEL_RIM);
    this.container.addChild(rim);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.container.position.set(worldX, worldY);
    this.container.rotation = heading;
  }
}
