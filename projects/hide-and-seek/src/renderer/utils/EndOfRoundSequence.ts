import Phaser from 'phaser';
import type { CinematicManager } from '../systems/CinematicManager.js';
import type { PauseAuthority } from '../systems/PauseAuthority.js';
import { PAUSE_REASONS } from '../systems/PauseAuthority.js';
import type { FogRenderer } from '../systems/FogRenderer.js';
import type { ResultsSceneData } from '../../types/scenes.js';
import { SceneTransition } from './SceneTransition.js';
import { CINEMATIC } from '../../constants.js';

type SequenceStep =
  | { readonly type: 'pause'; readonly durationMs: number }
  | { readonly type: 'zoom'; readonly target: number; readonly durationMs: number; readonly ease: string }
  | { readonly type: 'pan'; readonly x: number; readonly y: number; readonly durationMs: number; readonly ease: string }
  | { readonly type: 'flash'; readonly durationMs: number; readonly r: number; readonly g: number; readonly b: number }
  | { readonly type: 'shake'; readonly durationMs: number; readonly intensity: number }
  | { readonly type: 'text'; readonly content: string; readonly color: string; readonly holdMs: number }
  | { readonly type: 'fade'; readonly direction: 'out'; readonly durationMs: number };

const FOUND_SEQUENCE: readonly SequenceStep[] = [
  { type: 'pause', durationMs: CINEMATIC.END_SEQUENCE_PAUSE_MS },
  { type: 'shake', durationMs: CINEMATIC.SHAKE_DURATION_MS, intensity: CINEMATIC.SHAKE_INTENSITY },
  { type: 'zoom', target: 2, durationMs: CINEMATIC.END_SEQUENCE_ZOOM_MS, ease: 'Quad.easeInOut' },
  { type: 'flash', durationMs: CINEMATIC.END_SEQUENCE_FLASH_MS, r: 255, g: 255, b: 255 },
  { type: 'text', content: 'FOUND!', color: '#ff4444', holdMs: CINEMATIC.END_SEQUENCE_SPLASH_HOLD_MS },
  { type: 'fade', direction: 'out', durationMs: CINEMATIC.END_SEQUENCE_FADE_OUT_MS },
];

const SURVIVED_SEQUENCE: readonly SequenceStep[] = [
  { type: 'pause', durationMs: CINEMATIC.END_SEQUENCE_PAUSE_MS },
  { type: 'zoom', target: 2, durationMs: CINEMATIC.END_SEQUENCE_ZOOM_MS, ease: 'Quad.easeInOut' },
  { type: 'flash', durationMs: CINEMATIC.END_SEQUENCE_FLASH_MS, r: 255, g: 215, b: 0 },
  { type: 'text', content: 'SURVIVED!', color: '#ffd700', holdMs: CINEMATIC.END_SEQUENCE_SPLASH_HOLD_MS },
  { type: 'fade', direction: 'out', durationMs: CINEMATIC.END_SEQUENCE_FADE_OUT_MS },
];

function filterForReducedMotion(steps: readonly SequenceStep[]): SequenceStep[] {
  return steps.filter(s => s.type !== 'flash');
}

export class EndOfRoundSequence {
  private readonly scene: Phaser.Scene;
  private readonly cinematic: CinematicManager;
  private readonly pauseAuthority: PauseAuthority;
  private readonly fogRenderer: FogRenderer;
  private readonly reducedMotion: boolean;

  private steps: readonly SequenceStep[] = [];
  private stepIndex: number = 0;
  private stepStartTime: number = 0;
  private stepDuration: number = 0;
  private stepActive: boolean = false;
  private running: boolean = false;
  private resultsData: ResultsSceneData | null = null;

  constructor(
    scene: Phaser.Scene,
    cinematic: CinematicManager,
    pauseAuthority: PauseAuthority,
    fogRenderer: FogRenderer,
    reducedMotion: boolean,
  ) {
    this.scene = scene;
    this.cinematic = cinematic;
    this.pauseAuthority = pauseAuthority;
    this.fogRenderer = fogRenderer;
    this.reducedMotion = reducedMotion;
  }

