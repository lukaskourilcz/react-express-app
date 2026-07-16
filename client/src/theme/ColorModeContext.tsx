import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readString, writeString } from '../lib/storage';
import { useSubject, SUBJECTS } from '../lib/subjects';

/** Light/dark colour mode (was MUI's PaletteMode; now MUI-free). */
export type ColorMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => {},
});

const STORAGE_KEY = 'devquiz:color-mode';

// Convert a #rrggbb hex to an rgba() string — used to derive the soft accent
// (a translucent tint) for chip backgrounds and subtle fills.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const resolveInitial = (): ColorMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = readString(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(resolveInitial);

  useEffect(() => {
    writeString(STORAGE_KEY, mode);
    document.documentElement.dataset.colorMode = mode;
    // Astryx reads light/dark from html[data-theme]; keep it in lock-step with
    // the colour mode so the design system recolours correctly.
    document.documentElement.dataset.theme = mode;
    // Drives the CSS light-dark() tokens.
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({ mode, toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')) }),
    [mode],
  );

  // The active subject drives the primary accent, so the whole UI recolours
  // when the learner switches subjects.
  const [subject] = useSubject();
  const accent = useMemo(() => {
    const s = SUBJECTS[subject];
    return { main: s.accent, bright: s.accentBright, hover: s.accent };
  }, [subject]);

  // Expose the active accent as CSS custom properties so component styles
  // (borders, chips, buttons, focus rings) recolour per subject + mode.
  useEffect(() => {
    const root = document.documentElement.style;
    const main = mode === 'light' ? accent.main : accent.bright;
    root.setProperty('--brand-accent', main);
    root.setProperty('--brand-accent-hover', accent.hover);
    root.setProperty('--brand-accent-soft', hexToRgba(accent.main, 0.12));
  }, [accent, mode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export const useColorMode = () => useContext(ColorModeContext);
