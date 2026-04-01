import Phaser from 'phaser';
import type { PauseAuthority } from '../systems/PauseAuthority.js';
import type { AudioManager, AudioChannel } from '../systems/AudioManager.js';
import { PAUSE_REASONS } from '../systems/PauseAuthority.js';
import { SceneTransition } from '../utils/SceneTransition.js';

/** Set by Game/SpectatorGame scene before launching PauseMenu */
let sharedPauseAuthority: PauseAuthority | null = null;
let sharedAudioManager: AudioManager | null = null;
let parentSceneKey: string = 'Game';

export function setPauseAuthority(pa: PauseAuthority, sceneKey: string = 'Game'): void {
  sharedPauseAuthority = pa;
  parentSceneKey = sceneKey;
}

export function setAudioManager(am: AudioManager): void {
  sharedAudioManager = am;
}

// ─── Slider helper ─────────────────────────────────────────

interface SliderObjects {
  label: Phaser.GameObjects.Text;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  handle: Phaser.GameObjects.Rectangle;
  valueText: Phaser.GameObjects.Text;
}

function createSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial: number,
  onChange: (value: number) => void,
): SliderObjects {
  const TRACK_WIDTH = 200;
  const TRACK_HEIGHT = 8;
  const HANDLE_SIZE = 16;

  const labelText = scene.add.text(x - TRACK_WIDTH / 2, y - 20, label, {
    fontFamily: 'monospace', fontSize: '14px', color: '#cccccc',
  });

  const valueText = scene.add.text(x + TRACK_WIDTH / 2 + 10, y - 6, `${Math.round(initial * 100)}%`, {
    fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
  });

  const track = scene.add.rectangle(x, y, TRACK_WIDTH, TRACK_HEIGHT, 0x444444);
  const fill = scene.add.rectangle(
    x - TRACK_WIDTH / 2 + (initial * TRACK_WIDTH) / 2,
    y,
    initial * TRACK_WIDTH,
    TRACK_HEIGHT,
    0x00cc66,
  ).setOrigin(0, 0.5).setPosition(x - TRACK_WIDTH / 2, y);
  fill.width = initial * TRACK_WIDTH;

  const handleX = x - TRACK_WIDTH / 2 + initial * TRACK_WIDTH;
  const handle = scene.add.rectangle(handleX, y, HANDLE_SIZE, HANDLE_SIZE, 0xffffff)
    .setInteractive({ useHandCursor: true, draggable: true });

  // Drag handling
  scene.input.setDraggable(handle);
  handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
    const minX = x - TRACK_WIDTH / 2;
    const maxX = x + TRACK_WIDTH / 2;
    const clampedX = Math.max(minX, Math.min(maxX, dragX));
    handle.x = clampedX;
    const value = (clampedX - minX) / TRACK_WIDTH;
    fill.width = value * TRACK_WIDTH;
    valueText.setText(`${Math.round(value * 100)}%`);
    onChange(value);
  });

  // Click on track to jump
  track.setInteractive({ useHandCursor: true });
  track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const minX = x - TRACK_WIDTH / 2;
    const maxX = x + TRACK_WIDTH / 2;
    const clampedX = Math.max(minX, Math.min(maxX, pointer.x));
    handle.x = clampedX;
    const value = (clampedX - minX) / TRACK_WIDTH;
    fill.width = value * TRACK_WIDTH;
    valueText.setText(`${Math.round(value * 100)}%`);
    onChange(value);
  });

  return { label: labelText, track, fill, handle, valueText };
}

// ─── PauseMenuScene ────────────────────────────────────────

