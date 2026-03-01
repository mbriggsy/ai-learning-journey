import { Application, Container, Graphics, Text } from 'pixi.js';
import { GameLoop } from './GameLoop';
import { initInputHandler } from './InputHandler';
import { EffectsRenderer } from './EffectsRenderer';
import { HudRenderer } from './HudRenderer';
import { OverlayRenderer } from './OverlayRenderer';
import { SoundManager } from './SoundManager';
import { WorldRenderer } from './WorldRenderer';
import { ScreenManager } from './ScreenManager';
import { TRACKS } from '../tracks/registry';

export class RendererApp {
  private app!: Application;
  private worldContainer!: Container;
  private hudContainer!: Container;
  private gameLoop!: GameLoop;
  private effectsRenderer!: EffectsRenderer;
  private hudRenderer!: HudRenderer;
  private overlayRenderer!: OverlayRenderer;
  private soundManager!: SoundManager;
  private worldRenderer!: WorldRenderer;
  private screenManager!: ScreenManager;

  async init(): Promise<void> {
    // Step 1: Init PixiJS Application (async in v8)
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio ?? 1,
    });
    document.body.appendChild(this.app.canvas);

    // Step 2: Show loading screen (UX-05) — appears immediately after canvas mounts
    const loadingScreen = this.buildLoadingScreen();
    this.app.stage.addChild(loadingScreen);

    // Step 3: Initialize keyboard input
    initInputHandler();

    // Step 4: Wire fullscreen toggle (UX-06: F and F11)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyF' || e.code === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          this.app.canvas.requestFullscreen().catch(() => {});
        }
      }
    });

    // Step 5: Create two-container scene graph (hidden until gameplay)
    this.worldContainer = new Container();
    this.hudContainer = new Container();
    this.worldContainer.visible = false;
    this.hudContainer.visible = false;
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.hudContainer);

    // Step 6: Create GameLoop with default track (renderers wire once)
    this.gameLoop = new GameLoop(TRACKS[0].controlPoints);

    // Step 6b: Wire World renderer
    this.worldRenderer = new WorldRenderer(this.worldContainer);
    this.gameLoop.onRender((prev, curr, alpha, race) => {
      this.worldRenderer.render(prev, curr, alpha, race, this.app.screen.width, this.app.screen.height);
    });

    // Step 6b2: Wire Effects renderer
    this.effectsRenderer = new EffectsRenderer(this.worldContainer);
    this.gameLoop.onRender((prev, curr, alpha, race) => {
      this.effectsRenderer.render(prev, curr, alpha, race);
    });

    // Step 6c: Wire HUD renderer
    this.hudRenderer = new HudRenderer(this.hudContainer);
    this.gameLoop.onRender((prev, curr, alpha, race) => {
      this.hudRenderer.render(prev, curr, alpha, race);
    });

    // Step 6d: Wire Overlay renderer
    this.overlayRenderer = new OverlayRenderer(this.hudContainer);
    this.gameLoop.onRender((prev, curr, alpha, race) => {
      this.overlayRenderer.render(prev, curr, alpha, race);
    });

    // Wire keyboard input for overlay (sound toggle M key, arrow nav in pause/finished)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.overlayRenderer.handlePauseInput(e.code);
      this.overlayRenderer.handleFinishedInput(e.code);
    });

    // Step 6e: Sound system
    this.soundManager = new SoundManager();
    this.overlayRenderer.setSoundManager(this.soundManager);

    // Initialize audio on first keydown/click (browser autoplay policy)
    const initAudio = () => {
      this.soundManager.init();
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('keydown', initAudio);
    window.addEventListener('click', initAudio);

    this.gameLoop.onRender((prev, curr, alpha, race) => {
      this.soundManager.update(prev, curr, alpha, race);
    });

    // Step 7: Brief simulated loading
    await new Promise<void>((resolve) => {
      this.app.ticker.addOnce(() => {
        this.updateLoadingProgress(loadingScreen, 1.0);
        resolve();
      });
    });

    // Step 8: Remove loading screen
    this.app.stage.removeChild(loadingScreen);

    // Step 9: Create ScreenManager (shows main menu)
    this.screenManager = new ScreenManager({
      app: this.app,
      stage: this.app.stage,
      worldContainer: this.worldContainer,
      hudContainer: this.hudContainer,
      gameLoop: this.gameLoop,
      soundManager: this.soundManager,
      worldRenderer: this.worldRenderer,
      hudRenderer: this.hudRenderer,
      effectsRenderer: this.effectsRenderer,
    });
  }

  /** Build the loading screen: title centered, progress bar below. */
  private buildLoadingScreen(): Container {
    const container = new Container();

    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight).fill(0x0a0a0a);
    container.addChild(bg);

    const title = new Text({
      text: 'Top-Down Racer',
      style: {
        fontFamily: 'monospace',
        fontSize: 48,
        fill: '#ffffff',
        fontWeight: 'bold',
        letterSpacing: 4,
      },
    });
    title.anchor.set(0.5);
    title.x = window.innerWidth / 2;
    title.y = window.innerHeight / 2 - 40;
    container.addChild(title);

    const barW = 300;
    const barH = 6;
    const barX = window.innerWidth / 2 - barW / 2;
    const barY = window.innerHeight / 2 + 20;

    const barBg = new Graphics();
    barBg.rect(barX, barY, barW, barH).fill(0x333333);
    container.addChild(barBg);

    const barFill = new Graphics();
    barFill.label = 'progress-fill';
    barFill.rect(barX, barY, 0, barH).fill(0x44aaff);
    container.addChild(barFill);

    (container as any).__barX = barX;
    (container as any).__barY = barY;
    (container as any).__barW = barW;
    (container as any).__barH = barH;

    return container;
  }

  /** Update the loading progress bar fill (0.0 to 1.0). */
  private updateLoadingProgress(screen: Container, progress: number): void {
    const barFill = screen.getChildByLabel('progress-fill') as Graphics;
    if (!barFill) return;
    const { __barX: x, __barY: y, __barW: w, __barH: h } = screen as any;
    barFill.clear();
    barFill.rect(x, y, w * progress, h).fill(0x44aaff);
  }
}
