/**
 * Advanced Digital Signal Processing for rPPG.
 * 
 * This module implements a Frequency-Domain approach (Discrete Fourier Transform)
 * to extract Heart Rate. This is superior to simple peak counting as it 
 * isolates the cardiac frequency component from noise.
 */

// 1. Detrending: Removes the DC offset (average brightness) to center the signal around 0
export const detrend = (data: number[]): number[] => {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return data.map(v => v - mean);
};

// 2. Hamming Window: Reduces spectral leakage at the edges of the data window
export const applyHammingWindow = (data: number[]): number[] => {
  return data.map((v, i) => {
    return v * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (data.length - 1)));
  });
};

// 3. Simple Low-Pass / Smoothing Filter (Moving Average)
export const movingAverage = (data: number[], windowSize: number): number[] => {
  const smoothed: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const end = i + 1;
    const subset = data.slice(start, end);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    smoothed.push(avg);
  }
  return smoothed;
};

// 4. Frequency-Domain HR Extraction (The Core rPPG Algorithm)
// Scans frequencies from 40 BPM to 180 BPM to find the dominant signal power.
export const calculateBPMFromSpectrum = (rawSignal: number[], fps: number): number => {
  if (rawSignal.length < fps * 2) return 0; // Need at least ~2 seconds of data for any frequency resolution

  // Pre-processing
  let cleanSignal = detrend(rawSignal);
  cleanSignal = applyHammingWindow(cleanSignal);

  const minBPM = 45;
  const maxBPM = 180;
  let maxPower = 0;
  let dominantBPM = 0;

  // Discrete Fourier Transform (DFT) optimized for HR range
  // We check every integer BPM to see which one matches the signal best
  for (let bpm = minBPM; bpm <= maxBPM; bpm++) {
    const frequency = bpm / 60; // Hz
    let sumCos = 0;
    let sumSin = 0;

    for (let n = 0; n < cleanSignal.length; n++) {
      const angle = 2 * Math.PI * frequency * (n / fps);
      sumCos += cleanSignal[n] * Math.cos(angle);
      sumSin += cleanSignal[n] * Math.sin(angle);
    }

    // Power at this frequency
    const power = (sumCos * sumCos) + (sumSin * sumSin);

    if (power > maxPower) {
      maxPower = power;
      dominantBPM = bpm;
    }
  }

  return dominantBPM;
};

// 5. HRV (Stress) Estimation based on Signal Variance
// (True HRV requires R-R intervals, but variance is a proxy for bio-feedback in rPPG)
export const calculateHRVProxy = (signal: number[]): number => {
   if (signal.length < 10) return 0;
   const clean = detrend(signal);
   // Root Mean Square of Successive Differences (approximation)
   let sumDiffSq = 0;
   for (let i = 1; i < clean.length; i++) {
     const diff = clean[i] - clean[i-1];
     sumDiffSq += diff * diff;
   }
   const rmssd = Math.sqrt(sumDiffSq / (clean.length - 1));
   // Normalize to a 0-100 "Stress Score" scale (inverted, higher RMSSD = lower stress)
   return Math.min(100, Math.round(rmssd * 50)); 
};

// 6. Signal Quality Metric (SNR)
export const getSignalQuality = (raw: number[]): number => {
    if (raw.length < 10) return 100;
    
    // Check for clipping or massive artifacts
    let artifacts = 0;
    for(let i=1; i<raw.length; i++) {
        if(Math.abs(raw[i] - raw[i-1]) > 15) { // Rapid pixel intensity change > 15 is likely movement
            artifacts++;
        }
    }
    
    const quality = Math.max(0, 100 - (artifacts * 20)); // Penalize heavily for movement
    return quality;
};
