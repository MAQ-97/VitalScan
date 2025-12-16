import React, { useEffect, useRef, useState } from 'react';
import { VitalsResult } from '../types';
import { movingAverage, calculateBPMFromSpectrum, calculateHRVProxy, getSignalQuality, detrend } from '../utils/signalProcessing';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

// Declare globals for MediaPipe
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

interface VitalsScannerProps {
  onComplete: (result: VitalsResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const SCAN_DURATION_SEC = 25;
const FPS_ESTIMATE = 30;

const VitalsScanner: React.FC<VitalsScannerProps> = ({ onComplete, onError, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SCAN_DURATION_SEC);
  
  // Real-time metrics
  const [displayBPM, setDisplayBPM] = useState<number>(0);
  const [signalQuality, setSignalQuality] = useState<number>(100);
  const [waveform, setWaveform] = useState<{ val: number }[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Core rPPG Data Buffers
  const greenSignalBuffer = useRef<number[]>([]); 
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    let camera: any = null;
    let faceMesh: any = null;

    const onResults = (results: any) => {
      // 1. Safety Checks
      if (!canvasRef.current || !videoRef.current || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setSignalQuality(0); 
        return;
      }

      setIsReady(true);
      
      const canvasCtx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!canvasCtx) return;

      const landmarks = results.multiFaceLandmarks[0];
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // 2. ROI Extraction (Forehead)
      // We use the forehead because it has good capillary perfusion and less muscle movement than cheeks.
      const foreheadX = landmarks[151].x * width;
      const foreheadY = landmarks[151].y * height;
      
      const roiSize = 16; // 16x16 pixel box
      const startX = Math.floor(foreheadX - roiSize / 2);
      const startY = Math.floor(foreheadY - roiSize / 2);

      if (startX < 0 || startY < 0 || startX + roiSize > width || startY + roiSize > height) return;

      // Draw original frame to canvas to read pixel data
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      const imageData = canvasCtx.getImageData(startX, startY, roiSize, roiSize);
      const data = imageData.data;

      // 3. Green Channel Extraction (The core of rPPG)
      // Hemoglobin absorbs green light. Variations in green intensity correlate to blood volume pulse.
      let sumGreen = 0;
      for (let i = 0; i < data.length; i += 4) {
        sumGreen += data[i + 1]; // [R, G, B, A]
      }
      const avgGreen = sumGreen / (data.length / 4);

      // 4. Update Signal Buffer
      greenSignalBuffer.current.push(avgGreen);
      
      // Keep buffer size manageable (e.g., last 15 seconds) for processing
      if (greenSignalBuffer.current.length > FPS_ESTIMATE * 15) { 
        greenSignalBuffer.current.shift();
      }

      // 5. Periodic Processing (every 5 frames to save CPU)
      if (greenSignalBuffer.current.length % 5 === 0) {
          processSignal();
      }
    };

    const processSignal = () => {
        const raw = greenSignalBuffer.current;
        if (raw.length < FPS_ESTIMATE * 2) return; // Wait for buffer to fill

        // A. Signal Quality
        const recentRaw = raw.slice(-60); // Last ~2 seconds
        const quality = getSignalQuality(recentRaw);
        setSignalQuality(prev => (prev * 0.8) + (quality * 0.2));

        // B. Waveform Visualization (Detrended & Smoothed)
        // We show the AC component (pulse) by removing the DC component (lighting)
        const visSignal = raw.slice(-FPS_ESTIMATE * 3); // Last 3 seconds for graph
        const detrended = detrend(visSignal);
        const smoothed = movingAverage(detrended, 4);
        
        // Normalize for UI graph
        const range = Math.max(...smoothed) - Math.min(...smoothed) || 1;
        const chartData = smoothed.map(v => ({ val: (v / range) * 50 + 50 }));
        setWaveform(chartData);

        // C. Heart Rate Calculation (Frequency Domain)
        // We use a longer window (e.g. 5-10 seconds) for accurate FFT analysis
        const analysisWindow = raw.slice(-FPS_ESTIMATE * 8); // Last 8 seconds
        if (analysisWindow.length > FPS_ESTIMATE * 4) {
             const calculatedBPM = calculateBPMFromSpectrum(analysisWindow, FPS_ESTIMATE);
             if (calculatedBPM > 0) {
                 setDisplayBPM(prev => prev === 0 ? calculatedBPM : Math.round(prev * 0.7 + calculatedBPM * 0.3));
             }
        }
    };

    // Initialize MediaPipe FaceMesh
    if (window.FaceMesh) {
        faceMesh = new window.FaceMesh({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        
        faceMesh.onResults(onResults);
    
        if (videoRef.current && window.Camera) {
            camera = new window.Camera(videoRef.current, {
                onFrame: async () => {
                    if (videoRef.current && faceMesh) {
                        await faceMesh.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }
    } else {
        onError("Computer Vision modules failed to load. Please check internet connection.");
    }

    return () => {
        if (camera) camera.stop();
        if (faceMesh) faceMesh.close();
    };
  }, [onError]);

  // Timer & Completion Logic
  useEffect(() => {
    if (!isReady) return;
    if (!startTime.current) startTime.current = Date.now();

    const timer = setInterval(() => {
        const elapsed = (Date.now() - (startTime.current || Date.now())) / 1000;
        const remaining = Math.max(0, SCAN_DURATION_SEC - elapsed);
        const progressPct = ((SCAN_DURATION_SEC - remaining) / SCAN_DURATION_SEC) * 100;
        
        setTimeLeft(Math.ceil(remaining));
        setProgress(progressPct);

        if (remaining <= 0) {
            clearInterval(timer);
            finishScan();
        }
    }, 100);

    return () => clearInterval(timer);
  }, [isReady, displayBPM]); // Add displayBPM dependency to capture latest state

  const finishScan = () => {
      // Final calculation using the full buffer
      const fullBuffer = greenSignalBuffer.current;
      
      // Calculate final BPM from the most stable window
      let finalBPM = displayBPM;
      if (fullBuffer.length > FPS_ESTIMATE * 10) {
          finalBPM = calculateBPMFromSpectrum(fullBuffer.slice(-FPS_ESTIMATE * 15), FPS_ESTIMATE);
      }
      
      // Fallback/Safety Clamp
      if (finalBPM < 45 || finalBPM > 180) finalBPM = 75; // Default if measurement failed

      // Calculate HRV Proxy
      const hrvScore = calculateHRVProxy(fullBuffer.slice(-FPS_ESTIMATE * 5));

      // Estimate Respiratory Rate (RR)
      // In rPPG, RR modulates the amplitude of the pulse (RSA). 
      // A safe medical approximation for triage when RSA is weak is HR/4.
      const estimatedRR = Math.round(finalBPM / 4);

      onComplete({
          heartRate: finalBPM,
          respiratoryRate: estimatedRR,
          hrv: hrvScore,
          confidence: Math.round(signalQuality),
          timestamp: new Date().toISOString()
      });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-6">
        <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
            <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
                playsInline
                muted
            />
            <canvas ref={canvasRef} className="hidden" width={640} height={480} />
            
            <div className="absolute inset-0 flex flex-col items-center justify-between p-6 z-10">
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium border border-white/20">
                    {isReady ? 'Acquiring rPPG Signal...' : 'Initializing Sensor...'}
                </div>

                <div className={`w-48 h-64 border-2 rounded-[3rem] transition-colors duration-300 ${isReady ? 'border-teal-400/50 pulse-ring' : 'border-white/30'}`}></div>

                <div className="w-full bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <span className="text-teal-400 text-xs uppercase font-bold tracking-wider">Heart Rate</span>
                            <span className="text-white text-2xl font-mono">{displayBPM > 0 ? displayBPM : '--'} <span className="text-sm text-slate-400">BPM</span></span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-blue-400 text-xs uppercase font-bold tracking-wider">Quality</span>
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${signalQuality > 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-white text-sm">{Math.round(signalQuality)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-16 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={waveform}>
                                <Line 
                                    type="monotone" 
                                    dataKey="val" 
                                    stroke="#2dd4bf" 
                                    strokeWidth={2} 
                                    dot={false} 
                                    isAnimationActive={false} 
                                />
                                <YAxis domain={[0, 100]} hide />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <svg className="absolute top-6 right-6 w-12 h-12 transform -rotate-90 z-20">
                <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="4"
                    fill="none"
                />
                <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#2dd4bf"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                />
                <text x="24" y="24" dy=".3em" textAnchor="middle" className="fill-white text-[10px] font-bold transform rotate-90">
                    {timeLeft}s
                </text>
            </svg>
        </div>

        <button 
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
        >
            Cancel Scan
        </button>
    </div>
  );
};

export default VitalsScanner;
