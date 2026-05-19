/**
 * RIFF/WAVE header wrap for raw PCM.
 *
 * Port from UMB precedent (`projects/undercover-mob-boss/scripts/generate-narrator.ts`
 * lines 127-162), generalized for sample-rate parameter. UMB hardcoded
 * 24kHz (Gemini fixed rate); Phase 2 uses this wrapper for ElevenLabs
 * `pcm_48000` output too — same algorithm, different rate.
 *
 * Mono / 16-bit / signed LE PCM only — matches Phase 2 design lock
 * (single-voice narration, LUFS-normalized post-process step).
 *
 * Header layout (44 bytes):
 *   0-3   'RIFF'                  | 22-23 channels (=1)
 *   4-7   fileSize - 8            | 24-27 sampleRate
 *   8-11  'WAVE'                  | 28-31 byteRate = sr*ch*bps/8
 *   12-15 'fmt '                  | 32-33 blockAlign = ch*bps/8
 *   16-19 16 (fmt chunk size)     | 34-35 bitsPerSample (=16)
 *   20-21 1 (PCM format code)     | 36-39 'data'
 *                                 | 40-43 dataSize
 *                                 | 44+   raw PCM payload
 */
import { Buffer } from 'node:buffer';

const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const dataSize = pcm.length;
  const byteRate = sampleRate * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

/**
 * Cheap structural validity check — catches raw PCM that wasn't wrapped
 * via pcmToWav. Called at the write boundary so a defective engine
 * response surfaces immediately rather than at Phase 4 Remotion render.
 */
export function isValidWav(buf: Buffer): boolean {
  if (buf.length < 44) return false;
  return (
    buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE'
  );
}
