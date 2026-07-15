import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

/**
 * StudyShark palette — one source of truth for every accent in the app.
 *
 *   green   #2d7a2d  brand / primary actions / success moments ("shark green")
 *   ocean   #0e7490  informational accents, links, water flourishes
 *   gold    #f5a623  checkpoints, trophies, celebration
 *   coral   #e4506e  hearts / lives (decorative danger — distinct from error red)
 *
 * Use these tokens (or the MUI palette they feed) instead of raw hexes so
 * light/dark tuning happens in exactly one place.
 */
export const BRAND = {
  green: '#2d7a2d',
  greenHover: '#246124',
  greenSoft: 'rgba(45, 122, 45, 0.08)',
  /** Legible green for small text on dark surfaces (4.5:1 on #181a20). */
  greenBright: '#4caf50',
  ocean: '#0e7490',
  oceanSoft: 'rgba(14, 116, 144, 0.08)',
  gold: '#f5a623',
  goldDark: '#c77f00',
  coral: '#e4506e',
  textTertiary: '#6b6b6b',
};

// The brand-green filled-button look (background + hover). Spread into a
// component's `sx` so the colour pair isn't repeated at every call site.
export const brandButtonSx = {
  backgroundColor: 'var(--brand-accent)',
  '&:hover': { backgroundColor: 'var(--brand-accent-hover)' },
};

// Visually hide an element while keeping it available to screen readers.
// Used for status text and off-screen labels.
export const visuallyHidden = { position: 'absolute', left: -9999 } as const;

export const CATEGORY_GRADIENT =
  'linear-gradient(90deg, #e34c26, #264de4, #f7df1e, #3178c6, #61dafb, #339933, #f05032, #8b5cf6, #06b6d4, #ec4899)';

// The active subject's accent, so every default MUI control (focus rings,
// progress bars, contained buttons, switches) recolours per subject without a
// per-call-site override. Defaults to the umbrella StudyShark green (Web Dev).
export interface Accent {
  main: string;
  bright: string;
  hover: string;
}
export const DEFAULT_ACCENT: Accent = {
  main: BRAND.green,
  bright: BRAND.greenBright,
  hover: BRAND.greenHover,
};

const baseOptions = (mode: PaletteMode, accent: Accent): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? accent.main : accent.bright,
      light: accent.bright,
      dark: accent.hover,
      contrastText: '#ffffff',
    },
    secondary: {
      main: BRAND.ocean,
      light: '#22a3c4',
      dark: '#0a5566',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#15803d',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#b91c1c',
    },
    warning: {
      main: BRAND.gold,
      light: '#fbbf24',
      dark: BRAND.goldDark,
    },
    info: {
      main: BRAND.ocean,
      light: '#22a3c4',
      dark: '#0a5566',
    },
    background: {
      default: mode === 'light' ? '#f8f9fa' : '#0f1115',
      paper: mode === 'light' ? '#ffffff' : '#181a20',
    },
    text: {
      primary: mode === 'light' ? '#1a1a1a' : '#f5f5f5',
      secondary: mode === 'light' ? '#525252' : '#b5b5b5',
    },
    divider: mode === 'light' ? '#e5e5e5' : '#2a2d35',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    overline: {
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:focus-visible': {
            outline: `2px solid var(--brand-accent)`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `2px solid var(--brand-accent)`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: mode === 'light' ? '1px solid #e5e5e5' : '1px solid #2a2d35',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.8rem' },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '4px',
          color: mode === 'light' ? '#bdbdbd' : '#6b6b6b',
          '& .MuiSvgIcon-root': { fontSize: '1.1rem' },
          '&.Mui-checked': { color: 'var(--brand-accent)' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: mode === 'light' ? '#e5e5e5' : '#2a2d35',
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          margin: 0,
          padding: '10px 12px',
          borderRadius: 8,
          border: mode === 'light' ? '1px solid #e5e5e5' : '1px solid #2a2d35',
          backgroundColor: mode === 'light' ? '#ffffff' : '#181a20',
          transition: 'all 0.15s ease',
          minHeight: 44,
          '&:hover': {
            borderColor: 'var(--brand-accent)',
            backgroundColor: mode === 'light' ? '#fafafa' : '#1f222a',
          },
          '&:focus-within': {
            borderColor: 'var(--brand-accent)',
            boxShadow: `0 0 0 2px var(--brand-accent-soft)`,
          },
        },
        label: { fontWeight: 400, fontSize: '0.9rem' },
      },
    },
  },
});

// responsiveFontSizes makes all typography variants (h1–h6, body, caption, …)
// scale down on smaller breakpoints, so headings/text are noticeably smaller on
// phones and grow toward their full size on larger screens.
export const createAppTheme = (mode: PaletteMode, accent: Accent = DEFAULT_ACCENT) =>
  responsiveFontSizes(createTheme(baseOptions(mode, accent)));

export const theme = createAppTheme('light');

export const quizStyles = {
  startButton: { px: 4, py: 1.25, fontSize: '1rem' },
  brandButton: {
    color: '#ffffff',
    ...brandButtonSx,
    // Use theme-aware tokens so disabled text/background stay legible in dark mode.
    '&.Mui-disabled': {
      backgroundColor: 'action.disabledBackground',
      color: 'text.disabled',
    },
  },
  submitButton: {
    px: 3,
    py: 1,
    color: '#ffffff',
    ...brandButtonSx,
    '&.Mui-disabled': {
      backgroundColor: 'action.disabledBackground',
      color: 'text.disabled',
    },
  },
  nextButton: {
    px: 3,
    py: 1,
    color: '#ffffff',
    ...brandButtonSx,
  },
  previousButton: {
    px: 3,
    py: 1,
    backgroundColor: 'transparent',
    color: 'text.secondary',
    border: '1px solid',
    borderColor: 'divider',
    '&:hover': { borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' },
  },
  optionSelected: {
    borderColor: 'var(--brand-accent)',
    backgroundColor: 'var(--brand-accent-soft)',
  },
};
