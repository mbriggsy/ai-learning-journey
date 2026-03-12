/**
 * ScreenManager — screen transitions with asset lifecycle management.
 *
 * Adapted from v02. Key changes:
 *   - Async transition guard prevents concurrent transitions (C2)
 *   - worldContainer.visible = false BEFORE unloadTrack() (C3)
 *   - Screen containers added to menuContainer (not stage)
 *   - AssetManager wired for per-track BG loading/unloading
 *   - GPU texture upload before gameplay start
 */

import type { Application, Container } from 'pixi.js';
import { Assets } from 'pixi.js';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { TrackSelectScreen } from './screens/TrackSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { GameLoop } from './GameLoop';
import type { SoundManager } from './SoundManager';
import type { WorldRenderer } from './WorldRenderer';
import type { HudRenderer } from './HudRenderer';
import type { OverlayRenderer } from './OverlayRenderer';
import type { EffectsRenderer } from './EffectsRenderer';
import type { AssetManager } from './AssetManager';
import { TRACKS } from '../tracks/registry';
import { ASSETS, type TrackId } from '../assets/manifest';
import { setHumanBest, setAiBest } from './Leaderboard';
import type { GameMode } from '../types/game-mode';

type ScreenState = 'main-menu' | 'track-select' | 'settings' | 'playing';

const VALID_TRANSITIONS: Record<ScreenState, ScreenState[]> = {
  'main-menu':    ['track-select', 'settings'],
  'track-select': ['main-menu', 'playing'],
  'settings':     ['main-menu'],
  'playing':      ['track-select'],
};

interface ScreenManagerDeps {
  app: Application;
  menuContainer: Container;
  worldContainer: Container;
  hudContainer: Container;
  trackLayer: Container;
  effectsLayer: Container;
  carLayer: Container;
  gameLoop: GameLoop;
  soundManager: SoundManager;
  worldRenderer: WorldRenderer;
  hudRenderer: HudRenderer;
  overlayRenderer: OverlayRenderer;
  effectsRenderer: EffectsRenderer;
  assetManager: AssetManager;
}

export class ScreenManager {
  private state: ScreenState = 'main-menu';
  private transitioning = false;
  private mainMenu: MainMenuScreen;
  private trackSelect: TrackSelectScreen;
  private settings: SettingsScreen;

  private app: Application;
  private menuContainer: Container;
  private worldContainer: Container;
  private hudContainer: Container;
  private carLayer: Container;
  private gameLoop: GameLoop;
  private soundManager: SoundManager;
  private worldRenderer: WorldRenderer;
  private hudRenderer: HudRenderer;
  private overlayRenderer: OverlayRenderer;
  private effectsRenderer: EffectsRenderer;
  private assetManager: AssetManager;

  private activeTrackIndex = 0;
  private lastBestLapTicks = 0;
  private lastAiBestLapTicks = 0;
  private currentMode: GameMode = 'solo';
  private targetLaps = 0;
  private tickerFn: ((ticker: { deltaMS: number }) => void) | null = null;

