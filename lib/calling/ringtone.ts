/**
 * Generates an audio ring tone WAV as a Blob for HTMLAudioElement playback.
 * Extracted from Meta WebRTC Calling module for modularity and testability.
 */
export function generateRingToneBlob(type: 'inbound' | 'outbound'): Blob {
  const sampleRate = 8000;
  const duration = type === 'inbound' ? 4 : 6;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (type === 'inbound') {
      // Soft warbling ring: two short bursts per 3s cycle
      const cycleLen = 3.0;
      const phase = t % cycleLen;
      const inRing = phase < 0.5 || (phase >= 0.7 && phase < 1.2);
      if (inRing) {
        const burstT = phase < 0.5 ? phase : phase - 0.7;
        const burstLen = phase < 0.5 ? 0.5 : 0.5;
        const attack = Math.min(1, burstT / 0.03);
        const release = Math.min(1, (burstLen - burstT) / 0.05);
        const env = attack * release;
        const tremolo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 20 * t);
        sample = Math.sin(2 * Math.PI * 523 * t) * 0.12 * env * tremolo;
      }
    } else {
      // Gentle ringback: 440Hz for 2s, silence 4s
      if (t % 6 < 2) {
        const env = Math.min(1, (2 - (t % 6)) / 0.2);
        sample = Math.sin(2 * Math.PI * 440 * t) * 0.08 * env;
      }
    }
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
