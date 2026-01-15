import React, { useState, useEffect, useRef } from 'react';
import { EnglishLevel, Scenario, PronunciationCheckResponse, PronunciationTip, SavedSession } from './types';
import { SCENARIOS } from './constants';
import Header from './components/Header';
import ScenarioCard from './components/ScenarioCard';
import SessionView from './components/SessionView';
import { Lightbulb, BookOpen, Trash2, Mic, Square, Volume2, Ear, BarChart2, AlertTriangle, Info, History, ChevronRight, Download, X } from 'lucide-react'; // Import History and ChevronRight icon
import { LOCAL_STORAGE_EXPLANATION_KEY, getExplanationsFromLocalStorage, clearExplanationsFromLocalStorage, decode, decodeAudioData, LOCAL_STORAGE_SESSIONS_KEY, getSavedSessionsFromLocalStorage, clearSavedSessionsFromLocalStorage, downloadTextFile } from './utils';
import { analyzePronunciation, generateSpeech } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { format } from 'date-fns';

// Reusable ScoreBar Component (moved from FeedbackDisplay)
const ScoreBar: React.FC<{ label: string; score: number; colorClass: string; displayValue?: string }> = ({ label, score, colorClass, displayValue }) => {
  // Clamp score for visual bar to be between 0 and 10 for width calculation
  const clampedScore = Math.max(0, Math.min(10, score));
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 text-sm font-semibold text-slate-600">{label}</span>
      <div className="flex-grow h-3 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
          style={{ width: `${clampedScore * 10}%` }}
        ></div>
      </div>
      <span className="w-fit text-right text-sm font-bold text-slate-700">{displayValue || `${score}/10`}</span>
    </div>
  );
};

