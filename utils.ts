
import { format } from 'date-fns';
import { SavedSession, HistoryEntry } from './types';

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
export function downloadFile(filename: string, content: string, contentType: string = 'text/plain') {
  const element = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// History JSON Functions
export const LOCAL_STORAGE_HISTORY_KEY = 'engfluent_history.json';

export function saveToHistory(entry: HistoryEntry): void {
  const existingHistoryString = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
  let history: HistoryEntry[] = [];
  try {
    history = existingHistoryString ? JSON.parse(existingHistoryString) : [];
  } catch (e) {
    console.error("Error parsing history from localStorage", e);
    history = [];
  }
  history.unshift(entry); // Newest first
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history, null, 2));
}

export function getHistoryFromLocalStorage(): string {
  const data = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
  return data || '[]';
}

export function clearHistoryFromLocalStorage(): void {
  localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
}

// Saved Sessions Functions (UI Navigation focus)
export const LOCAL_STORAGE_SESSIONS_KEY = 'engfluent_saved_sessions';

export function saveSessionToLocalStorage(session: SavedSession): void {
  const existingSessionsString = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
  let sessions: SavedSession[] = [];
  try {
    sessions = existingSessionsString ? JSON.parse(existingSessionsString) : [];
  } catch (e) {
    console.error("Error parsing saved sessions from localStorage", e);
    sessions = [];
  }
  sessions.unshift(session);
  localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSavedSessionsFromLocalStorage(): SavedSession[] {
  const sessionsString = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
  try {
    return sessionsString ? JSON.parse(sessionsString) : [];
  } catch (e) {
    console.error("Error parsing saved sessions from localStorage", e);
    return [];
  }
}

export function clearSavedSessionsFromLocalStorage(): void {
  localStorage.removeItem(LOCAL_STORAGE_SESSIONS_KEY);
}
