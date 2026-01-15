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
  speakingRateWPM?: number; // New: Words Per Minute speaking rate
  pronunciationTips?: PronunciationTip[];
  transcriptConfidence?: number; // AI's confidence in its own transcription (0-1)
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
  accuracyMessage: string; // e.g., "Excellent match!", "Needs improvement", "Did not match target text"
  explanationEn: string; // Specific to pronunciation
  explanationKr: string; // Specific to pronunciation
  pronunciationTips?: PronunciationTip[];
  transcriptConfidence?: number;
}

export interface SavedSession {
  id: string;
  timestamp: string; // e.g., "2023-10-27 10:30:00"
  scenario: Scenario;
  level: EnglishLevel;
  questionData: QuestionResponse;
  userAudioBase64: string; // Base64 of user's recorded audio
  feedback: FeedbackResponse;
}