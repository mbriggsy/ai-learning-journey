import type { Application, Container } from 'pixi.js';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { TrackSelectScreen } from './screens/TrackSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { GameLoop } from './GameLoop';
import type { SoundManager } from './SoundManager';
import type { WorldRenderer } from './WorldRenderer';
import type { HudRenderer } from './HudRenderer';
import type { EffectsRenderer } from './EffectsRenderer';
import { TRACKS } from '../tracks/registry';
import { setBestTime } from './BestTimes';

type ScreenState = 'main-menu' | 'track-select' | 'settings' | 'playing';

const VALID_TRANSITIONS: Record<ScreenState, ScreenState[]> = {
  'main-menu':    ['track-select', 'settings'],
  'track-select': ['main-menu', 'playing'],
  'settings':     ['main-menu'],
  'playing':      ['track-select'],
};

export class ScreenManager {
  private state: ScreenState = 'main-menu';
  private mainMenu: MainMenuScreen;
  private trackSelect: TrackSelectScreen;
  private settings: SettingsScreen;

  private app: Application;
  private gameLoop: GameLoop;
  private soundManager: SoundManager;
  private worldRenderer: WorldRenderer;
  private hudRenderer: HudRenderer;
  private effectsRenderer: EffectsRenderer;
  private worldContainer: Container;
  private hudContainer: Container;

  private activeTrackIndex = 0;
  private lastBestLapTicks = 0;
  private tickerFn: ((ticker: { deltaMS: number }) => void) | null = null;

  constructor(deps: {
    app: Application;
    stage: Container;
    worldContainer: Container;
    hudContainer: Container;
    gameLoop: GameLoop;
    soundManager: SoundManager;
    worldRenderer: WorldRenderer;
    hudRenderer: HudRenderer;
    effectsRenderer: EffectsRenderer;
  }) {
    this.app = deps.app;
    this.worldContainer = deps.worldContainer;
    this.hudContainer = deps.hudContainer;
    this.gameLoop = deps.gameLoop;
    this.soundManager = deps.soundManager;
    this.worldRenderer = deps.worldRenderer;
    this.hudRenderer = deps.hudRenderer;
    this.effectsRenderer = deps.effectsRenderer;

    // Create screen instances
    this.mainMenu = new MainMenuScreen();
    this.trackSelect = new TrackSelectScreen();
    this.settings = new SettingsScreen();

    // Connect settings to sound manager
    this.settings.setSoundManager(this.soundManager);

    // Wire navigation callbacks
    this.mainMenu.onAction = (action) => {
      if (action === 'play') this.goto('track-select');
      else if (action === 'settings') this.goto('settings');
    };

    this.trackSelect.onAction = (action) => {
      if (action.type === 'back') this.goto('main-menu');
      else if (action.type === 'select') this.startGame(action.index);
    };

    this.settings.onBack = () => this.goto('main-menu');

    // Wire quit-to-menu callback on GameLoop
    this.gameLoop.onQuitToMenu = () => {
      this.goto('track-select');
    };

    // Add screens to stage (behind world/hud containers)
    deps.stage.addChildAt(this.mainMenu.container, 0);
    deps.stage.addChildAt(this.trackSelect.container, 0);
    deps.stage.addChildAt(this.settings.container, 0);

    // Escape-as-back on menu screens
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (this.state === 'track-select') this.goto('main-menu');
      else if (this.state === 'settings') this.goto('main-menu');
    });

    // Show main menu initially
    this.showScreen('main-menu');
  }

  private goto(target: ScreenState): void {
    if (this.state === target) return;
    if (!VALID_TRANSITIONS[this.state]?.includes(target)) return;
    this.showScreen(target);
  }

  private showScreen(target: ScreenState): void {
    // Hide everything
    this.mainMenu.hide();
    this.trackSelect.hide();
    this.settings.hide();
    this.worldContainer.visible = false;
    this.hudContainer.visible = false;

    this.state = target;

    switch (target) {
      case 'main-menu':
        this.soundManager.suspend();
        this.mainMenu.show();
        break;
      case 'track-select':
        this.soundManager.suspend();
        this.trackSelect.refresh();
        this.trackSelect.show();
        break;
      case 'settings':
        this.settings.show();
        break;
      case 'playing':
        this.worldContainer.visible = true;
        this.hudContainer.visible = true;
        this.soundManager.resume();
        break;
    }
  }

  private startGame(trackIndex: number): void {
    this.activeTrackIndex = trackIndex;
    const trackInfo = TRACKS[trackIndex];

    // Load the selected track (resets world, restarts with countdown)
    this.gameLoop.loadTrack(trackInfo.controlPoints);

    // Reset renderers so the new track gets rendered fresh
    this.worldRenderer.reset();
    this.hudRenderer.reset();
    this.effectsRenderer.reset();

    this.lastBestLapTicks = 0;

    this.goto('playing');

    // Attach ticker if not already running
    if (!this.tickerFn) {
      this.tickerFn = (ticker) => {
        if (this.state !== 'playing') return;
        this.gameLoop.tick(ticker.deltaMS);
        this.checkBestTime();
      };
      this.app.ticker.add(this.tickerFn);
    }
  }

  /** Check for new best lap times and persist them. */
  private checkBestTime(): void {
    const timing = this.gameLoop.currentWorldState.timing;
    if (timing.bestLapTicks > 0 && timing.bestLapTicks !== this.lastBestLapTicks) {
      const trackId = TRACKS[this.activeTrackIndex].id;
      setBestTime(trackId, timing.bestLapTicks);
      this.lastBestLapTicks = timing.bestLapTicks;
    }
  }
}
