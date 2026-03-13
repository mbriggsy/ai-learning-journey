/**
 * ScreenManager — DOM/PixiJS hybrid screen transitions.
 *
 * Phase 4 rewrite: DOM overlay for menus, PixiJS for gameplay.
 *   - menuContainer removed — DOM overlay show/hide instead
 *   - DomMainMenu, DomTrackSelect, DomSettings replace PixiJS screens
 *   - State machine + async transition guard preserved from v02/Phase 2
 *   - Fix #38: Skip leaderboard human write in spectator mode
 *   - Fix #40: Escape routing table (menu-only; gameplay handled by GameLoop/RaceController)
 *   - Fix #42: Finish overlay Continue → track-select via GameLoop.onQuitToMenu
 */

import type { Application, Container } from 'pixi.js';
import { DomMainMenu } from './dom/DomMainMenu';
import { DomTrackSelect } from './dom/DomTrackSelect';
import { DomSettings } from './dom/DomSettings';
import type { GameLoop } from './GameLoop';
import type { SoundManager } from './SoundManager';
import type { WorldRenderer } from './WorldRenderer';
import type { HudRenderer } from './HudRenderer';
import type { OverlayRenderer } from './OverlayRenderer';
import type { EffectsRenderer } from './EffectsRenderer';
import type { FilterManager } from './FilterManager';
import type { AssetManager } from './AssetManager';
import { TRACKS } from '../tracks/registry';
import type { TrackId } from '../assets/manifest';
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
  menuOverlay: HTMLElement;
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
  filterManager: FilterManager;
  assetManager: AssetManager;
}

export class ScreenManager {
  private state: ScreenState = 'main-menu';
  private transitioning = false;

  private app: Application;
  private menuOverlay: HTMLElement;
  private domMainMenu: DomMainMenu;
  private domTrackSelect: DomTrackSelect;
  private domSettings: DomSettings;
  private worldContainer: Container;
  private hudContainer: Container;
  private carLayer: Container;
  private gameLoop: GameLoop;
  private soundManager: SoundManager;
  private worldRenderer: WorldRenderer;
  private hudRenderer: HudRenderer;
  private overlayRenderer: OverlayRenderer;
  private effectsRenderer: EffectsRenderer;
  private filterManager: FilterManager;
  private assetManager: AssetManager;

  private activeTrackIndex = 0;
  private lastBestLapTicks = 0;
  private lastAiBestLapTicks = 0;
  private currentMode: GameMode = 'solo';
  private targetLaps = 0;
  private tickerFn: ((ticker: { deltaMS: number }) => void) | null = null;

  constructor(deps: ScreenManagerDeps) {
    this.app = deps.app;
    this.menuOverlay = deps.menuOverlay;
    this.worldContainer = deps.worldContainer;
    this.hudContainer = deps.hudContainer;
    this.carLayer = deps.carLayer;
    this.gameLoop = deps.gameLoop;
    this.soundManager = deps.soundManager;
    this.worldRenderer = deps.worldRenderer;
    this.hudRenderer = deps.hudRenderer;
    this.overlayRenderer = deps.overlayRenderer;
    this.effectsRenderer = deps.effectsRenderer;
    this.filterManager = deps.filterManager;
    this.assetManager = deps.assetManager;

    // Create DOM screen instances with navigation callbacks
    this.domMainMenu = new DomMainMenu(
      () => this.goto('track-select'),
      () => this.goto('settings'),
    );

    this.domTrackSelect = new DomTrackSelect(
      (index: number, mode: GameMode) => this.startGame(index, mode),
      () => this.goto('main-menu'),
    );

    this.domSettings = new DomSettings(
      this.soundManager,
      this.filterManager,
      () => this.goto('main-menu'),
    );

    // Wire quit-to-menu from gameplay (pause Q, finish Q/Escape — Fix #42)
    this.gameLoop.onQuitToMenu = () => {
      this.goto('track-select');
    };

    // Wire AI state sources
    this.worldRenderer.setAiStateSource(() => ({
      prev: this.gameLoop.prevAiWorldState,
      curr: this.gameLoop.currentAiWorldState,
    }));
    this.hudRenderer.setAiStateSource(() => this.gameLoop.currentAiWorldState);

    // Append DOM screens to overlay
    this.menuOverlay.append(
      this.domMainMenu.element,
      this.domTrackSelect.element,
      this.domSettings.element,
    );

    // Escape-as-back for menu screens (Fix #40: only fires in menu states)
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
      // If leaving gameplay, detach filters + hide world BEFORE unloading (C3)
      if (this.state === 'playing' && target !== 'playing') {
        this.filterManager.detach(
          this.worldContainer,
          this.carLayer,
          this.worldRenderer.getAiCarContainer(),
        );
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
    // Hide all DOM screens
    this.domMainMenu.hide();
    this.domTrackSelect.hide();
    this.domSettings.hide();

    this.state = target;

    switch (target) {
      case 'main-menu':
        this.soundManager.suspend();
        this.menuOverlay.style.display = 'flex';
        this.menuOverlay.style.pointerEvents = 'auto';
        this.worldContainer.visible = false;
        this.hudContainer.visible = false;
        this.domMainMenu.show();
        break;
      case 'track-select':
        this.soundManager.suspend();
        this.menuOverlay.style.display = 'flex';
        this.menuOverlay.style.pointerEvents = 'auto';
        this.worldContainer.visible = false;
        this.hudContainer.visible = false;
        this.domTrackSelect.show();
        break;
      case 'settings':
        this.menuOverlay.style.display = 'flex';
        this.menuOverlay.style.pointerEvents = 'auto';
        this.worldContainer.visible = false;
        this.hudContainer.visible = false;
        this.domSettings.show();
        break;
      case 'playing':
        this.menuOverlay.style.display = 'none';
        this.menuOverlay.style.pointerEvents = 'none';
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

      // Configure renderers (WorldRenderer.reset() handles car layer cleanup)
      this.worldRenderer.setMode(mode);
      this.worldRenderer.setTrackId(trackId);
      this.worldRenderer.setShoulderSide(trackInfo.shoulderSide ?? 'inner');
      this.worldRenderer.reset();
      this.hudRenderer.setMode(mode);
      this.hudRenderer.reset();
      this.overlayRenderer.setMode(mode);
      this.overlayRenderer.setGraceInfoSource(() => this.gameLoop.vsAiGraceState);
      this.effectsRenderer.reset();

      // Load track into game loop (Fix #36: lap count from DomSettings)
      this.gameLoop.loadTrack(trackInfo.controlPoints, this.domSettings.lapCount, mode);

      // Eagerly init track (creates car containers) so filters can attach before first render
      this.worldRenderer.initTrack(this.gameLoop.currentWorldState.track);

      // Attach post-processing filters to container hierarchy (after initTrack creates car containers)
      this.filterManager.attach(
        this.worldContainer,
        this.carLayer,
        this.worldRenderer.getAiCarContainer(),
      );

      this.lastBestLapTicks = 0;
      this.lastAiBestLapTicks = 0;
      this.currentMode = mode;
      this.targetLaps = this.domSettings.lapCount;

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

    // Fix #38: Skip human leaderboard write in spectator mode
    if (this.currentMode !== 'spectator') {
      if (timing.bestLapTicks > 0 && timing.bestLapTicks !== this.lastBestLapTicks) {
        setHumanBest(trackId, timing.bestLapTicks);
        this.lastBestLapTicks = timing.bestLapTicks;
      }
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
