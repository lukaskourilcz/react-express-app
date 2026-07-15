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

// Convert a #rrggbb hex to an rgba() string — used to derive the soft accent
// (a translucent tint) for chip backgrounds and subtle fills.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

  // Expose the active accent as CSS custom properties so component `sx` and
  // template-literal styles (borders, chips, overlines) recolour per subject
  // without threading the theme through every call site.
  useEffect(() => {
    const root = document.documentElement.style;
    const main = mode === 'light' ? accent.main : accent.bright;
    root.setProperty('--brand-accent', main);
    root.setProperty('--brand-accent-hover', accent.hover);
    root.setProperty('--brand-accent-soft', hexToRgba(accent.main, 0.12));
  }, [accent, mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Never allow the page to exceed the viewport width (no horizontal scroll). */}
        <GlobalStyles
          styles={{
            // Accent defaults (Web Dev green) so styles resolve before the
            // per-subject effect runs; overwritten at runtime per subject.
            ':root': {
              '--brand-accent': '#2d7a2d',
              '--brand-accent-hover': '#246124',
              '--brand-accent-soft': 'rgba(45, 122, 45, 0.12)',
            },
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
