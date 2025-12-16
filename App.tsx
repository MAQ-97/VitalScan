import React, { useState } from 'react';
import { AppState, VitalsResult } from './types';
import VitalsScanner from './components/VitalsScanner';
import ResultCard from './components/ResultCard';
import { generateTriageReport } from './services/geminiService';
import { Heart, ShieldCheck, Stethoscope, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [vitals, setVitals] = useState<VitalsResult | null>(null);
  const [triageReport, setTriageReport] = useState<string>("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startScan = () => {
    setErrorMsg(null);
    setAppState(AppState.SCANNING);
  };

  const handleScanComplete = (result: VitalsResult) => {
    setVitals(result);
    setAppState(AppState.RESULTS);
  };

  const handleScanError = (msg: string) => {
    setErrorMsg(msg);
    setAppState(AppState.ERROR);
  };

  const handleTriage = async () => {
    if (!vitals) return;
    setAppState(AppState.TRIAGE);
    setIsAnalysing(true);
    try {
      const report = await generateTriageReport(vitals);
      setTriageReport(report);
    } catch (e) {
      setTriageReport("Connection failed. Please allow manual review.");
    } finally {
      setIsAnalysing(false);
    }
  };

  const resetApp = () => {
    setVitals(null);
    setTriageReport("");
    setErrorMsg(null);
    setAppState(AppState.LANDING);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100">
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-600 p-1.5 rounded-lg">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">VitalScan <span className="text-teal-600">AI</span></span>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">
            DEMO VERSION
          </div>
        </div>
      </header>

      <main className="pt-20 pb-10 px-4 min-h-screen flex flex-col items-center justify-center max-w-3xl mx-auto">
        
        {/* LANDING STATE */}
        {appState === AppState.LANDING && (
          <div className="text-center space-y-8 animate-in fade-in duration-700">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Contactless Health <br/>
                <span className="text-teal-600">Screening</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
                AI-powered vital sign monitoring using just your camera. Designed for rapid triage in rural healthcare.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
              {[
                { icon: Stethoscope, title: "Medical Grade", desc: "rPPG signal extraction algorithms." },
                { icon: ShieldCheck, title: "Privacy First", desc: "100% On-device processing. No video upload." },
                { icon: Heart, title: "Wellness Check", desc: "HR, RR, and Stress analysis." }
              ].map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <item.icon className="w-8 h-8 text-teal-600 mb-3" />
                  <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={startScan}
              className="group relative inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold py-4 px-10 rounded-full shadow-xl shadow-teal-200 transition-all transform hover:scale-105"
            >
              Start Wellness Scan
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className="text-xs text-slate-400 mt-8 max-w-sm mx-auto">
              Disclaimer: This is a wellness tool, not a diagnostic medical device. Always verify with manual tools.
            </p>
          </div>
        )}

        {/* SCANNING STATE */}
        {appState === AppState.SCANNING && (
          <VitalsScanner 
            onComplete={handleScanComplete}
            onError={handleScanError}
            onCancel={resetApp}
          />
        )}

        {/* RESULTS STATE */}
        {appState === AppState.RESULTS && vitals && (
          <ResultCard 
            vitals={vitals}
            onRetake={startScan}
            onTriage={handleTriage}
          />
        )}

        {/* TRIAGE STATE */}
        {appState === AppState.TRIAGE && (
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
             <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="font-semibold">AI Triage Assistant</span>
                </div>
                <button onClick={resetApp} className="text-slate-400 hover:text-white text-sm">Close Session</button>
             </div>

             <div className="p-6 flex-1 overflow-y-auto">
                {isAnalysing ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-70">
                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                    <p className="text-slate-500 font-medium">Analyzing vital patterns...</p>
                    <p className="text-xs text-slate-400">Comparing against triage protocols</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none">
                     <ReactMarkdown>{triageReport}</ReactMarkdown>
                  </div>
                )}
             </div>
             
             {!isAnalysing && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button onClick={resetApp} className="w-full py-3 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                      Start New Patient Session
                    </button>
                </div>
             )}
          </div>
        )}

        {/* ERROR STATE */}
        {appState === AppState.ERROR && (
           <div className="text-center space-y-4 max-w-md">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">System Error</h2>
              <p className="text-slate-600">{errorMsg || "An unexpected error occurred."}</p>
              <button 
                onClick={resetApp}
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Restart Application
              </button>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;
