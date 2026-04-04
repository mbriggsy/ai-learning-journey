import { describe, it, expect } from 'vitest';
import { getFootstepConfig, getMonsterSounds, MONSTER_SOUNDS } from '../../src/game/sound-config';
import { AUDIO } from '../../src/constants';

describe('getFootstepConfig', () => {
  it('returns carpet footstep for walk on carpet', () => {
    const cfg = getFootstepConfig('carpet', 'walk');
    expect(cfg).not.toBeNull();
    expect(cfg!.soundKey).toBe('footstep-carpet');
    expect(cfg!.intervalS).toBe(AUDIO.FOOTSTEP_INTERVAL_WALK_S);
  });

  it('returns wood footstep for run on wood', () => {
    const cfg = getFootstepConfig('wood', 'run');
    expect(cfg!.soundKey).toBe('footstep-wood');
    expect(cfg!.intervalS).toBe(AUDIO.FOOTSTEP_INTERVAL_RUN_S);
  });

  it('returns tile footstep for sneak on tile', () => {
    const cfg = getFootstepConfig('tile', 'sneak');
    expect(cfg!.soundKey).toBe('footstep-tile');
    expect(cfg!.intervalS).toBe(AUDIO.FOOTSTEP_INTERVAL_SNEAK_S);
  });

  it('returns null for idle (no footsteps)', () => {
    expect(getFootstepConfig('wood', 'idle')).toBeNull();
  });

  it('returns null for jump (no footsteps)', () => {
    expect(getFootstepConfig('wood', 'jump')).toBeNull();
  });

  it('returns null for slide (no footsteps)', () => {
    expect(getFootstepConfig('carpet', 'slide')).toBeNull();
  });
});

describe('getMonsterSounds', () => {
  it('bellhop has ambient hum', () => {
    const sounds = getMonsterSounds('bellhop');
    expect(sounds!.ambient).toBe('bellhop-hum');
    expect(sounds!.alert).toBe('bellhop-bell');
  });

  it('housekeeper has ambient wheels', () => {
    const sounds = getMonsterSounds('housekeeper');
    expect(sounds!.ambient).toBe('housekeeper-wheels');
  });

  it('guest has NO ambient (silence is the tell)', () => {
    const sounds = getMonsterSounds('guest');
    expect(sounds!.ambient).toBeNull();
    expect(sounds!.alert).toBe('guest-rustle');
  });

  it('unknown monster returns null', () => {
    expect(getMonsterSounds('unknown')).toBeNull();
  });

  it('all 3 monsters have distinct sound sets', () => {
    const keys = Object.keys(MONSTER_SOUNDS);
    expect(keys).toContain('bellhop');
    expect(keys).toContain('housekeeper');
    expect(keys).toContain('guest');
  });
});
