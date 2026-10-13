/** RMS of the real decoded recording, bounded to 48 display bars. */
export function recordingPeaks(buffer: AudioBuffer, bars = 48): number[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  const step = Math.max(1, Math.ceil(buffer.length / bars));
  const peaks = Array.from({ length: bars }, (_, index) => {
    const start = index * step;
    const end = Math.min(start + step, buffer.length);
    let squares = 0;
    let count = 0;
    for (let sample = start; sample < end; sample += Math.max(1, Math.floor(step / 256))) {
      for (const channel of channels) { squares += channel[sample] ** 2; count++; }
    }
    return count ? Math.sqrt(squares / count) : 0;
  });
  const maximum = Math.max(...peaks, 0.001);
  return peaks.map((peak) => Math.max(0.06, peak / maximum));
}

export function audioTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
