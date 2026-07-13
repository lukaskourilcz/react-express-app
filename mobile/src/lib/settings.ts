// App settings + answer-feedback effects. The web client plays short WebAudio
// tones; React Native has no tone synthesiser without bundled audio assets, so
// the mobile equivalent of "sound effects" is haptic feedback, gated by the same
// `soundEffects` toggle. The setting persists like every other store.
import * as Haptics from 'expo-haptics';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';

export interface AppSettings {
  /** When on, answer feedback fires a haptic tap (the RN stand-in for sound). */
  soundEffects: boolean;
}

const KEY = 'devquiz:settings';
const defaults: AppSettings = { soundEffects: true };

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

export const playCorrect = (): void => {
  if (!getSettings().soundEffects) return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // haptics unavailable — ignore
  }
};

export const playWrong = (): void => {
  if (!getSettings().soundEffects) return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // ignore
  }
};

export const playComplete = (): void => {
  if (!getSettings().soundEffects) return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
};

export const tapFeedback = (): void => {
  if (!getSettings().soundEffects) return;
  try {
    void Haptics.selectionAsync();
  } catch {
    // ignore
  }
};
