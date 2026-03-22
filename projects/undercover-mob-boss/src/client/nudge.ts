// ── Nudge Engine ──────────────────────────────────────────────────
// Client-side escalating nudge system. When it's the player's turn,
// escalates from silence → gentle → firm → urgent with vibration + tone.
// No server involvement — driven entirely by isMyTurn transitions.

import { audioEngine } from './audio/audio-engine';

export type NudgeLevel = 0 | 1 | 2 | 3;

interface NudgeScheduleEntry {
  delay: number;
  level: NudgeLevel;
  vibrationPattern: number[] | null;
  toneFrequency: number;
  toneDuration: number;
}

const SCHEDULE: NudgeScheduleEntry[] = [
  { delay: 30_000, level: 1, vibrationPattern: [200], toneFrequency: 440, toneDuration: 150 },
  { delay: 60_000, level: 2, vibrationPattern: [400, 100, 400], toneFrequency: 660, toneDuration: 200 },
  { delay: 90_000, level: 3, vibrationPattern: [800, 200, 800], toneFrequency: 880, toneDuration: 300 },
];

const URGENT_REPEAT_MS = 15_000;

let timers: ReturnType<typeof setTimeout>[] = [];
let urgentInterval: ReturnType<typeof setInterval> | null = null;
let currentLevel: NudgeLevel = 0;
let activeCallback: ((level: NudgeLevel) => void) | null = null;

let userHasInteracted = false;
if (typeof document !== 'undefined') {
  const markInteracted = () => { userHasInteracted = true; };
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
}

function vibrate(pattern: number[]): void {
  if (userHasInteracted && typeof navigator !== 'undefined') {
    navigator.vibrate?.(pattern);
  }
  if (typeof document !== 'undefined') {
    // iOS fallback — apply CSS shake class to screen container
    const container = document.getElementById('app');
    if (container) {
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 500);
    }
  }
}

function playTone(frequency: number, duration: number): void {
  if (!audioEngine.isUnlocked()) return;

  const ctx = audioEngine.getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = 0.3;

  // Fade out to avoid click
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

  osc.connect(gain);
  gain.connect(audioEngine.getChannelGain('sfx'));

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration / 1000);
}

function fireNudge(entry: NudgeScheduleEntry): void {
  currentLevel = entry.level;
  activeCallback?.(currentLevel);

  if (entry.vibrationPattern) {
    vibrate(entry.vibrationPattern);
  }
  playTone(entry.toneFrequency, entry.toneDuration);
}

export function startNudgeTimer(callback: (level: NudgeLevel) => void): void {
  stopNudgeTimer();
  currentLevel = 0;
  activeCallback = callback;

  for (const entry of SCHEDULE) {
    const id = setTimeout(() => {
      fireNudge(entry);

      // Level 3 repeats every 15s
      if (entry.level === 3) {
        urgentInterval = setInterval(() => fireNudge(entry), URGENT_REPEAT_MS);
      }
    }, entry.delay);
    timers.push(id);
  }
}

export function stopNudgeTimer(): void {
  for (const id of timers) clearTimeout(id);
  timers = [];
  if (urgentInterval !== null) {
    clearInterval(urgentInterval);
    urgentInterval = null;
  }
  currentLevel = 0;
  activeCallback = null;
}

export function getCurrentLevel(): NudgeLevel {
  return currentLevel;
}
