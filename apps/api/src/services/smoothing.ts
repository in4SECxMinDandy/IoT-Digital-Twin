export function calculateMovingAverage(previousSamples: number[], nextSample: number, windowSize: number): number {
  const samples = [...previousSamples.slice(0, Math.max(0, windowSize - 1)), nextSample];
  const total = samples.reduce((sum, sample) => sum + sample, 0);
  return total / samples.length;
}
