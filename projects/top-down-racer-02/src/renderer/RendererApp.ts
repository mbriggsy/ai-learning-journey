import { Application, Container, Graphics, Text } from 'pixi.js';
import { GameLoop } from './GameLoop';
import { initInputHandler, isKeyDown } from './InputHandler';
import { GamePhase } from './GameState';

export class RendererApp {
  private app!: Application;
  private worldContainer!: Container;
  private hudContainer!: Container;
  private gameLoop!: GameLoop;

  async init(): Promise<void> {
    // Step 1: Init PixiJS Application (async in v8)
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0x1a1a1a,
      antialias: true,
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

    // Step 5: Create two-container scene graph
    this.worldContainer = new Container();
    this.hudContainer = new Container();
    // Note: do NOT add to stage yet — loading screen is shown first.
    // Containers are added when game starts.

    // Step 6: Create game loop
    this.gameLoop = new GameLoop();

    // Step 7: Brief simulated loading (PixiJS init is instant for this project;
    //         this gives the browser one frame to paint the loading screen)
    await new Promise<void>((resolve) => {
      this.app.ticker.addOnce(() => {
        // Simulate progress bar completion
        this.updateLoadingProgress(loadingScreen, 1.0);
        resolve();
      });
    });

    // Step 8: Remove loading screen, add game containers
    this.app.stage.removeChild(loadingScreen);
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.hudContainer); // HUD on top of world

    // Step 9: Attach ticker — game loop runs every frame
    this.app.ticker.add((ticker) => {
      this.gameLoop.tick(ticker.deltaMS);
    });

    // Step 10: Start the game with countdown
    this.gameLoop.startGame();
  }

  /** Build the loading screen: title centered, progress bar below. */
  private buildLoadingScreen(): Container {
    const container = new Container();

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight).fill(0x0a0a0a);
    container.addChild(bg);

    // Game title
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

    // Progress bar background
    const barW = 300;
    const barH = 6;
    const barX = window.innerWidth / 2 - barW / 2;
    const barY = window.innerHeight / 2 + 20;

    const barBg = new Graphics();
    barBg.rect(barX, barY, barW, barH).fill(0x333333);
    container.addChild(barBg);

    // Progress bar fill (starts empty — updated via updateLoadingProgress)
    const barFill = new Graphics();
    barFill.label = 'progress-fill';
    barFill.rect(barX, barY, 0, barH).fill(0x44aaff);
    container.addChild(barFill);

    // Store barX/barW for update
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

  get pixiApp(): Application { return this.app; }
  get world(): Container { return this.worldContainer; }
  get hud(): Container { return this.hudContainer; }
  get loop(): GameLoop { return this.gameLoop; }
}
