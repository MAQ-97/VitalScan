import React from 'react';
import { VitalsResult } from '../types';
import { Activity, Wind, Brain, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ResultCardProps {
  vitals: VitalsResult;
  onRetake: () => void;
  onTriage: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ vitals, onRetake, onTriage }) => {
  const isHighQuality = vitals.confidence > 70;

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Header */}
      <div className="bg-teal-600 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
        <h2 className="text-2xl font-bold relative z-10">Scan Complete</h2>
        <p className="text-teal-100 text-sm relative z-10 opacity-90">{new Date(vitals.timestamp).toLocaleTimeString()}</p>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Signal Quality Warning */}
        {!isHighQuality && (
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
             <p className="text-xs text-amber-800">
               Low signal confidence detected. Lighting or movement may have affected accuracy. Consider retaking.
             </p>
           </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Heart Rate */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="bg-rose-100 p-2 rounded-full mb-2">
              <Activity className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Heart Rate</span>
            <span className="text-3xl font-bold text-slate-800">{vitals.heartRate}</span>
            <span className="text-xs text-slate-400">BPM</span>
          </div>

          {/* Respiratory Rate */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="bg-sky-100 p-2 rounded-full mb-2">
              <Wind className="w-6 h-6 text-sky-600" />
            </div>
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Resp. Rate</span>
            <span className="text-3xl font-bold text-slate-800">{vitals.respiratoryRate || '--'}</span>
            <span className="text-xs text-slate-400">BPM</span>
          </div>

          {/* HRV / Stress */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center col-span-2 hover:shadow-md transition-shadow">
             <div className="flex items-center gap-2 mb-2">
                <div className="bg-violet-100 p-2 rounded-full">
                  <Brain className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Stress Index (HRV)</span>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{vitals.hrv}</span>
                <span className="text-xs text-slate-400">ms (SDNN)</span>
             </div>
             <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-orange-400" 
                  style={{ width: `${Math.min(100, Math.max(0, (vitals.hrv || 0) / 100 * 100))}%` }}
                />
             </div>
             <div className="flex justify-between w-full mt-1 px-1">
                <span className="text-[10px] text-slate-400">High Stress</span>
                <span className="text-[10px] text-slate-400">Relaxed</span>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <button 
            onClick={onTriage}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Proceed to AI Triage
          </button>
          
          <button 
            onClick={onRetake}
            className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3.5 rounded-xl transition-colors"
          >
            Retake Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
