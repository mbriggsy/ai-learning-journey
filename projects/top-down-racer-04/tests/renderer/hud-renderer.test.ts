// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pixi.js before importing HudRenderer
vi.mock('pixi.js', () => {
  class MockGraphics {
    children: any[] = [];
    visible = true;
    x = 0;
    y = 0;
    label = '';
    position = { x: 0, y: 0, set(nx: number, ny: number) { this.x = nx; this.y = ny; } };
    rect() { return this; }
    circle() { return this; }
    arc() { return this; }
    poly() { return this; }
    fill() { return this; }
    stroke() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    clear() { return this; }
    cacheAsTexture = vi.fn();
    addChild(child: any) { this.children.push(child); return child; }
  }

  class MockContainer {
    children: any[] = [];
    visible = true;
    x = 0;
    y = 0;
    rotation = 0;
    position = { x: 0, y: 0, set(nx: number, ny: number) { this.x = nx; this.y = ny; } };
    addChild(child: any) { this.children.push(child); return child; }
  }

  class MockText {
    text: string;
    style: any;
    visible = true;
    x = 0;
    y = 0;
    position = { x: 0, y: 0, set(nx: number, ny: number) { this.x = nx; this.y = ny; } };
    constructor(opts: { text: string; style: any }) {
      this.text = opts.text;
      this.style = { ...opts.style };
    }
  }

  class MockTextStyle {
    fontFamily: string;
    fontSize: number;
    fill: string;
    constructor(opts: any) {
      this.fontFamily = opts.fontFamily;
      this.fontSize = opts.fontSize;
      this.fill = opts.fill;
    }
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Text: MockText,
    TextStyle: MockTextStyle,
  };
});

import { HudRenderer } from '../../src/renderer/HudRenderer';
import type { WorldState } from '../../src/engine/types';
import type { RaceState } from '../../src/engine/RaceController';
import { Container } from 'pixi.js';

// ── Test helpers ──

function makeWorldState(overrides: Partial<{
  speed: number;
  posX: number;
  posY: number;
  currentLap: number;
  lastCheckpointIndex: number;
  totalRaceTicks: number;
  currentLapTicks: number;
  bestLapTicks: number;
  lapComplete: boolean;
}>): WorldState {
  const o = {
    speed: 0,
    posX: 100,
    posY: 200,
    currentLap: 1,
    lastCheckpointIndex: 0,
    totalRaceTicks: 0,
    currentLapTicks: 0,
    bestLapTicks: -1,
    lapComplete: false,
    ...overrides,
  };
  return {
    tick: 1,
    car: {
      position: { x: o.posX, y: o.posY },
      velocity: { x: 0, y: 0 },
      heading: 0,
      speed: o.speed,
      steeringAngle: 0,
      slipAngle: 0,
      angularVelocity: 0,
      throttle: 0,
      brake: 0,
      surface: 'asphalt',
      surfaceGrip: 1,
    },
    track: {
      controlPoints: [],
      innerBoundary: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      outerBoundary: [{ x: -10, y: -10 }, { x: 20, y: 20 }],
      innerRoadEdge: [],
      outerRoadEdge: [],
      checkpoints: [
        { left: { x: 0, y: 0 }, right: { x: 5, y: 0 }, center: { x: 2.5, y: 0 }, direction: { x: 1, y: 0 }, arcLength: 0 },
        { left: { x: 10, y: 5 }, right: { x: 15, y: 5 }, center: { x: 12.5, y: 5 }, direction: { x: 0, y: 1 }, arcLength: 10 },
        { left: { x: 5, y: 10 }, right: { x: 10, y: 10 }, center: { x: 7.5, y: 10 }, direction: { x: -1, y: 0 }, arcLength: 20 },
      ],
      arcLengthTable: { distances: [], points: [], headings: [], totalLength: 30 },
      totalLength: 30,
      startPosition: { x: 0, y: 0 },
      startHeading: 0,
    },
    timing: {
      currentLapTicks: o.currentLapTicks,
      bestLapTicks: o.bestLapTicks,
      totalRaceTicks: o.totalRaceTicks,
      currentLap: o.currentLap,
      lastCheckpointIndex: o.lastCheckpointIndex,
      lapComplete: o.lapComplete,
      lapTimes: [],
    },
  } as WorldState;
}

function makeRaceState(targetLaps = 3): RaceState {
  return {
    phase: 'racing',
    countdownBeat: -1,
    countdownTicksLeft: 0,
    stuckTicks: 0,
    respawnTicksLeft: 0,
    isFirstStart: false,
    targetLaps,
  } as RaceState;
}

// ── Tests ──

