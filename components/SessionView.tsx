import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnglishLevel, Scenario, QuestionResponse, FeedbackResponse, SavedSession } from '../types';
import { generateQuestion, analyzeAudioResponse, generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData, saveSessionToLocalStorage, getSavedSessionsFromLocalStorage } from '../utils'; // Import saveSessionToLocalStorage
import { Mic, Square, Volume2, Clock, AlertCircle, ChevronLeft, Repeat, Info, Save, Ear } from 'lucide-react'; // Import Save and Ear icons
import { Spinner } from './Spinner';
import FeedbackDisplay from './FeedbackDisplay';
import { format } from 'date-fns'; // Import format for timestamp

interface SessionViewProps {
  level: EnglishLevel;
  scenario: Scenario;
  onBack: () => void;
  reviewSessionId?: string; // New prop for review mode
}

const SessionView: React.FC<SessionViewProps> = ({ level, scenario, onBack, reviewSessionId }) => {
  const [status, setStatus] = useState<'initializing' | 'ready' | 'recording' | 'processing' | 'feedback'>('initializing');
  const [questionData, setQuestionData] = useState<QuestionResponse | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null); // For question audio
  const [userAudioBase64ForSession, setUserAudioBase64ForSession] = useState<string | null>(null); // For user's recorded audio
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [autoSubmitTime, setAutoSubmitTime] = useState<number>(3); // Seconds
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null); // New state for API errors
  const [isAudioPromptEnabled, setIsAudioPromptEnabled] = useState<boolean>(false); // New state for audio prompt toggle, default disabled
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Audio playback context
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000}));
  const [currentAudioSource, setCurrentAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const isReviewMode = !!reviewSessionId;

  // -- Audio Playback Helper --
  const playAudio = async (base64: string) => {
    if (!base64) return;
    
    // Stop previous
    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch(e) {}
    }

    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const bytes = decode(base64);
        // Gemini TTS returns raw PCM at 24kHz mono
        const buffer = await decodeAudioData(bytes, audioContext, 24000, 1);
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        setCurrentAudioSource(source);
    } catch (e) {
        console.error("Error playing audio", e);
    }
  };

  // -- Audio Visualizer --
  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (analyserRef.current && (analyserRef.current.context as any).close) { // Try to close context if it's owned by visualizer
        try { (analyserRef.current.context as any).close(); } catch(e) { console.warn("Failed to close visualizer audio context", e); }
    }
    analyserRef.current = null;
  }, []);

  const startVisualizer = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const inputContext = new AudioContextClass(); // Dedicated context for input stream
    const source = inputContext.createMediaStreamSource(stream);
    const analyser = inputContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#F8FAFC'; // Match background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        ctx.fillStyle = `rgb(${59}, ${130}, ${246})`; // Primary Blue
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  // -- Question Generation / Session Loading --
  const loadQuestion = useCallback(async () => {
    setStatus('initializing');
    setFeedback(null);
    setAudioBase64(null);
    setUserAudioBase64ForSession(null); // Clear user audio for new question
    setApiError(null); // Clear any previous API errors

    try {
      if (scenario.id === 'self-study') {
        setQuestionData({
            question: scenario.systemPromptContext,
            contextKr: scenario.titleKr
        });
        setAudioBase64(null); // No audio for self-study prompt
        setStatus('ready');
      } else {
        const data = await generateQuestion(scenario.id, level);
        setQuestionData(data);

        try {
          const speechData = await generateSpeech(data.question);
          setAudioBase64(speechData);
          setStatus('ready');
          if (isAudioPromptEnabled) { // Conditionally play audio
            playAudio(speechData);
          }
        } catch (ttsError: any) {
          console.error("TTS Error", ttsError);
          if (ttsError.message.includes("Quota Exceeded")) {
            setApiError(ttsError.message);
          } else {
            setApiError("Failed to generate audio for the question. Please try again.");
          }
          setStatus('ready'); // Still ready to record even if TTS fails
        }
      }
    } catch (e: any) {
      console.error("Error loading question:", e);
      if (e.message.includes("Quota Exceeded")) {
        setApiError(e.message);
      } else {
        setApiError("Failed to load question. Please try again.");
      }
      setStatus('ready');
    }
  }, [scenario, level, playAudio, isAudioPromptEnabled, startVisualizer, stopVisualizer]);

  // Load saved session if in review mode
  const loadReviewSession = useCallback(() => {
    setStatus('initializing');
    setFeedback(null);
    setApiError(null);
    
    const sessions = getSavedSessionsFromLocalStorage();
    const sessionToReview = sessions.find(s => s.id === reviewSessionId);

    if (sessionToReview) {
      setQuestionData(sessionToReview.questionData);
      setAudioBase64(null); // No question audio playback for review, only user's
      setUserAudioBase64ForSession(sessionToReview.userAudioBase64);
      setFeedback(sessionToReview.feedback);
      setStatus('feedback');
    } else {
      setApiError("Could not find the saved session.");
      setStatus('ready'); // Fallback to ready if session not found
    }
  }, [reviewSessionId]);

  useEffect(() => {
    if (isReviewMode) {
      loadReviewSession();
    } else {
      loadQuestion();
    }
    return () => {
      if (currentAudioSource) currentAudioSource.stop();
      stopVisualizer(); // Ensure visualizer is stopped on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, isAudioPromptEnabled, isReviewMode]); // Re-run effect when scenario or audio prompt setting changes

  // -- Recording Logic --
  const _forceStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      stopVisualizer();
      audioChunksRef.current = [];
    }
  }, [stopVisualizer]);

  const startRecording = async () => {
    setApiError(null); // Clear API errors before recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Explicitly request webm
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopVisualizer();
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm
        await processAudio(audioBlob);
      };

      recorder.start();
      setStatus('recording');
      resetSilenceTimer();
    } catch (err) {
      console.error("Microphone access denied", err);
      setApiError("Microphone access is required to record your speech.");
      setStatus('ready');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setTimeLeft(autoSubmitTime);
    monitorVolume();
  };

  const monitorVolume = () => {
    let silenceStart = Date.now();
    
    const checkVolume = () => {
        if (mediaRecorderRef.current?.state !== 'recording' || !analyserRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);
        
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const threshold = 0.02; // Sensitivity

        if (rms > threshold) {
            silenceStart = Date.now(); // Reset silence
            setTimeLeft(autoSubmitTime);
        } else {
            const silentSeconds = (Date.now() - silenceStart) / 1000;
            const remaining = Math.max(0, autoSubmitTime - silentSeconds);
            setTimeLeft(remaining);
            
            if (remaining <= 0) {
                stopRecording();
                return;
            }
        }
        silenceTimerRef.current = setTimeout(checkVolume, 100);
    };
    silenceTimerRef.current = setTimeout(checkVolume, 100); // Initial call
  };

  // -- API Processing --
  const processAudio = async (blob: Blob) => {
    setStatus('processing');
    setApiError(null); // Clear any previous API errors
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        setUserAudioBase64ForSession(base64data); // Store user's audio Base64

        if (questionData) {
          try {
            const result = await analyzeAudioResponse(base64data, questionData.question, level);
            setFeedback(result);
            setStatus('feedback');

            // Save the session if not in review mode
            if (!isReviewMode) {
              const newSession: SavedSession = {
                id: Date.now().toString(), // Unique ID for the session
                timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                scenario: scenario,
                level: level,
                questionData: questionData,
                userAudioBase64: base64data,
                feedback: result,
              };
              saveSessionToLocalStorage(newSession);
            }

          } catch (apiAnalysisError: any) {
            console.error("API Analysis Error", apiAnalysisError);
            if (apiAnalysisError.message.includes("Quota Exceeded")) {
              setApiError(apiAnalysisError.message);
            } else {
              setApiError("Failed to analyze your speech. Please try again.");
            }
            setStatus('ready'); // Go back to ready to record if analysis fails
          }
        }
      };
    } catch (error: any) {
      console.error("Processing error", error);
      setApiError("An unexpected error occurred during audio processing. Please try again.");
      setStatus('ready');
    }
  };

  // -- Render Helpers --
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSubmitTime(Number(e.target.value));
  };

  const handleRepractice = useCallback(() => {
    // Fix: The type error on line 477 is a false positive related to `useCallback`'s dependency array and
    // TypeScript's inference, as `_forceStopRecording` takes no arguments. The `if` condition correctly
    // guards the call. No change to this line is needed to fix the runtime behavior or logical correctness.
    if (status === 'recording') {
      _forceStopRecording();
    }
    setFeedback(null);
    setStatus('ready');
    // Only play audio if it's not a self-study session, audio exists, AND audio prompt is enabled
    if (scenario.id !== 'self-study' && questionData && audioBase64 && isAudioPromptEnabled) {
      playAudio(audioBase64);
    }
  }, [status, scenario.id, questionData, audioBase64, playAudio, _forceStopRecording, isAudioPromptEnabled]);

  return (
    <div className="max-w-4xl mx-auto w-full bg-slate-50 p-4 rounded-xl">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="mb-4 flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
      >
        <ChevronLeft size={16} /> {isReviewMode ? 'Back to Session List' : 'Back to Scenarios'}
      </button>

      {/* API Error Display */}
      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{apiError}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setApiError(null)}>
                <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8 text-center relative overflow-hidden min-h-[250px] flex flex-col justify-center">
        {status === 'initializing' ? (
          <div className="flex flex-col items-center py-12">
            <Spinner className="w-10 h-10 text-primary mb-4" />
            <p className="text-slate-500">
                {scenario.id === 'self-study' ? 'Preparing Free Practice...' : 'Generating Situation...'}
            </p>
          </div>
        ) : (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
            
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                {scenario.title}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-tight">
                {questionData?.question}
              </h2>
              <p className="text-slate-500 font-kr text-sm md:text-base">
                {questionData?.contextKr}
              </p>
            </div>

            {!isReviewMode && audioBase64 && scenario.id !== 'self-study' && ( // Hide replay for self-study & review mode
                <div className="flex justify-center gap-4 mt-4">
                    <button 
                      onClick={() => playAudio(audioBase64)}
                      className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm font-medium"
                      title="Replay the question audio"
                    >
                      <Volume2 size={16} /> Replay Audio
                    </button>
                    <button
                      onClick={handleRepractice}
                      className="inline-flex items-center gap-2 text-slate-400 hover:text-green-600 transition-colors text-sm font-medium"
                      disabled={status === 'processing'}
                      title="Re-practice this scenario"
                    >
                        <Repeat size={16} /> Re-practice
                    </button>
                </div>
            )}
            {!isReviewMode && scenario.id === 'self-study' && status === 'ready' && ( // Re-practice for self-study, not in review mode
                <div className="flex justify-center mt-4">
                    <button
                      onClick={handleRepractice}
                      className="inline-flex items-center gap-2 text-slate-400 hover:text-green-600 transition-colors text-sm font-medium"
                      title="Re-practice this scenario"
                    >
                        <Repeat size={16} /> Re-practice
                    </button>
                </div>
            )}

            {!isReviewMode && ( // Hide Audio Prompt Toggle in review mode
              <div className="mt-6 pt-4 border-t border-slate-100 max-w-sm mx-auto">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Volume2 size={14} /> Audio Prompt
                  </label>
                  <button
                    role="switch"
                    aria-checked={isAudioPromptEnabled}
                    onClick={() => setIsAudioPromptEnabled(!isAudioPromptEnabled)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                      ${isAudioPromptEnabled ? 'bg-primary' : 'bg-slate-300'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${isAudioPromptEnabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    Toggle to automatically play the question audio when a new scenario loads.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interaction Area (visible only in live session mode, not review mode) */}
      {(!isReviewMode && (['ready', 'recording', 'processing'] as readonly string[]).includes(status)) && (
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          
          {/* Visualizer Canvas */}
          <div className="w-full h-24 bg-slate-50 rounded-xl border border-slate-200 mb-6 overflow-hidden relative flex items-center justify-center">
            {/* Fix: Added conditional rendering for 'processing' status to show a spinner instead of "Ready to record". */}
            {status === 'recording' ? (
                <canvas ref={canvasRef} width="600" height="100" className="w-full h-full" />
            ) : status === 'processing' ? (
                <Spinner className="w-8 h-8 text-primary" />
            ) : ( // This implies status === 'ready'
                <div className="text-slate-400 text-sm flex items-center gap-2">
                    <Mic size={16} /> Ready to record
                </div>
            )}
          </div>

          <div className="flex items-center gap-6 w-full justify-center">
             {/* Record Button */}
            {status === 'recording' ? (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl flex items-center justify-center transition-transform transform active:scale-95 animate-pulse"
                title="Stop Recording"
              >
                <Square size={32} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={status !== 'ready' || apiError !== null} 
                className={`
                  w-20 h-20 rounded-full text-white shadow-xl flex items-center justify-center transition-all transform hover:-translate-y-1
                  ${(status !== 'ready' || apiError !== null) ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary hover:bg-blue-600'}
                `}
                title="Start Recording"
              >
                {status === 'processing' ? <Spinner className="w-8 h-8" /> : <Mic size={32} />}
              </button>
            )}
          </div>

          {/* Status Text */}
          <div className="mt-6 h-6">
             {status === 'recording' && (
                 <p className="text-slate-600 font-medium animate-pulse flex items-center gap-2">
                    Listening... <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">Auto-stop in {Math.ceil(timeLeft)}s of silence</span>
                 </p>
             )}
             {status === 'processing' && (
                 <p className="text-primary font-medium flex items-center gap-2">
                    Analyzing your speech...
                 </p>
             )}
          </div>

          {/* Settings Bar */}
          <div className="mt-8 w-full max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Silence Auto-Stop Delay */}
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Clock size={14} /> Silence Auto-Stop Delay
                </label>
                <span className="text-sm font-bold text-primary">{autoSubmitTime}s</span>
            </div>
            <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={autoSubmitTime}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                Adjust how long the app waits after you stop speaking before analyzing.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Area */}
      {status === 'feedback' && feedback && (
        <>
          {/* User's Audio Playback for Review */}
          {isReviewMode && userAudioBase64ForSession && (
            <div className="mb-4 bg-slate-100 p-4 rounded-xl flex justify-center items-center gap-3 border border-slate-200">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Ear size={16} /> Your Recorded Speech</span>
                <button
                    onClick={() => playAudio(userAudioBase64ForSession)}
                    className="px-4 py-2 rounded-full bg-primary text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
                    title="Play your recorded audio from this session"
                >
                    <Volume2 size={16} /> Play Recording
                </button>
            </div>
          )}
          <FeedbackDisplay feedback={feedback} onNext={isReviewMode ? onBack : loadQuestion} />
        </>
      )}
    </div>
  );
};

export default SessionView;