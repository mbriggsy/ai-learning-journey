import type { Application, Container } from 'pixi.js';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { TrackSelectScreen } from './screens/TrackSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { GameLoop } from './GameLoop';
import type { SoundManager } from './SoundManager';
import type { WorldRenderer } from './WorldRenderer';
import type { HudRenderer } from './HudRenderer';
import type { OverlayRenderer } from './OverlayRenderer';
import type { EffectsRenderer } from './EffectsRenderer';
import { TRACKS } from '../tracks/registry';
import { setHumanBest, setAiBest } from './Leaderboard';
import type { GameMode } from '../types/game-mode';

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
  private overlayRenderer: OverlayRenderer;
  private effectsRenderer: EffectsRenderer;
  private worldContainer: Container;
  private hudContainer: Container;

  private activeTrackIndex = 0;
  private lastBestLapTicks = 0;
  private lastAiBestLapTicks = 0;
  private currentMode: GameMode = 'solo';
  private targetLaps = 0;
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
    overlayRenderer: OverlayRenderer;
    effectsRenderer: EffectsRenderer;
  }) {
    this.app = deps.app;
    this.worldContainer = deps.worldContainer;
    this.hudContainer = deps.hudContainer;
    this.gameLoop = deps.gameLoop;
    this.soundManager = deps.soundManager;
    this.worldRenderer = deps.worldRenderer;
    this.hudRenderer = deps.hudRenderer;
    this.overlayRenderer = deps.overlayRenderer;
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
      else if (action.type === 'select') this.startGame(action.index, action.mode);
    };

    this.settings.onBack = () => this.goto('main-menu');

    // Wire quit-to-menu callback on GameLoop
    this.gameLoop.onQuitToMenu = () => {
      this.goto('track-select');
    };

    // Wire AI state source: GameLoop → WorldRenderer (getter/closure pattern)
    this.worldRenderer.setAiStateSource(() => ({
      prev: this.gameLoop.prevAiWorldState,
      curr: this.gameLoop.currentAiWorldState,
    }));

    // Wire AI state source: GameLoop → HudRenderer (for AI timing stats)
    this.hudRenderer.setAiStateSource(() => this.gameLoop.currentAiWorldState);

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

  private startGame(trackIndex: number, mode: GameMode = 'solo'): void {
    this.activeTrackIndex = trackIndex;
    const trackInfo = TRACKS[trackIndex];

    // Load the selected track with mode (resets world, restarts with countdown)
    this.gameLoop.loadTrack(trackInfo.controlPoints, this.settings.lapCount, mode);

    // Configure renderers for this mode and track
    this.worldRenderer.setMode(mode);
    this.worldRenderer.setShoulderSide(trackInfo.shoulderSide ?? 'inner');
    this.worldRenderer.reset();
    this.hudRenderer.setMode(mode);
    this.hudRenderer.reset();
    this.overlayRenderer.setMode(mode);
    this.effectsRenderer.reset();

    this.lastBestLapTicks = 0;
    this.lastAiBestLapTicks = 0;
    this.currentMode = mode;
    this.targetLaps = this.settings.lapCount;

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

  /** Check for new best lap times (human + AI) and persist them. */
  private checkBestTime(): void {
    const trackId = TRACKS[this.activeTrackIndex].id;

    // Human best (all modes — in spectator, human never completes a lap so this no-ops)
    const timing = this.gameLoop.currentWorldState.timing;
    if (timing.bestLapTicks > 0 && timing.bestLapTicks !== this.lastBestLapTicks) {
      setHumanBest(trackId, timing.bestLapTicks);
      this.lastBestLapTicks = timing.bestLapTicks;
    }

    // AI best (vs-ai and spectator modes — solo has no AI world)
    if (this.currentMode !== 'solo') {
      const aiTiming = this.gameLoop.currentAiWorldState?.timing;
      const aiBest = aiTiming?.bestLapTicks;
      if (aiBest != null && aiBest > 0 && aiBest !== this.lastAiBestLapTicks) {
        setAiBest(trackId, aiBest);
        this.lastAiBestLapTicks = aiBest;
      }
      // Feed AI stats to overlay for Finished screen comparison
      this.overlayRenderer.setAiBestLapTicks(aiBest ?? null);
      // AI total race ticks = sum of first targetLaps lap times (null if AI hasn't finished)
      if (aiTiming && this.targetLaps > 0 && aiTiming.lapTimes.length >= this.targetLaps) {
        let aiTotal = 0;
        for (let i = 0; i < this.targetLaps; i++) aiTotal += aiTiming.lapTimes[i];
        this.overlayRenderer.setAiTotalRaceTicks(aiTotal);
      } else {
        this.overlayRenderer.setAiTotalRaceTicks(null);
      }
    }
  }
}
