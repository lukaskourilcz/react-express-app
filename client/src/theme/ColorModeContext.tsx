import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import { type PaletteMode } from '@mui/material';
import { createAppTheme } from './MuiTheme';
import { readString, writeString } from '../lib/storage';
import { useSubject, SUBJECTS } from '../lib/subjects';

interface ColorModeContextValue {
  mode: PaletteMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => {},
});

const STORAGE_KEY = 'devquiz:color-mode';

const resolveInitial = (): PaletteMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = readString(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(resolveInitial);

  useEffect(() => {
    writeString(STORAGE_KEY, mode);
    document.documentElement.dataset.colorMode = mode;
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
  const theme = useMemo(() => createAppTheme(mode, accent), [mode, accent]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Never allow the page to exceed the viewport width (no horizontal scroll). */}
        <GlobalStyles
          styles={{
            'html, body, #root': { maxWidth: '100vw', overflowX: 'hidden' },
            '*, *::before, *::after': { boxSizing: 'border-box' },
          }}
        />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
