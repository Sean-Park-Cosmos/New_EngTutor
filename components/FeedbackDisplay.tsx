
import React, { useState, useRef, useEffect } from 'react';
import { FeedbackResponse, HistoryEntry, EnglishLevel } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData, saveToHistory } from '../utils';
import { CheckCircle2, BarChart2, Lightbulb, Repeat, Languages, Volume2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Spinner } from './Spinner';
import { format } from 'date-fns';

interface FeedbackDisplayProps {
  feedback: FeedbackResponse;
  question: string;
  level: EnglishLevel;
  onNext: () => void;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback, question, level, onNext }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [playingExplanation, setPlayingExplanation] = useState<'en' | 'kr' | null>(null);
  const [showExplanations, setShowExplanations] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (feedback && feedback.transcript) {
      const historyEntry: HistoryEntry = {
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        question: question,
        level: level,
        transcript: feedback.transcript,
        correction: feedback.correction,
        explanationEn: feedback.explanationEn,
        explanationKr: feedback.explanationKr,
        scores: {
          grammar: feedback.grammarScore,
          pronunciation: feedback.pronunciationScore,
          fluency: feedback.fluencyScore,
          speakingRateWPM: feedback.speakingRateWPM
        },
        examples: feedback.examples
      };
      saveToHistory(historyEntry);
    }
  }, [feedback, question, level]);

  const getAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const handlePlayAudio = async (text: string, type: 'example' | 'explanationEn' | 'explanationKr', index: number | null = null) => {
    if (playingIndex !== null || playingExplanation !== null) {
      setPlayingIndex(null);
      setPlayingExplanation(null);
    }

    if (type === 'example') {
      setPlayingIndex(index);
    } else {
      setPlayingExplanation(type === 'explanationEn' ? 'en' : 'kr');
    }

    try {
      const base64 = await generateSpeech(text);
      const ctx = await getAudioContext();

      if (ctx) {
        const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
          if (type === 'example') setPlayingIndex(null);
          else setPlayingExplanation(null);
        };
        source.start();
      }
    } catch (e) {
      console.error("Error playing audio:", e);
      setPlayingIndex(null);
      setPlayingExplanation(null);
    }
  };

  const ScoreBar: React.FC<{ label: string; score: number; colorClass: string; displayValue?: string }> = ({ label, score, colorClass, displayValue }) => {
    // Ensure score is clamped for the bar visualization, but use original for label if valid
    const clampedScoreForBar = Math.max(0, Math.min(10, score));
    const labelScore = Math.max(1, Math.min(10, Math.round(score)));
    
    return (
      <div className="flex items-center gap-4">
        <span className="w-28 text-sm font-semibold text-slate-600">{label}</span>
        <div className="flex-grow h-3 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
            style={{ width: `${clampedScoreForBar * 10}%` }}
          ></div>
        </div>
        <span className="w-12 text-right text-sm font-bold text-slate-700">
          {displayValue || `${labelScore}/10`}
        </span>
      </div>
    );
  };
  
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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <CheckCircle2 className="text-secondary" size={20} />
          Analysis Result
        </h3>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feedback</span>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-wide">
             <BarChart2 size={16} /> Performance Scores
           </h4>
           <div className="space-y-3">
             <ScoreBar label="Grammar" score={feedback.grammarScore} colorClass="bg-blue-500" />
             <ScoreBar label="Pronunciation" score={feedback.pronunciationScore} colorClass="bg-indigo-500" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ScoreBar label="Fluency" score={feedback.fluencyScore} colorClass="bg-emerald-500" />
                {feedback.speakingRateWPM !== undefined && (
                    <ScoreBar 
                      label="Speed" 
                      // 150 WPM is roughly a perfect 10 for advanced learners. 15 WPM per score point.
                      score={Math.min(10, Math.max(1, Math.round((feedback.speakingRateWPM || 0) / 15)))}
                      displayValue={`${feedback.speakingRateWPM} WPM`}
                      colorClass="bg-purple-500" 
                    /> 
                )}
             </div>
           </div>
        </div>

        {feedback.pronunciationScore < 7 && feedback.pronunciationTips && feedback.pronunciationTips.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
             <div className="flex items-center gap-2 mb-4 text-orange-700">
               <AlertTriangle size={18} />
               <h4 className="text-sm font-bold uppercase tracking-wide">Pronunciation Clinic</h4>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {feedback.pronunciationTips.map((tip, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <MouthShapeIcon type={tip.mouthPosition} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-800">{tip.word}</span>
                        <span className="text-sm font-mono text-orange-600 bg-orange-100 px-1.5 rounded">
                          {tip.targetPhoneme}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-snug">
                        {tip.advice}
                      </p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">You Said</label>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-slate-700 italic whitespace-pre-wrap">
              "{feedback.transcript}"
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Better Way</label>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-slate-800 font-medium">
              "{feedback.correction}"
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            {showExplanations ? <EyeOff size={16} /> : <Eye size={16} />} 
            {showExplanations ? 'Hide Explanations' : 'Show Explanations'}
          </button>
        </div>

        {showExplanations && (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
              <div className="flex items-start gap-3 mb-3">
                <Lightbulb className="text-indigo-600 shrink-0 mt-1" size={20} />
                <h4 className="text-sm font-bold text-indigo-600">AI Tutor Explanation (English)</h4>
                <button
                  onClick={() => handlePlayAudio(feedback.explanationEn, 'explanationEn')}
                  disabled={playingExplanation !== null}
                  className={`
                    ml-auto flex-shrink-0 p-2 rounded-full transition-colors
                    ${playingExplanation === 'en' ? 'bg-indigo-200 text-indigo-700' : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}
                  `}
                >
                  {playingExplanation === 'en' ? <Spinner className="w-4 h-4" /> : <Volume2 size={18} />}
                </button>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{feedback.explanationEn}</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <div className="flex items-start gap-3 mb-3">
                <Languages className="text-primary shrink-0 mt-1" size={20} />
                <h4 className="text-sm font-bold text-primary">설명 (Korean)</h4>
                <button
                  onClick={() => handlePlayAudio(feedback.explanationKr, 'explanationKr')}
                  disabled={playingExplanation !== null}
                  className={`
                    ml-auto flex-shrink-0 p-2 rounded-full transition-colors
                    ${playingExplanation === 'kr' ? 'bg-blue-200 text-blue-700' : 'text-slate-400 hover:bg-white hover:text-primary hover:shadow-sm'}
                  `}
                >
                  {playingExplanation === 'kr' ? <Spinner className="w-4 h-4" /> : <Volume2 size={18} />}
                </button>
              </div>
              <p className="text-slate-700 font-kr text-sm leading-relaxed">{feedback.explanationKr}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <ul className="space-y-2">
            {feedback.examples.slice(0, 2).map((ex, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-slate-600 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 flex-grow">
                  <span className="bg-white text-slate-400 text-xs font-bold w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border border-slate-200 shadow-sm">
                    {i + 1}
                  </span>
                  <span>{ex}</span>
                </div>
                <button
                  onClick={() => handlePlayAudio(ex, 'example', i)}
                  disabled={playingIndex !== null || playingExplanation !== null}
                  className={`
                    flex-shrink-0 p-2 rounded-full transition-colors
                    ${playingIndex === i ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-white hover:text-primary hover:shadow-sm'}
                  `}
                >
                  {playingIndex === i ? <Spinner className="w-4 h-4" /> : <Volume2 size={18} />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={onNext}
            className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            Next Practice <Repeat size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDisplay;