  constructor(deps: ScreenManagerDeps) {
    this.app = deps.app;
    this.menuContainer = deps.menuContainer;
    this.worldContainer = deps.worldContainer;
    this.hudContainer = deps.hudContainer;
    this.carLayer = deps.carLayer;
    this.gameLoop = deps.gameLoop;
    this.soundManager = deps.soundManager;
    this.worldRenderer = deps.worldRenderer;
    this.hudRenderer = deps.hudRenderer;
    this.overlayRenderer = deps.overlayRenderer;
    this.effectsRenderer = deps.effectsRenderer;
    this.assetManager = deps.assetManager;

    // Create screen instances
    this.mainMenu = new MainMenuScreen();
    this.trackSelect = new TrackSelectScreen();
    this.settings = new SettingsScreen();
    this.settings.setSoundManager(this.soundManager);

    // Wire navigation
    this.mainMenu.onAction = (action) => {
      if (action === 'play') this.goto('track-select');
      else if (action === 'settings') this.goto('settings');
    };

    this.trackSelect.onAction = (action) => {
      if (action.type === 'back') this.goto('main-menu');
      else if (action.type === 'select') this.startGame(action.index, action.mode);
    };

    this.settings.onBack = () => this.goto('main-menu');

    this.gameLoop.onQuitToMenu = () => {
      this.goto('track-select');
    };

    // Wire AI state sources
    this.worldRenderer.setAiStateSource(() => ({
      prev: this.gameLoop.prevAiWorldState,
      curr: this.gameLoop.currentAiWorldState,
    }));
    this.hudRenderer.setAiStateSource(() => this.gameLoop.currentAiWorldState);

    // Add screens to menuContainer (not stage — D5)
    this.menuContainer.addChild(this.mainMenu.container);
    this.menuContainer.addChild(this.trackSelect.container);
    this.menuContainer.addChild(this.settings.container);

    // Escape-as-back
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (this.state === 'track-select') this.goto('main-menu');
      else if (this.state === 'settings') this.goto('main-menu');
    });

    // Show main menu
    this.showScreen('main-menu');
  }

  private async goto(target: ScreenState): Promise<void> {
    if (this.transitioning) return; // C2: refuse concurrent transitions
    if (this.state === target) return;
    if (!VALID_TRANSITIONS[this.state]?.includes(target)) return;

    this.transitioning = true;
    try {
      // If leaving gameplay, hide world BEFORE unloading (C3)
      if (this.state === 'playing' && target !== 'playing') {
        this.worldContainer.visible = false;
        this.hudContainer.visible = false;
        this.assetManager.unloadTrack();
      }
      this.showScreen(target);
    } finally {
      this.transitioning = false;
    }
  }

  private showScreen(target: ScreenState): void {
    this.mainMenu.hide();
    this.trackSelect.hide();
    this.settings.hide();

    if (target !== 'playing') {
      this.worldContainer.visible = false;
      this.hudContainer.visible = false;
      this.menuContainer.visible = true;
    }

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
        this.menuContainer.visible = false;
        this.worldContainer.visible = true;
        this.hudContainer.visible = true;
        this.soundManager.resume();
        break;
    }
  }

  private async startGame(trackIndex: number, mode: GameMode = 'solo'): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;

    try {
      this.activeTrackIndex = trackIndex;
      const trackInfo = TRACKS[trackIndex];
      const trackId = trackInfo.id as TrackId;

      // Load track BG (with race guard via AssetManager)
      await this.assetManager.loadTrack(trackId);

      // Force GPU texture upload before gameplay (D8)
      const bgTexture = Assets.get(ASSETS.tracks[trackId].bg);
      if (bgTexture) {
        this.app.renderer.prepare.upload(bgTexture);
      }

      // Clean car layer before creating new renderers
      for (const child of this.carLayer.removeChildren()) {
        child.destroy({ children: true });
      }

      // Configure renderers
      this.worldRenderer.setMode(mode);
      this.worldRenderer.setTrackId(trackId);
      this.worldRenderer.setShoulderSide(trackInfo.shoulderSide ?? 'inner');
      this.worldRenderer.reset();
      this.hudRenderer.setMode(mode);
      this.hudRenderer.reset();
      this.overlayRenderer.setMode(mode);
      this.overlayRenderer.setGraceInfoSource(() => this.gameLoop.vsAiGraceState);
      this.effectsRenderer.reset();

      // Load track into game loop
      this.gameLoop.loadTrack(trackInfo.controlPoints, this.settings.lapCount, mode);

      this.lastBestLapTicks = 0;
      this.lastAiBestLapTicks = 0;
      this.currentMode = mode;
      this.targetLaps = this.settings.lapCount;

      this.showScreen('playing');

      // Attach ticker if not already running
      if (!this.tickerFn) {
        this.tickerFn = (ticker) => {
          if (this.state !== 'playing') return;
          this.gameLoop.tick(ticker.deltaMS);
          this.checkBestTime();
        };
        this.app.ticker.add(this.tickerFn);
      }
    } finally {
      this.transitioning = false;
    }
  }

  private checkBestTime(): void {
    const trackId = TRACKS[this.activeTrackIndex].id;
    const timing = this.gameLoop.currentWorldState.timing;
    if (timing.bestLapTicks > 0 && timing.bestLapTicks !== this.lastBestLapTicks) {
      setHumanBest(trackId, timing.bestLapTicks);
      this.lastBestLapTicks = timing.bestLapTicks;
    }

    if (this.currentMode !== 'solo') {
      const aiTiming = this.gameLoop.currentAiWorldState?.timing;
      const aiBest = aiTiming?.bestLapTicks;
      if (aiBest != null && aiBest > 0 && aiBest !== this.lastAiBestLapTicks) {
        setAiBest(trackId, aiBest);
        this.lastAiBestLapTicks = aiBest;
      }
      this.overlayRenderer.setAiBestLapTicks(aiBest ?? null);
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
