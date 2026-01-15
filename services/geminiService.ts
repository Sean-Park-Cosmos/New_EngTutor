import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EnglishLevel, FeedbackResponse, QuestionResponse, PronunciationCheckResponse } from '../types';
import { LOCAL_QUESTIONS } from '../questions';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash-lite'; // Changed to gemini-2.5-flash-lite for low-latency
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * Retrieves a random situational question from the local database based on scenario and level.
 * Replaces the AI generation to improve performance.
 */
export const generateQuestion = async (
  scenarioId: string,
  level: EnglishLevel
): Promise<QuestionResponse> => {
  // Simulate async behavior for consistent API, though it's instant
  return new Promise((resolve) => {
    const levelQuestions = LOCAL_QUESTIONS[scenarioId]?.[level];
    
    if (levelQuestions && levelQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * levelQuestions.length);
      resolve(levelQuestions[randomIndex]);
    } else {
      // Fallback if something goes wrong
      resolve({
        question: "Could you tell me about yourself?",
        contextKr: "자기소개를 부탁드립니다."
      });
    }
  });
};

/**
 * Generates speech audio from text using Gemini TTS.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore, Puck, Charon, Fenrir, Zephyr
            },
        },
      },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio generated");
    return audioData;
  } catch (error: any) {
    console.error("TTS Error", error);
    if (error.status === 429 && error.message.includes("Quota exceeded")) {
      throw new Error("TTS Quota Exceeded: Please try again later or contact support.");
    }
    throw error;
  }
};

/**
 * Analyzes the user's audio response for a specific word or phrase pronunciation.
 */
export const analyzePronunciation = async (
  audioBase64: string,
  targetText: string,
  mimeType: string, // Added mimeType parameter
): Promise<PronunciationCheckResponse> => {
  try {
    const prompt = `
      You are an expert English pronunciation tutor for a Korean speaker.
      The user is attempting to pronounce the English word or phrase: "${targetText}".
      Analyze the user's audio response and provide a JSON object with the following:
      - transcript: verbatim user speech.
      - pronunciationScore: A score from 1-10 evaluating the pronunciation of "${targetText}".
      - accuracyMessage: A short phrase (e.g., "Excellent match!", "Good, but slight deviation", "Needs improvement", "Did not match target text") comparing the transcript to "${targetText}".
      - explanationEn: A concise English explanation for any pronunciation issues, or praise if perfect.
      - explanationKr: A concise Korean explanation for the same.
      - pronunciationTips: (Only if pronunciationScore < 7) An array of 1-2 {word, targetPhoneme, advice, mouthPosition} focusing on critical sounds in "${targetText}".
      - transcriptConfidence: 0.0-1.0 representing AI's confidence in its own transcription.
    `;

    const audioPart = {
      inlineData: {
        mimeType: mimeType, // Use the passed mimeType
        data: audioBase64
      }
    };
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
            pronunciationScore: { type: Type.INTEGER },
            accuracyMessage: { type: Type.STRING },
            explanationEn: { type: Type.STRING },
            explanationKr: { type: Type.STRING },
            transcriptConfidence: { type: Type.NUMBER },
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
    if (!text) throw new Error("No response from AI for pronunciation analysis");
    return JSON.parse(text) as PronunciationCheckResponse;

  } catch (error: any) {
    console.error("Error analyzing pronunciation:", error);
    if (error.status === 429 && error.message.includes("Quota exceeded")) {
      throw new Error("Pronunciation Analysis Quota Exceeded: Please try again later.");
    }
    throw error;
  }
};

/**
 * Analyzes the user's audio response.
 */
export const analyzeAudioResponse = async (
  audioBase64: string,
  question: string,
  level: EnglishLevel
): Promise<FeedbackResponse> => {
  try {
    const prompt = `
      You are an expert English tutor for a Korean speaker.
      User's question: "${question}"
      Target Level: ${level}

      Analyze the user's audio response and provide a JSON object with the following:
      - transcript: verbatim user speech.
      - correction: A natural, grammatically correct and appropriate English expression that *improves upon the user's 'transcript'* as a response to the 'User's question'. Focus on correcting errors and making it sound more natural.
      - explanationEn: concise English explanation for improvement.
      - explanationKr: concise Korean explanation for improvement.
      - examples: 3 alternative sentences for the question.
      - grammarScore: 1-10.
      - pronunciationScore: 1-10.
      - fluencyScore: 1-10.
      - speakingRateWPM: estimated words per minute.
      - transcriptConfidence: 0.0-1.0.
      - pronunciationTips: (if pronunciationScore < 7) array of {word, targetPhoneme, advice, mouthPosition}.
    `;

    const audioPart = {
      inlineData: {
        mimeType: 'audio/wav', // Assuming wav/webm from browser recording
        data: audioBase64
      }
    };
    const textPart = { text: prompt };

    // Calculate prompt tokens
    const promptTokenCountResponse = await ai.models.countTokens({
      model: MODEL_NAME,
      contents: { parts: [audioPart, textPart] }
    });
    const promptTokens = promptTokenCountResponse.totalTokens;

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
            examples: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            grammarScore: { type: Type.INTEGER },
            pronunciationScore: { type: Type.INTEGER },
            fluencyScore: { type: Type.INTEGER },
            speakingRateWPM: { type: Type.INTEGER }, // Added speaking rate
            transcriptConfidence: { type: Type.NUMBER }, 
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
          required: ['transcript', 'correction', 'explanationEn', 'explanationKr', 'examples', 'grammarScore', 'pronunciationScore', 'fluencyScore', 'speakingRateWPM', 'transcriptConfidence']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Calculate response tokens
    const responseTokenCountResponse = await ai.models.countTokens({
      model: MODEL_NAME,
      contents: { parts: [{ text: text }] }
    });
    const responseTokens = responseTokenCountResponse.totalTokens;

    const parsedResult = JSON.parse(text) as FeedbackResponse;

    // Calculate user answer tokens (based on AI's transcript)
    const userAnswerTokenCountResponse = await ai.models.countTokens({
      model: MODEL_NAME,
      contents: { parts: [{ text: parsedResult.transcript }] }
    });
    const userAnswerTokens = userAnswerTokenCountResponse.totalTokens;

    return {
      ...parsedResult,
      promptTokens,
      userAnswerTokens,
      responseTokens,
    };
  } catch (error: any) {
    console.error("Error analyzing audio:", error);
    if (error.status === 429 && error.message.includes("Quota exceeded")) {
      throw new Error("Analysis Quota Exceeded: Please try again later or contact support.");
    }
    throw error;
  }
};