export class PauseMenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  private settingsPanel: Phaser.GameObjects.GameObject[] = [];
  private mainPanel: Phaser.GameObjects.GameObject[] = [];
  private showingSettings: boolean = false;

  constructor() {
    super({ key: 'PauseMenu' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.showingSettings = false;

    // Semi-transparent background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.createMainPanel(width, height);
    this.setupKeyboard();
  }

  private createMainPanel(width: number, height: number): void {
    // PAUSED title
    const title = this.add.text(width / 2, height / 3, 'PAUSED', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.mainPanel.push(title);

    // Resume
    const resumeBtn = this.add.text(width / 2, height / 2 - 25, '[ RESUME ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.resumeGame());
    resumeBtn.on('pointerover', () => { this.selectedIndex = 0; this.updateSelection(); });
    this.mainPanel.push(resumeBtn);

    // Settings
    const settingsBtn = this.add.text(width / 2, height / 2 + 25, '[ SETTINGS ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this.showSettings());
    settingsBtn.on('pointerover', () => { this.selectedIndex = 1; this.updateSelection(); });
    this.mainPanel.push(settingsBtn);

    // Quit to Menu
    const quitBtn = this.add.text(width / 2, height / 2 + 75, '[ QUIT TO MENU ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quitBtn.on('pointerdown', () => this.quitToMenu());
    quitBtn.on('pointerover', () => { this.selectedIndex = 2; this.updateSelection(); });
    this.mainPanel.push(quitBtn);

    this.buttons = [resumeBtn, settingsBtn, quitBtn];
    this.selectedIndex = 0;
    this.updateSelection();
  }

  private showSettings(): void {
    this.showingSettings = true;

    // Hide main panel
    for (const obj of this.mainPanel) {
      (obj as unknown as { setVisible(v: boolean): void }).setVisible(false);
    }

    const { width, height } = this.scale;
    const settings = sharedAudioManager?.getSettings();

    // Title
    const title = this.add.text(width / 2, height / 4, 'AUDIO SETTINGS', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.settingsPanel.push(title);

    // Sliders
    const masterSlider = createSlider(this, width / 2, height / 2 - 60, 'Master', settings?.masterVolume ?? 0.7, (v) => {
      sharedAudioManager?.setChannelVolume('master', v);
    });
    this.settingsPanel.push(masterSlider.label, masterSlider.track, masterSlider.fill, masterSlider.handle, masterSlider.valueText);

    const sfxSlider = createSlider(this, width / 2, height / 2, 'SFX', settings?.sfxVolume ?? 0.8, (v) => {
      sharedAudioManager?.setChannelVolume('sfx', v);
    });
    this.settingsPanel.push(sfxSlider.label, sfxSlider.track, sfxSlider.fill, sfxSlider.handle, sfxSlider.valueText);

    const ambientSlider = createSlider(this, width / 2, height / 2 + 60, 'Ambient', settings?.ambientVolume ?? 0.5, (v) => {
      sharedAudioManager?.setChannelVolume('ambient', v);
    });
    this.settingsPanel.push(ambientSlider.label, ambientSlider.track, ambientSlider.fill, ambientSlider.handle, ambientSlider.valueText);

    // Mute toggle
    const muteState = settings?.muteAll ?? false;
    const muteBtn = this.add.text(width / 2, height / 2 + 130, muteState ? '[ UNMUTE ALL ]' : '[ MUTE ALL ]', {
      fontFamily: 'monospace', fontSize: '20px', color: muteState ? '#ff4444' : '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      const current = sharedAudioManager?.getSettings().muteAll ?? false;
      sharedAudioManager?.setMute(!current);
      muteBtn.setText(!current ? '[ UNMUTE ALL ]' : '[ MUTE ALL ]');
      muteBtn.setColor(!current ? '#ff4444' : '#ffffff');
    });
    this.settingsPanel.push(muteBtn);

    // Back button
    const backBtn = this.add.text(width / 2, height / 2 + 190, '[ BACK ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffcc00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.hideSettings());
    this.settingsPanel.push(backBtn);
  }

  private hideSettings(): void {
    this.showingSettings = false;

    // Destroy settings panel
    for (const obj of this.settingsPanel) {
      obj.destroy();
    }
    this.settingsPanel = [];

    // Show main panel
    for (const obj of this.mainPanel) {
      (obj as unknown as { setVisible(v: boolean): void }).setVisible(true);
    }

    this.updateSelection();
  }

  private setupKeyboard(): void {
    const cursors = this.input.keyboard!.createCursorKeys();
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    cursors.up.on('down', () => {
      if (this.showingSettings) return;
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    });
    cursors.down.on('down', () => {
      if (this.showingSettings) return;
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    });
    enterKey.on('down', () => {
      if (this.showingSettings) return;
      this.confirmSelection();
    });
    spaceKey.on('down', () => {
      if (this.showingSettings) return;
      this.confirmSelection();
    });
    escKey.on('down', () => {
      if (this.showingSettings) {
        this.hideSettings();
      } else {
        this.resumeGame();
      }
    });
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i]!.setColor(i === this.selectedIndex ? '#ffcc00' : '#ffffff');
    }
  }

  private confirmSelection(): void {
    if (this.selectedIndex === 0) this.resumeGame();
    if (this.selectedIndex === 1) this.showSettings();
    if (this.selectedIndex === 2) this.quitToMenu();
  }

  private resumeGame(): void {
    sharedPauseAuthority?.release(PAUSE_REASONS.MENU);
    this.scene.wake(parentSceneKey);
    this.scene.wake('HUD');
    this.scene.stop('PauseMenu');
  }

  private quitToMenu(): void {
    this.scene.stop(parentSceneKey);
    this.scene.stop('HUD');
    SceneTransition.startScene(this, 'MainMenu');
  }
}
