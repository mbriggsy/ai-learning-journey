import Phaser from 'phaser';
import type { HUDSceneData } from '../../types/scenes.js';
import type { TypedListener } from '../../types/events.js';
import type { GameEventMap } from '../../types/events.js';
import type { ReadonlyDeep } from '../../types/utility.js';
import type { PlayingState, SpectatingState, GameFlowKind } from '../../types/state.js';
import { ticksToDisplaySeconds } from '../../game/timer.js';
import { HUD } from '../../constants.js';

type TimerWarningState = 'normal' | 'warning' | 'critical';

export class HUDScene extends Phaser.Scene {
  private listener!: TypedListener<GameEventMap>;
  private getState!: () => ReadonlyDeep<PlayingState | SpectatingState>;
  private timerText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private warningState: TimerWarningState = 'normal';
  private onPhaseChanged!: (kind: GameFlowKind) => void;

  constructor() {
    super({ key: 'HUD' });
  }

  init(data: HUDSceneData): void {
    this.listener = data.listener;
    this.getState = data.getState;
  }

  create(): void {
    const { width } = this.scale;

    // HUD camera: fixed at (0,0), zoom 1 — screen space
    this.cameras.main.setScroll(0, 0);

    // Timer (top-right)
    this.timerText = this.add.text(width - 16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // Phase indicator (top-center)
    this.phaseText = this.add.text(width / 2, 16, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // PULL initial state
    const state = this.getState();
    const flow = state.gameFlow;
    if (flow.kind === 'countdown' || flow.kind === 'hunt') {
      this.updateTimer(flow.ticksRemaining);
    }
    this.updatePhaseIndicator(flow.kind);

    // Subscribe to phase transitions
    this.onPhaseChanged = (kind: GameFlowKind) => {
      this.updatePhaseIndicator(kind);
      this.animatePhaseTransition(kind);
    };
    this.listener.on('PHASE_CHANGED', this.onPhaseChanged);

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
      this.listener.off('PHASE_CHANGED', this.onPhaseChanged);
    });
  }

  override update(): void {
    const state = this.getState();
    const flow = state.gameFlow;

    if (flow.kind === 'countdown' || flow.kind === 'hunt') {
      this.updateTimer(flow.ticksRemaining);
    }
  }

  private updateTimer(ticksRemaining: number): void {
    const secs = ticksToDisplaySeconds(ticksRemaining);
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    this.timerText.setText(`${String(mins).padStart(2, '0')}:${String(remainSecs).padStart(2, '0')}`);

    // Timer warning state machine
    const newState = this.getWarningState(secs);
    if (newState !== this.warningState) {
      this.warningState = newState;
      this.applyWarningStyle(newState);
    }
  }

  private getWarningState(secs: number): TimerWarningState {
    if (secs <= HUD.CRITICAL_THRESHOLD_S) return 'critical';
    if (secs <= HUD.WARNING_THRESHOLD_S) return 'warning';
    return 'normal';
  }

  private applyWarningStyle(state: TimerWarningState): void {
    this.tweens.killTweensOf(this.timerText);

    switch (state) {
      case 'normal':
        this.timerText.setTint(HUD.COLOR_NORMAL);
        this.timerText.setScale(1);
        break;
      case 'warning':
        this.timerText.setTint(HUD.COLOR_WARNING);
        this.tweens.add({
          targets: this.timerText,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      case 'critical':
        this.timerText.setTint(HUD.COLOR_CRITICAL);
        this.tweens.add({
          targets: this.timerText,
          alpha: 0.4,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
    }
  }

  private updatePhaseIndicator(kind: GameFlowKind): void {
    switch (kind) {
      case 'countdown':
        this.phaseText.setText('HIDE!').setTint(0x66ccff);
        break;
      case 'hunt':
        this.phaseText.setText('HUNT').setTint(0xff6644);
        break;
      case 'found':
      case 'survived':
        this.phaseText.setVisible(false);
        break;
    }
  }

  private animatePhaseTransition(kind: GameFlowKind): void {
    if (kind === 'found' || kind === 'survived') return;

    this.tweens.add({
      targets: this.phaseText,
      scaleX: 0,
      scaleY: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.updatePhaseIndicator(kind);
        this.tweens.add({
          targets: this.phaseText,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      },
    });
  }
}
