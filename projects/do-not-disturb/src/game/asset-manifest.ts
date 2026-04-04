export type SpriteAsset = {
  readonly key: string;
  readonly frames: number;
  readonly width: number;
  readonly height: number;
  readonly category: 'character' | 'furniture' | 'prop' | 'door' | 'effect';
};

export type SoundAsset = {
  readonly key: string;
  readonly category: 'footstep' | 'monster' | 'ambient' | 'ui' | 'music';
  readonly loop: boolean;
  readonly spatial: boolean;
};

// --- Character sprites ---

export const KID_SPRITES: readonly SpriteAsset[] = [
  { key: 'kid-idle', frames: 4, width: 48, height: 64, category: 'character' },
  { key: 'kid-walk', frames: 6, width: 48, height: 64, category: 'character' },
  { key: 'kid-run', frames: 8, width: 48, height: 64, category: 'character' },
  { key: 'kid-sneak', frames: 4, width: 48, height: 64, category: 'character' },
  { key: 'kid-jump', frames: 3, width: 48, height: 64, category: 'character' },
  { key: 'kid-slide', frames: 2, width: 64, height: 48, category: 'character' },
  { key: 'kid-hide', frames: 1, width: 32, height: 32, category: 'character' },
  { key: 'kid-caught', frames: 1, width: 48, height: 64, category: 'character' },
];

export const BELLHOP_SPRITES: readonly SpriteAsset[] = [
  { key: 'bellhop-patrol', frames: 4, width: 48, height: 80, category: 'character' },
  { key: 'bellhop-rush', frames: 6, width: 48, height: 80, category: 'character' },
  { key: 'bellhop-investigate', frames: 3, width: 48, height: 80, category: 'character' },
  { key: 'bellhop-confused', frames: 2, width: 48, height: 80, category: 'character' },
  { key: 'bellhop-catch', frames: 4, width: 48, height: 80, category: 'character' },
];

export const HOUSEKEEPER_SPRITES: readonly SpriteAsset[] = [
  { key: 'housekeeper-patrol', frames: 4, width: 56, height: 64, category: 'character' },
  { key: 'housekeeper-check', frames: 3, width: 56, height: 64, category: 'character' },
  { key: 'housekeeper-skip', frames: 2, width: 56, height: 64, category: 'character' },
  { key: 'housekeeper-catch', frames: 4, width: 56, height: 64, category: 'character' },
];

export const GUEST_SPRITES: readonly SpriteAsset[] = [
  { key: 'guest-disguised', frames: 1, width: 32, height: 32, category: 'character' },
  { key: 'guest-unfold', frames: 6, width: 48, height: 64, category: 'character' },
  { key: 'guest-lunge', frames: 3, width: 64, height: 64, category: 'character' },
  { key: 'guest-fold', frames: 6, width: 48, height: 64, category: 'character' },
  { key: 'guest-catch', frames: 4, width: 48, height: 64, category: 'character' },
];

// --- Sounds ---

export const SOUND_ASSETS: readonly SoundAsset[] = [
  // Footsteps
  { key: 'footstep-carpet', category: 'footstep', loop: false, spatial: true },
  { key: 'footstep-wood', category: 'footstep', loop: false, spatial: true },
  { key: 'footstep-tile', category: 'footstep', loop: false, spatial: true },
  { key: 'jump-land', category: 'footstep', loop: false, spatial: true },
  { key: 'slide-whoosh', category: 'footstep', loop: false, spatial: true },

  // World
  { key: 'door-creak', category: 'ui', loop: false, spatial: true },
  { key: 'elevator-ding', category: 'ui', loop: false, spatial: true },
  { key: 'breath-hold', category: 'ui', loop: true, spatial: false },
  { key: 'gasp', category: 'ui', loop: false, spatial: false },
  { key: 'lighter-flick', category: 'ui', loop: false, spatial: true },
  { key: 'phone-ring', category: 'ui', loop: true, spatial: true },

  // Monster tells
  { key: 'bellhop-hum', category: 'monster', loop: true, spatial: true },
  { key: 'bellhop-bell', category: 'monster', loop: false, spatial: true },
  { key: 'bellhop-lantern', category: 'monster', loop: true, spatial: true },
  { key: 'housekeeper-wheels', category: 'monster', loop: true, spatial: true },
  { key: 'housekeeper-mutter', category: 'monster', loop: true, spatial: true },
  { key: 'housekeeper-mop', category: 'monster', loop: true, spatial: true },
  { key: 'housekeeper-tut', category: 'monster', loop: false, spatial: true },
  { key: 'guest-rustle', category: 'monster', loop: false, spatial: true },

  // Ambient
  { key: 'rain-loop', category: 'ambient', loop: true, spatial: false },
  { key: 'thunder', category: 'ambient', loop: false, spatial: false },
  { key: 'pipe-groan', category: 'ambient', loop: false, spatial: true },
  { key: 'clock-tick', category: 'ambient', loop: true, spatial: true },
  { key: 'elevator-cable', category: 'ambient', loop: true, spatial: true },

  // Music
  { key: 'music-box', category: 'music', loop: true, spatial: false },
];

export function getAllSpriteAssets(): readonly SpriteAsset[] {
  return [...KID_SPRITES, ...BELLHOP_SPRITES, ...HOUSEKEEPER_SPRITES, ...GUEST_SPRITES];
}