  playFound(
    hiderX: number, hiderY: number,
    seekerX: number, seekerY: number,
    resultsData: ResultsSceneData,
  ): void {
    const midX = (hiderX + seekerX) / 2;
    const midY = (hiderY + seekerY) / 2;

    // Reveal fog around encounter point
    this.fogRenderer.revealArea(midX, midY, 5);

    const seq = this.reducedMotion ? filterForReducedMotion(FOUND_SEQUENCE) : FOUND_SEQUENCE;
    // Insert pan to midpoint after zoom (they run simultaneously via startStep)
    const withPan: SequenceStep[] = [];
    for (const step of seq) {
      withPan.push(step);
      if (step.type === 'zoom') {
        withPan.push({ type: 'pan', x: midX, y: midY, durationMs: step.durationMs, ease: step.ease });
      }
    }
    this.startSequence(withPan, resultsData);
  }

  playSurvived(
    playerX: number, playerY: number,
    resultsData: ResultsSceneData,
  ): void {
    const seq = this.reducedMotion ? filterForReducedMotion(SURVIVED_SEQUENCE) : SURVIVED_SEQUENCE;
    // Insert pan to player after zoom
    const withPan: SequenceStep[] = [];
    for (const step of seq) {
      withPan.push(step);
      if (step.type === 'zoom') {
        withPan.push({ type: 'pan', x: playerX, y: playerY, durationMs: step.durationMs, ease: step.ease });
      }
    }
    this.startSequence(withPan, resultsData);
  }

  private startSequence(steps: readonly SequenceStep[], resultsData: ResultsSceneData): void {
    this.steps = steps;
    this.resultsData = resultsData;
    this.stepIndex = 0;
    this.running = true;

    this.pauseAuthority.request(PAUSE_REASONS.CINEMATIC);
    this.cinematic.prepareForSequence();

    // Hide HUD
    if (this.scene.scene.isActive('HUD')) {
      this.scene.scene.sleep('HUD');
    }

    this.beginCurrentStep();
  }

  /** Called from scene update() — polls step completion */
  update(delta: number): void {
    if (!this.running) return;
    if (!this.scene.scene.isActive()) return;

    if (!this.stepActive) return;

    this.stepStartTime += delta;

    // Timeout safety: force-advance if exceeded duration + 500ms buffer
    const timeout = this.stepDuration + 500;
    if (this.stepStartTime >= timeout) {
      this.advanceStep();
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private beginCurrentStep(): void {
    if (this.stepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.stepIndex]!;
    this.stepStartTime = 0;
    this.stepActive = true;

    switch (step.type) {
      case 'pause':
        this.stepDuration = step.durationMs;
        // Pure timer — advanceStep called from update() on timeout
        break;

      case 'zoom':
        this.stepDuration = step.durationMs;
        this.cinematic.zoomTo(step.target, step.durationMs, step.ease).then(() => this.advanceStep());
        break;

      case 'pan':
        this.stepDuration = step.durationMs;
        this.cinematic.panTo(step.x, step.y, step.durationMs, step.ease).then(() => this.advanceStep());
        break;

      case 'flash':
        this.stepDuration = step.durationMs;
        this.cinematic.flash(step.durationMs, step.r, step.g, step.b).then(() => this.advanceStep());
        break;

      case 'shake':
        this.stepDuration = step.durationMs;
        this.cinematic.shake(step.durationMs, step.intensity);
        // Fire-and-forget — advance immediately
        this.advanceStep();
        break;

      case 'text':
        this.stepDuration = step.holdMs;
        this.cinematic.showSplash(step.content, step.color);
        // Hold for duration, then advance via timeout in update()
        break;

      case 'fade':
        this.stepDuration = step.durationMs;
        this.cinematic.fadeOut(step.durationMs).then(() => this.advanceStep());
        break;
    }
  }

  private advanceStep(): void {
    if (!this.running) return;
    this.stepActive = false;
    this.stepIndex++;
    this.beginCurrentStep();
  }

  private complete(): void {
    this.running = false;
    this.cinematic.hideSplash();
    this.pauseAuthority.release(PAUSE_REASONS.CINEMATIC);

    if (this.resultsData && this.scene.scene.isActive()) {
      SceneTransition.startScene(this.scene, 'Results', this.resultsData);
    }
  }
}
