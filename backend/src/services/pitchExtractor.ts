// YIN pitch detection algorithm (de Cheveigné & Kawahara, 2002)
// Frame size 2048 + hop 256 at 22050 Hz → ~11.6ms resolution, handles down to ~80Hz

const FRAME_SIZE = 2048;
const HOP_SIZE = 256;
const THRESHOLD = 0.15;
const MIN_HZ = 60;
const MAX_HZ = 600;
const MEDIAN_WINDOW = 5;

function yinPitch(frame: Float32Array, sampleRate: number): number {
  const half = Math.floor(frame.length / 2);
  const diff = new Float32Array(half);

  // Difference function
  for (let tau = 1; tau < half; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const d = frame[i] - frame[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Cumulative mean normalized difference
  const cmndf = new Float32Array(half);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < half; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  // Find first local minimum below threshold
  let tau = 2;
  while (tau < half - 1) {
    if (cmndf[tau] < THRESHOLD) {
      while (tau + 1 < half && cmndf[tau + 1] < cmndf[tau]) tau++;
      break;
    }
    tau++;
  }

  if (tau >= half - 1 || cmndf[tau] >= THRESHOLD) return 0;

  // Parabolic interpolation for sub-sample accuracy
  let refinedTau = tau;
  if (tau > 0 && tau < half - 1) {
    const s0 = cmndf[tau - 1];
    const s1 = cmndf[tau];
    const s2 = cmndf[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      const adj = (s2 - s0) / denom;
      if (isFinite(adj) && Math.abs(adj) < 1) refinedTau += adj;
    }
  }

  const hz = sampleRate / refinedTau;
  return hz >= MIN_HZ && hz <= MAX_HZ ? hz : 0;
}

function medianFilter(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - half), Math.min(values.length, i + half + 1))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (slice.length === 0) return 0;
    return slice[Math.floor(slice.length / 2)];
  });
}

export interface PitchFrame {
  time: number;
  pitch: number;
}

export function extractPitchFrames(samples: Float32Array, sampleRate: number): PitchFrame[] {
  const rawPitches: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + FRAME_SIZE <= samples.length; i += HOP_SIZE) {
    rawPitches.push(yinPitch(samples.slice(i, i + FRAME_SIZE), sampleRate));
    times.push(i / sampleRate);
  }

  const smoothed = medianFilter(rawPitches, MEDIAN_WINDOW);

  return times.map((time, i) => ({ time, pitch: smoothed[i] }));
}

export function scorePitch(
  userFrames: PitchFrame[],
  refFrames: PitchFrame[],
  refDuration: number
): { overall: number; totalFrames: number; scoredFrames: number; avgDeviationCents: number } {
  const TOLERANCE_CENTS = 50;
  const userDuration = userFrames[userFrames.length - 1]?.time ?? refDuration;

  let total = 0;
  let scored = 0;
  let deviationSum = 0;

  for (const rf of refFrames) {
    if (rf.pitch < MIN_HZ) continue;
    total++;

    // Map reference time to user time proportionally
    const normalizedT = refDuration > 0 ? rf.time / refDuration : 0;
    const targetUserT = normalizedT * userDuration;

    // Find closest user frame
    let closest: PitchFrame | null = null;
    let minDist = Infinity;
    for (const uf of userFrames) {
      const d = Math.abs(uf.time - targetUserT);
      if (d < minDist) { minDist = d; closest = uf; }
      if (uf.time > targetUserT + 0.5) break; // optimization: frames are sorted
    }

    if (!closest || closest.pitch < MIN_HZ) continue;

    const cents = Math.abs(1200 * Math.log2(closest.pitch / rf.pitch));
    deviationSum += cents;
    if (cents <= TOLERANCE_CENTS) scored++;
  }

  return {
    overall: total > 0 ? Math.round((scored / total) * 100) : 0,
    totalFrames: total,
    scoredFrames: scored,
    avgDeviationCents: total > 0 ? Math.round(deviationSum / total) : 0,
  };
}
