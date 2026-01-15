import { format } from 'date-fns'; // Import format from date-fns for timestamps
import { SavedSession } from './types'; // Import SavedSession type

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Generic Download Function
export function downloadTextFile(filename: string, content: string) {
  const element = document.createElement('a');
  const file = new Blob([content], {type: 'text/plain'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  document.body.removeChild(element);
}

// Local Storage Explanation Functions
export const LOCAL_STORAGE_EXPLANATION_KEY = 'engfluent_ai_explanations.txt';

export function appendExplanationToLocalStorage(explanation: string): void {
  const existingContent = localStorage.getItem(LOCAL_STORAGE_EXPLANATION_KEY) || '';
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const newEntry = `--- Explanation from ${timestamp} ---\n${explanation}\n\n`;
  localStorage.setItem(LOCAL_STORAGE_EXPLANATION_KEY, existingContent + newEntry);
}

export function getExplanationsFromLocalStorage(): string {
  return localStorage.getItem(LOCAL_STORAGE_EXPLANATION_KEY) || 'No explanations saved yet.';
}

export function clearExplanationsFromLocalStorage(): void {
  localStorage.removeItem(LOCAL_STORAGE_EXPLANATION_KEY);
}

// Local Storage Saved Sessions Functions
export const LOCAL_STORAGE_SESSIONS_KEY = 'engfluent_saved_sessions';

export function saveSessionToLocalStorage(session: SavedSession): void {
  const existingSessionsString = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
  let sessions: SavedSession[] = [];
  try {
    sessions = existingSessionsString ? JSON.parse(existingSessionsString) : [];
  } catch (e) {
    console.error("Error parsing saved sessions from localStorage", e);
    sessions = []; // Reset if corrupted
  }
  sessions.unshift(session); // Add new session to the beginning
  localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSavedSessionsFromLocalStorage(): SavedSession[] {
  const sessionsString = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
  try {
    return sessionsString ? JSON.parse(sessionsString) : [];
  } catch (e) {
    console.error("Error parsing saved sessions from localStorage", e);
    return []; // Return empty array if corrupted
  }
}

export function clearSavedSessionsFromLocalStorage(): void {
  localStorage.removeItem(LOCAL_STORAGE_SESSIONS_KEY);
}