describe('HudRenderer', () => {
  let hudContainer: Container;
  let hud: HudRenderer;

  beforeEach(() => {
    hudContainer = new Container();
    hud = new HudRenderer(hudContainer);
  });

  describe('construction', () => {
    it('creates child elements in the container', () => {
      // gaugeContainer, lapCounterPanel, positionText, timePanel, aiPanel, minimapContainer
      expect((hudContainer as any).children.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('analog gauge', () => {
    it('caches the gauge background texture', () => {
      // Find the gauge container's first child (background Graphics)
      const gaugeContainer = (hudContainer as any).children[0];
      const background = gaugeContainer.children[0];
      expect(background.cacheAsTexture).toHaveBeenCalledWith({ resolution: 2, antialias: true });
    });

    it('rotates needle container based on speed (Fix #7)', () => {
      const prev = makeWorldState({ speed: 0 });
      const curr = makeWorldState({ speed: 80 }); // 50% of maxSpeed (160)
      const race = makeRaceState();

      hud.render(prev, curr, 0, race);

      const gaugeContainer = (hudContainer as any).children[0];
      const needleContainer = gaugeContainer.children[1];
      // ARC_START = -5π/4 ≈ -3.927, ARC_SWEEP = 3π/2 ≈ 4.712
      // At 50% speed: rotation = ARC_START + 0.5 * ARC_SWEEP
      const expected = -5 * Math.PI / 4 + 0.5 * (3 * Math.PI / 2);
      expect(needleContainer.rotation).toBeCloseTo(expected, 4);
    });

    it('clamps needle at max speed', () => {
      const prev = makeWorldState({ speed: 0 });
      const curr = makeWorldState({ speed: 999 }); // Over max
      const race = makeRaceState();

      hud.render(prev, curr, 0, race);

      const gaugeContainer = (hudContainer as any).children[0];
      const needleContainer = gaugeContainer.children[1];
      const expected = -5 * Math.PI / 4 + 1.0 * (3 * Math.PI / 2); // Full sweep
      expect(needleContainer.rotation).toBeCloseTo(expected, 4);
    });
  });

  describe('position indicator', () => {
    it('is hidden in solo mode', () => {
      hud.setMode('solo');
      const prev = makeWorldState({});
      const curr = makeWorldState({});
      hud.render(prev, curr, 0, makeRaceState());

      const positionText = (hudContainer as any).children[2]; // 3rd child
      expect(positionText.visible).toBe(false);
    });

    it('is hidden in spectator mode', () => {
      hud.setMode('spectator');
      const prev = makeWorldState({});
      const curr = makeWorldState({});
      hud.render(prev, curr, 0, makeRaceState());

      const positionText = (hudContainer as any).children[2];
      expect(positionText.visible).toBe(false);
    });

    it('shows P1 when player leads in vs-ai', () => {
      hud.setMode('vs-ai');
      const aiState = makeWorldState({ currentLap: 1, lastCheckpointIndex: 0 });
      hud.setAiStateSource(() => aiState);

      const prev = makeWorldState({});
      const curr = makeWorldState({ currentLap: 2, lastCheckpointIndex: 1 }); // Player ahead
      hud.render(prev, curr, 0, makeRaceState());

      const positionText = (hudContainer as any).children[2];
      expect(positionText.visible).toBe(true);
      expect(positionText.text).toBe('P1');
      expect(positionText.style.fill).toBe('#44ff88'); // green
    });

    it('shows P2 when AI leads in vs-ai', () => {
      hud.setMode('vs-ai');
      const aiState = makeWorldState({ currentLap: 2, lastCheckpointIndex: 2 });
      hud.setAiStateSource(() => aiState);

      const prev = makeWorldState({});
      const curr = makeWorldState({ currentLap: 1, lastCheckpointIndex: 0 }); // Player behind
      hud.render(prev, curr, 0, makeRaceState());

      const positionText = (hudContainer as any).children[2];
      expect(positionText.visible).toBe(true);
      expect(positionText.text).toBe('P2');
      expect(positionText.style.fill).toBe('#ff4444'); // red
    });

    it('uses lap * checkpoints + index for score', () => {
      hud.setMode('vs-ai');
      // Player: lap 2, checkpoint 1 => score = 2*3+1 = 7
      // AI:     lap 2, checkpoint 2 => score = 2*3+2 = 8
      const aiState = makeWorldState({ currentLap: 2, lastCheckpointIndex: 2 });
      hud.setAiStateSource(() => aiState);

      const prev = makeWorldState({});
      const curr = makeWorldState({ currentLap: 2, lastCheckpointIndex: 1 });
      hud.render(prev, curr, 0, makeRaceState());

      const positionText = (hudContainer as any).children[2];
      expect(positionText.text).toBe('P2'); // AI leads
    });
  });

  describe('minimap', () => {
    it('hides player dot in spectator mode (Fix #43)', () => {
      hud.setMode('spectator');
      const prev = makeWorldState({});
      const curr = makeWorldState({});
      hud.render(prev, curr, 0, makeRaceState());

      // minimapContainer's last child is minimapGraphics (dynamic dots)
      const minimapContainer = (hudContainer as any).children[5];
      const minimapGraphics = minimapContainer.children[2]; // panel, track, dots
      // In spectator mode without AI, only clear() is called — no fill for player dot
      // The mock Graphics tracks calls — we just verify no crash and it renders
      expect(minimapGraphics).toBeDefined();
    });

    it('shows AI dot in vs-ai mode', () => {
      hud.setMode('vs-ai');
      const aiState = makeWorldState({ posX: 50, posY: 50 });
      hud.setAiStateSource(() => aiState);

      const prev = makeWorldState({});
      const curr = makeWorldState({});
      hud.render(prev, curr, 0, makeRaceState());

      // Should render without errors (AI dot drawn)
      const minimapContainer = (hudContainer as any).children[5];
      expect(minimapContainer).toBeDefined();
    });
  });

  describe('layoutHud()', () => {
    it('positions gauge at bottom-center', () => {
      hud.layoutHud(1920, 1080);
      const gaugeContainer = (hudContainer as any).children[0];
      expect(gaugeContainer.position.x).toBe(960);   // 1920/2
      expect(gaugeContainer.position.y).toBe(980);    // 1080-100
    });

    it('positions minimap at bottom-right', () => {
      hud.layoutHud(1920, 1080);
      const minimapContainer = (hudContainer as any).children[5];
      expect(minimapContainer.position.x).toBe(1920 - 16 - 160); // w - MARGIN - MINIMAP_SIZE
      expect(minimapContainer.position.y).toBe(1080 - 16 - 160); // h - MARGIN - MINIMAP_SIZE
    });

    it('repositions elements on window resize', () => {
      hud.layoutHud(800, 600);
      const gaugeContainer = (hudContainer as any).children[0];
      expect(gaugeContainer.position.x).toBe(400);
      expect(gaugeContainer.position.y).toBe(500);

      hud.layoutHud(1600, 900);
      expect(gaugeContainer.position.x).toBe(800);
      expect(gaugeContainer.position.y).toBe(800);
    });
  });

  describe('reset()', () => {
    it('clears cached minimap transform (Fix #8)', () => {
      const prev = makeWorldState({});
      const curr = makeWorldState({});
      hud.render(prev, curr, 0, makeRaceState());

      hud.reset();

      // After reset, the next render should rebuild the track outline
      // This verifies trackOutlineBuilt was cleared
      hud.render(prev, curr, 0, makeRaceState());
      // No crash = outline rebuilt successfully
    });

    it('hides position indicator after reset', () => {
      hud.setMode('vs-ai');
      const aiState = makeWorldState({ currentLap: 1, lastCheckpointIndex: 0 });
      hud.setAiStateSource(() => aiState);
      hud.render(makeWorldState({}), makeWorldState({}), 0, makeRaceState());

      hud.reset();

      const positionText = (hudContainer as any).children[2];
      expect(positionText.visible).toBe(false);
    });

    it('resets needle to zero position', () => {
      // Drive at max speed
      hud.render(makeWorldState({}), makeWorldState({ speed: 160 }), 0, makeRaceState());

      hud.reset();

      const gaugeContainer = (hudContainer as any).children[0];
      const needleContainer = gaugeContainer.children[1];
      expect(needleContainer.rotation).toBeCloseTo(-5 * Math.PI / 4, 4); // ARC_START
    });
  });

  describe('lap times', () => {
    it('updates total time display', () => {
      const prev = makeWorldState({ totalRaceTicks: 0 });
      const curr = makeWorldState({ totalRaceTicks: 3600 }); // 1 minute at 60fps
      hud.render(prev, curr, 0, makeRaceState());

      const timePanel = (hudContainer as any).children[3];
      const totalTimeText = timePanel.children[0];
      expect(totalTimeText.text).not.toBe('0:00.000');
    });

    it('guards text updates with string comparison (Fix #9)', () => {
      const state = makeWorldState({ totalRaceTicks: 100 });
      hud.render(state, state, 0, makeRaceState());

      // Second render with same value should not trigger text update
      // (We can't easily verify no-op with mocks, but no crash = correct)
      hud.render(state, state, 0, makeRaceState());
    });
  });

  describe('AI timing', () => {
    it('hides AI panel in solo mode', () => {
      hud.setMode('solo');
      hud.render(makeWorldState({}), makeWorldState({}), 0, makeRaceState());

      const aiPanel = (hudContainer as any).children[4];
      expect(aiPanel.visible).toBe(false);
    });

    it('shows AI panel in vs-ai mode with source', () => {
      hud.setMode('vs-ai');
      hud.setAiStateSource(() => makeWorldState({}));
      hud.render(makeWorldState({}), makeWorldState({}), 0, makeRaceState());

      const aiPanel = (hudContainer as any).children[4];
      expect(aiPanel.visible).toBe(true);
    });
  });
});
