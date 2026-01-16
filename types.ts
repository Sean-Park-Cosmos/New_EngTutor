
export enum EnglishLevel {
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export interface Scenario {
  id: string;
  title: string;
  titleKr: string;
  icon: string;
  description: string;
  systemPromptContext: string;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  text?: string;
  audioUrl?: string;
}

export interface PronunciationTip {
  word: string;
  targetPhoneme: string;
  advice: string;
  mouthPosition: 'rounded' | 'wide' | 'tongue_up' | 'relaxed';
}

export interface FeedbackResponse {
  transcript: string;
  correction: string;
  explanationEn: string;
  explanationKr: string;
  examples: string[];
  grammarScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  speakingRateWPM?: number;
  pronunciationTips?: PronunciationTip[];
  transcriptConfidence?: number;
  promptTokens?: number;
  userAnswerTokens?: number;
  responseTokens?: number;
}

export interface QuestionResponse {
  question: string;
  contextKr?: string;
}

export interface PronunciationCheckResponse {
  transcript: string;
  pronunciationScore: number;
  accuracyMessage: string;
  explanationEn: string;
  explanationKr: string;
  pronunciationTips?: PronunciationTip[];
  transcriptConfidence?: number;
}

export interface SavedSession {
  id: string;
  timestamp: string;
  scenario: Scenario;
  level: EnglishLevel;
  questionData: QuestionResponse;
  userAudioBase64: string;
  feedback: FeedbackResponse;
}

export interface HistoryEntry {
  timestamp: string;
  question: string;
  level: string;
  transcript: string;
  correction: string;
  explanationEn: string;
  explanationKr: string;
  scores: {
    grammar: number;
    pronunciation: number;
    fluency: number;
    speakingRateWPM?: number;
  };
  examples: string[];
}
