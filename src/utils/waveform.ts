/**
 * Web Audio API Waveform Extraction and Normalization Utilities
 */

// Cache of decoded waveforms by audioSrc key to avoid redundant decoding
const waveformCache = new Map<string, number[]>();

/**
 * Extracts normalized peak data (0.05 to 1.0) from an audio data URL or blob URL.
 * Uses AudioContext.decodeAudioData for true acoustic waveform fidelity.
 */
export async function extractWaveformData(
  audioSrc: string,
  targetBars: number = 40
): Promise<number[]> {
  if (!audioSrc) {
    return generateFallbackWaveform(targetBars);
  }

  if (waveformCache.has(audioSrc)) {
    return waveformCache.get(audioSrc)!;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      const fallback = generateFallbackWaveform(targetBars, audioSrc);
      waveformCache.set(audioSrc, fallback);
      return fallback;
    }

    const response = await fetch(audioSrc);
    const arrayBuffer = await response.arrayBuffer();

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const channelData = audioBuffer.getChannelData(0); // primary channel
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / targetBars);
    const peaks: number[] = [];

    for (let i = 0; i < targetBars; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let sum = 0;
      let maxVal = 0;

      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        sum += val;
        if (val > maxVal) maxVal = val;
      }

      // Blend RMS and peak amplitude for rich, dynamic visual spikes
      const avg = sum / (end - start || 1);
      const combined = avg * 0.4 + maxVal * 0.6;
      peaks.push(combined);
    }

    // Normalize peaks between 0.15 and 1.0 for aesthetic display
    const maxPeak = Math.max(...peaks, 0.001);
    const normalized = peaks.map((p) => {
      const norm = p / maxPeak;
      // Logarithmic scaling for human ear perception + minimum aesthetic height
      return Math.max(0.12, Math.min(1.0, Math.pow(norm, 0.75)));
    });

    waveformCache.set(audioSrc, normalized);
    return normalized;
  } catch (err) {
    console.warn('Audio decoding fallback to heuristic waveform:', err);
    const fallback = generateFallbackWaveform(targetBars, audioSrc);
    waveformCache.set(audioSrc, fallback);
    return fallback;
  }
}

/**
 * Generates an aesthetic, deterministic organic waveform for voice notes when raw decoding is deferred.
 */
export function generateFallbackWaveform(bars: number = 40, seedString?: string): number[] {
  let seed = 42;
  if (seedString) {
    for (let i = 0; i < seedString.length; i++) {
      seed = (seed * 31 + seedString.charCodeAt(i)) % 1000000;
    }
  }

  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const result: number[] = [];
  let prev = 0.4;

  for (let i = 0; i < bars; i++) {
    // Natural conversational speech envelope (quieter at start/end, organic pulses in middle)
    const envelope = Math.sin((i / (bars - 1)) * Math.PI) * 0.4 + 0.6;
    const rawVariation = random() * 0.6 + 0.2;
    const smooth = prev * 0.35 + rawVariation * 0.65;
    prev = smooth;

    const val = Math.max(0.15, Math.min(1.0, smooth * envelope));
    result.push(val);
  }

  return result;
}
