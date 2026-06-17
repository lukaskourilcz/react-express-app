import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';

export interface AppSettings {
  practiceMode: boolean;
  soundEffects: boolean;
}

const KEY = 'devquiz:settings';

const defaults: AppSettings = {
  practiceMode: false,
  soundEffects: false,
};

const read = (): AppSettings => ({ ...defaults, ...readJSON<Partial<AppSettings>>(KEY, {}) });

const store = createStore(read);

export const getSettings = store.get;

export const updateSettings = (patch: Partial<AppSettings>) => {
  writeJSON(KEY, { ...read(), ...patch });
  store.emit();
};

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  return [useStore(store), updateSettings];
}

// Tiny WebAudio sound helper - no external assets, no extra bytes.
let audioCtx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
};

const tone = (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.06) => {
  if (!getSettings().soundEffects) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playCorrect = () => {
  tone(660, 0.08);
  setTimeout(() => tone(880, 0.12), 60);
};

export const playComplete = () => {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18), i * 80));
};
