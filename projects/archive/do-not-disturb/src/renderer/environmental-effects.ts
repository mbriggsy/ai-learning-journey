import Phaser from 'phaser';

export type DustConfig = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function createDustParticles(scene: Phaser.Scene, config: DustConfig) {
  const particles = scene.add.particles(0, 0, 'dust-particle', {
    x: { min: config.x, max: config.x + config.width },
    y: { min: config.y, max: config.y + config.height },
    speed: { min: 2, max: 8 },
    angle: { min: 80, max: 100 },
    alpha: { start: 0.3, end: 0 },
    lifespan: 4000,
    frequency: 200,
    scale: { start: 0.5, end: 0.2 },
  });
  particles.setDepth(50);
  return particles;
}

export type CurtainState = {
  baseX: number;
  offsetX: number;
  swayTimer: number;
  reactTimer: number;
};

export function createCurtainState(baseX: number): CurtainState {
  return { baseX, offsetX: 0, swayTimer: 0, reactTimer: 0 };
}

export function updateCurtain(state: CurtainState, dt: number, playerVelocityX: number): void {
  state.swayTimer += dt;

  // Gentle idle sway
  const idleSway = Math.sin(state.swayTimer * 1.5) * 2;

  // React to player running past
  if (Math.abs(playerVelocityX) > 150) {
    state.reactTimer = 0.5; // half second flutter
  }

  let reactSway = 0;
  if (state.reactTimer > 0) {
    state.reactTimer -= dt;
    reactSway = Math.sin(state.reactTimer * 20) * 4; // quick flutter
  }

  state.offsetX = idleSway + reactSway;
}

export type RainConfig = {
  readonly intensity: number; // 0-1
  readonly windowX: number;
  readonly windowY: number;
  readonly windowWidth: number;
  readonly windowHeight: number;
};

export function createRainEffect(scene: Phaser.Scene, config: RainConfig) {
  const emitter = scene.add.particles(0, 0, 'rain-drop', {
    x: { min: config.windowX, max: config.windowX + config.windowWidth },
    y: config.windowY,
    speedY: { min: 100, max: 200 },
    speedX: { min: -10, max: 10 },
    alpha: { start: 0.6, end: 0.1 },
    lifespan: 2000,
    frequency: Math.floor(50 / Math.max(config.intensity, 0.1)),
    scale: { start: 0.3, end: 0.1 },
  });
  emitter.setDepth(45);
  return emitter;
}
