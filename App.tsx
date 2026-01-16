
import React, { useState, useEffect, useRef } from 'react';
import { EnglishLevel, Scenario, PronunciationCheckResponse, SavedSession } from './types';
import { SCENARIOS } from './constants';
import Header from './components/Header';
import ScenarioCard from './components/ScenarioCard';
import SessionView from './components/SessionView';
import { Lightbulb, BookOpen, Trash2, Mic, Square, Volume2, Ear, History, ChevronRight, Download, X, Code } from 'lucide-react';
import { LOCAL_STORAGE_HISTORY_KEY, getHistoryFromLocalStorage, clearHistoryFromLocalStorage, decode, decodeAudioData, getSavedSessionsFromLocalStorage, clearSavedSessionsFromLocalStorage, downloadFile } from './utils';
import { analyzePronunciation, generateSpeech } from './services/geminiService';
import { Spinner } from './components/Spinner';

const ScoreBar: React.FC<{ label: string; score: number; colorClass: string; displayValue?: string }> = ({ label, score, colorClass, displayValue }) => {
  const clampedScoreForBar = Math.max(0, Math.min(10, score));
  const labelScore = Math.max(1, Math.min(10, Math.round(score)));
  
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 text-sm font-semibold text-slate-600">{label}</span>
      <div className="flex-grow h-3 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${clampedScoreForBar * 10}%` }}></div>
      </div>
      <span className="w-12 text-right text-sm font-bold text-slate-700">{displayValue || `${labelScore}/10`}</span>
    </div>
  );
};

