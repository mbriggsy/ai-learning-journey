/**
 * Audio asset generation pipeline for Hide and Seek.
 *
 * - jsfxr for procedural SFX (footsteps, doors, ticks, stings, sonar)
 * - Raw PCM synthesis for ambient (drone, creaks, heartbeat)
 * - ffmpeg for WAV → OGG + MP3 conversion
 * - All exported at -9 to -12 dB headroom
 *
 * Run: node scripts/generate-audio.mjs
 *
 * NOTE: This is a build script, not application code. execSync is used with
 * hardcoded arguments (no user input) for ffmpeg format conversion.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sfxr } from 'jsfxr';

const OUT_DIR = path.resolve('public/assets/audio');
const SAMPLE_RATE = 44100;
const HEADROOM_GAIN = 0.3; // ~-10 dB headroom when stacking

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── WAV helpers ────────────────────────────────────────────

function writeWav(filePath, samples, sampleRate = SAMPLE_RATE, channels = 1) {
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(headerSize - 8 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;       // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;        // PCM
  buffer.writeUInt16LE(channels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

// ─── jsfxr SFX generation ──────────────────────────────────

function jsfxrToSamples(sound) {
  const wave = sfxr.toWave(sound);
  // wave.wav is a Uint8Array of the full WAV file
  const wavBuf = Buffer.from(wave.wav);
  // Parse samples from WAV data (skip 44-byte header)
  const dataOffset = 44;
  const sampleCount = (wavBuf.length - dataOffset) / 2;
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = wavBuf.readInt16LE(dataOffset + i * 2) / 32768;
  }
  return samples;
}

// ─── Raw PCM synthesis ─────────────────────────────────────

function generateSine(freq, duration, gain = HEADROOM_GAIN) {
  const len = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * gain;
  }
  return samples;
}

function generateNoise(duration, gain = HEADROOM_GAIN) {
  const len = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    samples[i] = (Math.random() * 2 - 1) * gain;
  }
  return samples;
}

function applyEnvelope(samples, attackS, decayS, sustainLevel, releaseS) {
  const result = new Float32Array(samples.length);
  const attackLen = Math.round(attackS * SAMPLE_RATE);
  const decayLen = Math.round(decayS * SAMPLE_RATE);
  const releaseLen = Math.round(releaseS * SAMPLE_RATE);
  const sustainLen = samples.length - attackLen - decayLen - releaseLen;

  for (let i = 0; i < samples.length; i++) {
    let env;
    if (i < attackLen) {
      env = i / attackLen;
    } else if (i < attackLen + decayLen) {
      const t = (i - attackLen) / decayLen;
      env = 1 - t * (1 - sustainLevel);
    } else if (i < attackLen + decayLen + Math.max(0, sustainLen)) {
      env = sustainLevel;
    } else {
      const t = (i - attackLen - decayLen - Math.max(0, sustainLen)) / releaseLen;
      env = sustainLevel * (1 - Math.min(1, t));
    }
    result[i] = samples[i] * (env || 0);
  }
  return result;
}

function lowPassFilter(samples, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  const result = new Float32Array(samples.length);
  result[0] = samples[0] * alpha;
  for (let i = 1; i < samples.length; i++) {
    result[i] = result[i - 1] + alpha * (samples[i] - result[i - 1]);
  }
  return result;
}

function mixSamples(...arrays) {
  const maxLen = Math.max(...arrays.map(a => a.length));
  const result = new Float32Array(maxLen);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      result[i] += arr[i];
    }
  }
  return result;
}

function fadeInOut(samples, fadeInS, fadeOutS) {
  const result = new Float32Array(samples);
  const fadeInLen = Math.round(fadeInS * SAMPLE_RATE);
  const fadeOutLen = Math.round(fadeOutS * SAMPLE_RATE);
  for (let i = 0; i < fadeInLen && i < result.length; i++) {
    result[i] *= i / fadeInLen;
  }
  for (let i = 0; i < fadeOutLen && i < result.length; i++) {
    const idx = result.length - 1 - i;
    result[idx] *= i / fadeOutLen;
  }
  return result;
}

// ─── Sound definitions ─────────────────────────────────────

function generatePlayerFootsteps() {
  for (let i = 1; i <= 3; i++) {
    const sound = sfxr.generate('click', {
      oldParams: true,
      sample_rate: SAMPLE_RATE,
      sample_size: 16,
      sound_vol: HEADROOM_GAIN * 0.7,
      p_env_sustain: 0.02 + Math.random() * 0.02,
      p_env_decay: 0.05 + Math.random() * 0.03,
      p_base_freq: 0.15 + Math.random() * 0.05,
      p_lpf_freq: 0.3 + Math.random() * 0.1,
      p_hpf_freq: 0.02,
    });
    const samples = jsfxrToSamples(sound);
    writeWav(path.join(OUT_DIR, `footstep_player_${String(i).padStart(2, '0')}.wav`), samples);
  }
}

function generateSeekerFootsteps() {
  for (let i = 1; i <= 3; i++) {
    const sound = sfxr.generate('click', {
      oldParams: true,
      sample_rate: SAMPLE_RATE,
      sample_size: 16,
      sound_vol: HEADROOM_GAIN * 0.9,
      p_env_sustain: 0.04 + Math.random() * 0.03,
      p_env_decay: 0.08 + Math.random() * 0.04,
      p_base_freq: 0.08 + Math.random() * 0.04,
      p_lpf_freq: 0.25 + Math.random() * 0.08,
      p_hpf_freq: 0.01,
      wave_type: 3, // noise base for heavy thump
    });
    const samples = jsfxrToSamples(sound);
    writeWav(path.join(OUT_DIR, `footstep_seeker_${String(i).padStart(2, '0')}.wav`), samples);
  }
}

function generateDoorSounds() {
  for (let i = 1; i <= 2; i++) {
    const duration = 0.4 + Math.random() * 0.2;
    const len = Math.round(SAMPLE_RATE * duration);
    const samples = new Float32Array(len);
    for (let j = 0; j < len; j++) {
      const t = j / SAMPLE_RATE;
      const freq = 200 + Math.sin(t * 8) * 150 + Math.random() * 50;
      samples[j] = (Math.sin(2 * Math.PI * freq * t) * 0.5 + (Math.random() * 2 - 1) * 0.3) * HEADROOM_GAIN;
    }
    const filtered = lowPassFilter(samples, 800);
    const enveloped = applyEnvelope(filtered, 0.02, 0.1, 0.6, duration * 0.3);
    writeWav(path.join(OUT_DIR, `door_creak_${String(i).padStart(2, '0')}.wav`), enveloped);
  }

  const thudNoise = generateNoise(0.15, HEADROOM_GAIN * 1.2);
  const thudFiltered = lowPassFilter(thudNoise, 200);
  const thudSine = generateSine(60, 0.15, HEADROOM_GAIN * 0.8);
  const thudMixed = mixSamples(thudFiltered, thudSine);
  const thud = applyEnvelope(thudMixed, 0.001, 0.05, 0.3, 0.08);
  writeWav(path.join(OUT_DIR, 'door_thud.wav'), thud);
}

function generateCountdownTick() {
  const sound = sfxr.generate('click', {
    oldParams: true,
    sample_rate: SAMPLE_RATE,
    sample_size: 16,
    sound_vol: HEADROOM_GAIN,
    p_env_sustain: 0.01,
    p_env_decay: 0.04,
    p_base_freq: 0.55,
    p_hpf_freq: 0.3,
    wave_type: 0,
  });
  const samples = jsfxrToSamples(sound);
  writeWav(path.join(OUT_DIR, 'countdown_tick.wav'), samples);
}

function generateFoundSting() {
  const hit = generateNoise(0.1, HEADROOM_GAIN * 1.5);
  const hitFiltered = lowPassFilter(hit, 400);
  const hitEnv = applyEnvelope(hitFiltered, 0.001, 0.03, 0.5, 0.06);

  const len = Math.round(SAMPLE_RATE * 1.5);
  const tone = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 220 * Math.pow(0.5, t * 0.8);
    tone[i] = (Math.sin(2 * Math.PI * freq * t) * 0.4 +
               Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.2 +
               Math.sin(2 * Math.PI * freq * 2 * t) * 0.1) * HEADROOM_GAIN;
  }
  const toneEnv = applyEnvelope(tone, 0.01, 0.3, 0.4, 0.8);
  const hitPadded = new Float32Array(len);
  hitPadded.set(hitEnv);
  const mixed = mixSamples(hitPadded, toneEnv);
  writeWav(path.join(OUT_DIR, 'sting_found.wav'), mixed);
}

function generateSurvivedSting() {
  const duration = 1.5;
  const len = Math.round(SAMPLE_RATE * duration);
  const chord = new Float32Array(len);
  const freqs = [262, 330, 392, 524]; // C major: C4 E4 G4 C5
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (const freq of freqs) {
      const ascending = freq * (1 + t * 0.05);
      sample += Math.sin(2 * Math.PI * ascending * t) * 0.2;
    }
    chord[i] = sample * HEADROOM_GAIN;
  }
  const enveloped = applyEnvelope(chord, 0.05, 0.2, 0.7, 0.6);
  writeWav(path.join(OUT_DIR, 'sting_survived.wav'), enveloped);
}

function generateSonarPing() {
  const duration = 0.6;
  const len = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * 1200 * t) * HEADROOM_GAIN * 0.6;
  }
  const enveloped = applyEnvelope(samples, 0.005, 0.05, 0.3, 0.45);
  writeWav(path.join(OUT_DIR, 'sonar_ping.wav'), enveloped);
}

function generateHuntDrone() {
  const duration = 3.0;
  const len = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = (
      Math.sin(2 * Math.PI * 55 * t) * 0.35 +
      Math.sin(2 * Math.PI * 82.5 * t) * 0.2 +
      Math.sin(2 * Math.PI * 110 * t) * 0.1 +
      (Math.random() * 2 - 1) * 0.05
    ) * HEADROOM_GAIN;
  }
  const filtered = lowPassFilter(samples, 200);
  const enveloped = fadeInOut(filtered, 0.5, 1.0);
  writeWav(path.join(OUT_DIR, 'hunt_drone.wav'), enveloped);
}

function generateAmbientDrone() {
  const duration = 15.0;
  const len = Math.round(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const mod = 1 + Math.sin(2 * Math.PI * 0.1 * t) * 0.15;
    samples[i] = (
      Math.sin(2 * Math.PI * 50 * t) * 0.3 * mod +
      Math.sin(2 * Math.PI * 75 * t) * 0.15 * mod +
      Math.sin(2 * Math.PI * 100 * t) * 0.08 +
      (Math.random() * 2 - 1) * 0.04
    ) * HEADROOM_GAIN;
  }
  const filtered = lowPassFilter(samples, 120);
  // Crossfade first/last 0.5s for seamless loop
  const crossfadeLen = Math.round(0.5 * SAMPLE_RATE);
  for (let i = 0; i < crossfadeLen; i++) {
    const t = i / crossfadeLen;
    filtered[i] = filtered[i] * t + filtered[len - crossfadeLen + i] * (1 - t);
  }
  const loopSamples = filtered.slice(0, len - crossfadeLen);
  writeWav(path.join(OUT_DIR, 'ambient_drone.wav'), loopSamples);
}

function generateCreaks() {
  for (let i = 1; i <= 3; i++) {
    const duration = 0.3 + Math.random() * 0.5;
    const len = Math.round(SAMPLE_RATE * duration);
    const samples = new Float32Array(len);
    const baseFreq = 300 + Math.random() * 400;
    const sweepRate = 2 + Math.random() * 4;

    for (let j = 0; j < len; j++) {
      const t = j / SAMPLE_RATE;
      const freq = baseFreq + Math.sin(t * sweepRate * 2 * Math.PI) * 200;
      samples[j] = (
        Math.sin(2 * Math.PI * freq * t) * 0.3 +
        (Math.random() * 2 - 1) * 0.5
      ) * HEADROOM_GAIN * 0.5;
    }
    const filtered = lowPassFilter(samples, 1200);
    const enveloped = applyEnvelope(filtered, 0.01, 0.05, 0.5, duration * 0.5);
    writeWav(path.join(OUT_DIR, `creak_${String(i).padStart(2, '0')}.wav`), enveloped);
  }
}

function generateHeartbeat() {
  // Single beat at ~70 BPM for seamless loop
  const beatInterval = 60 / 70; // 0.857s
  const len = Math.round(SAMPLE_RATE * beatInterval);
  const samples = new Float32Array(len);

  // Lub (deeper)
  const lub = generateSine(50, 0.08, 0.9);
  const lubEnv = applyEnvelope(lub, 0.005, 0.02, 0.4, 0.04);

  // Dub (slightly higher, 150ms after)
  const dub = generateSine(65, 0.06, 0.6);
  const dubEnv = applyEnvelope(dub, 0.003, 0.015, 0.3, 0.03);

  const dubOffset = Math.round(0.15 * SAMPLE_RATE);
  for (let i = 0; i < lubEnv.length && i < len; i++) {
    samples[i] += lubEnv[i];
  }
  for (let i = 0; i < dubEnv.length && dubOffset + i < len; i++) {
    samples[dubOffset + i] += dubEnv[i];
  }

  for (let i = 0; i < len; i++) {
    samples[i] *= HEADROOM_GAIN;
  }

  const filtered = lowPassFilter(samples, 200);
  writeWav(path.join(OUT_DIR, 'heartbeat.wav'), filtered);
}

// ─── Format conversion ────────────────────────────────────

function convertFormats() {
  const wavFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.wav'));

  for (const wavFile of wavFiles) {
    const baseName = wavFile.replace('.wav', '');
    const wavPath = path.join(OUT_DIR, wavFile);
    const oggPath = path.join(OUT_DIR, `${baseName}.ogg`);
    const mp3Path = path.join(OUT_DIR, `${baseName}.mp3`);

    try {
      // WAV → OGG (Vorbis) — hardcoded args, no user input
      execFileSync('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libvorbis', '-q:a', '4', oggPath],
        { stdio: 'pipe' });

      // WAV → MP3
      execFileSync('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libmp3lame', '-q:a', '4', mp3Path],
        { stdio: 'pipe' });

      // Remove WAV (keep ogg + mp3 only)
      fs.unlinkSync(wavPath);

      console.log(`  ${baseName}: .ogg + .mp3`);
    } catch (e) {
      console.error(`  FAILED: ${baseName} — ${e.message}`);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────

console.log('Generating audio assets...\n');

console.log('Player footsteps (3 variants)...');
generatePlayerFootsteps();

console.log('Seeker footsteps (3 variants)...');
generateSeekerFootsteps();

console.log('Door sounds (2 creak + 1 thud)...');
generateDoorSounds();

console.log('Countdown tick...');
generateCountdownTick();

console.log('Found sting...');
generateFoundSting();

console.log('Survived sting...');
generateSurvivedSting();

console.log('Sonar ping...');
generateSonarPing();

console.log('Hunt drone...');
generateHuntDrone();

console.log('Ambient drone (15s loop)...');
generateAmbientDrone();

console.log('Creaks (3 variants)...');
generateCreaks();

console.log('Heartbeat (70 BPM loop)...');
generateHeartbeat();

console.log('\nConverting to .ogg + .mp3 (dual format)...');
convertFormats();

const finalFiles = fs.readdirSync(OUT_DIR).sort();
console.log(`\nDone! ${finalFiles.length} files in ${OUT_DIR}:`);
for (const f of finalFiles) {
  const stat = fs.statSync(path.join(OUT_DIR, f));
  console.log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
}
