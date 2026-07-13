// Light/dark color mode with a user override, mirroring the web app's theme
// toggle (client/src/theme/ColorModeContext.tsx). Default is 'system' (follow
// the OS); the user can pin light or dark, persisted across launches.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorMode = 'light' | 'dark' | 'system';

const KEY = 'devquiz:color-mode';

let mode: ColorMode = 'system';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadColorMode(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') {
      mode = v;
      emit();
    }
  } catch {
    // keep default
  }
}

export function getColorMode(): ColorMode {
  return mode;
}

export async function setColorMode(next: ColorMode): Promise<void> {
  mode = next;
  emit();
  try {
    await AsyncStorage.setItem(KEY, next);
  } catch {
    // best effort
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Reactive color-mode preference. */
export function useColorMode(): ColorMode {
  useEffect(() => {
    void loadColorMode();
  }, []);
  return useSyncExternalStore(subscribe, () => mode);
}