const MouthShapeIcon: React.FC<{ type: 'rounded' | 'wide' | 'tongue_up' | 'relaxed' }> = ({ type }) => {
  return (
    <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-100 shadow-sm flex items-center justify-center p-2">
      {type === 'rounded' && <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400 fill-current"><circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="4" fill="none" /><path d="M35 50 Q50 65 65 50" stroke="currentColor" strokeWidth="2" fill="none" className="text-rose-600" /></svg>}
      {type === 'wide' && <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400 fill-current"><ellipse cx="50" cy="50" rx="35" ry="15" stroke="currentColor" strokeWidth="4" fill="none" /><path d="M25 50 Q50 70 75 50" stroke="currentColor" strokeWidth="2" fill="none" className="text-rose-600" /></svg>}
      {type === 'tongue_up' && <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400"><path d="M20 60 Q50 90 80 60" stroke="currentColor" strokeWidth="4" fill="none" /><path d="M40 70 Q50 40 60 70" fill="#FB7185" /></svg>}
      {type === 'relaxed' && <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400"><path d="M30 50 Q50 55 70 50" stroke="currentColor" strokeWidth="4" fill="none" /></svg>}
    </div>
  );
};

const App: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState<EnglishLevel>(EnglishLevel.INTERMEDIATE);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [targetPronunciationText, setTargetPronunciationText] = useState<string>('');
  const [isPronunciationRecording, setIsPronunciationRecording] = useState<boolean>(false);
  const [isPronunciationProcessing, setIsPronunciationProcessing] = useState<boolean>(false);
  const [userPronunciationAudioBase64, setUserPronunciationAudioBase64] = useState<string | null>(null);
  const [pronunciationAnalysisResult, setPronunciationAnalysisResult] = useState<PronunciationCheckResponse | null>(null);
  const [pronunciationApiError, setPronunciationApiError] = useState<string | null>(null);
  const [correctPronunciationAudioBase64, setCorrectPronunciationAudioBase64] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = async () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playAudio = async (base64: string | null) => {
    if (!base64) return;
    try {
      const ctx = await getAudioCtx();
      const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) { setPronunciationApiError("Audio playback failed."); }
  };

  const startPronunciationRecording = async () => {
    setPronunciationApiError(null);
    setPronunciationAnalysisResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processPronunciation(blob, 'audio/webm');
        setIsPronunciationRecording(false);
      };
      recorder.start();
      setIsPronunciationRecording(true);
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 5000);
    } catch (err) { 
      setPronunciationApiError("Mic access denied."); 
      setIsPronunciationRecording(false);
    }
  };

  const handleTogglePronunciationRecording = () => {
    if (isPronunciationRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (targetPronunciationText.trim()) {
        startPronunciationRecording();
      } else {
        setPronunciationApiError("Please enter a word or phrase first.");
      }
    }
  };

  const processPronunciation = async (blob: Blob, mimeType: string) => {
    setIsPronunciationProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setUserPronunciationAudioBase64(base64);
      try {
        const res = await analyzePronunciation(base64, targetPronunciationText, mimeType);
        setPronunciationAnalysisResult(res);
        const correct = await generateSpeech(targetPronunciationText);
        setCorrectPronunciationAudioBase64(correct);
      } catch (e) { setPronunciationApiError("Analysis failed."); }
      setIsPronunciationProcessing(false);
    };
  };

  const handleDownloadHistory = () => {
    const content = getHistoryFromLocalStorage();
    if (!content || content === '[]') { alert('No history to download.'); return; }
    downloadFile('engfluent_learning_history.json', content, 'application/json');
  };

  const savedSessions = getSavedSessionsFromLocalStorage();

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      <Header currentLevel={currentLevel} setLevel={setCurrentLevel} onGoHome={() => setActiveScenario(null)} />
      <main className="flex-grow px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
        {!activeScenario ? (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">Choose a Situation</h2>
              <button onClick={() => setActiveScenario({ id: 'self-study', title: 'Self-Study', titleKr: '자유 연습', icon: 'Lightbulb', description: 'Practice speaking freely.', systemPromptContext: 'Speak freely!' })} className="mt-4 bg-secondary hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 mx-auto"><Lightbulb size={20} /> Start Free Practice</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{SCENARIOS.map(s => <ScenarioCard key={s.id} scenario={s} onClick={() => setActiveScenario(s)} />)}</div>

            <div className="mt-12 p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3"><Ear size={24} className="text-purple-500" /> Pronunciation Check</h3>
              {pronunciationApiError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                   <X size={16} /> {pronunciationApiError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input type="text" placeholder="Type word/phrase..." className="flex-grow p-3 border rounded-xl bg-slate-800 text-white" value={targetPronunciationText} onChange={e => setTargetPronunciationText(e.target.value)} />
                <button 
                  onClick={handleTogglePronunciationRecording} 
                  disabled={isPronunciationProcessing}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition-all ${isPronunciationRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'} flex items-center justify-center gap-2 min-w-[120px]`}
                >
                  {isPronunciationProcessing ? <Spinner className="w-5 h-5" /> : (isPronunciationRecording ? <Square size={20} /> : <Mic size={20} />)}
                  {isPronunciationProcessing ? 'Processing...' : (isPronunciationRecording ? 'Stop' : 'Record')}
                </button>
              </div>
              {pronunciationAnalysisResult && (
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 animate-fade-in">
                  <ScoreBar label="Score" score={pronunciationAnalysisResult.pronunciationScore} colorClass="bg-purple-500" />
                  <p className="mt-3 text-sm"><strong>You said:</strong> "{pronunciationAnalysisResult.transcript}"</p>
                  <p className="mt-1 text-sm text-slate-600"><strong>AI Tutor:</strong> {pronunciationAnalysisResult.explanationEn}</p>
                  <div className="flex gap-4 mt-4 justify-center">
                    <button onClick={() => playAudio(userPronunciationAudioBase64)} className="text-sm font-medium flex items-center gap-2 text-slate-600 hover:text-slate-800"><Volume2 size={16} /> Play Yours</button>
                    <button onClick={() => playAudio(correctPronunciationAudioBase64)} className="text-sm font-medium flex items-center gap-2 text-purple-600 hover:text-purple-800"><Volume2 size={16} /> Play Correct</button>
                  </div>
                </div>
              )}
            </div>

            {savedSessions.length > 0 && (
              <div className="mt-12 p-8 bg-blue-50 rounded-2xl border border-blue-100">
                <h3 className="text-2xl font-bold flex items-center gap-3"><History size={24} className="text-primary" /> Review Sessions</h3>
                <div className="mt-6 space-y-3">
                  {savedSessions.map(s => <button key={s.id} onClick={() => { setActiveScenario(s.scenario); setCurrentLevel(s.level); setReviewingSessionId(s.id); }} className="w-full bg-white p-4 rounded-xl border flex justify-between items-center hover:shadow-sm transition-shadow"><div><p className="font-bold text-left">{s.scenario.title}</p><p className="text-xs text-slate-400">{s.timestamp}</p></div><ChevronRight size={18} /></button>)}
                  <button onClick={() => { clearSavedSessionsFromLocalStorage(); window.location.reload(); }} className="text-red-500 text-xs flex items-center gap-1 mx-auto mt-4 hover:underline"><Trash2 size={14}/> Clear All Saved Sessions</button>
                </div>
              </div>
            )}

            <div className="mt-12 text-center text-slate-500">
              <p className="text-sm">Learning data saved as <strong>JSON</strong> in Local Storage.</p>
              <div className="flex justify-center gap-4 mt-4">
                <button onClick={() => setShowHistoryModal(true)} className="text-primary hover:text-blue-600 text-sm font-medium flex items-center gap-1"><Code size={16} /> View JSON History</button>
                <button onClick={handleDownloadHistory} className="text-emerald-500 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"><Download size={16} /> Download JSON</button>
                <button onClick={() => { if(window.confirm('Clear all history?')) { clearHistoryFromLocalStorage(); alert('History cleared.'); window.location.reload(); } }} className="text-red-500 text-sm font-medium flex items-center gap-1 hover:underline"><Trash2 size={16} /> Clear History</button>
              </div>
            </div>

            {showHistoryModal && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h3 className="font-bold flex items-center gap-2"><Code size={20} className="text-primary"/> Raw History (JSON)</h3><button onClick={() => setShowHistoryModal(false)} className="hover:bg-slate-200 p-1 rounded-full"><X size={24}/></button></div>
                  <div className="p-6 overflow-y-auto flex-grow bg-slate-900 text-emerald-400 font-mono text-xs whitespace-pre-wrap">{getHistoryFromLocalStorage()}</div>
                  <div className="p-4 border-t flex justify-end gap-3"><button onClick={handleDownloadHistory} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"><Download size={16}/> Download</button><button onClick={() => setShowHistoryModal(false)} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-lg transition-colors">Close</button></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <SessionView level={currentLevel} scenario={activeScenario} onBack={() => { setActiveScenario(null); setReviewingSessionId(null); }} reviewSessionId={reviewingSessionId || undefined} />
        )}
      </main>
      <footer className="py-6 text-center text-slate-400 text-sm border-t bg-white mt-auto"><p>© {new Date().getFullYear()} EngFluent. JSON Powered History.</p></footer>
    </div>
  );
};
export default App;
