
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnglishLevel, Scenario, QuestionResponse, FeedbackResponse, SavedSession } from '../types';
import { generateQuestion, analyzeAudioResponse, generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData, saveSessionToLocalStorage, getSavedSessionsFromLocalStorage } from '../utils';
import { Mic, Square, Volume2, VolumeX, Clock, AlertCircle, ChevronLeft, Repeat, RefreshCw, X, ShieldAlert, AudioLines } from 'lucide-react';
import { Spinner } from './Spinner';
import FeedbackDisplay from './FeedbackDisplay';
import { format } from 'date-fns';

interface SessionViewProps {
  level: EnglishLevel;
  scenario: Scenario;
  onBack: () => void;
  reviewSessionId?: string;
}

const SessionView: React.FC<SessionViewProps> = ({ level, scenario, onBack, reviewSessionId }) => {
  const [status, setStatus] = useState<'initializing' | 'ready' | 'recording' | 'processing' | 'feedback'>('initializing');
  const [questionData, setQuestionData] = useState<QuestionResponse | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [autoSubmitTime, setAutoSubmitTime] = useState<number>(3);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [maxCooldown, setMaxCooldown] = useState<number>(60);
  
  const [isAudioPromptEnabled, setIsAudioPromptEnabled] = useState<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSpeechGeneratingRef = useRef<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastQuestionRef = useRef<string | null>(null);

  const isReviewMode = !!reviewSessionId;

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    return audioContextRef.current;
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    if (!base64) return;
    if (currentAudioSourceRef.current) {
        try { currentAudioSourceRef.current.stop(); } catch(e) {}
    }
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        currentAudioSourceRef.current = source;
    } catch (e) { console.error("Error playing audio", e); }
  }, [getAudioContext]);

  const handleQuotaError = useCallback((error: any) => {
    const errorString = typeof error.message === 'string' ? error.message : JSON.stringify(error);
    const isQuota = 
      error.status === 429 || 
      error.code === 429 || 
      error.status === "RESOURCE_EXHAUSTED" ||
      errorString.includes("Quota exceeded") || 
      errorString.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      let delay = 60; 
      const match = errorString.match(/retry in (\d+\.?\d*)s/i);
      if (match) delay = Math.ceil(parseFloat(match[1]));
      
      setIsCooldown(true);
      setCooldownTime(delay);
      setMaxCooldown(delay);
      setApiError(`The AI tutor is resting. Cooling down for ${delay} seconds.`);
      
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            setIsCooldown(false);
            setApiError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setApiError(`Connection error: ${error.message || 'Unknown'}`);
    }
  }, []);

  const loadQuestion = useCallback(async () => {
    if (isReviewMode) return;
    if (isSpeechGeneratingRef.current) return;
    
    setStatus('initializing');
    setFeedback(null);
    setAudioBase64(null);
    setApiError(null);
    setIsAudioLoading(false);

    try {
      if (scenario.id === 'self-study') {
        const data = { question: scenario.systemPromptContext, contextKr: scenario.titleKr };
        setQuestionData(data);
        lastQuestionRef.current = data.question;
        setStatus('ready');
      } else {
        const data = await generateQuestion(scenario.id, level, lastQuestionRef.current || undefined);
        setQuestionData(data);
        lastQuestionRef.current = data.question;
        setStatus('ready');

        if (!isCooldown) {
          isSpeechGeneratingRef.current = true;
          setIsAudioLoading(true);
          try {
            const speechData = await generateSpeech(data.question);
            setAudioBase64(speechData);
            if (isAudioPromptEnabled) {
              playAudio(speechData);
            }
          } catch (ttsError: any) {
            handleQuotaError(ttsError);
          } finally {
            isSpeechGeneratingRef.current = false;
            setIsAudioLoading(false);
          }
        }
      }
    } catch (e: any) {
      setApiError("Failed to prepare tutor situation.");
      setStatus('ready');
    }
  }, [scenario, level, playAudio, isAudioPromptEnabled, isCooldown, handleQuotaError, isReviewMode]);

  useEffect(() => {
    if (isReviewMode && reviewSessionId) {
      const sessions = getSavedSessionsFromLocalStorage();
      const session = sessions.find(s => s.id === reviewSessionId);
      if (session) {
        setQuestionData(session.questionData);
        setFeedback(session.feedback);
        lastQuestionRef.current = session.questionData.question;
        setStatus('feedback');
      } else {
        setApiError("History session not found.");
        setStatus('ready');
      }
    } else if (!isReviewMode) {
      loadQuestion();
    }
    
    return () => {
      if (currentAudioSourceRef.current) currentAudioSourceRef.current.stop();
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [reviewSessionId, isReviewMode, scenario.id, level]);

  const startVisualizer = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const inputContext = new AudioContextClass();
    const source = inputContext.createMediaStreamSource(stream);
    const analyser = inputContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `#3B82F6`;
        ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  const monitorVolume = useCallback(() => {
    let silenceStart = Date.now();
    const checkVolume = () => {
        if (mediaRecorderRef.current?.state !== 'recording' || !analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms > 0.02) {
            silenceStart = Date.now();
        } else {
            const silentSeconds = (Date.now() - silenceStart) / 1000;
            if (silentSeconds >= autoSubmitTime) {
              mediaRecorderRef.current.stop();
              return;
            }
        }
        silenceTimerRef.current = setTimeout(checkVolume, 100);
    };
    silenceTimerRef.current = setTimeout(checkVolume, 100);
  }, [autoSubmitTime]);

  const startRecording = async () => {
    if (isCooldown || status === 'processing' || status === 'recording') return;
    setApiError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size > 0 && audioChunksRef.current.push(event.data);
      recorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setStatus('processing');
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          if (questionData) {
            try {
              const result = await analyzeAudioResponse(base64data, questionData.question, level);
              
              // VALIDATION: Check if speech was detected
              if (!result.transcript || result.transcript.trim() === "") {
                setApiError("I couldn't hear you clearly. Please speak again!");
                setStatus('ready');
                return;
              }

              setFeedback(result);
              setStatus('feedback');
              if (!isReviewMode) {
                saveSessionToLocalStorage({
                  id: Date.now().toString(),
                  timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                  scenario, level, questionData, feedback: result,
                  userAudioBase64: base64data
                });
              }
            } catch (e: any) { handleQuotaError(e); setStatus('ready'); }
          }
        };
      };
      recorder.start();
      setStatus('recording');
      monitorVolume();
    } catch (err) {
      setApiError("Microphone access is required.");
      setStatus('ready');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full bg-slate-50 p-4 rounded-xl">
      <button onClick={onBack} className="mb-4 flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
        <ChevronLeft size={16} /> {isReviewMode ? 'Back to History' : 'Back to Scenarios'}
      </button>

      {apiError && (
        <div className={`border ${isCooldown ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-amber-50 border-amber-200 text-amber-800'} px-4 py-4 rounded-xl mb-4 flex items-start gap-4 shadow-sm animate-fade-in`}>
            {isCooldown ? <ShieldAlert className="text-indigo-500 shrink-0 mt-0.5" size={24} /> : <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={24} />}
            <div className="flex-grow">
              <strong className="block font-bold mb-1 text-base">{isCooldown ? 'Tutor needs a moment' : 'No Input Detected'}</strong>
              <p className="text-sm leading-relaxed">{apiError}</p>
              {isCooldown && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-grow bg-indigo-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${(cooldownTime / maxCooldown) * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 w-8">{cooldownTime}s</span>
                </div>
              )}
            </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8 text-center relative overflow-hidden min-h-[250px] flex flex-col justify-center">
        {status === 'initializing' ? (
          <div className="flex flex-col items-center py-12">
            <Spinner className="w-10 h-10 text-primary mb-4" />
            <p className="text-slate-500 font-medium">Preparing practice situation...</p>
          </div>
        ) : (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider mb-3">{scenario.title}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-tight">{questionData?.question}</h2>
              <p className="text-slate-500 font-kr text-sm md:text-base">{questionData?.contextKr}</p>
            </div>
            
            {!isReviewMode && scenario.id !== 'self-study' && status !== 'feedback' && (
                <div className="flex flex-col items-center gap-4 mt-4">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setIsAudioPromptEnabled(!isAudioPromptEnabled)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isAudioPromptEnabled ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                      >
                        {isAudioPromptEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        <span className="text-xs font-bold uppercase tracking-tighter">Auto-Voice</span>
                      </button>

                      {isAudioLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 animate-pulse text-sm">
                          <AudioLines size={16} />
                          <span>Generating...</span>
                        </div>
                      ) : (
                        <button 
                          onClick={async () => {
                            if (isSpeechGeneratingRef.current || !questionData) return;
                            isSpeechGeneratingRef.current = true;
                            setIsAudioLoading(true);
                            try {
                              const speechData = await generateSpeech(questionData.question);
                              setAudioBase64(speechData);
                              playAudio(speechData);
                            } catch (e) { handleQuotaError(e); }
                            finally { isSpeechGeneratingRef.current = false; setIsAudioLoading(false); }
                          }}
                          className="text-slate-500 hover:text-primary transition-colors text-sm font-bold flex items-center gap-2"
                        >
                          <Volume2 size={16} /> {audioBase64 ? 'Hear Question' : 'Generate Voice'}
                        </button>
                      )}
                    </div>
                </div>
            )}
          </>
        )}
      </div>

      {!isReviewMode && (['ready', 'recording', 'processing'].includes(status)) && (
        <div className="flex flex-col items-center mb-8">
          <div className="w-full h-24 bg-slate-50 rounded-xl border border-slate-200 mb-6 overflow-hidden flex items-center justify-center relative">
            {status === 'recording' ? (
              <canvas ref={canvasRef} width="600" height="100" className="w-full h-full" />
            ) : status === 'processing' ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="w-8 h-8 text-primary" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Analyzing Response...</span>
              </div>
            ) : (
              <div className="text-slate-400 text-sm flex items-center gap-2 font-medium">
                <Mic size={16} className="animate-bounce" /> Click button below to speak
              </div>
            )}
          </div>
          <button 
            onClick={status === 'recording' ? () => mediaRecorderRef.current?.stop() : startRecording} 
            disabled={status === 'processing' || status === 'initializing' || isCooldown} 
            className={`w-20 h-20 rounded-full text-white shadow-xl flex items-center justify-center transition-all transform active:scale-95 ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-primary hover:bg-blue-600'} disabled:opacity-40`}
          >
            {status === 'recording' ? <Square size={32} /> : <Mic size={32} />}
          </button>
          
          <div className="mt-8 w-full max-w-md bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={14} /> Auto-Stop Silence Delay</label>
              <span className="text-sm font-bold text-primary">{autoSubmitTime}s</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={autoSubmitTime} onChange={(e) => setAutoSubmitTime(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" disabled={isCooldown} />
          </div>
        </div>
      )}

      {status === 'feedback' && feedback && (
        <FeedbackDisplay feedback={feedback} question={questionData?.question || ''} level={level} onNext={isReviewMode ? onBack : loadQuestion} />
      )}
    </div>
  );
};

export default SessionView;
