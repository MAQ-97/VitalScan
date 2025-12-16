export interface VitalsResult {
  heartRate: number;
  respiratoryRate?: number;
  hrv?: number; // Heart Rate Variability (SDNN)
  confidence: number;
  timestamp: string;
}

export enum AppState {
  LANDING = 'LANDING',
  SCANNING = 'SCANNING',
  RESULTS = 'RESULTS',
  TRIAGE = 'TRIAGE',
  ERROR = 'ERROR'
}

export interface ProcessingConfig {
  windowSize: number; // Number of frames to keep for analysis
  samplingRate: number; // Estimated FPS
}
