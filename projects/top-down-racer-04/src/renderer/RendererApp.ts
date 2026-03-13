/**
 * RendererApp — bootstrap + container hierarchy (ADR-05).
 *
 * Phase 4: menuContainer removed. DOM overlay (#menu-overlay) handles menus.
 * ScreenManager creates DOM screens, RendererApp wires PixiJS + audio.
 */

import { Application, Container, Filter, Graphics, Text } from 'pixi.js';
import { GamePhase } from '../engine/RaceController';
import { GameLoop } from './GameLoop';
import { initInputHandler } from './InputHandler';
import { EffectsRenderer } from './EffectsRenderer';
import { HudRenderer } from './HudRenderer';
import { OverlayRenderer } from './OverlayRenderer';
import { SoundManager } from './SoundManager';
import { WorldRenderer } from './WorldRenderer';
import { FilterManager } from './FilterManager';
import { ScreenManager } from './ScreenManager';
import { AssetManager } from './AssetManager';
import { injectMenuStyles } from './dom/dom-styles';
import { TRACKS } from '../tracks/registry';

export class RendererApp {
  private app!: Application;

  async init(): Promise<void> {
    // 1. Init PixiJS v8 Application
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0x111111,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio ?? 1,
    });
    document.body.appendChild(this.app.canvas);

    // 2. Show splash screen
    const splash = this.buildSplash();
    this.app.stage.addChild(splash);

    // 3. Init keyboard input
    initInputHandler();

    // 4. Fullscreen toggle (F / F11)
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

    // 5. Set filter resolution before any filter creation (blur-based effects look fine at 1x)
    Filter.defaultOptions.resolution = 1;

    // 6. Boot asset loading
    const assetManager = new AssetManager();
    await assetManager.boot();

    // 7. Inject DOM menu styles (runtime CSS — base layout in index.html <style>)
    injectMenuStyles();

    // 8. Create ADR-05 container hierarchy (menuContainer removed — DOM overlay instead)
    const worldContainer = new Container({ label: 'world', isRenderGroup: true });
    const trackLayer = new Container({ label: 'trackLayer' });
    const effectsLayer = new Container({ label: 'effectsLayer' });
    const carLayer = new Container({ label: 'carLayer' });
    worldContainer.addChild(trackLayer, effectsLayer, carLayer);
    const hudContainer = new Container({ label: 'hud', isRenderGroup: true });

    worldContainer.visible = false;
    hudContainer.visible = false;

    this.app.stage.addChild(worldContainer, hudContainer);

    // 9. Create GameLoop with default track
    const gameLoop = new GameLoop(TRACKS[0].controlPoints);

    // 10. Create FilterManager (before WorldRenderer so it can be passed to ScreenManager)
    const filterManager = new FilterManager();

    // 11. Wire WorldRenderer
    const worldRenderer = new WorldRenderer(
      worldContainer,
      trackLayer,
      effectsLayer,
      carLayer,
    );
    gameLoop.onRender((prev, curr, alpha, race) => {
      worldRenderer.render(prev, curr, alpha, race, this.app.screen.width, this.app.screen.height);
    });

    // 12. Wire FilterManager render callback (motion blur updates)
    gameLoop.onRender((_prev, curr, _alpha, race) => {
      if (race.phase === GamePhase.Paused) {
        filterManager.pause();
      } else if (race.phase === GamePhase.Racing) {
        filterManager.updateMotionBlur(
          curr.car.velocity.x,
          curr.car.velocity.y,
          worldRenderer.cameraZoom,
        );
      }
    });

    // 13. Wire EffectsRenderer (into effectsLayer per C6, with renderer for RenderTexture ops)
    const effectsRenderer = new EffectsRenderer(effectsLayer, this.app.renderer);
    gameLoop.onRender((prev, curr, alpha, race) => {
      effectsRenderer.render(prev, curr, alpha, race);
    });

    // 14. Wire HUD renderer
    const hudRenderer = new HudRenderer(hudContainer);
    gameLoop.onRender((prev, curr, alpha, race) => {
      hudRenderer.render(prev, curr, alpha, race);
    });

    // 15. Wire Overlay renderer
    const overlayRenderer = new OverlayRenderer(hudContainer);
    gameLoop.onRender((prev, curr, alpha, race) => {
      overlayRenderer.render(prev, curr, alpha, race);
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      overlayRenderer.handlePauseInput(e.code);
      overlayRenderer.handleFinishedInput(e.code);
    });

    // 16. Sound system
    const soundManager = new SoundManager();
    overlayRenderer.setSoundManager(soundManager);

    const initAudio = () => {
      soundManager.init();
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('keydown', initAudio);
    window.addEventListener('click', initAudio);

    gameLoop.onRender((prev, curr, alpha, race) => {
      soundManager.update(prev, curr, alpha, race);
    });

    // M key mute toggle
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyM') soundManager.toggleMute();
    });

    // 17. WebGL context loss recovery (PixiJS v8.17.0 bug #11685: Text vanishes)
    this.app.renderer.runners.contextChange.add({
      contextChange: () => {
        hudRenderer.rebuildAfterContextLoss();
        effectsRenderer.recreateAfterContextLoss();
      },
    });

    // 18. Remove splash, get DOM overlay, create ScreenManager
    this.app.stage.removeChild(splash);
    splash.destroy({ children: true });

    const menuOverlay = document.getElementById('menu-overlay')!;

    new ScreenManager({
      app: this.app,
      menuOverlay,
      worldContainer,
      hudContainer,
      trackLayer,
      effectsLayer,
      carLayer,
      gameLoop,
      soundManager,
      worldRenderer,
      hudRenderer,
      overlayRenderer,
      effectsRenderer,
      filterManager,
      assetManager,
    });
  }

  private buildSplash(): Container {
    const container = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, window.innerWidth, window.innerHeight).fill(0x0a0a0a);
    container.addChild(bg);

    const title = new Text({
      text: 'Top-Down Racer',
      style: {
        fontFamily: 'Orbitron, monospace',
        fontSize: 48,
        fill: '#ffffff',
        fontWeight: 'bold',
        letterSpacing: 4,
      },
    });
    title.anchor.set(0.5);
    title.x = window.innerWidth / 2;
    title.y = window.innerHeight / 2;
    container.addChild(title);

    return container;
  }
}
