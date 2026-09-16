import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readString, writeString } from '../lib/storage';
import { useSubject, SUBJECTS } from '../lib/subjects';
import { accentOnSoft, accentSoft } from '../lib/contrast';

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
    root.setProperty('--brand-accent-soft', accentSoft(accent.main));
    // Accent text on the accent's own tint is the one pair that depends on the
    // subject's hue: four of the seven accents miss 4.5:1 on it in light mode
    // and one does in dark. This is that pair's colour, and it is used nowhere
    // else — --brand-accent stays the brand colour it was.
    root.setProperty('--brand-accent-on-soft', accentOnSoft(main, accent.main, mode));
  }, [accent, mode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export const useColorMode = () => useContext(ColorModeContext);