// Reusable MouthShapeIcon Component (moved from FeedbackDisplay)
const MouthShapeIcon: React.FC<{ type: 'rounded' | 'wide' | 'tongue_up' | 'relaxed' }> = ({ type }) => {
  return (
    <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-100 shadow-sm flex items-center justify-center p-2">
      {type === 'rounded' && (
         <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400 fill-current">
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="4" fill="none" />
            <path d="M35 50 Q50 65 65 50" stroke="currentColor" strokeWidth="2" fill="none" className="text-rose-600" />
            <text x="50" y="95" fontSize="12" textAnchor="middle" className="fill-slate-400">Rounded</text>
         </svg>
      )}
      {type === 'wide' && (
        <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400 fill-current">
           <ellipse cx="50" cy="50" rx="35" ry="15" stroke="currentColor" strokeWidth="4" fill="none" />
           <path d="M25 50 Q50 70 75 50" stroke="currentColor" strokeWidth="2" fill="none" className="text-rose-600" />
           <text x="50" y="95" fontSize="12" textAnchor="middle" className="fill-slate-400">Wide</text>
        </svg>
      )}
      {type === 'tongue_up' && (
        <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400">
            <path d="M20 60 Q50 90 80 60" stroke="currentColor" strokeWidth="4" fill="none" />
            <path d="M40 70 Q50 40 60 70" fill="#FB7185" />
            <text x="50" y="95" fontSize="12" textAnchor="middle" className="fill-slate-400">Tongue Up</text>
        </svg>
      )}
      {type === 'relaxed' && (
         <svg viewBox="0 0 100 100" className="w-full h-full text-rose-400">
           <path d="M30 50 Q50 55 70 50" stroke="currentColor" strokeWidth="4" fill="none" />
           <text x="50" y="95" fontSize="12" textAnchor="middle" className="fill-slate-400">Relaxed</text>
         </svg>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState<EnglishLevel>(EnglishLevel.INTERMEDIATE);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null); // New state for reviewing past sessions

  // Pronunciation Check States
  const [targetPronunciationText, setTargetPronunciationText] = useState<string>('');
  const [isPronunciationRecording, setIsPronunciationRecording] = useState<boolean>(false);
  const [isPronunciationProcessing, setIsPronunciationProcessing] = useState<boolean>(false);
  const [userPronunciationAudioBlob, setUserPronunciationAudioBlob] = useState<Blob | null>(null);
  const [userPronunciationAudioBase64, setUserPronunciationAudioBase64] = useState<string | null>(null);
  const [pronunciationAnalysisResult, setPronunciationAnalysisResult] = useState<PronunciationCheckResponse | null>(null);
  const [pronunciationApiError, setPronunciationApiError] = useState<string | null>(null);
  const [correctPronunciationAudioBase64, setCorrectPronunciationAudioBase64] = useState<string | null>(null);
  
  // Explanation Viewer State
  const [showExplanationsModal, setShowExplanationsModal] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pronunciationAudioContextRef = useRef<AudioContext | null>(null); // Dedicated context for pronunciation playback

  // Scroll to top when a scenario is selected
  useEffect(() => {
    if (activeScenario) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [activeScenario]);

  // Audio Context initialization/resume for pronunciation playback
  const getPronunciationAudioContext = async () => {
    if (!pronunciationAudioContextRef.current) {
      pronunciationAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (pronunciationAudioContextRef.current.state === 'suspended') {
      await pronunciationAudioContextRef.current.resume();
    }
    return pronunciationAudioContextRef.current;
  };

  // Generic audio playback function
  const playAudioFromBase64 = async (base64: string | null) => {
    if (!base64) return;
    try {
      const ctx = await getPronunciationAudioContext();
      const bytes = decode(base64);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0); // Play immediately
    } catch (e) {
      console.error("Error playing audio:", e);
      setPronunciationApiError("Failed to play audio. Please try again.");
    }
  };


  const startPronunciationRecording = async () => {
    setPronunciationApiError(null);
    setPronunciationAnalysisResult(null); // Clear previous results
    setCorrectPronunciationAudioBase64(null); // Clear previous correct audio
    setUserPronunciationAudioBase64(null); // Clear previous user audio playback

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const supportedMimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                              MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' :
                              ''; // Fallback to empty string if no common type supported

      if (!supportedMimeType) {
        console.error("No supported audio MIME type found for MediaRecorder.");
        setPronunciationApiError("Your browser does not support audio recording.");
        stream.getTracks().forEach(track => track.stop());
        setIsPronunciationRecording(false);
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("Audio data available, size:", event.data.size);
        }
      };

      recorder.onstop = async () => {
        console.log("Recording stopped.");
        stream.getTracks().forEach(track => track.stop()); // Stop stream tracks
        
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType }); // Use actual recorder MIME type
        console.log("Audio Blob created, type:", audioBlob.type, "size:", audioBlob.size);
        setUserPronunciationAudioBlob(audioBlob);
        await processPronunciationAudio(audioBlob, recorder.mimeType); // Pass mimeType
      };

      recorder.start();
      console.log("Recording started with MIME type:", recorder.mimeType);
      setIsPronunciationRecording(true);

      // Auto-stop after 5 seconds for pronunciation check
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log("Auto-stopping recording after 5 seconds.");
          stopPronunciationRecording();
        }
      }, 5000); // 5 seconds fixed recording
      
    } catch (err) {
      console.error("Microphone access denied or recording failed", err);
      setPronunciationApiError("Microphone access is required for pronunciation checks.");
      setIsPronunciationRecording(false);
    }
  };

  const stopPronunciationRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsPronunciationRecording(false);
      console.log("Manual stop recording.");
    }
  };

  const processPronunciationAudio = async (blob: Blob, mimeType: string) => { // Added mimeType parameter
    setIsPronunciationProcessing(true);
    setPronunciationApiError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        setUserPronunciationAudioBase64(base64data); // Save for playback

        if (targetPronunciationText) {
          try {
            // Analyze pronunciation
            const analysisResult = await analyzePronunciation(base64data, targetPronunciationText, mimeType); // Pass mimeType
            setPronunciationAnalysisResult(analysisResult);

            // Generate correct pronunciation audio
            const correctAudio = await generateSpeech(targetPronunciationText);
            setCorrectPronunciationAudioBase64(correctAudio);

          } catch (apiError: any) {
            console.error("Pronunciation API Error", apiError);
            if (apiError.message.includes("Quota Exceeded")) {
              setPronunciationApiError(apiError.message);
            } else {
              setPronunciationApiError("Failed to analyze pronunciation. Please try again.");
            }
          }
        }
        setIsPronunciationProcessing(false);
      };
    } catch (error: any) {
      console.error("Processing error", error);
      setPronunciationApiError("An unexpected error occurred during audio processing. Please try again.");
      setIsPronunciationProcessing(false);
    }
  };

  const handleStartSelfStudy = () => {
    const selfStudyScenario: Scenario = {
      id: 'self-study',
      title: 'Self-Study Practice',
      titleKr: '자유 연습',
      icon: 'Lightbulb', // Using Lightbulb for the self-study scenario card
      description: 'Practice speaking freely without a specific question from the AI. Record your thoughts, practice new vocabulary, or respond to a situation of your choosing.',
      systemPromptContext: 'Speak freely or practice what you want! Feel free to talk about anything.' // This becomes the "question"
    };
    setActiveScenario(selfStudyScenario);
    setReviewingSessionId(null); // Ensure review mode is off
  };

  const handleReviewSession = (session: SavedSession) => {
    setActiveScenario(session.scenario); // Set the scenario from the saved session
    setCurrentLevel(session.level); // Set the level from the saved session
    setReviewingSessionId(session.id); // Set the session ID to trigger review mode
  };

  const handleGoHome = () => {
    setActiveScenario(null);
    setReviewingSessionId(null);
  };
  
  const handleViewExplanations = () => {
    setShowExplanationsModal(true);
  };

  const handleDownloadExplanations = () => {
    const content = getExplanationsFromLocalStorage();
    if (!content || content === 'No explanations saved yet.') {
      alert('No explanations to download.');
      return;
    }
    downloadTextFile('engfluent_ai_explanations.txt', content);
  };

  const savedSessions = getSavedSessionsFromLocalStorage();

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      <Header 
        currentLevel={currentLevel} 
        setLevel={setCurrentLevel}
        onGoHome={handleGoHome}
      />

      <main className="flex-grow px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
        {!activeScenario ? (
          // Scenario Selection Grid
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">Choose a Situation</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Select a scenario to practice your English skills. We'll provide feedback tailored to your {currentLevel.toLowerCase()} level.
              </p>
            </div>
            
            {/* Self-Study Button */}
            <div className="flex justify-center mb-10">
              <button
                onClick={handleStartSelfStudy}
                className="bg-secondary hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Lightbulb size={20} /> Start Free Practice (자유 연습 시작)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SCENARIOS.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onClick={() => {
                    setActiveScenario(scenario);
                    setReviewingSessionId(null); // Ensure review mode is off
                  }}
                />
              ))}
            </div>

            {/* Pronunciation Check Section */}
            <div className="mt-12 p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <Ear size={24} className="text-purple-500" /> Check Your Pronunciation
              </h3>
              <p className="text-slate-600 mb-6 max-w-xl">
                Type an English word or phrase, record your pronunciation, and get instant AI feedback.
              </p>

              {/* Input and Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Type word/phrase to practice (e.g., 'squirrel')"
                  className="flex-grow p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all bg-slate-800 text-white placeholder-slate-500"
                  value={targetPronunciationText}
                  onChange={(e) => {
                    setTargetPronunciationText(e.target.value);
                  }}
                  disabled={isPronunciationRecording || isPronunciationProcessing}
                />
                <button
                  onClick={isPronunciationRecording ? stopPronunciationRecording : startPronunciationRecording}
                  disabled={!isPronunciationRecording && (!targetPronunciationText || isPronunciationProcessing)}
                  className={`
                    flex-shrink-0 px-6 py-3 rounded-xl font-semibold text-white transition-all transform hover:-translate-y-0.5
                    ${isPronunciationRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}
                    flex items-center justify-center gap-2
                  `}
                >
                  {isPronunciationRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                  {isPronunciationRecording ? 'Stop Recording' : 'Record'}
                </button>
              </div>

              {/* Loading/Error/Status */}
              {(isPronunciationProcessing || pronunciationApiError) && (
                <div className="text-center mb-4">
                  {isPronunciationProcessing && (
                    <p className="flex items-center justify-center gap-2 text-purple-600">
                      <Spinner className="w-5 h-5" /> Analyzing pronunciation...
                    </p>
                  )}
                  {pronunciationApiError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative text-sm" role="alert">
                      {pronunciationApiError}
                      <button onClick={() => setPronunciationApiError(null)} className="ml-2 font-bold">X</button>
                    </div>
                  )}
                </div>
              )}

              {/* Pronunciation Feedback Display */}
              {pronunciationAnalysisResult && !isPronunciationProcessing && !pronunciationApiError && (
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100 mt-6 animate-fade-in">
                  <h4 className="text-sm font-bold text-purple-700 mb-4 flex items-center gap-2">
                    <Ear size={18} /> Feedback for "{targetPronunciationText}"
                  </h4>
                  <div className="space-y-3">
                    <ScoreBar label="Score" score={pronunciationAnalysisResult.pronunciationScore} colorClass="bg-purple-500" />
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Your Transcription:</span> "{pronunciationAnalysisResult.transcript}"
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Accuracy:</span> {pronunciationAnalysisResult.accuracyMessage}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Explanation (EN):</span> {pronunciationAnalysisResult.explanationEn}
                    </p>
                    <p className="text-sm font-kr text-slate-700">
                      <span className="font-semibold">설명 (KR):</span> {pronunciationAnalysisResult.explanationKr}
                    </p>

                    {/* Pronunciation Tips (if any) */}
                    {pronunciationAnalysisResult.pronunciationTips && pronunciationAnalysisResult.pronunciationTips.length > 0 && (
                      <div className="mt-4 border-t border-purple-100 pt-4">
                        <h5 className="text-xs font-bold text-purple-600 uppercase mb-3">Tips to Improve</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {pronunciationAnalysisResult.pronunciationTips.map((tip, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm flex gap-3">
                              <div className="flex-shrink-0 pt-1">
                                <MouthShapeIcon type={tip.mouthPosition} />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">{tip.word}</span>: <span className="text-sm text-slate-600">{tip.advice}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Playback Buttons */}
                  <div className="mt-6 pt-4 border-t border-purple-100 flex gap-4 justify-center">
                    <button
                      onClick={() => playAudioFromBase64(userPronunciationAudioBase64)}
                      disabled={!userPronunciationAudioBase64 || isPronunciationProcessing}
                      className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Volume2 size={16} /> Play Your Recording
                    </button>
                    <button
                      onClick={() => playAudioFromBase64(correctPronunciationAudioBase64)}
                      disabled={!correctPronunciationAudioBase64 || isPronunciationProcessing}
                      className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Volume2 size={16} /> Play Correct Pronunciation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Review Past Sessions Section */}
            {savedSessions.length > 0 && (
              <div className="mt-12 p-8 bg-blue-50 rounded-2xl shadow-lg border border-blue-100">
                <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                  <History size={24} className="text-primary" /> Review Past Sessions
                </h3>
                <p className="text-slate-600 mb-6 max-w-xl">
                  Revisit your previous practice sessions and AI feedback.
                </p>
                <div className="space-y-3">
                  {savedSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleReviewSession(session)}
                      className="w-full text-left p-4 bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{session.scenario.title} - {session.level}</p>
                        <p className="text-sm text-slate-500">{session.questionData.question}</p>
                        <p className="text-xs text-slate-400 mt-1">Recorded: {session.timestamp}</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-400 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all saved sessions?')) {
                        clearSavedSessionsFromLocalStorage();
                        alert('All saved sessions cleared.');
                        // Force a re-render to update the list
                        setActiveScenario(null); // Simple way to trigger component update
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 mt-4"
                  >
                    <Trash2 size={16} /> Clear All Sessions
                  </button>
                </div>
              </div>
            )}


            {/* Local Storage Explanation File Info */}
            <div className="mt-12 text-center text-slate-500">
              <p className="text-sm">
                AI Explanations saved to: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                  Local Storage/{LOCAL_STORAGE_EXPLANATION_KEY}
                </span>
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handleViewExplanations}
                  className="text-primary hover:text-blue-600 text-sm font-medium flex items-center gap-1"
                >
                  <BookOpen size={16} /> View All
                </button>
                 <button
                  onClick={handleDownloadExplanations}
                  className="text-emerald-500 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all saved explanations?')) {
                      clearExplanationsFromLocalStorage();
                      alert('Explanations cleared from local storage.');
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 size={16} /> Clear All
                </button>
              </div>
            </div>

            {/* Explanation Viewer Modal */}
            {showExplanationsModal && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <BookOpen size={20} className="text-primary"/> Saved Explanations
                    </h3>
                    <button 
                      onClick={() => setShowExplanationsModal(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-grow bg-slate-50 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {getExplanationsFromLocalStorage()}
                  </div>
                  <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-xl">
                    <button 
                      onClick={handleDownloadExplanations}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm"
                    >
                      <Download size={16} /> Download as .txt
                    </button>
                    <button 
                      onClick={() => setShowExplanationsModal(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Active Session or Review Session
          <SessionView 
            level={currentLevel}
            scenario={activeScenario}
            onBack={handleGoHome} // Always go home when backing from SessionView
            reviewSessionId={reviewingSessionId} // Pass the review ID
          />
        )}
      </main>
      
      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white mt-auto">
        <p>© {new Date().getFullYear()} EngFluent. Powered by Gemini AI.</p>
      </footer>

      {/* Global Tailwind Helper for Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;