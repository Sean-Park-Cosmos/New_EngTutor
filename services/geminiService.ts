
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EnglishLevel, FeedbackResponse, QuestionResponse, PronunciationCheckResponse } from '../types';
import { LOCAL_QUESTIONS } from '../questions';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview'; 
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * Utility for retrying API calls with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4, baseDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      let retryAfterMs = 0;
      try {
        const errorString = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        const braceIndex = errorString.indexOf('{');
        // Extract JSON only if it exists in the error string
        const errorData = braceIndex !== -1 
          ? JSON.parse(errorString.substring(braceIndex)) 
          : error;
        
        const details = errorData?.error?.details || errorData?.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (retryInfo?.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
            if (!isNaN(seconds)) retryAfterMs = seconds * 1000;
          }
        }
        
        if (retryAfterMs === 0) {
          const match = errorString.match(/retry in (\d+\.?\d*)s/i);
          if (match) retryAfterMs = parseFloat(match[1]) * 1000;
        }
      } catch (parseErr) {
        // Fallback for non-JSON or malformed error strings
      }

      const isRateLimited = 
        error.status === 429 || 
        error.code === 429 || 
        error.status === "RESOURCE_EXHAUSTED" ||
        (error.message && (error.message.includes("Quota exceeded") || error.message.includes("RESOURCE_EXHAUSTED")));

      if (isRateLimited) {
        if (retryAfterMs > 15000) throw error; // Don't wait too long

        const delay = retryAfterMs > 0 
          ? retryAfterMs + 500 + (Math.random() * 500) 
          : baseDelay * Math.pow(2, i) + (Math.random() * 500);
        
        console.warn(`Gemini API Rate Limit: Waiting ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const generateQuestion = async (
  scenarioId: string,
  level: EnglishLevel,
  excludeQuestion?: string
): Promise<QuestionResponse> => {
  return new Promise((resolve) => {
    let levelQuestions = LOCAL_QUESTIONS[scenarioId]?.[level] || [];
    
    // Filter out the current question to ensure variety
    if (excludeQuestion && levelQuestions.length > 1) {
      levelQuestions = levelQuestions.filter(q => q.question !== excludeQuestion);
    }

    if (levelQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * levelQuestions.length);
      resolve(levelQuestions[randomIndex]);
    } else {
      resolve({
        question: "Could you tell me about yourself?",
        contextKr: "자기소개를 부탁드립니다."
      });
    }
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("TTS output was empty.");
    return audioData;
  });
};

export const analyzePronunciation = async (
  audioBase64: string,
  targetText: string,
  mimeType: string,
): Promise<PronunciationCheckResponse> => {
  return withRetry(async () => {
    const prompt = `
      You are an expert English pronunciation tutor. Analyze the user's audio for: "${targetText}".
      If the audio is silent or contains no English speech, return the transcript as an empty string "".
      All scores must be an integer from 1 to 10.
      Provide feedback in JSON format.
    `;
    const audioPart = { inlineData: { mimeType, data: audioBase64 } };
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [audioPart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            pronunciationScore: { 
              type: Type.INTEGER, 
              description: "Pronunciation score from 1 to 10" 
            },
            accuracyMessage: { type: Type.STRING },
            explanationEn: { type: Type.STRING },
            explanationKr: { type: Type.STRING },
            pronunciationTips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  targetPhoneme: { type: Type.STRING },
                  advice: { type: Type.STRING },
                  mouthPosition: { type: Type.STRING, enum: ["rounded", "wide", "tongue_up", "relaxed"] }
                },
                required: ['word', 'targetPhoneme', 'advice', 'mouthPosition']
              }
            }
          },
          required: ['transcript', 'pronunciationScore', 'accuracyMessage', 'explanationEn', 'explanationKr']
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Analysis response was empty.");
    return JSON.parse(text) as PronunciationCheckResponse;
  });
};

export const analyzeAudioResponse = async (
  audioBase64: string,
  question: string,
  level: EnglishLevel
): Promise<FeedbackResponse> => {
  return withRetry(async () => {
    const prompt = `
      Analyze the response for Question: "${question}" at Level: ${level}.
      CRITICAL INSTRUCTION: If the audio is silent, contains only background noise, or no recognizable speech is detected, YOU MUST return "transcript": "" (an empty string).
      SCORING INSTRUCTION: Use a scale of 1 to 10 (where 10 is perfect) for grammarScore, pronunciationScore, and fluencyScore. 
      Otherwise, provide JSON feedback including transcript, correction, scores, and explanations.
    `;
    const audioPart = { inlineData: { mimeType: 'audio/webm', data: audioBase64 } };
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [audioPart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            correction: { type: Type.STRING },
            explanationEn: { type: Type.STRING },
            explanationKr: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            grammarScore: { 
              type: Type.INTEGER, 
              description: "Grammar score from 1 to 10" 
            },
            pronunciationScore: { 
              type: Type.INTEGER, 
              description: "Pronunciation score from 1 to 10" 
            },
            fluencyScore: { 
              type: Type.INTEGER, 
              description: "Fluency score from 1 to 10" 
            },
            speakingRateWPM: { type: Type.INTEGER }
          },
          required: ['transcript', 'correction', 'explanationEn', 'explanationKr', 'examples', 'grammarScore', 'pronunciationScore', 'fluencyScore', 'speakingRateWPM']
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Analysis response was empty.");
    return JSON.parse(text) as FeedbackResponse;
  });
};
